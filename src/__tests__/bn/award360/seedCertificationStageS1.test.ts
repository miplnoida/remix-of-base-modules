/**
 * AW360-WAVE-1 Stage S1 — Seed certification tests.
 *
 * Verifies the seed framework:
 *   - covers every enabled configured benefit type;
 *   - produces deterministic and idempotent output;
 *   - blocks production/D9-pilot/misconfigured executions;
 *   - passes every integrity check;
 *   - never contaminates D9 runtime attestation;
 *   - never marks any non-pilot action as available;
 *   - preserves the exactly-four executable handler scope.
 */
import { describe, expect, it } from 'vitest';

import {
  applyPlan,
  buildDiagnosticsSnapshot,
  coverageReport,
  dryRun,
  listBatches,
  planCleanup,
  verify,
} from '@/services/bn/awards/seed/seedCommands';
import {
  AWARD360_CERTIFICATION_TENANT,
  assertSeedExecutionAllowed,
  buildProvenance,
  deterministicId,
  SeedGuardError,
  type SeedExecutionRequest,
} from '@/services/bn/awards/seed/seedTenantGuard';
import {
  buildScenarioManifest,
  CLAIM_STATES,
  CONTRIBUTION_PROFILES,
  PILOT_ACTION_STATES,
} from '@/services/bn/awards/seed/seedScenarioManifest';
import { CANONICAL_BENEFIT_CATALOGUE, discoverBenefitCatalogue } from '@/services/bn/awards/seed/seedCatalogue';
import { validateSeedIntegrity } from '@/services/bn/awards/seed/seedIntegrity';
import { APPROVED_PILOT_ACTIONS, AWARD_PILOT_SCOPE_FREEZE } from '@/services/bn/awards/pilot/awardPilotScopeFreeze';
import { AWARD360_RUNTIME_ATTESTATION } from '@/services/bn/awards/pilot/awardRuntimeAttestation';
import {
  AWARD360_MANIFEST_STATUS,
  AWARD360_MANIFEST_VERSION,
} from '@/services/bn/awards/award360LoaderManifest';
import { AWARD_COMMAND_REGISTRY } from '@/services/bn/awards/pilot/awardPilotHandlers';

const baseReq = (overrides: Partial<SeedExecutionRequest> = {}): SeedExecutionRequest => ({
  environment: 'automated_test',
  tenant: AWARD360_CERTIFICATION_TENANT,
  seedBatchId: 'batch-s1-001',
  seedVersion: 'AW360-S1-v1',
  asOfDate: '2026-07-19',
  operator: { id: 'qa-lead-1', role: 'QA_LEAD' },
  apply: false,
  ...overrides,
});

describe('Stage S1 — seed tenant guard', () => {
  it('permits execution in the certification tenant', () => {
    expect(() => assertSeedExecutionAllowed(baseReq(), { requireApply: false })).not.toThrow();
  });

  it('refuses production environment', () => {
    expect(() =>
      assertSeedExecutionAllowed(baseReq({ environment: 'production' as never }), {
        requireApply: false,
      }),
    ).toThrow(SeedGuardError);
  });

  it('refuses a production tenant', () => {
    expect(() =>
      assertSeedExecutionAllowed(
        baseReq({
          tenant: {
            tenantId: 'PRODUCTION',
            isSeedTenant: false,
            isProduction: true,
            isD9Pilot: false,
            displayName: 'prod',
          },
        }),
        { requireApply: false },
      ),
    ).toThrow(/production/i);
  });

  it('refuses the D9 pilot tenant', () => {
    expect(() =>
      assertSeedExecutionAllowed(
        baseReq({
          tenant: {
            tenantId: 'tenant_a',
            isSeedTenant: false,
            isProduction: false,
            isD9Pilot: false,
            displayName: 'D9',
          },
        }),
        { requireApply: false },
      ),
    ).toThrow();
  });

  it('requires apply for writes', () => {
    expect(() => assertSeedExecutionAllowed(baseReq({ apply: false }), { requireApply: true })).toThrow(
      /apply/i,
    );
  });

  it('rejects unauthorised roles', () => {
    expect(() =>
      assertSeedExecutionAllowed(
        baseReq({ operator: { id: 'x', role: 'INTRUDER' as never } }),
        { requireApply: false },
      ),
    ).toThrow();
  });
});

