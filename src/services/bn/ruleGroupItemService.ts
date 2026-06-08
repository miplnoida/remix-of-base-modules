/**
 * Rule Group ↔ Catalogue many-to-many membership service.
 * Backed by bn_rule_group_item. A catalogue rule may belong to many groups.
 */
import { supabase } from '@/integrations/supabase/client';

export interface RuleGroupItem {
  id: string;
  rule_group_id: string;
  catalogue_rule_id: string;
  rule_code: string;
  sort_order: number;
  default_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedCatalogueRule extends RuleGroupItem {
  rule_name: string;
  fact_key: string | null;
  operator: string;
  value_from: string | null;
  value_to: string | null;
  values: any | null;
  default_fail_action: string;
  failure_message_text: string | null;
  version: number;
  is_active: boolean;
  category: string | null;
  group_type: string;
}

export async function listGroupItems(groupId: string): Promise<LinkedCatalogueRule[]> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_group_item')
    .select(`
      id, rule_group_id, catalogue_rule_id, rule_code, sort_order, default_active, notes,
      created_at, updated_at,
      bn_rule_catalogue:catalogue_rule_id (
        rule_name, fact_key, operator, value_from, value_to, values,
        default_fail_action, failure_message_text, version, is_active, category, group_type
      )
    `)
    .eq('rule_group_id', groupId)
    .order('sort_order', { ascending: true })
    .order('rule_code', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    ...(row.bn_rule_catalogue ?? {}),
    bn_rule_catalogue: undefined,
  }));
}

export async function listGroupsForRule(ruleId: string): Promise<{ rule_group_id: string }[]> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_group_item')
    .select('rule_group_id')
    .eq('catalogue_rule_id', ruleId);
  if (error) throw error;
  return data || [];
}

export async function addRulesToGroup(
  groupId: string,
  rules: { id: string; rule_code: string }[],
  userCode: string,
): Promise<void> {
  if (!rules.length) return;
  const rows = rules.map((r, i) => ({
    rule_group_id: groupId,
    catalogue_rule_id: r.id,
    rule_code: r.rule_code,
    sort_order: i,
    default_active: true,
    created_by: userCode,
    updated_by: userCode,
  }));
  const { error } = await (supabase as any)
    .from('bn_rule_group_item')
    .upsert(rows, { onConflict: 'rule_group_id,catalogue_rule_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeFromGroup(itemId: string): Promise<void> {
  const { error } = await (supabase as any).from('bn_rule_group_item').delete().eq('id', itemId);
  if (error) throw error;
}

export async function removeRuleFromGroup(groupId: string, catalogueRuleId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('bn_rule_group_item')
    .delete()
    .eq('rule_group_id', groupId)
    .eq('catalogue_rule_id', catalogueRuleId);
  if (error) throw error;
}

export async function reorderGroupItems(
  groupId: string,
  ordered: { id: string; sort_order: number }[],
): Promise<void> {
  for (const r of ordered) {
    const { error } = await (supabase as any)
      .from('bn_rule_group_item')
      .update({ sort_order: r.sort_order })
      .eq('id', r.id)
      .eq('rule_group_id', groupId);
    if (error) throw error;
  }
}

export interface GroupUsageEntry {
  group_count: number;
  group_codes: string[];
  group_ids: string[];
}
export async function getGroupUsageMap(): Promise<Record<string, GroupUsageEntry>> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_catalogue_group_usage')
    .select('catalogue_rule_id, group_count, group_codes, group_ids');
  if (error) throw error;
  const map: Record<string, GroupUsageEntry> = {};
  for (const row of (data as any[]) || []) {
    map[row.catalogue_rule_id] = {
      group_count: row.group_count ?? 0,
      group_codes: row.group_codes ?? [],
      group_ids: row.group_ids ?? [],
    };
  }
  return map;
}
