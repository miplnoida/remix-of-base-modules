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
import { SupabaseBenefitsQueryAdapter } from './supabaseBenefitsQueryAdapter';

export interface BenefitsQueryClient {
  execute<TParams, TData>(
    envelope: BnBenefitsQueryEnvelope<TParams>,
  ): Promise<BnBenefitsQueryResult<TData>>;
}

let _client: BenefitsQueryClient | null = null;

/** Overrides the singleton — used by tests to inject a fake. */
export function setBenefitsQueryClient(client: BenefitsQueryClient | null): void {
  _client = client;
}

/** Process-wide client, lazily instantiating the Supabase adapter. */
export function getBenefitsQueryClient(): BenefitsQueryClient {
  if (!_client) _client = new SupabaseBenefitsQueryAdapter();
  return _client;
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
