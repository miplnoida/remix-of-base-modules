/**
 * SSB Canonical Policy Registry
 * -----------------------------------------------------------------
 * One source of truth for every SSB policy. Consumers (health,
 * governance, lifecycle, resolvers) MUST route through this registry
 * instead of maintaining their own asset→table maps.
 *
 * Every entry implements the 8 mandatory interfaces of the canonical
 * framework (see docs/social-security/SSB_CANONICAL_POLICY_FRAMEWORK.md):
 *   1. Standard header      — status/version/is_current audit stamps
 *   2. Standard child list  — relational children cloned on new-version
 *   3. Standard scope keys  — identity of "same policy" across versions
 *   4. Standard lifecycle   — provided by ssbPolicyLifecycleService
 *   5. Standard validator   — health verdict per active row set
 *   6. Standard resolver    — resolveActivePolicy(assetKey, scope?)
 *   7. Standard UI mount    — SsbPolicySectionShell + section key
 *   8. Standard governance  — blocking/non-blocking classification
 *
 * Adding a new SSB policy = add one entry here.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SsbPolicyTable } from "@/services/ssb/ssbPolicyLifecycleService";

const db: any = supabase;

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface PolicyChildTableSpec {
  /** Physical child table name. */
  table: string;
  /** Columns to copy when cloning parent to a new version
   *  (id / policy_id / created_at are always excluded). */
  columns: string[];
}

export interface PolicyRegistryEntry {
  /** Canonical asset key exposed to governance (e.g. "ssb.identity"). */
  assetKey: string;
  /** Physical parent policy table. */
  table: SsbPolicyTable;
  /** SSB Setup section key used by `/admin/ssb-setup?section=`. */
  section: string;
  /** Human-friendly label used by governance messages. */
  label: string;
  /** Scope columns that identify "the same policy" across versions. */
  scopeKeys: string[];
  /** Relational child tables cloned when creating a new version. */
  childTables: PolicyChildTableSpec[];
  /** Whether the asset blocks BN readiness when missing/errored. */
  blocking: boolean;
  /** Governance error/warning rule code prefix. */
  ruleCode: string;
  /** Shared-domain / engine references this policy consumes (docs only). */
  consumes: string[];
}

// -------------------------------------------------------------------
// Registry — every SSB policy, in one place.
// -------------------------------------------------------------------

export const POLICY_REGISTRY: PolicyRegistryEntry[] = [
  {
    assetKey: "ssb.address",
    table: "ssb_address_policy",
    section: "address",
    label: "Address policy",
    scopeKeys: ["profile_id", "country_code"],
    childTables: [
      { table: "ssb_address_policy_field",       columns: ["field_code", "field_kind", "display_order"] },
      { table: "ssb_address_policy_admin_level", columns: ["admin_level_code", "display_order", "is_required"] },
    ],
    blocking: true,
    ruleCode: "SSB.E010",
    consumes: ["ssp_admin_level", "ssp_address_format"],
  },
  {
    assetKey: "ssb.identity",
    table: "ssb_identity_policy",
    section: "identity",
    label: "Identity / NIS policy",
    scopeKeys: ["profile_id", "identity_type_code"],
    childTables: [],
    blocking: true,
    ruleCode: "SSB.E011",
    consumes: ["ssp_identity_type", "ssp_identity_validation_pattern"],
  },
  {
    assetKey: "ssb.numbering",
    table: "ssb_numbering_policy",
    section: "numbering",
    label: "Numbering policy",
    scopeKeys: ["profile_id", "entity_code"],
    childTables: [],
    blocking: true,
    ruleCode: "SSB.E012",
    consumes: ["core_number_sequence"],
  },
  {
    assetKey: "ssb.contribution_calendar",
    table: "ssb_contribution_calendar_policy",
    section: "contribution",
    label: "Contribution calendar",
    scopeKeys: ["profile_id"],
    childTables: [
      { table: "ssb_contribution_calendar_weekend_day", columns: ["weekday"] },
    ],
    blocking: true,
    ruleCode: "SSB.E013",
    consumes: ["public_holidays"],
  },
  {
    assetKey: "ssb.financial",
    table: "ssb_financial_policy",
    section: "financial",
    label: "Financial / payment policy",
    scopeKeys: ["profile_id", "binding_kind", "reference_code"],
    childTables: [],
    blocking: true,
    ruleCode: "SSB.E014",
    consumes: ["ssp_currency_profile", "ssp_bank", "ssp_account_type"],
  },
  {
    assetKey: "ssb.legal",
    table: "ssb_legal_policy",
    section: "legal",
    label: "Legal policy",
    scopeKeys: ["profile_id", "legal_reference_code", "applies_to"],
    childTables: [],
    blocking: true,
    ruleCode: "SSB.E015",
    consumes: ["core_legal_reference"],
  },
  {
    assetKey: "ssb.documents",
    table: "ssb_document_policy",
    section: "documents",
    label: "Document policy",
    scopeKeys: ["profile_id", "document_type_code", "applies_to"],
    childTables: [],
    blocking: true,
    ruleCode: "SSB.E016",
    consumes: ["core_dms_document_type"],
  },
  {
    assetKey: "ssb.communication",
    table: "ssb_communication_policy",
    section: "communication",
    label: "Communication policy",
    scopeKeys: ["profile_id", "template_code", "channel"],
    childTables: [],
    blocking: false,
    ruleCode: "SSB.W020",
    consumes: ["ssp_communication_channel", "core_template"],
  },
  {
    assetKey: "ssb.workflow",
    table: "ssb_workflow_policy",
    section: "workflow",
    label: "Workflow / SLA policy",
    scopeKeys: ["profile_id", "workflow_code", "applies_to"],
    childTables: [],
    blocking: true,
    ruleCode: "SSB.E017",
    consumes: ["core_workbasket"],
  },
];

