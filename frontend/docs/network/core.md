# WorldLand Core

WorldLand Core is the foundational technology layer that powers the decentralized GPU compute network, combining blockchain consensus with verifiable computation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   WorldLand Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              WorldLand Cloud (Off-chain)                │  │
│   │                                                         │  │
│   │    Customer                            Provider         │  │
│   │       │                                   │             │  │
│   │       │ Create Job              Register  │             │  │
│   │       ▼                                   ▼             │  │
│   │    ┌───────────────────────────────────────┐            │  │
│   │    │           Broker                │            │  │
│   │    │    (Orchestration & Matching)         │            │  │
│   │    └───────────────────────────────────────┘            │  │
│   │                      │                                  │  │
│   │                      │ GPU Job Execution                │  │
│   │                      ▼                                  │  │
│   │    ┌───────────────────────────────────────┐            │  │
│   │    │         GPU Container (K8s)           │            │  │
│   │    │      AI Training / Inference          │            │  │
│   │    └───────────────────────────────────────┘            │  │
│   │                      │                                  │  │
│   └──────────────────────┼──────────────────────────────────┘  │
│                          │                                      │
│                Evidence Commitment                              │
│                          │                                      │
│   ┌──────────────────────▼──────────────────────────────────┐  │
│   │              WorldLand Core (On-chain)                  │  │
│   │                                                         │  │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│   │   │   ECCVCC    │  │ Verification│  │     VCC     │    │  │
│   │   │  Consensus  │  │   Layer     │  │   Credits   │    │  │
│   │   └─────────────┘  └─────────────┘  └─────────────┘    │  │
│   │                                                         │  │
│   │            ┌───────────────────────────┐               │  │
│   │            │    WorldLand Mainnet      │               │  │
│   │            │  (Settlement & Governance) │               │  │
│   │            └───────────────────────────┘               │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Technologies

### 1. ECCVCC Consensus

**ECCVCC (Error Correction Code Verifiable Computation Consensus)** is WorldLand's Proof-of-Work consensus mechanism.

#### Key Components

| Component  | Function                                                 |
| ---------- | -------------------------------------------------------- |
| **ECCPoW** | ECC-hard work function for ASIC resistance               |
| **ECCVCC** | Verifiable computation consensus with tunable parameters |
| **VCT**    | Verifiable Coin Toss for public unpredictability         |

#### How It Works

```
Block Production (Every 10 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Puzzle Generation
   ┌────────────────────────────────────────────┐
   │ Chain State + VCT → ECC Puzzle Instance   │
   └────────────────────────────────────────────┘

2. Mining (PoW)
   ┌────────────────────────────────────────────┐
   │ Miners solve ECC-hard puzzle              │
   │ Block reward: 20 WLC per block            │
   └────────────────────────────────────────────┘

3. Verification
   ┌────────────────────────────────────────────┐
   │ Other nodes verify solution efficiently   │
   │ Much cheaper than finding solution        │
   └────────────────────────────────────────────┘
```

#### Verifiable Coin Toss (VCT)

VCT generates public, bias-resistant randomness for:

- Puzzle-instance seeds (preventing precomputation)
- Audit target selection
- Committee selection

::: info Anti-Precomputation
Puzzle instances are bound to recent block data, making work non-reusable across blocks.
:::

### 2. Verification Layer

The Verification Layer connects off-chain GPU execution to on-chain enforcement.

#### Commit-Challenge-Response Protocol

```
Executor                   Chain                    Auditor
    │                        │                         │
    │  1. Execute GPU Job    │                         │
    │  ──────────────────▶   │                         │
    │                        │                         │
    │  2. Commit Evidence    │                         │
    │  ─────────────────────▶│                         │
    │     (Trace Root)       │                         │
    │                        │                         │
    │                        │  3. Challenge           │
    │                        │◀────────────────────────│
    │                        │  (Random Segments)      │
    │                        │                         │
    │  4. Respond            │                         │
    │◀─────────────────────  │                         │
    │     (Open Segments)    │                         │
    │                        │                         │
    │  5. Submit Response    │                         │
    │  ─────────────────────▶│                         │
    │                        │                         │
    │                        │  6. Verify              │
    │                        │──────────────────────── │
    │                        │                         │
    │  7. Verdict: PASS/FAIL/TIMEOUT                   │
    │                        │                         │
```

#### Evidence Structure

| Component       | Description                                              |
| --------------- | -------------------------------------------------------- |
| **Commitments** | Compact digests binding executor to execution transcript |
| **Openings**    | Fragments revealed in response to challenges             |
| **Trace Root**  | Cryptographic summary of execution segments              |

#### Trace Commitments

Execution is organized into segments for efficient verification:

```
Execution Trace:
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Segment │ │Segment │ │Segment │ │Segment │ │Segment │
│   1    │ │   2    │ │   3    │ │   4    │ │   5    │
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Digest 1│ │Digest 2│ │Digest 3│ │Digest 4│ │Digest 5│
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
    │          │          │          │          │
    └──────────┴──────────┴────┬─────┴──────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │ Trace Root  │  ← Posted on-chain
                        └─────────────┘
```

