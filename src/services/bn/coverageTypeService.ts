/**
 * Coverage Type service — assignment layer between Rule Catalogue and products.
 * A Coverage Type groups reusable rules with a priority and effective window;
 * the rule logic itself stays in bn_rule_catalogue (single source of truth).
 */
import { supabase } from '@/integrations/supabase/client';

export interface CoverageType {
  id: string;
  coverage_code: string;
  coverage_name: string;
  description: string | null;
  active_flag: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoverageTypeRule {
  id: string;
  coverage_type_id: string;
  rule_code: string;
  priority: number;
  effective_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type CoverageTypeInput = Omit<CoverageType, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> & { id?: string };

export async function listCoverageTypes(): Promise<CoverageType[]> {
  const { data, error } = await (supabase as any)
    .from('bn_coverage_type')
    .select('*')
    .order('coverage_code', { ascending: true });
  if (error) throw error;
  return (data || []) as CoverageType[];
}

export async function listCoverageTypeRules(): Promise<CoverageTypeRule[]> {
  const { data, error } = await (supabase as any)
    .from('bn_coverage_type_rule')
    .select('*')
    .order('priority', { ascending: true });
  if (error) throw error;
  return (data || []) as CoverageTypeRule[];
}

export async function upsertCoverageType(input: CoverageTypeInput, userCode: string): Promise<CoverageType> {
  const payload: any = { ...input, updated_by: userCode };
  if (!input.id) payload.created_by = userCode;
  const { data, error } = await (supabase as any)
    .from('bn_coverage_type')
    .upsert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as CoverageType;
}

export async function deleteCoverageType(id: string): Promise<void> {
  const { error } = await (supabase as any).from('bn_coverage_type').delete().eq('id', id);
  if (error) throw error;
}

export async function assignRuleToCoverageType(
  coverage_type_id: string, rule_code: string, priority: number,
  effective_date: string | null, end_date: string | null, userCode: string,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('bn_coverage_type_rule')
    .upsert({ coverage_type_id, rule_code, priority, effective_date, end_date, updated_by: userCode, created_by: userCode },
      { onConflict: 'coverage_type_id,rule_code' });
  if (error) throw error;
}

export async function unassignRuleFromCoverageType(coverage_type_id: string, rule_code: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('bn_coverage_type_rule')
    .delete()
    .match({ coverage_type_id, rule_code });
  if (error) throw error;
}

export function validateCoverageType(input: Partial<CoverageTypeInput>): string | null {
  if (!input.coverage_code?.trim()) return 'Coverage code is required';
  if (!/^[A-Z0-9_]+$/.test(input.coverage_code)) return 'Coverage code must be uppercase letters, digits, underscores';
  if (!input.coverage_name?.trim()) return 'Coverage name is required';
  return null;
}
