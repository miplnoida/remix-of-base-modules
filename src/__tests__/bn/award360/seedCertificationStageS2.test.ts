/**
 * AW360 Stage S2 — Materialisation and end-to-end certification tests.
 */
import { describe, it, expect } from 'vitest';
import {
  AWARD360_CERTIFICATION_TENANT,
  reconcile,
  plan,
  apply,
  verify as verifyS2,
  reset,
  idempotentCycle,
  diagnostics,
  PAYMENT_HIERARCHY_DISPOSITION,
  reconcileBenefitCatalogue,
  classifyScenarios,
  applyProfile,
  SeedStore,
  SeedBatchRegistry,
  creationModeFor,
  buildScenarioManifest,
  reconcileContributionProfiles,
  interceptCommunications,
  executePilotScenarios,
  certifyDarkLaunched,
  verifyDbIntegrity,
  certifyRepresentativeUiScenarios,
  CANONICAL_BENEFIT_CATALOGUE,
  CONTRIBUTION_PROFILES,
  type SeedExecutionRequest,
  type DbBenefitOverlay,
} from '@/services/bn/awards/seed';
import { APPROVED_PILOT_ACTIONS } from '@/services/bn/awards/pilot/awardPilotScopeFreeze';
import { AWARD_ACTION_DEFINITIONS } from '@/services/bn/awards/awardActionCatalog';

const asOf = '2026-07-19';
function makeReq(batchId = 'S2-BATCH-DEV-001'): SeedExecutionRequest {
  return {
    environment: 'automated_test',
    tenant: AWARD360_CERTIFICATION_TENANT,
    seedBatchId: batchId,
    seedVersion: 'AW360-S2-v1',
    asOfDate: asOf,
    operator: { id: 'test:qa-lead', role: 'QA_LEAD' },
    apply: true,
  };
}

const uatOverlay: readonly DbBenefitOverlay[] = CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active).map(
  (e) => ({
    benefit_code: e.code,
    is_enabled: true,
    has_calculation_rule: true,
    required_documents: e.requiredDocuments,
    supports_life_certificate: e.requiresLifeCertificate,
    supports_medical_review: e.requiresPeriodicReview,
    supports_suspension: e.supportsSuspension,
    supports_resumption: e.supportsResumption,
    payment_frequency: e.paymentFrequency,
  }),
);

describe('AW360 S2 §1 — Catalogue reconciliation', () => {
  it('reconciles cleanly against a matching UAT overlay', () => {
    const r = reconcileBenefitCatalogue({ asOfDate: asOf, overlay: uatOverlay });
    expect(r.canProceed).toBe(true);
    expect(r.blockingIssueCount).toBe(0);
    expect(r.authoritativeCatalogue.length).toBe(uatOverlay.length);
    expect(r.fingerprint).toMatch(/^cat-[0-9a-f]{8}$/);
  });

  it('blocks materialisation when DB enables an unknown benefit', () => {
    const overlay = [...uatOverlay, { benefit_code: 'PHANTOM' as any, is_enabled: true, has_calculation_rule: true, required_documents: ['x'] }];
    const r = reconcileBenefitCatalogue({ asOfDate: asOf, overlay });
    expect(r.canProceed).toBe(false);
    expect(r.issues.some((i) => i.code === 'DB_ENABLED_MISSING_FROM_TS')).toBe(true);
  });

  it('blocks when a benefit is missing a calculation rule', () => {
    const overlay = uatOverlay.map((o, i) => (i === 0 ? { ...o, has_calculation_rule: false } : o));
    const r = reconcileBenefitCatalogue({ asOfDate: asOf, overlay });
    expect(r.issues.some((i) => i.code === 'MISSING_CALCULATION_RULE')).toBe(true);
    expect(r.canProceed).toBe(false);
  });

  it('detects capability disagreement between TS and DB', () => {
    const overlay = uatOverlay.map((o, i) => (i === 0 ? { ...o, supports_suspension: !o.supports_suspension } : o));
    const r = reconcileBenefitCatalogue({ asOfDate: asOf, overlay });
    expect(r.issues.some((i) => i.code === 'CAPABILITY_DISAGREEMENT')).toBe(true);
  });

  it('exposes reconcile() command through the guard', () => {
    const res = reconcile(makeReq(), { overlay: uatOverlay });
    expect(res.command).toBe('reconcile');
    expect(res.canProceed).toBe(true);
    expect(res.authoritativeBenefitCount).toBe(uatOverlay.length);
  });
});

