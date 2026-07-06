/**
 * Platform Readiness Service
 *
 * Aggregates existing governance/process/policy signals plus live
 * orphan-reference detection into a single BN Wave 1 readiness view.
 *
 * NON-DUPLICATION:
 *   - Does not re-implement validation rules; consumes runSsbSetupValidation.
 *   - Does not re-implement process resolvers; consumes ssbBusinessProcessConfigService.
 *   - Does not create new CRUD; findings deep-link to canonical screens.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  runSsbSetupValidation,
  getLatestValidationRun,
  listValidationResults,
  listConfigurationPackages,
  type ValidationRun,
  type ValidationResult,
} from "@/services/ssb-configuration/ssbConfigurationGovernanceService";
import {
  listBusinessProcesses,
  evaluateBenefitsReadiness,
  type BusinessProcessConfiguration,
  type BenefitsReadiness,
} from "@/services/ssb-configuration/ssbBusinessProcessConfigService";
import { evaluateAllAssetHealth } from "@/services/ssb/ssbPolicyHealthService";
import { getKnProfile } from "@/services/ssb/ssbImplementationConfigService";
import { enterpriseConsumptionRegistryService } from "@/services/enterprise/enterpriseConsumptionRegistryService";

const db: any = supabase;

export type ReadinessSeverity = "blocking" | "warning" | "info";
export type ReadinessStatus = "ready" | "warning" | "blocked" | "unknown";

export type ReadinessCategoryKey =
  | "active_package"
  | "governance_validation"
  | "business_processes"
  | "policy_health"
  | "source_control_refs"
  | "workflow_refs"
  | "numbering_refs"
  | "financial_refs"
  | "communication_refs"
  | "bn_product_builder";

export interface ReadinessFinding {
  finding_id: string;
  category: ReadinessCategoryKey;
  severity: ReadinessSeverity;
  title: string;
  description: string;
  source_asset: string | null;
  affected_policy: string | null;
  affected_process: string | null;
  orphan_value: string | null;
  expected_source: string | null;
  recommended_action: string;
  fix_route: string;
  fix_anchor_or_section: string | null;
  auto_fix_available: boolean;
  bn_wave1_blocking: boolean;
}

export interface ReadinessCategory {
  key: ReadinessCategoryKey;
  label: string;
  status: ReadinessStatus;
  blockingCount: number;
  warningCount: number;
  fixRoute: string;
  summary: string;
}

export interface ModuleReadiness {
  moduleKey: string;
  label: string;
  status: ReadinessStatus;
  reasons: string[];
}

export interface PlatformReadinessSummary {
  overallStatus: ReadinessStatus;
  bnWave1Status: "READY" | "READY WITH WARNINGS" | "BLOCKED";
  activePackageKey: string | null;
  activePackageName: string | null;
  latestValidationScore: number | null;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  categories: ReadinessCategory[];
  findings: ReadinessFinding[];
  modules: ModuleReadiness[];
  generatedAt: string;
}

// ------------------------------------------------------------------
// Live orphan detection (data-level P0 clusters)
// ------------------------------------------------------------------

async function detectWorkflowOrphans(profileId: string): Promise<ReadinessFinding[]> {
  const findings: ReadinessFinding[] = [];
  const { data: rows } = await db
    .from("ssb_workflow_policy")
    .select("id, workflow_code, applies_to")
    .eq("profile_id", profileId)
    .eq("status", "ACTIVE").eq("is_current", true);
  const codes = Array.from(new Set((rows ?? []).map((r: any) => r.workflow_code).filter(Boolean)));
  const known = new Set<string>();
  if (codes.length) {
    const { data: defs } = await db.from("workflow_definitions").select("id").in("id", codes);
    (defs ?? []).forEach((d: any) => known.add(d.id));
  }
  for (const row of rows ?? []) {
    const code = row.workflow_code;
    if (!code || !known.has(code)) {
      findings.push({
        finding_id: `wf-orphan-${row.id}`,
        category: "workflow_refs",
        severity: "blocking",
        title: `Workflow orphan: ${row.applies_to}`,
        description: `Workflow policy for '${row.applies_to}' references '${code || "(empty)"}' which does not exist in workflow_definitions.`,
        source_asset: "ssb.workflow",
        affected_policy: `ssb_workflow_policy.${row.id}`,
        affected_process: row.applies_to,
        orphan_value: code || null,
        expected_source: "workflow_definitions.id (Workflow Engine)",
        recommended_action: "Open the workflow policy and reselect a published workflow from /admin/workflows.",
        fix_route: "/admin/ssb-setup?section=workflow",
        fix_anchor_or_section: "workflow",
        auto_fix_available: false,
        bn_wave1_blocking: true,
      });
    }
  }
  return findings;
}

async function detectNumberingOrphans(profileId: string): Promise<ReadinessFinding[]> {
  const findings: ReadinessFinding[] = [];
  const { data: rows } = await db
    .from("ssb_numbering_policy")
    .select("id, entity_code, sequence_code")
    .eq("profile_id", profileId)
    .eq("status", "ACTIVE").eq("is_current", true);
  const codes = Array.from(new Set((rows ?? []).map((r: any) => r.sequence_code).filter(Boolean)));
  const known = new Set<string>();
  if (codes.length) {
    const { data: seq } = await db.from("core_number_sequence").select("module_code").in("module_code", codes);
    (seq ?? []).forEach((d: any) => known.add(d.module_code));
  }
  for (const row of rows ?? []) {
    if (!row.sequence_code || !known.has(row.sequence_code)) {
      findings.push({
        finding_id: `num-orphan-${row.id}`,
        category: "numbering_refs",
        severity: "blocking",
        title: `Numbering orphan: ${row.entity_code}`,
        description: `Numbering policy for '${row.entity_code}' references sequence '${row.sequence_code || "(empty)"}' not in core_number_sequence.`,
        source_asset: "ssb.numbering",
        affected_policy: `ssb_numbering_policy.${row.id}`,
        affected_process: row.entity_code,
        orphan_value: row.sequence_code || null,
        expected_source: "core_number_sequence.module_code (Platform Numbering)",
        recommended_action: "Bind to an existing sequence from /admin/numbering, or create one there first.",
        fix_route: "/admin/ssb-setup?section=numbering",
        fix_anchor_or_section: "numbering",
        auto_fix_available: false,
        bn_wave1_blocking: true,
      });
    }
  }
  return findings;
}

async function detectFinancialOrphans(profileId: string): Promise<ReadinessFinding[]> {
  const findings: ReadinessFinding[] = [];
  const { data: rows } = await db
    .from("ssb_financial_policy")
    .select("id, binding_kind, reference_code")
    .eq("profile_id", profileId)
    .eq("status", "ACTIVE").eq("is_current", true);
  const channels = (rows ?? []).filter((r: any) => r.binding_kind === "PAYMENT_CHANNEL");
  const settlements = (rows ?? []).filter((r: any) => r.binding_kind === "SETTLEMENT_METHOD" || r.binding_kind === "SETTLEMENT");
  const banks = (rows ?? []).filter((r: any) => r.binding_kind === "BANK_LIST");

  if (channels.length) {
    const codes = Array.from(new Set(channels.map((r: any) => r.reference_code).filter(Boolean)));
    const known = new Set<string>();
    if (codes.length) {
      const { data } = await db.from("ssp_payment_channel").select("channel_code").in("channel_code", codes);
      (data ?? []).forEach((d: any) => known.add(d.channel_code));
    }
    for (const row of channels as any[]) {
      if (!row.reference_code || !known.has(row.reference_code)) {
        findings.push({
          finding_id: `fin-channel-${row.id}`,
          category: "financial_refs",
          severity: "blocking",
          title: `Payment channel orphan: ${row.reference_code || "(empty)"}`,
          description: `Payment channel '${row.reference_code || "(empty)"}' is not in ssp_payment_channel.`,
          source_asset: "ssb.financial",
          affected_policy: `ssb_financial_policy.${row.id}`,
          affected_process: "PAYMENT_CHANNEL",
          orphan_value: row.reference_code || null,
          expected_source: "ssp_payment_channel.channel_code (Financial Reference · Payment Channel)",
          recommended_action: "Reselect a canonical payment channel or add it in Financial Reference · Payment Channel first.",
          fix_route: "/admin/ssb-setup?section=financial",
          fix_anchor_or_section: "financial",
          auto_fix_available: false,
          bn_wave1_blocking: true,
        });
      }
    }
  }

  if (settlements.length) {
    const codes = Array.from(new Set(settlements.map((r: any) => r.reference_code).filter(Boolean)));
    const known = new Set<string>();
    if (codes.length) {
      const { data } = await db.from("ssp_settlement_method").select("method_code").in("method_code", codes);
      (data ?? []).forEach((d: any) => known.add(d.method_code));
    }
    for (const row of settlements as any[]) {
      if (!row.reference_code || !known.has(row.reference_code)) {
        findings.push({
          finding_id: `fin-settlement-${row.id}`,
          category: "financial_refs",
          severity: "blocking",
          title: `Settlement method orphan: ${row.reference_code || "(empty)"}`,
          description: `Settlement method '${row.reference_code || "(empty)"}' is not in ssp_settlement_method.`,
          source_asset: "ssb.financial",
          affected_policy: `ssb_financial_policy.${row.id}`,
          affected_process: "SETTLEMENT",
          orphan_value: row.reference_code || null,
          expected_source: "ssp_settlement_method.method_code (Financial Reference · Settlement Method)",
          recommended_action: "Reselect a canonical settlement method or add it in Financial Reference · Settlement Method first.",
          fix_route: "/admin/ssb-setup?section=financial",
          fix_anchor_or_section: "financial",
          auto_fix_available: false,
          bn_wave1_blocking: true,
        });
      }
    }
  }

  if (banks.length) {
    const codes = Array.from(new Set(banks.map((r: any) => r.reference_code).filter(Boolean)));
    const known = new Set<string>();
    if (codes.length) {
      const { data } = await db.from("ssp_bank").select("bank_code").in("bank_code", codes);
      (data ?? []).forEach((d: any) => known.add(d.bank_code));
    }
    for (const row of banks as any[]) {
      if (!row.reference_code || !known.has(row.reference_code)) {
        findings.push({
          finding_id: `fin-bank-${row.id}`,
          category: "financial_refs",
          severity: "warning",
          title: `Bank reference orphan: ${row.reference_code || "(empty)"}`,
          description: `Bank code '${row.reference_code || "(empty)"}' is not in ssp_bank.`,
          source_asset: "ssb.financial",
          affected_policy: `ssb_financial_policy.${row.id}`,
          affected_process: "BANK_LIST",
          orphan_value: row.reference_code || null,
          expected_source: "ssp_bank.bank_code (Financial Reference · Bank)",
          recommended_action: "Reselect a bank or seed it in Financial Reference · Bank.",
          fix_route: "/admin/ssb-setup?section=financial",
          fix_anchor_or_section: "financial",
          auto_fix_available: false,
          bn_wave1_blocking: false,
        });
      }
    }
  }
  return findings;
}

async function detectCommunicationOrphans(profileId: string): Promise<ReadinessFinding[]> {
  const findings: ReadinessFinding[] = [];
  const { data: rows } = await db
    .from("ssb_communication_policy")
    .select("id, template_code, channel")
    .eq("profile_id", profileId)
    .eq("status", "ACTIVE").eq("is_current", true);
  const codes = Array.from(new Set((rows ?? []).map((r: any) => r.template_code).filter(Boolean)));
  const known = new Set<string>();
  if (codes.length) {
    const { data } = await db.from("core_template").select("code").in("code", codes);
    (data ?? []).forEach((d: any) => known.add(d.code));
  }
  for (const row of rows ?? []) {
    if (!row.template_code || !known.has(row.template_code)) {
      findings.push({
        finding_id: `comm-tpl-${row.id}`,
        category: "communication_refs",
        severity: "blocking",
        title: `Communication template orphan: ${row.template_code || "(empty)"}`,
        description: `Communication policy (${row.channel}) references template '${row.template_code || "(empty)"}' not in core_template.`,
        source_asset: "ssb.communication",
        affected_policy: `ssb_communication_policy.${row.id}`,
        affected_process: row.channel,
        orphan_value: row.template_code || null,
        expected_source: "core_template.code (Notification/Template Registry)",
        recommended_action: "Reselect a template or publish one in /admin/notification-templates first.",
        fix_route: "/admin/ssb-setup?section=communication",
        fix_anchor_or_section: "communication",
        auto_fix_available: false,
        bn_wave1_blocking: true,
      });
    }
  }
  return findings;
}

/**
 * Finance / Payment master duplication detector.
 *
 * Canonical decision (see docs/social-security/FINANCE_PAYMENT_MASTER_DUPLICATION_AUDIT.md):
 *   - ssp_bank             is canonical for banks;   tb_bank_code        is adapter.
 *   - ssp_payment_channel  is canonical for channels;tb_method_of_payment is adapter.
 * Every legacy row must be mapped in finance_master_crosswalk to a live
 * canonical code; unmapped rows surface as warnings so administrators can
 * either retire the legacy code or add the crosswalk entry.
 */
