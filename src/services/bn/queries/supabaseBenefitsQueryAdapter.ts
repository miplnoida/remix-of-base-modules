/**
 * BN Benefits — Supabase adapter for the Query Client.
 *
 * BN-MORT-UI-1C behaviour:
 *   OK          → return canonical result
 *   NOT_FOUND   → return canonical result (data = null, page.totalCount = 0)
 *   DENIED      → throw {@link BenefitsQueryExecutionError}
 *   INVALID     → throw {@link BenefitsQueryExecutionError}
 *   FAILED      → throw {@link BenefitsQueryExecutionError}
 *   transport   → throw BenefitsQueryExecutionError(FAILED / TRANSPORT_FAILURE)
 *   malformed   → throw BenefitsQueryExecutionError(FAILED / MALFORMED_RESPONSE)
 *
 * Throwing on non-OK envelopes ensures React Query correctly flips
 * `isError=true` and pages render specific access-denied / validation /
 * service-error states instead of misrendering as empty datasets.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  BnBenefitsQueryEnvelope,
  BnBenefitsQueryResult,
} from '@/types/bn/queries';
import type { BenefitsQueryClient } from './benefitsQueryClient';
import { BenefitsQueryExecutionError } from './benefitsQueryExecutionError';
import { validateBenefitsQueryEnvelope } from './envelopeValidator';

const QUERY_FUNCTION = 'bn-benefits-query';

export class SupabaseBenefitsQueryAdapter implements BenefitsQueryClient {
  async execute<TParams, TData>(
    envelope: BnBenefitsQueryEnvelope<TParams>,
  ): Promise<BnBenefitsQueryResult<TData>> {
    let data: unknown = null;
    let transportError: { message?: string } | null = null;
    try {
      const resp = await supabase.functions.invoke(QUERY_FUNCTION, { body: envelope });
      data = resp.data;
      transportError = resp.error ?? null;
    } catch (err) {
      transportError = { message: err instanceof Error ? err.message : String(err) };
    }

    // Strict runtime envelope validation — never accept an object merely
    // because it has a `status` property.
    if (data && typeof data === 'object' && validateBenefitsQueryEnvelope(data).ok) {
      const result = data as BnBenefitsQueryResult<TData>;
      if (result.status === 'OK' || result.status === 'NOT_FOUND') {
        return result;
      }
      throw new BenefitsQueryExecutionError({
        status: result.status,
        correlationId: result.correlationId,
        queryCode: result.queryCode,
        queryVersion: result.queryVersion,
        errors: result.errors,
        maskedFields: result.maskedFields,
        warnings: result.warnings,
      });
    }

    if (transportError) {
      throw new BenefitsQueryExecutionError({
        status: 'FAILED',
        correlationId: envelope.correlationId,
        queryCode: envelope.queryCode,
        queryVersion: envelope.queryVersion,
        errors: [{ code: 'TRANSPORT_FAILURE', message: 'The query service is unreachable.' }],
      });
    }

    throw new BenefitsQueryExecutionError({
      status: 'FAILED',
      correlationId: envelope.correlationId,
      queryCode: envelope.queryCode,
      queryVersion: envelope.queryVersion,
      errors: [{ code: 'MALFORMED_RESPONSE', message: 'Query service returned an unexpected shape.' }],
    });
  }
}
