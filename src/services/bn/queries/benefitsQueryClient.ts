/**
 * BN Benefits — Portable Query Client.
 *
 * ==== ARCHITECTURAL CONTRACT ====
 *
 * Pages, hooks and services MUST route every mortality (and future gap-module)
 * read through this interface. Direct `supabase.from('bn_mortality_*')` calls
 * are banned by the architecture test.
 */
import type {
  BnBenefitsQueryEnvelope,
  BnBenefitsQueryResult,
  BnBenefitsQueryCode,
} from '@/types/bn/queries';

export interface BenefitsQueryClient {
  execute<TParams, TData>(
    envelope: BnBenefitsQueryEnvelope<TParams>,
  ): Promise<BnBenefitsQueryResult<TData>>;
}

export function buildQueryEnvelope<TParams>(
  queryCode: BnBenefitsQueryCode,
  moduleCode: string,
  params: TParams,
  opts: {
    queryVersion?: number;
    correlationId?: string;
    pageSize?: number;
    pageToken?: string | null;
  } = {},
): BnBenefitsQueryEnvelope<TParams> {
  return {
    queryCode,
    queryVersion: opts.queryVersion ?? 1,
    correlationId: opts.correlationId ?? crypto.randomUUID(),
    moduleCode,
    params,
    page: {
      pageSize: opts.pageSize,
      pageToken: opts.pageToken ?? null,
    },
  };
}
