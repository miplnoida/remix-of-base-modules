/**
 * AW360-WAVE-1-C1 Stage D9 — Runtime attestation certification.
 *
 * Certifies the D9 substrate: runtime attestation lifecycle (kept separate
 * from the code manifest), deployed-environment verification, live database
 * + tenant policy verification, preservation-first rollback, real
 * multi-instance concurrency, runtime scope monitoring, controlled evidence
 * window, named-user rollout, live evidence contract, per-action operational
 * validation, live reconciliation, proven alert delivery, operational drills,
 * executed DR, runtime security review, runtime SLOs, and independent
 * per-action attestation decisions.
 */
import { describe, it, expect } from 'vitest';
import {
  AWARD360_MANIFEST_STATUS,
  AWARD360_MANIFEST_VERSION,
} from '@/services/bn/awards/award360LoaderManifest';
import {
  AWARD360_RUNTIME_ATTESTATION,
  AWARD360_RUNTIME_ATTESTATION_VERSION,
  transitionRuntimeAttestation,
} from '@/services/bn/awards/pilot/awardRuntimeAttestation';
import {
  verifyDeployedEnvironment,
  assertLocalRegistryMatchesApproved,
  type DeployedEnvironmentSnapshot,
} from '@/services/bn/awards/pilot/awardPilotDeploymentVerification';
import {
  evaluateDatabaseVerification,
  REQUIRED_TENANT_POLICY_SCENARIOS,
  type LiveTenantPolicyOutcome,
} from '@/services/bn/awards/pilot/awardPilotDatabaseVerification';
import {
  evaluateProductionRollback,
  PRODUCTION_ROLLBACK_RUNBOOK,
} from '@/services/bn/awards/pilot/awardPilotProductionRollback';
import {
  certifyRuntimeMultiInstance,
  RUNTIME_MI_EXPECTATIONS,
  type RuntimeMIObservation,
} from '@/services/bn/awards/pilot/awardPilotRuntimeMultiInstance';
import { runRuntimeScopeCheck } from '@/services/bn/awards/pilot/awardPilotRuntimeScopeMonitor';
import {
  validateRuntimeEvidenceWindow,
  evaluateEvidenceWindowProgress,
  type RuntimeEvidenceWindowConfig,
} from '@/services/bn/awards/pilot/awardPilotRuntimeEvidenceWindow';
import {
  createRolloutRegister,
  ROLLOUT_PHASE_ORDER,
} from '@/services/bn/awards/pilot/awardPilotNamedUserRollout';
import {
  assertNoSensitiveFields,
  evaluateLiveEvidenceCompleteness,
  LIVE_EVIDENCE_REQUIRED_FIELDS,
  type LiveEvidenceRecord,
} from '@/services/bn/awards/pilot/awardPilotLiveEvidence';
import {
  validateReminder,
  validateMedicalReview,
  validateProposal,
} from '@/services/bn/awards/pilot/awardPilotActionValidationRuntime';
import {
  createLiveReconciliationRegister,
  type LiveReconciliationRun,
} from '@/services/bn/awards/pilot/awardPilotLiveReconciliation';
import {
  evaluateAlertDelivery,
  REQUIRED_ALERT_INSTANCES,
  type AlertDeliveryEvidence,
} from '@/services/bn/awards/pilot/awardPilotAlertDelivery';
import {
  evaluateOperationalDrills,
  REQUIRED_OPERATIONAL_DRILLS,
} from '@/services/bn/awards/pilot/awardPilotOperationalDrills';
import {
  evaluateRuntimeDR,
  RUNTIME_DR_DATASETS,
} from '@/services/bn/awards/pilot/awardPilotRuntimeDR';
import {
  evaluateRuntimeSecurityReview,
  RUNTIME_SECURITY_CONTROLS,
} from '@/services/bn/awards/pilot/awardPilotRuntimeSecurity';
import { evaluateRuntimeSlo } from '@/services/bn/awards/pilot/awardPilotRuntimeSlo';
import {
  reconcileAllActionAttestations,
  validateActionAttestation,
  type ActionAttestation,
} from '@/services/bn/awards/pilot/awardPilotActionAttestation';
import { APPROVED_PILOT_ACTIONS } from '@/services/bn/awards/pilot/awardPilotScopeFreeze';
import { AWARD_PILOT_D9_DIAGNOSTICS } from '@/services/bn/awards/pilot/awardPilotD9Diagnostics';

const APPROVED = APPROVED_PILOT_ACTIONS;

// ─── Runtime attestation lifecycle (separate from code manifest) ─────────

