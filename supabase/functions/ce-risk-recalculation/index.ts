import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============= Generic Threshold Evaluator =============
// Reads ce_risk_config.thresholds JSONB and scoring_method to produce a score.
// Supports: tiered, threshold, binary, linear, count_based
interface ThresholdTier {
  min: number;
  max: number;
  score: number;
  label?: string;
}

function evaluateScore(
  rawValue: number,
  scoringMethod: string,
  thresholds: ThresholdTier[],
  maxScore: number
): { score: number; matchedTier: ThresholdTier | null; explanation: string } {
  if (!thresholds || thresholds.length === 0) {
    return { score: 0, matchedTier: null, explanation: "No thresholds configured" };
  }

  switch (scoringMethod) {
    case "binary": {
      // First tier = false/0, second tier = true/non-zero
      if (rawValue > 0 && thresholds.length >= 2) {
        const tier = thresholds[1];
        return { score: tier.score, matchedTier: tier, explanation: `Binary: value ${rawValue} > 0 → ${tier.label || tier.score}` };
      }
      const tier = thresholds[0];
      return { score: tier?.score || 0, matchedTier: tier || null, explanation: `Binary: value ${rawValue} = 0 → ${tier?.label || 0}` };
    }

    case "threshold": {
      // Find first tier where rawValue >= min (sorted ascending)
      const sorted = [...thresholds].sort((a, b) => a.min - b.min);
      let matched: ThresholdTier | null = null;
      for (const tier of sorted) {
        if (rawValue >= tier.min && rawValue <= tier.max) {
          matched = tier;
          break;
        }
      }
      // If no exact match, use highest tier where rawValue >= min
      if (!matched) {
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (rawValue >= sorted[i].min) {
            matched = sorted[i];
            break;
          }
        }
      }
      return {
        score: matched?.score || 0,
        matchedTier: matched,
        explanation: `Threshold: value ${rawValue} → ${matched?.label || "no match"} (score: ${matched?.score || 0})`,
      };
    }

    case "linear": {
      // Linear interpolation: score = (rawValue / max_of_highest_tier) * maxScore
      const highestMax = Math.max(...thresholds.map(t => t.max));
      const score = highestMax > 0 ? Math.min((rawValue / highestMax) * maxScore, maxScore) : 0;
      return { score, matchedTier: null, explanation: `Linear: value ${rawValue} / ${highestMax} × ${maxScore} = ${score.toFixed(2)}` };
    }

    case "count_based":
    case "tiered":
    default: {
      // Tiered: find the tier where rawValue falls within [min, max]
      const sorted = [...thresholds].sort((a, b) => a.min - b.min);
      let matched: ThresholdTier | null = null;
      for (const tier of sorted) {
        if (rawValue >= tier.min && rawValue <= tier.max) {
          matched = tier;
          break;
        }
      }
      // If above all tiers, use the highest
      if (!matched && rawValue > 0) {
        const last = sorted[sorted.length - 1];
        if (rawValue > last.max) matched = last;
      }
      return {
        score: matched?.score || 0,
        matchedTier: matched,
        explanation: `Tiered: value ${rawValue} → ${matched?.label || "no match"} (score: ${matched?.score || 0})`,
      };
    }
  }
}

// ============= Data Fetchers (per factor_code) =============
// Each returns a raw numeric value that is then fed into evaluateScore.

async function fetchArrearsValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  const { data: arrears } = await supabase
    .rpc("ce_calculate_employer_arrears", { p_employer_id: employerId });
  const totalBalance = (arrears || []).reduce((sum: number, a: any) => sum + (a.net_balance || 0), 0);
  return { rawValue: totalBalance, detail: `Total arrears balance: $${totalBalance.toFixed(2)}` };
}

async function fetchViolationsValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  const { count } = await supabase
    .from("ce_violations")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .in("status", ["OPEN", "UNDER_REVIEW", "ESCALATED"]);
  return { rawValue: count || 0, detail: `Active violations: ${count || 0}` };
}

async function fetchFilingsValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  // Count filings in the last 12 months from cn_c3_reported
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const periodCutoff = twelveMonthsAgo.toISOString().slice(0, 7).replace("-", "");
  
  const { count: submissionCount } = await supabase
    .from("cn_c3_reported")
    .select("*", { count: "exact", head: true })
    .eq("payer_id", employerId)
    .gte("period", periodCutoff);

  // Missed filings = 12 expected - actual submissions
  const missedFilings = Math.max(12 - (submissionCount || 0), 0);
  return { rawValue: missedFilings, detail: `Submissions: ${submissionCount || 0}/12, missed: ${missedFilings}` };
}

