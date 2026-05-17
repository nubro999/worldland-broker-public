# Provider Rewards

GPU providers earn WLC tokens by contributing compute resources to the WorldLand network.

## Reward Sources

Providers can earn through multiple channels:

| Source            | Description          | Payment    |
| ----------------- | -------------------- | ---------- |
| **Compute Usage** | Active job execution | Per usage  |
| **Availability**  | Standby readiness    | Per period |
| **Mining**        | PoW block production | Per block  |

## Compute Resource Rewards

### How It Works

```
1. Provider registers GPU resources
2. System assigns jobs based on requirements
3. Provider executes compute workload
4. Customer pays in WLC
5. Provider receives payment after settlement
```

### Reward Factors

| Factor              | Impact                                  |
| ------------------- | --------------------------------------- |
| **GPU Performance** | Higher specs = more jobs                |
| **Uptime**          | Better availability = priority matching |
| **Latency**         | Lower latency = preferred for real-time |
| **Reputation**      | Track record affects selection          |

## Revenue Split

```
Customer Payment (100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provider:  90% │██████████████████░░│
Protocol:  10% │██░░░░░░░░░░░░░░░░░░│
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

::: tip High Provider Share
WorldLand allocates **90%** of service fees to providers, ensuring fair compensation compared to centralized alternatives.
:::

## Compute Resources Allocation

From the total token supply:

| Metric                  | Value                    |
| ----------------------- | ------------------------ |
| **Total Allocation**    | 50.46% (504,600,000 WLC) |
| **Monthly Emission**    | ~5,184,000 WLC           |
| **Distribution Method** | Mining + Participation   |

## Earning Calculator

### Example Scenarios

| GPU      | Hours/Day | Estimated Monthly Earnings |
| -------- | --------- | -------------------------- |
| RTX 4090 | 24h       | TBD after mainnet          |
| RTX 3090 | 12h       | TBD after mainnet          |
| A100     | 24h       | TBD after mainnet          |

::: warning Testnet Phase
Exact reward rates will be finalized after testnet validation. Current figures are estimates based on whitepaper specifications.
:::

## Quality Requirements

To earn rewards, providers must meet quality standards:

### Performance Validation

- Regular performance checks
- GPU capability verification
- Network bandwidth testing

### Service Quality

- Container status monitoring
- Response time tracking
- User experience feedback

## Getting Started as Provider

1. **Hardware** - NVIDIA GPU with CUDA support
2. **Network** - Stable connection with sufficient bandwidth
3. **Software** - WorldLand provider client
4. **Registration** - On-chain provider registration

::: info Provider Guide
For detailed setup instructions, see the [Provider Guide](/cloud/provider/how-to-provide).
:::

## Next Steps

- [Reward Emissions](/tokenomics/emissions) - Full emission schedule
- [How to Provide](/cloud/provider/how-to-provide) - Setup guide
