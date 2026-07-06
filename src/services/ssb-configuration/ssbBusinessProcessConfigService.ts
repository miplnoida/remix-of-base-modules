/**
 * SSB Business Process Configuration Service — Epic 5.1
 *
 * Bridges SSB policy configuration into business-process shape. Business
 * modules should consume these resolvers instead of policy tables directly.
 *
 * Does NOT duplicate policy CRUD, shared-domain CRUD, governance packaging,
 * or benefit/product-builder screens. Reuses ssbPolicyLifecycleService for
 * every policy read. Reuses Configuration Governance validation for BN
 * readiness signals.
 *
 * See docs/social-security/SSB_BUSINESS_PROCESS_CONFIGURATION_ACCEPTANCE.md
 */
import {
  resolvePolicy,
  resolveAllPolicies,
  getMemberRegistrationConfig,
  getEmployerRegistrationConfig,
  getBenefitSetupConfig,
} from "@/services/ssb/ssbPolicyLifecycleService";
import { getKnProfile } from "@/services/ssb/ssbImplementationConfigService";
import { getLatestValidationRun } from "@/services/ssb-configuration/ssbConfigurationGovernanceService";

export type BusinessProcessKey =
  | "member_registration"
  | "employer_registration"
  | "contribution_collection"
  | "benefit_administration"
  | "claims_processing"
  | "payments"
  | "compliance_case_management";

export type ProcessStatus = "Ready" | "Partial" | "Missing";

export interface ResolvedPolicyEntry {
  key: string;                 // logical slot: "address", "identity", ...
  label: string;
  section: string;             // /admin/ssb-setup?section=<section>
  required: boolean;
  present: boolean;
  count?: number;
  note?: string;
}

export interface BusinessProcessConfiguration {
  processKey: BusinessProcessKey;
  processName: string;
  status: ProcessStatus;
  asOfDate: string;
  resolvedPolicies: ResolvedPolicyEntry[];
  missingPolicies: ResolvedPolicyEntry[];
  optionalWarnings: ResolvedPolicyEntry[];
  linkedSetupSections: string[];
  consumers: string[];
}

const today = () => new Date().toISOString().slice(0, 10);

function classify(entries: ResolvedPolicyEntry[]): ProcessStatus {
  const requiredEntries = entries.filter((e) => e.required);
  if (requiredEntries.length === 0) return "Ready";
  const missing = requiredEntries.filter((e) => !e.present).length;
  if (missing === 0) return "Ready";
  if (missing === requiredEntries.length) return "Missing";
  return "Partial";
}

function buildResult(
  processKey: BusinessProcessKey,
  processName: string,
  entries: ResolvedPolicyEntry[],
  consumers: string[],
  asOfDate: string,
): BusinessProcessConfiguration {
  const status = classify(entries);
  const linkedSetupSections = Array.from(new Set(entries.map((e) => e.section)));
  return {
    processKey,
    processName,
    status,
    asOfDate,
    resolvedPolicies: entries.filter((e) => e.present),
    missingPolicies: entries.filter((e) => e.required && !e.present),
    optionalWarnings: entries.filter((e) => !e.required && !e.present),
    linkedSetupSections,
    consumers,
  };
}

// ------------------------------------------------------------------
// Member Registration
// ------------------------------------------------------------------
export async function getMemberRegistrationConfiguration(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const cfg = await getMemberRegistrationConfig(asOfDate);
  const pid = (await getKnProfile())?.id ?? null;
  const [workflow, comms] = pid
    ? await Promise.all([
        resolveAllPolicies("ssb_workflow_policy", pid, asOfDate).then((r: any[]) =>
          r.filter((x) => x.applies_to === "MEMBER"),
        ),
        resolveAllPolicies("ssb_communication_policy", pid, asOfDate),
      ])
    : [[], []];

  const entries: ResolvedPolicyEntry[] = [
    { key: "address",       label: "Address Policy",              section: "address",       required: true,  present: !!cfg.address },
    { key: "identity",      label: "Identity / NIS Policy",       section: "identity",      required: true,  present: cfg.identityRules.length > 0, count: cfg.identityRules.length },
    { key: "numbering",     label: "Member Numbering Policy",     section: "numbering",     required: true,  present: !!cfg.numbering },
    { key: "documents",     label: "Document Policy",             section: "documents",     required: true,  present: cfg.documents.length > 0, count: cfg.documents.length },
    { key: "workflow",      label: "Workflow / SLA Policy",       section: "workflow",      required: true,  present: workflow.length > 0, count: workflow.length },
    { key: "communication", label: "Communication Policy",        section: "communication", required: false, present: comms.length > 0, count: comms.length },
  ];
  return buildResult("member_registration", "Member Registration", entries,
    ["Member Registration", "Contributor 360", "Portal – Member"], asOfDate);
}

