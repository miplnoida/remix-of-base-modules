import { useQuery } from '@tanstack/react-query';
import {
  resolveClaimEditability,
  listAmendmentLog,
  listCorrectionRequests,
  getFieldOwnership,
} from '@/services/bn/amendmentPolicyService';

export function useClaimEditability(claimId: string | null | undefined) {
  return useQuery({
    queryKey: ['bn-claim-editability', claimId],
    queryFn: () => resolveClaimEditability(claimId),
    enabled: !!claimId,
    staleTime: 30_000,
  });
}

export function useClaimAmendmentLog(claimId: string | null | undefined) {
  return useQuery({
    queryKey: ['bn-claim-amendment-log', claimId],
    queryFn: () => listAmendmentLog(claimId as string),
    enabled: !!claimId,
  });
}

export function useClaimCorrectionRequests(claimId: string | null | undefined) {
  return useQuery({
    queryKey: ['bn-claim-correction-requests', claimId],
    queryFn: () => listCorrectionRequests(claimId as string),
    enabled: !!claimId,
  });
}

export function useFieldOwnership(productVersionId: string | null | undefined) {
  return useQuery({
    queryKey: ['bn-field-ownership', productVersionId],
    queryFn: () => getFieldOwnership(productVersionId),
    enabled: !!productVersionId,
    staleTime: 5 * 60_000,
  });
}
