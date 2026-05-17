---
description: 로컬 마스터노드 + EC2 GPU 워커노드 Kubernetes 클러스터 설치 가이드
---

# 로컬 마스터 + EC2 GPU 워커 Kubernetes 클러스터 구축

이 가이드는 로컬 머신에 Kubernetes 마스터 노드를 설치하고, AWS EC2 GPU 인스턴스를 워커 노드로 연결하는 방법을 설명합니다.

## 📋 사전 요구사항

### 로컬 머신 (마스터)

- Ubuntu 20.04/22.04 LTS
- Docker 설치됨
- 최소 2 CPU, 2GB RAM
- 퍼블릭 IP 또는 EC2에서 접근 가능한 IP

### EC2 (워커)

- Ubuntu 20.04/22.04 AMI
- g4dn.xlarge (또는 GPU 인스턴스)
- 퍼블릭 IP
- 보안그룹에서 필요한 포트 오픈

---

## 🔐 Step 1: AWS 보안그룹 설정

EC2 보안그룹에서 다음 포트를 열어야 합니다:

### 마스터 노드 (로컬 → Inbound 허용 필요 시)

| 포트      | 프로토콜 | 용도                    |
| --------- | -------- | ----------------------- |
| 6443      | TCP      | Kubernetes API Server   |
| 2379-2380 | TCP      | etcd                    |
| 10250     | TCP      | Kubelet API             |
| 10251     | TCP      | kube-scheduler          |
| 10252     | TCP      | kube-controller-manager |

### 워커 노드 (EC2 → Inbound)

| 포트        | 프로토콜 | 용도              |
| ----------- | -------- | ----------------- |
| 10250       | TCP      | Kubelet API       |
| 30000-32767 | TCP      | NodePort Services |

### 양방향 (클러스터 내부 통신)

| 포트 | 프로토콜 | 용도                     |
| ---- | -------- | ------------------------ |
| 8472 | UDP      | Flannel VXLAN (CNI)      |
| 179  | TCP      | Calico BGP (CNI 선택 시) |

---

## 🖥️ Step 2: 로컬 마스터 노드 설정

### 2.1 containerd 설정 (Docker 기반에서 전환)

```bash
# containerd 설치 및 설정
sudo apt-get update
sudo apt-get install -y containerd

# containerd 기본 설정 생성
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# SystemdCgroup 활성화 (중요!)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

# containerd 재시작
sudo systemctl restart containerd
sudo systemctl enable containerd
```

### 2.2 Kubernetes 사전 요구사항 설정

```bash
# 스왑 비활성화
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# 커널 모듈 로드
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# 네트워크 설정
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

### 2.3 kubeadm, kubelet, kubectl 설치

```bash
# Kubernetes APT 저장소 추가
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

# Kubernetes 서명 키 추가 (v1.29 기준)
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# 저장소 추가
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# 설치
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

### 2.4 마스터 노드 초기화

```bash
# 로컬 머신의 퍼블릭 IP 확인 (EC2에서 접근 가능한 IP)
# 공유기 뒤에 있다면 포트포워딩 필요
export MASTER_IP="YOUR_PUBLIC_IP"

# kubeadm 초기화
sudo kubeadm init \
  --apiserver-advertise-address=$MASTER_IP \
  --apiserver-cert-extra-sans=$MASTER_IP \
  --pod-network-cidr=10.244.0.0/16 \
  --control-plane-endpoint=$MASTER_IP:6443

# kubectl 설정
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 2.5 CNI (Flannel) 설치

```bash
# Flannel 설치
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# 노드 상태 확인
kubectl get nodes
```

### 2.6 Worker 조인 토큰 생성

```bash
# 조인 명령어 생성 (24시간 유효)
kubeadm token create --print-join-command

