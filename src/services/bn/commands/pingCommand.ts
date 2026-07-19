/**
 * BN Gap Modules — Harmless "PING" proof command.
 *
 * Proves the entire command pipeline end-to-end without touching any
 * business data:
 *
 *   Envelope → capability check → handler → transaction → audit →
 *   idempotency → result.
 *
 * Registered against `bn_mortality:read` capability so it fails closed for
 * unauthenticated / unpermitted callers. It writes no rows; the "after"
 * image is a synthetic echo of the envelope's payload.
 */
import type { CommandHandler } from './gapCommandPipeline';
import type { BnGapCommandError } from '@/types/bn/gap/commandResult';

export interface BnGapPingPayload {
  readonly note?: string;
}

export interface BnGapPingData {
  readonly echoedAtUtc: string;
  readonly note: string;
}

export const BN_GAP_PING_HANDLER: CommandHandler<BnGapPingPayload, BnGapPingData> = {
  commandName: 'BN_GAP_PING',
  commandVersion: 1,
  moduleCode: 'bn_mortality',
  entityType: 'bn_gap_diagnostic',

  async validate(payload): Promise<readonly BnGapCommandError[]> {
    const errs: BnGapCommandError[] = [];
    if (payload && payload.note !== undefined && typeof payload.note !== 'string') {
      errs.push({ code: 'PING_NOTE_TYPE', message: 'note must be a string.', field: 'note' });
    }
    if (payload?.note && payload.note.length > 500) {
      errs.push({ code: 'PING_NOTE_TOO_LONG', message: 'note must be 500 characters or fewer.', field: 'note' });
    }
    return errs;
  },

  async loadBefore() {
    return { before: null, version: null };
  },

  async execute(envelope) {
    const echoedAtUtc = new Date().toISOString();
    const note = envelope.payload?.note ?? 'ping';
    return {
      entityId: envelope.correlationId, // synthetic — never touches storage
      entityVersion: '1',
      after: { echoedAtUtc, note },
      data: { echoedAtUtc, note },
      warnings: [],
    };
  },
};
