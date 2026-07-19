/**
 * BN Gap Modules — Command Pipeline certification tests.
 *
 * Proves the ordered fail-closed behaviour of the pipeline and that the
 * sample harmless PING command travels the boundary end-to-end.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBenefitsCommandPipeline,
  benefitsCommandHandlerRegistry,
  type ModuleRegistrationStore,
  type RoleCapabilityChecker,
  type IdempotencyStore,
  type VersionStore,
  type AuditWriter,
  type TransactionRunner,
  type TelemetrySink,
} from '@/services/bn/commands';
import type { BnGapCommandEnvelope } from '@/types/bn/commands/commandEnvelope';

function uuid() {
  return crypto.randomUUID();
}

interface Rig {
  modules: ModuleRegistrationStore;
  roles: RoleCapabilityChecker;
  idempotency: IdempotencyStore;
  versions: VersionStore;
  audit: AuditWriter;
  transaction: TransactionRunner;
  telemetry: TelemetrySink;
  auditRows: any[];
  idempotencyRows: Map<string, any>;
  moduleFlags: {
    exists: boolean;
    isEnabled: boolean;
    routesEnabled: boolean;
    actionsEnabled: boolean;
  };
  allow: boolean;
}

function newRig(): Rig {
  const auditRows: any[] = [];
  const idempotencyRows = new Map<string, any>();
  const rig: Rig = {
    auditRows,
    idempotencyRows,
    moduleFlags: { exists: true, isEnabled: true, routesEnabled: true, actionsEnabled: true },
    allow: true,
    modules: { async load() { return rig.moduleFlags; } },
    roles: { async actorHas() { return rig.allow; } },
    idempotency: {
      async find(k) { return idempotencyRows.get(k) ?? null; },
      async save(k, r) { idempotencyRows.set(k, r); },
    },
    versions: { async currentVersion() { return null; } },
    audit: {
      async write(row) { const id = uuid(); auditRows.push({ ...row, id }); return id; },
    },
    transaction: { async run(work) { return await work(); } },
    telemetry: { event() { /* no-op */ } },
  };
  return rig;
}

function pingEnvelope(overrides: Partial<BnGapCommandEnvelope<any>> = {}): BnGapCommandEnvelope<any> {
  return {
    commandName: 'BN_GAP_PING',
    commandVersion: 1,
    idempotencyKey: uuid(),
    correlationId: uuid(),
    moduleCode: 'bn_mortality',
    entityType: 'bn_gap_diagnostic',
    entityId: null,
    actorUserId: uuid(),
    actorUserCode: 'TEST.OPERATOR',
    actorRoles: ['bn_mortality_reader'],
    requestedAtUtc: new Date().toISOString(),
    payload: { note: 'hello' },
    ...overrides,
  };
}

