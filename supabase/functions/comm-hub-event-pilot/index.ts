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

  // Template: prefer explicit templateCode; fallback to the mapped template
  // in communication_hub_event_template_map for this module/event.
  let template: any = null;
  let resolvedTemplateCode = templateCode;
  if (!resolvedTemplateCode) {
    const { data: mapRow } = await admin
      .from("communication_hub_event_template_map")
      .select("template_code, template_id")
      .eq("module_code", moduleCode).eq("event_code", eventCode).maybeSingle();
    if (mapRow?.template_code) resolvedTemplateCode = mapRow.template_code;
  }
  if (resolvedTemplateCode) {
    const { data } = await admin
      .from("core_template")
      .select("id, code, name, module_code, template_type, status, is_active, active_version_id")
      .eq("code", resolvedTemplateCode).maybeSingle();
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

  const rawAction = String((body as any)?.action ?? "").toLowerCase();
  const action: "preflight" | "dry_run" | "rehearse" | "live_preflight" | "live_send" =
    rawAction === "preflight" || req.url.includes("preflight") ? "preflight"
    : rawAction === "rehearse" ? "rehearse"
    : rawAction === "live_preflight" ? "live_preflight"
    : rawAction === "live_send" ? "live_send"
    : "dry_run";

  // ---------- EPIC 3B: shared live-pilot allowlist ----------
  const LIVE_PILOT_MODULE = "COMPLIANCE";
  const LIVE_PILOT_EVENT = "INTERNAL_CASE_STATUS_NOTICE";
  const LIVE_PILOT_TEMPLATE = "COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL";
  const LIVE_SEND_TYPED = "SEND ONE LIVE INTERNAL PILOT";

  async function computeLiveGates(admin: any, moduleCode: string, eventCode: string, recipientEmail: string) {
    const reasons: string[] = [];
    const envEmailLive = (Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE") ?? "").toLowerCase() === "true";
    if (!envEmailLive) reasons.push("ENV_LIVE_GATE_FALSE");

    const { data: s } = await admin.from("communication_hub_control_settings")
      .select("dispatch_enabled, dry_run_only, email_live_enabled, allowed_email_addresses, allowed_email_domains, live_eligible_after, live_eligible_max_age_minutes, cron_desired_enabled")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    const settings = s ?? null;
    if (!settings) reasons.push("control_settings_missing");
    if (settings && !settings.dispatch_enabled) reasons.push("dispatch_disabled");
    if (settings && settings.dry_run_only) reasons.push("dry_run_only_true");
    if (settings && !settings.email_live_enabled) reasons.push("email_live_enabled_false");
    if (settings && !(
      (settings.allowed_email_addresses?.length ?? 0) === 1 &&
      String(settings.allowed_email_addresses?.[0] ?? "").toLowerCase() === "rohit@mishainfotech.com"
    )) reasons.push("allowlist_addresses_not_exact_rohit");
    if (settings && (settings.allowed_email_domains?.length ?? 0) !== 0) reasons.push("allowlist_domains_not_empty");

    // Window window expiry
    let windowOpen = false;
    let windowExpiresAt: string | null = null;
    if (settings?.live_eligible_after) {
      const startMs = new Date(settings.live_eligible_after).getTime();
      const ageMin = Math.max(1, Math.min(60, settings.live_eligible_max_age_minutes ?? 5));
      const expiresMs = startMs + ageMin * 60_000;
      windowExpiresAt = new Date(expiresMs).toISOString();
      windowOpen = !settings.dry_run_only && settings.email_live_enabled && Date.now() < expiresMs;
    }
    if (!windowOpen) reasons.push("live_window_not_open_or_expired");

    // Event status
    const { data: evc } = await admin.from("communication_hub_event_live_control")
      .select("status, risk_level")
      .eq("module_code", moduleCode).eq("event_code", eventCode).maybeSingle();
    if (!evc) reasons.push("event_live_control_row_missing");
    else if (evc.status !== "live_manual_only") reasons.push(`event_status_not_live_manual_only (got ${evc.status})`);

    // Recipient exact
    if (String(recipientEmail).toLowerCase() !== "rohit@mishainfotech.com") reasons.push("recipient_not_exact_rohit");

    // Live queued=0
    const { count: liveQueued } = await admin.from("communication_message")
      .select("id", { count: "exact", head: true })
      .eq("test_mode", false).in("status", ["queued", "sending"]);
    if ((liveQueued ?? 0) > 0) reasons.push(`live_queued_present (${liveQueued})`);

    // Cron
    if (settings?.cron_desired_enabled) reasons.push("cron_desired_enabled_true");

    // Proposal exists
    const { data: proposal } = await admin.from("communication_hub_control_audit")
      .select("id, changed_at")
      .eq("setting_key", `live_readiness_proposal:${moduleCode}:${eventCode}`)
      .order("changed_at", { ascending: false }).limit(1).maybeSingle();
    if (!proposal) reasons.push("live_readiness_proposal_missing");

    // Operator rehearsal pass
    const { data: rehearsal } = await admin.from("communication_hub_control_audit")
      .select("new_value, changed_at")
      .eq("setting_key", `operator_rehearsal_run:${moduleCode}:${eventCode}`)
      .order("changed_at", { ascending: false }).limit(1).maybeSingle();
    const rehearsalPass = !!rehearsal && (rehearsal as any).new_value?.overall === "pass";
    if (!rehearsalPass) reasons.push("operator_rehearsal_not_passed");

    // Latest dry-run request/msg
    const { data: dryRun } = await admin.from("communication_hub_control_audit")
      .select("new_value, changed_at")
      .eq("setting_key", "generic_event_pilot_dry_run")
      .order("changed_at", { ascending: false }).limit(20);
    const latestDry = (dryRun ?? []).map((r: any) => r.new_value).find((v: any) => v?.module_code === moduleCode && v?.event_code === eventCode);
    const dryRunOk = !!latestDry && latestDry.dispatch?.sentDryRun === 1 && latestDry.dispatch?.sentLive === 0 && latestDry.test_mode === true;
    if (!dryRunOk) reasons.push("latest_dry_run_missing_or_failed");

    return {
      reasons,
      env: { envEmailLive },
      settings,
      windowOpen, windowExpiresAt,
      eventStatus: evc?.status ?? null,
      liveQueued: liveQueued ?? 0,
      proposalExists: !!proposal,
      rehearsalPass,
      latestDryRun: latestDry ?? null,
    };
  }

  // ---------- Operator Rehearsal (EPIC 2E) ----------
  if (action === "rehearse") {
    const rehearseModule = String((body as any)?.moduleCode ?? "").trim();
    const rehearseEvent = String((body as any)?.eventCode ?? "").trim();
    const rehearseTemplate = String((body as any)?.templateCode ?? "").trim();
    const rehearseReason = String((body as any)?.reason ?? "").trim().slice(0, 1000);
    const rehearseTyped = String((body as any)?.typedConfirmation ?? "");
    if (rehearseTyped !== "RUN OPERATOR REHEARSAL") {
      return json({ ok: false, error: "typed_confirmation_required", expected: "RUN OPERATOR REHEARSAL" }, 400);
    }
    if (!rehearseModule || !rehearseEvent || !rehearseTemplate) {
      return json({ ok: false, error: "moduleCode_eventCode_templateCode_required" }, 400);
    }
    if (!rehearseReason || rehearseReason.length < 6) {
      return json({ ok: false, error: "reason_required_min_6" }, 400);
    }

    const results: Record<string, any> = { pass: {}, ids: {}, errors: {} };

    async function callRpc(fn: string, args: Record<string, unknown>) {
      const { data, error } = await admin.rpc(fn, args as any);
      if (error) throw new Error(`${fn}: ${error.message}`);
      return data as any;
    }
    async function loadMsg(id: string) {
      const { data } = await admin.from("communication_message")
        .select("id, status, locked_at, locked_by, error_code, next_attempt_at, test_mode, provider_message_id")
        .eq("id", id).maybeSingle();
      return data;
    }
    async function loadEvents(msgId: string) {
      const { data } = await admin.from("communication_event_log")
        .select("event_type, source, payload, created_at")
        .eq("message_id", msgId).order("created_at", { ascending: true });
      return data ?? [];
    }
    async function loadAudit(key: string) {
      const { data } = await admin.from("communication_hub_control_audit")
        .select("id, setting_key, changed_at")
        .eq("setting_key", key).order("changed_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    }

    // 1) CANCEL
    try {
      const c = await callRpc("create_comm_hub_synthetic_failed_test_message", {
        p_module_code: rehearseModule, p_event_code: rehearseEvent,
        p_template_code: rehearseTemplate,
        p_reason: `${rehearseReason} [cancel rehearsal]`, p_actor_user_id: actorUserId,
      });
      const mid = c.message_id;
      await callRpc("cancel_comm_hub_message", { p_message_id: mid, p_reason: `${rehearseReason} [cancel rehearsal]`, p_actor_user_id: actorUserId });
      const msg = await loadMsg(mid);
      const evs = await loadEvents(mid);
      const audit = await loadAudit(`message_cancelled:${mid}`);
      const pass = msg?.status === "cancelled" && !!msg?.error_code && !msg?.locked_at
        && evs.some((e: any) => (e.payload?.stage ?? e.event_type) === "MESSAGE_CANCELLED_BY_ADMIN" || e.event_type === "cancelled")
        && !!audit;
      results.pass.cancel = pass;
      results.ids.cancel = { request_id: c.request_id, message_id: mid, request_no: c.request_no, audit_id: audit?.id ?? null };
    } catch (e: any) { results.pass.cancel = false; results.errors.cancel = e.message; }

    // 2) RETRY DRY-RUN + target dispatch
    try {
      const c = await callRpc("create_comm_hub_synthetic_failed_test_message", {
        p_module_code: rehearseModule, p_event_code: rehearseEvent,
        p_template_code: rehearseTemplate,
        p_reason: `${rehearseReason} [retry rehearsal]`, p_actor_user_id: actorUserId,
      });
      const mid = c.message_id;
      await callRpc("retry_comm_hub_message", { p_message_id: mid, p_reason: `${rehearseReason} [retry rehearsal]`, p_actor_user_id: actorUserId });
      const afterRetry = await loadMsg(mid);
      const evsRetry = await loadEvents(mid);

      // target-dispatch this specific message (test_mode=true, safe)
      let dispatchStatus = 0; let dispatchResp: any = null;
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/comm-hub-dispatch`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-comm-hub-dispatch-secret": DISPATCH_SECRET,
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({ targetMessageId: mid, manual: true, reason: `${rehearseReason} [retry rehearsal dispatch]`, source: "operator-rehearsal-wizard" }),
        });
        dispatchStatus = resp.status;
        dispatchResp = await resp.json().catch(() => ({}));
      } catch (e: any) { dispatchResp = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) }; }

      const afterDispatch = await loadMsg(mid);
      const audit = await loadAudit(`message_requeued:${mid}`);
      const retryOk = afterRetry?.status === "queued" && !afterRetry?.locked_at && !afterRetry?.locked_by;
      const dispatchOk = (dispatchResp?.sentDryRun ?? 0) === 1 && (dispatchResp?.sentLive ?? 0) === 0
        && (afterDispatch?.provider_message_id ?? "").startsWith("dry-run:")
        && afterDispatch?.test_mode === true;
      results.pass.retry = retryOk && dispatchOk && !!audit;
      results.ids.retry = {
        request_id: c.request_id, message_id: mid, request_no: c.request_no,
        audit_id: audit?.id ?? null,
        dispatch: { status: dispatchStatus, sentDryRun: dispatchResp?.sentDryRun ?? null, sentLive: dispatchResp?.sentLive ?? null, targetMode: dispatchResp?.targetMode ?? null },
        final_status: afterDispatch?.status ?? null,
        provider_message_id: afterDispatch?.provider_message_id ?? null,
      };
    } catch (e: any) { results.pass.retry = false; results.errors.retry = e.message; }

    // 3) CLEAR STALE LOCK
    try {
      const c = await callRpc("create_comm_hub_synthetic_stale_locked_test_message", {
        p_module_code: rehearseModule, p_event_code: rehearseEvent,
        p_template_code: rehearseTemplate,
        p_reason: `${rehearseReason} [clear-lock rehearsal]`, p_actor_user_id: actorUserId,
      });
      const mid = c.message_id;
      await callRpc("clear_comm_hub_message_lock", { p_message_id: mid, p_reason: `${rehearseReason} [clear-lock rehearsal]`, p_actor_user_id: actorUserId });
      const msg = await loadMsg(mid);
      const evs = await loadEvents(mid);
      const audit = await loadAudit(`message_lock_cleared:${mid}`);
      const pass = msg?.status === "queued" && !msg?.locked_at && !msg?.locked_by
        && evs.some((e: any) => (e.payload?.stage ?? "") === "STALE_LOCK_CLEARED_BY_ADMIN" || e.event_type === "lock_cleared" || e.event_type === "requeued")
        && !!audit;
      results.pass.clear_lock = pass;
      results.ids.clear_lock = { request_id: c.request_id, message_id: mid, request_no: c.request_no, audit_id: audit?.id ?? null, final_status: msg?.status ?? null };
    } catch (e: any) { results.pass.clear_lock = false; results.errors.clear_lock = e.message; }

    // Rehearsal audit envelope
    try {
      const allPassed = results.pass.cancel === true && results.pass.retry === true && results.pass.clear_lock === true;
      await admin.from("communication_hub_control_audit").insert({
        setting_key: `operator_rehearsal_run:${rehearseModule}:${rehearseEvent}`,
        old_value: null,
        new_value: {
          module_code: rehearseModule,
          event_code: rehearseEvent,
          template_code: rehearseTemplate,
          overall: allPassed ? "pass" : "fail",
          results,
        },
        reason: rehearseReason, changed_by: actorUserId,
        source: "operator-rehearsal-wizard",
      });
    } catch { /* audit non-fatal */ }

    return json({
      ok: true, action: "rehearse",
      module_code: rehearseModule, event_code: rehearseEvent, template_code: rehearseTemplate,
      results,
      safety: {
        live_email_sent: false, provider_called: false,
        notification_queue_touched: false, notification_logs_touched: false,
        test_mode_only: true,
      },
    });
  }


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

  // ---------- EPIC 3B: Live preflight (read-only) ----------
  if (action === "live_preflight") {
    if (moduleCode !== LIVE_PILOT_MODULE || eventCode !== LIVE_PILOT_EVENT) {
      return json({ ok: false, error: "live_pilot_event_not_permitted", allowed: `${LIVE_PILOT_MODULE}/${LIVE_PILOT_EVENT}` }, 400);
    }
    const { template, version, blockers: loadBlockers } =
      await loadEventAndTemplate(admin, moduleCode, eventCode, templateCode ?? LIVE_PILOT_TEMPLATE);
    const gateInfo = await computeLiveGates(admin, moduleCode, eventCode, recipientEmail);
    const missing = version ? validateTokens(version, tokens) : ["template_version_missing"];
    const allReasons = [...gateInfo.reasons, ...loadBlockers];
    if (template && template.code !== LIVE_PILOT_TEMPLATE) allReasons.push(`template_code_mismatch (got ${template.code})`);
    if (missing.length) allReasons.push(`missing_required_tokens: ${missing.join(",")}`);
    return json({
      ok: true, action, ready: allReasons.length === 0,
      reasons: allReasons,
      env: gateInfo.env,
      db_gates: gateInfo.settings ? {
        dispatch_enabled: gateInfo.settings.dispatch_enabled,
        dry_run_only: gateInfo.settings.dry_run_only,
        email_live_enabled: gateInfo.settings.email_live_enabled,
        allowed_email_addresses: gateInfo.settings.allowed_email_addresses,
        allowed_email_domains: gateInfo.settings.allowed_email_domains,
        cron_desired_enabled: gateInfo.settings.cron_desired_enabled,
      } : null,
      window: { open: gateInfo.windowOpen, expires_at: gateInfo.windowExpiresAt },
      event_status: gateInfo.eventStatus,
      live_queued: gateInfo.liveQueued,
      proposal_exists: gateInfo.proposalExists,
      rehearsal_pass: gateInfo.rehearsalPass,
      latest_dry_run: gateInfo.latestDryRun ? {
        request_no: gateInfo.latestDryRun.request_no,
        message_id: gateInfo.latestDryRun.message_id,
        test_mode: gateInfo.latestDryRun.test_mode,
        dispatch: gateInfo.latestDryRun.dispatch,
      } : null,
      template_code: template?.code ?? null,
      template_version_id: version?.id ?? null,
      recipient_masked: maskEmail(recipientEmail),
    });
  }

  // ---------- EPIC 3B: Guarded live send (exactly one live message) ----------
  if (action === "live_send") {
    if (moduleCode !== LIVE_PILOT_MODULE || eventCode !== LIVE_PILOT_EVENT) {
      return json({ ok: false, error: "live_pilot_event_not_permitted" }, 400);
    }
    if (String(body.typedConfirmation ?? "") !== LIVE_SEND_TYPED) {
      return json({ ok: false, error: "typed_confirmation_required", expected: LIVE_SEND_TYPED }, 400);
    }
    const reasonTrim = String(body.reason ?? "").trim();
    if (reasonTrim.length < 6) return json({ ok: false, error: "reason_required_min_6" }, 400);

    // Re-check gates server-side (do not trust client)
    const { template, version, blockers: loadBlockers } =
      await loadEventAndTemplate(admin, moduleCode, eventCode, templateCode ?? LIVE_PILOT_TEMPLATE);
    const gateInfo = await computeLiveGates(admin, moduleCode, eventCode, recipientEmail);
    const missing = version ? validateTokens(version, tokens) : ["template_version_missing"];
    const allReasons = [...gateInfo.reasons, ...loadBlockers];
    if (template && template.code !== LIVE_PILOT_TEMPLATE) allReasons.push(`template_code_mismatch (got ${template.code})`);
    if (missing.length) allReasons.push(`missing_required_tokens: ${missing.join(",")}`);
    if (allReasons.length > 0) {
      return json({ ok: false, error: "live_preflight_failed", reasons: allReasons, blocked: true }, 400);
    }

    // Audit BEFORE
    await admin.from("communication_hub_control_audit").insert({
      setting_key: `live_pilot_send_attempt:${moduleCode}:${eventCode}`,
      old_value: null,
      new_value: {
        module_code: moduleCode, event_code: eventCode,
        template_code: template!.code, template_version_id: template!.active_version_id,
        recipient_masked: maskEmail(recipientEmail), stage: "BEFORE_ENQUEUE",
      },
      reason: reasonTrim, changed_by: actorUserId, source: "comm-hub-event-pilot-live-send",
    });

    const livePayload = {
      moduleCode, eventCode, channels: ["email"],
      recipients: [{ role: "to", type: "ADMIN_USER", email: recipientEmail, name: recipientName || null, channelHint: "email" }],
      tokens: { ...tokens, recipient_name: tokens.recipient_name ?? recipientName ?? "Administrator" },
      data: { ...tokens, template_code: template!.code },
      metadata: { source: "comm-hub-event-pilot-live-send", phase: "EPIC-3B", template_code: template!.code },
      priority: "normal", origin: "comm_hub",
      testMode: false,
      idempotencyKey, requestedBy: actorUserId, callerUserId: actorUserId,
      templateCode: template!.code, templateId: template!.id, templateVersionId: template!.active_version_id,
    };
    const { data: rpcRes, error: rpcErr } = await admin.rpc("send_communication_v1", { payload: livePayload });
    if (rpcErr || !rpcRes || (rpcRes as any).ok === false) {
      return json({ ok: false, error: "live_enqueue_failed", detail: rpcErr?.message ?? (rpcRes as any)?.error ?? "unknown" }, 500);
    }
    const r: any = rpcRes;
    const requestId = r.requestId ?? r.request_id ?? null;
    const requestNo = r.requestNo ?? r.request_no ?? null;
    const messageIds: string[] = Array.isArray(r.messageIds ?? r.message_ids) ? (r.messageIds ?? r.message_ids) : [];
    const targetMessageId = messageIds[0] ?? null;
    if (!requestId || !targetMessageId || messageIds.length !== 1) {
      return json({ ok: false, error: "live_enqueue_bad_ids", messageIds }, 500);
    }

    // Dispatch exactly this message
    let dispatchResp: any = null; let dispatchStatus = 0;
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/comm-hub-dispatch`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-comm-hub-dispatch-secret": DISPATCH_SECRET,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ targetMessageId, manual: true, reason: reasonTrim, source: "comm-hub-event-pilot-live-send" }),
      });
      dispatchStatus = resp.status;
      dispatchResp = await resp.json().catch(() => ({}));
    } catch (e: any) {
      dispatchResp = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) };
    }

    const { data: finalMsg } = await admin.from("communication_message")
      .select("id, status, test_mode, provider_message_id, sent_at, attempt_count, error_code")
      .eq("id", targetMessageId).maybeSingle();

    // Audit AFTER
    await admin.from("communication_hub_control_audit").insert({
      setting_key: `live_pilot_send_result:${moduleCode}:${eventCode}`,
      old_value: null,
      new_value: {
        module_code: moduleCode, event_code: eventCode,
        request_id: requestId, request_no: requestNo, message_id: targetMessageId,
        template_code: template!.code, template_version_id: template!.active_version_id,
        test_mode: false, recipient_masked: maskEmail(recipientEmail),
        dispatch: {
          status: dispatchStatus,
          sentLive: dispatchResp?.sentLive ?? null,
          sentDryRun: dispatchResp?.sentDryRun ?? null,
          claimed: dispatchResp?.claimed ?? null,
          targetMode: dispatchResp?.targetMode ?? null,
        },
        final_message: finalMsg ?? null,
      },
      reason: reasonTrim, changed_by: actorUserId, source: "comm-hub-event-pilot-live-send",
    });

    return json({
      ok: true, action, mode: "live",
      moduleCode, eventCode,
      requestId, requestNo, messageId: targetMessageId,
      templateCode: template!.code, templateVersionId: template!.active_version_id,
      templateVersionNo: version!.version_no,
      dispatch: { status: dispatchStatus, response: dispatchResp },
      message: finalMsg ?? null,
      recipient_masked: maskEmail(recipientEmail),
      close_window_required: true,
    });
  }


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
    // EPIC 2B — informational live-gate evaluation (never blocks dry-run).
    let liveGate: any = null;
    try {
      const { data: gate } = await admin.rpc("evaluate_comm_hub_live_gate", {
        p_module_code: moduleCode,
        p_event_code: eventCode,
        p_recipient_email: recipientEmail,
        p_mode: "manual",
        p_template_code: template?.code ?? templateCode ?? null,
      });
      liveGate = gate ?? null;
    } catch (e) {
      liveGate = { error: "live_gate_evaluation_failed", detail: (e as any)?.message ?? String(e) };
    }

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
      live_gate_informational: liveGate,
      live_gate_note:
        "Live-gate blockers are informational for dry-run. Dry-run always sends test_mode=true and never calls the live provider.",
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
