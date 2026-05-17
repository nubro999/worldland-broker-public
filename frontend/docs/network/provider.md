# The Provider

Providers are the backbone of the WorldLand network, contributing GPU compute resources and earning WLC tokens in return.

## What is a Provider?

A **Provider** is any entity that contributes GPU resources to the WorldLand network. Providers can be:

- Individual GPU owners
- Data centers
- Mining operations converting to compute
- Tech companies with idle GPU capacity
- Gaming studios with spare infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Provider in WorldLand                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Provider                        WorldLand Network             │
│   ────────                        ─────────────────             │
│                                                                 │
│   ┌─────────────┐                 ┌─────────────────┐          │
│   │  GPU Node   │  ◀──────────▶   │  Broker   │          │
│   │ (Worker)    │   Register +    │  (Orchestrator) │          │
│   │             │   Heartbeat     │                 │          │
│   │ • RTX 4090  │                 └────────┬────────┘          │
│   │ • A100      │                          │                    │
│   │ • etc.      │                          ▼                    │
│   └─────────────┘                 ┌─────────────────┐          │
│         │                         │   Kubernetes    │          │
│         │ Join Cluster            │   Master Node   │          │
│         └────────────────────────▶│                 │          │
│                                   └─────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Provider State

Providers go through a lifecycle of states:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│ Pending  │ ──▶ │ Approved │ ──▶ │  Joined  │ ──▶ │ Available │
└──────────┘     └──────────┘     └──────────┘     └───────────┘
                                        │
                                        │ Heartbeat Timeout
                                        ▼
                                  ┌──────────┐
                                  │ Offline  │
                                  └──────────┘
```

| Status        | Description                                     |
| ------------- | ----------------------------------------------- |
| **Pending**   | Registration request submitted                  |
| **Approved**  | Join token issued, awaiting cluster join        |
| **Joined**    | Successfully joined Kubernetes cluster          |
| **Available** | Ready to accept GPU jobs                        |
| **Offline**   | Heartbeat stale (> 2 minutes without heartbeat) |

## Provider Registration Flow

### 1. SDK Installation

Provider runs the WorldLand Provider SDK:

```bash
./worldland-provider-sdk install
```

### 2. Registration Message

SDK publishes a registration request to Redis:

```json
{
  "provider_id": "provider-uuid",
  "wallet_addr": "0x1234...abcd",
  "spec": {
    "hostname": "gpu-server-01",
    "public_ip": "123.45.67.89",
    "total_gpus": 4,
    "gpus": [{ "name": "NVIDIA GeForce RTX 4090", "memory": 24576 }],
    "cpu_cores": 32,
    "total_memory_mb": 131072,
    "available_disk_gb": 500
  },
  "capacity": {
    "gpu_price_per_hour": 0.5
  }
}
```

### 3. Orchestrator Processing

The Broker's Orchestrator:

1. Validates the registration request
2. Generates a `kubeadm join` token
3. Stores provider state in memory and database
4. Sends join command to provider

### 4. Cluster Join

Provider executes the join command:

```bash
kubeadm join <master-ip>:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

### 5. Node Labels

Once joined, the node is labeled for GPU workloads:

```yaml
labels:
  worldland.io/rental-type: gpu
  worldland.io/provider-id: provider-uuid
  worldland.io/gpu-model: RTX-4090
```

## Provider Capacity

Each provider tracks resource capacity:

```go
type ProviderCapacity struct {
    // GPU tracking
    AvailableGPUs    map[string]int  // Available by model
    InUseGPUs        map[string]int  // In use by rental jobs
    MiningGPUs       map[string]int  // Allocated to mining

    // CPU/Memory tracking
    TotalCPUCores      int
    AvailableCPUCores  int
    InUseCPUCores      int

    TotalMemoryMB      int64
    AvailableMemoryMB  int64
    InUseMemoryMB      int64

    // Pricing
    GPUPricePerHour    float64
}
```

### Resource Allocation

When a customer creates a job:

1. **AllocateResources()** - Deducts GPU, CPU, Memory from available pool
2. **Job runs** - Container uses allocated resources
3. **ReleaseResources()** - Returns resources when job ends

```
Before Job:
  Available GPU: 4
  Available CPU: 32 cores
  Available Memory: 128 GB

Customer requests: 1 GPU, 8 CPU, 32GB RAM

After Allocation:
  Available GPU: 3 (-1)
  Available CPU: 24 cores (-8)
  Available Memory: 96 GB (-32)

  In-Use GPU: 1
  In-Use CPU: 8 cores
  In-Use Memory: 32 GB
```

## Heartbeat System

Providers must send regular heartbeats:

```go
type HeartbeatMessage struct {
    ProviderID  string
    NodeName    string
    Status      RegistrationStatus
    ActiveJobs  int
    Timestamp   time.Time
}
```

### Monitoring

- **Heartbeat interval**: Every 30 seconds
- **Stale threshold**: 2 minutes without heartbeat → Offline
- **Node labels updated**: Active jobs, last heartbeat time

## Mining Support

Providers can allocate GPUs for mining when not rented:

```
Total GPUs: 4
├── Available (for rental): 2
├── In-Use (rental jobs): 1
└── Mining: 1
```

### Mining vs Rental Priority

- Rental jobs have **higher priority**
- Mining GPUs can be released for rental demand
- Mining resumes when GPUs become available

## Provider Specification

Information collected from each provider:

| Field              | Description                | Example          |
| ------------------ | -------------------------- | ---------------- |
| **Hostname**       | System hostname            | `gpu-server-01`  |
| **Public IP**      | External IP for SSH access | `123.45.67.89`   |
| **Total GPUs**     | Number of GPUs             | `4`              |
| **GPU Info**       | Model, memory per GPU      | `RTX 4090, 24GB` |
| **CPU Cores**      | Total CPU cores            | `32`             |
| **Total Memory**   | System RAM                 | `128 GB`         |
| **Available Disk** | Free storage               | `500 GB`         |

## Next Steps

- [The Broker](/network/broker) - Central orchestration
- [Network Participants](/network/participants) - Roles in the network
- [How to Provide](/cloud/provider/how-to-provide) - Setup guide
