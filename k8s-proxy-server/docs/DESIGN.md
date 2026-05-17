# Reliability & Scalability Design — MVP (≈200 users / 20 GPUs / ~200 instances)

> Companion to `SYSTEM_ANALYSIS.md` (which analyzes *what exists*). This
> document is the *engineering argument*: how this platform serves the
> MVP target **stably**, **with minimal downtime**, and **scales out**
> when the target grows 10–100×. It is grounded in the actual code —
> every timing knob cited lives in
> [`internal/provider/tuning.go`](../internal/provider/tuning.go).

---

## 0. The one idea everything follows from

**Separate the plane that must be durable from the plane that must be
crash-tolerant from the plane that holds money.**

```
┌─────────────────────────────────────────────────────────────────────┐
│ CONTROL plane   k8s-proxy-server (Go)         ← may crash/restart     │
│                 in-memory ledger = a CACHE                            │
├─────────────────────────────────────────────────────────────────────┤
│ DURABLE truth   Kubernetes API + PostgreSQL + Redis Streams           │
│                 "what is really running / registered / queued"        │
├─────────────────────────────────────────────────────────────────────┤
│ DATA plane      GPU rental Pods + Mining Pods (on provider nodes)     │
│                 kept alive by K8s itself, not by the control plane    │
├─────────────────────────────────────────────────────────────────────┤
│ VALUE plane     BSC GPUVault contract (deposits, rentals, 95/5 split) │
│                 survives everything; independent of our uptime        │
└─────────────────────────────────────────────────────────────────────┘
```

Consequence: **the control plane can die at any instant without losing a
single running rental, a queued message, a registration, or a cent.**
Recovery is a *reconciliation*, not a restore. This is the property the
rest of the design protects and exploits.

---

## 1. Load model & assumptions

| Quantity | MVP value | Implication |
|---|---|---|
| Registered users | ~200 | Auth/session load is trivial (Redis-backed sessions) |
| GPUs in fleet | ~20 | GPU is **exclusive** (1 GPU : 1 rental container) → ≤20 concurrent GPU rentals; users queue/rotate over time |
| Provider hosts | ~10–25 (1+ GPU each) | Heartbeat every 30 s ⇒ < ~1 msg/s on Redis |
| Managed instances/Pods | ~200 | rentals + mining + churn; a few watch events/min |
| API traffic | interactive dashboard | peak tens of req/s |

**Honest conclusion that drives the whole design:** at this size the
system is **not throughput-bound**. A single 2 vCPU / 2 GiB control-plane
pod is already 1–2 orders of magnitude over-provisioned for the request,
heartbeat, and watch rates. The hard problems at 200/20/200 are
**correctness of the GPU ledger** and **zero-downtime operations**, not
raw scale. So we *right-size* (one well-run instance) and engineer
**availability**, then keep a clean **scale-out path** for 10–100×.
Over-engineering horizontal scale now would be the wrong call — and
saying so is part of the design.

---

## 2. Minimizing downtime

Downtime has three sources: (a) the process dies, (b) we deploy a new
version, (c) a dependency degrades. Each is handled explicitly.

### 2.1 Process death → fast, lossless recovery

On boot, `Orchestrator.Start` reconstructs all state from durable truth
*before* serving (see `orchestrator.go`):

```
loadProvidersFromDB      → registrations from PostgreSQL
RecoverMiningStates      → mining pods from the K8s API
RecoverJobAllocations    → InUse GPU recomputed from REAL running pods
```

`RecoverJobAllocations` is the keystone: it does not trust any persisted
counter — it sums the resources of the GPU-job Pods that K8s says are
actually running and rebuilds the ledger from that. So a crash + restart
**cannot leak or double-book a GPU**; the worst case is a few seconds of
control-plane unavailability while the data plane keeps serving users
uninterrupted.

**Recovery Time Objective:** process restart + reconcile ≈ a few seconds
(bounded by one DB query + two K8s LISTs at MVP cardinality). **Recovery
Point Objective: 0** — durable truth is never behind.

### 2.2 Deploys → no dropped traffic

- `/health` and `/ready` (in `server.go`) back K8s liveness/readiness
  probes, so a rolling update never routes to a cold pod.
- `cmd/server/main.go` traps SIGTERM → cancels the root context →
  `Orchestrator.Stop()` waits on the worker `WaitGroup` so in-flight
  registrations/heartbeats drain before exit.
