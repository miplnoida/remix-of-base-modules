/**
 * PHASE 4B3 Slice 1 — Canonical runtime governance evaluator client.
 *
 * READ-ONLY wrapper around `public.check_comm_hub_runtime_governance`.
 * The browser MUST NOT reproduce the rules used to calculate `ready`.
 * It only forwards module/event/channel + optional evidence IDs.
 * The server resolves and validates authoritative governance records.
 */
import { supabase } from "@/integrations/supabase/client";

export type RuntimeGovernanceStage =
  | "PREVIEW_TEST"
  | "PREVIEW_APPROVAL"
  | "DRY_RUN_TEST"
  | "CONTROLLED_STUB"
  | "ONE_REAL_EMAIL"
  | "MANUAL_PRODUCTION"
  | "AUTOMATED_PRODUCTION";

export type RuntimeGovernanceBlockerCode =
  | "INVALID_TARGET_STAGE"
  | "EVENT_MAPPING_NOT_ACTIVE"
  | "TEMPLATE_VERSION_NOT_ACTIVE"
  | "TEMPLATE_VERSION_NOT_CERTIFIED"
  | "TEMPLATE_CERTIFICATION_STALE"
  | "GOVERNANCE_CERTIFICATION_SUPERSEDED"
  | "GOVERNANCE_RECORD_MISSING"
  | "GOVERNANCE_EVIDENCE_INCOMPLETE"
  | "AUTOMATION_GOVERNANCE_EVIDENCE_INCOMPLETE"
  | "DEPENDENCY_HASH_MISMATCH"
  | "PREVIEW_SNAPSHOT_REQUIRED"
  | "PREVIEW_SNAPSHOT_NOT_FOUND"
  | "VARIABLE_CONTRACT_NOT_ENFORCED"
  | "EVENT_SCHEMA_NOT_ENFORCED"
  | "TEST_SCENARIO_NOT_ACTIVE"
  | "SENDER_NOT_TEST_READY"
  | "SENDER_NOT_REAL_EMAIL_READY";

export interface RuntimeGovernanceBlocker {
  code: RuntimeGovernanceBlockerCode | string;
  message: string;
  severity: "critical" | "high" | "medium" | "low";
  stage: string;
  changed_categories?: string[];
}

export interface RuntimeGovernanceEnvelope {
  ready: boolean;
  target_stage: RuntimeGovernanceStage | string;
  module_code: string;
  event_code: string;
  channel: string;
  event_template_map_id: string | null;
  mapping_active: boolean;
  template_id: string | null;
  template_version_id: string | null;
  template_version_status: string | null;
  governance_record_id: string | null;
  governance_status: string | null;
  certification_id: string | null;
  certification_kind: string | null;
  certified_dependency_hash: string | null;
  current_dependency_hash: string | null;
  certification_freshness:
    | "CURRENT"
    | "POSSIBLY_STALE"
    | "STALE"
    | "SUPERSEDED"
    | "NOT_EVALUATED"
    | string;
  changed_dependency_categories: string[];
  blockers: RuntimeGovernanceBlocker[];
  warnings: Array<{ code: string; message: string }>;
  recommended_actions: Array<{ code: string; route?: string }>;
  source: "check_comm_hub_runtime_governance";
  evaluator_version: string;
  evaluated_at: string;
}

export interface CheckRuntimeGovernanceInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  targetStage: RuntimeGovernanceStage;
  previewSnapshotId?: string | null;
  previewApprovalId?: string | null;
  dryRunCertificationId?: string | null;
}

export async function checkCommHubRuntimeGovernance(
  input: CheckRuntimeGovernanceInput,
): Promise<RuntimeGovernanceEnvelope> {
  const { data, error } = await (supabase as any).rpc(
    "check_comm_hub_runtime_governance",
    {
      p_module_code: input.moduleCode,
      p_event_code: input.eventCode,
      p_channel: input.channel ?? "email",
      p_target_stage: input.targetStage,
      p_preview_snapshot_id: input.previewSnapshotId ?? null,
      p_preview_approval_id: input.previewApprovalId ?? null,
      p_dry_run_certification_id: input.dryRunCertificationId ?? null,
    },
  );
  if (error) throw new Error(error.message ?? "check_comm_hub_runtime_governance failed");
  return data as RuntimeGovernanceEnvelope;
}

/** Plain-language mapping for the Go Live UI. */
export function humanizeGovernanceBlocker(b: RuntimeGovernanceBlocker): string {
  switch (b.code) {
    case "EVENT_MAPPING_NOT_ACTIVE":
      return "Event mapping is not active. This event has not completed configuration certification.";
    case "TEMPLATE_VERSION_NOT_ACTIVE":
      return "The template version is not active. Publish an approved version before continuing.";
    case "TEMPLATE_VERSION_NOT_CERTIFIED":
      return "The template version has no current certification. Certify the template before continuing.";
    case "TEMPLATE_CERTIFICATION_STALE":
      return "Template certification is stale. The template or one of its governed dependencies changed after certification. Create a new certification before continuing.";
    case "GOVERNANCE_CERTIFICATION_SUPERSEDED":
      return "A newer certification exists. Prepare and approve a new Preview.";
    case "GOVERNANCE_RECORD_MISSING":
      return "No governance record exists for this template version. Complete lifecycle registration first.";
    case "DEPENDENCY_HASH_MISMATCH":
      return "The Preview snapshot no longer matches the current configuration. Prepare a new Preview.";
    case "GOVERNANCE_EVIDENCE_INCOMPLETE":
    case "AUTOMATION_GOVERNANCE_EVIDENCE_INCOMPLETE":
      return "No release certification exists for this stage. Complete upstream certification first.";
    default:
      return b.message || b.code;
  }
}
