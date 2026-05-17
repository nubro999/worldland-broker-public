# The Broker

The Broker is the central orchestration layer of WorldLand, connecting customers with GPU providers.

## What is the Broker?

The **Broker** (implemented as **k8s-proxy-server**) is the API gateway and orchestrator that:

- Manages provider registration and lifecycle
- Handles customer GPU job requests
- Orchestrates Kubernetes cluster operations
- Tracks resource allocation across all providers
- Monitors system health via heartbeats

```
┌─────────────────────────────────────────────────────────────────┐
│                      Broker Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐   │
│   │                  K8S-PROXY-SERVER (Go/Gin)             │   │
│   ├────────────────────────────────────────────────────────┤   │
│   │                                                        │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│   │   │ Job Handler  │  │  Provider    │  │  Wallet    │  │   │
│   │   │              │  │  Handler     │  │  Auth      │  │   │
│   │   │ • Create     │  │              │  │            │  │   │
│   │   │ • Get        │  │ • List       │  │ • EIP-712  │  │   │
│   │   │ • Delete     │  │ • Search     │  │ • Session  │  │   │
│   │   │ • List       │  │ • Details    │  │   Key      │  │   │
│   │   └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │   │
│   │          │                 │                │         │   │
│   │   ┌──────▼─────────────────▼────────────────▼──────┐  │   │
│   │   │              ORCHESTRATOR                       │  │   │
│   │   │                                                 │  │   │
│   │   │  • Provider Registration    • Resource Tracking │  │   │
│   │   │  • Heartbeat Monitor        • Mining Manager    │  │   │
│   │   │  • Node Management          • Pod Watcher       │  │   │
│   │   │  • Job Allocation           • Job Expiration    │  │   │
│   │   └─────────────────────────────────────────────────┘  │   │
│   │                        │                               │   │
│   └────────────────────────┼───────────────────────────────┘   │
│                            │                                    │
│       ┌────────────────────┼────────────────────┐              │
│       │                    │                    │              │
│       ▼                    ▼                    ▼              │
│   ┌────────┐         ┌──────────┐         ┌──────────┐        │
│   │  K8s   │         │  Redis   │         │PostgreSQL│        │
│   │  API   │         │ (Pub/Sub)│         │   (DB)   │        │
│   └────────┘         └──────────┘         └──────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Orchestrator

The heart of the Broker, managing all provider and resource operations.

```go
type Orchestrator struct {
    nodeManager   *NodeManager      // K8s node operations
    miningManager *MiningPodManager // Mining pod management
    redisClient   *redis.Client     // Message queue
    producer      *messaging.Producer
    consumer      *messaging.Consumer
    repo          ProviderRepository // Database

    // In-memory provider cache
    providers     map[string]*ProviderState
    providersMu   sync.RWMutex
}
```

#### Workers

The Orchestrator runs 5 concurrent workers:

| Worker                   | Function                               |
| ------------------------ | -------------------------------------- |
| **registrationWorker**   | Process provider registration messages |
| **heartbeatMonitor**     | Track provider health via heartbeats   |
| **miningMonitor**        | Monitor mining pod status              |
| **podWatcher**           | Real-time K8s pod event watching       |
| **jobExpirationMonitor** | Auto-delete expired jobs               |

### 2. Job Manager

Handles GPU container lifecycle:

```go
type JobManager struct {
    clientset             kubernetes.Interface
    tenantManager         *TenantManager
    enableTenantIsolation bool
}
```

#### Operations

- **CreateGPUJob** - Creates Pod + NodePort Service
- **GetJobStatus** - Returns job details including SSH info
- **DeleteJob** - Cleans up Pod and Service
- **ListUserJobs** - Lists all jobs for a user

### 3. Node Manager

Kubernetes node operations:

- Label nodes (provider ID, GPU model, rental status)
- Apply/remove taints
- Track allocatable GPU count
- Mark nodes as available/unavailable

### 4. Provider Handler

REST API for provider information:

| Endpoint                             | Method | Description                |
| ------------------------------------ | ------ | -------------------------- |
| `/api/v1/providers`                  | GET    | List all providers         |
| `/api/v1/providers/search`           | GET    | Search with filters        |
| `/api/v1/providers/gpu-availability` | GET    | Real-time GPU availability |
| `/api/v1/providers/:id`              | GET    | Get provider details       |

## Message Flow

### Provider Registration

```
Provider SDK                    Broker                          K8s
     │                              │                            │
     │  1. Publish Registration     │                            │
     │ ────────────────────────────▶│                            │
     │       (Redis Stream)         │                            │
     │                              │  2. Generate Join Token    │
     │                              │ ──────────────────────────▶│
     │                              │                            │
     │  3. Join Command Response    │◀──────────────────────────│
     │◀────────────────────────────│                            │
     │                              │                            │
     │  4. kubeadm join             │                            │
     │ ─────────────────────────────────────────────────────────▶│
     │                              │                            │
     │                              │  5. OnNodeJoined           │
     │                              │◀───────────────────────────│
     │                              │                            │
     │  6. Heartbeat (periodic)     │                            │
     │ ────────────────────────────▶│                            │