async function fetchPaymentValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  // Payment behavior: % of breaches relative to arrangements
  const { count: arrangementsCount } = await supabase
    .from("ce_payment_arrangements")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .eq("status", "ACTIVE");

  const { count: breachCount } = await supabase
    .from("ce_arrangement_breaches")
    .select("*, ce_payment_arrangements!inner(employer_id)", { count: "exact", head: true })
    .eq("ce_payment_arrangements.employer_id", employerId)
    .is("resolution", null);

  // If no arrangements, check if employer has any payment history issues
  const total = (arrangementsCount || 0) + (breachCount || 0);
  const breachPct = total > 0 ? Math.round(((breachCount || 0) / Math.max(total, 1)) * 100) : 0;
  
  return { rawValue: breachPct, detail: `Arrangements: ${arrangementsCount || 0}, breaches: ${breachCount || 0}, breach%: ${breachPct}` };
}

async function fetchLegalValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  const { count: legalCount } = await supabase
    .from("ce_legal_escalations")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", employerId);
  return { rawValue: legalCount || 0, detail: `Legal escalations: ${legalCount || 0}` };
}

// Map DB factor_code → data fetcher
const FACTOR_FETCHERS: Record<string, (supabase: any, employerId: string) => Promise<{ rawValue: number; detail: string }>> = {
  arrears: fetchArrearsValue,
  violations: fetchViolationsValue,
  filings: fetchFilingsValue,
  payment: fetchPaymentValue,
  legal: fetchLegalValue,
};

// Map DB factor_code → ce_risk_profiles column name
const FACTOR_PROFILE_COLUMNS: Record<string, string> = {
  arrears: "arrears_score",
  violations: "violation_score",
  filings: "filing_score",
  payment: "payment_behavior_score",
  legal: "legal_history_score",
};

