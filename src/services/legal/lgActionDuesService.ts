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
 * Authoritative employer dues source.
 *
 * Live SSB ledger lives in `cn_c3_reported` (one row per payer/period/fund with
 * the calculated SS, HSD Levy and Severance/PE contribution + penalty amounts).
 * `cn_arrears` / `cn_arrears_liab` / `cn_payer_contrib_acct` are currently
 * empty in this database and are NOT the source of truth.
 *
 * We aggregate reported amounts by head and net off payments captured in
 * `cn_payment` (joined via `cn_payment_header` on payer_id + payer_type='ER').
 *
 * payerId here is the 6-char regno (er_master.regno = lg_case.employer_account_no).
 */
export async function fetchEmployerOutstandingByCode(payerId: string): Promise<ProposedAction[]> {
  if (!payerId) return [];

  // 1) Reported per period (principal + penalty), payer_type='ER'
  const { data: c3 } = await sb
    .from("cn_c3_reported")
    .select(
      "period,emp_ss_amt_calc,emp_ss_fines_due,emp_levy_amt_calc,emp_levy_penalty_amt,emp_pe_amt_calc,emp_pe_penalty_amt",
    )
    .eq("payer_id", payerId)
    .eq("payer_type", "ER");

  // 2) Payments by fund (no per-period split available reliably across legacy
  //    headers, so aggregate by fund_code and apply against principal).
  const { data: phdr } = await sb
    .from("cn_payment_header")
    .select("payment_id")
    .eq("payer_id", payerId)
    .eq("payer_type", "ER");
  const paymentIds = (phdr ?? []).map((p: any) => p.payment_id);
  let payByFund: Record<string, number> = { SS: 0, LV: 0, HSD: 0, PE: 0, SV: 0 };
  if (paymentIds.length > 0) {
    const { data: pays } = await sb
      .from("cn_payment")
      .select("payment_amount,fund_code")
      .in("payment_id", paymentIds);
    for (const p of pays ?? []) {
      const f = String(p.fund_code ?? "").toUpperCase();
      payByFund[f] = (payByFund[f] ?? 0) + Number(p.payment_amount ?? 0);
    }
  }
  const ssPaid = payByFund.SS ?? 0;
  const lvPaid = (payByFund.LV ?? 0) + (payByFund.HSD ?? 0);
  const pePaid = (payByFund.PE ?? 0) + (payByFund.SV ?? 0);

  // 3) Aggregate reported amounts + period range
  let ssPrincipal = 0,
    ssPenalty = 0,
    lvPrincipal = 0,
    lvPenalty = 0,
    pePrincipal = 0,
    pePenalty = 0;
  let minP: string | null = null,
    maxP: string | null = null;
  for (const r of c3 ?? []) {
    ssPrincipal += Number(r.emp_ss_amt_calc ?? 0);
    ssPenalty += Number(r.emp_ss_fines_due ?? 0);
    lvPrincipal += Number(r.emp_levy_amt_calc ?? 0);
    lvPenalty += Number(r.emp_levy_penalty_amt ?? 0);
    pePrincipal += Number(r.emp_pe_amt_calc ?? 0);
    pePenalty += Number(r.emp_pe_penalty_amt ?? 0);
    const p = r.period ? String(r.period).slice(0, 10) : null;
    if (p) {
      if (!minP || p < minP) minP = p;
      if (!maxP || p > maxP) maxP = p;
    }
  }

  const rows: ProposedAction[] = [];
  const push = (
    code: LiabilityHeadCode,
    principal: number,
    penalty: number,
    paid: number,
  ) => {
    const total = principal + penalty;
    const outstanding = Math.max(0, total - paid);
    if (total <= 0) return;
    rows.push({
      liability_head_code: code,
      period_from: minP,
      period_to: maxP,
      principal_amount: principal,
      penalty_amount: penalty,
      cost_amount: 0,
      amount_paid: Math.min(paid, total),
      outstanding_amount: outstanding,
      source: "cn_c3_reported",
    });
  };

  // Apply paid pro-rata between principal and penalty (principal first)
  const splitPaid = (principal: number, penalty: number, paid: number) => {
    const pPaid = Math.min(principal, paid);
    const penPaid = Math.min(penalty, Math.max(0, paid - principal));
    return { pPaid, penPaid };
  };
  {
    const { pPaid, penPaid } = splitPaid(ssPrincipal, ssPenalty, ssPaid);
    if (ssPrincipal > 0) push("SS_CONTRIBUTION", ssPrincipal, 0, pPaid);
    if (ssPenalty > 0) push("SS_PENALTY", 0, ssPenalty, penPaid);
  }
  {
    const { pPaid, penPaid } = splitPaid(lvPrincipal, lvPenalty, lvPaid);
    if (lvPrincipal > 0) push("HSD_LEVY_CONTRIBUTION", lvPrincipal, 0, pPaid);
    if (lvPenalty > 0) push("HSD_LEVY_PENALTY", 0, lvPenalty, penPaid);
  }
  {
    const { pPaid, penPaid } = splitPaid(pePrincipal, pePenalty, pePaid);
    if (pePrincipal > 0) push("SEVERANCE_CONTRIBUTION", pePrincipal, 0, pPaid);
    if (pePenalty > 0) push("SEVERANCE_PENALTY", 0, pePenalty, penPaid);
  }
  return rows;
}

