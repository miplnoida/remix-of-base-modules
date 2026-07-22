/**
 * Frontend wrapper for the unified Go-Live Certification runner and
 * platform-wide template renderability assessment.
 * The Edge/DB layer is authoritative; this wrapper simply forwards.
 */
import { supabase } from "@/integrations/supabase/client";

export type GoLiveStage = "READINESS_ONLY" | "PREVIEW_READY" | "DRY_RUN_READY" | "CONTROLLED_STUB_READY";

export interface GoLiveCertificationBlocker {
  stage: string;
  code: string;
  details?: unknown;
}

export interface GoLiveCertificationResult {
  ok: boolean;
  moduleCode: string;
  eventCode: string;
  channel: string;
  requestedStage: GoLiveStage;
  readyForRequestedStage: boolean;
  readyByStage: Record<GoLiveStage, boolean>;
  blockers: GoLiveCertificationBlocker[];
  warnings: Array<{ code: string; message?: string }>;
  manifestHash: string;
  certificationId: string;
  governanceRecordId: string | null;
  mappingId: string | null;
  templateVersionId: string | null;
  payloadSchemaId: string | null;
  payloadSchemaVersion: number | null;
  senderProfileId: string | null;
  senderReadinessState: string;
  recipientPolicyVersion: number | null;
  unresolvedRequiredCount: number;
  rawTokenCount: number;
  executed: false;
  schemaVersion: "go-live-runner/1";
}

export async function runGoLiveCertification(params: {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  targetStage?: GoLiveStage;
}): Promise<GoLiveCertificationResult> {
  const { data, error } = await supabase.rpc("run_comm_hub_go_live_certification", {
    p_module_code: params.moduleCode,
    p_event_code: params.eventCode,
    p_channel: params.channel ?? "email",
    p_target_stage: params.targetStage ?? "READINESS_ONLY",
    p_execute: false,
  });
  if (error) throw new Error(`go-live-certification-failed: ${error.message}`);
  const d = data as Record<string, unknown>;
  return {
    ok: Boolean(d.ok),
    moduleCode: d.module_code as string,
    eventCode: d.event_code as string,
    channel: d.channel as string,
    requestedStage: d.requested_stage as GoLiveStage,
    readyForRequestedStage: Boolean(d.ready_for_requested_stage),
    readyByStage: d.ready_by_stage as Record<GoLiveStage, boolean>,
    blockers: (d.blockers as GoLiveCertificationBlocker[]) ?? [],
    warnings: (d.warnings as Array<{ code: string; message?: string }>) ?? [],
    manifestHash: d.manifest_hash as string,
    certificationId: d.certification_id as string,
    governanceRecordId: (d.governance_record_id as string) ?? null,
    mappingId: (d.mapping_id as string) ?? null,
    templateVersionId: (d.template_version_id as string) ?? null,
    payloadSchemaId: (d.payload_schema_id as string) ?? null,
    payloadSchemaVersion: (d.payload_schema_version as number) ?? null,
    senderProfileId: (d.sender_profile_id as string) ?? null,
    senderReadinessState: (d.sender_readiness_state as string) ?? "MISSING",
    recipientPolicyVersion: (d.recipient_policy_version as number) ?? null,
    unresolvedRequiredCount: (d.unresolved_required_count as number) ?? 0,
    rawTokenCount: (d.raw_token_count as number) ?? 0,
    executed: false,
    schemaVersion: "go-live-runner/1",
  };
}

export async function assessAllTemplateRenderability() {
  const { data, error } = await supabase.rpc("check_all_comm_hub_template_renderability");
  if (error) throw new Error(`renderability-assessment-failed: ${error.message}`);
  return data as Array<Record<string, unknown>>;
}

export async function assertEventReadyForStage(params: {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  targetStage: GoLiveStage;
}) {
  const { data, error } = await supabase.rpc("assert_comm_hub_event_ready_for_stage", {
    p_module_code: params.moduleCode,
    p_event_code: params.eventCode,
    p_channel: params.channel ?? "email",
    p_target_stage: params.targetStage,
  });
  if (error) throw new Error(`assert-event-ready-failed: ${error.message}`);
  return data as { ok: boolean; code?: string; stage?: string; certification_id?: string; manifest_hash?: string; reason?: string };
}
