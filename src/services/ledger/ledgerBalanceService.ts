import { supabase } from "@/integrations/supabase/client";
import type { LedgerBalance } from "@/types/ledger";

const sb = supabase as any;

/**
 * Recompute the balance cache for (employer, posting_period, head) by
 * aggregating transactions. Opening balance is the closing of the prior period
 * for the same head; closing = opening + debit_total - credit_total.
 */
export async function recomputeBalance(
  employer_id: string,
  posting_period: string,
  head_code: string,
): Promise<LedgerBalance> {
  // current-period totals
  const { data: txns, error } = await sb
    .from("core_employer_ledger_transaction")
    .select("debit_amount, credit_amount, posting_status")
    .eq("employer_id", employer_id)
    .eq("posting_period", posting_period)
    .eq("head_code", head_code);
  if (error) throw error;

  let debit_total = 0;
  let credit_total = 0;
  for (const t of txns || []) {
    if (t.posting_status === "REVERSED") continue;
    debit_total += Number(t.debit_amount || 0);
    credit_total += Number(t.credit_amount || 0);
  }

  // opening = closing of prior period (most recent prior posting_period < current)
  const { data: prior } = await sb
    .from("core_employer_ledger_balance")
    .select("closing_balance, posting_period")
    .eq("employer_id", employer_id)
    .eq("head_code", head_code)
    .lt("posting_period", posting_period)
    .order("posting_period", { ascending: false })
    .limit(1)
    .maybeSingle();
  const opening = Number(prior?.closing_balance ?? 0);
  const closing = opening + debit_total - credit_total;

  const row: LedgerBalance = {
    employer_id,
    posting_period,
    head_code,
    opening_balance: opening,
    debit_total,
    credit_total,
    closing_balance: closing,
    last_calculated_at: new Date().toISOString(),
  };
  const { error: upErr } = await sb
    .from("core_employer_ledger_balance")
    .upsert(row, { onConflict: "employer_id,posting_period,head_code" });
  if (upErr) throw upErr;
  return row;
}

export async function getBalances(filters: {
  employer_id: string;
  period_from?: string;
  period_to?: string;
  head_code?: string;
}): Promise<LedgerBalance[]> {
  let q = sb
    .from("core_employer_ledger_balance")
    .select("*")
    .eq("employer_id", filters.employer_id)
    .order("posting_period", { ascending: true });
  if (filters.head_code) q = q.eq("head_code", filters.head_code);
  if (filters.period_from) q = q.gte("posting_period", filters.period_from);
  if (filters.period_to) q = q.lte("posting_period", filters.period_to);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as LedgerBalance[];
}

/**
 * Net outstanding (closing) by head for an employer as of an optional period.
 */
export async function getOutstandingByHead(
  employer_id: string,
  asOfPeriod?: string,
): Promise<Record<string, number>> {
  let q = sb
    .from("core_employer_ledger_balance")
    .select("head_code, posting_period, closing_balance")
    .eq("employer_id", employer_id);
  if (asOfPeriod) q = q.lte("posting_period", asOfPeriod);
  const { data, error } = await q;
  if (error) throw error;

  // pick the latest posting_period per head_code and use its closing balance
  const latestByHead: Record<string, { period: string; closing: number }> = {};
  for (const r of data || []) {
    const head = r.head_code as string;
    const period = r.posting_period as string;
    const closing = Number(r.closing_balance || 0);
    if (!latestByHead[head] || period > latestByHead[head].period) {
      latestByHead[head] = { period, closing };
    }
  }
  const out: Record<string, number> = {};
  for (const [head, v] of Object.entries(latestByHead)) out[head] = v.closing;
  return out;
}