describe('Stage D9 · runtime attestation lifecycle', () => {
  it('code manifest remains WAVE_1_PRODUCTION_READY / D8', () => {
    expect(AWARD360_MANIFEST_STATUS).toBe('WAVE_1_PRODUCTION_READY');
    expect(AWARD360_MANIFEST_VERSION).toBe('AW360-WAVE-1-C1-D8');
  });

  it('runtime attestation is NOT_STARTED at code ship time', () => {
    expect(AWARD360_RUNTIME_ATTESTATION.status).toBe('NOT_STARTED');
    expect(AWARD360_RUNTIME_ATTESTATION_VERSION).toBe('AW360-WAVE-1-C1-D9');
    expect(AWARD360_RUNTIME_ATTESTATION.codeManifestStatus).toBe('WAVE_1_PRODUCTION_READY');
    expect(AWARD360_RUNTIME_ATTESTATION.codeManifestVersion).toBe('AW360-WAVE-1-C1-D8');
  });

  it('legal transitions require a reason and follow the state machine', () => {
    const opened = transitionRuntimeAttestation({
      current: AWARD360_RUNTIME_ATTESTATION,
      to: 'IN_PROGRESS',
      at: '2026-07-20T00:00:00.000Z',
      reason: 'evidence window opened and approved by four owners',
    });
    expect(opened.status).toBe('IN_PROGRESS');
    expect(opened.openedAt).toBe('2026-07-20T00:00:00.000Z');

    expect(() => transitionRuntimeAttestation({
      current: AWARD360_RUNTIME_ATTESTATION,
      to: 'PASSED',
      at: '2026-07-20T00:00:00.000Z',
      reason: 'not permitted directly from NOT_STARTED',
    })).toThrow(/Illegal runtime-attestation transition/);

    expect(() => transitionRuntimeAttestation({
      current: opened,
      to: 'PASSED',
      at: '2026-08-01T00:00:00.000Z',
      reason: '',
    })).toThrow(/reason/);

    expect(() => transitionRuntimeAttestation({
      current: { ...opened, status: 'PASSED' },
      to: 'IN_PROGRESS',
      at: 'x',
      reason: 'terminal state',
    })).toThrow(/Illegal runtime-attestation transition/);
  });
});

// ─── Deployed-environment verification ───────────────────────────────────

const BASE_SNAPSHOT: DeployedEnvironmentSnapshot = {
  environment: 'pilot',
  deploymentId: 'dep-2026-07-19-001',
  commitSha: 'abc123',
  manifestStatus: 'WAVE_1_PRODUCTION_READY',
  manifestVersion: 'AW360-WAVE-1-C1-D8',
  migrationVersion: '20260719000000_award_pilot_idempotency',
  databaseInstance: 'pilot-db',
  commandRegistrySize: APPROVED.length,
  registeredActions: [...APPROVED],
  killSwitchState: 'OFF',
  pilotCohort: ['usr_internal_tech'],
  telemetryDestination: 'telemetry-pilot',
  reconciliationSchedulerState: 'ACTIVE',
  alertDestinations: ['ops-benefits-lead@ssb.local'],
  diagnosticsExposeMutations: false,
  recordedAt: '2026-07-19T12:00:00.000Z',
};

describe('Stage D9 · deployed-environment verification', () => {
  it('passes when deployment matches expected manifest and scope', () => {
    const r = verifyDeployedEnvironment({
      snapshot: BASE_SNAPSHOT,
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      expectedCommitSha: 'abc123',
      expectedMigrationVersion: '20260719000000_award_pilot_idempotency',
      expectedKillSwitchStartState: 'OFF',
    });
    expect(r.passed).toBe(true);
  });

  it('fails on commit/manifest drift', () => {
    const r = verifyDeployedEnvironment({
      snapshot: { ...BASE_SNAPSHOT, commitSha: 'zzz' },
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      expectedCommitSha: 'abc123',
      expectedMigrationVersion: '20260719000000_award_pilot_idempotency',
      expectedKillSwitchStartState: 'OFF',
    });
    expect(r.failures.some((f) => f.code === 'COMMIT_MANIFEST_MISMATCH')).toBe(true);
  });

  it('fails on missing migration', () => {
    const r = verifyDeployedEnvironment({
      snapshot: { ...BASE_SNAPSHOT, migrationVersion: 'other' },
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      expectedCommitSha: 'abc123',
      expectedMigrationVersion: '20260719000000_award_pilot_idempotency',
      expectedKillSwitchStartState: 'OFF',
    });
    expect(r.failures.some((f) => f.code === 'MIGRATION_MISSING')).toBe(true);
  });

  it('fails on unapproved handler / registry drift', () => {
    const r = verifyDeployedEnvironment({
      snapshot: { ...BASE_SNAPSHOT, registeredActions: [...APPROVED, 'FINAL_SUSPEND_AWARD' as never], commandRegistrySize: APPROVED.length + 1 },
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      expectedCommitSha: 'abc123',
      expectedMigrationVersion: '20260719000000_award_pilot_idempotency',
      expectedKillSwitchStartState: 'OFF',
    });
    expect(r.failures.some((f) => f.code === 'UNAPPROVED_HANDLER')).toBe(true);
    expect(r.failures.some((f) => f.code === 'REGISTRY_DRIFT')).toBe(true);
  });

  it('fails when diagnostics expose mutations', () => {
    const r = verifyDeployedEnvironment({
      snapshot: { ...BASE_SNAPSHOT, diagnosticsExposeMutations: true },
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      expectedCommitSha: 'abc123',
      expectedMigrationVersion: '20260719000000_award_pilot_idempotency',
      expectedKillSwitchStartState: 'OFF',
    });
    expect(r.failures.some((f) => f.code === 'DIAGNOSTICS_EXPOSE_MUTATIONS')).toBe(true);
  });

  it('local process registry equals approved list', () => {
    expect(() => assertLocalRegistryMatchesApproved()).not.toThrow();
  });
});

// ─── Live database + tenant policy verification ──────────────────────────

