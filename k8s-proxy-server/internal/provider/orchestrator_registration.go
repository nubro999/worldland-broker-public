// orchestrator_registration.go — provider registration & liveness.
//
// Owns the provider lifecycle on the control-plane side:
//   - registrationWorker / handleRegistration: consume provider:registration
//     (Redis Stream consumer group, at-least-once + ack) and issue kubeadm
//     join tokens; persist provider state to DB + in-memory cache.
//   - heartbeatMonitor / handleHeartbeat / checkStaleProviders: 30s heartbeat
//     ingest, node-label sync, and 2-min staleness → mark Offline.
//   - OnNodeJoined: promote an approved provider to Joined once its node
//     actually appears in the cluster.
//
// Design intent: registration is idempotent (re-register of a Joined
// provider is a no-op) so a provider agent can retry safely after a
// control-plane restart without double-counting capacity.
package provider

import (
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"time"

	"github.com/nubro999/worldland-gpu/internal/messaging"
)

// registrationWorker processes provider registration messages.
func (o *Orchestrator) registrationWorker(ctx context.Context) {
	defer o.wg.Done() //종료 시 카운터 감소

	for {
		select {
		case <-o.stopCh:
			return
		case <-ctx.Done():
			return
		default:
		}

		messages, err := o.consumer.ReadMessages(ctx, 10)
		if err != nil {
			slog.Error("Failed to read registration messages", "error", err)
			time.Sleep(streamReadBackoff)
			continue
		}

		for _, msg := range messages {
			if err := o.handleRegistration(ctx, msg); err != nil {
				slog.Error("Failed to handle registration", "error", err, "messageID", msg.ID)
			}
			// Acknowledge message
			if err := o.consumer.Ack(ctx, msg.ID); err != nil {
				slog.Error("Failed to ack message", "error", err, "messageID", msg.ID)
			}
		}
	}
}