// ------------------------------------------------------------------
// Employer Registration
// ------------------------------------------------------------------
export async function getEmployerRegistrationConfiguration(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const cfg = await getEmployerRegistrationConfig(asOfDate);
  const pid = (await getKnProfile())?.id ?? null;
  const [workflow, comms] = pid
    ? await Promise.all([
        resolveAllPolicies("ssb_workflow_policy", pid, asOfDate).then((r: any[]) =>
          r.filter((x) => x.applies_to === "EMPLOYER"),
        ),
        resolveAllPolicies("ssb_communication_policy", pid, asOfDate),
      ])
    : [[], []];

  const entries: ResolvedPolicyEntry[] = [
    { key: "address",       label: "Address Policy",              section: "address",       required: true,  present: !!cfg.address },
    { key: "numbering",     label: "Employer Numbering Policy",   section: "numbering",     required: true,  present: !!cfg.numbering },
    { key: "documents",     label: "Document Policy",             section: "documents",     required: true,  present: cfg.documents.length > 0, count: cfg.documents.length },
    { key: "legal",         label: "Employer Legal References",   section: "legal",         required: true,  present: cfg.legal.length > 0, count: cfg.legal.length },
    { key: "workflow",      label: "Workflow / SLA Policy",       section: "workflow",      required: true,  present: workflow.length > 0, count: workflow.length },
    { key: "communication", label: "Communication Policy",        section: "communication", required: false, present: comms.length > 0, count: comms.length },
  ];
  return buildResult("employer_registration", "Employer Registration", entries,
    ["Employer Registration", "Employer 360", "Portal – Employer"], asOfDate);
}

// ------------------------------------------------------------------
// Contribution Collection
// ------------------------------------------------------------------
export async function getContributionCollectionConfiguration(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const pid = (await getKnProfile())?.id ?? null;
  if (!pid) return buildResult("contribution_collection", "Contribution Collection", [], [], asOfDate);

  const [calendar, numbering, financial, workflow, documents, comms] = await Promise.all([
    resolvePolicy("ssb_contribution_calendar_policy", { profile_id: pid }, asOfDate),
    resolvePolicy("ssb_numbering_policy", { profile_id: pid, entity_code: "CONTRIBUTION" }, asOfDate),
    resolveAllPolicies("ssb_financial_policy", pid, asOfDate),
    resolveAllPolicies("ssb_workflow_policy", pid, asOfDate).then((r: any[]) =>
      r.filter((x) => x.applies_to === "CONTRIBUTION"),
    ),
    resolveAllPolicies("ssb_document_policy", pid, asOfDate),
    resolveAllPolicies("ssb_communication_policy", pid, asOfDate),
  ]);

  const entries: ResolvedPolicyEntry[] = [
    { key: "contribution_calendar", label: "Contribution Calendar", section: "contribution", required: true,  present: !!calendar },
    { key: "financial",             label: "Financial / Payment Policy", section: "financial",  required: true,  present: financial.length > 0, count: financial.length },
    { key: "numbering",             label: "Contribution Numbering", section: "numbering",   required: false, present: !!numbering, note: "Uses default numbering when absent" },
    { key: "workflow",              label: "Workflow / SLA Policy",  section: "workflow",    required: false, present: workflow.length > 0, count: workflow.length },
    { key: "documents",             label: "Document Policy",        section: "documents",   required: false, present: documents.length > 0, count: documents.length },
    { key: "communication",         label: "Communication Policy",   section: "communication", required: false, present: comms.length > 0, count: comms.length },
  ];
  return buildResult("contribution_collection", "Contribution Collection", entries,
    ["C3 Filing", "Contributions Ledger", "Cashier / Receipts", "Employer Portal"], asOfDate);
}

