/**
 * Phase 4B3 — Checkpoint 2B
 *
 * Read-only diagnostic wrapper around the positional
 * `inspect_comm_hub_dry_run_preflight(uuid,uuid,text,text,text)` RPC.
 *
 * Guarantees enforced here:
 *   1. Never calls `begin_comm_hub_dry_run`, `begin_comm_hub_dry_run_v1`,
 *      or any process/certify RPC.
 *   2. Never invokes the `comm-hub-dry-run` Edge Function.
 *   3. Pure/read-only — creates no runtime rows.
 *   4. Uses the deployed positional RPC signature exactly.
 *   5. NEVER overwrites the server-supplied `contract_version`. A missing or
 *      mismatched contract version is a fail-closed block
 *      (`PREFLIGHT_CONTRACT_VERSION_MISMATCH`).
 *   6. Runs `assertDryRunContractV1` against the raw server envelope; assertion
 *      failure => `PREFLIGHT_CONTRACT_INVALID`.
 *   7. Verifies the strict readiness invariant matrix from Checkpoint 2B §K
 *      before returning `ready=true`.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  DryRunBlocker,
  DryRunContractV1Envelope,
} from "./contracts/DryRunContractV1";
import {
  DRY_RUN_CONTRACT_VERSION,
  assertDryRunContractV1,
  emptyDryRunEnvelope,
} from "./contracts/DryRunContractV1";

export interface InspectDryRunPreflightInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  previewSnapshotId: string | null;
  previewApprovalId: string | null;
}

export interface InspectDryRunPreflightResult {
  ready: boolean;
  envelope: DryRunContractV1Envelope;
  raw: unknown;
}

export async function inspectDryRunPreflight(
  input: InspectDryRunPreflightInput,
): Promise<InspectDryRunPreflightResult> {
  const { data, error } = await (supabase.rpc as any)(
    "inspect_comm_hub_dry_run_preflight",
    {
      p_preview_snapshot_id: input.previewSnapshotId,
      p_preview_approval_id: input.previewApprovalId,
      p_module_code: (input.moduleCode ?? "").trim(),
      p_event_code: (input.eventCode ?? "").trim(),
      p_channel: (input.channel ?? "email").trim(),
    },
  );

  if (error) {
    return blockedResult({
      code: "PREFLIGHT_RPC_ERROR",
      message: "Preflight RPC failed.",
    });
  }

  const raw = data as any;

  // (B) Never overwrite server contract_version — reject on mismatch.
  if (
    !raw ||
    typeof raw !== "object" ||
    raw.contract_version !== DRY_RUN_CONTRACT_VERSION
  ) {
    return blockedResult({
      code: "PREFLIGHT_CONTRACT_VERSION_MISMATCH",
      message: "Preflight response contract version unrecognised.",
    });
  }

  // (B) Assert envelope well-formedness against v1 contract.
  try {
    assertDryRunContractV1(raw);
  } catch {
    return blockedResult({
      code: "PREFLIGHT_CONTRACT_INVALID",
      message: "Preflight response failed contract validation.",
    });
  }

  const envelope = raw as DryRunContractV1Envelope;

  // (K) Strict readiness invariant matrix.
  const blockers = Array.isArray(envelope.blockers) ? envelope.blockers : [];
  const ready =
    envelope.status === "PREFLIGHT_READY" &&
    envelope.state === "PREFLIGHT" &&
    envelope.stage_succeeded === true &&
    envelope.passed === false &&
    envelope.terminal === false &&
    blockers.length === 0 &&
    envelope.mutation_started === false &&
    envelope.execution_created === false &&
    envelope.request_created === false &&
    envelope.message_created === false &&
    envelope.provider_call_attempted === false &&
    envelope.simulator_call_attempted === false;

  if (!ready && envelope.status === "PREFLIGHT_READY") {
    // Server claims ready but invariants contradict — fail closed.
    return blockedResult({
      code: "PREFLIGHT_CONTRACT_INVALID",
      message: "Preflight readiness invariants violated.",
    });
  }

  return { ready, envelope, raw };
}

function blockedResult(blocker: DryRunBlocker): InspectDryRunPreflightResult {
  const envelope = emptyDryRunEnvelope("BLOCKED", {
    state: "BLOCKED",
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
