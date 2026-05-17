# Network Participants

WorldLand is a decentralized network with multiple participant roles working together to provide GPU compute resources.

## Participant Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   WorldLand Network Participants                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  CUSTOMER   │    │   MINER     │    │  PROVIDER   │        │
│   │  (Renter)   │    │             │    │             │        │
│   │             │    │             │    │             │        │
│   │ Uses GPU    │    │ Secures     │    │ Provides    │        │
│   │ Pays WLC    │    │ Chain       │    │ GPU         │        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│          │                  │                  │                │
│          │                  │                  │                │
│          │           ┌──────▼──────┐           │                │
│          │           │  WORLDLAND  │           │                │
│          └──────────▶│   MAINNET   │◀──────────┘                │
│                      │             │                            │
│                      │ Consensus   │                            │
│                      │ Settlement  │                            │
│                      │ Governance  │                            │
│                      └──────┬──────┘                            │
│                             │                                   │
│                      ┌──────▼──────┐                            │
│                      │   PROXY     │                            │
│                      │   SERVER    │                            │
│                      │             │                            │
│                      │ Orchestrate │                            │
│                      │ Match Jobs  │                            │
│                      └─────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Role Definitions

### 1. Customer (GPU Renter)

Customers are users who rent GPU resources for compute workloads.

| Aspect           | Description                               |
| ---------------- | ----------------------------------------- |
| **Role**         | Consume GPU compute resources             |
| **Actions**      | Create jobs, run workloads, pay for usage |
| **Requirements** | Wallet with WLC tokens                    |
| **Earns**        | N/A (consumes resources)                  |
| **Pays**         | WLC per hour of GPU usage                 |

**Typical Use Cases:**

- AI/ML model training
- Inference workloads
- Rendering and simulation
- Research and development

**Interaction Flow:**

```
1. Connect wallet
2. Browse available providers
3. Create GPU job
4. SSH into container
5. Run workloads
6. Pay upon completion
```

### 2. Provider (GPU Contributor)

Providers contribute GPU hardware to the network.

| Aspect           | Description                                |
| ---------------- | ------------------------------------------ |
| **Role**         | Supply GPU compute resources               |
| **Actions**      | Register node, maintain uptime, serve jobs |
| **Requirements** | GPU hardware, stable internet, public IP   |
| **Earns**        | 90% of rental fees in WLC                  |
| **Pays**         | Electricity, maintenance costs             |

**Provider Types:**

- Individual GPU owners (e.g., gaming setups)
- Data centers
- Mining operations (repurposed)
- Cloud infrastructure operators

**Responsibilities:**

- Maintain hardware
- Keep node online (high uptime)
- Send regular heartbeats
- Meet SLA requirements

### 3. Miner

Miners secure the WorldLand blockchain through Proof-of-Work.

| Aspect           | Description                          |
| ---------------- | ------------------------------------ |
| **Role**         | Secure the blockchain consensus      |
| **Actions**      | Solve ECCVCC puzzles, produce blocks |
| **Requirements** | Computational resources              |
| **Earns**        | Block rewards (80% of 20 WLC/block)  |
| **Pays**         | Electricity, hardware costs          |

**Key Points:**

- Uses ECCVCC (Error Correction Code Verifiable Computation Consensus)
- Block time: 10 seconds
- Block reward: 20 WLC (16 to miner, 4 to treasury)

**Dual Role:**
Providers can also be miners! When GPU is not rented, it can mine:

```
GPU Status:
├── Rented → Serving customer jobs
└── Idle → Can be allocated for mining
```

### 4. Broker (Orchestrator)

The central coordination layer operated by WorldLand.

| Aspect           | Description                                   |
| ---------------- | --------------------------------------------- |
| **Role**         | Orchestrate network operations                |
| **Actions**      | Match jobs, manage providers, track resources |
| **Requirements** | Infrastructure, Kubernetes cluster            |
| **Earns**        | 10% protocol fee                              |
| **Pays**         | Infrastructure costs                          |

**Functions:**

- Provider registration and lifecycle
- Job scheduling and allocation
- Resource tracking
- Health monitoring
- Payment settlement coordination

## Value Flow

### Token Flow

```
                        WLC Flow
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
     ▼                     ▼                     ▼
┌─────────┐          ┌─────────┐          ┌─────────┐
│Customer │          │Protocol │          │Provider │
│         │          │Treasury │          │         │
│ -Pays   │─────────▶│ +10%    │          │ +90%    │
│  for    │          │         │          │  of     │
│  GPU    │          └────┬────┘          │  fees   │
└─────────┘               │               └─────────┘
                          │
                          ▼
                    ┌───────────┐
                    │ Ecosystem │
                    │  Grants   │
                    │  Audits   │
                    │  Bounties │
                    └───────────┘

Mining Rewards:
┌─────────┐              ┌─────────┐
│  Miner  │◀─── 80% ────│  Block  │
│  +16WLC │              │ Reward  │
└─────────┘              │  20WLC  │
                         └────┬────┘
┌─────────┐                   │
│Treasury │◀─── 20% ──────────┘
│  +4WLC  │
└─────────┘
```

### Resource Flow

```
Provider                Broker              Customer
   │                         │                        │
   │  GPU Resources          │                        │
   │ ───────────────────────▶│                        │
   │                         │   Job Container        │
   │                         │ ──────────────────────▶│
   │                         │                        │
   │                         │   Compute Workload     │
   │◀────────────────────────────────────────────────│
   │                         │                        │
   │  WLC Payment            │   WLC Payment          │
   │◀────────────────────────│◀───────────────────── │
```

## Incentive Alignment

### For Customers

- Access to affordable GPU compute
- Pay only for what you use
- No long-term commitments

### For Providers

- Monetize idle GPU capacity
- Earn WLC tokens
- Flexible availability

### For Miners

- Secure the network
- Earn block rewards
- Support decentralization

### For the Network

- Protocol fees fund development
- Treasury funds ecosystem growth
- Sustainable long-term operation

## Participation Requirements

### Minimum Requirements

| Role         | Hardware        | Software            | Financial       |
| ------------ | --------------- | ------------------- | --------------- |
| **Customer** | Any device      | Wallet              | WLC for payment |
| **Provider** | GPU (GTX 1080+) | Ubuntu, Docker, K8s | None (earns)    |
| **Miner**    | CPU/GPU         | Mining software     | None (earns)    |

### Getting Started

| Role     | Guide                                                |
| -------- | ---------------------------------------------------- |
| Customer | [How to Use GPU](/cloud/customer/how-to-use)         |
| Provider | [How to Provide GPU](/cloud/provider/how-to-provide) |
| Miner    | Mining guide (coming soon)                           |

## Network Statistics

::: info Live Stats (Coming Soon)
After mainnet launch, real-time network statistics will be available:

- Total providers online
- Total GPU capacity
- Jobs completed
- WLC distributed
  :::

## Next Steps

- [The Provider](/network/provider) - Detailed provider guide
- [The Broker](/network/broker) - Technical architecture
- [Token Utility](/tokenomics/utility) - How WLC is used
