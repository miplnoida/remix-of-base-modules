import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Historical Backfill Job
 * Populates compliance ledger from historical C3 and payment data.
 * Supports employer-by-employer and period-by-period execution.
 * Fully idempotent and resumable.
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
    const employerId = body.employer_id ?? null;
    const fromPeriod = body.from_period ?? null;
    const toPeriod = body.to_period ?? null;
    const batchSize = body.batch_size ?? 200;
    const offset = body.offset ?? 0;

    const runId = crypto.randomUUID();
    await supabase.from("ce_job_run_log").insert({
      id: runId,
      job_name: "Historical Backfill",
      job_code: "LEDGER-BACKFILL",
      run_type: "manual",
      parameters: { dry_run: dryRun, employer_id: employerId, from_period: fromPeriod, to_period: toPeriod, batch_size: batchSize, offset },
      triggered_by: triggeredBy,
    });

    let read = 0, posted = 0, skipped = 0, failed = 0;

    // ── Phase 1: Backfill C3 contributions ──
    let c3Query = supabase
      .from("cn_c3_reported")
      .select("id, payer_id, payer_name, period, sequence_no, emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc, emp_levy_penalty_amt, emp_pe_penalty_amt, emp_ss_fines_due, posting_status")
      .in("posting_status", ["V", "P"])
      .order("period", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (employerId) c3Query = c3Query.eq("payer_id", employerId);
    if (fromPeriod) c3Query = c3Query.gte("period", fromPeriod);
    if (toPeriod) c3Query = c3Query.lte("period", toPeriod);

    const { data: c3Records } = await c3Query;

    for (const c3 of (c3Records || [])) {
      read++;
      const periodStr = c3.period ? new Date(c3.period).toISOString().slice(0, 7) : "unknown";

      const entries = [
        { fund: "SS", amount: Number(c3.emp_ss_amt_calc || 0), type: "C3_DUES_POSTED" },
        { fund: "LEVY", amount: Number(c3.emp_levy_amt_calc || 0), type: "C3_DUES_POSTED" },
        { fund: "PE", amount: Number(c3.emp_pe_amt_calc || 0), type: "C3_DUES_POSTED" },
        { fund: "LEVY", amount: Number(c3.emp_levy_penalty_amt || 0), type: "PENALTY_ASSESSED" },
        { fund: "PE", amount: Number(c3.emp_pe_penalty_amt || 0), type: "PENALTY_ASSESSED" },
        { fund: "SS", amount: Number(c3.emp_ss_fines_due || 0), type: "PENALTY_ASSESSED" },
      ].filter(e => e.amount > 0);

      for (const entry of entries) {
        const isPenalty = entry.type === "PENALTY_ASSESSED";
        const idempKey = isPenalty
          ? `BF-PEN:${c3.payer_id}:${periodStr}:${entry.fund}:${c3.sequence_no}:v1`
          : `BF-C3:${c3.payer_id}:${periodStr}:${entry.fund}:${c3.sequence_no}:v1`;

        // Idempotency check
        const { data: existing } = await supabase
          .from("ce_employer_financial_ledger")
          .select("id")
          .eq("idempotency_key", idempKey)
          .maybeSingle();

        if (existing) { skipped++; continue; }
        if (dryRun) { posted++; continue; }

        const { error } = await supabase.from("ce_employer_financial_ledger").insert({
          employer_id: c3.payer_id,
          employer_name: c3.payer_name || c3.payer_id,
          entry_type: entry.type,
          fund_type: entry.fund,
          period: periodStr,
          debit_amount: entry.amount,
          credit_amount: 0,
          description: `[Backfill] ${entry.fund} ${isPenalty ? 'penalty' : 'contribution'} for ${periodStr}`,
          idempotency_key: idempKey,
          source_system: "BACKFILL",
          source_pk: c3.id,
          job_run_id: runId,
          posted_by: triggeredBy,
          status: "POSTED",
        });

        if (error) {
          if (error.code === "23505") { skipped++; } else { failed++; }
        } else { posted++; }
      }
    }

    // ── Phase 2: Backfill payments ──
    let payQuery = supabase
      .from("cn_receipt")
      .select("receipt_id, payment_id, receipt_total, status, created_at")
      .eq("status", "A")
      .order("created_at", { ascending: true })
      .range(offset, offset + batchSize - 1);

    const { data: receipts } = await payQuery;

    for (const receipt of (receipts || [])) {
      const { data: header } = await supabase
        .from("cn_payment_header")
        .select("payer_id, payer_type, payment_id")
        .eq("payment_id", receipt.payment_id)
        .maybeSingle();

      if (!header?.payer_id) continue;
      if (employerId && header.payer_id !== employerId) continue;

      const { data: payLines } = await supabase
        .from("cn_payment")
        .select("payment_sequence_no, fund_code, payment_amount, period")
        .eq("payment_id", receipt.payment_id);

      for (const line of (payLines || [])) {
        read++;
        const amount = Number(line.payment_amount || 0);
        if (amount <= 0) { skipped++; continue; }

        const fundCode = line.fund_code || "GENERAL";
        const idempKey = `BF-PAY:${receipt.payment_id}:${line.payment_sequence_no}:${fundCode}:v1`;

        const { data: existing } = await supabase
          .from("ce_employer_financial_ledger")
          .select("id")
          .eq("idempotency_key", idempKey)
          .maybeSingle();

        if (existing) { skipped++; continue; }
        if (dryRun) { posted++; continue; }

        const periodStr = line.period ? new Date(line.period).toISOString().slice(0, 7) : null;

        const { error } = await supabase.from("ce_employer_financial_ledger").insert({
          employer_id: header.payer_id,
          employer_name: header.payer_id,
          entry_type: "PAYMENT_RECEIVED",
          fund_type: fundCode,
          period: periodStr,
          debit_amount: 0,
          credit_amount: amount,
          description: `[Backfill] Payment received - Receipt #${receipt.receipt_id}`,
          idempotency_key: idempKey,
          source_system: "BACKFILL",
          source_pk: `${receipt.payment_id}-${line.payment_sequence_no}`,
          job_run_id: runId,
          posted_by: triggeredBy,
          status: "POSTED",
        });

        if (error) {
          if (error.code === "23505") { skipped++; } else { failed++; }
        } else { posted++; }
      }
    }

    const hasMore = (c3Records?.length || 0) >= batchSize;

    await supabase.from("ce_job_run_log").update({
      run_end: new Date().toISOString(),
      status: failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      records_read: read, records_posted: posted, records_failed: failed, records_skipped: skipped,
      summary_message: `Backfill: ${posted} posted, ${skipped} skipped, ${failed} failed. Has more: ${hasMore}`,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId, dry_run: dryRun,
      records_read: read, records_posted: posted, records_skipped: skipped, records_failed: failed,
      has_more: hasMore, next_offset: hasMore ? offset + batchSize : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
