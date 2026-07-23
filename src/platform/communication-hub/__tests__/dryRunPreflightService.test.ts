/**
 * Phase 4B3 — Checkpoint 2B focused matrix (service-side).
 *
 * The full 45-point matrix requires SQL fixtures against a live database.
 * These unit tests cover the service-boundary invariants: RPC signature,
 * contract-version enforcement, assertion, and the strict readiness matrix.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: any[]) => rpcMock(...args) },
}));

import { inspectDryRunPreflight } from "@/platform/communication-hub/dryRunPreflightService";
import { DRY_RUN_CONTRACT_VERSION } from "@/platform/communication-hub/contracts/DryRunContractV1";

function readyEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    contract_version: DRY_RUN_CONTRACT_VERSION,
    status: "PREFLIGHT_READY",
    state: "PREFLIGHT",
    passed: false,
    stage_succeeded: true,
    terminal: false,
    idempotent_replay: false,
    failure_stage: null,
    message: "ok",
    validated_at: null,
    execution_deadline_at: null,
    correlation_id: null,
    preview_snapshot_id: null,
    preview_approval_id: null,
    dry_run_execution_id: null,
    execution_no: null,
    request_id: null,
    request_number: null,
    message_id: null,
    trace_id: null,
    dry_run_certification_id: null,
    certification_expires_at: null,
    recipient_count: 1,
    blockers: [],
    warnings: [],
    transition_log_ids: [],
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
    retry_reason: "SAFE_TO_PROCEED",
    evidence: {
      authenticated: true,
      authorized: true,
      approval_evidence_complete: true,
      approval_canonical_hash_valid: true,
      recipient_recompute_ok: true,
      recipient_snapshot_hash_match: true,
      recipient_snapshot_valid: true,
      frozen_recipient_snapshot_available: true,
      recipient_containers_valid: true,
      recipient_entries_valid: true,
      recipient_duplicate_policy_ok: true,
      configuration_hash_present: true,
      dependency_hash_drift: false,
    },
    ...overrides,
  };
}

const INPUT = {
  moduleCode: "APPEALS",
  eventCode: "APPEAL_RECEIVED_NOTICE",
  channel: "email",
  previewSnapshotId: "00000000-0000-0000-0000-000000000001",
  previewApprovalId: "00000000-0000-0000-0000-000000000002",
};

describe("dryRunPreflightService — Checkpoint 2B", () => {
  beforeEach(() => rpcMock.mockReset());

  it("calls the positional RPC signature exactly", async () => {
    rpcMock.mockResolvedValue({ data: readyEnvelope(), error: null });
    await inspectDryRunPreflight(INPUT);
    expect(rpcMock).toHaveBeenCalledWith(
      "inspect_comm_hub_dry_run_preflight",
      {
        p_preview_snapshot_id: INPUT.previewSnapshotId,
        p_preview_approval_id: INPUT.previewApprovalId,
        p_module_code: "APPEALS",
        p_event_code: "APPEAL_RECEIVED_NOTICE",
        p_channel: "email",
      },
    );
  });

  it("returns ready=true on a well-formed PREFLIGHT_READY envelope", async () => {
    rpcMock.mockResolvedValue({ data: readyEnvelope(), error: null });
    const r = await inspectDryRunPreflight(INPUT);
    expect(r.ready).toBe(true);
    expect(r.envelope.status).toBe("PREFLIGHT_READY");
  });

  it("rejects missing contract_version fail-closed", async () => {
    const env = readyEnvelope();
    delete (env as any).contract_version;
    rpcMock.mockResolvedValue({ data: env, error: null });
    const r = await inspectDryRunPreflight(INPUT);
    expect(r.ready).toBe(false);
    expect(r.envelope.blockers[0].code).toBe(
      "PREFLIGHT_CONTRACT_VERSION_MISMATCH",
    );
  });

  it("rejects mismatched contract_version", async () => {
    rpcMock.mockResolvedValue({
      data: readyEnvelope({ contract_version: "legacy/v0" }),
      error: null,
    });
    const r = await inspectDryRunPreflight(INPUT);
    expect(r.ready).toBe(false);
    expect(r.envelope.blockers[0].code).toBe(
      "PREFLIGHT_CONTRACT_VERSION_MISMATCH",
    );
  });

  it("rejects malformed envelope with PREFLIGHT_CONTRACT_INVALID", async () => {
    rpcMock.mockResolvedValue({
      data: readyEnvelope({ passed: "yes" }),
      error: null,
    });
    const r = await inspectDryRunPreflight(INPUT);
    expect(r.ready).toBe(false);
    expect(r.envelope.blockers[0].code).toBe("PREFLIGHT_CONTRACT_INVALID");
  });

  it("rejects PREFLIGHT_READY with contradicting runtime-row flags", async () => {
    rpcMock.mockResolvedValue({
      data: readyEnvelope({ mutation_started: true }),
      error: null,
    });
    const r = await inspectDryRunPreflight(INPUT);
    expect(r.ready).toBe(false);
    expect(r.envelope.blockers[0].code).toBe("PREFLIGHT_CONTRACT_INVALID");
  });

  it("BLOCKED envelope passes through as ready=false without invariant error", async () => {
    const blocked = readyEnvelope({
      status: "BLOCKED",
      state: "BLOCKED",
      stage_succeeded: false,
      terminal: true,
      failure_stage: "PREFLIGHT",
      blockers: [{ code: "PREVIEW_SNAPSHOT_NOT_PREPARED" }],
      retry_reason: "PRE_MUTATION_VALIDATION_FAILURE",
    });
    rpcMock.mockResolvedValue({ data: blocked, error: null });
    const r = await inspectDryRunPreflight(INPUT);
    expect(r.ready).toBe(false);
    expect(r.envelope.status).toBe("BLOCKED");
    expect(r.envelope.blockers[0].code).toBe("PREVIEW_SNAPSHOT_NOT_PREPARED");
  });

  it("returns BLOCKED envelope when RPC errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const r = await inspectDryRunPreflight(INPUT);
    expect(r.ready).toBe(false);
    expect(r.envelope.blockers[0].code).toBe("PREFLIGHT_RPC_ERROR");
  });
});