# 출력 예시:
# kubeadm join 123.123.123.123:6443 --token abcdef.1234567890abcdef --discovery-token-ca-cert-hash sha256:...
```

---

## 🖥️ Step 3: EC2 워커 노드 설정

EC2 인스턴스에 SSH로 접속 후 다음을 실행합니다.

### 3.1 기본 패키지 및 containerd 설치

```bash
# 시스템 업데이트
sudo apt-get update && sudo apt-get upgrade -y

# containerd 설치
sudo apt-get install -y containerd

# containerd 설정
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl enable containerd
```

### 3.2 Kubernetes 사전 요구사항

```bash
# 스왑 비활성화
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# 커널 모듈
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# sysctl 설정
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

### 3.3 kubeadm 및 kubelet 설치

```bash
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

### 3.4 NVIDIA 드라이버 및 Container Toolkit 설치

```bash
# NVIDIA 드라이버 설치
sudo apt-get install -y linux-headers-$(uname -r)
sudo apt-get install -y nvidia-driver-535  # 또는 최신 버전

# NVIDIA Container Toolkit 설치
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# containerd에 NVIDIA 런타임 설정
sudo nvidia-ctk runtime configure --runtime=containerd
sudo systemctl restart containerd
```

### 3.5 클러스터에 조인

```bash
# 마스터에서 생성한 조인 명령어 실행
sudo kubeadm join <MASTER_IP>:6443 \
  --token <TOKEN> \
  --discovery-token-ca-cert-hash sha256:<HASH>
```

---

## 🎮 Step 4: GPU 리소스 활성화 (마스터에서 실행)

### 4.1 NVIDIA Device Plugin 설치

```bash
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml
```

### 4.2 GPU 노드 확인

```bash
# 노드 확인
kubectl get nodes

# GPU 리소스 확인
kubectl describe node <EC2_NODE_NAME> | grep -A5 "Allocatable:"

# nvidia.com/gpu: 1 이 표시되어야 함
```

### 4.3 GPU 노드에 라벨 추가

```bash
# GPU 노드 라벨 추가
kubectl label nodes <EC2_NODE_NAME> node-type=gpu

# 블록체인 노드 제공자 라벨 추가
kubectl label nodes <EC2_NODE_NAME> blockchain-provider=worldland
```

---

## 🧪 Step 5: 테스트

### 5.1 GPU Pod 테스트

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: Never
  containers:
  - name: cuda-test
    image: nvidia/cuda:12.0.0-base-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1
  nodeSelector:
    node-type: gpu
EOF

# 로그 확인
kubectl logs gpu-test
```

### 5.2 serving-user-broker 배포 테스트

```bash
cd /home/nubroo/serving-user-broker/k8s-proxy-server

# 로컬 kubeconfig 사용하도록 설정
export KUBECONFIG=$HOME/.kube/config

# k8s-proxy-server 실행
make run
```

---

## 🔧 트러블슈팅

### 문제: 워커 노드가 NotReady 상태

```bash
# kubelet 로그 확인
sudo journalctl -u kubelet -f

# CNI 플러그인 확인
ls /opt/cni/bin/
```

### 문제: GPU가 인식되지 않음

```bash
# NVIDIA 드라이버 확인
nvidia-smi

# containerd에서 GPU 런타임 확인
sudo ctr run --rm --gpus 0 nvidia/cuda:12.0.0-base-ubuntu22.04 test nvidia-smi
```

### 문제: 마스터와 워커 간 통신 불가

```bash
# 마스터에서 워커로 ping 테스트
ping <EC2_PUBLIC_IP>

# 방화벽 확인
sudo iptables -L -n

# 6443 포트 연결 테스트 (워커에서)
nc -zv <MASTER_IP> 6443
```

---

## 📝 중요 참고사항

1. **포트포워딩**: 로컬이 공유기 뒤에 있다면, 6443 포트를 포워딩해야 합니다.
2. **동적 IP**: 로컬 IP가 바뀌면 인증서를 재생성해야 할 수 있습니다.
3. **보안**: 프로덕션에서는 VPN이나 Private 네트워크 사용을 권장합니다.
