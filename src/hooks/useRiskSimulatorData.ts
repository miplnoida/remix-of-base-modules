/**
 * Hook to load all data needed by the Risk Simulator.
 * Loads employer risk profiles, factor configs, policy factors, bands, and live counts.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FactorConfig, BandConfig } from '@/lib/compliance/riskScoringEngine';

// ============= Employer Risk Profiles =============
export function useRiskProfiles() {
  return useQuery({
    queryKey: ['ce_risk_profiles_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_profiles' as any)
        .select('id, employer_id, employer_name, total_score, risk_band, arrears_score, violation_score, filing_score, payment_behavior_score, legal_history_score, last_calculated_at, override_band, override_reason, territory')
        .order('employer_name');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

// ============= Active Policy + Factors + Configs =============
export function useActiveRiskPolicy() {
  return useQuery({
    queryKey: ['ce_risk_active_policy_full'],
    queryFn: async () => {
      // 1. Get active policy
      const { data: policies, error: pErr } = await supabase
        .from('ce_risk_policies' as any)
        .select('id, policy_code, policy_name, status')
        .eq('status', 'ACTIVE')
        .limit(1);
      if (pErr) throw pErr;
      const policy = policies?.[0] || null;
      if (!policy) return { policy: null, factorConfigs: [], factorWeights: {}, bands: [] };

      // 2. Get policy factors
      const { data: policyFactors, error: pfErr } = await supabase
        .from('ce_risk_policy_factors' as any)
        .select('factor_id, weight_override, is_active')
        .eq('policy_id', policy.id)
        .eq('is_active', true);
      if (pfErr) throw pfErr;

      const factorIds = (policyFactors || []).map((pf: any) => pf.factor_id);

      // 3. Get factor configs
      const { data: configs, error: cErr } = await supabase
        .from('ce_risk_config' as any)
        .select('id, factor_code, factor_name, weight, max_score, scoring_method, thresholds, data_source, category')
        .in('id', factorIds.length > 0 ? factorIds : ['00000000-0000-0000-0000-000000000000']);
      if (cErr) throw cErr;

      const factorConfigs: FactorConfig[] = (configs || []).map((c: any) => ({
        ...c,
        thresholds: typeof c.thresholds === 'string' ? JSON.parse(c.thresholds) : (c.thresholds || []),
      }));

      // Build weight map: factor_id → weight_override
      const factorWeights: Record<string, number> = {};
      for (const pf of policyFactors || []) {
        factorWeights[(pf as any).factor_id] = (pf as any).weight_override;
      }

      // 4. Get bands
      const { data: bandsRaw, error: bErr } = await supabase
        .from('ce_risk_bands' as any)
        .select('band_name, score_range_min, score_range_max, color')
        .eq('policy_id', policy.id)
        .order('score_range_min');
      if (bErr) throw bErr;

      const bands: BandConfig[] = (bandsRaw || []).map((b: any) => ({
        band_name: b.band_name,
        score_range_min: Number(b.score_range_min),
        score_range_max: Number(b.score_range_max),
        color: b.color,
      }));

      return { policy, factorConfigs, factorWeights, bands };
    },
  });
}

// ============= Live Factor Data for an Employer =============
export function useEmployerLiveFactors(employerId: string | null) {
  return useQuery({
    queryKey: ['ce_risk_live_factors', employerId],
    enabled: !!employerId,
    queryFn: async () => {
      if (!employerId) return null;

      // Arrears
      const { data: arrears } = await supabase
        .rpc('ce_calculate_employer_arrears' as any, { p_employer_id: employerId });
      const arrearsTotal = (arrears || []).reduce((sum: number, a: any) => sum + (a.net_balance || 0), 0);

      // Violations
      const { count: violationCount } = await supabase
        .from('ce_violations' as any)
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', employerId)
        .in('status', ['OPEN', 'UNDER_REVIEW', 'ESCALATED']);

      // Filings (missed in last 12 months)
      const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const periodCutoff = twelveMonthsAgo.toISOString().slice(0, 7).replace('-', '');
      const { count: filingCount } = await supabase
        .from('cn_c3_reported' as any)
        .select('*', { count: 'exact', head: true })
        .eq('payer_id', employerId)
        .gte('period', periodCutoff);
      const missedFilings = Math.max(12 - (filingCount || 0), 0);

      // Payment behavior
      const { count: arrangementsCount } = await supabase
        .from('ce_payment_arrangements' as any)
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', employerId)
        .eq('status', 'ACTIVE');
      const { count: breachCount } = await supabase
        .from('ce_arrangement_breaches' as any)
        .select('*, ce_payment_arrangements!inner(employer_id)', { count: 'exact', head: true })
        .eq('ce_payment_arrangements.employer_id' as any, employerId)
        .is('resolution', null);
      const total = (arrangementsCount || 0) + (breachCount || 0);
      const breachPct = total > 0 ? Math.round(((breachCount || 0) / Math.max(total, 1)) * 100) : 0;

      // Legal
      const { count: legalCount } = await supabase
        .from('ce_legal_escalations' as any)
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', employerId);

      return {
        arrears: { rawValue: arrearsTotal, detail: `Total arrears: $${arrearsTotal.toFixed(2)} XCD` },
        violations: { rawValue: violationCount || 0, detail: `Active violations: ${violationCount || 0}` },
        filings: { rawValue: missedFilings, detail: `Submissions: ${filingCount || 0}/12, missed: ${missedFilings}` },
        payment: { rawValue: breachPct, detail: `Arrangements: ${arrangementsCount || 0}, breaches: ${breachCount || 0}, breach%: ${breachPct}%` },
        legal: { rawValue: legalCount || 0, detail: `Legal escalations: ${legalCount || 0}` },
      };
    },
  });
}

// ============= Score History =============
export function useRiskScoreHistory(profileId: string | null) {
  return useQuery({
    queryKey: ['ce_risk_score_history', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('ce_risk_score_history' as any)
        .select('*')
        .eq('risk_profile_id', profileId)
        .order('calculated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}
