/**
 * Phase 4B3 — Checkpoint 2A, Section L/M
 *
 * Read-only diagnostic wrapper around `inspect_comm_hub_dry_run_preflight`.
 *
 * Guarantees enforced here:
 *   1. This module NEVER calls `begin_comm_hub_dry_run`,
 *      `begin_comm_hub_dry_run_v1`, or any process/certify RPC.
 *   2. It NEVER invokes the `comm-hub-dry-run` Edge Function.
 *   3. It is safe to call from a diagnostic panel — the RPC is pure and
 *      itself creates no rows and writes no transition-log entries.
 *
 * The current production execution path (Edge Function → legacy begin RPC)
 * is untouched. The v1 code path is not activated by this module.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  DryRunBlocker,
  DryRunContractV1Envelope,
} from "./contracts/DryRunContractV1";
import {
  DRY_RUN_CONTRACT_VERSION,
  emptyDryRunEnvelope,
} from "./contracts/DryRunContractV1";

export interface InspectDryRunPreflightInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  previewSnapshotId: string | null;
  previewApprovalId: string | null;
  expectedCorrelationId?: string | null;
}

export interface InspectDryRunPreflightResult {
  ready: boolean;
  envelope: DryRunContractV1Envelope;
  raw: unknown;
}

/**
 * Call the read-only preflight RPC and normalise the response into the v1
 * envelope. When the RPC has not yet been deployed, or returns something
 * unexpected, the failure is surfaced as a `BLOCKED` envelope — never
 * silently `ready=true`.
 */
export async function inspectDryRunPreflight(
  input: InspectDryRunPreflightInput,
): Promise<InspectDryRunPreflightResult> {
  const payload = {
    module_code: input.moduleCode.trim(),
    event_code: input.eventCode.trim(),
    channel: (input.channel ?? "email").trim(),
    preview_snapshot_id: input.previewSnapshotId,
    preview_approval_id: input.previewApprovalId,
    expected_correlation_id: input.expectedCorrelationId ?? null,
  };

  const { data, error } = await (supabase.rpc as any)(
    "inspect_comm_hub_dry_run_preflight",
    { p_payload: payload },
  );

  if (error) {
    return blockedResult({
      code: "PREFLIGHT_RPC_ERROR",
      message: error.message ?? "Preflight RPC failed",
      detail: { rpc_error: error },
    });
  }

  const raw = data as any;

  // The RPC returns a v1 envelope. Preserve unknown fields for diagnostics
  // but never trust `passed` or `ready` blindly — derive `ready` from the
  // status + blocker list.
  const status = (raw?.status ?? "BLOCKED") as DryRunContractV1Envelope["status"];
  const blockers: DryRunBlocker[] = Array.isArray(raw?.blockers)
    ? raw.blockers
    : [];

  const envelope: DryRunContractV1Envelope = {
    ...emptyDryRunEnvelope(status),
    ...(raw && typeof raw === "object" ? raw : {}),
    contract_version: DRY_RUN_CONTRACT_VERSION,
    blockers,
    evidence:
      raw && typeof raw.evidence === "object" && raw.evidence !== null
        ? raw.evidence
        : {},
  };

  const ready = status === "PREFLIGHT_READY" && blockers.length === 0;
  return { ready, envelope, raw };
}

function blockedResult(blocker: DryRunBlocker): InspectDryRunPreflightResult {
  const envelope = emptyDryRunEnvelope("BLOCKED", {
    failure_stage: "PREFLIGHT",
    message: blocker.message ?? "Preflight blocked",
    blockers: [blocker],
    mutation_started: false,
    execution_created: false,
    request_created: false,
    message_created: false,
    created_this_call: false,
    cleanup_proven: true,
    provider_call_attempted: false,
    simulator_call_attempted: false,
    ambiguous_outcome: false,
    retry_safe: true,
    retry_reason: "PRE_MUTATION_VALIDATION_FAILURE",
    evidence: { source: "client_wrapper" },
  });
  return { ready: false, envelope, raw: null };
}
