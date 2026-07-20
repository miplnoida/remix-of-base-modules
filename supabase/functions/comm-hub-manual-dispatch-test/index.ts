// Enterprise Communication Hub — Manual One-Time Dispatch (Phase 1C-B8-D-A).
//
// Admin-only edge function. Two modes:
//   - dry-run    : creates ONE test_mode=true message and dispatches via targeted path.
//   - live       : requires executeLive + strict typed confirmation + all live gates open.
//   - preflight  : evaluates live gates only. Creates nothing. Dispatches nothing.
//
// Under Phase 1C-B8-D-A the live path is expected to remain BLOCKED because
// COMMUNICATION_HUB_EMAIL_LIVE=false, dry_run_only=true, email_live_enabled=false.
// Backend enforces every gate independently of the UI.

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

const ENV_EMAIL_LIVE = (Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE") ?? "").toLowerCase() === "true";

// Parse COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST — SAME semantics as comm-hub-dispatch:
// comma-separated; entries starting with "@" are domain rules, others are exact emails
// (lowercased, trimmed). Empty entries dropped. No value ever logged.
function parseAllowlistRaw(raw: string | undefined) {
  const emails = new Set<string>();
  const domains = new Set<string>();
  if (!raw) return { emails, domains };
  for (const part of raw.split(",")) {
    const t = part.trim().toLowerCase();
    if (!t) continue;
    if (t.startsWith("@")) domains.add(t.slice(1));
    else if (t.includes("@")) emails.add(t);
  }
  return { emails, domains };
}
const ENV_ALLOWLIST_RAW = Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST");
const ENV_ALLOWLIST_PARSED = parseAllowlistRaw(ENV_ALLOWLIST_RAW);
const ENV_ALLOWLIST_PRESENT = typeof ENV_ALLOWLIST_RAW === "string" && ENV_ALLOWLIST_RAW.length > 0;
const ENV_ALLOWLIST_EMAIL_COUNT = ENV_ALLOWLIST_PARSED.emails.size;
const ENV_ALLOWLIST_DOMAIN_COUNT = ENV_ALLOWLIST_PARSED.domains.size;
const ENV_ALLOWLIST_COUNT = ENV_ALLOWLIST_EMAIL_COUNT + ENV_ALLOWLIST_DOMAIN_COUNT;

const TYPED_DRY_RUN = "DISPATCH ONE TEST MESSAGE";
const TYPED_LIVE = "SEND ONE LIVE EMAIL";

function recipientDomain(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(at + 1).toLowerCase() : "";
}
function isRecipientAllowedByLists(
  email: string,
  addrs: string[],
  domains: string[],
): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  if (addrs.includes(e)) return true;
  const dom = recipientDomain(e);
  return dom.length > 0 && domains.includes(dom);
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

function requestNo(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `CR-${ts}-${suffix}`;
}

interface LiveGateResult {
  ready: boolean;
  gates: Record<string, boolean>;
  reasons: string[];
  settingsSummary: {
    dispatch_enabled: boolean;
    dry_run_only: boolean;
    email_live_enabled: boolean;
    allowed_email_addresses_count: number;
    allowed_email_domains_count: number;
    live_eligible_after: string | null;
    live_eligible_max_age_minutes: number | null;
  };
  cronPresent: boolean | null;
  envEmailLive: boolean;
  envAllowlistOk: boolean;
}

async function evaluateLiveGates(admin: any, recipientEmail: string | null): Promise<LiveGateResult> {
  const reasons: string[] = [];
  const gates: Record<string, boolean> = {};

  // Load settings row (singleton).
  const { data: sRow } = await admin
    .from("communication_hub_control_settings")
    .select("dispatch_enabled, dry_run_only, email_live_enabled, allowed_email_addresses, allowed_email_domains, live_eligible_after, live_eligible_max_age_minutes, operating_mode")
    .eq("singleton_guard", "primary")
    .maybeSingle();

  const s = sRow ?? {} as any;
  const allowedAddrs: string[] = (s.allowed_email_addresses ?? []).map((x: string) => String(x).trim().toLowerCase());
  const allowedDomains: string[] = (s.allowed_email_domains ?? []).map((x: string) => String(x).trim().toLowerCase());

  gates.env_email_live_true = ENV_EMAIL_LIVE;
  if (!ENV_EMAIL_LIVE) reasons.push("env COMMUNICATION_HUB_EMAIL_LIVE is not true");

  gates.db_dispatch_enabled = !!s.dispatch_enabled;
  if (!s.dispatch_enabled) reasons.push("DB dispatch_enabled=false");

  gates.db_dry_run_only_false = s.dry_run_only === false;
  if (s.dry_run_only !== false) reasons.push("DB dry_run_only=true");

  gates.db_email_live_enabled_true = s.email_live_enabled === true;
  if (s.email_live_enabled !== true) reasons.push("DB email_live_enabled=false");

  gates.db_live_eligible_after_set = !!s.live_eligible_after;
  if (!s.live_eligible_after) reasons.push("DB live_eligible_after is not set");

  const maxAge = Number(s.live_eligible_max_age_minutes ?? 0);
  gates.db_live_max_age_valid = maxAge >= 1 && maxAge <= 1440;
  if (!gates.db_live_max_age_valid) reasons.push("DB live_eligible_max_age_minutes invalid");

  // Recipient must be permitted by the Control Center allowlist
  // (allowed_email_addresses OR allowed_email_domains). No pinned recipient.
  gates.db_allowlist_configured = allowedAddrs.length > 0 || allowedDomains.length > 0;
  if (!gates.db_allowlist_configured) {
    reasons.push("DB allowlist is empty — configure allowed_email_addresses or allowed_email_domains in Control Center");
  }

  if (recipientEmail !== null) {
    const dom = recipientDomain(recipientEmail);
    gates.recipient_allowlisted = isRecipientAllowedByLists(recipientEmail, allowedAddrs, allowedDomains);
    if (!gates.recipient_allowlisted) reasons.push("recipient is not permitted by Control Center allowlist");

    gates.env_allowlist_permits_recipient =
      ENV_ALLOWLIST_PARSED.emails.has(recipientEmail.trim().toLowerCase()) ||
      (dom.length > 0 && ENV_ALLOWLIST_PARSED.domains.has(dom));
    if (!gates.env_allowlist_permits_recipient) reasons.push("env allowlist does not permit this recipient");
  } else {
    gates.env_allowlist_present = ENV_ALLOWLIST_EMAIL_COUNT + ENV_ALLOWLIST_DOMAIN_COUNT > 0;
    if (!gates.env_allowlist_present) reasons.push("env allowlist is empty");
  }

  // Cron presence via helper RPC.
  let cronPresent: boolean | null = null;
  try {
    const { data: cronRes } = await admin.rpc("get_comm_hub_cron_status");
    if (cronRes && typeof cronRes === "object") {
      cronPresent = !!(cronRes as any).jobid || !!(cronRes as any).exists || !!(cronRes as any).present;
    } else if (Array.isArray(cronRes)) {
      cronPresent = cronRes.length > 0;
    }
  } catch {
    cronPresent = null;
  }
  gates.cron_absent = cronPresent === false || cronPresent === null;
  if (cronPresent === true) reasons.push("cron is present — must be absent");

  return {
    ready: reasons.length === 0,
    gates,
    reasons,
    settingsSummary: {
      dispatch_enabled: !!s.dispatch_enabled,
      dry_run_only: !!s.dry_run_only,
      email_live_enabled: !!s.email_live_enabled,
      allowed_email_addresses_count: allowedAddrs.length,
      allowed_email_domains_count: allowedDomains.length,
      live_eligible_after: s.live_eligible_after ?? null,
      live_eligible_max_age_minutes: s.live_eligible_max_age_minutes ?? null,
    },
    cronPresent,
    envEmailLive: ENV_EMAIL_LIVE,
    envAllowlistOk: gates.env_allowlist_permits_recipient ?? gates.env_allowlist_present ?? false,
  };
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

  // 2. Parse body.
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const action: "preflight" | "dispatch" = body?.action === "preflight" ? "preflight" : "dispatch";

  // 2a. PREFLIGHT — no create, no dispatch, no provider call.
  if (action === "preflight") {
    const recipientProbe = body?.recipientEmail ? String(body.recipientEmail).trim().toLowerCase() : null;
    const gate = await evaluateLiveGates(admin, recipientProbe);
    const dom = recipientProbe ? recipientDomain(recipientProbe) : "";
    const envAllowlistPermitsRecipient = recipientProbe
      ? (ENV_ALLOWLIST_PARSED.emails.has(recipientProbe) || (dom.length > 0 && ENV_ALLOWLIST_PARSED.domains.has(dom)))
      : false;
    // Presence-only environment readiness (never returns secret values).
    const envReadiness = {
      resendApiKeyPresent: !!(Deno.env.get("RESEND_API_KEY") ?? "").trim(),
      dispatchSecretPresent: !!DISPATCH_SECRET,
      resendWebhookSecretPresent: !!(Deno.env.get("COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET") ?? "").trim(),
      emailLiveEnvPresent: typeof Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE") === "string"
        && (Deno.env.get("COMMUNICATION_HUB_EMAIL_LIVE") ?? "").length > 0,
      emailLiveEnvTrue: ENV_EMAIL_LIVE,
      emailLiveAllowlistConfigured: ENV_ALLOWLIST_PRESENT && ENV_ALLOWLIST_COUNT > 0,
      emailLiveAllowlistCount: ENV_ALLOWLIST_COUNT,
      emailLiveAllowlistEmailCount: ENV_ALLOWLIST_EMAIL_COUNT,
      emailLiveAllowlistDomainCount: ENV_ALLOWLIST_DOMAIN_COUNT,
      cronScheduled: gate.cronPresent === true,
    };
    return json({
      ok: true,
      mode: "preflight",
      ready: gate.ready,
      gates: gate.gates,
      reasons: gate.reasons,
      settings: gate.settingsSummary,
      envEmailLive: gate.envEmailLive,
      envAllowlistOk: gate.envAllowlistOk,
      cronPresent: gate.cronPresent,
      envAllowlistDiagnostics: {
        envAllowlistPresent: ENV_ALLOWLIST_PRESENT,
        envAllowlistCount: ENV_ALLOWLIST_COUNT,
        envAllowlistEmailCount: ENV_ALLOWLIST_EMAIL_COUNT,
        envAllowlistDomainCount: ENV_ALLOWLIST_DOMAIN_COUNT,
        envAllowlistPermitsRecipient,
      },
      envReadiness,
    });
  }

  // 3. Dispatch action — validate inputs.
  const recipientEmail = String(body?.recipientEmail ?? "").trim().toLowerCase();
  const recipientName = String(body?.recipientName ?? "").trim().slice(0, 200);
  const subject = String(body?.subject ?? "").trim().slice(0, 500);
  const bodyText = String(body?.bodyText ?? "").trim().slice(0, 20_000);
  const testModeRequested = body?.testMode !== false; // default true
  const executeLive = body?.executeLive === true;
  const reason = String(body?.reason ?? "").trim().slice(0, 1000);
  const typed = String(body?.typedConfirmation ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return json({ ok: false, error: "invalid_recipient" }, 400);
  }
  if (!subject) return json({ ok: false, error: "subject_required" }, 400);
  if (!bodyText) return json({ ok: false, error: "body_required" }, 400);
  if (!reason) return json({ ok: false, error: "reason_required" }, 400);

  const wantsLive = executeLive || testModeRequested === false;

  // 3a. LIVE PATH — enforce all gates BEFORE any create/dispatch.
  if (wantsLive) {
    // Basic shape gates first, so we never enqueue if these are wrong.
    const shapeReasons: string[] = [];
    if (!executeLive) shapeReasons.push("executeLive must be true");
    if (testModeRequested !== false) shapeReasons.push("testMode must be false");
    if (typed !== TYPED_LIVE) shapeReasons.push(`typedConfirmation must be exactly "${TYPED_LIVE}"`);
    // Recipient allowlist is enforced by evaluateLiveGates() below via Control Center.

    const gate = await evaluateLiveGates(admin, recipientEmail);
    const combinedReasons = [...shapeReasons, ...gate.reasons];
    const ready = combinedReasons.length === 0;

    if (!ready) {
      // Audit blocked live attempt — no request, no message, no dispatch.
      try {
        await admin.from("communication_hub_control_audit").insert({
          setting_key: "manual_dispatch_live_blocked",
          old_value: null,
          new_value: {
            recipient_masked: maskEmail(recipientEmail),
            reason,
            gates: gate.gates,
            reasons: combinedReasons,
            settings: gate.settingsSummary,
            envEmailLive: gate.envEmailLive,
            envAllowlistOk: gate.envAllowlistOk,
            cronPresent: gate.cronPresent,
          } as any,
          reason,
          changed_by: actorUserId,
          source: "comm-hub-manual-dispatch-test",
        });
      } catch {
        // audit failure is non-fatal
      }
      return json({
        ok: true,
        mode: "live",
        blocked: true,
        reason: "live_gates_not_open",
        reasons: combinedReasons,
        gates: gate.gates,
        settings: gate.settingsSummary,
        envEmailLive: gate.envEmailLive,
        envAllowlistOk: gate.envAllowlistOk,
        cronPresent: gate.cronPresent,
      });
    }

    // Phase 1C-B8-D-B: all gates open — execute exactly one live send via targeted dispatch.
    const liveReqNo = requestNo();
    const liveIdem = `manual-live-${crypto.randomUUID()}`;
    const { data: lReq, error: lReqErr } = await admin
      .from("communication_request")
      .insert({
        request_no: liveReqNo,
        module_code: "COMM_HUB",
        event_code: "MANUAL_DISPATCH_TEST_LIVE",
        channels: ["email"],
        status: "dispatching",
        payload: { subject, bodyText, recipientName },
        context: { source: "control-center-manual-dispatch-test", actor_user_id: actorUserId, reason, live: true, phase: "1C-B8-D-B" },
        idempotency_key: liveIdem,
        requested_by: actorUserId,
      })
      .select("id, request_no")
      .single();
    if (lReqErr || !lReq) return json({ ok: false, error: "live_request_insert_failed", detail: lReqErr?.message }, 500);

    const { data: lRec, error: lRecErr } = await admin
      .from("communication_recipient")
      .insert({ request_id: lReq.id, role: "to", channel_hint: "email", email: recipientEmail, name: recipientName || null })
      .select("id").single();
    if (lRecErr || !lRec) return json({ ok: false, error: "live_recipient_insert_failed", detail: lRecErr?.message }, 500);

    const { data: lMsg, error: lMsgErr } = await admin
      .from("communication_message")
      .insert({
        request_id: lReq.id,
        recipient_id: lRec.id,
        channel: "email",
        subject,
        body_text: bodyText,
        body_html: `<p>${bodyText.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</p>`,
        status: "queued",
        attempt_count: 0,
        test_mode: false,
        origin: "comm_hub",
      })
      .select("id").single();
    if (lMsgErr || !lMsg) return json({ ok: false, error: "live_message_insert_failed", detail: lMsgErr?.message }, 500);

    await admin.from("communication_event_log").insert({
      request_id: lReq.id,
      message_id: lMsg.id,
      event_type: "queued",
      source: "comm-hub-manual-dispatch-test",
      payload: { stage: "MANUAL_ENQUEUED", test_mode: false, to_masked: maskEmail(recipientEmail), actor_user_id: actorUserId, phase: "1C-B8-D-B" },
    });

    await admin.from("communication_hub_control_audit").insert({
      setting_key: "manual_dispatch_live_executed",
      old_value: null,
      new_value: { request_id: lReq.id, message_id: lMsg.id, recipient_masked: maskEmail(recipientEmail), settings: gate.settingsSummary } as any,
      reason,
      changed_by: actorUserId,
      source: "comm-hub-manual-dispatch-test",
    });

    const dUrl = `${SUPABASE_URL}/functions/v1/comm-hub-dispatch`;
    let dResp: any = null; let dStatus = 0;
    try {
      const r = await fetch(dUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-comm-hub-dispatch-secret": DISPATCH_SECRET, Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ targetMessageId: lMsg.id, manual: true, reason, live: true }),
      });
      dStatus = r.status;
      dResp = await r.json().catch(() => ({}));
    } catch (e: any) {
      dResp = { ok: false, error: "dispatch_invoke_failed", detail: (e?.message ?? String(e)).slice(0, 300) };
    }

    const finalLive = await admin.from("communication_message")
      .select("id, status, attempt_count, sent_at, provider_message_id, error_code, error_message, test_mode, locked_at, locked_by")
      .eq("id", lMsg.id).maybeSingle();
    const attempts = await admin.from("communication_delivery_attempt")
      .select("id, status, provider, error_code, provider_response, created_at")
      .eq("message_id", lMsg.id).order("created_at", { ascending: true });

    return json({
      ok: true,
      mode: "live",
      blocked: false,
      requestId: lReq.id,
      requestNo: lReq.request_no,
      messageId: lMsg.id,
      dispatch: { status: dStatus, response: dResp },
      message: finalLive.data ?? null,
      attempts: attempts.data ?? [],
      gates: gate.gates,
      settings: gate.settingsSummary,
    });
  }

  // 3b. DRY-RUN PATH — unchanged B8-C behavior.
  if (typed !== TYPED_DRY_RUN) {
    return json({ ok: false, error: "typed_confirmation_required", expected: TYPED_DRY_RUN }, 400);
  }

  const phaseGate = { forcedTestMode: true, liveBlockedThisPhase: false };
  const testMode = true;

  // 4. Insert communication_request.
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
    mode: "dry-run",
    phaseGate,
    warning: "Dry-run only: no live email was sent.",
    request: { id: reqRow.id, request_no: reqRow.request_no },
    message: finalMsg,
    attempts: attempts ?? [],
    events: events ?? [],
    dispatch: dispatchResp,
  });
});