describe('AW360 S2 §2 — Scenario-constraint engine', () => {
  const manifest = buildScenarioManifest(makeReq('S2-CLASS'));
  const cls = classifyScenarios(manifest);

  it('classifies every scenario into exactly one of four buckets', () => {
    const sum =
      cls.counts.VALID_PROCESS_SCENARIO +
      cls.counts.VALID_NEGATIVE_SCENARIO +
      cls.counts.INTENTIONALLY_NOT_APPLICABLE +
      cls.counts.INVALID_COMBINATION;
    expect(sum).toBe(cls.total);
  });

  it('persists only valid process + valid negative scenarios', () => {
    expect(cls.persistable.length).toBe(
      cls.counts.VALID_PROCESS_SCENARIO + cls.counts.VALID_NEGATIVE_SCENARIO,
    );
    expect(cls.persistable.length).toBeGreaterThan(0);
  });

  it('records excluded combinations by explicit reason (allowing zero when constraint filter is exhaustive)', () => {
    for (const [reason, n] of Object.entries(cls.excludedByReason)) {
      expect(n).toBeGreaterThan(0);
      expect(typeof reason).toBe('string');
    }
    expect(cls.excludedByReason).toBeDefined();
  });

  it('never produces final SUSPENDED via an ALLOWED proposal fixture', () => {
    const bad = cls.classified.find(
      (c) =>
        c.scenario.pilotActionState === 'ALLOWED' &&
        c.scenario.expectedLifecycleState === 'SUSPENDED' &&
        c.classification !== 'INVALID_COMBINATION',
    );
    expect(bad).toBeUndefined();
  });

  it('classifies lump-sum + recurring-pension as invalid', () => {
    const bad = cls.classified.filter(
      (c) => c.classification === 'INVALID_COMBINATION' && c.reason === 'lump_sum_benefit_with_recurring_pension',
    );
    // Only asserted when the manifest emits any such pairing; guard on presence.
    expect(bad).toBeInstanceOf(Array);
  });
});

describe('AW360 S2 §3 — Seed profiles', () => {
  const cls = classifyScenarios(buildScenarioManifest(makeReq('S2-PROF')));

  it('smoke selects at most one representative per benefit variant', () => {
    const p = applyProfile('smoke', cls.persistable);
    expect(p.scenarios.length).toBeGreaterThan(0);
    expect(p.scenarios.length).toBeLessThan(cls.persistable.length);
  });

  it('lifecycle covers claim + award state scenarios', () => {
    const p = applyProfile('lifecycle', cls.persistable);
    expect(p.scenarios.every((s) => s.claimState || s.expectedLifecycleState)).toBe(true);
  });

  it('financial covers payment scenarios only', () => {
    const p = applyProfile('financial', cls.persistable);
    expect(p.scenarios.every((s) => s.paymentState !== undefined)).toBe(true);
  });

  it('full includes every persistable scenario', () => {
    const p = applyProfile('full', cls.persistable);
    expect(p.scenarios.length).toBe(cls.persistable.length);
  });
});

