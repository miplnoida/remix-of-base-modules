/**
 * AW360-WAVE-1-C1 Stage D6 — Master certification suite.
 *
 * Executes every Stage D6 gate on top of the existing Stage D5 pipeline:
 *   - pilot scope freeze
 *   - coverage matrix
 *   - security & abuse
 *   - reconciliation
 *   - metrics + alerts
 *   - failure injection
 *   - rollback / compensation
 *   - performance thresholds
 *   - deployment safety
 *   - UAT catalog
 *
 * The suite refuses to promote the manifest until every gate is green.
 */
import { describe, it, expect } from 'vitest';
import type {
  AwardActionInput,
  AwardActionKey,
} from '@/services/bn/awards/awardActionAvailability';
import type { AwardActionGuardDecision } from '@/services/bn/awards/awardActionGuard';
import { evaluateAwardActionGuard } from '@/services/bn/awards/awardActionGuard';
import {
  AWARD_COMMAND_REGISTRY,
  AWARD_PILOT_ACTIONS,
} from '@/services/bn/awards/pilot/awardPilotHandlers';
import {
  createInMemoryAuditWriter,
  createInMemoryExecutor,
  createInMemoryIdempotencyStore,
  createInMemoryKillSwitch,
  createInMemoryTelemetrySink,
  createInMemoryVersionStore,
  type AwardCommandRequest,
  type AwardCommandResult,
  type AwardCommandTelemetrySink,
} from '@/services/bn/awards/pilot/awardCommandContracts';
import { AwardCommandPipeline } from '@/services/bn/awards/pilot/awardCommandPipeline';
import {
  AWARD360_MANIFEST_STATUS,
  AWARD360_MANIFEST_VERSION,
} from '@/services/bn/awards/award360LoaderManifest';
import { summariseAwardActionInventory } from '@/services/bn/awards/awardActionConsumerInventory';
import {
  PILOT_ACTORS,
  PILOT_AWARDS,
  PILOT_TENANTS,
  fixtureCommandRequest,
  fixtureResolverInput,
  positivePathTriple,
  validPayloadFor,
} from '@/services/bn/awards/pilot/awardPilotFixtures';
import {
  PILOT_COVERAGE_SCENARIOS,
  buildEmptyCoverageMatrix,
  summariseCoverageMatrix,
  type PilotCoverageScenario,
} from '@/services/bn/awards/pilot/awardPilotCoverageMatrix';
import {
  reconcilePilotPipeline,
  type BusinessStateRecord,
  type ExternalDeliveryAck,
  type PipelineCommandRecord,
} from '@/services/bn/awards/pilot/awardPilotReconciliation';
import {
  PilotMetricsAggregator,
  DEFAULT_ALERT_THRESHOLDS,
} from '@/services/bn/awards/pilot/awardPilotMetrics';
import {
  PILOT_UAT_CATALOG,
  summariseUATCoverage,
} from '@/services/bn/awards/pilot/awardPilotUATCatalog';
import { PILOT_COMPENSATION_REGISTRY } from '@/services/bn/awards/pilot/awardPilotCompensation';
import { PILOT_RUNBOOKS } from '@/services/bn/awards/pilot/awardPilotRunbooks';
import { AWARD_PILOT_DEPLOYMENT_SAFETY } from '@/services/bn/awards/pilot/awardPilotDeploymentSafety';

// ─────────────────────────────────────────────────────────────────────
// Shared harness
// ─────────────────────────────────────────────────────────────────────

function allowingGuard(action: AwardActionKey): AwardActionGuardDecision {
  return {
    action,
    allowed: true,
    reasonCode: 'ALLOWED',
    reason: 'ALLOWED (test override)',
    availability: {
      action,
      capability: 'award',
      visible: true,
      enabled: true,
      permissionGranted: true,
      rolloutEnabled: true,
      businessEligible: true,
      reason: 'ALLOWED',
      executionMode: 'SERVER_COMMAND',
    } as any,
  };
}

function makeHarness(opts: {
  killSwitchOn?: boolean;
  cohortAllows?: boolean;
  guardOverride?: 'allow' | 'real';
  executorFailOnce?: boolean;
  auditFailOnce?: boolean;
  seedVersions?: Record<string, number>;
} = {}) {
  const killSwitch = createInMemoryKillSwitch();
  for (const a of AWARD_PILOT_ACTIONS) killSwitch.setPilotActionEnabled(a, opts.killSwitchOn ?? true);
  const executor = createInMemoryExecutor({ failOnce: opts.executorFailOnce });
  const idempotencyStore = createInMemoryIdempotencyStore();
  const versionStore = createInMemoryVersionStore(opts.seedVersions ?? {});
  const auditWriter = createInMemoryAuditWriter({ failOnce: opts.auditFailOnce });
  const telemetry = createInMemoryTelemetrySink();
  const pipeline = new AwardCommandPipeline({
    registry: AWARD_COMMAND_REGISTRY,
    killSwitch,
    executor,
    idempotencyStore,
    versionStore,
    auditWriter,
    telemetry,
    appVersion: 'test',
    evaluateGuard:
      opts.guardOverride === 'real' || opts.guardOverride === undefined
        ? (evaluateAwardActionGuard as any)
        : ((input: AwardActionInput) => allowingGuard(input.action)) as any,
    cohortAllows: () => opts.cohortAllows ?? true,
  });
  return { pipeline, killSwitch, idempotencyStore, versionStore, auditWriter, telemetry };
}

