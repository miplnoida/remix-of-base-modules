import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DetectionRule {
  id: string;
  rule_code: string;
  name: string;
  violation_type_id: string;
  auto_create_violation: boolean;
  trigger_event: string;
  parameters: Record<string, any> | null;
  priority: string;
  violation_type_code?: string;
}

interface DetectedViolation {
  rule_code: string;
  rule_name: string;
  employer_id: string;
  employer_name: string;
  violation_type_id: string;
  violation_type_code: string;
  status: string; // OPEN or UNDER_REVIEW
  priority: string;
  summary: string;
  period_from?: string;
  period_to?: string;
  source_type: string;
  source_rule_id: string;
  skipped?: boolean;
  skip_reason?: string;
}

// Generate a violation number: VIO-YYYYMMDD-XXXXX
function generateViolationNumber(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `VIO-${dateStr}-${rand}`;
}

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
    const dryRun: boolean = body.dry_run ?? false;
    const asOfDate: string =
      body.as_of_date || new Date().toISOString().slice(0, 10);
    const employerFilter: string | null = body.employer_id || null;

    // Idempotency check
    const runKey = `VIOLATION-SCAN-${asOfDate}`;

    if (!dryRun) {
      const { data: existingRun } = await supabase
        .from("ce_automation_runs")
        .select("id")
        .eq("idempotency_key", runKey)
        .eq("status", "Completed")
        .maybeSingle();

      if (existingRun) {
        return new Response(
          JSON.stringify({
            message: "Already completed for this date",
            run_id: existingRun.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Get the job record
    const { data: job } = await supabase
      .from("ce_automation_jobs")
      .select("id")
      .eq("job_code", "JOB-VIOLATION-SCAN")
      .maybeSingle();

    // Create run record
    const { data: run, error: runError } = await supabase
      .from("ce_automation_runs")
      .insert({
        job_id: job?.id,
        started_at: new Date().toISOString(),
        status: "Running",
        triggered_by: body.triggered_by || "SYSTEM",
        idempotency_key: dryRun ? `${runKey}-DRY` : runKey,
        is_dry_run: dryRun,
        parameters: { as_of_date: asOfDate, employer_id: employerFilter },
      })
      .select("id")
      .single();

    if (runError) throw runError;

    // Load enabled detection rules with violation type codes
    const { data: rules, error: rulesError } = await supabase
      .from("ce_detection_rules")
      .select("id, rule_code, name, violation_type_id, auto_create_violation, trigger_event, parameters, priority")
      .eq("is_enabled", true)
      .order("rule_code");

    if (rulesError) throw rulesError;

    // Load violation type codes for mapping
    const vtIds = (rules || []).map((r: any) => r.violation_type_id).filter(Boolean);
    const { data: vtypes } = await supabase
      .from("ce_violation_types")
      .select("id, code")
      .in("id", vtIds);

    const vtMap: Record<string, string> = {};
    (vtypes || []).forEach((vt: any) => {
      vtMap[vt.id] = vt.code;
    });

    const enrichedRules: DetectionRule[] = (rules || []).map((r: any) => ({
      ...r,
      violation_type_code: vtMap[r.violation_type_id] || "UNKNOWN",
    }));

    // Load fact views
    const filingQuery = supabase.from("ce_v_employer_filing_status").select("*");
    const paymentQuery = supabase.from("ce_v_employer_payment_status").select("*");
    const arrearQuery = supabase.from("ce_v_employer_arrears_summary").select("*");
    const arrangementQuery = supabase.from("ce_v_arrangement_health").select("*");
    const workforceQuery = supabase.from("ce_v_employer_workforce").select("*");
    const legalQuery = supabase.from("ce_v_employer_legal_status").select("*");

    if (employerFilter) {
      filingQuery.eq("regno", employerFilter);
      paymentQuery.eq("regno", employerFilter);
      arrearQuery.eq("regno", employerFilter);
      arrangementQuery.eq("employer_id", employerFilter);
      workforceQuery.eq("regno", employerFilter);
      legalQuery.eq("regno", employerFilter);
    }

    const [filingRes, paymentRes, arrearRes, arrangementRes, workforceRes, legalRes] =
      await Promise.all([
        filingQuery,
        paymentQuery,
        arrearQuery,
        arrangementQuery,
        workforceQuery,
        legalQuery,
      ]);

    const filings = filingRes.data || [];
    const payments = paymentRes.data || [];
    const arrears = arrearRes.data || [];
    const arrangements = arrangementRes.data || [];
    const workforce = workforceRes.data || [];
    const legal = legalRes.data || [];

    // Index by regno for quick lookup
    const filingMap = new Map(filings.map((f: any) => [f.regno, f]));
    const paymentMap = new Map(payments.map((p: any) => [p.regno, p]));
    const arrearMap = new Map(arrears.map((a: any) => [a.regno, a]));
    const workforceMap = new Map(workforce.map((w: any) => [w.regno, w]));
    const legalMap = new Map(legal.map((l: any) => [l.regno, l]));

    // Load existing unresolved violations for dedupe
    const { data: existingViolations } = await supabase
      .from("ce_violations")
      .select("employer_id, violation_type_id, period_from, status")
      .in("status", ["OPEN", "IN_PROGRESS", "ESCALATED", "UNDER_REVIEW"])
      .eq("is_deleted", false);

    const existingSet = new Set(
      (existingViolations || []).map(
        (v: any) => `${v.employer_id}|${v.violation_type_id}|${v.period_from || ""}`
      )
    );

    const detected: DetectedViolation[] = [];

    // Get all unique employer regnos from filing facts (primary list)
    const allEmployers = filings.map((f: any) => ({
      regno: f.regno,
      name: f.employer_name,
    }));

    // Process each rule
    for (const rule of enrichedRules) {
      const initialStatus = rule.auto_create_violation ? "OPEN" : "UNDER_REVIEW";
      const asOfPeriod = asOfDate.slice(0, 7); // YYYY-MM

      for (const emp of allEmployers) {
        const filing = filingMap.get(emp.regno) as any;
        const payment = paymentMap.get(emp.regno) as any;
        const arrear = arrearMap.get(emp.regno) as any;
        const wf = workforceMap.get(emp.regno) as any;
        const lg = legalMap.get(emp.regno) as any;

        let shouldFlag = false;
        let summary = "";
        let periodFrom: string | undefined;

        switch (rule.trigger_event) {
          case "c3_deadline_passed": {
            // DR-001: Late filing — filed but late
            const graceDays = rule.parameters?.grace_period_days ?? 15;
            if (filing && filing.last_filing_date) {
              // Check if latest period due has a filing but was received late
              // Simplified: if missed_filings > 0 and they have some filings
              if (filing.missed_filings_12m > 0 && filing.total_filings_12m > 0) {
                shouldFlag = true;
                summary = `Late C3 submission detected. ${filing.missed_filings_12m} period(s) with delayed filing in last 12 months.`;
                periodFrom = asOfPeriod;
              }
            }
            break;
          }

          case "c3_missing_30_days":
          case "contribution_gap_detected": {
            // DR-002/DR-012: Non-filing — no C3 at all for expected periods
            if (filing && filing.missed_filings_12m >= 2 && !filing.is_current) {
              shouldFlag = true;
              summary = `Non-filing detected: ${filing.missed_filings_12m} missed C3 submissions in last 12 months. Last filed: ${filing.last_filing_period || "Never"}.`;
              periodFrom = asOfPeriod;
            }
            break;
          }

          case "payment_not_received": {
            // DR-003: Non-payment
            if (payment && !payment.has_recent_payment && filing?.total_filings_12m > 0) {
              shouldFlag = true;
              summary = `Non-payment: No payment received in last 60 days despite active filing. Last payment: ${payment.last_payment_date || "Never"}.`;
              periodFrom = asOfPeriod;
            }
            break;
          }

          case "payment_partial": {
            // DR-004: Partial payment — has arrears and recent payment but still outstanding
            if (arrear?.has_arrears && payment?.has_recent_payment && arrear.total_outstanding > 0) {
              shouldFlag = true;
              summary = `Partial payment: Outstanding balance of $${Number(arrear.total_outstanding).toLocaleString()} despite recent payments.`;
              periodFrom = asOfPeriod;
            }
            break;
          }

          case "repeat_violation_check": {
            // DR-005: Repeat offender (review-first)
            const threshold = rule.parameters?.repeat_threshold ?? 3;
            const empViolations = (existingViolations || []).filter(
              (v: any) => v.employer_id === emp.regno
            );
            if (empViolations.length >= threshold) {
              shouldFlag = true;
              summary = `Repeat offender: ${empViolations.length} unresolved violations detected (threshold: ${threshold}).`;
              periodFrom = asOfPeriod;
            }
            break;
          }

          case "installment_overdue": {
            // DR-006: Arrangement breach
            const empArrangements = arrangements.filter(
              (a: any) => a.employer_id === emp.regno && a.health_status !== "HEALTHY" && a.health_status !== "INACTIVE"
            );
            if (empArrangements.length > 0) {
              const worst = empArrangements[0];
              shouldFlag = true;
              summary = `Arrangement breach: ${worst.health_status} status. Missed ${worst.missed_payments || 0} payments.`;
              periodFrom = asOfPeriod;
            }
            break;
          }

          case "levy_omission_check": {
            // DR-007: Levy omission (simplified — flag if arrears exist but no levy component detected)
            if (arrear?.has_arrears && arrear.total_outstanding > 500) {
              shouldFlag = true;
              summary = `Levy/severance contribution omission suspected. Outstanding: $${Number(arrear.total_outstanding).toLocaleString()}.`;
              periodFrom = asOfPeriod;
            }
            break;
          }

          case "registration_not_found": {
            // DR-008: Unregistered employer (review-first) — skip, requires scouting data
            break;
          }

          case "employee_underreporting": {
            // DR-009: Employee discrepancy (review-first)
            const minDelta = rule.parameters?.min_employee_delta ?? 3;
            if (wf && wf.employee_delta < -minDelta) {
              shouldFlag = true;
              summary = `Employee discrepancy: Registered ${wf.registered_total} but last reported ${wf.last_reported_employees} (delta: ${wf.employee_delta}).`;
              periodFrom = wf.last_reported_period || asOfPeriod;
            }
            break;
          }

          case "wage_underreporting": {
            // DR-010: Under-declaration (review-first) — provisional, skip if no min wage configured
            const minWage = rule.parameters?.min_wage_weekly_xcd;
            if (!minWage) break; // Provisional — skip
            break;
          }

          case "employer_cessation": {
            // DR-011: Cessation without clearance
            if (arrear?.has_arrears && filing?.employer_status && ["I", "D"].includes(filing.employer_status)) {
              shouldFlag = true;
              summary = `Cessation without clearance: Employer status '${filing.employer_status}' with outstanding balance $${Number(arrear.total_outstanding).toLocaleString()}.`;
              periodFrom = asOfPeriod;
            }
            break;
          }

          case "severance_omission_check": {
            // DR-013: Severance omission (review-first) — simplified
            break;
          }

          default:
            break;
        }

        if (shouldFlag) {
          // Dedupe check
          const dedupeKey = `${emp.regno}|${rule.violation_type_id}|${periodFrom || ""}`;
          if (existingSet.has(dedupeKey)) {
            detected.push({
              rule_code: rule.rule_code,
              rule_name: rule.name,
              employer_id: emp.regno,
              employer_name: emp.name,
              violation_type_id: rule.violation_type_id,
              violation_type_code: rule.violation_type_code || "UNKNOWN",
              status: initialStatus,
              priority: rule.priority || "Medium",
              summary,
              period_from: periodFrom,
              source_type: "DETECTION_RULE",
              source_rule_id: rule.id,
              skipped: true,
              skip_reason: "Unresolved violation already exists",
            });
          } else {
            detected.push({
              rule_code: rule.rule_code,
              rule_name: rule.name,
              employer_id: emp.regno,
              employer_name: emp.name,
              violation_type_id: rule.violation_type_id,
              violation_type_code: rule.violation_type_code || "UNKNOWN",
              status: initialStatus,
              priority: rule.priority || "Medium",
              summary,
              period_from: periodFrom,
              source_type: "DETECTION_RULE",
              source_rule_id: rule.id,
            });
            // Add to dedup set to avoid duplicate within same scan
            existingSet.add(dedupeKey);
          }
        }
      }
    }

    const newViolations = detected.filter((d) => !d.skipped);
    const skippedCount = detected.filter((d) => d.skipped).length;

    // Insert violations if not dry run
    let insertedCount = 0;
    if (!dryRun && newViolations.length > 0) {
      const rows = newViolations.map((v) => ({
        violation_number: generateViolationNumber(),
        employer_id: v.employer_id,
        employer_name: v.employer_name,
        territory: "St Kitts",
        violation_type_id: v.violation_type_id,
        status: v.status,
        priority: v.priority,
        summary: v.summary,
        source_type: v.source_type,
        source_rule_id: v.source_rule_id,
        period_from: v.period_from,
        discovered_date: asOfDate,
        discovered_by: "VIOLATION-SCAN",
        created_by: "VIOLATION-SCAN",
        is_unlinked: false,
        is_deleted: false,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("ce_violations")
        .insert(rows)
        .select("id");

      if (insertError) throw insertError;
      insertedCount = inserted?.length || 0;
    }

    // Update run record
    const runResult = {
      total_employers_scanned: allEmployers.length,
      rules_evaluated: enrichedRules.length,
      violations_detected: detected.length,
      violations_created: dryRun ? 0 : insertedCount,
      violations_skipped_dedupe: skippedCount,
      by_rule: enrichedRules.map((r) => ({
        rule_code: r.rule_code,
        detected: detected.filter((d) => d.rule_code === r.rule_code && !d.skipped).length,
        skipped: detected.filter((d) => d.rule_code === r.rule_code && d.skipped).length,
      })),
    };

    await supabase
      .from("ce_automation_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "Completed",
        records_processed: allEmployers.length,
        records_affected: dryRun ? 0 : insertedCount,
        execution_log: {
          ...runResult,
          details: detected.slice(0, 100),
        },
      })
      .eq("id", run.id);

    // Update job last run
    if (job?.id && !dryRun) {
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
        dry_run: dryRun,
        ...runResult,
        sample_violations: detected.slice(0, 20),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