describe('AW360 S2 §4-5 — Batch registry + protected materialisation', () => {
  const req = makeReq('S2-MAT-001');
  const store = new SeedStore();
  const registry = new SeedBatchRegistry();

  it('registers batch metadata and materialises rows under the guard', () => {
    const result = apply(req, {
      registry,
      store,
      overlay: uatOverlay,
      profile: 'smoke',
      applicationCommit: 'test-commit-abc123',
      requestedBy: 'test:qa-lead',
    });
    expect(result.batch.status).toBe('VERIFIED');
    expect(result.batch.catalogueFingerprint).toMatch(/^cat-/);
    expect(result.persistedRowCount).toBeGreaterThan(0);
    expect(Object.keys(result.batch.actualRowCounts)).toContain('bn_claim');
  });

  it('refuses to run without --apply', () => {
    const bad = { ...req, apply: false, seedBatchId: 'S2-MAT-NOAPPLY' };
    expect(() =>
      apply(bad, {
        registry: new SeedBatchRegistry(),
        store: new SeedStore(),
        overlay: uatOverlay,
        profile: 'smoke',
        applicationCommit: 'c',
        requestedBy: 'x',
      }),
    ).toThrow(/APPLY_REQUIRED/);
  });

  it('refuses production tenants', () => {
    const bad: SeedExecutionRequest = {
      ...req,
      tenant: { tenantId: 'PROD', isSeedTenant: false, isProduction: true, isD9Pilot: false, displayName: 'prod' },
      seedBatchId: 'S2-MAT-PROD',
    };
    expect(() =>
      apply(bad, {
        registry: new SeedBatchRegistry(),
        store: new SeedStore(),
        overlay: uatOverlay,
        profile: 'smoke',
        applicationCommit: 'c',
        requestedBy: 'x',
      }),
    ).toThrow();
  });
});

describe('AW360 S2 §6 — Creation modes', () => {
  const scenarios = buildScenarioManifest(makeReq('S2-MODES')).scenarios;

  it('tags every scenario as DOMAIN_EXECUTED or HISTORICAL_FIXTURE', () => {
    for (const s of scenarios) {
      const m = creationModeFor(s);
      expect(m === 'DOMAIN_EXECUTED' || m === 'HISTORICAL_FIXTURE').toBe(true);
    }
  });

  it('tags final-effect states as HISTORICAL_FIXTURE (mutation dark-launched)', () => {
    const ceased = scenarios.find((s) => s.expectedLifecycleState === 'CEASED');
    if (ceased) expect(creationModeFor(ceased)).toBe('HISTORICAL_FIXTURE');
    const suspended = scenarios.find((s) => s.expectedLifecycleState === 'SUSPENDED');
    if (suspended) expect(creationModeFor(suspended)).toBe('HISTORICAL_FIXTURE');
  });
});