async function detectFinancePaymentDuplication(): Promise<ReadinessFinding[]> {
  const findings: ReadinessFinding[] = [];

  const [banks, methods, crosswalk, sspBank, sspChan] = await Promise.all([
    db.from("tb_bank_code").select("bank_code, bank_name").then((r: any) => r.data ?? []).catch(() => []),
    db.from("tb_method_of_payment").select("mop_code, short_description").then((r: any) => r.data ?? []).catch(() => []),
    db.from("finance_master_crosswalk").select("source_table, source_code, canonical_table, canonical_code, active")
      .eq("active", true).then((r: any) => r.data ?? []).catch(() => []),
    db.from("ssp_bank").select("bank_code").eq("is_active", true).then((r: any) => new Set((r.data ?? []).map((x: any) => x.bank_code))).catch(() => new Set()),
    db.from("ssp_payment_channel").select("channel_code").eq("is_active", true).then((r: any) => new Set((r.data ?? []).map((x: any) => x.channel_code))).catch(() => new Set()),
  ]);

  const mapFor = (source_table: string) => {
    const m = new Map<string, string>();
    for (const c of crosswalk) if (c.source_table === source_table) m.set(c.source_code, c.canonical_code);
    return m;
  };
  const bankMap = mapFor("tb_bank_code");
  const chanMap = mapFor("tb_method_of_payment");

  for (const b of banks) {
    const canonical = bankMap.get(b.bank_code);
    if (!canonical || !sspBank.has(canonical)) {
      findings.push({
        finding_id: `dup-bank-${b.bank_code}`,
        category: "financial_refs",
        severity: "warning",
        title: `Legacy bank not aligned: ${b.bank_code}`,
        description: `tb_bank_code row '${b.bank_code} — ${b.bank_name}' is not mapped in finance_master_crosswalk to a live ssp_bank.bank_code. This risks a duplicate source of truth.`,
        source_asset: "tb_bank_code",
        affected_policy: null,
        affected_process: null,
        orphan_value: b.bank_code,
        expected_source: "ssp_bank.bank_code (Financial Reference)",
        recommended_action: "Either seed the bank in Financial Reference and add a crosswalk row, or retire the legacy bank_code entry.",
        fix_route: "/admin/master-data/bank-codes",
        fix_anchor_or_section: "bank_alignment",
        auto_fix_available: false,
        bn_wave1_blocking: false,
      });
    }
  }
  for (const m of methods) {
    const canonical = chanMap.get(m.mop_code);
    if (!canonical || !sspChan.has(canonical)) {
      findings.push({
        finding_id: `dup-mop-${m.mop_code}`,
        category: "financial_refs",
        severity: "warning",
        title: `Legacy payment method not aligned: ${m.mop_code}`,
        description: `tb_method_of_payment row '${m.mop_code} — ${m.short_description}' is not mapped in finance_master_crosswalk to a live ssp_payment_channel.channel_code. This risks a duplicate source of truth.`,
        source_asset: "tb_method_of_payment",
        affected_policy: null,
        affected_process: null,
        orphan_value: m.mop_code,
        expected_source: "ssp_payment_channel.channel_code (Financial Reference)",
        recommended_action: "Seed the channel in Financial Reference and add a finance_master_crosswalk row, or retire the legacy method-of-payment entry.",
        fix_route: "/admin/master-data/methods-of-payment",
        fix_anchor_or_section: "payment_channel_alignment",
        auto_fix_available: false,
        bn_wave1_blocking: false,
      });
    }
  }
  return findings;
}

