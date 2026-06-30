import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Jobs that are handled by dedicated edge functions instead of the DB RPC
const EDGE_FUNCTION_JOBS: Record<string, string> = {
  'JOB-VIOLATION-SCAN': 'ce-violation-scan',
  'JOB-NOTICE-GENERATION': 'run-notice-generation',
  'JOB-ESCALATION-ENGINE': 'run-escalation-engine',
  'JOB-OVERDUE-DETECTION': 'run-overdue-detection',
  'EMP-COMPLIANCE-REFRESH': 'ce-compliance-refresh',
  'EMP-FLAG-GEN': 'ce-flag-generation',
  'EMP-GROUP-ROLLUP': 'ce-group-rollup',
  'EMP-NOTICE-VALIDATE': 'ce-notice-validate',
  'EMP-RECON-EXCEPTION': 'ce-recon-exception',
  'EMP-SNAPSHOT-GEN': 'ce-snapshot-gen',
  'EMP-STALE-REVIEW': 'ce-stale-review',
  'JOB-ESCALATION-REVIEW': 'ce-escalation-review',
  'JOB-NOTICE-GEN': 'ce-notice-gen',
  'LEDGER-C3-POST': 'ce-ledger-c3-posting',
  'LEDGER-PAY-POST': 'ce-ledger-payment-posting',
  'LEDGER-PENALTY-ACCRUAL': 'ce-ledger-penalty-accrual',
  'LEDGER-RECONCILE': 'ce-ledger-reconciliation',
  'LEDGER-BACKFILL': 'ce-ledger-backfill',
  'LEDGER-REBUILD': 'ce-ledger-rebuild',
  'LEDGER-REVERSAL': 'ce-ledger-reversal',
};

// Jobs that have RPC handlers
const RPC_JOBS: Record<string, string> = {
  'JOB-INHERENT-RISK-RECALC': 'ce_run_employer_risk_refresh',
  'JOB-AUDIT-PRIORITY-RECALC': 'fn_ce_run_audit_priority_refresh',
};

// Some RPCs use a non-standard parameter signature (no p_job_code/p_triggered_by).
const RPC_PARAM_SIGNATURES: Record<string, (dry: boolean) => Record<string, unknown>> = {
  'JOB-INHERENT-RISK-RECALC': (dry) => ({ p_dry_run: dry, p_batch_size: 500 }),
  'JOB-AUDIT-PRIORITY-RECALC': (dry) => ({ p_dry_run: dry, p_zone_id: null, p_changed_only: false, p_batch_size: 1000 }),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Missing authorization" }), {
        status: 200,
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
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqBody = await req.json();
    const { job_code, dry_run = false, force = false, ...extraParams } = reqBody;
    if (!job_code || typeof job_code !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "job_code is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Server-side gating: check job exists and has runtime ──
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Phase 1 feature-flag enforcement: Automation Jobs ──
    const { data: ffRow } = await serviceClient
      .from('feature_flags')
      .select('is_enabled')
      .eq('flag_key', 'compliance.risk.automation_jobs')
      .maybeSingle();
    if (ffRow && ffRow.is_enabled === false) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Automation Jobs is disabled in Setup → Feature Toggles (compliance.risk.automation_jobs).",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { data: jobRecord, error: jobErr } = await serviceClient
      .from("ce_automation_jobs")
      .select("id, job_code, name, parameters, is_enabled")
      .eq("job_code", job_code)
      .maybeSingle();

    if (jobErr || !jobRecord) {
      return new Response(JSON.stringify({ ok: false, error: `Job '${job_code}' not found` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = jobRecord.parameters || {};
    const hasRuntime = params.has_runtime === true;
    const isDeprecated = params.status === 'DEPRECATED';

    if (isDeprecated) {
      return new Response(JSON.stringify({ ok: false, error: `Job '${jobRecord.name}' is deprecated and cannot be executed.` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!hasRuntime) {
      return new Response(JSON.stringify({
        ok: false,
        error: `Job '${jobRecord.name}' has no runtime handler. ${params.blocked_reason || 'Edge function not yet implemented.'}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Route to dedicated edge function if applicable ──
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
          ...extraParams,
          dry_run,
          force,
          triggered_by: user.email || user.id,
        }),
      });

      const fnData = await fnRes.json();
      if (!fnRes.ok && fnRes.status !== 202) {
        return new Response(JSON.stringify({ ok: false, error: fnData.error || "Edge function failed", status: fnRes.status }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Async-style response from the edge function: scan was accepted and is
      // running in the background. The client polls ce_automation_runs.
      if (fnData?.accepted === true || fnData?.status === 'Running') {
        return new Response(JSON.stringify({
          run_id: fnData.run_id,
          status: 'Running',
          accepted: true,
          dry_run: fnData.dry_run ?? dry_run,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        run_id: fnData.run_id,
        result: {
          processed: fnData.total_employers_scanned ?? 0,
          affected: fnData.violations_created ?? 0,
          errors: 0,
          dry_run: fnData.dry_run ?? dry_run,
        },
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
        already_completed: fnData.already_completed,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Route to RPC handler if applicable ──
    const rpcFn = RPC_JOBS[job_code];
    if (rpcFn) {
      const sigBuilder = RPC_PARAM_SIGNATURES[job_code];
      const rpcParams = sigBuilder
        ? sigBuilder(dry_run)
        : { p_job_code: job_code, p_dry_run: dry_run, p_triggered_by: user.email || user.id };
      const { data, error } = await serviceClient.rpc(rpcFn, rpcParams);

      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fallback to generic RPC ──
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
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
