// orchestrator_ledger.go — the resource ledger (most safety-critical code).
//
// Maintains the invariant Total = Mining + InUse + Available per provider:
//   - AllocateResources: lock → check → debit GPU/CPU/mem, with compensating
//     rollback if a later resource (CPU/mem) is short (pseudo-transaction).
//   - ReleaseResources / releaseJobResources: credit resources back; the
//     single funnel every return path (explicit, pod-watch, sweeper) uses.
//   - RecoverJobAllocations: on boot, recompute InUse from the *actual* K8s
//     pods so a control-plane restart cannot leak or double-book GPUs.
//
// Design intent: K8s is the source of truth for "what is really running";
// the in-memory ledger is a fast cache that is always reconcilable from it.
// Legacy single-GPU Capacity fields are read through helpers in types.go.
package provider

import (
	"context"
	"fmt"
	"log/slog"
)

// AllocateResources allocates resources from a provider for a job.
func (o *Orchestrator) AllocateResources(providerID string, allocation *ResourceAllocation) error {
	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	provider, exists := o.providers[providerID]
	if !exists {
		return fmt.Errorf("provider not found: %s", providerID)
	}

	// GPU 타입 결정
	gpuType := allocation.GPUType
	if gpuType == "" {
		if len(provider.Spec.GPUs) > 0 {
			gpuType = provider.Spec.GPUs[0].Name
		} else {
			gpuType = "default"
		}
	}

	// AvailableGPUs 맵 초기화
	if provider.Capacity.AvailableGPUs == nil {
		provider.Capacity.AvailableGPUs = make(map[string]int)
		// 레거시 필드에서 초기화
		if provider.Capacity.GPUCount > 0 {
			provider.Capacity.AvailableGPUs[gpuType] = provider.Capacity.GPUCount
		} else if provider.Spec.TotalGPUs > 0 {
			provider.Capacity.AvailableGPUs[gpuType] = provider.Spec.TotalGPUs
		}
	}

	// InUseGPUs 맵 초기화
	if provider.Capacity.InUseGPUs == nil {
		provider.Capacity.InUseGPUs = make(map[string]int)
	}

	// GPU 가용성 확인 및 차감
	if allocation.GPUCount > 0 {
		available := provider.Capacity.AvailableGPUs[gpuType]
		if available < allocation.GPUCount {
			return fmt.Errorf("insufficient GPU: requested %d, available %d", allocation.GPUCount, available)
		}
		provider.Capacity.AvailableGPUs[gpuType] -= allocation.GPUCount
		provider.Capacity.InUseGPUs[gpuType] += allocation.GPUCount
	}

	// CPU 할당
	if allocation.CPUCores > 0 {
		// TotalCPUCores 초기화 (레거시 필드 또는 Spec에서)
		if provider.Capacity.TotalCPUCores == 0 {
			if provider.Capacity.CPUCores > 0 {
				provider.Capacity.TotalCPUCores = provider.Capacity.CPUCores
			} else if provider.Spec.CPUCores > 0 {
				provider.Capacity.TotalCPUCores = provider.Spec.CPUCores
			}
		}
		// 가용 CPU 초기화 (필요시)
		if provider.Capacity.AvailableCPUCores == 0 && provider.Capacity.TotalCPUCores > 0 {
			provider.Capacity.AvailableCPUCores = provider.Capacity.TotalCPUCores - provider.Capacity.InUseCPUCores - provider.Capacity.MiningCPUCores
		}
		if provider.Capacity.AvailableCPUCores < allocation.CPUCores {
			// GPU 롤백
			provider.Capacity.AvailableGPUs[gpuType] += allocation.GPUCount
			provider.Capacity.InUseGPUs[gpuType] -= allocation.GPUCount
			return fmt.Errorf("insufficient CPU: requested %d, available %d", allocation.CPUCores, provider.Capacity.AvailableCPUCores)
		}

		provider.Capacity.AvailableCPUCores -= allocation.CPUCores
		provider.Capacity.InUseCPUCores += allocation.CPUCores
	}

	// Memory 할당
	if allocation.MemoryMB > 0 {
		// TotalMemoryMB 초기화 (레거시 필드 또는 Spec에서)
		if provider.Capacity.TotalMemoryMB == 0 {
			if provider.Capacity.MemoryMB > 0 {
				provider.Capacity.TotalMemoryMB = int64(provider.Capacity.MemoryMB)
			} else if provider.Spec.TotalMemoryMB > 0 {
				provider.Capacity.TotalMemoryMB = int64(provider.Spec.TotalMemoryMB)
			}
		}
		// 가용 메모리 초기화 (필요시)
		if provider.Capacity.AvailableMemoryMB == 0 && provider.Capacity.TotalMemoryMB > 0 {
			provider.Capacity.AvailableMemoryMB = provider.Capacity.TotalMemoryMB - provider.Capacity.InUseMemoryMB - int64(provider.Capacity.MiningMemoryMB)
		}
		if provider.Capacity.AvailableMemoryMB < allocation.MemoryMB {
			// GPU, CPU 롤백
			provider.Capacity.AvailableGPUs[gpuType] += allocation.GPUCount
			provider.Capacity.InUseGPUs[gpuType] -= allocation.GPUCount
			provider.Capacity.AvailableCPUCores += allocation.CPUCores
			provider.Capacity.InUseCPUCores -= allocation.CPUCores
			return fmt.Errorf("insufficient Memory: requested %d MB, available %d MB", allocation.MemoryMB, provider.Capacity.AvailableMemoryMB)
		}
		provider.Capacity.AvailableMemoryMB -= allocation.MemoryMB
		provider.Capacity.InUseMemoryMB += allocation.MemoryMB
	}

	slog.Info("Resources allocated",
		"provider_id", providerID,
		"job_id", allocation.JobID,
		"gpu_type", gpuType,
		"gpu_count", allocation.GPUCount,
		"cpu_cores", allocation.CPUCores,
		"memory_mb", allocation.MemoryMB,
		"available_gpu", provider.Capacity.AvailableGPUs[gpuType],
	)

	return nil
}

