---
description: User(GPU 대여자)를 위한 빠른 시작 가이드
---

# User 빠른 시작 가이드

GPU 컨테이너를 대여하여 작업을 수행하는 사용자를 위한 빠른 시작 가이드입니다.

## 📋 사전 준비

- Google 계정 (로그인용)
- SSH 클라이언트 (접속용)

---

## 🚀 Step 1: 로그인

1. 웹사이트 접속: `http://localhost:3000` (로컬) 또는 프로덕션 URL
2. **"Login"** 버튼 클릭
3. Google 계정으로 로그인

```
💡 개발 환경에서는 "Dev Login (테스트용)" 버튼을 사용할 수 있습니다.
```

---

## 🎮 Step 2: GPU Job 생성

1. 로그인 후 **`/jobs`** 페이지로 이동
2. **"New Job"** 버튼 클릭

### 2.1 GPU 선택

```
┌─────────────────────────────────────────┐
│ GPU Configuration                        │
├─────────────────────────────────────────┤
│  [Tesla T4]     [RTX 4090]     [...]    │
│   2 Available    1 Available            │
│   ● Live         ● Live                 │
├─────────────────────────────────────────┤
│ GPU Count: [1] ─────●──────────── [8]   │
└─────────────────────────────────────────┘
```

### 2.2 리소스 설정

| 항목      | 옵션                | 권장값 |
| --------- | ------------------- | ------ |
| CPU Cores | 2, 4, 8, 16         | 4      |
| Memory    | 8, 16, 32, 64 GB    | 16 GB  |
| Storage   | 20, 50, 100, 200 GB | 50 GB  |

### 2.3 환경 템플릿 선택

| 템플릿     | Docker 이미지                      | 용도        |
| ---------- | ---------------------------------- | ----------- |
| PyTorch    | `pytorch/pytorch:latest`           | 딥러닝 학습 |
| TensorFlow | `tensorflow/tensorflow:latest-gpu` | ML 플랫폼   |
| Ubuntu     | `ubuntu:22.04`                     | 범용 Linux  |
| CUDA Base  | `nvidia/cuda:12.0-runtime`         | CUDA 개발   |

### 2.4 SSH 비밀번호 설정

```
SSH Password: [________________]
(최소 6자 이상)
```

### 2.5 Job 생성

**"Create Job"** 버튼 클릭

---

## 🔌 Step 3: SSH 접속

Job이 **Running** 상태가 되면 SSH로 접속합니다.

```bash
# Job 상세 페이지에서 SSH 정보 확인
ssh root@<HOST_IP> -p <PORT>

# 예시
ssh root@34.64.100.50 -p 32001
# 비밀번호: Job 생성 시 설정한 비밀번호
```

### 접속 후 GPU 확인

```bash
# GPU 상태 확인
nvidia-smi

# PyTorch GPU 테스트
python -c "import torch; print(torch.cuda.is_available())"
```

---

## 📊 Step 4: 작업 수행

### 예시: PyTorch 학습

```bash
# 코드 다운로드
git clone https://github.com/your-repo/your-project.git
cd your-project

# 의존성 설치
pip install -r requirements.txt

# 학습 실행
python train.py
```

### 장기 작업 시 권장사항

```bash
# tmux 세션 사용 (연결 끊어져도 작업 유지)
tmux new -s training

# 학습 실행
python train.py

# 세션 분리: Ctrl+B, D
# 세션 재접속: tmux attach -t training
```

---

## 🗑️ Step 5: Job 종료

작업이 끝나면 Job을 삭제합니다.

1. `/jobs` 페이지로 이동
2. 삭제할 Job의 **"Delete"** 버튼 클릭
3. 확인 팝업에서 **"OK"** 클릭

⚠️ **주의**: Job 삭제 시 모든 데이터가 삭제됩니다. 중요 데이터는 미리 백업하세요.

---

## 💡 유용한 팁

### 데이터 백업

```bash
# SCP로 파일 다운로드
scp -P 32001 root@34.64.100.50:/workspace/model.pth ./

# rsync 사용
rsync -avz -e "ssh -p 32001" root@34.64.100.50:/workspace/ ./backup/
```

### GPU 메모리 모니터링

```bash
# 실시간 모니터링
watch -n 1 nvidia-smi

# Python 코드에서
import torch
print(f"Allocated: {torch.cuda.memory_allocated()/1e9:.2f} GB")
print(f"Cached: {torch.cuda.memory_reserved()/1e9:.2f} GB")
```

---

## ⚠️ 트러블슈팅

### Job이 Pending 상태로 유지됨

원인: GPU 리소스 부족
해결:

1. 다른 GPU 타입 선택
2. GPU Count 줄이기
3. 잠시 후 재시도

### OOMKilled 발생

원인: 메모리 부족
해결:

1. 권장 메모리 확인 (Job 상세 페이지)
2. 더 큰 메모리로 새 Job 생성

### SSH 접속 실패

확인사항:

1. Job 상태가 **Running**인지 확인
2. 호스트/포트 정보가 올바른지 확인
3. 비밀번호가 맞는지 확인

---

## 📚 관련 문서

- [전체 사용자 가이드](../../k8s-proxy-server/docs/USER_GUIDE.md)
- [아키텍처 개요](../../k8s-proxy-server/docs/ARCHITECTURE_OVERVIEW.md)
- [API 문서](../../k8s-proxy-server/docs/API_GATEWAY_ARCHITECTURE.md)
