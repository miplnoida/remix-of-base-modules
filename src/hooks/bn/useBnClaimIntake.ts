import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  submitClaimApplication,
  type SubmitClaimApplicationInput,
} from '@/services/bn/intake/claimIntakeService';
import { fetchClaimWorkspaceBundle } from '@/services/bn/claimWorkspaceService';

/** Submit a benefit application through the central RPC (any channel). */
export function useBnClaimIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'claim-intake', 'submit'],
    mutationFn: (input: SubmitClaimApplicationInput) => submitClaimApplication(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'claims'] });
    },
  });
}

/** Aggregate claim workspace data (application + snapshots + validations). */
export function useBnClaimWorkspace(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-workspace', claimId],
    enabled: !!claimId,
    queryFn: () => fetchClaimWorkspaceBundle(claimId!),
  });
}
