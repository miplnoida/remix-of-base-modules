/**
 * PHASE_4B3 Slice 2 — Authoritative Controlled Stub creation + targeted claim.
 *
 * Static, source-level assertions verifying the invariants required by
 * Slice 2. No runtime rows are created by these tests.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const dispatcher = readFileSync(
  "supabase/functions/comm-hub-dispatch/index.ts",
  "utf8",
);
const orchestrator = readFileSync(
  "supabase/functions/comm-hub-controlled-live-test/index.ts",
  "utf8",
);

describe("Slice 2 — orchestrator uses dedicated Controlled Stub creation RPC", () => {
  it("calls create_comm_hub_controlled_stub_message", () => {
    expect(orchestrator).toMatch(/rpc\(\s*["']create_comm_hub_controlled_stub_message["']/);
  });
  it("does NOT call generic send_communication_v1 for Controlled Stub", () => {
    // Legacy call site must be removed.
    const rpcCalls = orchestrator.match(/rpc\(\s*["']send_communication_v1["']/g) ?? [];
    expect(rpcCalls.length).toBe(0);
  });
  it("passes execution_id and grant_id to the creation RPC", () => {
    expect(orchestrator).toMatch(
      /create_comm_hub_controlled_stub_message[\s\S]{0,200}p_execution_id[\s\S]{0,200}p_grant_id/,
    );
  });
});

describe("Slice 2 — dispatcher uses atomic targeted claim RPC", () => {
  it("calls claim_comm_hub_targeted_message", () => {
    expect(dispatcher).toMatch(/rpc\(\s*["']claim_comm_hub_targeted_message["']/);
  });
  it("passes action into the targeted claim RPC", () => {
    expect(dispatcher).toMatch(
      /claim_comm_hub_targeted_message[\s\S]{0,300}p_action:\s*action/,
    );
  });
  it("routes targeted messages away from generic claim in the peek path", () => {
    expect(dispatcher).toMatch(/target_is_targeted_dispatch_only/);
  });
  it("selects targeted_dispatch_only in the peek query", () => {
    expect(dispatcher).toMatch(/targeted_dispatch_only,\s*send_context/);
  });
});

describe("Slice 2 — no generic-send fallback for Controlled Stub", () => {
  it("orchestrator does not reference send_communication_v1 anywhere in the Controlled Stub flow", () => {
    // Slice 2 removes generic send from the Controlled Stub orchestrator.
    expect(orchestrator).not.toMatch(/send_communication_v1/);
  });
});
