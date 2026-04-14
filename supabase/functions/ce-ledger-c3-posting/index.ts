import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * C3 Incremental Posting Job
 * Detects finalized C3 submissions not yet posted to the compliance ledger
 * and creates CONTRIBUTION_DUE debit entries.
 * 
 * Idempotency key: C3:<payer_id>:<period>:<fund>:<sequence_no>:v1
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
    const periodFilter = body.period ?? null;
    const limit = body.limit ?? 500;

    // Create job run log
    const runId = crypto.randomUUID();
    await supabase.from("ce_job_run_log").insert({
      id: runId,
      job_name: "C3 Incremental Posting",
      job_code: "LEDGER-C3-POST",
      run_type: body.force ? "manual" : "scheduled",
      parameters: { dry_run: dryRun, employer_id: employerFilter, period: periodFilter, limit },
      triggered_by: triggeredBy,
    });

    // Find finalized C3 records not yet in posting queue or ledger
    let query = supabase
      .from("cn_c3_reported")
      .select("id, payer_id, payer_type, period, sequence_no, emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc, emp_levy_penalty_amt, emp_pe_penalty_amt, emp_ss_fines_due, posting_status, total_wages, payer_name")
      .in("posting_status", ["V", "P"]) // Verified or Posted
      .order("period", { ascending: true })
      .limit(limit);

    if (employerFilter) query = query.eq("payer_id", employerFilter);
    if (periodFilter) query = query.eq("period", periodFilter);

    const { data: c3Records, error: c3Err } = await query;
    if (c3Err) throw c3Err;

    let read = 0, posted = 0, skipped = 0, failed = 0;
    const results: any[] = [];

    for (const c3 of (c3Records || [])) {
      read++;
      const periodStr = c3.period ? new Date(c3.period).toISOString().slice(0, 7) : "unknown";
      
      // Fund breakdown: SS, Levy, PE
      const fundEntries = [
        { fund: "SS", amount: Number(c3.emp_ss_amt_calc || 0) },
        { fund: "LEVY", amount: Number(c3.emp_levy_amt_calc || 0) },
        { fund: "PE", amount: Number(c3.emp_pe_amt_calc || 0) },
      ].filter(f => f.amount > 0);

      // Penalties as separate entries
      const penaltyEntries = [
        { fund: "LEVY", amount: Number(c3.emp_levy_penalty_amt || 0), type: "PENALTY" },
        { fund: "PE", amount: Number(c3.emp_pe_penalty_amt || 0), type: "PENALTY" },
        { fund: "SS", amount: Number(c3.emp_ss_fines_due || 0), type: "PENALTY" },
      ].filter(f => f.amount > 0);

      for (const entry of [...fundEntries, ...penaltyEntries]) {
        const isPenalty = (entry as any).type === "PENALTY";
        const idempKey = isPenalty
          ? `C3-PEN:${c3.payer_id}:${periodStr}:${entry.fund}:${c3.sequence_no}:v1`
          : `C3:${c3.payer_id}:${periodStr}:${entry.fund}:${c3.sequence_no}:v1`;

        // Check idempotency - skip if already queued or posted
        const { data: existing } = await supabase
          .from("ce_posting_queue")
          .select("id, status")
          .eq("idempotency_key", idempKey)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Also check ledger directly
        const { data: ledgerExisting } = await supabase
          .from("ce_employer_financial_ledger")
          .select("id")
          .eq("idempotency_key", idempKey)
          .maybeSingle();

        if (ledgerExisting) {
          skipped++;
          continue;
        }

        if (dryRun) {
          results.push({ idempKey, employer: c3.payer_id, period: periodStr, fund: entry.fund, amount: entry.amount, action: "WOULD_POST" });
          posted++;
          continue;
        }

        // Insert into posting queue
        const queueEntry = {
          source_system: "C3",
          source_table: "cn_c3_reported",
          source_pk: c3.id,
          event_type: isPenalty ? "PENALTY_FROM_C3" : "C3_CONTRIBUTION_DUE",
          employer_id: c3.payer_id,
          period: periodStr,
          fund_type: entry.fund,
          amount: entry.amount,
          idempotency_key: idempKey,
          job_run_id: runId,
          created_by: triggeredBy,
        };

        const { error: qErr } = await supabase.from("ce_posting_queue").insert(queueEntry);
        if (qErr) {
          if (qErr.code === "23505") { skipped++; continue; } // duplicate
          failed++;
          continue;
        }

        // Post to ledger
        const entryType = isPenalty ? "PENALTY_ASSESSED" : "C3_DUES_POSTED";
        const ledgerEntry = {
          employer_id: c3.payer_id,
          employer_name: c3.payer_name || c3.payer_id,
          entry_type: entryType,
          fund_type: entry.fund,
          period: periodStr,
          debit_amount: entry.amount,
          credit_amount: 0,
          description: isPenalty
            ? `${entry.fund} penalty from C3 filing period ${periodStr} (Seq ${c3.sequence_no})`
            : `${entry.fund} contribution due for period ${periodStr} (Seq ${c3.sequence_no})`,
          idempotency_key: idempKey,
          source_system: "C3",
          source_pk: c3.id,
          job_run_id: runId,
          posted_by: triggeredBy,
          status: "POSTED",
        };

        const { data: ledgerData, error: lErr } = await supabase
          .from("ce_employer_financial_ledger")
          .insert(ledgerEntry)
          .select("id")
          .single();

        if (lErr) {
          await supabase.from("ce_posting_queue")
            .update({ status: "FAILED", error_message: lErr.message, attempt_count: 1, last_attempt_at: new Date().toISOString() } as any)
            .eq("idempotency_key", idempKey);
          failed++;
        } else {
          await supabase.from("ce_posting_queue")
            .update({ status: "POSTED", ledger_entry_id: ledgerData.id, processed_at: new Date().toISOString() } as any)
            .eq("idempotency_key", idempKey);
          posted++;
          results.push({ idempKey, ledger_id: ledgerData.id });
        }
      }
    }

    // Update job run
    await supabase.from("ce_job_run_log").update({
      run_end: new Date().toISOString(),
      status: failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      records_read: read,
      records_posted: posted,
      records_failed: failed,
      records_skipped: skipped,
      summary_message: `C3 posting: ${posted} posted, ${skipped} skipped, ${failed} failed from ${read} C3 records`,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId, dry_run: dryRun,
      records_read: read, records_posted: posted, records_skipped: skipped, records_failed: failed,
      sample_results: results.slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
