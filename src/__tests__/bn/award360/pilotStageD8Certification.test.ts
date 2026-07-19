/**
 * AW360-WAVE-1-C1 Stage D8 — Wave 1 production readiness certification.
 *
 * Certifies: database-native idempotency (concurrency + fingerprint +
 * tenant isolation + recovery + retention), frozen four-handler scope,
 * evidence window, per-action evidence, controlled volume ramps, rate
 * limiting & backpressure, reminder command vs. delivery lifecycle,
 * multi-instance scenarios, disaster recovery, security certification,
 * SLO evaluation, action-level promotion decisions, and manifest promotion.
 *
 * Non-pilot mutations remain dark-launched. NO new executable handlers.
 */
import { describe, it, expect } from 'vitest';
import {
  createConcurrencySafeIdempotencyStore,
  type AwardIdempotencyClaimAttempt,
} from '@/services/bn/awards/pilot/awardPilotPersistentIdempotency';
import {
  APPROVED_PILOT_ACTIONS,
  assertPilotScopeFrozen,
} from '@/services/bn/awards/pilot/awardPilotScopeFreeze';
import { PILOT_IDEMPOTENCY_MIGRATION } from '@/services/bn/awards/pilot/awardPilotSupabaseIdempotency';
import {
  createPilotRateLimiter,
  AWARD_PILOT_RATE_LIMIT_RULES,
} from '@/services/bn/awards/pilot/awardPilotRateLimiter';
import {
  AWARD_PILOT_SLO_THRESHOLDS,
  evaluateSlo,
  percentiles,
  type AwardPilotSloMeasurements,
} from '@/services/bn/awards/pilot/awardPilotSlo';
import {
  AWARD_PILOT_EVIDENCE_WINDOW,
  evaluateEvidenceWindow,
} from '@/services/bn/awards/pilot/awardPilotEvidenceWindow';
import { createPerActionEvidenceStore } from '@/services/bn/awards/pilot/awardPilotPerActionEvidence';
import {
  createVolumeRampController,
  VOLUME_RAMP_STAGE_ORDER,
} from '@/services/bn/awards/pilot/awardPilotVolumeRamp';
import { createReminderLifecycleTracker } from '@/services/bn/awards/pilot/awardPilotReminderLifecycle';
import {
  AWARD_PILOT_MULTI_INSTANCE_SCENARIOS,
  certifyDuplicateAcrossInstances,
  certifyConflictingAcrossInstances,
  certifyAbandonedClaimRecovery,
  summariseMultiInstance,
} from '@/services/bn/awards/pilot/awardPilotMultiInstance';
import {
  DR_REQUIRED_DATASETS,
  certifyDrDrill,
} from '@/services/bn/awards/pilot/awardPilotDisasterRecovery';
import {
  SECURITY_REQUIRED_CONTROLS,
  certifySecurity,
} from '@/services/bn/awards/pilot/awardPilotSecurityCertification';
import { decideActionPromotion } from '@/services/bn/awards/pilot/awardPilotActionPromotion';
import { AWARD_PILOT_WAVE1_DIAGNOSTICS } from '@/services/bn/awards/pilot/awardPilotWave1Diagnostics';
import {
  AWARD360_MANIFEST_STATUS,
  AWARD360_MANIFEST_VERSION,
} from '@/services/bn/awards/award360LoaderManifest';
import { AWARD_COMMAND_REGISTRY } from '@/services/bn/awards/pilot/awardPilotHandlers';

const attempt = (o: Partial<AwardIdempotencyClaimAttempt> = {}): AwardIdempotencyClaimAttempt => ({
  tenantId: 'tenant_a',
  idempotencyKey: 'k1',
  action: 'SEND_LIFE_CERTIFICATE_REMINDER',
  awardId: 'awd_1',
  commandId: 'cmd_1',
  correlationId: 'corr_1',
  payloadFingerprint: 'fp_1',
  ...o,
});