### 3. VCC (Verified Compute Credits)

VCC is the accounting system for verified GPU contributions.

```
┌─────────────────────────────────────────────────────────────────┐
│                    VCC (Verified Compute Credits)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Provider executes GPU job                                     │
│          │                                                      │
│          ▼                                                      │
│   Evidence committed on-chain                                   │
│          │                                                      │
│          ▼                                                      │
│   Challenge issued (random sampling)                            │
│          │                                                      │
│          ▼                                                      │
│   Verification verdict: PASS ✓                                  │
│          │                                                      │
│          ▼                                                      │
│   VCC credited to provider                                      │
│          │                                                      │
│          ▼                                                      │
│   VCC influences future rewards/reputation                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## On-Chain Settlement

### Minimal On-Chain Objects

| Object                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| **Job**                 | Unit of settlement (workload, parties, terms) |
| **Evidence Commitment** | Trace root + receipt digest                   |
| **Challenge**           | Audit request specifying what to open         |
| **Response**            | Executor's openings for challenged segments   |
| **Verdict**             | PASS, FAIL, or TIMEOUT                        |
| **Settlement Receipt**  | Final artifact closing a job                  |
| **VCC Record**          | Durable accounting for verified contribution  |

### Reference Lifecycle

```
1. Create     → Job terms specified
2. Commit     → Evidence posted
3. Challenge  → Audit request issued
4. Respond    → Openings submitted
5. Resolve    → Verdict determined
6. Settle     → Payment/penalty applied
7. VCC Update → Credit attribution
```

## How Core Connects to Cloud

### GPU Job Flow (End-to-End)

```
┌──────────────────────────────────────────────────────────────────┐
│                    Complete Job Lifecycle                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Cloud Layer (Off-chain)                                      │
│  ─────────────────────────────                                   │
│  Customer → Broker → Provider → GPU Container              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ AI Training / Inference / Rendering workloads               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  2. Evidence Layer                                               │
│  ─────────────────                                               │
│  GPU execution generates trace → Segments → Trace Root          │
│                              │                                   │
│  3. Core Layer (On-chain)                                        │
│  ────────────────────────                                        │
│  Evidence Commitment posted to WorldLand Mainnet                │
│                              │                                   │
│  4. Verification Layer                                           │
│  ─────────────────────                                           │
│  Random challenge → Response → Verify → Verdict                  │
│                              │                                   │
│  5. Settlement Layer                                             │
│  ───────────────────                                             │
│  PASS → Payment released to Provider (WLC)                       │
│  FAIL → Penalty applied, dispute resolution                      │
│                              │                                   │
│  6. VCC Update                                                   │
│  ────────────                                                    │
│  Verified contribution credited → Affects future rewards         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Security Model

```
Why Cheating Doesn't Pay:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If Provider skips GPU computation:
  │
  ├── Commitment won't match actual execution
  │
  ├── Random challenge may expose inconsistency
  │
  ├── Verdict: FAIL
  │
  ├── Penalty applied (slashing)
  │
  └── Reputation damaged (lower VCC)

Economics make honest execution the rational choice.
```

### Protocol Parameters

| Parameter                | Purpose                           |
| ------------------------ | --------------------------------- |
| **Audit Rate**           | How often jobs are challenged     |
| **Sampling Granularity** | Entire jobs vs. specific segments |
| **Challenge Window**     | Period for issuing challenges     |
| **Response Deadline**    | Time to submit openings           |
| **Finality Delay**       | Wait time before settlement       |

::: tip Tunable Security
By adjusting these parameters, WorldLand can balance verification cost against deterrence strength.
:::

## Design Goals

| Goal                       | How Achieved                                      |
| -------------------------- | ------------------------------------------------- |
| **Efficient Verification** | ECCVCC asymmetry (hard to solve, easy to verify)  |
| **Instance Freshness**     | VCT + chain-derived entropy                       |
| **Operational Stability**  | Difficulty adjustment control loop                |
| **Reduced Specialization** | ECC-hard function resists ASIC advantage          |
| **Scalable Security**      | Randomized sampling vs. full re-execution         |
| **Enforceable Settlement** | On-chain verdicts with deterministic consequences |

## Summary

WorldLand Core provides the **trust layer** that makes decentralized GPU compute viable:

1. **ECCVCC** secures the blockchain with efficient, verifiable PoW
2. **Verification Layer** ensures providers actually perform computation
3. **VCC** credits verified contributions for fair reward distribution
4. **Settlement** enforces payment and penalties on-chain

Together, these components enable the WorldLand Cloud to offer reliable GPU services without centralized trust.

## Next Steps

- [The Provider](/network/provider) - How providers participate
- [The Broker](/network/broker) - Orchestration layer
- [Token Utility](/tokenomics/utility) - How WLC flows through the system
