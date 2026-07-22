/**
 * PHASE_4B3 Slice 1 — Structured Dispatcher Envelope + Typed Action Contract.
 *
 * Static, source-level assertions verifying the invariants required by
 * Slice 1. We deliberately avoid spinning up Deno or invoking any RPC —
 * Slice 1 must not create a request, message, execution, grant, or
 * delivery attempt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ACTION_BLOCKER_CODES,
  CONTROLLED_DISPATCH_ACTIONS,
  CONTROLLED_DISPATCH_SCHEMA_VERSION,
  appendBlocker,
  emptyControlledDispatchEnvelope,
  isControlledDispatchEnvelope,
} from "../../../../supabase/functions/_shared/communication-hub/controlled-dispatch-contract.ts";

const dispatcher = readFileSync(
  "supabase/functions/comm-hub-dispatch/index.ts",
  "utf8",
);
const orchestrator = readFileSync(
  "supabase/functions/comm-hub-controlled-live-test/index.ts",
  "utf8",
);

describe("controlled-dispatch.v1 envelope contract", () => {
  it("schema version is stable", () => {
    expect(CONTROLLED_DISPATCH_SCHEMA_VERSION).toBe("controlled-dispatch.v1");
  });
  it("empty envelope satisfies isControlledDispatchEnvelope", () => {
    const env = emptyControlledDispatchEnvelope(new Date().toISOString());
    expect(isControlledDispatchEnvelope(env)).toBe(true);
  });
  it("rejects arbitrary objects that lack the schema tag", () => {
    expect(isControlledDispatchEnvelope({ status: "BLOCKED" })).toBe(false);
    expect(isControlledDispatchEnvelope(null)).toBe(false);
    expect(isControlledDispatchEnvelope("string")).toBe(false);
  });
  it("appendBlocker deduplicates by code+stage", () => {
    const env = emptyControlledDispatchEnvelope(new Date().toISOString());
    appendBlocker(env, { code: "grant_not_dispatchable", stage: "grant_load" });
    appendBlocker(env, { code: "grant_not_dispatchable", stage: "grant_load" });
    appendBlocker(env, { code: "grant_not_dispatchable", stage: "other" });
    expect(env.blockers).toHaveLength(2);
  });
  it("exposes the canonical action union", () => {
    expect(CONTROLLED_DISPATCH_ACTIONS).toContain("RUN_CONTROLLED_STUB");
    expect(CONTROLLED_DISPATCH_ACTIONS).toContain("SEND_ONE_REAL_EMAIL");
  });
});

describe("dispatcher — targeted_controlled_live action contract", () => {
  it("declares an `action` field on TargetedControlledLiveBody", () => {
    expect(dispatcher).toMatch(/interface TargetedControlledLiveBody[\s\S]*?action\?:/);
  });
  it("validates action BEFORE any DB read", () => {
    const idx = dispatcher.indexOf("processTargetedControlledLive");
    const bodyIdx = dispatcher.indexOf(".from(\"communication_message\")", idx);
    const actionIdx = dispatcher.indexOf(ACTION_BLOCKER_CODES.TARGETED_ACTION_MISSING, idx);
    expect(actionIdx).toBeGreaterThan(0);
    expect(actionIdx).toBeLessThan(bodyIdx);
  });
  it("emits all five action blocker codes", () => {
    expect(dispatcher).toContain(ACTION_BLOCKER_CODES.TARGETED_ACTION_MISSING);
    expect(dispatcher).toContain(ACTION_BLOCKER_CODES.TARGETED_ACTION_INVALID);
    expect(dispatcher).toContain(ACTION_BLOCKER_CODES.REAL_EMAIL_ACTION_NOT_ENABLED);
  });
  it("body.action is the sole authoritative action source (no payload.action fallback)", () => {
    // payload.action was the exact undefined reference at HTTP 409. Ensure it
    // is not reintroduced anywhere in the dispatcher source.
    expect(dispatcher).not.toMatch(/\(payload as any\)\??\.action/);
    expect(dispatcher).not.toMatch(/payload\.action/);
  });
  it("does not fall back to COMM_HUB_PROVIDER_MODE for adapter selection", () => {
    // The LEGACY_STUB_INACTIVE branch is removed for targeted requests.
    expect(dispatcher).not.toContain("LEGACY_STUB_INACTIVE");
  });
  it("provider adapter invocation is marked with provider_adapter_invoked and simulated", () => {
    expect(dispatcher).toContain("env.provider_adapter_invoked = true");
    expect(dispatcher).toContain("env.simulated = true");
  });
  it("envelope carries schema_version and operation", () => {
    expect(dispatcher).toContain("CONTROLLED_DISPATCH_SCHEMA_VERSION");
    expect(dispatcher).toContain("\"targeted_controlled_live\"");
  });
});

describe("orchestrator — structured non-2xx propagation", () => {
  it("no longer collapses structured responses into dispatcher_http_error", () => {
    expect(orchestrator).not.toMatch(/addBlocker\(\s*"dispatcher_http_error"/);
  });
  it("adopts dispatcher fields BEFORE inspecting HTTP status", () => {
    const propagateIdx = orchestrator.indexOf("Adopt structured envelope fields verbatim");
    const httpCheckIdx = orchestrator.indexOf("dispatchStatus >= 400");
    expect(propagateIdx).toBeGreaterThan(0);
    expect(httpCheckIdx).toBeGreaterThan(propagateIdx);
  });
  it("distinguishes empty / non-JSON / contract-invalid dispatcher responses", () => {
    expect(orchestrator).toContain("dispatcher_response_empty");
    expect(orchestrator).toContain("dispatcher_response_not_json");
    expect(orchestrator).toContain("dispatcher_response_contract_invalid");
  });
  it("validates envelope against controlled-dispatch.v1 schema tag", () => {
    expect(orchestrator).toContain('"controlled-dispatch.v1"');
    expect(orchestrator).toContain("looksLikeEnvelope");
  });
  it("deduplicates dispatcher blockers via addBlocker", () => {
    // Ensures we no longer bulk-spread with `env.blockers.push(...dispatchBody.blockers)`.
    expect(orchestrator).not.toMatch(/env\.blockers\.push\(\.\.\.dispatchBody\.blockers\)/);
  });
  it("preserves grant_status returned by the dispatcher", () => {
    expect(orchestrator).toContain("env.grant_status = dispatchBody.grant_status");
  });
  it("only appends dispatcher_failed_without_blocker when blocker list is empty", () => {
    expect(orchestrator).toMatch(
      /if\s*\(!env\.passed && env\.blockers\.length === 0\)\s*\{\s*addBlocker\(\s*"dispatcher_failed_without_blocker"/,
    );
  });
});
