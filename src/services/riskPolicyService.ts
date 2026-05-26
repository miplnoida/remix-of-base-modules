// ============================================
// RISK POLICY SERVICE — DB-backed
// ============================================
//
// Replaces in-memory MOCK_RISK_POLICIES / MOCK_RISK_BANDS arrays.
// Policies → ce_risk_policies, bands → ce_risk_bands,
// factor links → ce_risk_policy_factors (joined with ce_risk_config).

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserCode } from '@/hooks/useUserCode';
import {
  RiskPolicy,
  RiskPolicyHistory,
  RiskBand,
  RiskBandName,
  AuditFrequency,
} from '@/types/riskPolicy';

type AnyRow = Record<string, any>;

function rowToPolicy(row: AnyRow, factors: RiskPolicy['factors'] = []): RiskPolicy {
  return {
    id: row.id,
    policyId: row.policy_code,
    policyName: row.policy_name,
    description: row.description ?? '',
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to ?? null,
    status: row.status,
    isActive: row.status === 'ACTIVE',
    applicableEmployerTypes: row.applicable_employer_types ?? [],
    applicableZones: row.applicable_zones ?? [],
    updateFrequency: row.update_frequency,
    factors,
    createdDate: row.created_at,
    createdBy: row.created_by ?? '',
    lastModified: row.updated_at,
    lastModifiedBy: row.updated_by ?? '',
    activatedBy: row.activated_by ?? undefined,
    activatedDate: row.activated_at ?? undefined,
  };
}

function rowToBand(row: AnyRow): RiskBand {
  return {
    id: row.id,
    policyId: row.policy_id,
    bandName: row.band_name as RiskBandName,
    scoreRangeMin: Number(row.score_range_min),
    scoreRangeMax: Number(row.score_range_max),
    color: row.color ?? '#6B7280',
    auditFrequency: (row.audit_frequency ?? AuditFrequency.RANDOM_3_YEAR) as AuditFrequency,
    mandatoryAudit: !!row.mandatory_audit,
    autoSelectRule: {
      enabled: !!row.auto_select_enabled,
      selectionType: row.auto_select_type ?? 'RANDOM_PERCENTAGE',
      randomPercentage: row.auto_select_type === 'RANDOM_PERCENTAGE' ? Number(row.auto_select_value ?? 0) : undefined,
      topCount: row.auto_select_type === 'TOP_X_PER_ZONE' ? Number(row.auto_select_value ?? 0) : undefined,
    } as any,
    followUpIntensity: row.follow_up_intensity ?? 'NORMAL',
    escalationRule: {
      enabled: !!row.escalation_enabled,
      monthsInBand: row.escalation_months_in_band ?? 0,
      action: row.escalation_action ?? 'NOTIFY_SUPERVISOR',
    } as any,
    createdDate: row.created_at,
    lastModified: row.updated_at,
  };
}

async function loadFactorsForPolicy(policyId: string): Promise<RiskPolicy['factors']> {
  const { data, error } = await supabase
    .from('ce_risk_policy_factors')
    .select('weight_override, is_active, factor:ce_risk_config(id, factor_code, factor_name, weight)')
    .eq('policy_id', policyId);
  if (error) throw error;
  return (data ?? []).map((r: AnyRow) => ({
    factorId: r.factor?.id ?? '',
    factorCode: r.factor?.factor_code ?? '',
    factorName: r.factor?.factor_name ?? '',
    defaultWeight: Number(r.factor?.weight ?? 0),
    overrideWeight: r.weight_override != null ? Number(r.weight_override) : Number(r.factor?.weight ?? 0),
    active: r.is_active !== false,
  }));
}

async function requireUserCode(): Promise<string> {
  const code = await getCurrentUserCode();
  if (!code) throw new Error('User identity required: no user_code resolved for the current session.');
  return code;
}