describe('BN Gap — command pipeline', () => {
  let rig: Rig;
  beforeEach(() => { rig = newRig(); });

  it('executes the PING command end-to-end and writes one audit row', async () => {
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const res = await pipe.execute(pingEnvelope());
    expect(res.status).toBe('EXECUTED');
    expect(res.success).toBe(true);
    expect(res.auditEventId).toBeTruthy();
    expect(rig.auditRows).toHaveLength(1);
    expect(res.data).toMatchObject({ note: 'hello' });
  });

  it('rejects a bad envelope with INVALID before touching modules or handlers', async () => {
    let moduleLoads = 0;
    rig.modules = { async load() { moduleLoads++; return rig.moduleFlags; } };
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const res = await pipe.execute(pingEnvelope({ idempotencyKey: 'not-a-uuid' }));
    expect(res.status).toBe('INVALID');
    expect(res.validationErrors.some(e => e.code === 'ENVELOPE_IDEMPOTENCY_KEY')).toBe(true);
    expect(moduleLoads).toBe(0);
  });

  it('denies when the module is unregistered', async () => {
    rig.moduleFlags = { ...rig.moduleFlags, exists: false };
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const res = await pipe.execute(pingEnvelope());
    expect(res.status).toBe('DENIED');
    expect(res.businessErrors[0].code).toBe('MODULE_NOT_REGISTERED');
  });

  it('denies when actions are disabled (dark launch)', async () => {
    rig.moduleFlags = { ...rig.moduleFlags, actionsEnabled: false };
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const res = await pipe.execute(pingEnvelope());
    expect(res.status).toBe('DENIED');
    expect(res.businessErrors[0].code).toBe('ACTIONS_DISABLED');
  });

  it('denies when actor lacks the required capability', async () => {
    rig.allow = false;
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const res = await pipe.execute(pingEnvelope());
    expect(res.status).toBe('DENIED');
    expect(res.businessErrors[0].code).toBe('CAPABILITY_DENIED');
  });

  it('denies unmapped commands with CAPABILITY_UNMAPPED', async () => {
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const res = await pipe.execute(pingEnvelope({ commandName: 'BN_GAP_UNKNOWN' }));
    expect(res.status).toBe('DENIED');
    expect(res.businessErrors[0].code).toBe('CAPABILITY_UNMAPPED');
  });

  it('replays the identical result for the same idempotencyKey', async () => {
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const env = pingEnvelope();
    const first = await pipe.execute(env);
    const second = await pipe.execute(env);
    expect(first.status).toBe('EXECUTED');
    expect(second.status).toBe('REPLAYED');
    expect(second.commandId).toBe(first.commandId);
    expect(rig.auditRows).toHaveLength(1); // no double audit
  });

  it('rejects stale expectedRowVersion with CONFLICT', async () => {
    rig.versions = { async currentVersion() { return '7'; } };
    // Wire a handler that reports a current version different from the envelope's expectation.
    const pipe = createBenefitsCommandPipeline({
      ...rig,
      handlers: {
        get: () => ({
          commandName: 'BN_GAP_PING',
          commandVersion: 1,
          moduleCode: 'bn_mortality',
          entityType: 'bn_gap_diagnostic',
          async validate() { return []; },
          async loadBefore() { return { before: { id: 'x' }, version: '7' }; },
          async execute() { throw new Error('should not run'); },
        }),
      },
    });
    const res = await pipe.execute(pingEnvelope({ expectedRowVersion: '3', entityId: crypto.randomUUID() }));
    expect(res.status).toBe('CONFLICT');
    expect(res.businessErrors[0].code).toBe('VERSION_CONFLICT');
    expect(res.entityVersion).toBe('7');
  });

  it('rolls back and reports FAILED when the handler throws', async () => {
    const pipe = createBenefitsCommandPipeline({
      ...rig,
      handlers: {
        get: () => ({
          commandName: 'BN_GAP_PING',
          commandVersion: 1,
          moduleCode: 'bn_mortality',
          entityType: 'bn_gap_diagnostic',
          async validate() { return []; },
          async loadBefore() { return { before: null, version: null }; },
          async execute() { throw new Error('boom'); },
        }),
      },
    });
    const res = await pipe.execute(pingEnvelope());
    expect(res.status).toBe('FAILED');
    expect(res.businessErrors[0].code).toBe('HANDLER_FAILED');
    expect(rig.auditRows).toHaveLength(0);
    expect(rig.idempotencyRows.size).toBe(0);
  });

  it('rejects self-approval when the handler.approvalCheck returns errors', async () => {
    const pipe = createBenefitsCommandPipeline({
      ...rig,
      handlers: {
        get: () => ({
          commandName: 'BN_GAP_PING',
          commandVersion: 1,
          moduleCode: 'bn_mortality',
          entityType: 'bn_gap_diagnostic',
          async validate() { return []; },
          async loadBefore() { return { before: null, version: null }; },
          async approvalCheck() { return [{ code: 'SELF_APPROVAL_FORBIDDEN', message: 'You cannot approve your own submission.' }]; },
          async execute() { throw new Error('should not run'); },
        }),
      },
    });
    const res = await pipe.execute(pingEnvelope());
    expect(res.status).toBe('REJECTED');
    expect(res.businessErrors[0].code).toBe('SELF_APPROVAL_FORBIDDEN');
  });

  it('rejects a bad payload with INVALID', async () => {
    const pipe = createBenefitsCommandPipeline({ ...rig, handlers: benefitsCommandHandlerRegistry });
    const res = await pipe.execute(pingEnvelope({ payload: { note: 123 as any } }));
    expect(res.status).toBe('INVALID');
    expect(res.validationErrors[0].code).toBe('PING_NOTE_TYPE');
  });
});
