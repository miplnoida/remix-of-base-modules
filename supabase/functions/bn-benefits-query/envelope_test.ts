// BN-MORT-UI-1C — Edge function tests exercise the SHARED implementation.
//
// This file imports the actual pure helpers from `_shared.ts` — the same
// module `index.ts` imports for its authorisation, paging, envelope and
// action-availability decisions. No copied specification.
//
// Run: deno test --allow-env --allow-net supabase/functions/bn-benefits-query/envelope_test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildEnvelope,
  calculateActionAvailability,
  calculateNextPageToken,
  decideModuleAccess,
  mapQueryError,
  MORTALITY_COMMAND_SPECS,
  QueryError,
  resolveRequiredVerbs,
  validateEnvelopeInput,
  validatePaging,
  type Access,
  type EventSnapshot,
} from "./_shared.ts";

const REQ = ["bn_mortality:view", "bn_mortality:read"];
const MC = "bn_mortality";

// ---------------- Envelope shape --------------------------------------------

Deno.test("buildEnvelope produces canonical shape with defaults", () => {
  const e = buildEnvelope("OK", "corr", "Q", 1);
  assertEquals(e.status, "OK");
  assertEquals(e.errors, []);
  assertEquals(e.maskedFields, []);
  assertEquals(e.warnings, []);
});

Deno.test("validateEnvelopeInput rejects non-object body", () => {
  const r = validateEnvelopeInput(null);
  assert("error" in r);
});

Deno.test("validateEnvelopeInput rejects missing correlationId", () => {
  const r = validateEnvelopeInput({ queryCode: "Q", queryVersion: 1 });
  assert("error" in r);
});

Deno.test("validateEnvelopeInput normalises page and params", () => {
  const r = validateEnvelopeInput({ queryCode: "Q", queryVersion: 1, correlationId: "c", page: { pageSize: 50, pageToken: "25" } });
  assert(!("error" in r));
  if ("error" in r) return;
  assertEquals(r.queryCode, "Q");
  assertEquals(r.rawLimit, 50);
  assertEquals(r.rawOffset, 25);
});

// ---------------- Authorisation matrix --------------------------------------

function access(overrides: Partial<Access> = {}): Access {
  return { moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set(), ...overrides };
}

Deno.test("authz: no verbs (module enabled) → DENIED FORBIDDEN", () => {
  assertEquals(decideModuleAccess(access(), REQ, MC).status, "DENIED");
});

Deno.test("authz: module missing → DENIED MODULE_NOT_REGISTERED", () => {
  const d = decideModuleAccess(access({ moduleFound: false }), REQ, MC);
  assertEquals((d as any).code, "MODULE_NOT_REGISTERED");
});

Deno.test("authz: module disabled → DENIED MODULE_DISABLED", () => {
  const d = decideModuleAccess(access({ moduleEnabled: false, grantedVerbs: new Set(["view","admin"]) }), REQ, MC);
  assertEquals((d as any).code, "MODULE_DISABLED");
});

Deno.test("authz: routes disabled → DENIED ROUTES_DISABLED", () => {
  const d = decideModuleAccess(access({ routesEnabled: false, grantedVerbs: new Set(["view"]) }), REQ, MC);
  assertEquals((d as any).code, "ROUTES_DISABLED");
});

Deno.test("authz: is_granted=false ⇒ empty verbs ⇒ FORBIDDEN", () => {
  const d = decideModuleAccess(access({ grantedVerbs: new Set() }), REQ, MC);
  assertEquals((d as any).code, "FORBIDDEN");
});

Deno.test("authz: disabled action ⇒ verb not in grantedVerbs ⇒ FORBIDDEN", () => {
  const d = decideModuleAccess(access({ grantedVerbs: new Set(["write"]) }), REQ, MC);
  assertEquals((d as any).code, "FORBIDDEN");
});

Deno.test("authz: 'view' verb ⇒ OK", () => {
  assertEquals(decideModuleAccess(access({ grantedVerbs: new Set(["view"]) }), REQ, MC).status, "OK");
});

Deno.test("authz: 'read' verb ⇒ OK", () => {
  assertEquals(decideModuleAccess(access({ grantedVerbs: new Set(["read"]) }), REQ, MC).status, "OK");
});

Deno.test("resolveRequiredVerbs filters by moduleCode prefix", () => {
  assertEquals(resolveRequiredVerbs(["bn_mortality:view", "other:read"], "bn_mortality"), ["view"]);
});

// ---------------- Paging & pagination ---------------------------------------

Deno.test("validatePaging clamps to maxPageSize and defaults non-finite", () => {
  assertEquals(validatePaging(NaN, -5, 25), { limit: 25, offset: 0 });
  assertEquals(validatePaging(500, 100, 25), { limit: 25, offset: 100 });
  assertEquals(validatePaging(10, 0, 100), { limit: 10, offset: 0 });
});

Deno.test("calculateNextPageToken advances until totalCount", () => {
  assertEquals(calculateNextPageToken(0, 25, 60), "25");
  assertEquals(calculateNextPageToken(25, 25, 60), "50");
  assertEquals(calculateNextPageToken(50, 25, 60), null);
  assertEquals(calculateNextPageToken(0, 25, null), null);
});

// ---------------- Error mapping ---------------------------------------------

Deno.test("mapQueryError preserves INVALID + field", () => {
  const env = mapQueryError(new QueryError("INVALID", "INVALID_PARAMS", "bad", "eventId"), "c", "Q", 1);
  assertEquals(env.status, "INVALID");
  assertEquals(env.errors[0].field, "eventId");
});

