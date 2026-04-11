import { supabase } from '@/integrations/supabase/client';

export interface ArrangementPolicyRow {
  id: string;
  policy_code: string;
  policy_name: string;
  is_active: boolean;
  max_arrangement_months: number;
  min_down_payment_percent: number;
  max_missed_installments: number;
  breach_grace_days: number;
  auto_terminate_on_breach: boolean;
  interest_on_arrangement: boolean;
  arrangement_interest_rate: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export async function fetchArrangementPolicies(): Promise<ArrangementPolicyRow[]> {
  const { data, error } = await supabase
    .from('ce_arrangement_policies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ArrangementPolicyRow[];
}

export async function createArrangementPolicy(policy: Partial<ArrangementPolicyRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_arrangement_policies')
    .insert({
      policy_code: policy.policy_code,
      policy_name: policy.policy_name,
      is_active: policy.is_active ?? true,
      max_arrangement_months: policy.max_arrangement_months ?? 24,
      min_down_payment_percent: policy.min_down_payment_percent ?? 10,
      max_missed_installments: policy.max_missed_installments ?? 2,
      breach_grace_days: policy.breach_grace_days ?? 7,
      auto_terminate_on_breach: policy.auto_terminate_on_breach ?? false,
      interest_on_arrangement: policy.interest_on_arrangement ?? false,
      arrangement_interest_rate: policy.arrangement_interest_rate ?? 0,
      notes: policy.notes,
      created_by: policy.created_by || 'system',
    } as any);
  if (error) throw error;
}

export async function updateArrangementPolicy(id: string, updates: Partial<ArrangementPolicyRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_arrangement_policies')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}