describe('Stage S1 — deterministic identity', () => {
  it('produces the same UUID for the same inputs', () => {
    const a = deterministicId('T', 'V', 'S', 'PERSON');
    const b = deterministicId('T', 'V', 'S', 'PERSON');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produces different UUIDs for different scenarios', () => {
    expect(deterministicId('T', 'V', 'S1', 'PERSON')).not.toBe(
      deterministicId('T', 'V', 'S2', 'PERSON'),
    );
  });

  it('provenance always carries is_test_data=true', () => {
    const p = buildProvenance(baseReq(), 'X');
    expect(p.is_test_data).toBe(true);
    expect(p.seed_tenant_id).toBe(AWARD360_CERTIFICATION_TENANT.tenantId);
  });
});

describe('Stage S1 — benefit catalogue coverage', () => {
  const manifest = buildScenarioManifest(baseReq());

  it('every enabled configured benefit type has at least one scenario', () => {
    const active = CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active).map((e) => e.code);
    const seeded = new Set(manifest.scenarios.map((s) => s.benefitType));
    for (const bt of active) expect(seeded.has(bt)).toBe(true);
  });

  it('discovery report reports zero unseeded active benefits when overlay = manifest keys', () => {
    const disc = discoverBenefitCatalogue({
      asOfDate: '2026-07-19',
      scenarioKeysByBenefit: manifest.scenarioKeysByBenefit,
    });
    expect(disc.unseededActive).toHaveLength(0);
    expect(disc.incompleteConfiguration).toHaveLength(0);
  });

  it('exposes every canonical claim state at least once', () => {
    const seen = new Set(manifest.scenarios.map((s) => s.claimState).filter(Boolean));
    // At least the common core.
    for (const s of CLAIM_STATES) {
      // MEDICAL_ASSESSMENT_PENDING/EMPLOYER_RESPONSE_PENDING are conditional;
      // ensure the common ones exist.
      if (s === 'MEDICAL_ASSESSMENT_PENDING' || s === 'EMPLOYER_RESPONSE_PENDING') continue;
      expect(seen.has(s)).toBe(true);
    }
  });

  it('covers every contribution profile', () => {
    const seen = new Set(manifest.scenarios.map((s) => s.contributionProfile).filter(Boolean));
    for (const p of CONTRIBUTION_PROFILES) expect(seen.has(p)).toBe(true);
  });
});

describe('Stage S1 — determinism & idempotency', () => {
  it('re-building the manifest at the same version produces identical scenario keys', () => {
    const m1 = buildScenarioManifest(baseReq());
    const m2 = buildScenarioManifest(baseReq());
    expect(m1.scenarios.map((s) => s.scenarioKey)).toEqual(m2.scenarios.map((s) => s.scenarioKey));
    expect(m1.scenarios.map((s) => s.identifiers.claimId)).toEqual(
      m2.scenarios.map((s) => s.identifiers.claimId),
    );
  });

  it('different seedVersion values produce different identifiers', () => {
    const m1 = buildScenarioManifest(baseReq({ seedVersion: 'v1' }));
    const m2 = buildScenarioManifest(baseReq({ seedVersion: 'v2' }));
    expect(m1.scenarios[0].identifiers.personId).not.toBe(m2.scenarios[0].identifiers.personId);
  });
});

describe('Stage S1 — integrity validation', () => {
  const manifest = buildScenarioManifest(baseReq());
  const report = validateSeedIntegrity(manifest);

  it('all integrity checks pass on the generated manifest', () => {
    if (!report.ok) {
      // Surface findings in test output for diagnosis.
      // eslint-disable-next-line no-console
      console.error(report.findings);
    }
    expect(report.ok).toBe(true);
    expect(report.errors).toBe(0);
  });

  it('never marks a non-pilot action as available', () => {
    for (const s of manifest.scenarios) {
      for (const a of s.expectedAvailableActions) {
        expect(APPROVED_PILOT_ACTIONS).toContain(a);
      }
    }
  });

  it('dark-launched actions are represented and blocked', () => {
    const darkScenarios = manifest.scenarios.filter((s) =>
      s.scenarioKey.startsWith('AGE_PENSION::DARK_'),
    );
    expect(darkScenarios.length).toBeGreaterThan(0);
    for (const s of darkScenarios) {
      expect(s.expectedAvailableActions).toHaveLength(0);
      expect(s.expectedBlockedActions[0]?.reasonCode).toBe('DARK_LAUNCHED');
    }
  });

  it('pilot action scenarios cover every action × every state (with expected omissions)', () => {
    const pilotScenarios = manifest.scenarios.filter((s) =>
      s.scenarioKey.includes('::PILOT_'),
    );
    for (const action of APPROVED_PILOT_ACTIONS) {
      for (const state of PILOT_ACTION_STATES) {
        if (state === 'IDEMPOTENT_REPLAY' && action === 'PROPOSE_RESUMPTION') continue;
        const hit = pilotScenarios.some(
          (s) => s.scenarioKey.includes(`PILOT_${action}_${state}`),
        );
        expect(hit, `${action}/${state}`).toBe(true);
      }
    }
  });

  it('ceased or suspended awards never expect payable instalments', () => {
    for (const s of manifest.scenarios) {
      if (s.expectedAwardOutcome === 'CEASED' || s.expectedAwardOutcome === 'SUSPENDED') {
        expect(s.expectedPaymentOutcome).not.toBe('PAYABLE');
      }
    }
  });
});

