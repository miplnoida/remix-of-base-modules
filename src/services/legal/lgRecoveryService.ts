import { supabase } from "@/integrations/supabase/client";
import { listArrangementLinks, getArrangementSummary } from "@/services/legal/lgPaymentArrangementService";

const sb = supabase as any;

export interface LgRecoverySummary {
  breakdown: {
    principal: number;
    interest: number;
    penalties: number;
    court_cost: number;
    other_fees: number;
    total_debt: number;
    total_paid: number;
    outstanding: number;
    recovery_pct: number;
  };
  installments: {
    total: number;
    paid: number;
    overdue: number;
    missed: Array<{ id: string; number: number; due_date: string; amount: number; overdue_days: number | null }>;
  };
  arrangements: Array<{
    link: any;
    summary: Awaited<ReturnType<typeof getArrangementSummary>> | null;
    error?: string;
  }>;
  breach: {
    in_breach: boolean;
    reasons: string[];
  };
  linked_fee_charges: any[];
  case_snapshot: {
    claim_amount: number;
    total_outstanding: number;
  };
}

/**
 * Aggregate a full recovery picture for a legal case:
 * - Debt composition from referral items (principal/interest/penalty/court cost) and posted fee charges.
 * - Payment totals + installment compliance from every linked arrangement.
 * - Breach signal + missed installments feed the enforcement warning UI.
 *
 * All values come from real tables — no hardcoded numbers.
 */
export async function getLgCaseRecoverySummary(lgCaseId: string): Promise<LgRecoverySummary> {
  // Case-level snapshot (used as fallback for totals)
  const { data: caseRow } = await sb
    .from("lg_case")
    .select("claim_amount, total_outstanding, outstanding_amount_snapshot")
    .eq("id", lgCaseId)
    .maybeSingle();

  // Debt composition from referral items linked to any action on this case
  const { data: actions } = await sb
    .from("lg_case_action")
    .select("id")
    .eq("lg_case_id", lgCaseId);
  const actionIds = (actions ?? []).map((a: any) => a.id);

  let referralItems: any[] = [];
  if (actionIds.length > 0) {
    const { data } = await sb
      .from("core_legal_referral_item")
      .select("principal_amount, interest_amount, penalty_amount, cost_amount, total_amount, status")
      .in("lg_case_action_id", actionIds);
    referralItems = data ?? [];
  }

  // Posted fee charges (net of waivers). Court costs are surfaced separately via fee_head_code.
  const { data: feeCharges = [] } = await sb
    .from("lg_fee_charge")
    .select("id, amount, waived_amount, net_amount, fee_head_code, status, posting_status, charge_date, description")
    .eq("lg_case_id", lgCaseId);

  // Every linked payment arrangement (legacy compliance link table)
  const links = await listArrangementLinks(lgCaseId);
  const arrangements = await Promise.all(links.map(async (link) => {
    try {
      const summary = await getArrangementSummary(link.payment_arrangement_id);
      return { link, summary };
    } catch (e: any) {
      return { link, summary: null, error: e?.message ?? "Failed to load arrangement" };
    }
  }));

  // ── Aggregate debt breakdown ────────────────────────────────────────
  const referralTotals = referralItems.reduce((acc, r) => {
    acc.principal += Number(r.principal_amount ?? 0);
    acc.interest  += Number(r.interest_amount  ?? 0);
    acc.penalties += Number(r.penalty_amount   ?? 0);
    acc.court_cost += Number(r.cost_amount     ?? 0);
    return acc;
  }, { principal: 0, interest: 0, penalties: 0, court_cost: 0 });

  const feeChargeCourtCost = feeCharges
    .filter((c: any) => /COURT_COST|COURT_FEE/i.test(String(c.fee_head_code ?? "")))
    .reduce((s: number, c: any) => s + Number(c.net_amount ?? c.amount ?? 0), 0);

  const otherFees = feeCharges
    .filter((c: any) => !/COURT_COST|COURT_FEE/i.test(String(c.fee_head_code ?? "")))
    .reduce((s: number, c: any) => s + Number(c.net_amount ?? c.amount ?? 0), 0);

  const court_cost = referralTotals.court_cost + feeChargeCourtCost;

  const referralDebt = referralTotals.principal + referralTotals.interest + referralTotals.penalties + referralTotals.court_cost;

  // Arrangement roll-up
  const arrTotals = arrangements.reduce((acc, a) => {
    if (!a.summary) return acc;
    acc.total_debt += a.summary.totals.total_debt;
    acc.total_paid += a.summary.totals.total_paid;
    acc.installments_total += a.summary.totals.installments_total;
    acc.installments_paid  += a.summary.totals.installments_paid;
    acc.installments_overdue += a.summary.totals.installments_overdue;
    if (a.summary.totals.is_defaulted) acc.defaulted += 1;
    return acc;
  }, { total_debt: 0, total_paid: 0, installments_total: 0, installments_paid: 0, installments_overdue: 0, defaulted: 0 });

  // Prefer real referral-item + fee-charge derived debt; fall back to arrangement / case snapshot.
  const total_debt = referralDebt + otherFees
    || arrTotals.total_debt
    || Number(caseRow?.claim_amount ?? 0)
    || Number(caseRow?.total_outstanding ?? caseRow?.outstanding_amount_snapshot ?? 0);
  const total_paid = arrTotals.total_paid;
  const outstanding = Math.max(0, total_debt - total_paid);
  const recovery_pct = total_debt > 0 ? Math.min(100, (total_paid / total_debt) * 100) : 0;

  // Missed installments (across all arrangements)
  const missed: LgRecoverySummary["installments"]["missed"] = [];
  arrangements.forEach((a) => {
    if (!a.summary) return;
    a.summary.installments.forEach((i: any) => {
      const status = String(i.status ?? "").toUpperCase();
      const isOverdue = Boolean(i.is_overdue) || (status !== "PAID" && i.due_date && new Date(i.due_date) < new Date());
      if (isOverdue) {
        missed.push({
          id: i.id,
          number: i.installment_number,
          due_date: i.due_date,
          amount: Number(i.amount ?? 0) - Number(i.paid_amount ?? 0),
          overdue_days: i.overdue_days ?? null,
        });
      }
    });
  });
  missed.sort((a, b) => (a.due_date < b.due_date ? -1 : 1));

  // Breach signals
  const reasons: string[] = [];
  if (arrTotals.defaulted > 0) reasons.push(`${arrTotals.defaulted} arrangement(s) flagged as defaulted`);
  if (arrTotals.installments_overdue > 0) reasons.push(`${arrTotals.installments_overdue} overdue installment(s)`);

  return {
    breakdown: {
      principal: referralTotals.principal,
      interest: referralTotals.interest,
      penalties: referralTotals.penalties,
      court_cost,
      other_fees: otherFees,
      total_debt,
      total_paid,
      outstanding,
      recovery_pct,
    },
    installments: {
      total: arrTotals.installments_total,
      paid: arrTotals.installments_paid,
      overdue: arrTotals.installments_overdue,
      missed,
    },
    arrangements,
    breach: {
      in_breach: reasons.length > 0,
      reasons,
    },
    linked_fee_charges: feeCharges,
    case_snapshot: {
      claim_amount: Number(caseRow?.claim_amount ?? 0),
      total_outstanding: Number(caseRow?.total_outstanding ?? caseRow?.outstanding_amount_snapshot ?? 0),
    },
  };
}

