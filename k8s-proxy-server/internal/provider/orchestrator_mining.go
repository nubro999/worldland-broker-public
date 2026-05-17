// orchestrator_mining.go — mining as the elastic filler workload.
//
// A provider's idle GPUs run Worldland mining; rental demand always wins
// (AllocateMiningGPU rejects when free GPUs are short — "reject + wait").
//   - Allocate/ReleaseMiningGPU + Deploy/StopMiningForProvider: move GPUs
//     between the mining and available pools and (re)deploy the mining pod.
//   - miningMonitor / syncMiningPodStates: 30s reconcile of pod status;
//     a failed/stopped mining pod returns its GPUs to the available pool.
//   - RecoverMiningStates / GetMiningMetrics: boot recovery + aggregate view.
//
// Design intent: mining is best-effort and fully preemptible so it never
// reduces rental availability or revenue.
package provider

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// ================== Mining Management ==================

// AllocateMiningGPU reserves additional GPUs for mining from the available pool.
// Returns an error if not enough GPUs are available (Option 1: reject + wait).
func (o *Orchestrator) AllocateMiningGPU(ctx context.Context, providerID string, gpuType string, count int) error {
	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	provider, exists := o.providers[providerID]
	if !exists {
		return fmt.Errorf("provider not found: %s", providerID)
	}

	// 가용 GPU 확인
	available := 0
	if provider.Capacity.AvailableGPUs != nil {
		available = provider.Capacity.AvailableGPUs[gpuType]
	}

	if available < count {
		return fmt.Errorf("insufficient available GPUs for mining: requested %d, available %d. Wait for rental jobs to complete", count, available)
	}

	// Initialize maps if nil
	if provider.Capacity.AvailableGPUs == nil {
		provider.Capacity.AvailableGPUs = make(map[string]int)
	}
	if provider.Capacity.MiningGPUs == nil {
		provider.Capacity.MiningGPUs = make(map[string]int)
	}

	// 가용량에서 차감
	provider.Capacity.AvailableGPUs[gpuType] -= count
	// 채굴용에 추가
	provider.Capacity.MiningGPUs[gpuType] += count

	slog.Info("Mining GPU allocated",
		"providerID", providerID,
		"gpuType", gpuType,
		"allocated", count,
		"miningTotal", provider.Capacity.MiningGPUs[gpuType],
		"available", provider.Capacity.AvailableGPUs[gpuType],
	)

	// Mining Pod 업데이트 (GPU 수 변경)
	if o.miningManager != nil {
		miningConfig := &MiningConfig{
			GPUCount: provider.Capacity.MiningGPUCount(),
			CPUCores: provider.Capacity.MiningCPUCores,
			MemoryMB: provider.Capacity.MiningMemoryMB,
		}
		// 비동기로 Pod 업데이트 (에러는 로그만)
		go func() {
			if err := o.miningManager.UpdateMiningPodGPU(ctx, providerID, miningConfig, provider.NodeName); err != nil {
				slog.Error("Failed to update mining pod", "error", err)
			}
		}()
	}

	return nil
}

// ReleaseMiningGPU releases GPUs from mining back to the available pool.
func (o *Orchestrator) ReleaseMiningGPU(ctx context.Context, providerID string, gpuType string, count int) error {
	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	provider, exists := o.providers[providerID]
	if !exists {
		return fmt.Errorf("provider not found: %s", providerID)
	}

	// 채굴용 GPU 확인
	miningGPUs := 0
	if provider.Capacity.MiningGPUs != nil {
		miningGPUs = provider.Capacity.MiningGPUs[gpuType]
	}

	if miningGPUs < count {
		return fmt.Errorf("cannot release more GPUs than allocated for mining: mining %d, requested %d", miningGPUs, count)
	}

	// Initialize maps if nil
	if provider.Capacity.AvailableGPUs == nil {
		provider.Capacity.AvailableGPUs = make(map[string]int)
	}

	// 채굴용에서 차감
	provider.Capacity.MiningGPUs[gpuType] -= count
	// 가용량에 추가
	provider.Capacity.AvailableGPUs[gpuType] += count

	slog.Info("Mining GPU released",
		"providerID", providerID,
		"gpuType", gpuType,
		"released", count,
		"miningTotal", provider.Capacity.MiningGPUs[gpuType],
		"available", provider.Capacity.AvailableGPUs[gpuType],
	)

	// Mining Pod 업데이트 (GPU 수 변경)
	if o.miningManager != nil {
		miningConfig := &MiningConfig{
			GPUCount: provider.Capacity.MiningGPUCount(),
			CPUCores: provider.Capacity.MiningCPUCores,
			MemoryMB: provider.Capacity.MiningMemoryMB,
		}
		go func() {
			if err := o.miningManager.UpdateMiningPodGPU(ctx, providerID, miningConfig, provider.NodeName); err != nil {
				slog.Error("Failed to update mining pod", "error", err)
			}
		}()
	}

	return nil
}