- The API is effectively stateless (truth is external), so a rolling
  Deployment update is safe; pair with a PodDisruptionBudget.

### 2.3 The eventual-consistency safety net (no distributed lock needed)

Two cooperating mechanisms in `orchestrator_podwatch.go` keep the ledger
honest *despite* watches that drop by design (etcd compaction, timeouts):

```
fast path:   K8s watch  ──DELETED/Failed/Succeeded──▶ free resources now
catch-up:    1-min sweep ──expired/failed pods──────▶ free what watch missed
```

The sweep is the **upper bound on how long a leaked GPU stays
unaccounted** — currently `jobSweepInterval = 1 min`. Watches reconnect
after `podWatchReconnectDelay = 5 s`. Together they give *eventual
consistency that survives gaps and restarts* without the cost/complexity
of a distributed lock.

### 2.4 Failure-detection budget (the tuning.go knobs)

Every detection latency is a single named constant with its rationale,
consolidated so the SLA is *readable in one file*:

| Knob (`tuning.go`) | Value | What it bounds |
|---|---|---|
| `staleProviderCheckInterval` | 30 s | how often liveness is swept |
| `staleProviderThreshold` | 2 min | dead provider → `Offline` (≈4 missed beats; blip-tolerant, still well inside rental SLA) |
| `podWatchReconnectDelay` | 5 s | blind window after a watch drops |
| `podWatchRetryDelay` | 10 s | backoff when a watch fails to start |
| `jobSweepInterval` | 1 min | worst-case GPU-leak reconciliation latency |
| `miningSyncInterval` | 30 s | failed mining pod → GPUs returned to rental pool |
| `streamBlockDuration` | 5 s | shutdown responsiveness vs Redis load |

Tightening any of these trades faster detection for more API/Redis load —
the tuning is explicit, not accidental.

### 2.5 Dependency-degradation matrix

| Failure | Effect on running rentals | Effect on control plane | Mitigation |
|---|---|---|---|
| Control-plane pod dies | **none** (K8s keeps Pods) | new jobs/registrations pause sec | restart → §2.1 reconcile |
| Redis down | none | no new registrations/heartbeats; Streams **buffer** (no loss) | Redis HA / managed; consumer-group resumes on recovery |
| PostgreSQL down | none | runs **DB-less** from in-memory + K8s; loses cross-restart registration durability | optional by design; managed HA Postgres for prod |
| Provider host dies | that node's rentals lost (expected) | `Offline` after `staleProviderThreshold`; GPUs stop being scheduled | heartbeat monitor; users rescheduled |
| K8s watch drops | none | 5 s blind window | auto-reconnect + 1-min sweep (§2.3) |
| BSC RPC down | none (compute unaffected) | settlement deferred | value plane is async; retry/queue settlement |

The recurring theme: **a dependency outage degrades a *feature*, never
the running data plane, and never corrupts the ledger.**

---

## 3. Scaling out (the 10–100× path)

### 3.1 The honest bottleneck

Today the orchestrator is **single-instance by assumption**: the GPU
ledger is an in-memory map guarded by one `sync.RWMutex`, and the Redis
consumer identity is fixed (`redisConsumerName = "orchestrator-1"` in
`tuning.go`). At 200/20/200 this is correct and fastest (a mutex-guarded
map mutation is ~microseconds; there is no contention to speak of). It
becomes the limit only when you need **more than one orchestrator for
availability or load** — i.e. well beyond the MVP.

### 3.2 What scales for free already

- **Data plane:** scaling GPUs/Pods is just adding provider nodes — K8s
  schedules them. The control/data split means *data-plane scale is
  independent of control-plane design*. This is the big win.
- **API reads:** handlers are stateless; `Search` already prefers
  PostgreSQL over the in-memory cache, so read traffic scales by adding
  stateless API replicas behind a load balancer.
- **Messaging:** Redis Streams **consumer groups** are already used —
  multiple workers can share a stream with at-least-once + ack. The
  design is *ready* for multiple consumers; only the consumer *name* is
  pinned.

### 3.3 Concrete scale-out steps (in order of value)

1. **Split read vs write.** Run N stateless API replicas (reads/search
   hit Postgres) + a single **leader-elected** orchestrator for the
   write path (K8s `Lease` / Redlock). Active/standby gives HA without
   sharded accounting. *Smallest change, biggest availability win.*