describe('Stage D9 · database + tenant policy verification', () => {
  const okObject = {
    tableExists: true,
    compositePrimaryKey: true,
    requiredIndexesPresent: [
      'bn_award_pilot_idempotency_retention_idx',
      'bn_award_pilot_idempotency_correlation_idx',
      'bn_award_pilot_idempotency_award_idx',
    ],
    requiredIndexesMissing: [],
    rlsEnabled: true,
    policiesPresent: [
      'pilot idempotency same-tenant read',
      'pilot idempotency same-tenant insert',
      'pilot idempotency same-tenant update',
    ],
    policiesMissing: [],
    grantsPresent: ['authenticated:SELECT', 'authenticated:INSERT', 'authenticated:UPDATE', 'service_role:ALL'],
    grantsMissing: [],
    retentionMetadataAvailable: true,
    atomicClaimSupported: true,
  };
  const okOutcomes: LiveTenantPolicyOutcome[] = REQUIRED_TENANT_POLICY_SCENARIOS.map((s) => ({
    scenario: s,
    expected: s === 'AUTHENTICATED_TENANT_A_OWN_ROW' || s === 'AUTHENTICATED_TENANT_B_OWN_ROW'
      || s === 'SAME_KEY_DIFFERENT_TENANTS' || s === 'SERVER_SIDE_EXECUTION' ? 'ALLOWED' : 'DENIED',
    observed: s === 'AUTHENTICATED_TENANT_A_OWN_ROW' || s === 'AUTHENTICATED_TENANT_B_OWN_ROW'
      || s === 'SAME_KEY_DIFFERENT_TENANTS' || s === 'SERVER_SIDE_EXECUTION' ? 'ALLOWED' : 'DENIED',
    tenantAuthoritySource: 'DATABASE_CONTEXT',
    notes: '',
  }));

  it('passes when object + policy checks match expectations', () => {
    const r = evaluateDatabaseVerification(okObject, okOutcomes);
    expect(r.passed).toBe(true);
  });

  it('rejects tenant authority derived from client', () => {
    const outcomes = okOutcomes.map((o, i) => i === 0 ? { ...o, tenantAuthoritySource: 'CLIENT_CLAIM' as const } : o);
    const r = evaluateDatabaseVerification(okObject, outcomes);
    expect(r.passed).toBe(false);
    expect(r.failures.some((f) => f.includes('tenant authority derived from client'))).toBe(true);
  });

  it('fails on missing PK / RLS / grants / atomic claim', () => {
    const r = evaluateDatabaseVerification({
      ...okObject,
      compositePrimaryKey: false, rlsEnabled: false,
      grantsMissing: ['authenticated:INSERT'], atomicClaimSupported: false,
    }, okOutcomes);
    expect(r.passed).toBe(false);
    expect(r.failures).toEqual(expect.arrayContaining([
      'composite PK missing', 'RLS not enabled', expect.stringContaining('grants missing'), 'atomic-claim contract failed',
    ]));
  });

  it('fails when a required policy scenario is missing', () => {
    const r = evaluateDatabaseVerification(okObject, okOutcomes.slice(0, -1));
    expect(r.passed).toBe(false);
  });
});

// ─── Preservation-first production rollback ──────────────────────────────

describe('Stage D9 · preservation-first production rollback', () => {
  it('DROP TABLE is prohibited when the environment has live activity', () => {
    const r = evaluateProductionRollback(true, 'DROP_TABLE');
    expect(r.permitted).toBe(false);
    expect(r.requiredSteps).toContain('TABLE_DELETION_PROHIBITED');
  });

  it('DROP TABLE is permitted only in pre-production', () => {
    expect(evaluateProductionRollback(false, 'DROP_TABLE').permitted).toBe(true);
  });

  it('preservation-first app rollback is permitted with required steps', () => {
    const r = evaluateProductionRollback(true, 'APP_ROLLBACK_ONLY');
    expect(r.permitted).toBe(true);
    expect(r.requiredSteps).toEqual(expect.arrayContaining([
      'APPLICATION_ROLLBACK', 'SCHEMA_COMPATIBILITY_CHECK', 'RETAIN_IDEMPOTENCY_RECORDS',
      'REPLAY_SAFETY_VERIFICATION', 'POST_ROLLBACK_RECONCILIATION',
    ]));
  });

  it('runbook contains all seven canonical steps', () => {
    const ids = PRODUCTION_ROLLBACK_RUNBOOK.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([
      'APPLICATION_ROLLBACK', 'SCHEMA_COMPATIBILITY_CHECK', 'RETAIN_IDEMPOTENCY_RECORDS',
      'BACKUP_OR_EXPORT', 'REPLAY_SAFETY_VERIFICATION', 'POST_ROLLBACK_RECONCILIATION',
      'TABLE_DELETION_PROHIBITED',
    ]));
  });
});

// ─── Real multi-instance concurrency certification ───────────────────────

describe('Stage D9 · runtime multi-instance concurrency', () => {
  const ok = (): RuntimeMIObservation[] => RUNTIME_MI_EXPECTATIONS.map((e) => ({
    scenario: e.scenario,
    action: 'SEND_LIFE_CERTIFICATE_REMINDER',
    instances: 2,
    separateDbConnections: true,
    atomicClaimsGranted: e.atomicClaimsGranted ?? 1,
    businessMutationsApplied: e.businessMutationsApplied ?? 1,
    auditEventsWritten: e.auditEventsWritten ?? 1,
    duplicateBusinessEffects: 0,
    notes: 'runtime observation',
  }));

  it('certifies when every scenario is observed with two independent instances', () => {
    const r = certifyRuntimeMultiInstance(ok());
    expect(r.passed).toBe(true);
  });

  it('fails on shared DB connection', () => {
    const obs = ok().map((o, i) => i === 0 ? { ...o, separateDbConnections: false } : o);
    expect(certifyRuntimeMultiInstance(obs).passed).toBe(false);
  });

  it('fails on any duplicate business effect', () => {
    const obs = ok().map((o, i) => i === 0 ? { ...o, duplicateBusinessEffects: 1 } : o);
    const r = certifyRuntimeMultiInstance(obs);
    expect(r.passed).toBe(false);
    expect(r.failures.some((f) => f.reason.includes('duplicate business effects'))).toBe(true);
  });

  it('fails when the identical-race scenario grants more than one atomic claim', () => {
    const obs = ok().map((o) => o.scenario === 'SIMULTANEOUS_IDENTICAL_DIFFERENT_INSTANCES'
      ? { ...o, atomicClaimsGranted: 2 } : o);
    expect(certifyRuntimeMultiInstance(obs).passed).toBe(false);
  });
});

