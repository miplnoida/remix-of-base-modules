/**
 * CH-SIMPLE-P3E-A — Controlled Live Authorisation service.
 *
 * READ + BEGIN wrapper. Frontend code MUST NOT write directly to
 * `communication_controlled_live_execution` or
 * `communication_controlled_live_grant`. All state changes flow through
 * the SECURITY DEFINER RPCs:
 *
 *   - begin_comm_hub_controlled_live
 *   - validate_comm_hub_controlled_live_grant
 *
 * This module does NOT dispatch, invoke providers, or consume grants.
 * P3E-B will add live dispatch and grant consumption.
 */
import { supabase } from "@/integrations/supabase/client";

export type ControlledLiveState =
  | "STARTED"
  | "AUTHORISED"
  | "REQUEST_CREATED"
  | "DISPATCHING"
  | "PROVIDER_ACCEPTED"
  | "DELIVERY_PENDING"
  | "DELIVERED"
  | "BLOCKED"
  | "FAILED";

export type ControlledLiveGrantStatus =
  | "ISSUED"
  | "RESERVED"
  | "CONSUMED"
  | "EXPIRED"
  | "REVOKED";

export interface ControlledLiveBlocker {
  code: string;
  stage: string;
  severity: "critical" | "high" | "medium" | "low";
  message?: string;
}

export interface BeginControlledLiveInput {
  moduleCode: string;
  eventCode: string;
  channel?: "email";
  recipient: string;
  previewApprovalId: string;
  previewSnapshotId?: string;
  dryRunCertificationId: string;
  idempotencyKey: string;
  reason: string;
  /** Exact confirmation phrase required: `CONFIRM CONTROLLED LIVE`. */
  confirmation: string;
}

export interface BeginControlledLiveResult {
  ok: boolean;
  status: "BEGIN_OK" | "BEGIN_REPLAY" | "BLOCKED";
  executionId?: string;
  grantId?: string;
  scopeHash?: string;
  state?: ControlledLiveState;
  blockers?: ControlledLiveBlocker[];
  decision?: unknown;
}

export interface ValidateGrantResult {
  valid: boolean;
  grantId?: string;
  status?: ControlledLiveGrantStatus;
  executionId?: string;
  recipientSetHash?: string;
  scopeHash?: string;
  previewApprovalId?: string;
  dryRunCertificationId?: string;
  issuedAt?: string;
  expiresAt?: string;
  configurationVersion?: number | null;
  recipientPolicyVersion?: number | null;
  blockers: ControlledLiveBlocker[];
  warnings: unknown[];
  evaluatedAt?: string;
}

export const CONTROLLED_LIVE_CONFIRMATION_PHRASE = "CONFIRM CONTROLLED LIVE";

export async function beginControlledLive(
  input: BeginControlledLiveInput,
): Promise<BeginControlledLiveResult> {
  const payload: Record<string, unknown> = {
    module_code: input.moduleCode,
    event_code: input.eventCode,
    channel: input.channel ?? "email",
    recipient: input.recipient,
    preview_approval_id: input.previewApprovalId,
    dry_run_certification_id: input.dryRunCertificationId,
    idempotency_key: input.idempotencyKey,
    reason: input.reason,
    confirmation: input.confirmation,
  };
  if (input.previewSnapshotId) payload.preview_snapshot_id = input.previewSnapshotId;

  const { data, error } = await (supabase as any).rpc(
    "begin_comm_hub_controlled_live",
    { p_payload: payload },
  );
  if (error) throw new Error(error.message ?? "begin_comm_hub_controlled_live failed");
  const raw = data as any;
  return {
    ok: !!raw?.ok,
    status: raw?.status ?? "BLOCKED",
    executionId: raw?.execution_id ?? undefined,
    grantId: raw?.grant_id ?? undefined,
    scopeHash: raw?.scope_hash ?? undefined,
    state: raw?.state ?? undefined,
    blockers: (raw?.blockers ?? []) as ControlledLiveBlocker[],
    decision: raw?.decision,
  };
}

export async function validateControlledLiveGrant(params: {
  grantId: string;
  expectedScopeHash?: string;
}): Promise<ValidateGrantResult> {
  const { data, error } = await (supabase as any).rpc(
    "validate_comm_hub_controlled_live_grant",
    {
      p_payload: {
        grant_id: params.grantId,
        ...(params.expectedScopeHash ? { expected_scope_hash: params.expectedScopeHash } : {}),
      },
    },
  );
  if (error) throw new Error(error.message ?? "validate_comm_hub_controlled_live_grant failed");
  const raw = data as any;
  return {
    valid: !!raw?.valid,
    grantId: raw?.grant_id,
    status: raw?.status,
    executionId: raw?.execution_id,
    recipientSetHash: raw?.recipient_set_hash,
    scopeHash: raw?.scope_hash,
    previewApprovalId: raw?.preview_approval_id,
    dryRunCertificationId: raw?.dry_run_certification_id,
    issuedAt: raw?.issued_at,
    expiresAt: raw?.expires_at,
    configurationVersion: raw?.configuration_version,
    recipientPolicyVersion: raw?.recipient_policy_version,
    blockers: (raw?.blockers ?? []) as ControlledLiveBlocker[],
    warnings: raw?.warnings ?? [],
    evaluatedAt: raw?.evaluated_at,
  };
}

/**
 * Read the operator's controlled-live executions.
 *
 * CH-SIMPLE-P3E-B: direct SELECT on the execution table is revoked for
 * authenticated users. All reads flow through the operator-scoped
 * SECURITY DEFINER RPC `get_my_comm_hub_controlled_live_executions`,
 * which filters to `requested_by = auth.uid()` server-side.
 */
export async function listMyControlledLiveExecutions(limit = 50) {
  const { data, error } = await (supabase as any).rpc(
    "get_my_comm_hub_controlled_live_executions",
    { p_limit: limit },
  );
  if (error) throw error;
  return (data ?? []) as any[];
}
