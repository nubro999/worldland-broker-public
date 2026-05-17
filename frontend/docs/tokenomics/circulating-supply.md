# Circulating Supply

Track the circulating supply of WLC tokens over time.

## Current Status

::: warning Pre-Launch
WorldLand mainnet is currently in development. These projections are based on the whitepaper specifications.
:::

| Metric                  | Value                                   |
| ----------------------- | --------------------------------------- |
| **Total Supply**        | 1,000,000,000 WLC                       |
| **Initial Circulating** | 0 WLC (at genesis)                      |
| **TGE Unlock**          | 145,400,000 WLC (Community & Liquidity) |

## Circulating Supply Projection

### At TGE (Token Generation Event)

| Category              | Amount              | % of Total |
| --------------------- | ------------------- | ---------- |
| Community & Liquidity | 145,400,000 WLC     | 14.54%     |
| **Total Circulating** | **145,400,000 WLC** | **14.54%** |

### Year 1 Projection

| Source           | Amount      | Cumulative    |
| ---------------- | ----------- | ------------- |
| TGE Unlock       | 145,400,000 | 145,400,000   |
| Mining Rewards   | 50,457,600  | 195,857,600   |
| **Year 1 Total** | -           | **~196M WLC** |

::: info Note
Core Builders, Investors, and Ecosystem Treasury have 12-18 month cliffs, so no additional unlocks from these categories in Year 1.
:::

### Year 2 Projection

Additional unlocks begin after cliff periods end:

| Source                          | Amount        |
| ------------------------------- | ------------- |
| Year 1 Carry-over               | ~196M         |
| Mining Rewards                  | ~50M          |
| Core Builders (starts Month 21) | ~15M          |
| Investors (starts Month 14)     | ~30M          |
| Ecosystem (starts Month 21)     | ~10M          |
| **Year 2 Total**                | **~300M WLC** |

## Supply Curve Visualization

```
Supply (% of Total)
100% │                                          ────────
     │                                    ─────
 80% │                              ─────
     │                        ─────
 60% │                  ─────
     │            ─────
 40% │      ─────
     │  ───
 20% │──
     │
  0% └─────────────────────────────────────────────────────
         TGE    Y1     Y2     Y3     Y4     Y5     Y6+
```

## Unlock Schedule Summary

```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TGE ──────────────────────────────────────────────────────▶
  │
  ├─ Community/Liquidity: 100% unlocked
  │
  ├─ Mining: Continuous emission starts
  │
  │           Month 12
  │           ───┬───
  │              │
  │              ├─ Investors cliff ends, unlocks begin
  │
  │                    Month 18
  │                    ───┬───
  │                       │
  │                       ├─ Core Builders cliff ends
  │                       │
  │                       └─ Ecosystem Treasury cliff ends
  │
  │                             Month 21+
  │                             ───┬───
  │                                │
  │                                └─ All categories unlocking
```

## Inflation Rate

| Year | New Supply               | Inflation Rate      |
| ---- | ------------------------ | ------------------- |
| 1    | ~50M (mining only)       | ~34% of circulating |
| 2    | ~100M (mining + unlocks) | ~33%                |
| 3    | ~80M                     | ~20%                |
| 5+   | Decreasing               | <10%                |

::: tip Decreasing Inflation
As more tokens enter circulation, the inflation rate naturally decreases over time, approaching single digits after Year 5.
:::

## Real-Time Tracking

After mainnet launch, circulating supply will be trackable via:

- WorldLand Explorer (Block Explorer)
- API endpoints
- Third-party tracking services (CoinGecko, CoinMarketCap)

## Next Steps

- [Token Distribution](/tokenomics/distribution) - Full allocation details
- [Token Vesting](/tokenomics/vesting) - Unlock schedules
