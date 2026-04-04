/**
 * Benefit Determination Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as detService from '@/services/bn/determinationService';
import type { BnCalcEngineInput } from '@/types/bnCalcEngine';
import { runCalculationEngine } from '@/services/bn/calculationEngine';

export function useBnDeterminationContext(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'determination', claimId],
    queryFn: () => detService.fetchDeterminationContext(claimId!),
    enabled: !!claimId,
  });
}

export function useBnRuleVersion(productVersionId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'rule-version', productVersionId],
    queryFn: () => detService.fetchActiveRuleVersion(productVersionId!),
    enabled: !!productVersionId,
  });
}

export function useExecuteDeterminationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'determination', 'action'],
    mutationFn: (params: detService.ExecuteDeterminationParams) =>
      detService.executeDeterminationAction(params),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bn', 'determination', vars.claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim', vars.claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'claims'] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim-decisions', vars.claimId] });
    },
  });
}

export function useRunDeterminationCalc() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'determination', 'calculate'],
    mutationFn: async (params: { input: BnCalcEngineInput; performedBy: string }) => {
      const output = await runCalculationEngine(params.input);
      const snapshotId = await detService.saveCalculationSnapshot(
        params.input.claimId,
        output,
        params.performedBy
      );
      return { output, snapshotId };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bn', 'determination', vars.input.claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'calc-runs', vars.input.claimId] });
    },
  });
}
