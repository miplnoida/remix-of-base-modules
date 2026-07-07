import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  computeHealth, computeOverview,
  createConsumer, createDependency, createSource,
  listAdminRoutes, listConsumers, listDependencies, listLegacyTableMaps,
  listLegacyValueMappings, listPolicies, listSources, listTableRegistry,
  setConsumerActive, setDependencyActive, setPolicyActive, setSourceActive,
  updateConsumer, updateDependency, updateSource, upsertPolicy,
} from './referenceGovernanceService';
import type {
  ReferenceChangePolicyForm, ReferenceConsumerMapForm,
  ReferenceDependencyMapForm, ReferenceSourceMapForm,
} from './referenceGovernanceTypes';

const K = {
  sources: ['ref-gov-v2', 'sources'] as const,
  consumers: ['ref-gov-v2', 'consumers'] as const,
  deps: ['ref-gov-v2', 'deps'] as const,
  policies: ['ref-gov-v2', 'policies'] as const,
  values: ['ref-gov-v2', 'values'] as const,
  health: ['ref-gov-v2', 'health'] as const,
  overview: ['ref-gov-v2', 'overview'] as const,
  registry: ['ref-gov-v2', 'registry'] as const,
  legacyMaps: ['ref-gov-v2', 'legacy-maps'] as const,
  routes: ['ref-gov-v2', 'routes'] as const,
};

export const useReferenceSources = () => useQuery({ queryKey: K.sources, queryFn: listSources });
export const useReferenceConsumers = () => useQuery({ queryKey: K.consumers, queryFn: listConsumers });
export const useReferenceDependencies = () => useQuery({ queryKey: K.deps, queryFn: listDependencies });
export const useReferencePolicies = () => useQuery({ queryKey: K.policies, queryFn: listPolicies });
export const useLegacyValueMappings = () => useQuery({ queryKey: K.values, queryFn: listLegacyValueMappings });
export const useReferenceHealth = () => useQuery({ queryKey: K.health, queryFn: computeHealth });
export const useReferenceOverview = () => useQuery({ queryKey: K.overview, queryFn: computeOverview });
export const useTableRegistryOptions = () => useQuery({ queryKey: K.registry, queryFn: listTableRegistry });
export const useLegacyTableMapOptions = () => useQuery({ queryKey: K.legacyMaps, queryFn: listLegacyTableMaps });
export const useAdminRouteOptions = () => useQuery({ queryKey: K.routes, queryFn: listAdminRoutes });

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['ref-gov-v2'] });
}

export const useCreateSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReferenceSourceMapForm) => createSource(payload),
    onSuccess: () => invalidateAll(qc),
  });
};
export const useUpdateSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ReferenceSourceMapForm> }) => updateSource(id, payload),
    onSuccess: () => invalidateAll(qc),
  });
};
export const useSetSourceActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setSourceActive(id, active),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useCreateConsumer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReferenceConsumerMapForm) => createConsumer(payload),
    onSuccess: () => invalidateAll(qc),
  });
};
export const useUpdateConsumer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ReferenceConsumerMapForm> }) => updateConsumer(id, payload),
    onSuccess: () => invalidateAll(qc),
  });
};
export const useSetConsumerActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setConsumerActive(id, active),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useCreateDependency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReferenceDependencyMapForm) => createDependency(payload),
    onSuccess: () => invalidateAll(qc),
  });
};
export const useUpdateDependency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ReferenceDependencyMapForm> }) => updateDependency(id, payload),
    onSuccess: () => invalidateAll(qc),
  });
};
export const useSetDependencyActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setDependencyActive(id, active),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useUpsertPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReferenceChangePolicyForm) => upsertPolicy(payload),
    onSuccess: () => invalidateAll(qc),
  });
};
export const useSetPolicyActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setPolicyActive(id, active),
    onSuccess: () => invalidateAll(qc),
  });
};
