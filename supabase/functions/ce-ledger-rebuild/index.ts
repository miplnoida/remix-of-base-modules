import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Manual Rebuild Job
 * Rebuilds ledger for a single employer (optionally filtered by period).
 * Reverses existing entries and re-posts from source.
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
    const employerId = body.employer_id;
    const fromPeriod = body.from_period ?? null;
    const toPeriod = body.to_period ?? null;
    const rebuildRequestId = body.rebuild_request_id ?? null;

    if (!employerId) {
      return new Response(JSON.stringify({ ok: false, error: "employer_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runId = crypto.randomUUID();
    await supabase.from("ce_job_run_log").insert({
      id: runId,
      job_name: "Manual Ledger Rebuild",
      job_code: "LEDGER-REBUILD",
      run_type: "manual",
      parameters: { employer_id: employerId, from_period: fromPeriod, to_period: toPeriod, dry_run: dryRun },
      triggered_by: triggeredBy,
    });

    // Update rebuild request if provided
    if (rebuildRequestId) {
      await supabase.from("ce_manual_rebuild_request")
        .update({ status: "PROCESSING", started_at: new Date().toISOString(), job_run_id: runId } as any)
        .eq("id", rebuildRequestId);
    }

    // Step 1: Mark existing ledger entries as REVERSED
    let deleteQuery = supabase
      .from("ce_employer_financial_ledger")
      .update({ status: "REVERSED", reversal_reason: `Rebuild by ${triggeredBy} at ${new Date().toISOString()}` } as any)
      .eq("employer_id", employerId)
      .eq("status", "POSTED");

    if (fromPeriod) deleteQuery = deleteQuery.gte("period", fromPeriod);
    if (toPeriod) deleteQuery = deleteQuery.lte("period", toPeriod);

    let reversedCount = 0;
    if (!dryRun) {
      const { count } = await deleteQuery.select("id", { count: "exact", head: true });
      // Actually perform the update
      await supabase
        .from("ce_employer_financial_ledger")
        .update({ status: "REVERSED", reversal_reason: `Rebuild by ${triggeredBy}` } as any)
        .eq("employer_id", employerId)
        .eq("status", "POSTED");
      reversedCount = count || 0;
    }

    // Step 2: Clear posting queue for this employer
    if (!dryRun) {
      await supabase.from("ce_posting_queue")
        .delete()
        .eq("employer_id", employerId)
        .in("status", ["PENDING", "FAILED"]);
    }

    // Step 3: Re-post from source via backfill function
    const backfillUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ce-ledger-backfill`;
    const backfillRes = await fetch(backfillUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        employer_id: employerId,
        from_period: fromPeriod,
        to_period: toPeriod,
        dry_run: dryRun,
        triggered_by: triggeredBy,
        batch_size: 1000,
      }),
    });

    const backfillData = await backfillRes.json();

    const totalPosted = backfillData.records_posted || 0;
    const totalFailed = backfillData.records_failed || 0;

    const summary = `Rebuild for ${employerId}: Reversed ${reversedCount} entries, re-posted ${totalPosted}, failed ${totalFailed}`;

    await supabase.from("ce_job_run_log").update({
      run_end: new Date().toISOString(),
      status: totalFailed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      records_read: reversedCount, records_posted: totalPosted, records_failed: totalFailed,
      summary_message: summary,
    }).eq("id", runId);

    if (rebuildRequestId) {
      await supabase.from("ce_manual_rebuild_request")
        .update({ status: totalFailed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED", completed_at: new Date().toISOString(), outcome_summary: summary } as any)
        .eq("id", rebuildRequestId);
    }

    return new Response(JSON.stringify({
      run_id: runId, dry_run: dryRun,
      reversed: reversedCount, re_posted: totalPosted, failed: totalFailed, summary,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
