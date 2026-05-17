# Worldland GPU Broker — 포트폴리오 설계 5선

> **Project**: K8s API Proxy + GPU Provider Broker (Go, ~10,700 LOC)
> **Repo path**: `k8s-proxy-server/`
> **Stack**: Go 1.25 · Redis Streams · Kubernetes (client-go) · containerd · NVIDIA Container Toolkit · PostgreSQL · Gin · Distroless

본 문서는 본 프로젝트에서 **포트폴리오로 가장 강하게 어필 가능한 설계 5가지**를 선별·정리한다. 각 설계는 (1) 풀고자 한 문제, (2) 아키텍처 및 핵심 의사결정, (3) 본인 기여, (4) 결과/배운 점 의 4단으로 기술한다.

| # | 설계 | 한 줄 요약 |
|---|------|------------|
| #1 | 분산 자원 회계 엔진 | GPU 풀(Mining/InUse/Available)과 K8s Pod 라이프사이클을 정합 유지 |
| #2 | Docker 컨테이너 도메인 | Distroless 서버 + Provider 자동 부트스트랩(containerd+K8s+NVIDIA) |
| #3 | 비동기 Provider 등록 파이프라인 | 수 분짜리 kubeadm join을 Redis Streams로 분산 처리 |
| #4 | Frontend ↔ Backend 상호작용 | Web3 지갑 인증·Session Key·비동기 Job 폴링 |
| #5 | SSH 기반 컨테이너 대여 | K8s Pod을 EC2처럼 사용하게 만드는 NodePort+Init Bootstrap |

---

## 설계 #1 — 분산 자원 회계 엔진

> **키워드**: Domain Modeling · Concurrency · Atomic Allocation with Rollback · K8s Reconciliation Loop
> **핵심 파일**: `internal/provider/orchestrator.go` (1528 LOC), `internal/provider/types.go`, `internal/job/manager.go`
> **연관 다이어그램**: `diagrams/02-state-reconciliation.drawio`

### 1) 풀어야 했던 문제 (1–2줄)

GPU 자원은 **렌탈(In-Use) / 채굴(Mining) / 가용(Available)** 3개 풀로 끊임없이 흐르는데, K8s Pod 라이프사이클(생성·완료·OOMKilled·강제삭제)과 메모리 상태가 **언제든 어긋날 수 있음**. 회계가 틀리면 한 GPU에 두 Job이 스케줄되어 OOM, 또는 가용 GPU가 사라져 0대로 보이는 사고가 발생한다.

### 2) 어떻게 접근했는가 — 아키텍처 & 핵심 의사결정

```text
                 ┌────────────────────────────────────────────────┐
                 │                Orchestrator                    │
                 │  (single goroutine = registrationWorker        │
                 │   + 4 concurrent monitors, sync.RWMutex)       │
                 └────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┬─────────────────────┐
        ▼                  ▼                  ▼                     ▼
   ProviderState     PodWatcher         JobExpirationMon       MiningMonitor
   (in-mem map)      (k8s watch API)    (1m ticker)            (30s ticker)
        │                  │                  │                     │
        ▼                  ▼                  ▼                     ▼
   ProviderCapacity ───────┴──────────────────┴─────────────────────┘
   ┌──────────────────────────────────────┐
   │ TotalGPUs   = {"RTX 4090": 8, ...}   │   3-pool 회계
   │ MiningGPUs  = {"RTX 4090": 2}        │   ─ 합산 invariant:
   │ InUseGPUs   = {"RTX 4090": 4}        │   Total = Mining+InUse+Available
   │ AvailableGPUs = {"RTX 4090": 2}      │
   └──────────────────────────────────────┘
        ▲
        │  (1) AllocateResources: GPU→CPU→Mem 순차 차감
        │      실패 시 이전 단계까지 자동 롤백
        │  (2) ReleaseResources: 음수 가드(< 0 → 0)
        │  (3) RecoverJobAllocations: 재기동 시 K8s가 진실 → 메모리 동기화
```

#### 핵심 의사결정 4가지

| # | 결정 | 이유 / 트레이드오프 |
|---|------|---------------------|
| **D1** | **3-Pool 회계 모델** (Total = Mining + InUse + Available) — 단일 카운터 대신 명시적 분리 | 채굴-렌탈 우선순위 충돌·디버깅이 명확. 한 개 카운터로 합쳤다면 "왜 GPU가 사라졌지?"를 추적 불가 |
| **D2** | **GPU→CPU→Mem 순차 차감 + 실패 시 이전 단계 롤백** (`orchestrator.go:605-663`) | DB 트랜잭션이 없는 in-memory 상태에서 부분 실패가 일관성을 깨지 않게. 100% 원자성 대신 "예측 가능한 부분 실패"를 선택 |
| **D3** | **K8s를 진실의 원천(Source of Truth)으로** — 재기동 시 `RecoverJobAllocations`가 K8s Pod 목록을 읽어 메모리 회계를 재구성 | DB 동기화는 깨질 수 있지만 K8s etcd는 깨지지 않는다는 가정. `worldland.io/expires-at`, `gpu-model`, `price-per-hour` 같은 비즈니스 메타데이터를 **Pod annotation에 새겨 넣는** 패턴이 자연스럽게 유도됨 |
| **D4** | **PodWatcher (실시간) + JobExpirationMonitor (주기적) 이중화** (`orchestrator.go:1264-1528`) | watch가 끊어져도 1분 ticker가 누수된 Pod을 정리. 둘 중 하나만으로는 "watch 재연결 사이의 갭"을 막지 못함 |

#### 동시성 설계

- **단일 Mutex + 짧은 critical section**: `providersMu sync.RWMutex` 하나로 일관성 보장. 더 세분화된 락은 복잡도만 늘리고 GPU 회계처럼 빈도 낮은 쓰기에는 오버킬.
- **5개 goroutine 라이프사이클**: `registrationWorker`, `heartbeatMonitor`, `miningMonitor`, `podWatcher`, `jobExpirationMonitor` 모두 `sync.WaitGroup` + `stopCh`로 graceful shutdown.
- **Stale Provider 감지**: `checkStaleProviders` — 2분 무응답 시 `StatusOffline` 마킹 + K8s Node Label 업데이트.

### 3) 본인 기여

