import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Jobs that are handled by dedicated edge functions instead of the DB RPC
const EDGE_FUNCTION_JOBS: Record<string, string> = {
  'JOB-VIOLATION-SCAN': 'ce-violation-scan',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_code, dry_run = false, force = false } = await req.json();
    if (!job_code || typeof job_code !== "string") {
      return new Response(JSON.stringify({ error: "job_code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route to dedicated edge function if applicable
    const edgeFn = EDGE_FUNCTION_JOBS[job_code];
    if (edgeFn) {
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${edgeFn}`;
      const fnRes = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          dry_run,
          force,
          triggered_by: user.email || user.id,
        }),
      });

      const fnData = await fnRes.json();
      if (!fnRes.ok) {
        // Return 200 with error payload so Supabase client can read the body
        return new Response(JSON.stringify({ ok: false, error: fnData.error || "Edge function failed", status: fnRes.status }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize the response to match the expected shape
      return new Response(JSON.stringify({
        run_id: fnData.run_id,
        result: {
          processed: fnData.total_employers_scanned ?? 0,
          affected: fnData.violations_created ?? 0,
          errors: 0,
          dry_run: fnData.dry_run ?? dry_run,
        },
        // Include the rich scan-specific fields
        scan_details: {
          total_employers_scanned: fnData.total_employers_scanned,
          rules_evaluated: fnData.rules_evaluated,
          violations_detected: fnData.violations_detected,
          violations_created: fnData.violations_created,
          violations_skipped_dedupe: fnData.violations_skipped_dedupe,
          by_rule: fnData.by_rule,
          sample_violations: fnData.sample_violations,
          dry_run: fnData.dry_run,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard RPC path for other jobs
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await serviceClient.rpc("ce_execute_automation_job", {
      p_job_code: job_code,
      p_dry_run: dry_run,
      p_triggered_by: user.email || user.id,
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
