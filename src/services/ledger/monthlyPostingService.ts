import { supabase } from "@/integrations/supabase/client";
import { postTransaction } from "./ledgerTransactionService";
import { recomputeBalance } from "./ledgerBalanceService";
import { allocatePayment } from "./paymentAllocationService";
import { resolvePenaltyRate, computePenaltyAmount } from "./penaltyService";

const sb = supabase as any;

export interface MonthlyPostingResult {
  employer_id: string;
  period: string;
  posted_contribution: number;
  posted_payment: number;
  posted_penalty: number;
  allocations: number;
  warnings: string[];
}

/**
 * Post one period for one employer:
 *   - read C3 reported dues for SS/LV/PE -> contribution debits
 *   - read payments -> payment credit + allocation
 *   - compute and post penalty/fine for unpaid principals
 *   - recompute balances for impacted heads
 */
export async function postMonthlyForEmployer(args: {
  employer_id: string;
  employer_no: string;
  employer_name?: string | null;
  period: string; // YYYY-MM-01
  created_by?: string;
}): Promise<MonthlyPostingResult> {
  const warnings: string[] = [];
  const period = args.period;
  let posted_contribution = 0;
  let posted_payment = 0;
  let posted_penalty = 0;
  let allocations = 0;
  const headsTouched = new Set<string>();

  // ---- 1. Contributions from cn_c3_reported ----
  const { data: c3rows } = await sb
    .from("cn_c3_reported")
    .select(
      "id, payer_id, payer_type, period_from, period_to, emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc",
    )
    .eq("payer_id", args.employer_no)
    .eq("payer_type", "ER")
    .eq("period_from", period);

  for (const r of c3rows || []) {
    const map: Array<{ head: string; amt: number }> = [
      { head: "SS_CONTRIBUTION", amt: Number(r.emp_ss_amt_calc || 0) },
      { head: "LV_CONTRIBUTION", amt: Number(r.emp_levy_amt_calc || 0) },
      { head: "PE_CONTRIBUTION", amt: Number(r.emp_pe_amt_calc || 0) },
    ];
    for (const m of map) {
      if (m.amt <= 0) continue;
      await postTransaction(
        {
          employer_id: args.employer_id,
          employer_no: args.employer_no,
          posting_period: period,
          head_code: m.head,
          debit_amount: m.amt,
          source_module: "C3",
          source_record_type: "cn_c3_reported",
          source_record_id: String(r.id),
          description: `${m.head} due for period ${period}`,
          created_by: args.created_by,
        },
        args.employer_name,
      );
      posted_contribution += m.amt;
      headsTouched.add(m.head);
    }
  }

  // ---- 2. Payments from cn_payment / cn_payment_header ----
  const { data: paymentRows } = await sb
    .from("cn_payment_header")
    .select("id, payer_id, payer_type, payment_date, total_amount, receipt_no, mop_code")
    .eq("payer_id", args.employer_no)
    .eq("payer_type", "ER")
    .gte("payment_date", period);

  for (const p of paymentRows || []) {
    const amt = Number(p.total_amount || 0);
    if (amt <= 0) continue;
    const txn = await postTransaction(
      {
        employer_id: args.employer_id,
        employer_no: args.employer_no,
        posting_period: period,
        head_code: "PAYMENT",
        credit_amount: amt,
        source_module: "PAYMENTS",
        source_record_type: "cn_payment_header",
        source_record_id: String(p.id),
        receipt_id: p.receipt_no ?? null,
        mop_code: p.mop_code ?? null,
        description: `Payment receipt ${p.receipt_no ?? p.id}`,
        created_by: args.created_by,
      },
      args.employer_name,
    );
    posted_payment += amt;
    headsTouched.add("PAYMENT");

    // recompute balances on principal heads before allocation
    for (const h of ["SS_CONTRIBUTION", "LV_CONTRIBUTION", "PE_CONTRIBUTION"]) {
      await recomputeBalance(args.employer_id, period, h);
    }
    const { allocations: allocs, unallocated } = await allocatePayment({
      ledger_transaction_id: txn.id,
      receipt_id: p.receipt_no,
      employer_id: args.employer_id,
      payment_amount: amt,
    });
    allocations += allocs.length;
    if (unallocated > 0) {
      warnings.push(`Unallocated ${unallocated.toFixed(2)} on receipt ${p.receipt_no ?? p.id}`);
    }
  }

  // ---- 3. Penalty/fine on unpaid principals ----
  for (const { head, fund, penaltyHead } of [
    { head: "SS_CONTRIBUTION", fund: "SS" as const, penaltyHead: "SS_FINE" },
    { head: "LV_CONTRIBUTION", fund: "LV" as const, penaltyHead: "LV_PENALTY" },
    { head: "PE_CONTRIBUTION", fund: "PE" as const, penaltyHead: "PE_PENALTY" },
  ]) {
    const bal = await recomputeBalance(args.employer_id, period, head);
    if (bal.closing_balance <= 0) continue;
    const rate = await resolvePenaltyRate({
      fund_code: fund,
      period,
      is_first_month: true,
    });
    if (!rate) {
      warnings.push(`No penalty rate configured for ${fund} period ${period}`);
      continue;
    }
    const penalty = computePenaltyAmount(bal.closing_balance, rate);
    if (penalty <= 0) continue;
    await postTransaction(
      {
        employer_id: args.employer_id,
        employer_no: args.employer_no,
        posting_period: period,
        head_code: penaltyHead,
        debit_amount: penalty,
        source_module: "C3",
        source_record_type: "penalty_calc",
        source_record_id: `${args.employer_id}-${period}-${penaltyHead}`,
        description: `${penaltyHead} on outstanding ${bal.closing_balance.toFixed(2)} @ ${(rate.rate * 100).toFixed(2)}% (${rate.source})`,
        created_by: args.created_by,
      },
      args.employer_name,
    );
    posted_penalty += penalty;
    headsTouched.add(penaltyHead);
  }

  // ---- 4. Refresh balance cache for impacted heads ----
  for (const h of headsTouched) {
    await recomputeBalance(args.employer_id, period, h);
  }

  return {
    employer_id: args.employer_id,
    period,
    posted_contribution,
    posted_payment,
    posted_penalty,
    allocations,
    warnings,
  };
}
