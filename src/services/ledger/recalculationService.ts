import { supabase } from "@/integrations/supabase/client";
import type { RecalculationMode, RecalculationRun } from "@/types/ledger";
import { postMonthlyForEmployer } from "./monthlyPostingService";
import { getBalances } from "./ledgerBalanceService";

const sb = supabase as any;

export async function startRecalculationRun(args: {
  employer_id?: string | null;
  period_from?: string | null;
  period_to?: string | null;
  reason?: string;
  mode: RecalculationMode;
  run_by?: string;
}): Promise<RecalculationRun> {
  const { data, error } = await sb
    .from("core_ledger_recalculation_run")
    .insert({
      employer_id: args.employer_id ?? null,
      period_from: args.period_from ?? null,
      period_to: args.period_to ?? null,
      reason: args.reason ?? null,
      recalculation_mode: args.mode,
      status: "RUNNING",
      run_by: args.run_by ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RecalculationRun;
}

export async function completeRecalculationRun(
  run_id: string,
  diff_summary: any,
  status: "COMPLETED" | "FAILED" = "COMPLETED",
): Promise<void> {
  await sb
    .from("core_ledger_recalculation_run")
    .update({
      diff_summary,
      status,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run_id);
}

export async function previewRecalculation(args: {
  employer_id: string;
  employer_no: string;
  period_from: string;
  period_to: string;
  run_by?: string;
}): Promise<{ run: RecalculationRun; diff: any }> {
  const run = await startRecalculationRun({
    employer_id: args.employer_id,
    period_from: args.period_from,
    period_to: args.period_to,
    mode: "PREVIEW",
    run_by: args.run_by,
    reason: "Manual preview",
  });

  const beforeBalances = await getBalances({
    employer_id: args.employer_id,
    period_from: args.period_from,
    period_to: args.period_to,
  });

  // Walk months in range and re-run posting (idempotent — no duplicate entries
  // because of unique idempotency index on source_record_id).
  const months: string[] = enumerateMonths(args.period_from, args.period_to);
  for (const period of months) {
    await postMonthlyForEmployer({
      employer_id: args.employer_id,
      employer_no: args.employer_no,
      period,
      created_by: args.run_by,
    });
  }

  const afterBalances = await getBalances({
    employer_id: args.employer_id,
    period_from: args.period_from,
    period_to: args.period_to,
  });

  const diff = computeDiff(beforeBalances, afterBalances);
  await completeRecalculationRun(run.id, diff);
  return { run, diff };
}

function enumerateMonths(from: string, to: string): string[] {
  const result: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const cursor = new Date(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const endC = new Date(end.getUTCFullYear(), end.getUTCMonth(), 1);
  while (cursor <= endC) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    result.push(`${y}-${m}-01`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function computeDiff(before: any[], after: any[]) {
  const key = (b: any) => `${b.posting_period}|${b.head_code}`;
  const beforeMap = new Map(before.map((b) => [key(b), Number(b.closing_balance || 0)]));
  const changes: any[] = [];
  for (const a of after) {
    const k = key(a);
    const prev = beforeMap.get(k) ?? 0;
    const curr = Number(a.closing_balance || 0);
    if (Math.abs(curr - prev) > 0.005) {
      changes.push({
        posting_period: a.posting_period,
        head_code: a.head_code,
        before: prev,
        after: curr,
        delta: curr - prev,
      });
    }
  }
  return { changes, change_count: changes.length };
}
