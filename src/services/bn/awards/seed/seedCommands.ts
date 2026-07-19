/**
 * AW360-WAVE-1 Stage S1 — Seed commands + coverage report + cleanup.
 *
 * Commands are pure orchestrators over the scenario manifest and the
 * tenant guard. This module NEVER writes to the database directly; it
 * emits an execution plan. Actual persistence is deferred to an
 * operator-run adapter that consumes the plan under `--apply` in an
 * approved seed environment.
 */

import { assertSeedExecutionAllowed, type SeedExecutionRequest, SeedGuardError } from './seedTenantGuard';
import { buildScenarioManifest, scenarioSummaryByBenefit, type ScenarioManifest } from './seedScenarioManifest';
import { discoverBenefitCatalogue, CANONICAL_BENEFIT_CATALOGUE } from './seedCatalogue';
import { validateSeedIntegrity, type IntegrityReport } from './seedIntegrity';
import { APPROVED_PILOT_ACTIONS } from '../pilot/awardPilotScopeFreeze';

// ---------------- Commands ----------------

export interface DryRunPlan {
  readonly command: 'dry-run';
  readonly tenantId: string;
  readonly seedBatchId: string;
  readonly seedVersion: string;
  readonly asOfDate: string;
  readonly discoveredBenefits: number;
  readonly proposedScenarioCount: number;
  readonly proposedScenariosByBenefit: Record<string, number>;
  readonly tableImpact: readonly { readonly table: string; readonly estimatedRows: number }[];
  readonly integrityExpectations: readonly string[];
  readonly warnings: readonly string[];
  readonly blockedConditions: readonly string[];
}

export function dryRun(req: SeedExecutionRequest): DryRunPlan {
  assertSeedExecutionAllowed(req, { requireApply: false });
  const manifest = buildScenarioManifest(req);
  const disc = discoverBenefitCatalogue({
    asOfDate: req.asOfDate,
    scenarioKeysByBenefit: manifest.scenarioKeysByBenefit,
  });
  const summary = scenarioSummaryByBenefit(manifest);
  const totalRows = manifest.scenarios.length;
  const impact = [
    { table: 'ip_master (synthetic)', estimatedRows: totalRows },
    { table: 'bn_claim (synthetic)', estimatedRows: totalRows },
    { table: 'bn_award (synthetic)', estimatedRows: manifest.scenarios.filter((s) => s.identifiers.awardId).length },
    {
      table: 'bn_payment_instruction (synthetic)',
      estimatedRows: manifest.scenarios.filter((s) => s.identifiers.paymentId).length,
    },
    { table: 'bn_communication_log (synthetic)', estimatedRows: manifest.scenarios.reduce((n, s) => n + s.expectedCommunicationEvents.length, 0) },
    { table: 'core_audit_log (synthetic)', estimatedRows: manifest.scenarios.reduce((n, s) => n + s.expectedAuditEvents.length, 0) },
  ];
  return {
    command: 'dry-run',
    tenantId: req.tenant.tenantId,
    seedBatchId: req.seedBatchId,
    seedVersion: req.seedVersion,
    asOfDate: req.asOfDate,
    discoveredBenefits: disc.totalActive,
    proposedScenarioCount: manifest.scenarios.length,
    proposedScenariosByBenefit: summary,
    tableImpact: impact,
    integrityExpectations: [
      'tenant_isolation_pass',
      'identity_uniqueness_pass',
      'claim_compatibility_pass',
      'award_lifecycle_validity_pass',
      'financial_reconciliation_pass',
      'audit_completeness_pass',
      'pilot_scope_integrity_pass',
      'no_D9_evidence_contamination',
    ],
    warnings: disc.unseededActive.length
      ? [`unseeded_active_benefits:${disc.unseededActive.join(',')}`]
      : [],
    blockedConditions: [],
  };
}

export interface ApplyResult {
  readonly command: 'apply';
  readonly manifest: ScenarioManifest;
  readonly integrity: IntegrityReport;
  readonly appliedAt: string;
  readonly idempotent: true;
  readonly writesCommitted: boolean;   // false in this environment — the
                                       // framework does not touch DB directly.
  readonly reason: string;
}

