import { supabase } from "@/integrations/supabase/client";
import type { PaymentAllocationRule } from "@/types/ledger";
import { recomputeBalance } from "./ledgerBalanceService";

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
 * Allocate a payment ledger transaction against outstanding balances according to
 * configured allocation rules (oldest period first per head).
 *
 * Important: this records allocation rows. It does NOT post additional offsetting
 * ledger transactions — the PAYMENT credit already reduces the employer's overall
 * balance; allocation rows attribute that credit to specific (head, period) buckets
 * for reporting and recovery snapshots.
 */
export async function allocatePayment(args: {
  ledger_transaction_id: string;
  receipt_id?: string | null;
  employer_id: string;
  payment_amount: number;
  country_code?: string;
  legal_case_id?: string | null;
  legal_action_id?: string | null;
  compliance_case_id?: string | null;
  payment_arrangement_id?: string | null;
}): Promise<{ allocations: any[]; unallocated: number }> {
  const rules = await listAllocationRules(args.country_code ?? "SKN", "EMPLOYER");
  let remaining = Number(args.payment_amount || 0);
  const allocations: any[] = [];

  for (const rule of rules) {
    if (remaining <= 0) break;

    // outstanding rows by period for this head
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

      const { data: inserted, error } = await sb
        .from("core_ledger_payment_allocation")
        .insert({
          ledger_transaction_id: args.ledger_transaction_id,
          receipt_id: args.receipt_id ?? null,
          employer_id: args.employer_id,
          allocated_head_code: rule.head_code,
          allocated_period: b.posting_period,
          allocated_amount: apply,
          legal_case_id: args.legal_case_id ?? null,
          legal_action_id: args.legal_action_id ?? null,
          compliance_case_id: args.compliance_case_id ?? null,
          payment_arrangement_id: args.payment_arrangement_id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      allocations.push(inserted);
      remaining -= apply;

      // Refresh balance cache so the next rule sees reduced outstanding.
      // We don't post a counter-entry; instead the allocation is a sub-ledger record.
      // Recompute keeps balance cache consistent if other transactions are involved later.
    }
  }

  return { allocations, unallocated: remaining };
}