export const riskPolicyService = {
  async getPolicyHistory(): Promise<RiskPolicyHistory> {
    const { data, error } = await supabase
      .from('ce_risk_policies')
      .select('*')
      .order('effective_from', { ascending: false });
    if (error) throw error;

    const policies = await Promise.all(
      (data ?? []).map(async (row) => rowToPolicy(row, await loadFactorsForPolicy(row.id)))
    );
    return {
      policies,
      activePolicy: policies.find((p) => p.isActive) ?? null,
    };
  },

  async getActivePolicy(): Promise<RiskPolicy | null> {
    const { data, error } = await supabase
      .from('ce_risk_policies')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return rowToPolicy(data, await loadFactorsForPolicy(data.id));
  },

  async getPolicyById(id: string): Promise<RiskPolicy | null> {
    const { data, error } = await supabase
      .from('ce_risk_policies')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return rowToPolicy(data, await loadFactorsForPolicy(data.id));
  },

  async createPolicy(
    policy: Omit<RiskPolicy, 'id' | 'policyId' | 'createdDate' | 'lastModified' | 'isActive'>
  ): Promise<RiskPolicy> {
    const userCode = await requireUserCode();
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('ce_risk_policies')
      .select('id', { count: 'exact', head: true });
    const policyCode = `RP-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`;

    const { data, error } = await supabase
      .from('ce_risk_policies')
      .insert({
        policy_code: policyCode,
        policy_name: policy.policyName,
        description: policy.description,
        effective_from: policy.effectiveFrom,
        effective_to: policy.effectiveTo,
        status: policy.status ?? 'DRAFT',
        update_frequency: policy.updateFrequency,
        applicable_zones: policy.applicableZones,
        applicable_employer_types: policy.applicableEmployerTypes,
        created_by: userCode,
        updated_by: userCode,
      } as any)
      .select('*')
      .single();
    if (error) throw error;

    // Link factors
    if (policy.factors?.length) {
      const links = policy.factors.map((f) => ({
        policy_id: data.id,
        factor_id: f.factorId,
        weight_override: f.overrideWeight,
        is_active: f.active,
        created_by: userCode,
        updated_by: userCode,
      }));
      const { error: linkErr } = await supabase.from('ce_risk_policy_factors').insert(links as any);
      if (linkErr) throw linkErr;
    }

    return rowToPolicy(data, await loadFactorsForPolicy(data.id));
  },

  async updatePolicy(id: string, updates: Partial<RiskPolicy>): Promise<RiskPolicy> {
    const userCode = await requireUserCode();
    const patch: AnyRow = {
      updated_by: userCode,
      updated_at: new Date().toISOString(),
    };
    if (updates.policyName !== undefined) patch.policy_name = updates.policyName;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.effectiveFrom !== undefined) patch.effective_from = updates.effectiveFrom;
    if (updates.effectiveTo !== undefined) patch.effective_to = updates.effectiveTo;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.updateFrequency !== undefined) patch.update_frequency = updates.updateFrequency;
    if (updates.applicableZones !== undefined) patch.applicable_zones = updates.applicableZones;
    if (updates.applicableEmployerTypes !== undefined) patch.applicable_employer_types = updates.applicableEmployerTypes;

    const { data, error } = await supabase
      .from('ce_risk_policies')
      .update(patch as any)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    // Replace factor links if provided
    if (updates.factors) {
      await supabase.from('ce_risk_policy_factors').delete().eq('policy_id', id);
      if (updates.factors.length) {
        const links = updates.factors.map((f) => ({
          policy_id: id,
          factor_id: f.factorId,
          weight_override: f.overrideWeight,
          is_active: f.active,
          created_by: userCode,
          updated_by: userCode,
        }));
        const { error: linkErr } = await supabase.from('ce_risk_policy_factors').insert(links as any);
        if (linkErr) throw linkErr;
      }
    }

    return rowToPolicy(data, await loadFactorsForPolicy(id));
  },

  async activatePolicy(id: string, activatedBy: string): Promise<RiskPolicy> {
    const userCode = activatedBy || (await requireUserCode());

    // Retire current active policy
    const { data: current } = await supabase
      .from('ce_risk_policies')
      .select('id')
      .eq('status', 'ACTIVE');
    if (current?.length) {
      await supabase
        .from('ce_risk_policies')
        .update({
          status: 'RETIRED',
          effective_to: new Date().toISOString().slice(0, 10),
          updated_by: userCode,
          updated_at: new Date().toISOString(),
        } as any)
        .in('id', current.map((p) => p.id));
    }

    const { data, error } = await supabase
      .from('ce_risk_policies')
      .update({
        status: 'ACTIVE',
        activated_by: userCode,
        activated_at: new Date().toISOString(),
        updated_by: userCode,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return rowToPolicy(data, await loadFactorsForPolicy(id));
  },

  async getBandsForPolicy(policyId: string): Promise<RiskBand[]> {
    const { data, error } = await supabase
      .from('ce_risk_bands')
      .select('*')
      .eq('policy_id', policyId)
      .order('score_range_min');
    if (error) throw error;
    return (data ?? []).map(rowToBand);
  },

  async updateBand(id: string, updates: Partial<RiskBand>): Promise<RiskBand> {
    const userCode = await requireUserCode();
    const patch: AnyRow = {
      updated_by: userCode,
      updated_at: new Date().toISOString(),
    };
    if (updates.bandName !== undefined) patch.band_name = updates.bandName;
    if (updates.scoreRangeMin !== undefined) patch.score_range_min = updates.scoreRangeMin;
    if (updates.scoreRangeMax !== undefined) patch.score_range_max = updates.scoreRangeMax;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.auditFrequency !== undefined) patch.audit_frequency = updates.auditFrequency;
    if (updates.mandatoryAudit !== undefined) patch.mandatory_audit = updates.mandatoryAudit;
    if (updates.followUpIntensity !== undefined) patch.follow_up_intensity = updates.followUpIntensity;
    if (updates.autoSelectRule) {
      patch.auto_select_enabled = updates.autoSelectRule.enabled;
      patch.auto_select_type = updates.autoSelectRule.selectionType;
      patch.auto_select_value =
        (updates.autoSelectRule as any).randomPercentage ??
        (updates.autoSelectRule as any).topCount ??
        null;
    }
    if (updates.escalationRule) {
      patch.escalation_enabled = updates.escalationRule.enabled;
      patch.escalation_months_in_band = updates.escalationRule.monthsInBand;
      patch.escalation_action = updates.escalationRule.action;
    }

    const { data, error } = await supabase
      .from('ce_risk_bands')
      .update(patch as any)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return rowToBand(data);
  },
};
