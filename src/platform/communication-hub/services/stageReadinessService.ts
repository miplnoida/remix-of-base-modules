/**
 * Canonical Communication Hub Stage Readiness Service.
 *
 * Wraps `evaluate_comm_hub_stage_readiness` (Phase 4B3 Generic Readiness Convergence).
 *
 * The database is authoritative; this wrapper adds only a strongly-typed contract
 * over the JSONB result. It exposes the shared 3-array shape
 * (blockers / warnings / advisories) plus the requirements matrix and evidence
 * subsections (fixture / sender) that fed the evaluation.
 */
import { supabase } from "@/integrations/supabase/client";

export type CanonicalGoLiveStage =
  | "READINESS_ONLY"
  | "PREVIEW_READY"
  | "APPROVAL_READY"
  | "DRY_RUN_READY"
  | "CONTROLLED_STUB_READY"
  | "ONE_REAL_EMAIL_READY"
  | "MANUAL_PRODUCTION_READY"
  | "AUTOMATED_PRODUCTION_READY";

export interface StageFinding {
  code: string;
  severity?: "BLOCKER" | "WARNING" | "ADVISORY";
  stage?: string;
  message?: string;
  detail?: unknown;
  [k: string]: unknown;
}

export interface StageRequirements {
  stage: CanonicalGoLiveStage;
  event_registration_required: boolean;
  event_template_map_required: boolean;
  template_version_required: boolean;
  event_schema_required: boolean;
  event_schema_enforcement_required: boolean;
  variable_contract_required: boolean;
  variable_contract_enforcement_required: boolean;
  fixture_compatibility_required: boolean;
  template_structure_certification_required: boolean;
  recipient_policy_required: boolean;
  sender_test_ready_required: boolean;
  sender_real_email_ready_required: boolean;
  preview_snapshot_required: boolean;
  preview_approval_required: boolean;
  dry_run_certification_required: boolean;
  controlled_stub_capability_required: boolean;
  live_provider_capability_required: boolean;
  release_certification_required: boolean;
  automation_arm_required: boolean;
}

export interface StageReadinessResult {
  ok: boolean;
  schemaVersion: "stage-readiness/1";
  moduleCode: string;
  eventCode: string;
  channel: string;
  requestedStage: CanonicalGoLiveStage;
  readyForRequestedStage: boolean;
  requirements: StageRequirements;
  blockers: StageFinding[];
  warnings: StageFinding[];
  advisories: StageFinding[];
  runnerResult: Record<string, unknown> | null;
  fixtureResult: Record<string, unknown> | null;
  senderResult: Record<string, unknown> | null;
  senderProfileId: string | null;
  evaluatedAt: string;
}

export async function evaluateStageReadiness(params: {
  moduleCode: string;
  eventCode: string;
  targetStage?: CanonicalGoLiveStage;
  channel?: string;
  autoComputeSenderReadiness?: boolean;
}): Promise<StageReadinessResult> {
  const { data, error } = await supabase.rpc("evaluate_comm_hub_stage_readiness", {
    p_module_code: params.moduleCode,
    p_event_code: params.eventCode,
    p_target_stage: params.targetStage ?? "PREVIEW_READY",
    p_channel: params.channel ?? "email",
    p_auto_compute_sender_readiness: params.autoComputeSenderReadiness ?? true,
  });
  if (error) throw new Error(`stage-readiness-evaluation-failed: ${error.message}`);
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(d.ok),
    schemaVersion: "stage-readiness/1",
    moduleCode: String(d.module_code ?? params.moduleCode),
    eventCode: String(d.event_code ?? params.eventCode),
    channel: String(d.channel ?? params.channel ?? "email"),
    requestedStage: (d.requested_stage as CanonicalGoLiveStage) ?? (params.targetStage ?? "PREVIEW_READY"),
    readyForRequestedStage: Boolean(d.ready_for_requested_stage),
    requirements: (d.requirements as StageRequirements),
    blockers: (d.blockers as StageFinding[]) ?? [],
    warnings: (d.warnings as StageFinding[]) ?? [],
    advisories: (d.advisories as StageFinding[]) ?? [],
    runnerResult: (d.runner_result as Record<string, unknown> | null) ?? null,
    fixtureResult: (d.fixture_result as Record<string, unknown> | null) ?? null,
    senderResult: (d.sender_result as Record<string, unknown> | null) ?? null,
    senderProfileId: (d.sender_profile_id as string) ?? null,
    evaluatedAt: String(d.evaluated_at ?? new Date().toISOString()),
  };
}

export async function computeSenderReadiness(params: {
  senderProfileId: string;
  readinessKind?: "TEST_READY" | "REAL_EMAIL_READY";
}) {
  const { data, error } = await supabase.rpc("compute_comm_hub_sender_readiness", {
    p_sender_profile_id: params.senderProfileId,
    p_readiness_kind: params.readinessKind ?? "TEST_READY",
  });
  if (error) throw new Error(`sender-readiness-compute-failed: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function checkEventFixtureCompatibility(params: {
  moduleCode: string;
  eventCode: string;
}) {
  const { data, error } = await supabase.rpc("check_comm_hub_event_fixture_compatibility", {
    p_module_code: params.moduleCode,
    p_event_code: params.eventCode,
  });
  if (error) throw new Error(`fixture-compatibility-check-failed: ${error.message}`);
  return data as Record<string, unknown>;
}
