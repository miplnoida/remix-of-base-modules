/**
 * SSB Policy Lifecycle & Effective Dating
 *
 * All SSB implementation policies live in ssb_*_policy tables. Each row carries:
 *   status (DRAFT | SCHEDULED | ACTIVE | RETIRED | SUPERSEDED)
 *   effective_from / effective_to
 *   version_no, is_current, supersedes_policy_id
 *   approved_by/at, retired_by/at, retirement_reason
 *
 * Business modules MUST consume resolvePolicy / getXxxConfig instead of
 * reading ssb_*_policy directly, so the effective row for `asOfDate` is
 * always returned. All lifecycle actions write to ssb_policy_audit.
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export type PolicyStatus =
  | "DRAFT" | "SCHEDULED" | "ACTIVE" | "RETIRED" | "SUPERSEDED";

export type PolicyAction =
  | "CREATE_DRAFT" | "UPDATE_DRAFT" | "APPROVE" | "SCHEDULE"
  | "ACTIVATE" | "RETIRE" | "SUPERSEDE" | "CANCEL";

export type SsbPolicyTable =
  | "ssb_address_policy"
  | "ssb_communication_policy"
  | "ssb_contribution_calendar_policy"
  | "ssb_document_policy"
  | "ssb_financial_policy"
  | "ssb_identity_policy"
  | "ssb_legal_policy"
  | "ssb_numbering_policy"
  | "ssb_workflow_policy";

/**
 * Scope keys used to identify "the same policy" across versions.
 * Derived from the canonical POLICY_REGISTRY — do not edit here.
 */
import { POLICY_SCOPE_KEYS as REGISTRY_SCOPE_KEYS, POLICY_CHILD_TABLES as REGISTRY_CHILD_TABLES } from "@/services/ssb/ssbPolicyRegistry";
export const POLICY_SCOPE_KEYS = REGISTRY_SCOPE_KEYS as Record<SsbPolicyTable, string[]>;

export interface PolicyRow {
  id: string;
  profile_id: string;
  status: PolicyStatus;
  effective_from: string | null;
  effective_to: string | null;
  version_no: number;
  is_current: boolean;
  supersedes_policy_id: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  retired_by?: string | null;
  retired_at?: string | null;
  retirement_reason?: string | null;
  [k: string]: any;
}

// ------------------------------------------------------------------
// Audit
// ------------------------------------------------------------------
export async function auditLifecycle(args: {
  table: SsbPolicyTable;
  policyId: string;
  profileId?: string | null;
  action: PolicyAction;
  actor?: string | null;
  reason?: string | null;
  snapshot?: Record<string, any> | null;
}) {
  await db.from("ssb_policy_audit").insert({
    policy_table: args.table,
    policy_id: args.policyId,
    profile_id: args.profileId ?? null,
    action: args.action,
    actor: args.actor ?? null,
    reason: args.reason ?? null,
    snapshot: args.snapshot ?? null,
  });
}

