/**
 * CH-SIMPLE-P3D-B.2.b — Targeted dry-run dispatcher static integration checks.
 *
 * Verifies that the dispatcher:
 *   - Recognises the `targeted_dry_run` operation and routes it into a
 *     dedicated handler BEFORE any queue/claim work happens.
 *   - The handler NEVER calls a provider (no `sendEmailViaGuardedTransport`
 *     or `sendEmailViaProvider` symbol appears inside its body).
 *   - The handler revalidates the canonical send decision.
 *   - The handler writes exactly ONE authoritative attempt row with
 *     `attempt_type='dry_run'`, `provider_call_attempted=false`, and the
 *     hashed evidence columns (`recipient_set_hash`, `subject_hash`,
 *     `body_hash`).
 *   - The normal queue path refuses dry-run-locked rows defensively so a
 *     misclassified message can never reach a provider through cron.
 *
 * Behavioural correctness is covered by the SQL runtime harness in P3D-B.2.c.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DISPATCH = fs.readFileSync(
  path.resolve(__dirname, "../../../../supabase/functions/comm-hub-dispatch/index.ts"),
  "utf8",
);

function extractHandler(src: string, name: string): string {
  const start = src.indexOf(`async function ${name}(`);
  if (start === -1) return "";
  // Naive brace matcher scoped to the function body.
  let depth = 0;
  let i = src.indexOf("{", start);
  const bodyStart = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return src.slice(bodyStart, i + 1); }
  }
  return src.slice(bodyStart);
}

describe("CH-SIMPLE-P3D-B.2.b targeted dry-run dispatcher", () => {
  it("dispatcher routes `targeted_dry_run` before touching the queue", () => {
    const opIdx = DISPATCH.indexOf(`operation === "targeted_dry_run"`);
    const claimIdx = DISPATCH.indexOf("claim_communication_messages");
    expect(opIdx).toBeGreaterThan(-1);
    // The routing branch appears before any claim RPC usage.
    expect(claimIdx === -1 || opIdx < claimIdx).toBe(true);
    expect(DISPATCH).toContain("processTargetedDryRun(admin, bodyParsed)");
  });

  it("processTargetedDryRun never calls a real provider transport", () => {
    const body = extractHandler(DISPATCH, "processTargetedDryRun");
    expect(body.length).toBeGreaterThan(500);
    expect(body).not.toContain("sendEmailViaGuardedTransport");
    expect(body).not.toContain("sendEmailViaProvider");
    expect(body).not.toContain("resolve_comm_hub_transport_guard");
  });

  it("processTargetedDryRun revalidates via the canonical RPC", () => {
    const body = extractHandler(DISPATCH, "processTargetedDryRun");
    expect(body).toContain(`"revalidate_comm_hub_send_decision"`);
  });

  it("processTargetedDryRun writes authoritative dry-run attempt evidence", () => {
    const body = extractHandler(DISPATCH, "processTargetedDryRun");
    expect(body).toContain(`attempt_type: "dry_run"`);
    expect(body).toContain("provider_call_attempted: false");
    expect(body).toContain("recipient_set_hash");
    expect(body).toContain("subject_hash");
    expect(body).toContain("body_hash");
    expect(body).toContain("original_decision_id");
    expect(body).toContain("revalidation_decision_id");
    // Never marks the message itself as sent/delivered.
    expect(body).not.toMatch(/status:\s*['"]sent['"]/);
    expect(body).not.toMatch(/status:\s*['"]delivered['"]/);
  });

  it("uses canonical dry-run classification and request-level recipient normalization", () => {
    const body = extractHandler(DISPATCH, "processTargetedDryRun");
    expect(body).toContain(`origin !== "comm-hub-dry-run"`);
    expect(body).toContain(`.from("communication_recipient")`);
    expect(body).toContain(`.eq("request_id", requestId)`);
    expect(body).toContain(`"comm_hub_normalize_recipient_set"`);
    expect(body).not.toContain("recipient_id");
  });

  it("processTargetedDryRun fails closed on non-dry-run / unlocked / mismatched messages", () => {
    const body = extractHandler(DISPATCH, "processTargetedDryRun");
    expect(body).toContain("targeted_message_not_dry_run");
    expect(body).toContain("targeted_message_not_locked");
    expect(body).toContain("targeted_message_context_mismatch");
    expect(body).toContain("targeted_message_request_mismatch");
    expect(body).toContain("targeted_message_id_invalid");
  });

  it("processTargetedDryRun is idempotent (existing attempt returns replay)", () => {
    const body = extractHandler(DISPATCH, "processTargetedDryRun");
    expect(body).toContain("idempotent_replay: true");
    expect(body).toContain(`attempt_type", "dry_run"`);
  });

  it("normal queue path defensively refuses dry-run-locked messages", () => {
    expect(DISPATCH).toContain("dry_run_message_cron_claim_refused");
    expect(DISPATCH).toContain("SKIPPED_DRY_RUN_LOCKED");
  });
});