// ─── Runtime scope monitor ───────────────────────────────────────────────

describe('Stage D9 · runtime scope monitor', () => {
  it('reports frozen when runtime, inventory, and manifest all match', () => {
    const r = runRuntimeScopeCheck({
      runtimeManifestStatus: 'WAVE_1_PRODUCTION_READY',
      runtimeManifestVersion: 'AW360-WAVE-1-C1-D8',
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      runtimeActions: [...APPROVED],
      inventoryActions: [...APPROVED],
    });
    expect(r.frozen).toBe(true);
    expect(r.cohortExpansionAllowed).toBe(true);
    expect(r.requiredAlert).toBe(false);
  });

  it('reports drift and requires an alert on any unapproved handler', () => {
    const r = runRuntimeScopeCheck({
      runtimeManifestStatus: 'WAVE_1_PRODUCTION_READY',
      runtimeManifestVersion: 'AW360-WAVE-1-C1-D8',
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      runtimeActions: [...APPROVED, 'FINAL_SUSPEND_AWARD' as never],
      inventoryActions: [...APPROVED],
    });
    expect(r.frozen).toBe(false);
    expect(r.requiredAlert).toBe(true);
    expect(r.cohortExpansionAllowed).toBe(false);
    expect(r.findings.some((f) => f.kind === 'UNAPPROVED_HANDLER')).toBe(true);
  });

  it('reports drift on manifest mismatch', () => {
    const r = runRuntimeScopeCheck({
      runtimeManifestStatus: 'WAVE_1_PRODUCTION_READY',
      runtimeManifestVersion: 'D7',
      expectedManifestStatus: 'WAVE_1_PRODUCTION_READY',
      expectedManifestVersion: 'AW360-WAVE-1-C1-D8',
      runtimeActions: [...APPROVED],
      inventoryActions: [...APPROVED],
    });
    expect(r.findings.some((f) => f.kind === 'MANIFEST_RUNTIME_MISMATCH')).toBe(true);
  });
});

// ─── Controlled evidence window ──────────────────────────────────────────

const WINDOW: RuntimeEvidenceWindowConfig = {
  approvedTenant: 'tenant_a',
  approvedUsers: ['usr_internal_tech', 'usr_benefits_officer_a'],
  approvedRoles: ['benefits_officer'],
  startAt: '2026-07-20T00:00:00.000Z',
  endAt: '2026-08-03T00:00:00.000Z',
  minimumDurationHours: 14 * 24,
  maxDailyCommandsByAction: {
    SEND_LIFE_CERTIFICATE_REMINDER: 25, SCHEDULE_MEDICAL_REVIEW: 10,
    PROPOSE_SUSPENSION: 5, PROPOSE_RESUMPTION: 5,
  } as never,
  minimumEvidenceVolumeByAction: {
    SEND_LIFE_CERTIFICATE_REMINDER: 25, SCHEDULE_MEDICAL_REVIEW: 25,
    PROPOSE_SUSPENSION: 25, PROPOSE_RESUMPTION: 25,
  } as never,
  reconciliationFrequencyHours: 24,
  businessReviewFrequencyDays: 7,
  killSwitchDrillDate: '2026-07-22T09:00:00.000Z',
  providerDegradationDrillDate: '2026-07-24T09:00:00.000Z',
  technicalOwner: 'tech-lead',
  businessOwner: 'business-lead',
  operationsOwner: 'ops-lead',
  securityReviewer: 'sec-reviewer',
  incidentOwner: 'ic-lead',
  promotionReviewDate: '2026-08-02T00:00:00.000Z',
  approvedAt: '2026-07-19T18:00:00.000Z',
  approvedBy: ['TECHNICAL', 'BUSINESS', 'OPERATIONS', 'SECURITY'],
};

describe('Stage D9 · controlled evidence window', () => {
  it('validates a properly-approved window', () => {
    expect(validateRuntimeEvidenceWindow(WINDOW).valid).toBe(true);
  });

  it('fails without all four approvers', () => {
    const r = validateRuntimeEvidenceWindow({ ...WINDOW, approvedBy: ['TECHNICAL', 'BUSINESS'] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('OPERATIONS'))).toBe(true);
  });

  it('fails if duration is below the minimum', () => {
    const r = validateRuntimeEvidenceWindow({ ...WINDOW, endAt: '2026-07-21T00:00:00.000Z' });
    expect(r.valid).toBe(false);
  });

  it('progress requires drills complete and per-action volume met', () => {
    const p = evaluateEvidenceWindowProgress({
      config: WINDOW,
      nowIso: '2026-08-03T00:00:00.000Z',
      killSwitchDrillCompleted: true,
      providerDegradationDrillCompleted: true,
      volumeByAction: {
        SEND_LIFE_CERTIFICATE_REMINDER: 30, SCHEDULE_MEDICAL_REVIEW: 30,
        PROPOSE_SUSPENSION: 30, PROPOSE_RESUMPTION: 30,
      } as never,
    });
    expect(p.complete).toBe(true);
  });

  it('is incomplete when drills are missing', () => {
    const p = evaluateEvidenceWindowProgress({
      config: WINDOW,
      nowIso: '2026-08-03T00:00:00.000Z',
      killSwitchDrillCompleted: false,
      providerDegradationDrillCompleted: true,
      volumeByAction: {
        SEND_LIFE_CERTIFICATE_REMINDER: 30, SCHEDULE_MEDICAL_REVIEW: 30,
        PROPOSE_SUSPENSION: 30, PROPOSE_RESUMPTION: 30,
      } as never,
    });
    expect(p.complete).toBe(false);
  });
});