export async function listAuditForPolicy(table: SsbPolicyTable, policyId: string) {
  const { data, error } = await db
    .from("ssb_policy_audit")
    .select("*")
    .eq("policy_table", table)
    .eq("policy_id", policyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------
// Resolver
// ------------------------------------------------------------------
function scopeFilter<T extends Record<string, any>>(
  query: any, table: SsbPolicyTable, scope: T,
) {
  for (const key of POLICY_SCOPE_KEYS[table]) {
    if (scope[key] !== undefined && scope[key] !== null) {
      query = query.eq(key, scope[key]);
    }
  }
  return query;
}

/**
 * Return the effective policy row for a scope at a given date.
 * Priority: ACTIVE row whose window contains asOfDate; else latest is_current.
 */
export async function resolvePolicy<T extends Record<string, any> = any>(
  table: SsbPolicyTable,
  scope: Record<string, any>,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<T | null> {
  let q = db.from(table).select("*").eq("status", "ACTIVE");
  q = scopeFilter(q, table, scope);
  const { data, error } = await q
    .lte("effective_from", asOfDate)
    .or(`effective_to.is.null,effective_to.gte.${asOfDate}`)
    .order("effective_from", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (data && data.length) return data[0] as T;

  // Fallback: current row (may be SCHEDULED or backfilled)
  let q2 = db.from(table).select("*").eq("is_current", true);
  q2 = scopeFilter(q2, table, scope);
  const { data: d2 } = await q2.limit(1);
  return (d2 && d2[0]) ?? null;
}

/** Resolve all ACTIVE rows for a given table + profile at asOfDate. */
export async function resolveAllPolicies<T = any>(
  table: SsbPolicyTable,
  profileId: string,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<T[]> {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("profile_id", profileId)
    .eq("status", "ACTIVE")
    .lte("effective_from", asOfDate)
    .or(`effective_to.is.null,effective_to.gte.${asOfDate}`);
  if (error) throw error;
  return (data ?? []) as T[];
}

// ------------------------------------------------------------------
// High-level composed configs consumed by business modules
// ------------------------------------------------------------------
export interface MemberRegistrationConfig {
  asOf: string;
  address: any | null;
  identityRules: any[];
  numbering: any | null;
  documents: any[];
}

export interface EmployerRegistrationConfig {
  asOf: string;
  address: any | null;
  numbering: any | null;
  documents: any[];
  legal: any[];
}

export interface BenefitSetupConfig {
  asOf: string;
  identityRules: any[];
  legal: any[];
  documents: any[];
  workflow: any[];
  financial: any[];
  communication: any[];
  contributionCalendar: any | null;
}

async function getKnProfileId(): Promise<string | null> {
  const { data } = await db
    .from("ssb_implementation_profile")
    .select("id")
    .eq("country_code", "KN")
    .maybeSingle();
  return data?.id ?? null;
}

export async function getMemberRegistrationConfig(
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<MemberRegistrationConfig> {
  const pid = await getKnProfileId();
  if (!pid) return { asOf: asOfDate, address: null, identityRules: [], numbering: null, documents: [] };
  const [address, identityRules, numbering, documents] = await Promise.all([
    resolvePolicy("ssb_address_policy", { profile_id: pid, country_code: "KN" }, asOfDate),
    resolveAllPolicies("ssb_identity_policy", pid, asOfDate),
    resolvePolicy("ssb_numbering_policy", { profile_id: pid, entity_code: "MEMBER" }, asOfDate),
    resolveAllPolicies("ssb_document_policy", pid, asOfDate)
      .then((rows) => rows.filter((r: any) => r.applies_to === "MEMBER")),
  ]);
  return { asOf: asOfDate, address, identityRules, numbering, documents };
}

export async function getEmployerRegistrationConfig(
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<EmployerRegistrationConfig> {
  const pid = await getKnProfileId();
  if (!pid) return { asOf: asOfDate, address: null, numbering: null, documents: [], legal: [] };
  const [address, numbering, documents, legal] = await Promise.all([
    resolvePolicy("ssb_address_policy", { profile_id: pid, country_code: "KN" }, asOfDate),
    resolvePolicy("ssb_numbering_policy", { profile_id: pid, entity_code: "EMPLOYER" }, asOfDate),
    resolveAllPolicies("ssb_document_policy", pid, asOfDate)
      .then((rows) => rows.filter((r: any) => r.applies_to === "EMPLOYER")),
    resolveAllPolicies("ssb_legal_policy", pid, asOfDate)
      .then((rows) => rows.filter((r: any) => r.applies_to === "EMPLOYER")),
  ]);
  return { asOf: asOfDate, address, numbering, documents, legal };
}

export async function getBenefitSetupConfig(
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<BenefitSetupConfig> {
  const pid = await getKnProfileId();
  if (!pid) {
    return {
      asOf: asOfDate, identityRules: [], legal: [], documents: [],
      workflow: [], financial: [], communication: [], contributionCalendar: null,
    };
  }
  const [identityRules, legal, documents, workflow, financial, communication, calendar] =
    await Promise.all([
      resolveAllPolicies("ssb_identity_policy", pid, asOfDate),
      resolveAllPolicies("ssb_legal_policy", pid, asOfDate),
      resolveAllPolicies("ssb_document_policy", pid, asOfDate),
      resolveAllPolicies("ssb_workflow_policy", pid, asOfDate),
      resolveAllPolicies("ssb_financial_policy", pid, asOfDate),
      resolveAllPolicies("ssb_communication_policy", pid, asOfDate),
      resolvePolicy("ssb_contribution_calendar_policy", { profile_id: pid }, asOfDate),
    ]);
  return {
    asOf: asOfDate, identityRules, legal, documents, workflow, financial,
    communication, contributionCalendar: calendar,
  };
}

// ------------------------------------------------------------------
// Lifecycle actions
// ------------------------------------------------------------------

/**
 * Child tables that carry relational policy configuration and must be
 * cloned whenever we create a new version of a parent policy row.
 * Sourced from the canonical POLICY_REGISTRY so adding a policy in one
 * place automatically wires versioning here.
 */
const POLICY_CHILD_TABLES = REGISTRY_CHILD_TABLES as Partial<Record<SsbPolicyTable, Array<{ table: string; columns: string[] }>>>;

async function cloneChildRows(parent: SsbPolicyTable, fromPolicyId: string, toPolicyId: string) {
  const defs = POLICY_CHILD_TABLES[parent];
  if (!defs?.length) return;
  for (const def of defs) {
    const { data: rows, error } = await db
      .from(def.table)
      .select(def.columns.join(","))
      .eq("policy_id", fromPolicyId);
    if (error) throw error;
    if (!rows?.length) continue;
    const payload = rows.map((r: any) => ({ ...r, policy_id: toPolicyId }));
    const { error: insErr } = await db.from(def.table).insert(payload);
    if (insErr) throw insErr;
  }
}

/** Create a new DRAFT version cloning the current row's scope + payload + child rows. */
export async function createNewVersion(args: {
  table: SsbPolicyTable;
  fromPolicyId: string;
  actor?: string | null;
}): Promise<PolicyRow> {
  const { data: current, error } = await db
    .from(args.table).select("*").eq("id", args.fromPolicyId).maybeSingle();
  if (error) throw error;
  if (!current) throw new Error("Source policy not found");

  const { id, created_at, updated_at, is_current, status, version_no,
    approved_by, approved_at, retired_by, retired_at, retirement_reason,
    effective_from, effective_to, supersedes_policy_id, ...payload } = current;

  const draft = {
    ...payload,
    status: "DRAFT" as PolicyStatus,
    is_current: false,
    version_no: (version_no ?? 1) + 1,
    supersedes_policy_id: args.fromPolicyId,
    updated_by: args.actor ?? null,
    effective_from: null,
    effective_to: null,
  };

  const { data: created, error: insErr } = await db
    .from(args.table).insert(draft).select().single();
  if (insErr) throw insErr;

  // Clone relational child rows (address fields/admin levels, weekend days, …)
  await cloneChildRows(args.table, args.fromPolicyId, created.id);

  await auditLifecycle({
    table: args.table, policyId: created.id, profileId: created.profile_id,
    action: "CREATE_DRAFT", actor: args.actor,
    snapshot: { supersedes: args.fromPolicyId, version_no: draft.version_no },
  });
  return created as PolicyRow;
}

export async function approvePolicy(args: {
  table: SsbPolicyTable; policyId: string; actor?: string | null; reason?: string | null;
}) {
  const { data, error } = await db.from(args.table).update({
    approved_by: args.actor, approved_at: new Date().toISOString(),
  }).eq("id", args.policyId).select().single();
  if (error) throw error;
  await auditLifecycle({
    table: args.table, policyId: args.policyId, profileId: data.profile_id,
    action: "APPROVE", actor: args.actor, reason: args.reason,
  });
  return data as PolicyRow;
}

/** Schedule a DRAFT/APPROVED policy for a future effective date. */
export async function schedulePolicy(args: {
  table: SsbPolicyTable; policyId: string; effectiveFrom: string;
  effectiveTo?: string | null; actor?: string | null;
}) {
  const { data, error } = await db.from(args.table).update({
    status: "SCHEDULED",
    effective_from: args.effectiveFrom,
    effective_to: args.effectiveTo ?? null,
    updated_by: args.actor,
  }).eq("id", args.policyId).select().single();
  if (error) throw error;
  await auditLifecycle({
    table: args.table, policyId: args.policyId, profileId: data.profile_id,
    action: "SCHEDULE", actor: args.actor,
    snapshot: { effective_from: args.effectiveFrom, effective_to: args.effectiveTo ?? null },
  });
  return data as PolicyRow;
}

/**
 * Activate a policy — supersedes the current-active row for the same scope
 * (marks it SUPERSEDED and closes its effective_to), then flips the new row
 * to ACTIVE + is_current. Runs as sequential updates; partial unique index
 * guarantees only one is_current per scope.
 */
export async function activatePolicy(args: {
  table: SsbPolicyTable; policyId: string; actor?: string | null;
  effectiveFrom?: string;
}) {
  const asOf = args.effectiveFrom ?? new Date().toISOString().slice(0, 10);
  const { data: target, error } = await db
    .from(args.table).select("*").eq("id", args.policyId).maybeSingle();
  if (error) throw error;
  if (!target) throw new Error("Policy not found");

  // Find current-active for same scope
  let q = db.from(args.table).select("*")
    .eq("is_current", true).neq("id", args.policyId);
  for (const key of POLICY_SCOPE_KEYS[args.table]) {
    if (target[key] !== undefined && target[key] !== null) q = q.eq(key, target[key]);
  }
  const { data: currentRows } = await q;

  // Retire/supersede any existing current row FIRST (frees partial unique idx)
  for (const row of currentRows ?? []) {
    const yesterday = new Date(asOf); yesterday.setDate(yesterday.getDate() - 1);
    await db.from(args.table).update({
      status: "SUPERSEDED", is_current: false,
      effective_to: yesterday.toISOString().slice(0, 10),
      updated_by: args.actor,
    }).eq("id", row.id);
    await auditLifecycle({
      table: args.table, policyId: row.id, profileId: row.profile_id,
      action: "SUPERSEDE", actor: args.actor,
      snapshot: { superseded_by: args.policyId },
    });
  }

  const { data: updated, error: updErr } = await db.from(args.table).update({
    status: "ACTIVE", is_current: true,
    effective_from: target.effective_from ?? asOf,
    approved_by: target.approved_by ?? args.actor,
    approved_at: target.approved_at ?? new Date().toISOString(),
    updated_by: args.actor,
  }).eq("id", args.policyId).select().single();
  if (updErr) throw updErr;

  await auditLifecycle({
    table: args.table, policyId: args.policyId, profileId: updated.profile_id,
    action: "ACTIVATE", actor: args.actor,
    snapshot: { effective_from: updated.effective_from },
  });
  return updated as PolicyRow;
}

/** Retire an active policy. Never hard-deletes. */
export async function retirePolicy(args: {
  table: SsbPolicyTable; policyId: string; actor?: string | null;
  reason?: string; effectiveTo?: string;
}) {
  const eto = args.effectiveTo ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await db.from(args.table).update({
    status: "RETIRED",
    is_current: false,
    effective_to: eto,
    retired_by: args.actor,
    retired_at: new Date().toISOString(),
    retirement_reason: args.reason ?? null,
    updated_by: args.actor,
  }).eq("id", args.policyId).select().single();
  if (error) throw error;
  await auditLifecycle({
    table: args.table, policyId: args.policyId, profileId: data.profile_id,
    action: "RETIRE", actor: args.actor, reason: args.reason,
    snapshot: { effective_to: eto },
  });
  return data as PolicyRow;
}

export const ssbPolicyLifecycleService = {
  resolvePolicy,
  resolveAllPolicies,
  getMemberRegistrationConfig,
  getEmployerRegistrationConfig,
  getBenefitSetupConfig,
  createNewVersion,
  approvePolicy,
  schedulePolicy,
  activatePolicy,
  retirePolicy,
  listAuditForPolicy,
};