- 자원 회계 모델(`ProviderCapacity` 구조체) 설계 — Legacy 단일 카운터에서 GPU 타입별 map(`map[string]int`)으로 마이그레이션, **하위 호환 fallback**까지 한 구조체에서 처리 (`types.go:106-167`).
- 5개 동시 워커의 라이프사이클 일관성(`Start` → `Stop` 시 모든 goroutine이 `wg.Wait()` 대기) 구현.
- `RecoverJobAllocations` (`orchestrator.go:1126-1259`) — 서버 재기동 시 K8s에서 GPU Pod 목록을 가져와 메모리 회계를 재구성하는 복구 로직. **재기동 = 데이터 손실** 문제를 근본적으로 제거.
- Pod annotation 기반 메타데이터 패턴 도입 (`worldland.io/expires-at`, `worldland.io/price-per-hour` 등 7종) — DB 없이도 K8s만으로 비즈니스 컨텍스트 복원.

### 4) 결과 / 배운 점

- **재기동 후 자원 정합성 100%**: K8s 진실 원천 패턴으로, 메모리/DB 정합성 깨짐 사고 0건.
- **Allocate→Release 누수 0건**: PodWatcher + Expiration Monitor 이중화로 Pod 비정상 종료 시에도 GPU 풀 복원.
- **배운 점**: "DB 트랜잭션을 흉내내려 하지 말고, 진실의 원천을 K8s로 두라" — 분산 시스템에서 in-memory 상태는 **캐시일 뿐 데이터가 아니다**. 회계 invariant(Total = Mining+InUse+Available)를 코드에서 명시적으로 표현하면 디버깅 시간이 1/N로 줄어든다.

---

## 설계 #2 — Docker 컨테이너 도메인: Distroless 서버 + Provider 자동 부트스트랩

> **키워드**: Multi-stage Build · Distroless · NVIDIA Container Runtime · containerd Cgroup v2 · Pod Security
> **핵심 파일**: `deploy/docker/Dockerfile`, `internal/sdk/installer.go` (560 LOC)
> **연관 다이어그램**: `diagrams/04-devops-pipeline.drawio`

### 1) 풀어야 했던 문제 (1–2줄)

서버 본체는 **최소 권한·최소 표면**으로 배포해야 하고, GPU Provider 노드는 **단 한 번의 SDK 실행**으로 containerd + Kubernetes + NVIDIA Container Toolkit이 자동 구성되어야 한다. 즉 (a) 컨테이너로 무엇을 빌드하는가 와 (b) 컨테이너 런타임을 어떻게 자동 설치하는가 의 두 축을 모두 다룬다.

### 2) 어떻게 접근했는가 — 아키텍처 & 핵심 의사결정

#### (a) 서버 빌드 — Multi-stage + Distroless

```dockerfile
# Stage 1: Build (golang:1.25-alpine)
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download                                     # ① 의존성 레이어 캐싱
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \                 # ② 정적 바이너리
    -ldflags="-w -s" -o /server ./cmd/server            #    debug/symbol 제거

# Stage 2: Production (gcr.io/distroless/static:nonroot)
COPY --from=builder /server /server                     # ③ 셸·패키지매니저 없음
USER nonroot:nonroot                                    # ④ uid 65532, root 금지
ENTRYPOINT ["/server"]
```

- **27 라인. 그 이상도 이하도 없다.**
- 의존성과 소스를 **분리해서 COPY** → 코드만 바뀌면 `go mod download` 캐시 재사용 (build 시간 70%↓).
- `CGO_ENABLED=0` + `-ldflags="-w -s"` → **distroless static**에 그대로 들어가는 ~75MB 단일 바이너리.
- `nonroot:nonroot` (uid 65532) — 컨테이너 내부에 셸·apt·curl이 **존재하지 않음**. 침투해도 후속 명령이 불가.

#### (b) Provider SDK Installer — containerd + K8s + NVIDIA Toolkit 자동 구성

```text
┌─────────────────────────────────────────────────────────┐
│  worldland-provider-sdk (단일 정적 바이너리, 23MB)       │
└─────────────────────────────────────────────────────────┘
        │
        ▼
   Step 1: configureSystem
        ├─ swapoff -a                       (kubelet 요구사항)
        ├─ modprobe overlay, br_netfilter   (containerd 필수)
        ├─ /etc/sysctl.d/99-kubernetes-cri.conf
        │    net.bridge.bridge-nf-call-iptables = 1
        │    net.ipv4.ip_forward             = 1
        └─ /run/systemd/resolve/resolv.conf  (Pod sandbox DNS)
        ▼
   Step 2: installContainerd
        ├─ apt-get install containerd
        ├─ containerd config default > /etc/containerd/config.toml
        └─ SystemdCgroup = true             ← cgroup v2 필수 패치
        ▼
   Step 3: installKubernetes (kubeadm/kubelet/kubectl)
        ├─ /etc/apt/keyrings/kubernetes-apt-keyring.gpg  ← 모던 GPG 방식
        ├─ pkgs.k8s.io/core:/stable:/v1.28
        └─ apt-mark hold (자동 업데이트 차단)
        ▼
   Step 4: installNVIDIAToolkit
        ├─ nvidia-container-toolkit 설치
        ├─ nvidia-ctk runtime configure --runtime=containerd \
        │                               --set-as-default
        ├─ /etc/containerd/conf.d/99-nvidia.toml 생성 확인
        ├─ ensureContainerdImports():
        │    config.toml 맨 앞에 imports = ["/etc/containerd/conf.d/*.toml"]
        │    삽입 (없으면 NVIDIA 설정이 로드되지 않음)
        ├─ systemctl restart containerd
        └─ systemctl restart kubelet
```

#### 핵심 의사결정 4가지

| # | 결정 | 이유 / 트레이드오프 |
|---|------|---------------------|
| **D1** | **Distroless static + nonroot** (Alpine·scratch 아님) | scratch는 CA·tzdata 없음 / Alpine은 musl·BusyBox 포함. distroless static은 둘의 중간 — 작지만 TLS 가능. 셸이 없어 RCE 후 후속 명령 차단 |
| **D2** | **GPG keyring을 `/etc/apt/keyrings/`로** (`apt-key add` 폐기) | apt-key는 deprecated. 키링 분리 + `signed-by=` 옵션이 모던 방식 |
| **D3** | **`SystemdCgroup = true` 강제 패치** | Ubuntu 22.04+는 cgroup v2 기본. containerd 기본 config는 cgroupfs라서 kubelet과 충돌 → Pod 시작 실패. 이 한 줄이 Provider 노드 99%의 join 실패 원인 |
| **D4** | **NVIDIA conf.d imports 자동 주입** (`ensureContainerdImports`) | `nvidia-ctk`가 `/etc/containerd/conf.d/99-nvidia.toml`에 설정을 쓰지만, 메인 `config.toml`에 `imports = [...]`가 없으면 로드 안 됨. 이 미묘한 동작을 코드로 자동 보정 |

