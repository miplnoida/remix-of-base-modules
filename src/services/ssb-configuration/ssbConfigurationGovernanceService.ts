/**
 * SSB Configuration Governance Service
 *
 * Additive governance layer over the SSB implementation policy tables.
 * Never duplicates policy-lifecycle logic — always defers to
 * ssbPolicyLifecycleService for resolving the effective policy.
 *
 * Owns:
 *   - Registry of configuration assets
 *   - Dependency graph
 *   - Package lifecycle (draft → validated → scheduled → active → retired)
 *   - Validation runs & results (with weighted scoring)
 *   - Snapshots of active configuration
 *
 * See docs/social-security/SSB_CONFIGURATION_GOVERNANCE_ACCEPTANCE.md
 */
import { supabase } from "@/integrations/supabase/client";
import { getKnProfile } from "@/services/ssb/ssbImplementationConfigService";
import { evaluateAllAssetHealth, ASSET_TO_SECTION } from "@/services/ssb/ssbPolicyHealthService";

const db: any = supabase;

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------

export type AssetHealth = "healthy" | "degraded" | "unhealthy" | "unknown";
export type PackageStatus = "draft" | "validated" | "scheduled" | "active" | "retired";
export type Severity = "error" | "warning" | "info";
export type DependencyType = "consumes" | "blocks" | "validates" | "references" | "supersedes";
export type ImpactLevel = "low" | "medium" | "high" | "critical";

export interface ConfigurationAsset {
  id: string;
  asset_key: string;
  asset_name: string;
  asset_type: string;
  lifecycle_stage: string;
  engine_owner: string | null;
  implementation_owner: string | null;
  canonical_route: string | null;
  canonical_table: string | null;
  canonical_service: string | null;
  policy_table: string | null;
  scope_type: string;
  scope_value: string;
  required_for_benefits: boolean;
  status: string;
  health_status: AssetHealth;
  documentation_link: string | null;
  notes: string | null;
}

export interface ConfigurationDependency {
  id: string;
  source_asset_key: string;
  target_asset_key: string;
  dependency_type: DependencyType;
  impact_level: ImpactLevel;
  notes: string | null;
}

