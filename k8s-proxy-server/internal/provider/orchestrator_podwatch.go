// orchestrator_podwatch.go — eventual-consistency safety net.
//
// Two cooperating mechanisms keep the ledger honest without a distributed
// lock:
//   - podWatcher / handlePodEvent: K8s watch stream; on DELETED/Failed/
//     Succeeded it frees the job's resources in real time. Watches drop
//     by design, so it auto-reconnects after 5s.
//   - jobExpirationMonitor / cleanupExpiredAndFailedJobs: 1-min sweeper
//     that force-deletes expired/failed pods and frees resources for any
//     events the watch missed while disconnected.
//
// Design intent: watch (fast path) + periodic sweep (catch-up) together
// give eventual consistency that survives watch gaps and restarts.
package provider

import (
	"context"
	"log/slog"
	"time"
)

// ================== Pod Watcher ==================

// podWatcher watches GPU Job pods and handles deletion/failure events.
func (o *Orchestrator) podWatcher(ctx context.Context) {
	defer o.wg.Done()

	if o.nodeManager == nil {
		slog.Warn("NodeManager not available, pod watcher disabled")
		return
	}

	slog.Info("GPU Job pod watcher started")

	for {
		select {
		case <-ctx.Done():
			slog.Info("Pod watcher stopping (context cancelled)")
			return
		case <-o.stopCh:
			slog.Info("Pod watcher stopping")
			return
		default:
		}

		// Start watching
		eventCh, err := o.nodeManager.WatchGPUJobPods(ctx)
		if err != nil {
			slog.Error("Failed to start pod watcher, retrying", "error", err, "retry_in", podWatchRetryDelay)
			select {
			case <-ctx.Done():
				return
			case <-o.stopCh:
				return
			case <-time.After(podWatchRetryDelay):
				continue
			}
		}

		// Process events
		for event := range eventCh {
			o.handlePodEvent(ctx, event)
		}

		// Watcher closed, restart after delay
		slog.Warn("Pod watcher connection closed, restarting", "restart_in", podWatchReconnectDelay)
		select {
		case <-ctx.Done():
			return
		case <-o.stopCh:
			return
		case <-time.After(podWatchReconnectDelay):
			continue
		}
	}
}

// handlePodEvent handles a pod watch event.
func (o *Orchestrator) handlePodEvent(ctx context.Context, event PodWatchEvent) {
	info := event.PodInfo

	switch event.Type {
	case "DELETED":
		// Pod 삭제됨 → 리소스 반환
		if info.ProviderID == "" {
			return
		}

		slog.Info("Pod deleted, releasing resources",
			"job_id", info.JobID,
			"provider_id", info.ProviderID,
			"gpu_count", info.GPUCount,
			"cpu_cores", info.CPUCores,
			"memory_mb", info.MemoryMB,
		)

		o.releaseJobResources(info.ProviderID, info.GPUModel, info.GPUCount, info.CPUCores, info.MemoryMB)

	case "MODIFIED":
		// Pod 상태 변경 확인 (Failed, Succeeded → 리소스 반환)
		if event.RawPod == nil {
			return
		}

		phase := event.RawPod.Status.Phase
		if phase == "Failed" || phase == "Succeeded" {
			if info.ProviderID == "" {
				return
			}

			slog.Info("Pod terminated, releasing resources",
				"job_id", info.JobID,
				"provider_id", info.ProviderID,
				"phase", phase,
				"gpu_count", info.GPUCount,
			)

			o.releaseJobResources(info.ProviderID, info.GPUModel, info.GPUCount, info.CPUCores, info.MemoryMB)
		}

	case "ADDED":
		// Pod 생성됨 - 로깅만 (리소스는 CreateJob에서 이미 할당됨)
		slog.Debug("Pod created (watched)",
			"job_id", info.JobID,
			"provider_id", info.ProviderID,
			"node", info.NodeName,
		)
	}
}

