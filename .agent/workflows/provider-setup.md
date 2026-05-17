---
description: Provider(GPU 제공자)를 위한 설정 가이드
---

# Provider 설정 가이드

GPU 서버를 Worldland 플랫폼에 등록하여 수익을 창출하려는 제공자를 위한 가이드입니다.

## 📋 사전 요구사항

| 항목    | 요구사항                                    |
| ------- | ------------------------------------------- |
| OS      | Ubuntu 20.04+ / Debian 11+                  |
| GPU     | NVIDIA GPU (Compute Capability 3.5+)        |
| Driver  | NVIDIA Driver 470+                          |
| Network | Public IP, 6443/10250/30000-32767 포트 오픈 |
| CPU     | 4+ cores                                    |
| Memory  | 8GB+                                        |
| Disk    | 50GB+                                       |

---

## 🚀 빠른 설치 (3단계)

### Step 1: GPU 인스턴스 준비

**GCP:**

```bash
gcloud compute instances create gpu-worker-1 \
  --zone=us-central1-a \
  --machine-type=n1-standard-8 \
  --accelerator=type=nvidia-tesla-t4,count=4 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB \
  --maintenance-policy=TERMINATE
```

**AWS:**

```bash
aws ec2 run-instances \
  --instance-type g4dn.xlarge \
  --image-id ami-0abcdef1234567890 \
  --key-name your-key \
  --security-group-ids sg-xxx
```

---

### Step 2: NVIDIA 드라이버 설치

```bash
# SSH 접속 후 실행
sudo apt update
sudo apt install -y nvidia-driver-535
sudo reboot
```

재부팅 후 확인:

```bash
nvidia-smi
```

예상 출력:

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.xx       Driver Version: 535.xx       CUDA Version: 12.x    |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  Tesla T4            Off  | 00000000:00:04.0 Off |                    0 |
| N/A   45C    P8     9W /  70W |      0MiB / 15360MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

---

### Step 3: Provider SDK 설치

```bash
# 단일 명령으로 전체 설치
curl -sSL https://get.worldland.io/provider | sudo bash -s -- \
  --master-url=https://master.worldland.io \
  --token=<bootstrap-token> \
  --wallet=0x1234abcd...
```

**옵션 설명:**

| 옵션              | 필수 | 설명                             |
| ----------------- | ---- | -------------------------------- |
| `--master-url`    | ✅   | Master Orchestrator URL          |
| `--token`         | ✅   | Bootstrap 토큰 (Master에서 발급) |
| `--wallet`        | ✅   | 보상 받을 지갑 주소              |
| `--enable-mining` | ❌   | 마이닝 자동 시작                 |
| `--mining-gpu`    | ❌   | 마이닝용 GPU 개수 (기본: 1)      |
| `--verbose`       | ❌   | 상세 로그 출력                   |

---

## 🔑 Bootstrap Token 발급

Master 노드에서 토큰을 발급받습니다:

```bash
# Master 노드에서 실행
kubeadm token create --print-join-command

# 출력 예시:
# kubeadm join 10.178.0.13:6443 --token abcdef.0123456789abcdef \
#   --discovery-token-ca-cert-hash sha256:1234...
```

---

## ✅ 설치 확인

### Provider 상태 확인

```bash
worldland-provider status
```

예상 출력:

```
[Provider Status]
  Provider ID: provider-abc123
  Node Name: gpu-worker-001
  Status: available
  Uptime: 0d 0h 5m
  Healthy: true

[Resources]
  Total GPUs: 4
  Mining: 0
  Rented: 0
  Available: 4

[Mining Status]
  Status: stopped
```

### 노드 상태 확인 (Master에서)

```bash
kubectl get nodes

# 예상 출력:
# NAME              STATUS   ROLES           AGE   VERSION
# master-node       Ready    control-plane   10d   v1.29.0
# gpu-worker-001    Ready    <none>          5m    v1.29.0
```

### GPU 리소스 확인 (Master에서)

```bash
kubectl describe node gpu-worker-001 | grep -A5 "Allocatable:"

# 예상 출력:
# Allocatable:
#   cpu:                8
#   memory:             32000Mi
#   nvidia.com/gpu:     4
```

---

## ⛏️ Mining 설정 (선택사항)

### Mining 시작

```bash
# Mining 시작 (기본 1 GPU)
worldland-provider mining start

# 특정 GPU 개수로 시작
worldland-provider mining set-gpu 2
```

### Mining 상태 확인

```bash
worldland-provider mining status

# 출력:
# [Mining Status]
#   Status: running
#   Current GPUs: 2
#   Target GPUs: 2
#   Auto-Scale: false (min: 1, max: 4)
```

### Mining 중지

```bash
worldland-provider mining stop
```

---

## 📊 모니터링

### 로그 확인

```bash
# 전체 로그
worldland-provider logs

# Mining 로그만
worldland-provider logs --mining

# 실시간 로그
worldland-provider logs -f
```

### 시스템 서비스 상태

```bash
# 서비스 상태 확인
sudo systemctl status worldland-provider

# 서비스 재시작
sudo systemctl restart worldland-provider

# 부팅 시 자동 시작 설정
sudo systemctl enable worldland-provider
```

---

## 💰 수익 확인

### 대시보드

웹 브라우저에서:

```
https://dashboard.worldland.io/providers/<your-provider-id>
```

### CLI (예정)

```bash
worldland-provider earnings
```

---

## 🔧 트러블슈팅

### NVIDIA 드라이버 미인식

```bash
# 드라이버 상태 확인
nvidia-smi

# 드라이버 재설치
sudo apt purge nvidia-*
sudo apt install nvidia-driver-535
sudo reboot
```

### Master 연결 실패

```bash
# 네트워크 확인
ping master.worldland.io
curl -v https://master.worldland.io/health

# 방화벽 확인
sudo ufw status
sudo ufw allow 6443/tcp
sudo ufw allow 10250/tcp
```

### kubeadm join 실패

```bash
# 기존 설정 초기화
sudo kubeadm reset -f
sudo rm -rf /etc/cni/net.d
sudo iptables -F && sudo iptables -t nat -F

# 다시 시도
worldland-provider-sdk --wallet=... --token=...
```

### Heartbeat 전송 실패

```bash
# kubelet 상태 확인
sudo systemctl status kubelet
sudo journalctl -u kubelet -f

# containerd 상태 확인
sudo systemctl status containerd
```

---

## 🔒 보안 설정

### 방화벽 설정

```bash
# UFW 활성화 및 필수 포트만 허용
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 6443/tcp    # K8s API
sudo ufw allow 10250/tcp   # Kubelet
sudo ufw allow 30000:32767/tcp  # NodePort
sudo ufw enable
```

### SSH 키 인증 (권장)

```bash
# 비밀번호 인증 비활성화
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## 📚 관련 문서

- [전체 사용자 가이드](../../k8s-proxy-server/docs/USER_GUIDE.md)
- [Provider SDK 가이드](../../k8s-proxy-server/docs/PROVIDER_SDK_GUIDE.md)
- [로컬+EC2 클러스터 설정](/local-master-ec2-worker-setup)
