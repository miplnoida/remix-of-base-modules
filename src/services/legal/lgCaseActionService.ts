import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LiabilityHeadCode =
  | "SS_CONTRIBUTION"
  | "SS_PENALTY"
  | "HSD_LEVY_CONTRIBUTION"
  | "HSD_LEVY_PENALTY"
  | "SEVERANCE_CONTRIBUTION"
  | "SEVERANCE_PENALTY"
  | "COURT_COST"
  | "LEGAL_FEE";

export type BenefitActionType =
  | "BENEFIT_APPEAL"
  | "OVERPAYMENT_RECOVERY"
  | "FRAUD_REVIEW"
  | "ESTATE_RECOVERY"
  | "ELIGIBILITY_DISPUTE";

export type ActionKind = "LIABILITY" | "BENEFIT";
export type ActionStatus = "OPEN" | "IN_PROGRESS" | "SETTLED" | "CLOSED" | "WITHDRAWN";

export interface LgCaseAction {
  id: string;
  case_id: string;
  action_kind: ActionKind;
  action_no: string | null;
  liability_head_code: LiabilityHeadCode | null;
  period_from: string | null;
  period_to: string | null;
  principal_amount: number;
  penalty_amount: number;
  cost_amount: number;
  total_amount: number;
  amount_paid: number;
  outstanding_amount: number;
  benefit_action_type: BenefitActionType | null;
  insured_person_id: string | null;
  claim_id: string | null;
  benefit_type: string | null;
  overpayment_amount: number | null;
  suit_no: string | null;
  judgment_summons_no: string | null;
  writ_no: string | null;
  warrant_no: string | null;
  court_code: string | null;
  stage: string;
  status: ActionStatus;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const LIABILITY_HEAD_LABEL: Record<LiabilityHeadCode, string> = {
  SS_CONTRIBUTION: "SS Contribution",
  SS_PENALTY: "SS Penalty",
  HSD_LEVY_CONTRIBUTION: "HSD Levy Contribution",
  HSD_LEVY_PENALTY: "HSD Levy Penalty",
  SEVERANCE_CONTRIBUTION: "Severance Contribution",
  SEVERANCE_PENALTY: "Severance Penalty",
  COURT_COST: "Court Cost",
  LEGAL_FEE: "Legal Fee",
};

export const BENEFIT_ACTION_LABEL: Record<BenefitActionType, string> = {
  BENEFIT_APPEAL: "Benefit Appeal",
  OVERPAYMENT_RECOVERY: "Overpayment Recovery",
  FRAUD_REVIEW: "Fraud Review",
  ESTATE_RECOVERY: "Estate Recovery",
  ELIGIBILITY_DISPUTE: "Eligibility Dispute",
};

export async function listCaseActions(caseId: string): Promise<LgCaseAction[]> {
  const { data, error } = await sb
    .from("lg_case_action")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCaseActions(
  rows: Array<Partial<LgCaseAction> & { case_id: string; action_kind: ActionKind }>,
  userCode: string | null,
): Promise<LgCaseAction[]> {
  const stamped = rows.map((r) => {
    const total =
      r.total_amount ??
      Number(r.principal_amount ?? 0) + Number(r.penalty_amount ?? 0) + Number(r.cost_amount ?? 0);
    const paid = Number(r.amount_paid ?? 0);
    return {
      ...r,
      total_amount: total,
      amount_paid: paid,
      outstanding_amount: r.outstanding_amount ?? Math.max(0, total - paid),
      created_by: userCode,
      updated_by: userCode,
    };
  });
  const { data, error } = await sb.from("lg_case_action").insert(stamped).select("*");
  if (error) throw error;
  await refreshCaseOutstanding(rows[0]?.case_id);
  return data ?? [];
}

export async function updateCaseAction(
  id: string,
  patch: Partial<LgCaseAction>,
  userCode: string | null,
): Promise<LgCaseAction> {
  const next: any = { ...patch, updated_by: userCode };
  // recompute totals if amounts changed
  if (
    patch.principal_amount !== undefined ||
    patch.penalty_amount !== undefined ||
    patch.cost_amount !== undefined ||
    patch.amount_paid !== undefined
  ) {
    const { data: current } = await sb.from("lg_case_action").select("*").eq("id", id).maybeSingle();
    const merged = { ...current, ...patch };
    const total =
      Number(merged.principal_amount ?? 0) +
      Number(merged.penalty_amount ?? 0) +
      Number(merged.cost_amount ?? 0);
    next.total_amount = total;
    next.outstanding_amount = Math.max(0, total - Number(merged.amount_paid ?? 0));
  }
  const { data, error } = await sb.from("lg_case_action").update(next).eq("id", id).select("*").single();
  if (error) throw error;
  await refreshCaseOutstanding(data.case_id);
  return data;
}

export async function closeCaseAction(id: string, userCode: string | null): Promise<void> {
  const { error } = await sb
    .from("lg_case_action")
    .update({
      status: "CLOSED",
      closed_at: new Date().toISOString(),
      closed_by: userCode,
      updated_by: userCode,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function reopenCaseAction(id: string, userCode: string | null): Promise<void> {
  const { error } = await sb
    .from("lg_case_action")
    .update({ status: "OPEN", closed_at: null, closed_by: null, updated_by: userCode })
    .eq("id", id);
  if (error) throw error;
}

export async function refreshCaseOutstanding(caseId: string | undefined): Promise<void> {
  if (!caseId) return;
  const { data } = await sb
    .from("lg_case_action")
    .select("outstanding_amount,status")
    .eq("case_id", caseId);
  const total = (data ?? [])
    .filter((r: any) => r.status !== "CLOSED" && r.status !== "WITHDRAWN")
    .reduce((s: number, r: any) => s + Number(r.outstanding_amount ?? 0), 0);
  await sb.from("lg_case").update({ total_outstanding: total }).eq("id", caseId);
}

export async function canCloseParent(caseId: string): Promise<boolean> {
  const { data } = await sb
    .from("lg_case_action")
    .select("id,status")
    .eq("case_id", caseId);
  const rows = data ?? [];
  if (rows.length === 0) return true;
  return rows.every((r: any) => r.status === "CLOSED" || r.status === "WITHDRAWN");
}