Deno.test("mapQueryError bucketises unknown errors as FAILED/INTERNAL_ERROR", () => {
  const env = mapQueryError(new Error("boom"), "c", "Q", 1);
  assertEquals(env.status, "FAILED");
  assertEquals(env.errors[0].code, "INTERNAL_ERROR");
});

// ---------------- Action availability (26 commands) -------------------------

const baseEvent: EventSnapshot = {
  eventId: "e1", status: "APPROVAL_PENDING", rowVersion: 1,
  createdBy: "user-A", submittedForVerificationBy: "user-A", preparedBy: "user-B",
  submittedImpactBy: "user-B", confirmedBy: "user-C", approvedImpactBy: null,
  reversalInitiatedBy: null, matchedIpId: "IP-1", verifiedAt: "2026-01-01T00:00:00Z",
  impactPreparedAt: "2026-01-02T00:00:00Z", impactApprovedAt: null,
  terminatedAt: null, hasReferrals: false,
};

Deno.test("availability: returns exactly 26 command entries", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: false, event: baseEvent,
    grantedVerbs: new Set(["view","read","write","decide","verify","approve_impact","reverse","admin"]),
    currentUserId: "user-Z",
    integrationReadiness: {},
  });
  assertEquals(dto.length, 26);
  assertEquals(MORTALITY_COMMAND_SPECS.length, 26);
});

Deno.test("availability: actions-disabled produces the internal-pilot reason on every row", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: false, event: baseEvent, grantedVerbs: new Set(["admin"]),
    currentUserId: "user-Z", integrationReadiness: {},
  });
  for (const row of dto) {
    assert(row.reasons.some((r) => r.includes("Internal-pilot")));
    assertEquals(row.available, false);
  }
});

Deno.test("availability: implemented=false surfaces blocker reason", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: true, event: baseEvent, grantedVerbs: new Set(["admin"]),
    currentUserId: "user-Z", integrationReadiness: { awards: true, dms: true, overpayments: true, survivor: true, funeral: true, legal: true },
  });
  const attach = dto.find((r) => r.command === "BN_MORTALITY_ATTACH_EVIDENCE")!;
  assertEquals(attach.implemented, false);
  assert(attach.reasons.some((r) => r.includes("DMS") || r.includes("evidence") || r.includes("§7")));
});

Deno.test("availability: missing capability produces capability reason", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: true, event: baseEvent, grantedVerbs: new Set(["view"]),
    currentUserId: "user-Z", integrationReadiness: {},
  });
  const decide = dto.find((r) => r.command === "BN_MORTALITY_RETURN_IMPACT")!;
  assert(decide.reasons.some((r) => r.includes("bn_mortality:decide")));
});

Deno.test("availability: invalid lifecycle produces status reason", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: true,
    event: { ...baseEvent, status: "DRAFT" },
    grantedVerbs: new Set(["approve_impact","admin"]),
    currentUserId: "user-Z", integrationReadiness: {},
  });
  const approve = dto.find((r) => r.command === "BN_MORTALITY_APPROVE_IMPACT")!;
  assert(approve.reasons.some((r) => r.includes("Not valid from status")));
});

Deno.test("availability: maker-checker rejects the same user twice", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: true,
    event: { ...baseEvent, status: "APPROVAL_PENDING", submittedImpactBy: "same-user" },
    grantedVerbs: new Set(["approve_impact","admin"]),
    currentUserId: "same-user",
    integrationReadiness: { awards: true },
  });
  const approve = dto.find((r) => r.command === "BN_MORTALITY_APPROVE_IMPACT")!;
  assert(approve.reasons.some((r) => r.includes("Maker-checker")));
  assertEquals(approve.makerUserId, "same-user");
});

Deno.test("availability: data-readiness gates PREPARE_IMPACT without verifiedAt", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: true,
    event: { ...baseEvent, status: "VERIFIED", verifiedAt: null },
    grantedVerbs: new Set(["write","admin"]),
    currentUserId: "user-Z", integrationReadiness: {},
  });
  const prep = dto.find((r) => r.command === "BN_MORTALITY_PREPARE_IMPACT")!;
  assert(prep.reasons.some((r) => r.includes("verified identity")));
  assertEquals(prep.dataReady, false);
});

Deno.test("availability: integration-readiness gates TERMINATE_AWARD without awards ready", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: true,
    event: { ...baseEvent, status: "CONFIRMED", approvedImpactBy: "user-A", impactApprovedAt: "2026-02-01T00:00:00Z" },
    grantedVerbs: new Set(["decide","admin"]),
    currentUserId: "user-Z",
    integrationReadiness: { awards: false },
  });
  const term = dto.find((r) => r.command === "BN_MORTALITY_TERMINATE_AWARD")!;
  assertEquals(term.integrationReady, false);
  assert(term.reasons.some((r) => r.includes("integration") && r.includes("awards")));
});

Deno.test("availability: happy-path CANCEL from REPORTED is available when granted", () => {
  const dto = calculateActionAvailability({
    actionsEnabled: true,
    event: { ...baseEvent, status: "REPORTED" },
    grantedVerbs: new Set(["write","admin"]),
    currentUserId: "user-Z",
    integrationReadiness: {},
  });
  const cancel = dto.find((r) => r.command === "BN_MORTALITY_CANCEL")!;
  assertEquals(cancel.available, true);
  assertEquals(cancel.reasons, []);
});
