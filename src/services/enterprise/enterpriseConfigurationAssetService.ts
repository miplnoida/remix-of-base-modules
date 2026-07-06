/**
 * Enterprise Configuration Asset Framework — Service Interface
 *
 * Thin aggregator that exposes a uniform read-model for every
 * Configuration Asset. Delegates to existing services — never
 * re-implements validation, lifecycle, dependencies or readiness.
 *
 * See docs/enterprise/ENTERPRISE_CONFIGURATION_ASSET_FRAMEWORK.md
 */
import {
  getConfigurationAsset,
  listDependencies as listGovDependencies,
  listConsumers as listGovConsumers,
  getLatestValidationRun,
  listValidationResults,
  runSsbSetupValidation,
  type ConfigurationAsset,
  type ValidationResult,
} from "@/services/ssb-configuration/ssbConfigurationGovernanceService";
import {
  listConsumers as listRegConsumers,
  listDependencies as listRegDependencies,
  type RegistryEdge,
} from "@/services/enterprise/enterpriseConsumptionRegistryService";

export interface ConfigurationAssetDescriptor {
  assetKey: string;
  assetName: string;
  assetType: "POLICY" | "TEMPLATE" | "MASTER" | "WORKFLOW" | "NUMBERING" | "OTHER";
  ownerDomain: string;
  canonicalRoute: string;
  canonicalTable?: string | null;
  registryEntityKey?: string | null;
  description?: string;
}

export interface AssetValidationReport {
  runId: string | null;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
  score: number | null;
  blocking: boolean;
}

export interface AssetEdge {
  key: string;
  relationship: string;
  otherKey: string;
  source: "governance" | "registry";
  notes?: string | null;
}

export interface AssetReadinessSummary {
  status: "ready" | "warning" | "blocked" | "unknown";
  processCount: number;
  consumerCount: number;
  blockingFindings: number;
  warningFindings: number;
}

export async function loadAssetMetadata(assetKey: string): Promise<ConfigurationAsset | null> {
  return getConfigurationAsset(assetKey);
}

export async function loadAssetValidation(assetKey: string): Promise<AssetValidationReport> {
  const run = await getLatestValidationRun().catch(() => null);
  const runId = run?.id ?? null;
  const all = runId ? await listValidationResults(runId).catch(() => []) : [];
  const scoped = all.filter((r) => r.asset_key === assetKey);
  const errors = scoped.filter((r) => r.severity === "error");
  const warnings = scoped.filter((r) => r.severity === "warning");
  const info = scoped.filter((r) => r.severity === "info");
  return {
    runId,
    errors,
    warnings,
    info,
    score: run?.score ?? null,
    blocking: errors.some((r) => r.blocking),
  };
}

export async function refreshAssetValidation(): Promise<void> {
  await runSsbSetupValidation();
}

export async function loadAssetDependencies(assetKey: string, registryEntityKey?: string | null): Promise<AssetEdge[]> {
  const [gov, reg] = await Promise.all([
    listGovDependencies(assetKey).catch(() => []),
    registryEntityKey ? listRegDependencies(registryEntityKey).catch(() => []) : Promise.resolve<RegistryEdge[]>([]),
  ]);
  return [
    ...gov.map((e) => ({ key: `gov:${e.id}`, relationship: e.edge_kind, otherKey: e.target_asset_key, source: "governance" as const, notes: e.notes })),
    ...reg.map((e) => ({ key: `reg:${e.id}`, relationship: e.relationship_type, otherKey: e.target_entity_key, source: "registry" as const, notes: e.notes })),
  ];
}

export async function loadAssetConsumers(assetKey: string, registryEntityKey?: string | null): Promise<AssetEdge[]> {
  const [gov, reg] = await Promise.all([
    listGovConsumers(assetKey).catch(() => []),
    registryEntityKey ? listRegConsumers(registryEntityKey).catch(() => []) : Promise.resolve<RegistryEdge[]>([]),
  ]);
  return [
    ...gov.map((e) => ({ key: `gov:${e.id}`, relationship: e.edge_kind, otherKey: e.source_asset_key, source: "governance" as const, notes: e.notes })),
    ...reg.map((e) => ({ key: `reg:${e.id}`, relationship: e.relationship_type, otherKey: e.source_entity_key, source: "registry" as const, notes: e.notes })),
  ];
}

export async function loadAssetReadiness(assetKey: string, registryEntityKey?: string | null): Promise<AssetReadinessSummary> {
  const [validation, consumers] = await Promise.all([
    loadAssetValidation(assetKey),
    loadAssetConsumers(assetKey, registryEntityKey),
  ]);
  const blockingFindings = validation.errors.filter((r) => r.blocking).length;
  const warningFindings = validation.warnings.length;
  const status: AssetReadinessSummary["status"] =
    blockingFindings > 0 ? "blocked" : warningFindings > 0 ? "warning" : "ready";
  return {
    status,
    processCount: 0,
    consumerCount: consumers.length,
    blockingFindings,
    warningFindings,
  };
}
