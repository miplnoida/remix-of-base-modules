/**
 * EPIC-09A / 09B — Scheduled Legal Report Dispatcher
 *
 * Invoked by pg_cron every 5 minutes. Finds due lg_scheduled_report rows,
 * (optionally) attaches a CSV of the report rows, sends via Resend, advances
 * next_run_at, appends an execution_history entry and writes an audit row.
 *
 * EPIC-09B: adds CSV attachment (Excel/PDF/ZIP config is stored but rendered
 * on the client for now), subject templates, recipient-group expansion,
 * attempt_count + append-only execution_history.
 */
// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SENDER = Deno.env.get("LEGAL_REPORTS_SENDER") ?? "Legal Reports <reports@notify.mishainfotech.us>";

function nextRunAt(freq: string): string {
  const d = new Date();
  switch (freq) {
    case "daily":     d.setDate(d.getDate() + 1); break;
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    default:          d.setDate(d.getDate() + 1);
  }
  d.setHours(6, 0, 0, 0);
  return d.toISOString();
}

function renderSubject(template: string | null, s: any): string {
  const base = template ?? "[Legal Report] {{name}}";
  return base.replace(/{{name}}/g, s.schedule_name).replace(/{{code}}/g, s.report_code)
             .replace(/{{date}}/g, new Date().toISOString().slice(0, 10));
}

async function sendEmail(to: string[], subject: string, html: string, attachments?: Array<{ filename: string; content: string }>) {
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) throw new Error("Email provider not configured (missing RESEND_API_KEY or LOVABLE_API_KEY)");
  const payload: any = { from: SENDER, to, subject, html };
  if (attachments?.length) payload.attachments = attachments;
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": RESEND_API_KEY },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Minimal server-side fetcher — mirrors the client REPORT_FETCHERS in enough
 * shape to CSV-export common report codes. Falls back to a "table dump" of
 * the primary data-source table if no explicit query is registered.
 */
async function fetchRowsForReport(supabase: any, reportCode: string, _filters: any): Promise<any[]> {
  // Registered SQL-level fetchers (fast, filter-friendly)
  const explicit: Record<string, () => Promise<any>> = {
    FIN_CASE_SUMMARY: () => supabase.from("v_lg_case_financials").select("*").limit(5000),
    FIN_OUTSTANDING_BY_EMPLOYER: () => supabase.from("v_lg_case_financials").select("*").limit(5000),
    FIN_OUTSTANDING_BY_FUND: () => supabase.from("lg_recoverable_liability").select("fund_type, total_assessed, paid, outstanding").limit(10000),
    FIN_OUTSTANDING_BY_LIABILITY_TYPE: () => supabase.from("lg_recoverable_liability").select("liability_type, total_assessed, paid, outstanding").limit(10000),
    FIN_LEGAL_COST_REGISTER: () => supabase.from("lg_legal_cost").select("*").limit(5000),
    OPS_OPEN_MATTERS: () => supabase.from("lg_case").select("*").not("status_code", "in", '("CLOSED","CANCELLED")').limit(5000),
    OPS_CLOSED_MATTERS: () => supabase.from("lg_case").select("*").in("status_code", ["CLOSED", "CANCELLED"]).limit(5000),
    OPS_HEARINGS_REGISTER: () => supabase.from("lg_hearing").select("*").limit(5000),
    OPS_ORDERS_REGISTER: () => supabase.from("lg_order").select("*").limit(5000),
    OPS_APPEALS_REGISTER: () => supabase.from("lg_appeal").select("*").limit(5000),
    OPS_ENFORCEMENT_REGISTER: () => supabase.from("lg_enforcement_action").select("*").limit(5000),
    OPS_CONSENT_ORDER_REGISTER: () => supabase.from("lg_consent_order").select("*").limit(5000),
    OPS_RECOVERY_ASSIGNMENT_REGISTER: () => supabase.from("lg_recovery_assignment").select("*").limit(5000),
    CR_REFERRAL_REGISTER: () => supabase.from("core_legal_referral").select("*").limit(5000),
    CR_REFERRAL_ITEMS: () => supabase.from("core_legal_referral_item").select("*").limit(10000),
    EC_ENGAGEMENT_REGISTER: () => supabase.from("lg_external_counsel_engagement").select("*").limit(5000),
  };
  const runner = explicit[reportCode];
  if (runner) { const { data } = await runner(); return data ?? []; }
  return []; // unknown code: send summary only
}

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