// GetMiningStatus returns the mining status for a provider.
func (o *Orchestrator) GetMiningStatus(ctx context.Context, providerID string) (map[string]interface{}, error) {
	o.providersMu.RLock()
	provider, exists := o.providers[providerID]
	o.providersMu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("provider not found: %s", providerID)
	}

	// Get pod status
	podStatus := "unknown"
	if o.miningManager != nil {
		status, err := o.miningManager.GetMiningPodStatus(ctx, providerID)
		if err == nil {
			podStatus = status
		}
	}

	return map[string]interface{}{
		"provider_id":         providerID,
		"mining_status":       podStatus,
		"mining_pod_name":     provider.Capacity.MiningPodName,
		"mining_gpus":         provider.Capacity.MiningGPUs,
		"mining_gpu_count":    provider.Capacity.MiningGPUCount(),
		"mining_cpu_cores":    provider.Capacity.MiningCPUCores,
		"mining_memory_mb":    provider.Capacity.MiningMemoryMB,
		"available_gpus":      provider.Capacity.AvailableGPUs,
		"available_gpu_count": provider.Capacity.AvailableGPUCount(),
	}, nil
}

// DeployMiningForProvider deploys a mining pod for a provider.
func (o *Orchestrator) DeployMiningForProvider(ctx context.Context, providerID string, config *MiningConfig) error {
	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	provider, exists := o.providers[providerID]
	if !exists {
		return fmt.Errorf("provider not found: %s", providerID)
	}

	if o.miningManager == nil {
		return fmt.Errorf("mining manager not available")
	}

	// GPU 타입 추정 (첫 번째 GPU 타입 사용)
	var gpuType string
	for t := range provider.Capacity.TotalGPUs {
		gpuType = t
		break
	}
	if gpuType == "" && len(provider.Spec.GPUs) > 0 {
		gpuType = provider.Spec.GPUs[0].Name
	}

	// 가용 GPU 확인 - AvailableGPUs가 nil이면 TotalGPUs에서 초기화
	if provider.Capacity.AvailableGPUs == nil {
		provider.Capacity.AvailableGPUs = make(map[string]int)
		// TotalGPUs에서 복사
		if provider.Capacity.TotalGPUs != nil {
			for t, c := range provider.Capacity.TotalGPUs {
				provider.Capacity.AvailableGPUs[t] = c
			}
		} else if gpuType != "" {
			// Spec에서 total_gpus 사용
			provider.Capacity.AvailableGPUs[gpuType] = provider.Spec.TotalGPUs
		}
	}

	available := 0
	if gpuType != "" {
		available = provider.Capacity.AvailableGPUs[gpuType]
	}
	// 아직도 0이면 Spec.TotalGPUs 사용
	if available == 0 && provider.Spec.TotalGPUs > 0 {
		available = provider.Spec.TotalGPUs
		provider.Capacity.AvailableGPUs[gpuType] = available
	}

	if available < config.GPUCount {
		return fmt.Errorf("insufficient GPUs: requested %d, available %d", config.GPUCount, available)
	}

	// Mining Pod 배포
	podName, err := o.miningManager.DeployMiningPod(ctx, providerID, config, provider.NodeName)
	if err != nil {
		return fmt.Errorf("failed to deploy mining pod: %w", err)
	}

	// Capacity 업데이트
	if provider.Capacity.MiningGPUs == nil {
		provider.Capacity.MiningGPUs = make(map[string]int)
	}
	provider.Capacity.MiningGPUs[gpuType] = config.GPUCount
	provider.Capacity.AvailableGPUs[gpuType] -= config.GPUCount
	provider.Capacity.MiningCPUCores = config.CPUCores
	provider.Capacity.MiningMemoryMB = config.MemoryMB
	provider.Capacity.MiningPodName = podName
	provider.Capacity.MiningStatus = "pending"

	slog.Info("Mining pod deployed",
		"providerID", providerID,
		"podName", podName,
		"gpuCount", config.GPUCount,
	)

	return nil
}

// StopMiningForProvider stops the mining pod and releases resources.
func (o *Orchestrator) StopMiningForProvider(ctx context.Context, providerID string) error {
	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	provider, exists := o.providers[providerID]
	if !exists {
		return fmt.Errorf("provider not found: %s", providerID)
	}

	if o.miningManager == nil {
		return fmt.Errorf("mining manager not available")
	}

	// Delete mining pod
	if err := o.miningManager.DeleteMiningPod(ctx, providerID); err != nil {
		return fmt.Errorf("failed to delete mining pod: %w", err)
	}

	// Return GPUs to available pool
	for gpuType, count := range provider.Capacity.MiningGPUs {
		if provider.Capacity.AvailableGPUs == nil {
			provider.Capacity.AvailableGPUs = make(map[string]int)
		}
		provider.Capacity.AvailableGPUs[gpuType] += count
	}

	// Clear mining fields
	provider.Capacity.MiningGPUs = nil
	provider.Capacity.MiningCPUCores = 0
	provider.Capacity.MiningMemoryMB = 0
	provider.Capacity.MiningPodName = ""
	provider.Capacity.MiningStatus = "stopped"

	slog.Info("Mining stopped for provider", "providerID", providerID)

	return nil
}

