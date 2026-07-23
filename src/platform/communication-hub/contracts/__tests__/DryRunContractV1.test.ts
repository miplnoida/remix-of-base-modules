import { describe, it, expect } from "vitest";
import {
  assertDryRunContractV1,
  emptyDryRunEnvelope,
  DRY_RUN_CONTRACT_VERSION,
  type DryRunContractV1Envelope,
  type DryRunStatus,
} from "@/platform/communication-hub/contracts/DryRunContractV1";

// ---------------------------------------------------------------------------
// Checkpoint 2, Section A/I — invariants of `passed` / `stage_succeeded` /
// `terminal` / `idempotent_replay`, and rejection of the legacy IDEMPOTENT
// status.
// ---------------------------------------------------------------------------

const INTERMEDIATE: DryRunStatus[] = [
  "PREFLIGHT_READY",
  "BEGIN_OK",
  "BEGIN_REPLAY",
  "PROCESSING",
  "PROCESSED",
];

describe("DryRunContractV1 — checkpoint 2 semantics", () => {
  it.each(INTERMEDIATE)(
    "intermediate stage %s has passed=false",
    (status) => {
      const env = emptyDryRunEnvelope(status);
      expect(env.passed).toBe(false);
      expect(env.stage_succeeded).toBe(true);
      expect(env.terminal).toBe(false);
      expect(() => assertDryRunContractV1(env)).not.toThrow();
    },
  );

  it("CERTIFIED has passed=true and terminal=true", () => {
    const env = emptyDryRunEnvelope("CERTIFIED");
    expect(env.passed).toBe(true);
    expect(env.terminal).toBe(true);
    expect(env.stage_succeeded).toBe(true);
    expect(() => assertDryRunContractV1(env)).not.toThrow();
  });

  it("FAILED is terminal and not passed", () => {
    const env = emptyDryRunEnvelope("FAILED");
    expect(env.passed).toBe(false);
    expect(env.terminal).toBe(true);
    expect(env.stage_succeeded).toBe(false);
    expect(() => assertDryRunContractV1(env)).not.toThrow();
  });

  it("BLOCKED is not stage_succeeded", () => {
    const env = emptyDryRunEnvelope("BLOCKED");
    expect(env.passed).toBe(false);
    expect(env.stage_succeeded).toBe(false);
    expect(() => assertDryRunContractV1(env)).not.toThrow();
  });

  it("generic IDEMPOTENT status is rejected by assert", () => {
    const bad: any = {
      ...emptyDryRunEnvelope("BEGIN_OK"),
      status: "IDEMPOTENT",
    };
    expect(() => assertDryRunContractV1(bad)).toThrow(/IDEMPOTENT/);
  });

  it("mutating passed=true on an intermediate stage is rejected", () => {
    const env: DryRunContractV1Envelope = {
      ...emptyDryRunEnvelope("BEGIN_OK"),
      passed: true,
    };
    expect(() => assertDryRunContractV1(env)).toThrow(/passed/);
  });

  it("mutating terminal=false on CERTIFIED is rejected", () => {
    const env: DryRunContractV1Envelope = {
      ...emptyDryRunEnvelope("CERTIFIED"),
      terminal: false,
    };
    expect(() => assertDryRunContractV1(env)).toThrow(/CERTIFIED/);
  });

  it("BEGIN_REPLAY carries idempotent_replay=true when explicitly set", () => {
    const env = emptyDryRunEnvelope("BEGIN_REPLAY", {
      idempotent_replay: true,
    });
    expect(env.idempotent_replay).toBe(true);
    expect(env.passed).toBe(false);
    expect(() => assertDryRunContractV1(env)).not.toThrow();
  });

  it("contract_version constant is stable", () => {
    expect(DRY_RUN_CONTRACT_VERSION).toBe("comm-hub-dry-run-contract/v1");
  });
});
