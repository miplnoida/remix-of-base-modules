// EPIC CH-TRACE-2 — Trace-only scenario simulator (Part J).
//
// Admin-only. Writes ONLY into communication_hub_trace + communication_hub_trace_step.
// Never touches communication_request / communication_message / provider transport /
// notification_queue / notification_logs. No email is sent.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  appendTraceStepSafe,
  completeTraceSafe,
} from "../_shared/commHubTrace.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const BUILD_TAG = "comm-hub-trace-simulate@2026-07-12T09:45Z";

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "content-type": "application/json" } });
}

type Scenario =
  | "blocked_before_request"
  | "automation_prepare_only"
  | "send_policy_denied"
  | "review_policy_denied"
  | "request_created_and_queued"
  | "dispatch_outside_live_window"
  | "dispatch_recipient_not_db_allowlisted"
  | "provider_config_missing"
  | "provider_send_failed";

interface ScenarioStep {
  stage: string;
  status: "passed" | "warning" | "blocked" | "skipped" | "failed" | "info";
  summary?: string;
  blockers?: string[];
  fixHref?: string;
}

interface ScenarioSpec {
  moduleCode: string;
  eventCode: string;
  steps: ScenarioStep[];
  finalStatus: string;
  blockedStage?: string | null;
}

const SCENARIOS: Record<Scenario, ScenarioSpec> = {
  blocked_before_request: {
    moduleCode: "LEGAL", eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    steps: [
      { stage: "EVENT_INITIATED", status: "info", summary: "Simulated legal assignment event" },
      { stage: "SOURCE_CONTEXT_CAPTURED", status: "passed" },
      { stage: "RECIPIENT_RESOLUTION_STARTED", status: "info" },
      { stage: "RECIPIENT_RESOLVED", status: "blocked", summary: "no assigned user on record", blockers: ["no_assigned_user_id"] },
    ],
    finalStatus: "blocked", blockedStage: "RECIPIENT_RESOLVED",
  },
  automation_prepare_only: {
    moduleCode: "LEGAL", eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    steps: [
      { stage: "EVENT_INITIATED", status: "info" },
      { stage: "RECIPIENT_RESOLVED", status: "passed" },
      { stage: "AUTOMATION_CHECKED", status: "blocked", summary: "module set to prepare_only", blockers: ["automation_prepare_only"], fixHref: "/admin/communication-hub/governance/automation-settings" },
    ],
    finalStatus: "blocked", blockedStage: "AUTOMATION_CHECKED",
  },
  send_policy_denied: {
    moduleCode: "COMPLIANCE", eventCode: "INTERNAL_CASE_STATUS_NOTICE",
    steps: [
      { stage: "EVENT_INITIATED", status: "info" },
      { stage: "RECIPIENT_RESOLVED", status: "passed" },
      { stage: "LIVE_SEND_ENTERED", status: "passed" },
      { stage: "LIVE_PREFLIGHT_CHECKED", status: "passed" },
      { stage: "SEND_POLICY_CHECKED", status: "blocked", blockers: ["send_policy_denied"], fixHref: "/admin/communication-hub/governance/send-policies" },
    ],
    finalStatus: "blocked", blockedStage: "SEND_POLICY_CHECKED",
  },
  review_policy_denied: {
    moduleCode: "BENEFITS", eventCode: "AWARD_DECISION_NOTICE",
    steps: [
      { stage: "EVENT_INITIATED", status: "info" },
      { stage: "RECIPIENT_RESOLVED", status: "passed" },
      { stage: "SEND_POLICY_CHECKED", status: "passed" },
      { stage: "REVIEW_POLICY_CHECKED", status: "blocked", blockers: ["review_policy_denied"] },
    ],
    finalStatus: "blocked", blockedStage: "REVIEW_POLICY_CHECKED",
  },
  request_created_and_queued: {
    moduleCode: "LEGAL", eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    steps: [
      { stage: "EVENT_INITIATED", status: "info" },
      { stage: "RECIPIENT_RESOLVED", status: "passed" },
      { stage: "SEND_POLICY_CHECKED", status: "passed" },
      { stage: "REVIEW_POLICY_CHECKED", status: "passed" },
      { stage: "DB_POLICY_GUARD_CHECKED", status: "passed" },
      { stage: "TEMPLATE_RESOLVED", status: "passed" },
      { stage: "TEMPLATE_RENDERED", status: "passed" },
      { stage: "REQUEST_CREATED", status: "passed" },
      { stage: "MESSAGE_CREATED", status: "passed" },
      { stage: "MESSAGE_QUEUED", status: "passed" },
    ],
    finalStatus: "queued", blockedStage: null,
  },
  dispatch_outside_live_window: {
    moduleCode: "LEGAL", eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    steps: [
      { stage: "MESSAGE_QUEUED", status: "passed" },
      { stage: "DISPATCH_CLAIM_ATTEMPTED", status: "info" },
      { stage: "LIVE_WINDOW_CHECKED", status: "blocked", blockers: ["target_outside_live_window"], fixHref: "/admin/communication-hub/control-center" },
    ],
    finalStatus: "blocked", blockedStage: "LIVE_WINDOW_CHECKED",
  },
  dispatch_recipient_not_db_allowlisted: {
    moduleCode: "COMPLIANCE", eventCode: "INTERNAL_CASE_STATUS_NOTICE",
    steps: [
      { stage: "MESSAGE_QUEUED", status: "passed" },
      { stage: "DISPATCH_CLAIMED", status: "passed" },
      { stage: "RECIPIENT_ALLOWLIST_CHECKED", status: "blocked", blockers: ["recipient_not_db_allowlisted"], fixHref: "/admin/communication-hub/recipient-control" },
    ],
    finalStatus: "suppressed", blockedStage: "RECIPIENT_ALLOWLIST_CHECKED",
  },
  provider_config_missing: {
    moduleCode: "LEGAL", eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    steps: [
      { stage: "MESSAGE_QUEUED", status: "passed" },
      { stage: "DISPATCH_CLAIMED", status: "passed" },
      { stage: "RECIPIENT_ALLOWLIST_CHECKED", status: "passed" },
      { stage: "PROVIDER_LOOKUP_STARTED", status: "failed", blockers: ["provider_config_missing"], fixHref: "/admin/communication-hub/design/sender-profiles" },
    ],
    finalStatus: "failed", blockedStage: "PROVIDER_LOOKUP_STARTED",
  },
  provider_send_failed: {
    moduleCode: "LEGAL", eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    steps: [
      { stage: "MESSAGE_QUEUED", status: "passed" },
      { stage: "DISPATCH_CLAIMED", status: "passed" },
      { stage: "RECIPIENT_ALLOWLIST_CHECKED", status: "passed" },
      { stage: "PROVIDER_SELECTED", status: "passed" },
      { stage: "PROVIDER_SEND_ATTEMPTED", status: "info" },
      { stage: "PROVIDER_FAILED", status: "failed", blockers: ["provider_send_failed"] },
    ],
    finalStatus: "failed", blockedStage: "PROVIDER_FAILED",
  },
};