// ============= Main Handler =============

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
    const employerId = body.employer_id;
    const triggeredBy = body.triggered_by || "SYSTEM";
    const forceRecalc = body.force === true;

    // Idempotency check (skip if force)
    const runKey = `risk-recalc-${new Date().toISOString().slice(0, 10)}${employerId ? `-${employerId}` : ""}`;

    if (!forceRecalc) {
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
    }

    // Create automation run
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
        idempotency_key: forceRecalc ? `${runKey}-force-${Date.now()}` : runKey,
      })
      .select("id")
      .single();

    if (runError) throw runError;

    // Get active risk policy — DB uses UPPERCASE 'ACTIVE'
    const { data: policies } = await supabase
      .from("ce_risk_policies")
      .select("id, policy_code")
      .eq("status", "ACTIVE")
      .limit(1);

    if (!policies || policies.length === 0) {
      await supabase.from("ce_automation_runs").update({
        completed_at: new Date().toISOString(),
        status: "Completed",
        records_processed: 0,
        execution_log: { message: "No active risk policy found (status=ACTIVE)" },
      }).eq("id", run.id);

      return new Response(
        JSON.stringify({ message: "No active risk policy" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const policy = policies[0];

    // Get policy factors (two-step: factors then configs, to avoid embedded select issues)
    const { data: rawPolicyFactors } = await supabase
      .from("ce_risk_policy_factors")
      .select("factor_id, weight_override, is_active")
      .eq("policy_id", policy.id)
      .eq("is_active", true);

    // Get all risk config entries for the factor IDs
    const factorIds = (rawPolicyFactors || []).map((pf: any) => pf.factor_id);
    const { data: riskConfigs } = await supabase
      .from("ce_risk_config")
      .select("*")
      .in("id", factorIds.length > 0 ? factorIds : ["00000000-0000-0000-0000-000000000000"]);

    // Build a lookup map
    const configMap: Record<string, any> = {};
    for (const rc of riskConfigs || []) {
      configMap[rc.id] = rc;
    }

    // Merge into policyFactors with config attached
    const policyFactors = (rawPolicyFactors || []).map((pf: any) => ({
      ...pf,
      ce_risk_config: configMap[pf.factor_id] || null,
    }));

    // Get risk bands for the policy
    const { data: bands } = await supabase
      .from("ce_risk_bands")
      .select("*")
      .eq("policy_id", policy.id)
      .order("score_range_min", { ascending: true });

    // Get risk profiles to recalculate
    let profileQuery = supabase.from("ce_risk_profiles").select("*");
    if (employerId) {
      profileQuery = profileQuery.eq("employer_id", employerId);
    }
    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) throw profileError;

    let processed = 0;
    let affected = 0;
    const errors: string[] = [];

    for (const profile of profiles || []) {
      try {
        // Skip if manual override is set
        if (profile.override_band) {
          processed++;
          continue;
        }

        const factorDetails: Record<string, any> = {};
        const profileUpdate: Record<string, any> = {};
        let totalScore = 0;

        for (const pf of policyFactors || []) {
          const factor = pf.ce_risk_config as any;
          if (!factor) continue;

          const factorCode = factor.factor_code; // lowercase from DB
          const weight = pf.weight_override || factor.weight || 0;
          const maxScore = factor.max_score || 100;
          const scoringMethod = factor.scoring_method || "tiered";
          // Handle double-encoded JSON strings (safety check)
          let rawThresholds = factor.thresholds || [];
          if (typeof rawThresholds === "string") {
            try { rawThresholds = JSON.parse(rawThresholds); } catch { rawThresholds = []; }
          }
          const thresholds: ThresholdTier[] = rawThresholds;

          // Fetch raw data using the appropriate fetcher
          const fetcher = FACTOR_FETCHERS[factorCode];
          let rawValue = 0;
          let fetchDetail = "No fetcher for this factor";

          if (fetcher) {
            const result = await fetcher(supabase, profile.employer_id);
            rawValue = result.rawValue;
            fetchDetail = result.detail;
          }

          // Evaluate score using DB-driven thresholds
          const evaluation = evaluateScore(rawValue, scoringMethod, thresholds, maxScore);
          const weightedScore = (evaluation.score * weight) / 100;

          // Store per-factor explainability detail
          factorDetails[factorCode] = {
            factor_code: factorCode,
            factor_name: factor.factor_name,
            raw_input: rawValue,
            data_detail: fetchDetail,
            scoring_method: scoringMethod,
            threshold_used: evaluation.matchedTier,
            points_awarded: evaluation.score,
            weight_pct: weight,
            weighted_contribution: Math.round(weightedScore * 100) / 100,
            explanation: evaluation.explanation,
          };

          // Map to profile columns
          const profileCol = FACTOR_PROFILE_COLUMNS[factorCode];
          if (profileCol) {
            profileUpdate[profileCol] = Math.round(weightedScore * 100) / 100;
          }

          totalScore += weightedScore;
        }

        totalScore = Math.round(totalScore * 100) / 100;

        // Determine risk band from DB bands
        let riskBand = "LOW";
        for (const band of bands || []) {
          if (totalScore >= band.score_range_min && totalScore <= band.score_range_max) {
            riskBand = band.band_name;
            break;
          }
        }
        // If above all bands, use highest
        if (bands && bands.length > 0 && totalScore > bands[bands.length - 1].score_range_max) {
          riskBand = bands[bands.length - 1].band_name;
        }

        const previousScore = profile.total_score;
        const previousBand = profile.risk_band;

        // Update profile
        await supabase
          .from("ce_risk_profiles")
          .update({
            ...profileUpdate,
            total_score: totalScore,
            risk_band: riskBand,
            last_calculated_at: new Date().toISOString(),
            updated_by: triggeredBy,
          })
          .eq("id", profile.id);

        // Insert score history with full explainability
        await supabase.from("ce_risk_score_history").insert({
          risk_profile_id: profile.id,
          previous_score: previousScore,
          new_score: totalScore,
          previous_band: previousBand,
          new_band: riskBand,
          calculation_details: {
            policy_code: policy.policy_code,
            factors_evaluated: Object.keys(factorDetails).length,
            total_weight: (policyFactors || []).reduce((s: number, pf: any) => s + (pf.weight_override || (pf.ce_risk_config as any)?.weight || 0), 0),
            factor_breakdown: factorDetails,
            scoring_engine: "v2-threshold-driven",
          },
          calculated_by: triggeredBy,
        });

        affected++;
        processed++;
      } catch (e) {
        errors.push(`${profile.employer_id}: ${e.message}`);
        processed++;
      }
    }

    // Finalize automation run
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
        scoring_engine: "v2-threshold-driven",
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
