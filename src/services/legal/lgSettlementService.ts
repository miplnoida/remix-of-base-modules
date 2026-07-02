import { supabase } from "@/integrations/supabase/client";
import {
  assertLgSettlementTransition,
  normalizeLgSettlementStatus,
  type LgSettlementStatus,
} from "./lgSettlementStateMachine";

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
  const initial = normalizeLgSettlementStatus(input.status ?? "DRAFT");
  const { data, error } = await sb
    .from("lg_settlement")
    .insert({
      currency_code: "XCD",
      proposed_at: new Date().toISOString(),
      ...input,
      status: initial,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function transitionLgSettlement(
  id: string,
  next: LgSettlementStatus,
  patch: Partial<LgSettlementInsert> & { agreed_amount?: number | null; rejection_reason?: string | null } = {},
) {
  const { data: current, error: fetchErr } = await sb
    .from("lg_settlement")
    .select("id, status, lg_case_id")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;

  assertLgSettlementTransition(current?.status, next);

  const stamp: Record<string, string> = {};
  const now = new Date().toISOString();
  if (next === "APPROVED") stamp.accepted_at = now;
  if (next === "REJECTED") stamp.rejected_at = now;

  const { data, error } = await sb
    .from("lg_settlement")
    .update({ ...patch, ...stamp, status: next })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  if (next === "APPROVED" && data?.lg_case_id) {
    try {
      const { autoApplyForEvent } = await import("@/services/legal/lgFeeEngineService");
      autoApplyForEvent(data.lg_case_id, "SETTLEMENT_APPROVED", null).catch(() => {});
    } catch { /* non-blocking */ }
  }
  return data;
}

/** @deprecated Use transitionLgSettlement — enforces the state machine. */
export async function updateLgSettlement(
  id: string,
  patch: Partial<LgSettlementInsert> & { agreed_amount?: number | null; status?: string; rejection_reason?: string | null },
) {
  if (patch.status) {
    return transitionLgSettlement(id, normalizeLgSettlementStatus(patch.status), patch);
  }
  const { data, error } = await sb.from("lg_settlement").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
