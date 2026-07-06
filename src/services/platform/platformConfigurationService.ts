/**
 * Platform Configuration Service — Public Platform Contract (Epic P1).
 *
 * This is the ONLY public entry point that business modules (Benefits,
 * Claims, Contributions, Employer, Member, Compliance, Payments, etc.)
 * are permitted to use for reading platform configuration.
 *
 * IMPORTANT: This is a façade. It does NOT re-implement resolution logic.
 * Internally it delegates to the existing Business Process Resolver
 * (`ssbBusinessProcessConfigService`), which in turn delegates to:
 *   - Policy Lifecycle Service       (policy reads)
 *   - Configuration Asset Framework  (asset descriptors)
 *   - Configuration Governance       (validation runs)
 *   - Platform Readiness             (aggregate readiness)
 *   - Enterprise Consumption Registry (ownership/consumers)
 *
 * Business modules MUST NOT:
 *   - Read `ssb_*_policy` tables
 *   - Read shared-domain tables (`ssp_*`, `core_*`)
 *   - Read lifecycle, governance, readiness, or asset tables
 *   - Reach into `ssbPolicyLifecycleService`, `ssbPolicyRegistry`,
 *     `ssbConfigurationGovernanceService`, `enterpriseConfigurationAssetService`,
 *     or `enterpriseConsumptionRegistryService` directly
 *
 * See docs/enterprise/PLATFORM_PUBLIC_CONTRACT.md.
 */
import {
  listBusinessProcesses,
  getBusinessProcessReadiness,
  BUSINESS_PROCESS_ORDER,
  type BusinessProcessKey,
  type BusinessProcessConfiguration,
  type ResolvedPolicyEntry,
  type ProcessStatus,
} from "@/services/ssb-configuration/ssbBusinessProcessConfigService";

// ------------------------------------------------------------------
// Public process codes (stable contract for business modules)
// ------------------------------------------------------------------
export type PlatformProcessCode = BusinessProcessKey;

export const PLATFORM_PROCESS_CODES: PlatformProcessCode[] = BUSINESS_PROCESS_ORDER;

// Business module → primary business processes it depends on.
// Modules should call resolveModuleConfiguration(moduleCode) to fetch
// their full configuration bundle.
export type PlatformModuleCode =
  | "benefits"
  | "claims"
  | "contributions"
  | "employer"
  | "member"
  | "payments"
  | "compliance";

const MODULE_PROCESS_MAP: Record<PlatformModuleCode, PlatformProcessCode[]> = {
  benefits:      ["benefit_administration", "payments"],
  claims:        ["claims_processing", "payments"],
  contributions: ["contribution_collection", "payments"],
  employer:      ["employer_registration"],
  member:        ["member_registration"],
  payments:      ["payments"],
  compliance:    ["compliance_case_management"],
};

// ------------------------------------------------------------------
// Typed contracts — each wraps the underlying resolver output.
// These are the stable shapes business modules should code against.
// ------------------------------------------------------------------
export interface ResolvedPolicySlot extends ResolvedPolicyEntry {}

export interface ResolvedProcessConfiguration {
  processCode: PlatformProcessCode;
  processName: string;
  status: ProcessStatus;
  asOfDate: string;
  resolved: ResolvedPolicySlot[];
  missing: ResolvedPolicySlot[];
  warnings: ResolvedPolicySlot[];
  consumers: string[];
  linkedSetupSections: string[];
}

export interface ResolvedSlotSummary {
  present: boolean;
  count?: number;
  note?: string;
}

// Named slot views (typed wrappers over resolver output). Each is a thin
// projection — resolvers remain the source of truth.
export interface ResolvedIdentityConfiguration      extends ResolvedSlotSummary {}
export interface ResolvedWorkflowConfiguration      extends ResolvedSlotSummary {}
export interface ResolvedFinancialConfiguration     extends ResolvedSlotSummary {}
export interface ResolvedDocumentConfiguration      extends ResolvedSlotSummary {}
export interface ResolvedCommunicationConfiguration extends ResolvedSlotSummary {}
export interface ResolvedCalendarConfiguration      extends ResolvedSlotSummary {}
export interface ResolvedNumberingConfiguration     extends ResolvedSlotSummary {}
export interface ResolvedValidationConfiguration {
  status: ProcessStatus;
  missingRequired: string[];
  optionalWarnings: string[];
}

export interface ResolvedModuleConfiguration {
  moduleCode: PlatformModuleCode;
  asOfDate: string;
  processes: ResolvedProcessConfiguration[];
  overallStatus: ProcessStatus;
}

