# Worldland GPU Rental Platform — 시스템 심층 분석

> 작성일: 2026-04-30
> 대상: `serving-user-broker` 리포지토리 전체 (k8s-proxy-server, contracts, frontend, SDK)
> 목적: 비즈니스 도메인 → 아키텍처 → 핵심 흐름 → 구현 트레이드오프 → 개선 로드맵을 단일 문서로 정리

---

## 0. Executive Summary

이 프로젝트는 **GPU 자원의 양면 시장(two-sided marketplace)을 Kubernetes 위에 오케스트레이션하고, 결제·정산을 BSC 블록체인으로 위임한 분산 GPU 렌탈 플랫폼**이다. 핵심 차별화는 두 가지다.

1. **Provider의 이중 수익 모델** — 같은 GPU 노드가 (a) 사용자에게 SSH 가능한 컨테이너로 임대되거나 (b) 유휴 시 Worldland L1 채굴 노드로 가동된다. 가용성이 변할 때마다 단일 오케스트레이터가 두 워크로드 사이에서 GPU를 동적으로 재분배한다.
2. **세션 키 기반 UX** — 메인 지갑 서명 1회로 만료·지출한도가 있는 ephemeral 키를 등록하면, 그 이후 모든 API 호출은 지갑 팝업 없이 진행되며 결제는 GPUVault 컨트랙트가 보장한다 (출금 권한은 컨트랙트 레벨에서 차단).

전체 코드 약 **1.5만 줄(Go)** 중 80% 이상이 단일 모듈 `internal/provider/orchestrator.go`(약 1,500줄)와 그 위성 모듈에 집중되어 있어, 오케스트레이터의 결합도 분리가 가장 큰 구조적 부채다. 결제 통합(JobHandler ↔ Vault)과 사용량 측정(heartbeat의 GPU/CPU/Memory %)이 미구현 상태로 남아 있어 MVP-to-prod 갭의 핵심 항목이다.

---

## 1. 비즈니스 도메인

### 1.1 액터(Actors)

| 액터 | 역할 | 인센티브 | 시스템 진입점 |
|------|------|----------|--------------|
| **Renter (사용자)** | GPU 컨테이너 임차, ML 학습/추론 수행 | 시간당 결제로 GPU 확보 | Frontend 대시보드 → `/api/v1/jobs` |
| **Provider (호스트)** | 자기 소유 GPU 노드를 워커로 제공 | (1) 임대 수수료, (2) 채굴 보상 동시 수익 | Provider SDK CLI → Redis Stream |
| **Platform (브로커)** | 매칭·격리·정산 조율 | 5% 정산 수수료 (`endRental` 컨트랙트 로직) | k8s-proxy-server 마스터 |
| **Worldland L1** | 결제 수단(WLC)과 채굴 보상 출처 | — | BSC 컨트랙트 + Worldland 풀노드 P2P |

### 1.2 핵심 비즈니스 규칙

코드베이스를 통해 식별한 불변식(invariants):

1. **GPU 단일 소유권**: 한 GPU는 동시에 한 컨테이너에만 매핑. 채굴↔임대 전환은 Pod 삭제·재생성으로만 가능 (`mining_manager.go:80 UpdateMiningPodGPU`).
2. **임대 우선권**: 채굴 GPU 할당 시 가용 GPU가 부족하면 거부됨 (`orchestrator.go:702 AllocateMiningGPU` — Option 1 정책: reject + wait). 즉 **렌탈 수요가 채굴 수요보다 항상 우위**.
3. **세션 키 출금 불가**: GPUVault 컨트랙트가 세션 키의 권한을 결제(start/processPayment)로만 제한. Withdraw는 메인 지갑 서명 필수.
4. **만료 자동 회수**: Pod 어노테이션 `worldland.io/expires-at` 기준으로 1분마다 만료 체크 후 강제 삭제 (`orchestrator.go:1462 cleanupExpiredAndFailedJobs`).
5. **테넌트 자원 한도**: 사용자당 namespace + ResourceQuota로 GPU/CPU/Memory를 K8s 레벨에서 강제 (`tenant.go:131 createResourceQuota`).
6. **EC2 스타일 Guaranteed QoS**: 모든 Job Pod는 `request == limit`. 메모리 초과 시 OOMKilled, CPU 초과 시 throttling, GPU는 독점 (`manager.go:266`).

### 1.3 가치 흐름 (Value Flow)

```
USDT (BEP-20) ──deposit──▶ GPUVault.deposits[user]
                                 │
                  startRentalWithSessionKey
                                 ▼
                          Rental(active)
                                 │ (시간 흐름 → pricePerSecond × elapsed)
                                 ▼
                            endRental
                          ┌──────┴──────┐
                          ▼             ▼
                    Provider 95%   Platform 5%
```

채굴 보상은 별도 경로: Worldland L1 블록 보상 → MiningConfig.WalletAddress (Provider의 메인 지갑)로 직접. 플랫폼은 채굴 보상에서 수수료를 떼지 않는다(현재 코드 기준).

