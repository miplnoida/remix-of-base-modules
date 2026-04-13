// ============================================
// PLAN CANDIDATE SERVICE - DB-BACKED
// Loads actionable work from ce_v_weekly_plan_candidates
// and computes recommendation scores via fn_ce_score_plan_candidate
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { PlanCandidate } from '@/types/weeklyPlan';

// Recursive fetch to bypass PostgREST 1000-row limit
async function fetchAllCandidates(
  assignedTo?: string,
  sourceTypes?: string[]
): Promise<PlanCandidate[]> {
  const PAGE_SIZE = 1000;
  let all: PlanCandidate[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('ce_v_weekly_plan_candidates' as any)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1)
      .order('source_created_at', { ascending: false });

    if (assignedTo) {
      query = query.eq('assigned_to_user_id', assignedTo);
    }
    if (sourceTypes && sourceTypes.length > 0) {
      query = query.in('source_type', sourceTypes);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as PlanCandidate[];
    all = all.concat(rows);
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return all;
}

// Enrichment: compute recommendation_score for each candidate
// using the DB scoring function via RPC
async function scoreCandidate(candidate: PlanCandidate): Promise<number> {
  // Compute days overdue
  let daysOverdue = 0;
  if (candidate.due_date) {
    const due = new Date(candidate.due_date);
    const now = new Date();
    daysOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
  }

  // Notice days remaining
  let noticeDaysRemaining: number | null = null;
  if (candidate.source_type === 'NOTICE' && candidate.due_date) {
    const due = new Date(candidate.due_date);
    const now = new Date();
    noticeDaysRemaining = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000));
  }

  const { data, error } = await supabase.rpc('fn_ce_score_plan_candidate', {
    p_source_type: candidate.source_type,
    p_priority: candidate.priority || 'MEDIUM',
    p_risk_band: null, // Could be enriched from ce_risk_profiles
    p_days_overdue: daysOverdue,
    p_overdue_followup_count: 0,
    p_notice_days_remaining: noticeDaysRemaining,
    p_financial_exposure: candidate.financial_exposure || 0,
    p_prior_violation_count: 0,
    p_days_since_last_visit: null,
    p_is_same_zone: false,
    p_is_manager_flagged: false,
    p_scouting_confidence: candidate.source_type === 'SCOUTING_LEAD' ? candidate.priority : null,
  });

  if (error) {
    console.error('Scoring error:', error);
    return 0;
  }

  return Number(data) || 0;
}

export const planCandidateService = {
  // Get all candidates for an officer, optionally filtered by source type
  async getCandidates(filters?: {
    assignedToUserId?: string;
    sourceTypes?: string[];
    limit?: number;
  }): Promise<PlanCandidate[]> {
    const candidates = await fetchAllCandidates(
      filters?.assignedToUserId,
      filters?.sourceTypes
    );

    return filters?.limit ? candidates.slice(0, filters.limit) : candidates;
  },

  // Get candidates with scores computed (batch — top N)
  async getScoredCandidates(filters?: {
    assignedToUserId?: string;
    sourceTypes?: string[];
    topN?: number;
  }): Promise<PlanCandidate[]> {
    const candidates = await fetchAllCandidates(
      filters?.assignedToUserId,
      filters?.sourceTypes
    );

    // Score top candidates (limit RPC calls for performance)
    const toScore = candidates.slice(0, filters?.topN || 50);
    const scored = await Promise.all(
      toScore.map(async (c) => {
        const score = await scoreCandidate(c);
        return { ...c, recommendation_score: score };
      })
    );

    // Sort by score descending
    scored.sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
    return scored;
  },

  // Get candidate counts by source type (for dashboard KPIs)
  async getCandidateSummary(assignedToUserId?: string): Promise<Record<string, number>> {
    const candidates = await fetchAllCandidates(assignedToUserId);
    const summary: Record<string, number> = {};
    for (const c of candidates) {
      summary[c.source_type] = (summary[c.source_type] || 0) + 1;
    }
    return summary;
  },

  // Score a single candidate (for UI display)
  scoreCandidate,
};