export interface ProcessConfigurationSummary {
  processCode: PlatformProcessCode;
  processName: string;
  status: ProcessStatus;
  totalSlots: number;
  presentSlots: number;
  missingRequired: number;
  optionalMissing: number;
  consumers: string[];
}

// ------------------------------------------------------------------
// Internal adapter
// ------------------------------------------------------------------
function toPublic(cfg: BusinessProcessConfiguration): ResolvedProcessConfiguration {
  return {
    processCode: cfg.processKey,
    processName: cfg.processName,
    status: cfg.status,
    asOfDate: cfg.asOfDate,
    resolved: cfg.resolvedPolicies,
    missing: cfg.missingPolicies,
    warnings: cfg.optionalWarnings,
    consumers: cfg.consumers,
    linkedSetupSections: cfg.linkedSetupSections,
  };
}

function worstStatus(statuses: ProcessStatus[]): ProcessStatus {
  if (statuses.includes("Missing")) return "Missing";
  if (statuses.includes("Partial")) return "Partial";
  return "Ready";
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------
export async function resolveProcessConfiguration(
  processCode: PlatformProcessCode,
): Promise<ResolvedProcessConfiguration> {
  return toPublic(await getBusinessProcessReadiness(processCode));
}

export async function resolveProcessConfigurationAtDate(
  processCode: PlatformProcessCode,
  effectiveDate: string,
): Promise<ResolvedProcessConfiguration> {
  return toPublic(await getBusinessProcessReadiness(processCode, effectiveDate));
}

export async function resolveModuleConfiguration(
  moduleCode: PlatformModuleCode,
  effectiveDate?: string,
): Promise<ResolvedModuleConfiguration> {
  const processCodes = MODULE_PROCESS_MAP[moduleCode];
  if (!processCodes) throw new Error(`Unknown platform module: ${moduleCode}`);
  const processes = await Promise.all(
    processCodes.map((code) =>
      effectiveDate
        ? resolveProcessConfigurationAtDate(code, effectiveDate)
        : resolveProcessConfiguration(code),
    ),
  );
  return {
    moduleCode,
    asOfDate: effectiveDate ?? new Date().toISOString().slice(0, 10),
    processes,
    overallStatus: worstStatus(processes.map((p) => p.status)),
  };
}

export async function validateProcessConfiguration(
  processCode: PlatformProcessCode,
  effectiveDate?: string,
): Promise<ResolvedValidationConfiguration> {
  const cfg = effectiveDate
    ? await resolveProcessConfigurationAtDate(processCode, effectiveDate)
    : await resolveProcessConfiguration(processCode);
  return {
    status: cfg.status,
    missingRequired: cfg.missing.map((m) => m.label),
    optionalWarnings: cfg.warnings.map((w) => w.label),
  };
}

export async function getConfigurationSummary(
  processCode: PlatformProcessCode,
  effectiveDate?: string,
): Promise<ProcessConfigurationSummary> {
  const cfg = effectiveDate
    ? await resolveProcessConfigurationAtDate(processCode, effectiveDate)
    : await resolveProcessConfiguration(processCode);
  const totalSlots = cfg.resolved.length + cfg.missing.length + cfg.warnings.length;
  return {
    processCode: cfg.processCode,
    processName: cfg.processName,
    status: cfg.status,
    totalSlots,
    presentSlots: cfg.resolved.length,
    missingRequired: cfg.missing.length,
    optionalMissing: cfg.warnings.length,
    consumers: cfg.consumers,
  };
}

export async function listAllProcessSummaries(
  effectiveDate?: string,
): Promise<ProcessConfigurationSummary[]> {
  const all = await listBusinessProcesses(effectiveDate);
  return all.map((cfg) => ({
    processCode: cfg.processKey,
    processName: cfg.processName,
    status: cfg.status,
    totalSlots: cfg.resolvedPolicies.length + cfg.missingPolicies.length + cfg.optionalWarnings.length,
    presentSlots: cfg.resolvedPolicies.length,
    missingRequired: cfg.missingPolicies.length,
    optionalMissing: cfg.optionalWarnings.length,
    consumers: cfg.consumers,
  }));
}

export const PLATFORM_PUBLIC_CONTRACT_VERSION = "1.0.0";

export const platformConfigurationService = {
  resolveProcessConfiguration,
  resolveProcessConfigurationAtDate,
  resolveModuleConfiguration,
  validateProcessConfiguration,
  getConfigurationSummary,
  listAllProcessSummaries,
  PLATFORM_PROCESS_CODES,
  PLATFORM_PUBLIC_CONTRACT_VERSION,
};