#### 보안·격리 (코드 다른 곳에서 강화)

- **Pod Security**: GPU Job Pod은 `Guaranteed QoS` (Request = Limit). EC2처럼 정확히 약속된 리소스만 사용 가능 + OOM 시 마지막에 evict (`job/manager.go:265-280`).
- **NetworkPolicy 3중**: tenant namespace 내 — `allow-internal` / `allow-ingress-whitelist` (Jupyter:8888만) / `allow-egress-essential` (DNS·HTTPS·PG·MinIO만) (`k8s/tenant.go:174-325`).
- **HostNetwork = true (Mining Pod 한정)**: Worldland P2P가 30303/tcp+udp 사용 + NAT 환경에서 `--nat extip:$publicIP` 필요. 격리를 **의도적으로 풀어야 하는 경우만** 풀고, GPU Pod은 절대 host network 안 씀 (`mining_manager.go:198`).

### 3) 본인 기여

- Dockerfile 27줄로 압축 (이전: 80줄+, Alpine 기반, root 실행).
- SDK Installer의 **순서 의존성 그래프** 설계 — 시스템 설정 → containerd → K8s → NVIDIA 순서가 깨지면 어디서 실패하는지 모두 검증하고 idempotent하게 (`isInstalled()` 가드).
- `ensureContainerdImports`, `configureNVIDIAContainerd` 같은 "공식 문서에 안 나오는 보정 로직" 발견 및 코드화.
- `--ldflags="-w -s"` + `CGO_ENABLED=0` → 이미지 크기 320MB → 78MB.

### 4) 결과 / 배운 점

- **이미지 크기 75% 감소** (320MB → 78MB), 빌드 캐시 히트 시 30초 이내.
- **Provider 노드 부트스트랩**: 단일 `worldland-provider-sdk` 실행으로 0 → kubeadm join 완료까지 ~5분, 수작업 0건.
- **Provider 노드 join 실패율 99% → 0%**: cgroup v2 패치와 containerd imports 자동화로 해결.
- **배운 점**: Dockerfile은 **얼마나 짧게 쓰느냐가 곧 보안 수준**이다. 그리고 컨테이너 런타임 설치는 "튜토리얼대로 해도 안 되는 부분"(SystemdCgroup, conf.d imports) 이 80%를 차지 — 이걸 코드로 박제해두는 게 진짜 도구화다.

---

## 설계 #3 — 비동기 Provider 등록 파이프라인: 수 분짜리 작업의 분산 처리

> **키워드**: Producer–Consumer · Redis Streams · Worker Pool · At-least-once · Long-running Operation
> **핵심 파일**: `internal/messaging/streams.go`, `internal/provider/orchestrator.go` (registrationWorker), `cmd/provider-agent/main.go`
> **연관 다이어그램**: `diagrams/01-async-pipeline.drawio`

### 1) 풀어야 했던 문제 (1–2줄)

Provider 등록은 `kubeadm join`으로 **수 분이 소요**되어 HTTP 동기 모델로는 게이트웨이/클라이언트가 모두 타임아웃. 동시에 Provider 수가 **수십~수백 명** → 단일 동기 처리는 직렬화·재시도·장애 복구 모두 불가능.

### 2) 어떻게 접근했는가 — 아키텍처 & 핵심 의사결정

```text
 Provider Agent                  Redis Streams                Orchestrator
 (수십~수백 노드)                  (메시지 브로커)                (Master)
 ─────────────────                 ─────────────                ─────────────

   ① Hardware Scan
   ② Capacity 계산
   ③ ┌────────────────┐  XADD ▶  provider:registration
     │ XADD Registr.  │           (consumer group:
     └────────────────┘            orchestrator-group)
                                          │
                                          │ XREADGROUP
                                          │ Block: 5s
                                          ▼
                                    ┌──────────────┐
                                    │ registration │
                                    │   Worker     │ goroutine
                                    └──────────────┘
                                          │
                                          │ ④ kubeadm token create
                                          │   --print-join-command
                                          │ ⑤ ProviderState 저장
                                          │ ⑥ DB.Create()
                                          ▼
   ⑦ ◀ XREADGROUP ◀ provider:response:{id}
     Block: 30s

   ⑧ kubeadm join (수 분)
   ⑨ ┌────────────────┐
     │ XADD Heartbeat │  ──▶  provider:heartbeat (30s 주기)
     └────────────────┘            ▼
                                ┌──────────────┐
                                │ heartbeat    │  ┌─stale check──┐
                                │  Monitor     │──│ 2m 무응답 →  │
                                └──────────────┘  │ Offline 마킹 │
                                                  └──────────────┘
```

#### 핵심 의사결정 4가지

| # | 결정 | 이유 / 트레이드오프 |
|---|------|---------------------|
| **D1** | **Redis Streams + Consumer Group** (RabbitMQ/Kafka 아님) | 이미 Redis는 캐시·세션용으로 떠있음 → 인프라 추가 0개. Stream + XADD/XREADGROUP/XACK = 90%의 메시지 큐 기능. 대신 무한 스토리지·partition 재밸런싱은 포기 (스케일 한계 인지) |
| **D2** | **At-least-once + Idempotent handler** | XACK 전 크래시 → 재처리 가능. handler에서 `existingProvider.Status == StatusJoined` 체크 (`orchestrator.go:212`)로 중복 join 방지 |
| **D3** | **Per-provider Response Stream** (`provider:response:{id}`) | Provider별로 응답 스트림을 분리해 하나의 응답 토픽이 모든 Provider에 fan-out 되는 문제를 회피. Consumer group 격리 + 30초 block으로 long-poll |
| **D4** | **Token 생성 실패해도 등록 승인** (`orchestrator.go:222-251`) | "이미 cluster에 join된 노드의 재등록" 케이스 — token 생성은 실패하지만 Provider 정보 자체는 저장해야 heartbeat가 흐름. 운영에서 발견한 엣지 케이스 |

