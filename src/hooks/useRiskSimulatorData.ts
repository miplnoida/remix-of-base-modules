/**
 * Hook to load all data needed by the Risk Simulator.
 * Loads employer risk profiles, factor configs, policy factors, bands, and live counts.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FactorConfig, BandConfig } from '@/lib/compliance/riskScoringEngine';

// ============= All Employers (er_master + risk profiles merged) =============
export interface SimulatorEmployer {
  employer_id: string;
  employer_name: string;
  status: string;
  has_risk_profile: boolean;
  profile_id?: string;
  total_score?: number;
  risk_band?: string;
  arrears_score?: number;
  violation_score?: number;
  filing_score?: number;
  payment_behavior_score?: number;
  legal_history_score?: number;
  last_calculated_at?: string;
  override_band?: string;
  override_reason?: string;
  territory?: string;
}

export function useSimulatorEmployers() {
  return useQuery({
    queryKey: ['ce_risk_simulator_employers'],
    queryFn: async () => {
      // Fetch real employers from er_master (Active/Verified)
      const { data: employers, error: empErr } = await supabase
        .from('er_master' as any)
        .select('regno, name, status')
        .in('status', ['A', 'V'])
        .order('name');
      if (empErr) throw empErr;

      // Fetch existing risk profiles
      const { data: profiles, error: profErr } = await supabase
        .from('ce_risk_profiles' as any)
        .select('id, employer_id, employer_name, total_score, risk_band, arrears_score, violation_score, filing_score, payment_behavior_score, legal_history_score, last_calculated_at, override_band, override_reason, territory')
        .order('employer_name');
      if (profErr) throw profErr;

      const profileMap = new Map<string, any>();
      for (const p of (profiles as any[]) || []) {
        profileMap.set(p.employer_id, p);
      }

      // Merge: all er_master employers + any risk profile employers not in er_master
      const result: SimulatorEmployer[] = [];
      const seen = new Set<string>();

      for (const emp of (employers as any[]) || []) {
        const id = emp.regno;
        seen.add(id);
        const profile = profileMap.get(id);
        result.push({
          employer_id: id,
          employer_name: emp.name || id,
          status: emp.status,
          has_risk_profile: !!profile,
          profile_id: profile?.id,
          total_score: profile?.total_score,
          risk_band: profile?.risk_band,
          arrears_score: profile?.arrears_score,
          violation_score: profile?.violation_score,
          filing_score: profile?.filing_score,
          payment_behavior_score: profile?.payment_behavior_score,
          legal_history_score: profile?.legal_history_score,
          last_calculated_at: profile?.last_calculated_at,
          override_band: profile?.override_band,
          override_reason: profile?.override_reason,
          territory: profile?.territory,
        });
      }

      // Add risk profile employers not in er_master
      for (const p of (profiles as any[]) || []) {
        if (!seen.has(p.employer_id)) {
          result.push({
            employer_id: p.employer_id,
            employer_name: p.employer_name || p.employer_id,
            status: 'A',
            has_risk_profile: true,
            profile_id: p.id,
            total_score: p.total_score,
            risk_band: p.risk_band,
            arrears_score: p.arrears_score,
            violation_score: p.violation_score,
            filing_score: p.filing_score,
            payment_behavior_score: p.payment_behavior_score,
            legal_history_score: p.legal_history_score,
            last_calculated_at: p.last_calculated_at,
            override_band: p.override_band,
            override_reason: p.override_reason,
            territory: p.territory,
          });
        }
      }

      return result;
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
      const policiesArr = policies as any[];
      const policy = policiesArr?.[0] || null;
      if (!policy) return { policy: null, factorConfigs: [] as FactorConfig[], factorWeights: {} as Record<string, number>, bands: [] as BandConfig[] };

      // 2. Get policy factors
      const { data: policyFactors, error: pfErr } = await supabase
        .from('ce_risk_policy_factors' as any)
        .select('factor_id, weight_override, is_active')
        .eq('policy_id', policy.id)
        .eq('is_active', true);
      if (pfErr) throw pfErr;
      const pfArr = (policyFactors as any[]) || [];

      const factorIds = pfArr.map((pf: any) => pf.factor_id);

      // 3. Get factor configs
      const { data: configs, error: cErr } = await supabase
        .from('ce_risk_config' as any)
        .select('id, factor_code, factor_name, weight, max_score, scoring_method, thresholds, data_source, category')
        .in('id', factorIds.length > 0 ? factorIds : ['00000000-0000-0000-0000-000000000000']);
      if (cErr) throw cErr;

      const factorConfigs: FactorConfig[] = ((configs as any[]) || []).map((c: any) => ({
        ...c,
        thresholds: typeof c.thresholds === 'string' ? JSON.parse(c.thresholds) : (c.thresholds || []),
      }));

      // Build weight map: factor_id → weight_override
      const factorWeights: Record<string, number> = {};
      for (const pf of pfArr) {
        factorWeights[pf.factor_id] = pf.weight_override;
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
      let breachCount = 0;
      try {
        const { count: bc } = await supabase
          .from('ce_arrangement_breaches' as any)
          .select('*', { count: 'exact', head: true })
          .is('resolution', null);
        breachCount = bc || 0;
      } catch { /* no breach table */ }
      const total = (arrangementsCount || 0) + breachCount;
      const breachPct = total > 0 ? Math.round((breachCount / Math.max(total, 1)) * 100) : 0;

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
