import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Payment Incremental Posting Job
 * Detects finalized payments and posts PAYMENT_RECEIVED credits to the compliance ledger.
 * 
 * Idempotency key: PAY:<payment_id>:<payment_seq>:<fund_code>:v1
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
    const employerFilter = body.employer_id ?? null;
    const limit = body.limit ?? 500;

    const runId = crypto.randomUUID();
    await supabase.from("ce_job_run_log").insert({
      id: runId,
      job_name: "Payment Incremental Posting",
      job_code: "LEDGER-PAY-POST",
      run_type: body.force ? "manual" : "scheduled",
      parameters: { dry_run: dryRun, employer_id: employerFilter, limit },
      triggered_by: triggeredBy,
    });

    // Find payments with headers - join to get employer_id
    // Only consider receipts with status 'A' (verified/approved)
    let query = supabase
      .from("cn_receipt")
      .select("receipt_id, payment_id, receipt_total, status, created_at")
      .eq("status", "A")
      .order("created_at", { ascending: true })
      .limit(limit);

    const { data: receipts, error: rErr } = await query;
    if (rErr) throw rErr;

    let read = 0, posted = 0, skipped = 0, failed = 0;

    for (const receipt of (receipts || [])) {
      // Get payment header for employer context
      const { data: header } = await supabase
        .from("cn_payment_header")
        .select("payer_id, payer_type, payment_id, batch_number")
        .eq("payment_id", receipt.payment_id)
        .maybeSingle();

      if (!header || !header.payer_id) { skipped++; continue; }
      if (employerFilter && header.payer_id !== employerFilter) { skipped++; continue; }

      // Get payment lines for this payment_id
      const { data: payLines } = await supabase
        .from("cn_payment")
        .select("payment_sequence_no, payment_code, fund_code, payment_amount, payment_date, period")
        .eq("payment_id", receipt.payment_id);

      if (!payLines?.length) { skipped++; continue; }

      read++;

      for (const line of payLines) {
        const fundCode = line.fund_code || "GENERAL";
        const idempKey = `PAY:${receipt.payment_id}:${line.payment_sequence_no}:${fundCode}:v1`;
        const amount = Number(line.payment_amount || 0);
        if (amount <= 0) { skipped++; continue; }

        // Check idempotency
        const { data: existing } = await supabase
          .from("ce_employer_financial_ledger")
          .select("id")
          .eq("idempotency_key", idempKey)
          .maybeSingle();

        if (existing) { skipped++; continue; }

        if (dryRun) { posted++; continue; }

        const periodStr = line.period ? new Date(line.period).toISOString().slice(0, 7) : null;

        // Queue and post
        await supabase.from("ce_posting_queue").insert({
          source_system: "PAYMENT",
          source_table: "cn_payment",
          source_pk: `${receipt.payment_id}-${line.payment_sequence_no}`,
          event_type: "PAYMENT_RECEIVED",
          employer_id: header.payer_id,
          period: periodStr,
          fund_type: fundCode,
          amount,
          idempotency_key: idempKey,
          job_run_id: runId,
          created_by: triggeredBy,
        }).then(() => {});

        const { data: ledgerData, error: lErr } = await supabase
          .from("ce_employer_financial_ledger")
          .insert({
            employer_id: header.payer_id,
            employer_name: header.payer_id,
            entry_type: "PAYMENT_RECEIVED",
            fund_type: fundCode,
            period: periodStr,
            debit_amount: 0,
            credit_amount: amount,
            description: `Payment received - Receipt #${receipt.receipt_id}, Fund ${fundCode}`,
            idempotency_key: idempKey,
            source_system: "PAYMENT",
            source_pk: `${receipt.payment_id}-${line.payment_sequence_no}`,
            job_run_id: runId,
            posted_by: triggeredBy,
            status: "POSTED",
          })
          .select("id")
          .single();

        if (lErr) {
          if (lErr.code === "23505") { skipped++; } else { failed++; }
          await supabase.from("ce_posting_queue")
            .update({ status: lErr.code === "23505" ? "SKIPPED" : "FAILED", error_message: lErr.message, attempt_count: 1, last_attempt_at: new Date().toISOString() } as any)
            .eq("idempotency_key", idempKey);
        } else {
          await supabase.from("ce_posting_queue")
            .update({ status: "POSTED", ledger_entry_id: ledgerData?.id, processed_at: new Date().toISOString() } as any)
            .eq("idempotency_key", idempKey);
          posted++;
        }
      }
    }

    await supabase.from("ce_job_run_log").update({
      run_end: new Date().toISOString(),
      status: failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      records_read: read, records_posted: posted, records_failed: failed, records_skipped: skipped,
      summary_message: `Payment posting: ${posted} posted, ${skipped} skipped, ${failed} failed`,
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