describe('D8 · database-native persistent idempotency', () => {
  it('migration metadata declares unique constraint and tenant-scoped policies', () => {
    expect(PILOT_IDEMPOTENCY_MIGRATION.uniqueConstraint).toBe('(tenant_id, idempotency_key)');
    expect(PILOT_IDEMPOTENCY_MIGRATION.rlsEnabled).toBe(true);
    expect(PILOT_IDEMPOTENCY_MIGRATION.policies.length).toBeGreaterThanOrEqual(3);
    expect(PILOT_IDEMPOTENCY_MIGRATION.rollback).toMatch(/DROP TABLE/);
  });

  it('50 concurrent identical requests result in exactly one CLAIMED', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    const outcomes = await Promise.all(Array.from({ length: 50 }, () => store.tryClaim(attempt())));
    const claimed = outcomes.filter((o) => o.status === 'CLAIMED').length;
    const inFlight = outcomes.filter((o) => o.status === 'IN_FLIGHT').length;
    expect(claimed).toBe(1);
    expect(inFlight).toBe(49);
  });

  it('rejects fingerprint conflicts', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    await store.tryClaim(attempt({ payloadFingerprint: 'fpA' }));
    const r = await store.tryClaim(attempt({ payloadFingerprint: 'fpB' }));
    expect(r.status).toBe('FINGERPRINT_CONFLICT');
  });

  it('permits the same key across different tenants', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    const a = await store.tryClaim(attempt({ tenantId: 'tenant_a' }));
    const b = await store.tryClaim(attempt({ tenantId: 'tenant_b' }));
    expect(a.status).toBe('CLAIMED');
    expect(b.status).toBe('CLAIMED');
  });

  it('completed claims replay as ALREADY_COMPLETED', async () => {
    const store = createConcurrencySafeIdempotencyStore();
    await store.tryClaim(attempt());
    await store.complete('tenant_a', 'k1', { outcome: 'EXECUTED', newVersion: 2 } as never);
    const r = await store.tryClaim(attempt());
    expect(r.status).toBe('ALREADY_COMPLETED');
  });

  it('purges expired non-CLAIMED rows', async () => {
    const t0 = new Date('2026-07-01T00:00:00Z');
    const store = createConcurrencySafeIdempotencyStore({ retentionMs: 1000, now: () => t0 });
    await store.tryClaim(attempt());
    await store.complete('tenant_a', 'k1', { outcome: 'EXECUTED', newVersion: 1 } as never);
    const purged = await store.purgeExpired(new Date(t0.getTime() + 60_000));
    expect(purged).toBe(1);
  });
});

describe('D8 · frozen four-handler scope', () => {
  it('exactly four approved pilot actions remain executable', () => {
    expect(() => assertPilotScopeFrozen()).not.toThrow();
    expect(APPROVED_PILOT_ACTIONS.length).toBe(4);
    expect(AWARD_COMMAND_REGISTRY.size).toBe(4);
  });
});

describe('D8 · evidence window and per-action evidence', () => {
  it('window is incomplete before required drills and cycles', () => {
    const s = evaluateEvidenceWindow({
      now: new Date('2026-07-19T01:00:00Z'),
      killSwitchDrillDone: false,
      providerDegradationDrillDone: false,
      deploymentCycles: 0,
      authorisedBusinessUsers: 0,
    });
    expect(s.complete).toBe(false);
    expect(s.missing).toContain('KILL_SWITCH_DRILL');
    expect(s.missing).toContain('PROVIDER_DEGRADATION_DRILL');
  });

  it('window completes when all drills, cycles, users, and hours are met', () => {
    const s = evaluateEvidenceWindow({
      now: new Date('2026-08-05T00:00:00Z'),
      killSwitchDrillDone: true,
      providerDegradationDrillDone: true,
      deploymentCycles: 3,
      authorisedBusinessUsers: 5,
    });
    expect(s.complete).toBe(true);
    expect(s.elapsedHours).toBeGreaterThanOrEqual(AWARD_PILOT_EVIDENCE_WINDOW.minCalendarHours);
  });

  it('per-action evidence is tracked for each of the four approved actions', () => {
    const store = createPerActionEvidenceStore();
    for (const a of APPROVED_PILOT_ACTIONS) {
      store.update(a, { attempted: 30, successful: 28, denied: 2 });
    }
    expect(store.all().length).toBe(4);
    for (const row of store.all()) {
      expect(row.successful).toBe(28);
    }
  });
});

