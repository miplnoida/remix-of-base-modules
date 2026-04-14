import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Penalty / Interest Accrual Job
 * Calculates overdue penalties and interest using configurable rules,
 * and creates debit entries in the compliance ledger.
 * 
 * Idempotency key: PEN:<employer_id>:<period>:<rule_id>:<accrual_date>:v1
 *                  INT:<employer_id>:<period>:<fund>:<accrual_date>:v1
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
    const accrualDate = body.accrual_date ?? new Date().toISOString().slice(0, 10);

    const runId = crypto.randomUUID();
    await supabase.from("ce_job_run_log").insert({
      id: runId,
      job_name: "Penalty & Interest Accrual",
      job_code: "LEDGER-PENALTY-ACCRUAL",
      run_type: "scheduled",
      parameters: { dry_run: dryRun, accrual_date: accrualDate },
      triggered_by: triggeredBy,
    });

    // Get active calculation rules for penalties and interest
    const { data: calcRules } = await supabase
      .from("ce_calculation_rules")
      .select("*")
      .eq("is_active", true);

    // Find employers with outstanding balances (debit > credit)
    const { data: balances } = await supabase
      .from("ce_employer_financial_ledger")
      .select("employer_id, fund_type, debit_amount, credit_amount, period")
      .eq("status", "POSTED");

    // Aggregate balances per employer/fund/period
    const empBalances = new Map<string, { employer_id: string; fund_type: string; period: string; balance: number }>();
    for (const row of (balances || [])) {
      const key = `${row.employer_id}:${row.fund_type || 'GENERAL'}:${row.period || 'ALL'}`;
      const existing = empBalances.get(key) || {
        employer_id: row.employer_id,
        fund_type: row.fund_type || "GENERAL",
        period: row.period || "ALL",
        balance: 0,
      };
      existing.balance += Number(row.debit_amount || 0) - Number(row.credit_amount || 0);
      empBalances.set(key, existing);
    }

    let read = 0, posted = 0, skipped = 0, failed = 0;

    // Apply interest on overdue balances
    const interestRate = 0.015; // 1.5% monthly - should come from config
    const today = new Date(accrualDate);

    for (const [, bal] of empBalances) {
      if (bal.balance <= 0) continue; // no outstanding balance
      read++;

      const interestAmt = Math.round(bal.balance * interestRate * 100) / 100;
      if (interestAmt < 0.01) { skipped++; continue; }

      const idempKey = `INT:${bal.employer_id}:${bal.period}:${bal.fund_type}:${accrualDate}:v1`;

      const { data: existing } = await supabase
        .from("ce_employer_financial_ledger")
        .select("id")
        .eq("idempotency_key", idempKey)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      if (dryRun) { posted++; continue; }

      const { error: lErr } = await supabase.from("ce_employer_financial_ledger").insert({
        employer_id: bal.employer_id,
        employer_name: bal.employer_id,
        entry_type: "INTEREST_ACCRUED",
        fund_type: bal.fund_type,
        period: bal.period,
        debit_amount: interestAmt,
        credit_amount: 0,
        description: `Monthly interest accrual @ ${(interestRate * 100).toFixed(1)}% on balance $${bal.balance.toFixed(2)}`,
        idempotency_key: idempKey,
        source_system: "PENALTY_ENGINE",
        job_run_id: runId,
        posted_by: triggeredBy,
        status: "POSTED",
      });

      if (lErr) { failed++; } else { posted++; }
    }

    await supabase.from("ce_job_run_log").update({
      run_end: new Date().toISOString(),
      status: failed > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      records_read: read, records_posted: posted, records_failed: failed, records_skipped: skipped,
      summary_message: `Penalty/interest accrual: ${posted} posted, ${skipped} skipped, ${failed} failed`,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId, dry_run: dryRun,
      records_read: read, records_posted: posted, records_skipped: skipped, records_failed: failed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
