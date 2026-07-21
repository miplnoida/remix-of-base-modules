/**
 * CH-SIMPLE-P3E-B — Communication Hub Controlled-Live Test Orchestrator.
 *
 * The single browser-facing entry point for a controlled-live email test.
 * Coordinates authorisation, temporary operating-mode transition, grant
 * reservation, request/message creation, targeted dispatch, provider
 * evidence capture and cleanup restoration.
 *
 * NEVER call a provider directly. All provider transport goes through
 * the shared guarded transport, which in P3E-B is routed to the
 * deterministic provider stub (`COMM_HUB_PROVIDER_MODE=stub`).
 *
 * NEVER read the grant table directly from the frontend. This function
 * returns everything the operator needs about the execution.
 */

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DISPATCH_SECRET = Deno.env.get("COMM_HUB_DISPATCH_SECRET") ?? "";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

const CONFIRMATION_PHRASE = "CONFIRM CONTROLLED LIVE";

type Status =
  | "BLOCKED"
  | "ENQUEUE_FAILED"
  | "DISPATCH_FAILED"
  | "PROVIDER_REJECTED"
  | "PROVIDER_ACCEPTED"
  | "DELIVERY_PENDING"
  | "DELIVERED"
  | "FAILED";

interface Envelope {
  status: Status;
  passed: boolean;
  message: string;
  idempotent_replay: boolean;
  controlled_live_execution_id: string | null;
  execution_no: number | null;
  grant_id: string | null;
  grant_status: string | null;
  request_id: string | null;
  request_number: string | null;
  message_id: string | null;
  delivery_attempt_id: string | null;
  trace_id: string | null;
  original_decision_id: string | null;
  dispatcher_revalidation_decision_id: string | null;
  preview_snapshot_id: string | null;
  preview_approval_id: string | null;
  dry_run_certification_id: string | null;
  provider_call_attempted: boolean;
  provider_name: string | null;
  provider_message_id: string | null;
  provider_status: string | null;
  blockers: Array<{ code: string; stage?: string; message?: string }>;
  warnings: unknown[];
  failure_stage: string | null;
  started_at: string;
  completed_at: string;
  prior_operating_mode: string | null;
  final_operating_mode: string | null;
  cleanup_succeeded: boolean | null;
  certification_id: string | null;
  certification_status: string | null;
  certification_replayed: boolean | null;
  real_email_authorised: boolean;
}

