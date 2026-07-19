import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitClaimantAppeal,
  type SubmitClaimantAppealInput,
} from '@/services/bn/gap/appeals/submitClaimantAppealService';

/**
 * React Query hook — Claimant submits an appeal.
 *
 * Never touches `bn_appeal*` tables directly. Delegates to
 * `submitClaimantAppealService.submitClaimantAppeal`, which routes through
 * the `bn-appeals-claimant-submit` edge function.
 */
export function useSubmitClaimantAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitClaimantAppealInput) => submitClaimantAppeal(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn-appeals', 'me'] });
    },
  });
}
