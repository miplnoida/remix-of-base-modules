/**
 * Rule Catalogue Service — reusable eligibility rules shared across products.
 */
import { supabase } from '@/integrations/supabase/client';

export type FailAction = 'REJECT' | 'BLOCK' | 'REFER';

export const RULE_GROUP_TYPES = [
  'AGE','CONTRIBUTION','EMPLOYMENT','MEDICAL','DEPENDENCY',
  'MEANS_TEST','INJURY','FUNERAL','MATERNITY','RESIDENCE','TIMING',
  'DOCUMENT','COMMON',
] as const;

/**
 * Rule Category — broad classification on a catalogue rule.
 * Distinct from Rule Group (which is a reusable master in bn_rule_group).
 */
export const RULE_CATEGORIES = RULE_GROUP_TYPES;

export const RULE_PARAMETERS = [
  'AGE_AT_CLAIM','TOTAL_CONTRIBUTIONS','CONTRIBUTIONS_LAST_13_WEEKS','CONTRIBUTIONS_LAST_12_MONTHS',
  'PAID_CONTRIBUTIONS','HAS_MEDICAL_CERTIFICATE','HAS_EMPLOYER_VERIFICATION','IS_SPOUSE','IS_CHILD',
  'IS_DEPENDENT','CHILD_AGE','CHILD_IN_EDUCATION','INJURY_TYPE','INJURY_WORK_RELATED',
  'DECEASED_CONTRIBUTIONS','MEANS_TEST_INCOME','RESIDENCE_CONFIRMED','DISABILITY_PERCENTAGE',
  'MEDICAL_BOARD_CERTIFIED','EMPLOYMENT_STATUS','SELF_EMPLOYED','CLAIM_SUBMISSION_DAYS',
  'LAST_DAY_WORKED','EXPECTED_DELIVERY_DATE','CONFINEMENT_DATE','DEATH_DATE','FUNERAL_INVOICE_AMOUNT',
] as const;

export const RULE_OPERATORS = [
  'EQUALS','NOT_EQUALS','GREATER_THAN','GREATER_OR_EQUAL','LESS_THAN','LESS_OR_EQUAL',
  'BETWEEN','IN','NOT_IN','BOOLEAN','EXISTS','CONTAINS',
] as const;

export const FAIL_ACTIONS: FailAction[] = ['REJECT','BLOCK','REFER'];

export interface RuleCatalogueItem {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  group_type: string;
  category: string | null;
  parameter: string;
  fact_key: string | null;
  operator: string;
  value_from: string | null;
  value_to: string | null;
  values: any | null;
  default_fail_action: FailAction;
  failure_message_text: string | null;
  is_active: boolean;
  allow_product_override: boolean;
  tags: string[];
  version: number;
  effective_from: string | null;
  effective_to: string | null;
  rule_group_id: string | null;
  rule_group_code: string | null;
  rule_group_name: string | null;
  default_group_sort_order: number;
  default_rule_sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RuleCatalogueInput = Omit<
  RuleCatalogueItem,
  'id' | 'created_at' | 'updated_at' | 'version' | 'created_by' | 'updated_by'
> & { id?: string };

export async function listRuleCatalogue(): Promise<RuleCatalogueItem[]> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_catalogue')
    .select('*')
    .order('group_type', { ascending: true })
    .order('rule_code', { ascending: true });
  if (error) throw error;
  return (data || []) as RuleCatalogueItem[];
}

export async function getRuleCatalogueUsage(): Promise<Record<string, number>> {
  const { data, error } = await (supabase as any)
    .from('bn_eligibility_rule')
    .select('catalogue_rule_code')
    .not('catalogue_rule_code', 'is', null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data as any[]) || []) {
    const code = row.catalogue_rule_code as string;
    counts[code] = (counts[code] || 0) + 1;
  }
  return counts;
}

export async function upsertRuleCatalogue(input: RuleCatalogueInput, userCode: string): Promise<RuleCatalogueItem> {
  const payload: any = { ...input, updated_by: userCode };
  if (!input.id) payload.created_by = userCode;
  // Auto-populate denormalized rule_group_code/name from rule_group_id
  if (input.rule_group_id) {
    const { data: g } = await (supabase as any)
      .from('bn_rule_group')
      .select('group_code, group_name')
      .eq('id', input.rule_group_id)
      .maybeSingle();
    if (g) {
      payload.rule_group_code = g.group_code;
      payload.rule_group_name = g.group_name;
    }
  } else {
    payload.rule_group_code = null;
    payload.rule_group_name = null;
  }
  const { data, error } = await (supabase as any)
    .from('bn_rule_catalogue')
    .upsert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as RuleCatalogueItem;
}

export async function cloneRuleCatalogue(source: RuleCatalogueItem, newCode: string, userCode: string): Promise<RuleCatalogueItem> {
  const { id, created_at, updated_at, version, created_by, updated_by, ...rest } = source;
  return upsertRuleCatalogue({ ...rest, rule_code: newCode, rule_name: `${source.rule_name} (copy)` }, userCode);
}

export async function deleteRuleCatalogue(id: string, code: string): Promise<void> {
  const { count, error: usageErr } = await (supabase as any)
    .from('bn_eligibility_rule')
    .select('id', { count: 'exact', head: true })
    .eq('catalogue_rule_code', code);
  if (usageErr) throw usageErr;
  if ((count ?? 0) > 0) {
    throw new Error(`Rule is in use by ${count} product rule(s). Deactivate instead.`);
  }
  const { error } = await (supabase as any).from('bn_rule_catalogue').delete().eq('id', id);
  if (error) throw error;
}

