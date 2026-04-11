import { supabase } from '@/integrations/supabase/client';

export interface LegalEscalationPolicyRow {
  id: string;
  policy_code: string;
  policy_version: string;
  policy_name: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  evaluation_frequency: string;
  last_evaluation_date: string | null;
  next_evaluation_date: string | null;
  notes: string | null;
  activated_by: string | null;
  activated_at: string | null;
  deactivated_by: string | null;
  deactivated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface LegalEscalationPolicyRuleRow {
  id: string;
  policy_id: string;
  rule_name: string;
  rule_type: string;
  description: string | null;
  is_enabled: boolean;
  priority: number;
  age_days_overdue: number | null;
  consecutive_months_missing: number | null;
  total_arrears_threshold: number | null;
  single_period_threshold: number | null;
  notices_sent_minimum: number | null;
  no_response_days: number | null;
  payment_plan_breaches_count: number | null;
  audit_refused_count: number | null;
  risk_band_minimum: string | null;
  risk_score_minimum: number | null;
  combine_with_age_threshold: boolean | null;
  trigger_condition: string;
  auto_mark_legal_recommended: boolean;
  notify_compliance_officer: boolean;
  notify_supervisor: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface LegalEscalationPolicyWithRules extends LegalEscalationPolicyRow {
  rules: LegalEscalationPolicyRuleRow[];
}

export async function fetchLegalEscalationPolicies(): Promise<LegalEscalationPolicyRow[]> {
  const { data, error } = await supabase
    .from('ce_legal_escalation_policies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as LegalEscalationPolicyRow[];
}

export async function fetchActiveLegalEscalationPolicy(): Promise<LegalEscalationPolicyWithRules | null> {
  const { data: policyData, error: policyErr } = await supabase
    .from('ce_legal_escalation_policies')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (policyErr) throw policyErr;
  if (!policyData) return null;

  const policy = policyData as unknown as LegalEscalationPolicyRow;

  const { data: rulesData, error: rulesErr } = await supabase
    .from('ce_legal_escalation_policy_rules')
    .select('*')
    .eq('policy_id', policy.id)
    .order('priority', { ascending: true });
  if (rulesErr) throw rulesErr;

  return {
    ...policy,
    rules: (rulesData || []) as unknown as LegalEscalationPolicyRuleRow[],
  };
}

export async function updateLegalEscalationPolicy(id: string, updates: Partial<LegalEscalationPolicyRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_legal_escalation_policies')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function activateNewLegalEscalationPolicy(
  currentPolicyId: string | null,
  newPolicyData: Partial<LegalEscalationPolicyRow>,
  rulesToCopy: LegalEscalationPolicyRuleRow[]
): Promise<void> {
  // Deactivate current
  if (currentPolicyId) {
    const { error } = await supabase
      .from('ce_legal_escalation_policies')
      .update({
        is_active: false,
        effective_to: newPolicyData.effective_from,
        deactivated_by: newPolicyData.created_by || 'system',
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', currentPolicyId);
    if (error) throw error;
  }

  // Insert new policy
  const { data: newPolicy, error: insertErr } = await supabase
    .from('ce_legal_escalation_policies')
    .insert({
      policy_code: newPolicyData.policy_code,
      policy_version: newPolicyData.policy_version,
      policy_name: newPolicyData.policy_name,
      effective_from: newPolicyData.effective_from,
      is_active: true,
      evaluation_frequency: newPolicyData.evaluation_frequency,
      notes: newPolicyData.notes,
      activated_by: newPolicyData.created_by || 'system',
      activated_at: new Date().toISOString(),
      created_by: newPolicyData.created_by || 'system',
    } as any)
    .select('id')
    .single();
  if (insertErr) throw insertErr;

  // Copy rules to new policy
  if (rulesToCopy.length > 0 && newPolicy) {
    const newRules = rulesToCopy.map(r => ({
      policy_id: (newPolicy as any).id,
      rule_name: r.rule_name,
      rule_type: r.rule_type,
      description: r.description,
      is_enabled: r.is_enabled,
      priority: r.priority,
      age_days_overdue: r.age_days_overdue,
      consecutive_months_missing: r.consecutive_months_missing,
      total_arrears_threshold: r.total_arrears_threshold,
      single_period_threshold: r.single_period_threshold,
      notices_sent_minimum: r.notices_sent_minimum,
      no_response_days: r.no_response_days,
      payment_plan_breaches_count: r.payment_plan_breaches_count,
      audit_refused_count: r.audit_refused_count,
      risk_band_minimum: r.risk_band_minimum,
      risk_score_minimum: r.risk_score_minimum,
      combine_with_age_threshold: r.combine_with_age_threshold,
      trigger_condition: r.trigger_condition,
      auto_mark_legal_recommended: r.auto_mark_legal_recommended,
      notify_compliance_officer: r.notify_compliance_officer,
      notify_supervisor: r.notify_supervisor,
      created_by: newPolicyData.created_by || 'system',
    }));
    const { error: rulesErr } = await supabase
      .from('ce_legal_escalation_policy_rules')
      .insert(newRules as any);
    if (rulesErr) throw rulesErr;
  }
}

// Rule CRUD
export async function addPolicyRule(rule: Partial<LegalEscalationPolicyRuleRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_legal_escalation_policy_rules')
    .insert({
      policy_id: rule.policy_id,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      description: rule.description,
      is_enabled: rule.is_enabled ?? true,
      priority: rule.priority ?? 1,
      age_days_overdue: rule.age_days_overdue,
      consecutive_months_missing: rule.consecutive_months_missing,
      total_arrears_threshold: rule.total_arrears_threshold,
      single_period_threshold: rule.single_period_threshold,
      notices_sent_minimum: rule.notices_sent_minimum,
      no_response_days: rule.no_response_days,
      payment_plan_breaches_count: rule.payment_plan_breaches_count,
      audit_refused_count: rule.audit_refused_count,
      risk_band_minimum: rule.risk_band_minimum,
      risk_score_minimum: rule.risk_score_minimum,
      combine_with_age_threshold: rule.combine_with_age_threshold,
      trigger_condition: rule.trigger_condition || 'AND',
      auto_mark_legal_recommended: rule.auto_mark_legal_recommended ?? true,
      notify_compliance_officer: rule.notify_compliance_officer ?? true,
      notify_supervisor: rule.notify_supervisor ?? false,
      created_by: rule.created_by || 'system',
    } as any);
  if (error) throw error;
}

export async function updatePolicyRule(id: string, updates: Partial<LegalEscalationPolicyRuleRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_legal_escalation_policy_rules')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function deletePolicyRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('ce_legal_escalation_policy_rules')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