---

## 2. 시스템 아키텍처

### 2.1 계층 분리

```
┌──────────────────────────────────────────────────────────────────────┐
│  Presentation: Next.js Frontend (frontend/)                          │
│   - MetaMask/WalletConnect 통합, 세션 키 로컬스토리지                 │
│   - /docs는 GitBook 스타일 마케팅+가이드 (frontend/docs/)             │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ REST (X-Session-Key 헤더)
┌────────────────────────────────▼─────────────────────────────────────┐
│  API Gateway: Gin HTTP Server (cmd/server/main.go → internal/server)  │
│   - 라우팅, 미들웨어 체인 (CORS → Logger → Recovery → Auth → Quota)    │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│  Application: Handlers (internal/handler/)                            │
│   - JobHandler / ProviderHandler / MiningHandler / WalletAuthHandler  │
│   - 입력 검증 + 도메인 호출 + 응답 포맷팅                              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│  Domain: Orchestrator + Job Manager + Session Manager                 │
│   internal/provider/orchestrator.go  (1500줄, 단일 큰 책임)           │
│   internal/job/manager.go            (Pod/Service 빌더)                │
│   internal/wallet/session_manager.go (세션 라이프사이클)              │
└──┬──────────────┬──────────────┬───────────────┬────────────────────┘
   │              │              │               │
   ▼              ▼              ▼               ▼
┌──────┐  ┌────────────┐  ┌─────────────┐  ┌──────────────┐
│ K8s  │  │ Redis      │  │ PostgreSQL  │  │ BSC RPC      │
│ API  │  │ Streams    │  │ providers   │  │ GPUVault     │
│      │  │ + Sessions │  │ table       │  │ contract     │
└──────┘  └────────────┘  └─────────────┘  └──────────────┘
```

### 2.2 데이터 평면(Data Plane) vs 제어 평면(Control Plane)

| 평면 | 구성요소 | 역할 |
|------|---------|------|
| **제어** | k8s-proxy-server, Redis Streams, PostgreSQL | 등록·할당·정산·메타데이터 |
| **데이터(연산)** | K8s Worker Nodes, GPU Pods, Mining Pods | 실제 GPU 워크로드 실행 |
| **데이터(가치)** | BSC GPUVault, USDT/WLC 토큰 | 결제·예치·정산 |

이 분리 덕분에 제어 평면이 죽어도 GPU Pod와 Mining Pod는 K8s 자체 reconciler로 살아있고, BSC 컨트랙트의 잔액·렌탈 상태도 유지된다. 단점은 **재기동 시 인메모리 상태와 K8s/Vault의 실제 상태를 동기화하는 복원 로직**이 필수가 된다는 점이며, `RecoverJobAllocations`, `RecoverMiningStates`, `loadProvidersFromDB`가 이를 담당한다.

### 2.3 메시징 토폴로지 (Redis Streams)

```
Provider Agent ──XADD──▶ provider:registration ──XREAD──▶ Orchestrator
                                                              │
Provider Agent ──XADD──▶ provider:heartbeat   ──XREAD──┘     │
                                                              │
Orchestrator ──XADD──▶ provider:response:{providerID} ──XREAD──▶ Agent
```

Consumer Group(`orchestrator-group`)으로 ack 기반 처리. 이 선택의 의미:
- **장점**: 오케스트레이터 재기동 시 미처리 메시지 보존, 다중 워커로 수평 확장 가능, ack 실패 시 재처리.
- **트레이드오프**: Redis가 SPOF (단일 인스턴스 가정), 메시지 순서는 stream 내에서만 보장, 응답 stream을 provider별로 만들어 fan-out → 수만 노드 시 stream 폭증 위험.

---

## 3. 핵심 비즈니스 로직 분석

### 3.1 Provider 등록 → 채굴 자동 배포 (가장 복잡한 단일 흐름)

**진입**: `cmd/provider-sdk/main.go` 또는 `cmd/provider-agent/main.go`
**오케스트레이션**: `orchestrator.go:193 handleRegistration`

```
1. Agent: 시스템 스캔 (NVIDIA, CPU, RAM, 디스크)            agent/scanner.go
2. Agent: ProviderCapacity 산출 (기본 80% 공유)             provider-agent/main.go:241
3. Agent: RegistrationRequest를 provider:registration 발행
4. Orchestrator: 메시지 수신 → 기존 등록 여부 확인
   ├─ 신규 → kubeadm token create --print-join-command 실행
   ├─ 토큰 생성 실패(이미 join된 노드) → StatusApproved로 저장
   └─ DB(repo) write + 인메모리 캐시 추가
5. Orchestrator: provider:response:{ID}로 응답 publish
6. Agent: 응답 수신 → kubeadm join 실행 (sudo)
7. (병렬) Orchestrator: MiningConfig가 있으면 DeployMiningForProvider
   ├─ MiningPodManager.buildMiningPod (HostNetwork, GPU 리소스)
   ├─ Pod 생성 → Capacity.MiningGPUs 차감 + AvailableGPUs 갱신
   └─ MiningStatus = "pending"
8. Agent: 30초마다 HeartbeatMessage publish
9. Orchestrator: Heartbeat 수신 → LastHeartbeat 갱신, 노드 라벨 업데이트
10. (백그라운드) Orchestrator: 2분 미수신 시 → Status=Offline, 라벨 변경
```

