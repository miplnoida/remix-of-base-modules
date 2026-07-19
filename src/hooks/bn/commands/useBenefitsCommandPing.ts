/**
 * BN Gap Modules — React Query hook wrapping the PING proof command.
 *
 * Demonstrates the ONLY approved consumption pattern for gap modules:
 *
 *   UI → hook → BenefitsCommandClient.executeCommand(...)
 *
 * There is no direct Supabase call. Swapping adapters swaps transports; this
 * hook does not change.
 */
import { useMutation } from '@tanstack/react-query';
import { getBenefitsCommandClient } from '@/services/bn/commands';
import type { BnGapPingData, BnGapPingPayload } from '@/services/bn/commands';
import type { BnGapCommandEnvelope } from '@/types/bn/commands/commandEnvelope';
import type { BnGapCommandResult } from '@/types/bn/commands/commandResult';
import {
  getCorrelationId,
  generateCorrelationId,
} from '@/services/correlationIdService';

export interface UseBenefitsGapPingArgs {
  readonly actorUserId: string;
  readonly actorUserCode: string;
  readonly actorRoles: readonly string[];
}

export function useBenefitsCommandPing(args: UseBenefitsGapPingArgs) {
  return useMutation<BnGapCommandResult<BnGapPingData>, Error, BnGapPingPayload | void>({
    mutationFn: async (payload) => {
      const envelope: BnGapCommandEnvelope<BnGapPingPayload> = {
        commandName: 'BN_GAP_PING',
        commandVersion: 1,
        idempotencyKey: crypto.randomUUID(),
        correlationId: getCorrelationId() || generateCorrelationId(),
        moduleCode: 'bn_mortality',
        entityType: 'bn_gap_diagnostic',
        entityId: null,
        actorUserId: args.actorUserId,
        actorUserCode: args.actorUserCode,
        actorRoles: args.actorRoles,
        requestedAtUtc: new Date().toISOString(),
        payload: (payload ?? { note: 'ping' }) as BnGapPingPayload,
      };
      return getBenefitsCommandClient().executeCommand<BnGapPingPayload, BnGapPingData>(envelope);
    },
  });
}