// ─── Named-user rollout ──────────────────────────────────────────────────

describe('Stage D9 · named-user rollout', () => {
  it('permits sequential expansion with clean state', () => {
    const reg = createRolloutRegister();
    const rec = {
      fromPhase: null,
      toPhase: ROLLOUT_PHASE_ORDER[0],
      actions: [...APPROVED],
      previousCohort: [],
      newCohort: ['usr_internal_tech'],
      evidenceReviewed: ['recon-01'],
      reconciliationClean: true,
      openHighOrCriticalIncidents: 0,
      businessApprover: 'business-lead',
      technicalApprover: 'tech-lead',
      rollbackTrigger: 'kill-switch on any duplicate business effect',
      effectiveAt: '2026-07-20T09:00:00.000Z',
    };
    const d = reg.add(rec);
    expect(d.permitted).toBe(true);
    expect(reg.currentPhase()).toBe(ROLLOUT_PHASE_ORDER[0]);
  });

  it('blocks on unresolved incidents and unclean reconciliation', () => {
    const reg = createRolloutRegister();
    const d = reg.add({
      fromPhase: null,
      toPhase: ROLLOUT_PHASE_ORDER[0],
      actions: [...APPROVED],
      previousCohort: [], newCohort: ['x'],
      evidenceReviewed: [],
      reconciliationClean: false,
      openHighOrCriticalIncidents: 1,
      businessApprover: 'b', technicalApprover: 't',
      rollbackTrigger: 'x', effectiveAt: 'now',
    });
    expect(d.permitted).toBe(false);
    expect(d.blocked).toEqual(expect.arrayContaining(['reconciliation not clean', 'open HIGH/CRITICAL incidents']));
  });

  it('blocks non-sequential expansion', () => {
    const reg = createRolloutRegister();
    const d = reg.add({
      fromPhase: null,
      toPhase: ROLLOUT_PHASE_ORDER[2],
      actions: [...APPROVED],
      previousCohort: [], newCohort: ['x'],
      evidenceReviewed: [],
      reconciliationClean: true, openHighOrCriticalIncidents: 0,
      businessApprover: 'b', technicalApprover: 't',
      rollbackTrigger: 'x', effectiveAt: 'now',
    });
    expect(d.permitted).toBe(false);
    expect(d.blocked.some((b) => b.includes('sequential'))).toBe(true);
  });
});

// ─── Live evidence contract ──────────────────────────────────────────────

describe('Stage D9 · live evidence contract', () => {
  const rec: LiveEvidenceRecord = {
    action: 'SEND_LIFE_CERTIFICATE_REMINDER',
    commandId: 'cmd-1', correlationId: 'cor-1',
    tenantId: 'tenant_a', awardId: 'aw-1',
    actorUserId: 'usr_internal_tech', effectiveRole: 'benefits_officer',
    resolverDecision: 'ALLOWED', guardDecision: 'ALLOWED', guardReasonCode: 'ALLOWED',
    killSwitchState: 'OFF', cohortDecision: 'INCLUDED',
    payloadValid: true, expectedVersion: 1, resultingVersion: 2,
    idempotencyResult: 'CLAIMED', commandOutcome: 'EXECUTED',
    auditReference: 'aud-1', telemetryCompleted: true, externalAckReceived: true,
    reconciliationStatus: 'CLEAN', userVisibleResult: 'accepted',
    compensationStatus: 'NONE', appVersion: 'AW360-WAVE-1-C1-D8', manifestVersion: 'AW360-WAVE-1-C1-D8',
    capturedAt: '2026-07-21T00:00:00.000Z',
    deploymentId: 'dep-2026-07-19-001', commitSha: 'abc123', runtimeManifestVersion: 'AW360-WAVE-1-C1-D9',
  };

  it('classifies complete records', () => {
    expect(evaluateLiveEvidenceCompleteness(rec)).toBe('COMPLETE');
  });

  it('classifies incomplete records', () => {
    const bad = { ...rec, commitSha: '' };
    expect(evaluateLiveEvidenceCompleteness(bad)).toBe('INCOMPLETE');
  });

  it('rejects sensitive field names', () => {
    expect(() => assertNoSensitiveFields({ ...rec, password: 'x' } as never)).toThrow(/sensitive/);
    expect(() => assertNoSensitiveFields({ ...rec, ssn: '000' } as never)).toThrow(/sensitive/);
    expect(() => assertNoSensitiveFields({ ...rec, token: 't' } as never)).toThrow(/sensitive/);
  });

  it('required fields match diagnostics count', () => {
    expect(LIVE_EVIDENCE_REQUIRED_FIELDS.length).toBe(AWARD_PILOT_D9_DIAGNOSTICS.liveEvidenceRequiredFieldCount);
  });
});

