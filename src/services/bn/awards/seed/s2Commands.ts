/**
 * AW360-WAVE-1 Stage S2 — Orchestrator commands, diagnostics, and the
 * payment-hierarchy failure disposition register.
 */

import { assertSeedExecutionAllowed, type SeedExecutionRequest, SeedGuardError } from './seedTenantGuard';
import { buildScenarioManifest } from './seedScenarioManifest';
import {
  reconcileBenefitCatalogue,
  classifyScenarios,
  type DbBenefitOverlay,
  type ScenarioClassification,
} from './s2Reconciliation';
import { applyProfile, type SeedProfile } from './s2Profiles';
import {
  SeedBatchRegistry,
  SeedStore,
  materialise,
  buildRowsForScenario,
  creationModeFor,
  type PersistedRow,
  type SeedBatchRecord,
  type CreationMode,
} from './s2Store';
import {
  reconcileContributionProfiles,
  verifyClaimsAndAwards,
  reconcilePayments,
  interceptCommunications,
} from './s2Domain';
import {
  executePilotScenarios,
  certifyDarkLaunched,
  verifyDbIntegrity,
  certifyRepresentativeUiScenarios,
  type IdempotencyResult,
} from './s2Certification';

// ─────────────────────────── Payment-hierarchy disposition ─────────────

export type HierarchyFailureCategory =
  | 'GENUINE_PRODUCT_DEFECT'
  | 'OUTDATED_TEST_EXPECTATION'
  | 'INVALID_FIXTURE'
  | 'ENVIRONMENT_CONFIG_ISSUE'
  | 'APPROVED_TEMPORARY_EXCEPTION';

export interface HierarchyFailureDisposition {
  readonly test: string;
  readonly category: HierarchyFailureCategory;
  readonly rootCause: string;
  readonly resolution: 'FIXED' | 'PENDING' | 'EXCEPTION_RECORDED';
  readonly owner: string;
  readonly riskIfLeftOpen: string;
  readonly resolvedInCommit?: string;
}

/**
 * All 10 pre-existing failures in `bn-payment/hierarchy-validation.test.ts`
 * were rooted in the same defect: `validateProductPaymentSetup` destructured
 * `{ data: cycleRows = [] }` from a Supabase response, which does NOT fall
 * back to `[]` when `data` is explicitly `null`. Any test that did not seed
 * `bn_country_payment_cycle_method` therefore threw
 * `Cannot read properties of null (reading 'length')`. Fixed by nullish
 * coalescing `cycleRows ?? []` in the same file.
 */
export const PAYMENT_HIERARCHY_DISPOSITION: readonly HierarchyFailureDisposition[] = [
  'V1 — currency mismatch between product and country',
  'V2 — non-EFT method missing cheque configuration',
  'V3 — provider direct-pay not permitted by country method',
  'V4 — hold rule references missing reason code',
  'V5 — country payment method disabled',
  'V6 — payee allowed by product but blocked by country method',
  'V7 — provider direct-pay blocked by country method',
  'V8 — approval threshold currency mismatch',
  'V9 — unknown reason code in hold rules',
  'HAPPY — fully aligned product passes',
].map<HierarchyFailureDisposition>((t) => ({
  test: t,
  category: 'GENUINE_PRODUCT_DEFECT',
  rootCause:
    'validateProductPaymentSetup destructured `{ data: cycleRows = [] }` from bn_country_payment_cycle_method; TS default did not apply to explicit null, causing rows.length on null.',
  resolution: 'FIXED',
  owner: 'benefits-payments',
  riskIfLeftOpen:
    'V10 cycle-restriction validator silently null-crashes on any product configured without cycle-method rows, blocking product save and skewing hierarchy validation coverage.',
  resolvedInCommit: 'S2 disposition batch — null-coalesce cycleRows',
}));

// ─────────────────────────── Command 1 — reconcile ─────────────────────

export interface ReconcileResult {
  readonly command: 'reconcile';
  readonly canProceed: boolean;
  readonly fingerprint: string;
  readonly issues: number;
  readonly authoritativeBenefitCount: number;
  readonly detail: ReturnType<typeof reconcileBenefitCatalogue>;
}

