---
description: 
---

# 📚 사용자 워크플로우 가이드

이 디렉토리는 프로젝트에서 자주 사용되는 작업들을 표준화된 워크플로우로 정의합니다.
AI 어시스턴트가 이 워크플로우를 참조하여 일관된 방식으로 작업을 수행할 수 있습니다.

---

## 🎯 워크플로우란?

워크플로우는 특정 작업을 수행하기 위한 **단계별 가이드**입니다. 반복적인 작업을 표준화하고, 실수를 줄이며, 팀 전체가 일관된 방식으로 작업할 수 있도록 도와줍니다.

### 워크플로우의 장점

- ✅ **일관성**: 모든 팀원이 동일한 방식으로 작업
- ✅ **효율성**: 반복 작업의 시간 절약
- ✅ **품질 보장**: 검증된 절차 사용으로 오류 감소
- ✅ **문서화**: 작업 절차가 자동으로 기록됨

---

## 📋 사용 가능한 워크플로우 목록

| 슬래시 명령어                    | 설명                                                               | 대상     | 난이도  |
| -------------------------------- | ------------------------------------------------------------------ | -------- | ------- |
| `/user-quickstart`               | GPU 대여자를 위한 빠른 시작 가이드                                 | User     | 🟢 초급 |
| `/provider-setup`                | GPU 제공자 설정 가이드                                             | Provider | 🟡 중급 |
| `/local-master-ec2-worker-setup` | 로컬 마스터노드 + EC2 GPU 워커노드 Kubernetes 클러스터 설치 가이드 | Provider | 🔴 고급 |

---

## 🚀 워크플로우 사용법

### 1. 슬래시 명령어로 실행

AI 어시스턴트에게 슬래시 명령어를 사용하여 워크플로우를 실행하도록 요청할 수 있습니다:

```
/local-master-ec2-worker-setup
```

### 2. 자연어로 요청

워크플로우 이름이나 관련 키워드로 요청할 수도 있습니다:

```
"Kubernetes 클러스터를 설정해줘"
"EC2에 GPU 워커 노드를 연결하고 싶어"
```

### 3. Turbo 모드 (자동 실행)

워크플로우 내 특정 단계에 `// turbo` 주석이 있으면, 해당 명령어는 사용자 확인 없이 자동 실행됩니다.

```markdown
2. 패키지 설치하기
   // turbo
3. 서버 시작하기
```

위 예시에서 **3단계만** 자동 실행됩니다.

전체 워크플로우를 자동 실행하려면 `// turbo-all` 주석을 파일 어디에든 추가하세요:

```markdown
// turbo-all

1. 첫 번째 단계
2. 두 번째 단계
3. 세 번째 단계
```

---

## 📁 워크플로우 파일 구조

각 워크플로우는 `.md` 파일로 작성되며, 다음 형식을 따릅니다:

```markdown
---
description: 워크플로우에 대한 짧은 설명
---

# 워크플로우 제목

상세한 단계별 가이드...
```

### 필수 요소

1. **YAML Frontmatter**: `---`로 감싸인 메타데이터
   - `description`: 워크플로우의 간단한 설명 (필수)
2. **본문**: 마크다운 형식의 상세 가이드
   - 단계별 설명
   - 코드 블록
   - 주의사항

---

## ✏️ 새 워크플로우 만들기

### Step 1: 파일 생성

`.agent/workflows/` 디렉토리에 새 `.md` 파일을 생성합니다:

```bash
touch .agent/workflows/my-new-workflow.md
```

파일명은 슬래시 명령어와 동일하게 지정됩니다:

- 파일명: `my-new-workflow.md`
- 슬래시 명령어: `/my-new-workflow`

### Step 2: 기본 템플릿 작성

````markdown
---
description: 이 워크플로우가 수행하는 작업에 대한 짧은 설명
---

# 워크플로우 제목

## 📋 개요

이 워크플로우는 [작업 내용]을 수행합니다.

## 🔧 사전 요구사항

- 요구사항 1
- 요구사항 2

## 📝 단계별 가이드

### Step 1: 첫 번째 단계

설명...

```bash
# 실행할 명령어
echo "Hello World"
```
````

### Step 2: 두 번째 단계

설명...

## 🔧 트러블슈팅

### 문제: 에러 발생 시

해결 방법...

## 📝 참고사항

- 참고 1
- 참고 2

````

### Step 3: 베스트 프랙티스

1. **명확한 단계 구분**: 각 단계를 명확하게 구분하고 번호를 붙입니다
2. **코드 블록**: 실행할 명령어는 반드시 코드 블록으로 감쌉니다
3. **주의사항 표시**: 중요한 주의사항은 눈에 띄게 표시합니다
4. **트러블슈팅**: 예상되는 문제와 해결책을 포함합니다
5. **사전 요구사항**: 필요한 환경/도구를 명시합니다

---

## 📖 워크플로우 상세 가이드

### `/local-master-ec2-worker-setup`

**목적**: 로컬 머신에 Kubernetes 마스터 노드를 설치하고, AWS EC2 GPU 인스턴스를 워커 노드로 연결합니다.

**주요 단계**:
1. AWS 보안그룹 설정 (필수 포트 오픈)
2. 로컬 마스터 노드 설정 (containerd, kubeadm, kubelet, kubectl)
3. EC2 워커 노드 설정 (NVIDIA 드라이버 포함)
4. GPU 리소스 활성화 (NVIDIA Device Plugin)
5. 테스트 및 검증

**예상 소요 시간**: 약 30-60분

**난이도**: 🔴 고급

**사전 요구사항**:
- 로컬: Ubuntu 20.04/22.04, Docker, 최소 2 CPU/2GB RAM
- EC2: g4dn.xlarge 또는 GPU 인스턴스, Ubuntu AMI

---

## 🔗 관련 문서

| 문서 | 설명 |
|------|------|
| [ARCHITECTURE_OVERVIEW.md](../../k8s-proxy-server/docs/ARCHITECTURE_OVERVIEW.md) | 전체 시스템 아키텍처 |
| [GCP_DEPLOYMENT_GUIDE.md](../../k8s-proxy-server/docs/GCP_DEPLOYMENT_GUIDE.md) | GCP 배포 가이드 |
| [PROVIDER_SDK_GUIDE.md](../../k8s-proxy-server/docs/PROVIDER_SDK_GUIDE.md) | Provider SDK 사용법 |
| [API_GATEWAY_ARCHITECTURE.md](../../k8s-proxy-server/docs/API_GATEWAY_ARCHITECTURE.md) | API Gateway 아키텍처 |
| [MINING_INTEGRATION.md](../../k8s-proxy-server/docs/MINING_INTEGRATION.md) | 마이닝 통합 가이드 |

---

## 💡 팁과 트릭

### 자주 사용하는 명령어 조합

```bash
# 클러스터 상태 확인
kubectl get nodes
kubectl get pods -A

# 로그 확인
kubectl logs <pod-name> -n <namespace>

# GPU 상태 확인
kubectl describe node <node-name> | grep -A5 "Allocatable:"
````

### 문제 해결 체크리스트

1. ✅ 모든 필수 포트가 열려 있는지 확인
2. ✅ 노드 간 네트워크 연결 확인
3. ✅ containerd/kubelet 서비스 상태 확인
4. ✅ GPU 드라이버 정상 설치 확인

---


_마지막 업데이트: 2026-01-15_
