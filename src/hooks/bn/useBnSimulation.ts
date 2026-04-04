// ============================================================
// BN Simulation Engine - React Query Hooks
// ============================================================
// Provides query/mutation hooks for the simulation workspace.
// All data flows through simulationService.ts → bn_sim_* tables.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as simService from '@/services/bn/simulationService';
import type { BnSimulationRequest, BnSimScenario } from '@/types/bnSimulation';

// --- Scenarios ---

export function useBnSimScenarios(productId?: string) {
  return useQuery({
    queryKey: ['bn', 'sim-scenarios', productId],
    queryFn: () => simService.fetchSimScenarios(productId),
  });
}

export function useBnSimScenario(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-scenario', id],
    queryFn: () => simService.fetchSimScenarioById(id!),
    enabled: !!id,
  });
}

export function useCreateSimScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenario: Partial<BnSimScenario>) => simService.createSimScenario(scenario),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'sim-scenarios'] }),
  });
}

export function useUpdateSimScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BnSimScenario> }) =>
      simService.updateSimScenario(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'sim-scenarios'] }),
  });
}

export function useDeleteSimScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => simService.deleteSimScenario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'sim-scenarios'] }),
  });
}

// --- Runs ---

export function useBnSimRuns(scenarioId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-runs', scenarioId],
    queryFn: () => simService.fetchSimRuns(scenarioId!),
    enabled: !!scenarioId,
  });
}

export function useBnSimRun(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-run', id],
    queryFn: () => simService.fetchSimRunById(id!),
    enabled: !!id,
  });
}

// --- Execute Simulation ---

export function useExecuteSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: BnSimulationRequest) => simService.executeSimulationRun(req),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bn', 'sim-runs', vars.scenarioId] });
      qc.invalidateQueries({ queryKey: ['bn', 'sim-scenarios'] });
    },
  });
}

// --- Run Details ---

export function useBnSimRunOutputs(simRunId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-run-outputs', simRunId],
    queryFn: () => simService.fetchSimRunOutputs(simRunId!),
    enabled: !!simRunId,
  });
}

export function useBnSimRunInputs(simRunId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-run-inputs', simRunId],
    queryFn: () => simService.fetchSimRunInputs(simRunId!),
    enabled: !!simRunId,
  });
}

export function useBnSimRuleTrace(simRunId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-rule-trace', simRunId],
    queryFn: () => simService.fetchSimRuleTrace(simRunId!),
    enabled: !!simRunId,
  });
}

export function useBnSimFormulaTrace(simRunId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-formula-trace', simRunId],
    queryFn: () => simService.fetchSimFormulaTrace(simRunId!),
    enabled: !!simRunId,
  });
}

export function useBnSimConfigSnapshot(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'sim-config-snapshot', id],
    queryFn: () => simService.fetchSimConfigSnapshot(id!),
    enabled: !!id,
  });
}
