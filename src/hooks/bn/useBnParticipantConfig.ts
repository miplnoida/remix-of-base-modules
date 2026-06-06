import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchParticipantConfigByVersion,
  upsertParticipantConfig,
} from '@/services/bn/productParticipantConfigService';
import type { BnProductParticipantConfigInput } from '@/types/bnParticipant';

export function useBnParticipantConfig(productVersionId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'participant-config', productVersionId],
    enabled: !!productVersionId,
    queryFn: () => fetchParticipantConfigByVersion(productVersionId!),
  });
}

export function useUpsertBnParticipantConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BnProductParticipantConfigInput & { id?: string }) =>
      upsertParticipantConfig(input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['bn', 'participant-config', vars.product_version_id] });
    },
  });
}
