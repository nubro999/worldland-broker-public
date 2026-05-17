// tuning.go — every control-plane timing/identity knob in one place.
//
// These constants were previously magic numbers scattered across the
// orchestrator. They are consolidated here because they ARE the
// reliability contract: each one is a knob that trades latency of
// detection against load on Redis/K8s, and directly shapes the
// downtime/SLA story (see docs/DESIGN.md §"Failure detection budget").
//
// Changing a value here changes behavior everywhere consistently —
// that is the point. Do not re-inline these.
package provider

import "time"

const (
	// Redis Streams consumer-group identity. The consumer NAME is
	// deliberately fixed ("-1"): with one orchestrator it is correct,
	// and it is the single line to templatize (e.g. hostname/ordinal)
	// when scaling to multiple orchestrator replicas. See DESIGN.md
	// §"Horizontal scale".
	redisConsumerGroup = "orchestrator-group"
	redisConsumerName  = "orchestrator-1"

	// streamBlockDuration is how long an XREAD blocks waiting for new
	// messages. Short enough that stopCh/ctx cancellation stays snappy
	// on shutdown; long enough to avoid busy-looping Redis.
	streamBlockDuration = 5 * time.Second

	// streamReadBackoff throttles the read loop after a Redis error so
	// a flapping Redis does not spin the CPU or hammer the server.
	streamReadBackoff = 1 * time.Second
)

const (
	// staleProviderCheckInterval is the heartbeat-sweep cadence.
	staleProviderCheckInterval = 30 * time.Second

	// staleProviderThreshold: a Joined provider with no heartbeat for
	// this long is marked Offline. Agents beat every 30s, so this is
	// ~4 missed beats — tolerant of a transient network blip but fast
	// enough that scheduling stops sending jobs to a dead node well
	// within the rental SLA.
	staleProviderThreshold = 2 * time.Minute

	// miningDeployTimeout bounds the async mining-pod deploy kicked off
	// during registration so a stuck deploy can never wedge a goroutine.
	miningDeployTimeout = 2 * time.Minute

	// miningSyncInterval reconciles mining-pod status with K8s; a
	// failed/stopped mining pod returns its GPUs to the rental pool
	// within this bound.
	miningSyncInterval = 30 * time.Second
)

const (
	// podWatchRetryDelay backs off when the K8s watch fails to START.
	podWatchRetryDelay = 10 * time.Second

	// podWatchReconnectDelay backs off when an established watch CLOSES
	// (watches drop by design — timeouts, etcd compaction).
	podWatchReconnectDelay = 5 * time.Second

	// jobSweepInterval is the catch-up sweeper period. It is the upper
	// bound on how long a leaked GPU (event missed during a watch gap)
	// stays unaccounted — the worst-case reconciliation latency.
	jobSweepInterval = 1 * time.Minute
)

// ProviderResponseStream is the per-provider Redis response stream the
// orchestrator publishes join results to and the provider agent/SDK
// reads. Exported and called from BOTH sides (producer:
// orchestrator_registration.go; consumers: internal/sdk/bootstrap.go,
// cmd/provider-agent) so the stream name can never drift.
func ProviderResponseStream(providerID string) string {
	return "provider:response:" + providerID
}