// ─── Per-action operational validation ───────────────────────────────────

describe('Stage D9 · per-action operational validation', () => {
  it('validates a successful reminder', () => {
    const r = validateReminder({
      action: 'SEND_LIFE_CERTIFICATE_REMINDER',
      recipientCorrect: true, awardCorrect: true, templateCorrect: true,
      queueEntryPresent: true, providerAcceptance: true,
      deliveryStatus: 'DELIVERED', providerReferencePresent: true,
      duplicateProviderDeliveryAfterRetry: false,
      auditLinked: true, telemetryLinked: true,
      noteOnlyCorrectionOrSupersessionEvidenced: true,
    });
    expect(r.passed).toBe(true);
  });

  it('fails a reminder that duplicates provider delivery after retry', () => {
    const r = validateReminder({
      action: 'SEND_LIFE_CERTIFICATE_REMINDER',
      recipientCorrect: true, awardCorrect: true, templateCorrect: true,
      queueEntryPresent: true, providerAcceptance: true,
      deliveryStatus: 'DELIVERED', providerReferencePresent: true,
      duplicateProviderDeliveryAfterRetry: true,
      auditLinked: true, telemetryLinked: true,
      noteOnlyCorrectionOrSupersessionEvidenced: true,
    });
    expect(r.passed).toBe(false);
    expect(r.failures).toContain('duplicate provider delivery detected');
  });

  it('validates a successful medical review scheduling', () => {
    const r = validateMedicalReview({
      action: 'SCHEDULE_MEDICAL_REVIEW',
      reviewDateCorrect: true, responsibilityAssignmentCorrect: true,
      duplicateScheduleAvoided: true, cancellationOrRescheduleEvidenced: true,
      versionConsistent: true, auditComplete: true,
    });
    expect(r.passed).toBe(true);
  });

  it('fails a proposal that applied a final effect', () => {
    const r = validateProposal({
      action: 'PROPOSE_SUSPENSION',
      eligibilityCorrect: true, proposalStateOnly: true,
      noFinalEffectApplied: false,
      authorisedWithdrawalEvidenced: true, auditComplete: true, telemetryComplete: true,
    });
    expect(r.passed).toBe(false);
    expect(r.failures).toContain('final effect applied — proposal MUST NOT enact final state');
  });

  it('validates a successful resumption proposal', () => {
    const r = validateProposal({
      action: 'PROPOSE_RESUMPTION',
      eligibilityCorrect: true, proposalStateOnly: true,
      noFinalEffectApplied: true,
      authorisedWithdrawalEvidenced: true, auditComplete: true, telemetryComplete: true,
    });
    expect(r.passed).toBe(true);
  });
});

// ─── Live reconciliation ─────────────────────────────────────────────────

describe('Stage D9 · live reconciliation', () => {
  it('marks register clean when all runs are CLEAN/RESOLVED with zero unresolved', () => {
    const reg = createLiveReconciliationRegister();
    const run: LiveReconciliationRun = {
      runId: 'r1', trigger: 'ON_SCHEDULE',
      startedAt: 'a', completedAt: 'b', recordsInspected: 100,
      discrepanciesByClass: [],
      resolvedDiscrepancies: 0, unresolvedDiscrepancies: 0,
      reviewer: 'ops', finalStatus: 'CLEAN', notes: 'ok',
    };
    reg.add(run);
    expect(reg.isClean()).toBe(true);
    expect(reg.unresolvedCount()).toBe(0);
  });

  it('reports unresolved discrepancies and is not clean', () => {
    const reg = createLiveReconciliationRegister();
    reg.add({
      runId: 'r2', trigger: 'BEFORE_COHORT_EXPANSION',
      startedAt: 'a', completedAt: 'b', recordsInspected: 100,
      discrepanciesByClass: [{ class: 'VERSION_MISMATCH', count: 1 }],
      resolvedDiscrepancies: 0, unresolvedDiscrepancies: 1,
      reviewer: 'ops', finalStatus: 'UNRESOLVED', notes: 'blocking',
    });
    expect(reg.isClean()).toBe(false);
    expect(reg.unresolvedCount()).toBe(1);
  });
});

// ─── Proven alert delivery + acknowledgement ─────────────────────────────

describe('Stage D9 · proven alert delivery + acknowledgement', () => {
  const ev = (kind: AlertDeliveryEvidence['kind']): AlertDeliveryEvidence => ({
    kind, correlationId: `cor-${kind}`, runbookReference: 'RB-AW360-05',
    severity: 'IMMEDIATE',
    deliveredTo: ['ops-lead@ssb.local'],
    deliveredAt: '2026-07-22T10:00:00.000Z',
    acknowledgedBy: 'ops-lead@ssb.local', acknowledgedAt: '2026-07-22T10:01:00.000Z',
    assignedOwner: 'ops-lead@ssb.local',
    suspensionDecision: 'NONE',
    closureEvidence: 'incident closed', closedAt: '2026-07-22T11:00:00.000Z',
  });

  it('passes when every required instance is delivered, acknowledged, and closed', () => {
    const evidence = REQUIRED_ALERT_INSTANCES.map(ev);
    const r = evaluateAlertDelivery(evidence);
    expect(r.passed).toBe(true);
  });

  it('fails when an immediate alert has no closure', () => {
    const evidence = REQUIRED_ALERT_INSTANCES.map(ev).map((e, i) =>
      i === 0 ? { ...e, closedAt: null } : e,
    );
    const r = evaluateAlertDelivery(evidence);
    expect(r.passed).toBe(false);
    expect(r.missingClosure.length).toBeGreaterThan(0);
  });

  it('fails when runbook reference is malformed', () => {
    const evidence = REQUIRED_ALERT_INSTANCES.map(ev).map((e, i) =>
      i === 0 ? { ...e, runbookReference: 'ad-hoc' } : e,
    );
    expect(evaluateAlertDelivery(evidence).passed).toBe(false);
  });

  it('fails when a required alert kind is missing', () => {
    const evidence = REQUIRED_ALERT_INSTANCES.slice(1).map(ev);
    expect(evaluateAlertDelivery(evidence).passed).toBe(false);
  });
});

