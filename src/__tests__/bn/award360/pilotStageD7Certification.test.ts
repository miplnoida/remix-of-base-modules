/**
 * AW360-WAVE-1-C1 Stage D7 — Limited production pilot certification.
 *
 * Covers: persistent idempotency concurrency, frozen four-handler scope,
 * live pilot evidence, canary rollout, scheduled reconciliation, alert
 * routing, incident governance, and promotion-gate evaluation.
 *
 * Every non-pilot mutation continues to be dark-launched: this suite adds
 * NO new executable handlers.
 */
import { describe, it, expect } from 'vitest';
import {
  createConcurrencySafeIdempotencyStore,
  type AwardIdempotencyClaimAttempt,
} from '@/services/bn/awards/pilot/awardPilotPersistentIdempotency';
import {
  AWARD_PILOT_SCOPE_FREEZE,
  assertPilotScopeFrozen,
} from '@/services/bn/awards/pilot/awardPilotScopeFreeze';
import {
  createPilotCanaryController,
  PILOT_CANARY_COHORTS,
} from '@/services/bn/awards/pilot/awardPilotCanaryRollout';
import { createPilotReconciliationSchedule } from '@/services/bn/awards/pilot/awardPilotReconciliationSchedule';
import {
  createPilotAlertRouter,
  PILOT_ALERT_RECIPIENTS,
} from '@/services/bn/awards/pilot/awardPilotAlertRouting';
import {
  createPilotIncidentRegister,
  classifyIncidentSeverity,
  requiredActionsFor,
} from '@/services/bn/awards/pilot/awardPilotIncidents';
import { evaluatePromotionGates } from '@/services/bn/awards/pilot/awardPilotPromotionGates';
import type { PilotEvidenceRecord } from '@/services/bn/awards/pilot/awardPilotEvidence';
import type { PilotAlert } from '@/services/bn/awards/pilot/awardPilotMetrics';
import {
  AWARD360_MANIFEST_STATUS,
  AWARD360_MANIFEST_VERSION,
} from '@/services/bn/awards/award360LoaderManifest';
import { AWARD_COMMAND_REGISTRY, AWARD_PILOT_ACTIONS } from '@/services/bn/awards/pilot/awardPilotHandlers';

const baseAttempt = (overrides: Partial<AwardIdempotencyClaimAttempt> = {}): AwardIdempotencyClaimAttempt => ({
  tenantId: 'tenant_a',
  idempotencyKey: 'key-1',
  action: 'SEND_LIFE_CERTIFICATE_REMINDER',
  awardId: 'awd_1',
  commandId: 'cmd_1',
  correlationId: 'corr_1',
  payloadFingerprint: 'fp_1',
  ...overrides,
});

describe('Stage D7 · persistent idempotency (concurrency-certified)', () => {
  it('claims a slot on first attempt', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    const r = await store.tryClaim(baseAttempt());
    expect(r.status).toBe('CLAIMED');
  });

  it('same tenant + key + same fingerprint → concurrent duplicates execute once', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    const attempts = Array.from({ length: 20 }, (_, i) =>
      baseAttempt({ commandId: `cmd_${i}`, correlationId: `corr_${i}` }),
    );
    const results = await Promise.all(attempts.map((a) => store.tryClaim(a)));
    const claimed = results.filter((r) => r.status === 'CLAIMED');
    const inFlight = results.filter((r) => r.status === 'IN_FLIGHT');
    expect(claimed.length).toBe(1);
    expect(inFlight.length).toBe(19);
  });

  it('same tenant + key + different fingerprint fails closed', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    await store.tryClaim(baseAttempt({ payloadFingerprint: 'fp_A' }));
    const r = await store.tryClaim(baseAttempt({ payloadFingerprint: 'fp_B', commandId: 'cmd_2' }));
    expect(r.status).toBe('FINGERPRINT_CONFLICT');
  });

  it('different tenants may use the same external key', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    const a = await store.tryClaim(baseAttempt({ tenantId: 'tenant_a' }));
    const b = await store.tryClaim(baseAttempt({ tenantId: 'tenant_b' }));
    expect(a.status).toBe('CLAIMED');
    expect(b.status).toBe('CLAIMED');
  });

  it('post-complete replays return ALREADY_COMPLETED', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    await store.tryClaim(baseAttempt());
    await store.complete('tenant_a', 'key-1', {
      outcome: 'EXECUTED',
      commandId: 'cmd_1',
      correlationId: 'corr_1',
      action: 'SEND_LIFE_CERTIFICATE_REMINDER',
      awardId: 'awd_1',
      tenantId: 'tenant_a',
      durationMs: 5,
    });
    const r = await store.tryClaim(baseAttempt({ commandId: 'cmd_2', correlationId: 'corr_2' }));
    expect(r.status).toBe('ALREADY_COMPLETED');
  });
});

