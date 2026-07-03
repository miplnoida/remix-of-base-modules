/**
 * EPIC-07 — Consent Order Engine
 * Deterministic lifecycle, installment compliance, breach detection and
 * variation workflow for lg_consent_order.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ConsentOrder, ConsentOrderStatus,
  ConsentInstallment, ConsentInstallmentStatus,
  ConsentVariation, BreachRecommendation,
} from "@/types/legal/postJudgment";

const sb = supabase as any;

// ---------- Transitions ----------
const TRANSITIONS: Record<ConsentOrderStatus, ConsentOrderStatus[]> = {
  DRAFT:                    ["PENDING_COURT_APPROVAL", "CANCELLED"],
  PENDING_COURT_APPROVAL:   ["ACTIVE", "CANCELLED"],
  ACTIVE:                   ["BREACHED", "COMPLETED", "CANCELLED"],
  BREACHED:                 ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED:                [],
  CANCELLED:                [],
};

export function canTransitionConsent(from: string, to: ConsentOrderStatus) {
  const cur = (from ?? "DRAFT") as ConsentOrderStatus;
  if (cur === to) return { allowed: false, reason: "Already in this status" };
  return TRANSITIONS[cur]?.includes(to)
    ? { allowed: true }
    : { allowed: false, reason: `Cannot move consent order from ${cur} to ${to}` };
}
export function assertConsentTransition(from: string, to: ConsentOrderStatus) {
  const r = canTransitionConsent(from, to);
  if (!r.allowed) throw new Error(r.reason);
}

// ---------- Breach rules ----------
export const CONSENT_BREACH_RULES = {
  missedThreshold: 2,          // >= 2 missed installments = BREACH
  gracePeriodDays: 7,          // installment is only "MISSED" after 7d grace
  variationOnBreach: true,     // enable VARIATION recommendation
};

export interface ConsentComplianceCalc {
  total_amount: number;
  paid: number;
  outstanding: number;
  paid_pct: number;
  missed_count: number;
  paid_count: number;
  pending_count: number;
  next_due_date: string | null;
  next_due_amount: number;
  is_breached: boolean;
  recommendation: BreachRecommendation;
}

export function computeConsentCompliance(
  order: Pick<ConsentOrder, "total_amount" | "paid_amount">,
  installments: ConsentInstallment[],
): ConsentComplianceCalc {
  const total = Number(order.total_amount || 0);
  const paid = Number(order.paid_amount || 0);
  const outstanding = Math.max(total - paid, 0);
  const missed = installments.filter((i) => i.status === "MISSED").length;
  const paidCnt = installments.filter((i) => i.status === "PAID").length;
  const pending = installments.filter(
    (i) => i.status === "PENDING" || i.status === "PARTIAL",
  );
  const nextDue = pending.sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
  )[0];
  const isBreached = missed >= CONSENT_BREACH_RULES.missedThreshold;
  let rec: BreachRecommendation = null;
  if (isBreached) {
    if (missed >= 4) rec = "FURTHER_ENFORCEMENT";
    else if (missed >= 3) rec = "COURT_APPLICATION";
    else if (CONSENT_BREACH_RULES.variationOnBreach) rec = "VARIATION";
  }
  return {
    total_amount: total,
    paid,
    outstanding,
    paid_pct: total > 0 ? Math.min(100, (paid / total) * 100) : 0,
    missed_count: missed,
    paid_count: paidCnt,
    pending_count: pending.length,
    next_due_date: nextDue?.due_date ?? null,
    next_due_amount: nextDue ? Number(nextDue.amount_due - nextDue.amount_paid) : 0,
    is_breached: isBreached,
    recommendation: rec,
  };
}

/** Derive installment status from due date + payment. */
export function deriveInstallmentStatus(
  i: Pick<ConsentInstallment, "due_date" | "amount_due" | "amount_paid" | "status">,
): ConsentInstallmentStatus {
  if (i.status === "WAIVED") return "WAIVED";
  const due = Number(i.amount_due || 0);
  const paid = Number(i.amount_paid || 0);
  if (paid >= due && due > 0) return "PAID";
  if (paid > 0) return "PARTIAL";
  const graceMs = CONSENT_BREACH_RULES.gracePeriodDays * 86_400_000;
  const overdue = Date.now() > new Date(i.due_date).getTime() + graceMs;
  return overdue ? "MISSED" : "PENDING";
}

