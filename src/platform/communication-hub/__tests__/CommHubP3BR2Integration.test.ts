/**
 * CH-SIMPLE-P3B-R.2 — Runtime path integration static checks.
 *
 * Verifies that:
 *   - `comm-hub-enqueue` calls the canonical `evaluate_comm_hub_send_decision`
 *     RPC and no longer calls the legacy send-authorization / runtime-gate
 *     RPCs directly.
 *   - `comm-hub-dispatch` invokes `revalidate_comm_hub_send_decision` before
 *     the provider is called.
 *   - `send_communication_v1` persists canonical decision evidence
 *     (`original_decision_id`, `configuration_version`,
 *     `recipient_policy_version`, `send_policy_version`,
 *     `review_policy_version`, `decision_expires_at`,
 *     `decision_blocker_snapshot`).
 *
 * A separate SQL runtime harness (P3B-R.1) covers behavioural correctness.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../..");
const ENQUEUE = fs.readFileSync(path.join(ROOT, "supabase/functions/comm-hub-enqueue/index.ts"), "utf8");
const DISPATCH = fs.readFileSync(path.join(ROOT, "supabase/functions/comm-hub-dispatch/index.ts"), "utf8");

describe("CH-SIMPLE-P3B-R.2 runtime path integration", () => {
  it("comm-hub-enqueue calls the canonical send-decision RPC", () => {
    expect(ENQUEUE).toContain(`"evaluate_comm_hub_send_decision"`);
    expect(ENQUEUE).toContain("canonicalDecision");
  });

  it("comm-hub-enqueue no longer calls legacy authorization / runtime-gate RPCs", () => {
    expect(ENQUEUE).not.toContain(`"evaluate_comm_hub_send_authorization"`);
    expect(ENQUEUE).not.toContain(`"evaluate_comm_hub_runtime_gate_status"`);
  });

  it("comm-hub-dispatch revalidates the canonical decision before the provider call", () => {
    const revalIdx = DISPATCH.indexOf(`"revalidate_comm_hub_send_decision"`);
    const sendIdx = DISPATCH.indexOf("sendEmailViaGuardedTransport(admin");
    expect(revalIdx).toBeGreaterThan(-1);
    expect(sendIdx).toBeGreaterThan(-1);
    expect(revalIdx).toBeLessThan(sendIdx);
  });

  it("dispatcher persists revalidation evidence on the delivery attempt", () => {
    expect(DISPATCH).toContain("revalidation_decision_id");
    expect(DISPATCH).toContain("stale_reasons");
    expect(DISPATCH).toContain("revalidation_result");
  });

  it("enqueue forwards canonicalDecision into send_communication_v1 payload", () => {
    expect(ENQUEUE).toMatch(/rpcPayload\s*=\s*\{[^}]*canonicalDecision/);
    expect(ENQUEUE).toContain(`rpc("send_communication_v1"`);
  });
});
