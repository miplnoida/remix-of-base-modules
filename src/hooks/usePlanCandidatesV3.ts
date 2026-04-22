// ============================================
// Phase 2: zone-aware, audit-cycle-aware, explainable candidates
// Wraps planCandidateService.getScoredCandidatesV3.
// Server enforces zone filter — UI cannot bypass.
// ============================================
import { useQuery } from '@tanstack/react-query';
import { planCandidateService } from '@/services/planCandidateService';
import type { PlanCandidateV3 } from '@/types/weeklyPlan';

export interface UsePlanCandidatesV3Options {
  /** Explicit zone filter. Wins over inspectorId. */
  zoneId?: string | null;
  /** If provided (and zoneId is null), the server resolves the inspector's primary zone. */
  inspectorId?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function usePlanCandidatesV3(opts: UsePlanCandidatesV3Options = {}) {
  const { zoneId = null, inspectorId = null, limit = 200, enabled = true } = opts;

  return useQuery<PlanCandidateV3[]>({
    queryKey: ['ce_plan_candidates_v3', zoneId, inspectorId, limit],
    queryFn: () =>
      planCandidateService.getScoredCandidatesV3({ zoneId, inspectorId, limit }),
    enabled,
    staleTime: 60_000,
  });
}