// releaseJobResources releases resources back to the provider.
func (o *Orchestrator) releaseJobResources(providerID string, gpuType string, gpuCount, cpuCores int, memoryMB int64) {
	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	provider, exists := o.providers[providerID]
	if !exists {
		slog.Warn("Provider not found for resource release", "provider_id", providerID)
		return
	}

	// GPU 타입이 비어있으면 Provider spec에서 추출
	if gpuType == "" {
		if len(provider.Spec.GPUs) > 0 {
			gpuType = provider.Spec.GPUs[0].Name
		} else {
			gpuType = "default"
		}
	}

	// Release GPU
	if provider.Capacity.AvailableGPUs == nil {
		provider.Capacity.AvailableGPUs = make(map[string]int)
	}
	provider.Capacity.AvailableGPUs[gpuType] += gpuCount

	// Update InUse tracking
	if provider.Capacity.InUseGPUs != nil {
		provider.Capacity.InUseGPUs[gpuType] -= gpuCount
		if provider.Capacity.InUseGPUs[gpuType] < 0 {
			provider.Capacity.InUseGPUs[gpuType] = 0
		}
	}

	// Release CPU
	provider.Capacity.AvailableCPUCores += cpuCores
	provider.Capacity.InUseCPUCores -= cpuCores
	if provider.Capacity.InUseCPUCores < 0 {
		provider.Capacity.InUseCPUCores = 0
	}

	// Release Memory
	provider.Capacity.AvailableMemoryMB += memoryMB
	provider.Capacity.InUseMemoryMB -= memoryMB
	if provider.Capacity.InUseMemoryMB < 0 {
		provider.Capacity.InUseMemoryMB = 0
	}

	slog.Info("Resources released by pod watcher",
		"provider_id", providerID,
		"gpu_released", gpuCount,
		"cpu_released", cpuCores,
		"memory_released_mb", memoryMB,
		"available_gpu", provider.Capacity.AvailableGPUs[gpuType],
	)
}

// ================== Job Expiration Monitor ==================

// jobExpirationMonitor periodically checks for expired jobs and cleans them up.
func (o *Orchestrator) jobExpirationMonitor(ctx context.Context) {
	defer o.wg.Done()

	if o.nodeManager == nil {
		slog.Warn("NodeManager not available, job expiration monitor disabled")
		return
	}

	slog.Info("Job expiration monitor started")

	ticker := time.NewTicker(jobSweepInterval)
	defer ticker.Stop()

	// Run initial check
	o.cleanupExpiredAndFailedJobs(ctx)

	for {
		select {
		case <-ctx.Done():
			slog.Info("Job expiration monitor stopping (context cancelled)")
			return
		case <-o.stopCh:
			slog.Info("Job expiration monitor stopping")
			return
		case <-ticker.C:
			o.cleanupExpiredAndFailedJobs(ctx)
		}
	}
}

// cleanupExpiredAndFailedJobs finds and deletes expired or failed jobs.
func (o *Orchestrator) cleanupExpiredAndFailedJobs(ctx context.Context) {
	pods, err := o.nodeManager.ListAllGPUJobPods(ctx)
	if err != nil {
		slog.Error("Failed to list GPU job pods for cleanup", "error", err)
		return
	}

	if len(pods) == 0 {
		return
	}

	now := time.Now()
	var expiredCount, failedCount int

	for _, pod := range pods {
		shouldDelete := false
		reason := ""

		// Check for expired jobs
		if !pod.ExpiresAt.IsZero() && now.After(pod.ExpiresAt) {
			shouldDelete = true
			reason = "expired"
			expiredCount++
		}

		// Check for failed/succeeded pods
		if pod.Status == "Failed" || pod.Status == "Succeeded" {
			shouldDelete = true
			reason = pod.Status
			failedCount++
		}

		if shouldDelete {
			slog.Info("Cleaning up job",
				"job_id", pod.JobID,
				"reason", reason,
				"provider_id", pod.ProviderID,
				"namespace", pod.Namespace,
			)

			// Release resources first
			if pod.ProviderID != "" && (pod.GPUCount > 0 || pod.CPUCores > 0 || pod.MemoryMB > 0) {
				o.releaseJobResources(pod.ProviderID, pod.GPUModel, pod.GPUCount, pod.CPUCores, pod.MemoryMB)
			}

			// Delete the job
			if err := o.nodeManager.DeleteGPUJob(ctx, pod.JobID, pod.Namespace); err != nil {
				slog.Error("Failed to delete expired/failed job",
					"job_id", pod.JobID,
					"error", err,
				)
			} else {
				slog.Info("Job cleaned up successfully",
					"job_id", pod.JobID,
					"reason", reason,
				)
			}
		}
	}

	if expiredCount > 0 || failedCount > 0 {
		slog.Info("Job cleanup completed",
			"expired_count", expiredCount,
			"failed_count", failedCount,
		)
	}
}
