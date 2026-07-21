/**
 * CH-SIMPLE-P3E-B — Controlled-Live Test client service.
 *
 * Wraps the orchestrator edge function `comm-hub-controlled-live-test`.
 * The frontend NEVER writes to `communication_controlled_live_execution`
 * or `communication_controlled_live_grant` directly.
 */
import { supabase } from "@/integrations/supabase/client";
import { CONTROLLED_LIVE_CONFIRMATION_PHRASE } from "./controlledLiveService";
import { z } from "zod";

export interface RunControlledLiveTestInput {
  moduleCode: string;
  eventCode: string;
  recipient: string;
  channel?: "email";
  previewApprovalId: string;
  previewSnapshotId?: string;
  dryRunCertificationId: string;
  idempotencyKey: string;
  reason: string;
  /** Must be `CONTROLLED_LIVE_CONFIRMATION_PHRASE`. */
  confirmation: string;
  data?: Record<string, unknown>;
  /** CH-SIMPLE-P3E-C real-email gate. Defaults to stub. */
  allowRealEmail?: boolean;
  /** Required when `allowRealEmail = true`. Must equal `SEND ONE CONTROLLED LIVE EMAIL`. */
  panelConfirmation?: string;
}

export interface ControlledLiveTestResult {
  status: string;
  passed: boolean;
  message: string;
  idempotentReplay: boolean;
  executionId: string | null;
  executionNo: number | null;
  grantId: string | null;
  grantStatus: string | null;
  requestId: string | null;
  requestNumber: string | null;
  messageId: string | null;
  deliveryAttemptId: string | null;
  traceId: string | null;
  originalDecisionId: string | null;
  dispatcherRevalidationDecisionId: string | null;
  previewSnapshotId: string | null;
  previewApprovalId: string | null;
  dryRunCertificationId: string | null;
  providerCallAttempted: boolean;
  providerName: string | null;
  providerMessageId: string | null;
  providerStatus: string | null;
  blockers: Array<{ code: string; stage?: string; message?: string }>;
  warnings: unknown[];
  failureStage: string | null;
  startedAt: string;
  completedAt: string;
  priorOperatingMode: string | null;
  finalOperatingMode: string | null;
  cleanupSucceeded: boolean | null;
  certificationId: string | null;
  certificationStatus: string | null;
  certificationReplayed: boolean | null;
  realEmailAuthorised: boolean;
  providerMode: string;
}

export { CONTROLLED_LIVE_CONFIRMATION_PHRASE };

const controlledLiveEnvelopeSchema = z.object({
  status: z.enum([
    "BLOCKED", "ENQUEUE_FAILED", "DISPATCH_FAILED", "PROVIDER_REJECTED",
    "PROVIDER_ACCEPTED", "DELIVERY_PENDING", "DELIVERED", "FAILED",
  ]),
  passed: z.boolean(),
  message: z.string().min(1),
  blockers: z.array(z.object({
    code: z.string().min(1),
    stage: z.string().optional(),
    message: z.string().optional(),
  })),
  failure_stage: z.string().nullable(),
  provider_call_attempted: z.boolean(),
  started_at: z.string().min(1),
  completed_at: z.string().min(1),
}).passthrough();

export async function runControlledLiveTest(
  input: RunControlledLiveTestInput,
): Promise<ControlledLiveTestResult> {
  if (input.confirmation !== CONTROLLED_LIVE_CONFIRMATION_PHRASE) {
    throw new Error("confirmation phrase does not match");
  }
  const { data, error } = await supabase.functions.invoke(
    "comm-hub-controlled-live-test",
    { body: input },
  );
  if (error) throw error;
  const parsed = controlledLiveEnvelopeSchema.safeParse(data ?? {});
  if (!parsed.success) {
    throw new Error(`controlled_live_response_contract_invalid: ${parsed.error.issues[0]?.path.join(".") || "envelope"}`);
  }
  const r = parsed.data as any;
  return {
    status: r.status,
    passed: !!r.passed,
    message: r.message ?? "",
    idempotentReplay: !!r.idempotent_replay,
    executionId: r.controlled_live_execution_id ?? null,
    executionNo: r.execution_no ?? null,
    grantId: r.grant_id ?? null,
    grantStatus: r.grant_status ?? null,
    requestId: r.request_id ?? null,
    requestNumber: r.request_number ?? null,
    messageId: r.message_id ?? null,
    deliveryAttemptId: r.delivery_attempt_id ?? null,
    traceId: r.trace_id ?? null,
    originalDecisionId: r.original_decision_id ?? null,
    dispatcherRevalidationDecisionId: r.dispatcher_revalidation_decision_id ?? null,
    previewSnapshotId: r.preview_snapshot_id ?? null,
    previewApprovalId: r.preview_approval_id ?? null,
    dryRunCertificationId: r.dry_run_certification_id ?? null,
    providerCallAttempted: !!r.provider_call_attempted,
    providerName: r.provider_name ?? null,
    providerMessageId: r.provider_message_id ?? null,
    providerStatus: r.provider_status ?? null,
    blockers: (r.blockers ?? []) as any[],
    warnings: r.warnings ?? [],
    failureStage: r.failure_stage ?? null,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    priorOperatingMode: r.prior_operating_mode ?? null,
    finalOperatingMode: r.final_operating_mode ?? null,
    cleanupSucceeded: r.cleanup_succeeded ?? null,
    certificationId: r.certification_id ?? null,
    certificationStatus: r.certification_status ?? null,
    certificationReplayed: r.certification_replayed ?? null,
    realEmailAuthorised: !!r.real_email_authorised,
    providerMode: r.provider_mode ?? (r.real_email_authorised ? "real" : "unknown"),
  };
}
