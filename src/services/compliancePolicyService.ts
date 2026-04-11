import { supabase } from '@/integrations/supabase/client';

export interface CompliancePolicyRow {
  id: string;
  policy_code: string;
  policy_version: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  c3_grace_period_days: number;
  c3_submission_deadline_day: number;
  payment_due_date_day: number;
  penalty_rate_percent: number;
  interest_rate_percent: number;
  penalty_calc_frequency: string;
  min_audit_frequency_months: number;
  arrears_escalation_threshold: number;
  auto_violation_rules: any[];
  violation_prefix_config: Record<string, any>;
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

export async function fetchCompliancePolicies(): Promise<CompliancePolicyRow[]> {
  const { data, error } = await supabase
    .from('ce_compliance_policies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CompliancePolicyRow[];
}

export async function fetchActiveCompliancePolicy(): Promise<CompliancePolicyRow | null> {
  const { data, error } = await supabase
    .from('ce_compliance_policies')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as CompliancePolicyRow | null;
}

export async function updateCompliancePolicy(id: string, updates: Partial<CompliancePolicyRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_compliance_policies')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function activateNewPolicy(
  currentPolicyId: string | null,
  newPolicyData: Partial<CompliancePolicyRow>
): Promise<void> {
  // Deactivate current
  if (currentPolicyId) {
    const { error: deactivateErr } = await supabase
      .from('ce_compliance_policies')
      .update({
        is_active: false,
        effective_to: newPolicyData.effective_from,
        deactivated_by: newPolicyData.created_by || 'system',
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', currentPolicyId);
    if (deactivateErr) throw deactivateErr;
  }

  // Insert new
  const { error: insertErr } = await supabase
    .from('ce_compliance_policies')
    .insert({
      policy_code: newPolicyData.policy_code,
      policy_version: newPolicyData.policy_version,
      effective_from: newPolicyData.effective_from,
      is_active: true,
      c3_grace_period_days: newPolicyData.c3_grace_period_days,
      c3_submission_deadline_day: newPolicyData.c3_submission_deadline_day,
      payment_due_date_day: newPolicyData.payment_due_date_day,
      penalty_rate_percent: newPolicyData.penalty_rate_percent,
      interest_rate_percent: newPolicyData.interest_rate_percent,
      penalty_calc_frequency: newPolicyData.penalty_calc_frequency,
      min_audit_frequency_months: newPolicyData.min_audit_frequency_months,
      arrears_escalation_threshold: newPolicyData.arrears_escalation_threshold,
      auto_violation_rules: newPolicyData.auto_violation_rules,
      violation_prefix_config: newPolicyData.violation_prefix_config,
      notes: newPolicyData.notes,
      activated_by: newPolicyData.created_by || 'system',
      activated_at: new Date().toISOString(),
      created_by: newPolicyData.created_by || 'system',
    } as any);
  if (insertErr) throw insertErr;
}