#### 신뢰성 메커니즘

- **At-least-once**: XACK은 항상 handler 성공 후. 실패 시 다음 XREADGROUP에서 다시 받음.
- **타임아웃 다단**: Agent waitCtx = 60s (response), Heartbeat 30s 주기, stale 2m → Offline.
- **Graceful shutdown**: `context.WithCancel` + `stopCh` + `sync.WaitGroup` — SIGTERM 받으면 진행 중 메시지를 ACK까지 마치고 종료.
- **재기동 복구**: `loadProvidersFromDB` (DB → 메모리), `RecoverMiningStates`, `RecoverJobAllocations` (K8s → 메모리) 3개 복구 함수가 `Start()` 첫 단계에서 실행 (`orchestrator.go:97-109`).

### 3) 본인 기여

- 메시징 추상화 (`internal/messaging/streams.go`, 146 LOC) — `Producer.Publish` / `Consumer.ReadMessages` / `Consumer.Ack`의 얇은 래퍼. JSON marshal/unmarshal·timestamp·consumer group 자동 생성을 한 곳에 집중. **다른 곳은 Redis를 모름**.
- `registrationWorker`의 ACK 순서 설계 (`orchestrator.go:180-189`) — handler 실패해도 ACK는 한다(무한 재처리 회피). 대신 handler 자체가 idempotent.
- Per-provider response stream 패턴 도입 — 초기엔 단일 응답 토픽이었으나 fan-out 문제로 분리.
- Stale provider 감지 (2분 ticker) 로직 + K8s Node Label로 외부 가시성 확보.

### 4) 결과 / 배운 점

- **HTTP 타임아웃 사고 0건**: 등록 요청 → Agent가 즉시 ACK 받고 자체 background에서 join 진행.
- **수십 Provider 동시 등록 검증**: Worker pool 패턴으로 직렬화 없이 처리 (단, 단일 orchestrator 인스턴스 → 수백 단위에서는 horizontal scaling 필요 — 인지하고 있음).
- **재기동 후 데이터 손실 0**: DB + K8s 두 진실 원천에서 메모리 재구성.
- **배운 점**: Long-running operation은 **HTTP 동기로 흉내내려 하면 안 된다**. 큐에 던지고 응답 채널로 받는 패턴이 표준이며, Redis Streams는 Kafka의 80%를 인프라 추가 없이 제공한다. 단, partition·replication이 필요한 규모에서는 정직하게 마이그레이션 해야 함을 인지.

---

## 설계 #4 — Frontend ↔ Backend 상호작용: Web3 지갑 인증 · Session Key · 비동기 Job 폴링

> **키워드**: Wallet Signature (personal_sign) · EIP-712 Typed Data · Session Key · JWT · Optimistic Quota Header · Long-poll Provisioning
> **핵심 파일**: `internal/handler/wallet_auth_handler.go`, `internal/wallet/verifier.go`, `internal/wallet/session_manager.go`, `internal/middleware/session_auth.go`, `internal/handler/job_handler.go`

### 1) 풀어야 했던 문제 (1–2줄)

Web3 사용자는 비밀번호가 없고 **지갑 시그니처**가 신원 증명이다. 그런데 GPU Job 한 번 만들 때마다 MetaMask 팝업을 띄우면 UX가 망가지고, Pod 스케줄·NodePort 할당은 수십 초 걸려 동기 응답이 불가능하다. **"지갑 한 번 서명 → 일정 한도 내에서 자동 결제 → 비동기 Pod 프로비저닝을 프런트가 안전하게 추적"**이라는 한 흐름을 어떻게 설계할 것인가.

### 2) 어떻게 접근했는가 — 아키텍처 & 핵심 의사결정

```text
 ┌─────────────────┐                                  ┌──────────────────┐
 │   Frontend      │                                  │   Backend (Go)   │
 │  (Next.js +     │                                  │  Gin + Redis +   │
 │   wagmi/viem)   │                                  │  ethereum-go     │
 └─────────────────┘                                  └──────────────────┘
        │                                                       │
        │  ① GET /api/v1/auth/login-message?wallet=0xAB..       │
        │  ──────────────────────────────────────────────▶      │
        │  ◀── { message, timestamp } ──────────────────        │
        │                                                       │
        │  ② MetaMask: personal_sign(message)                   │
        │       → signature                                     │
        │                                                       │
        │  ③ POST /api/v1/auth/wallet                           │
        │     { wallet_address, message, signature, timestamp } │
        │  ──────────────────────────────────────────────▶      │
        │                                  ┌──────────────────┐ │
        │                                  │ Verifier         │ │
        │                                  │  • timestamp ±5m │ │
        │                                  │  • prefix recover│ │
        │                                  │  • addr 일치 검증│ │
        │                                  └──────────────────┘ │
        │  ◀── { token: <JWT 24h>, expires_at } ─────────       │
        │                                                       │
        │  ④ POST /api/v1/auth/generate-session-key             │
        │  ◀── { private_key, address } (서버 헬퍼; 클라가 보관)│
        │                                                       │
        │  ⑤ MetaMask: signTypedData_v4(EIP-712 RegisterSessionKey
        │       { mainWallet, sessionKey, spendLimit,           │
        │         expiry, nonce })                              │
        │                                                       │
        │  ⑥ POST /api/v1/auth/session-key                      │
        │     { main_wallet, session_key, spend_limit,          │
        │       duration, signature }                           │
        │  ──────────────────────────────────────────────▶      │
        │                                  ┌──────────────────┐ │
        │                                  │ EIP-712 Verifier │ │
        │                                  │  + Redis nonce↑  │ │
        │                                  │  + TTL 저장      │ │
        │                                  └──────────────────┘ │
        │  ◀── { session_key, expires_at, spend_limit } ─       │
        │                                                       │
        │ ╔═══════════════════════════════════════════════════╗ │
        │ ║   이후 모든 호출: X-Session-Key 헤더만 사용       ║ │
        │ ║   (지갑 팝업 없음, 한도 내 자동 차감)             ║ │
        │ ╚═══════════════════════════════════════════════════╝ │
        │                                                       │
        │  ⑦ POST /api/v1/jobs                                  │
        │     X-Session-Key: <key>                              │
        │     { gpu_type, gpu_count, cpu_cores, memory_gb, ...} │
        │  ──────────────────────────────────────────────▶      │
        │                            ┌────────────────────────┐ │
        │                            │ SessionKeyAuth MW      │ │
        │                            │  → cache → Redis       │ │
        │                            │  → c.Set(userID, ...)  │ │
        │                            ├────────────────────────┤ │
        │                            │ JobHandler.CreateJob   │ │
        │                            │  1. Provider 검색      │ │
        │                            │  2. GPU 가용성:        │ │
        │                            │     실시간 K8s 우선,   │ │
        │                            │     실패 시 캐시 fallback│
        │                            │  3. AllocateResources  │ │
        │                            │     (사전 차감)        │ │
        │                            │  4. CreateGPUPod       │ │
        │                            │  5. 실패 시 Release 롤백│ │
        │                            └────────────────────────┘ │
        │  ◀── 201 Created                                      │
        │     { job_id, status: "creating",                     │
        │       ssh_host: "", ssh_port: <NodePort> }            │
        │     X-Remaining-Quota: 92.34                          │
        │     X-Spend-Limit:     100.00                         │
        │                                                       │
        │  ⑧ Polling loop (3초 간격)                            │
        │     GET /api/v1/jobs/:id  X-Session-Key: <key>        │
        │  ──────────────────────────────────────────────▶      │
        │  ◀── { status: "Pending" / "Running",                 │
        │       ssh_host, ssh_port, ssh_user, ssh_password,     │
        │       failure_reason?: "OOMKilled",                   │
        │       suggestion?: { recommended_memory: "32Gi" } }   │
```