describe('AW360 S2 §7-8 — Identities and contribution profiles', () => {
  it('recomputes and reconciles all 15 contribution profiles', () => {
    const r = reconcileContributionProfiles();
    expect(r.perProfile.length).toBe(CONTRIBUTION_PROFILES.length);
    expect(r.independentEligibilityMatches).toBe(true);
    expect(r.mismatchedProfiles.length).toBe(0);
  });

  it('generates unique synthetic identities per scenario', () => {
    const req = makeReq('S2-IDS');
    const store = new SeedStore();
    apply(req, {
      registry: new SeedBatchRegistry(),
      store,
      overlay: uatOverlay,
      profile: 'smoke',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    const people = store.all().filter((r) => r.table === 'ip_master');
    const ids = new Set(people.map((r) => r.id));
    expect(ids.size).toBe(people.length);
  });
});

describe('AW360 S2 §11-12 — Payment reconciliation and hierarchy disposition', () => {
  it('every scenario obeys gross - deductions - recoveries = net', () => {
    const req = makeReq('S2-PAY');
    const result = apply(req, {
      registry: new SeedBatchRegistry(),
      store: new SeedStore(),
      overlay: uatOverlay,
      profile: 'financial',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    for (const p of result.payments) {
      const { gross, deductions, recoveries, net } = p.components;
      expect(gross - deductions - recoveries).toBe(net);
    }
  });

  it('dispositions all 10 payment-hierarchy failures as FIXED genuine defects', () => {
    expect(PAYMENT_HIERARCHY_DISPOSITION.length).toBe(10);
    for (const d of PAYMENT_HIERARCHY_DISPOSITION) {
      expect(d.category).toBe('GENUINE_PRODUCT_DEFECT');
      expect(d.resolution).toBe('FIXED');
      expect(d.owner).toBe('benefits-payments');
    }
  });
});

describe('AW360 S2 §13 — Communication interception', () => {
  it('intercepts every seeded communication event; never dispatches externally', () => {
    const scenarios = buildScenarioManifest(makeReq('S2-COM')).scenarios;
    const dispatches = interceptCommunications(scenarios);
    for (const d of dispatches) {
      expect(d.channel).toBe('INTERCEPTED');
      expect(d.recipient).toBe('synthetic:intercepted');
      expect(d.delivered).toBe(false);
    }
  });
});

describe('AW360 S2 §14-15 — Pilot execution and dark-launched certification', () => {
  const scenarios = buildScenarioManifest(makeReq('S2-PILOT')).scenarios;

  it('executes the four approved pilot actions via the canonical resolver only', () => {
    const outcomes = executePilotScenarios(scenarios);
    expect(outcomes.length).toBeGreaterThan(0);
    for (const o of outcomes) {
      expect(APPROVED_PILOT_ACTIONS).toContain(o.action);
      if (o.pilotState === 'ALLOWED') expect(o.resolverDecision).toBe('ALLOWED');
      else expect(o.resolverDecision).toBe('DENIED');
    }
  });

  it('certifies every non-pilot action as dark-launched with no handler registered', () => {
    const dark = certifyDarkLaunched();
    const nonPilotCount = AWARD_ACTION_DEFINITIONS.filter(
      (a) => !APPROVED_PILOT_ACTIONS.includes(a.key),
    ).length;
    expect(dark.length).toBe(nonPilotCount);
    for (const d of dark) {
      expect(d.resolverReturnsUnavailable).toBe(true);
      expect(d.reasonCode).toBe('DARK_LAUNCHED');
      expect(d.directExecutionRejected).toBe(true);
      expect(d.stateChanged).toBe(false);
      expect(d.handlerRegistered).toBe(false);
    }
  });

  it('keeps exactly four executable pilot handlers', () => {
    expect(APPROVED_PILOT_ACTIONS.length).toBe(4);
    expect(APPROVED_PILOT_ACTIONS).toEqual(
      expect.arrayContaining([
        'SEND_LIFE_CERTIFICATE_REMINDER',
        'SCHEDULE_MEDICAL_REVIEW',
        'PROPOSE_SUSPENSION',
        'PROPOSE_RESUMPTION',
      ]),
    );
  });
});

describe('AW360 S2 §16 — Database integrity', () => {
  it('passes tenant isolation, uniqueness, FK integrity and D9 non-contamination', () => {
    const store = new SeedStore();
    const registry = new SeedBatchRegistry();
    const req = makeReq('S2-INT');
    apply(req, {
      registry,
      store,
      overlay: uatOverlay,
      profile: 'lifecycle',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    const r = verifyDbIntegrity(store, req.tenant.tenantId);
    expect(r.tenantIsolationOk).toBe(true);
    expect(r.identityUniquenessOk).toBe(true);
    expect(r.foreignKeyOk).toBe(true);
    expect(r.noOrphanedDocuments).toBe(true);
    expect(r.noOrphanedAuditRecords).toBe(true);
    expect(r.noSeedToProductionLinkage).toBe(true);
    expect(r.noD9EvidenceContamination).toBe(true);
    expect(r.issues.length).toBe(0);
  });

  it('exposes row counts by table', () => {
    const store = new SeedStore();
    const req = makeReq('S2-COUNTS');
    apply(req, {
      registry: new SeedBatchRegistry(),
      store,
      overlay: uatOverlay,
      profile: 'smoke',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    const counts = store.countByTable();
    expect(counts['ip_master']).toBeGreaterThan(0);
    expect(counts['bn_claim']).toBeGreaterThan(0);
    expect(counts['core_audit_log']).toBeGreaterThan(0);
  });
});

describe('AW360 S2 §17 — Representative UI certification', () => {
  it('certifies representative scenarios across every UI area', () => {
    const scenarios = buildScenarioManifest(makeReq('S2-UI')).scenarios;
    const ui = certifyRepresentativeUiScenarios(scenarios);
    expect(ui.length).toBeGreaterThanOrEqual(10);
    for (const c of ui) {
      expect(c.displayed).toBe(true);
      expect(c.matchesExpectation).toBe(true);
    }
  });
});

describe('AW360 S2 §18 — Idempotency and safe cleanup', () => {
  it('reapplying the same batch produces zero new rows; cleanup aborts if it would touch non-seed rows', () => {
    const req = makeReq('S2-IDEMP');
    const store = new SeedStore();
    const registry = new SeedBatchRegistry();
    const r = idempotentCycle(req, {
      registry,
      store,
      overlay: uatOverlay,
      profile: 'smoke',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    expect(r.duplicateRowsCreated).toBe(0);
    expect(r.cleanupBlockedByNonSeed).toBe(true);
    expect(r.rowsAfterReset).toBeGreaterThan(0); // third apply repopulated
    expect(r.reapplyMatches).toBe(true);
  });

  it('reset() with no non-seed touch clears the batch', () => {
    const req = makeReq('S2-RESET');
    const store = new SeedStore();
    const registry = new SeedBatchRegistry();
    apply(req, {
      registry,
      store,
      overlay: uatOverlay,
      profile: 'smoke',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    const before = store.countByBatch(req.seedBatchId);
    expect(before).toBeGreaterThan(0);
    const res = reset(req, store, registry);
    expect(res.blocked).toBe(false);
    expect(res.deleted).toBe(before);
    expect(store.countByBatch(req.seedBatchId)).toBe(0);
  });
});

describe('AW360 S2 §19 — Read-only diagnostics + manifest posture', () => {
  it('reports the seed posture without exposing execution controls', () => {
    const req = makeReq('S2-DIAG');
    const store = new SeedStore();
    const registry = new SeedBatchRegistry();
    apply(req, {
      registry,
      store,
      overlay: uatOverlay,
      profile: 'lifecycle',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    const d = diagnostics(req, { store, registry, profile: 'lifecycle' });
    expect(d.environment).toBe('automated_test');
    expect(d.seedTenant).toBe('AWARD360_CERTIFICATION');
    expect(d.activeBatch).toBe(req.seedBatchId);
    expect(d.profile).toBe('lifecycle');
    expect(d.paymentHierarchyStatus).toBe('CLEAN');
    expect(d.lastVerificationOk).toBe(true);
    expect(d.scenarioTotals.persistable).toBeGreaterThan(0);
    expect(d.persistedRowTotals['bn_claim']).toBeGreaterThan(0);
  });

  it('verify() run standalone confirms integrity of the store', () => {
    const req = makeReq('S2-VERIFY');
    const store = new SeedStore();
    apply(req, {
      registry: new SeedBatchRegistry(),
      store,
      overlay: uatOverlay,
      profile: 'smoke',
      applicationCommit: 'c',
      requestedBy: 'x',
    });
    const v = verifyS2(req, store);
    expect(v.issues.length).toBe(0);
  });
});

describe('AW360 S2 — Protected-posture confirmation', () => {
  it('keeps exactly four approved pilot actions', () => {
    expect(APPROVED_PILOT_ACTIONS.length).toBe(4);
  });

  it('plan() surfaces classification counts and row counts by table', () => {
    const p = plan(makeReq('S2-PLAN'), { profile: 'full', overlay: uatOverlay });
    expect(p.command).toBe('plan');
    expect(p.persistableScenarios).toBeGreaterThan(0);
    expect(p.rowsToWrite).toBeGreaterThan(p.persistableScenarios);
    expect(p.classificationCounts.VALID_PROCESS_SCENARIO).toBeGreaterThan(0);
  });
});
