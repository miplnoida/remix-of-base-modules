// BN-MORT-2B.1 server hardening test matrix.
// Covers: command registration, envelope validation, payload validation,
// payload hashing, and command matrix ↔ mortalityCommands.ts alignment.
//
// End-to-end DB flows (transitions, row_version conflicts, maker-checker,
// idempotency, rollback, audit) run against the transactional RPC
// `bn_mortality_execute_command` and its idempotency table, which are covered
// in a separate integration suite driven from the live Supabase test project.
//
// Run: deno test --allow-env --allow-net supabase/functions/bn-mortality-command/hardening_test.ts

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  COMMAND_MATRIX,
  payloadHash,
  validateEnvelope,
  validateCommandPayload,
} from "./_shared.ts";

const NOW = new Date().toISOString();
const UUID = "11111111-1111-4111-8111-111111111111";

function baseEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    commandCode: "BN_MORTALITY_DRAFT_SAVE",
    commandVersion: 1,
    correlationId: UUID,
    requestedAtUtc: NOW,
    idempotencyKey: UUID,
    actorUserCode: "TEST",
    payload: {},
    ...overrides,
  };
}

Deno.test("all 26 mortality commands are declared in COMMAND_MATRIX", () => {
  assertEquals(Object.keys(COMMAND_MATRIX).length, 26);
});

Deno.test("envelope rejects missing commandVersion", () => {
  const r = validateEnvelope(baseEnvelope({ commandVersion: 0 }));
  assert(!r.ok);
  assertEquals(r.code, "INVALID_ENVELOPE");
});

Deno.test("envelope rejects non-UUID correlationId", () => {
  const r = validateEnvelope(baseEnvelope({ correlationId: "not-a-uuid" }));
  assert(!r.ok);
});

Deno.test("envelope rejects non-UUID idempotencyKey", () => {
  const r = validateEnvelope(baseEnvelope({ idempotencyKey: "xxx" }));
  assert(!r.ok);
});

Deno.test("envelope rejects malformed requestedAtUtc", () => {
  const r = validateEnvelope(baseEnvelope({ requestedAtUtc: "yesterday" }));
  assert(!r.ok);
});

Deno.test("envelope rejects requestedAtUtc older than 24h", () => {
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const r = validateEnvelope(baseEnvelope({ requestedAtUtc: old }));
  assert(!r.ok);
});

Deno.test("envelope rejects requestedAtUtc more than 5m in the future", () => {
  const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const r = validateEnvelope(baseEnvelope({ requestedAtUtc: future }));
  assert(!r.ok);
});

Deno.test("envelope rejects unknown commandCode", () => {
  const r = validateEnvelope(baseEnvelope({ commandCode: "BN_MORTALITY_UNKNOWN" }));
  assert(!r.ok);
  assertEquals(r.code, "COMMAND_CODE_UNKNOWN");
});

Deno.test("envelope accepts a valid draft-save envelope", () => {
  const r = validateEnvelope(baseEnvelope());
  assert(r.ok);
});

Deno.test("REGISTER_REPORT payload requires deceased identity fields", () => {
  const r = validateCommandPayload("BN_MORTALITY_REGISTER_REPORT", {});
  assert(!r.ok);
});

Deno.test("MATCH_PERSON payload requires ip_master UUID", () => {
  const bad = validateCommandPayload("BN_MORTALITY_MATCH_PERSON", { matchedIpId: "x" });
  assert(!bad.ok);
  const good = validateCommandPayload("BN_MORTALITY_MATCH_PERSON", { matchedIpId: UUID, confidence: "HIGH" });
  assert(good.ok);
});

Deno.test("ASSIGN payload requires assignee UUID", () => {
  const bad = validateCommandPayload("BN_MORTALITY_ASSIGN", { assignedTo: "x" });
  assert(!bad.ok);
});

Deno.test("payloadHash is deterministic and independent of key order", () => {
  const a = payloadHash({ a: 1, b: "x" });
  const b = payloadHash({ b: "x", a: 1 });
  const c = payloadHash({ a: 2, b: "x" });
  assertEquals(a, b);
  assert(a !== c);
});

Deno.test("payloadHash produces a hex digest", () => {
  assert(/^[0-9a-f]{64}$/.test(payloadHash({ x: 1 })));
});

Deno.test("checker commands are marked makerChecker=true", () => {
  for (const cmd of [
    "BN_MORTALITY_CONFIRM_VERIFICATION",
    "BN_MORTALITY_REJECT_REPORT",
    "BN_MORTALITY_APPROVE_IMPACT",
    "BN_MORTALITY_TERMINATE_AWARD",
    "BN_MORTALITY_CREATE_PAD_OVERPAYMENT",
    "BN_MORTALITY_REFER_LEGAL",
    "BN_MORTALITY_REVERSE_CONFIRMATION",
  ]) {
    assertEquals(COMMAND_MATRIX[cmd].makerChecker, true, `${cmd} must require maker-checker`);
  }
});

Deno.test("justification-required commands are consistent", () => {
  for (const cmd of [
    "BN_MORTALITY_CANCEL",
    "BN_MORTALITY_MARK_DUPLICATE",
    "BN_MORTALITY_PLACE_PROVISIONAL_HOLD",
    "BN_MORTALITY_RELEASE_HOLD",
    "BN_MORTALITY_REJECT_REPORT",
    "BN_MORTALITY_TERMINATE_AWARD",
    "BN_MORTALITY_REVERSE_CONFIRMATION",
  ]) {
    assertEquals(COMMAND_MATRIX[cmd].requiresJustification, true, `${cmd} must require a reason`);
  }
});
