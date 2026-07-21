// CH-SIMPLE-P3D-B.2.c — Canonical dry-run orchestrator.
//
// Coordinates the durable three-step server flow:
//
//   Operator (browser)
//     → comm-hub-dry-run  (this function; JWT-authenticated)
//       → begin_comm_hub_dry_run              (creates locked request + message)
//       → mark_comm_hub_dry_run_dispatching   (state → DISPATCHING)
//       → comm-hub-dispatch  operation=targeted_dry_run  (authoritative attempt)
//       → finalize_comm_hub_dry_run           (verifies evidence; issues certification)
//     → single DRY_RUN_PASSED / DRY_RUN_FAILED / BLOCKED envelope
//
// Trust boundaries:
//   • The caller supplies ONLY business inputs required to `begin`:
//     module_code, event_code, channel, recipients, preview_snapshot_id,
//     preview_approval_id, operator_reason, idempotency_key.
//   • The function IGNORES any client-supplied delivery-attempt id,
//     dispatcher revalidation decision id, provider-call-attempted flag,
//     provider-message id, hashes, trace-complete flag, event-log-complete
//     flag, certification result, execution state.
//   • `requested_by` is derived server-side from the verified JWT; the
//     caller cannot forge operator identity.
//   • finalize_comm_hub_dry_run is authoritative — it re-reads the
//     attempt, message, request and trace directly and independently
//     verifies every evidence field.  The orchestrator's own dispatcher-
//     response validation is defensive only.
//
// Never call: mark_comm_hub_dry_run_dispatching, targeted_dry_run,
// or finalize_comm_hub_dry_run directly from a browser or module.
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
const DISPATCH_SECRET =
  Deno.env.get("COMMUNICATION_HUB_DISPATCH_SECRET") ??
  Deno.env.get("comm_hub_dispatch_secret") ??
  "";

const FINAL_STATUSES = new Set(["DRY_RUN_PASSED", "DRY_RUN_FAILED", "BLOCKED"]);
const SUCCESS_MESSAGE = "Dry test passed — no real email was sent.";

type Json = Record<string, unknown>;
type Blocker = { code: string; stage?: string; severity?: string; message?: string };

