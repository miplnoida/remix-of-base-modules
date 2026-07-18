/**
 * AW360-WAVE-1-C1 Stage D7 — Production-grade persistent idempotency store.
 *
 * The Stage D6 in-memory store was known to be concurrency-unsafe; Stage D7
 * introduces the interface + reference implementation that must be bound to
 * a persistent, transactional backend. In production this is a Postgres
 * table with a unique constraint on `(tenant_id, idempotency_key)`; the
 * reference implementation below reproduces the same atomic-claim contract
 * in-process using per-tenant/per-key async critical sections so tests can
 * certify concurrent-duplicate correctness against real `Promise.all`
 * concurrency rather than sequential in-memory calls.
 *
 * SQL contract (informational — the migration must be applied by ops):
 *
 *   CREATE TABLE public.bn_award_pilot_idempotency (
 *     tenant_id           text        NOT NULL,
 *     idempotency_key     text        NOT NULL,
 *     action              text        NOT NULL,
 *     award_id            text        NOT NULL,
 *     command_id          text        NOT NULL,
 *     correlation_id      text        NOT NULL,
 *     payload_fingerprint text        NOT NULL,
 *     status              text        NOT NULL CHECK (status IN ('CLAIMED','COMPLETED','FAILED')),
 *     result_json         jsonb,
 *     created_at          timestamptz NOT NULL DEFAULT now(),
 *     completed_at        timestamptz,
 *     retention_expires_at timestamptz NOT NULL,
 *     PRIMARY KEY (tenant_id, idempotency_key)
 *   );
 *   CREATE INDEX ON public.bn_award_pilot_idempotency (retention_expires_at);
 *
 *   -- Retention job (informational): DELETE WHERE retention_expires_at < now().
 *
 *   -- Grants + RLS (per project standards):
 *   GRANT SELECT, INSERT, UPDATE ON public.bn_award_pilot_idempotency TO authenticated;
 *   GRANT ALL ON public.bn_award_pilot_idempotency TO service_role;
 *   ALTER TABLE public.bn_award_pilot_idempotency ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "own tenant readable" ON public.bn_award_pilot_idempotency
 *     FOR SELECT TO authenticated
 *     USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');
 *
 * Rollback: DROP TABLE public.bn_award_pilot_idempotency;
 */
import type { AwardActionKey } from '../awardActionAvailability';
import type { AwardCommandResult } from './awardCommandContracts';

/** Result of an atomic claim attempt. */
export type AwardIdempotencyClaimStatus =
  | 'CLAIMED'          // this caller owns the slot; may proceed
  | 'ALREADY_COMPLETED' // a completed record exists with the same fingerprint
  | 'IN_FLIGHT'        // another caller is currently executing this key
  | 'FINGERPRINT_CONFLICT'; // key exists but with a different fingerprint

export interface AwardPersistentIdempotencyRecord {
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly action: AwardActionKey;
  readonly awardId: string;
  readonly commandId: string;
  readonly correlationId: string;
  readonly payloadFingerprint: string;
  readonly status: 'CLAIMED' | 'COMPLETED' | 'FAILED';
  readonly result: AwardCommandResult<unknown> | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly retentionExpiresAt: string;
}

export interface AwardIdempotencyClaimAttempt {
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly action: AwardActionKey;
  readonly awardId: string;
  readonly commandId: string;
  readonly correlationId: string;
  readonly payloadFingerprint: string;
}

export interface AwardIdempotencyClaimOutcome {
  readonly status: AwardIdempotencyClaimStatus;
  readonly existing?: AwardPersistentIdempotencyRecord;
}

/**
 * Production interface. Every implementation MUST:
 *   - be tenant-scoped (composite PK includes tenant_id),
 *   - use an atomic INSERT-with-unique-constraint or SELECT-FOR-UPDATE
 *     transaction to claim a slot (no read-then-write races),
 *   - detect fingerprint conflicts (same key, different payload),
 *   - persist the final result on `complete()`,
 *   - permit retention-based cleanup,
 *   - never delete a claimed row before completion is recorded.
 */
