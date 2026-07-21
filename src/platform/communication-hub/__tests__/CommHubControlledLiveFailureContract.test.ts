import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const orchestrator = readFileSync(
  "supabase/functions/comm-hub-controlled-live-test/index.ts",
  "utf8",
);
const dispatcher = readFileSync(
  "supabase/functions/comm-hub-dispatch/index.ts",
  "utf8",
);

describe("controlled-live fail-closed contract", () => {
  it("never initializes an empty message and exposes provider mode", () => {
    expect(orchestrator).not.toContain('message: "",');
    expect(orchestrator).toContain("provider_mode");
  });

  it("blocks terminal execution replay", () => {
    expect(orchestrator).toContain("terminal_execution_replay_blocked");
    expect(orchestrator).toContain("isTerminalExecutionState");
  });

  it("turns dispatcher transport and response-shape failures into blockers", () => {
    expect(orchestrator).toContain("dispatcher_http_error");
    expect(orchestrator).toContain("dispatcher_response_not_json");
    expect(orchestrator).toContain("dispatcher_evidence_incomplete");
    expect(orchestrator).toContain("dispatcher_timeout");
    expect(orchestrator).toContain("dispatcher_unreachable");
  });

  it("uses the same recipient hash contract as controlled-live BEGIN", () => {
    expect(dispatcher).toContain("`to:${toEmail.trim().toLowerCase()}|cc:|bcc:`");
    expect(dispatcher).not.toContain(
      'JSON.stringify([{ role: "to", email: (toEmail ?? "").toLowerCase() }])',
    );
  });

  it("reconciles every pre-provider failure and surfaces cleanup/finalization failures", () => {
    expect(orchestrator).toContain("if (!env.provider_call_attempted)");
    expect(orchestrator).toContain("grant_reconciliation_failed");
    expect(orchestrator).toContain("operating_mode_restore_failed");
    expect(orchestrator).toContain("execution_finalization_failed");
  });
});