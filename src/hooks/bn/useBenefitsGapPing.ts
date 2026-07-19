/**
 * BN Gap Modules — React Query hook wrapping the PING proof command.
 *
 * Demonstrates the ONLY approved consumption pattern for gap modules:
 *
 *   UI → hook → BenefitsGapApiClient.executeCommand(...)
 *
 * There is no direct Supabase call. Swapping adapters swaps transports; this
 * hook does not change.
 */
import { useMutation } from '@tanstack/react-query';
import { getBenefitsGapApiClient } from '@/services/bn/gap';
import type { BnGapPingData, BnGapPingPayload } from '@/services/bn/gap';
import type { BnGapCommandEnvelope } from '@/types/bn/gap/commandEnvelope';
import type { BnGapCommandResult } from '@/types/bn/gap/commandResult';
import {
  getCorrelationId,
  generateCorrelationId,
} from '@/services/correlationIdService';

export interface UseBenefitsGapPingArgs {
  readonly actorUserId: string;
  readonly actorUserCode: string;
  readonly actorRoles: readonly string[];
}

export function useBenefitsGapPing(args: UseBenefitsGapPingArgs) {
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
      return getBenefitsGapApiClient().executeCommand<BnGapPingPayload, BnGapPingData>(envelope);
    },
  });
}
