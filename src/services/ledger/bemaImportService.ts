import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Compute a stable hash for dedupe in the staging table.
 * Using SubtleCrypto when available, falling back to a deterministic concat.
 */
async function sha(input: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(input);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtle: any = (globalThis as any).crypto?.subtle;
    if (subtle) {
      const buf = await subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    /* fall through */
  }
  // Deterministic fallback (not cryptographic).
  let h = 0;
  for (let i = 0; i < input.length; i++) h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  return `fb-${input.length}-${h}`;
}

export interface BemaImportSummary {
  payments_inserted: number;
  payments_skipped: number;
  liabilities_inserted: number;
  liabilities_skipped: number;
  errors: string[];
}

/**
 * Pulls payments from `bema_arrears_ledger` style sources into
 * `stg_bema_employer_payment` / `stg_bema_employer_liability`.
 *
 * Since BEMA's PowerBuilder schema is not directly available here, this importer
 * reads from `bema_arrears_ledger` (seed) and `cn_payment` / `cn_payment_header`
 * which represent the live SSB ledger and projects them into the staging shape.
 */
export async function importBemaForEmployer(payerCode: string): Promise<BemaImportSummary> {
  const summary: BemaImportSummary = {
    payments_inserted: 0,
    payments_skipped: 0,
    liabilities_inserted: 0,
    liabilities_skipped: 0,
    errors: [],
  };
  if (!payerCode) return summary;

  // -------- payments --------
  const { data: phdr } = await sb
    .from("cn_payment_header")
    .select("payment_id,payer_id,payer_type,payment_date,receipt_no,batch_number")
    .eq("payer_id", payerCode)
    .eq("payer_type", "ER");

  for (const h of phdr ?? []) {
    const { data: lines } = await sb
      .from("cn_payment")
      .select("payment_id,payment_amount,payment_code,mop_code,period,fund_code")
      .eq("payment_id", h.payment_id);
    for (const ln of lines ?? []) {
      const hashInput = `BEMA|PAY|${h.payment_id}|${ln.payment_code}|${ln.period}|${ln.payment_amount}|${ln.fund_code}`;
      const source_hash = await sha(hashInput);
      const { error } = await sb.from("stg_bema_employer_payment").insert({
        payer_type: h.payer_type,
        payer_id: h.payer_id,
        payment_id: String(h.payment_id),
        receipt_no: h.receipt_no ?? null,
        payment_amount: Number(ln.payment_amount ?? 0),
        payment_code: ln.payment_code ?? null,
        mop_code: ln.mop_code ?? null,
        period: ln.period ?? null,
        payment_date: h.payment_date ?? null,
        receipt_status: "ACTIVE",
        batch_number: h.batch_number ?? null,
        source_hash,
      });
      if (error) {
        if (String(error.message ?? "").includes("duplicate")) summary.payments_skipped++;
        else summary.errors.push(`payment ${h.payment_id}: ${error.message}`);
      } else summary.payments_inserted++;
    }
  }

  // -------- liabilities (legacy bema_arrears_ledger) --------
  const { data: arrears } = await sb
    .from("bema_arrears_ledger")
    .select("*")
    .eq("employer_regno", payerCode);

  for (const a of arrears ?? []) {
    const funds: Array<["SS" | "LV" | "PE", number, number]> = [
      ["SS", Number(a.ss_owed ?? 0), Number(a.penalties ?? 0)],
      ["LV", Number(a.levy_owed ?? 0), 0],
      ["PE", Number(a.ei_owed ?? 0), 0],
    ];
    for (const [fund, due, pen] of funds) {
      if (due <= 0 && pen <= 0) continue;
      const period = a.period ? `${a.period}-01` : null;
      const hashInput = `BEMA|LIAB|${payerCode}|${period}|${fund}|${due}|${pen}`;
      const source_hash = await sha(hashInput);
      const { error } = await sb.from("stg_bema_employer_liability").insert({
        employer_no: payerCode,
        period,
        fund_code: fund,
        contribution_due: due,
        contribution_paid: Number(a.amount_paid ?? 0),
        contribution_outstanding: Math.max(0, due - Number(a.amount_paid ?? 0)),
        penalty_fine_outstanding: pen,
        total_outstanding: Number(a.outstanding_balance ?? 0),
        source_statement_date: a.statement_date ?? null,
        source_hash,
      });
      if (error) {
        if (String(error.message ?? "").includes("duplicate")) summary.liabilities_skipped++;
        else summary.errors.push(`liab ${fund} ${period}: ${error.message}`);
      } else summary.liabilities_inserted++;
    }
  }

  return summary;
}