export interface ConfigurationPackage {
  id: string;
  package_key: string;
  package_name: string;
  version_no: number;
  status: PackageStatus;
  effective_from: string | null;
  effective_to: string | null;
  approved_by: string | null;
  approved_at: string | null;
  activated_at: string | null;
  retired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationRun {
  id: string;
  package_id: string | null;
  run_status: string;
  score: number;
  errors_count: number;
  warnings_count: number;
  info_count: number;
  started_at: string;
  completed_at: string | null;
}

export interface ValidationResult {
  id: string;
  validation_run_id: string;
  asset_key: string | null;
  severity: Severity;
  rule_code: string;
  message: string;
  recommendation: string | null;
  blocking: boolean;
}

export interface ConfigurationSnapshot {
  id: string;
  snapshot_key: string;
  package_id: string | null;
  snapshot_json: any;
  effective_date: string;
  reason: string | null;
  created_at: string;
}

// -----------------------------------------------------------------
// Registry
// -----------------------------------------------------------------

export async function listConfigurationAssets(): Promise<ConfigurationAsset[]> {
  const { data, error } = await db.from("ssb_configuration_asset").select("*").order("asset_key");
  if (error) throw error;
  return data ?? [];
}

export async function getConfigurationAsset(assetKey: string): Promise<ConfigurationAsset | null> {
  const { data, error } = await db.from("ssb_configuration_asset").select("*").eq("asset_key", assetKey).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listDependencies(assetKey: string): Promise<ConfigurationDependency[]> {
  const { data, error } = await db
    .from("ssb_configuration_dependency")
    .select("*")
    .eq("source_asset_key", assetKey);
  if (error) throw error;
  return data ?? [];
}

export async function listConsumers(assetKey: string): Promise<ConfigurationDependency[]> {
  const { data, error } = await db
    .from("ssb_configuration_dependency")
    .select("*")
    .eq("target_asset_key", assetKey);
  if (error) throw error;
  return data ?? [];
}

export async function listAllDependencies(): Promise<ConfigurationDependency[]> {
  const { data, error } = await db.from("ssb_configuration_dependency").select("*");
  if (error) throw error;
  return data ?? [];
}

// -----------------------------------------------------------------
// Packages
// -----------------------------------------------------------------

export async function listConfigurationPackages(): Promise<ConfigurationPackage[]> {
  const { data, error } = await db.from("ssb_configuration_package").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getConfigurationPackage(packageKey: string): Promise<ConfigurationPackage | null> {
  const { data, error } = await db.from("ssb_configuration_package").select("*").eq("package_key", packageKey).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createConfigurationPackage(input: {
  package_key: string;
  package_name: string;
  notes?: string;
}): Promise<ConfigurationPackage> {
  const { data, error } = await db.from("ssb_configuration_package").insert({
    package_key: input.package_key,
    package_name: input.package_name,
    notes: input.notes ?? null,
    status: "draft",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function addPolicyToPackage(packageId: string, assetKey: string, policyTable?: string, policyId?: string, policyVersionNo?: number) {
  const { data, error } = await db.from("ssb_configuration_package_item").insert({
    package_id: packageId,
    asset_key: assetKey,
    policy_table: policyTable ?? null,
    policy_id: policyId ?? null,
    policy_version_no: policyVersionNo ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listPackageItems(packageId: string) {
  const { data, error } = await db.from("ssb_configuration_package_item").select("*").eq("package_id", packageId);
  if (error) throw error;
  return data ?? [];
}

export async function scheduleConfigurationPackage(packageId: string, effectiveFrom: string) {
  const { data, error } = await db.from("ssb_configuration_package").update({
    status: "scheduled",
    effective_from: effectiveFrom,
  }).eq("id", packageId).select().single();
  if (error) throw error;
  return data;
}

export async function activateConfigurationPackage(packageId: string) {
  const now = new Date().toISOString();
  const { data, error } = await db.from("ssb_configuration_package").update({
    status: "active",
    activated_at: now,
    effective_from: new Date().toISOString().slice(0, 10),
  }).eq("id", packageId).select().single();
  if (error) throw error;
  await createConfigurationSnapshot(packageId, "auto-snapshot-on-activate");
  return data;
}

export async function retireConfigurationPackage(packageId: string, reason: string) {
  const now = new Date().toISOString();
  const { data, error } = await db.from("ssb_configuration_package").update({
    status: "retired",
    retired_at: now,
    notes: reason,
  }).eq("id", packageId).select().single();
  if (error) throw error;
  return data;
}

// -----------------------------------------------------------------
// Validation
// -----------------------------------------------------------------

interface Finding {
  asset_key: string | null;
  severity: Severity;
  rule_code: string;
  message: string;
  recommendation?: string;
  blocking?: boolean;
  weight: number;
}

async function countRows(table: string): Promise<number> {
  try {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch { return 0; }
}

async function policyCount(table: string, profileId: string): Promise<number> {
  try {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).eq("profile_id", profileId);
    if (error) return 0;
    return count ?? 0;
  } catch { return 0; }
}

/**
 * Runs the SSB Setup validation ruleset. If packageId supplied, the run is
 * associated with that package. Otherwise the run represents an ad-hoc scan.
 */
export async function runSsbSetupValidation(packageId?: string): Promise<{ run: ValidationRun; results: ValidationResult[] }> {
  const startedAt = new Date().toISOString();
  const findings: Finding[] = [];
  const profile = await getKnProfile();
  const profileId = profile?.id;

  const req = (present: boolean, asset: string, code: string, msg: string, rec?: string, weight = 12) => {
    if (!present) findings.push({ asset_key: asset, severity: "error", rule_code: code, message: msg, recommendation: rec, blocking: true, weight });
  };
  const warn = (present: boolean, asset: string, code: string, msg: string, rec?: string, weight = 4) => {
    if (!present) findings.push({ asset_key: asset, severity: "warning", rule_code: code, message: msg, recommendation: rec, blocking: false, weight });
  };
  const info = (asset: string | null, code: string, msg: string) => {
    findings.push({ asset_key: asset, severity: "info", rule_code: code, message: msg, blocking: false, weight: 0 });
  };

  // ---- Errors (block BN readiness) ----
  req(!!profile, "ssb.general", "SSB.E001", "Default KN implementation profile is missing.", "Create the profile in SSB Implementation Setup → Overview.");

  if (profileId) {
    const [addr, ident, num, cal, fin, legal, docs, wf, comm] = await Promise.all([
      policyCount("ssb_address_policy", profileId),
      policyCount("ssb_identity_policy", profileId),
      policyCount("ssb_numbering_policy", profileId),
      policyCount("ssb_contribution_calendar_policy", profileId),
      policyCount("ssb_financial_policy", profileId),
      policyCount("ssb_legal_policy", profileId),
      policyCount("ssb_document_policy", profileId),
      policyCount("ssb_workflow_policy", profileId),
      policyCount("ssb_communication_policy", profileId),
    ]);

    req(addr  > 0, "ssb.address",       "SSB.E010", "Address policy is missing.",  "Bind KN address format in SSB Setup → Address & Geography.");
    req(ident > 0, "ssb.identity",      "SSB.E011", "Identity / NIS policy is missing.", "Bind NIS identity type in SSB Setup → Identity.");
    req(num   > 0, "ssb.numbering",     "SSB.E012", "Member/Employer numbering policy is missing.", "Add numbering policies in SSB Setup → Numbering.");
    req(cal   > 0, "ssb.contribution_calendar", "SSB.E013", "Contribution calendar policy is missing.", "Configure calendar in SSB Setup → Contribution Calendar.");
    req(fin   > 0, "ssb.financial",     "SSB.E014", "Active payment channel is missing.", "Bind at least one payment channel in SSB Setup → Financial / Payment.");
    req(legal > 0, "ssb.legal",         "SSB.E015", "Legal basis is missing.", "Bind a KN legal act in SSB Setup → Legal.");
    req(docs  > 0, "ssb.documents",     "SSB.E016", "Document policy is missing.", "Bind required document types in SSB Setup → Documents.");
    req(wf    > 0, "ssb.workflow",      "SSB.E017", "Workflow / SLA policy is missing.", "Bind a workflow in SSB Setup → Workflow / SLA.");

    // ---- Warnings ----
    warn(comm > 0, "ssb.communication", "SSB.W020", "Communication templates are not yet bound.", "Bind SMS/email/letter templates in SSB Setup → Communication.");
  }

  const [templates, banks, legalActs, holidays] = await Promise.all([
    countRows("core_template"),
    countRows("ssp_bank"),
    countRows("ssp_legal_act"),
    countRows("public_holidays"),
  ]);
  warn(banks > 0,     "ssb.financial",     "SSB.W021", "Shared bank list is incomplete.", "Seed banks via shared Financial Reference domain.");
  warn(legalActs > 0, "ssb.legal",         "SSB.W022", "Legal acts / sections are placeholder — config pending.", "Complete Legal Reference Domain seed for KN.");
  warn(holidays > 0,  "ssb.contribution_calendar", "SSB.W023", "Public holidays / working calendar incomplete.", "Add KN holidays in shared Calendar Engine.");
  warn(templates > 0, "ssb.communication", "SSB.W024", "SMS / letter templates inactive.", "Activate at least one template per required channel.");

  // ---- Info ----
  info("bn.product_builder", "SSB.I030", "Benefits Product Builder is still on HOLD — will be unblocked once errors clear.");
  info(null,                 "SSB.I031", "Legacy adapters (BEMA/IA/BN legacy) remain read-only.");
  info(null,                 "SSB.I032", "Future-dated policies remain scheduled until effective date.");

  // ---- Score ----
  const totalPenalty = findings.reduce((s, f) => s + f.weight, 0);
  const score = Math.max(0, 100 - totalPenalty);
  const errors = findings.filter(f => f.severity === "error").length;
  const warnings = findings.filter(f => f.severity === "warning").length;
  const infos = findings.filter(f => f.severity === "info").length;

  const completedAt = new Date().toISOString();
  const { data: runRow, error: runErr } = await db.from("ssb_configuration_validation_run").insert({
    package_id: packageId ?? null,
    run_status: "completed",
    score,
    errors_count: errors,
    warnings_count: warnings,
    info_count: infos,
    started_at: startedAt,
    completed_at: completedAt,
  }).select().single();
  if (runErr) throw runErr;

  const resultsPayload = findings.map(f => ({
    validation_run_id: runRow.id,
    asset_key: f.asset_key,
    severity: f.severity,
    rule_code: f.rule_code,
    message: f.message,
    recommendation: f.recommendation ?? null,
    blocking: f.blocking ?? false,
  }));
  if (resultsPayload.length > 0) {
    const { error: resErr } = await db.from("ssb_configuration_validation_result").insert(resultsPayload);
    if (resErr) throw resErr;
  }

  const { data: results } = await db.from("ssb_configuration_validation_result").select("*").eq("validation_run_id", runRow.id);
  return { run: runRow as ValidationRun, results: (results ?? []) as ValidationResult[] };
}

export async function getLatestValidationRun(packageId?: string): Promise<ValidationRun | null> {
  let q = db.from("ssb_configuration_validation_run").select("*").order("started_at", { ascending: false }).limit(1);
  if (packageId) q = q.eq("package_id", packageId);
  const { data, error } = await q;
  if (error) throw error;
  return (data && data[0]) ?? null;
}

export async function listValidationResults(runId: string): Promise<ValidationResult[]> {
  const { data, error } = await db.from("ssb_configuration_validation_result").select("*").eq("validation_run_id", runId).order("severity");
  if (error) throw error;
  return data ?? [];
}

// -----------------------------------------------------------------
// Snapshots
// -----------------------------------------------------------------

export async function createConfigurationSnapshot(packageId: string | null, reason: string): Promise<ConfigurationSnapshot> {
  const [assets, deps, pkg, items] = await Promise.all([
    listConfigurationAssets(),
    listAllDependencies(),
    packageId ? getPackageById(packageId) : Promise.resolve(null),
    packageId ? listPackageItems(packageId) : Promise.resolve([]),
  ]);

  const snapshotJson = {
    generated_at: new Date().toISOString(),
    package: pkg,
    package_items: items,
    assets,
    dependencies: deps,
  };
  const key = `snap_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const { data, error } = await db.from("ssb_configuration_snapshot").insert({
    snapshot_key: key,
    package_id: packageId,
    snapshot_json: snapshotJson,
    reason,
  }).select().single();
  if (error) throw error;
  return data as ConfigurationSnapshot;
}

async function getPackageById(id: string): Promise<ConfigurationPackage | null> {
  const { data, error } = await db.from("ssb_configuration_package").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listConfigurationSnapshots(): Promise<ConfigurationSnapshot[]> {
  const { data, error } = await db.from("ssb_configuration_snapshot").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getConfigurationSnapshot(snapshotKey: string): Promise<ConfigurationSnapshot | null> {
  const { data, error } = await db.from("ssb_configuration_snapshot").select("*").eq("snapshot_key", snapshotKey).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// -----------------------------------------------------------------
// Package validation (thin wrapper — reuses runSsbSetupValidation)
// -----------------------------------------------------------------

export async function validateConfigurationPackage(packageId: string) {
  const out = await runSsbSetupValidation(packageId);
  // If no errors, promote draft → validated
  if (out.run.errors_count === 0) {
    await db.from("ssb_configuration_package").update({ status: "validated" }).eq("id", packageId).eq("status", "draft");
  }
  return out;
}

export const ssbConfigurationGovernanceService = {
  listConfigurationAssets, getConfigurationAsset, listDependencies, listConsumers, listAllDependencies,
  createConfigurationPackage, listConfigurationPackages, getConfigurationPackage,
  addPolicyToPackage, listPackageItems,
  validateConfigurationPackage, scheduleConfigurationPackage, activateConfigurationPackage, retireConfigurationPackage,
  runSsbSetupValidation, getLatestValidationRun, listValidationResults,
  createConfigurationSnapshot, listConfigurationSnapshots, getConfigurationSnapshot,
};