console.log(`[comm-hub-trace-simulate] boot build=${BUILD_TAG}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) return json({ ok: false, error: "supabase_env_missing" }, 503);

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
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: actorUserId, _role: "Admin" });
  if (isAdmin !== true) return json({ ok: false, error: "forbidden_admin_only" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const scenario = body?.scenario as Scenario | undefined;
  if (!scenario || !(scenario in SCENARIOS)) {
    return json({ ok: false, error: "unknown_scenario", allowed: Object.keys(SCENARIOS) }, 400);
  }
  const spec = SCENARIOS[scenario];

  // Load real control settings so the simulation reflects the operator's actual
  // allowlist / recipient release mode instead of a hardcoded example address.
  let settings: any = null;
  try {
    const { data } = await admin
      .from("communication_hub_control_settings")
      .select("recipient_release_mode, allowed_email_addresses, allowed_email_domains, email_live_enabled, dispatch_enabled, dry_run_only")
      .eq("singleton_guard", "primary")
      .maybeSingle();
    settings = data ?? null;
  } catch { /* swallow */ }

  const allowedAddrs: string[] = Array.isArray(settings?.allowed_email_addresses) ? settings.allowed_email_addresses : [];
  const allowedDomains: string[] = Array.isArray(settings?.allowed_email_domains) ? settings.allowed_email_domains : [];
  const primaryAllowed: string | null = allowedAddrs[0] ?? (allowedDomains[0] ? `simulated@${allowedDomains[0]}` : null);

  // Caller may explicitly override the recipient (e.g., to reproduce a specific
  // failing send). Otherwise we default to the first allowlisted address.
  const overrideRecipient: string | null = typeof body?.recipient_email === "string" && body.recipient_email.trim()
    ? body.recipient_email.trim()
    : null;

  // For the "not allowlisted" scenario we deliberately pick something outside
  // the allowlist so the blocker is realistic — but we log the real allowlist
  // so the operator can see exactly what the dispatcher compared against.
  const nonAllowlisted = "external.simulation@not-allowlisted.test";
  const recipientEmail = overrideRecipient
    ?? (scenario === "dispatch_recipient_not_db_allowlisted" ? nonAllowlisted : (primaryAllowed ?? "sim@example.test"));

  const settingsSummary = {
    recipient_release_mode: settings?.recipient_release_mode ?? null,
    allowed_email_addresses: allowedAddrs,
    allowed_email_domains: allowedDomains,
    email_live_enabled: settings?.email_live_enabled ?? null,
    dispatch_enabled: settings?.dispatch_enabled ?? null,
    dry_run_only: settings?.dry_run_only ?? null,
    settings_loaded: !!settings,
  };

  // Start a native simulated trace tagged so it's distinguishable in the UI.
  let traceId: string | null = null;
  let traceNo: string | null = null;
  try {
    const { data } = await admin.rpc("start_comm_hub_trace", {
      p_payload: {
        module_code: spec.moduleCode,
        event_code: spec.eventCode,
        channel: "email",
        entity_type: "simulation",
        entity_id: null,
        reference_no: `SIM-${scenario.toUpperCase()}`,
        source_module: "trace-simulator",
        source_screen: "TraceCenterPage",
        source_action: "simulate",
        recipient_email: recipientEmail,
        current_stage: spec.steps[0]?.stage ?? "EVENT_INITIATED",
        metadata: {
          simulation: true,
          scenario,
          build: BUILD_TAG,
          recipient_used: recipientEmail,
          recipient_overridden: !!overrideRecipient,
          control_settings: settingsSummary,
        },
      },
    });
    if ((data as any)?.ok) {
      traceId = (data as any).trace_id as string;
      traceNo = (data as any).trace_no as string;
    }
  } catch { /* swallow */ }

  if (!traceId) return json({ ok: false, error: "start_trace_failed" }, 500);

  for (const step of spec.steps) {
    // Enrich the specific stages that depend on allowlist / recipient so the
    // operator sees the real comparison values in the timeline.
    let stepSummary = step.summary;
    const stepPayload: Record<string, unknown> = { simulation: true, scenario, build: BUILD_TAG };

    if (step.stage === "RECIPIENT_ALLOWLIST_CHECKED") {
      stepPayload.recipient_email = recipientEmail;
      stepPayload.allowed_email_addresses = allowedAddrs;
      stepPayload.allowed_email_domains = allowedDomains;
      stepPayload.recipient_release_mode = settingsSummary.recipient_release_mode;
      if (step.status === "blocked" && !stepSummary) {
        stepSummary = `Recipient ${recipientEmail} is not present in the DB allowlist (${allowedAddrs.length} address(es), ${allowedDomains.length} domain(s)).`;
      }
    }
    if (step.stage === "LIVE_PREFLIGHT_CHECKED" || step.stage === "LIVE_SEND_ENTERED") {
      stepPayload.email_live_enabled = settingsSummary.email_live_enabled;
      stepPayload.dispatch_enabled = settingsSummary.dispatch_enabled;
      stepPayload.dry_run_only = settingsSummary.dry_run_only;
    }
    if (step.stage === "EVENT_INITIATED") {
      stepPayload.recipient_used = recipientEmail;
      stepPayload.control_settings = settingsSummary;
    }

    await appendTraceStepSafe(admin, traceId, {
      stage_code: step.stage,
      status: step.status,
      blocker_codes: step.blockers ?? [],
      plain_summary: stepSummary ?? `[simulated] ${step.stage}`,
      fix_href: step.fixHref,
      payload: stepPayload,
    });
  }
  await completeTraceSafe(admin, traceId, spec.finalStatus, spec.blockedStage ?? null, {
    simulation: true,
    scenario,
    recipient_used: recipientEmail,
    control_settings: settingsSummary,
  });

  return json({
    ok: true,
    scenario,
    trace_id: traceId,
    trace_no: traceNo,
    final_status: spec.finalStatus,
    blocked_stage: spec.blockedStage,
    recipient_used: recipientEmail,
    control_settings: settingsSummary,
  });
});