**핵심 통찰**:
- 6단계의 `kubeadm join`은 워커 노드에서 sudo 권한이 필요해 SDK가 Linux 전용. macOS/Windows Provider 지원은 구조적으로 막혀 있음.
- 7단계의 채굴 자동 배포가 등록과 동기화되지 않는다 — `go func()` 비동기 호출이라, 채굴 Pod가 실패해도 등록 자체는 성공으로 응답된다. Agent는 채굴 실패를 알 방법이 없다(에러 채널 부재).

### 3.2 GPU Job 생성 (사용자 임대 흐름)

**진입**: `POST /api/v1/jobs` → `JobHandler.CreateJob` → `JobManager.CreateGPUJob`

```
1. 인증 미들웨어
   현재: DevAuthMiddleware (X-User-ID 헤더만 확인 — 프로덕션 위험)
   목표: SessionKeyAuthMiddleware → session.MainWallet을 userID로

2. Provider 선택 (JobHandler 내부, 코드 미열람)
   - 가용 GPU/CPU/Memory가 충족되는 Provider 검색
   - 가격 정책 비교 (현재 하드코딩 0.5 WLC/hr)

3. Orchestrator.AllocateResources (orchestrator.go:569)
   - sync.Mutex 잠금 → AvailableGPUs 차감 → InUseGPUs 증가
   - GPU 부족 시 즉시 에러
   - CPU/Memory 순차 검증, 실패 시 GPU 롤백 (보상 트랜잭션 흉내)

4. Tenant 환경 준비 (job/manager.go:114, k8s/tenant.go)
   - namespace tenant-{userID} 없으면 생성
   - ResourceQuota: GPU/CPU/Memory 한도
   - NetworkPolicy 3종: 내부 통신 / Ingress 화이트리스트 (Jupyter) / Egress (DNS, 443, 80, PostgreSQL, MinIO, 클러스터 내부)

5. K8s Pod 생성 (manager.go:209 buildGPUPod)
   - SSH 셋업 스크립트 인라인 주입 (apt-get install openssh-server, chpasswd)
   - Resources: request=limit (Guaranteed QoS)
   - SecurityContext.Capabilities.Add: SYS_ADMIN ⚠️ (격리 약화)
   - Toleration: worldland.io/dedicated-rental
   - NodeSelector: 특정 hostname 또는 worldland.io/rental-type=gpu

6. NodePort Service 생성 (외부 SSH 접속)
   - port 22 → NodePort

7. 응답
   - SSHHost는 Provider의 PublicIP (annotation에서)
   - SSHPort는 NodePort, 비밀번호는 사용자 지정값
   - ExpiresAt 계산
```

**핵심 통찰**:
- 5단계의 SSH 스크립트 인라인 주입은 컨테이너 시작이 느려지고 (`apt-get update` 매번), 이미지 사이즈에 의존. 사전에 SSH가 포함된 베이스 이미지를 만드는 편이 깔끔.
- `SYS_ADMIN` capability는 컨테이너 탈출이 가능한 권한. nsenter나 mount 작업이 필요한지 검토 필요. 필요 없다면 제거.
- ResourceSuggestion 로직(OOMKilled 시 2배 메모리 추천)은 사용자 친화적. 그러나 현재 메모리 어노테이션이 누락되어 fallback으로 `Limits.Memory()`를 쓰는데, Pod가 이미 종료된 상태에선 정확.

### 3.3 리소스 회계 (Resource Accounting)

이 시스템에서 가장 위험한 영역이다. 인메모리 상태 + K8s 실제 상태 + DB가 동시에 진실의 후보가 된다.

**상태 모델** (`provider/types.go:62 ProviderCapacity`):

```
Total = Mining + InUse + Available  (이 등식이 항상 성립해야 함)
```

| 필드 | 출처 | 갱신 시점 |
|------|------|-----------|
| `TotalGPUs` | Agent의 SystemSpec | 등록 1회 |
| `MiningGPUs` | DeployMiningForProvider / AllocateMiningGPU | 채굴 시작/조절 |
| `InUseGPUs` | AllocateResources / ReleaseResources / Pod Watcher | Job 생성/종료 |
| `AvailableGPUs` | 위 셋의 차이로 산출 | 모든 변경 시 |

**갱신 경로 5개**:
1. `AllocateResources` (Job 생성) — 락 잡고 차감, 실패 시 롤백.
2. `ReleaseResources` (명시적 호출) — 거의 사용 안 됨, `releaseJobResources`로 통일.
3. `releaseJobResources` (Pod Watcher의 DELETED/Failed/Succeeded 이벤트) — 실시간 자동 반환.
4. `cleanupExpiredAndFailedJobs` (1분 ticker) — 만료/실패 Job 강제 정리.
5. `RecoverJobAllocations` (서버 시작 시) — K8s 실제 Pod로부터 InUse 재계산.