// handleRegistration processes a single registration request.
func (o *Orchestrator) handleRegistration(ctx context.Context, msg messaging.Message) error {
	var req RegistrationRequest
	if err := msg.Unmarshal(&req); err != nil {
		return fmt.Errorf("failed to unmarshal registration request: %w", err)
	}

	slog.Info("Processing provider registration",
		"providerID", req.ProviderID,
		"hostname", req.Spec.Hostname,
		"gpuCount", req.Spec.TotalGPUs,
	)

	// Check if provider already registered
	o.providersMu.RLock()
	existingProvider, exists := o.providers[req.ProviderID]
	o.providersMu.RUnlock()

	var response RegistrationResponse

	if exists && existingProvider.Status == StatusJoined {
		// Provider already joined, update capacity
		response = RegistrationResponse{
			Success:  true,
			Status:   StatusJoined,
			Message:  "Provider already registered and joined",
			NodeName: existingProvider.NodeName,
		}
	} else {
		// New provider - try to generate join token
		joinToken, caHash, err := o.generateJoinToken(ctx)
		if err != nil {
			slog.Warn("Failed to generate join token (node may already be joined)", "error", err)

			// 토큰 생성 실패해도 Provider 저장 (이미 Join된 노드일 수 있음)
			providerState := &ProviderState{
				ProviderID:    req.ProviderID,
				WalletAddr:    req.WalletAddr,
				Status:        StatusApproved, // 일단 승인 상태로 저장
				Spec:          req.Spec,
				Capacity:      req.Capacity,
				RegisteredAt:  time.Now(),
				LastHeartbeat: time.Now(),
			}

			o.providersMu.Lock()
			o.providers[req.ProviderID] = providerState
			o.providersMu.Unlock()

			// DB에 저장
			if o.repo != nil {
				if err := o.repo.Create(ctx, providerState); err != nil {
					slog.Error("Failed to save provider to DB", "error", err, "providerID", req.ProviderID)
				}
			}

			response = RegistrationResponse{
				Success: true,
				Status:  StatusApproved,
				Message: "Registration approved (join token unavailable - node may already be in cluster)",
			}
		} else {
			joinCommand := fmt.Sprintf(
				"kubeadm join %s:%d --token %s --discovery-token-ca-cert-hash %s",
				o.masterIP, o.masterPort, joinToken, caHash,
			)

			response = RegistrationResponse{
				Success:     true,
				Status:      StatusApproved,
				Message:     "Registration approved. Please execute the join command.",
				JoinToken:   joinToken,
				JoinCommand: joinCommand,
				MasterIP:    o.masterIP,
				MasterPort:  o.masterPort,
				CAHash:      caHash,
			}

			// Store provider state
			providerState := &ProviderState{
				ProviderID:   req.ProviderID,
				WalletAddr:   req.WalletAddr,
				Status:       StatusApproved,
				Spec:         req.Spec,
				Capacity:     req.Capacity,
				RegisteredAt: time.Now(),
			}

			o.providersMu.Lock()
			o.providers[req.ProviderID] = providerState
			o.providersMu.Unlock()

			// DB에 저장
			if o.repo != nil {
				if err := o.repo.Create(ctx, providerState); err != nil {
					slog.Error("Failed to save provider to DB", "error", err, "providerID", req.ProviderID)
				}
			}
		}
	}

	// Send response via Redis (provider agent will be listening)
	responseStream := ProviderResponseStream(req.ProviderID)
	if _, err := o.producer.Publish(ctx, responseStream, response); err != nil {
		slog.Error("Failed to publish response", "error", err)
	}

	// Deploy Mining Pod if MiningConfig is provided
	if req.MiningConfig != nil && response.Success && o.miningManager != nil {
		go func() {
			deployCtx, cancel := context.WithTimeout(context.Background(), miningDeployTimeout)
			defer cancel()

			slog.Info("Deploying mining pod for provider",
				"providerID", req.ProviderID,
				"gpuCount", req.MiningConfig.GPUCount,
				"wallet", req.MiningConfig.WalletAddress,
			)

			if err := o.DeployMiningForProvider(deployCtx, req.ProviderID, req.MiningConfig); err != nil {
				slog.Error("Failed to deploy mining pod",
					"providerID", req.ProviderID,
					"error", err,
				)
			} else {
				slog.Info("Mining pod deployed successfully", "providerID", req.ProviderID)
			}
		}()
	}

	return nil
}

// generateJoinToken generates a kubeadm join token.
func (o *Orchestrator) generateJoinToken(ctx context.Context) (token string, caHash string, err error) {
	// Execute kubeadm token create
	cmd := exec.CommandContext(ctx, "kubeadm", "token", "create", "--print-join-command")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", "", fmt.Errorf("failed to create token: %w, output: %s", err, string(output))
	}

	// Parse the join command to extract token and hash
	joinCmd := strings.TrimSpace(string(output))
	parts := strings.Fields(joinCmd)

	for i, part := range parts {
		if part == "--token" && i+1 < len(parts) {
			token = parts[i+1]
		}
		if part == "--discovery-token-ca-cert-hash" && i+1 < len(parts) {
			caHash = parts[i+1]
		}
	}

	if token == "" || caHash == "" {
		return "", "", fmt.Errorf("failed to parse join command: %s", joinCmd)
	}

	return token, caHash, nil
}

// heartbeatMonitor monitors provider heartbeats and updates node status.
func (o *Orchestrator) heartbeatMonitor(ctx context.Context) {
	defer o.wg.Done()

	heartbeatConsumer, err := messaging.NewConsumer(o.redisClient, &messaging.ConsumerConfig{
		Stream:        StreamNames.Heartbeat,
		Group:         redisConsumerGroup,
		Consumer:      redisConsumerName,
		BlockDuration: streamBlockDuration,
	})
	if err != nil {
		slog.Error("Failed to create heartbeat consumer", "error", err)
		return
	}

	ticker := time.NewTicker(staleProviderCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-o.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			o.checkStaleProviders(ctx)
		default:
		}

		messages, err := heartbeatConsumer.ReadMessages(ctx, 10)
		if err != nil {
			slog.Error("Failed to read heartbeat messages", "error", err)
			time.Sleep(streamReadBackoff)
			continue
		}

		for _, msg := range messages {
			o.handleHeartbeat(ctx, msg)
			_ = heartbeatConsumer.Ack(ctx, msg.ID)
		}
	}
}

