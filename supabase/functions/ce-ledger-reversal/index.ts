import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Returned Payment / Reversal Job
 * Detects returned or dishonored payments and reverses the original ledger credits.
 * 
 * Idempotency key: REV:<original_ledger_id>:v1
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run ?? false;
    const triggeredBy = body.triggered_by ?? "SYSTEM";

    const runId = crypto.randomUUID();
    await supabase.from("ce_job_run_log").insert({
      id: runId,
      job_name: "Payment Reversal Detection",
      job_code: "LEDGER-REVERSAL",
      run_type: "scheduled",
      parameters: { dry_run: dryRun },
      triggered_by: triggeredBy,
    });

    // Find cancelled receipts (status = 'C')
    const { data: cancelledReceipts } = await supabase
      .from("cn_receipt")
      .select("receipt_id, payment_id, receipt_total, status, cancel_reason, cancel_date")
      .eq("status", "C")
      .order("cancel_date", { ascending: false })
      .limit(200);

    let read = 0, posted = 0, skipped = 0, failed = 0;

    for (const receipt of (cancelledReceipts || [])) {
      read++;

      // Find corresponding ledger entries for this payment
      const { data: ledgerEntries } = await supabase
        .from("ce_employer_financial_ledger")
        .select("id, employer_id, employer_name, fund_type, period, credit_amount, idempotency_key")
        .eq("entry_type", "PAYMENT_RECEIVED")
        .eq("status", "POSTED")
        .like("source_pk", `${receipt.payment_id}-%`);

      if (!ledgerEntries?.length) { skipped++; continue; }

      for (const entry of ledgerEntries) {
        const revIdempKey = `REV:${entry.id}:v1`;

        const { data: existing } = await supabase
          .from("ce_employer_financial_ledger")
          .select("id")
          .eq("idempotency_key", revIdempKey)
          .maybeSingle();

        if (existing) { skipped++; continue; }
        if (dryRun) { posted++; continue; }

        // Create reversal entry (debit to reverse the credit)
        const { error } = await supabase.from("ce_employer_financial_ledger").insert({
          employer_id: entry.employer_id,
          employer_name: entry.employer_name,
          entry_type: "REVERSAL",
          fund_type: entry.fund_type,
          period: entry.period,
          debit_amount: Number(entry.credit_amount),
          credit_amount: 0,
          description: `Payment reversal - Receipt #${receipt.receipt_id} cancelled: ${receipt.cancel_reason || 'No reason'}`,
          idempotency_key: revIdempKey,
          reversal_of_id: entry.id,
          reversal_reason: receipt.cancel_reason || "Payment returned/dishonored",
          source_system: "REVERSAL",
          source_pk: `${receipt.payment_id}`,
          job_run_id: runId,
          posted_by: triggeredBy,
          status: "POSTED",
        });

        if (error) { failed++; } else { posted++; }
      }
    }

    await supabase.from("ce_job_run_log").update({
      run_end: new Date().toISOString(),
      status: failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      records_read: read, records_posted: posted, records_failed: failed, records_skipped: skipped,
      summary_message: `Reversal scan: ${posted} reversals created, ${skipped} skipped, ${failed} failed`,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId, dry_run: dryRun,
      records_read: read, records_posted: posted, records_skipped: skipped, records_failed: failed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
