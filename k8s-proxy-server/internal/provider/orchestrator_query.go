// orchestrator_query.go — read-only provider lookups.
//
// Snapshot/list/search accessors used by the HTTP handlers. Search
// prefers the DB (durable, multi-instance safe) and falls back to the
// in-memory cache when no repository is configured. All reads take the
// RWMutex read lock so they never block each other.
package provider

import (
	"context"
	"encoding/json"
	"strings"
)

// GetProviderState returns the current state of a provider.
func (o *Orchestrator) GetProviderState(providerID string) (*ProviderState, bool) {
	o.providersMu.RLock()
	defer o.providersMu.RUnlock()
	provider, exists := o.providers[providerID]
	return provider, exists
}

// ListProviders returns all registered providers.
func (o *Orchestrator) ListProviders() []*ProviderState {
	o.providersMu.RLock()
	defer o.providersMu.RUnlock()

	providers := make([]*ProviderState, 0, len(o.providers))
	for _, p := range o.providers {
		providers = append(providers, p)
	}
	return providers
}

// GetAllProvidersJSON returns all providers as JSON (for API responses).
func (o *Orchestrator) GetAllProvidersJSON() ([]byte, error) {
	providers := o.ListProviders()
	return json.Marshal(providers)
}

// Search searches providers by filter criteria.
// Uses DB if available, otherwise falls back to in-memory search.
func (o *Orchestrator) Search(ctx context.Context, filter *SearchFilter) ([]*ProviderState, error) {
	// DB가 있으면 DB에서 검색
	if o.repo != nil {
		return o.repo.Search(ctx, filter)
	}

	// DB 없으면 인메모리에서 검색
	o.providersMu.RLock()
	defer o.providersMu.RUnlock()

	var results []*ProviderState
	for _, p := range o.providers {
		// 상태 필터
		if filter.Status != "" && string(p.Status) != filter.Status {
			continue
		}
		// GPU 모델 필터 (부분 매칭)
		if filter.GPUModel != "" && len(p.Spec.GPUs) > 0 {
			if !strings.Contains(strings.ToLower(p.Spec.GPUs[0].Name), strings.ToLower(filter.GPUModel)) {
				continue
			}
		}
		// 최소 메모리 필터
		if filter.MinMemoryMB > 0 && p.Spec.TotalMemoryMB < filter.MinMemoryMB {
			continue
		}
		// 최소 CPU 코어 필터
		if filter.MinCPUCores > 0 && p.Spec.CPUCores < filter.MinCPUCores {
			continue
		}
		// 최소 디스크 필터
		if filter.MinDiskGB > 0 && p.Spec.AvailableDiskGB < filter.MinDiskGB {
			continue
		}
		// 최대 가격 필터
		if filter.MaxPricePerHour > 0 && p.Capacity.GPUPricePerHour > filter.MaxPricePerHour {
			continue
		}

		results = append(results, p)
	}

	return results, nil
}