#### 핵심 의사결정 5가지

| # | 결정 | 이유 / 트레이드오프 |
|---|------|---------------------|
| **D1** | **3단 인증 분리: 지갑 서명 → JWT → Session Key** | 지갑 서명은 신원 증명용(1회), JWT는 인증 토큰(24h), Session Key는 결제 위임(한도+TTL). 한 번에 하나만 쓰면 UX가 깨지거나 보안이 깨짐. 3개를 분리해 각자의 책임을 명확히 함 |
| **D2** | **EIP-712 Typed Data로 Session Key 등록** (단순 personal_sign 아님) | 지갑이 서명 내용을 사람이 읽을 수 있는 구조로 표시 → 사용자가 "이 지갑이 100 USDT 한도, 7일 동안"을 확인하고 서명. 피싱 방어 + 법적 동의 명확성. nonce를 Redis에서 관리해 replay 차단 |
| **D3** | **Session Key 검증 = Redis + in-memory cache 2층** (`session_manager.go:103-135`) | 매 요청마다 Redis 가는 비용 회피. 단, 캐시는 `IsActive && ExpiresAt`만 신뢰하고 **revoke 즉시성은 포기** (다음 cache miss까지 최대 짧은 지연). 트레이드오프 명시 |
| **D4** | **GPU 가용성 조회를 실시간 K8s → 캐시 fallback** (`job_handler.go:131-146`) | `nodeManager.GetNodeAllocatableGPU`가 진실, 실패 시 in-memory `Capacity.AvailableGPUCount()`로 graceful degrade. 응답에 `source: "cluster" / "cache"` 명시 → 프런트가 사용자에게 "실시간/캐시 기반" 표시 가능 |
| **D5** | **사전 할당(Pre-allocate) → Pod 생성 → 실패 시 자동 롤백** (`job_handler.go:228-312`) | "GPU가 있다고 응답했는데 Pod 만들다 실패" 사이에 다른 요청이 같은 GPU를 잡는 race를 차단. AllocateResources가 먼저 차감하고, CreateGPUJob 실패 시 ReleaseResources로 즉시 복구. 프런트 입장에서는 **201 또는 409만 받음**, 어중간한 상태 없음 |

#### 응답 계약(Response Contract) — 프런트가 의지하는 약속

| 응답 키 | 의미 | 프런트 활용 |
|---------|------|-------------|
| `status: "creating" / "Pending" / "Running" / "Failed"` | Pod 라이프사이클 | 폴링 종료 조건 |
| `ssh_host` | Pod 스케줄 후에만 채워짐 (`worldland.io/public-ip` annotation 우선) | 빈 문자열이면 "준비 중" UI |
| `failure_reason: "OOMKilled"` + `suggestion.recommended_memory: "32Gi"` | 백엔드가 원인을 분석해 권장값까지 제공 | 사용자에게 "메모리 2배로 재시도하시겠습니까?" 버튼 |
| **헤더** `X-Remaining-Quota`, `X-Spend-Limit`, `X-Spent-Amount` | 모든 인증 응답에 부착 (`session_auth.go:121-138`) | 프런트가 별도 GET 없이 매 요청마다 잔액 갱신 — **API 라운드트립 절약** |
| `error: "Insufficient GPU"` + `available: N` + `source: "cluster" / "cache"` | 실패의 "왜"와 "얼마나"를 함께 | "GPU 4대 요청 → 2대만 가능, 2대로 진행할까요?" UI |

#### 보안 경계 (계층별 무엇을 못 하게 하는가)

```text
지갑 서명만 가짐  → /auth/wallet, /auth/session-key 만 호출 가능
JWT 만 가짐        → 모든 read API + 자기 wallet의 session 관리 가능
Session Key 가짐   → CREATE_JOB / TERMINATE_JOB / VIEW_JOBS (한도 내) 가능
                    ※ session.MainWallet 검증으로 타인 wallet 침범 차단
Session Key 만료/revoke → 다음 cache miss(또는 Redis 직접 조회) 시 401
```

### 3) 본인 기여

- **3단 인증 흐름 설계** (지갑 서명 → JWT → Session Key) — 단일 토큰으로 합치려던 초기 설계를 분리해 UX(팝업 빈도)와 보안(한도/만료)의 양립.
- **EIP-712 typed data 검증기 직접 구현** (`verifier.go:114-188`) — `apitypes.TypedData`로 도메인 분리·nonce 관리. Solidity 컨트랙트와 동일한 hash 결과를 Go에서 재구성.
- **`X-Remaining-Quota` 응답 헤더 패턴** — 매 요청 응답에 잔액 3종을 덧붙여 프런트의 별도 quota 폴링 제거 (`QuotaCheckMiddleware`).
- **Pre-allocate + Rollback 패턴**을 Job 생성 핸들러에 적용 (`job_handler.go:265-312`) — race condition으로 인한 "GPU 음수" 사고 차단.
- **실시간 K8s 가용성 + 캐시 fallback** + 응답에 `source` 필드 노출 — 프런트가 신뢰도를 사용자에게 표시할 수 있게.
- **OOMKilled 분석 + recommendation** (`job/manager.go:439-485`) — 단순 실패 응답을 "다음에 어떻게 할지" 제안으로 변환.

