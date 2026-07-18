/**
 * AW360-WAVE-1-C1 Stage D5 — Canonical command execution pipeline.
 *
 * Every Award 360 state-changing command MUST flow through this single
 * pipeline. The pipeline:
 *
 *   1. Validates the command envelope + payload.
 *   2. Loads the pilot registry entry — no handler = HANDLER_NOT_REGISTERED.
 *   3. Re-evaluates the D4 canonical guard using fresh input (never trusts
 *      a cached UI decision).
 *   4. Checks the runtime kill-switch. Kill-switch OFF blocks execution
 *      even when the guard says ALLOWED — this proves that flipping the
 *      switch immediately blocks stale-screen callers.
 *   5. Enforces idempotency (tenant-scoped) with payload-fingerprint
 *      collision detection.
 *   6. Enforces optimistic concurrency via `expectedVersion`.
 *   7. Runs the handler inside the injected mutation executor
 *      (`AwardMutationExecutor.execute(...)`), then writes the audit
 *      evidence inside the same executor callback — either both persist
 *      or neither does.
 *   8. Emits structured telemetry with correlation IDs at every step.
 *   9. Returns a stable typed `AwardCommandResult`.
 *
 * The pipeline never re-implements resolver / guard / permission logic.
 */
import {
  evaluateAwardActionGuard,
  type AwardActionGuardDecision,
} from '../awardActionGuard';
import { AWARD360_MANIFEST_VERSION } from '../award360LoaderManifest';
import {
  fingerprintPayload,
  type AwardAuditEvidence,
  type AwardAuditWriter,
  type AwardCommandKillSwitch,
  type AwardCommandRegistry,
  type AwardCommandRequest,
  type AwardCommandResult,
  type AwardCommandTelemetryEvent,
  type AwardCommandTelemetrySink,
  type AwardIdempotencyStore,
  type AwardMutationExecutor,
  type AwardVersionStore,
} from './awardCommandContracts';

export interface AwardCommandPipelineDeps {
  readonly registry: AwardCommandRegistry;
  readonly killSwitch: AwardCommandKillSwitch;
  readonly executor: AwardMutationExecutor;
  readonly idempotencyStore: AwardIdempotencyStore;
  readonly versionStore: AwardVersionStore;
  readonly auditWriter: AwardAuditWriter;
  readonly telemetry: AwardCommandTelemetrySink;
  readonly appVersion: string;
  /** Injectable for tests; defaults to the canonical D4 guard. */
  readonly evaluateGuard?: (input: AwardActionGuardDecision extends never ? never : Parameters<typeof evaluateAwardActionGuard>[0]) => AwardActionGuardDecision;
  /** Optional cohort predicate for controlled rollout. */
  readonly cohortAllows?: (request: AwardCommandRequest) => boolean;
  readonly now?: () => Date;
}

export class AwardCommandPipeline {
  private readonly deps: Required<
    Pick<AwardCommandPipelineDeps, 'evaluateGuard' | 'cohortAllows' | 'now'>
  > &
    AwardCommandPipelineDeps;

  constructor(deps: AwardCommandPipelineDeps) {
    this.deps = {
      ...deps,
      evaluateGuard: deps.evaluateGuard ?? (evaluateAwardActionGuard as any),
      cohortAllows: deps.cohortAllows ?? (() => true),
      now: deps.now ?? (() => new Date()),
    };
  }

