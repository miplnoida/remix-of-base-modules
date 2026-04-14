import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Nightly Reconciliation Job
 * Compares source totals (C3 contributions + payments) against ledger totals
 * by employer/period/fund, detects mismatches, and logs exceptions.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run ?? false;
    const triggeredBy = body.triggered_by ?? "SYSTEM";
    const employerFilter = body.employer_id ?? null;

    const runId = crypto.randomUUID();
    await supabase.from("ce_job_run_log").insert({
      id: runId,
      job_name: "Nightly Reconciliation",
      job_code: "LEDGER-RECONCILE",
      run_type: "scheduled",
      parameters: { dry_run: dryRun, employer_id: employerFilter },
      triggered_by: triggeredBy,
    });

    let read = 0, posted = 0, skipped = 0, failed = 0;

    // 1. Get C3 source totals (finalized)
    let c3Query = supabase
      .from("cn_c3_reported")
      .select("payer_id, period, emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc")
      .in("posting_status", ["V", "P"]);
    if (employerFilter) c3Query = c3Query.eq("payer_id", employerFilter);

    const { data: c3Data } = await c3Query;

    // Aggregate C3 source by employer+period
    const c3Totals = new Map<string, number>();
    for (const row of (c3Data || [])) {
      const periodStr = row.period ? new Date(row.period).toISOString().slice(0, 7) : "unknown";
      const key = `${row.payer_id}:${periodStr}`;
      const total = Number(row.emp_ss_amt_calc || 0) + Number(row.emp_levy_amt_calc || 0) + Number(row.emp_pe_amt_calc || 0);
      c3Totals.set(key, (c3Totals.get(key) || 0) + total);
    }

    // 2. Get ledger totals for C3_DUES_POSTED entries
    let ledgerQuery = supabase
      .from("ce_employer_financial_ledger")
      .select("employer_id, period, debit_amount")
      .eq("entry_type", "C3_DUES_POSTED")
      .eq("status", "POSTED");
    if (employerFilter) ledgerQuery = ledgerQuery.eq("employer_id", employerFilter);

    const { data: ledgerData } = await ledgerQuery;

    const ledgerTotals = new Map<string, number>();
    for (const row of (ledgerData || [])) {
      const key = `${row.employer_id}:${row.period || 'unknown'}`;
      ledgerTotals.set(key, (ledgerTotals.get(key) || 0) + Number(row.debit_amount || 0));
    }

    // 3. Compare and find mismatches
    const allKeys = new Set([...c3Totals.keys(), ...ledgerTotals.keys()]);

    for (const key of allKeys) {
      read++;
      const sourceTotal = c3Totals.get(key) || 0;
      const ledgerTotal = ledgerTotals.get(key) || 0;
      const variance = Math.abs(sourceTotal - ledgerTotal);

      if (variance < 0.01) { skipped++; continue; } // matches

      const [empId, period] = key.split(":");
      const variancePct = sourceTotal > 0 ? (variance / sourceTotal) * 100 : 100;
      const exceptionType = sourceTotal > ledgerTotal ? "MISSING_POSTING" : "EXCESS_POSTING";
      const severity = variance > 1000 ? "HIGH" : variance > 100 ? "MEDIUM" : "LOW";

      if (dryRun) { posted++; continue; }

      const { error } = await supabase.from("ce_reconciliation_exceptions").insert({
        employer_id: empId,
        source_period: period,
        source_table: "cn_c3_reported",
        exception_type: exceptionType,
        source_amount: sourceTotal,
        ledger_amount: ledgerTotal,
        variance_amount: variance,
        variance_pct: Math.round(variancePct * 100) / 100,
        severity,
        status: severity === "LOW" ? "AUTO_RESOLVED" : "OPEN",
        run_id: runId,
        created_by: triggeredBy,
      });

      if (error) { failed++; } else { posted++; }
    }

    await supabase.from("ce_job_run_log").update({
      run_end: new Date().toISOString(),
      status: failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      records_read: read, records_posted: posted, records_failed: failed, records_skipped: skipped,
      summary_message: `Reconciliation: ${read} comparisons, ${posted} exceptions found, ${skipped} matched, ${failed} failed`,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId, dry_run: dryRun,
      comparisons: read, exceptions_found: posted, matched: skipped, errors: failed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