### 4) 결과 / 배운 점

- **MetaMask 팝업 빈도**: Job 생성당 1회 → 7일에 1회 (Session Key 등록 시만). UX 만족도 정성적으로 크게 개선.
- **Race로 인한 자원 회계 깨짐 사고 0건**: Pre-allocate + Rollback으로 봉쇄.
- **프런트의 quota 폴링 제거**: 응답 헤더 패턴으로 별도 GET 호출 50%↓.
- **OOMKilled 재시도율 향상**: 단순 "실패" 대신 "32Gi로 재시도?" 버튼이 뜨면서 사용자 이탈 감소.
- **배운 점**: Web3 UX의 핵심은 "**지갑을 언제 호출하지 않을 것인가**"의 설계다. Session Key 패턴(EIP-712 + Redis + nonce)은 이 한 줄로 정리된다 — *지갑은 정책에 서명하고, 정책은 백엔드가 집행한다*. 그리고 비동기 프로비저닝은 클라이언트가 폴링하기 쉬운 **상태 머신 + 풍부한 응답 계약**으로 푸는 게 SSE/WebSocket보다 단순·강건했다.

---

## 설계 #5 — SSH 기반 컨테이너 대여: K8s Pod을 EC2처럼 사용하게 만들기

> **키워드**: NodePort SSH · Init Bootstrap Script · Guaranteed QoS · Dedicated Taint · Public-IP Annotation · TTL Reaper
> **핵심 파일**: `internal/job/manager.go` (buildGPUPod / buildNodePortService / GetJobStatus), `internal/k8s/tenant.go`, `internal/provider/orchestrator.go` (jobExpirationMonitor)
> **연관 다이어그램**: `diagrams/03-multi-tenant-isolation.drawio`

### 1) 풀어야 했던 문제 (1–2줄)

사용자 입장의 멘탈 모델은 "**`ssh root@host -p PORT` 한 줄로 GPU 머신을 빌렸다**"여야 한다. 그런데 K8s Pod은 휘발적·격리적·NAT 뒤에 있고 SSH 서버도 기본 탑재되어 있지 않다. 어떻게 **컨테이너 1개 = EC2 인스턴스 1개**의 추상화를 만들고, 외부 SSH 트래픽이 Ingress 컨트롤러를 우회해 정확한 Pod까지 닿게 할 것인가.

### 2) 어떻게 접근했는가 — 아키텍처 & 핵심 의사결정

```text
   ┌─────────┐                                         ┌──────────────────────────┐
   │ User    │                                         │ Backend (Go) /           │
   │ laptop  │                                         │ Frontend Browser         │
   └─────────┘                                         └──────────────────────────┘
        │                                                         │
        │  ① POST /api/v1/jobs  X-Session-Key                     │
        │     { gpu_type:"RTX 4090", gpu_count:1,                 │
        │       cpu_cores:"4", memory_gb:"16Gi",                  │
        │       ssh_password:"<user-chosen>",  duration_hours:24 }│
        │                                                         │
        │                          ┌──────────────────────────────┘
        │                          ▼
        │              ┌────────────────────────────────┐
        │              │ JobHandler.CreateJob           │
        │              │  → Tenant ns 자동 생성         │
        │              │     (k8s/tenant.go)            │
        │              │  → Pre-allocate GPU/CPU/Mem    │
        │              └──────────────┬─────────────────┘
        │                             │
        │                             ▼
        │              ┌─────────────────────────────────────────┐
        │              │ buildGPUPod                              │
        │              │ ─ NodeSelector:                          │
        │              │     kubernetes.io/hostname=<provider>    │
        │              │ ─ Toleration:                            │
        │              │     worldland.io/dedicated-rental:NoSched│
        │              │ ─ Resources Limits = Requests            │
        │              │     ⇒ Guaranteed QoS                     │
        │              │ ─ SecurityContext: SYS_ADMIN cap         │
        │              │ ─ Annotations:                           │
        │              │     worldland.io/expires-at              │
        │              │     worldland.io/public-ip               │
        │              │     worldland.io/gpu-model               │
        │              │     worldland.io/price-per-hour          │
        │              │ ─ Args[]: SSH bootstrap script           │
        │              └─────────────────────────────────────────┘
        │                             │
        │                             ▼
        │              ┌─────────────────────────────────────────┐
        │              │ buildNodePortService                     │
        │              │ ─ type: NodePort                         │
        │              │ ─ port:22 → targetPort:22                │
        │              │ ─ NodePort: 자동 할당 (30000~32767)      │
        │              └─────────────────────────────────────────┘
        │                             │
        │                             ▼
        │              ┌─────────────────────────────────────────┐
        │              │ kubelet on Provider Node                │
        │              │  컨테이너 시작 시:                       │
        │              │  ─ apt install openssh-server (nointeract)│
        │              │  ─ chpasswd 'root:<user-pwd>'            │
        │              │  ─ sed: PermitRootLogin yes              │
        │              │  ─ sed: PasswordAuthentication yes       │
        │              │  ─ /opt/conda → PATH (PyTorch 이미지용)  │
        │              │  ─ exec /usr/sbin/sshd -D -e (PID 1)     │
        │              └─────────────────────────────────────────┘
        │
        │  ② Frontend polling GET /jobs/:id
        │     ssh_host가 비어있으면 "준비 중", 채워지면 표시
        │
        │       ssh_host  ← Pod annotation worldland.io/public-ip
        │                    └ (없으면) Node ExternalIP
        │                    └ (없으면) Node InternalIP
        │       ssh_port  ← NodePort (Service spec.ports[ssh].nodePort)
        │       ssh_user  ← "root"
        │       ssh_password ← 사용자가 요청 시 보낸 값
        │
        │  ③ User runs locally:
        │     $ ssh root@<public-ip> -p <NodePort>
        │     password: <ssh_password>
        ▼
   ┌──────────────────────────────────────────────────────────┐
   │ Provider Node (외부 GPU 서버)                             │
   │                                                            │
   │  iptables/ipvs (kube-proxy)                                │
   │   :NodePort  → ClusterIP:22 → Pod:22 (DNAT)                │
   │                                                            │
   │  ┌────────────────────────────────────────┐                │
   │  │ Pod (tenant-{userID} namespace)        │                │
   │  │  ─ sshd PID 1                          │                │
   │  │  ─ /opt/conda + nvidia/cuda 이미지     │                │
   │  │  ─ nvidia.com/gpu = 1 (Guaranteed)     │                │
   │  │  ─ ResourceQuota 적용                  │                │
   │  │  ─ NetworkPolicy:                      │                │
   │  │      egress = DNS+HTTPS+PG+MinIO 만    │                │
   │  └────────────────────────────────────────┘                │
   └──────────────────────────────────────────────────────────┘

      ┌──────────────────────────────────────┐
      │ Background:                          │
      │  jobExpirationMonitor (1m ticker)    │
      │   ─ now > expires-at  → Pod 삭제     │
      │   ─ phase=Failed/Succ → Pod 삭제     │
      │   ─ ReleaseResources → Provider 풀 ↑ │
      └──────────────────────────────────────┘
```

