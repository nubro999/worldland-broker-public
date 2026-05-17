# Token Utility & Purpose

WLC is the native asset of the WorldLand mainnet and serves multiple critical functions within the ecosystem.

## Four Pillars of Utility

```
┌─────────────────────────────────────────────────────────────────┐
│                     WLC Token Utility                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ⛏️ Mining Rewards      💨 Gas Fees                            │
│   Security incentive     Transaction costs                      │
│                                                                 │
│   ☁️ Service Fees         🏛️ Governance                         │
│   Compute payments       Protocol decisions                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 1. PoW Mining Rewards

WLC is issued as rewards for Proof-of-Work mining, securing the WorldLand network.

| Parameter            | Value            |
| -------------------- | ---------------- |
| **Block Reward**     | 20 WLC per block |
| **Block Time**       | 10 seconds       |
| **Daily Issuance**   | ~172,800 WLC     |
| **Monthly Issuance** | ~5,184,000 WLC   |

```
Block Reward Distribution:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Miner:    80% (16 WLC)
Treasury: 20% (4 WLC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

::: tip Treasury Funding
A fixed 20% of each block reward flows to the Ecosystem Treasury, creating direct funding from chain security to long-term ecosystem development.
:::

## 2. Transaction Fees (Gas)

WLC is used to pay gas fees for all on-chain transactions.

### Fee-Required Actions

- Job commitments
- Challenge submissions
- Settlement receipts
- Governance actions
- State modifications

### Benefits of Gas

- **Spam Resistance** - Prevents network abuse
- **Resource Pricing** - Fair allocation of block space
- **Network Sustainability** - Ongoing operational funding

## 3. Protocol Service Fees

WLC is the settlement currency for all protocol services.

### Supported Services

| Service                | Description                            |
| ---------------------- | -------------------------------------- |
| **GPU Compute**        | Rent GPU resources for AI/ML workloads |
| **Storage**            | Decentralized storage services         |
| **Verification Layer** | Proof verification services            |
| **AI Inference**       | Run inference on distributed GPUs      |
| **AI Training**        | Train models on the network            |

### Payment Flow

```
Customer                    Protocol                    Provider
    │                          │                           │
    │   1. Pay WLC for job     │                           │
    │ ────────────────────────▶│                           │
    │                          │   2. Allocate resources   │
    │                          │──────────────────────────▶│
    │   3. Use compute         │                           │
    │ ─────────────────────────────────────────────────────▶
    │                          │   4. Settle payment       │
    │                          │──────────────────────────▶│
    │                          │                           │
```

## 4. Governance

WLC holders participate in protocol governance.

### Governance Scope

| Area                        | Examples                                           |
| --------------------------- | -------------------------------------------------- |
| **Consensus Parameters**    | ECCVCC difficulty adjustment, block stability      |
| **Verification Parameters** | Audit rates, challenge windows, response deadlines |
| **Fee Policy**              | Gas pricing, service fee structures                |
| **Treasury Policy**         | Budget allocation, grants, security spending       |

### Upgrade Policy

All protocol upgrades follow an on-chain governance process:

```
Proposal → Review → Vote → Timelocked Activation
```

- **Parameter changes** treated separately from code upgrades
- **Emergency actions** narrowly scoped with post-incident ratification
- **Stakeholder time** to evaluate and react to changes

## Utility Summary

| Utility            | Who Benefits          | Frequency         |
| ------------------ | --------------------- | ----------------- |
| **Mining Rewards** | Miners                | Every block (10s) |
| **Gas Fees**       | All users             | Every transaction |
| **Service Fees**   | Customers & Providers | Per service usage |
| **Governance**     | All holders           | Per proposal      |

## Economic Model

```
                         WLC Economy
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ Miners  │         │ Users   │         │Providers│
    │         │         │         │         │         │
    │ Secure  │         │ Pay     │         │ Earn    │
    │ Network │         │ for     │         │ from    │
    │    │    │         │ Service │         │ Service │
    │    ▼    │         │    │    │         │    ▲    │
    │ Earn    │         │    ▼    │         │    │    │
    │ Rewards │         │ Use     │─────────│ Provide │
    └─────────┘         │ Compute │         │ Compute │
                        └─────────┘         └─────────┘
```

## Next Steps

- [Provider Rewards](/tokenomics/provider-rewards) - Detailed reward structure
- [Reward Emissions](/tokenomics/emissions) - Emission schedule
