import { supabase } from "@/integrations/supabase/client";
import type { PaymentAllocationRule } from "@/types/ledger";

const sb = supabase as any;

export async function listAllocationRules(
  country_code = "SKN",
  debtor_type = "EMPLOYER",
): Promise<PaymentAllocationRule[]> {
  const { data, error } = await sb
    .from("core_payment_allocation_rule")
    .select("*")
    .eq("country_code", country_code)
    .eq("debtor_type", debtor_type)
    .eq("is_active", true)
    .order("allocation_order", { ascending: true });
  if (error) throw error;
  return (data || []) as PaymentAllocationRule[];
}

/**
 * Allocate a payment against outstanding balances using configured rules.
 * Produces one allocation row per payment with the per-(head, period) breakdown
 * stored as JSON. Does NOT post offsetting ledger transactions — the PAYMENT
 * credit already moves the employer's overall balance; the allocation row
 * attributes that credit for reporting and recovery.
 */
export async function allocatePayment(args: {
  payment_id: string;
  receipt_id?: string | null;
  employer_id: string; // regno
  payment_date: string;
  payment_amount: number;
  country_code?: string;
  rule_code?: string | null;
  created_by?: string;
}): Promise<{ allocation_id: string; breakdown: any[]; unallocated: number }> {
  const rules = await listAllocationRules(args.country_code ?? "SKN", "EMPLOYER");
  let remaining = Number(args.payment_amount || 0);
  const breakdown: Array<{ head_code: string; period: string; amount: number }> = [];

  for (const rule of rules) {
    if (remaining <= 0) break;

    const { data: balRows } = await sb
      .from("core_employer_ledger_balance")
      .select("posting_period, closing_balance")
      .eq("employer_id", args.employer_id)
      .eq("head_code", rule.head_code)
      .gt("closing_balance", 0)
      .order("posting_period", { ascending: rule.oldest_period_first });

    for (const b of balRows || []) {
      if (remaining <= 0) break;
      const outstanding = Number(b.closing_balance);
      if (outstanding <= 0) continue;
      const apply = Math.min(remaining, outstanding);
      if (apply <= 0) continue;
      breakdown.push({
        head_code: rule.head_code,
        period: b.posting_period,
        amount: apply,
      });
      remaining -= apply;
    }
  }

  const allocated = Number(args.payment_amount || 0) - remaining;

  const { data: inserted, error } = await sb
    .from("core_ledger_payment_allocation")
    .insert({
      employer_id: args.employer_id,
      payment_id: args.payment_id,
      receipt_id: args.receipt_id ?? null,
      payment_date: args.payment_date,
      total_amount: Number(args.payment_amount || 0),
      allocated_amount: allocated,
      unallocated_amount: remaining,
      allocation_breakdown: breakdown,
      rule_code: args.rule_code ?? null,
      created_by: args.created_by ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  return { allocation_id: inserted.id, breakdown, unallocated: remaining };
}