// ---------- Validations ----------
export function validateConsentOrder(input: Partial<ConsentOrder>): string[] {
  const e: string[] = [];
  if (!input.case_id) e.push("case_id is required");
  if (!input.title) e.push("Title is required");
  if ((input.total_amount ?? 0) <= 0) e.push("Total amount must be > 0");
  if ((input.installment_count ?? 0) <= 0) e.push("Installment count must be > 0");
  if (input.start_date && input.end_date &&
      new Date(input.start_date) > new Date(input.end_date))
    e.push("Start date must be before end date");
  return e;
}

// ---------- CRUD ----------
export async function listConsentOrders(caseId: string): Promise<ConsentOrder[]> {
  const { data, error } = await sb.from("lg_consent_order")
    .select("*").eq("case_id", caseId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getConsentOrder(id: string) {
  const { data, error } = await sb.from("lg_consent_order").select("*").eq("id", id).single();
  if (error) throw error;
  return data as ConsentOrder;
}

export async function listInstallments(consentOrderId: string): Promise<ConsentInstallment[]> {
  const { data, error } = await sb.from("lg_consent_installment")
    .select("*").eq("consent_order_id", consentOrderId).order("seq");
  if (error) throw error;
  return data ?? [];
}

export async function createConsentOrder(input: Partial<ConsentOrder>) {
  const errs = validateConsentOrder(input);
  if (errs.length) throw new Error(errs.join("; "));
  const { data, error } = await sb.from("lg_consent_order")
    .insert({ status: "DRAFT", paid_amount: 0, missed_installments: 0, ...input })
    .select("*").single();
  if (error) throw error;
  return data;
}

export async function transitionConsentOrder(
  id: string, to: ConsentOrderStatus, patch: Partial<ConsentOrder> = {},
) {
  const { data: cur, error: e1 } = await sb.from("lg_consent_order")
    .select("status").eq("id", id).single();
  if (e1) throw e1;
  assertConsentTransition(cur.status, to);
  const stamp: Record<string, unknown> = {};
  if (to === "ACTIVE") stamp.court_approved_at = new Date().toISOString();
  const { data, error } = await sb.from("lg_consent_order")
    .update({ ...patch, ...stamp, status: to }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function recordInstallmentPayment(
  installmentId: string, amount: number, paidAt: string = new Date().toISOString(),
) {
  if (amount <= 0) throw new Error("Amount must be > 0");
  const { data: i, error: e1 } = await sb.from("lg_consent_installment")
    .select("*").eq("id", installmentId).single();
  if (e1) throw e1;
  const newPaid = Number(i.amount_paid || 0) + amount;
  const status = deriveInstallmentStatus({
    due_date: i.due_date, amount_due: i.amount_due,
    amount_paid: newPaid, status: i.status,
  });
  const { data, error } = await sb.from("lg_consent_installment")
    .update({ amount_paid: newPaid, paid_at: paidAt, status })
    .eq("id", installmentId).select("*").single();
  if (error) throw error;
  return data;
}

/** Recompute rollups on lg_consent_order from installments + status. */
export async function refreshConsentOrderRollups(consentOrderId: string) {
  const [order, installments] = await Promise.all([
    getConsentOrder(consentOrderId), listInstallments(consentOrderId),
  ]);
  const paid = installments.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const compliance = computeConsentCompliance({ ...order, paid_amount: paid }, installments);
  const nextStatus: ConsentOrderStatus =
    order.status === "ACTIVE" && compliance.is_breached ? "BREACHED"
    : order.status === "BREACHED" && !compliance.is_breached && compliance.outstanding > 0 ? "ACTIVE"
    : compliance.outstanding === 0 && order.total_amount > 0 ? "COMPLETED"
    : order.status;
  const patch: Partial<ConsentOrder> = {
    paid_amount: paid,
    missed_installments: compliance.missed_count,
    breach_recommendation: compliance.recommendation,
  };
  if (nextStatus !== order.status) {
    return transitionConsentOrder(consentOrderId, nextStatus, patch);
  }
  const { data, error } = await sb.from("lg_consent_order")
    .update(patch).eq("id", consentOrderId).select("*").single();
  if (error) throw error;
  return data;
}

export async function requestVariation(input: Partial<ConsentVariation>) {
  if (!input.consent_order_id) throw new Error("consent_order_id required");
  if (!input.variation_type) throw new Error("variation_type required");
  const { data, error } = await sb.from("lg_consent_variation")
    .insert({ status: "PENDING", requested_at: new Date().toISOString(), ...input })
    .select("*").single();
  if (error) throw error;
  return data;
}
