import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = req.method === "POST" ? await req.json() : {};
    const employerId = body.employer_id || null;
    const dateFrom = body.payment_date_from || null;
    const dateTo = body.payment_date_to || null;
    const sourcePaymentId = body.source_payment_id || null;
    const limit = body.limit || 500;
    const dryRun = body.dry_run || false;
    const triggeredBy = body.triggered_by || "SYSTEM";
    const autoAllocate = body.auto_allocate || false;
    const allocationMode = body.allocation_mode || "oldest_due_first";

    // Create automation run record
    const runId = crypto.randomUUID();
    await supabase.from("ce_automation_runs").insert({
      id: runId,
      job_id: null,
      run_type: "manual",
      status: "running",
      started_at: new Date().toISOString(),
      parameters: {
        employer_id: employerId,
        payment_date_from: dateFrom,
        payment_date_to: dateTo,
        limit,
        dry_run: dryRun,
        auto_allocate: autoAllocate,
      },
      triggered_by: triggeredBy,
    });

    // Call the sync RPC
    const { data, error } = await supabase.rpc("ce_sync_payments_to_ledger", {
      p_employer_id: employerId,
      p_payment_date_from: dateFrom,
      p_payment_date_to: dateTo,
      p_source_payment_id: sourcePaymentId,
      p_limit: limit,
      p_dry_run: dryRun,
      p_triggered_by: triggeredBy,
    });

    if (error) {
      await supabase.from("ce_automation_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error.message,
      }).eq("id", runId);

      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional: auto-allocate posted payments
    let allocationResults = null;
    if (autoAllocate && !dryRun && data?.posted_count > 0) {
      const { data: syncedRows } = await supabase
        .from("ce_payment_ledger_sync_log")
        .select("source_payment_id, employer_id")
        .eq("sync_run_id", data.run_id)
        .eq("sync_status", "posted")
        .eq("allocation_status", "unallocated");

      if (syncedRows?.length) {
        const allocResults = [];
        for (const row of syncedRows) {
          const { data: allocData } = await supabase.rpc("ce_allocate_employer_payment", {
            p_source_payment_id: row.source_payment_id,
            p_employer_id: row.employer_id,
            p_allocation_mode: allocationMode,
            p_triggered_by: triggeredBy,
          });
          allocResults.push({ source_payment_id: row.source_payment_id, result: allocData });
        }
        allocationResults = allocResults;
      }
    }

    await supabase.from("ce_automation_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      results: { sync: data, allocations: allocationResults },
      records_processed: data?.processed_count || 0,
      records_affected: data?.posted_count || 0,
    }).eq("id", runId);

    return new Response(
      JSON.stringify({ success: true, ...data, allocation_results: allocationResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ce-payment-ledger-sync error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
