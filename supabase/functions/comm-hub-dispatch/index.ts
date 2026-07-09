// Enterprise Communication Hub — async dispatcher (Phase 1C-B2, DRY-RUN).
//
// Claims queued email messages enqueued by the Communication Hub façade
// (`origin='comm_hub'`, `channel='email'`) and processes them as
// DRY-RUN. It never contacts a real provider (SMTP/Resend/Twilio/etc)
// and never touches provider secrets. It only:
//   - claims messages via public.claim_comm_hub_messages() (SKIP LOCKED)
//   - writes a communication_delivery_attempt row (status='skipped')
//   - writes communication_event_log entries (canonical event_type +
//     detailed stage in payload.stage)
//   - transitions the message to 'sent' with a dry-run marker
//   - calls public.recompute_communication_request_status(request_id)
//
// Feature flags (env):
//   COMMUNICATION_HUB_DISPATCH_ENABLED = "true"|"false" (default false)
//   COMMUNICATION_HUB_EMAIL_LIVE       = "true"|"false" (default false)
// When EMAIL_LIVE is false, only test_mode=true rows are claimed;
// real production messages remain queued and untouched.
//
// This function does NOT read notification_queue / notification_logs /
// bn_communication_log / ce_notice_delivery_log.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function flag(name: string): boolean {
  const v = (Deno.env.get(name) ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function maskEmail(addr: string | null | undefined): string | null {
  if (!addr || typeof addr !== "string") return null;
  const at = addr.indexOf("@");
  if (at <= 0) return "***";
  const local = addr.slice(0, at);
  const dom = addr.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${dom}`;
}

interface CommMessage {
  id: string;
  request_id: string;
  recipient_id: string | null;
  channel: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  status: string;
  attempt_count: number;
  test_mode: boolean;
  origin: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const dispatchEnabled = flag("COMMUNICATION_HUB_DISPATCH_ENABLED");
  const emailLive = flag("COMMUNICATION_HUB_EMAIL_LIVE");
  const workerId = `comm-hub-dispatch:${crypto.randomUUID().slice(0, 8)}`;

  if (!dispatchEnabled) {
    return json({
      ok: true,
      dispatchEnabled: false,
      emailLive,
      workerId,
      claimed: 0,
      processed: 0,
      sentDryRun: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      note: "COMMUNICATION_HUB_DISPATCH_ENABLED is false — no processing.",
    });
  }

  // Optional batch size from body/query.
  let batchSize = 25;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.batchSize === "number") batchSize = body.batchSize;
    }
  } catch { /* ignore */ }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Claim a batch atomically (SKIP LOCKED inside the RPC).
  const { data: claimed, error: claimErr } = await admin.rpc(
    "claim_comm_hub_messages",
    { p_batch_size: batchSize, p_worker_id: workerId, p_include_live: emailLive },
  );
  if (claimErr) {
    return json({
      ok: false,
      dispatchEnabled: true,
      emailLive,
      workerId,
      claimed: 0,
      processed: 0,
      sentDryRun: 0,
      failed: 0,
      skipped: 0,
      errors: [`claim_failed: ${claimErr.message}`],
    }, 500);
  }

  const rows = (claimed ?? []) as CommMessage[];
  const errors: string[] = [];
  let processed = 0;
  let sentDryRun = 0;
  let failed = 0;
  let skipped = 0;
  const touchedRequests = new Set<string>();

  for (const msg of rows) {
    processed++;
    touchedRequests.add(msg.request_id);

    // Defensive: dispatcher must ignore anything not comm_hub email.
    if (msg.origin !== "comm_hub" || msg.channel !== "email") {
      skipped++;
      // Release the claim.
      await admin.from("communication_message").update({
        status: "queued", locked_at: null, locked_by: null,
      }).eq("id", msg.id);
      continue;
    }

    // In dry-run mode we do not permit live sends. If EMAIL_LIVE is on
    // but this row is not test_mode, still refuse to send in this phase
    // because provider transport is intentionally not wired yet.
    const isDryRun = true;
    const attemptNo = msg.attempt_count; // already incremented in claim RPC.

    // Fetch recipient email (for masked summary only).
    let toEmail: string | null = null;
    if (msg.recipient_id) {
      const { data: rec } = await admin
        .from("communication_recipient")
        .select("email")
        .eq("id", msg.recipient_id)
        .maybeSingle();
      toEmail = (rec as any)?.email ?? null;
    }

    const startedAt = new Date().toISOString();

    // Event: dispatch started + provider selected.
    await admin.from("communication_event_log").insert([
      {
        request_id: msg.request_id, message_id: msg.id,
        event_type: "queued", source: "comm-hub-dispatch",
        payload: { stage: "DISPATCH_STARTED", worker_id: workerId, attempt_no: attemptNo, test_mode: msg.test_mode },
      },
      {
        request_id: msg.request_id, message_id: msg.id,
        event_type: "queued", source: "comm-hub-dispatch",
        payload: { stage: "PROVIDER_SELECTED", provider_code: "dry-run", live_email: false },
      },
      {
        request_id: msg.request_id, message_id: msg.id,
        event_type: "queued", source: "comm-hub-dispatch",
        payload: { stage: "SEND_STARTED", dry_run: true },
      },
    ]);

    // Insert delivery attempt (dry-run, status='skipped').
    const providerRequestSummary = {
      to_masked: maskEmail(toEmail),
      subject_length: msg.subject ? msg.subject.length : 0,
      body_html_size: msg.body_html ? msg.body_html.length : 0,
      body_text_size: msg.body_text ? msg.body_text.length : 0,
      channel: msg.channel,
      test_mode: msg.test_mode,
    };
    const providerResponseSummary = {
      dry_run: true,
      live_email: false,
      provider_code: "dry-run",
    };

    const finishedAt = new Date().toISOString();
    const providerMessageId = `dry-run:${msg.id}:${attemptNo}`;

    const { error: attErr } = await admin.from("communication_delivery_attempt").insert({
      message_id: msg.id,
      attempt_no: attemptNo,
      provider_id: null,
      started_at: startedAt,
      finished_at: finishedAt,
      status: "skipped",
      provider_message_id: providerMessageId,
      provider_response: {
        request: providerRequestSummary,
        response: providerResponseSummary,
      },
      error_code: null,
      error_message: null,
      retry_reason: null,
    });

    if (attErr) {
      failed++;
      errors.push(`attempt_insert_failed:${msg.id}:${attErr.message}`);
      await admin.from("communication_message").update({
        status: "failed",
        error_code: "DRY_RUN_ATTEMPT_INSERT_FAILED",
        error_message: attErr.message,
        locked_at: null, locked_by: null,
      }).eq("id", msg.id);
      await admin.from("communication_event_log").insert({
        request_id: msg.request_id, message_id: msg.id,
        event_type: "failed", source: "comm-hub-dispatch",
        payload: { stage: "FAILED", error: attErr.message, dry_run: true },
      });
      continue;
    }

    // Mark message as sent (dry-run). status vocabulary does not include
    // 'skipped' on communication_message — 'sent' is the accepted plan.
    const now = new Date().toISOString();
    const { error: updErr } = await admin.from("communication_message").update({
      status: "sent",
      sent_at: now,
      provider_message_id: providerMessageId,
      locked_at: null,
      locked_by: null,
      error_code: null,
      error_message: null,
    }).eq("id", msg.id);

    if (updErr) {
      failed++;
      errors.push(`message_update_failed:${msg.id}:${updErr.message}`);
      continue;
    }

    sentDryRun++;
    await admin.from("communication_event_log").insert([
      {
        request_id: msg.request_id, message_id: msg.id,
        event_type: "sent", source: "comm-hub-dispatch",
        payload: { stage: "PROVIDER_ACCEPTED", dry_run: true, provider_message_id: providerMessageId },
      },
      {
        request_id: msg.request_id, message_id: msg.id,
        event_type: "sent", source: "comm-hub-dispatch",
        payload: { stage: "SENT", dry_run: true, provider_code: "dry-run" },
      },
    ]);
  }

  // Roll up request statuses.
  for (const reqId of touchedRequests) {
    const { error: rollErr } = await admin.rpc(
      "recompute_communication_request_status",
      { p_request_id: reqId },
    );
    if (rollErr) errors.push(`recompute_failed:${reqId}:${rollErr.message}`);
  }

  return json({
    ok: true,
    dispatchEnabled: true,
    emailLive,
    workerId,
    claimed: rows.length,
    processed,
    sentDryRun,
    failed,
    skipped,
    errors,
  });
});