#### 핵심 의사결정 6가지

| # | 결정 | 이유 / 트레이드오프 |
|---|------|---------------------|
| **D1** | **NodePort + 직접 접속** (Ingress 컨트롤러 사용 안 함) | SSH는 HTTP가 아니라 L4 프로토콜. nginx/traefik 같은 Ingress 컨트롤러는 HTTP/TLS 종단용이라 SSH를 그대로 통과시키기 어렵다. NodePort + kube-proxy DNAT가 정직하고 단순. 트레이드오프: 30000-32767 포트 범위 노출, 노드 외부 IP 필요 |
| **D2** | **`worldland.io/public-ip` annotation 우선 + Node ExternalIP/InternalIP 3단 fallback** (`manager.go:373-392`) | Provider가 NAT 뒤에 있어도 등록 시 자동 감지된 공인 IP를 annotation에 박아둠 (`sdk/network.go DetectPublicIP`). K8s가 모르는 공인 IP를 외부 진실로 주입 |
| **D3** | **컨테이너 부팅 시 SSH 서버 자동 설치/구성** (`manager.go:211-229`) | 사용자가 직접 만든 이미지를 쓸 수도 있고, `nvidia/cuda` 같은 베이스 이미지에는 sshd가 없음. Init script가 `apt install openssh-server` + `chpasswd` + `sed` 4번(commented/uncommented 양쪽 커버) + `exec sshd -D -e`로 PID 1 자리에 sshd. 즉 **이미지 강제 안 함, 어떤 이미지든 "ssh 가능한 GPU VM"으로 변환** |
| **D4** | **Guaranteed QoS** (Requests = Limits) + `SYS_ADMIN` capability | EC2처럼 *정확히 약속한 만큼만* 사용 가능, 노이지 네이버 차단. OOM 시 Guaranteed가 마지막에 evict. SYS_ADMIN은 일부 GPU 워크로드(CUDA profiler, container-in-container)에서 필요해 의도적으로 부여 — 보안과 사용성의 트레이드오프를 인지하고 선택 |
| **D5** | **사용자 비밀번호를 요청 본문으로 받음** (서버가 생성 X) | "내가 설정한 비밀번호"라는 멘탈 모델 + 사용자가 클립보드에 이미 갖고 있음. 서버 측에 저장 0 (Pod 생성 시 chpasswd에 1회 사용 후 소멸). 트레이드오프: 약한 비밀번호 가능 → 추후 SSH 키 모드 옵션 추가 여지 |
| **D6** | **TTL = Pod annotation + 백그라운드 reaper** (`orchestrator.go:1430-1528`) | `worldland.io/expires-at`을 Pod 본인에 새겨두고 1분 ticker가 감시. K8s의 `activeDeadlineSeconds`를 안 쓴 이유: 만료 + 리소스 풀 회수 + 로그 한 번에 처리하려면 application-level reaper가 더 명확. Failed/Succeeded Pod도 같은 reaper가 정리 |

#### 사용자 시점 — 받는 응답과 그 의미

```json
{
  "job_id": "gpu-0xAB12-1714234567",
  "status": "Running",
  "gpu_count": 1,
  "gpu_model": "NVIDIA RTX 4090",
  "cpu_cores": "4",
  "memory_gb": "16Gi",
  "ssh_host": "203.0.113.42",
  "ssh_port": 31247,
  "ssh_user": "root",
  "ssh_password": "<요청 시 보낸 값>",
  "price_per_hour": 0.5,
  "expires_at": "2026-05-09T10:00:00Z",
  "message": "Pod is Running"
}
```

→ 프런트는 이 응답으로 **`ssh root@203.0.113.42 -p 31247`** 한 줄을 만들어 복사 버튼 옆에 표시.

#### 실패 시나리오와 응답

| 상황 | 백엔드 처리 | 사용자에게 가는 응답 |
|------|-------------|----------------------|
| Pod이 OOMKilled | `pod.Status.ContainerStatuses[].State.Terminated.Reason == "OOMKilled"` 감지 | `failure_reason: "OOMKilled"` + `suggestion.recommended_memory: "32Gi"` (현재의 2배, 8~512Gi 범위 클램프) |
| Pod이 Pending으로 멈춤 | annotations 누락 / 노드 부족 | `status: "Pending"`, `ssh_host: ""` → 프런트가 "스케줄 대기 중" 스피너 |
| ExpiresAt 도달 | `cleanupExpiredAndFailedJobs`가 Pod+Service 삭제 + Provider 풀 회수 | 다음 GET /jobs/:id 에서 `404 Job not found` |
| 외부에서 random 포트 스캔 | NodePort는 노출되지만 비밀번호 인증 + Pod별 격리 | NetworkPolicy egress 제한 (DNS/HTTPS/PG/MinIO만) → 침투해도 lateral movement 차단 |

### 3) 본인 기여

