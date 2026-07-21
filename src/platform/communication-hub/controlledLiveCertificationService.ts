/**
 * CH-SIMPLE-P3E-C — Controlled-Live Certification client service.
 *
 * READ + MANUAL VERIFICATION only. Certifications are ISSUED by the
 * orchestrator edge function `comm-hub-controlled-live-test` (service
 * role); clients never call `record_controlled_live_certification`.
 *
 * All state changes flow through SECURITY DEFINER RPCs:
 *   - record_controlled_live_manual_verification  (admin)
 *   - get_controlled_live_certification           (operator/admin)
 */
import { supabase } from "@/integrations/supabase/client";

export type ControlledLiveCertificationStatus =
  | "PROVIDER_ACCEPTED"
  | "DELIVERY_CONFIRMED"
  | "DELIVERY_CONFIRMED_MANUALLY"
  | "INVALIDATED"
  | "REVOKED";

export type ControlledLiveProviderOutcome =
  | "PROVIDER_ACCEPTED"
  | "DELIVERY_PENDING"
  | "DELIVERED";

export type ControlledLiveManualVerificationStatus =
  | "CONFIRMED"
  | "NOT_RECEIVED"
  | null;

export interface ControlledLiveCertification {
  id: string;
  certificationNo: number;
  executionId: string;
  moduleCode: string;
  eventCode: string;
  channel: string;
  recipientSetHash: string;
  previewSnapshotId: string | null;
  previewApprovalId: string;
  dryRunCertificationId: string;
  requestId: string | null;
  messageId: string | null;
  deliveryAttemptId: string | null;
  traceId: string | null;
  providerName: string | null;
  providerMessageId: string | null;
  providerOutcome: ControlledLiveProviderOutcome;
  providerStatus: string | null;
  status: ControlledLiveCertificationStatus;
  manualVerificationStatus: ControlledLiveManualVerificationStatus;
  manualVerificationReceivedAt: string | null;
  manualVerificationRecipient: string | null;
  manualVerificationNote: string | null;
  manualVerifiedBy: string | null;
  manualVerifiedAt: string | null;
  recipientPolicyVersion: number | null;
  configurationVersion: number | null;
  operatingModePrior: string | null;
  operatingModeFinal: string | null;
  cleanupSucceeded: boolean | null;
  certifiedAt: string;
  certifiedBy: string | null;
  invalidationReason: string | null;
  invalidatedAt: string | null;
  invalidatedBy: string | null;
}

function fromRow(r: any): ControlledLiveCertification {
  return {
    id: r.id,
    certificationNo: Number(r.certification_no ?? 0),
    executionId: r.execution_id,
    moduleCode: r.module_code,
    eventCode: r.event_code,
    channel: r.channel,
    recipientSetHash: r.recipient_set_hash,
    previewSnapshotId: r.preview_snapshot_id,
    previewApprovalId: r.preview_approval_id,
    dryRunCertificationId: r.dry_run_certification_id,
    requestId: r.request_id,
    messageId: r.message_id,
    deliveryAttemptId: r.delivery_attempt_id,
    traceId: r.trace_id,
    providerName: r.provider_name,
    providerMessageId: r.provider_message_id,
    providerOutcome: r.provider_outcome,
    providerStatus: r.provider_status,
    status: r.status,
    manualVerificationStatus: r.manual_verification_status ?? null,
    manualVerificationReceivedAt: r.manual_verification_received_at,
    manualVerificationRecipient: r.manual_verification_recipient,
    manualVerificationNote: r.manual_verification_note,
    manualVerifiedBy: r.manual_verified_by,
    manualVerifiedAt: r.manual_verified_at,
    recipientPolicyVersion: r.recipient_policy_version,
    configurationVersion: r.configuration_version,
    operatingModePrior: r.operating_mode_prior,
    operatingModeFinal: r.operating_mode_final,
    cleanupSucceeded: r.cleanup_succeeded,
    certifiedAt: r.certified_at,
    certifiedBy: r.certified_by,
    invalidationReason: r.invalidation_reason,
    invalidatedAt: r.invalidated_at,
    invalidatedBy: r.invalidated_by,
  };
}

export async function getControlledLiveCertification(
  certificationId: string,
): Promise<ControlledLiveCertification | null> {
  const { data, error } = await (supabase as any).rpc(
    "get_controlled_live_certification",
    { p_certification_id: certificationId },
  );
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return null;
  return fromRow(rows[0]);
}

export interface RecordManualVerificationInput {
  certificationId: string;
  received: boolean;
  verifiedRecipient?: string;
  receivedAt?: string;
  note?: string;
}

export interface RecordManualVerificationResult {
  ok: boolean;
  certificationId: string;
  status: ControlledLiveCertificationStatus;
  manualVerificationStatus: ControlledLiveManualVerificationStatus;
  manualVerifiedAt: string | null;
}

export async function recordControlledLiveManualVerification(
  input: RecordManualVerificationInput,
): Promise<RecordManualVerificationResult> {
  const payload: Record<string, unknown> = {
    certification_id: input.certificationId,
    received: input.received,
  };
  if (input.verifiedRecipient) payload.verified_recipient = input.verifiedRecipient;
  if (input.receivedAt) payload.received_at = input.receivedAt;
  if (input.note) payload.note = input.note;

  const { data, error } = await (supabase as any).rpc(
    "record_controlled_live_manual_verification",
    { p_payload: payload },
  );
  if (error) throw error;
  const r = (data ?? {}) as any;
  return {
    ok: !!r.ok,
    certificationId: r.certification_id,
    status: r.status,
    manualVerificationStatus: r.manual_verification_status ?? null,
    manualVerifiedAt: r.manual_verified_at ?? null,
  };
}