위험 시나리오 분석:

| 시나리오 | 결과 | 현재 대응 | 부족한 점 |
|----------|------|-----------|-----------|
| Pod 생성 후 K8s가 schedule 실패 | InUse 증가했는데 실제 사용 0 | Pod Watcher가 Failed/Succeeded 시 회수 | Pending 상태로 영원히 멈춘 경우는? |
| Orchestrator 재시작 | 인메모리 0 | RecoverJobAllocations가 K8s에서 재계산 | DB의 MiningGPUs는 복원 안 됨 (Pod 라벨에 없음) |
| Pod Watcher disconnect | 이벤트 누락 | 5초 후 재연결 + 1분 ticker 만료 정리 | 그 사이 다른 Job이 GPU 부족 호소 가능 |
| Provider Agent 죽음 | Status=Offline (2분 후) | Heartbeat monitor | Pod는 K8s에서 계속 실행 — 비용 청구는? |
| 동시에 다른 인스턴스가 같은 Provider에 할당 | 데이터 손실 | 단일 인스턴스 가정 | 멀티 인스턴스 배포 불가 (분산 락 부재) |

### 3.4 채굴 동적 GPU 재분배

시나리오: Provider는 4 GPU. 처음 1 GPU로 채굴 중. 사용자가 3 GPU Job 요청.

```
1. AllocateResources(3 GPU) → AvailableGPUs[T4]=3 → 차감 OK → InUseGPUs[T4]=3
   (이 시점 채굴은 1 GPU 그대로)
2. Job 종료 → releaseJobResources → Available=3 복원
3. 채굴 자동 확장은? → 현재 코드에는 없음. 사용자가 수동으로 AllocateMiningGPU 호출 필요.
```

**관찰**: `--auto-scale` 플래그가 SDK에 있지만 (`provider-sdk/main.go:48`), Daemon 측 자동 확장 로직이 활성화돼야 진짜로 동작한다. 현재는 manual API.

Mining Pod 갱신 비용:
- `UpdateMiningPodGPU`는 Pod 삭제→재생성. Worldland L1 풀노드는 데이터 디렉토리(`/data/worldland/{providerID}` HostPath)를 보존해 재싱크는 빠르지만, **GPU 채굴 컨텍스트는 완전 재시작**. DAG 재로드 비용 상당.

### 3.5 세션 키 결제 흐름

**1단계 — 지갑 로그인** (`wallet/verifier.go:71 VerifyLoginSignature`)
- `personal_sign(`Sign in to GPU Rental Platform\nWallet: {addr}\nTimestamp: {ts}`)`
- 서버가 timestamp 검증 (5분 유효), 서명 복원 → 메인 지갑 일치 확인 → JWT 발급.

**2단계 — 세션 키 등록** (`wallet/verifier.go:115 VerifySessionKeySignature`)
- 클라이언트가 ephemeral keypair 생성 (브라우저 메모리 또는 localStorage).
- 메인 지갑이 EIP-712 typed data 서명: `{mainWallet, sessionKey, spendLimit, expiry, nonce}`.
- 서버: nonce 조회 (Redis `nonce:{wallet}`) → 서명 검증 → Redis에 `session:{sessionKey}` 저장 (TTL=expiry까지).
- 컨트랙트에도 `registerSessionKey` 트랜잭션이 필요(현재 백엔드가 자동 호출하는지 미확인 — TODO).

**3단계 — API 호출** (`middleware/session_auth.go`)
- 헤더 `X-Session-Key: 0x...` → ValidateSession → 만료/취소 확인.
- userID = `session.MainWallet`.
- 응답 헤더로 잔여 쿼터 노출: `X-Remaining-Quota`, `X-Spend-Limit`, `X-Spent-Amount`.

**4단계 — 정산** (계획)
- Job 종료 시 `endRental(rentalID)` → 컨트랙트가 `pricePerSecond × elapsed` 계산해 Provider 95% / Platform 5% 분배.
- 현재 `JobHandler`와 `blockchain.Client`가 직접 연결되지 않은 상태(TODO_BLOCKCHAIN.md 명시).

---

## 4. 데이터 모델 (요약)

| 모델 | 위치 | 용도 |
|------|------|------|
| `ProviderState` | `provider/orchestrator.go:41` | 등록된 Provider의 런타임 상태 |
| `ProviderCapacity` | `provider/types.go:62` | Total/Mining/InUse/Available 4-way 회계 |
| `SystemSpec` | `provider/types.go:33` | 하드웨어 인벤토리 (CPU/GPU/Mem/Disk/Network) |
| `MiningConfig` | `provider/types.go:209` | Worldland 노드 + GPU 채굴 설정 |
| `RegistrationRequest/Response` | `provider/types.go:249,269` | Agent ↔ Orchestrator 프로토콜 |
| `HeartbeatMessage` | `provider/types.go:295` | 30초 간격 활동 신호 |
| `GPUJobRequest/Response` | `job/manager.go:42,60` | 사용자 임대 입출력 |
| `Session` | `wallet/session_manager.go:25` | 세션 키 + 지출 추적 |
| `SessionKey` (on-chain) | `blockchain/client.go:50` | 컨트랙트 미러 |
| `Rental` (on-chain) | `blockchain/client.go:59` | 활성 임대 + jobID 연결 |
| `TenantConfig` | `k8s/tenant.go:23` | namespace 한도/네트워크 정책 입력 |

