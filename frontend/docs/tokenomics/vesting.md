# Token Vesting

WorldLand implements staged vesting schedules to ensure long-term alignment between all stakeholders.

## Vesting Overview

| Category                  | TGE Unlock | Cliff     | Vesting Schedule               |
| ------------------------- | ---------- | --------- | ------------------------------ |
| **Compute Resources**     | Ongoing    | None      | Continuous emission via mining |
| **Community & Liquidity** | 100%       | None      | Fully unlocked at TGE          |
| **Core Builders**         | 0%         | 18 months | 10% every 3 months             |
| **Investors**             | 0%         | 12 months | 10%→5% every 2 months          |
| **Ecosystem Treasury**    | 0%         | 18 months | 10% every 3 months             |

## Detailed Vesting Schedules

### Compute Resources (50.46%)

```
Mining Emission Schedule:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Continuous emission through PoW mining                │
│ ~5,184,000 WLC minted every 30 days                   │
│ Until 504.6M allocation is exhausted                  │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- No cliff or vesting
- Distributed based on mining participation
- Aligns issuance with sustained network security

### Community & Liquidity (14.54%)

::: info Immediate Availability
**100% unlocked at TGE** to ensure early liquidity and market accessibility.
:::

### Core Builders (15%)

```
Month:    0    6    12   18   21   24   27   30   33   36   39   42
          │    │    │    │    │    │    │    │    │    │    │    │
Unlock:   0%   0%   0%   0%  10%  20%  30%  40%  50%  60%  70%  80%
          └────────────────┘
               18-month cliff
```

| Period               | Unlock             | Cumulative |
| -------------------- | ------------------ | ---------- |
| TGE                  | 0%                 | 0%         |
| Month 18 (Cliff End) | 0%                 | 0%         |
| Month 21             | 10%                | 10%        |
| Month 24             | 10%                | 20%        |
| Month 27             | 10%                | 30%        |
| ...                  | 10% every 3 months | ...        |

### Investors (10%)

```
Month:    0    6    12   14   16   18   20   22   24   26   28
          │    │    │    │    │    │    │    │    │    │    │
Unlock:   0%   0%   0%  10%  20%  30%  35%  40%  45%  50%  55%
          └────────────┘
           12-month cliff
```

| Period               | Unlock Rate       | Notes        |
| -------------------- | ----------------- | ------------ |
| TGE                  | 0%                | -            |
| Month 12 (Cliff End) | 0%                | -            |
| Month 14             | 10%               | First unlock |
| Month 16             | 10%               | -            |
| Month 18             | 10%               | -            |
| Month 20+            | 5% every 2 months | Slower rate  |

### Ecosystem Treasury (10%)

Same schedule as Core Builders:

- **18-month cliff**
- **10% unlock every 3 months**

::: tip Additional Funding
Beyond the 10% allocation, the treasury also receives **20% of ongoing block rewards**, creating a recurring funding stream for:

- Ecosystem programs
- Security audits
- Protocol maintenance
- Bug bounties
  :::

## Vesting Rationale

| Stakeholder       | Cliff Purpose               | Vesting Purpose               |
| ----------------- | --------------------------- | ----------------------------- |
| **Core Builders** | Ensure long-term commitment | Align with project milestones |
| **Investors**     | Prevent immediate dumping   | Gradual market impact         |
| **Treasury**      | Build reserve first         | Sustainable funding           |

## TGE Definition

::: info What is TGE?
**TGE (Token Generation Event)** refers to the token generation event / initial exchange listing point used for unlock schedules.
:::

## Next Steps

- [Token Utility](/tokenomics/utility) - How WLC is used
- [Provider Rewards](/tokenomics/provider-rewards) - Earning through contribution
