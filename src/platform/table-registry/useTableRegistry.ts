import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTableRegistryEntry,
  deactivateTableRegistryEntry,
  getTableRegistryEntries,
  getTableRegistryEntryById,
  reactivateTableRegistryEntry,
  updateTableRegistryEntry,
} from './tableRegistryService';
import type { TableRegistryFilters, TableRegistryFormValues } from './tableRegistryTypes';

const KEY = ['core-table-registry'];

export function useTableRegistryEntries(filters: TableRegistryFilters = {}) {
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => getTableRegistryEntries(filters) });
}

export function useTableRegistryEntry(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'byId', id],
    queryFn: () => (id ? getTableRegistryEntryById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useCreateTableRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_table_registry:create'],
    mutationFn: (payload: TableRegistryFormValues) => createTableRegistryEntry(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTableRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_table_registry:update'],
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TableRegistryFormValues> }) =>
      updateTableRegistryEntry(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeactivateTableRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_table_registry:deactivate'],
    mutationFn: (id: string) => deactivateTableRegistryEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReactivateTableRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_table_registry:reactivate'],
    mutationFn: (id: string) => reactivateTableRegistryEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
