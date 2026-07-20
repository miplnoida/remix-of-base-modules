/**
 * CH-SIMPLE-P3B — Frontend contract tests for the canonical send-decision
 * client. These tests do NOT reproduce the server-side rules; they only
 * assert that the wrapper faithfully forwards the payload and passes the
 * envelope through untouched, satisfying the "no frontend authorisation"
 * requirement in the P3B specification.
 *
 * Runtime evaluator behaviour (Emergency Stop, strictest-limit-wins,
 * cron/bulk prohibition, etc.) is exercised in the SQL runtime harness in
 * a subsequent turn; this file only certifies the wrapper contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  evaluateCanonicalSendDecision,
  isSendDecisionFresh,
} from "../sendDecisionService";
import fs from "node:fs";
import path from "node:path";

const okEnvelope = {
  allowed: true,
  status: "allowed",
  decision_id: "00000000-0000-0000-0000-000000000001",
  decision_type: "canonical_send_decision",
  send_context: "dry_run",
  module_code: "bn",
  event_code: "TEST",
  channel: "email",
  blockers: [],
  warnings: [],
  gate_results: [],
  fix_actions: [],
  configuration_version: 5,
  recipient_policy_version: 3,
  send_policy_version: null,
  review_policy_version: null,
  evaluated_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  trace_context: { current_stage: "complete", blocked_stage: null, blocker_codes: [] },
  source: "evaluate_comm_hub_send_decision",
};

describe("CH-SIMPLE-P3B canonical send-decision client", () => {
  beforeEach(() => rpcMock.mockReset());

  it("calls the canonical RPC exactly once with the required payload keys", async () => {
    rpcMock.mockResolvedValueOnce({ data: okEnvelope, error: null });
    await evaluateCanonicalSendDecision({
      moduleCode: "bn",
      eventCode: "TEST",
      channel: "email",
      sendContext: "dry_run",
      toRecipients: ["a@example.com"],
      maxTotalRecipients: 1,
      idempotencyKey: "abc",
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [name, arg] = rpcMock.mock.calls[0];
    expect(name).toBe("evaluate_comm_hub_send_decision");
    const p = (arg as any).p_payload;
    expect(p.module_code).toBe("bn");
    expect(p.event_code).toBe("TEST");
    expect(p.channel).toBe("email");
    expect(p.send_context).toBe("dry_run");
    expect(p.to_recipients).toEqual(["a@example.com"]);
    expect(p.max_total_recipients).toBe(1);
    expect(p.idempotency_key).toBe("abc");
  });

  it("returns the server envelope unmodified", async () => {
    rpcMock.mockResolvedValueOnce({ data: okEnvelope, error: null });
    const out = await evaluateCanonicalSendDecision({
      moduleCode: "bn", eventCode: "TEST", sendContext: "dry_run",
    });
    expect(out).toStrictEqual(okEnvelope);
  });

  it("throws with the server error message when RPC fails", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(
      evaluateCanonicalSendDecision({ moduleCode: "x", eventCode: "y", sendContext: "dry_run" }),
    ).rejects.toThrow(/boom/);
  });

  it("isSendDecisionFresh: fails on expiry", () => {
    const stale = { ...okEnvelope, expires_at: new Date(Date.now() - 1000).toISOString() };
    expect(isSendDecisionFresh(stale, 5, 3)).toBe(false);
  });

  it("isSendDecisionFresh: fails on configuration_version drift", () => {
    expect(isSendDecisionFresh(okEnvelope, 6, 3)).toBe(false);
  });

  it("isSendDecisionFresh: fails on recipient_policy_version drift", () => {
    expect(isSendDecisionFresh(okEnvelope, 5, 4)).toBe(false);
  });

  it("isSendDecisionFresh: passes when config/policy versions match and not expired", () => {
    expect(isSendDecisionFresh(okEnvelope, 5, 3)).toBe(true);
  });

  it("no frontend authorisation: service source contains no ad-hoc allow/deny rule vocabulary", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../sendDecisionService.ts"), "utf8",
    );
    // The wrapper must never compute allowed itself.
    expect(src).not.toMatch(/\ballowed\s*=\s*(true|false)\b/);
    // Must not embed recipient/domain rules
    expect(src).not.toMatch(/allowlist|denylist|@\w+\.\w+/);
  });
});