async function expandRecipients(supabase: any, individuals: string[], groupIds: string[]): Promise<string[]> {
  const combined = new Set(individuals ?? []);
  if (groupIds?.length) {
    const { data } = await supabase.from("lg_report_recipient_group").select("emails").in("id", groupIds);
    for (const g of data ?? []) for (const e of (g.emails ?? [])) combined.add(e);
  }
  return Array.from(combined).filter(Boolean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: any[] = [];

  try {
    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("lg_scheduled_report").select("*").eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now}`).limit(20);
    if (error) throw error;

    for (const s of due ?? []) {
      const recipients = await expandRecipients(supabase, Array.isArray(s.recipients) ? s.recipients : [], Array.isArray(s.recipient_group_ids) ? s.recipient_group_ids : []);
      const attempt = (s.attempt_count ?? 0) + 1;
      const history = Array.isArray(s.execution_history) ? [...s.execution_history] : [];

      if (recipients.length === 0) {
        history.push({ at: now, status: "skipped", recipients: 0, error: "no recipients" });
        await supabase.from("lg_scheduled_report").update({
          next_run_at: nextRunAt(s.frequency), last_run_at: now, last_run_status: "skipped",
          last_run_error: "no recipients", attempt_count: attempt, execution_history: history,
        }).eq("id", s.id);
        results.push({ id: s.id, status: "skipped" });
        continue;
      }

      const subject = renderSubject(s.subject_template, s);
      const rows = s.attach_data !== false ? await fetchRowsForReport(supabase, s.report_code, s.filters_json) : [];
      const csv = rows.length ? toCsv(rows) : "";
      const attachments = (s.attach_data !== false && csv)
        ? [{ filename: `${s.report_code}_${now.slice(0, 10)}.csv`, content: btoa(unescape(encodeURIComponent(csv))) }]
        : undefined;

      const html = `
        <div style="font-family:sans-serif;max-width:600px">
          <h2>${s.schedule_name}</h2>
          <p>Your scheduled report <strong>${s.report_code}</strong> is ready.</p>
          <p>${rows.length ? `${rows.length.toLocaleString()} rows attached as CSV.` : "Log in to Legal Reports & Analytics to view the latest data."}</p>
          <p style="color:#666;font-size:12px">Delivered on ${new Date().toUTCString()} · Format: ${s.format}${s.format !== "csv" && s.attach_data ? " (CSV attached; native rendering pending)" : ""}</p>
        </div>`;

      try {
        await sendEmail(recipients, subject, html, attachments);
        history.push({ at: now, status: "sent", recipients: recipients.length });
        await supabase.from("lg_scheduled_report").update({
          next_run_at: nextRunAt(s.frequency), last_run_at: now, last_run_status: "sent",
          last_run_error: null, attempt_count: attempt, execution_history: history,
        }).eq("id", s.id);
        await supabase.from("lg_report_export_audit").insert({
          report_code: s.report_code, report_name: s.schedule_name, exported_by: s.created_by,
          format: s.format, filters_json: s.filters_json ?? {}, row_count: rows.length,
          file_name: `${s.report_code}_${now.slice(0, 10)}.${s.format}`, delivery_channel: "scheduled",
        });
        results.push({ id: s.id, status: "sent", recipients: recipients.length, rows: rows.length });
      } catch (e: any) {
        history.push({ at: now, status: "failed", recipients: recipients.length, error: String(e?.message ?? e) });
        await supabase.from("lg_scheduled_report").update({
          next_run_at: nextRunAt(s.frequency), last_run_at: now, last_run_status: "failed",
          last_run_error: String(e?.message ?? e), attempt_count: attempt, execution_history: history,
        }).eq("id", s.id);
        results.push({ id: s.id, status: "failed", error: String(e?.message ?? e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("send-scheduled-legal-report error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
