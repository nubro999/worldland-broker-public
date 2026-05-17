# Backend documentation index

Two documents carry the architecture/design story; the rest are
operational runbooks. Redundant docs were consolidated here — the old
`ARCHITECTURE_OVERVIEW.md`, `API_GATEWAY_ARCHITECTURE.md`, root
`architecture.md`, `BLOCKCHAIN_INTEGRATION.md`, and `TODO_BLOCKCHAIN.md`
were removed because `SYSTEM_ANALYSIS.md` (architecture §2, flows §3,
blockchain §5.5) and its tech-debt inventory (§8) supersede them.

## Read first

| Doc | Purpose |
|-----|---------|
| **[SYSTEM_ANALYSIS.md](SYSTEM_ANALYSIS.md)** | Single source of truth: business domain → architecture → core flows → trade-off matrix → tech-debt inventory. Analysis snapshot. |
| **[DESIGN.md](DESIGN.md)** | Forward-looking reliability & scalability design for the MVP target (~200 users, 20 GPUs, ~200 instances): SPOF removal, downtime budget, horizontal scale path. |

## Operational guides

| Doc | Purpose |
|-----|---------|
| [USER_GUIDE.md](USER_GUIDE.md) | Renter workflow: get a GPU container, connect over SSH. |
| [PROVIDER_SDK_GUIDE.md](PROVIDER_SDK_GUIDE.md) | Provider onboarding via the SDK (validate → install → join → daemon). |
| [MINING_INTEGRATION.md](MINING_INTEGRATION.md) | Worldland mining workload: deployment and GPU rebalancing. |
| [GCP_DEPLOYMENT_GUIDE.md](GCP_DEPLOYMENT_GUIDE.md) | Bootstrapping a self-hosted kubeadm cluster on GCP. |
| [DEPLOYMENT_TEST_GUIDE.md](DEPLOYMENT_TEST_GUIDE.md) | Production deploy checklist (RBAC, ConfigMap/Secret, device plugin, deploy order). |

Design intent also lives in the code: every Go file in
`k8s-proxy-server/internal/` opens with a purpose/logic header, and the
control-plane timing knobs are consolidated in
`internal/provider/tuning.go` with their reliability rationale.
