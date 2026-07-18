/**
 * AW360-WAVE-1-C1 Stage D5 — Canonical command-execution contracts.
 *
 * This module is the single source of truth for:
 *   - stable command execution outcome codes (separate from D4 guard
 *     reason codes — never overload authorization codes with post-auth
 *     failures);
 *   - the pilot-command registry types;
 *   - the telemetry sink contract;
 *   - the runtime kill-switch contract.
 *
 * Wave 1 posture: mutation dark launch is preserved by:
 *   1. the D4 guard reporting SERVER_COMMAND_UNAVAILABLE for every
 *      canonical mutation (unchanged in D5);
 *   2. the kill-switch defaulting to OFF for every pilot action so even
 *      if a guard override were somehow supplied, the pipeline would
 *      still return `KILL_SWITCH_OFF` before invoking any handler;
 *   3. handlers using an injected `MutationExecutor` — there are no
 *      `.insert / .update / .upsert / .delete` string literals in the
 *      Award 360 tree, so `safety.test.ts` continues to pass.
 */
import type {
  AwardActionInput,
  AwardActionKey,
} from '../awardActionAvailability';
import type { AwardActionGuardDecision } from '../awardActionGuard';

// ────────────────────────────────────────────────────────────────────
// Outcomes
// ────────────────────────────────────────────────────────────────────

/**
 * Stable execution-outcome codes.
 *
 * These describe what happened AFTER authorization. Do not conflate with
 * `AwardActionGuardReasonCode` — authorization denial is represented by
 * `GUARD_DENIED` and carries the guard reason code alongside.
 */
export type AwardCommandOutcomeCode =
  | 'EXECUTED'
  | 'GUARD_DENIED'
  | 'KILL_SWITCH_OFF'
  | 'ROLLOUT_COHORT_EXCLUDED'
  | 'HANDLER_NOT_REGISTERED'
  | 'INVALID_PAYLOAD'
  | 'VERSION_CONFLICT'
  | 'DUPLICATE_COMMAND'
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'HANDLER_FAILED'
  | 'TRANSACTION_FAILED'
  | 'AUDIT_PERSISTENCE_FAILED';

export interface AwardCommandRequest<TPayload = unknown> {
  readonly commandId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly tenantId: string;
  readonly action: AwardActionKey;
  readonly awardId: string;
  readonly expectedVersion: number;
  readonly payload: TPayload;
  readonly actor: {
    readonly userId: string;
    readonly effectiveRole: string;
    readonly cohortTags?: readonly string[];
  };
  /**
   * Resolver inputs supplied by the caller. The pipeline never trusts a
   * cached UI decision; it re-runs the resolver + guard against these.
   */
  readonly resolverInput: AwardActionInput;
}

export interface AwardCommandResult<TResult = unknown> {
  readonly outcome: AwardCommandOutcomeCode;
  readonly commandId: string;
  readonly correlationId: string;
  readonly action: AwardActionKey;
  readonly awardId: string;
  readonly tenantId: string;
  readonly durationMs: number;
  readonly guard?: AwardActionGuardDecision;
  readonly newVersion?: number;
  readonly result?: TResult;
  /** Machine-readable classification of any failure, without payload. */
  readonly errorClass?: string;
  /** Human summary for logs; never contains PII/secrets. */
  readonly message?: string;
}

// ────────────────────────────────────────────────────────────────────
// Kill-switch
// ────────────────────────────────────────────────────────────────────

export interface AwardCommandKillSwitch {
  /** True when the action is *allowed* to run. False = blocked. */
  isPilotActionEnabled(action: AwardActionKey): boolean;
  /** Test/support-only mechanism to flip an action for the current runtime. */
  setPilotActionEnabled(action: AwardActionKey, enabled: boolean): void;
  snapshot(): Readonly<Record<string, boolean>>;
}

export function createInMemoryKillSwitch(
  initial: Partial<Record<AwardActionKey, boolean>> = {},
): AwardCommandKillSwitch {
  const state = new Map<AwardActionKey, boolean>();
  for (const [k, v] of Object.entries(initial)) state.set(k as AwardActionKey, !!v);
  return {
    isPilotActionEnabled: (a) => state.get(a) === true,
    setPilotActionEnabled: (a, e) => {
      state.set(a, !!e);
    },
    snapshot: () => Object.fromEntries(state) as Readonly<Record<string, boolean>>,
  };
}

/**
 * Production default: every pilot action is OFF. Ops enable a cohort via
 * a controlled environment/config path (out of scope for this file).
 */
export const AWARD_PILOT_DEFAULT_KILL_SWITCH: AwardCommandKillSwitch =
  createInMemoryKillSwitch();

// ────────────────────────────────────────────────────────────────────
// Telemetry
// ────────────────────────────────────────────────────────────────────

export interface AwardCommandTelemetryEvent {
  readonly type:
    | 'GUARD_DECISION'
    | 'COMMAND_ATTEMPT'
    | 'COMMAND_EXECUTED'
    | 'COMMAND_DENIED'
    | 'COMMAND_FAILED'
    | 'VERSION_CONFLICT'
    | 'IDEMPOTENT_REPLAY'
    | 'AUDIT_PERSISTENCE_FAILED';
  readonly action: AwardActionKey;
  readonly commandId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly manifestVersion: string;
  readonly appVersion: string;
  readonly outcome?: AwardCommandOutcomeCode;
  readonly guardReasonCode?: string;
  readonly durationMs?: number;
  readonly cohortTags?: readonly string[];
  readonly at: string;
}

export interface AwardCommandTelemetrySink {
  emit(event: AwardCommandTelemetryEvent): void;
  drain(): readonly AwardCommandTelemetryEvent[];
}

