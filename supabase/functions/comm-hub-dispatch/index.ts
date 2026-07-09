// Enterprise Communication Hub — async dispatcher (Phase 1C-B2 / hardened 1C-B2.1, DRY-RUN).
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
// Auth (hardened 1C-B2.1):
//   Requires header `x-comm-hub-dispatch-secret` equal to env
//   `COMMUNICATION_HUB_DISPATCH_SECRET`. Missing env => 503. Missing or
//   wrong header => 401. Only POST/OPTIONS accepted.
//
// Feature flags (env):
//   COMMUNICATION_HUB_DISPATCH_ENABLED = "true"|"false" (default false)
//   COMMUNICATION_HUB_EMAIL_LIVE       = "true"|"false" (default false)
// This phase is dry-run only: EMAIL_LIVE is IGNORED (with a warning).
// Only test_mode=true rows are ever claimed (p_include_live=false).
//
// This function does NOT read notification_queue / notification_logs /
// bn_communication_log / ce_notice_delivery_log / ce_audit_communications
// and does NOT call send-email-campaign / send-notification /
// process-pending-notifications.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-comm-hub-dispatch-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const DEFAULT_BATCH_SIZE = 25;
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 50;

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

function clampBatchSize(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return DEFAULT_BATCH_SIZE;
  if (n < MIN_BATCH_SIZE) return DEFAULT_BATCH_SIZE;
  if (n > MAX_BATCH_SIZE) return MAX_BATCH_SIZE;
  return n;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
  // 1. Method restriction: POST + OPTIONS only. GET is rejected.
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // 2. Env safety — never construct a service-role client without config.
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({
      ok: false,
      error: "supabase_env_missing",
      note: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — no processing.",
    }, 503);
  }

  // 3. Internal dispatcher secret — must exist and must match header.
  const expectedSecret = Deno.env.get("COMMUNICATION_HUB_DISPATCH_SECRET") ?? "";
  if (!expectedSecret) {
    return json({
      ok: false,
      error: "dispatch_secret_not_configured",
      note: "COMMUNICATION_HUB_DISPATCH_SECRET is not set — no processing.",
    }, 503);
  }
  const providedSecret = req.headers.get("x-comm-hub-dispatch-secret") ?? "";
  if (!providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const dispatchEnabled = flag("COMMUNICATION_HUB_DISPATCH_ENABLED");
  const emailLiveEnv = flag("COMMUNICATION_HUB_EMAIL_LIVE");
  const workerId = `comm-hub-dispatch:${crypto.randomUUID().slice(0, 8)}`;
  const warnings: string[] = [];

  // 4. Fail-closed for live messages in this dry-run phase.
  if (emailLiveEnv) {
    warnings.push("EMAIL_LIVE ignored in dry-run dispatcher; live adapter not installed.");
  }
  const includeLive = false; // forced false in this phase — never claim test_mode=false.

  if (!dispatchEnabled) {
    return json({
      ok: true,
      dispatchEnabled: false,
      emailLive: emailLiveEnv,
      includeLive,
      workerId,
      claimed: 0,
      processed: 0,
      sentDryRun: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      warnings,
      note: "COMMUNICATION_HUB_DISPATCH_ENABLED is false — no processing.",
    });
  }

  // 5. Batch size (clamped).
  let requestedBatchSize: unknown = undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object") requestedBatchSize = (body as any).batchSize;
  } catch { /* ignore */ }
  const batchSize = clampBatchSize(requestedBatchSize);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 6. Claim a batch atomically (SKIP LOCKED inside the RPC). Always dry-run.
  const { data: claimed, error: claimErr } = await admin.rpc(
    "claim_comm_hub_messages",
    { p_batch_size: batchSize, p_worker_id: workerId, p_include_live: includeLive },
  );
  if (claimErr) {
    return json({
      ok: false,
      dispatchEnabled: true,
      emailLive: emailLiveEnv,
      includeLive,
      workerId,
      batchSize,
      claimed: 0,
      processed: 0,
      sentDryRun: 0,
      failed: 0,
      skipped: 0,
      errors: [`claim_failed: ${claimErr.message}`],
      warnings,
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

    // Defensive: dispatcher must ignore anything not comm_hub email or not test_mode.
    if (msg.origin !== "comm_hub" || msg.channel !== "email" || msg.test_mode !== true) {
      skipped++;
      await admin.from("communication_message").update({
        status: "queued", locked_at: null, locked_by: null,
      }).eq("id", msg.id);
      await admin.from("communication_event_log").insert({
        request_id: msg.request_id, message_id: msg.id,
        event_type: "queued", source: "comm-hub-dispatch",
        payload: {
          stage: "SKIPPED_NOT_DRY_RUN_ELIGIBLE",
          origin: msg.origin, channel: msg.channel, test_mode: msg.test_mode,
        },
      });
      continue;
    }

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

    // Mark message as sent (dry-run).
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
      // Attempt was recorded but message row could not transition to 'sent'.
      // Do NOT leave the row locked forever. Best-effort clear of the lock
      // so a future dispatcher can retry. Log a FAILED event with a
      // dedicated stage so operators can find these.
      failed++;
      errors.push(`message_update_failed:${msg.id}:${updErr.message}`);
      const { error: unlockErr } = await admin.from("communication_message").update({
        locked_at: null,
        locked_by: null,
      }).eq("id", msg.id).eq("locked_by", workerId);
      if (unlockErr) errors.push(`message_unlock_failed:${msg.id}:${unlockErr.message}`);
      await admin.from("communication_event_log").insert({
        request_id: msg.request_id, message_id: msg.id,
        event_type: "failed", source: "comm-hub-dispatch",
        payload: {
          stage: "MESSAGE_UPDATE_FAILED",
          error: updErr.message,
          dry_run: true,
          provider_message_id: providerMessageId,
          worker_id: workerId,
        },
      });
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
    emailLive: emailLiveEnv,
    includeLive,
    workerId,
    batchSize,
    claimed: rows.length,
    processed,
    sentDryRun,
    failed,
    skipped,
    errors,
    warnings,
  });
});