2. **Templatize the consumer identity.** `redisConsumerName` is
   deliberately isolated in `tuning.go` precisely so this is a one-line
   change (e.g. pod ordinal/hostname). Then registration/heartbeat
   processing scales horizontally on the consumer group.
3. **Move the ledger off-process.** Replace the in-memory map +
   `sync.RWMutex` with authoritative accounting in PostgreSQL using
   `SELECT … FOR UPDATE` (row lock per provider) — or Redis atomic ops.
   The `ProviderRepository` interface (`repository.go`) is the seam that
   makes this swap local. After this, orchestrators are stateless and
   scale linearly; shard by `providerID` if a single writer ever
   saturates.
4. **Per-feature autoscale.** With state externalized, the API
   Deployment gets an HPA on CPU/RPS; the orchestrator stays
   leader-elected (1 active) or sharded.

### 3.4 Capacity sizing for the MVP

| Component | MVP sizing | Headroom |
|---|---|---|
| k8s-proxy-server | 1 replica, 2 vCPU / 2 GiB, probes + PDB | ~100× on request/heartbeat rate |
| Redis | 1 HA pair (managed), Streams | thousands of msg/s vs ~1 msg/s used |
| PostgreSQL | 1 HA pair (managed), small | hundreds of providers in one table |
| K8s control plane | 1 master (HA-ready: stacked etcd / 3 masters when it matters) | the real prod hardening item |

The single self-hosted kubeadm master is the genuine SPOF for the MVP
(documented in `SYSTEM_ANALYSIS.md` §6). Mitigation order for prod: HA
control plane (3 masters/etcd) **>** managed Redis/Postgres **>**
leader-elected orchestrator. None of these require application rewrites —
they are deployment-topology changes, which is the point of keeping the
app stateless against external truth.

---

## 4. Deployment topology

```
                    ┌──────────────┐
   Renters ───────▶ │ LoadBalancer │ ──▶ k8s-proxy-server (Deployment)
                    └──────────────┘        replicas: 1 (MVP) → N + leader
                                              │ probes /health /ready
                                              │ PodDisruptionBudget
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                    Redis (HA)          PostgreSQL (HA)      Kubernetes API
                    Streams+sessions    provider truth       pod truth
                          │
   Provider hosts ── SDK daemon ──XADD heartbeat/registration──┘
   (kubeadm-joined GPU nodes; rental + mining Pods scheduled by K8s)
```

MVP → prod delta is **all topology, no code**: replicas 1→N with a
leader Lease, single→HA master, embedded→managed Redis/Postgres.

---

## 5. Roadmap distilled (reliability/scale-relevant subset)

From `SYSTEM_ANALYSIS.md` §7, the items that move the reliability/scale
needle, in priority order:

- **P0** — gate `DevAuthMiddleware` behind `DEBUG_MODE`; fail boot on
  missing `JWT_SECRET` (a safe-by-default crash beats a silent insecure
  default). *Correctness/safety, not throughput.*
- **P1** — wire `JobHandler` ↔ GPUVault so settlement is automatic
  (`startRental`/`endRental`); price from `Capacity` not a constant.
- **P2** — externalize the ledger (PostgreSQL `FOR UPDATE` / Redlock) →
  unlocks multi-instance + removes the single-orchestrator SPOF (§3.3).
- **P3** — `/metrics` (Prometheus): `gpu_total/inuse/mining/available`,
  `provider_count{status}`, sweep lag — so the §2.4 budget is *observed*,
  not just designed.

---

## 6. The 60-second interview summary

> The platform splits into a **crash-tolerant control plane** and
> **durable truth** (K8s + Postgres + Redis Streams). The in-memory GPU
> ledger is only a cache; on restart `RecoverJobAllocations` rebuilds it
> from the *actually-running* Pods, so a crash costs seconds of
> control-plane downtime with **zero data loss and zero GPU
> double-booking**. Downtime is minimized with health/readiness probes,
> SIGTERM drain, and a **watch + 1-minute sweep** safety net that needs
> no distributed lock. Every failure-detection latency is one named,
> documented constant in `tuning.go`. At 200 users / 20 GPUs / 200
> instances the system is availability-bound, not throughput-bound, so
> we run one right-sized, well-supervised instance — and the scale-out
> path (stateless API replicas + leader-elected/`FOR UPDATE` ledger,
> with the Redis consumer identity already isolated for exactly this) is
> deliberately kept one well-defined refactor away.
