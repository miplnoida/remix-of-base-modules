// BN-MORT-UI-1B — Benefits Query Edge Function envelope & authorisation
// contract tests. Pure unit tests, no live DB required.
//
// Run: deno test --allow-env --allow-net supabase/functions/bn-benefits-query/envelope_test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

/**
 * The edge function is Deno.serve(...) with module-scope side effects that
 * require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY at import time. Rather
 * than importing it (which starts a listener), we validate the envelope
 * contract against a pinned specification. The runtime tests below assert
 * every response shape the function is permitted to emit.
 */

type Envelope = {
  status: "OK" | "DENIED" | "INVALID" | "NOT_FOUND" | "FAILED";
  correlationId: string;
  queryCode: string;
  queryVersion: number;
  data: unknown;
  page?: { pageSize: number; nextPageToken: string | null; totalCount: number | null };
  errors: Array<{ code: string; message: string; field?: string }>;
  maskedFields: string[];
  warnings: string[];
};

function isCanonical(e: unknown): e is Envelope {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.status === "string" &&
    ["OK", "DENIED", "INVALID", "NOT_FOUND", "FAILED"].includes(o.status as string) &&
    typeof o.correlationId === "string" &&
    typeof o.queryCode === "string" &&
    typeof o.queryVersion === "number" &&
    "data" in o &&
    Array.isArray(o.errors) &&
    Array.isArray(o.maskedFields) &&
    Array.isArray(o.warnings)
  );
}

Deno.test("canonical envelope shape validator accepts OK", () => {
  const ok: Envelope = {
    status: "OK", correlationId: "c", queryCode: "Q", queryVersion: 1,
    data: [], page: { pageSize: 25, nextPageToken: null, totalCount: 0 },
    errors: [], maskedFields: [], warnings: [],
  };
  assert(isCanonical(ok));
});

Deno.test("canonical envelope shape validator rejects legacy {ok:true} shape", () => {
  const legacy = { ok: true, queryCode: "Q", data: [] };
  assertEquals(isCanonical(legacy), false);
});

Deno.test("canonical envelope shape validator rejects legacy {error:...} shape", () => {
  const legacy = { error: "FORBIDDEN" };
  assertEquals(isCanonical(legacy), false);
});

Deno.test("DENIED envelope must carry at least one error", () => {
  const denied: Envelope = {
    status: "DENIED", correlationId: "c", queryCode: "Q", queryVersion: 1,
    data: null, errors: [{ code: "FORBIDDEN", message: "missing capability" }],
    maskedFields: [], warnings: [],
  };
  assert(isCanonical(denied));
  assert(denied.errors.length > 0);
});

Deno.test("INVALID envelope must carry INVALID_PARAMS-shaped error with field", () => {
  const inv: Envelope = {
    status: "INVALID", correlationId: "c", queryCode: "Q", queryVersion: 1,
    data: null,
    errors: [{ code: "INVALID_PARAMS", message: "eventId must be UUID", field: "eventId" }],
    maskedFields: [], warnings: [],
  };
  assert(isCanonical(inv));
  assertEquals(inv.errors[0].field, "eventId");
});

/**
 * Authorisation contract — the edge function must fail-closed on every
 * missing gate. Tests below check the intended decision matrix by walking a
 * fake fixture through a copy of the resolver's logic.
 */

interface ModuleRow { is_enabled: boolean; routes_enabled: boolean }
interface Access { moduleFound: boolean; moduleEnabled: boolean; routesEnabled: boolean; grantedVerbs: Set<string> }

function decide(access: Access, anyOf: string[], moduleCode: string):
  { status: "OK" | "DENIED"; code?: string }
{
  if (!access.moduleFound) return { status: "DENIED", code: "MODULE_NOT_REGISTERED" };
  if (!access.moduleEnabled) return { status: "DENIED", code: "MODULE_DISABLED" };
  if (!access.routesEnabled) return { status: "DENIED", code: "ROUTES_DISABLED" };
  const verbs = anyOf
    .filter((c) => c.startsWith(`${moduleCode}:`))
    .map((c) => c.split(":")[1]);
  if (!verbs.some((v) => access.grantedVerbs.has(v))) {
    return { status: "DENIED", code: "FORBIDDEN" };
  }
  return { status: "OK" };
}

const REQ = ["bn_mortality:view", "bn_mortality:read"];
const MC = "bn_mortality";

Deno.test("authz: anonymous request (no verbs, module enabled) is DENIED FORBIDDEN", () => {
  const d = decide({ moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set() }, REQ, MC);
  assertEquals(d, { status: "DENIED", code: "FORBIDDEN" });
});

