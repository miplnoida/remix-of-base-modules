import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface ActionArrangementLink {
  id: string;
  action_id: string;
  arrangement_id: string;
  allocated_amount: number;
  created_at: string;
}

export async function listArrangementsForCase(caseId: string) {
  const { data: actions } = await sb.from("lg_case_action").select("id").eq("case_id", caseId);
  const ids = (actions ?? []).map((r: any) => r.id);
  if (ids.length === 0) return [];
  const { data, error } = await sb
    .from("lg_case_action_arrangement")
    .select("*, arrangement:core_payment_arrangement(*), action:lg_case_action(id,liability_head_code,benefit_action_type)")
    .in("action_id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function listArrangementsForAction(actionId: string) {
  const { data, error } = await sb
    .from("lg_case_action_arrangement")
    .select("*, arrangement:core_payment_arrangement(*)")
    .eq("action_id", actionId);
  if (error) throw error;
  return data ?? [];
}

export async function linkArrangement(
  actionId: string,
  arrangementId: string,
  allocated: number,
  userCode: string | null,
): Promise<ActionArrangementLink> {
  const { data, error } = await sb
    .from("lg_case_action_arrangement")
    .insert({ action_id: actionId, arrangement_id: arrangementId, allocated_amount: allocated, created_by: userCode })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function unlinkArrangement(id: string): Promise<void> {
  const { error } = await sb.from("lg_case_action_arrangement").delete().eq("id", id);
  if (error) throw error;
}
