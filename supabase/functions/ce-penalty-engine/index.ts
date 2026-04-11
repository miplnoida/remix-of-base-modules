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
    const period = body.period || new Date().toISOString().slice(0, 7).replace("-", "");
    const fundType = body.fund_type || "SS";
    const ruleCode = body.rule_code;
    const triggeredBy = body.triggered_by || "SYSTEM";

    // Generate idempotency key for this run
    const runKey = `penalty-engine-${period}-${fundType}-${new Date().toISOString().slice(0, 10)}`;

    // Check if already run today
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

    // Get the automation job for penalty engine
    const { data: job } = await supabase
      .from("ce_automation_jobs")
      .select("id")
      .eq("job_code", "PENALTY_ENGINE")
      .maybeSingle();

    // Create automation run record
    const { data: run, error: runError } = await supabase
      .from("ce_automation_runs")
      .insert({
        job_id: job?.id,
        started_at: new Date().toISOString(),
        status: "Running",
        triggered_by: triggeredBy,
        idempotency_key: runKey,
      })
      .select("id")
      .single();

    if (runError) throw runError;

    // Get calculation rule
    let ruleQuery = supabase
      .from("ce_calculation_rules")
      .select("*")
      .eq("is_enabled", true)
      .eq("applies_to", "penalty");

    if (ruleCode) {
      ruleQuery = ruleQuery.eq("rule_code", ruleCode);
    }

    const { data: rules, error: rulesError } = await ruleQuery;
    if (rulesError) throw rulesError;

    if (!rules || rules.length === 0) {
      // No active rules, mark as completed
      await supabase
        .from("ce_automation_runs")
        .update({
          completed_at: new Date().toISOString(),
          status: "Completed",
          records_processed: 0,
          records_affected: 0,
          execution_log: { message: "No active penalty calculation rules found" },
        })
        .eq("id", run.id);

      return new Response(
        JSON.stringify({ message: "No active rules", run_id: run.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get employers with outstanding balances
    const { data: employers, error: empError } = await supabase
      .from("ce_ledger_periods")
      .select("employer_id, balance, principal_due")
      .eq("fund_type", fundType)
      .gt("balance", 0);

    if (empError) throw empError;

    let processed = 0;
    let affected = 0;
    const errors: string[] = [];

    for (const emp of employers || []) {
      try {
        for (const rule of rules) {
          // Simple percentage-based penalty calculation
          const params = rule.parameters || {};
          const penaltyRate = params.penalty_rate || 0.05; // 5% default
          const minAmount = params.min_amount || 0;
          const penaltyAmount = Math.max(emp.principal_due * penaltyRate, minAmount);

          if (penaltyAmount > 0) {
            const idemKey = `penalty-${emp.employer_id}-${period}-${fundType}-${rule.rule_code}`;

            const { error: postError } = await supabase.rpc("ce_post_ledger_entry", {
              p_employer_id: emp.employer_id,
              p_entry_type: "PENALTY_ASSESSED",
              p_fund_type: fundType,
              p_period: period,
              p_amount: penaltyAmount,
              p_description: `Penalty: ${rule.name} (${(penaltyRate * 100).toFixed(1)}% of ${emp.principal_due})`,
              p_reference_type: "calculation_rule",
              p_idempotency_key: idemKey,
              p_posted_by: triggeredBy,
            });

            if (postError) {
              errors.push(`${emp.employer_id}: ${postError.message}`);
            } else {
              affected++;
            }
          }
        }
        processed++;
      } catch (e) {
        errors.push(`${emp.employer_id}: ${e.message}`);
      }
    }

    // Update run record
    await supabase
      .from("ce_automation_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: errors.length > 0 ? "CompletedWithErrors" : "Completed",
        records_processed: processed,
        records_affected: affected,
        error_message: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
        execution_log: {
          period, fund_type: fundType, rules_applied: rules.length,
          employers_processed: processed, penalties_posted: affected,
          errors: errors.slice(0, 20),
        },
      })
      .eq("id", run.id);

    // Update job last run
    if (job?.id) {
      await supabase
        .from("ce_automation_jobs")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: errors.length > 0 ? "CompletedWithErrors" : "Completed",
        })
        .eq("id", job.id);
    }

    return new Response(
      JSON.stringify({
        run_id: run.id,
        processed,
        affected,
        errors: errors.length,
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