/**
 * Prepares an apply plan and asserts integrity. In the sandbox this does
 * NOT write to Lovable Cloud. Operator-run adapters convert the manifest
 * into synthetic rows against the seed tenant.
 */
export function applyPlan(req: SeedExecutionRequest): ApplyResult {
  assertSeedExecutionAllowed(req, { requireApply: true });
  const manifest = buildScenarioManifest(req);
  const integrity = validateSeedIntegrity(manifest);
  if (!integrity.ok) {
    throw new SeedGuardError(
      'INTEGRITY_FAILED',
      `Seed integrity failed with ${integrity.errors} error(s); refusing to apply.`,
    );
  }
  return {
    command: 'apply',
    manifest,
    integrity,
    appliedAt: req.asOfDate,
    idempotent: true,
    writesCommitted: false,
    reason:
      'Manifest built and integrity-certified. Writes are deferred to the ' +
      'operator-run adapter in an approved seed environment.',
  };
}

export function verify(req: SeedExecutionRequest): IntegrityReport {
  assertSeedExecutionAllowed(req, { requireApply: false });
  const manifest = buildScenarioManifest(req);
  return validateSeedIntegrity(manifest);
}

// ---------------- Coverage report ----------------

export interface CoverageReport {
  readonly command: 'coverage-report';
  readonly configuredBenefitTypes: readonly string[];
  readonly seededBenefitTypes: readonly string[];
  readonly claimStatesCovered: readonly string[];
  readonly awardStatesCovered: readonly string[];
  readonly contributionProfilesCovered: readonly string[];
  readonly paymentStatesCovered: readonly string[];
  readonly actionStatesCovered: readonly string[];
  readonly missingCoverage: readonly string[];
  readonly nonApplicableCombinations: readonly string[];
}

export function coverageReport(req: SeedExecutionRequest): CoverageReport {
  assertSeedExecutionAllowed(req, { requireApply: false });
  const manifest = buildScenarioManifest(req);
  const seeded = new Set(manifest.scenarios.map((s) => s.benefitType));
  const claimStates = new Set(manifest.scenarios.map((s) => s.claimState).filter(Boolean) as string[]);
  const awardStates = new Set(
    manifest.scenarios.map((s) => s.expectedLifecycleState).filter(Boolean) as string[],
  );
  const contribProfiles = new Set(
    manifest.scenarios.map((s) => s.contributionProfile).filter(Boolean) as string[],
  );
  const payStates = new Set(manifest.scenarios.map((s) => s.paymentState).filter(Boolean) as string[]);
  const actionStates = new Set(
    manifest.scenarios.map((s) => s.pilotActionState).filter(Boolean) as string[],
  );
  const configured = CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active).map((e) => e.code);
  const missing = configured.filter((c) => !seeded.has(c));

  const nonApplicable: string[] = [];
  for (const entry of CANONICAL_BENEFIT_CATALOGUE) {
    if (!entry.supportsSuspension) nonApplicable.push(`${entry.code}:AWARD_SUSPENDED`);
    if (!entry.supportsResumption) nonApplicable.push(`${entry.code}:AWARD_RESUMED`);
    if (!entry.requiresLifeCertificate) nonApplicable.push(`${entry.code}:LIFE_CERT_DUE`);
  }

  return {
    command: 'coverage-report',
    configuredBenefitTypes: configured,
    seededBenefitTypes: [...seeded],
    claimStatesCovered: [...claimStates],
    awardStatesCovered: [...awardStates],
    contributionProfilesCovered: [...contribProfiles],
    paymentStatesCovered: [...payStates],
    actionStatesCovered: [...actionStates],
    missingCoverage: missing,
    nonApplicableCombinations: nonApplicable,
  };
}

// ---------------- Cleanup ----------------

export interface CleanupPlan {
  readonly command: 'reset';
  readonly tenantId: string;
  readonly seedBatchId: string;
  readonly affectedTables: readonly string[];
  readonly expectedRowCounts: Record<string, number>;
  readonly nonSeedRowsTouched: number;   // must be 0 for cleanup to proceed
  readonly blockedReasons: readonly string[];
  readonly deletionOrder: readonly string[];
}

