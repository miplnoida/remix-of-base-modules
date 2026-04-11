import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const asOfDate = body.as_of_date || new Date().toISOString().slice(0, 10);
    const checkedBy = body.checked_by || "SYSTEM";

    // Generate idempotency key
    const runKey = `breach-monitor-${asOfDate}`;

    const { data: existingRun } = await supabase
      .from("ce_automation_runs")
      .select("id")
      .eq("idempotency_key", runKey)
      .maybeSingle();

    if (existingRun) {
      return new Response(
        JSON.stringify({ message: "Already run today", run_id: existingRun.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get automation job
    const { data: job } = await supabase
      .from("ce_automation_jobs")
      .select("id")
      .eq("job_code", "BREACH_MONITOR")
      .maybeSingle();

    // Create run record
    const { data: run, error: runError } = await supabase
      .from("ce_automation_runs")
      .insert({
        job_id: job?.id,
        started_at: new Date().toISOString(),
        status: "Running",
        triggered_by: checkedBy,
        idempotency_key: runKey,
      })
      .select("id")
      .single();

    if (runError) throw runError;

    // Call the breach check RPC
    const { data: breaches, error: breachError } = await supabase
      .rpc("ce_breach_check_arrangements", {
        p_as_of_date: asOfDate,
        p_checked_by: checkedBy,
      });

    if (breachError) throw breachError;

    const breachCount = breaches?.length || 0;

    // Update run record
    await supabase
      .from("ce_automation_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "Completed",
        records_processed: breachCount,
        records_affected: breachCount,
        execution_log: {
          as_of_date: asOfDate,
          breaches_detected: breachCount,
          details: breaches?.slice(0, 50),
        },
      })
      .eq("id", run.id);

    if (job?.id) {
      await supabase
        .from("ce_automation_jobs")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: "Completed",
        })
        .eq("id", job.id);
    }

    return new Response(
      JSON.stringify({
        run_id: run.id,
        breaches_detected: breachCount,
        details: breaches,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
