import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any;

export interface LgFeeRuleRow {
  id: string;
  fee_rule_code: string;
  fee_rule_name: string;
  country_code: string | null;
  case_type_code: string | null;
  stage_code: string | null;
  event_code: string | null;
  fee_head_id: string | null;
  fee_head_code: string | null;
  calculation_type: string;
  base_variable: string | null;
  fixed_amount: number | null;
  percentage_rate: number | null;
  min_amount: number | null;
  max_amount: number | null;
  effective_from: string;
  effective_to: string | null;
  auto_apply: boolean;
  allow_waiver: boolean;
  waiver_requires_approval: boolean;
  status: string;
}

export async function listFeeRules(): Promise<LgFeeRuleRow[]> {
  const { data, error } = await sb.from("lg_fee_rule").select("*").order("fee_rule_code");
  if (error) throw error;
  return data ?? [];
}

export async function upsertFeeRule(row: Partial<LgFeeRuleRow> & { fee_rule_code: string; fee_rule_name: string }, userCode: string | null) {
  const payload: any = { ...row, updated_by: userCode };
  if (!row.id) payload.created_by = userCode;
  const { data, error } = await sb
    .from("lg_fee_rule")
    .upsert(payload, { onConflict: "fee_rule_code" })
    .select("*")
    .single();
  if (error) throw error;
  return data as LgFeeRuleRow;
}

export async function setRuleStatus(id: string, status: "ACTIVE" | "INACTIVE" | "DRAFT", userCode: string | null) {
  const { error } = await sb.from("lg_fee_rule").update({ status, updated_by: userCode }).eq("id", id);
  if (error) throw error;
}

export interface LgFeeBundleRow {
  id: string;
  bundle_code: string;
  bundle_name: string;
  country_code: string | null;
  case_type_code: string | null;
  stage_code: string | null;
  trigger_event: string | null;
  status: string;
  description: string | null;
  items?: Array<{ id: string; fee_rule_id: string; sequence_no: number; mandatory: boolean; allow_waiver: boolean; rule?: LgFeeRuleRow }>;
}

export async function listFeeBundles(): Promise<LgFeeBundleRow[]> {
  const { data, error } = await sb
    .from("lg_fee_bundle")
    .select("*, lg_fee_bundle_item(*, lg_fee_rule(*))")
    .order("bundle_code");
  if (error) throw error;
  return (data ?? []).map((b: any) => ({
    ...b,
    items: (b.lg_fee_bundle_item || [])
      .sort((a: any, c: any) => a.sequence_no - c.sequence_no)
      .map((it: any) => ({
        id: it.id,
        fee_rule_id: it.fee_rule_id,
        sequence_no: it.sequence_no,
        mandatory: it.mandatory,
        allow_waiver: it.allow_waiver,
        rule: it.lg_fee_rule,
      })),
  }));
}

export async function upsertBundle(row: Partial<LgFeeBundleRow> & { bundle_code: string; bundle_name: string }, userCode: string | null) {
  const payload: any = { ...row, updated_by: userCode };
  delete payload.items;
  if (!row.id) payload.created_by = userCode;
  const { data, error } = await sb
    .from("lg_fee_bundle")
    .upsert(payload, { onConflict: "bundle_code" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setBundleItems(
  bundleId: string,
  items: Array<{ fee_rule_id: string; sequence_no: number; mandatory: boolean; allow_waiver: boolean }>,
) {
  await sb.from("lg_fee_bundle_item").delete().eq("bundle_id", bundleId);
  if (!items.length) return;
  const { error } = await sb
    .from("lg_fee_bundle_item")
    .insert(items.map((i) => ({ ...i, bundle_id: bundleId })));
  if (error) throw error;
}

export async function listBundlesForCase(caseTypeCode?: string | null): Promise<LgFeeBundleRow[]> {
  let q = sb.from("lg_fee_bundle").select("*, lg_fee_bundle_item(id)").eq("status", "ACTIVE");
  if (caseTypeCode) q = q.or(`case_type_code.is.null,case_type_code.eq.${caseTypeCode}`);
  const { data, error } = await q.order("bundle_code");
  if (error) throw error;
  return data ?? [];
}