// -------------------------------------------------------------------
// Derived lookups (consumed by health / lifecycle / governance)
// -------------------------------------------------------------------

export const POLICY_BY_ASSET: Record<string, PolicyRegistryEntry> =
  Object.fromEntries(POLICY_REGISTRY.map((e) => [e.assetKey, e]));

export const POLICY_BY_TABLE: Record<string, PolicyRegistryEntry> =
  Object.fromEntries(POLICY_REGISTRY.map((e) => [e.table, e]));

export const ASSET_TO_TABLE: Record<string, SsbPolicyTable> =
  Object.fromEntries(POLICY_REGISTRY.map((e) => [e.assetKey, e.table]));

export const ASSET_TO_SECTION: Record<string, string> =
  Object.fromEntries(POLICY_REGISTRY.map((e) => [e.assetKey, e.section]));

export const POLICY_SCOPE_KEYS: Record<string, string[]> =
  Object.fromEntries(POLICY_REGISTRY.map((e) => [e.table, e.scopeKeys]));

export const POLICY_CHILD_TABLES: Record<string, PolicyChildTableSpec[]> =
  Object.fromEntries(POLICY_REGISTRY.map((e) => [e.table, e.childTables]));

export function getRegistryEntry(assetOrTable: string): PolicyRegistryEntry | undefined {
  return POLICY_BY_ASSET[assetOrTable] ?? POLICY_BY_TABLE[assetOrTable];
}

// -------------------------------------------------------------------
// Canonical resolver — resolveActivePolicy(assetKey, scope?)
// Reads only ACTIVE + is_current rows.
// -------------------------------------------------------------------

export async function resolveActivePolicy<T = any>(
  assetKey: string,
  scope: Record<string, any> = {},
): Promise<T[]> {
  const entry = POLICY_BY_ASSET[assetKey];
  if (!entry) throw new Error(`Unknown policy asset key: ${assetKey}`);
  let q = db.from(entry.table).select("*")
    .eq("status", "ACTIVE").eq("is_current", true);
  for (const key of entry.scopeKeys) {
    const v = scope[key];
    if (v !== undefined && v !== null) q = q.eq(key, v);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

/** Convenience: resolve child rows for a given parent policy row. */
export async function resolvePolicyChildren(
  table: string, policyId: string,
): Promise<Record<string, any[]>> {
  const entry = POLICY_BY_TABLE[table];
  if (!entry) return {};
  const out: Record<string, any[]> = {};
  for (const child of entry.childTables) {
    const { data } = await db.from(child.table).select("*").eq("policy_id", policyId);
    out[child.table] = data ?? [];
  }
  return out;
}

export const ssbPolicyRegistry = {
  POLICY_REGISTRY,
  POLICY_BY_ASSET,
  POLICY_BY_TABLE,
  ASSET_TO_TABLE,
  ASSET_TO_SECTION,
  POLICY_SCOPE_KEYS,
  POLICY_CHILD_TABLES,
  getRegistryEntry,
  resolveActivePolicy,
  resolvePolicyChildren,
};