interface StableEnvelope {
  status: "DRY_RUN_PASSED" | "DRY_RUN_FAILED" | "BLOCKED";
  passed: boolean;
  message: string;
  idempotent_replay: boolean;
  dry_run_execution_id: string | null;
  execution_no: string | null;
  dry_run_certification_id: string | null;
  request_id: string | null;
  request_number: string | null;
  message_id: string | null;
  delivery_attempt_id: string | null;
  trace_id: string | null;
  original_decision_id: string | null;
  dispatcher_revalidation_decision_id: string | null;
  preview_snapshot_id: string | null;
  preview_approval_id: string | null;
  blockers: Blocker[];
  warnings: unknown[];
  failure_stage: string | null;
  started_at: string | null;
  completed_at: string | null;
  certification_expires_at: string | null;
  provider_call_attempted: boolean;
  provider_message_id: string | null;
  final_operating_mode: string | null;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stable(partial: Partial<StableEnvelope>, httpStatus = 200): Response {
  const env: StableEnvelope = {
    status: (partial.status ?? "BLOCKED") as StableEnvelope["status"],
    passed: partial.status === "DRY_RUN_PASSED",
    message: partial.status === "DRY_RUN_PASSED" ? SUCCESS_MESSAGE : (partial.message ?? ""),
    idempotent_replay: partial.idempotent_replay ?? false,
    dry_run_execution_id: partial.dry_run_execution_id ?? null,
    execution_no: partial.execution_no ?? null,
    dry_run_certification_id: partial.dry_run_certification_id ?? null,
    request_id: partial.request_id ?? null,
    request_number: partial.request_number ?? null,
    message_id: partial.message_id ?? null,
    delivery_attempt_id: partial.delivery_attempt_id ?? null,
    trace_id: partial.trace_id ?? null,
    original_decision_id: partial.original_decision_id ?? null,
    dispatcher_revalidation_decision_id: partial.dispatcher_revalidation_decision_id ?? null,
    preview_snapshot_id: partial.preview_snapshot_id ?? null,
    preview_approval_id: partial.preview_approval_id ?? null,
    blockers: partial.blockers ?? [],
    warnings: partial.warnings ?? [],
    failure_stage: partial.failure_stage ?? null,
    started_at: partial.started_at ?? null,
    completed_at: partial.completed_at ?? null,
    certification_expires_at: partial.certification_expires_at ?? null,
    provider_call_attempted: partial.provider_call_attempted ?? false,
    provider_message_id: partial.provider_message_id ?? null,
    final_operating_mode: partial.final_operating_mode ?? null,
  };
  return json(httpStatus, env);
}

// Strip all client-supplied evidence fields — orchestrator must never
// trust them. Only pass-through business inputs to `begin`.
function sanitizeBeginInputs(input: Json, requestedBy: string): Json {
  const allowed = new Set([
    "module_code",
    "event_code",
    "channel",
    "to_recipients",
    "cc_recipients",
    "bcc_recipients",
    "preview_snapshot_id",
    "preview_approval_id",
    "operator_reason",
    "idempotency_key",
  ]);
  const out: Json = {};
  for (const k of Object.keys(input ?? {})) if (allowed.has(k)) out[k] = input[k];
  out["requested_by"] = requestedBy;
  return out;
}

async function readExecution(admin: ReturnType<typeof createClient>, executionId: string) {
  const { data, error } = await admin
    .from("communication_dry_run_execution")
    .select("id, execution_no, state, request_id, message_id, delivery_attempt_id, trace_id, certification_id, original_decision_id, dispatcher_revalidation_decision_id, preview_snapshot_id, preview_approval_id, blockers, warnings, failure_stage, started_at, completed_at, requested_by")
    .eq("id", executionId)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

async function fetchCertificationForExecution(
  admin: ReturnType<typeof createClient>,
  executionId: string,
  certificationId: string | null,
) {
  if (!certificationId) return null;
  const { data } = await admin
    .from("communication_dry_run_certification")
    .select("id, certification_no, expires_at")
    .eq("id", certificationId)
    .maybeSingle();
  return data as any;
}

async function fetchOperatingMode(admin: ReturnType<typeof createClient>): Promise<string | null> {
  try {
    const { data } = await admin
      .from("communication_hub_control_settings")
      .select("operating_mode")
      .eq("singleton_guard", "primary")
      .maybeSingle();
    return (data as any)?.operating_mode ?? null;
  } catch (_) {
    return null;
  }
}

async function callTargetedDispatch(payload: {
  messageId: string;
  requestId: string;
  originalDecisionId: string | null;
  dryRunExecutionId: string;
  idempotencyKey: string;
}): Promise<{ ok: boolean; body: any; status: number; errorMessage?: string }> {
  if (!DISPATCH_SECRET) {
    return { ok: false, body: null, status: 500, errorMessage: "dispatch_secret_not_configured" };
  }
  const url = `${SUPABASE_URL}/functions/v1/comm-hub-dispatch`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-comm-hub-dispatch-secret": DISPATCH_SECRET,
        "authorization": `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        operation: "targeted_dry_run",
        messageId: payload.messageId,
        requestId: payload.requestId,
        originalDecisionId: payload.originalDecisionId,
        dryRunCorrelationId: payload.idempotencyKey,
        // Not trusted by dispatcher for behaviour — passed for tracing only.
        dryRunExecutionId: payload.dryRunExecutionId,
      }),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, body, status: res.status };
  } catch (e) {
    return { ok: false, body: null, status: 502, errorMessage: (e as Error).message };
  }
}

function validateDispatcherResponse(body: any, expected: {
  messageId: string;
  requestId: string;
  originalDecisionId: string | null;
}): Blocker[] {
  const blockers: Blocker[] = [];
  if (!body || typeof body !== "object") {
    blockers.push({ code: "dispatcher_response_missing", stage: "DISPATCH_RESPONSE_VALIDATION" });
    return blockers;
  }
  if (body.status !== "DRY_RUN_PROCESSED") {
    blockers.push({ code: "dispatcher_result_not_processed", stage: "DISPATCH_RESPONSE_VALIDATION", message: String(body.status) });
  }
  if (body.provider_call_attempted !== false) {
    blockers.push({ code: "dispatcher_provider_call_attempted_true", stage: "DISPATCH_RESPONSE_VALIDATION" });
  }
  if (body.provider_message_id !== null && body.provider_message_id !== undefined) {
    blockers.push({ code: "dispatcher_provider_message_id_present", stage: "DISPATCH_RESPONSE_VALIDATION" });
  }
  if (body.message_id && body.message_id !== expected.messageId) {
    blockers.push({ code: "dispatcher_message_id_mismatch", stage: "DISPATCH_RESPONSE_VALIDATION" });
  }
  if (body.request_id && body.request_id !== expected.requestId) {
    blockers.push({ code: "dispatcher_request_id_mismatch", stage: "DISPATCH_RESPONSE_VALIDATION" });
  }
  if (expected.originalDecisionId && body.original_decision_id
      && body.original_decision_id !== expected.originalDecisionId) {
    blockers.push({ code: "dispatcher_original_decision_mismatch", stage: "DISPATCH_RESPONSE_VALIDATION" });
  }
  if (!body.revalidation_decision_id) {
    blockers.push({ code: "dispatcher_revalidation_decision_missing", stage: "DISPATCH_RESPONSE_VALIDATION" });
  }
  if (!body.delivery_attempt_id) {
    blockers.push({ code: "dispatcher_delivery_attempt_missing", stage: "DISPATCH_RESPONSE_VALIDATION" });
  }
  return blockers;
}

async function recordTerminalFailure(
  admin: ReturnType<typeof createClient>,
  executionId: string,
  state: "BLOCKED" | "FAILED",
  stage: "BEGIN" | "MARK_DISPATCHING" | "TARGETED_DISPATCH" | "DISPATCH_RESPONSE_VALIDATION" | "FINALIZE" | "UNEXPECTED",
  blockers: Blocker[],
  warnings: unknown[] = [],
  summary?: string,
) {
  try {
    await admin.rpc("fail_comm_hub_dry_run", {
      p_execution_id: executionId,
      p_state: state,
      p_failure_stage: stage,
      p_blockers: blockers,
      p_warnings: warnings,
      p_technical_summary: summary ?? null,
    });
  } catch (_) { /* swallow — envelope is still returned to operator */ }
}

async function buildReplayEnvelope(
  admin: ReturnType<typeof createClient>,
  exec: any,
  operatingMode: string | null,
): Promise<Response> {
  if (exec.state === "CERTIFIED") {
    const cert = await fetchCertificationForExecution(admin, exec.id, exec.certification_id);
    return stable({
      status: "DRY_RUN_PASSED",
      idempotent_replay: true,
      dry_run_execution_id: exec.id,
      execution_no: exec.execution_no,
      dry_run_certification_id: cert?.id ?? exec.certification_id ?? null,
      request_id: exec.request_id, message_id: exec.message_id,
      delivery_attempt_id: exec.delivery_attempt_id, trace_id: exec.trace_id,
      original_decision_id: exec.original_decision_id,
      dispatcher_revalidation_decision_id: exec.dispatcher_revalidation_decision_id,
      preview_snapshot_id: exec.preview_snapshot_id,
      preview_approval_id: exec.preview_approval_id,
      started_at: exec.started_at, completed_at: exec.completed_at,
      certification_expires_at: cert?.expires_at ?? null,
      final_operating_mode: operatingMode,
    });
  }
  if (exec.state === "BLOCKED" || exec.state === "FAILED") {
    return stable({
      status: exec.state === "BLOCKED" ? "BLOCKED" : "DRY_RUN_FAILED",
      idempotent_replay: true,
      dry_run_execution_id: exec.id,
      execution_no: exec.execution_no,
      request_id: exec.request_id, message_id: exec.message_id,
      delivery_attempt_id: exec.delivery_attempt_id, trace_id: exec.trace_id,
      original_decision_id: exec.original_decision_id,
      preview_snapshot_id: exec.preview_snapshot_id,
      preview_approval_id: exec.preview_approval_id,
      blockers: (exec.blockers ?? []) as Blocker[],
      warnings: exec.warnings ?? [],
      failure_stage: exec.failure_stage,
      started_at: exec.started_at, completed_at: exec.completed_at,
      final_operating_mode: operatingMode,
    });
  }
  return stable({}); // caller should not reach here
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return stable({ status: "BLOCKED", blockers: [{ code: "method_not_allowed", stage: "input", severity: "critical" }] }, 405);
  }

  // 1. Authenticate JWT and derive operator identity server-side.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return stable({ status: "BLOCKED", blockers: [{ code: "not_authenticated", stage: "auth", severity: "critical" }] }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return stable({ status: "BLOCKED", blockers: [{ code: "not_authenticated", stage: "auth", severity: "critical" }] }, 401);
  }
  const operatorId = userData.user.id;

  // 2. Parse & sanitize inputs.
  let raw: Json;
  try {
    raw = await req.json();
  } catch {
    return stable({ status: "BLOCKED", blockers: [{ code: "invalid_json", stage: "input", severity: "critical" }] }, 400);
  }
  const beginInputs = sanitizeBeginInputs(raw, operatorId);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const operatingMode = await fetchOperatingMode(admin);

  // 3. BEGIN.
  const { data: beginResult, error: beginErr } = await admin
    .rpc("begin_comm_hub_dry_run", { p_payload: beginInputs });
  if (beginErr) {
    return stable({
      status: "DRY_RUN_FAILED",
      blockers: [{ code: "begin_rpc_exception", stage: "BEGIN", severity: "critical", message: beginErr.message }],
      failure_stage: "BEGIN",
      final_operating_mode: operatingMode,
    }, 500);
  }
  const begin: any = beginResult ?? {};
  const executionId: string | null = begin.dry_run_execution_id ?? null;

  // BEGIN outcomes we never surface as final success.
  if (begin.status === "BLOCKED") {
    return stable({
      status: "BLOCKED",
      dry_run_execution_id: executionId,
      execution_no: begin.execution_no ?? null,
      request_id: begin.request_id ?? null, message_id: begin.message_id ?? null,
      original_decision_id: begin.original_decision_id ?? null,
      preview_snapshot_id: begin.preview_snapshot_id ?? null,
      preview_approval_id: begin.preview_approval_id ?? null,
      blockers: begin.blockers ?? [],
      warnings: begin.warnings ?? [],
      failure_stage: "BEGIN",
      final_operating_mode: operatingMode,
    });
  }

  if (begin.status === "BEGIN_REPLAY") {
    // Inspect existing execution and act idempotently.
    const exec = await readExecution(admin, executionId!);
    if (!exec) {
      return stable({ status: "DRY_RUN_FAILED",
        blockers: [{ code: "replay_execution_missing", stage: "BEGIN", severity: "critical" }],
        failure_stage: "BEGIN", final_operating_mode: operatingMode }, 500);
    }
    if (exec.requested_by !== operatorId) {
      // Same idempotency key + scope but different operator identity — never leak evidence.
      return stable({ status: "BLOCKED",
        blockers: [{ code: "idempotency_key_operator_mismatch", stage: "BEGIN", severity: "critical" }],
        failure_stage: "BEGIN", final_operating_mode: operatingMode }, 403);
    }
    if (exec.state === "CERTIFIED" || exec.state === "BLOCKED" || exec.state === "FAILED") {
      return buildReplayEnvelope(admin, exec, operatingMode);
    }
    // Continue orchestration from where the previous attempt left off.
  }

  // 4. MARK_DISPATCHING → TARGETED_DISPATCH → FINALIZE.
  const messageId: string | null = begin.message_id ?? null;
  const requestId: string | null = begin.request_id ?? null;
  const originalDecisionId: string | null = begin.original_decision_id ?? null;
  const idempotencyKey: string = String((beginInputs as any).idempotency_key ?? "");

  if (!executionId || !messageId || !requestId) {
    if (executionId) {
      await recordTerminalFailure(admin, executionId, "FAILED", "BEGIN",
        [{ code: "begin_missing_ids", stage: "BEGIN", severity: "critical" }]);
    }
    return stable({ status: "DRY_RUN_FAILED",
      dry_run_execution_id: executionId,
      blockers: [{ code: "begin_missing_ids", stage: "BEGIN", severity: "critical" }],
      failure_stage: "BEGIN", final_operating_mode: operatingMode }, 500);
  }

  // Mark dispatching. If already-dispatching, that is safe (replay-resume).
  const { data: markResult, error: markErr } = await admin
    .rpc("mark_comm_hub_dry_run_dispatching", {
      p_execution_id: executionId, p_requested_by: operatorId,
    });
  if (markErr || !markResult || (markResult as any).ok !== true) {
    const summary = markErr?.message ?? JSON.stringify(markResult ?? {});
    await recordTerminalFailure(admin, executionId, "FAILED", "MARK_DISPATCHING",
      [{ code: (markResult as any)?.code ?? "mark_dispatching_failed", stage: "MARK_DISPATCHING" }], [], summary);
    return stable({ status: "DRY_RUN_FAILED", dry_run_execution_id: executionId,
      request_id: requestId, message_id: messageId,
      blockers: [{ code: "mark_dispatching_failed", stage: "MARK_DISPATCHING", severity: "critical" }],
      failure_stage: "MARK_DISPATCHING", final_operating_mode: operatingMode }, 500);
  }

  // Targeted dispatch.
  const dispatch = await callTargetedDispatch({
    messageId, requestId, originalDecisionId,
    dryRunExecutionId: executionId, idempotencyKey,
  });
  if (!dispatch.ok || !dispatch.body) {
    await recordTerminalFailure(admin, executionId, "FAILED", "TARGETED_DISPATCH",
      [{ code: dispatch.errorMessage ?? "targeted_dispatch_failed", stage: "TARGETED_DISPATCH" }],
      [], `HTTP ${dispatch.status}`);
    return stable({ status: "DRY_RUN_FAILED", dry_run_execution_id: executionId,
      request_id: requestId, message_id: messageId,
      blockers: [{ code: "targeted_dispatch_failed", stage: "TARGETED_DISPATCH", severity: "critical" }],
      failure_stage: "TARGETED_DISPATCH", final_operating_mode: operatingMode }, 502);
  }

  // Defensive edge-level response validation (finalise is authoritative).
  const dispatchBlockers = validateDispatcherResponse(dispatch.body,
    { messageId, requestId, originalDecisionId });
  if (dispatchBlockers.length > 0) {
    await recordTerminalFailure(admin, executionId, "FAILED", "DISPATCH_RESPONSE_VALIDATION",
      dispatchBlockers);
    return stable({ status: "DRY_RUN_FAILED", dry_run_execution_id: executionId,
      request_id: requestId, message_id: messageId,
      original_decision_id: originalDecisionId,
      blockers: dispatchBlockers, failure_stage: "DISPATCH_RESPONSE_VALIDATION",
      final_operating_mode: operatingMode });
  }

  // FINALIZE — resolves all evidence from database records; caller-supplied
  // dispatcher body is NOT trusted here.
  const { data: finalizeResult, error: finalizeErr } = await admin
    .rpc("finalize_comm_hub_dry_run", {
      p_payload: { dry_run_execution_id: executionId, requested_by: operatorId },
    });
  if (finalizeErr) {
    await recordTerminalFailure(admin, executionId, "FAILED", "FINALIZE",
      [{ code: "finalize_rpc_exception", stage: "FINALIZE", message: finalizeErr.message }]);
    return stable({ status: "DRY_RUN_FAILED", dry_run_execution_id: executionId,
      request_id: requestId, message_id: messageId,
      blockers: [{ code: "finalize_rpc_exception", stage: "FINALIZE", severity: "critical",
        message: finalizeErr.message }],
      failure_stage: "FINALIZE", final_operating_mode: operatingMode }, 500);
  }

  const fin: any = finalizeResult ?? {};
  const finalStatus = fin.status === "DRY_RUN_PASSED" ? "DRY_RUN_PASSED"
                    : fin.status === "BLOCKED" ? "BLOCKED"
                    : "DRY_RUN_FAILED";

  if (!FINAL_STATUSES.has(finalStatus)) {
    await recordTerminalFailure(admin, executionId, "FAILED", "FINALIZE",
      [{ code: "finalize_non_terminal_status", stage: "FINALIZE" }]);
    return stable({ status: "DRY_RUN_FAILED", dry_run_execution_id: executionId,
      blockers: [{ code: "finalize_non_terminal_status", stage: "FINALIZE", severity: "critical" }],
      failure_stage: "FINALIZE", final_operating_mode: operatingMode }, 500);
  }

  return stable({
    status: finalStatus as StableEnvelope["status"],
    idempotent_replay: fin.idempotent_replay === true,
    dry_run_execution_id: fin.dry_run_execution_id ?? executionId,
    execution_no: fin.execution_no ?? null,
    dry_run_certification_id: fin.dry_run_certification_id ?? null,
    request_id: fin.request_id ?? requestId,
    request_number: fin.request_number ?? null,
    message_id: fin.message_id ?? messageId,
    delivery_attempt_id: fin.delivery_attempt_id ?? null,
    trace_id: fin.trace_id ?? null,
    original_decision_id: fin.original_decision_id ?? originalDecisionId,
    dispatcher_revalidation_decision_id: fin.dispatcher_revalidation_decision_id ?? null,
    preview_snapshot_id: fin.preview_snapshot_id ?? null,
    preview_approval_id: fin.preview_approval_id ?? null,
    blockers: fin.blockers ?? [],
    warnings: fin.warnings ?? [],
    failure_stage: fin.failure_stage ?? null,
    started_at: fin.started_at ?? null,
    completed_at: fin.completed_at ?? null,
    certification_expires_at: fin.certification_expires_at ?? null,
    provider_call_attempted: false,
    provider_message_id: null,
    final_operating_mode: fin.final_operating_mode ?? operatingMode,
  });
});
