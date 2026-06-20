import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgSettlementInsert {
  lg_case_id: string;
  proposed_amount?: number | null;
  agreed_amount?: number | null;
  currency_code?: string | null;
  payment_arrangement_id?: string | null;
  terms?: string | null;
  status?: string;
  proposed_by?: string | null;
}

export async function listLgSettlements(lgCaseId: string) {
  const { data, error } = await sb
    .from("lg_settlement")
    .select("*")
    .eq("lg_case_id", lgCaseId)
    .order("proposed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLgSettlement(input: LgSettlementInsert) {
  const { data, error } = await sb
    .from("lg_settlement")
    .insert({
      currency_code: "XCD",
      status: "PROPOSED",
      proposed_at: new Date().toISOString(),
      ...input,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateLgSettlement(
  id: string,
  patch: Partial<LgSettlementInsert> & { agreed_amount?: number | null; status?: string; rejection_reason?: string | null }
) {
  const next: any = { ...patch };
  if (patch.status === "ACCEPTED" && !next.accepted_at) next.accepted_at = new Date().toISOString();
  if (patch.status === "REJECTED" && !next.rejected_at) next.rejected_at = new Date().toISOString();
  const { data, error } = await sb.from("lg_settlement").update(next).eq("id", id).select("*").single();
  if (error) throw error;
  if (patch.status === "ACCEPTED" && data?.lg_case_id) {
    try {
      const { autoApplyForEvent } = await import("@/services/legal/lgFeeEngineService");
      autoApplyForEvent(data.lg_case_id, "SETTLEMENT_APPROVED", null).catch(() => {});
    } catch { /* non-blocking */ }
  }
  return data;
}
