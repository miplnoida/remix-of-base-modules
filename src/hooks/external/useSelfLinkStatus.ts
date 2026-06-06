/**
 * useSelfLinkStatus — single source of truth for "does this user have a
 * VERIFIED SELF link?". Drives feature gating across the claimant portal.
 */
import { useQuery } from '@tanstack/react-query';
import { useClaimantPersona } from './useClaimantPersona';
import { getLinkStatus } from '@/services/external/identityLinkingService';

export function useSelfLinkStatus() {
  const { userId, isAuthReady, isAuthenticated } = useClaimantPersona();
  const q = useQuery({
    queryKey: ['selfLinkStatus', userId],
    enabled: isAuthReady && isAuthenticated && !!userId,
    staleTime: 30_000,
    queryFn: () => getLinkStatus(userId as string),
  });
  return {
    isLoading: q.isLoading,
    isVerified: !!q.data?.verified,
    ssn: q.data?.ssn ?? null,
    refetch: q.refetch,
  };
}