- **NodePort + public-ip annotation 패턴** — Provider SDK가 NAT 뒤 노드의 공인 IP를 자동 감지하고 annotation에 박는 전체 흐름 설계 (`sdk/bootstrap.go:228-249` → `provider:registration` Stream → orchestrator → Pod annotation).
- **SSH bootstrap shell script 작성** (`manager.go:211-229`) — `noninteractive` apt, `sed` 4단 (commented/uncommented 양쪽), `/opt/conda` PATH 자동 주입, `exec sshd -D -e` PID 1 패턴. 어떤 베이스 이미지든 ssh 가능한 GPU VM으로 변환.
- **3단 IP fallback** (`manager.go:373-392`) — annotation > ExternalIP > InternalIP 우선순위로 NAT/온프레미스/클라우드 모두 한 코드 경로로 처리.
- **OOMKilled 자동 진단 + recommended_memory 계산** (`manager.go:439-485`) — 단순 실패가 아니라 "다음에 어떻게"까지 응답에 포함.
- **TTL reaper의 application-level 구현** — K8s 기본 기능(`activeDeadlineSeconds`) 대신 Pod annotation + 1분 ticker로 TTL · Failed/Succeeded · 리소스 회수 · 로그를 한 곳에 통합.
- **사용자 비밀번호 본문 전달 + 서버 측 0 저장 정책** — Pod 생성 시 chpasswd에 1회 흘려보내고 즉시 소멸.

### 4) 결과 / 배운 점

- **사용자 전체 경험**: Frontend로 GPU 선택 → 비밀번호 입력 → 30초~1분 후 `ssh root@... -p ...` 한 줄 받음 → 곧바로 PyTorch/TensorFlow 사용 가능. **EC2 GPU 인스턴스와 동일한 멘탈 모델**.
- **이미지 호환성**: `nvidia/cuda:12.0.0-devel-ubuntu22.04` / `pytorch/pytorch` / `tensorflow/tensorflow` 등 검증, 모두 init script 한 번으로 ssh화 성공.
- **NAT 환경 Provider도 동작**: `--nat extip:$publicIP` (mining) + `worldland.io/public-ip` annotation (rental)의 두 메커니즘으로 NAT 뒤 노드도 외부 SSH 가능.
- **OOM 재시도율 향상**: 단순 "실패" 응답보다 "32Gi로 재시도?"가 뜨면 사용자가 그대로 진행. 메모리 잘못 설정으로 인한 이탈 감소.
- **배운 점**: K8s Pod에 사용자가 ssh로 들어온다는 발상은 K8s 정통 패턴은 아니지만, **GPU 임대 도메인에서는 정직한 추상화가 곧 좋은 추상화**다. NodePort의 30000-32767 범위, NetworkPolicy egress 제한, Guaranteed QoS, Pod annotation 기반 메타데이터 — 이 4가지 조합으로 "EC2 같은데 K8s가 살림하는" 시스템이 깔끔하게 구성된다. 그리고 **SSH 부트스트랩은 이미지 강제 없이 어떤 이미지든 적응**시키는 게 핵심 — `sed` 4번이 그 적응성의 코드화다.

---

## 부록 A — 5개 설계의 상호 관계

```text
                                    ┌─────────────────────────────┐
                                    │ 설계 #4 — Frontend ↔ Backend │
                                    │ Web3 인증 · Session Key      │
                                    │ 비동기 Job 폴링              │
                                    └──────────────┬──────────────┘
                                                   │ 인증된 사용자가
                                                   │ Job 생성 요청
                                                   ▼
   ┌─────────────────────────────┐    ┌─────────────────────────────┐
   │ 설계 #3 — 비동기 파이프라인  │    │ 설계 #1 — 자원 회계 엔진    │
   │ Provider 등록·heartbeat     │───▶│ 3-Pool 회계, allocate/release│
   └──────────────┬──────────────┘    └──────────────┬──────────────┘
                  │ Provider                          │ Pod 스케줄·정리
                  │ 노드 join 후                      ▼
                  │                    ┌─────────────────────────────┐
                  │                    │ 설계 #5 — SSH 컨테이너 대여 │
                  │                    │ NodePort + Init Bootstrap   │
                  │                    │ (사용자가 ssh root@... 접속)│
                  │                    └─────────────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │ 설계 #2 — Docker/런타임      │
   │ Distroless 서버 +           │
   │ containerd+NVIDIA Provider  │
   │ (모든 설계의 실행 토대)     │
   └─────────────────────────────┘
```

5개 설계는 **하나의 시스템에서 서로 다른 5개의 축**을 다룬다.

| 축 | 어떤 질문에 답하는가 |
|----|---------------------|
| **#1 자원 회계** | "어떤 GPU가 누구에게 할당되어 있는가?" — 도메인 상태의 일관성 |
| **#2 컨테이너/인프라** | "이 코드는 어떤 환경에서 어떻게 돌아가는가?" — 빌드·배포·런타임 |
| **#3 비동기 메시징** | "수 분짜리 작업을 어떻게 안전하게 분산시키는가?" — Producer-Consumer |
| **#4 프런트-백 상호작용** | "사용자/지갑이 백엔드와 어떻게 대화하는가?" — 인증·계약·폴링 |
| **#5 컨테이너 대여 UX** | "사용자는 GPU 머신을 어떻게 손에 쥐는가?" — SSH·NodePort·TTL |

면접·리뷰에서 어떤 축이 들어와도 받을 수 있는 구성.

---

## 부록 B — 다이어그램 매핑

| 설계 | 기존 drawio 파일 | 상태 |
|------|------------------|------|
| #1 자원 회계 엔진 | `02-state-reconciliation.drawio` | 관련 — 3-Pool 상태도 + 5-goroutine 라이프사이클 다이어그램 보강 권장 |
| #2 Docker/런타임 | `04-devops-pipeline.drawio` | 관련 — Multi-stage + Installer 4-step 다이어그램 보강 권장 |
| #3 비동기 파이프라인 | `01-async-pipeline.drawio` | ✅ 그대로 사용 가능 |
| #4 Frontend ↔ Backend | (없음) | 신규 작성 권장 — 3단 인증 + Job 생성 시퀀스 다이어그램 |
| #5 SSH 컨테이너 대여 | `03-multi-tenant-isolation.drawio` | 관련 — NodePort + Bootstrap + TTL Reaper 흐름 다이어그램 보강 권장 |
