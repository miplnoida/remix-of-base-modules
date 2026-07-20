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

let _client: BenefitsQueryClient | null = null;

/** Overrides the singleton — used by tests to inject a fake. */
export function setBenefitsQueryClient(client: BenefitsQueryClient | null): void {
  _client = client;
}

/**
 * Returns the process-wide client, lazily constructing the Supabase adapter
 * on first use. Kept as a function (not a top-level `new`) so tests can
 * install a fake before any query fires.
 */
export function getBenefitsQueryClient(): BenefitsQueryClient {
  if (_client) return _client;
  // Lazy require to avoid pulling the Supabase client into unit tests that
  // never touch the network path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SupabaseBenefitsQueryAdapter } = require('./supabaseBenefitsQueryAdapter') as typeof import('./supabaseBenefitsQueryAdapter');
  _client = new SupabaseBenefitsQueryAdapter();
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
