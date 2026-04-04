import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as engine from '@/services/bn/calculationEngine';
import type { BnCalcEngineInput } from '@/types/bnCalcEngine';

export function useBnCalcRuns(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'calc-runs', claimId],
    queryFn: () => engine.fetchCalcRuns(claimId!),
    enabled: !!claimId,
  });
}

export function useBnCalcRun(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'calc-run', id],
    queryFn: () => engine.fetchCalcRunById(id!),
    enabled: !!id,
  });
}

export function useBnCalcTrace(runId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'calc-trace', runId],
    queryFn: () => engine.fetchCalcTrace(runId!),
    enabled: !!runId,
  });
}

export function useBnCalcOverrides(runId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'calc-overrides', runId],
    queryFn: () => engine.fetchCalcOverrides(runId!),
    enabled: !!runId,
  });
}

export function useRunCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'calc-engine', 'run'],
    mutationFn: (input: BnCalcEngineInput) => engine.runCalculationEngine(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bn', 'calc-runs', vars.claimId] });
    },
  });
}

export function useApproveCalcOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy: string }) =>
      engine.approveCalcOverride(id, approvedBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'calc-overrides'] }),
  });
}

export function useRejectCalcOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectedBy, reason }: { id: string; rejectedBy: string; reason: string }) =>
      engine.rejectCalcOverride(id, rejectedBy, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'calc-overrides'] }),
  });
}

export function useCreateCalcOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (override: Record<string, unknown>) => engine.createCalcOverride(override),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'calc-overrides'] }),
  });
}

// Simulation presets
export function useBnSimulationPresets(productId?: string) {
  return useQuery({
    queryKey: ['bn', 'sim-presets', productId],
    queryFn: () => engine.fetchSimulationPresets(productId),
  });
}

export function useSaveSimulationPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preset: Record<string, unknown>) => engine.saveSimulationPreset(preset),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'sim-presets'] }),
  });
}

// Legacy snapshots
export function useBnLegacySnapshots(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'legacy-snapshots', claimId],
    queryFn: () => engine.fetchLegacySnapshots(claimId!),
    enabled: !!claimId,
  });
}

export function useSaveLegacySnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (snapshot: Record<string, unknown>) => engine.saveLegacySnapshot(snapshot),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'legacy-snapshots'] }),
  });
}