// ================== Mining Monitoring ==================

// miningMonitor periodically checks mining pod status and handles failures.
func (o *Orchestrator) miningMonitor(ctx context.Context) {
	defer o.wg.Done()

	ticker := time.NewTicker(miningSyncInterval)
	defer ticker.Stop()

	slog.Info("Mining monitor started")

	for {
		select {
		case <-ctx.Done():
			slog.Info("Mining monitor stopping (context cancelled)")
			return
		case <-o.stopCh:
			slog.Info("Mining monitor stopping")
			return
		case <-ticker.C:
			o.syncMiningPodStates(ctx)
		}
	}
}

// syncMiningPodStates synchronizes mining pod states with actual K8s pod status.
func (o *Orchestrator) syncMiningPodStates(ctx context.Context) {
	if o.miningManager == nil {
		return
	}

	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	for providerID, provider := range o.providers {
		// Skip providers without mining
		if provider.Capacity.MiningPodName == "" {
			continue
		}

		// Check pod status
		status, err := o.miningManager.GetMiningPodStatus(ctx, providerID)
		if err != nil {
			slog.Warn("Failed to get mining pod status",
				"providerID", providerID,
				"error", err,
			)
			continue
		}

		oldStatus := provider.Capacity.MiningStatus
		provider.Capacity.MiningStatus = status

		// Handle status changes
		if oldStatus != status {
			slog.Info("Mining pod status changed",
				"providerID", providerID,
				"oldStatus", oldStatus,
				"newStatus", status,
			)
		}

		// Handle failed/stopped pods - return GPUs to available pool
		if (status == "failed" || status == "stopped") && provider.Capacity.MiningGPUCount() > 0 {
			slog.Warn("Mining pod not running, returning GPUs to available pool",
				"providerID", providerID,
				"status", status,
				"gpusToReturn", provider.Capacity.MiningGPUCount(),
			)

			// Return all mining GPUs to available
			for gpuType, count := range provider.Capacity.MiningGPUs {
				if provider.Capacity.AvailableGPUs == nil {
					provider.Capacity.AvailableGPUs = make(map[string]int)
				}
				provider.Capacity.AvailableGPUs[gpuType] += count
			}

			// Clear mining allocation
			provider.Capacity.MiningGPUs = nil
			provider.Capacity.MiningCPUCores = 0
			provider.Capacity.MiningMemoryMB = 0
		}
	}
}

// RecoverMiningStates recovers mining states after restart by checking existing pods.
func (o *Orchestrator) RecoverMiningStates(ctx context.Context) error {
	if o.miningManager == nil {
		return nil
	}

	slog.Info("Recovering mining states...")

	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	for providerID, provider := range o.providers {
		// Check if mining pod exists for this provider
		exists, err := o.miningManager.MiningPodExists(ctx, providerID)
		if err != nil {
			slog.Warn("Failed to check mining pod existence",
				"providerID", providerID,
				"error", err,
			)
			continue
		}

		if exists {
			status, _ := o.miningManager.GetMiningPodStatus(ctx, providerID)
			provider.Capacity.MiningPodName = fmt.Sprintf("mining-%s", providerID)
			provider.Capacity.MiningStatus = status

			slog.Info("Recovered mining pod state",
				"providerID", providerID,
				"status", status,
			)
		}
	}

	return nil
}

// GetMiningMetrics returns aggregated mining metrics across all providers.
func (o *Orchestrator) GetMiningMetrics() map[string]interface{} {
	o.providersMu.RLock()
	defer o.providersMu.RUnlock()

	var (
		totalMiningProviders int
		runningMiningPods    int
		totalMiningGPUs      int
		totalAvailableGPUs   int
	)

	for _, provider := range o.providers {
		if provider.Capacity.MiningPodName != "" {
			totalMiningProviders++

			if provider.Capacity.MiningStatus == "running" {
				runningMiningPods++
			}

			totalMiningGPUs += provider.Capacity.MiningGPUCount()
		}

		totalAvailableGPUs += provider.Capacity.AvailableGPUCount()
	}

	return map[string]interface{}{
		"total_mining_providers": totalMiningProviders,
		"running_mining_pods":    runningMiningPods,
		"total_mining_gpus":      totalMiningGPUs,
		"total_available_gpus":   totalAvailableGPUs,
		"total_providers":        len(o.providers),
	}
}