export interface AwardPersistentIdempotencyStore {
  tryClaim(attempt: AwardIdempotencyClaimAttempt): Promise<AwardIdempotencyClaimOutcome>;
  complete(
    tenantId: string,
    idempotencyKey: string,
    result: AwardCommandResult<unknown>,
  ): Promise<void>;
  fail(tenantId: string, idempotencyKey: string, errorClass: string): Promise<void>;
  peek(tenantId: string, idempotencyKey: string): Promise<AwardPersistentIdempotencyRecord | null>;
  purgeExpired(now?: Date): Promise<number>;
}

/**
 * Concurrency-safe reference implementation. Mimics the DB unique-constraint
 * semantics via per-`(tenant, key)` async critical sections so tests can
 * exercise real Promise.all concurrent submissions.
 */
export function createConcurrencySafeIdempotencyStore(opts: {
  readonly retentionMs?: number;
  readonly now?: () => Date;
} = {}): AwardPersistentIdempotencyStore {
  const retentionMs = opts.retentionMs ?? 1000 * 60 * 60 * 24 * 30; // 30d
  const now = opts.now ?? (() => new Date());
  const rows = new Map<string, AwardPersistentIdempotencyRecord>();
  const locks = new Map<string, Promise<void>>();
  const k = (t: string, key: string) => `${t}::${key}`;

  async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Chain onto the current lock (if any) to serialize access to this key.
    const prev = locks.get(key) ?? Promise.resolve();
    let release: () => void = () => {};
    const next = new Promise<void>((r) => (release = r));
    locks.set(key, prev.then(() => next));
    await prev;
    try {
      return await fn();
    } finally {
      release();
      // If nothing else queued (i.e. our promise is still the tail), clear.
      if (locks.get(key) === prev.then(() => next)) locks.delete(key);
    }
  }

  return {
    async tryClaim(a) {
      const key = k(a.tenantId, a.idempotencyKey);
      return withLock(key, async () => {
        const existing = rows.get(key);
        if (existing) {
          if (existing.payloadFingerprint !== a.payloadFingerprint || existing.action !== a.action) {
            return { status: 'FINGERPRINT_CONFLICT', existing };
          }
          if (existing.status === 'CLAIMED') {
            return { status: 'IN_FLIGHT', existing };
          }
          return { status: 'ALREADY_COMPLETED', existing };
        }
        const t = now();
        rows.set(key, {
          tenantId: a.tenantId,
          idempotencyKey: a.idempotencyKey,
          action: a.action,
          awardId: a.awardId,
          commandId: a.commandId,
          correlationId: a.correlationId,
          payloadFingerprint: a.payloadFingerprint,
          status: 'CLAIMED',
          result: null,
          createdAt: t.toISOString(),
          completedAt: null,
          retentionExpiresAt: new Date(t.getTime() + retentionMs).toISOString(),
        });
        return { status: 'CLAIMED' };
      });
    },
    async complete(tenantId, idempotencyKey, result) {
      const key = k(tenantId, idempotencyKey);
      return withLock(key, async () => {
        const existing = rows.get(key);
        if (!existing) throw new Error(`no idempotency claim to complete: ${key}`);
        rows.set(key, {
          ...existing,
          status: 'COMPLETED',
          result,
          completedAt: now().toISOString(),
        });
      });
    },
    async fail(tenantId, idempotencyKey, _errorClass) {
      const key = k(tenantId, idempotencyKey);
      return withLock(key, async () => {
        const existing = rows.get(key);
        if (!existing) return;
        rows.set(key, { ...existing, status: 'FAILED', completedAt: now().toISOString() });
      });
    },
    async peek(tenantId, idempotencyKey) {
      return rows.get(k(tenantId, idempotencyKey)) ?? null;
    },
    async purgeExpired(nowOverride) {
      const cutoff = (nowOverride ?? now()).getTime();
      let purged = 0;
      for (const [key, row] of rows) {
        if (new Date(row.retentionExpiresAt).getTime() < cutoff && row.status !== 'CLAIMED') {
          rows.delete(key);
          purged += 1;
        }
      }
      return purged;
    },
  };
}
