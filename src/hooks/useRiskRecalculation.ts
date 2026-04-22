// ============================================
// Two-Score Risk Recalculation Hooks
// - Inherent score: ce_run_employer_risk_refresh / ce_recompute_employer_risk
// - Audit priority score: fn_ce_run_audit_priority_refresh / fn_ce_recalc_audit_priority_for_employer
// All recalcs honor the currently active risk policy.
// ============================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type RecalcScope =
  | { kind: 'all' }
  | { kind: 'changed_only' }
  | { kind: 'zone'; zoneId: string }
  | { kind: 'employer'; employerId: string };

export type RecalcScoreType = 'INHERENT' | 'AUDIT_PRIORITY' | 'BOTH';

interface RecalcInput {
  scope: RecalcScope;
  scoreType: RecalcScoreType;
  dryRun?: boolean;
}

async function runInherent(scope: RecalcScope, dryRun: boolean) {
  if (scope.kind === 'employer') {
    const { data, error } = await supabase.rpc('ce_recompute_employer_risk' as any, {
      p_employer_id: scope.employerId,
      p_triggered_by: 'UI_MANUAL',
    });
    if (error) throw error;
    return { processed: 1, affected: 1, payload: data };
  }
  const { data, error } = await supabase.rpc('ce_run_employer_risk_refresh' as any, {
    p_dry_run: dryRun,
    p_batch_size: 500,
  });
  if (error) throw error;
  return data as { processed?: number; affected?: number };
}

async function runAuditPriority(scope: RecalcScope, dryRun: boolean) {
  if (scope.kind === 'employer') {
    const { data, error } = await supabase.rpc(
      'fn_ce_recalc_audit_priority_for_employer' as any,
      { p_employer_id: scope.employerId, p_policy_id: null },
    );
    if (error) throw error;
    return { processed: 1, affected: 1, payload: data };
  }
  const { data, error } = await supabase.rpc('fn_ce_run_audit_priority_refresh' as any, {
    p_dry_run: dryRun,
    p_zone_id: scope.kind === 'zone' ? scope.zoneId : null,
    p_changed_only: scope.kind === 'changed_only',
    p_batch_size: 1000,
  });
  if (error) throw error;
  return data as { processed?: number; affected?: number; policy_id?: string };
}

export function useRunRiskRecalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scope, scoreType, dryRun = false }: RecalcInput) => {
      const out: any = { scoreType, scope, dryRun };
      if (scoreType === 'INHERENT' || scoreType === 'BOTH') {
        out.inherent = await runInherent(scope, dryRun);
      }
      if (scoreType === 'AUDIT_PRIORITY' || scoreType === 'BOTH') {
        out.audit_priority = await runAuditPriority(scope, dryRun);
      }
      return out;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['employer-risk-profile'] });
      qc.invalidateQueries({ queryKey: ['risk-ops-summary'] });
      qc.invalidateQueries({ queryKey: ['ce_plan_candidates_v3'] });
      const parts: string[] = [];
      if (data.inherent) parts.push(`Inherent: ${data.inherent.affected ?? data.inherent.processed ?? 0}`);
      if (data.audit_priority) parts.push(`Audit Priority: ${data.audit_priority.affected ?? data.audit_priority.processed ?? 0}`);
      toast.success(data.dryRun ? 'Dry run complete' : 'Recalculation complete', {
        description: parts.join(' · ') || 'Done',
      });
    },
    onError: (err: any) => {
      toast.error('Recalculation failed', { description: err.message });
    },
  });
}

/** Aggregate operational metrics for the admin Risk Operations screen. */
export function useRiskOpsSummary() {
  return useQuery({
    queryKey: ['risk-ops-summary'],
    queryFn: async () => {
      const [{ data: profileAgg }, { data: activePolicy }] = await Promise.all([
        supabase
          .from('ce_risk_profiles')
          .select('last_inherent_calculated_at, last_audit_priority_calculated_at, audit_priority_score, total_score'),
        supabase
          .from('ce_risk_policies')
          .select('id, policy_name, version, is_active, updated_at')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const rows = (profileAgg as any[]) || [];
      const lastInherent = rows
        .map((r) => r.last_inherent_calculated_at)
        .filter(Boolean)
        .sort()
        .pop() as string | undefined;
      const lastAuditPriority = rows
        .map((r) => r.last_audit_priority_calculated_at)
        .filter(Boolean)
        .sort()
        .pop() as string | undefined;

      return {
        totalProfiles: rows.length,
        withInherentScore: rows.filter((r) => Number(r.total_score ?? 0) > 0).length,
        withAuditPriority: rows.filter((r) => Number(r.audit_priority_score ?? 0) > 0).length,
        lastInherent,
        lastAuditPriority,
        activePolicy: activePolicy as
          | { id: string; policy_name: string; version: string | null; is_active: boolean; updated_at: string }
          | null,
      };
    },
    refetchInterval: 30_000,
  });
}
