# How to Provide GPU Resources

This guide explains how to become a GPU provider on WorldLand Cloud and earn WLC tokens.

## Prerequisites

### Hardware Requirements

| Component     | Minimum          | Recommended           |
| ------------- | ---------------- | --------------------- |
| **GPU**       | NVIDIA GTX 1080+ | RTX 3090/4090 or A100 |
| **VRAM**      | 8GB              | 24GB+                 |
| **CPU**       | 4 cores          | 8+ cores              |
| **RAM**       | 16GB             | 32GB+                 |
| **Storage**   | 100GB SSD        | 500GB NVMe            |
| **Network**   | 100 Mbps         | 1 Gbps                |
| **Public IP** | Required         | Static IP recommended |

### Software Requirements

- Ubuntu 20.04/22.04 LTS
- NVIDIA Driver 525+
- Docker with NVIDIA Container Toolkit
- Kubernetes (kubeadm)

## Step 1: Install NVIDIA Drivers

```bash
# Add NVIDIA repository
sudo apt-get update
sudo apt-get install -y nvidia-driver-535

# Reboot
sudo reboot

# Verify installation
nvidia-smi
```

## Step 2: Install Docker & NVIDIA Container Toolkit

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

## Step 3: Install WorldLand Provider SDK

```bash
# Download Provider SDK
wget https://github.com/worldland/releases/download/v1.0.0/worldland-provider-sdk-linux

# Make executable
chmod +x worldland-provider-sdk-linux

# Run installation
sudo ./worldland-provider-sdk-linux install
```

## Step 4: Configure Provider

Create configuration file:

```bash
sudo nano /etc/worldland/provider.yaml
```

```yaml
provider:
  name: "My GPU Server"
  public_ip: "123.45.67.89"

resources:
  gpu_price_per_hour: 0.5 # WLC per hour
  cpu_cores: 8
  memory_gb: 32
  storage_gb: 200

wallet:
  address: "0x1234...abcd"

network:
  master_endpoint: "https://api.worldland.cloud"
```

## Step 5: Register Provider

```bash
# Start provider agent
sudo systemctl start worldland-provider

# Check status
sudo systemctl status worldland-provider
```

The agent will:

1. Register with the WorldLand network
2. Receive a `kubeadm join` token
3. Join the Kubernetes cluster as a worker node

## Step 6: Join Kubernetes Cluster

```bash
# The agent will automatically execute the join command
# Or manually run:
sudo kubeadm join <master-ip>:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

## Provider Status

### Status Progression

```
Pending → Approved → Joined → Available
```

| Status      | Description                               |
| ----------- | ----------------------------------------- |
| `Pending`   | Registration submitted, awaiting approval |
| `Approved`  | Approved, join token issued               |
| `Joined`    | Successfully joined K8s cluster           |
| `Available` | Ready to accept GPU jobs                  |

### Check Status

```bash
# View provider status
curl https://api.worldland.cloud/api/v1/providers/my-provider-id

# View node status in cluster
kubectl get nodes
```

## Resource Management

### How Resources Are Allocated

When a customer creates a job on your node:

1. **GPU** - Dedicated allocation via NVIDIA device plugin
2. **CPU** - Guaranteed QoS (Request = Limit)
3. **Memory** - Guaranteed QoS (Request = Limit)
4. **Storage** - Ephemeral storage limit

### Capacity Tracking

```
Your Node Capacity:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GPU:     [████████░░░░] 2/4 used
CPU:     [██████░░░░░░] 12/24 cores used
Memory:  [████████░░░░] 48/64 GB used
Storage: [████░░░░░░░░] 80/200 GB used
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Earnings

### How You Earn

- **Per-hour billing** - Customers pay WLC per hour of GPU usage
- **90% to provider** - You receive 90% of the service fee
- **10% to protocol** - Network maintenance fee

### Example Earnings

| GPU      | Price/Hour | Daily (100% util) | Monthly |
| -------- | ---------- | ----------------- | ------- |
| RTX 4090 | 0.50 WLC   | 12 WLC            | 360 WLC |
| RTX 3090 | 0.35 WLC   | 8.4 WLC           | 252 WLC |
| A100     | 1.00 WLC   | 24 WLC            | 720 WLC |

## Monitoring

### Provider Dashboard

Access your provider dashboard at:

```
https://cloud.worldland.io/provider/dashboard
```

Features:

- Real-time GPU utilization
- Active jobs
- Earnings history
- Resource availability

### Command Line

```bash
# View running GPU pods
kubectl get pods -l worldland.io/gpu-rental=true

# View resource usage
kubectl top nodes

# View GPU allocation
kubectl describe node <your-node-name> | grep nvidia.com/gpu
```

## Maintenance

### Graceful Maintenance Mode

Before maintenance:

```bash
# Cordon node (prevent new jobs)
kubectl cordon <your-node-name>

# Wait for existing jobs to complete
kubectl get pods -l worldland.io/gpu-rental=true --field-selector spec.nodeName=<your-node>

# Perform maintenance
# ...

# Uncordon node
kubectl uncordon <your-node-name>
```

### Updating Drivers

```bash
# Cordon node first
kubectl cordon <your-node-name>

# Update NVIDIA driver
sudo apt-get update
sudo apt-get install -y nvidia-driver-545

# Reboot
sudo reboot

# Verify and uncordon
nvidia-smi
kubectl uncordon <your-node-name>
```

## Troubleshooting

### Node Not Joining

```bash
# Check agent logs
sudo journalctl -u worldland-provider -f

# Check kubelet status
sudo systemctl status kubelet

# Check network connectivity
curl -v https://api.worldland.cloud/health
```

### GPU Not Detected in Cluster

```bash
# Check NVIDIA device plugin
kubectl get pods -n kube-system | grep nvidia

# Check node labels
kubectl get node <your-node> -o yaml | grep nvidia
```

### Jobs Not Scheduling

```bash
# Check node taints
kubectl describe node <your-node> | grep Taints

# Check node conditions
kubectl describe node <your-node> | grep Conditions -A 10
```

## Best Practices

::: tip Maximizing Earnings

1. **High availability** - Keep uptime > 99%
2. **Competitive pricing** - Research market rates
3. **Quality hardware** - Better GPUs attract more customers
4. **Fast network** - Low latency improves experience
   :::

::: warning Security

1. Keep system updated
2. Use firewall rules
3. Monitor for unusual activity
4. Regular security audits
   :::

## Next Steps

- [Provider Policy](/cloud/provider/policy) - Terms and requirements
- [Provider Rewards](/tokenomics/provider-rewards) - Detailed reward structure