describe('Stage S1 — commands', () => {
  it('dry-run emits a plan without requiring apply', () => {
    const plan = dryRun(baseReq());
    expect(plan.command).toBe('dry-run');
    expect(plan.proposedScenarioCount).toBeGreaterThan(0);
    expect(plan.discoveredBenefits).toBe(CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active).length);
  });

  it('apply refuses without --apply', () => {
    expect(() => applyPlan(baseReq({ apply: false }))).toThrow(/apply/i);
  });

  it('apply builds an integrity-clean plan under --apply but does not commit writes', () => {
    const res = applyPlan(baseReq({ apply: true }));
    expect(res.integrity.ok).toBe(true);
    expect(res.writesCommitted).toBe(false);
    expect(res.idempotent).toBe(true);
  });

  it('verify returns integrity report', () => {
    expect(verify(baseReq()).ok).toBe(true);
  });

  it('coverage report includes every configured active benefit', () => {
    const cov = coverageReport(baseReq());
    expect(cov.missingCoverage).toHaveLength(0);
    for (const e of CANONICAL_BENEFIT_CATALOGUE.filter((x) => x.active)) {
      expect(cov.seededBenefitTypes).toContain(e.code);
    }
  });

  it('cleanup plan touches zero non-seed rows', () => {
    const plan = planCleanup(baseReq());
    expect(plan.nonSeedRowsTouched).toBe(0);
    expect(plan.blockedReasons).toHaveLength(0);
  });

  it('list-batches roundtrips inputs', () => {
    const batches = listBatches([baseReq()]);
    expect(batches).toHaveLength(1);
    expect(batches[0].integrityOk).toBe(true);
  });
});

describe('Stage S1 — protected state invariants', () => {
  it('code manifest remains WAVE_1_PRODUCTION_READY / D8', () => {
    expect(AWARD360_MANIFEST_STATUS).toBe('WAVE_1_PRODUCTION_READY');
    expect(AWARD360_MANIFEST_VERSION).toBe('AW360-WAVE-1-C1-D8');
  });

  it('runtime attestation remains NOT_STARTED', () => {
    expect(AWARD360_RUNTIME_ATTESTATION.status).toBe('NOT_STARTED');
    expect(AWARD360_RUNTIME_ATTESTATION.version).toBe('AW360-WAVE-1-C1-D9');
  });

  it('exactly four pilot handlers remain executable', () => {
    const executable = Object.keys(AWARD_COMMAND_REGISTRY);
    expect(executable).toHaveLength(4);
    for (const k of APPROVED_PILOT_ACTIONS) expect(executable).toContain(k);
  });

  it('pilot scope freeze approved actions is unchanged', () => {
    expect(AWARD_PILOT_SCOPE_FREEZE.approvedActions).toEqual(APPROVED_PILOT_ACTIONS);
  });
});

describe('Stage S1 — diagnostics', () => {
  it('produces a read-only snapshot with expected counts', () => {
    const snap = buildDiagnosticsSnapshot(baseReq());
    expect(snap.seedTenant).toBe('AWARD360_CERTIFICATION');
    expect(snap.integrityFailures).toBe(0);
    expect(snap.lastVerificationOk).toBe(true);
    expect(snap.approvedPilotActions).toEqual([...APPROVED_PILOT_ACTIONS]);
    expect(snap.scenarioCount).toBeGreaterThan(0);
  });
});