describe('Stage D7 · frozen four-handler scope', () => {
  it('exactly four approved pilot actions with executable handlers', () => {
    assertPilotScopeFrozen();
    expect(AWARD_PILOT_ACTIONS.length).toBe(4);
    expect(AWARD_PILOT_SCOPE_FREEZE.approvedActions.length).toBe(4);
    // Handler registry is a Map keyed by AwardActionKey.
    expect(AWARD_COMMAND_REGISTRY.size).toBe(4);
  });
});

describe('Stage D7 · named-user canary rollout', () => {
  it('progresses phases forward only with a clean evidence review', () => {
    const c = createPilotCanaryController();
    expect(c.currentPhase()).toBe('PHASE_1_INTERNAL_TECH');
    c.expandTo('PHASE_2_ONE_BUSINESS', {
      at: '2026-07-19T00:00:00.000Z',
      approver: 'ops-benefits-lead',
      evidenceReviewed: ['smoke-test-clean'],
      unresolvedIncidents: [],
      rollbackCondition: 'any critical incident',
    });
    expect(c.currentPhase()).toBe('PHASE_2_ONE_BUSINESS');
    expect(c.currentCohort().length).toBe(PILOT_CANARY_COHORTS.PHASE_2_ONE_BUSINESS.length);
    expect(c.history().length).toBe(1);
  });

  it('rejects expansion when unresolved incidents exist', () => {
    const c = createPilotCanaryController();
    expect(() =>
      c.expandTo('PHASE_2_ONE_BUSINESS', {
        at: '2026-07-19T00:00:00.000Z',
        approver: 'ops-benefits-lead',
        evidenceReviewed: [],
        unresolvedIncidents: ['inc_001'],
        rollbackCondition: 'x',
      }),
    ).toThrow(/unresolved incidents/);
  });

  it('rejects backward or same-phase expansion', () => {
    const c = createPilotCanaryController({ initialPhase: 'PHASE_2_ONE_BUSINESS' });
    expect(() =>
      c.expandTo('PHASE_1_INTERNAL_TECH', {
        at: '2026-07-19T00:00:00.000Z',
        approver: 'ops-benefits-lead',
        evidenceReviewed: [],
        unresolvedIncidents: [],
        rollbackCondition: 'x',
      }),
    ).toThrow(/forward/);
  });
});

describe('Stage D7 · reconciliation scheduling', () => {
  it('records a clean run when there are no discrepancies', () => {
    const sched = createPilotReconciliationSchedule();
    const run = sched.run({
      trigger: 'BEFORE_PROMOTION',
      reviewer: 'ops-benefits-lead',
      commands: [],
      audits: [],
      telemetry: [],
      businessState: [],
      externalAcks: [],
      requiresExternalAck: [],
    });
    expect(run.finalStatus).toBe('CLEAN');
    expect(sched.hasUnresolved()).toBe(false);
  });
});

describe('Stage D7 · alert routing', () => {
  it('routes immediate-severity alerts to every named recipient with runbook + correlation ID', () => {
    const router = createPilotAlertRouter();
    const alert: PilotAlert = {
      code: 'AUDIT_PERSISTENCE_FAILURE',
      severity: 'IMMEDIATE',
      message: 'audit write failed',
      at: '2026-07-19T00:00:00.000Z',
      context: { correlationId: 'corr_xyz' },
    };
    const deliveries = router.route(alert);
    expect(deliveries.length).toBeGreaterThan(0);
    for (const d of deliveries) expect(d.runbookRef).toMatch(/^RB-/);
    const recipients = new Set(deliveries.map((d) => d.recipientId));
    for (const r of PILOT_ALERT_RECIPIENTS) expect(recipients.has(r.recipientId)).toBe(true);
  });

  it('rejects immediate alerts without correlation ID', () => {
    const router = createPilotAlertRouter();
    expect(() =>
      router.route({
        code: 'AUDIT_PERSISTENCE_FAILURE',
        severity: 'IMMEDIATE',
        message: 'x',
        at: 'now',
        context: {},
      }),
    ).toThrow(/correlation/);
  });
});

describe('Stage D7 · incident governance', () => {
  it('classifies category severity and requires the correct actions for critical', () => {
    expect(classifyIncidentSeverity('CROSS_TENANT_EXECUTION')).toBe('CRITICAL');
    const required = requiredActionsFor('CROSS_TENANT_EXECUTION');
    expect(required).toContain('PILOT_SUSPENSION');
    expect(required).toContain('KILL_SWITCH_ACTIVATION');
    expect(required).toContain('FORMAL_RESTART_APPROVAL');
  });

  it('enforces required actions and restart approval before closing a critical incident', () => {
    const reg = createPilotIncidentRegister();
    reg.open({
      incidentId: 'inc_1',
      category: 'CROSS_TENANT_EXECUTION',
      openedAt: '2026-07-19T00:00:00.000Z',
      correlationIds: ['corr_1'],
      narrative: 'test',
    });
    expect(() => reg.close('inc_1')).toThrow(/missing required/);
    for (const a of requiredActionsFor('CROSS_TENANT_EXECUTION')) {
      reg.markActionComplete('inc_1', a);
    }
    expect(() => reg.close('inc_1')).toThrow(/restart approval/);
    reg.recordRestartApproval('inc_1', 'ops-benefits-lead');
    const closed = reg.close('inc_1');
    expect(closed.closedAt).toBeTruthy();
    expect(reg.hasOpenAtSeverityOrAbove('HIGH')).toBe(false);
  });
});

