/**
 * AW360-WAVE-1-C1 Stage D5 — Pilot pipeline certification.
 *
 * Executable certification. Covers:
 *   - registry integrity (pilot actions match declared list)
 *   - guard integration (denial from the real D4 guard blocks execution)
 *   - kill-switch (blocks even when guard would allow)
 *   - cohort exclusion
 *   - unknown / non-pilot action → HANDLER_NOT_REGISTERED
 *   - payload validation
 *   - optimistic concurrency (VERSION_CONFLICT)
 *   - idempotency (same key + same payload → DUPLICATE_COMMAND, replay of
 *     the persisted result; audit is written exactly once)
 *   - idempotency-key reuse with a different payload → IDEMPOTENCY_KEY_CONFLICT
 *   - handler failure → HANDLER_FAILED, audit not written
 *   - audit persistence failure → AUDIT_PERSISTENCE_FAILED, version not bumped
 *   - happy path → EXECUTED, audit written, version bumped, telemetry emitted
 *   - inventory summary reflects pilot registrations
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
} from '@/services/bn/awards/pilot/awardCommandContracts';
import { AwardCommandPipeline } from '@/services/bn/awards/pilot/awardCommandPipeline';
import {
  summariseAwardActionInventory,
  getResolvedAwardActionInventory,
} from '@/services/bn/awards/awardActionConsumerInventory';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

const AWARD_ID = '11111111-1111-1111-1111-111111111111';
const TENANT = 'tenant_a';
const ACTOR = { userId: 'user_1', effectiveRole: 'benefits_officer', cohortTags: ['pilot_cohort_a'] as const };

function baseResolverInput(action: AwardActionKey): AwardActionInput {
  return {
    action,
    awardId: AWARD_ID,
    awardStatus: 'ACTIVE',
    permissions: {
      canServiceLifeCert: true,
      canServiceMedical: true,
      canServiceCommunications: true,
      canServiceSuspension: true,
      canProposeSuspension: true,
      canApproveSuspension: true,
    } as any,
    featureEnabled: {
      lifeCert: true,
      medicalReview: true,
      awardSuspension: true,
    } as any,
    rolloutStates: {} as any,
    capabilities: {},
    rollout: {},
  };
}

function baseRequest(
  action: AwardActionKey,
  payload: unknown,
  overrides: Partial<AwardCommandRequest> = {},
): AwardCommandRequest {
  return {
    commandId: overrides.commandId ?? `cmd_${action}_${Math.random().toString(36).slice(2)}`,
    correlationId: overrides.correlationId ?? 'corr_1',
    idempotencyKey: overrides.idempotencyKey ?? `idem_${Math.random().toString(36).slice(2)}`,
    tenantId: overrides.tenantId ?? TENANT,
    action,
    awardId: overrides.awardId ?? AWARD_ID,
    expectedVersion: overrides.expectedVersion ?? 1,
    payload,
    actor: overrides.actor ?? ACTOR,
    resolverInput: overrides.resolverInput ?? baseResolverInput(action),
  };
}

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

function makePipeline(opts: {
  killSwitchOn?: boolean;
  cohortAllows?: boolean;
  guardOverride?: 'allow' | 'real';
  executorFailOnce?: boolean;
  auditFailOnce?: boolean;
  seedVersion?: number;
} = {}) {
  const killSwitch = createInMemoryKillSwitch();
  for (const a of AWARD_PILOT_ACTIONS) killSwitch.setPilotActionEnabled(a, opts.killSwitchOn ?? true);
  const executor = createInMemoryExecutor({ failOnce: opts.executorFailOnce });
  const idempotencyStore = createInMemoryIdempotencyStore();
  const versionStore = createInMemoryVersionStore(
    opts.seedVersion ? { [`${TENANT}::${AWARD_ID}`]: opts.seedVersion } : {},
  );
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

const validSendReminderPayload = {
  lifeCertificateId: 'lc_1',
  channel: 'EMAIL' as const,
  reminderTemplateCode: 'LC_REMINDER_V1',
};

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('Stage D5 · pilot registry integrity', () => {
  it('registry keys exactly match the declared pilot action list', () => {
    const keys = [...AWARD_COMMAND_REGISTRY.keys()].sort();
    expect(keys).toEqual([...AWARD_PILOT_ACTIONS].sort());
  });

  it('every pilot entry enforces transaction, idempotency, and concurrency', () => {
    for (const [, e] of AWARD_COMMAND_REGISTRY) {
      expect(e.requiresTransaction).toBe(true);
      expect(e.requiresIdempotency).toBe(true);
      expect(e.requiresOptimisticConcurrency).toBe(true);
      expect(e.isPilot).toBe(true);
      expect(e.auditEventType.length).toBeGreaterThan(0);
      expect(['REVERSIBLE_VIA_COMPENSATION', 'IDEMPOTENT_NOOP', 'IRREVERSIBLE']).toContain(e.reversibility);
      expect(e.rationale.length).toBeGreaterThan(0);
    }
  });

  it('inventory surface reports the pilot actions with resolved handlers', () => {
    const summary = summariseAwardActionInventory();
    expect(summary.pilotActions.slice().sort()).toEqual([...AWARD_PILOT_ACTIONS].sort());
    const resolved = getResolvedAwardActionInventory();
    for (const a of AWARD_PILOT_ACTIONS) {
      expect(resolved[a].mutationHandler).toMatch(/^pilot:/);
      expect(resolved[a].auditEvent).toBeTruthy();
    }
  });
});

describe('Stage D5 · guard integration', () => {
  it('unknown action → HANDLER_NOT_REGISTERED (never reaches guard)', async () => {
    const { pipeline } = makePipeline();
    const req = baseRequest('CANCEL_PAYMENT' as AwardActionKey, {});
    const r = await pipeline.execute(req);
    expect(r.outcome).toBe('HANDLER_NOT_REGISTERED');
  });

  it('real D4 guard denies dark-launched pilot action → GUARD_DENIED · SERVER_COMMAND_UNAVAILABLE', async () => {
    const { pipeline } = makePipeline({ guardOverride: 'real' });
    const r = await pipeline.execute(
      baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload),
    );
    expect(r.outcome).toBe('GUARD_DENIED');
    expect(r.guard?.reasonCode).toBe('SERVER_COMMAND_UNAVAILABLE');
  });
});

describe('Stage D5 · runtime kill-switch and cohort gates', () => {
  it('kill-switch OFF blocks execution even when the guard says ALLOWED', async () => {
    const { pipeline } = makePipeline({ guardOverride: 'allow', killSwitchOn: false });
    const r = await pipeline.execute(
      baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload),
    );
    expect(r.outcome).toBe('KILL_SWITCH_OFF');
  });

  it('cohort exclusion → ROLLOUT_COHORT_EXCLUDED', async () => {
    const { pipeline } = makePipeline({ guardOverride: 'allow', cohortAllows: false });
    const r = await pipeline.execute(
      baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload),
    );
    expect(r.outcome).toBe('ROLLOUT_COHORT_EXCLUDED');
  });
});

describe('Stage D5 · payload validation', () => {
  it('missing required fields → INVALID_PAYLOAD', async () => {
    const { pipeline } = makePipeline({ guardOverride: 'allow' });
    const r = await pipeline.execute(
      baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', { channel: 'EMAIL' }),
    );
    expect(r.outcome).toBe('INVALID_PAYLOAD');
    expect(r.errorClass).toBe('ValidationError');
  });
});

describe('Stage D5 · optimistic concurrency', () => {
  it('expectedVersion mismatch → VERSION_CONFLICT', async () => {
    const { pipeline } = makePipeline({ guardOverride: 'allow', seedVersion: 5 });
    const r = await pipeline.execute(
      baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload, {
        expectedVersion: 2,
      }),
    );
    expect(r.outcome).toBe('VERSION_CONFLICT');
  });
});

describe('Stage D5 · idempotency', () => {
  it('same key + same payload → DUPLICATE_COMMAND and audit written exactly once', async () => {
    const { pipeline, auditWriter } = makePipeline({ guardOverride: 'allow' });
    const req = baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload, {
      idempotencyKey: 'shared_key',
    });
    const first = await pipeline.execute(req);
    const second = await pipeline.execute({ ...req, commandId: 'cmd_second' });
    expect(first.outcome).toBe('EXECUTED');
    expect(second.outcome).toBe('DUPLICATE_COMMAND');
    expect(auditWriter.list().length).toBe(1);
  });

  it('same key + different payload → IDEMPOTENCY_KEY_CONFLICT', async () => {
    const { pipeline } = makePipeline({ guardOverride: 'allow' });
    const req = baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload, {
      idempotencyKey: 'reused_key',
    });
    await pipeline.execute(req);
    const r = await pipeline.execute({
      ...req,
      commandId: 'cmd_x',
      payload: { ...validSendReminderPayload, note: 'different' },
      expectedVersion: 2,
    });
    expect(r.outcome).toBe('IDEMPOTENCY_KEY_CONFLICT');
  });
});

describe('Stage D5 · failure isolation', () => {
  it('handler failure → HANDLER_FAILED, no audit written, version unchanged', async () => {
    const { pipeline, auditWriter, versionStore } = makePipeline({
      guardOverride: 'allow',
      executorFailOnce: true,
    });
    const r = await pipeline.execute(
      baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload),
    );
    expect(r.outcome).toBe('HANDLER_FAILED');
    expect(auditWriter.list().length).toBe(0);
    expect(versionStore.getVersion(TENANT, AWARD_ID)).toBe(1);
  });

  it('audit persistence failure → AUDIT_PERSISTENCE_FAILED, version unchanged', async () => {
    const { pipeline, auditWriter, versionStore } = makePipeline({
      guardOverride: 'allow',
      auditFailOnce: true,
    });
    const r = await pipeline.execute(
      baseRequest('SEND_LIFE_CERTIFICATE_REMINDER', validSendReminderPayload),
    );
    expect(r.outcome).toBe('AUDIT_PERSISTENCE_FAILED');
    expect(auditWriter.list().length).toBe(0);
    expect(versionStore.getVersion(TENANT, AWARD_ID)).toBe(1);
  });
});

describe('Stage D5 · happy path and telemetry', () => {
  it.each(AWARD_PILOT_ACTIONS)('EXECUTED with audit + version bump + telemetry — %s', async (action) => {
    // Build a realistic valid payload per pilot action.
    const payloadFor: Record<AwardActionKey, unknown> = {
      SEND_LIFE_CERTIFICATE_REMINDER: validSendReminderPayload,
      SCHEDULE_MEDICAL_REVIEW: {
        medicalReviewScheduleId: 'mrs_1',
        scheduledFor: '2026-08-01',
        panelCode: 'PANEL_A',
      },
      PROPOSE_SUSPENSION: { reasonCode: 'NON_COMPLIANCE', effectiveDate: '2026-08-15' },
      PROPOSE_RESUMPTION: { reasonCode: 'COMPLIANT_AGAIN', effectiveDate: '2026-09-01' },
    } as any;
    const resolverInput = baseResolverInput(action);
    if (action === 'PROPOSE_RESUMPTION') resolverInput.awardStatus = 'SUSPENDED';

    const { pipeline, auditWriter, versionStore, telemetry } = makePipeline({ guardOverride: 'allow' });
    const r = await pipeline.execute(
      baseRequest(action, payloadFor[action], { resolverInput }),
    );
    expect(r.outcome).toBe('EXECUTED');
    expect(r.newVersion).toBe(2);
    expect(versionStore.getVersion(TENANT, AWARD_ID)).toBe(2);
    const audits = auditWriter.list();
    expect(audits.length).toBe(1);
    expect(audits[0].action).toBe(action);
    expect(audits[0].outcome).toBe('EXECUTED');
    expect(audits[0].newVersion).toBe(2);
    const types = telemetry.drain().map((e) => e.type);
    expect(types).toContain('COMMAND_ATTEMPT');
    expect(types).toContain('GUARD_DECISION');
    expect(types).toContain('COMMAND_EXECUTED');
  });
});
