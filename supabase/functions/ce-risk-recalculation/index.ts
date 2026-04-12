import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============= Generic Threshold Evaluator =============
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
      if (rawValue > 0 && thresholds.length >= 2) {
        const tier = thresholds[1];
        return { score: tier.score, matchedTier: tier, explanation: `Binary: value ${rawValue} > 0 → ${tier.label || tier.score}` };
      }
      const tier = thresholds[0];
      return { score: tier?.score || 0, matchedTier: tier || null, explanation: `Binary: value ${rawValue} = 0 → ${tier?.label || 0}` };
    }

    case "threshold": {
      const sorted = [...thresholds].sort((a, b) => a.min - b.min);
      let matched: ThresholdTier | null = null;
      for (const tier of sorted) {
        if (rawValue >= tier.min && rawValue <= tier.max) {
          matched = tier;
          break;
        }
      }
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
      const highestMax = Math.max(...thresholds.map(t => t.max));
      const score = highestMax > 0 ? Math.min((rawValue / highestMax) * maxScore, maxScore) : 0;
      return { score, matchedTier: null, explanation: `Linear: value ${rawValue} / ${highestMax} × ${maxScore} = ${score.toFixed(2)}` };
    }

    case "count_based":
    case "tiered":
    default: {
      const sorted = [...thresholds].sort((a, b) => a.min - b.min);
      let matched: ThresholdTier | null = null;
      for (const tier of sorted) {
        if (rawValue >= tier.min && rawValue <= tier.max) {
          matched = tier;
          break;
        }
      }
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

// ============= Data Fetchers =============

async function fetchArrearsValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  // Use arrears summary view for dynamic calculation (C3 filings - payments)
  const { data } = await supabase
    .from("ce_v_employer_arrears_summary")
    .select("total_arrears")
    .eq("employer_id", employerId)
    .maybeSingle();
  
  const totalBalance = Number(data?.total_arrears || 0);
  
  // Fallback: try RPC if view returns nothing
  if (totalBalance === 0) {
    try {
      const { data: arrears } = await supabase
        .rpc("ce_calculate_employer_arrears", { p_employer_id: employerId });
      const rpcBalance = (arrears || []).reduce((sum: number, a: any) => sum + (a.net_balance || 0), 0);
      if (rpcBalance > 0) {
        return { rawValue: rpcBalance, detail: `Arrears (RPC): $${rpcBalance.toFixed(2)}` };
      }
    } catch { /* ignore RPC errors, use view result */ }
  }
  
  return { rawValue: totalBalance, detail: `Arrears: $${totalBalance.toFixed(2)}` };
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
  // Count filings in the last 12 months
  const now = new Date();
  const periods: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  
  // Try both payer_id formats (with and without leading zeros)
  const { count: submissionCount } = await supabase
    .from("cn_c3_reported")
    .select("*", { count: "exact", head: true })
    .eq("payer_id", employerId)
    .in("period", periods);

  const missed = Math.max(12 - (submissionCount || 0), 0);
  return { rawValue: missed, detail: `Filed: ${submissionCount || 0}/12, missed: ${missed}` };
}

async function fetchPaymentValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  // Check C3 filing vs payment gaps as a proxy for payment behavior
  const { count: c3Count } = await supabase
    .from("cn_c3_reported")
    .select("*", { count: "exact", head: true })
    .eq("payer_id", employerId);
  
  const { count: paymentCount } = await supabase
    .from("cn_payment")
    .select("*", { count: "exact", head: true })
    .eq("payer_id", employerId);

  // If they have filings but fewer payments, that's a gap
  const totalExpected = c3Count || 0;
  const totalPaid = paymentCount || 0;
  
  if (totalExpected === 0) return { rawValue: 0, detail: `No filings recorded` };
  
  const gapPct = Math.round(Math.max(0, ((totalExpected - totalPaid) / totalExpected) * 100));
  return { rawValue: gapPct, detail: `C3s: ${totalExpected}, payments: ${totalPaid}, gap%: ${gapPct}` };
}

async function fetchLegalValue(supabase: any, employerId: string): Promise<{ rawValue: number; detail: string }> {
  // Check violations with legal status as proxy
  const { count: legalCount } = await supabase
    .from("ce_violations")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .eq("status", "ESCALATED");
  
  return { rawValue: legalCount || 0, detail: `Legal escalations: ${legalCount || 0}` };
}