// ------------------------------------------------------------------
// Benefit Administration
// ------------------------------------------------------------------
export async function getBenefitAdministrationConfiguration(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const cfg = await getBenefitSetupConfig(asOfDate);
  const pid = (await getKnProfile())?.id ?? null;
  const numbering = pid
    ? await resolvePolicy("ssb_numbering_policy", { profile_id: pid, entity_code: "BENEFIT" }, asOfDate)
    : null;

  const entries: ResolvedPolicyEntry[] = [
    { key: "financial",             label: "Financial / Payment Policy", section: "financial",     required: true,  present: cfg.financial.length > 0, count: cfg.financial.length },
    { key: "legal",                 label: "Legal Policy",               section: "legal",         required: true,  present: cfg.legal.length > 0, count: cfg.legal.length },
    { key: "documents",             label: "Document Policy",            section: "documents",     required: true,  present: cfg.documents.length > 0, count: cfg.documents.length },
    { key: "workflow",              label: "Workflow / SLA Policy",      section: "workflow",      required: true,  present: cfg.workflow.length > 0, count: cfg.workflow.length },
    { key: "communication",         label: "Communication Policy",       section: "communication", required: true,  present: cfg.communication.length > 0, count: cfg.communication.length },
    { key: "contribution_calendar", label: "Contribution Calendar",      section: "contribution",  required: true,  present: !!cfg.contributionCalendar },
    { key: "numbering",             label: "Benefit Numbering",          section: "numbering",     required: false, present: !!numbering },
  ];
  return buildResult("benefit_administration", "Benefit Administration", entries,
    ["BN Product Builder", "BN Awards", "BN Payments"], asOfDate);
}

// ------------------------------------------------------------------
// Claims Processing
// ------------------------------------------------------------------
export async function getClaimsProcessingConfiguration(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const pid = (await getKnProfile())?.id ?? null;
  if (!pid) return buildResult("claims_processing", "Claims Processing", [], [], asOfDate);

  const [numbering, workflow, documents, comms, legal, identity] = await Promise.all([
    resolvePolicy("ssb_numbering_policy", { profile_id: pid, entity_code: "CLAIM" }, asOfDate),
    resolveAllPolicies("ssb_workflow_policy", pid, asOfDate).then((r: any[]) =>
      r.filter((x) => x.applies_to === "CLAIM"),
    ),
    resolveAllPolicies("ssb_document_policy", pid, asOfDate),
    resolveAllPolicies("ssb_communication_policy", pid, asOfDate),
    resolveAllPolicies("ssb_legal_policy", pid, asOfDate),
    resolveAllPolicies("ssb_identity_policy", pid, asOfDate),
  ]);

  const entries: ResolvedPolicyEntry[] = [
    { key: "numbering",     label: "Claim Numbering",       section: "numbering",     required: true,  present: !!numbering },
    { key: "workflow",      label: "Workflow / SLA Policy", section: "workflow",      required: true,  present: workflow.length > 0, count: workflow.length },
    { key: "documents",     label: "Document Policy",       section: "documents",     required: true,  present: documents.length > 0, count: documents.length },
    { key: "identity",      label: "Identity Rules",        section: "identity",      required: true,  present: identity.length > 0, count: identity.length },
    { key: "legal",         label: "Legal Policy",          section: "legal",         required: false, present: legal.length > 0, count: legal.length },
    { key: "communication", label: "Communication Policy",  section: "communication", required: false, present: comms.length > 0, count: comms.length },
  ];
  return buildResult("claims_processing", "Claims Processing", entries,
    ["Claims Intake", "Claims Adjudication", "Portal – Claimant"], asOfDate);
}

// ------------------------------------------------------------------
// Payments
// ------------------------------------------------------------------
export async function getPaymentsConfiguration(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const pid = (await getKnProfile())?.id ?? null;
  if (!pid) return buildResult("payments", "Payments", [], [], asOfDate);

  const [financial, numbering, workflow, comms] = await Promise.all([
    resolveAllPolicies("ssb_financial_policy", pid, asOfDate),
    resolvePolicy("ssb_numbering_policy", { profile_id: pid, entity_code: "PAYMENT" }, asOfDate),
    resolveAllPolicies("ssb_workflow_policy", pid, asOfDate).then((r: any[]) =>
      r.filter((x) => x.applies_to === "PAYMENT" || x.applies_to === "BENEFIT"),
    ),
    resolveAllPolicies("ssb_communication_policy", pid, asOfDate),
  ]);

  const entries: ResolvedPolicyEntry[] = [
    { key: "financial",     label: "Financial / Payment Policy", section: "financial",     required: true,  present: financial.length > 0, count: financial.length },
    { key: "workflow",      label: "Workflow / SLA Policy",      section: "workflow",      required: true,  present: workflow.length > 0, count: workflow.length },
    { key: "numbering",     label: "Payment Numbering",          section: "numbering",     required: false, present: !!numbering },
    { key: "communication", label: "Communication Policy",       section: "communication", required: false, present: comms.length > 0, count: comms.length },
  ];
  return buildResult("payments", "Payments", entries,
    ["BN Payments", "Contributions Payments", "Cashier"], asOfDate);
}

