// Enterprise Communication Hub — secure server-side enqueue (Phase 1C-B1 + CH-TRACE-2).
//
// Authenticated entry point that validates a caller and forwards to the
// SECURITY DEFINER RPC `public.send_communication_v1`.
//
// CH-TRACE-2: every stage (ENQUEUE_RECEIVED, PAYLOAD_VALIDATED,
// SEND_POLICY_CHECKED, REQUEST_ENQUEUE_ATTEMPTED) writes a step to the
// upstream trace when payload.trace.trace_id is supplied.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  appendTraceStepSafe,
  completeTraceSafe,
  linkTraceRequestSafe,
  resolveTraceId,
  resolveTraceNo,
  withTraceContext,
} from "../_shared/commHubTrace.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const BUILD_TAG = "comm-hub-enqueue@2026-07-13T00:00Z-prod2b";

const ALLOWED_CHANNELS = new Set([
  "email", "sms", "push", "in_app", "letter", "print", "whatsapp",
]);
const MAX_PAYLOAD_BYTES = 256 * 1024;
const MAX_RECIPIENTS = 200;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function normalizeChannel(ch: unknown): string | null {
  if (typeof ch !== "string") return null;
  const c = ch.toLowerCase();
  if (ALLOWED_CHANNELS.has(c)) return c;
  const upper = ch.toUpperCase();
  if (upper === "EMAIL") return "email";
  if (upper === "SMS") return "sms";
  if (upper === "PUSH") return "push";
  if (upper === "IN_APP" || upper === "PORTAL") return "in_app";
  if (upper === "WHATSAPP") return "whatsapp";
  if (upper === "PRINT") return "print";
  if (upper === "DOCUMENT" || upper === "PDF" || upper === "LETTER") return "letter";
  return null;
}

