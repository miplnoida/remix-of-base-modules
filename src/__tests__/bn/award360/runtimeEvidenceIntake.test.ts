/**
 * AW360-WAVE-1-C1 Stage D9-OPS — Runtime evidence intake surface tests.
 *
 * Proves: NOT_STARTED default, IN_PROGRESS requires real deployment/policy
 * evidence, fixtures rejected, single-process MI rejected, unacknowledged
 * alerts block, dirty reconciliation blocks, missing DR / SLO / security /
 * sign-offs block, aggregate totals cannot approve one action, one action
 * approved does not approve the other three, code manifest never mutates.
 */
import { describe, it, expect } from 'vitest';
import {
  createRuntimeEvidenceRegister,
  EvidenceRejected,
  projectIntakeDiagnostics,
  type RuntimeEvidenceRecord,
  type DeploymentEvidence,
  type DatabaseVerificationEvidence,
  type TenantPolicyExecutionEvidence,
  type RuntimeScopeCheckEvidence,
  type MultiInstanceObservation,
  type LiveCommandEvidence,
  type ReconciliationRunEvidence,
  type AlertDeliveryEvidence,
  type OperationalDrillEvidence,
  type DRResultEvidence,
  type SecurityFindingEvidence,
  type SloMeasurementEvidence,
  type ActionAttestationEvidence,
  type EvidenceWindowApproval,
  type IncidentEvidence,
} from '@/services/bn/awards/pilot/awardRuntimeEvidenceIntake';
import { APPROVED_PILOT_ACTIONS, AWARD_PILOT_SCOPE_FREEZE } from '@/services/bn/awards/pilot/awardPilotScopeFreeze';
import { REQUIRED_TENANT_POLICY_SCENARIOS } from '@/services/bn/awards/pilot/awardPilotDatabaseVerification';
import { RUNTIME_MI_EXPECTATIONS } from '@/services/bn/awards/pilot/awardPilotRuntimeMultiInstance';
import { REQUIRED_ALERT_INSTANCES } from '@/services/bn/awards/pilot/awardPilotAlertDelivery';
import { REQUIRED_OPERATIONAL_DRILLS } from '@/services/bn/awards/pilot/awardPilotOperationalDrills';
import { RUNTIME_DR_DATASETS } from '@/services/bn/awards/pilot/awardPilotRuntimeDR';
import { RUNTIME_SECURITY_CONTROLS } from '@/services/bn/awards/pilot/awardPilotRuntimeSecurity';
import { AWARD360_MANIFEST_STATUS, AWARD360_MANIFEST_VERSION } from '@/services/bn/awards/award360LoaderManifest';
import type { ActionAttestation } from '@/services/bn/awards/pilot/awardPilotActionAttestation';
import type { AwardActionKey } from '@/services/bn/awards/awardActionAvailability';

const DEPLOY = {
  deploymentId: 'dep-001',
  commitSha: 'sha-abc123',
  deployedAt: '2026-07-19T00:00:00.000Z',
  environment: 'pilot',
};

function prov(id: string, overrides: Partial<RuntimeEvidenceRecord> = {}): {
  evidenceId: string; environment: string; deploymentId: string; commitSha: string;
  recordedAt: string; recorderId: string; reviewerId: string | null; sourceReference: string;
  correlationId: string | null; source: RuntimeEvidenceRecord['source']; appendOnly: true; fixture: false;
} {
  return {
    evidenceId: id,
    environment: DEPLOY.environment,
    deploymentId: DEPLOY.deploymentId,
    commitSha: DEPLOY.commitSha,
    recordedAt: '2026-07-19T01:00:00.000Z',
    recorderId: 'ops-lead@ssb.local',
    reviewerId: 'tech-lead@ssb.local',
    sourceReference: 'ticket/D9-OPS-001',
    correlationId: 'corr-1',
    source: 'LIVE_RUNTIME',
    appendOnly: true,
    fixture: false,
    ...(overrides as object),
  } as never;
}

function deployment(): DeploymentEvidence {
  return {
    ...prov('ev-dep-1', { source: 'DATABASE_INSPECTION' }),
    kind: 'DEPLOYMENT',
    manifestStatus: 'WAVE_1_PRODUCTION_READY',
    manifestVersion: 'AW360-WAVE-1-C1-D8',
    runtimeAttestationVersion: 'AW360-WAVE-1-C1-D9',
    registrySize: 4,
    registryActions: [...APPROVED_PILOT_ACTIONS],
    killSwitchState: 'READY',
  };
}

