// Command server is the API-gateway / control-plane entrypoint.
//
// Boot sequence (fail-soft by design — a missing optional dependency
// degrades a feature, it does not crash the process):
//  1. config.Load() — env/.env, auto-detect in-cluster K8s.
//  2. If ENABLE_ORCHESTRATOR: wire K8s + Redis + (optional) Postgres
//     and start the provider Orchestrator (startOrchestrator).
//  3. server.New() builds the Gin HTTP server; SetOrchestrator attaches
//     provider/mining/job routes once the orchestrator is up.
//  4. SIGINT/SIGTERM → cancel context → Orchestrator.Stop() → graceful
//     shutdown so in-flight work drains before exit (downtime control).

package main

import (
	"context"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/nubro999/worldland-gpu/internal/config"
	"github.com/nubro999/worldland-gpu/internal/db"
	"github.com/nubro999/worldland-gpu/internal/k8s"
	"github.com/nubro999/worldland-gpu/internal/messaging"
	"github.com/nubro999/worldland-gpu/internal/provider"
	"github.com/nubro999/worldland-gpu/internal/server"
)

func main() {
	// 1. 설정 로드
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("설정 로드 실패: %v", err)
	}

	// 2. 설정 값 출력 (테스트용)
	log.Println("=== K8s Proxy Server Config ===")
	log.Printf("Port: %s", cfg.Port)
	log.Printf("Debug Mode: %v", cfg.DebugMode)
	log.Printf("Orchestrator Enabled: %v", cfg.EnableOrchestrator)

	// Context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 3. Orchestrator 시작 (활성화된 경우)
	var orchestrator *provider.Orchestrator
	if cfg.EnableOrchestrator {
		orchestrator, err = startOrchestrator(ctx, cfg)
		if err != nil {
			log.Printf("Warning: Orchestrator 시작 실패: %v", err)
		} else {
			log.Println("✅ Provider Orchestrator 시작됨")
		}
	}

	// 4. 서버 생성 및 시작
	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("서버 생성 실패: %v", err)
	}

	// Orchestrator를 서버에 연결 (Provider API 활성화)
	if orchestrator != nil {
		srv.SetOrchestrator(orchestrator)
	}

	// Graceful shutdown 설정
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		log.Println("서버 종료 중...")
		cancel()

		if orchestrator != nil {
			orchestrator.Stop()
		}
	}()

	if err := srv.Run(); err != nil {
		log.Fatalf("서버 실행 실패: %v", err)
	}
}

// startOrchestrator initializes and starts the provider orchestrator.
func startOrchestrator(ctx context.Context, cfg *config.Config) (*provider.Orchestrator, error) {
	// K8s clientset 초기화
	k8sCfg := &k8s.Config{
		InCluster:  cfg.IsInCluster,
		Kubeconfig: os.Getenv("KUBECONFIG"),
	}
	if k8sCfg.Kubeconfig == "" {
		k8sCfg.Kubeconfig = os.Getenv("HOME") + "/.kube/config"
	}

	clientset, err := k8s.GetClientset(k8sCfg)
	if err != nil {
		return nil, err
	}
	slog.Info("K8s client 초기화 완료")

	// Redis 연결
	redisClient, err := messaging.GetClient(&messaging.Config{
		Host:     cfg.RedisHost,
		Port:     cfg.RedisPort,
		Password: cfg.RedisPass,
	})
	if err != nil {
		return nil, err
	}
	slog.Info("Redis 연결 완료", "host", cfg.RedisHost, "port", cfg.RedisPort)

	// PostgreSQL 연결 (실패해도 계속 진행)
	var repo provider.ProviderRepository
	if cfg.PostgresPassword != "" {
		pgDB, err := db.NewPostgresDB(ctx, cfg)
		if err != nil {
			slog.Warn("PostgreSQL 연결 실패, DB 없이 동작", "error", err)
		} else {
			// 마이그레이션 실행
			if err := pgDB.Migrate(ctx); err != nil {
				slog.Warn("PostgreSQL 마이그레이션 실패", "error", err)
			} else {
				repo = provider.NewPostgresRepository(pgDB.Pool)
				slog.Info("PostgreSQL 연결 완료", "host", cfg.PostgresHost, "db", cfg.PostgresDB)
			}
		}
	} else {
		slog.Info("PostgreSQL 비밀번호 미설정, DB 없이 동작")
	}

	// NodeManager 생성
	nodeManager := provider.NewNodeManager(clientset)

	// Orchestrator 생성 및 시작
	orch, err := provider.NewOrchestrator(nodeManager, redisClient, repo, &provider.OrchestratorConfig{
		MasterIP:   cfg.MasterPublicIP,
		MasterPort: cfg.MasterAPIPort,
	})
	if err != nil {
		return nil, err
	}

	orch.Start(ctx)
	return orch, nil
}