// ReleaseResources returns allocated resources back to the provider.
func (o *Orchestrator) ReleaseResources(providerID string, allocation *ResourceAllocation) error {
	// GPU 타입 결정
	gpuType := allocation.GPUType
	if gpuType == "" {
		gpuType = "default"
	}

	// releaseJobResources 호출 (통일된 리소스 반환 로직)
	o.releaseJobResources(providerID, gpuType, allocation.GPUCount, allocation.CPUCores, allocation.MemoryMB)

	slog.Info("Resources released via ReleaseResources",
		"provider_id", providerID,
		"job_id", allocation.JobID,
		"gpu_count", allocation.GPUCount,
	)

	return nil
}

// ================== Job Allocation Recovery ==================

// RecoverJobAllocations recovers GPU job allocations from K8s on startup.
// This ensures that after server restart, the in-memory state matches actual K8s pod state.
func (o *Orchestrator) RecoverJobAllocations(ctx context.Context) error {
	if o.nodeManager == nil {
		slog.Warn("NodeManager not available, skipping job allocation recovery")
		return nil
	}

	slog.Info("Recovering job allocations from K8s...")

	// List all GPU job pods
	pods, err := o.nodeManager.ListGPUJobPods(ctx)
	if err != nil {
		return fmt.Errorf("failed to list GPU job pods: %w", err)
	}

	if len(pods) == 0 {
		slog.Info("No existing GPU jobs found")
		return nil
	}

	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	// Track recovered allocations per provider
	recoveredCount := 0
	providerAllocations := make(map[string][]GPUJobPodInfo)

	for _, pod := range pods {
		if pod.ProviderID == "" {
			slog.Debug("Skipping pod without provider ID", "job_id", pod.JobID)
			continue
		}
		providerAllocations[pod.ProviderID] = append(providerAllocations[pod.ProviderID], pod)
	}

	// Apply allocations to each provider
	for providerID, jobs := range providerAllocations {
		provider, exists := o.providers[providerID]
		if !exists {
			slog.Warn("Provider not found for job recovery",
				"provider_id", providerID,
				"job_count", len(jobs),
			)
			continue
		}

		// Sum up resources used by jobs
		totalGPU := 0
		totalCPU := 0
		totalMemoryMB := int64(0)

		for _, job := range jobs {
			totalGPU += job.GPUCount
			totalCPU += job.CPUCores
			totalMemoryMB += job.MemoryMB
			recoveredCount++

			slog.Debug("Recovered job allocation",
				"job_id", job.JobID,
				"provider_id", providerID,
				"gpu", job.GPUCount,
				"cpu", job.CPUCores,
				"memory_mb", job.MemoryMB,
			)
		}

		// Initialize InUse maps if nil
		if provider.Capacity.InUseGPUs == nil {
			provider.Capacity.InUseGPUs = make(map[string]int)
		}

		// Determine GPU type (use first GPU from spec or default)
		gpuType := "default"
		if len(provider.Spec.GPUs) > 0 {
			gpuType = provider.Spec.GPUs[0].Name
		}

		// Update in-use resources
		provider.Capacity.InUseGPUs[gpuType] = totalGPU
		provider.Capacity.InUseCPUCores = totalCPU
		provider.Capacity.InUseMemoryMB = totalMemoryMB

		// Recalculate available resources
		// Available = Total - InUse - Mining
		if provider.Capacity.AvailableGPUs == nil {
			provider.Capacity.AvailableGPUs = make(map[string]int)
		}

		// Get total GPU for this type
		totalForType := 0
		if provider.Capacity.TotalGPUs != nil {
			totalForType = provider.Capacity.TotalGPUs[gpuType]
		}
		if totalForType == 0 {
			totalForType = provider.Spec.TotalGPUs
		}

		// Mining GPUs for this type
		miningForType := 0
		if provider.Capacity.MiningGPUs != nil {
			miningForType = provider.Capacity.MiningGPUs[gpuType]
		}

		// Available = Total - InUse - Mining
		available := totalForType - totalGPU - miningForType
		if available < 0 {
			available = 0
		}
		provider.Capacity.AvailableGPUs[gpuType] = available

		// CPU and Memory available
		if provider.Capacity.TotalCPUCores > 0 {
			provider.Capacity.AvailableCPUCores = provider.Capacity.TotalCPUCores - totalCPU - provider.Capacity.MiningCPUCores
		}
		if provider.Capacity.TotalMemoryMB > 0 {
			provider.Capacity.AvailableMemoryMB = provider.Capacity.TotalMemoryMB - totalMemoryMB - provider.Capacity.MiningMemoryMB
		}

		slog.Info("Provider resource state recovered",
			"provider_id", providerID,
			"jobs_count", len(jobs),
			"in_use_gpu", totalGPU,
			"in_use_cpu", totalCPU,
			"in_use_memory_mb", totalMemoryMB,
			"available_gpu", available,
		)
	}

	slog.Info("Job allocation recovery completed",
		"total_jobs", recoveredCount,
		"providers_affected", len(providerAllocations),
	)

	return nil
}
