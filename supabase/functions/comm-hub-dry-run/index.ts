// Phase 4B3 — comm-hub-dry-run
//
// Authoritative flow (browser → this function):
//
//   1. Browser calls this function with the operator JWT and ONLY:
//        module_code, event_code, channel, preview_snapshot_id,
//        preview_approval_id, operator_reason, idempotency_key,
//        (optional) expected_actor_id, expected_recipient_set_hash.
//   2. This function calls begin_comm_hub_dry_run using a JWT-scoped
//      supabase client — so requested_by is derived server-side from
//      auth.uid(). The browser cannot forge operator identity.
//   3. This function switches to a service-role client and calls:
//        process_comm_hub_dry_run_execution(execution_id, correlation_id)
//      (atomic claim + verification; no provider, no simulator).
//   4. On COMPLETED, this function calls certify_comm_hub_dry_run(execution_id).
//   5. Returns one normalized envelope. The browser never calls the
//      service-role processor or certification RPCs directly.
//
// Trust boundaries:
//   • Browser-supplied evidence fields, recipients, hashes are IGNORED.
//   • expected_actor_id / expected_recipient_set_hash are compared for
//     defence in depth but never used as the source of truth.
//   • No external provider is called from this path.
//   • No simulator is called.
//   • No Controlled Live grant is created.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const SUCCESS_MESSAGE = "Dry test passed — no real email was sent.";

type Json = Record<string, unknown>;
type Blocker = { code: string; stage?: string; severity?: string; message?: string };