```

### Job Creation

```
Customer                    Broker                           K8s
    │                            │                             │
    │  1. POST /api/v1/jobs      │                             │
    │ ──────────────────────────▶│                             │
    │                            │  2. Validate Provider       │
    │                            │  3. AllocateResources       │
    │                            │                             │
    │                            │  4. Create Pod              │
    │                            │ ───────────────────────────▶│
    │                            │                             │
    │                            │  5. Create Service          │
    │                            │ ───────────────────────────▶│
    │                            │                             │
    │  6. Return SSH Info        │◀───────────────────────────│
    │◀──────────────────────────│                             │
    │                            │                             │
    │  7. ssh root@IP -p PORT    │                             │
    │ ──────────────────────────────────────────────────────▶ │
```

## Resource Tracking

### GPU Allocation Flow

```go
// When customer creates a job
func (o *Orchestrator) AllocateResources(providerID string, allocation *ResourceAllocation) error {
    // 1. Check GPU availability
    available := provider.Capacity.AvailableGPUs[gpuType]
    if available < allocation.GPUCount {
        return fmt.Errorf("insufficient GPU")
    }

    // 2. Deduct from available
    provider.Capacity.AvailableGPUs[gpuType] -= allocation.GPUCount

    // 3. Add to in-use
    provider.Capacity.InUseGPUs[gpuType] += allocation.GPUCount

    // Same for CPU and Memory...
    return nil
}

// When job ends
func (o *Orchestrator) ReleaseResources(providerID string, allocation *ResourceAllocation) error {
    // Return resources to available pool
    provider.Capacity.AvailableGPUs[gpuType] += allocation.GPUCount
    provider.Capacity.InUseGPUs[gpuType] -= allocation.GPUCount
    return nil
}
```

### Real-time Monitoring

The podWatcher continuously monitors K8s events:

```go
func (o *Orchestrator) podWatcher(ctx context.Context) {
    // Watch for Pod events (Added, Modified, Deleted)
    watcher, _ := clientset.CoreV1().Pods("").Watch(ctx, ...)

    for event := range watcher.ResultChan() {
        switch event.Type {
        case watch.Deleted:
            // Auto-release resources when pod is deleted
            o.handlePodDeletion(pod)
        case watch.Modified:
            // Update status when pod changes
            o.handlePodModification(pod)
        }
    }
}
```

## Database Storage

Provider data is persisted in PostgreSQL:

```sql
CREATE TABLE providers (
    provider_id     VARCHAR(255) PRIMARY KEY,
    wallet_addr     VARCHAR(255),
    node_name       VARCHAR(255),
    status          VARCHAR(50),
    spec            JSONB,
    capacity        JSONB,
    last_heartbeat  TIMESTAMP,
    registered_at   TIMESTAMP,
    joined_at       TIMESTAMP
);
```

## Redis Streams

Used for real-time messaging:

| Stream                   | Purpose                |
| ------------------------ | ---------------------- |
| `provider:registration`  | Registration requests  |
| `provider:heartbeat`     | Heartbeat messages     |
| `provider:response:<id>` | Registration responses |

## Configuration

Key environment variables:

| Variable              | Description                       |
| --------------------- | --------------------------------- |
| `PROXY_PORT`          | API server port (default: 8080)   |
| `REDIS_HOST`          | Redis server address              |
| `POSTGRES_*`          | PostgreSQL connection             |
| `ENABLE_ORCHESTRATOR` | Enable provider management        |
| `MASTER_PUBLIC_IP`    | K8s master public IP              |
| `ENABLE_BLOCKCHAIN`   | Enable smart contract integration |

## High Availability

### Graceful Startup

On server start:

1. Load providers from database
2. Recover mining states
3. Recover job allocations from K8s state
4. Start all workers

### Graceful Shutdown

On server stop:

1. Stop accepting new requests
2. Wait for in-flight requests
3. Save state to database
4. Close all connections

## Next Steps

- [The Provider](/network/provider) - GPU resource providers
- [Network Participants](/network/participants) - All network roles
