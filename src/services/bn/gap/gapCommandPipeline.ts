/**
 * BN Gap Modules — Server-authorised Command Pipeline (portable).
 *
 * This module contains the ORDERED, FAIL-CLOSED logic every gap-module
 * mutation flows through. It is deliberately transport-agnostic:
 *
 *   - Today it runs inside `supabase/functions/bn-gap-command`.
 *   - Tomorrow the same file (or its exact port) runs inside an ASP.NET Core
 *     controller — hence dependency injection for every side-effecting store.
 *
 * Ordering (any earlier failure short-circuits later steps):
 *
 *   1. Envelope structural validation
 *   2. Module registration (app_modules.exists)
 *   3. moduleEnabled / routesEnabled / actionsEnabled
 *   4. Capability mapping present (command → capability)
 *   5. Actor role → capability check (RoleCapabilityChecker)
 *   6. Handler registered
 *   7. Idempotency replay
 *   8. Payload validation (handler.validate)
 *   9. Optimistic concurrency (expectedRowVersion vs current)
 *  10. Maker-checker + self-approval prevention (handler.approval)
 *  11. Handler.execute inside a transaction boundary
 *  12. Before/after audit write
 *  13. Idempotency store
 *  14. Structured result
 *
 * The pipeline NEVER writes directly — all writes are delegated to injected
 * stores. This is what lets the same file power both backends.
 */
import type {
  BnGapCommandEnvelope,
  BnGapModuleCode,
} from '@/types/bn/gap/commandEnvelope';
import type {
  BnGapCommandError,
  BnGapCommandResult,
  BnGapCommandWarning,
} from '@/types/bn/gap/commandResult';
import {
  BN_GAP_MODULE_CODES,
  isBnGapModuleCode,
} from '@/types/bn/gap/moduleCodes';
import {
  requiredCapabilityFor,
  type BnGapCapability,
} from './gapCapabilityRegistry';

// ─── Injected contracts ──────────────────────────────────────────────

export interface ModuleRegistrationStore {
  load(moduleCode: BnGapModuleCode): Promise<{
    exists: boolean;
    isEnabled: boolean;
    routesEnabled: boolean;
    actionsEnabled: boolean;
  }>;
}

export interface RoleCapabilityChecker {
  actorHas(actorUserId: string, capability: BnGapCapability): Promise<boolean>;
}

export interface IdempotencyStore {
  find(idempotencyKey: string): Promise<BnGapCommandResult<any> | null>;
  save(idempotencyKey: string, result: BnGapCommandResult<any>): Promise<void>;
}

export interface VersionStore {
  currentVersion(entityType: string, entityId: string): Promise<string | null>;
}

export interface AuditWriter {
  write(input: {
    commandId: string;
    envelope: BnGapCommandEnvelope;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    outcome: BnGapCommandResult['status'];
    reasonCode: string | null;
  }): Promise<string>; // returns auditEventId
}

export interface TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export interface TelemetrySink {
  event(name: string, fields: Record<string, unknown>): void;
}

// ─── Handler contract ────────────────────────────────────────────────

export interface CommandHandler<TPayload = unknown, TData = unknown> {
  readonly commandName: string;
  readonly commandVersion: number;
  readonly moduleCode: BnGapModuleCode;
  readonly entityType: string;
  /** Return structured validation errors — never throw for user input. */
  validate(payload: TPayload): Promise<readonly BnGapCommandError[]>;
  /** Maker-checker: return REJECTED result if actor cannot approve. */
  approvalCheck?(
    envelope: BnGapCommandEnvelope<TPayload>,
  ): Promise<readonly BnGapCommandError[]>;
  /** Load current row for before-image + version check. Null for creates. */
  loadBefore(
    envelope: BnGapCommandEnvelope<TPayload>,
  ): Promise<{ before: Record<string, unknown> | null; version: string | null }>;
  /** The actual mutation. MUST be idempotent inside the transaction. */
  execute(
    envelope: BnGapCommandEnvelope<TPayload>,
  ): Promise<{
    entityId: string;
    entityVersion: string;
    after: Record<string, unknown>;
    data: TData;
    warnings?: readonly BnGapCommandWarning[];
  }>;
}

export interface HandlerRegistry {
  get(commandName: string, commandVersion: number): CommandHandler | null;
}

