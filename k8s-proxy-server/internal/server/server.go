// server.go — Gin HTTP server construction and routing.
//
// New() builds the middleware chain (Recovery → Logger → CORS) and
// health/readiness probes (/health, /ready — used by K8s liveness/
// readiness so a rolling deploy never sends traffic to a cold pod).
// Job routes need a K8s client; SetOrchestrator() is called once the
// orchestrator is up to attach provider/mining routes. Each subsystem
// is optional so the server still serves health checks if K8s/Redis
// are down (degraded, not dead).

package server

import (
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nubro999/worldland-gpu/internal/auth"
	"github.com/nubro999/worldland-gpu/internal/config"
	"github.com/nubro999/worldland-gpu/internal/handler"
	"github.com/nubro999/worldland-gpu/internal/job"
	"github.com/nubro999/worldland-gpu/internal/k8s"
	"github.com/nubro999/worldland-gpu/internal/middleware"
	"github.com/nubro999/worldland-gpu/internal/provider"
)

// Server는 HTTP 서버를 나타냅니다.
type Server struct {
	router       *gin.Engine
	config       *config.Config
	jwtManager   *auth.JWTManager
	jobManager   *job.JobManager
	jobHandler   *handler.JobHandler
	orchestrator *provider.Orchestrator
	nodeManager  *provider.NodeManager
}

// New는 새 서버 인스턴스를 생성합니다.
func New(cfg *config.Config) (*Server, error) {
	// JWT Manager 생성 (토큰 유효기간: 24시간)
	jwtManager := auth.NewJWTManager(cfg.JWTSecret, 24*time.Hour)

	// K8s clientset 초기화
	k8sCfg := &k8s.Config{
		InCluster: cfg.IsInCluster,
	}
	clientset, err := k8s.GetClientset(k8sCfg)
	if err != nil {
		log.Printf("Warning: K8s client 초기화 실패 (Job API 비활성화): %v", err)
	}

	// Job Manager 생성
	var jobManager *job.JobManager
	var nodeManager *provider.NodeManager
	if clientset != nil {
		jobManager = job.NewJobManager(clientset)
		nodeManager = provider.NewNodeManager(clientset)
	}

	// Gin 모드 설정
	if !cfg.DebugMode {
		gin.SetMode(gin.ReleaseMode)
	}

	// Gin 라우터 생성
	router := gin.New()

	// 미들웨어 등록
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowedOrigins: cfg.AllowedOrigins,
	}))

	server := &Server{
		router:      router,
		config:      cfg,
		jwtManager:  jwtManager,
		jobManager:  jobManager,
		nodeManager: nodeManager,
	}

	// 라우트 설정
	server.setupRoutes()

	return server, nil
}

// setupRoutes는 API 라우트를 설정합니다.
func (s *Server) setupRoutes() {
	// Health check
	s.router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	s.router.GET("/ready", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ready"})
	})

	// API v1 그룹
	v1 := s.router.Group("/api/v1")
	{

		// GPU Job 라우트 (DevAuthMiddleware: X-User-ID 헤더로 테스트, 나중에 AuthMiddleware로 교체)
		if s.jobManager != nil {
			s.jobHandler = handler.NewJobHandler(s.jobManager)
			jobRoutes := v1.Group("/jobs")
			jobRoutes.Use(middleware.DevAuthMiddleware()) // 테스트용 인증
			{
				jobRoutes.POST("", s.jobHandler.CreateJob)       // 새 GPU 컨테이너 생성
				jobRoutes.GET("", s.jobHandler.ListJobs)         // 내 Job 목록
				jobRoutes.GET("/:id", s.jobHandler.GetJob)       // Job 상태 조회
				jobRoutes.DELETE("/:id", s.jobHandler.DeleteJob) // Job 삭제
			}
		}
	}
}

// Run은 HTTP 서버를 시작합니다.
func (s *Server) Run() error {
	addr := fmt.Sprintf(":%s", s.config.Port)
	log.Printf("서버 시작: http://localhost%s", addr)
	return s.router.Run(addr)
}

// SetOrchestrator sets the orchestrator for provider APIs.
func (s *Server) SetOrchestrator(orchestrator *provider.Orchestrator) {
	s.orchestrator = orchestrator

	// JobHandler에도 Orchestrator 및 NodeManager 연결
	if s.jobHandler != nil {
		s.jobHandler.SetOrchestrator(orchestrator)
		if s.nodeManager != nil {
			s.jobHandler.SetNodeManager(s.nodeManager)
		}
	}

	// Provider 라우트 등록 (인증 불필요)
	providerHandler := handler.NewProviderHandler(orchestrator)
	if s.nodeManager != nil {
		providerHandler.SetNodeManager(s.nodeManager)
	}
	providerRoutes := s.router.Group("/api/v1/providers")
	{
		providerRoutes.GET("", providerHandler.ListProviders)                       // 전체 Provider 목록
		providerRoutes.GET("/search", providerHandler.SearchProviders)              // Provider 검색
		providerRoutes.GET("/gpu-availability", providerHandler.GetGPUAvailability) // 실시간 GPU 가용성
		providerRoutes.GET("/:id", providerHandler.GetProvider)                     // 특정 Provider 조회
	}
	log.Println("✅ Provider API 활성화됨")

	// Mining API 라우트 등록
	miningHandler := handler.NewMiningHandler(orchestrator)
	miningRoutes := s.router.Group("/api/v1/providers/:id/mining")
	{
		miningRoutes.GET("", miningHandler.GetMiningStatus)             // 채굴 상태 조회
		miningRoutes.POST("/allocate", miningHandler.AllocateMiningGPU) // 채굴 GPU 할당
		miningRoutes.POST("/release", miningHandler.ReleaseMiningGPU)   // 채굴 GPU 반환
		miningRoutes.POST("/start", miningHandler.StartMining)          // 채굴 시작
		miningRoutes.POST("/stop", miningHandler.StopMining)            // 채굴 중지
	}

	// Mining Metrics API (Provider ID 없이 전체 조회)
	s.router.GET("/api/v1/mining/metrics", miningHandler.GetMiningMetrics)

	log.Println("✅ Mining API 활성화됨")
}