**주의할 데이터 흐름의 비대칭성**:
- `ProviderCapacity`에는 Legacy 필드(`GPUCount`, `CPUCores`, `MemoryMB`)와 신규 맵 필드(`TotalGPUs map[string]int` 등)가 공존한다. Orchestrator의 모든 분기에 fallback 로직이 있어 코드 복잡도를 키운다 (예: `orchestrator.go:589~597`). **마이그레이션 후 legacy 제거**가 부채.

---

## 5. 주요 기능별 구현 분석

### 5.1 인증/인가

| 모드 | 미들웨어 | 사용 위치 | 평가 |
|------|---------|-----------|------|
| Dev (헤더) | `DevAuthMiddleware` | `/api/v1/jobs` (현재) | 🚨 프로덕션 위험. 실수로 활성화될 가능성. |
| Wallet JWT | (구현됨, server.go에 미연결) | — | TODO_BLOCKCHAIN.md에 명시 |
| Session Key | `SessionKeyAuthMiddleware` | (미연결) | 인증 검증 + Redis 캐시까지 OK |
| Hybrid | `WalletOrSessionKeyMiddleware` | (미연결) | 권장 모드 |
| Quota | `QuotaCheckMiddleware` | (미연결) | 응답 헤더로 한도 노출 |

**구현 트레이드오프**: 단일 진실원천(JWT)만 쓰지 않고 세션 키를 추가한 이유는 **지갑 팝업 마찰을 없애기 위함**이다. 비용은 (1) 세션 키 keypair를 어디 보관할지(localStorage = XSS 위험, 메모리 = 새로고침 시 재로그인), (2) 컨트랙트와 백엔드가 두 곳에서 같은 세션 키를 추적해야 함(드리프트 가능).

### 5.2 K8s 리소스 격리

3중 격리:
1. **Namespace**: `tenant-{userID}`
2. **ResourceQuota**: GPU/CPU/Memory 한도 (사용자가 합의된 양만 쓰게)
3. **NetworkPolicy**: 같은 namespace 내부 통신 + Ingress (Jupyter port) + Egress 화이트리스트

**관찰**: Egress 정책의 마지막 규칙(`tenant.go:308 ~ 315`)이 *모든 namespace로의 통신을 허용*한다. 클러스터 내부 서비스(MinIO 등)에 접근하기 위함이지만, **다른 테넌트 namespace로의 east-west traffic도 열린다**. 보안 강화하려면 `NamespaceSelector: matchLabels: {managed-by: web3-ai-platform-system}` 같은 라벨로 좁혀야 한다.

### 5.3 K8s Pod 모니터링 (Watch API)

```go
// orchestrator.go:1264 podWatcher
1. NodeManager.WatchGPUJobPods(ctx) → Watch channel
2. 이벤트 수신 (ADDED / MODIFIED / DELETED)
3. handlePodEvent → release/no-op
4. 채널 close 시 5초 대기 후 재연결
```

**견고성**: K8s Watch는 끊기는 게 정상이다(timeout, etcd 갱신 등). 5초 재연결은 합리적이지만, 끊긴 동안의 이벤트는 누락된다 → 이를 1분 ticker(`cleanupExpiredAndFailedJobs`)가 보완한다. 두 메커니즘의 조합은 **eventual consistency**를 달성한다.

### 5.4 SDK / Agent의 분리

```
provider-sdk: 호스트 시스템 부트스트래퍼 (containerd, K8s 컴포넌트, NVIDIA 툴킷 설치)
              + 검증(Validator) + 부트스트랩(Bootstrap) + 데몬(Daemon)
provider-agent: SDK가 호출하는 가벼운 데몬 (Redis 메시지 + heartbeat)
```

**겹침**: `provider-agent/main.go`와 `internal/sdk/daemon.go`가 비슷한 책임을 갖는다. SDK 도입 후 agent가 레거시화되었을 가능성. 정리 필요.

### 5.5 블록체인 클라이언트

`blockchain/client.go`는 미니멀한 ABI(7개 함수)만 다룬다. 트랜잭션 송신은 `BACKEND_PRIVATE_KEY`로 백엔드가 직접 서명·전송 → 사용자 대신 가스비를 부담하는 **메타-트랜잭션 패턴**. 단점은 백엔드 키 관리 부담(키 노출 = 결제 권한 탈취).

대안: ERC-2771 Trusted Forwarder + `_msgSender()` 패턴으로 사용자 서명만 받고 가스는 백엔드 페이마스터가 부담. 현재 미구현.

