# How to Use WorldLand Cloud

This guide explains how to rent GPU resources on WorldLand Cloud as a customer.

## Prerequisites

- Wallet (MetaMask or compatible Web3 wallet)
- WLC tokens for payment

## Step 1: Connect Wallet

1. Visit the WorldLand Cloud dashboard
2. Click **Connect Wallet**
3. Sign the authentication message
4. Your session will be created

::: info Wallet Authentication
WorldLand uses EIP-712 signature-based authentication. No password required - your wallet is your identity.
:::

## Step 2: Browse Available GPUs

Navigate to **Providers** to see available GPU resources:

```
Available Providers:
┌────────────────────────────────────────────────────────────────┐
│ Provider ID    │ GPU Model      │ Available │ Price/Hour      │
├────────────────┼────────────────┼───────────┼─────────────────┤
│ provider-001   │ RTX 4090       │ 2/4       │ 0.50 WLC        │
│ provider-002   │ RTX 3090       │ 1/2       │ 0.35 WLC        │
│ provider-003   │ Tesla T4       │ 4/4       │ 0.25 WLC        │
└────────────────────────────────────────────────────────────────┘
```

## Step 3: Create a GPU Job

### Option A: Dashboard UI

1. Click **Create New Job**
2. Select provider or GPU type
3. Configure resources:
   - GPU count
   - CPU cores
   - Memory
   - Storage
   - Duration
4. Set SSH password
5. Click **Create**

### Option B: API

```bash
curl -X POST https://api.worldland.cloud/api/v1/jobs \
  -H "Authorization: Bearer <your-session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "provider-001",
    "gpu_count": 1,
    "cpu_cores": "4",
    "memory_gb": "16",
    "storage_gb": "50",
    "ssh_password": "your-secure-password",
    "duration_hours": 24
  }'
```

### Response

```json
{
  "job_id": "gpu-0x1234-1706234567",
  "status": "creating",
  "gpu_count": 1,
  "gpu_model": "RTX 4090",
  "cpu_cores": "4",
  "memory_gb": "16Gi",
  "storage_gb": "50Gi",
  "ssh_host": "123.45.67.89",
  "ssh_port": 30001,
  "ssh_user": "root",
  "ssh_password": "your-secure-password",
  "price_per_hour": 0.5,
  "expires_at": "2024-01-26T12:00:00Z",
  "message": "GPU container is being created. Check status in a few seconds."
}
```

## Step 4: Connect via SSH

Once the job status is `Running`:

```bash
ssh root@123.45.67.89 -p 30001
# Enter your SSH password when prompted
```

## Step 5: Use Your GPU Container

Your container comes with:

- NVIDIA CUDA drivers pre-installed
- Root access
- Full GPU access

### Verify GPU Access

```bash
# Check NVIDIA driver
nvidia-smi

# Example output:
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.104.05   Driver Version: 535.104.05   CUDA Version: 12.0     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce RTX 4090  | 00000000:01:00.0 Off |                  Off |
|  0%   35C    P8    20W / 450W |      0MiB / 24576MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

### Install Your Tools

```bash
# For PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# For TensorFlow
pip install tensorflow[and-cuda]

# For Hugging Face Transformers
pip install transformers accelerate
```

## Step 6: Monitor Job Status

### Check Status

```bash
curl https://api.worldland.cloud/api/v1/jobs/gpu-0x1234-1706234567 \
  -H "Authorization: Bearer <your-session-token>"
```

### Job States

| Status      | Description                 |
| ----------- | --------------------------- |
| `creating`  | Container being provisioned |
| `Pending`   | Waiting for resources       |
| `Running`   | Ready for SSH access        |
| `Failed`    | Error occurred              |
| `Succeeded` | Job completed               |

## Step 7: Terminate Job

When done, delete the job to stop billing:

```bash
curl -X DELETE https://api.worldland.cloud/api/v1/jobs/gpu-0x1234-1706234567 \
  -H "Authorization: Bearer <your-session-token>"
```

## Resource Configuration Guide

### Recommended Configurations

| Use Case            | GPU | CPU | Memory | Storage |
| ------------------- | --- | --- | ------ | ------- |
| **Light Inference** | 1   | 2   | 8Gi    | 20Gi    |
| **Model Training**  | 1   | 4   | 16Gi   | 50Gi    |
| **Large Model**     | 1   | 8   | 32Gi   | 100Gi   |
| **Multi-GPU**       | 2+  | 16  | 64Gi   | 200Gi   |

### Memory Recommendations by Model Size

| Model Size | Minimum GPU Memory | Recommended System Memory |
| ---------- | ------------------ | ------------------------- |
| 7B params  | 16GB               | 16Gi                      |
| 13B params | 24GB               | 32Gi                      |
| 30B params | 48GB (multi-GPU)   | 64Gi                      |
| 70B params | 80GB+ (multi-GPU)  | 128Gi                     |

## Troubleshooting

### OOMKilled Error

If your container is terminated due to memory:

```json
{
  "status": "Failed",
  "failure_reason": "OOMKilled",
  "failure_message": "Container was killed due to memory limit exceeded",
  "suggestion": {
    "action": "increase_memory",
    "recommended_memory": "32Gi",
    "message": "메모리가 부족하여 컨테이너가 종료되었습니다. 32Gi 이상의 메모리로 새 Job을 생성해주세요."
  }
}
```

**Solution**: Create a new job with more memory.

### SSH Connection Refused

- Wait for job status to be `Running`
- Verify the correct IP and port
- Check if firewall is blocking the NodePort

### GPU Not Detected

```bash
# Check if NVIDIA driver is loaded
lsmod | grep nvidia

# Check CUDA installation
nvcc --version
```

## Best Practices

::: tip Cost Optimization

1. **Right-size resources** - Only request what you need
2. **Set appropriate duration** - Don't over-provision time
3. **Delete jobs promptly** - Stop billing when done
4. **Use spot-like pricing** - Check for lower-cost providers
   :::

::: warning Data Persistence
Container storage is **ephemeral**. Always backup important data before terminating a job. Use external storage for persistent data.
:::

## Next Steps

- [Portal Guide](/cloud/customer/portal-guide) - Dashboard walkthrough
- [API Reference](/api/overview) - Full API documentation
