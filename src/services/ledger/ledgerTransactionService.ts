import { supabase } from "@/integrations/supabase/client";
import type {
  LedgerTransaction,
  LedgerTransactionInput,
} from "@/types/ledger";
import { getOrCreateLedgerAccount } from "./ledgerAccountService";

const sb = supabase as any;

/**
 * Post a ledger transaction. Idempotent on
 * (source_module, source_record_type, source_record_id, head_code, posting_period).
 * Posted rows are immutable (enforced by DB trigger).
 */
export async function postTransaction(
  input: LedgerTransactionInput,
  employerName?: string | null,
): Promise<LedgerTransaction> {
  const debit = Number(input.debit_amount ?? 0);
  const credit = Number(input.credit_amount ?? 0);
  if (debit < 0 || credit < 0) throw new Error("debit/credit must be non-negative");
  if (debit === 0 && credit === 0) throw new Error("transaction must have non-zero amount");
  if (debit > 0 && credit > 0) throw new Error("transaction cannot have both debit and credit");

  const account = await getOrCreateLedgerAccount({
    employer_id: input.employer_id,
    employer_no: input.employer_no,
    employer_name: employerName ?? null,
  });

  // Idempotency check
  if (input.source_record_id) {
    const { data: dup } = await sb
      .from("core_employer_ledger_transaction")
      .select("*")
      .eq("source_module", input.source_module)
      .eq("source_record_type", input.source_record_type ?? "")
      .eq("source_record_id", input.source_record_id)
      .eq("head_code", input.head_code)
      .eq("posting_period", input.posting_period)
      .maybeSingle();
    if (dup) return dup as LedgerTransaction;
  }

  const { data, error } = await sb
    .from("core_employer_ledger_transaction")
    .insert({
      employer_ledger_account_id: account.id,
      employer_id: input.employer_id,
      employer_no: input.employer_no,
      transaction_date: input.transaction_date ?? new Date().toISOString().slice(0, 10),
      posting_period: input.posting_period,
      head_code: input.head_code,
      debit_amount: debit,
      credit_amount: credit,
      source_module: input.source_module,
      source_record_type: input.source_record_type ?? null,
      source_record_id: input.source_record_id ?? null,
      source_reference_no: input.source_reference_no ?? null,
      payment_code: input.payment_code ?? null,
      mop_code: input.mop_code ?? null,
      receipt_id: input.receipt_id ?? null,
      payment_id: input.payment_id ?? null,
      legal_case_id: input.legal_case_id ?? null,
      legal_action_id: input.legal_action_id ?? null,
      compliance_case_id: input.compliance_case_id ?? null,
      payment_arrangement_id: input.payment_arrangement_id ?? null,
      description: input.description ?? null,
      posting_status: input.posting_status ?? "POSTED",
      recalculation_run_id: input.recalculation_run_id ?? null,
      created_by: input.created_by ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LedgerTransaction;
}

/**
 * Reverse a posted transaction by creating an opposite entry.
 * Original is marked REVERSED.
 */
export async function reverseTransaction(
  transaction_id: string,
  reason: string,
  created_by?: string,
): Promise<LedgerTransaction> {
  const { data: orig, error: fetchErr } = await sb
    .from("core_employer_ledger_transaction")
    .select("*")
    .eq("id", transaction_id)
    .single();
  if (fetchErr) throw fetchErr;
  if (orig.posting_status !== "POSTED") {
    throw new Error(`Cannot reverse transaction in status ${orig.posting_status}`);
  }

  const reversal = await postTransaction({
    employer_id: orig.employer_id,
    employer_no: orig.employer_no,
    posting_period: orig.posting_period,
    head_code: orig.head_code,
    debit_amount: Number(orig.credit_amount),
    credit_amount: Number(orig.debit_amount),
    source_module: orig.source_module,
    source_record_type: `REVERSAL_OF:${orig.source_record_type ?? ""}`,
    source_record_id: `REV-${orig.id}`,
    description: `Reversal of txn #${orig.transaction_no}: ${reason}`,
    created_by,
  });

  await sb
    .from("core_employer_ledger_transaction")
    .update({ posting_status: "REVERSED", reversed_transaction_id: reversal.id })
    .eq("id", transaction_id);

  return reversal;
}

export async function listTransactions(filters: {
  employer_id?: string;
  period_from?: string;
  period_to?: string;
  head_code?: string;
  source_module?: string;
  limit?: number;
}): Promise<LedgerTransaction[]> {
  let q = sb
    .from("core_employer_ledger_transaction")
    .select("*")
    .order("transaction_no", { ascending: false });
  if (filters.employer_id) q = q.eq("employer_id", filters.employer_id);
  if (filters.head_code) q = q.eq("head_code", filters.head_code);
  if (filters.source_module) q = q.eq("source_module", filters.source_module);
  if (filters.period_from) q = q.gte("posting_period", filters.period_from);
  if (filters.period_to) q = q.lte("posting_period", filters.period_to);
  if (filters.limit) q = q.limit(filters.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as LedgerTransaction[];
}