// ------------------------------------------------------------------
// Aggregation
// ------------------------------------------------------------------

function categoryStatus(blocking: number, warning: number): ReadinessStatus {
  if (blocking > 0) return "blocked";
  if (warning > 0) return "warning";
  return "ready";
}

function overallStatus(cats: ReadinessCategory[]): ReadinessStatus {
  if (cats.some((c) => c.status === "blocked")) return "blocked";
  if (cats.some((c) => c.status === "warning")) return "warning";
  return "ready";
}

async function safeLatestRun(): Promise<ValidationRun | null> {
  try { return await getLatestValidationRun(); } catch { return null; }
}

export async function getPlatformReadinessSummary(): Promise<PlatformReadinessSummary> {
  const profile = await getKnProfile().catch(() => null);
  const profileId = profile?.id ?? null;

  const [pkgs, latestRun, processes, benefits, health, wfOrphans, numOrphans, finOrphans, commOrphans, dupFin, consumptionViolations] =
    await Promise.all([
      listConfigurationPackages().catch(() => []),
      safeLatestRun(),
      listBusinessProcesses().catch(() => [] as BusinessProcessConfiguration[]),
      evaluateBenefitsReadiness().catch(() => null),
      evaluateAllAssetHealth().catch(() => []),
      profileId ? detectWorkflowOrphans(profileId) : Promise.resolve([]),
      profileId ? detectNumberingOrphans(profileId) : Promise.resolve([]),
      profileId ? detectFinancialOrphans(profileId) : Promise.resolve([]),
      profileId ? detectCommunicationOrphans(profileId) : Promise.resolve([]),
      detectFinancePaymentDuplication().catch(() => []),
      enterpriseConsumptionRegistryService.listViolations("OPEN").catch(() => []),
    ]);

  const consumptionFindings: ReadinessFinding[] = consumptionViolations.map((v: any): ReadinessFinding => ({
    finding_id: `consumption:${v.violation_key}`,
    category: "source_control_refs" as ReadinessCategoryKey,
    severity: (v.severity === "P0" ? "blocking" : v.severity === "P1" ? "warning" : "info") as ReadinessSeverity,
    title: `Consumption: ${v.violation_type}`,
    description: v.message,
    source_asset: v.entity_key ?? null,
    affected_policy: null,
    affected_process: null,
    orphan_value: null,
    expected_source: "Enterprise Consumption Registry",
    recommended_action: v.recommendation ?? "Open the Enterprise Consumption Registry to review.",
    fix_route: "/admin/enterprise-consumption-registry",
    fix_anchor_or_section: null,
    auto_fix_available: false,
    bn_wave1_blocking: v.severity === "P0",
  }));

  const findings: ReadinessFinding[] = [
    ...wfOrphans, ...numOrphans, ...finOrphans, ...commOrphans, ...dupFin, ...consumptionFindings,
  ];

  const activePkg = pkgs.find((p) => p.status === "active") ?? null;
  const activeMissing = !activePkg;

  const govBlocking = latestRun ? latestRun.errors_count : (activeMissing ? 1 : 0);
  const govWarning  = latestRun ? latestRun.warnings_count : 0;

  const processBlocking = processes.filter((p) => p.status === "Missing").length;
  const processWarning  = processes.filter((p) => p.status === "Partial").length;

  const healthBlocking = health.filter((h: any) => h.status === "missing" || h.status === "error").length;
  const healthWarning  = health.filter((h: any) => h.status === "partial").length;

  const count = (cat: ReadinessCategoryKey, sev: ReadinessSeverity) =>
    findings.filter((f) => f.category === cat && f.severity === sev).length;

  const catList: ReadinessCategory[] = [
    {
      key: "active_package",
      label: "Active Package",
      status: activeMissing ? "blocked" : "ready",
      blockingCount: activeMissing ? 1 : 0,
      warningCount: 0,
      fixRoute: "/admin/configuration-governance",
      summary: activePkg ? `Active: ${activePkg.package_key} v${activePkg.version_no}` : "No active configuration package.",
    },
    {
      key: "governance_validation",
      label: "Governance Validation",
      status: categoryStatus(govBlocking, govWarning),
      blockingCount: govBlocking,
      warningCount: govWarning,
      fixRoute: "/admin/configuration-governance",
      summary: latestRun
        ? `Score ${latestRun.score}/100 · ${latestRun.errors_count} errors · ${latestRun.warnings_count} warnings`
        : "No validation run has been executed yet.",
    },
    {
      key: "business_processes",
      label: "Business Process Resolvers",
      status: categoryStatus(processBlocking, processWarning),
      blockingCount: processBlocking,
      warningCount: processWarning,
      fixRoute: "/admin/ssb-setup?section=business_processes",
      summary: `${processes.filter(p => p.status === "Ready").length}/${processes.length} processes Ready`,
    },
    {
      key: "policy_health",
      label: "Policy Health",
      status: categoryStatus(healthBlocking, healthWarning),
      blockingCount: healthBlocking,
      warningCount: healthWarning,
      fixRoute: "/admin/ssb-setup",
      summary: `${health.filter((h: any) => h.status === "ready").length}/${health.length} policies healthy`,
    },
    {
      key: "source_control_refs",
      label: "Source-Control References",
      status: categoryStatus(
        count("workflow_refs","blocking")+count("numbering_refs","blocking")+count("financial_refs","blocking")+count("communication_refs","blocking"),
        count("workflow_refs","warning")+count("numbering_refs","warning")+count("financial_refs","warning")+count("communication_refs","warning"),
      ),
      blockingCount: findings.filter(f => f.bn_wave1_blocking).length,
      warningCount: findings.filter(f => f.severity === "warning").length,
      fixRoute: "/admin/platform-readiness",
      summary: "Aggregated data-level orphan detection across canonical sources.",
    },
    {
      key: "workflow_refs",
      label: "Workflow References",
      status: categoryStatus(count("workflow_refs","blocking"), count("workflow_refs","warning")),
      blockingCount: count("workflow_refs","blocking"),
      warningCount: count("workflow_refs","warning"),
      fixRoute: "/admin/ssb-setup?section=workflow",
      summary: "SSB workflow policies must bind to published workflow_definitions.",
    },
    {
      key: "numbering_refs",
      label: "Numbering References",
      status: categoryStatus(count("numbering_refs","blocking"), count("numbering_refs","warning")),
      blockingCount: count("numbering_refs","blocking"),
      warningCount: count("numbering_refs","warning"),
      fixRoute: "/admin/ssb-setup?section=numbering",
      summary: "SSB numbering policies must bind to a Platform Numbering sequence.",
    },
    {
      key: "financial_refs",
      label: "Payment / Financial References",
      status: categoryStatus(count("financial_refs","blocking"), count("financial_refs","warning")),
      blockingCount: count("financial_refs","blocking"),
      warningCount: count("financial_refs","warning"),
      fixRoute: "/admin/ssb-setup?section=financial",
      summary: "Payment channels and banks must exist in Financial Reference.",
    },
    {
      key: "communication_refs",
      label: "Communication References",
      status: categoryStatus(count("communication_refs","blocking"), count("communication_refs","warning")),
      blockingCount: count("communication_refs","blocking"),
      warningCount: count("communication_refs","warning"),
      fixRoute: "/admin/ssb-setup?section=communication",
      summary: "Communication policies must bind to published core_template rows.",
    },
    {
      key: "bn_product_builder",
      label: "BN Product Builder Gate",
      status: benefits && benefits.ready ? "ready" : (benefits && benefits.governanceErrors > 0 ? "blocked" : "warning"),
      blockingCount: benefits ? Math.max(0, benefits.governanceErrors) : 0,
      warningCount: 0,
      fixRoute: "/bn/config/products",
      summary: benefits ? (benefits.ready ? "Ready to start Wave 1." : benefits.reasons.join(" ")) : "Readiness unknown.",
    },
  ];

  const blockingTotal = findings.filter(f => f.severity === "blocking").length + govBlocking + (activeMissing ? 1 : 0);
  const warningTotal  = findings.filter(f => f.severity === "warning").length + govWarning;

  const bnWave1Status: PlatformReadinessSummary["bnWave1Status"] =
    blockingTotal > 0 ? "BLOCKED" :
    warningTotal > 0 ? "READY WITH WARNINGS" : "READY";

  const modules: ModuleReadiness[] = processes.map((p) => ({
    moduleKey: p.processKey,
    label: p.processName,
    status: p.status === "Ready" ? "ready" : p.status === "Partial" ? "warning" : "blocked",
    reasons: p.missingPolicies.map((m) => `Missing ${m.label}`),
  }));
  modules.push({
    moduleKey: "bn_product_builder",
    label: "BN Product Builder",
    status: bnWave1Status === "READY" ? "ready" : bnWave1Status === "READY WITH WARNINGS" ? "warning" : "blocked",
    reasons: bnWave1Status === "READY" ? [] : [`${blockingTotal} blocking, ${warningTotal} warnings`],
  });

  return {
    overallStatus: overallStatus(catList),
    bnWave1Status,
    activePackageKey: activePkg?.package_key ?? null,
    activePackageName: activePkg?.package_name ?? null,
    latestValidationScore: latestRun?.score ?? null,
    blockingCount: blockingTotal,
    warningCount: warningTotal,
    infoCount: latestRun?.info_count ?? 0,
    categories: catList,
    findings,
    modules,
    generatedAt: new Date().toISOString(),
  };
}

