/**
 * EPIC-07 — Judgment Compliance Engine
 * Single source of truth for lg_judgment_compliance lifecycle, calculations,
 * validations, breach detection and transitions.
 *
 * Consumes lg_order + lg_payment_allocation to compute compliance status
 * deterministically. UI must never recompute these values.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  JudgmentCompliance,
  JudgmentComplianceStatus,
} from "@/types/legal/postJudgment";

const sb = supabase as any;

// ---------- Transition rules ----------
const TRANSITIONS: Record<JudgmentComplianceStatus, JudgmentComplianceStatus[]> = {
  PENDING:      ["IN_PROGRESS", "COMPLIED", "OVERDUE", "OVERRIDDEN", "CLOSED"],
  IN_PROGRESS:  ["PARTIAL", "COMPLIED", "BREACHED", "OVERDUE", "OVERRIDDEN", "CLOSED"],
  PARTIAL:      ["COMPLIED", "BREACHED", "OVERDUE", "OVERRIDDEN", "CLOSED"],
  COMPLIED:     ["CLOSED"],
  BREACHED:     ["IN_PROGRESS", "PARTIAL", "COMPLIED", "OVERRIDDEN", "CLOSED"],
  OVERDUE:      ["IN_PROGRESS", "PARTIAL", "COMPLIED", "BREACHED", "OVERRIDDEN", "CLOSED"],
  OVERRIDDEN:   ["CLOSED"],
  CLOSED:       [],
};

export function canTransitionCompliance(from: string, to: JudgmentComplianceStatus) {
  const cur = (from ?? "PENDING") as JudgmentComplianceStatus;
  if (cur === to) return { allowed: false, reason: "Already in this status" };
  return TRANSITIONS[cur]?.includes(to)
    ? { allowed: true }
    : { allowed: false, reason: `Cannot move from ${cur} to ${to}` };
}

export function assertComplianceTransition(from: string, to: JudgmentComplianceStatus) {
  const r = canTransitionCompliance(from, to);
  if (!r.allowed) throw new Error(r.reason);
}

// ---------- Financial calculation ----------
export interface ComplianceCalc {
  total_ordered: number;
  paid: number;
  outstanding: number;
  compliance_pct: number;      // 0..100
  is_fully_paid: boolean;
  is_partially_paid: boolean;
  days_to_due: number | null;  // negative when overdue
  is_overdue: boolean;
}

export function computeComplianceCalc(row: Pick<
  JudgmentCompliance,
  "ordered_amount" | "interest_amount" | "court_costs" |
  "partial_compliance_amount" | "compliance_due_date" | "compliance_status"
>): ComplianceCalc {
  const total = Number(row.ordered_amount || 0)
              + Number(row.interest_amount || 0)
              + Number(row.court_costs || 0);
  const paid = Number(row.partial_compliance_amount || 0);
  const outstanding = Math.max(total - paid, 0);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  let days: number | null = null;
  if (row.compliance_due_date) {
    days = Math.floor(
      (new Date(row.compliance_due_date).getTime() - Date.now()) / 86_400_000,
    );
  }
  const terminal = ["COMPLIED", "CLOSED", "OVERRIDDEN"].includes(row.compliance_status);
  return {
    total_ordered: total,
    paid,
    outstanding,
    compliance_pct: pct,
    is_fully_paid: outstanding === 0 && total > 0,
    is_partially_paid: paid > 0 && outstanding > 0,
    days_to_due: days,
    is_overdue: !terminal && days !== null && days < 0 && outstanding > 0,
  };
}

/** Derives the correct status from financial reality — deterministic. */
export function deriveComplianceStatus(
  row: Pick<JudgmentCompliance, "ordered_amount" | "interest_amount" | "court_costs" |
    "partial_compliance_amount" | "compliance_due_date" | "compliance_status">,
): JudgmentComplianceStatus {
  if (["COMPLIED", "CLOSED", "OVERRIDDEN"].includes(row.compliance_status))
    return row.compliance_status;
  const c = computeComplianceCalc(row);
  if (c.is_fully_paid) return "COMPLIED";
  if (c.is_overdue && c.paid === 0) return "BREACHED";
  if (c.is_overdue) return "OVERDUE";
  if (c.is_partially_paid) return "PARTIAL";
  return row.compliance_status === "PENDING" ? "PENDING" : "IN_PROGRESS";
}

// ---------- Validations ----------
export function validateComplianceInput(input: Partial<JudgmentCompliance>): string[] {
  const errors: string[] = [];
  if (!input.order_id) errors.push("order_id is required");
  if (!input.case_id) errors.push("case_id is required");
  if ((input.ordered_amount ?? 0) < 0) errors.push("Ordered amount cannot be negative");
  if ((input.partial_compliance_amount ?? 0) < 0)
    errors.push("Paid amount cannot be negative");
  const total = Number(input.ordered_amount ?? 0)
              + Number(input.interest_amount ?? 0)
              + Number(input.court_costs ?? 0);
  if ((input.partial_compliance_amount ?? 0) > total + 0.01)
    errors.push("Paid amount cannot exceed total ordered + interest + costs");
  return errors;
}

// ---------- CRUD ----------
export async function listComplianceForCase(caseId: string): Promise<JudgmentCompliance[]> {
  const { data, error } = await sb.from("lg_judgment_compliance")
    .select("*").eq("case_id", caseId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getComplianceForOrder(orderId: string): Promise<JudgmentCompliance | null> {
  const { data, error } = await sb.from("lg_judgment_compliance")
    .select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCompliance(input: Partial<JudgmentCompliance>) {
  const errs = validateComplianceInput(input);
  if (errs.length) throw new Error(errs.join("; "));
  const derived = deriveComplianceStatus({
    ordered_amount: input.ordered_amount ?? 0,
    interest_amount: input.interest_amount ?? 0,
    court_costs: input.court_costs ?? 0,
    partial_compliance_amount: input.partial_compliance_amount ?? 0,
    compliance_due_date: input.compliance_due_date ?? null,
    compliance_status: (input.compliance_status ?? "PENDING") as JudgmentComplianceStatus,
  });
  const payload = { ...input, compliance_status: derived };
  const { data, error } = await sb.from("lg_judgment_compliance")
    .upsert(payload, { onConflict: "order_id" }).select("*").single();
  if (error) throw error;
  return data;
}

export async function transitionCompliance(
  id: string, to: JudgmentComplianceStatus, patch: Partial<JudgmentCompliance> = {},
) {
  const { data: cur, error: e1 } = await sb.from("lg_judgment_compliance")
    .select("compliance_status").eq("id", id).single();
  if (e1) throw e1;
  assertComplianceTransition(cur.compliance_status, to);
  const stamp: Record<string, unknown> = {};
  if (to === "CLOSED") { stamp.closed_at = new Date().toISOString(); }
  const { data, error } = await sb.from("lg_judgment_compliance")
    .update({ ...patch, ...stamp, compliance_status: to })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
