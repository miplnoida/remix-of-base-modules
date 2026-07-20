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

/**
 * Preserves the canonical {@link BnBenefitsQueryResult} envelope from the
 * edge function. The edge function always responds with HTTP 200 and a
 * structured envelope (status ∈ {OK, DENIED, INVALID, NOT_FOUND, FAILED}), so
 * DENIED/INVALID/FAILED responses reach the UI unchanged and are not
 * misrendered as empty datasets.
 *
 * `TRANSPORT_FAILURE` is reserved for cases where the edge function cannot
 * be reached at all (network error, non-2xx without body).
 */
export class SupabaseBenefitsQueryAdapter implements BenefitsQueryClient {
  async execute<TParams, TData>(
    envelope: BnBenefitsQueryEnvelope<TParams>,
  ): Promise<BnBenefitsQueryResult<TData>> {
    const { data, error } = await supabase.functions.invoke(QUERY_FUNCTION, {
      body: envelope,
    });

    // If the edge function already returned a canonical envelope in `data`,
    // preserve it verbatim — even in error paths — so DENIED/INVALID/FAILED
    // statuses reach hooks and pages.
    if (data && typeof data === 'object' && 'status' in (data as Record<string, unknown>)) {
      return data as BnBenefitsQueryResult<TData>;
    }

    if (error) {
      return {
        status: 'FAILED',
        correlationId: envelope.correlationId,
        queryCode: envelope.queryCode,
        queryVersion: envelope.queryVersion,
        data: null,
        errors: [{ code: 'TRANSPORT_FAILURE', message: 'The query service is unreachable.' }],
        maskedFields: [],
        warnings: [],
      };
    }

    // Defensive: unknown shape.
    return {
      status: 'FAILED',
      correlationId: envelope.correlationId,
      queryCode: envelope.queryCode,
      queryVersion: envelope.queryVersion,
      data: null,
      errors: [{ code: 'MALFORMED_RESPONSE', message: 'Query service returned an unexpected shape.' }],
      maskedFields: [],
      warnings: [],
    };
  }
}