/** Cross-case recovery KPIs for the dashboard. */
export async function getLegalDashboardRecoveryKpis() {
  const [{ data: pals = [] }, { data: installments = [] }, { data: arrangements = [] }] = await Promise.all([
    sb.from("lg_payment_arrangement_link").select("payment_arrangement_id, arranged_amount, paid_amount, outstanding_amount, active").eq("active", true),
    sb.from("ce_installments").select("id, arrangement_id, status, due_date, is_overdue"),
    sb.from("ce_payment_arrangements").select("id, total_debt, total_paid, breach_detected, max_missed_before_breach"),
  ]);

  const linkedArrIds = new Set((pals ?? []).map((p: any) => p.payment_arrangement_id));
  const linkedArrangements = (arrangements ?? []).filter((a: any) => linkedArrIds.has(a.id));

  const totalDebt = linkedArrangements.reduce((s: number, a: any) => s + Number(a.total_debt ?? 0), 0);
  const totalPaid = linkedArrangements.reduce((s: number, a: any) => s + Number(a.total_paid ?? 0), 0);
  const recoveryPct = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;

  const linkedInstallments = (installments ?? []).filter((i: any) => linkedArrIds.has(i.arrangement_id));
  const now = new Date();
  const missed = linkedInstallments.filter((i: any) => {
    const status = String(i.status ?? "").toUpperCase();
    if (status === "PAID") return false;
    if (i.is_overdue) return true;
    return i.due_date && new Date(i.due_date) < now;
  }).length;

  const arrangementsInBreach = linkedArrangements.filter((a: any) => Boolean(a.breach_detected)).length;

  return { recoveryPct, missedInstallments: missed, arrangementsInBreach };
}