export interface GapCommandPipelineDeps {
  readonly modules: ModuleRegistrationStore;
  readonly roles: RoleCapabilityChecker;
  readonly idempotency: IdempotencyStore;
  readonly versions: VersionStore;
  readonly audit: AuditWriter;
  readonly transaction: TransactionRunner;
  readonly telemetry: TelemetrySink;
  readonly handlers: HandlerRegistry;
  readonly now?: () => Date;
  readonly newId?: () => string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deny(
  envelope: BnGapCommandEnvelope,
  code: string,
  message: string,
  commandId: string,
): BnGapCommandResult {
  return {
    success: false,
    commandId,
    correlationId: envelope.correlationId,
    entityId: envelope.entityId,
    entityVersion: null,
    status: 'DENIED',
    warnings: [],
    validationErrors: [],
    businessErrors: [{ code, message }],
    auditEventId: null,
    data: null,
  };
}

function invalid(
  envelope: BnGapCommandEnvelope,
  errors: readonly BnGapCommandError[],
  commandId: string,
): BnGapCommandResult {
  return {
    success: false,
    commandId,
    correlationId: envelope.correlationId,
    entityId: envelope.entityId,
    entityVersion: null,
    status: 'INVALID',
    warnings: [],
    validationErrors: errors,
    businessErrors: [],
    auditEventId: null,
    data: null,
  };
}

function validateEnvelope(env: BnGapCommandEnvelope): readonly BnGapCommandError[] {
  const e: BnGapCommandError[] = [];
  if (!env || typeof env !== 'object') {
    return [{ code: 'ENVELOPE_MISSING', message: 'Command envelope is required.' }];
  }
  if (!env.commandName || typeof env.commandName !== 'string') {
    e.push({ code: 'ENVELOPE_COMMAND_NAME', message: 'commandName is required.', field: 'commandName' });
  }
  if (!Number.isInteger(env.commandVersion) || env.commandVersion < 1) {
    e.push({ code: 'ENVELOPE_COMMAND_VERSION', message: 'commandVersion must be a positive integer.', field: 'commandVersion' });
  }
  if (!env.idempotencyKey || !UUID_RE.test(env.idempotencyKey)) {
    e.push({ code: 'ENVELOPE_IDEMPOTENCY_KEY', message: 'idempotencyKey must be a UUID.', field: 'idempotencyKey' });
  }
  if (!env.correlationId || !UUID_RE.test(env.correlationId)) {
    e.push({ code: 'ENVELOPE_CORRELATION_ID', message: 'correlationId must be a UUID.', field: 'correlationId' });
  }
  if (!isBnGapModuleCode(env.moduleCode)) {
    e.push({ code: 'ENVELOPE_MODULE_CODE', message: 'moduleCode must be a registered gap module.', field: 'moduleCode' });
  }
  if (!env.entityType || typeof env.entityType !== 'string') {
    e.push({ code: 'ENVELOPE_ENTITY_TYPE', message: 'entityType is required.', field: 'entityType' });
  }
  if (env.entityId !== null && (typeof env.entityId !== 'string' || !UUID_RE.test(env.entityId))) {
    e.push({ code: 'ENVELOPE_ENTITY_ID', message: 'entityId must be a UUID or null.', field: 'entityId' });
  }
  if (!env.actorUserId || typeof env.actorUserId !== 'string') {
    e.push({ code: 'ENVELOPE_ACTOR_USER_ID', message: 'actorUserId is required.', field: 'actorUserId' });
  }
  const code = (env.actorUserCode ?? '').trim();
  if (!code || ['SYSTEM', 'CURRENT_USER', 'ANONYMOUS', 'UNKNOWN'].includes(code.toUpperCase())) {
    e.push({ code: 'ENVELOPE_ACTOR_USER_CODE', message: 'actorUserCode must be a real user_code.', field: 'actorUserCode' });
  }
  if (!Array.isArray(env.actorRoles)) {
    e.push({ code: 'ENVELOPE_ACTOR_ROLES', message: 'actorRoles must be an array.', field: 'actorRoles' });
  }
  if (!env.requestedAtUtc || Number.isNaN(Date.parse(env.requestedAtUtc))) {
    e.push({ code: 'ENVELOPE_REQUESTED_AT', message: 'requestedAtUtc must be ISO-8601 UTC.', field: 'requestedAtUtc' });
  }
  return e;
}

// ─── Pipeline ────────────────────────────────────────────────────────

export function createGapCommandPipeline(deps: GapCommandPipelineDeps) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => (globalThis.crypto?.randomUUID?.() ?? fallbackUuid()));

  return {
    async execute<TPayload, TData>(
      envelope: BnGapCommandEnvelope<TPayload>,
    ): Promise<BnGapCommandResult<TData>> {
      const commandId = newId();
      const start = now().getTime();
      deps.telemetry.event('bn.gap.command.received', {
        commandId,
        commandName: envelope?.commandName,
        correlationId: envelope?.correlationId,
      });

      // 1. Envelope validation
      const envErr = validateEnvelope(envelope);
      if (envErr.length) return invalid(envelope, envErr, commandId) as BnGapCommandResult<TData>;

      // 2. Module registered
      const reg = await deps.modules.load(envelope.moduleCode);
      if (!reg.exists) {
        return deny(envelope, 'MODULE_NOT_REGISTERED', `Module ${envelope.moduleCode} is not registered.`, commandId) as BnGapCommandResult<TData>;
      }
      // 3. Rollout flags
      if (!reg.isEnabled) return deny(envelope, 'MODULE_DISABLED', 'Module is disabled.', commandId) as BnGapCommandResult<TData>;
      if (!reg.routesEnabled) return deny(envelope, 'ROUTES_DISABLED', 'Module routes are disabled.', commandId) as BnGapCommandResult<TData>;
      if (!reg.actionsEnabled) return deny(envelope, 'ACTIONS_DISABLED', 'Module actions are disabled (dark launch).', commandId) as BnGapCommandResult<TData>;

      // 4. Capability mapping
      const capability = requiredCapabilityFor(envelope.commandName);
      if (!capability) {
        return deny(envelope, 'CAPABILITY_UNMAPPED', 'Command has no capability mapping.', commandId) as BnGapCommandResult<TData>;
      }

      // 5. Role check (fail closed)
      const authorised = await deps.roles.actorHas(envelope.actorUserId, capability).catch(() => false);
      if (!authorised) {
        return deny(envelope, 'CAPABILITY_DENIED', 'Actor lacks the required capability.', commandId) as BnGapCommandResult<TData>;
      }

      // 6. Handler
      const handler = deps.handlers.get(envelope.commandName, envelope.commandVersion) as
        | CommandHandler<TPayload, TData>
        | null;
      if (!handler) {
        return deny(envelope, 'HANDLER_NOT_REGISTERED', 'No handler registered for this command/version.', commandId) as BnGapCommandResult<TData>;
      }
      if (handler.moduleCode !== envelope.moduleCode) {
        return deny(envelope, 'HANDLER_MODULE_MISMATCH', 'Handler module does not match envelope moduleCode.', commandId) as BnGapCommandResult<TData>;
      }

      // 7. Idempotency replay
      const prior = await deps.idempotency.find(envelope.idempotencyKey);
      if (prior) {
        deps.telemetry.event('bn.gap.command.replayed', { commandId, correlationId: envelope.correlationId });
        return { ...prior, status: 'REPLAYED' } as BnGapCommandResult<TData>;
      }

      // 8. Payload validation
      const payloadErr = await handler.validate(envelope.payload);
      if (payloadErr.length) return invalid(envelope, payloadErr, commandId) as BnGapCommandResult<TData>;

      // 9. Optimistic concurrency + before-image
      const { before, version } = await handler.loadBefore(envelope);
      if (envelope.expectedRowVersion !== undefined && version !== null && envelope.expectedRowVersion !== version) {
        return {
          success: false,
          commandId,
          correlationId: envelope.correlationId,
          entityId: envelope.entityId,
          entityVersion: version,
          status: 'CONFLICT',
          warnings: [],
          validationErrors: [],
          businessErrors: [{ code: 'VERSION_CONFLICT', message: 'The entity was modified by another user. Reload and try again.' }],
          auditEventId: null,
          data: null,
        } as BnGapCommandResult<TData>;
      }

      // 10. Approval / self-approval
      if (handler.approvalCheck) {
        const appErr = await handler.approvalCheck(envelope);
        if (appErr.length) {
          return {
            success: false,
            commandId,
            correlationId: envelope.correlationId,
            entityId: envelope.entityId,
            entityVersion: version,
            status: 'REJECTED',
            warnings: [],
            validationErrors: [],
            businessErrors: appErr,
            auditEventId: null,
            data: null,
          } as BnGapCommandResult<TData>;
        }
      }

      // 11+12+13. Transaction: execute → audit → idempotency
      try {
        const result = await deps.transaction.run(async () => {
          const outcome = await handler.execute(envelope);
          const auditEventId = await deps.audit.write({
            commandId,
            envelope,
            before,
            after: outcome.after,
            outcome: 'EXECUTED',
            reasonCode: envelope.reasonCode ?? null,
          });
          const finalResult: BnGapCommandResult<TData> = {
            success: true,
            commandId,
            correlationId: envelope.correlationId,
            entityId: outcome.entityId,
            entityVersion: outcome.entityVersion,
            status: 'EXECUTED',
            warnings: outcome.warnings ?? [],
            validationErrors: [],
            businessErrors: [],
            auditEventId,
            data: outcome.data,
          };
          await deps.idempotency.save(envelope.idempotencyKey, finalResult);
          return finalResult;
        });
        deps.telemetry.event('bn.gap.command.executed', {
          commandId,
          correlationId: envelope.correlationId,
          durationMs: now().getTime() - start,
        });
        return result;
      } catch (err) {
        deps.telemetry.event('bn.gap.command.failed', {
          commandId,
          correlationId: envelope.correlationId,
          error: (err as Error)?.message,
        });
        return {
          success: false,
          commandId,
          correlationId: envelope.correlationId,
          entityId: envelope.entityId,
          entityVersion: null,
          status: 'FAILED',
          warnings: [],
          validationErrors: [],
          businessErrors: [{ code: 'HANDLER_FAILED', message: 'The command could not be completed. It has been safely rolled back.' }],
          auditEventId: null,
          data: null,
        } as BnGapCommandResult<TData>;
      }
    },
  };
}

function fallbackUuid(): string {
  // RFC4122 v4-ish fallback for non-crypto environments (tests).
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
}

export const BN_GAP_MODULE_CODES_EXPORT = BN_GAP_MODULE_CODES;
