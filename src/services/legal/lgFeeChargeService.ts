import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Legal fees use the CENTRAL fee/head master (`tb_income_codes`).
 * Legal does NOT own a separate fee catalogue. Legal fee codes are tagged with
 * the `LEGAL_` prefix; consumers select from this central list.
 *
 * Posting target: `cn_invoices` + `cn_invoice_lines` (employer-account ledger).
 * The created invoice id is stored on `lg_fee_charge.employer_account_transaction_id`
 * so the employer account remains the financial source of truth.
 */

export interface FeeHead {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
}

export interface LgFeeCharge {
  id: string;
  lg_case_id: string;
  fee_head_ref_id: string | null;
  fee_head_code: string | null;
  description: string | null;
  amount: number;
  currency_code: string | null;
  charge_date: string;
  status: string;
  posted_invoice_ref_id: string | null;
  employer_account_id: string | null;
  charge_reason: string | null;
  employer_account_transaction_id: number | null;
  posting_status: string;
  posted_by: string | null;
  posted_at: string | null;
  created_by: string | null;
  created_at: string;
}

export async function listLegalFeeHeads(): Promise<FeeHead[]> {
  const { data, error } = await sb
    .from("tb_income_codes")
    .select("id, code, description, is_active")
    .eq("is_active", true)
    .like("code", "LEGAL\\_%") // postgres LIKE with explicit escape
    .order("code", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listLgFeeCharges(lgCaseId: string): Promise<LgFeeCharge[]> {
  const { data, error } = await sb
    .from("lg_fee_charge")
    .select("*")
    .eq("lg_case_id", lgCaseId)
    .order("charge_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function nextInvoiceNumber(): Promise<string> {
  const yr = new Date().getFullYear();
  const { data } = await sb
    .from("cn_invoices")
    .select("invoice_number")
    .like("invoice_number", `LGL-${yr}-%`)
    .order("invoice_number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.invoice_number;
  const next = last ? parseInt(String(last).split("-").pop() || "0", 10) + 1 : 1;
  return `LGL-${yr}-${String(next).padStart(6, "0")}`;
}

export interface CreateAndPostLegalFeeInput {
  lg_case_id: string;
  fee_head_ref_id: string;
  fee_head_code: string;
  amount: number;
  currency_code?: string;
  charge_date?: string;
  charge_reason?: string | null;
  description?: string | null;
  employer_id: string;          // au_er_master.er_no (varchar payer_id on cn_invoices)
  employer_account_id?: string | null;
  employer_name?: string | null;
  created_by?: string | null;
}

/**
 * Create the Legal fee charge AND post the matching transaction to the central
 * employer-account ledger (cn_invoices/cn_invoice_lines). Returns the new charge
 * with `employer_account_transaction_id` populated.
 */
export async function createAndPostLegalFee(input: CreateAndPostLegalFeeInput): Promise<LgFeeCharge> {
  const currency = input.currency_code || "XCD";
  const charge_date = input.charge_date || new Date().toISOString().slice(0, 10);
  const due = new Date(); due.setDate(due.getDate() + 14);

  // 1. Create the fee charge in PENDING state
  const { data: charge, error: cErr } = await sb
    .from("lg_fee_charge")
    .insert({
      lg_case_id: input.lg_case_id,
      fee_head_ref_id: input.fee_head_ref_id,
      fee_head_code: input.fee_head_code,
      description: input.description ?? input.fee_head_code,
      amount: input.amount,
      currency_code: currency,
      charge_date,
      status: "POSTED",
      charge_reason: input.charge_reason ?? null,
      employer_account_id: input.employer_account_id ?? null,
      posting_status: "POSTING",
      created_by: input.created_by ?? null,
    })
    .select("*")
    .single();
  if (cErr) throw cErr;

  try {
    // 2. Post to employer-account ledger (cn_invoices + cn_invoice_lines)
    const invoice_number = await nextInvoiceNumber();
    const { data: invoice, error: iErr } = await sb
      .from("cn_invoices")
      .insert({
        invoice_number,
        invoice_type: "LEGAL",
        payment_source: "LEGAL",
        payer_type: "ER",
        payer_id: input.employer_id,
        payer_name: input.employer_name ?? null,
        currency_code: currency,
        base_currency: currency,
        exchange_rate: 1,
        total_amount: input.amount,
        total_amount_base: input.amount,
        due_date: due.toISOString().slice(0, 10),
        status: "pending",
        internal_notes: `Legal fee ${input.fee_head_code} for case ${input.lg_case_id}`,
        public_notes: input.charge_reason ?? input.description ?? null,
        created_by: input.created_by ?? null,
      })
      .select("id")
      .single();
    if (iErr) throw iErr;

    const { error: lErr } = await sb
      .from("cn_invoice_lines")
      .insert({
        invoice_id: invoice.id,
        payment_code: input.fee_head_code,
        currency_code: currency,
        amount: input.amount,
        exchange_rate: 1,
        amount_base: input.amount,
        base_currency: currency,
        sort_order: 1,
      });
    if (lErr) throw lErr;

    // 3. Stamp the charge with the ledger transaction id
    const { data: updated, error: uErr } = await sb
      .from("lg_fee_charge")
      .update({
        employer_account_transaction_id: invoice.id,
        posted_invoice_ref_id: invoice.id,
        posting_status: "POSTED",
        posted_by: input.created_by ?? null,
        posted_at: new Date().toISOString(),
      })
      .eq("id", charge.id)
      .select("*")
      .single();
    if (uErr) throw uErr;

    // 4. Audit on the case
    await sb.from("lg_case_activity").insert({
      lg_case_id: input.lg_case_id,
      activity_type: "FEE_POSTED",
      description: `${input.fee_head_code} ${currency} ${input.amount.toFixed(2)} → invoice ${invoice_number}`,
    });

    return updated;
  } catch (postErr) {
    // Mark posting failure but keep the charge for retry
    await sb.from("lg_fee_charge")
      .update({ posting_status: "FAILED", status: "PENDING" })
      .eq("id", charge.id);
    throw postErr;
  }
}