const EMPTY_ENVELOPE = (started: string): Envelope => ({
  status: "BLOCKED",
  passed: false,
  message: "",
  idempotent_replay: false,
  controlled_live_execution_id: null,
  execution_no: null,
  grant_id: null,
  grant_status: null,
  request_id: null,
  request_number: null,
  message_id: null,
  delivery_attempt_id: null,
  trace_id: null,
  original_decision_id: null,
  dispatcher_revalidation_decision_id: null,
  preview_snapshot_id: null,
  preview_approval_id: null,
  dry_run_certification_id: null,
  provider_call_attempted: false,
  provider_name: null,
  provider_message_id: null,
  provider_status: null,
  blockers: [],
  warnings: [],
  failure_stage: null,
  started_at: started,
  completed_at: started,
  prior_operating_mode: null,
  final_operating_mode: null,
  cleanup_succeeded: null,
  certification_id: null,
  certification_status: null,
  certification_replayed: null,
  real_email_authorised: false,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: claimsErr } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsErr || !userData?.user?.id) return json({ error: "unauthorized" }, 401);
  const operatorId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const startedAt = new Date().toISOString();
  const body = await req.json().catch(() => ({} as any));

  const env: Envelope = EMPTY_ENVELOPE(startedAt);
  const fail = (
    status: Status,
    stage: string,
    code: string,
    message: string,
    partial: Partial<Envelope> = {},
    http = 200,
  ) => {
    env.status = status;
    env.passed = false;
    env.message = message;
    env.failure_stage = stage;
    env.completed_at = new Date().toISOString();
    env.blockers.push({ code, stage, message });
    Object.assign(env, partial);
    return json(env, http);
  };

  // 0. Input validation.
  const required = ["moduleCode", "eventCode", "recipient", "previewApprovalId",
    "dryRunCertificationId", "idempotencyKey", "reason", "confirmation"];
  for (const k of required) {
    if (typeof body?.[k] !== "string" || body[k].length === 0) {
      return fail("BLOCKED", "input_validation", "missing_" + k,
        `${k} required`, {}, 400);
    }
  }
  if (body.confirmation !== CONFIRMATION_PHRASE) {
    return fail("BLOCKED", "input_validation", "confirmation_mismatch",
      "confirmation phrase does not match", {}, 400);
  }

  // 0.a Real-email gate (CH-SIMPLE-P3E-C step 7).
  // Any real send requires: explicit body flag, exact panel phrase, and
  // server-side environment allowance. Anything less falls back to the
  // provider stub — the default P3E-B behaviour.
  const PANEL_PHRASE = "SEND ONE CONTROLLED LIVE EMAIL";
  const realEmailRequested = body.allowRealEmail === true;
  if (realEmailRequested) {
    if (Deno.env.get("COMM_HUB_REAL_EMAIL_TEST") !== "true") {
      return fail("BLOCKED", "real_email_gate", "real_email_disabled",
        "COMM_HUB_REAL_EMAIL_TEST is not enabled on this environment", {}, 400);
    }
    if (typeof body.panelConfirmation !== "string"
        || body.panelConfirmation !== PANEL_PHRASE) {
      return fail("BLOCKED", "real_email_gate", "panel_confirmation_mismatch",
        "panel confirmation phrase does not match", {}, 400);
    }
    env.real_email_authorised = true;
  } else {
    env.real_email_authorised = false;
  }

  // 1. Preflight — global operating mode
  const { data: settings } = await admin
    .from("communication_hub_control_settings")
    .select("operating_mode, dispatch_enabled")
    .eq("singleton_guard", "primary")
    .maybeSingle();
  const priorMode = (settings as any)?.operating_mode as string | undefined;
  env.prior_operating_mode = priorMode ?? null;

  if (!priorMode) {
    return fail("BLOCKED", "preflight", "settings_missing",
      "communication hub settings singleton not initialised");
  }
  if (priorMode === "EMERGENCY_STOP") {
    return fail("BLOCKED", "preflight", "emergency_stop_active",
      "Emergency Stop is engaged; controlled-live test is blocked");
  }
  if (priorMode === "AUTOMATED_PRODUCTION") {
    return fail("BLOCKED", "preflight", "automated_production_active",
      "Automated Production is not permitted for controlled-live testing");
  }
  if (priorMode !== "DRY_RUN" && priorMode !== "CONTROLLED_LIVE") {
    return fail("BLOCKED", "preflight", "operating_mode_not_supported",
      `operating mode ${priorMode} cannot start a controlled-live test`);
  }

  // 2. Begin controlled-live authorisation (idempotent).
  const beginPayload: any = {
    module_code: body.moduleCode,
    event_code: body.eventCode,
    channel: body.channel ?? "email",
    recipient: body.recipient,
    preview_approval_id: body.previewApprovalId,
    dry_run_certification_id: body.dryRunCertificationId,
    idempotency_key: body.idempotencyKey,
    reason: body.reason,
    confirmation: body.confirmation,
  };
  if (body.previewSnapshotId) beginPayload.preview_snapshot_id = body.previewSnapshotId;

  // Call as the operator so auth.uid() resolves inside the SECURITY DEFINER RPC.
  const { data: beginRaw, error: beginErr } = await userClient.rpc(
    "begin_comm_hub_controlled_live",
    { p_payload: beginPayload },
  );
  if (beginErr) {
    return fail("BLOCKED", "authorisation", "begin_rpc_error",
      String(beginErr.message ?? beginErr).slice(0, 300));
  }
  const begin: any = beginRaw ?? {};
  env.controlled_live_execution_id = begin.execution_id ?? null;
  env.grant_id = begin.grant_id ?? null;
  env.execution_no = begin.execution_no ?? null;
  env.preview_snapshot_id = body.previewSnapshotId ?? null;
  env.preview_approval_id = body.previewApprovalId;
  env.dry_run_certification_id = body.dryRunCertificationId;
  env.idempotent_replay = begin.status === "BEGIN_REPLAY";

  if (!begin.ok) {
    return fail("BLOCKED", "authorisation", "begin_blocked",
      "controlled-live authorisation refused",
      { blockers: (begin.blockers ?? env.blockers) });
  }

  // 3. Confirm operator identity matches (RPC uses auth.uid()).
  const executionId = env.controlled_live_execution_id!;
  const grantId = env.grant_id!;

  // Persist prior_operating_mode on the execution.
  await admin
    .from("communication_controlled_live_execution")
    .update({ prior_operating_mode: priorMode })
    .eq("id", executionId)
    .is("prior_operating_mode", null);

  // 4. Temporarily transition operating mode.
  let transitioned = false;
  if (priorMode === "DRY_RUN") {
    const { error: mErr } = await admin.rpc("set_communication_operating_mode", {
      p_new_mode: "CONTROLLED_LIVE",
      p_reason: "controlled_live_test:" + executionId,
    });
    if (mErr) {
      await admin.rpc("revoke_comm_hub_controlled_live_grant", {
        p_grant_id: grantId, p_execution_id: executionId,
        p_reason: "operating_mode_transition_failed",
      });
      return fail("BLOCKED", "operating_mode_transition", "mode_transition_failed",
        String(mErr.message ?? mErr).slice(0, 300));
    }
    transitioned = true;
  }

  // Everything past this point MUST run through cleanup.
  const cleanup = async (): Promise<{ succeeded: boolean; finalMode: string | null }> => {
    try {
      const { data: r } = await admin.rpc(
        "restore_comm_hub_operating_mode_after_controlled_live",
        { p_execution_id: executionId },
      );
      const ok = (r as any)?.ok === true;
      const { data: settingsAfter } = await admin
        .from("communication_hub_control_settings")
        .select("operating_mode")
        .eq("singleton_guard", "primary")
        .maybeSingle();
      return {
        succeeded: ok,
        finalMode: (settingsAfter as any)?.operating_mode ?? null,
      };
    } catch (_) {
      return { succeeded: false, finalMode: null };
    }
  };

  try {
    // 5. Compute recipient/subject/body hashes for grant binding & idempotency.
    // We ask the dispatcher to do the authoritative hashing later, but the
    // grant must be reserved with the same recipient hash the begin RPC
    // captured, which is derived from the recipient. begin_comm_hub_controlled_live
    // has already written recipient_set_hash on the grant, so we mirror that.
    const { data: grantMeta } = await admin.rpc(
      "admin_get_comm_hub_controlled_live_grant",
      { p_grant_id: grantId },
    );
    const recipientSetHash = (grantMeta as any)?.recipient_set_hash ?? null;
    if (!recipientSetHash) {
      throw new Error("grant_missing_recipient_set_hash");
    }

    // 6. Send communication via canonical spine (creates request+recipient+message).
    const sendPayload: any = {
      module_code: body.moduleCode,
      event_code: body.eventCode,
      recipient: body.recipient,
      channel: body.channel ?? "email",
      send_context: "controlled_live",
      preview_approval_id: body.previewApprovalId,
      preview_snapshot_id: body.previewSnapshotId ?? null,
      dry_run_certification_id: body.dryRunCertificationId,
      controlled_live_grant_id: grantId,
      controlled_live_execution_id: executionId,
      idempotency_key: body.idempotencyKey,
      requested_by: operatorId,
      reason: body.reason,
      data: body.data ?? {},
    };
    const { data: sendRaw, error: sendErr } = await admin.rpc(
      "send_communication_v1",
      { p_payload: sendPayload },
    );
    if (sendErr) {
      env.status = "ENQUEUE_FAILED";
      env.failure_stage = "request_creation";
      env.blockers.push({ code: "send_communication_error", stage: "request_creation",
        message: String(sendErr.message ?? sendErr).slice(0, 300) });
      throw new Error("enqueue_failed");
    }
    const send: any = sendRaw ?? {};
    env.request_id = send.request_id ?? null;
    env.request_number = send.request_number ?? null;
    env.message_id = send.message_id ?? send.messages?.[0]?.id ?? null;
    env.original_decision_id = send.decision_id ?? send.original_decision_id ?? null;
    env.trace_id = send.trace_id ?? null;
    if (Array.isArray(send.blockers) && send.blockers.length) {
      env.status = "BLOCKED";
      env.failure_stage = "canonical_send_decision";
      env.blockers.push(...send.blockers);
      throw new Error("send_blocked");
    }
    if (!env.message_id) {
      env.status = "ENQUEUE_FAILED";
      env.failure_stage = "request_creation";
      env.blockers.push({ code: "message_id_missing", stage: "request_creation" });
      throw new Error("no_message");
    }

    // 7. Targeted controlled-live dispatch.
    const dispatchRes = await fetch(
      `${SUPABASE_URL}/functions/v1/comm-hub-dispatch`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-comm-hub-dispatch-secret": DISPATCH_SECRET,
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          operation: "targeted_controlled_live",
          messageId: env.message_id,
          requestId: env.request_id,
          executionId,
          grantId,
        }),
      },
    );
    const dispatchBody: any = await dispatchRes.json().catch(() => ({}));
    env.delivery_attempt_id = dispatchBody?.delivery_attempt_id ?? null;
    env.dispatcher_revalidation_decision_id =
      dispatchBody?.revalidation_decision_id ?? null;
    env.provider_call_attempted = !!dispatchBody?.provider_call_attempted;
    env.provider_name = dispatchBody?.provider_name ?? null;
    env.provider_message_id = dispatchBody?.provider_message_id ?? null;
    env.provider_status = dispatchBody?.provider_status ?? null;
    env.trace_id = dispatchBody?.trace_id ?? env.trace_id;
    if (Array.isArray(dispatchBody?.warnings)) env.warnings.push(...dispatchBody.warnings);
    if (Array.isArray(dispatchBody?.blockers)) env.blockers.push(...dispatchBody.blockers);

    const ds: string = dispatchBody?.status ?? "DISPATCH_FAILED";
    env.status = ds as Status;
    env.passed = ds === "PROVIDER_ACCEPTED" || ds === "DELIVERY_PENDING" || ds === "DELIVERED";
    env.message =
      ds === "PROVIDER_ACCEPTED" ? "provider accepted controlled-live message"
      : ds === "DELIVERY_PENDING" ? "provider outcome pending; no automatic retry"
      : ds === "DELIVERED" ? "provider confirmed delivery"
      : ds === "PROVIDER_REJECTED" ? "provider rejected controlled-live message"
      : ds === "BLOCKED" ? "dispatch blocked by canonical revalidation"
      : "dispatch failed";
    env.failure_stage = env.passed ? null : (dispatchBody?.failure_stage ?? "dispatcher");
  } catch (_e) {
    // env.status/blockers already set by the throwing branch.
    if (env.status === "BLOCKED" && env.failure_stage === "canonical_send_decision") {
      // pre-provider block — revoke grant.
      await admin.rpc("revoke_comm_hub_controlled_live_grant", {
        p_grant_id: grantId, p_execution_id: executionId,
        p_reason: "pre_provider_block_" + (env.failure_stage ?? "unknown"),
      });
    }
  } finally {
    // 8. Cleanup: restore prior operating mode.
    const { succeeded, finalMode } = await cleanup();
    env.cleanup_succeeded = succeeded;
    env.final_operating_mode = finalMode;
    env.completed_at = new Date().toISOString();

    // 9. Finalize execution record.
    let finalStateForRecord: string;
    if (env.passed) {
      finalStateForRecord = env.status === "DELIVERED" ? "DELIVERED"
        : env.status === "DELIVERY_PENDING" ? "DELIVERY_PENDING"
        : "PROVIDER_ACCEPTED";
    } else if (env.status === "BLOCKED") {
      finalStateForRecord = "BLOCKED";
    } else {
      finalStateForRecord = "FAILED";
    }
    await admin.rpc("finalize_comm_hub_controlled_live", {
      p_execution_id: executionId,
      p_state: finalStateForRecord,
      p_final_operating_mode: finalMode,
      p_cleanup_succeeded: succeeded,
      p_cleanup_state: succeeded ? "restored" : "restore_failed",
      p_cleanup_error: null,
      p_warnings: env.warnings.length ? env.warnings : [],
      p_failure_stage: env.failure_stage,
    });
  }

  // 10. Refresh grant status via admin RPC (safe: same edge fn).
  try {
    const { data: g } = await admin.rpc("admin_get_comm_hub_controlled_live_grant", {
      p_grant_id: grantId,
    });
    env.grant_status = (g as any)?.status ?? null;
  } catch (_) {
    env.grant_status = null;
  }

  // 11. Record controlled-live certification (P3E-C step 5).
  // Only when the provider actually delivered/accepted the message. The
  // certification is idempotent — replays return the same certification id.
  if (
    env.status === "PROVIDER_ACCEPTED" ||
    env.status === "DELIVERY_PENDING" ||
    env.status === "DELIVERED"
  ) {
    try {
      const { data: grantMeta } = await admin.rpc(
        "admin_get_comm_hub_controlled_live_grant",
        { p_grant_id: env.grant_id },
      );
      const recipientSetHash = (grantMeta as any)?.recipient_set_hash ?? null;
      if (recipientSetHash) {
        const providerOutcome =
          env.status === "DELIVERED" ? "DELIVERED"
          : env.status === "DELIVERY_PENDING" ? "DELIVERY_PENDING"
          : "PROVIDER_ACCEPTED";
        const { data: certRaw } = await admin.rpc(
          "record_controlled_live_certification",
          {
            p_payload: {
              execution_id: env.controlled_live_execution_id,
              module_code: body.moduleCode,
              event_code: body.eventCode,
              channel: body.channel ?? "email",
              recipient_set_hash: recipientSetHash,
              preview_snapshot_id: env.preview_snapshot_id,
              preview_approval_id: env.preview_approval_id,
              dry_run_certification_id: env.dry_run_certification_id,
              request_id: env.request_id,
              message_id: env.message_id,
              delivery_attempt_id: env.delivery_attempt_id,
              trace_id: env.trace_id,
              provider_name: env.provider_name,
              provider_message_id: env.provider_message_id,
              provider_outcome: providerOutcome,
              provider_status: env.provider_status,
              operating_mode_prior: env.prior_operating_mode,
              operating_mode_final: env.final_operating_mode,
              cleanup_succeeded: env.cleanup_succeeded,
              certified_by: operatorId,
            },
          },
        );
        const cert: any = certRaw ?? {};
        env.certification_id = cert.certification_id ?? null;
        env.certification_status = cert.status ?? null;
        env.certification_replayed = cert.replayed ?? null;
      }
    } catch (e) {
      env.warnings.push({
        code: "certification_record_failed",
        message: String((e as any)?.message ?? e).slice(0, 300),
      });
    }
  }

  return json(env, 200);
});