  async execute(request: AwardCommandRequest): Promise<AwardCommandResult> {
    const start = Date.now();
    const base = {
      commandId: request.commandId,
      correlationId: request.correlationId,
      action: request.action,
      awardId: request.awardId,
      tenantId: request.tenantId,
    };
    const finish = (r: Omit<AwardCommandResult, 'durationMs'>): AwardCommandResult => ({
      ...r,
      durationMs: Date.now() - start,
    });

    this.emit({
      type: 'COMMAND_ATTEMPT',
      ...base,
      manifestVersion: AWARD360_MANIFEST_VERSION,
      appVersion: this.deps.appVersion,
      cohortTags: request.actor.cohortTags,
      at: this.deps.now().toISOString(),
    });

    // 1. Handler registered?
    const entry = this.deps.registry.get(request.action);
    if (!entry) {
      const result = finish({
        ...base,
        outcome: 'HANDLER_NOT_REGISTERED',
        message: `No pilot handler registered for ${request.action}`,
      });
      this.emitOutcome(result);
      return result;
    }

    // 2. Payload valid?
    const parsed = entry.validatePayload(request.payload) as
      | { ok: true; value: unknown }
      | { ok: false; message: string };
    if (parsed.ok === false) {
      const result = finish({
        ...base,
        outcome: 'INVALID_PAYLOAD',
        errorClass: 'ValidationError',
        message: parsed.message,
      });
      this.emitOutcome(result);
      return result;
    }

    // 3. Guard (fresh evaluation).
    const guard = this.deps.evaluateGuard(request.resolverInput as any);
    this.emit({
      type: 'GUARD_DECISION',
      ...base,
      manifestVersion: AWARD360_MANIFEST_VERSION,
      appVersion: this.deps.appVersion,
      guardReasonCode: guard.reasonCode,
      cohortTags: request.actor.cohortTags,
      at: this.deps.now().toISOString(),
    });
    if (!guard.allowed) {
      const result = finish({
        ...base,
        outcome: 'GUARD_DENIED',
        guard,
        errorClass: guard.reasonCode,
        message: guard.reason,
      });
      this.emitOutcome(result);
      return result;
    }

    // 4. Kill-switch (blocks even a stale-screen bypass).
    if (!this.deps.killSwitch.isPilotActionEnabled(request.action)) {
      const result = finish({
        ...base,
        outcome: 'KILL_SWITCH_OFF',
        guard,
        message: 'Runtime kill-switch is OFF for this pilot action',
      });
      this.emitOutcome(result);
      return result;
    }

    // 5. Cohort gate.
    if (!this.deps.cohortAllows(request)) {
      const result = finish({
        ...base,
        outcome: 'ROLLOUT_COHORT_EXCLUDED',
        guard,
        message: 'Actor is outside the configured pilot cohort',
      });
      this.emitOutcome(result);
      return result;
    }

    // 6. Idempotency.
    const payloadFp = fingerprintPayload(parsed.value);
    const prior = this.deps.idempotencyStore.get(request.tenantId, request.idempotencyKey);
    if (prior) {
      if (prior.action !== request.action || prior.payloadFingerprint !== payloadFp) {
        const result = finish({
          ...base,
          outcome: 'IDEMPOTENCY_KEY_CONFLICT',
          guard,
          errorClass: 'IdempotencyKeyConflict',
          message: 'Idempotency key was reused with a different payload/action',
        });
        this.emitOutcome(result);
        return result;
      }
      const replayed: AwardCommandResult = {
        ...prior.result,
        outcome: 'DUPLICATE_COMMAND',
        durationMs: Date.now() - start,
        commandId: request.commandId,
        correlationId: request.correlationId,
      };
      this.emit({
        type: 'IDEMPOTENT_REPLAY',
        ...base,
        manifestVersion: AWARD360_MANIFEST_VERSION,
        appVersion: this.deps.appVersion,
        outcome: 'DUPLICATE_COMMAND',
        durationMs: replayed.durationMs,
        at: this.deps.now().toISOString(),
      });
      return replayed;
    }

    // 7. Optimistic concurrency.
    const priorVersion = this.deps.versionStore.getVersion(request.tenantId, request.awardId);
    if (priorVersion !== request.expectedVersion) {
      const result = finish({
        ...base,
        outcome: 'VERSION_CONFLICT',
        guard,
        errorClass: 'VersionConflict',
        message: `expected v${request.expectedVersion}, current v${priorVersion}`,
      });
      this.emit({
        type: 'VERSION_CONFLICT',
        ...base,
        manifestVersion: AWARD360_MANIFEST_VERSION,
        appVersion: this.deps.appVersion,
        outcome: 'VERSION_CONFLICT',
        at: this.deps.now().toISOString(),
      });
      this.emitOutcome(result);
      return result;
    }

    // 8. Transactional handler + audit persistence.
    const newVersion = priorVersion + 1;
    let handlerOut: { result: unknown; changedFields: readonly string[] } | null = null;
    let auditFailed = false;
    let handlerFailed = false;
    let failureMessage: string | undefined;

    try {
      await this.deps.executor.execute(
        {
          action: request.action,
          awardId: request.awardId,
          tenantId: request.tenantId,
          commandId: request.commandId,
        },
        async () => {
          handlerOut = await entry.handler({
            request: { ...request, payload: parsed.value },
            priorVersion,
            newVersion,
          });
          const evidence: AwardAuditEvidence = {
            action: request.action,
            awardId: request.awardId,
            tenantId: request.tenantId,
            actorUserId: request.actor.userId,
            effectiveRole: request.actor.effectiveRole,
            commandId: request.commandId,
            correlationId: request.correlationId,
            idempotencyKey: request.idempotencyKey,
            priorVersion,
            newVersion,
            guardReasonCode: guard.reasonCode,
            changedFields: handlerOut.changedFields,
            outcome: 'EXECUTED',
            at: this.deps.now().toISOString(),
          };
          try {
            this.deps.auditWriter.write(evidence);
          } catch (e) {
            auditFailed = true;
            failureMessage = (e as Error).message;
            throw e; // roll back the executor
          }
          this.deps.versionStore.setVersion(request.tenantId, request.awardId, newVersion);
        },
      );
    } catch (e) {
      if (!auditFailed) {
        handlerFailed = true;
        failureMessage = (e as Error).message;
      }
    }

    if (auditFailed) {
      const result = finish({
        ...base,
        outcome: 'AUDIT_PERSISTENCE_FAILED',
        guard,
        errorClass: 'AuditPersistenceFailed',
        message: failureMessage,
      });
      this.emit({
        type: 'AUDIT_PERSISTENCE_FAILED',
        ...base,
        manifestVersion: AWARD360_MANIFEST_VERSION,
        appVersion: this.deps.appVersion,
        outcome: 'AUDIT_PERSISTENCE_FAILED',
        at: this.deps.now().toISOString(),
      });
      this.emitOutcome(result);
      return result;
    }
    if (handlerFailed || !handlerOut) {
      const result = finish({
        ...base,
        outcome: 'HANDLER_FAILED',
        guard,
        errorClass: 'HandlerFailed',
        message: failureMessage,
      });
      this.emitOutcome(result);
      return result;
    }

    const result = finish({
      ...base,
      outcome: 'EXECUTED',
      guard,
      newVersion,
      result: (handlerOut as { result: unknown }).result,
    });

    this.deps.idempotencyStore.put({
      tenantId: request.tenantId,
      idempotencyKey: request.idempotencyKey,
      action: request.action,
      payloadFingerprint: payloadFp,
      result,
    });

    this.emitOutcome(result);
    return result;
  }

  private emit(e: AwardCommandTelemetryEvent) {
    this.deps.telemetry.emit(e);
  }

  private emitOutcome(r: AwardCommandResult) {
    this.emit({
      type:
        r.outcome === 'EXECUTED'
          ? 'COMMAND_EXECUTED'
          : r.outcome === 'GUARD_DENIED' ||
            r.outcome === 'KILL_SWITCH_OFF' ||
            r.outcome === 'ROLLOUT_COHORT_EXCLUDED'
          ? 'COMMAND_DENIED'
          : 'COMMAND_FAILED',
      action: r.action,
      commandId: r.commandId,
      correlationId: r.correlationId,
      tenantId: r.tenantId,
      manifestVersion: AWARD360_MANIFEST_VERSION,
      appVersion: this.deps.appVersion,
      outcome: r.outcome,
      guardReasonCode: r.guard?.reasonCode,
      durationMs: r.durationMs,
      at: this.deps.now().toISOString(),
    });
  }
}
