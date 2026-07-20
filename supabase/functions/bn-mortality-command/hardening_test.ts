// BN-MORT-2B.1 server hardening test matrix.
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
const UUID2 = "22222222-2222-4222-8222-222222222222";

function baseEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    commandCode: "BN_MORTALITY_DRAFT_SAVE",
    commandVersion: 1,
    correlationId: UUID,
    requestedAtUtc: NOW,
    idempotencyKey: UUID2,
    actorUserCode: "TEST",
    payload: {},
    ...overrides,
  };
}

Deno.test("all 26 mortality commands are declared in COMMAND_MATRIX", () => {
  assertEquals(Object.keys(COMMAND_MATRIX).length, 26);
});

Deno.test("valid envelope produces no errors", () => {
  assertEquals(validateEnvelope(baseEnvelope()), []);
});

Deno.test("envelope rejects missing commandVersion", () => {
  const errs = validateEnvelope(baseEnvelope({ commandVersion: 0 }));
  assert(errs.length > 0);
});

Deno.test("envelope rejects non-UUID correlationId", () => {
  const errs = validateEnvelope(baseEnvelope({ correlationId: "not-a-uuid" }));
  assert(errs.length > 0);
});

Deno.test("envelope rejects non-UUID idempotencyKey", () => {
  const errs = validateEnvelope(baseEnvelope({ idempotencyKey: "xxx" }));
  assert(errs.length > 0);
});

Deno.test("envelope rejects malformed requestedAtUtc", () => {
  const errs = validateEnvelope(baseEnvelope({ requestedAtUtc: "yesterday" }));
  assert(errs.length > 0);
});

Deno.test("envelope rejects requestedAtUtc older than allowed", () => {
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const errs = validateEnvelope(baseEnvelope({ requestedAtUtc: old }));
  assert(errs.length > 0);
});

Deno.test("envelope rejects far-future requestedAtUtc", () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const errs = validateEnvelope(baseEnvelope({ requestedAtUtc: future }));
  assert(errs.length > 0);
});

Deno.test("REGISTER_REPORT rejects empty payload", () => {
  const errs = validateCommandPayload("BN_MORTALITY_REGISTER_REPORT", {}, null);
  assert(errs.length > 0);
});

Deno.test("MATCH_PERSON rejects non-UUID matched id", () => {
  const errs = validateCommandPayload("BN_MORTALITY_MATCH_PERSON", { matchedIpId: "x" }, UUID);
  assert(errs.length > 0);
});

Deno.test("ASSIGN rejects non-UUID assignee", () => {
  const errs = validateCommandPayload("BN_MORTALITY_ASSIGN", { assignedTo: "x" }, UUID);
  assert(errs.length > 0);
});

Deno.test("payloadHash is deterministic and key-order-independent", async () => {
  const a = await payloadHash({ a: 1, b: "x" });
  const b = await payloadHash({ b: "x", a: 1 });
  const c = await payloadHash({ a: 2, b: "x" });
  assertEquals(a, b);
  assert(a !== c);
});

Deno.test("payloadHash produces a hex digest", async () => {
  const h = await payloadHash({ x: 1 });
  assert(/^[0-9a-f]+$/.test(h));
});

Deno.test("checker commands require maker-checker", () => {
  const checkers = [
    "BN_MORTALITY_CONFIRM_VERIFICATION",
    "BN_MORTALITY_REJECT_REPORT",
    "BN_MORTALITY_APPROVE_IMPACT",
    "BN_MORTALITY_TERMINATE_AWARD",
    "BN_MORTALITY_CREATE_PAD_OVERPAYMENT",
    "BN_MORTALITY_REFER_LEGAL",
    "BN_MORTALITY_REVERSE_CONFIRMATION",
  ];
  for (const cmd of checkers) {
    assertEquals(COMMAND_MATRIX[cmd]?.makerChecker, true, `${cmd} must require maker-checker`);
  }
});

Deno.test("justification-required commands are marked", () => {
  const withJust = [
    "BN_MORTALITY_CANCEL",
    "BN_MORTALITY_MARK_DUPLICATE",
    "BN_MORTALITY_PLACE_PROVISIONAL_HOLD",
    "BN_MORTALITY_RELEASE_HOLD",
    "BN_MORTALITY_REJECT_REPORT",
    "BN_MORTALITY_TERMINATE_AWARD",
    "BN_MORTALITY_REVERSE_CONFIRMATION",
  ];
  for (const cmd of withJust) {
    assertEquals(COMMAND_MATRIX[cmd]?.requiresJustification, true, `${cmd} must require reason`);
  }
});
