/**
 * EPIC-09A — Scheduled Legal Report Dispatcher
 *
 * Invoked by pg_cron every 5 minutes. Finds due lg_scheduled_report rows,
 * sends a summary email to each recipient via Resend, then advances
 * next_run_at + writes an lg_report_export_audit entry.
 *
 * Phase 1 delivers a summary/notice email; Phase 2 will attach the actual
 * rendered report file. The queue/audit contract is stable now.
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

async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
    throw new Error("Email provider not configured (missing RESEND_API_KEY or LOVABLE_API_KEY)");
  }
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from: SENDER, to, subject, html }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: any[] = [];

  try {
    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("lg_scheduled_report")
      .select("*")
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now}`)
      .limit(20);
    if (error) throw error;

    for (const s of due ?? []) {
      const recipients: string[] = Array.isArray(s.recipients) ? s.recipients : [];
      if (recipients.length === 0) {
        await supabase.from("lg_scheduled_report").update({
          next_run_at: nextRunAt(s.frequency),
          last_run_at: now,
          last_run_status: "skipped",
          last_run_error: "no recipients",
        }).eq("id", s.id);
        results.push({ id: s.id, status: "skipped" });
        continue;
      }

      const subject = `[Legal Report] ${s.schedule_name}`;
      const html = `
        <div style="font-family:sans-serif;max-width:600px">
          <h2>${s.schedule_name}</h2>
          <p>Your scheduled report <strong>${s.report_code}</strong> is ready.</p>
          <p>Log in to Legal Reports & Analytics to view the latest data.</p>
          <p style="color:#666;font-size:12px">Delivered on ${new Date().toUTCString()} · Format: ${s.format}</p>
        </div>`;

      try {
        await sendEmail(recipients, subject, html);
        await supabase.from("lg_scheduled_report").update({
          next_run_at: nextRunAt(s.frequency),
          last_run_at: now,
          last_run_status: "sent",
          last_run_error: null,
        }).eq("id", s.id);
        await supabase.from("lg_report_export_audit").insert({
          report_code: s.report_code,
          report_name: s.schedule_name,
          exported_by: s.created_by,
          format: s.format,
          filters_json: s.filters_json ?? {},
          row_count: 0,
          file_name: `${s.report_code}_${now.slice(0,10)}.${s.format}`,
          delivery_channel: "scheduled",
        });
        results.push({ id: s.id, status: "sent", recipients: recipients.length });
      } catch (e: any) {
        await supabase.from("lg_scheduled_report").update({
          next_run_at: nextRunAt(s.frequency),
          last_run_at: now,
          last_run_status: "failed",
          last_run_error: String(e?.message ?? e),
        }).eq("id", s.id);
        results.push({ id: s.id, status: "failed", error: String(e?.message ?? e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-scheduled-legal-report error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
