# What is WorldLand Cloud

WorldLand Cloud is a **decentralized GPU cloud service** that connects GPU providers with customers who need compute resources for AI/ML workloads.

## Service Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    WorldLand Cloud Service                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Customer                                Provider              │
│   ────────                                ────────              │
│   • Browse available GPUs                 • Register GPU nodes  │
│   • Create GPU containers                 • Earn WLC tokens     │
│   • SSH access to containers              • Set pricing         │
│   • Pay-as-you-go billing                 • Monitor usage       │
│                                                                 │
│                       ┌─────────────┐                          │
│                       │  WorldLand  │                          │
│                       │   Platform  │                          │
│                       └─────────────┘                          │
│                             │                                   │
│        ┌────────────────────┼────────────────────┐             │
│        ▼                    ▼                    ▼             │
│   ┌─────────┐         ┌─────────┐         ┌─────────┐         │
│   │ API     │         │  K8s    │         │ Smart   │         │
│   │ Server  │         │ Cluster │         │Contract │         │
│   └─────────┘         └─────────┘         └─────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. GPU Container Rental

Customers can rent GPU-enabled containers with:

| Resource     | Options                                                |
| ------------ | ------------------------------------------------------ |
| **GPU**      | NVIDIA GPUs (RTX 4090, RTX 3090, Tesla T4, A100, etc.) |
| **CPU**      | 2-64 cores                                             |
| **Memory**   | 8GB - 256GB                                            |
| **Storage**  | 20GB - 500GB                                           |
| **Duration** | 1 hour - 30 days                                       |

### 2. Instant SSH Access

Every container comes with:

- Root SSH access
- Pre-installed CUDA drivers
- Configurable password
- Public IP + NodePort

```bash
# Connect to your GPU container
ssh root@<provider-ip> -p <nodeport>

# Example
ssh root@123.45.67.89 -p 30001
```

### 3. Pre-configured Images

| Image                                  | Use Case                   |
| -------------------------------------- | -------------------------- |
| `nvidia/cuda:12.0.0-devel-ubuntu22.04` | General CUDA development   |
| `pytorch/pytorch:latest`               | PyTorch training/inference |
| `tensorflow/tensorflow:latest-gpu`     | TensorFlow workloads       |

### 4. Provider Selection

Choose providers based on:

- GPU model and count
- Geographic location
- Price per hour
- Availability

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│          Dashboard / Job Management / Provider Console           │
└──────────────────────────────┬───────────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼───────────────────────────────────┐
│                    K8S-PROXY-SERVER (Go/Gin)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │ Job Handler │  │ Provider    │  │ Wallet Auth Handler     │   │
│  │ (GPU Jobs)  │  │ Handler     │  │ (EIP-712 Signature)     │   │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘   │
│         │                │                      │                │
│  ┌──────▼──────┐  ┌──────▼──────────────────────▼──────┐         │
│  │ Job Manager │  │          Orchestrator              │         │
│  │             │  │  - Provider Registration           │         │
│  │             │  │  - Node Management                 │         │
│  │             │  │  - Resource Allocation             │         │
│  └──────┬──────┘  └──────────────────────────────────┘          │
└─────────┼────────────────────────────────────────────────────────┘
          │
    ┌─────▼─────────────────────────────────────────────┐
    │           Kubernetes Cluster                      │
    │  ┌─────────────────────────────────────────────┐  │
    │  │ Worker Nodes (GPU Providers)                │  │
    │  │ ┌─────────────┐  ┌─────────────┐            │  │
    │  │ │ GPU Pod     │  │ GPU Pod     │            │  │
    │  │ │ (SSH + GPU) │  │ (SSH + GPU) │            │  │
    │  │ └─────────────┘  └─────────────┘            │  │
    │  └─────────────────────────────────────────────┘  │
    └───────────────────────────────────────────────────┘
```

## Key Components

| Component          | Technology | Function                                      |
| ------------------ | ---------- | --------------------------------------------- |
| **Frontend**       | Next.js    | User dashboard and management                 |
| **API Server**     | Go/Gin     | REST API for job and provider management      |
| **Job Manager**    | Go         | GPU container lifecycle management            |
| **Orchestrator**   | Go         | Provider registration and resource allocation |
| **Kubernetes**     | K8s        | Container orchestration                       |
| **Smart Contract** | Solidity   | Payment (GPUVault)                            |

## API Endpoints

### Job Management

| Method   | Endpoint           | Description          |
| -------- | ------------------ | -------------------- |
| `POST`   | `/api/v1/jobs`     | Create GPU container |
| `GET`    | `/api/v1/jobs`     | List my jobs         |
| `GET`    | `/api/v1/jobs/:id` | Get job status       |
| `DELETE` | `/api/v1/jobs/:id` | Delete job           |

### Provider Management

| Method | Endpoint                             | Description                |
| ------ | ------------------------------------ | -------------------------- |
| `GET`  | `/api/v1/providers`                  | List providers             |
| `GET`  | `/api/v1/providers/search`           | Search providers           |
| `GET`  | `/api/v1/providers/gpu-availability` | Real-time GPU availability |
| `GET`  | `/api/v1/providers/:id`              | Get provider details       |

## Getting Started

::: tip Quick Links

- **Customers**: [How to Use WorldLand Cloud](/cloud/customer/how-to-use)
- **Providers**: [How to Provide GPU Resources](/cloud/provider/how-to-provide)
  :::