export async function setRuleCatalogueActive(id: string, isActive: boolean, userCode: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('bn_rule_catalogue')
    .update({ is_active: isActive, updated_by: userCode })
    .eq('id', id);
  if (error) throw error;
}

/* ---------- Many-to-many: catalogue rule ↔ rule groups ---------- */

export interface CatalogueGroupLink {
  catalogue_id: string;
  rule_group_id: string;
  group_code: string;
  group_name: string;
  sort_order: number;
}

export async function listAllCatalogueGroupLinks(): Promise<Record<string, CatalogueGroupLink[]>> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_catalogue_group')
    .select('catalogue_id, rule_group_id, sort_order, bn_rule_group!inner(group_code, group_name)')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const out: Record<string, CatalogueGroupLink[]> = {};
  for (const r of (data as any[]) ?? []) {
    (out[r.catalogue_id] ||= []).push({
      catalogue_id: r.catalogue_id,
      rule_group_id: r.rule_group_id,
      group_code: r.bn_rule_group.group_code,
      group_name: r.bn_rule_group.group_name,
      sort_order: r.sort_order ?? 0,
    });
  }
  return out;
}

export async function getCatalogueGroupLinks(catalogueId: string): Promise<CatalogueGroupLink[]> {
  const all = await listAllCatalogueGroupLinks();
  return all[catalogueId] ?? [];
}

/** Replace the linked-groups set for one catalogue rule, and keep legacy
 *  rule_group_id/code/name in sync with the first selected group. */
export async function setCatalogueGroupLinks(
  catalogueId: string,
  ruleGroupIds: string[],
  userCode: string,
): Promise<void> {
  const del = await (supabase as any)
    .from('bn_rule_catalogue_group')
    .delete()
    .eq('catalogue_id', catalogueId);
  if (del.error) throw del.error;

  if (ruleGroupIds.length > 0) {
    const rows = ruleGroupIds.map((rid, i) => ({
      catalogue_id: catalogueId, rule_group_id: rid, sort_order: i, created_by: userCode,
    }));
    const ins = await (supabase as any).from('bn_rule_catalogue_group').insert(rows);
    if (ins.error) throw ins.error;
  }

  const primaryId: string | null = ruleGroupIds[0] ?? null;
  let primaryCode: string | null = null;
  let primaryName: string | null = null;
  if (primaryId) {
    const { data: g } = await (supabase as any)
      .from('bn_rule_group')
      .select('group_code, group_name')
      .eq('id', primaryId)
      .maybeSingle();
    primaryCode = g?.group_code ?? null;
    primaryName = g?.group_name ?? null;
  }
  const upd = await (supabase as any)
    .from('bn_rule_catalogue')
    .update({
      rule_group_id: primaryId,
      rule_group_code: primaryCode,
      rule_group_name: primaryName,
      updated_by: userCode,
    })
    .eq('id', catalogueId);
  if (upd.error) throw upd.error;
}

export async function listCatalogueRulesByGroup(groupId: string, activeOnly = true): Promise<(RuleCatalogueItem & { link_sort_order: number })[]> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_catalogue_group')
    .select('sort_order, bn_rule_catalogue!inner(*)')
    .eq('rule_group_id', groupId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const rows = ((data as any[]) ?? []).map(r => ({ ...(r.bn_rule_catalogue as any), link_sort_order: r.sort_order ?? 0 }));
  return activeOnly ? rows.filter(r => r.is_active) : rows;
}

export async function unlinkCatalogueRuleFromGroup(catalogueId: string, groupId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('bn_rule_catalogue_group')
    .delete()
    .eq('catalogue_id', catalogueId)
    .eq('rule_group_id', groupId);
  if (error) throw error;
}

export async function reorderCatalogueRulesInGroup(groupId: string, orderedCatalogueIds: string[]): Promise<void> {
  for (let i = 0; i < orderedCatalogueIds.length; i++) {
    const { error } = await (supabase as any)
      .from('bn_rule_catalogue_group')
      .update({ sort_order: i })
      .eq('rule_group_id', groupId)
      .eq('catalogue_id', orderedCatalogueIds[i]);
    if (error) throw error;
  }
}

export function validateRuleCatalogue(input: Partial<RuleCatalogueInput>): string | null {
  if (!input.rule_code?.trim()) return 'Rule code is required';
  if (!/^[A-Z0-9_]+$/.test(input.rule_code)) return 'Rule code must be uppercase letters, digits, underscores';
  if (!input.rule_name?.trim()) return 'Rule name is required';
  if (!input.group_type) return 'Group is required';
  if (!input.parameter) return 'Parameter is required';
  if (!input.operator) return 'Operator is required';
  const op = input.operator;
  if (op === 'BOOLEAN' && !['true','false'].includes(String(input.value_from))) return 'BOOLEAN requires value true/false';
  if (op === 'BETWEEN' && (!input.value_from || !input.value_to)) return 'BETWEEN requires value from and value to';
  if ((op === 'IN' || op === 'NOT_IN') && (!Array.isArray(input.values) || input.values.length === 0)) return 'IN/NOT_IN requires at least one value';
  return null;
}