export function planCleanup(req: SeedExecutionRequest): CleanupPlan {
  assertSeedExecutionAllowed(req, { requireApply: false });
  const manifest = buildScenarioManifest(req);
  const counts = {
    'bn_payment_instruction (synthetic)': manifest.scenarios.filter((s) => s.identifiers.paymentId).length,
    'bn_award (synthetic)': manifest.scenarios.filter((s) => s.identifiers.awardId).length,
    'bn_claim (synthetic)': manifest.scenarios.length,
    'ip_master (synthetic)': manifest.scenarios.length,
    'core_audit_log (synthetic)': manifest.scenarios.reduce((n, s) => n + s.expectedAuditEvents.length, 0),
    'bn_communication_log (synthetic)': manifest.scenarios.reduce(
      (n, s) => n + s.expectedCommunicationEvents.length,
      0,
    ),
  };
  return {
    command: 'reset',
    tenantId: req.tenant.tenantId,
    seedBatchId: req.seedBatchId,
    affectedTables: Object.keys(counts),
    expectedRowCounts: counts,
    nonSeedRowsTouched: 0,
    blockedReasons: [],
    deletionOrder: [
      'bn_payment_instruction',
      'bn_award',
      'bn_claim',
      'ip_master',
      'core_audit_log',
      'bn_communication_log',
    ],
  };
}

// ---------------- Batches ----------------

export interface SeedBatchRecord {
  readonly tenantId: string;
  readonly seedBatchId: string;
  readonly seedVersion: string;
  readonly asOfDate: string;
  readonly scenarioCount: number;
  readonly integrityOk: boolean;
}

/**
 * In-sandbox `list-batches` implementation: since we do not persist to DB,
 * this synthesises the batch record from the requested inputs. A real
 * operator adapter should query the batches actually written.
 */
export function listBatches(reqs: readonly SeedExecutionRequest[]): readonly SeedBatchRecord[] {
  return reqs.map((r) => {
    const manifest = buildScenarioManifest(r);
    const integrity = validateSeedIntegrity(manifest);
    return {
      tenantId: r.tenant.tenantId,
      seedBatchId: r.seedBatchId,
      seedVersion: r.seedVersion,
      asOfDate: r.asOfDate,
      scenarioCount: manifest.scenarios.length,
      integrityOk: integrity.ok,
    };
  });
}

// ---------------- Diagnostics (read-only) ----------------

export interface SeedDiagnosticsSnapshot {
  readonly seedTenant: string;
  readonly seedBatchId: string;
  readonly seedVersion: string;
  readonly asOfDate: string;
  readonly discoveredBenefitCount: number;
  readonly seededBenefitCount: number;
  readonly scenarioCount: number;
  readonly claimStateCoverage: number;
  readonly awardStateCoverage: number;
  readonly paymentStateCoverage: number;
  readonly integrityFailures: number;
  readonly missingCoverage: readonly string[];
  readonly lastVerificationOk: boolean;
  readonly approvedPilotActions: readonly string[];
}

export function buildDiagnosticsSnapshot(req: SeedExecutionRequest): SeedDiagnosticsSnapshot {
  const manifest = buildScenarioManifest(req);
  const integrity = validateSeedIntegrity(manifest);
  const cov = coverageReport(req);
  return {
    seedTenant: req.tenant.tenantId,
    seedBatchId: req.seedBatchId,
    seedVersion: req.seedVersion,
    asOfDate: req.asOfDate,
    discoveredBenefitCount: CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active).length,
    seededBenefitCount: cov.seededBenefitTypes.length,
    scenarioCount: manifest.scenarios.length,
    claimStateCoverage: cov.claimStatesCovered.length,
    awardStateCoverage: cov.awardStatesCovered.length,
    paymentStateCoverage: cov.paymentStatesCovered.length,
    integrityFailures: integrity.errors,
    missingCoverage: cov.missingCoverage,
    lastVerificationOk: integrity.ok,
    approvedPilotActions: [...APPROVED_PILOT_ACTIONS],
  };
}
