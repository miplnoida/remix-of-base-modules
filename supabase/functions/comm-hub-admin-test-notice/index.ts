// Communication Hub — Admin Test Notice (Phase 1C-B9-B-A).
//
// Admin-only edge function. Three actions:
//   - action="preflight" — evaluates all live gates, returns {ready,reasons}.
//                          Never creates request/message and never invokes
//                          dispatcher or provider.
//   - action="dry_run"   — (default) enqueue via send_communication_v1 with
//                          testMode=true, target-dispatch via
//                          comm-hub-dispatch. No live send possible.
//   - action="live"      — attempt a single live send. Blocked server-side
//                          unless every gate returns ready=true.
//
// Live path is fully guarded; under the current safe state every live
// attempt is refused BEFORE creating any request/message/attempt, and
// audited as `admin_test_notice_live_blocked`.

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
const TEMPLATE_CODE = "COMM_HUB_ADMIN_TEST_NOTICE_EMAIL";

const DRY_RUN_TYPED = "SEND ADMIN TEST NOTICE";
const LIVE_TYPED = "SEND ONE LIVE ADMIN TEST NOTICE";

function recipientDomain(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(at + 1).toLowerCase() : "";
}

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

function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw.split(/[,\s;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Preflight — evaluate every live gate. NO side effects.
// ---------------------------------------------------------------------------
async function evaluateGates(admin: any, recipientEmail: string) {
  const reasons: string[] = [];
  const gates: Record<string, unknown> = {};

  // Env gates
  const envEmailLive = (Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE") ?? "").toLowerCase() === "true";
  const envAllowlist = parseAllowlist(Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST"));
  gates.envEmailLive = envEmailLive;
  gates.envAllowlist = envAllowlist;
  if (!envEmailLive) reasons.push("env COMMUNICATION_HUB_EMAIL_LIVE is not true");
  const recipDom = recipientDomain(recipientEmail);
  const envAllowsRecipient =
    envAllowlist.includes(recipientEmail.toLowerCase()) ||
    (recipDom.length > 0 && envAllowlist.some(x => x.startsWith("@") && x.slice(1) === recipDom));
  gates.envAllowsRecipient = envAllowsRecipient;
  if (envAllowlist.length === 0) {
    reasons.push("env allowlist is empty — set COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST");
  } else if (!envAllowsRecipient) {
    reasons.push("env allowlist does not permit this recipient");
  }

  // DB gates
  const { data: cfg } = await admin
    .from("communication_hub_control_settings")
    .select("dispatch_enabled, dry_run_only, email_live_enabled, live_eligible_after, live_eligible_max_age_minutes, allowed_email_addresses, allowed_email_domains, operating_mode")
    .eq("singleton_guard", "primary").maybeSingle();
  gates.db = cfg ?? null;
  if (!cfg) reasons.push("communication_hub_control_settings row missing");
  else {
    if (!cfg.dispatch_enabled) reasons.push("DB dispatch_enabled=false");
    if (cfg.dry_run_only) reasons.push("DB dry_run_only=true");
    if (!cfg.email_live_enabled) reasons.push("DB email_live_enabled=false");
    if (!cfg.live_eligible_after) reasons.push("DB live_eligible_after not set");
    else {
      const startMs = new Date(cfg.live_eligible_after).getTime();
      const ageMin = Math.max(1, Math.min(30, Number(cfg.live_eligible_max_age_minutes ?? 30)));
      const expiresMs = startMs + ageMin * 60_000;
      gates.liveWindowExpiresAt = new Date(expiresMs).toISOString();
      gates.liveWindowExpired = Date.now() > expiresMs;
      if (Date.now() > expiresMs) {
        reasons.push(`DB live window expired at ${new Date(expiresMs).toISOString()} (max_age=${ageMin}m)`);
      }
    }
    const addrs: string[] = (cfg.allowed_email_addresses ?? []).map((s: string) => String(s).toLowerCase());
    const doms: string[] = (cfg.allowed_email_domains ?? []).map((s: string) => String(s).toLowerCase());
    gates.dbAllowlistConfigured = addrs.length > 0 || doms.length > 0;
    if (!gates.dbAllowlistConfigured) {
      reasons.push("DB allowlist is empty — configure allowed_email_addresses or allowed_email_domains in Control Center");
    } else {
      const dbAllowsRecipient =
        addrs.includes(recipientEmail.toLowerCase()) ||
        (recipDom.length > 0 && doms.includes(recipDom));
      gates.dbAllowsRecipient = dbAllowsRecipient;
      if (!dbAllowsRecipient) reasons.push("recipient is not permitted by Control Center allowlist");
    }
  }

  // Recipient shape gate (allowlist membership handled above).
  gates.recipient = recipientEmail;

  // Template gate
  const { data: tmpl } = await admin
    .from("core_template")
    .select("id, is_active, active_version_id")
    .eq("code", TEMPLATE_CODE).maybeSingle();
  gates.templateActive = !!(tmpl?.is_active && tmpl?.active_version_id);
  if (!tmpl?.is_active || !tmpl?.active_version_id) {
    reasons.push("template COMM_HUB_ADMIN_TEST_NOTICE_EMAIL missing or has no active version");
  }

  // No eligible queued LIVE messages outside this workflow
  const { count: liveQueued } = await admin
    .from("communication_message")
    .select("id", { count: "exact", head: true })
    .eq("test_mode", false)
    .in("status", ["queued", "sending"]);
  gates.otherLiveQueued = liveQueued ?? 0;
  if ((liveQueued ?? 0) > 0) {
    reasons.push(`there are ${liveQueued} eligible queued/sending live messages — resolve before opening live gates`);
  }

  // Event-level live status gate (Phase 1C-B9-B-A-2).
  const { data: eventStatus } = await admin.rpc("get_event_live_status", {
    p_module_code: MODULE_CODE, p_event_code: EVENT_CODE,
  });
  const status = typeof eventStatus === "string" ? eventStatus : null;
  gates.eventLiveStatus = status;
  if (status !== "live_manual_only" && status !== "live_cron_allowed") {
    reasons.push(`event live status is "${status ?? "unset"}" — must be live_manual_only or live_cron_allowed`);
  }

  // Central DB-side live-gate evaluator (EPIC 1). Provides a single canonical
  // ready/reasons/gates verdict computed inside the DB in one call, then
  // merged with env-scoped reasons above for defense in depth.
  try {
    const { data: dbGate } = await admin.rpc("evaluate_comm_hub_live_gate", {
      p_module_code: MODULE_CODE,
      p_event_code: EVENT_CODE,
      p_recipient_email: recipientEmail,
      p_mode: "manual",
    });
    gates.dbGate = dbGate ?? null;
    if (dbGate && (dbGate as any).ready === false && Array.isArray((dbGate as any).reasons)) {
      for (const r of (dbGate as any).reasons) {
        const tagged = `db_gate:${r}`;
        if (!reasons.includes(tagged)) reasons.push(tagged);
      }
    }
  } catch (_e) { /* non-fatal: inline gates above still apply */ }

  return { ready: reasons.length === 0, reasons, gates };
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

  // Auth + admin gate
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

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const action: "preflight" | "dry_run" | "live" =
    body?.action === "preflight" ? "preflight" :
    body?.action === "live" ? "live" : "dry_run";

  const recipientEmail = String(body?.recipientEmail ?? "").trim().toLowerCase();
  const recipientName = String(body?.recipientName ?? "").trim().slice(0, 200);
  const reason = String(body?.reason ?? "").trim().slice(0, 1000);
  const typed = String(body?.typedConfirmation ?? "");
  const idempotencyKey = String(body?.idempotencyKey ?? "").trim().slice(0, 200) || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return json({ ok: false, error: "invalid_recipient" }, 400);
  }

  // -------------------------------------------------------------------------
  // Action: preflight — NO side effects
  // -------------------------------------------------------------------------
  if (action === "preflight") {
    const pf = await evaluateGates(admin, recipientEmail);
    return json({
      ok: true, action, ...pf,
      recipient_masked: maskEmail(recipientEmail),
    });
  }

  if (!reason) return json({ ok: false, error: "reason_required" }, 400);

  // -------------------------------------------------------------------------
  // Action: live — hard-gated. Block BEFORE any DB write.
  // -------------------------------------------------------------------------
  if (action === "live") {
    if (typed !== LIVE_TYPED) {
      return json({ ok: false, error: "typed_confirmation_required", expected: LIVE_TYPED }, 400);
    }
    // Recipient allowlist membership is enforced by evaluateGates() below via Control Center.

    const pf = await evaluateGates(admin, recipientEmail);
    if (!pf.ready) {
      // Audit the blocked live attempt; no request/message/attempt created.
      try {
        await admin.from("communication_hub_control_audit").insert({
          setting_key: "admin_test_notice_live_blocked",
          old_value: null,
          new_value: {
            module_code: MODULE_CODE, event_code: EVENT_CODE,
            recipient_masked: maskEmail(recipientEmail),
            reasons: pf.reasons,
            gates: pf.gates,
            template_code: TEMPLATE_CODE,
            attempted_action: "live",
          } as any,
          reason,
          changed_by: actorUserId,
          source: "communication-hub-control-center",
        });
      } catch { /* audit non-fatal */ }

      return json({
        ok: true, action, blocked: true, ready: false, reasons: pf.reasons,
        recipient_masked: maskEmail(recipientEmail),
      }, 200);
    }

    // -----------------------------------------------------------------
    // Phase 1C-B9-B-B — real live path.
    // Enqueue via send_communication_v1 (testMode=false) then target-dispatch
    // exactly the returned messageId. No batch fallback. No direct inserts.
    // -----------------------------------------------------------------
    const { data: tmplRowL, error: tmplErrL } = await admin
      .from("core_template")
      .select("id, code, status, is_active, active_version_id")
      .eq("code", TEMPLATE_CODE).eq("is_active", true).maybeSingle();
    if (tmplErrL || !tmplRowL || !tmplRowL.active_version_id) {
      return json({ ok: false, action, error: "template_not_found_or_no_active_version",
        detail: tmplErrL?.message ?? "COMM_HUB_ADMIN_TEST_NOTICE_EMAIL missing" }, 500);
    }
    const { data: verRowL, error: verErrL } = await admin
      .from("core_template_version")
      .select("id, version_no, status, body_metadata")
      .eq("id", tmplRowL.active_version_id).maybeSingle();
    if (verErrL || !verRowL) {
      return json({ ok: false, action, error: "template_version_missing", detail: verErrL?.message ?? null }, 500);
    }

    const sentByEmailL = userRes.user.email ?? actorUserId;
    const tokensL: Record<string, string> = {
      recipient_name: recipientName || "Administrator",
      sent_by: String(sentByEmailL),
    };
    const requiredTokensL: string[] = Array.isArray(verRowL.body_metadata?.required_tokens)
      ? verRowL.body_metadata.required_tokens : [];
    const serverProvidedL = new Set(["request_no", "request_id", "generated_at", "module_code", "event_code"]);
    const missingL: string[] = requiredTokensL.filter((k) => !(k in tokensL) && !serverProvidedL.has(k));
    if (missingL.length) return json({ ok: false, action, error: "missing_required_tokens", missing: missingL }, 400);

    const rpcPayloadL = {
      moduleCode: MODULE_CODE, eventCode: EVENT_CODE, channels: ["email"],
      recipients: [{ role: "to", type: "ADMIN_USER", email: recipientEmail, name: recipientName || null, channelHint: "email" }],
      tokens: tokensL,
      data: { recipient_name: tokensL.recipient_name, sent_by: sentByEmailL, template_code: TEMPLATE_CODE },
      metadata: { source: "communication-hub-control-center", phase: "1C-B9-B-B", template_code: TEMPLATE_CODE, resolver: "rpc-render-after-request_no", live: true },
      priority: "normal", origin: "comm_hub",
      testMode: false,
      executeLive: true,
      idempotencyKey, requestedBy: actorUserId, callerUserId: actorUserId,
      templateCode: TEMPLATE_CODE, templateId: tmplRowL.id, templateVersionId: tmplRowL.active_version_id,
    };
    const { data: rpcResL, error: rpcErrL } = await admin.rpc("send_communication_v1", { payload: rpcPayloadL });
    if (rpcErrL || !rpcResL || (rpcResL as any).ok === false) {
      return json({ ok: false, action, error: "enqueue_failed", detail: rpcErrL?.message ?? (rpcResL as any)?.error ?? "unknown" }, 500);
    }
    const rL: any = rpcResL;
    const requestIdL: string | null = rL.requestId ?? rL.request_id ?? null;
    const requestNoL: string | null = rL.requestNo ?? rL.request_no ?? null;
    const messageIdsL: string[] = Array.isArray(rL.messageIds ?? rL.message_ids) ? (rL.messageIds ?? rL.message_ids) : [];
    const targetMessageIdL = messageIdsL[0] ?? null;
    if (!requestIdL || !targetMessageIdL) return json({ ok: false, action, error: "enqueue_returned_no_ids", rpcRes: rL }, 500);

    const dispatchUrlL = `${SUPABASE_URL}/functions/v1/comm-hub-dispatch`;
    let dispatchRespL: any = null; let dispatchStatusL = 0;
    try {
      const resp = await fetch(dispatchUrlL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-comm-hub-dispatch-secret": DISPATCH_SECRET, Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ targetMessageId: targetMessageIdL, manual: true, reason, source: "comm-hub-admin-test-notice-live" }),
      });
      dispatchStatusL = resp.status;
      dispatchRespL = await resp.json().catch(() => ({}));
    } catch (e: any) {
      dispatchRespL = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) };
    }

    try {
      await admin.from("communication_hub_control_audit").insert({
        setting_key: "admin_test_notice_live_sent",
        old_value: null,
        new_value: {
          module_code: MODULE_CODE, event_code: EVENT_CODE,
          request_id: requestIdL, request_no: requestNoL, message_id: targetMessageIdL,
          template_code: TEMPLATE_CODE, template_id: tmplRowL.id, template_version_id: tmplRowL.active_version_id,
          template_version_no: verRowL.version_no,
          test_mode: false, recipient_masked: maskEmail(recipientEmail), idempotency_key: idempotencyKey,
          dispatch: {
            status: dispatchStatusL, sentDryRun: dispatchRespL?.sentDryRun ?? null, sentLive: dispatchRespL?.sentLive ?? null,
            claimed: dispatchRespL?.claimed ?? null, processed: dispatchRespL?.processed ?? null, targetMode: dispatchRespL?.targetMode ?? null,
          },
        } as any,
        reason, changed_by: actorUserId, source: "communication-hub-control-center",
      });
    } catch { /* audit non-fatal */ }

    const finalMsgL = await admin.from("communication_message")
      .select("id, status, test_mode, provider_message_id, sent_at, attempt_count, locked_at, locked_by, error_code, error_message, template_version_id, subject")
      .eq("id", targetMessageIdL).maybeSingle();
    const attemptsL = await admin.from("communication_delivery_attempt")
      .select("id, attempt_no, status, provider_message_id, error_code, started_at, finished_at")
      .eq("message_id", targetMessageIdL).order("attempt_no");

    return json({
      ok: true, action, mode: "live", blocked: false, ready: true,
      facadePath: "comm-hub-admin-test-notice(live) → send_communication_v1 (RPC, testMode=false) → comm-hub-dispatch (targetMode)",
      moduleCode: MODULE_CODE, eventCode: EVENT_CODE,
      requestId: requestIdL, requestNo: requestNoL, messageId: targetMessageIdL,
      dispatch: { status: dispatchStatusL, response: dispatchRespL },
      message: finalMsgL.data ?? null,
      attempts: attemptsL.data ?? [],
      recipient_masked: maskEmail(recipientEmail),
    });
  }

  // -------------------------------------------------------------------------
  // Action: dry_run — unchanged façade path from B9-A.2
  // -------------------------------------------------------------------------
  if (typed !== DRY_RUN_TYPED) {
    return json({ ok: false, error: "typed_confirmation_required", expected: DRY_RUN_TYPED }, 400);
  }

  const { data: tmplRow, error: tmplErr } = await admin
    .from("core_template")
    .select("id, code, status, is_active, active_version_id")
    .eq("code", TEMPLATE_CODE).eq("is_active", true).maybeSingle();
  if (tmplErr || !tmplRow || !tmplRow.active_version_id) {
    return json({ ok: false, error: "template_not_found_or_no_active_version",
      detail: tmplErr?.message ?? "COMM_HUB_ADMIN_TEST_NOTICE_EMAIL missing" }, 500);
  }
  const { data: verRow, error: verErr } = await admin
    .from("core_template_version")
    .select("id, version_no, status, subject, body_html, body_text, body_metadata")
    .eq("id", tmplRow.active_version_id).maybeSingle();
  if (verErr || !verRow) {
    return json({ ok: false, error: "template_version_missing", detail: verErr?.message ?? null }, 500);
  }

  const sentByEmail = userRes.user.email ?? actorUserId;
  const tokens: Record<string, string> = {
    recipient_name: recipientName || "Administrator",
    sent_by: String(sentByEmail),
  };
  const requiredTokens: string[] = Array.isArray(verRow.body_metadata?.required_tokens)
    ? verRow.body_metadata.required_tokens : [];
  const serverProvided = new Set(["request_no", "request_id", "generated_at", "module_code", "event_code"]);
  const missing: string[] = requiredTokens.filter((k) => !(k in tokens) && !serverProvided.has(k));
  if (missing.length) return json({ ok: false, error: "missing_required_tokens", missing }, 400);

  const rpcPayload = {
    moduleCode: MODULE_CODE, eventCode: EVENT_CODE, channels: ["email"],
    recipients: [{ role: "to", type: "ADMIN_USER", email: recipientEmail, name: recipientName || null, channelHint: "email" }],
    tokens,
    data: { recipient_name: tokens.recipient_name, sent_by: sentByEmail, template_code: TEMPLATE_CODE },
    metadata: { source: "communication-hub-control-center", phase: "1C-B9-B-A", template_code: TEMPLATE_CODE, resolver: "rpc-render-after-request_no" },
    priority: "normal", origin: "comm_hub",
    testMode: true,
    idempotencyKey, requestedBy: actorUserId, callerUserId: actorUserId,
    templateCode: TEMPLATE_CODE, templateId: tmplRow.id, templateVersionId: tmplRow.active_version_id,
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
  let dispatchResp: any = null; let dispatchStatus = 0;
  try {
    const resp = await fetch(dispatchUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-comm-hub-dispatch-secret": DISPATCH_SECRET, Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ targetMessageId, manual: true, reason, source: "comm-hub-admin-test-notice" }),
    });
    dispatchStatus = resp.status;
    dispatchResp = await resp.json().catch(() => ({}));
  } catch (e: any) {
    dispatchResp = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) };
  }

  try {
    await admin.from("communication_hub_control_audit").insert({
      setting_key: "admin_test_notice_template_dry_run",
      old_value: null,
      new_value: {
        module_code: MODULE_CODE, event_code: EVENT_CODE,
        request_id: requestId, request_no: requestNo, message_id: targetMessageId,
        template_code: TEMPLATE_CODE, template_id: tmplRow.id, template_version_id: tmplRow.active_version_id,
        template_version_no: verRow.version_no,
        test_mode: true, recipient_masked: maskEmail(recipientEmail), idempotency_key: idempotencyKey,
        dispatch: {
          status: dispatchStatus, sentDryRun: dispatchResp?.sentDryRun ?? null, sentLive: dispatchResp?.sentLive ?? null,
          claimed: dispatchResp?.claimed ?? null, processed: dispatchResp?.processed ?? null, targetMode: dispatchResp?.targetMode ?? null,
        },
      } as any,
      reason, changed_by: actorUserId, source: "communication-hub-control-center",
    });
  } catch { /* audit non-fatal */ }

  const finalMsg = await admin.from("communication_message")
    .select("id, status, test_mode, provider_message_id, sent_at, attempt_count, locked_at, locked_by, error_code, template_version_id, subject")
    .eq("id", targetMessageId).maybeSingle();
  const attempts = await admin.from("communication_delivery_attempt")
    .select("id, attempt_no, status, provider_message_id, error_code, started_at, finished_at")
    .eq("message_id", targetMessageId).order("attempt_no");

  return json({
    ok: true, action, mode: "dry-run",
    facadePath: "comm-hub-admin-test-notice → send_communication_v1 (RPC) → comm-hub-dispatch (targetMode)",
    moduleCode: MODULE_CODE, eventCode: EVENT_CODE,
    requestId, requestNo, messageId: targetMessageId,
    reusedExistingRequest: !!r.reusedExistingRequest,
    enqueueWarnings: r.warnings ?? [],
    dispatch: { status: dispatchStatus, response: dispatchResp },
    message: finalMsg.data ?? null,
    attempts: attempts.data ?? [],
  });
});
