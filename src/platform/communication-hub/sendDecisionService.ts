/**
 * CH-SIMPLE-P3B — Canonical send-decision client.
 *
 * READ-ONLY wrapper around `public.evaluate_comm_hub_send_decision(jsonb)`.
 * React MUST NOT reproduce the rules used to calculate `allowed`. This
 * module only forwards the payload and returns the stable envelope.
 */
import { supabase } from "@/integrations/supabase/client";
import { getFreshAuthenticatedSession, CommHubAuthError } from "./authSession";

export type SendDecisionContext =
  | "preview"
  | "dry_run"
  | "controlled_live"
  | "manual_live"
  | "manual_production"
  | "auto_live_internal"
  | "cron"
  | "batch";

export interface SendDecisionBlocker {
  code: string;
  message: string;
  stage: string;
  severity: "critical" | "high" | "medium" | "low";
  current_value?: unknown;
  required_value?: unknown;
  fix_route?: string;
  fix_action?: string;
}

export interface SendDecisionWarning {
  code: string;
  stage?: string;
  message?: string;
}

export interface SendDecisionGate {
  gate: string;
  status: "pass" | "blocked" | "warning" | "skipped" | "unknown";
  reason: string;
}

export interface SendDecisionEnvelope {
  allowed: boolean;
  status: "allowed" | "blocked" | string;
  decision_id: string;
  decision_type: "canonical_send_decision";
  send_context: SendDecisionContext | string;
  module_code: string | null;
  event_code: string | null;
  channel: string;
  blockers: SendDecisionBlocker[];
  warnings: SendDecisionWarning[];
  gate_results: SendDecisionGate[];
  fix_actions: Array<{ code: string; route?: string }>;
  configuration_version: number | null;
  recipient_policy_version: number | null;
  send_policy_version: number | null;
  review_policy_version: number | null;
  evaluated_at: string;
  expires_at: string;
  trace_context: {
    current_stage: string;
    blocked_stage: string | null;
    blocker_codes: string[];
  };
  source: "evaluate_comm_hub_send_decision";
}

export interface EvaluateSendDecisionInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  sendContext: SendDecisionContext;
  toRecipients?: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  templateVersionId?: string | null;
  senderProfileId?: string | null;
  previewApprovalId?: string | null;
  previewConfirmed?: boolean;
  dryRunCertificationId?: string | null;
  controlledLiveGrantId?: string | null;
  idempotencyKey?: string | null;
  requestedBy?: string | null;
  maxTotalRecipients?: number | null;
  entityId?: string | null;
  businessEventId?: string | null;
}

export async function evaluateCanonicalSendDecision(
  input: EvaluateSendDecisionInput,
): Promise<SendDecisionEnvelope> {
  // Phase 4B3 auth-and-retry-UI correction: readiness evaluation MUST run
  // under a fresh authenticated session. An expired token here previously
  // surfaced as a fake `not_authenticated` business blocker; instead we
  // throw a typed CommHubAuthError that callers separate from readiness.
  try {
    await getFreshAuthenticatedSession();
  } catch (err) {
    if (err instanceof CommHubAuthError) throw err;
    throw new CommHubAuthError("authentication_required", (err as Error)?.message);
  }

  const payload: Record<string, unknown> = {
    module_code: input.moduleCode,
    event_code: input.eventCode,
    channel: input.channel ?? "email",
    send_context: input.sendContext,
    to_recipients: input.toRecipients ?? [],
    cc_recipients: input.ccRecipients ?? [],
    bcc_recipients: input.bccRecipients ?? [],
    preview_confirmed: !!input.previewConfirmed,
  };
  if (input.templateVersionId) payload.template_version_id = input.templateVersionId;
  if (input.senderProfileId) payload.sender_profile_id = input.senderProfileId;
  if (input.previewApprovalId) payload.preview_approval_id = input.previewApprovalId;
  if (input.dryRunCertificationId) payload.dry_run_certification_id = input.dryRunCertificationId;
  if (input.controlledLiveGrantId) payload.controlled_live_grant_id = input.controlledLiveGrantId;
  if (input.idempotencyKey) payload.idempotency_key = input.idempotencyKey;
  if (input.requestedBy) payload.requested_by = input.requestedBy;
  if (typeof input.maxTotalRecipients === "number") payload.max_total_recipients = input.maxTotalRecipients;
  if (input.entityId) payload.entity_id = input.entityId;
  if (input.businessEventId) payload.business_event_id = input.businessEventId;

  const { data, error } = await (supabase as any).rpc(
    "evaluate_comm_hub_send_decision",
    { p_payload: payload },
  );
  if (error) {
    const msg = error.message ?? "evaluate_comm_hub_send_decision failed";
    // Server-side JWT rejection during the readiness RPC must be re-raised
    // as an auth error so the UI does NOT paint it as a business blocker.
    if (/jwt|token|not[_ ]?authenticated|unauthorized|401/i.test(msg)) {
      throw new CommHubAuthError("authentication_required", msg);
    }
    throw new Error(msg);
  }
  return data as SendDecisionEnvelope;
}

/** True iff a previously returned decision is still valid for the same config. */
export function isSendDecisionFresh(
  decision: Pick<SendDecisionEnvelope, "expires_at" | "configuration_version" | "recipient_policy_version">,
  currentConfigurationVersion: number | null,
  currentRecipientPolicyVersion: number | null,
): boolean {
  if (Date.parse(decision.expires_at) < Date.now()) return false;
  if (
    currentConfigurationVersion != null &&
    decision.configuration_version != null &&
    currentConfigurationVersion !== decision.configuration_version
  ) return false;
  if (
    currentRecipientPolicyVersion != null &&
    decision.recipient_policy_version != null &&
    currentRecipientPolicyVersion !== decision.recipient_policy_version
  ) return false;
  return true;
}
