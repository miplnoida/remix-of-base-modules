/**
 * EPIC-07 — Legal Cost Recovery Engine
 * Tracks legal costs incurred, recovery status and allocation to
 * recoverable liabilities. Deterministic recovery percentages.
 */
import { supabase } from "@/integrations/supabase/client";
import type { LegalCost, LegalCostStatus, LegalCostType } from "@/types/legal/postJudgment";

const sb = supabase as any;

const TRANSITIONS: Record<LegalCostStatus, LegalCostStatus[]> = {
  OUTSTANDING: ["PARTIAL", "RECOVERED", "WRITTEN_OFF"],
  PARTIAL:     ["RECOVERED", "WRITTEN_OFF", "OUTSTANDING"],
  RECOVERED:   [],
  WRITTEN_OFF: [],
};

export function canTransitionCost(from: string, to: LegalCostStatus) {
  const cur = (from ?? "OUTSTANDING") as LegalCostStatus;
  if (cur === to) return { allowed: false, reason: "Already in this status" };
  return TRANSITIONS[cur]?.includes(to)
    ? { allowed: true } : { allowed: false, reason: `Cannot move cost from ${cur} to ${to}` };
}

/** Rules for whether a cost type is recoverable by default. */
export const COST_RECOVERABILITY: Record<LegalCostType, boolean> = {
  COURT_FEE:        true,
  ATTORNEY_FEE:     true,
  EXECUTION_COST:   true,
  SERVICE_COST:     true,
  INTEREST_AWARDED: true,
  OTHER:            false,
};

export interface LegalCostSummary {
  total_incurred: number;
  total_recovered: number;
  outstanding: number;
  recovery_pct: number;
  recoverable_incurred: number;
  written_off: number;
}

export function summariseLegalCosts(costs: LegalCost[]): LegalCostSummary {
  const total = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
  const recovered = costs.reduce((s, c) => s + Number(c.recovered_amount || 0), 0);
  const writtenOff = costs.filter((c) => c.status === "WRITTEN_OFF")
    .reduce((s, c) => s + Math.max(Number(c.amount) - Number(c.recovered_amount), 0), 0);
  const recoverable = costs.filter(
    (c) => c.is_court_awarded || COST_RECOVERABILITY[c.cost_type],
  ).reduce((s, c) => s + Number(c.amount || 0), 0);
  return {
    total_incurred: total,
    total_recovered: recovered,
    outstanding: Math.max(total - recovered - writtenOff, 0),
    recovery_pct: recoverable > 0 ? Math.min(100, (recovered / recoverable) * 100) : 0,
    recoverable_incurred: recoverable,
    written_off: writtenOff,
  };
}

/** Derive status from amounts. */
export function deriveCostStatus(c: Pick<LegalCost, "amount" | "recovered_amount" | "status">): LegalCostStatus {
  if (c.status === "WRITTEN_OFF") return "WRITTEN_OFF";
  const amt = Number(c.amount || 0);
  const rec = Number(c.recovered_amount || 0);
  if (rec >= amt && amt > 0) return "RECOVERED";
  if (rec > 0) return "PARTIAL";
  return "OUTSTANDING";
}

export function validateLegalCost(input: Partial<LegalCost>): string[] {
  const e: string[] = [];
  if (!input.case_id) e.push("case_id is required");
  if (!input.cost_type) e.push("cost_type is required");
  if (!input.incurred_date) e.push("incurred_date is required");
  if ((input.amount ?? 0) <= 0) e.push("Amount must be > 0");
  if ((input.recovered_amount ?? 0) > (input.amount ?? 0))
    e.push("Recovered amount cannot exceed cost amount");
  return e;
}

// ---------- CRUD ----------
export async function listLegalCosts(caseId: string): Promise<LegalCost[]> {
  const { data, error } = await sb.from("lg_legal_cost")
    .select("*").eq("case_id", caseId).order("incurred_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLegalCost(input: Partial<LegalCost>) {
  const errs = validateLegalCost(input);
  if (errs.length) throw new Error(errs.join("; "));
  const status = deriveCostStatus({
    amount: input.amount ?? 0, recovered_amount: input.recovered_amount ?? 0,
    status: (input.status ?? "OUTSTANDING") as LegalCostStatus,
  });
  const { data, error } = await sb.from("lg_legal_cost")
    .insert({ recovered_amount: 0, is_court_awarded: false, ...input, status })
    .select("*").single();
  if (error) throw error;
  return data;
}

export async function recordCostRecovery(id: string, amount: number) {
  if (amount <= 0) throw new Error("Amount must be > 0");
  const { data: cur, error } = await sb.from("lg_legal_cost")
    .select("*").eq("id", id).single();
  if (error) throw error;
  const newRec = Number(cur.recovered_amount || 0) + amount;
  if (newRec > Number(cur.amount)) throw new Error("Recovery would exceed cost");
  const status = deriveCostStatus({ amount: cur.amount, recovered_amount: newRec, status: cur.status });
  const { data, error: e2 } = await sb.from("lg_legal_cost")
    .update({ recovered_amount: newRec, status }).eq("id", id).select("*").single();
  if (e2) throw e2;
  return data;
}

export async function writeOffCost(id: string, reason: string) {
  const { data, error } = await sb.from("lg_legal_cost")
    .update({ status: "WRITTEN_OFF", notes: reason }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
