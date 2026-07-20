/**
 * BN Mortality — Shared handler factory.
 *
 * Every Mortality command handler is thin: it validates the payload
 * client-side, then hands the entire envelope to the server-side
 * `bn-mortality-command` edge function, which runs the transactional
 * pipeline (capability walk, idempotency, RPC, audit).
 *
 * The client-side pipeline steps (envelope validation, capability guard,
 * idempotency check) still run in benefitsCommandPipeline as a first
 * line of defence. `execute` here is the transport call.
 */
import type {
  CommandHandler,
} from '@/services/bn/commands/benefitsCommandPipeline';
import type { BnGapCommandError, BnGapCommandWarning } from '@/types/bn/commands/commandResult';
import type { BnMortalityCommandName } from '@/types/bn/mortality/mortalityCommands';
import { supabase } from '@/integrations/supabase/client';

export interface MortalityHandlerSpec<TPayload = Record<string, unknown>> {
  readonly commandName: BnMortalityCommandName;
  readonly commandVersion?: number;
  readonly entityType?: string;
  readonly validate?: (payload: TPayload) => readonly BnGapCommandError[];
}

interface EdgeResult {
  entity_id: string;
  entity_version: number | string;
  status: string;
  event_reference?: string;
  updated_at?: string;
}

export function createMortalityHandler<TPayload extends Record<string, unknown> = Record<string, unknown>>(
  spec: MortalityHandlerSpec<TPayload>,
): CommandHandler<TPayload, EdgeResult> {
  return {
    commandName: spec.commandName,
    commandVersion: spec.commandVersion ?? 1,
    moduleCode: 'bn_mortality',
    entityType: spec.entityType ?? 'bn_mortality_event',

    async validate(payload) {
      return spec.validate ? spec.validate(payload) : [];
    },

    async loadBefore() {
      // Server owns the before-image via the RPC; client cannot read
      // bn_mortality_* directly (grants revoked). Version check runs in
      // the RPC against expectedRowVersion.
      return { before: null, version: null };
    },

    async execute(envelope) {
      const { data, error } = await supabase.functions.invoke('bn-mortality-command', {
        body: envelope,
      });
      if (error) {
        throw new Error(`bn-mortality-command:${error.message ?? 'invoke_failed'}`);
      }
      const r = data as any;
      if (!r?.success) {
        // Surface as thrown error so pipeline maps to FAILED/REJECTED
        const code = r?.businessErrors?.[0]?.code ?? r?.status ?? 'REJECTED';
        const message = r?.businessErrors?.[0]?.message ?? r?.validationErrors?.[0]?.message ?? 'Command not executed.';
        throw new Error(`${code}:${message}`);
      }
      const d = r.data as EdgeResult;
      const warnings: BnGapCommandWarning[] = r.warnings ?? [];
      return {
        entityId: d.entity_id,
        entityVersion: String(d.entity_version ?? '1'),
        after: d as unknown as Record<string, unknown>,
        data: d,
        warnings,
      };
    },
  };
}

/** Non-empty string validator used across most handlers. */
export function required(field: string, value: unknown): BnGapCommandError | null {
  if (value === undefined || value === null || value === '') {
    return { code: 'FIELD_REQUIRED', message: `${field} is required.`, field };
  }
  return null;
}