---

## 6. 트레이드오프 매트릭스

| 결정 | 선택 | 트레이드오프 | 이 프로젝트의 평가 |
|------|------|-------------|-------------------|
| 통신 방식 | Redis Streams (XADD/XREAD) | vs gRPC: 더 느슨, 큐잉 보장 / 더 운영 복잡 | ✅ Provider가 분산되어 있고 마스터가 떨어져도 메시지 유실 X — 적절 |
| 클러스터 타입 | kubeadm 셀프 호스팅 | vs EKS/GKE: 비용↓ + GPU/IP 제어 / 운영 부담 | ⚠️ 마스터 SPOF, GPU 노드 join 토큰 보안 |
| 회계 위치 | 인메모리 + DB write-through | vs DB-only: 빠름 / 멀티 인스턴스 불가 | ❌ 수평 확장 차단 — 단일 인스턴스 가정의 빚 |
| 인증 모델 | JWT + Session Key 2단 | vs 단일 JWT: UX 마찰 ↓ / 복잡도 ↑ | ✅ Web3 UX 측면에서 정답. 단, 컨트랙트와 백엔드 동기화 잘 되어야 |
| 마이닝 Pod | HostNetwork + HostPath | vs ClusterIP+PV: P2P 성능↑, 데이터 보존↑ / 격리↓ | ⚠️ Worldland 노드의 P2P 도달성을 위해 필요. 다만 멀티-Provider 배치 시 포트 충돌 가능 |
| Pod 라이프사이클 | RestartPolicy=Never | vs Always: OOM 알림 가능 / 자동 복구 X | ✅ 임대 컨텍스트에선 자동 재시작이 사용자에게 비용만 발생시킴 |
| GPU 변경 방식 | Pod 삭제→재생성 | vs in-place 업데이트(K8s 1.27+): 단순 / 느림 | ⚠️ 채굴 DAG 재로드 비용. 1.27+ 마이그레이션 시 재고 |
| 격리 레벨 | namespace per user | vs shared namespace + RBAC: 강격리 / etcd 부담 | ✅ 다중 사용자 + 동시 Job에서 합리적 |
| Capabilities | SYS_ADMIN 부여 | vs 최소 권한: SSH/일부 도구 호환 / 컨테이너 탈출 위험 | ❌ 정당화 부족 — 제거하거나 명시 필요 |
| 가격 결정 | 하드코딩 | vs Auction/Oracle: 단순 / 시장 가격 미반영 | ❌ provider-agent/main.go:266 TODO 명시 |

---

## 7. 개선 제안 (우선순위별)

### P0 — 보안 / 정합성 (지금 당장)

1. **DevAuthMiddleware 격리**
   - `server.go:99`의 `jobRoutes.Use(middleware.DevAuthMiddleware())`를 `WalletOrSessionKeyMiddleware`로 교체.
   - DEBUG_MODE=true일 때만 dev 헤더 fallback이 동작하도록.
   - 현 상태로는 누구나 `X-User-ID: anyone`으로 임의 사용자 행세 가능.

2. **JWT_SECRET 기본값 제거**
   - `config/config.go:63`의 `"your-secret-key-change-in-production"` 디폴트 제거.
   - 환경변수 미설정 시 `Load()`에서 에러 반환 → 부팅 실패가 안전 디폴트.

3. **SYS_ADMIN capability 재검토**
   - `manager.go:283`. SSH 데몬 실행에 SYS_ADMIN이 필요한지 확인.
   - 필요 없으면 제거. 필요하다면 `CAP_SYS_PTRACE`/`CAP_NET_BIND_SERVICE` 등 최소 권한으로 분해.

4. **SSH 비밀번호 기본값 제거**
   - `manager.go:161`의 `"gpuaccess123"` fallback 제거.
   - 사용자가 비밀번호 안 주면 거부 또는 무작위 생성 후 1회만 응답.
   - 더 권장: SSH 키 인증 (사용자 공개키를 authorized_keys로 주입).

### P1 — 결제 통합 (TODO_BLOCKCHAIN.md 마무리)

5. **JobHandler ↔ Vault 연결**
   ```
   CreateJob 내부:
     1. session = ValidateAndCharge(sessionKey, estimatedCost)
     2. blockchain.StartRentalWithSessionKey(session.SessionKey, providerAddr, pricePerSecond, jobID)
     3. K8s Pod 생성 (트랜잭션 영수증 받은 뒤)
     4. rentalID를 Pod annotation에 저장
   DeleteJob/만료:
     1. blockchain.EndRental(rentalID)
     2. 정산 영수증을 DB에 저장
   ```

6. **Per-second 가격을 Provider/Capacity에서 가져오기**
   - 하드코딩 0.5 WLC/hr 제거.
   - `Capacity.GPUPricesPerHour` (이미 정의됨) 활용.

### P2 — 아키텍처 부채

