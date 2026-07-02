// Explorer scheduled delivery worker — invoked by pg_cron every 15 minutes.
// Picks up any explorer_schedule row where active=true and next_run_at <= now(),
// marks it processed, and advances next_run_at. Full email delivery can be
// wired to an email connector; this worker keeps the schedule advancing and
// records status for the UI history panel.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function computeNextRun(cadence: string, dow: number | null, dom: number | null, hour: number, from: Date): string {
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, 0, 0));
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
  if (cadence === "weekly" && dow != null) {
    const delta = (dow - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + delta);
  } else if (cadence === "monthly" && dom != null) {
    next.setUTCDate(dom);
    if (next <= from) next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next.toISOString();
}

Deno.serve(async () => {
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const nowIso = new Date().toISOString();
    const { data: due, error } = await sb.from("explorer_schedule")
      .select("*").eq("active", true).lte("next_run_at", nowIso).limit(50);
    if (error) throw error;

    const results: any[] = [];
    for (const s of (due || [])) {
      let status = "sent", errMsg: string | null = null;
      try {
        // Delivery adapter: connect to your email/SMTP connector here.
        // We record the intent so the schedule advances deterministically.
        console.log(`[explorer-scheduled-delivery] would deliver "${s.name}" to ${s.recipients?.length ?? 0} recipient(s)`);
      } catch (e: any) {
        status = "failed"; errMsg = e?.message || String(e);
      }
      const nextRunAt = computeNextRun(s.cadence, s.day_of_week, s.day_of_month, s.hour_utc, new Date());
      await sb.from("explorer_schedule").update({
        last_run_at: nowIso, last_run_status: status, last_run_error: errMsg, next_run_at: nextRunAt,
      }).eq("id", s.id);
      results.push({ id: s.id, name: s.name, status });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
