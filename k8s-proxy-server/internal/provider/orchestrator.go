// Package provider is the platform's core domain: it tracks every GPU
// provider node, accounts for GPU/CPU/memory across the mining↔rental
// split, and reconciles in-memory state with Kubernetes and the DB.
//
// orchestrator.go holds only the Orchestrator facade: construction, the
// long-running worker fan-out (Start), graceful shutdown (Stop), and
// startup state recovery wiring. Each responsibility lives in a sibling
// file so this 1500-line domain stays navigable:
//
//   - orchestrator_registration.go  provider join + heartbeat lifecycle
//   - orchestrator_query.go         read-only lookups / search
//   - orchestrator_ledger.go        GPU/CPU/mem accounting + K8s recovery
//   - orchestrator_mining.go        mining pod allocation + monitoring
//   - orchestrator_podwatch.go      pod watch + expiry sweeper
//
// Design intent: the control plane is intentionally crash-tolerant.
// K8s and the DB are the durable sources of truth; this in-memory cache
// is rebuilt on boot (loadProvidersFromDB → RecoverMiningStates →
// RecoverJobAllocations) so a restart never loses accounting.
package provider

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/nubro999/worldland-gpu/internal/messaging"
	"github.com/redis/go-redis/v9"
)

// Orchestrator handles provider registration and management.
type Orchestrator struct {
	nodeManager   *NodeManager
	miningManager *MiningPodManager
	redisClient   *redis.Client
	producer      *messaging.Producer
	consumer      *messaging.Consumer
	repo          ProviderRepository // DB 저장소

	// Provider registry (in-memory cache)
	providers   map[string]*ProviderState
	providersMu sync.RWMutex

	// Configuration
	masterIP   string
	masterPort int

	// Shutdown
	stopCh chan struct{}
	wg     sync.WaitGroup
}

// ProviderState tracks the current state of a provider.
type ProviderState struct {
	ProviderID    string
	WalletAddr    string
	NodeName      string
	Status        RegistrationStatus
	Spec          SystemSpec       //시스템의 정보를 담고 있는 구조체
	Capacity      ProviderCapacity //provider.ProviderCapacity는 시스템의 정보를 바탕으로 provider.ProviderCapacity를 생성하는 함수
	LastHeartbeat time.Time
	RegisteredAt  time.Time
	JoinedAt      time.Time
}

// OrchestratorConfig holds configuration for the Orchestrator.
type OrchestratorConfig struct {
	MasterIP   string
	MasterPort int
}

// NewOrchestrator creates a new Orchestrator.
// repo는 nil일 수 있음 (DB 연결 실패 시에도 동작 가능)
func NewOrchestrator(nodeManager *NodeManager, redisClient *redis.Client, repo ProviderRepository, cfg *OrchestratorConfig) (*Orchestrator, error) {
	producer := messaging.NewProducer(redisClient)

	consumer, err := messaging.NewConsumer(redisClient, &messaging.ConsumerConfig{
		Stream:        StreamNames.Registration,
		Group:         redisConsumerGroup,
		Consumer:      redisConsumerName,
		BlockDuration: streamBlockDuration,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create consumer: %w", err)
	}

	// MiningPodManager 생성 (nodeManager의 clientset 사용)
	var miningManager *MiningPodManager
	if nodeManager != nil && nodeManager.clientset != nil {
		miningManager = NewMiningPodManager(nodeManager.clientset)
	}

	return &Orchestrator{
		nodeManager:   nodeManager,
		miningManager: miningManager,
		redisClient:   redisClient,
		producer:      producer,
		consumer:      consumer,
		repo:          repo,
		providers:     make(map[string]*ProviderState),
		masterIP:      cfg.MasterIP,
		masterPort:    cfg.MasterPort,
		stopCh:        make(chan struct{}),
	}, nil
}

// Start starts the orchestrator workers.
func (o *Orchestrator) Start(ctx context.Context) {
	// DB에서 기존 Provider 로드
	if err := o.loadProvidersFromDB(ctx); err != nil {
		slog.Warn("Failed to load providers from DB", "error", err)
	}

	// 기존 Mining Pod 상태 복구
	if err := o.RecoverMiningStates(ctx); err != nil {
		slog.Warn("Failed to recover mining states", "error", err)
	}

	// GPU Job 할당 상태 복구 (서버 재시작 시 K8s 실제 상태와 동기화)
	if err := o.RecoverJobAllocations(ctx); err != nil {
		slog.Warn("Failed to recover job allocations", "error", err)
	}

	o.wg.Add(5)

	// Registration handler
	go o.registrationWorker(ctx)

	// Heartbeat monitor
	go o.heartbeatMonitor(ctx)

	// Mining pod monitor
	go o.miningMonitor(ctx)

	// GPU Job pod watcher (실시간 Pod 삭제/변경 감지)
	go o.podWatcher(ctx)

	// Job 만료 모니터 (만료된 Job 자동 삭제)
	go o.jobExpirationMonitor(ctx)

	slog.Info("Orchestrator started")
}

// loadProvidersFromDB loads existing providers from database into memory.
func (o *Orchestrator) loadProvidersFromDB(ctx context.Context) error {
	if o.repo == nil {
		return nil // DB 없이 동작
	}

	providers, err := o.repo.ListAll(ctx)
	if err != nil {
		return err
	}

	o.providersMu.Lock()
	defer o.providersMu.Unlock()

	for _, p := range providers {
		o.providers[p.ProviderID] = p
	}

	slog.Info("Loaded providers from DB", "count", len(providers))
	return nil
}

// Stop stops the orchestrator.
func (o *Orchestrator) Stop() {
	close(o.stopCh)
	o.wg.Wait()
	slog.Info("Orchestrator stopped")
}