7. **Orchestrator 분해 (1500줄 → 5개 모듈)**
   - `ResourceLedger` — AllocateResources/ReleaseResources/RecoverJobAllocations
   - `MiningCoordinator` — DeployMiningForProvider/StopMiningForProvider/AllocateMiningGPU/syncMiningPodStates
   - `RegistrationCoordinator` — handleRegistration/heartbeatMonitor/checkStaleProviders
   - `PodEventReactor` — podWatcher/handlePodEvent
   - `JobLifecycleSweeper` — jobExpirationMonitor/cleanupExpiredAndFailedJobs
   - `Orchestrator`는 이들을 조립하는 facade로 축소.

8. **Legacy Capacity 필드 제거**
   - `GPUCount`, `CPUCores`, `MemoryMB`(int) 제거 마이그레이션.
   - 모든 fallback 분기 삭제 → `orchestrator.go`에서 약 100줄 감소 예상.

9. **분산 락 (수평 확장 준비)**
   - `providersMu sync.Mutex`를 Redis SETNX 또는 Redlock으로 교체.
   - 또는 PostgreSQL row-level lock + `SELECT ... FOR UPDATE` 기반 회계.
   - 현재는 단일 오케스트레이터 인스턴스 가정 → 마스터 죽으면 전체 등록/할당 정지.

### P3 — 운영성

10. **Heartbeat 사용량 측정**
    - `provider-agent/main.go:311 getGPUUsage`가 빈 배열 반환.
    - `nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader`로 채워야 모니터링 의미 있음.

11. **Prometheus metrics 노출**
    - `/metrics` 엔드포인트 추가.
    - 핵심 지표: `provider_count{status}`, `gpu_total/inuse/mining/available`, `job_creation_duration`, `mining_pod_status`.

12. **테스트 커버리지 확장**
    - 현재: `node_manager_test.go`, `orchestrator_test.go`, `tenant_test.go`만 존재.
    - 누락: `JobManager`, `MiningManager`, `wallet.Verifier` (EIP-712 서명 케이스), `blockchain.Client` (mock RPC).

13. **구조화된 에러 응답 표준**
    - 현재 핸들러마다 `gin.H{"error": "..."}` 패턴.
    - `{"code": "INSUFFICIENT_GPU", "message": "...", "details": {...}}` 형태로 표준화.

### P4 — 기능 확장

14. **자동 가격 책정**
    - 현재 정적. Provider별 수요/공급 기반 동적 가격.
    - 또는 사용자 입찰(bid) 모델.

15. **Auto-scale 채굴 (이미 SDK 플래그 있음)**
    - 가용 GPU 비율 X% 미만 → 채굴 GPU 회수.
    - 비율 Y% 초과 → 채굴 GPU 자동 추가.

16. **사용자 SSH 키 모드**
    - 비밀번호 대신 사용자가 공개키 업로드.
    - 컨테이너에 `~/.ssh/authorized_keys` 주입.

17. **Job 사전 견적 API**
    - `POST /api/v1/jobs/estimate` — 실제 생성 전 가격/Provider 후보 반환.
    - UX 개선 + 세션 키 한도 사전 검증.

18. **Frontend ↔ Backend docs 동기화**
    - 현재 `architecture.md`, `ARCHITECTURE_OVERVIEW.md`, `BLOCKCHAIN_INTEGRATION.md`, `frontend/docs/network/*`가 환경변수·라우트 표가 제각각.
    - 단일 SSOT(이 문서) 또는 OpenAPI spec generator 도입.

---

## 8. 미구현 / 기술 부채 인벤토리

코드 내 TODO/주석 + TODO_BLOCKCHAIN.md 기반.

| 위치 | 항목 | 영향 |
|------|------|------|
| `provider-agent/main.go:266` | 자동 경매 / 시간당 가격 계산 | P1 — 결제와 직접 연결 |
| `provider-agent/main.go:281,311,316,321` | GPU/CPU/Memory 사용량 측정 | P3 — 모니터링 데이터 부재 |
| `provider-agent/main.go:298` | ActiveJobs를 kubelet에서 가져오기 | P3 |
| `TODO_BLOCKCHAIN.md` 1번 | server.go에 wallet 라우트 등록 | P1 — 인증 활성화 차단 |
| `TODO_BLOCKCHAIN.md` 4번 | CreateJob 쿼터 차감 / 정산 | P1 |
| `TODO_BLOCKCHAIN.md` 5번 | endRental 자동 호출 | P1 |
| Frontend MetaMask 연동 | wagmi/viem 통합 | P1 |
| BSC Testnet 컨트랙트 배포 | VAULT_ADDRESS 환경변수 | P0 (테스트 가능 조건) |
| 멀티 인스턴스 배포 | 분산 락 / DB 트랜잭션 | P2 |
| Mining 자동 확장 | SDK 플래그만 존재, daemon 로직 미구현 | P4 |

---

## 9. 부록

### 9.1 디렉터리 맵 (실측)