console.log(`[comm-hub-enqueue] boot build=${BUILD_TAG}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json(withTraceContext(
      { ok: false, error: "method_not_allowed", build: BUILD_TAG },
      { stage: "ENQUEUE_RECEIVED", blocked_stage: "ENQUEUE_RECEIVED" },
    ), 405);
  }

  // 1. Authenticate caller.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json(withTraceContext(
      { ok: false, error: "missing_authorization", build: BUILD_TAG },
      { stage: "ENQUEUE_RECEIVED", blocked_stage: "ENQUEUE_RECEIVED" },
    ), 401);
  }

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return json(withTraceContext(
      { ok: false, error: "invalid_token", build: BUILD_TAG },
      { stage: "ENQUEUE_RECEIVED", blocked_stage: "ENQUEUE_RECEIVED" },
    ), 401);
  }
  const callerUserId = userRes.user.id;

  // 2. Parse + size-limit body.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json(withTraceContext(
      { ok: false, error: "invalid_body", build: BUILD_TAG },
      { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED" },
    ), 400);
  }
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return json(withTraceContext(
      { ok: false, error: "payload_too_large", build: BUILD_TAG },
      { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED" },
    ), 413);
  }
  let payload: Record<string, unknown>;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return json(withTraceContext(
      { ok: false, error: "invalid_json", build: BUILD_TAG },
      { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED" },
    ), 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const traceId = resolveTraceId(payload);
  const traceNo = resolveTraceNo(payload);

  await appendTraceStepSafe(admin, traceId, {
    stage_code: "ENQUEUE_RECEIVED",
    status: "info",
    plain_summary: "comm-hub-enqueue received request",
    payload: { caller_user_id: callerUserId, build: BUILD_TAG },
  });

  // 3. Validate shape.
  const moduleCode = (payload.moduleCode ?? (payload as any).module_code) as string | undefined;
  const eventCode = (payload.eventCode ?? (payload as any).event_code) as string | undefined;
  if (!moduleCode || typeof moduleCode !== "string") {
    await appendTraceStepSafe(admin, traceId, {
      stage_code: "PAYLOAD_VALIDATED", status: "blocked",
      blocker_codes: ["moduleCode_required"],
      plain_summary: "moduleCode is required",
    });
    await completeTraceSafe(admin, traceId, "blocked", "PAYLOAD_VALIDATED", { reason: "moduleCode_required" });
    return json(withTraceContext(
      { ok: false, error: "moduleCode_required", build: BUILD_TAG },
      { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED", trace_id: traceId, trace_no: traceNo },
    ), 400);
  }
  if (!eventCode || typeof eventCode !== "string") {
    await appendTraceStepSafe(admin, traceId, {
      stage_code: "PAYLOAD_VALIDATED", status: "blocked",
      blocker_codes: ["eventCode_required"],
    });
    await completeTraceSafe(admin, traceId, "blocked", "PAYLOAD_VALIDATED");
    return json(withTraceContext(
      { ok: false, error: "eventCode_required", build: BUILD_TAG },
      { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED", trace_id: traceId, trace_no: traceNo },
    ), 400);
  }

  const rawRecipients = payload.recipients ?? (payload as any).recipient;
  const recipients = Array.isArray(rawRecipients)
    ? rawRecipients
    : rawRecipients && typeof rawRecipients === "object"
      ? [rawRecipients]
      : [];
  if (recipients.length === 0) {
    await appendTraceStepSafe(admin, traceId, {
      stage_code: "PAYLOAD_VALIDATED", status: "blocked",
      blocker_codes: ["recipient_required"],
    });
    await completeTraceSafe(admin, traceId, "blocked", "PAYLOAD_VALIDATED");
    return json(withTraceContext(
      { ok: false, error: "recipient_required", build: BUILD_TAG },
      { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED", trace_id: traceId, trace_no: traceNo },
    ), 400);
  }
  if (recipients.length > MAX_RECIPIENTS) {
    await appendTraceStepSafe(admin, traceId, {
      stage_code: "PAYLOAD_VALIDATED", status: "blocked",
      blocker_codes: ["too_many_recipients"],
    });
    await completeTraceSafe(admin, traceId, "blocked", "PAYLOAD_VALIDATED");
    return json(withTraceContext(
      { ok: false, error: "too_many_recipients", build: BUILD_TAG },
      { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED", trace_id: traceId, trace_no: traceNo },
    ), 400);
  }

  const rawChannels = Array.isArray(payload.channels) ? payload.channels : ["email"];
  const channels: string[] = [];
  for (const c of rawChannels) {
    const n = normalizeChannel(c);
    if (!n) {
      await appendTraceStepSafe(admin, traceId, {
        stage_code: "PAYLOAD_VALIDATED", status: "blocked",
        blocker_codes: ["unsupported_channel"],
        payload: { channel: c },
      });
      await completeTraceSafe(admin, traceId, "blocked", "PAYLOAD_VALIDATED");
      return json(withTraceContext(
        { ok: false, error: "unsupported_channel", channel: c, build: BUILD_TAG },
        { stage: "PAYLOAD_VALIDATED", blocked_stage: "PAYLOAD_VALIDATED", trace_id: traceId, trace_no: traceNo },
      ), 400);
    }
    channels.push(n);
  }

  await appendTraceStepSafe(admin, traceId, {
    stage_code: "PAYLOAD_VALIDATED", status: "passed",
    plain_summary: `payload validated (module=${moduleCode}, event=${eventCode}, channels=${channels.join(",")}, recipients=${recipients.length})`,
  });

  const rpcPayload = {
    ...payload,
    channels,
    recipients,
    origin: "comm_hub",
    callerUserId,
    requestedBy: (payload as any).requestedBy ?? callerUserId,
  };

  // 5. Send Policy authorization for live sends.
  const isTestMode = (payload as any).testMode === true;

  // 5a. PROD-FIX-2 Part C — enqueue-time global gate short-circuit.
  // For any LIVE send (testMode !== true), evaluate the DB global gates
  // BEFORE creating the request via send_communication_v1. This is an
  // early guard only — downstream RPC + dispatcher gates remain intact.
  // Dry-run / test / preview paths are unaffected.
  if (!isTestMode) {
    try {
      const { data: gateRow } = await admin
        .from("communication_hub_control_settings")
        .select("dispatch_enabled, dry_run_only, email_live_enabled")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const gs: any = gateRow ?? {};
      const globalBlockers: string[] = [];
      if (gs.dispatch_enabled === false) globalBlockers.push("global_dispatch_disabled");
      if (gs.dry_run_only === true) globalBlockers.push("global_dry_run_only");
      if (gs.email_live_enabled !== true) globalBlockers.push("global_email_live_disabled");
      if (globalBlockers.length > 0) {
        await appendTraceStepSafe(admin, traceId, {
          stage_code: "SEND_POLICY_CHECKED", status: "blocked",
          blocker_codes: globalBlockers,
          plain_summary: `blocked by global gate(s): ${globalBlockers.join(", ")}`,
          fix_href: "/admin/communication-hub/control-center",
        });
        await completeTraceSafe(admin, traceId, "blocked", "SEND_POLICY_CHECKED", { blockers: globalBlockers });
        // Best-effort audit; failure is non-fatal — no request, no message,
        // no delivery attempt, no provider call happens on this path.
        try {
          await admin.from("communication_hub_control_audit").insert({
            setting_key: `enqueue_global_gate_blocked:${moduleCode}:${eventCode}`,
            old_value: null,
            new_value: {
              module_code: moduleCode, event_code: eventCode,
              blockers: globalBlockers,
              settings: {
                dispatch_enabled: !!gs.dispatch_enabled,
                dry_run_only: !!gs.dry_run_only,
                email_live_enabled: !!gs.email_live_enabled,
              },
              via: "comm-hub-enqueue",
            },
            reason: "live enqueue blocked by global gates",
            changed_by: callerUserId,
            source: "comm-hub-enqueue-global-gate",
          });
        } catch { /* audit failure is non-fatal */ }
        return json(withTraceContext({
          ok: false, error: "global_gate_blocked",
          blockers: globalBlockers,
          settings: {
            dispatch_enabled: !!gs.dispatch_enabled,
            dry_run_only: !!gs.dry_run_only,
            email_live_enabled: !!gs.email_live_enabled,
          },
          build: BUILD_TAG,
        }, { stage: "SEND_POLICY_CHECKED", blocked_stage: "SEND_POLICY_CHECKED", trace_id: traceId, trace_no: traceNo }), 403);
      }
    } catch (e) {
      // If we cannot read the gates, fail closed for live sends.
      await appendTraceStepSafe(admin, traceId, {
        stage_code: "SEND_POLICY_CHECKED", status: "failed",
        blocker_codes: ["global_gate_check_failed"],
        plain_summary: `global gate check failed: ${String((e as any)?.message ?? e).slice(0, 200)}`,
      });
      await completeTraceSafe(admin, traceId, "failed", "SEND_POLICY_CHECKED");
      return json(withTraceContext(
        { ok: false, error: "global_gate_check_failed", detail: String((e as any)?.message ?? e), build: BUILD_TAG },
        { stage: "SEND_POLICY_CHECKED", blocked_stage: "SEND_POLICY_CHECKED", trace_id: traceId, trace_no: traceNo },
      ), 500);
    }
  }

  if (!isTestMode) {
    try {
      const recipientEmails = recipients
        .map((r: any) => (typeof r === "string" ? r : r?.email))
        .filter((x: any) => typeof x === "string" && x.length > 0);
      const { data: authz } = await admin.rpc("evaluate_comm_hub_send_authorization", {
        p_payload: {
          module_code: moduleCode,
          event_code: eventCode,
          channel: channels[0] ?? "email",
          environment_scope: "production",
          recipients: recipientEmails,
          entity_id: (payload as any)?.reference?.entityId ?? (payload as any)?.entityId ?? null,
        },
      });
      const authorized = !!(authz as any)?.authorized;
      const policyBlockers: string[] = Array.isArray((authz as any)?.blockers)
        ? (authz as any).blockers : [];
      await admin.from("communication_hub_control_audit").insert({
        setting_key: `send_policy_runtime:${moduleCode}:${eventCode}`,
        old_value: null,
        new_value: {
          module_code: moduleCode, event_code: eventCode,
          recipient_count: recipientEmails.length,
          authorized,
          mode: (authz as any)?.mode ?? null,
          required_action: (authz as any)?.required_action ?? null,
          blockers: policyBlockers,
          via: "comm-hub-enqueue",
        },
        reason: "live send authorization",
        changed_by: callerUserId,
        source: "communication-hub-send-policy-runtime",
      });
      if (!authorized) {
        await appendTraceStepSafe(admin, traceId, {
          stage_code: "SEND_POLICY_CHECKED", status: "blocked",
          blocker_codes: ["send_policy_denied", ...policyBlockers].slice(0, 20),
          plain_summary: `send policy denied: ${policyBlockers.slice(0, 3).join("; ") || "unauthorized"}`,
          fix_href: "/admin/communication-hub/governance/send-policies",
        });
        await completeTraceSafe(admin, traceId, "blocked", "SEND_POLICY_CHECKED", { blockers: policyBlockers });
        return json(withTraceContext({
          ok: false, error: "send_policy_denied",
          blockers: policyBlockers,
          required_action: (authz as any)?.required_action ?? null,
          policy: (authz as any)?.policy ?? null,
          build: BUILD_TAG,
        }, { stage: "SEND_POLICY_CHECKED", blocked_stage: "SEND_POLICY_CHECKED", trace_id: traceId, trace_no: traceNo }), 403);
      }
      await appendTraceStepSafe(admin, traceId, {
        stage_code: "SEND_POLICY_CHECKED", status: "passed",
        plain_summary: `send policy authorized (mode=${(authz as any)?.mode ?? "?"})`,
      });
    } catch (e) {
      await appendTraceStepSafe(admin, traceId, {
        stage_code: "SEND_POLICY_CHECKED", status: "failed",
        blocker_codes: ["send_policy_check_failed"],
        plain_summary: `send policy check failed: ${String((e as any)?.message ?? e).slice(0, 200)}`,
      });
      await completeTraceSafe(admin, traceId, "failed", "SEND_POLICY_CHECKED");
      return json(withTraceContext(
        { ok: false, error: "send_policy_check_failed", detail: String((e as any)?.message ?? e), build: BUILD_TAG },
        { stage: "SEND_POLICY_CHECKED", blocked_stage: "SEND_POLICY_CHECKED", trace_id: traceId, trace_no: traceNo },
      ), 500);
    }
  }

  // 6. Invoke RPC.
  await appendTraceStepSafe(admin, traceId, {
    stage_code: "REQUEST_ENQUEUE_ATTEMPTED", status: "info",
    plain_summary: "invoking send_communication_v1",
  });
  const { data, error } = await admin.rpc("send_communication_v1", { payload: rpcPayload });
  if (error) {
    await appendTraceStepSafe(admin, traceId, {
      stage_code: "REQUEST_ENQUEUE_ATTEMPTED", status: "failed",
      blocker_codes: ["request_create_failed"],
      plain_summary: `send_communication_v1 failed: ${error.message.slice(0, 200)}`,
    });
    await completeTraceSafe(admin, traceId, "failed", "REQUEST_ENQUEUE_ATTEMPTED");
    return json(withTraceContext(
      { ok: false, error: "rpc_failed", message: error.message, build: BUILD_TAG },
      { stage: "REQUEST_ENQUEUE_ATTEMPTED", blocked_stage: "REQUEST_ENQUEUE_ATTEMPTED", trace_id: traceId, trace_no: traceNo },
    ), 500);
  }
  const d: any = data ?? {};
  const requestId = d.requestId ?? d.request_id ?? null;
  const requestNo = d.requestNo ?? d.request_no ?? null;
  await linkTraceRequestSafe(admin, traceId, requestId, requestNo);
  await appendTraceStepSafe(admin, traceId, {
    stage_code: "REQUEST_ENQUEUE_ATTEMPTED", status: "passed",
    plain_summary: `enqueued ${requestNo ?? requestId ?? "(no id)"}`,
    request_id: requestId,
  });
  return json({
    ...d,
    trace_id: traceId,
    trace_no: traceNo,
    stage: "REQUEST_ENQUEUE_ATTEMPTED",
    build: BUILD_TAG,
  });
});
