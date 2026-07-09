// Enterprise Communication Hub — Manual One-Time Dispatch Test (Phase 1C-B8-C).
//
// Admin-only edge function. Enqueues exactly ONE test message and dispatches
// it via the targeted single-message path of comm-hub-dispatch. Never sends
// live email in this phase — testMode=true is forced regardless of input.
//
// SAFETY:
//  - Requires authenticated admin (has_role(uid,'Admin')).
//  - Reads COMMUNICATION_HUB_DISPATCH_SECRET server-side only. Secret never
//    reaches the browser bundle.
//  - Always sets test_mode=true this phase. Live path returns
//    'live_blocked_this_phase'.
//  - Only dispatches the message it just created (targetMessageId).
//  - Writes an audit row to communication_hub_control_audit with
//    setting_key='manual_dispatch_test'.
//  - Never touches notification_queue / notification_logs or business modules.

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
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const DISPATCH_SECRET = Deno.env.get("COMMUNICATION_HUB_DISPATCH_SECRET") ?? "";
const TYPED_CONFIRMATION = "DISPATCH ONE TEST MESSAGE";

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

function requestNo(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `CR-${ts}-${suffix}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    return json({ ok: false, error: "supabase_env_missing" }, 503);
  }
  if (!DISPATCH_SECRET) {
    return json({ ok: false, error: "dispatch_secret_not_configured" }, 503);
  }

  // 1. Authenticate + admin gate.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ ok: false, error: "missing_authorization" }, 401);
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "invalid_token" }, 401);
  const actorUserId = userRes.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: actorUserId, _role: "Admin",
  });
  if (roleErr || isAdmin !== true) {
    return json({ ok: false, error: "forbidden_admin_only" }, 403);
  }

  // 2. Parse and validate body.
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const recipientEmail = String(body?.recipientEmail ?? "").trim().toLowerCase();
  const recipientName = String(body?.recipientName ?? "").trim().slice(0, 200);
  const subject = String(body?.subject ?? "").trim().slice(0, 500);
  const bodyText = String(body?.bodyText ?? "").trim().slice(0, 20_000);
  const testModeRequested = body?.testMode !== false; // default true
  const reason = String(body?.reason ?? "").trim().slice(0, 1000);
  const typed = String(body?.typedConfirmation ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return json({ ok: false, error: "invalid_recipient" }, 400);
  }
  if (!subject) return json({ ok: false, error: "subject_required" }, 400);
  if (!bodyText) return json({ ok: false, error: "body_required" }, 400);
  if (!reason) return json({ ok: false, error: "reason_required" }, 400);
  if (typed !== TYPED_CONFIRMATION) {
    return json({ ok: false, error: "typed_confirmation_required", expected: TYPED_CONFIRMATION }, 400);
  }

  // Phase gate: force dry-run.
  const phaseGate = { forcedTestMode: true, liveBlockedThisPhase: !testModeRequested };
  const testMode = true;

  // 3. Insert communication_request.
  const reqNo = requestNo();
  const idempotencyKey = `manual-${crypto.randomUUID()}`;
  const { data: reqRow, error: reqErr } = await admin
    .from("communication_request")
    .insert({
      request_no: reqNo,
      module_code: "COMM_HUB",
      event_code: "MANUAL_DISPATCH_TEST",
      channels: ["email"],
      status: "dispatching",
      payload: { subject, bodyText, recipientName },
      context: { source: "control-center-manual-dispatch-test", actor_user_id: actorUserId, reason },
      idempotency_key: idempotencyKey,
      requested_by: actorUserId,
    })
    .select("id, request_no")
    .single();
  if (reqErr || !reqRow) {
    return json({ ok: false, error: "request_insert_failed", detail: reqErr?.message }, 500);
  }

  // 4. Create recipient row.
  const { data: recRow, error: recErr } = await admin
    .from("communication_recipient")
    .insert({
      request_id: reqRow.id,
      role: "to",
      channel_hint: "email",
      email: recipientEmail,
      name: recipientName || null,
    })
    .select("id")
    .single();

  if (recErr || !recRow) {
    return json({ ok: false, error: "recipient_insert_failed", detail: recErr?.message }, 500);
  }

  // 5. Insert communication_message (queued, comm_hub, email, test_mode=true).
  const { data: msgRow, error: msgErr } = await admin
    .from("communication_message")
    .insert({
      request_id: reqRow.id,
      recipient_id: recRow.id,
      channel: "email",
      subject,
      body_text: bodyText,
      body_html: `<p>${bodyText.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</p>`,
      status: "queued",
      attempt_count: 0,
      test_mode: testMode,
      origin: "comm_hub",
    })
    .select("id")
    .single();
  if (msgErr || !msgRow) {
    return json({ ok: false, error: "message_insert_failed", detail: msgErr?.message }, 500);
  }

  await admin.from("communication_event_log").insert({
    request_id: reqRow.id,
    message_id: msgRow.id,
    event_type: "queued",
    source: "comm-hub-manual-dispatch-test",
    payload: {
      stage: "MANUAL_ENQUEUED",
      test_mode: testMode,
      to_masked: maskEmail(recipientEmail),
      actor_user_id: actorUserId,
    },
  });

  // 6. Invoke comm-hub-dispatch in targeted mode.
  const dispatchUrl = `${SUPABASE_URL}/functions/v1/comm-hub-dispatch`;
  let dispatchResp: any = null;
  let dispatchStatus = 0;
  try {
    const r = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-comm-hub-dispatch-secret": DISPATCH_SECRET,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ targetMessageId: msgRow.id, manual: true, reason }),
    });
    dispatchStatus = r.status;
    dispatchResp = await r.json().catch(() => ({}));
  } catch (e: any) {
    dispatchResp = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) };
  }

  // 7. Fetch summary: message + latest attempt + last few event logs.
  const finalMsgRes = await admin.from("communication_message")
    .select("id, status, attempt_count, sent_at, provider_message_id, error_code, error_message, test_mode")
    .eq("id", msgRow.id).maybeSingle();
  const attemptsRes = await admin.from("communication_delivery_attempt")
    .select("id, attempt_no, status, provider_message_id, error_code, started_at, finished_at")
    .eq("message_id", msgRow.id).order("attempt_no", { ascending: false }).limit(3);
  const eventsRes = await admin.from("communication_event_log")
    .select("id, event_type, source, payload, created_at")
    .eq("message_id", msgRow.id).order("created_at", { ascending: false }).limit(12);
  const finalMsg = finalMsgRes.data;
  const attempts = attemptsRes.data;
  const events = eventsRes.data;


  const resultSummary = {
    request_id: reqRow.id,
    request_no: reqRow.request_no,
    message_id: msgRow.id,
    test_mode: testMode,
    recipient_masked: maskEmail(recipientEmail),
    dispatch_status: dispatchStatus,
    dispatch_target_mode: dispatchResp?.targetMode ?? null,
    dispatch_target_no_claim_reason: dispatchResp?.targetNoClaimReason ?? null,
    dispatch_claimed: dispatchResp?.claimed ?? null,
    dispatch_processed: dispatchResp?.processed ?? null,
    dispatch_sent_dry_run: dispatchResp?.sentDryRun ?? null,
    dispatch_sent_live: dispatchResp?.sentLive ?? null,
    message_status: (finalMsg as any)?.status ?? null,
    provider_message_id: (finalMsg as any)?.provider_message_id ?? null,
  };

  // 8. Audit row.
  await admin.from("communication_hub_control_audit").insert({
    setting_key: "manual_dispatch_test",
    old_value: null,
    new_value: resultSummary as any,
    reason,
    changed_by: actorUserId,
    source: "comm-hub-manual-dispatch-test",
  });

  return json({
    ok: true,
    phaseGate,
    warning: "Phase 1C-B8-C: live sending is disabled. Message was dispatched in dry-run only.",
    request: { id: reqRow.id, request_no: reqRow.request_no },
    message: finalMsg,
    attempts: attempts ?? [],
    events: events ?? [],
    dispatch: dispatchResp,
  });
});
