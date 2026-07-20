/**
 * BN Benefits — Supabase adapter for the Query Client.
 *
 * Sends a signed {@link BnBenefitsQueryEnvelope} to the `bn-benefits-query`
 * edge function. The edge function performs JWT validation, capability
 * enforcement, allow-list resolution, masking, paging, and audit before
 * returning a domain DTO.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  BnBenefitsQueryEnvelope,
  BnBenefitsQueryResult,
} from '@/types/bn/queries';
import type { BenefitsQueryClient } from './benefitsQueryClient';

const QUERY_FUNCTION = 'bn-benefits-query';

export class SupabaseBenefitsQueryAdapter implements BenefitsQueryClient {
  async execute<TParams, TData>(
    envelope: BnBenefitsQueryEnvelope<TParams>,
  ): Promise<BnBenefitsQueryResult<TData>> {
    const { data, error } = await supabase.functions.invoke(QUERY_FUNCTION, {
      body: envelope,
    });
    if (error) {
      return {
        status: 'FAILED',
        correlationId: envelope.correlationId,
        queryCode: envelope.queryCode,
        queryVersion: envelope.queryVersion,
        data: null,
        errors: [
          { code: 'TRANSPORT_FAILURE', message: 'The query service is unreachable.' },
        ],
        maskedFields: [],
        warnings: [],
      };
    }
    return data as BnBenefitsQueryResult<TData>;
  }
}
