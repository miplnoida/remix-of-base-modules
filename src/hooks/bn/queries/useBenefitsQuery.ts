/**
 * BN Benefits — React Query wrapper over the secure Query Client.
 *
 * BN-MORT-UI-RECOVERY-2D.1 §4 — Centrally gated on the canonical auth
 * runtime state. Queries never execute during INITIALISING, REFRESHING,
 * SESSION_TIMEOUT, SESSION_EXPIRED, REFRESH_FAILED or UNAUTHENTICATED.
 * User id + authGeneration are folded into the queryKey so a change of
 * identity fully isolates cache entries.
 */
import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { getBenefitsQueryClient, buildQueryEnvelope } from '@/services/bn/queries';
import type {
  BnBenefitsQueryCode,
  BnBenefitsQueryResult,
} from '@/types/bn/queries';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

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
  const { canRunAuthenticatedQueries, user, authGeneration } = useSupabaseAuth();
  const authGated = canRunAuthenticatedQueries && !!user;
  const callerEnabled = args.enabled ?? true;

  return useQuery<BnBenefitsQueryResult<TData>, Error>({
    queryKey: [
      'bn-benefits-query',
      args.queryCode,
      args.queryVersion ?? 1,
      args.moduleCode,
      args.params,
      args.pageSize ?? null,
      args.pageToken ?? null,
      user?.id ?? null,
      authGeneration,
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
    enabled: callerEnabled && authGated,
    staleTime: args.staleTime ?? 30_000,
    ...reactQueryOptions,
  });
}