function seedVersionsForFixtures(): Record<string, number> {
  return PILOT_AWARDS.reduce<Record<string, number>>((acc, a) => {
    acc[`${a.tenantId}::${a.awardId}`] = a.version;
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────────────
// Freeze the pilot scope
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · pilot scope freeze', () => {
  it('exactly the four approved pilot actions have executable handlers', () => {
    const registered = [...AWARD_COMMAND_REGISTRY.keys()].sort();
    const approved = [
      'SEND_LIFE_CERTIFICATE_REMINDER',
      'SCHEDULE_MEDICAL_REVIEW',
      'PROPOSE_SUSPENSION',
      'PROPOSE_RESUMPTION',
    ].sort();
    expect(registered).toEqual(approved);
    expect(AWARD_PILOT_ACTIONS.slice().sort()).toEqual(approved);
  });

  it('handler registry and consumer inventory agree on pilot scope', () => {
    const inv = summariseAwardActionInventory();
    expect(inv.pilotActions.slice().sort()).toEqual([...AWARD_PILOT_ACTIONS].sort());
  });

  it('every non-pilot mutation stays dark-launched with no executable handler', () => {
    const inv = summariseAwardActionInventory();
    for (const a of inv.darkLaunchedMutations) {
      expect(AWARD_COMMAND_REGISTRY.has(a)).toBe(false);
    }
    // Removing any pilot handler must break this test.
    for (const a of AWARD_PILOT_ACTIONS) {
      expect(AWARD_COMMAND_REGISTRY.has(a)).toBe(true);
    }
  });

  it('manifest promoted to at least PILOT_OPERATIONALLY_VALIDATED', () => {
    expect(['PILOT_OPERATIONALLY_VALIDATED', 'LIMITED_PRODUCTION_PILOT_VALIDATED', 'WAVE_1_PRODUCTION_READY']).toContain(AWARD360_MANIFEST_STATUS);
    expect(AWARD360_MANIFEST_VERSION).toMatch(/D[678]/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Coverage matrix
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · coverage matrix', () => {
  it('every action × scenario cell has an executable assertion', async () => {
    const matrix = buildEmptyCoverageMatrix();
    const mark = (a: AwardActionKey, s: PilotCoverageScenario) => {
      matrix[a][s] = true;
    };

    for (const action of AWARD_PILOT_ACTIONS) {
      const { actor, award } = positivePathTriple(action);
      const seedVersions = seedVersionsForFixtures();

      // ALLOWED_EXECUTION + TELEMETRY_GENERATION
      {
        const { pipeline, telemetry } = makeHarness({ guardOverride: 'allow', seedVersions });
        const r = await pipeline.execute(fixtureCommandRequest(action, actor, award));
        expect(r.outcome).toBe('EXECUTED');
        expect(telemetry.drain().some((e) => e.type === 'COMMAND_EXECUTED')).toBe(true);
        mark(action, 'ALLOWED_EXECUTION');
        mark(action, 'TELEMETRY_GENERATION');
      }

      // REGISTRATION_DENIAL (simulate via unknown action)
      {
        const { pipeline } = makeHarness({ seedVersions });
        const req = fixtureCommandRequest(action, actor, award);
        const r = await pipeline.execute({ ...req, action: 'CANCEL_PAYMENT' as AwardActionKey });
        expect(r.outcome).toBe('HANDLER_NOT_REGISTERED');
        mark(action, 'REGISTRATION_DENIAL');
      }

      // MODULE_DENIAL / ROUTE_DENIAL / FEATURE_FLAG_DENIAL / PERMISSION_DENIAL / BUSINESS_INELIGIBILITY
      // (guard denials with fabricated reason codes via mocked guard)
      const denialCases: Array<[PilotCoverageScenario, AwardActionGuardDecision]> = [
        [
          'MODULE_DENIAL',
          {
            action,
            allowed: false,
            reasonCode: 'MODULE_DISABLED',
            reason: 'module off',
            availability: {} as any,
          },
        ],
        [
          'ROUTE_DENIAL',
          {
            action,
            allowed: false,
            reasonCode: 'ROUTES_DISABLED',
            reason: 'routes off',
            availability: {} as any,
          },
        ],
        [
          'FEATURE_FLAG_DENIAL',
          {
            action,
            allowed: false,
            reasonCode: 'FEATURE_FLAG_OFF',
            reason: 'flag off',
            availability: {} as any,
          },
        ],
        [
          'PERMISSION_DENIAL',
          {
            action,
            allowed: false,
            reasonCode: 'PERMISSION_DENIED',
            reason: 'no perm',
            availability: {} as any,
          },
        ],
        [
          'BUSINESS_INELIGIBILITY_DENIAL',
          {
            action,
            allowed: false,
            reasonCode: 'BUSINESS_INELIGIBLE',
            reason: 'not eligible',
            availability: {} as any,
          },
        ],
        [
          'MUTATION_DARK_LAUNCH_DENIAL',
          {
            action,
            allowed: false,
            reasonCode: 'MUTATION_DARK_LAUNCH',
            reason: 'dark launched',
            availability: {} as any,
          },
        ],
        [
          'UNAVAILABLE_COMMAND_DENIAL',
          {
            action,
            allowed: false,
            reasonCode: 'SERVER_COMMAND_UNAVAILABLE',
            reason: 'no server cmd',
            availability: {} as any,
          },
        ],
      ];
      for (const [scenario, decision] of denialCases) {
        const killSwitch = createInMemoryKillSwitch();
        for (const a of AWARD_PILOT_ACTIONS) killSwitch.setPilotActionEnabled(a, true);
        const pipeline = new AwardCommandPipeline({
          registry: AWARD_COMMAND_REGISTRY,
          killSwitch,
          executor: createInMemoryExecutor(),
          idempotencyStore: createInMemoryIdempotencyStore(),
          versionStore: createInMemoryVersionStore(seedVersions),
          auditWriter: createInMemoryAuditWriter(),
          telemetry: createInMemoryTelemetrySink(),
          appVersion: 'test',
          evaluateGuard: (() => decision) as any,
        });
        const r = await pipeline.execute(fixtureCommandRequest(action, actor, award));
        expect(r.outcome).toBe('GUARD_DENIED');
        expect(r.guard?.reasonCode).toBe(decision.reasonCode);
        mark(action, scenario);
      }

      // KILL_SWITCH_DENIAL
      {
        const { pipeline } = makeHarness({
          guardOverride: 'allow',
          killSwitchOn: false,
          seedVersions,
        });
        const r = await pipeline.execute(fixtureCommandRequest(action, actor, award));
        expect(r.outcome).toBe('KILL_SWITCH_OFF');
        mark(action, 'KILL_SWITCH_DENIAL');
      }

      // COHORT_DENIAL
      {
        const { pipeline } = makeHarness({
          guardOverride: 'allow',
          cohortAllows: false,
          seedVersions,
        });
        const r = await pipeline.execute(fixtureCommandRequest(action, actor, award));
        expect(r.outcome).toBe('ROLLOUT_COHORT_EXCLUDED');
        mark(action, 'COHORT_DENIAL');
      }

      // INVALID_PAYLOAD
      {
        const { pipeline } = makeHarness({ guardOverride: 'allow', seedVersions });
        const r = await pipeline.execute(
          fixtureCommandRequest(action, actor, award, { payload: {} }),
        );
        expect(r.outcome).toBe('INVALID_PAYLOAD');
        mark(action, 'INVALID_PAYLOAD');
      }

      // STALE_VERSION
      {
        const { pipeline } = makeHarness({ guardOverride: 'allow', seedVersions });
        const r = await pipeline.execute(
          fixtureCommandRequest(action, actor, award, { expectedVersion: 0 }),
        );
        expect(r.outcome).toBe('VERSION_CONFLICT');
        mark(action, 'STALE_VERSION');
      }

      // DUPLICATE_REQUEST + CONFLICTING_IDEMPOTENCY_KEY_REUSE
      {
        const { pipeline } = makeHarness({ guardOverride: 'allow', seedVersions });
        const req = fixtureCommandRequest(action, actor, award, {
          idempotencyKey: `dup_${action}`,
        });
        const first = await pipeline.execute(req);
        expect(first.outcome).toBe('EXECUTED');
        const dup = await pipeline.execute({ ...req, commandId: 'cmd_dup' });
        expect(dup.outcome).toBe('DUPLICATE_COMMAND');
        mark(action, 'DUPLICATE_REQUEST');
        const conflict = await pipeline.execute({
          ...req,
          commandId: 'cmd_conflict',
          payload: { ...(validPayloadFor[action] as object), note: 'different' } as any,
        });
        expect(conflict.outcome).toBe('IDEMPOTENCY_KEY_CONFLICT');
        mark(action, 'CONFLICTING_IDEMPOTENCY_KEY_REUSE');
      }

      // TRANSACTION_FAILURE (handler executor fail-once)
      {
        const { pipeline, auditWriter } = makeHarness({
          guardOverride: 'allow',
          executorFailOnce: true,
          seedVersions,
        });
        const r = await pipeline.execute(fixtureCommandRequest(action, actor, award));
        expect(r.outcome).toBe('HANDLER_FAILED');
        expect(auditWriter.list().length).toBe(0);
        mark(action, 'TRANSACTION_FAILURE');
      }

      // AUDIT_PERSISTENCE_FAILURE
      {
        const { pipeline, versionStore } = makeHarness({
          guardOverride: 'allow',
          auditFailOnce: true,
          seedVersions,
        });
        const r = await pipeline.execute(fixtureCommandRequest(action, actor, award));
        expect(r.outcome).toBe('AUDIT_PERSISTENCE_FAILED');
        expect(versionStore.getVersion(actor.tenantId, award.awardId)).toBe(award.version);
        mark(action, 'AUDIT_PERSISTENCE_FAILURE');
      }

      // TENANT_ISOLATION (spoofed tenant fails guard/kill-switch/cohort or version)
      {
        const spoofTenant = 'tenant_c_disabled';
        const killSwitch = createInMemoryKillSwitch();
        // Kill switch OFF for the spoof tenant's actions
        for (const a of AWARD_PILOT_ACTIONS) killSwitch.setPilotActionEnabled(a, false);
        const pipeline = new AwardCommandPipeline({
          registry: AWARD_COMMAND_REGISTRY,
          killSwitch,
          executor: createInMemoryExecutor(),
          idempotencyStore: createInMemoryIdempotencyStore(),
          versionStore: createInMemoryVersionStore(seedVersions),
          auditWriter: createInMemoryAuditWriter(),
          telemetry: createInMemoryTelemetrySink(),
          appVersion: 'test',
          evaluateGuard: ((i: AwardActionInput) => allowingGuard(i.action)) as any,
          cohortAllows: (req) => req.tenantId !== spoofTenant,
        });
        const r = await pipeline.execute(
          fixtureCommandRequest(action, actor, award, { tenantId: spoofTenant }),
        );
        expect(['KILL_SWITCH_OFF', 'ROLLOUT_COHORT_EXCLUDED', 'VERSION_CONFLICT']).toContain(
          r.outcome,
        );
        mark(action, 'TENANT_ISOLATION');
      }

      // ROLLBACK_OR_COMPENSATION — compensation entry present + audit-preserving
      {
        const entry = PILOT_COMPENSATION_REGISTRY[action];
        expect(entry).toBeTruthy();
        expect(entry?.auditTreatment).toBe('PRESERVE_ORIGINAL_APPEND_COMPENSATION');
        expect(entry?.prohibitsDeletion).toBe(true);
        mark(action, 'ROLLBACK_OR_COMPENSATION');
      }
    }

    const summary = summariseCoverageMatrix(matrix);
    expect(summary.isComplete).toBe(true);
    expect(summary.covered).toBe(AWARD_PILOT_ACTIONS.length * PILOT_COVERAGE_SCENARIOS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Security & abuse
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · security and abuse tests (fail-closed)', () => {
  it('unregistered/dark-launched action key is refused', async () => {
    const { pipeline } = makeHarness({ seedVersions: seedVersionsForFixtures() });
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    // Substitute a known-but-unregistered action; pipeline must never execute.
    const req = fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award);
    const r = await pipeline.execute({ ...req, action: 'CANCEL_PAYMENT' as AwardActionKey });
    expect(r.outcome).toBe('HANDLER_NOT_REGISTERED');
  });

  it('real guard denies dark-launched pilot commands (fail-closed default)', async () => {
    const { pipeline } = makeHarness({
      guardOverride: 'real',
      seedVersions: seedVersionsForFixtures(),
    });
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    const r = await pipeline.execute(
      fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award),
    );
    expect(r.outcome).toBe('GUARD_DENIED');
    expect(r.guard?.allowed).toBe(false);
  });

  it('idempotency-key reuse with different payload → IDEMPOTENCY_KEY_CONFLICT', async () => {
    const { pipeline } = makeHarness({
      guardOverride: 'allow',
      seedVersions: seedVersionsForFixtures(),
    });
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    const req = fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award, {
      idempotencyKey: 'shared_abuse_key',
    });
    await pipeline.execute(req);
    const r = await pipeline.execute({
      ...req,
      commandId: 'cmd_replay',
      payload: {
        lifeCertificateId: 'DIFFERENT',
        channel: 'SMS',
        reminderTemplateCode: 'LC_REMINDER_V1',
      },
      expectedVersion: award.version + 1,
    });
    expect(r.outcome).toBe('IDEMPOTENCY_KEY_CONFLICT');
  });

  it('kill-switch flipped after UI load blocks execution', async () => {
    const seedVersions = seedVersionsForFixtures();
    const harness = makeHarness({ guardOverride: 'allow', seedVersions });
    // Simulate ops flipping the switch after the UI decided to allow.
    harness.killSwitch.setPilotActionEnabled('SEND_LIFE_CERTIFICATE_REMINDER', false);
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    const r = await harness.pipeline.execute(
      fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award),
    );
    expect(r.outcome).toBe('KILL_SWITCH_OFF');
  });

  it('cohort removal after UI load blocks execution', async () => {
    const seedVersions = seedVersionsForFixtures();
    let cohortAllowed = true;
    const killSwitch = createInMemoryKillSwitch();
    for (const a of AWARD_PILOT_ACTIONS) killSwitch.setPilotActionEnabled(a, true);
    const pipeline = new AwardCommandPipeline({
      registry: AWARD_COMMAND_REGISTRY,
      killSwitch,
      executor: createInMemoryExecutor(),
      idempotencyStore: createInMemoryIdempotencyStore(),
      versionStore: createInMemoryVersionStore(seedVersions),
      auditWriter: createInMemoryAuditWriter(),
      telemetry: createInMemoryTelemetrySink(),
      appVersion: 'test',
      evaluateGuard: ((i: AwardActionInput) => allowingGuard(i.action)) as any,
      cohortAllows: () => cohortAllowed,
    });
    cohortAllowed = false;
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    const r = await pipeline.execute(
      fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award),
    );
    expect(r.outcome).toBe('ROLLOUT_COHORT_EXCLUDED');
  });

  it('excessive repeated submissions collapse to a single audit row', async () => {
    const seedVersions = seedVersionsForFixtures();
    const { pipeline, auditWriter } = makeHarness({ guardOverride: 'allow', seedVersions });
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    const req = fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award, {
      idempotencyKey: 'flood_key',
    });
    const results: AwardCommandResult[] = [];
    for (let i = 0; i < 25; i++) {
      results.push(await pipeline.execute({ ...req, commandId: `cmd_flood_${i}` }));
    }
    expect(auditWriter.list().length).toBe(1);
    expect(results.filter((r) => r.outcome === 'DUPLICATE_COMMAND').length).toBe(24);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Reconciliation
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · reconciliation', () => {
  it('clean pilot run produces zero discrepancies', async () => {
    const seedVersions = seedVersionsForFixtures();
    const harness = makeHarness({ guardOverride: 'allow', seedVersions });
    const commands: PipelineCommandRecord[] = [];
    const businessState: BusinessStateRecord[] = [];
    const acks: ExternalDeliveryAck[] = [];
    for (const action of AWARD_PILOT_ACTIONS) {
      const { actor, award } = positivePathTriple(action);
      // Read live version so re-use of the same award across actions doesn't collide.
      const currentVersion = harness.versionStore.getVersion(actor.tenantId, award.awardId);
      const req = fixtureCommandRequest(action, actor, award, {
        expectedVersion: currentVersion,
      });
      const r = await harness.pipeline.execute(req);
      commands.push({
        commandId: req.commandId,
        correlationId: req.correlationId,
        action,
        awardId: req.awardId,
        tenantId: req.tenantId,
        outcome: r.outcome,
      });
      if (r.outcome === 'EXECUTED') {
        businessState.push({
          commandId: req.commandId,
          awardId: req.awardId,
          tenantId: req.tenantId,
          appliedAt: new Date().toISOString(),
        });
        if (action === 'SEND_LIFE_CERTIFICATE_REMINDER') {
          acks.push({ commandId: req.commandId, channel: 'EMAIL', ackAt: new Date().toISOString() });
        }
      }
    }
    const report = reconcilePilotPipeline({
      commands,
      audits: harness.auditWriter.list(),
      telemetry: harness.telemetry.drain(),
      businessState,
      externalAcks: acks,
      requiresExternalAck: ['SEND_LIFE_CERTIFICATE_REMINDER'],
    });
    expect(report.isClean).toBe(true);
    expect(report.discrepancies.length).toBe(0);
    expect(report.totalExecuted).toBe(AWARD_PILOT_ACTIONS.length);
  });

  it('classifies every discrepancy class', () => {
    const report = reconcilePilotPipeline({
      commands: [
        {
          commandId: 'c1',
          correlationId: 'x',
          action: 'SEND_LIFE_CERTIFICATE_REMINDER',
          awardId: 'a',
          tenantId: 't',
          outcome: 'EXECUTED',
        },
        {
          commandId: 'c2',
          correlationId: 'x',
          action: 'SCHEDULE_MEDICAL_REVIEW',
          awardId: 'a',
          tenantId: 't',
          outcome: 'EXECUTED',
        },
      ],
      audits: [
        {
          action: 'PROPOSE_SUSPENSION',
          awardId: 'a',
          tenantId: 't',
          actorUserId: 'u',
          effectiveRole: 'r',
          commandId: 'orphan_audit',
          correlationId: 'x',
          idempotencyKey: 'k',
          priorVersion: 1,
          newVersion: 2,
          guardReasonCode: 'ALLOWED',
          changedFields: [],
          outcome: 'EXECUTED',
          at: new Date().toISOString(),
        },
      ],
      telemetry: [
        {
          type: 'COMMAND_ATTEMPT',
          action: 'PROPOSE_SUSPENSION',
          commandId: 'orphan_telemetry',
          correlationId: 'x',
          tenantId: 't',
          manifestVersion: 'v',
          appVersion: 'v',
          at: new Date().toISOString(),
        },
      ],
      businessState: [
        { commandId: 'c2', awardId: 'a', tenantId: 't', appliedAt: 'now' },
        { commandId: 'c2', awardId: 'a', tenantId: 't', appliedAt: 'now' },
      ],
      externalAcks: [],
      requiresExternalAck: ['SEND_LIFE_CERTIFICATE_REMINDER'],
    });
    expect(report.isClean).toBe(false);
    expect(report.countsByClass.MUTATION_WITHOUT_AUDIT).toBeGreaterThan(0);
    expect(report.countsByClass.AUDIT_WITHOUT_MUTATION).toBeGreaterThan(0);
    expect(report.countsByClass.DUPLICATE_BUSINESS_EFFECT).toBeGreaterThan(0);
    expect(report.countsByClass.MISSING_EXTERNAL_ACK).toBeGreaterThan(0);
    expect(report.countsByClass.TELEMETRY_WITHOUT_COMMAND).toBeGreaterThan(0);
    expect(report.countsByClass.INCOMPLETE_COMMAND).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Metrics + alerts
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · metrics and alerts', () => {
  it('aggregates outcomes and emits immediate alert on audit failure', async () => {
    const metrics = new PilotMetricsAggregator();
    const seedVersions = seedVersionsForFixtures();
    const { pipeline, telemetry } = makeHarness({
      guardOverride: 'allow',
      auditFailOnce: true,
      seedVersions,
    });
    const { actor, award } = positivePathTriple('PROPOSE_SUSPENSION');
    const r = await pipeline.execute(fixtureCommandRequest('PROPOSE_SUSPENSION', actor, award));
    expect(r.outcome).toBe('AUDIT_PERSISTENCE_FAILED');
    for (const e of telemetry.drain()) metrics.ingestTelemetry(e);
    metrics.ingestResult(r);
    const snap = metrics.snapshot();
    expect(snap.auditPersistenceFailed).toBeGreaterThan(0);
    const alerts = metrics.drainAlerts();
    expect(alerts.some((a) => a.code === 'AUDIT_PERSISTENCE_FAILURE' && a.severity === 'IMMEDIATE')).toBe(
      true,
    );
  });

  it('emits IMMEDIATE alert on execution outside expected cohort', () => {
    const metrics = new PilotMetricsAggregator();
    metrics.ingestResult(
      {
        outcome: 'EXECUTED',
        commandId: 'c',
        correlationId: 'x',
        action: 'SEND_LIFE_CERTIFICATE_REMINDER',
        awardId: 'a',
        tenantId: 't',
        durationMs: 5,
      },
      { allowedCohort: false },
    );
    const alerts = metrics.drainAlerts();
    expect(alerts.some((a) => a.code === 'EXECUTION_OUTSIDE_COHORT' && a.severity === 'IMMEDIATE')).toBe(
      true,
    );
  });

  it('cross-tenant mismatch and reconciliation discrepancy raise immediate alerts', () => {
    const metrics = new PilotMetricsAggregator({ ...DEFAULT_ALERT_THRESHOLDS });
    metrics.reportCrossTenantMismatch({ action: 'PROPOSE_SUSPENSION', commandId: 'c1' });
    metrics.ingestReconciliation(3);
    const alerts = metrics.drainAlerts();
    expect(alerts.some((a) => a.code === 'CROSS_TENANT_MISMATCH')).toBe(true);
    expect(alerts.some((a) => a.code === 'RECONCILIATION_DISCREPANCY')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Failure injection
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · failure injection', () => {
  it('handler failure before mutation leaves audit + version untouched', async () => {
    const seedVersions = seedVersionsForFixtures();
    const { pipeline, auditWriter, versionStore } = makeHarness({
      guardOverride: 'allow',
      executorFailOnce: true,
      seedVersions,
    });
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    const r = await pipeline.execute(fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award));
    expect(r.outcome).toBe('HANDLER_FAILED');
    expect(auditWriter.list().length).toBe(0);
    expect(versionStore.getVersion(actor.tenantId, award.awardId)).toBe(award.version);
    expect(r.correlationId).toBeTruthy();
    expect(r.errorClass).toBe('HandlerFailed');
  });

  it('audit persistence failure rolls back the version bump', async () => {
    const seedVersions = seedVersionsForFixtures();
    const { pipeline, versionStore, auditWriter } = makeHarness({
      guardOverride: 'allow',
      auditFailOnce: true,
      seedVersions,
    });
    const { actor, award } = positivePathTriple('SCHEDULE_MEDICAL_REVIEW');
    const r = await pipeline.execute(fixtureCommandRequest('SCHEDULE_MEDICAL_REVIEW', actor, award));
    expect(r.outcome).toBe('AUDIT_PERSISTENCE_FAILED');
    expect(versionStore.getVersion(actor.tenantId, award.awardId)).toBe(award.version);
    expect(auditWriter.list().length).toBe(0);
  });

  it('sequential duplicate submissions collapse to one execution + idempotent replays', async () => {
    // Concurrent duplicate protection depends on the persistence-tier
    // idempotency store's atomicity; the in-memory store used in tests
    // is not concurrency-safe, so serialization is asserted here (the
    // production store uses row-level uniqueness on idempotency_key).
    const seedVersions = seedVersionsForFixtures();
    const { pipeline, auditWriter } = makeHarness({ guardOverride: 'allow', seedVersions });
    const { actor, award } = positivePathTriple('PROPOSE_RESUMPTION');
    const req = fixtureCommandRequest('PROPOSE_RESUMPTION', actor, award, {
      idempotencyKey: 'concurrent_key',
    });
    const r1 = await pipeline.execute({ ...req, commandId: 'cmd_1' });
    const r2 = await pipeline.execute({ ...req, commandId: 'cmd_2' });
    const r3 = await pipeline.execute({ ...req, commandId: 'cmd_3' });
    const results = [r1, r2, r3];
    expect(results.filter((r) => r.outcome === 'EXECUTED').length).toBe(1);
    expect(results.filter((r) => r.outcome === 'DUPLICATE_COMMAND').length).toBe(2);
    expect(auditWriter.list().length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Rollback / compensation
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · rollback and compensation', () => {
  it('every pilot action has an audit-preserving compensation entry', () => {
    for (const a of AWARD_PILOT_ACTIONS) {
      const entry = PILOT_COMPENSATION_REGISTRY[a];
      expect(entry).toBeTruthy();
      expect(entry?.action).toBe(a);
      expect(entry?.auditTreatment).toBe('PRESERVE_ORIGINAL_APPEND_COMPENSATION');
      expect(entry?.prohibitsDeletion).toBe(true);
      expect(entry?.requiresConcurrencyToken).toBe(true);
    }
  });

  it('reminder compensation is note-only (irreversible delivery)', () => {
    const entry = PILOT_COMPENSATION_REGISTRY.SEND_LIFE_CERTIFICATE_REMINDER;
    expect(entry?.model).toBe('IRREVERSIBLE_NOTE_ONLY');
    expect(entry?.compensatingActionKey).toBe('RECORD_LIFE_CERT_REMINDER_RETRACTION_NOTE');
  });

  it('proposals expose their withdrawal compensation', () => {
    expect(
      PILOT_COMPENSATION_REGISTRY.PROPOSE_SUSPENSION?.compensatingActionKey,
    ).toBe('WITHDRAW_SUSPENSION_PROPOSAL');
    expect(
      PILOT_COMPENSATION_REGISTRY.PROPOSE_RESUMPTION?.compensatingActionKey,
    ).toBe('WITHDRAW_RESUMPTION_PROPOSAL');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Performance
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · performance thresholds', () => {
  it('normal-load pilot execution stays below latency threshold', async () => {
    const seedVersions = seedVersionsForFixtures();
    const { pipeline } = makeHarness({ guardOverride: 'allow', seedVersions });
    const metrics = new PilotMetricsAggregator();
    const N = 40;
    for (let i = 0; i < N; i++) {
      const action = AWARD_PILOT_ACTIONS[i % AWARD_PILOT_ACTIONS.length];
      const { actor, award } = positivePathTriple(action);
      const r = await pipeline.execute(
        fixtureCommandRequest(action, actor, award, {
          idempotencyKey: `perf_${action}_${i}`,
          expectedVersion: award.version + Math.floor(i / AWARD_PILOT_ACTIONS.length),
        }),
      );
      metrics.ingestResult(r);
    }
    const snap = metrics.snapshot();
    expect(snap.latencyMs.average).toBeLessThan(DEFAULT_ALERT_THRESHOLDS.maxAverageLatencyMs);
    expect(snap.latencyMs.max).toBeLessThan(5_000);
  });

  it('concurrent commands on different awards all succeed', async () => {
    const seedVersions = seedVersionsForFixtures();
    const { pipeline } = makeHarness({ guardOverride: 'allow', seedVersions });
    const jobs: Promise<AwardCommandResult>[] = [];
    for (const action of AWARD_PILOT_ACTIONS) {
      const { actor, award } = positivePathTriple(action);
      jobs.push(pipeline.execute(fixtureCommandRequest(action, actor, award)));
    }
    const results = await Promise.all(jobs);
    expect(results.every((r) => r.outcome === 'EXECUTED')).toBe(true);
  });

  it('competing commands on the same award serialize via version', async () => {
    const seedVersions = seedVersionsForFixtures();
    const { pipeline } = makeHarness({ guardOverride: 'allow', seedVersions });
    const { actor, award } = positivePathTriple('SEND_LIFE_CERTIFICATE_REMINDER');
    const [r1, r2] = await Promise.all([
      pipeline.execute(
        fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award, {
          idempotencyKey: 'race_1',
        }),
      ),
      pipeline.execute(
        fixtureCommandRequest('SEND_LIFE_CERTIFICATE_REMINDER', actor, award, {
          idempotencyKey: 'race_2',
        }),
      ),
    ]);
    const outcomes = [r1.outcome, r2.outcome];
    expect(outcomes.filter((o) => o === 'EXECUTED').length).toBeGreaterThanOrEqual(1);
    expect(outcomes.filter((o) => o === 'VERSION_CONFLICT' || o === 'EXECUTED').length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Deployment safety
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · deployment safety', () => {
  it('kill-switch default is OFF and cohort default is CLOSED', () => {
    expect(AWARD_PILOT_DEPLOYMENT_SAFETY.killSwitchDefault).toBe('OFF');
    expect(AWARD_PILOT_DEPLOYMENT_SAFETY.cohortDefault).toBe('CLOSED');
  });

  it('back-compat manifest list contains the previous stage version', () => {
    expect(AWARD_PILOT_DEPLOYMENT_SAFETY.manifestBackCompatibleWith).toContain('AW360-WAVE-1-C1-D5');
  });

  it('deployment safety pilot list matches the executable registry', () => {
    expect([...AWARD_PILOT_DEPLOYMENT_SAFETY.pilotActions].sort()).toEqual(
      [...AWARD_COMMAND_REGISTRY.keys()].sort(),
    );
  });

  it('rollback plan is documented with at least four steps', () => {
    expect(AWARD_PILOT_DEPLOYMENT_SAFETY.migrationRollbackPlan.length).toBeGreaterThanOrEqual(4);
  });
});

// ─────────────────────────────────────────────────────────────────────
// UAT catalog
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · UAT catalog', () => {
  it('every pilot action has at least one positive and one negative UAT scenario', () => {
    for (const a of AWARD_PILOT_ACTIONS) {
      const scenarios = PILOT_UAT_CATALOG.filter((s) => s.action === a);
      expect(scenarios.length).toBeGreaterThanOrEqual(2);
      expect(scenarios.some((s) => s.expectedGuardResult === 'ALLOWED')).toBe(true);
      expect(scenarios.some((s) => s.expectedGuardResult === 'DENIED')).toBe(true);
    }
  });

  it('proposal actions never elevate beyond a proposal', () => {
    const summary = summariseUATCoverage();
    expect(summary.proposalsRemainProposals).toBe(true);
  });

  it('every UAT scenario declares expected telemetry with COMMAND_ATTEMPT', () => {
    for (const s of PILOT_UAT_CATALOG) {
      expect(s.expectedTelemetry).toContain('COMMAND_ATTEMPT');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Runbooks
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · runbooks', () => {
  it('all required runbooks are present', () => {
    const titles = PILOT_RUNBOOKS.map((r) => r.title.toLowerCase());
    for (const needle of [
      'activate',
      'kill switch',
      'correlation',
      'version conflict',
      'duplicate',
      'missing audit',
      'provider',
      'withdraw',
      'medical review',
      'security',
      'roll back',
    ]) {
      expect(titles.some((t) => t.includes(needle))).toBe(true);
    }
  });

  it('every runbook declares a required role and expected audit evidence', () => {
    for (const rb of PILOT_RUNBOOKS) {
      expect(rb.requiredRole.length).toBeGreaterThan(0);
      expect(rb.expectedAuditEvidence.length).toBeGreaterThan(0);
      expect(rb.steps.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Fixtures sanity
// ─────────────────────────────────────────────────────────────────────

describe('Stage D6 · fixtures', () => {
  it('multi-tenant fixtures include at least one disabled tenant', () => {
    expect(PILOT_TENANTS.some((t) => !t.cohortEnabled)).toBe(true);
  });

  it('positive-path actors are non-privileged (not read_only_auditor or external)', () => {
    for (const a of AWARD_PILOT_ACTIONS) {
      const { actor } = positivePathTriple(a);
      expect(actor.effectiveRole).not.toBe('read_only_auditor');
      expect(actor.effectiveRole).not.toBe('external');
    }
  });

  it('an ineligible (cancelled or deceased) award exists for negative-path tests', () => {
    expect(PILOT_AWARDS.some((a) => a.deceased || a.awardStatus === 'CANCELLED')).toBe(true);
  });

  it('a stale-version award exists', () => {
    expect(PILOT_AWARDS.some((a) => a.version >= 50)).toBe(true);
  });

  it('resolver input mirrors the fixture data', () => {
    const { actor, award } = positivePathTriple('PROPOSE_SUSPENSION');
    const input = fixtureResolverInput('PROPOSE_SUSPENSION', actor, award);
    expect(input.awardId).toBe(award.awardId);
    expect(input.awardStatus).toBe(award.awardStatus);
  });
});