describe('D8 · volume ramp controller', () => {
  it('supports six declared expansion stages', () => {
    expect(VOLUME_RAMP_STAGE_ORDER.length).toBe(6);
  });

  it('rejects expansion when promotion gates fail', () => {
    const ctl = createVolumeRampController();
    const r = ctl.propose(
      {
        stage: 'ONE_BUSINESS_USER',
        actions: ['SEND_LIFE_CERTIFICATE_REMINDER'],
        priorLimit: 0,
        proposedLimit: 5,
        approvingBusinessOwner: 'biz@x',
        approvingTechnicalOwner: 'tech@x',
        evidenceReviewedAt: 't',
        incidentStateClear: true,
        reconciliationStateClear: true,
        rollbackTrigger: 'reconciliation discrepancy',
        effectiveAt: 't',
      },
      /* gatesPassed */ false,
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('PROMOTION_GATES_FAILED');
  });

  it('rejects same-owner (single-signature) expansions', () => {
    const ctl = createVolumeRampController();
    const r = ctl.propose(
      {
        stage: 'ONE_BUSINESS_USER',
        actions: ['SEND_LIFE_CERTIFICATE_REMINDER'],
        priorLimit: 0,
        proposedLimit: 5,
        approvingBusinessOwner: 'same@x',
        approvingTechnicalOwner: 'same@x',
        evidenceReviewedAt: 't',
        incidentStateClear: true,
        reconciliationStateClear: true,
        rollbackTrigger: 'x',
        effectiveAt: 't',
      },
      true,
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('DUAL_OWNER_REQUIRED');
  });

  it('accepts a well-formed expansion when gates pass', () => {
    const ctl = createVolumeRampController();
    const r = ctl.propose(
      {
        stage: 'NAMED_BUSINESS_COHORT',
        actions: ['SEND_LIFE_CERTIFICATE_REMINDER'],
        priorLimit: 5,
        proposedLimit: 25,
        approvingBusinessOwner: 'biz@x',
        approvingTechnicalOwner: 'tech@x',
        evidenceReviewedAt: 't',
        incidentStateClear: true,
        reconciliationStateClear: true,
        rollbackTrigger: 'reconciliation discrepancy',
        effectiveAt: 't',
      },
      true,
    );
    expect(r.accepted).toBe(true);
    expect(ctl.currentLimitFor('NAMED_BUSINESS_COHORT')).toBe(25);
  });
});

describe('D8 · rate limiting & backpressure', () => {
  it('returns RATE_LIMITED with retry information when actor budget exceeds', () => {
    const rl = createPilotRateLimiter();
    const base = { action: 'SEND_LIFE_CERTIFICATE_REMINDER' as const, tenantId: 't', actorUserId: 'u', awardId: 'a1', at: 1000 };
    let last: ReturnType<typeof rl.check> = { outcome: 'ALLOWED' };
    for (let i = 0; i < 40; i++) last = rl.check({ ...base, awardId: `a${i}` });
    expect(['RATE_LIMITED']).toContain(last.outcome);
    if (last.outcome === 'RATE_LIMITED') {
      expect(last.retryAfterMs).toBeGreaterThan(0);
      expect(last.reason).toMatch(/LIMIT/);
    }
  });

  it('enforces per-award concurrent limit', () => {
    const rl = createPilotRateLimiter([
      { scope: 'CONCURRENT', windowMs: 0, max: 1, retryAfterMs: 250 },
    ]);
    const a = rl.check({ action: 'PROPOSE_SUSPENSION', tenantId: 't', actorUserId: 'u', awardId: 'awd', at: 0 });
    const b = rl.check({ action: 'PROPOSE_SUSPENSION', tenantId: 't', actorUserId: 'u', awardId: 'awd', at: 0 });
    expect(a.outcome).toBe('ALLOWED');
    expect(b.outcome).toBe('RATE_LIMITED');
  });

  it('has rules covering all required scopes', () => {
    const scopes = new Set(AWARD_PILOT_RATE_LIMIT_RULES.map((r) => r.scope));
    for (const required of [
      'ACTOR', 'TENANT', 'AWARD', 'ACTION', 'PROVIDER', 'CONCURRENT',
      'QUEUED_REMINDER_DELIVERY', 'RECONCILIATION_BACKLOG',
    ]) expect(scopes.has(required as never)).toBe(true);
  });
});

describe('D8 · reminder command vs. delivery lifecycle', () => {
  it('tracks command acceptance independently of provider delivery', () => {
    const t = createReminderLifecycleTracker();
    t.recordCommandAccepted({ commandId: 'c1', correlationId: 'co1', idempotencyKey: 'k1', auditRef: 'a1' });
    t.recordQueued('c1', 'ob1');
    t.recordProviderAccepted('c1', 'pv-1');
    // Retry hitting the same commandId does NOT re-dispatch to provider (idempotency-guarded upstream)
    t.recordProviderAccepted('c1', 'pv-1');
    const dupes = t.duplicateProviderDispatches();
    expect(dupes).toContain('c1');
    t.recordDelivered('c1', '2026-07-20T00:00:00Z');
    const r = t.get('c1')!;
    expect(r.deliveryState).toBe('DELIVERED');
    expect(r.auditRef).toBe('a1');
    expect(r.providerRef).toBe('pv-1');
  });
});

describe('D8 · multi-instance certification', () => {
  it('two independent instances sharing one store elect exactly one claim', async () => {
    const shared = createConcurrencySafeIdempotencyStore();
    const r = await certifyDuplicateAcrossInstances(shared, attempt());
    expect(r.duplicateBusinessEffect).toBe(false);
  });

  it('conflicting fingerprints on different instances are detected', async () => {
    const shared = createConcurrencySafeIdempotencyStore();
    const r = await certifyConflictingAcrossInstances(shared, attempt());
    expect(r.duplicateBusinessEffect).toBe(false);
  });

  it('abandoned claim is safely recoverable (never re-executes)', async () => {
    const shared = createConcurrencySafeIdempotencyStore();
    const r = await certifyAbandonedClaimRecovery(shared, attempt());
    expect(r.duplicateBusinessEffect).toBe(false);
  });

  it('summary passes when two instances covered with zero duplicate effects', () => {
    const s = summariseMultiInstance(2, [
      { scenario: 'DUPLICATE_REQUESTS_DIFFERENT_INSTANCES', duplicateBusinessEffect: false, notes: '' },
      { scenario: 'PROCESS_TERMINATION_AFTER_CLAIM', duplicateBusinessEffect: false, notes: '' },
    ]);
    expect(s.passed).toBe(true);
  });

  it('enumerates all nine required scenarios', () => {
    expect(AWARD_PILOT_MULTI_INSTANCE_SCENARIOS.length).toBe(9);
  });
});

describe('D8 · disaster recovery certification', () => {
  it('fails when a required dataset is not restored', () => {
    const r = certifyDrDrill({
      drillId: 'dr-1', executedAt: 't',
      datasetsBackedUp: DR_REQUIRED_DATASETS,
      datasetsRestored: DR_REQUIRED_DATASETS.filter((d) => d !== 'AUDIT_RECORDS'),
      completedCommandsReplaySafe: true, idempotencyResultsAvailable: true,
      reconciliationSucceeds: true, noCompletedCommandReExecuted: true,
      killSwitchDefaultsSafe: true, manifestRegistryCompatible: true,
    });
    expect(r.passed).toBe(false);
    expect(r.missingDatasets).toContain('AUDIT_RECORDS');
  });

  it('passes when all datasets restore and post-restore invariants hold', () => {
    const r = certifyDrDrill({
      drillId: 'dr-2', executedAt: 't',
      datasetsBackedUp: DR_REQUIRED_DATASETS,
      datasetsRestored: DR_REQUIRED_DATASETS,
      completedCommandsReplaySafe: true, idempotencyResultsAvailable: true,
      reconciliationSucceeds: true, noCompletedCommandReExecuted: true,
      killSwitchDefaultsSafe: true, manifestRegistryCompatible: true,
    });
    expect(r.passed).toBe(true);
  });
});

describe('D8 · security certification', () => {
  it('blocks promotion when a CRITICAL finding is unresolved', () => {
    const r = certifySecurity({
      reviewedAt: 't', reviewer: 'sec',
      findings: [{ id: 'F-1', control: 'REPLAY_RESISTANCE', severity: 'CRITICAL', resolved: false, summary: 'x' }],
      controlsExercised: SECURITY_REQUIRED_CONTROLS,
    });
    expect(r.passed).toBe(false);
    expect(r.openBlockingFindings).toContain('F-1');
  });

  it('passes when all controls exercised with no open HIGH/CRITICAL findings', () => {
    const r = certifySecurity({
      reviewedAt: 't', reviewer: 'sec',
      findings: [{ id: 'F-2', control: 'ALERT_EXPOSURE', severity: 'LOW', resolved: false, summary: 'y' }],
      controlsExercised: SECURITY_REQUIRED_CONTROLS,
    });
    expect(r.passed).toBe(true);
  });
});

describe('D8 · SLO evaluation', () => {
  it('detects universal-invariant breaches', () => {
    const m: AwardPilotSloMeasurements = {
      serviceAvailabilityPct: 99.9,
      p50LatencyMs: 100, p95LatencyMs: 300, p99LatencyMs: 500,
      commandFailureRatePct: 0.1, auditPersistenceSuccessPct: 100,
      reconciliationCompletionMinutes: 5, alertDeliverySeconds: 10,
      providerAckSeconds: 2, incidentAckMinutes: 5, incidentRecoveryHours: 1,
      everySuccessHasAudit: true, everyCompletedCommandHasCorrelation: true,
      acceptedDuplicateBusinessEffects: 1,
      crossTenantExecutions: 0, unauthorisedExecutions: 0,
    };
    const r = evaluateSlo(m);
    expect(r.passed).toBe(false);
    expect(r.breaches).toContain('DUPLICATE_BUSINESS_EFFECT');
  });

  it('passes when every threshold and invariant is met', () => {
    const m: AwardPilotSloMeasurements = {
      serviceAvailabilityPct: 99.99,
      p50LatencyMs: 100, p95LatencyMs: 300, p99LatencyMs: 500,
      commandFailureRatePct: 0.1, auditPersistenceSuccessPct: 100,
      reconciliationCompletionMinutes: 5, alertDeliverySeconds: 10,
      providerAckSeconds: 2, incidentAckMinutes: 5, incidentRecoveryHours: 1,
      everySuccessHasAudit: true, everyCompletedCommandHasCorrelation: true,
      acceptedDuplicateBusinessEffects: 0, crossTenantExecutions: 0, unauthorisedExecutions: 0,
    };
    expect(evaluateSlo(m).passed).toBe(true);
  });

  it('computes percentiles', () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    const p = percentiles(sorted);
    expect(p.p50).toBeGreaterThan(0);
    expect(p.p95).toBeGreaterThan(p.p50);
    expect(p.p99).toBeGreaterThanOrEqual(p.p95);
  });

  it('thresholds are non-trivial', () => {
    expect(AWARD_PILOT_SLO_THRESHOLDS.p99LatencyMs).toBeGreaterThan(AWARD_PILOT_SLO_THRESHOLDS.p95LatencyMs);
    expect(AWARD_PILOT_SLO_THRESHOLDS.auditPersistenceSuccessPct).toBe(100);
  });
});

describe('D8 · action-level promotion decisions', () => {
  const passingSlo = evaluateSlo({
    serviceAvailabilityPct: 99.9, p50LatencyMs: 100, p95LatencyMs: 300, p99LatencyMs: 500,
    commandFailureRatePct: 0.1, auditPersistenceSuccessPct: 100,
    reconciliationCompletionMinutes: 5, alertDeliverySeconds: 10,
    providerAckSeconds: 2, incidentAckMinutes: 5, incidentRecoveryHours: 1,
    everySuccessHasAudit: true, everyCompletedCommandHasCorrelation: true,
    acceptedDuplicateBusinessEffects: 0, crossTenantExecutions: 0, unauthorisedExecutions: 0,
  });
  const passingSecurity = certifySecurity({
    reviewedAt: 't', reviewer: 's', findings: [], controlsExercised: SECURITY_REQUIRED_CONTROLS,
  });

  it('REQUIRES_REMEDIATION when a blocking gate fails', () => {
    const rec = decideActionPromotion({
      action: 'PROPOSE_SUSPENSION',
      evidence: {
        action: 'PROPOSE_SUSPENSION', attempted: 100, successful: 90, denied: 0,
        duplicateReplays: 0, versionConflicts: 0, validationFailures: 0,
        handlerFailures: 0, providerFailures: 0, compensationsApplied: 0,
        reconciliationDiscrepancies: 0, p50LatencyMs: 100, p95LatencyMs: 200, p99LatencyMs: 400,
        participatingUsers: ['u'], participatingTenants: ['t'], businessAccepted: true, openIncidents: 0,
      },
      window: AWARD_PILOT_EVIDENCE_WINDOW,
      evidencePeriodHours: 400,
      reconciliationClean: false, // blocking
      incidentsClear: true,
      sloEvaluation: passingSlo,
      securityResult: passingSecurity,
      businessSignOff: { by: 'b', at: 't' },
      technicalSignOff: { by: 't', at: 't' },
      operationalSignOff: { by: 'o', at: 't' },
    });
    expect(rec.decision).toBe('REQUIRES_REMEDIATION');
  });

  it('APPROVED_FOR_TENANT when all evidence, SLO, security, and tri-signoffs pass', () => {
    const rec = decideActionPromotion({
      action: 'SEND_LIFE_CERTIFICATE_REMINDER',
      evidence: {
        action: 'SEND_LIFE_CERTIFICATE_REMINDER', attempted: 100, successful: 90, denied: 0,
        duplicateReplays: 0, versionConflicts: 0, validationFailures: 0,
        handlerFailures: 0, providerFailures: 0, compensationsApplied: 0,
        reconciliationDiscrepancies: 0, p50LatencyMs: 100, p95LatencyMs: 200, p99LatencyMs: 400,
        participatingUsers: ['u'], participatingTenants: ['t'], businessAccepted: true, openIncidents: 0,
      },
      window: AWARD_PILOT_EVIDENCE_WINDOW,
      evidencePeriodHours: 400,
      reconciliationClean: true, incidentsClear: true,
      sloEvaluation: passingSlo, securityResult: passingSecurity,
      businessSignOff: { by: 'b', at: 't' },
      technicalSignOff: { by: 't', at: 't' },
      operationalSignOff: { by: 'o', at: 't' },
    });
    expect(rec.decision).toBe('APPROVED_FOR_TENANT');
    expect(rec.rollbackConditions.length).toBeGreaterThan(0);
  });

  it('REMAIN_PILOT when successful volume is below the per-action minimum', () => {
    const rec = decideActionPromotion({
      action: 'PROPOSE_RESUMPTION',
      evidence: {
        action: 'PROPOSE_RESUMPTION', attempted: 5, successful: 5, denied: 0,
        duplicateReplays: 0, versionConflicts: 0, validationFailures: 0,
        handlerFailures: 0, providerFailures: 0, compensationsApplied: 0,
        reconciliationDiscrepancies: 0, p50LatencyMs: 100, p95LatencyMs: 200, p99LatencyMs: 400,
        participatingUsers: ['u'], participatingTenants: ['t'], businessAccepted: false, openIncidents: 0,
      },
      window: AWARD_PILOT_EVIDENCE_WINDOW,
      evidencePeriodHours: 400,
      reconciliationClean: true, incidentsClear: true,
      sloEvaluation: passingSlo, securityResult: passingSecurity,
      businessSignOff: null, technicalSignOff: null, operationalSignOff: null,
    });
    expect(rec.decision).toBe('REMAIN_PILOT');
  });
});

describe('D8 · wave 1 diagnostics snapshot', () => {
  it('exposes all D8 substrates without mutating anything', () => {
    const s = AWARD_PILOT_WAVE1_DIAGNOSTICS;
    expect(s.approvedActions.length).toBe(4);
    expect(s.idempotencyMigration.uniqueConstraint).toBe('(tenant_id, idempotency_key)');
    expect(s.sloThresholds.auditPersistenceSuccessPct).toBe(100);
    expect(s.multiInstanceScenarios.length).toBe(9);
    expect(s.drRequiredDatasets.length).toBe(8);
    expect(s.securityControls.length).toBe(13);
  });
});

describe('D8 · manifest promotion', () => {
  it('manifest is promoted to WAVE_1_PRODUCTION_READY at D8 tag', () => {
    expect(AWARD360_MANIFEST_STATUS).toBe('WAVE_1_PRODUCTION_READY');
    expect(AWARD360_MANIFEST_VERSION).toBe('AW360-WAVE-1-C1-D8');
  });
});