// ------------------------------------------------------------------
// Compliance Case Management
// ------------------------------------------------------------------
export async function getComplianceCaseConfiguration(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const pid = (await getKnProfile())?.id ?? null;
  if (!pid) return buildResult("compliance_case_management", "Compliance Case Management", [], [], asOfDate);

  const [numbering, workflow, documents, legal, comms] = await Promise.all([
    resolvePolicy("ssb_numbering_policy", { profile_id: pid, entity_code: "CASE" }, asOfDate),
    resolveAllPolicies("ssb_workflow_policy", pid, asOfDate).then((r: any[]) =>
      r.filter((x) => x.applies_to === "CASE" || x.applies_to === "COMPLIANCE"),
    ),
    resolveAllPolicies("ssb_document_policy", pid, asOfDate),
    resolveAllPolicies("ssb_legal_policy", pid, asOfDate),
    resolveAllPolicies("ssb_communication_policy", pid, asOfDate),
  ]);

  const entries: ResolvedPolicyEntry[] = [
    { key: "workflow",      label: "Workflow / SLA Policy", section: "workflow",      required: true,  present: workflow.length > 0, count: workflow.length },
    { key: "legal",         label: "Legal Policy",          section: "legal",         required: true,  present: legal.length > 0, count: legal.length },
    { key: "documents",     label: "Document Policy",       section: "documents",     required: true,  present: documents.length > 0, count: documents.length },
    { key: "numbering",     label: "Case Numbering",        section: "numbering",     required: false, present: !!numbering },
    { key: "communication", label: "Communication Policy",  section: "communication", required: false, present: comms.length > 0, count: comms.length },
  ];
  return buildResult("compliance_case_management", "Compliance Case Management", entries,
    ["Compliance Cases", "Legal Referrals", "Recovery"], asOfDate);
}

// ------------------------------------------------------------------
// Aggregate
// ------------------------------------------------------------------
const RESOLVERS: Record<BusinessProcessKey, (asOf?: string) => Promise<BusinessProcessConfiguration>> = {
  member_registration:         getMemberRegistrationConfiguration,
  employer_registration:       getEmployerRegistrationConfiguration,
  contribution_collection:     getContributionCollectionConfiguration,
  benefit_administration:      getBenefitAdministrationConfiguration,
  claims_processing:           getClaimsProcessingConfiguration,
  payments:                    getPaymentsConfiguration,
  compliance_case_management:  getComplianceCaseConfiguration,
};

export const BUSINESS_PROCESS_ORDER: BusinessProcessKey[] = [
  "member_registration",
  "employer_registration",
  "contribution_collection",
  "benefit_administration",
  "claims_processing",
  "payments",
  "compliance_case_management",
];

export async function listBusinessProcesses(
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration[]> {
  return Promise.all(BUSINESS_PROCESS_ORDER.map((k) => RESOLVERS[k](asOfDate)));
}

export async function getBusinessProcessReadiness(
  processKey: BusinessProcessKey,
  asOfDate: string = today(),
): Promise<BusinessProcessConfiguration> {
  const resolver = RESOLVERS[processKey];
  if (!resolver) throw new Error(`Unknown business process: ${processKey}`);
  return resolver(asOfDate);
}

// ------------------------------------------------------------------
// Benefits readiness — combines process readiness + governance validation
// ------------------------------------------------------------------
export interface BenefitsReadiness {
  ready: boolean;
  reasons: string[];
  processStatus: ProcessStatus;
  governanceErrors: number;
  hasActivePackage: boolean;
}

export async function evaluateBenefitsReadiness(
  asOfDate: string = today(),
): Promise<BenefitsReadiness> {
  const [benefit, run] = await Promise.all([
    getBenefitAdministrationConfiguration(asOfDate),
    getLatestValidationRun().catch(() => null),
  ]);
  const reasons: string[] = [];
  if (benefit.status !== "Ready") reasons.push(`Benefit Administration process is ${benefit.status}.`);
  const errors = run?.errors_count ?? -1;
  if (errors < 0) reasons.push("No governance validation has been run.");
  else if (errors > 0) reasons.push(`Governance validation has ${errors} blocking error(s).`);
  const ready = benefit.status === "Ready" && errors === 0;
  return {
    ready,
    reasons,
    processStatus: benefit.status,
    governanceErrors: errors,
    hasActivePackage: false, // package check is informational; done in UI
  };
}

export const ssbBusinessProcessConfigService = {
  getMemberRegistrationConfiguration,
  getEmployerRegistrationConfiguration,
  getContributionCollectionConfiguration,
  getBenefitAdministrationConfiguration,
  getClaimsProcessingConfiguration,
  getPaymentsConfiguration,
  getComplianceCaseConfiguration,
  listBusinessProcesses,
  getBusinessProcessReadiness,
  evaluateBenefitsReadiness,
  BUSINESS_PROCESS_ORDER,
};