export function reconcile(
  req: SeedExecutionRequest,
  opts: { overlay?: readonly DbBenefitOverlay[] } = {},
): ReconcileResult {
  assertSeedExecutionAllowed(req, { requireApply: false });
  const detail = reconcileBenefitCatalogue({ asOfDate: req.asOfDate, overlay: opts.overlay });
  return {
    command: 'reconcile',
    canProceed: detail.canProceed,
    fingerprint: detail.fingerprint,
    issues: detail.issues.length,
    authoritativeBenefitCount: detail.authoritativeCatalogue.length,
    detail,
  };
}

// ─────────────────────────── Command 2 — plan ──────────────────────────

export interface S2PlanResult {
  readonly command: 'plan';
  readonly profile: SeedProfile;
  readonly totalScenarios: number;
  readonly persistableScenarios: number;
  readonly classificationCounts: Record<ScenarioClassification, number>;
  readonly excludedByReason: Record<string, number>;
  readonly rowsToWrite: number;
  readonly creationModeCounts: Record<CreationMode, number>;
  readonly expectedRowCountsByTable: Record<string, number>;
}

export function plan(
  req: SeedExecutionRequest,
  opts: { profile: SeedProfile; overlay?: readonly DbBenefitOverlay[] },
): S2PlanResult {
  assertSeedExecutionAllowed(req, { requireApply: false });
  const rec = reconcileBenefitCatalogue({ asOfDate: req.asOfDate, overlay: opts.overlay });
  if (!rec.canProceed) {
    throw new SeedGuardError('CATALOGUE_BLOCKED', `Reconciliation blocked (${rec.blockingIssueCount} issues).`);
  }
  const manifest = buildScenarioManifest(req);
  const constrained = classifyScenarios(manifest);
  const profile = applyProfile(opts.profile, constrained.persistable);

  const rows: PersistedRow[] = [];
  const modeCounts: Record<CreationMode, number> = { DOMAIN_EXECUTED: 0, HISTORICAL_FIXTURE: 0 };
  for (const s of profile.scenarios) {
    modeCounts[creationModeFor(s)]++;
    rows.push(...buildRowsForScenario({ req, scenario: s, profile: opts.profile }));
  }
  const rowCounts: Record<string, number> = {};
  for (const r of rows) rowCounts[r.table] = (rowCounts[r.table] ?? 0) + 1;

  return {
    command: 'plan',
    profile: opts.profile,
    totalScenarios: manifest.scenarios.length,
    persistableScenarios: constrained.persistable.length,
    classificationCounts: constrained.counts,
    excludedByReason: constrained.excludedByReason,
    rowsToWrite: rows.length,
    creationModeCounts: modeCounts,
    expectedRowCountsByTable: rowCounts,
  };
}

// ─────────────────────────── Command 3 — apply ─────────────────────────

export interface S2ApplyContext {
  readonly registry: SeedBatchRegistry;
  readonly store: SeedStore;
  readonly overlay?: readonly DbBenefitOverlay[];
  readonly profile: SeedProfile;
  readonly applicationCommit: string;
  readonly requestedBy: string;
  readonly touchesNonSeed?: () => boolean;
}

export interface S2ApplyResult {
  readonly command: 'apply';
  readonly batch: SeedBatchRecord;
  readonly persistedRowCount: number;
  readonly classificationCounts: Record<ScenarioClassification, number>;
  readonly creationModeCounts: Record<CreationMode, number>;
  readonly integrity: ReturnType<typeof verifyDbIntegrity>;
  readonly contribution: ReturnType<typeof reconcileContributionProfiles>;
  readonly claimAward: ReturnType<typeof verifyClaimsAndAwards>;
  readonly payments: ReturnType<typeof reconcilePayments>;
  readonly communications: ReturnType<typeof interceptCommunications>;
  readonly pilotOutcomes: ReturnType<typeof executePilotScenarios>;
  readonly darkLaunched: ReturnType<typeof certifyDarkLaunched>;
  readonly ui: ReturnType<typeof certifyRepresentativeUiScenarios>;
}

