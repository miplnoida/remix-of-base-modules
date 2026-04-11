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

    // Parse parameters
    const body = req.method === "POST" ? await req.json() : {};
    const employerId = body.employer_id || null;
    const period = body.period || null;
    const limit = body.limit || 500;
    const dryRun = body.dry_run || false;
    const triggeredBy = body.triggered_by || "SYSTEM";

    // Create automation run record
    const runId = crypto.randomUUID();
    const { error: runInsertError } = await supabase
      .from("ce_automation_runs")
      .insert({
        id: runId,
        job_id: null,
        run_type: "manual",
        status: "running",
        started_at: new Date().toISOString(),
        parameters: { employer_id: employerId, period, limit, dry_run: dryRun },
        triggered_by: triggeredBy,
      });

    if (runInsertError) {
      console.error("Failed to create run record:", runInsertError);
    }

    // Call the sync RPC
    const { data, error } = await supabase.rpc("ce_sync_c3_to_ledger", {
      p_employer_id: employerId,
      p_period: period,
      p_limit: limit,
      p_dry_run: dryRun,
      p_triggered_by: triggeredBy,
    });

    if (error) {
      // Update run as failed
      await supabase
        .from("ce_automation_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq("id", runId);

      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update run as completed
    await supabase
      .from("ce_automation_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results: data,
        records_processed: data?.processed_count || 0,
        records_affected: data?.posted_count || 0,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ success: true, ...data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ce-c3-ledger-sync error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
