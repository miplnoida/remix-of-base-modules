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
    const employerId = body.employer_id; // Optional: single employer
    const triggeredBy = body.triggered_by || "SYSTEM";

    const runKey = `risk-recalc-${new Date().toISOString().slice(0, 10)}${employerId ? `-${employerId}` : ""}`;

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

    const { data: job } = await supabase
      .from("ce_automation_jobs")
      .select("id")
      .eq("job_code", "RISK_RECALC")
      .maybeSingle();

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

    // Get active risk policy
    const { data: policies } = await supabase
      .from("ce_risk_policies")
      .select("id, policy_code")
      .eq("status", "Active")
      .limit(1);

    if (!policies || policies.length === 0) {
      await supabase.from("ce_automation_runs").update({
        completed_at: new Date().toISOString(),
        status: "Completed",
        records_processed: 0,
        execution_log: { message: "No active risk policy" },
      }).eq("id", run.id);

      return new Response(
        JSON.stringify({ message: "No active risk policy" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const policy = policies[0];

    // Get policy factors with weights
    const { data: policyFactors } = await supabase
      .from("ce_risk_policy_factors")
      .select("factor_id, weight_override, is_active, ce_risk_config(*)")
      .eq("policy_id", policy.id)
      .eq("is_active", true);

    // Get risk profiles to recalculate
    let profileQuery = supabase
      .from("ce_risk_profiles")
      .select("*");

    if (employerId) {
      profileQuery = profileQuery.eq("employer_id", employerId);
    }

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) throw profileError;

    let processed = 0;
    let affected = 0;
    const errors: string[] = [];

    // Get risk bands for the policy
    const { data: bands } = await supabase
      .from("ce_risk_bands")
      .select("*")
      .eq("policy_id", policy.id)
      .order("score_range_min", { ascending: true });

    for (const profile of profiles || []) {
      try {
        // Calculate scores per factor
        const factorScores: Record<string, number> = {};
        let totalScore = 0;

        for (const pf of policyFactors || []) {
          const factor = pf.ce_risk_config as any;
          if (!factor) continue;

          const weight = pf.weight_override || factor.weight || 0;
          const maxScore = factor.max_score || 100;

          // Get factor-specific data
          let rawScore = 0;

          switch (factor.factor_code) {
            case "ARREARS": {
              const { data: arrears } = await supabase
                .rpc("ce_calculate_employer_arrears", { p_employer_id: profile.employer_id });
              const totalBalance = (arrears || []).reduce((sum: number, a: any) => sum + (a.net_balance || 0), 0);
              // Tiered scoring
              const thresholds = factor.thresholds || { minimal: 10000, low: 50000, medium: 150000, high: 500000 };
              if (totalBalance > thresholds.high) rawScore = maxScore;
              else if (totalBalance > thresholds.medium) rawScore = maxScore * 0.75;
              else if (totalBalance > thresholds.low) rawScore = maxScore * 0.5;
              else if (totalBalance > thresholds.minimal) rawScore = maxScore * 0.25;
              else rawScore = 0;
              break;
            }
            case "VIOLATIONS": {
              const { count } = await supabase
                .from("ce_violations")
                .select("*", { count: "exact", head: true })
                .eq("employer_id", profile.employer_id)
                .in("status", ["Open", "Under Investigation"]);
              rawScore = Math.min((count || 0) * (maxScore / 10), maxScore);
              break;
            }
            case "FILING": {
              // Check C3 submission compliance (last 12 months)
              const { count: submissionCount } = await supabase
                .from("bema_c3_submissions")
                .select("*", { count: "exact", head: true })
                .eq("employer_id", profile.employer_id)
                .gte("period", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7).replace("-", ""));
              const complianceRate = Math.min((submissionCount || 0) / 12, 1);
              rawScore = maxScore * (1 - complianceRate);
              break;
            }
            case "PAYMENT_BEHAVIOR": {
              const { count: arrangementsCount } = await supabase
                .from("ce_payment_arrangements")
                .select("*", { count: "exact", head: true })
                .eq("employer_id", profile.employer_id)
                .eq("status", "Active");
              const { count: breachCount } = await supabase
                .from("ce_arrangement_breaches")
                .select("*, ce_payment_arrangements!inner(employer_id)", { count: "exact", head: true })
                .eq("ce_payment_arrangements.employer_id", profile.employer_id)
                .is("resolution", null);
              rawScore = Math.min(((breachCount || 0) * 20) + ((arrangementsCount || 0) > 0 ? 0 : 10), maxScore);
              break;
            }
            case "LEGAL_HISTORY": {
              const { count: legalCount } = await supabase
                .from("ce_legal_escalations")
                .select("*", { count: "exact", head: true })
                .eq("employer_id", profile.employer_id);
              rawScore = Math.min((legalCount || 0) * (maxScore / 5), maxScore);
              break;
            }
            default:
              rawScore = 0;
          }

          const weightedScore = (rawScore * weight) / 100;
          factorScores[factor.factor_code] = weightedScore;
          totalScore += weightedScore;
        }

        // Determine risk band
        let riskBand = "Minimal";
        for (const band of bands || []) {
          if (totalScore >= band.score_range_min && totalScore <= band.score_range_max) {
            riskBand = band.band_name;
            break;
          }
        }

        // Skip if score override is set
        if (profile.override_band) {
          processed++;
          continue;
        }

        const previousScore = profile.total_score;
        const previousBand = profile.risk_band;

        // Update profile
        await supabase
          .from("ce_risk_profiles")
          .update({
            arrears_score: factorScores["ARREARS"] || 0,
            violation_score: factorScores["VIOLATIONS"] || 0,
            filing_score: factorScores["FILING"] || 0,
            payment_behavior_score: factorScores["PAYMENT_BEHAVIOR"] || 0,
            legal_history_score: factorScores["LEGAL_HISTORY"] || 0,
            total_score: totalScore,
            risk_band: riskBand,
            last_calculated_at: new Date().toISOString(),
            updated_by: triggeredBy,
          })
          .eq("id", profile.id);

        // Insert score history
        await supabase.from("ce_risk_score_history").insert({
          risk_profile_id: profile.id,
          previous_score: previousScore,
          new_score: totalScore,
          previous_band: previousBand,
          new_band: riskBand,
          calculation_details: factorScores,
          calculated_by: triggeredBy,
        });

        affected++;
        processed++;
      } catch (e) {
        errors.push(`${profile.employer_id}: ${e.message}`);
        processed++;
      }
    }

    await supabase.from("ce_automation_runs").update({
      completed_at: new Date().toISOString(),
      status: errors.length > 0 ? "CompletedWithErrors" : "Completed",
      records_processed: processed,
      records_affected: affected,
      error_message: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
      execution_log: {
        policy: policy.policy_code,
        factors: policyFactors?.length || 0,
        profiles_processed: processed,
        profiles_updated: affected,
        errors: errors.slice(0, 20),
      },
    }).eq("id", run.id);

    if (job?.id) {
      await supabase.from("ce_automation_jobs").update({
        last_run_at: new Date().toISOString(),
        last_run_status: errors.length > 0 ? "CompletedWithErrors" : "Completed",
      }).eq("id", job.id);
    }

    return new Response(
      JSON.stringify({ run_id: run.id, processed, affected, errors: errors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
