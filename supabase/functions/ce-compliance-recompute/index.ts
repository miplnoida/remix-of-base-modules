import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const {
      employer_ids = null,
      territory = null,
      limit = 500,
      triggered_by = "SCHEDULED_JOB",
    } = body;

    // Record automation run
    const runId = crypto.randomUUID();
    await supabase.from("ce_automation_runs").insert({
      id: runId,
      job_type: "compliance_recompute",
      status: "running",
      parameters: { employer_ids, territory, limit },
      started_at: new Date().toISOString(),
      triggered_by,
    });

    // Call batch recompute RPC
    const { data, error } = await supabase.rpc("ce_batch_recompute_compliance", {
      p_employer_ids: employer_ids,
      p_territory: territory,
      p_limit: limit,
      p_triggered_by: triggered_by,
    });

    if (error) {
      await supabase
        .from("ce_automation_runs")
        .update({
          status: "failed",
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update automation run
    await supabase
      .from("ce_automation_runs")
      .update({
        status: "completed",
        results: data,
        records_processed: data?.processed || 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return new Response(JSON.stringify({ success: true, run_id: runId, ...data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