// ─── Operational drills ──────────────────────────────────────────────────

describe('Stage D9 · operational drills', () => {
  const passing = (): OperationalDrillRecord[] => REQUIRED_OPERATIONAL_DRILLS.map((id) => ({
    id, date: '2026-07-24', owner: 'ops',
    runbookReference: 'RB-AW360-DRILL',
    outcome: 'PASS', evidence: ['screenshot'], followUp: null,
  }));

  it('passes when every required drill is recorded PASS', () => {
    expect(evaluateOperationalDrills(passing()).passed).toBe(true);
  });

  it('fails when any drill fails or is missing', () => {
    const arr = passing();
    arr[0] = { ...arr[0], outcome: 'FAIL' as const };
    expect(evaluateOperationalDrills(arr).passed).toBe(false);
    expect(evaluateOperationalDrills(arr.slice(1)).passed).toBe(false);
  });
});

// ─── Runtime disaster recovery ───────────────────────────────────────────

describe('Stage D9 · runtime disaster recovery', () => {
  it('passes when every dataset is backed up and restored with clean invariants', () => {
    const r = evaluateRuntimeDR({
      backedUpDatasets: [...RUNTIME_DR_DATASETS],
      restoredDatasets: [...RUNTIME_DR_DATASETS],
      completedCommandsReplaySafe: true,
      businessCommandsReExecuted: 0,
      auditRelationshipsIntact: true,
      reconciliationSucceededAfterRestore: true,
      providerReferencesTraceable: true,
      killSwitchesSafeAfterRestore: true,
      registryAndManifestCompatible: true,
      drillDate: '2026-07-30', owner: 'ops',
    });
    expect(r.passed).toBe(true);
  });

  it('fails on any business command re-execution', () => {
    const r = evaluateRuntimeDR({
      backedUpDatasets: [...RUNTIME_DR_DATASETS],
      restoredDatasets: [...RUNTIME_DR_DATASETS],
      completedCommandsReplaySafe: false,
      businessCommandsReExecuted: 1,
      auditRelationshipsIntact: true,
      reconciliationSucceededAfterRestore: true,
      providerReferencesTraceable: true,
      killSwitchesSafeAfterRestore: true,
      registryAndManifestCompatible: true,
      drillDate: '2026-07-30', owner: 'ops',
    });
    expect(r.passed).toBe(false);
    expect(r.failures).toContain('business commands re-executed=1');
  });
});

// ─── Runtime security review ─────────────────────────────────────────────

describe('Stage D9 · runtime security review', () => {
  it('passes when every control is reviewed and no HIGH/CRITICAL is unresolved', () => {
    const r = evaluateRuntimeSecurityReview({
      reviewer: 'sec-lead', reviewedAt: '2026-08-01',
      controlsReviewed: [...RUNTIME_SECURITY_CONTROLS],
      findings: [
        { control: 'AUDIT_IMMUTABILITY', severity: 'INFO', detail: 'nit', resolved: true, resolvedBy: 'sec', resolvedAt: '2026-08-01' },
      ],
    });
    expect(r.passed).toBe(true);
  });

  it('blocks on unresolved HIGH finding', () => {
    const r = evaluateRuntimeSecurityReview({
      reviewer: 'sec-lead', reviewedAt: '2026-08-01',
      controlsReviewed: [...RUNTIME_SECURITY_CONTROLS],
      findings: [
        { control: 'TENANT_ISOLATION', severity: 'HIGH', detail: 'gap', resolved: false, resolvedBy: null, resolvedAt: null },
      ],
    });
    expect(r.passed).toBe(false);
    expect(r.unresolvedBlocking.length).toBe(1);
  });

  it('blocks when any required control is not reviewed', () => {
    const r = evaluateRuntimeSecurityReview({
      reviewer: 'sec-lead', reviewedAt: '2026-08-01',
      controlsReviewed: RUNTIME_SECURITY_CONTROLS.slice(1),
      findings: [],
    });
    expect(r.passed).toBe(false);
    expect(r.missingControls.length).toBe(1);
  });
});

// ─── Runtime SLOs ────────────────────────────────────────────────────────

describe('Stage D9 · runtime SLOs', () => {
  const goodMeasurements = {
    availabilityPct: 99.9, p50LatencyMs: 120, p95LatencyMs: 400, p99LatencyMs: 900,
    commandFailureRatePct: 0.2, auditPersistencePct: 100,
    reconciliationCompletionMinutes: 10, alertDeliverySeconds: 20,
    providerAckSeconds: 60, incidentAckMinutes: 5, recoveryTimeMinutes: 30,
    duplicateBusinessEffects: 0, crossTenantExecutions: 0, unauthorisedExecutions: 0,
    missingCorrelationIds: 0, missingAuditRefs: 0,
  };

  it('passes with good measurements and clean invariants', () => {
    expect(evaluateRuntimeSlo(goodMeasurements).passed).toBe(true);
  });

  it('fails on invariant breach even when numerics pass', () => {
    const r = evaluateRuntimeSlo({ ...goodMeasurements, crossTenantExecutions: 1 });
    expect(r.passed).toBe(false);
    expect(r.invariantFailures.some((s) => s.includes('cross-tenant'))).toBe(true);
  });

  it('fails on numeric breach', () => {
    const r = evaluateRuntimeSlo({ ...goodMeasurements, p95LatencyMs: 5000 });
    expect(r.passed).toBe(false);
    expect(r.numericFailures.some((s) => s.includes('p95'))).toBe(true);
  });
});