function dbVerification(): DatabaseVerificationEvidence {
  return {
    ...prov('ev-db-1', { source: 'DATABASE_INSPECTION' }),
    kind: 'DATABASE_VERIFICATION',
    tableExists: true,
    compositePrimaryKey: ['tenant_id', 'idempotency_key'],
    indexNames: ['bn_award_pilot_idempotency_pkey'],
    rlsEnabled: true,
    policyNames: ['tenant_read', 'tenant_write', 'service_role_all'],
    grantsGranted: ['authenticated', 'service_role'],
    retentionFieldsPresent: true,
    correlationFieldsPresent: true,
    awardReferenceFieldsPresent: true,
  };
}

function policy(id: string, scenario: string): TenantPolicyExecutionEvidence {
  return {
    ...prov(`ev-pol-${id}`, { source: 'DATABASE_INSPECTION' }),
    kind: 'TENANT_POLICY',
    scenarioId: scenario,
    sessionLabel: `session-${id}`,
    tenantContext: 'tenant_a',
    operation: 'SELECT',
    expected: 'ALLOW',
    actual: 'ALLOW',
    passed: true,
  };
}

function allPolicies(): TenantPolicyExecutionEvidence[] {
  return REQUIRED_TENANT_POLICY_SCENARIOS.map((s, i) => policy(String(i), s));
}

function scopeOk(): RuntimeScopeCheckEvidence {
  return {
    ...prov('ev-scope-1', { source: 'LIVE_RUNTIME' }),
    kind: 'RUNTIME_SCOPE',
    frozen: true,
    runtimeActions: [...APPROVED_PILOT_ACTIONS],
    inventoryActions: [...APPROVED_PILOT_ACTIONS],
    findings: [],
  };
}

function windowApproval(): EvidenceWindowApproval {
  return {
    ...prov('ev-win-1', { source: 'BUSINESS_REVIEW' }),
    kind: 'EVIDENCE_WINDOW',
    tenant: 'tenant_a',
    namedUsers: [...AWARD_PILOT_SCOPE_FREEZE.approvedUsers],
    startAt: '2026-07-19T02:00:00.000Z',
    endAt: '2026-07-26T02:00:00.000Z',
    minDurationDays: 5,
    minVolumePerAction: 10,
    maxDailyVolumePerAction: 100,
    reconciliationCadence: 'daily',
    businessReviewCadence: 'weekly',
    killSwitchDrillDate: '2026-07-20',
    providerDegradationDrillDate: '2026-07-21',
    promotionReviewDate: '2026-07-26',
    rollbackTriggers: ['cross-tenant'],
    suspensionTriggers: ['reconciliation dirty'],
    approvals: {
      business: { by: 'biz-owner', at: '2026-07-19T00:30:00.000Z' },
      technical: { by: 'tech-lead', at: '2026-07-19T00:30:00.000Z' },
      operations: { by: 'ops-lead', at: '2026-07-19T00:30:00.000Z' },
      security: { by: 'sec-reviewer', at: '2026-07-19T00:30:00.000Z' },
    },
  };
}

function mi(scenario: string, i: number, action: AwardActionKey = 'SEND_LIFE_CERTIFICATE_REMINDER'): MultiInstanceObservation {
  return {
    ...prov(`ev-mi-${i}`, { source: 'CONTROLLED_DRILL' }),
    kind: 'MULTI_INSTANCE',
    scenario,
    instanceIds: ['inst-1', 'inst-2'],
    connectionIds: ['conn-1', 'conn-2'],
    idempotencyKey: `idem-${i}`,
    commandId: `cmd-${i}`,
    mutationCount: 1,
    auditCount: 1,
    duplicateBusinessEffects: 0,
    finalResult: 'PASS',
  };
}

function allMi(): MultiInstanceObservation[] {
  return RUNTIME_MI_EXPECTATIONS.map((e, i) => mi(e.scenario, i));
}

function reconciliationClean(id = 'rec-1'): ReconciliationRunEvidence {
  return {
    ...prov(`ev-${id}`, { source: 'LIVE_RUNTIME' }),
    kind: 'RECONCILIATION',
    trigger: 'BEFORE_PROMOTION',
    discrepancyCountsByClass: {},
    unexplainedDiscrepancies: 0,
  };
}