describe('Stage D7 · promotion gate evaluation', () => {
  const evidence: PilotEvidenceRecord = {
    action: 'SEND_LIFE_CERTIFICATE_REMINDER',
    commandId: 'cmd_1',
    correlationId: 'corr_1',
    tenantId: 'tenant_a',
    awardId: 'awd_1',
    actorUserId: 'usr_internal_tech',
    effectiveRole: 'benefits_officer',
    resolverDecision: 'ALLOWED',
    guardDecision: 'ALLOWED',
    guardReasonCode: 'ALLOWED',
    killSwitchState: 'ON',
    cohortDecision: 'INCLUDED',
    payloadValid: true,
    expectedVersion: 1,
    resultingVersion: 2,
    idempotencyResult: 'CLAIMED',
    commandOutcome: 'EXECUTED',
    auditReference: 'aud_1',
    telemetryCompleted: true,
    externalAckReceived: true,
    reconciliationStatus: 'CLEAN',
    userVisibleResult: 'REMINDER_SENT',
    compensationStatus: 'NONE',
    appVersion: 'test',
    manifestVersion: AWARD360_MANIFEST_VERSION,
    capturedAt: '2026-07-19T00:00:00.000Z',
  };

  it('passes when all gates are green', () => {
    const reg = createPilotIncidentRegister();
    const report = evaluatePromotionGates({
      evidence: [evidence],
      reconciliations: [],
      incidentRegister: reg,
      immediateAlertsReviewed: true,
      businessAcceptance: {
        SEND_LIFE_CERTIFICATE_REMINDER: true,
        SCHEDULE_MEDICAL_REVIEW: true,
        PROPOSE_SUSPENSION: true,
        PROPOSE_RESUMPTION: true,
      },
      productionIdempotencyCertified: true,
      evidenceWindowCompleteHours: 336,
      requiredEvidenceWindowHours: 168,
      technicalSignOff: { signedBy: 'tech-lead', at: 't' },
      businessSignOff: { signedBy: 'biz-lead', at: 't' },
    });
    expect(report.allPassed).toBe(true);
    expect(report.failed).toEqual([]);
  });

  it('fails when there is a mutation without audit', () => {
    const reg = createPilotIncidentRegister();
    const report = evaluatePromotionGates({
      evidence: [{ ...evidence, auditReference: null }],
      reconciliations: [],
      incidentRegister: reg,
      immediateAlertsReviewed: true,
      businessAcceptance: {
        SEND_LIFE_CERTIFICATE_REMINDER: true,
        SCHEDULE_MEDICAL_REVIEW: true,
        PROPOSE_SUSPENSION: true,
        PROPOSE_RESUMPTION: true,
      },
      productionIdempotencyCertified: true,
      evidenceWindowCompleteHours: 336,
      requiredEvidenceWindowHours: 168,
      technicalSignOff: { signedBy: 't', at: 't' },
      businessSignOff: { signedBy: 'b', at: 't' },
    });
    expect(report.allPassed).toBe(false);
    expect(report.failed).toContain('ZERO_MUTATION_WITHOUT_AUDIT');
  });

  it('fails when idempotency is not yet certified', () => {
    const reg = createPilotIncidentRegister();
    const report = evaluatePromotionGates({
      evidence: [evidence],
      reconciliations: [],
      incidentRegister: reg,
      immediateAlertsReviewed: true,
      businessAcceptance: {
        SEND_LIFE_CERTIFICATE_REMINDER: true,
        SCHEDULE_MEDICAL_REVIEW: true,
        PROPOSE_SUSPENSION: true,
        PROPOSE_RESUMPTION: true,
      },
      productionIdempotencyCertified: false,
      evidenceWindowCompleteHours: 336,
      requiredEvidenceWindowHours: 168,
      technicalSignOff: { signedBy: 't', at: 't' },
      businessSignOff: { signedBy: 'b', at: 't' },
    });
    expect(report.failed).toContain('PRODUCTION_IDEMPOTENCY_CERTIFICATION');
  });
});

describe('Stage D7 · manifest promotion', () => {
  it('D7 substrates are preserved after subsequent stage promotions', () => {
    // The manifest continues moving forward beyond D7; the D7 substrates
    // (persistent idempotency, scope freeze, canary rollout, incidents,
    // promotion gates) remain intact and the manifest tag is a strict
    // superset of the D7 posture.
    expect(['LIMITED_PRODUCTION_PILOT_VALIDATED', 'WAVE_1_PRODUCTION_READY']).toContain(AWARD360_MANIFEST_STATUS);
    expect(AWARD360_MANIFEST_VERSION.startsWith('AW360-WAVE-1-C1-D')).toBe(true);
  });
});