interface Envelope {
  status: "DRY_RUN_PASSED" | "DRY_RUN_FAILED" | "BLOCKED";
  passed: boolean;
  message: string;
  idempotent_replay: boolean;
  dry_run_execution_id: string | null;
  execution_state: string | null;
  correlation_id: string | null;
  dry_run_certification_id: string | null;
  certification_expires_at: string | null;
  request_id: string | null;
  message_id: string | null;
  trace_id: string | null;
  preview_snapshot_id: string | null;
  preview_approval_id: string | null;
  blockers: Blocker[];
  warnings: unknown[];
  failure_stage: string | null;
  provider_call_attempted: boolean;
  simulator_call_attempted: boolean;
  transition_log_id: string | null;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function envelope(p: Partial<Envelope>, httpStatus = 200): Response {
  const e: Envelope = {
    status: (p.status ?? "BLOCKED") as Envelope["status"],
    passed: p.status === "DRY_RUN_PASSED",
    message: p.status === "DRY_RUN_PASSED" ? SUCCESS_MESSAGE : (p.message ?? ""),
    idempotent_replay: p.idempotent_replay ?? false,
    dry_run_execution_id: p.dry_run_execution_id ?? null,
    execution_state: p.execution_state ?? null,
    correlation_id: p.correlation_id ?? null,
    dry_run_certification_id: p.dry_run_certification_id ?? null,
    certification_expires_at: p.certification_expires_at ?? null,
    request_id: p.request_id ?? null,
    message_id: p.message_id ?? null,
    trace_id: p.trace_id ?? null,
    preview_snapshot_id: p.preview_snapshot_id ?? null,
    preview_approval_id: p.preview_approval_id ?? null,
    blockers: p.blockers ?? [],
    warnings: p.warnings ?? [],
    failure_stage: p.failure_stage ?? null,
    provider_call_attempted: false,
    simulator_call_attempted: false,
    transition_log_id: p.transition_log_id ?? null,
  };
  return json(httpStatus, e);
}

function toBlockers(raw: unknown): Blocker[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((r) => {
      if (typeof r === "string") return { code: r };
      const o = r as any;
      return {
        code: String(o.code ?? o.blocker_code ?? "UNKNOWN"),
        stage: o.stage,
        severity: o.severity,
        message: o.message ?? o.description,
      };
    });
  }
  return [{ code: String(raw) }];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return envelope({
      status: "BLOCKED",
      message: "Sign in as an authorised operator to run a Dry Test.",
      failure_stage: "AUTH",
      blockers: [{ code: "UNAUTHENTICATED", stage: "AUTH" }],
    }, 401);
  }

  let payload: Json = {};
  try {
    payload = (await req.json()) ?? {};
  } catch {
    return envelope({
      status: "BLOCKED",
      failure_stage: "INPUT",
      blockers: [{ code: "INVALID_JSON", stage: "INPUT" }],
    }, 400);
  }

  const moduleCode = String((payload as any).module_code ?? "");
  const eventCode = String((payload as any).event_code ?? "");
  const channel = String((payload as any).channel ?? "email");
  const previewSnapshotId = (payload as any).preview_snapshot_id as string | undefined;
  const previewApprovalId = (payload as any).preview_approval_id as string | undefined;
  const operatorReason = String((payload as any).operator_reason ?? "").trim();
  const idempotencyKey = (payload as any).idempotency_key as string | undefined;
  const expectedActorId = (payload as any).expected_actor_id as string | undefined;
  const expectedRecipientSetHash =
    (payload as any).expected_recipient_set_hash as string | undefined;

  const missing: Blocker[] = [];
  if (!moduleCode) missing.push({ code: "MODULE_CODE_REQUIRED", stage: "INPUT" });
  if (!eventCode) missing.push({ code: "EVENT_CODE_REQUIRED", stage: "INPUT" });
  if (!previewSnapshotId) missing.push({ code: "PREVIEW_SNAPSHOT_REQUIRED", stage: "INPUT" });
  if (!previewApprovalId) missing.push({ code: "PREVIEW_APPROVAL_REQUIRED", stage: "INPUT" });
  if (!operatorReason) missing.push({ code: "OPERATOR_REASON_REQUIRED", stage: "INPUT" });
  if (!idempotencyKey) missing.push({ code: "IDEMPOTENCY_KEY_REQUIRED", stage: "INPUT" });
  if (missing.length) {
    return envelope({ status: "BLOCKED", failure_stage: "INPUT", blockers: missing }, 400);
  }

  // JWT-scoped client — begin RPC derives requested_by from auth.uid().
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Verify caller identity server-side.
  const { data: claimsData, error: claimsError } = await userClient.auth.getUser();
  if (claimsError || !claimsData?.user?.id) {
    return envelope({
      status: "BLOCKED",
      failure_stage: "AUTH",
      blockers: [{ code: "UNAUTHENTICATED", stage: "AUTH" }],
    }, 401);
  }
  const actualActorId = claimsData.user.id;
  if (expectedActorId && expectedActorId !== actualActorId) {
    return envelope({
      status: "BLOCKED",
      failure_stage: "AUTH",
      blockers: [{ code: "OPERATOR_IDENTITY_MISMATCH", stage: "AUTH" }],
    }, 403);
  }

  // ---------- Step 1: begin_comm_hub_dry_run (JWT-scoped) ----------------
  const beginPayload: Json = {
    module_code: moduleCode,
    event_code: eventCode,
    channel,
    preview_snapshot_id: previewSnapshotId,
    preview_approval_id: previewApprovalId,
    operator_reason: operatorReason,
    idempotency_key: idempotencyKey,
  };
  if (expectedRecipientSetHash) {
    // Passed only for defence-in-depth comparison inside begin RPC.
    beginPayload["expected_recipient_set_hash"] = expectedRecipientSetHash;
  }

  const { data: beginData, error: beginErr } = await userClient.rpc(
    "begin_comm_hub_dry_run",
    { p_payload: beginPayload },
  );
  if (beginErr) {
    return envelope({
      status: "BLOCKED",
      failure_stage: "BEGIN",
      message: "Could not start the Dry Run. Refresh readiness and try again.",
      blockers: [{ code: "BEGIN_DRY_RUN_ERROR", stage: "BEGIN", message: beginErr.message }],
    }, 400);
  }
  const begin = (beginData ?? {}) as any;

  // If begin returned a blocked envelope (durable transition denial), surface it.
  if (begin?.status && begin.status !== "STARTED" && begin.status !== "OK" && begin.status !== "CREATED") {
    return envelope({
      status: "BLOCKED",
      failure_stage: begin?.failure_stage ?? "BEGIN",
      preview_snapshot_id: previewSnapshotId ?? null,
      preview_approval_id: previewApprovalId ?? null,
      transition_log_id: begin?.transition_log_id ?? null,
      blockers: toBlockers(begin?.blockers ?? begin?.denied_reasons ?? []),
      warnings: begin?.warnings ?? [],
      message: "The Dry Run request was blocked by a safety check.",
    }, 200);
  }

  const executionId: string | null = begin?.dry_run_execution_id ?? begin?.execution_id ?? null;
  const correlationId: string | null = begin?.correlation_id ?? null;
  if (!executionId || !correlationId) {
    return envelope({
      status: "BLOCKED",
      failure_stage: "BEGIN",
      blockers: [{ code: "BEGIN_DRY_RUN_MISSING_IDS", stage: "BEGIN" }],
      message: "The Dry Run started but did not return an execution id.",
    }, 500);
  }

  // ---------- Step 2: process (service role) ------------------------------
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: procData, error: procErr } = await admin.rpc(
    "process_comm_hub_dry_run_execution",
    { p_execution_id: executionId, p_correlation_id: correlationId },
  );
  if (procErr) {
    return envelope({
      status: "DRY_RUN_FAILED",
      failure_stage: "PROCESS",
      dry_run_execution_id: executionId,
      correlation_id: correlationId,
      preview_snapshot_id: previewSnapshotId ?? null,
      preview_approval_id: previewApprovalId ?? null,
      blockers: [{ code: "PROCESS_DRY_RUN_ERROR", stage: "PROCESS", message: procErr.message }],
    }, 200);
  }
  const proc = (procData ?? {}) as any;
  const procState = String(proc?.state ?? proc?.execution_state ?? "");
  const procBlockers = toBlockers(proc?.blockers ?? []);
  if (procState !== "COMPLETED") {
    return envelope({
      status: procState === "FAILED" ? "DRY_RUN_FAILED" : "BLOCKED",
      failure_stage: proc?.failure_stage ?? "PROCESS",
      dry_run_execution_id: executionId,
      execution_state: procState || null,
      correlation_id: correlationId,
      request_id: proc?.request_id ?? null,
      message_id: proc?.message_id ?? null,
      trace_id: proc?.trace_id ?? null,
      preview_snapshot_id: previewSnapshotId ?? null,
      preview_approval_id: previewApprovalId ?? null,
      blockers: procBlockers,
      warnings: proc?.warnings ?? [],
    }, 200);
  }

  // ---------- Step 3: certify (service role) ------------------------------
  const { data: certData, error: certErr } = await admin.rpc(
    "certify_comm_hub_dry_run",
    { p_execution_id: executionId },
  );
  if (certErr) {
    return envelope({
      status: "DRY_RUN_FAILED",
      failure_stage: "CERTIFY",
      dry_run_execution_id: executionId,
      execution_state: "COMPLETED",
      correlation_id: correlationId,
      request_id: proc?.request_id ?? null,
      message_id: proc?.message_id ?? null,
      trace_id: proc?.trace_id ?? null,
      preview_snapshot_id: previewSnapshotId ?? null,
      preview_approval_id: previewApprovalId ?? null,
      blockers: [{ code: "CERTIFY_DRY_RUN_ERROR", stage: "CERTIFY", message: certErr.message }],
    }, 200);
  }
  const cert = (certData ?? {}) as any;
  const certId = cert?.dry_run_certification_id ?? cert?.certification_id ?? null;
  if (!certId) {
    return envelope({
      status: "DRY_RUN_FAILED",
      failure_stage: "CERTIFY",
      dry_run_execution_id: executionId,
      execution_state: "COMPLETED",
      correlation_id: correlationId,
      blockers: toBlockers(cert?.blockers ?? [{ code: "CERTIFICATION_NOT_ISSUED" }]),
      preview_snapshot_id: previewSnapshotId ?? null,
      preview_approval_id: previewApprovalId ?? null,
    }, 200);
  }

  return envelope({
    status: "DRY_RUN_PASSED",
    dry_run_execution_id: executionId,
    execution_state: "COMPLETED",
    correlation_id: correlationId,
    dry_run_certification_id: certId,
    certification_expires_at: cert?.expires_at ?? null,
    request_id: proc?.request_id ?? null,
    message_id: proc?.message_id ?? null,
    trace_id: proc?.trace_id ?? null,
    preview_snapshot_id: previewSnapshotId ?? null,
    preview_approval_id: previewApprovalId ?? null,
    idempotent_replay: Boolean(proc?.idempotent_replay ?? begin?.idempotent_replay ?? false),
  });
});