function alert(instance: string, i: number): AlertDeliveryEvidence {
  return {
    ...prov(`ev-alert-${i}`, { source: 'ALERT_DELIVERY' }),
    kind: 'ALERT_DELIVERY',
    instanceId: instance,
    generatedAt: '2026-07-19T02:00:00.000Z',
    deliveredAt: '2026-07-19T02:00:05.000Z',
    recipient: 'ops-lead@ssb.local',
    runbookRef: 'RB-AW360-01',
    acknowledgedAt: '2026-07-19T02:01:00.000Z',
    ownerAssigned: 'ops-lead@ssb.local',
    closure: 'CLOSED',
  };
}

function allAlerts(): AlertDeliveryEvidence[] {
  return REQUIRED_ALERT_INSTANCES.map((k, i) => alert(k, i));
}

function drill(id: string, i: number): OperationalDrillEvidence {
  return {
    ...prov(`ev-drill-${i}`, { source: 'CONTROLLED_DRILL' }),
    kind: 'OPERATIONAL_DRILL',
    drillId: id,
    outcome: 'PASS',
    notes: 'exercised in pilot env',
  };
}

function allDrills(): OperationalDrillEvidence[] {
  return REQUIRED_OPERATIONAL_DRILLS.map((d, i) => drill(d, i));
}

function drOk(): DRResultEvidence {
  return {
    ...prov('ev-dr-1', { source: 'BACKUP_RESTORE' }),
    kind: 'DR',
    backedUp: [...RUNTIME_DR_DATASETS],
    restored: [...RUNTIME_DR_DATASETS],
    businessCommandsReExecuted: 0,
    reconciliationSucceededAfterRestore: true,
    auditRelationshipsIntact: true,
    registryAndManifestCompatible: true,
  };
}

function security(control: string, i: number): SecurityFindingEvidence {
  return {
    ...prov(`ev-sec-${i}`, { source: 'SECURITY_REVIEW' }),
    kind: 'SECURITY',
    control,
    severity: 'LOW',
    resolved: true,
    remediation: 'noted; no action',
  };
}

function allSecurity(): SecurityFindingEvidence[] {
  return RUNTIME_SECURITY_CONTROLS.map((c, i) => security(c, i));
}

function slo(metric: string, i: number, passed = true): SloMeasurementEvidence {
  return {
    ...prov(`ev-slo-${i}`, { source: 'LIVE_RUNTIME' }),
    kind: 'SLO',
    metric,
    threshold: 100,
    measurement: 50,
    sampleCount: 100,
    window: '7d',
    passed,
  };
}

function attestation(action: AwardActionKey, i: number): ActionAttestationEvidence {
  const a: ActionAttestation = {
    action,
    decision: 'APPROVED_FOR_TENANT',
    evidencePeriod: { from: '2026-07-19T00:00:00.000Z', to: '2026-07-26T00:00:00.000Z' },
    productionVolume: 20,
    businessOutcomes: 'positive outcomes across pilot cohort observed',
    sloPassed: true,
    reconciliationClean: true,
    incidentsClean: true,
    securityClean: true,
    compensationClean: true,
    signOff: {
      business: { signedBy: `biz-${action}`, at: '2026-07-26T01:00:00.000Z' },
      technical: { signedBy: `tech-${action}`, at: '2026-07-26T01:00:00.000Z' },
      operational: { signedBy: `ops-${action}`, at: '2026-07-26T01:00:00.000Z' },
      security: { signedBy: `sec-${action}`, at: '2026-07-26T01:00:00.000Z' },
    },
    rationale: 'evidence sufficient for tenant approval; volumes met; incidents clean',
    rollbackCondition: 'reconciliation dirty for >1 batch or CRITICAL incident',
    attestedAt: '2026-07-26T01:00:00.000Z',
  };
  return {
    ...prov(`ev-att-${i}`, { source: 'BUSINESS_REVIEW' }),
    kind: 'ACTION_ATTESTATION',
    attestation: a,
  };
}

function fullPromotionPack() {
  return [
    deployment(),
    dbVerification(),
    ...allPolicies(),
    scopeOk(),
    windowApproval(),
    ...allMi(),
    reconciliationClean('rec-1'),
    reconciliationClean('rec-2'),
    ...allAlerts(),
    ...allDrills(),
    drOk(),
    ...allSecurity(),
    slo('availability', 1),
    slo('p95', 2),
    ...APPROVED_PILOT_ACTIONS.map((a, i) => attestation(a, i)),
  ] as RuntimeEvidenceRecord[];
}