// ─── Independent per-action attestations ─────────────────────────────────

function makeAttestation(action: (typeof APPROVED)[number], decision: ActionAttestation['decision']): ActionAttestation {
  return {
    action, decision,
    evidencePeriod: { from: '2026-07-20', to: '2026-08-02' },
    productionVolume: 30,
    businessOutcomes: 'expected outcomes met',
    sloPassed: true, reconciliationClean: true, incidentsClean: true,
    securityClean: true, compensationClean: true,
    signOff: {
      business: { signedBy: 'business-lead', at: '2026-08-02' },
      technical: { signedBy: 'tech-lead', at: '2026-08-02' },
      operational: { signedBy: 'ops-lead', at: '2026-08-02' },
      security: { signedBy: 'sec-lead', at: '2026-08-02' },
    },
    rationale: 'evidence satisfies the per-action promotion criteria',
    rollbackCondition: 'kill switch on duplicate business effect',
    attestedAt: '2026-08-02T18:00:00.000Z',
  };
}

describe('Stage D9 · independent per-action attestations', () => {
  it('accepts APPROVED_FOR_TENANT with complete evidence and four sign-offs', () => {
    const a = makeAttestation('SEND_LIFE_CERTIFICATE_REMINDER', 'APPROVED_FOR_TENANT');
    expect(validateActionAttestation(a).valid).toBe(true);
  });

  it('rejects APPROVED_FOR_TENANT without clean reconciliation', () => {
    const a = { ...makeAttestation('SCHEDULE_MEDICAL_REVIEW', 'APPROVED_FOR_TENANT'), reconciliationClean: false };
    const r = validateActionAttestation(a);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('APPROVED_FOR_TENANT requires clean reconciliation');
  });

  it('rejects APPROVED_FOR_TENANT without missing sign-off', () => {
    const a: ActionAttestation = {
      ...makeAttestation('PROPOSE_SUSPENSION', 'APPROVED_FOR_TENANT'),
      signOff: {
        ...makeAttestation('PROPOSE_SUSPENSION', 'APPROVED_FOR_TENANT').signOff,
        security: null,
      },
    };
    expect(validateActionAttestation(a).valid).toBe(false);
  });

  it('reconciliation report requires all four attestations for allApproved', () => {
    const attestations = APPROVED.map((a) => makeAttestation(a, 'APPROVED_FOR_TENANT'));
    const r = reconcileAllActionAttestations(attestations);
    expect(r.allApproved).toBe(true);
    expect(r.anyBlocking).toBe(false);
  });

  it('reconciliation report flags REQUIRES_REMEDIATION as blocking and denies allApproved', () => {
    const attestations = APPROVED.map((a, i) =>
      makeAttestation(a, i === 0 ? 'REQUIRES_REMEDIATION' : 'APPROVED_FOR_TENANT'),
    );
    const r = reconcileAllActionAttestations(attestations);
    expect(r.anyBlocking).toBe(true);
    expect(r.allApproved).toBe(false);
  });

  it('reconciliation report marks missing attestation invalid per action', () => {
    const r = reconcileAllActionAttestations([]);
    for (const a of APPROVED) {
      expect(r.perAction[a].valid).toBe(false);
      expect(r.perAction[a].errors).toContain('attestation missing');
    }
    expect(r.allApproved).toBe(false);
  });
});

// ─── Diagnostics posture ─────────────────────────────────────────────────

describe('Stage D9 · diagnostics posture', () => {
  it('surfaces read-only aggregate without exposing secrets', () => {
    expect(AWARD_PILOT_D9_DIAGNOSTICS.readOnly).toBe(true);
    expect(AWARD_PILOT_D9_DIAGNOSTICS.runtimeAttestation.status).toBe('NOT_STARTED');
    expect(AWARD_PILOT_D9_DIAGNOSTICS.runtimeAttestationVersion).toBe('AW360-WAVE-1-C1-D9');
    expect(AWARD_PILOT_D9_DIAGNOSTICS.requiredTenantPolicyScenarios.length).toBe(REQUIRED_TENANT_POLICY_SCENARIOS.length);
    expect(AWARD_PILOT_D9_DIAGNOSTICS.requiredOperationalDrills.length).toBe(REQUIRED_OPERATIONAL_DRILLS.length);
    expect(AWARD_PILOT_D9_DIAGNOSTICS.requiredAlertInstances.length).toBe(REQUIRED_ALERT_INSTANCES.length);
    expect(AWARD_PILOT_D9_DIAGNOSTICS.drRequiredDatasets.length).toBe(RUNTIME_DR_DATASETS.length);
    expect(AWARD_PILOT_D9_DIAGNOSTICS.runtimeSecurityControls.length).toBe(RUNTIME_SECURITY_CONTROLS.length);
    expect(AWARD_PILOT_D9_DIAGNOSTICS.rolloutPhaseOrder.length).toBe(5);
  });
});
