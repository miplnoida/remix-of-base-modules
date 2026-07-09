// Communication Hub — Admin Test Notice (Phase 1C-B9-A).
//
// Admin-only edge function that exercises the OFFICIAL façade path:
//   1. Authenticates the caller as System Admin.
//   2. Enqueues via the SECURITY DEFINER RPC `public.send_communication_v1`
//      (the same RPC used by the front-end `sendCommunication()` façade
//      through `comm-hub-enqueue`). NO direct communication_* inserts.
//   3. Server-side target-dispatch of the returned messageId through
//      `comm-hub-dispatch` with the dispatch secret (never exposed to
//      the browser).
//   4. Writes a single audit row to `communication_hub_control_audit`.
//
// Guardrails:
//  - moduleCode=COMM_HUB, eventCode=ADMIN_TEST_NOTICE only.
//  - testMode is forced true in this phase; live sends are impossible from
//    this endpoint. All live gates in comm-hub-dispatch remain untouched.
//  - Recipient is validated as a syntactically-valid email; no allowlist
//    change is performed here.

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

const MODULE_CODE = "COMM_HUB";
const EVENT_CODE = "ADMIN_TEST_NOTICE";
const TYPED_CONFIRMATION = "SEND ADMIN TEST NOTICE";

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

function escapeHtml(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
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

  // 2. Parse & validate body.
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const recipientEmail = String(body?.recipientEmail ?? "").trim().toLowerCase();
  const recipientName = String(body?.recipientName ?? "").trim().slice(0, 200);
  const reason = String(body?.reason ?? "").trim().slice(0, 1000);
  const typed = String(body?.typedConfirmation ?? "");
  const idempotencyKey = String(body?.idempotencyKey ?? "").trim().slice(0, 200) || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return json({ ok: false, error: "invalid_recipient" }, 400);
  }
  if (!reason) return json({ ok: false, error: "reason_required" }, 400);
  if (typed !== TYPED_CONFIRMATION) {
    return json({ ok: false, error: "typed_confirmation_required", expected: TYPED_CONFIRMATION }, 400);
  }

  // 3. Resolve the canonical Communication Hub template via core_template /
  //    core_template_version (Phase 1C-B9-A.1). No inline template body.
  const TEMPLATE_CODE = "COMM_HUB_ADMIN_TEST_NOTICE_EMAIL";
  const { data: tmplRow, error: tmplErr } = await admin
    .from("core_template")
    .select("id, code, status, is_active, active_version_id")
    .eq("code", TEMPLATE_CODE)
    .eq("is_active", true)
    .maybeSingle();
  if (tmplErr || !tmplRow || !tmplRow.active_version_id) {
    return json({ ok: false, error: "template_not_found_or_no_active_version",
      detail: tmplErr?.message ?? "COMM_HUB_ADMIN_TEST_NOTICE_EMAIL missing" }, 500);
  }
  const { data: verRow, error: verErr } = await admin
    .from("core_template_version")
    .select("id, version_no, status, subject, body_html, body_text, body_metadata")
    .eq("id", tmplRow.active_version_id)
    .maybeSingle();
  if (verErr || !verRow) {
    return json({ ok: false, error: "template_version_missing", detail: verErr?.message ?? null }, 500);
  }

  // 4. Render tokens against the resolved version. request_no is only known
  //    AFTER the RPC assigns it, so use a placeholder in the initial render
  //    and record the true value in the audit trail.
  const sentByEmail = userRes.user.email ?? actorUserId;
  const generatedAt = new Date().toISOString();
  const requestNoPlaceholder = "(assigned on enqueue)";
  const tokens: Record<string, string> = {
    recipient_name: recipientName || "Administrator",
    request_no: requestNoPlaceholder,
    generated_at: generatedAt,
  };
  const render = (tpl: string) =>
    tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => tokens[k] ?? "");
  const missing: string[] = [];
  const requiredTokens: string[] = Array.isArray(verRow.body_metadata?.required_tokens)
    ? verRow.body_metadata.required_tokens : [];
  requiredTokens.forEach((k) => { if (!(k in tokens)) missing.push(k); });
  if (missing.length) {
    return json({ ok: false, error: "missing_required_tokens", missing }, 400);
  }
  const subject = render(verRow.subject ?? "Communication Hub Admin Test Notice");
  const bodyHtml = render(verRow.body_html ?? "");
  const bodyText = render(verRow.body_text ?? "");

  // 5. Enqueue via the OFFICIAL façade RPC (SECURITY DEFINER). Rendered
  //    subject/body + resolved templateVersionId are passed through. No
  //    direct communication_* insert is performed by this feature.
  const rpcPayload = {
    moduleCode: MODULE_CODE,
    eventCode: EVENT_CODE,
    channels: ["email"],
    recipients: [{ role: "to", type: "ADMIN_USER", email: recipientEmail, name: recipientName || null, channelHint: "email" }],
    message: { subject, bodyText, bodyHtml },
    data: { subject, recipient_name: tokens.recipient_name, sent_by: sentByEmail, generated_at: generatedAt, template_code: TEMPLATE_CODE },
    metadata: { source: "communication-hub-control-center", phase: "1C-B9-A.1", template_code: TEMPLATE_CODE, resolver: "server-side-core_template" },
    priority: "normal",
    origin: "comm_hub",
    testMode: true,
    idempotencyKey,
    requestedBy: actorUserId,
    callerUserId: actorUserId,
    templateCode: TEMPLATE_CODE,
    templateId: tmplRow.id,
    templateVersionId: tmplRow.active_version_id,
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
  if (!requestId || !targetMessageId) {
    return json({ ok: false, error: "enqueue_returned_no_ids", rpcRes: r }, 500);
  }

  // 5. Server-side target-dispatch — secret NEVER leaves the edge runtime.
  const dispatchUrl = `${SUPABASE_URL}/functions/v1/comm-hub-dispatch`;
  let dispatchResp: any = null; let dispatchStatus = 0;
  try {
    const resp = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-comm-hub-dispatch-secret": DISPATCH_SECRET,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ targetMessageId, manual: true, reason, source: "comm-hub-admin-test-notice" }),
    });
    dispatchStatus = resp.status;
    dispatchResp = await resp.json().catch(() => ({}));
  } catch (e: any) {
    dispatchResp = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) };
  }

  // 6. Audit row.
  try {
    await admin.from("communication_hub_control_audit").insert({
      setting_key: "admin_test_notice_dry_run",
      old_value: null,
      new_value: {
        module_code: MODULE_CODE,
        event_code: EVENT_CODE,
        request_id: requestId,
        request_no: requestNo,
        message_id: targetMessageId,
        test_mode: true,
        recipient_masked: maskEmail(recipientEmail),
        idempotency_key: idempotencyKey,
        dispatch: {
          status: dispatchStatus,
          sentDryRun: dispatchResp?.sentDryRun ?? null,
          sentLive: dispatchResp?.sentLive ?? null,
          claimed: dispatchResp?.claimed ?? null,
          processed: dispatchResp?.processed ?? null,
          targetMode: dispatchResp?.targetMode ?? null,
        },
      } as any,
      reason,
      changed_by: actorUserId,
      source: "communication-hub-control-center",
    });
  } catch { /* audit non-fatal */ }

  // 7. Return summary (safe fields only).
  const finalMsg = await admin.from("communication_message")
    .select("id, status, test_mode, provider_message_id, sent_at, attempt_count, locked_at, locked_by, error_code, template_version_id, subject")
    .eq("id", targetMessageId).maybeSingle();
  const attempts = await admin.from("communication_delivery_attempt")
    .select("id, attempt_no, status, provider_message_id, error_code, started_at, finished_at")
    .eq("message_id", targetMessageId).order("attempt_no");

  return json({
    ok: true,
    mode: "dry-run",
    facadePath: "comm-hub-admin-test-notice → send_communication_v1 (RPC) → comm-hub-dispatch (targetMode)",
    moduleCode: MODULE_CODE,
    eventCode: EVENT_CODE,
    requestId,
    requestNo,
    messageId: targetMessageId,
    reusedExistingRequest: !!r.reusedExistingRequest,
    enqueueWarnings: r.warnings ?? [],
    dispatch: { status: dispatchStatus, response: dispatchResp },
    message: finalMsg.data ?? null,
    attempts: attempts.data ?? [],
  });
});
