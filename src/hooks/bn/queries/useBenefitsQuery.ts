/**
 * BN Benefits — React Query wrapper over the secure Query Client.
 *
 * Hooks MUST NOT read Mortality tables directly through the Supabase
 * client. All reads flow through this hook, which in turn dispatches
 * through `BenefitsQueryClient` and the `bn-benefits-query` edge fn.
 */
import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { getBenefitsQueryClient, buildQueryEnvelope } from '@/services/bn/queries';
import type {
  BnBenefitsQueryCode,
  BnBenefitsQueryResult,
} from '@/types/bn/queries';

export interface UseBenefitsQueryArgs<TParams> {
  queryCode: BnBenefitsQueryCode;
  moduleCode: string;
  params: TParams;
  queryVersion?: number;
  pageSize?: number;
  pageToken?: string | null;
  enabled?: boolean;
  staleTime?: number;
}

export function useBenefitsQuery<TParams, TData>(
  args: UseBenefitsQueryArgs<TParams>,
  reactQueryOptions?: Omit<
    UseQueryOptions<BnBenefitsQueryResult<TData>, Error>,
    'queryKey' | 'queryFn'
  >,
): UseQueryResult<BnBenefitsQueryResult<TData>, Error> {
  return useQuery<BnBenefitsQueryResult<TData>, Error>({
    queryKey: [
      'bn-benefits-query',
      args.queryCode,
      args.queryVersion ?? 1,
      args.moduleCode,
      args.params,
      args.pageSize ?? null,
      args.pageToken ?? null,
    ],
    queryFn: async () => {
      const envelope = buildQueryEnvelope(
        args.queryCode,
        args.moduleCode,
        args.params,
        {
          queryVersion: args.queryVersion,
          pageSize: args.pageSize,
          pageToken: args.pageToken,
        },
      );
      return getBenefitsQueryClient().execute<TParams, TData>(envelope);
    },
    enabled: args.enabled ?? true,
    staleTime: args.staleTime ?? 30_000,
    ...reactQueryOptions,
  });
}
