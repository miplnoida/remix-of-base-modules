// Communication Hub — Generic Event Pilot (EPIC 2A).
//
// Admin-only. Actions: "preflight" and "dry_run" only. No live path.
//
// Dry-run path:
//   UI → comm-hub-event-pilot → send_communication_v1 (RPC, testMode=true)
//      → comm-hub-dispatch (targetMessageId, secret server-side)
//
// Guarantees:
//   - Never sets testMode=false.
//   - Only allows recipient rohit@mishainfotech.com in this phase.
//   - Never writes to notification_queue / notification_logs.
//   - Never calls Resend live provider.
//   - Never persists secrets.
//
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const DISPATCH_SECRET = Deno.env.get("COMMUNICATION_HUB_DISPATCH_SECRET") ?? "";

const ALLOWED_RECIPIENT = "rohit@mishainfotech.com";
const TYPED_CONFIRMATION = "SEND GENERIC EVENT DRY RUN";
const SERVER_PROVIDED_TOKENS = new Set([
  "request_no", "request_id", "generated_at", "module_code", "event_code",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function maskEmail(addr: string | null | undefined): string | null {
  if (!addr) return null;
  const at = addr.indexOf("@");
  if (at <= 0) return "***";
  const local = addr.slice(0, at);
  const dom = addr.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${dom}`;
}

interface PilotInput {
  moduleCode: string;
  eventCode: string;
  templateCode?: string;
  recipientEmail: string;
  recipientName: string;
  tokens: Record<string, string>;
  reason?: string;
  typedConfirmation?: string;
  idempotencyKey?: string | null;
}

async function loadEventAndTemplate(admin: any, moduleCode: string, eventCode: string, templateCode?: string) {
  const blockers: string[] = [];

  const { data: liveControl } = await admin
    .from("communication_hub_event_live_control")
    .select("module_code, event_code, status, risk_level, reason")
    .eq("module_code", moduleCode).eq("event_code", eventCode).maybeSingle();
  if (!liveControl) blockers.push("event_live_control_row_missing");
  else if (liveControl.status === "disabled") blockers.push(`event_disabled (status=${liveControl.status})`);

  // Template: prefer explicit templateCode; fallback to any active template
  // in this module/event whose body_metadata declares matching module+event.
  let template: any = null;
  if (templateCode) {
    const { data } = await admin
      .from("core_template")
      .select("id, code, name, module_code, template_type, status, is_active, active_version_id")
      .eq("code", templateCode).maybeSingle();
    template = data ?? null;
  }
  if (!template) blockers.push("template_not_found");
  else if (!template.is_active) blockers.push("template_inactive");
  else if (!template.active_version_id) blockers.push("template_has_no_active_version");

  let version: any = null;
  if (template?.active_version_id) {
    const { data } = await admin
      .from("core_template_version")
      .select("id, version_no, status, subject, body_html, body_text, body_metadata")
      .eq("id", template.active_version_id).maybeSingle();
    version = data ?? null;
    if (!version) blockers.push("template_version_missing");
  }

  return { liveControl, template, version, blockers };
}

function validateTokens(version: any, tokens: Record<string, string>): string[] {
  const required: string[] = Array.isArray(version?.body_metadata?.required_tokens)
    ? version.body_metadata.required_tokens : [];
  const missing = required.filter(k => !(k in tokens) && !SERVER_PROVIDED_TOKENS.has(k));
  return missing;
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

  // Auth
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
  if (roleErr || isAdmin !== true) return json({ ok: false, error: "forbidden_admin_only" }, 403);

  let body: PilotInput;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const action: "preflight" | "dry_run" =
    (req.url.includes("preflight") || (body as any)?.action === "preflight") ? "preflight" : "dry_run";

  const moduleCode = String(body.moduleCode ?? "").trim();
  const eventCode = String(body.eventCode ?? "").trim();
  const templateCode = body.templateCode ? String(body.templateCode).trim() : undefined;
  const recipientEmail = String(body.recipientEmail ?? "").trim().toLowerCase();
  const recipientName = String(body.recipientName ?? "").trim().slice(0, 200);
  const tokens: Record<string, string> = {};
  if (body.tokens && typeof body.tokens === "object") {
    for (const [k, v] of Object.entries(body.tokens)) tokens[String(k)] = String(v ?? "");
  }
  const reason = String(body.reason ?? "").trim().slice(0, 1000);
  const typed = String(body.typedConfirmation ?? "");
  const idempotencyKey = String(body.idempotencyKey ?? "").trim().slice(0, 200) || null;

  if (!moduleCode || !eventCode) return json({ ok: false, error: "moduleCode_and_eventCode_required" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return json({ ok: false, error: "invalid_recipient" }, 400);

  // ---------- Common load ----------
  const { liveControl, template, version, blockers: loadBlockers } =
    await loadEventAndTemplate(admin, moduleCode, eventCode, templateCode);

  const blockers: string[] = [...loadBlockers];
  if (recipientEmail !== ALLOWED_RECIPIENT) {
    blockers.push(`recipient_not_allowed_in_pilot_phase (allowed=${ALLOWED_RECIPIENT})`);
  }
  const missingTokens = version ? validateTokens(version, tokens) : [];
  if (missingTokens.length) blockers.push(`missing_required_tokens: ${missingTokens.join(",")}`);

  // ---------- Preflight ----------
  if (action === "preflight") {
    return json({
      ok: true,
      action,
      ready: blockers.length === 0,
      blockers,
      module_code: moduleCode,
      event_code: eventCode,
      event_status: liveControl?.status ?? null,
      event_risk_level: liveControl?.risk_level ?? null,
      template_code: template?.code ?? templateCode ?? null,
      template_id: template?.id ?? null,
      template_version_id: version?.id ?? null,
      template_version_no: version?.version_no ?? null,
      required_tokens: (version?.body_metadata?.required_tokens ?? []),
      missing_tokens: missingTokens,
      recipient_masked: maskEmail(recipientEmail),
    });
  }

  // ---------- Dry-run ----------
  if (typed !== TYPED_CONFIRMATION) {
    return json({ ok: false, error: "typed_confirmation_required", expected: TYPED_CONFIRMATION }, 400);
  }
  if (!reason) return json({ ok: false, error: "reason_required" }, 400);
  if (blockers.length) return json({ ok: false, error: "preflight_blockers", blockers }, 400);

  const rpcPayload = {
    moduleCode,
    eventCode,
    channels: ["email"],
    recipients: [{
      role: "to", type: "ADMIN_USER",
      email: recipientEmail, name: recipientName || null, channelHint: "email",
    }],
    tokens: { ...tokens, recipient_name: tokens.recipient_name ?? recipientName ?? "Administrator" },
    data: { ...tokens, template_code: template!.code },
    metadata: {
      source: "comm-hub-event-pilot",
      phase: "EPIC-2A",
      template_code: template!.code,
      resolver: "rpc-render-after-request_no",
    },
    priority: "normal",
    origin: "comm_hub",
    testMode: true,
    idempotencyKey, requestedBy: actorUserId, callerUserId: actorUserId,
    templateCode: template!.code,
    templateId: template!.id,
    templateVersionId: template!.active_version_id,
  };

  const { data: rpcRes, error: rpcErr } = await admin.rpc("send_communication_v1", { payload: rpcPayload });
  if (rpcErr || !rpcRes || (rpcRes as any).ok === false) {
    return json({ ok: false, error: "enqueue_failed", detail: rpcErr?.message ?? (rpcRes as any)?.error ?? "unknown" }, 500);
  }
  const r: any = rpcRes;
  const requestId: string | null = r.requestId ?? r.request_id ?? null;
  const requestNo: string | null = r.requestNo ?? r.request_no ?? null;
  const messageIds: string[] = Array.isArray(r.messageIds ?? r.message_ids) ? (r.messageIds ?? r.message_ids) : [];
  const targetMessageId = messageIds[0] ?? null;
  if (!requestId || !targetMessageId) return json({ ok: false, error: "enqueue_returned_no_ids", rpcRes: r }, 500);

  const dispatchUrl = `${SUPABASE_URL}/functions/v1/comm-hub-dispatch`;
  let dispatchResp: any = null;
  let dispatchStatus = 0;
  try {
    const resp = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-comm-hub-dispatch-secret": DISPATCH_SECRET,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        targetMessageId, manual: true,
        reason, source: "comm-hub-event-pilot-dry-run",
      }),
    });
    dispatchStatus = resp.status;
    dispatchResp = await resp.json().catch(() => ({}));
  } catch (e: any) {
    dispatchResp = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) };
  }

  try {
    await admin.from("communication_hub_control_audit").insert({
      setting_key: "generic_event_pilot_dry_run",
      old_value: null,
      new_value: {
        module_code: moduleCode, event_code: eventCode,
        request_id: requestId, request_no: requestNo, message_id: targetMessageId,
        template_code: template!.code, template_id: template!.id,
        template_version_id: template!.active_version_id,
        template_version_no: version!.version_no,
        test_mode: true, recipient_masked: maskEmail(recipientEmail),
        idempotency_key: idempotencyKey,
        dispatch: {
          status: dispatchStatus,
          sentDryRun: dispatchResp?.sentDryRun ?? null,
          sentLive: dispatchResp?.sentLive ?? null,
          claimed: dispatchResp?.claimed ?? null,
          processed: dispatchResp?.processed ?? null,
          targetMode: dispatchResp?.targetMode ?? null,
        },
      },
      reason, changed_by: actorUserId,
      source: "comm-hub-event-pilot",
    });
  } catch { /* audit non-fatal */ }

  const finalMsg = await admin.from("communication_message")
    .select("id, status, test_mode, provider_message_id, sent_at, attempt_count, locked_at, locked_by, error_code, template_version_id, subject, body_text")
    .eq("id", targetMessageId).maybeSingle();
  const attempts = await admin.from("communication_delivery_attempt")
    .select("id, attempt_no, status, provider_message_id, error_code, started_at, finished_at")
    .eq("message_id", targetMessageId).order("attempt_no");

  return json({
    ok: true, action, mode: "dry-run",
    facadePath: "comm-hub-event-pilot → send_communication_v1 (testMode=true) → comm-hub-dispatch (targetMode)",
    moduleCode, eventCode,
    requestId, requestNo, messageId: targetMessageId,
    templateCode: template!.code,
    templateVersionId: template!.active_version_id,
    templateVersionNo: version!.version_no,
    reusedExistingRequest: !!r.reusedExistingRequest,
    enqueueWarnings: r.warnings ?? [],
    dispatch: { status: dispatchStatus, response: dispatchResp },
    message: finalMsg.data ?? null,
    attempts: attempts.data ?? [],
    recipient_masked: maskEmail(recipientEmail),
  });
});