const FACTOR_FETCHERS: Record<string, (supabase: any, employerId: string) => Promise<{ rawValue: number; detail: string }>> = {
  arrears: fetchArrearsValue,
  violations: fetchViolationsValue,
  filings: fetchFilingsValue,
  payment: fetchPaymentValue,
  legal: fetchLegalValue,
};

const FACTOR_PROFILE_COLUMNS: Record<string, string> = {
  arrears: "arrears_score",
  violations: "violation_score",
  filings: "filing_score",
  payment: "payment_behavior_score",
  legal: "legal_history_score",
};

// ============= Batch Helper =============
async function fetchAllEmployers(supabase: any): Promise<any[]> {
  const all: any[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("er_master")
      .select("regno, name, office_code, village_code")
      .eq("status", "A")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function resolveTerritory(officeCode: string | null): string {
  if (!officeCode) return "Unknown";
  switch (officeCode) {
    case "STK": return "St. Kitts";
    case "NEV": return "Nevis";
    default: return officeCode;
  }
}

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

    // Idempotency check
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

    // Get active risk policy
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

    // Get policy factors
    const { data: rawPolicyFactors } = await supabase
      .from("ce_risk_policy_factors")
      .select("factor_id, weight_override, is_active")
      .eq("policy_id", policy.id)
      .eq("is_active", true);

    const factorIds = (rawPolicyFactors || []).map((pf: any) => pf.factor_id);
    const { data: riskConfigs } = await supabase
      .from("ce_risk_config")
      .select("*")
      .in("id", factorIds.length > 0 ? factorIds : ["00000000-0000-0000-0000-000000000000"]);

    const configMap: Record<string, any> = {};
    for (const rc of riskConfigs || []) {
      configMap[rc.id] = rc;
    }

    const policyFactors = (rawPolicyFactors || []).map((pf: any) => ({
      ...pf,
      ce_risk_config: configMap[pf.factor_id] || null,
    }));

    // Get risk bands
    const { data: bands } = await supabase
      .from("ce_risk_bands")
      .select("*")
      .eq("policy_id", policy.id)
      .order("score_range_min", { ascending: true });

    // ═══════════════════════════════════════════════════════
    // STEP 1: Auto-provision risk profiles for ALL active employers
    // ═══════════════════════════════════════════════════════
    let provisioned = 0;

    if (!employerId) {
      // Full run: ensure every active employer has a risk profile
      const allEmployers = await fetchAllEmployers(supabase);
      
      // Get existing profile employer_ids
      const existingProfiles: Set<string> = new Set();
      let epOffset = 0;
      while (true) {
        const { data: ep } = await supabase
          .from("ce_risk_profiles")
          .select("employer_id")
          .range(epOffset, epOffset + 999);
        if (!ep || ep.length === 0) break;
        ep.forEach((p: any) => existingProfiles.add(p.employer_id));
        if (ep.length < 1000) break;
        epOffset += 1000;
      }

      // Insert missing profiles in batches of 200
      const missing = allEmployers.filter(e => !existingProfiles.has(e.regno));
      const BATCH = 200;
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH).map(e => ({
          employer_id: e.regno,
          employer_name: e.name || `Employer ${e.regno}`,
          territory: resolveTerritory(e.office_code),
          total_score: 0,
          risk_band: "LOW",
          arrears_score: 0,
          violation_score: 0,
          filing_score: 0,
          payment_behavior_score: 0,
          legal_history_score: 0,
          scoring_version: "v2-threshold-driven",
          created_by: triggeredBy,
          last_calculated_at: new Date().toISOString(),
        }));
        const { error: insertErr } = await supabase.from("ce_risk_profiles").insert(batch);
        if (insertErr) {
          console.error(`Batch insert error at offset ${i}:`, insertErr.message);
          // Try individual inserts for collision handling
          for (const row of batch) {
            await supabase.from("ce_risk_profiles").upsert(row, { onConflict: "employer_id" }).select();
          }
        }
        provisioned += batch.length;
      }
    } else {
      // Single employer: ensure profile exists
      const { data: existing } = await supabase
        .from("ce_risk_profiles")
        .select("id")
        .eq("employer_id", employerId)
        .maybeSingle();
      
      if (!existing) {
        const { data: emp } = await supabase
          .from("er_master")
          .select("regno, name, office_code")
          .eq("regno", employerId)
          .maybeSingle();
        
        if (emp) {
          await supabase.from("ce_risk_profiles").insert({
            employer_id: emp.regno,
            employer_name: emp.name || `Employer ${emp.regno}`,
            territory: resolveTerritory(emp.office_code),
            total_score: 0,
            risk_band: "LOW",
            scoring_version: "v2-threshold-driven",
            created_by: triggeredBy,
          });
          provisioned = 1;
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Score all profiles
    // ═══════════════════════════════════════════════════════
    let allProfiles: any[] = [];
    let profOffset = 0;
    
    if (employerId) {
      const { data } = await supabase
        .from("ce_risk_profiles")
        .select("*")
        .eq("employer_id", employerId);
      allProfiles = data || [];
    } else {
      // Paginated fetch of ALL profiles
      while (true) {
        const { data, error: profErr } = await supabase
          .from("ce_risk_profiles")
          .select("*")
          .range(profOffset, profOffset + 999);
        if (profErr) throw profErr;
        if (!data || data.length === 0) break;
        allProfiles.push(...data);
        if (data.length < 1000) break;
        profOffset += 1000;
      }
    }

    let processed = 0;
    let affected = 0;
    const errors: string[] = [];

    for (const profile of allProfiles) {
      try {
        // Skip if manual override
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

          const factorCode = factor.factor_code;
          const weight = pf.weight_override || factor.weight || 0;
          const maxScore = factor.max_score || 100;
          const scoringMethod = factor.scoring_method || "tiered";
          let rawThresholds = factor.thresholds || [];
          if (typeof rawThresholds === "string") {
            try { rawThresholds = JSON.parse(rawThresholds); } catch { rawThresholds = []; }
          }
          const thresholds: ThresholdTier[] = rawThresholds;

          const fetcher = FACTOR_FETCHERS[factorCode];
          let rawValue = 0;
          let fetchDetail = "No fetcher for this factor";

          if (fetcher) {
            const result = await fetcher(supabase, profile.employer_id);
            rawValue = result.rawValue;
            fetchDetail = result.detail;
          }

          const evaluation = evaluateScore(rawValue, scoringMethod, thresholds, maxScore);
          const weightedScore = (evaluation.score * weight) / 100;

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

          const profileCol = FACTOR_PROFILE_COLUMNS[factorCode];
          if (profileCol) {
            profileUpdate[profileCol] = Math.round(weightedScore * 100) / 100;
          }

          totalScore += weightedScore;
        }

        totalScore = Math.round(totalScore * 100) / 100;

        // Determine risk band
        let riskBand = "LOW";
        for (const band of bands || []) {
          if (totalScore >= band.score_range_min && totalScore <= band.score_range_max) {
            riskBand = band.band_name;
            break;
          }
        }
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
            scoring_version: "v2-threshold-driven",
            updated_by: triggeredBy,
          })
          .eq("id", profile.id);

        // Insert score history (only if score or band changed, or first calculation)
        if (previousScore !== totalScore || previousBand !== riskBand || !previousBand) {
          await supabase.from("ce_risk_score_history").insert({
            risk_profile_id: profile.id,
            previous_score: previousScore || 0,
            new_score: totalScore,
            previous_band: previousBand || "UNSCORED",
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
        }

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
        profiles_provisioned: provisioned,
        profiles_processed: processed,
        profiles_updated: affected,
        scoring_engine: "v2-threshold-driven",
        errors: errors.slice(0, 20),
        bands_config: (bands || []).map((b: any) => `${b.band_name}: ${b.score_range_min}-${b.score_range_max}`),
      },
    }).eq("id", run.id);

    if (job?.id) {
      await supabase.from("ce_automation_jobs").update({
        last_run_at: new Date().toISOString(),
        last_run_status: errors.length > 0 ? "CompletedWithErrors" : "Completed",
      }).eq("id", job.id);
    }

    return new Response(
      JSON.stringify({ run_id: run.id, provisioned, processed, affected, errors: errors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