// handleHeartbeat processes a heartbeat message.
func (o *Orchestrator) handleHeartbeat(ctx context.Context, msg messaging.Message) {
	var hb HeartbeatMessage
	if err := msg.Unmarshal(&hb); err != nil {
		slog.Error("Failed to unmarshal heartbeat", "error", err)
		return
	}

	o.providersMu.Lock()
	if provider, exists := o.providers[hb.ProviderID]; exists {
		provider.LastHeartbeat = time.Now()
		provider.Status = hb.Status
		provider.NodeName = hb.NodeName
	}
	o.providersMu.Unlock()

	// DB에 heartbeat 업데이트
	if o.repo != nil {
		if err := o.repo.UpdateHeartbeat(ctx, hb.ProviderID, hb.Status); err != nil {
			slog.Debug("Failed to update heartbeat in DB", "error", err, "providerID", hb.ProviderID)
		}
	}

	// Update node labels based on status
	if hb.NodeName != "" {
		labels := map[string]string{
			"worldland.io/active-jobs":    fmt.Sprintf("%d", hb.ActiveJobs),
			"worldland.io/last-heartbeat": time.Now().UTC().Format(time.RFC3339),
		}
		if err := o.nodeManager.SetNodeLabels(ctx, hb.NodeName, labels); err != nil {
			slog.Error("Failed to update node labels", "error", err, "node", hb.NodeName)
		}

		// Check and update GPU taint
		if err := o.nodeManager.CheckAndUpdateGPUTaint(ctx, hb.NodeName); err != nil {
			slog.Error("Failed to update GPU taint", "error", err, "node", hb.NodeName)
		}
	}
}

// checkStaleProviders checks for providers that haven't sent heartbeats.
func (o *Orchestrator) checkStaleProviders(ctx context.Context) {
	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	staleThreshold := time.Now().Add(-staleProviderThreshold)

	for id, provider := range o.providers {
		if provider.Status == StatusJoined && provider.LastHeartbeat.Before(staleThreshold) {
			slog.Warn("Provider heartbeat stale, marking as offline",
				"providerID", id,
				"lastHeartbeat", provider.LastHeartbeat,
			)
			provider.Status = StatusOffline

			// Update node labels
			if provider.NodeName != "" {
				labels := map[string]string{
					"worldland.io/rental-status": "offline",
				}
				if err := o.nodeManager.SetNodeLabels(ctx, provider.NodeName, labels); err != nil {
					slog.Error("Failed to mark node as offline", "error", err)
				}
			}
		}
	}
}

// OnNodeJoined should be called when a node joins the cluster.
func (o *Orchestrator) OnNodeJoined(ctx context.Context, nodeName string, providerID string) error {
	o.providersMu.Lock()
	provider, exists := o.providers[providerID]
	if !exists {
		o.providersMu.Unlock()
		return fmt.Errorf("provider not found: %s", providerID)
	}
	provider.Status = StatusJoined
	provider.NodeName = nodeName
	provider.JoinedAt = time.Now()
	gpuModel := ""
	if len(provider.Spec.GPUs) > 0 {
		gpuModel = provider.Spec.GPUs[0].Name
	}
	o.providersMu.Unlock()

	// Mark node as available for rental
	if err := o.nodeManager.MarkNodeAsRentalAvailable(ctx, nodeName, providerID, gpuModel); err != nil {
		return fmt.Errorf("failed to mark node as available: %w", err)
	}

	slog.Info("Provider node joined cluster",
		"providerID", providerID,
		"nodeName", nodeName,
	)

	return nil
}