```
serving-user-broker/
├── architecture.md                      # 한국어 상위 아키텍처 설명
├── TODO_BLOCKCHAIN.md                   # 블록체인 통합 잔여 작업
├── go.mod                               # 워크스페이스 root (사용 안 함)
├── contracts/                           # Hardhat + Solidity (GPUVault, MockUSDT)
├── frontend/                            # Next.js + GitBook docs
├── scripts/                             # 외부 셋업 스크립트
├── .agent/workflows/                    # 셋업 워크플로 가이드 3종
└── k8s-proxy-server/                    # 메인 Go 백엔드 (이 분석의 90%)
    ├── cmd/
    │   ├── server/                      # 메인 API 서버
    │   ├── provider-agent/              # 가벼운 등록 데몬 (레거시화 의심)
    │   └── provider-sdk/                # 호스트 부트스트래퍼 + 데몬
    ├── internal/
    │   ├── auth/                        # JWT 매니저 (Google OAuth는 미연결)
    │   ├── blockchain/                  # ethclient + GPUVault ABI
    │   ├── config/                      # env 로딩 (godotenv)
    │   ├── db/                          # pgx 풀 + 마이그레이션
    │   ├── handler/                     # Gin 핸들러 4종
    │   ├── job/                         # Pod/Service 빌더
    │   ├── k8s/                         # client-go + Tenant 격리
    │   ├── messaging/                   # Redis Streams 추상화
    │   ├── middleware/                  # auth/cors/logger/session_auth
    │   ├── provider/                    # ★ 핵심 도메인 — orchestrator + types
    │   ├── sdk/                         # SDK 컴포넌트 (validator/installer/bootstrap/daemon)
    │   ├── server/                      # Gin 라우터 셋업
    │   ├── agent/                       # nvidia-smi 등 시스템 스캐너
    │   └── wallet/                      # EIP-712 검증 + 세션 매니저
    ├── deploy/k8s/                      # K8s 매니페스트 (Deployment, RBAC, Ingress)
    ├── deploy/docker/                   # 멀티스테이지 Dockerfile
    └── docs/                            # 본 분석 + 8개 가이드
```

### 9.2 주요 환경변수 (실제 코드 기준)

```env
# 서버
PROXY_PORT=8080
DEBUG_MODE=false
JWT_SECRET=<반드시 변경>
ALLOWED_ORIGINS=https://app.example.com

# K8s
K8S_MASTER_URL=https://kubernetes.default.svc
K8S_TOKEN=<자동 주입 in-cluster>

# Orchestrator
ENABLE_ORCHESTRATOR=true
MASTER_PUBLIC_IP=<kubeadm join용>
MASTER_API_PORT=6443

# Redis (등록/세션)
REDIS_HOST=redis-master
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL (Provider DB)
POSTGRES_HOST=postgres
POSTGRES_DB=worldland
POSTGRES_USER=worldland
POSTGRES_PASSWORD=<필수, 없으면 DB 비활성>
POSTGRES_SSL_MODE=disable

# Blockchain
ENABLE_BLOCKCHAIN=true
BLOCKCHAIN_RPC_URL=https://bsc-dataseed.binance.org/
BLOCKCHAIN_CHAIN_ID=56
VAULT_ADDRESS=0x...
BACKEND_PRIVATE_KEY=<핫월렛 키, KMS/Vault 권장>
```

### 9.3 분석 시 검토한 핵심 파일

- `cmd/server/main.go` — 부트스트랩 시퀀스
- `internal/server/server.go` — 라우팅
- `internal/provider/orchestrator.go` — 모든 도메인 로직의 결합점
- `internal/provider/types.go` — 데이터 모델
- `internal/provider/mining_manager.go` — 채굴 Pod 라이프사이클
- `internal/job/manager.go` — Pod/Service/SSH 빌더
- `internal/k8s/tenant.go` — namespace + Quota + NetworkPolicy
- `internal/wallet/verifier.go` — EIP-712 + personal_sign
- `internal/wallet/session_manager.go` — Redis 기반 세션
- `internal/blockchain/client.go` — BSC 컨트랙트 호출
- `internal/middleware/session_auth.go` — 인증 체인
- `internal/config/config.go` — 환경 로딩
- `cmd/provider-sdk/main.go` & `cmd/provider-agent/main.go` — Provider 측 진입점
- `TODO_BLOCKCHAIN.md`, `architecture.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/BLOCKCHAIN_INTEGRATION.md` — 기존 문서

---

**다음 권장 액션** (우선순위 P0-P1만):

1. `server.go`에 wallet 라우트 + SessionKeyAuthMiddleware 연결.
2. `DevAuthMiddleware` → `WalletOrSessionKeyMiddleware`로 jobs 라우트 교체.
3. `JobHandler.CreateJob`에 `ValidateAndCharge` + `StartRentalWithSessionKey` 추가.
4. BSC Testnet에 GPUVault 배포, `VAULT_ADDRESS` 설정.
5. JWT_SECRET / SSH 비밀번호 / SYS_ADMIN 디폴트 제거.

이 5단계가 완료되면 MVP가 사실상의 end-to-end 운영 가능 상태에 들어간다.