export async function getReadinessCategories(): Promise<ReadinessCategory[]> {
  return (await getPlatformReadinessSummary()).categories;
}

export async function getReadinessFindings(): Promise<ReadinessFinding[]> {
  return (await getPlatformReadinessSummary()).findings;
}

export async function getReadinessForModule(moduleKey: string): Promise<ModuleReadiness | null> {
  const s = await getPlatformReadinessSummary();
  return s.modules.find((m) => m.moduleKey === moduleKey) ?? null;
}

export async function getFixActionsForFinding(findingId: string): Promise<ReadinessFinding | null> {
  const s = await getPlatformReadinessSummary();
  return s.findings.find((f) => f.finding_id === findingId) ?? null;
}

export async function refreshReadiness(): Promise<PlatformReadinessSummary> {
  // Re-run governance validation (best-effort) then re-aggregate.
  try { await runSsbSetupValidation(); } catch { /* ignore */ }
  return getPlatformReadinessSummary();
}

export async function getBnWave1Readiness(): Promise<{
  status: PlatformReadinessSummary["bnWave1Status"];
  blockingCount: number;
  warningCount: number;
  activePackageKey: string | null;
}> {
  const s = await getPlatformReadinessSummary();
  return {
    status: s.bnWave1Status,
    blockingCount: s.blockingCount,
    warningCount: s.warningCount,
    activePackageKey: s.activePackageKey,
  };
}

export const platformReadinessService = {
  getPlatformReadinessSummary,
  getReadinessCategories,
  getReadinessFindings,
  getReadinessForModule,
  getFixActionsForFinding,
  refreshReadiness,
  getBnWave1Readiness,
};