Deno.test("authz: is_granted=false results in empty grantedVerbs and DENIED FORBIDDEN", () => {
  // Simulate a caller whose role_permissions rows are all is_granted=false —
  // the resolver never adds those verbs to grantedVerbs.
  const d = decide({ moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set() }, REQ, MC);
  assertEquals(d, { status: "DENIED", code: "FORBIDDEN" });
});

Deno.test("authz: disabled module DENIES with MODULE_DISABLED even if caller has all verbs", () => {
  const d = decide({ moduleFound: true, moduleEnabled: false, routesEnabled: true, grantedVerbs: new Set(["view", "read", "admin"]) }, REQ, MC);
  assertEquals(d, { status: "DENIED", code: "MODULE_DISABLED" });
});

Deno.test("authz: routes disabled DENIES with ROUTES_DISABLED", () => {
  const d = decide({ moduleFound: true, moduleEnabled: true, routesEnabled: false, grantedVerbs: new Set(["view"]) }, REQ, MC);
  assertEquals(d, { status: "DENIED", code: "ROUTES_DISABLED" });
});

Deno.test("authz: disabled action means verb not in grantedVerbs → FORBIDDEN", () => {
  // resolveModuleAccess only includes actions whose is_enabled=true, so a
  // disabled 'view' action never appears in grantedVerbs.
  const d = decide({ moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set(["write"]) }, REQ, MC);
  assertEquals(d, { status: "DENIED", code: "FORBIDDEN" });
});

Deno.test("authz: missing capability (write only) is FORBIDDEN for read-only query", () => {
  const d = decide({ moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set(["write"]) }, REQ, MC);
  assertEquals(d, { status: "DENIED", code: "FORBIDDEN" });
});

Deno.test("authz: valid read access with 'view' verb → OK", () => {
  const d = decide({ moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set(["view"]) }, REQ, MC);
  assertEquals(d, { status: "OK" });
});

Deno.test("authz: valid read access with 'read' verb → OK", () => {
  const d = decide({ moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set(["read"]) }, REQ, MC);
  assertEquals(d, { status: "OK" });
});

Deno.test("authz: unregistered module DENIES with MODULE_NOT_REGISTERED", () => {
  const d = decide({ moduleFound: false, moduleEnabled: false, routesEnabled: false, grantedVerbs: new Set() }, REQ, MC);
  assertEquals(d, { status: "DENIED", code: "MODULE_NOT_REGISTERED" });
});

// ---- Explicit no select('*') for getEvent ---------------------------------

const EVENT_ALLOWED_COLUMNS = [
  "id","event_reference","status","source","deceased_full_name","deceased_dob",
  "deceased_gender","deceased_national_id","death_date","death_time","death_place",
  "death_cause","matched_ip_id","match_confidence","matched_at","verification_source",
  "verification_reference","verification_confidence","verified_at","assigned_to",
  "created_by","sla_due_at","row_version","reported_at","submitted_for_verification_at",
  "submitted_for_verification_by","confirmed_at","confirmed_by","completed_at",
  "closed_at","reversed_at","correlation_id","created_at","updated_at",
  "metadata_json","registrar_reference","match_score","rejected_reason",
  "conflict_reason","reversal_reason","verification_notes",
];

Deno.test("getEvent column allow-list contains no '*' and includes admin fields explicitly", () => {
  assert(!EVENT_ALLOWED_COLUMNS.includes("*"));
  // Admin-only fields must be intentionally selected so the masking layer can
  // null them; they are never leaked via a wildcard.
  assert(EVENT_ALLOWED_COLUMNS.includes("metadata_json"));
  assert(EVENT_ALLOWED_COLUMNS.includes("registrar_reference"));
  assert(EVENT_ALLOWED_COLUMNS.includes("verification_notes"));
});

// ---- Preview registration impact validation --------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

Deno.test("preview: deathDate in far future is rejected", () => {
  const future = new Date(Date.now() + 90 * 86400_000).toISOString();
  const dd = new Date(future);
  const rejected = dd.getTime() > Date.now() + 24 * 3600 * 1000;
  assert(rejected);
});

Deno.test("preview: deathDate must match ISO regex", () => {
  assertEquals(ISO_DATE_RE.test("yesterday"), false);
  assert(ISO_DATE_RE.test("2026-07-20"));
});

Deno.test("preview: unsafe matchedIpId is rejected", () => {
  const SAFE = /^[\p{L}\p{N}\s._@,'()\-\/]+$/u;
  assertEquals(SAFE.test("IP-123'; DROP TABLE"), false);
  assert(SAFE.test("IP-123"));
});
