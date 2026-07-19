/**
 * AW360-WAVE-1-C1 Stage D8 — Supabase-backed persistent idempotency store.
 *
 * Binds the AwardPersistentIdempotencyStore contract to the migrated
 * public.bn_award_pilot_idempotency table. Atomic claim uses `INSERT ...
 * ON CONFLICT DO NOTHING RETURNING` semantics through the Supabase client's
 * `.insert(..., { defaultToNull: true })` + `.select().single()` idiom with
 * explicit unique-violation detection (`code === '23505'`).
 *
 * Process-local locks are NOT the correctness boundary — the database's
 * UNIQUE (tenant_id, idempotency_key) constraint is.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AwardActionKey } from '../awardActionAvailability';
import type { AwardCommandResult } from './awardCommandContracts';
import type {
  AwardIdempotencyClaimAttempt,
  AwardIdempotencyClaimOutcome,
  AwardPersistentIdempotencyRecord,
  AwardPersistentIdempotencyStore,
} from './awardPilotPersistentIdempotency';

export const PILOT_IDEMPOTENCY_TABLE = 'bn_award_pilot_idempotency';

interface Row {
  tenant_id: string;
  idempotency_key: string;
  action: string;
  award_id: string;
  command_id: string;
  correlation_id: string;
  payload_fingerprint: string;
  status: 'CLAIMED' | 'COMPLETED' | 'FAILED';
  result_ref: string | null;
  error_class: string | null;
  claimed_at: string;
  completed_at: string | null;
  retention_expires_at: string;
}

function toRecord(row: Row, result: AwardCommandResult<unknown> | null = null): AwardPersistentIdempotencyRecord {
  return {
    tenantId: row.tenant_id,
    idempotencyKey: row.idempotency_key,
    action: row.action as AwardActionKey,
    awardId: row.award_id,
    commandId: row.command_id,
    correlationId: row.correlation_id,
    payloadFingerprint: row.payload_fingerprint,
    status: row.status,
    result,
    createdAt: row.claimed_at,
    completedAt: row.completed_at,
    retentionExpiresAt: row.retention_expires_at,
  };
}

export interface SupabaseIdempotencyStoreOpts {
  readonly retentionMs?: number;
  readonly now?: () => Date;
  readonly resultResolver?: (row: Row) => AwardCommandResult<unknown> | null;
}

export function createSupabaseIdempotencyStore(
  client: SupabaseClient,
  opts: SupabaseIdempotencyStoreOpts = {},
): AwardPersistentIdempotencyStore {
  const retentionMs = opts.retentionMs ?? 1000 * 60 * 60 * 24 * 30;
  const now = opts.now ?? (() => new Date());
  const resolve = opts.resultResolver ?? (() => null);

  return {
    async tryClaim(a: AwardIdempotencyClaimAttempt): Promise<AwardIdempotencyClaimOutcome> {
      const t = now();
      const insert: Row = {
        tenant_id: a.tenantId,
        idempotency_key: a.idempotencyKey,
        action: a.action,
        award_id: a.awardId,
        command_id: a.commandId,
        correlation_id: a.correlationId,
        payload_fingerprint: a.payloadFingerprint,
        status: 'CLAIMED',
        result_ref: null,
        error_class: null,
        claimed_at: t.toISOString(),
        completed_at: null,
        retention_expires_at: new Date(t.getTime() + retentionMs).toISOString(),
      };
      const { data, error } = await client.from(PILOT_IDEMPOTENCY_TABLE).insert(insert).select().single();
      if (!error && data) return { status: 'CLAIMED' };

      // Unique-violation → someone else claimed first: read row to classify.
      if (error && (error as { code?: string }).code === '23505') {
        const { data: existing } = await client
          .from(PILOT_IDEMPOTENCY_TABLE)
          .select('*')
          .eq('tenant_id', a.tenantId)
          .eq('idempotency_key', a.idempotencyKey)
          .single();
        if (!existing) throw error;
        const row = existing as Row;
        if (row.payload_fingerprint !== a.payloadFingerprint || row.action !== a.action) {
          return { status: 'FINGERPRINT_CONFLICT', existing: toRecord(row) };
        }
        if (row.status === 'CLAIMED') return { status: 'IN_FLIGHT', existing: toRecord(row) };
        return { status: 'ALREADY_COMPLETED', existing: toRecord(row, resolve(row)) };
      }
      if (error) throw error;
      return { status: 'CLAIMED' };
    },

    async complete(tenantId, idempotencyKey, result) {
      const { error } = await client
        .from(PILOT_IDEMPOTENCY_TABLE)
        .update({
          status: 'COMPLETED',
          completed_at: now().toISOString(),
          result_ref: result.newVersion != null ? `v${result.newVersion}` : null,
        })
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', idempotencyKey);
      if (error) throw error;
    },

    async fail(tenantId, idempotencyKey, errorClass) {
      const { error } = await client
        .from(PILOT_IDEMPOTENCY_TABLE)
        .update({
          status: 'FAILED',
          completed_at: now().toISOString(),
          error_class: errorClass,
        })
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', idempotencyKey);
      if (error) throw error;
    },

    async peek(tenantId, idempotencyKey) {
      const { data } = await client
        .from(PILOT_IDEMPOTENCY_TABLE)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (!data) return null;
      const row = data as Row;
      return toRecord(row, resolve(row));
    },

    async purgeExpired(nowOverride) {
      const cutoff = (nowOverride ?? now()).toISOString();
      const { data, error } = await client
        .from(PILOT_IDEMPOTENCY_TABLE)
        .delete()
        .lt('retention_expires_at', cutoff)
        .neq('status', 'CLAIMED')
        .select('idempotency_key');
      if (error) throw error;
      return data?.length ?? 0;
    },
  };
}

/** Migration certification metadata surfaced by diagnostics. */
export const PILOT_IDEMPOTENCY_MIGRATION = {
  migrationId: '20260719000000_award_pilot_idempotency',
  table: PILOT_IDEMPOTENCY_TABLE,
  uniqueConstraint: '(tenant_id, idempotency_key)',
  rlsEnabled: true,
  policies: [
    'pilot idempotency same-tenant read',
    'pilot idempotency same-tenant insert',
    'pilot idempotency same-tenant update',
  ],
  indexes: [
    'bn_award_pilot_idempotency_retention_idx',
    'bn_award_pilot_idempotency_correlation_idx',
    'bn_award_pilot_idempotency_award_idx',
  ],
  rollback: 'DROP TABLE public.bn_award_pilot_idempotency CASCADE;',
  status: 'MIGRATED' as const,
} as const;
