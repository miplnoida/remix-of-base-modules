import { supabase } from "@/integrations/supabase/client";
import type { LiabilityHeadCode } from "./lgCaseActionService";

const sb = supabase as any;

export interface ProposedAction {
  liability_head_code: LiabilityHeadCode;
  period_from: string | null;
  period_to: string | null;
  principal_amount: number;
  penalty_amount: number;
  cost_amount: number;
  amount_paid: number;
  outstanding_amount: number;
  source: string;
}

/**
 * Fetch outstanding dues for an employer from existing arrears tables and map to
 * canonical liability heads. Aggregated client-side.
 */
export async function fetchEmployerOutstanding(employerId: string): Promise<ProposedAction[]> {
  const rows: ProposedAction[] = [];

  // bema_arrears_ledger - keyed by employer uuid
  const { data: bema } = await sb
    .from("bema_arrears_ledger")
    .select("*")
    .eq("employer_id", employerId);

  for (const r of bema ?? []) {
    const principalSs = Number(r.ss_owed ?? 0);
    const principalLevy = Number(r.levy_owed ?? 0);
    const principalEi = Number(r.ei_owed ?? 0);
    const penalty = Number(r.penalties ?? 0);
    const paid = Number(r.amount_paid ?? 0);
    const outstanding = Number(r.outstanding_balance ?? 0);
    if (principalSs > 0) {
      rows.push({
        liability_head_code: "SS_CONTRIBUTION",
        period_from: r.period ? `${r.period}-01` : null,
        period_to: r.period ? `${r.period}-01` : null,
        principal_amount: principalSs,
        penalty_amount: 0,
        cost_amount: 0,
        amount_paid: 0,
        outstanding_amount: principalSs,
        source: "bema_arrears_ledger",
      });
    }
    if (principalLevy > 0) {
      rows.push({
        liability_head_code: "HSD_LEVY_CONTRIBUTION",
        period_from: r.period ? `${r.period}-01` : null,
        period_to: r.period ? `${r.period}-01` : null,
        principal_amount: principalLevy,
        penalty_amount: 0,
        cost_amount: 0,
        amount_paid: 0,
        outstanding_amount: principalLevy,
        source: "bema_arrears_ledger",
      });
    }
    if (principalEi > 0) {
      rows.push({
        liability_head_code: "SEVERANCE_CONTRIBUTION",
        period_from: r.period ? `${r.period}-01` : null,
        period_to: r.period ? `${r.period}-01` : null,
        principal_amount: principalEi,
        penalty_amount: 0,
        cost_amount: 0,
        amount_paid: 0,
        outstanding_amount: principalEi,
        source: "bema_arrears_ledger",
      });
    }
    if (penalty > 0) {
      rows.push({
        liability_head_code: "SS_PENALTY",
        period_from: r.period ? `${r.period}-01` : null,
        period_to: r.period ? `${r.period}-01` : null,
        principal_amount: 0,
        penalty_amount: penalty,
        cost_amount: 0,
        amount_paid: 0,
        outstanding_amount: penalty,
        source: "bema_arrears_ledger",
      });
    }
    void paid; void outstanding;
  }

  // Aggregate identical heads/periods
  const grouped = new Map<string, ProposedAction>();
  for (const r of rows) {
    const key = `${r.liability_head_code}|${r.period_from ?? ""}|${r.period_to ?? ""}`;
    const cur = grouped.get(key);
    if (cur) {
      cur.principal_amount += r.principal_amount;
      cur.penalty_amount += r.penalty_amount;
      cur.cost_amount += r.cost_amount;
      cur.amount_paid += r.amount_paid;
      cur.outstanding_amount += r.outstanding_amount;
    } else {
      grouped.set(key, { ...r });
    }
  }
  return Array.from(grouped.values()).filter((r) => r.outstanding_amount > 0);
}

/**
 * Fetch outstanding by employer external account code (au_er_master.er_no etc.)
 * Falls back to cn_arrears using the 6-char payer_id.
 */
export async function fetchEmployerOutstandingByCode(payerId: string): Promise<ProposedAction[]> {
  const { data } = await sb
    .from("cn_arrears_liab")
    .select("*")
    .eq("payer_id", payerId);

  const rows: ProposedAction[] = [];
  for (const r of data ?? []) {
    const principal = Number(r.total_c3 ?? 0);
    const penalty = Number(r.penalties ?? 0);
    const period = r.summary_period ? String(r.summary_period).slice(0, 10) : null;
    const headByFund: Record<string, LiabilityHeadCode> = {
      SS: "SS_CONTRIBUTION",
      LV: "HSD_LEVY_CONTRIBUTION",
      HSD: "HSD_LEVY_CONTRIBUTION",
      PE: "SEVERANCE_CONTRIBUTION",
      SV: "SEVERANCE_CONTRIBUTION",
    };
    const code = headByFund[String(r.fund_code ?? "").toUpperCase()] ?? "SS_CONTRIBUTION";
    if (principal > 0) {
      rows.push({
        liability_head_code: code,
        period_from: period,
        period_to: period,
        principal_amount: principal,
        penalty_amount: 0,
        cost_amount: 0,
        amount_paid: 0,
        outstanding_amount: principal,
        source: "cn_arrears_liab",
      });
    }
    if (penalty > 0) {
      const penCode: LiabilityHeadCode =
        code === "SS_CONTRIBUTION"
          ? "SS_PENALTY"
          : code === "HSD_LEVY_CONTRIBUTION"
            ? "HSD_LEVY_PENALTY"
            : "SEVERANCE_PENALTY";
      rows.push({
        liability_head_code: penCode,
        period_from: period,
        period_to: period,
        principal_amount: 0,
        penalty_amount: penalty,
        cost_amount: 0,
        amount_paid: 0,
        outstanding_amount: penalty,
        source: "cn_arrears_liab",
      });
    }
  }
  return rows;
}