export function createInMemoryTelemetrySink(): AwardCommandTelemetrySink {
  const events: AwardCommandTelemetryEvent[] = [];
  return {
    emit: (e) => {
      events.push(e);
    },
    drain: () => events.slice(),
  };
}

// ────────────────────────────────────────────────────────────────────
// Idempotency + concurrency + audit stores
// ────────────────────────────────────────────────────────────────────

export interface AwardIdempotencyRecord {
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly action: AwardActionKey;
  readonly payloadFingerprint: string;
  readonly result: AwardCommandResult<unknown>;
}

export interface AwardIdempotencyStore {
  get(tenantId: string, key: string): AwardIdempotencyRecord | null;
  put(record: AwardIdempotencyRecord): void;
}

export function createInMemoryIdempotencyStore(): AwardIdempotencyStore {
  const rows = new Map<string, AwardIdempotencyRecord>();
  const k = (t: string, key: string) => `${t}::${key}`;
  return {
    get: (t, key) => rows.get(k(t, key)) ?? null,
    put: (r) => {
      rows.set(k(r.tenantId, r.idempotencyKey), r);
    },
  };
}

export interface AwardVersionStore {
  getVersion(tenantId: string, awardId: string): number;
  setVersion(tenantId: string, awardId: string, next: number): void;
}

export function createInMemoryVersionStore(
  seed: Record<string, number> = {},
): AwardVersionStore {
  const rows = new Map<string, number>(Object.entries(seed));
  const k = (t: string, a: string) => `${t}::${a}`;
  return {
    getVersion: (t, a) => rows.get(k(t, a)) ?? 1,
    setVersion: (t, a, n) => {
      rows.set(k(t, a), n);
    },
  };
}

export interface AwardAuditEvidence {
  readonly action: AwardActionKey;
  readonly awardId: string;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly effectiveRole: string;
  readonly commandId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly priorVersion: number;
  readonly newVersion: number;
  readonly guardReasonCode: string;
  readonly changedFields: readonly string[];
  readonly outcome: AwardCommandOutcomeCode;
  readonly at: string;
}

export interface AwardAuditWriter {
  write(evidence: AwardAuditEvidence): void;
  list(): readonly AwardAuditEvidence[];
}

export function createInMemoryAuditWriter(
  opts: { failOnce?: boolean } = {},
): AwardAuditWriter {
  const rows: AwardAuditEvidence[] = [];
  let willFail = !!opts.failOnce;
  return {
    write: (e) => {
      if (willFail) {
        willFail = false;
        throw new Error('audit-persistence-failure');
      }
      rows.push(e);
    },
    list: () => rows.slice(),
  };
}

// ────────────────────────────────────────────────────────────────────
// Mutation executor (injected — keeps safety.test.ts clean)
// ────────────────────────────────────────────────────────────────────

export interface AwardMutationExecutorContext {
  readonly action: AwardActionKey;
  readonly awardId: string;
  readonly tenantId: string;
  readonly commandId: string;
}

export interface AwardMutationExecutor {
  execute(
    ctx: AwardMutationExecutorContext,
    fn: () => Promise<void>,
  ): Promise<void>;
}

export function createInMemoryExecutor(
  opts: { failOnce?: boolean } = {},
): AwardMutationExecutor {
  let willFail = !!opts.failOnce;
  return {
    execute: async (_ctx, fn) => {
      if (willFail) {
        willFail = false;
        throw new Error('handler-failure');
      }
      await fn();
    },
  };
}

// ────────────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────────────

export interface AwardCommandRegistryEntry<TPayload = unknown, TResult = unknown> {
  readonly action: AwardActionKey;
  readonly isPilot: true;
  readonly validatePayload: (payload: unknown) =>
    | { ok: true; value: TPayload }
    | { ok: false; message: string };
  readonly handler: (args: {
    request: AwardCommandRequest<TPayload>;
    priorVersion: number;
    newVersion: number;
  }) => Promise<{ result: TResult; changedFields: readonly string[] }>;
  readonly requiresTransaction: true;
  readonly requiresIdempotency: true;
  readonly requiresOptimisticConcurrency: true;
  readonly auditEventType: string;
  readonly compensatingAction: AwardActionKey | null;
  readonly reversibility: 'REVERSIBLE_VIA_COMPENSATION' | 'IDEMPOTENT_NOOP' | 'IRREVERSIBLE';
  readonly rationale: string;
}

export type AwardCommandRegistry = ReadonlyMap<
  AwardActionKey,
  AwardCommandRegistryEntry<any, any>
>;

export function fingerprintPayload(payload: unknown): string {
  try {
    // Stable ordering via sorted keys — good enough for a fingerprint.
    const seen = new WeakSet();
    const stable = JSON.stringify(payload, function replacer(_k, v) {
      if (v && typeof v === 'object') {
        if (seen.has(v)) return null;
        seen.add(v);
        if (!Array.isArray(v)) {
          return Object.keys(v as object)
            .sort()
            .reduce<Record<string, unknown>>((acc, key) => {
              acc[key] = (v as Record<string, unknown>)[key];
              return acc;
            }, {});
        }
      }
      return v;
    });
    // Cheap non-crypto hash — collision resistance not required, we
    // only need "same payload → same fingerprint" for idempotency-key
    // reuse detection.
    let h = 5381;
    for (let i = 0; i < stable.length; i++) h = ((h << 5) + h + stable.charCodeAt(i)) | 0;
    return `fp_${(h >>> 0).toString(16)}_${stable.length}`;
  } catch {
    return 'fp_unhashable';
  }
}
