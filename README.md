# Worldland GPU Rental Platform

A two-sided GPU marketplace orchestrated on Kubernetes, with payment and
settlement delegated to a BSC smart contract (GPUVault). The same GPU node
is **dual-use**: rented to users as an SSH-able container, or — when idle —
running a Worldland L1 mining node. A single control plane shifts GPUs
between the two as rental demand changes.

```
 Renter ── REST (session key) ─▶ k8s-proxy-server (control plane)
                                      │  Redis Streams
 Provider host ── SDK/agent ──────────┘        │
                                               ▼
                          Kubernetes (per-tenant ns + ResourceQuota)
                          ├─ GPU rental Pods  (Guaranteed QoS, SSH)
                          └─ Mining Pods      (elastic filler)
 Payments: BSC GPUVault contract (deposit → startRental → endRental 95/5)
```

## Repository layout

| Path                | What                                                          |
|---------------------|---------------------------------------------------------------|
| `k8s-proxy-server/` | Go backend — API gateway + provider orchestrator (the core)   |
| `contracts/`        | Solidity (GPUVault, MockUSDT) + Hardhat                        |
| `frontend/`         | Next.js dashboard + product docs                              |

## Start here (for review)

1. **`k8s-proxy-server/docs/SYSTEM_ANALYSIS.md`** — deep analysis of the
   whole system: domain, architecture, core flows, trade-offs, tech debt.
2. **`k8s-proxy-server/docs/DESIGN.md`** — the reliability & scalability
   design: how this serves ~200 users / 20 GPUs / ~200 instances with
   minimal downtime, and how it scales out. **This is the interview story.**
3. `k8s-proxy-server/docs/README.md` — index of the operational guides.

The backend's design intent is also embedded in package/file header
comments — start at `k8s-proxy-server/internal/provider/orchestrator.go`.

## Run the backend

```bash
cd k8s-proxy-server
make run        # local, no orchestrator
make run-dev    # .env + Orchestrator + DEBUG (needs Redis; Postgres/K8s optional)
make build      # -> bin/k8s-proxy-server
```

Every external dependency (K8s, Redis, Postgres, BSC) is optional and
gated by config, so the server degrades a feature rather than crashing
when one is absent. Configuration: `k8s-proxy-server/.env.example`.

## Build / CI

CI (`.github/workflows/ci.yml`) runs, per push: `go vet`, builds all
three binaries (`server`, `provider-agent`, `provider-sdk`), `go test`,
a Docker image build, Hardhat contract tests, and the frontend build.