describe('D9-OPS · runtime evidence intake', () => {
  it('starts with runtime attestation NOT_STARTED and code manifest unchanged', () => {
    const reg = createRuntimeEvidenceRegister();
    expect(reg.currentAttestation().status).toBe('NOT_STARTED');
    expect(reg.currentAttestation().version).toBe('AW360-WAVE-1-C1-D9');
    expect(reg.currentAttestation().codeManifestStatus).toBe('WAVE_1_PRODUCTION_READY');
    expect(reg.currentAttestation().codeManifestVersion).toBe('AW360-WAVE-1-C1-D8');
    // The real code manifest is separately, independently unchanged.
    expect(AWARD360_MANIFEST_STATUS).toBe('WAVE_1_PRODUCTION_READY');
    expect(AWARD360_MANIFEST_VERSION).toBe('AW360-WAVE-1-C1-D8');
  });

  it('rejects fixture-shaped evidence', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const rec = { ...deployment(), evidenceId: 'fixture-dep-1' };
    expect(() => reg.submit(rec)).toThrow(EvidenceRejected);
  });

  it('rejects records with placeholder strings', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const rec = { ...deployment(), sourceReference: 'TBD' };
    expect(() => reg.submit(rec)).toThrow(/placeholder/);
  });

  it('rejects sensitive-field payloads', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const rec = { ...deployment(), token: 'abc' } as unknown as DeploymentEvidence;
    expect(() => reg.submit(rec)).toThrow(/sensitive/i);
  });

  it('rejects backdated evidence (recordedAt before deployedAt)', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const rec = { ...deployment(), recordedAt: '2026-07-18T00:00:00.000Z' };
    expect(() => reg.submit(rec)).toThrow(/backdated/);
  });

  it('rejects deployment/commit mismatch against bound deployment', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const rec = { ...deployment(), commitSha: 'sha-wrong' };
    expect(() => reg.submit(rec)).toThrow(/commitSha/);
  });

  it('rejects duplicate evidenceId', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    reg.submit(deployment());
    expect(() => reg.submit(deployment())).toThrow(/duplicate/);
  });

  it('cannot open window without deployment/db/policy/scope evidence', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    expect(() => reg.assertWindowOpenable()).toThrow(/DEPLOYMENT/);
    reg.submit(deployment());
    reg.submit(dbVerification());
    reg.submit(scopeOk());
    // Missing policy scenarios
    expect(() => reg.assertWindowOpenable()).toThrow(/policy scenario/);
    for (const p of allPolicies()) reg.submit(p);
    expect(() => reg.assertWindowOpenable()).not.toThrow();
  });

  it('rejects single-process multi-instance evidence', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const bad: MultiInstanceObservation = {
      ...mi('SIMULTANEOUS_IDENTICAL_DIFFERENT_INSTANCES', 99),
      instanceIds: ['inst-1', 'inst-1'],
      connectionIds: ['conn-1', 'conn-1'],
    };
    expect(() => reg.submit(bad)).toThrow(/>=2 independent/);
  });

  it('rejects live command with reminder success but no provider ack', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const rec: LiveCommandEvidence = {
      ...prov('ev-cmd-1', { source: 'LIVE_RUNTIME' }),
      kind: 'LIVE_COMMAND',
      action: 'SEND_LIFE_CERTIFICATE_REMINDER',
      commandId: 'cmd-1',
      tenantId: 'tenant_a',
      awardId: 'aw-1',
      actorUserId: AWARD_PILOT_SCOPE_FREEZE.approvedUsers[0],
      effectiveRole: 'benefits.officer',
      resolverDecision: 'ALLOW',
      guardDecision: 'ALLOW',
      killSwitchState: 'READY',
      cohortDecision: 'IN_COHORT',
      payloadValid: true,
      expectedVersion: 1,
      resultingVersion: 2,
      idempotencyResult: 'CLAIMED',
      commandOutcome: 'SUCCESS',
      auditReference: 'audit-1',
      telemetryCompleted: true,
      externalAckReceived: false,
      reconciliationStatus: 'CLEAN',
      userVisibleResult: 'reminder queued',
      compensationStatus: 'NONE',
    };
    expect(() => reg.submit(rec)).toThrow(/provider acknowledgement/);
  });

  it('rejects live command from unapproved tenant or actor', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    const base: LiveCommandEvidence = {
      ...prov('ev-cmd-2', { source: 'LIVE_RUNTIME' }),
      kind: 'LIVE_COMMAND',
      action: 'PROPOSE_SUSPENSION',
      commandId: 'cmd-2',
      tenantId: 'tenant_z',
      awardId: 'aw-1',
      actorUserId: 'unknown-user',
      effectiveRole: 'benefits.officer',
      resolverDecision: 'ALLOW',
      guardDecision: 'ALLOW',
      killSwitchState: 'READY',
      cohortDecision: 'IN_COHORT',
      payloadValid: true,
      expectedVersion: 1,
      resultingVersion: 2,
      idempotencyResult: 'CLAIMED',
      commandOutcome: 'SUCCESS',
      auditReference: 'audit-2',
      telemetryCompleted: true,
      externalAckReceived: null,
      reconciliationStatus: 'CLEAN',
      userVisibleResult: 'proposal created',
      compensationStatus: 'NONE',
    };
    expect(() => reg.submit(base)).toThrow(/unapproved (tenant|actor)/);
  });

  it('transitions NOT_STARTED → IN_PROGRESS after minimum evidence, and cannot jump to PASSED', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    reg.submit(deployment());
    reg.submit(dbVerification());
    reg.submit(scopeOk());
    for (const p of allPolicies()) reg.submit(p);
    reg.submit(windowApproval());
    reg.assertWindowOpenable();
    const rec = reg.promotionDecision('IN_PROGRESS', 'window opened after gating evidence recorded', '2026-07-19T02:00:00.000Z');
    expect(rec.status).toBe('IN_PROGRESS');
    // Direct NOT_STARTED → PASSED is impossible (transition table).
    const reg2 = createRuntimeEvidenceRegister();
    expect(() => reg2.promotionDecision('PASSED', 'shortcut attempt', '2026-07-19T02:00:00.000Z'))
      .toThrow(/Illegal/);
  });

  it('promotion blockers surface: alerts, drills, DR, security, SLO, incidents, sign-offs', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    reg.submit(deployment());
    reg.submit(dbVerification());
    reg.submit(scopeOk());
    for (const p of allPolicies()) reg.submit(p);
    reg.submit(windowApproval());
    reg.promotionDecision('IN_PROGRESS', 'gated open', '2026-07-19T02:00:00.000Z');

    const readiness = reg.evaluatePromotionReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.some((b) => b.includes('MI scenario missing'))).toBe(true);
    expect(readiness.blockers.some((b) => b.includes('alert not delivered'))).toBe(true);
    expect(readiness.blockers.some((b) => b.includes('drill missing'))).toBe(true);
    expect(readiness.blockers.some((b) => b === 'missing DR evidence')).toBe(true);
    expect(readiness.blockers.some((b) => b === 'missing SLO measurements')).toBe(true);
    expect(readiness.blockers.some((b) => b.includes('security control not reviewed'))).toBe(true);
    expect(readiness.blockers.some((b) => b.includes('action attestation blocking'))).toBe(true);
  });

  it('dirty reconciliation blocks promotion', () => {
    const reg = fullyStagedRegister();
    // Add a dirty reconciliation record after other clean ones.
    reg.submit({
      ...reconciliationClean('rec-dirty'),
      evidenceId: 'ev-rec-dirty',
      unexplainedDiscrepancies: 2,
    });
    const r = reg.evaluatePromotionReadiness();
    expect(r.ready).toBe(false);
    expect(r.blockers).toContain('unexplained reconciliation discrepancies present');
  });

  it('missing alert acknowledgement blocks promotion', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    for (const r of [deployment(), dbVerification(), scopeOk(), ...allPolicies(), windowApproval()]) reg.submit(r);
    reg.promotionDecision('IN_PROGRESS', 'window opened', '2026-07-19T02:00:00.000Z');
    // Try to submit an alert without acknowledgement.
    const unacked: AlertDeliveryEvidence = { ...alert('AUDIT_PERSISTENCE_FAILURE', 100), acknowledgedAt: null };
    expect(() => reg.submit(unacked)).toThrow(/not acknowledged/);
  });

  it('CRITICAL/HIGH open incident blocks promotion', () => {
    const reg = fullyStagedRegister();
    const inc: IncidentEvidence = {
      ...prov('ev-inc-1', { source: 'LIVE_RUNTIME' }),
      kind: 'INCIDENT',
      severity: 'CRITICAL',
      category: 'CROSS_TENANT',
      resolvedAt: null,
      requiredActionsClosed: false,
    };
    reg.submit(inc);
    const r = reg.evaluatePromotionReadiness();
    expect(r.ready).toBe(false);
    expect(r.blockers).toContain('unresolved CRITICAL/HIGH incident');
  });

  it('one action approved does not approve the other three; aggregate cannot substitute', () => {
    const reg = fullyStagedRegister();
    // Only submit ONE action attestation.
    reg.submit(attestation('SEND_LIFE_CERTIFICATE_REMINDER', 0));
    const r = reg.evaluatePromotionReadiness();
    expect(r.actionDecisions.SEND_LIFE_CERTIFICATE_REMINDER).toBe(true);
    expect(r.actionDecisions.SCHEDULE_MEDICAL_REVIEW).toBe(false);
    expect(r.actionDecisions.PROPOSE_SUSPENSION).toBe(false);
    expect(r.actionDecisions.PROPOSE_RESUMPTION).toBe(false);
    expect(r.ready).toBe(false);
  });

  it('rejects same signer across multiple governance roles for one action', () => {
    const reg = fullyStagedRegister();
    const dupe = attestation('SCHEDULE_MEDICAL_REVIEW', 50);
    const bad: ActionAttestationEvidence = {
      ...dupe,
      evidenceId: 'ev-att-bad',
      attestation: {
        ...dupe.attestation,
        signOff: {
          business: { signedBy: 'same-person', at: '2026-07-26T01:00:00.000Z' },
          technical: { signedBy: 'same-person', at: '2026-07-26T01:00:00.000Z' },
          operational: { signedBy: 'ops', at: '2026-07-26T01:00:00.000Z' },
          security: { signedBy: 'sec', at: '2026-07-26T01:00:00.000Z' },
        },
      },
    };
    expect(() => reg.submit(bad)).toThrow(/multiple governance roles/);
  });

  it('full pack passes promotion readiness and transitions to PASSED without touching the code manifest', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    for (const r of fullPromotionPack()) reg.submit(r);
    reg.promotionDecision('IN_PROGRESS', 'window opened with full baseline', '2026-07-19T02:00:00.000Z');
    const readiness = reg.evaluatePromotionReadiness();
    expect(readiness.ready).toBe(true);
    const final = reg.promotionDecision('PASSED', 'all runtime gates satisfied', '2026-07-26T02:00:00.000Z');
    expect(final.status).toBe('PASSED');
    // Code manifest object is NEVER mutated by the intake surface.
    expect(AWARD360_MANIFEST_STATUS).toBe('WAVE_1_PRODUCTION_READY');
    expect(AWARD360_MANIFEST_VERSION).toBe('AW360-WAVE-1-C1-D8');
  });

  it('rejects post-decision evidence submitted retroactively', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    for (const r of fullPromotionPack()) reg.submit(r);
    reg.promotionDecision('IN_PROGRESS', 'window opened', '2026-07-19T02:00:00.000Z');
    reg.promotionDecision('PASSED', 'gates satisfied', '2026-07-26T02:00:00.000Z');
    const late: SloMeasurementEvidence = { ...slo('latency-late', 900), recordedAt: '2026-07-27T00:00:00.000Z' };
    expect(() => reg.submit(late)).toThrow(/post-decision/);
  });

  it('diagnostics projection stays read-only and reflects intake counts', () => {
    const reg = createRuntimeEvidenceRegister();
    reg.bindDeployment(DEPLOY);
    reg.submit(deployment());
    const d = projectIntakeDiagnostics(reg);
    expect(d.readOnly).toBe(true);
    expect(d.totalRecords).toBe(1);
    expect(d.countsByKind.DEPLOYMENT).toBe(1);
    expect(d.approvedActions).toEqual(APPROVED_PILOT_ACTIONS);
    expect(d.codeManifestVersion).toBe('AW360-WAVE-1-C1-D8');
  });
});

// Helper: register with everything wired except final action attestations.
function fullyStagedRegister() {
  const reg = createRuntimeEvidenceRegister();
  reg.bindDeployment(DEPLOY);
  reg.submit(deployment());
  reg.submit(dbVerification());
  reg.submit(scopeOk());
  for (const p of allPolicies()) reg.submit(p);
  reg.submit(windowApproval());
  for (const m of allMi()) reg.submit(m);
  reg.submit(reconciliationClean('rec-1'));
  for (const a of allAlerts()) reg.submit(a);
  for (const d of allDrills()) reg.submit(d);
  reg.submit(drOk());
  for (const s of allSecurity()) reg.submit(s);
  reg.submit(slo('availability', 1));
  reg.promotionDecision('IN_PROGRESS', 'gated open', '2026-07-19T02:00:00.000Z');
  return reg;
}
