import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { computeStats, getEmployer, listEmployers, requestEmployerChange } from './service';
import type { EmployerRegistryListFilters } from './types';

const K = ['employer-registry'];

export const useEmployerRegistryList = (filters: EmployerRegistryListFilters = {}) =>
  useQuery({
    queryKey: [...K, 'list', filters],
    queryFn: () => listEmployers(filters),
  });

export const useEmployerRegistryRecord = (employerId?: string) =>
  useQuery({
    queryKey: [...K, 'detail', employerId ?? '_'],
    queryFn: () => (employerId ? getEmployer(employerId) : Promise.resolve(null)),
    enabled: !!employerId,
  });

export const useEmployerRegistryStats = (filters: EmployerRegistryListFilters = {}) =>
  useQuery({
    queryKey: [...K, 'stats', filters],
    queryFn: async () => computeStats(await listEmployers(filters)),
  });

export function useRequestEmployerChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestEmployerChange,
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}