export function apply(req: SeedExecutionRequest, ctx: S2ApplyContext): S2ApplyResult {
  assertSeedExecutionAllowed(req, { requireApply: true });
  const rec = reconcileBenefitCatalogue({ asOfDate: req.asOfDate, overlay: ctx.overlay });
  if (!rec.canProceed) {
    throw new SeedGuardError('CATALOGUE_BLOCKED', `Reconciliation blocked (${rec.blockingIssueCount} issues).`);
  }
  const manifest = buildScenarioManifest(req);
  const constrained = classifyScenarios(manifest);
  const profileResult = applyProfile(ctx.profile, constrained.persistable);

  const rows: PersistedRow[] = [];
  const modeCounts: Record<CreationMode, number> = { DOMAIN_EXECUTED: 0, HISTORICAL_FIXTURE: 0 };
  for (const s of profileResult.scenarios) {
    modeCounts[creationModeFor(s)]++;
    rows.push(...buildRowsForScenario({ req, scenario: s, profile: ctx.profile }));
  }
  const expectedCounts: Record<string, number> = {};
  for (const r of rows) expectedCounts[r.table] = (expectedCounts[r.table] ?? 0) + 1;

  // Register the batch.
  const record = ctx.registry.create({
    seedBatchId: req.seedBatchId,
    tenantId: req.tenant.tenantId,
    seedVersion: req.seedVersion,
    profile: ctx.profile,
    asOfDate: req.asOfDate,
    catalogueFingerprint: rec.fingerprint,
    applicationCommit: ctx.applicationCommit,
    environment: req.environment,
    requestedBy: ctx.requestedBy,
    creationModeCounts: modeCounts,
    expectedRowCounts: expectedCounts,
    actualRowCounts: {},
    startedAt: new Date().toISOString(),
    status: 'PENDING',
    cleanupStatus: 'NONE',
  });

  const finalRecord = materialise(req, profileResult.scenarios, rows, ctx.registry, ctx.store, {
    requireApply: true,
    touchesNonSeed: ctx.touchesNonSeed,
  });

  return {
    command: 'apply',
    batch: finalRecord,
    persistedRowCount: ctx.store.countByBatch(req.seedBatchId),
    classificationCounts: constrained.counts,
    creationModeCounts: modeCounts,
    integrity: verifyDbIntegrity(ctx.store, req.tenant.tenantId),
    contribution: reconcileContributionProfiles(),
    claimAward: verifyClaimsAndAwards(profileResult.scenarios),
    payments: reconcilePayments(profileResult.scenarios),
    communications: interceptCommunications(profileResult.scenarios),
    pilotOutcomes: executePilotScenarios(profileResult.scenarios),
    darkLaunched: certifyDarkLaunched(),
    ui: certifyRepresentativeUiScenarios(profileResult.scenarios),
  };
  void record;
}

// ─────────────────────────── Command 4 — verify ────────────────────────

export function verify(req: SeedExecutionRequest, store: SeedStore) {
  assertSeedExecutionAllowed(req, { requireApply: false });
  return verifyDbIntegrity(store, req.tenant.tenantId);
}

// ─────────────────────────── Command 5 — reset ─────────────────────────

export interface S2ResetResult {
  readonly command: 'reset';
  readonly batchId: string;
  readonly deleted: number;
  readonly blocked: boolean;
  readonly reason?: string;
  readonly rowsRemaining: number;
}

export function reset(
  req: SeedExecutionRequest,
  store: SeedStore,
  registry: SeedBatchRegistry,
  touchesNonSeed: () => boolean = () => false,
): S2ResetResult {
  assertSeedExecutionAllowed(req, { requireApply: true });
  const result = store.deleteBatch(req.seedBatchId, { touchesNonSeed });
  if (!result.blocked && registry.get(req.seedBatchId)) {
    registry.update(req.seedBatchId, { cleanupStatus: 'DONE', status: 'CLEANED_UP' });
  }
  return {
    command: 'reset',
    batchId: req.seedBatchId,
    deleted: result.deleted,
    blocked: result.blocked,
    reason: result.reason,
    rowsRemaining: store.countByBatch(req.seedBatchId),
  };
}

// ─────────────────────────── Command 6 — idempotent-cycle ──────────────

export function idempotentCycle(
  req: SeedExecutionRequest,
  ctx: S2ApplyContext,
): IdempotencyResult {
  // First apply.
  const first = apply(req, ctx);
  const firstCount = first.persistedRowCount;
  // Second apply (same batch id — same seed version — same profile).
  const second = apply(req, ctx);
  const secondCount = second.persistedRowCount;
  const duplicates = secondCount - firstCount;

  // Cleanup with a non-seed touch → must block.
  const blocked = reset(req, ctx.store, ctx.registry, () => true);
  // Real cleanup.
  reset(req, ctx.store, ctx.registry, () => false);
  const rowsAfterReset = ctx.store.countByBatch(req.seedBatchId);

  // Reapply after reset.
  const third = apply(req, ctx);
  const reapplyMatches = third.persistedRowCount === firstCount;

  return {
    firstApplyRowCount: firstCount,
    secondApplyRowCount: secondCount,
    duplicateRowsCreated: Math.max(0, duplicates),
    cleanupBlockedByNonSeed: blocked.blocked,
    rowsAfterReset,
    reapplyMatches,
  };
}

// ─────────────────────────── Command 7 — diagnostics ───────────────────

export interface S2Diagnostics {
  readonly environment: string;
  readonly seedTenant: string;
  readonly activeBatch?: string;
  readonly profile?: SeedProfile;
  readonly seedVersion: string;
  readonly asOfDate: string;
  readonly catalogueFingerprint?: string;
  readonly configuredBenefitCount: number;
  readonly materiallySeededBenefits: readonly string[];
  readonly scenarioTotals: {
    readonly total: number;
    readonly persistable: number;
    readonly excluded: number;
  };
  readonly persistedRowTotals: Record<string, number>;
  readonly excludedCombinations: Record<string, number>;
  readonly integrityIssues: number;
  readonly paymentHierarchyStatus: 'CLEAN' | 'HAS_UNRESOLVED_EXCEPTIONS';
  readonly lastApplyStatus?: SeedBatchRecord['status'];
  readonly lastVerificationOk: boolean;
  readonly cleanupStatus?: SeedBatchRecord['cleanupStatus'];
}

export function diagnostics(
  req: SeedExecutionRequest,
  ctx: { readonly store: SeedStore; readonly registry: SeedBatchRegistry; readonly profile?: SeedProfile },
): S2Diagnostics {
  const manifest = buildScenarioManifest(req);
  const constrained = classifyScenarios(manifest);
  const batch = ctx.registry.get(req.seedBatchId);
  const integrity = verifyDbIntegrity(ctx.store, req.tenant.tenantId);

  const uncleared = PAYMENT_HIERARCHY_DISPOSITION.filter((d) => d.resolution !== 'FIXED' && d.resolution !== 'EXCEPTION_RECORDED');
  return {
    environment: req.environment,
    seedTenant: req.tenant.tenantId,
    activeBatch: batch?.seedBatchId,
    profile: batch?.profile ?? ctx.profile,
    seedVersion: req.seedVersion,
    asOfDate: req.asOfDate,
    catalogueFingerprint: batch?.catalogueFingerprint,
    configuredBenefitCount: manifest.scenarioKeysByBenefit
      ? Object.keys(manifest.scenarioKeysByBenefit).length
      : 0,
    materiallySeededBenefits: [...new Set(ctx.store.all().map((r) => (r.data as any).benefit_code).filter(Boolean))],
    scenarioTotals: {
      total: manifest.scenarios.length,
      persistable: constrained.persistable.length,
      excluded: manifest.scenarios.length - constrained.persistable.length,
    },
    persistedRowTotals: ctx.store.countByTable(),
    excludedCombinations: constrained.excludedByReason,
    integrityIssues: integrity.issues.length,
    paymentHierarchyStatus: uncleared.length === 0 ? 'CLEAN' : 'HAS_UNRESOLVED_EXCEPTIONS',
    lastApplyStatus: batch?.status,
    lastVerificationOk: integrity.issues.length === 0,
    cleanupStatus: batch?.cleanupStatus,
  };
}
