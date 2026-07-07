import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLegacyColumnMap,
  createLegacyRelationshipMap,
  createLegacyTableMap,
  createLegacyValueMap,
  deactivateLegacyColumnMap,
  deactivateLegacyRelationshipMap,
  deactivateLegacyTableMap,
  deactivateLegacyValueMap,
  getEligibleLegacyTablesFromTableRegistry,
  getLegacyColumnMaps,
  getLegacyRelationshipMaps,
  getLegacyTableMapById,
  getLegacyTableMaps,
  getLegacyValueMaps,
  reactivateLegacyTableMap,
  updateLegacyColumnMap,
  updateLegacyRelationshipMap,
  updateLegacyTableMap,
  updateLegacyValueMap,
} from './legacyMappingService';
import type {
  LegacyColumnMapFormValues,
  LegacyMappingFilters,
  LegacyRelationshipMapFormValues,
  LegacyTableMapFormValues,
  LegacyValueMapFormValues,
} from './legacyMappingTypes';

const TM = ['core-legacy-table-map'];
const CM = (t: string) => ['core-legacy-column-map', t];
const VM = (t: string, c?: string) => ['core-legacy-value-map', t, c ?? '_all'];
const RM = (t: string) => ['core-legacy-relationship-map', t];

/* Table maps */
export function useLegacyTableMaps(filters: LegacyMappingFilters = {}) {
  return useQuery({ queryKey: [...TM, filters], queryFn: () => getLegacyTableMaps(filters) });
}
export function useLegacyTableMap(id: string | undefined) {
  return useQuery({
    queryKey: [...TM, 'byId', id],
    queryFn: () => (id ? getLegacyTableMapById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}
export function useCreateLegacyTableMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LegacyTableMapFormValues) => createLegacyTableMap(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TM }),
  });
}
export function useUpdateLegacyTableMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LegacyTableMapFormValues> }) =>
      updateLegacyTableMap(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TM }),
  });
}
export function useDeactivateLegacyTableMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateLegacyTableMap(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TM }),
  });
}
export function useReactivateLegacyTableMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateLegacyTableMap(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TM }),
  });
}

/* Column maps */
export function useLegacyColumnMaps(tableMapId: string | undefined) {
  return useQuery({
    queryKey: CM(tableMapId ?? ''),
    queryFn: () => (tableMapId ? getLegacyColumnMaps(tableMapId) : Promise.resolve([])),
    enabled: !!tableMapId,
  });
}
export function useCreateLegacyColumnMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LegacyColumnMapFormValues) => createLegacyColumnMap(payload),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: CM(vars.table_map_id) }),
  });
}
export function useUpdateLegacyColumnMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LegacyColumnMapFormValues> & { table_map_id?: string } }) =>
      updateLegacyColumnMap(id, payload),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: CM(data.table_map_id) }),
  });
}
export function useDeactivateLegacyColumnMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; tableMapId: string }) => deactivateLegacyColumnMap(id),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: CM(vars.tableMapId) }),
  });
}

/* Value maps */
export function useLegacyValueMaps(tableMapId: string | undefined, columnMapId?: string) {
  return useQuery({
    queryKey: VM(tableMapId ?? '', columnMapId),
    queryFn: () => (tableMapId ? getLegacyValueMaps(tableMapId, columnMapId) : Promise.resolve([])),
    enabled: !!tableMapId,
  });
}
export function useCreateLegacyValueMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LegacyValueMapFormValues) => createLegacyValueMap(payload),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['core-legacy-value-map', data.table_map_id] }),
  });
}
export function useUpdateLegacyValueMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LegacyValueMapFormValues> }) =>
      updateLegacyValueMap(id, payload),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['core-legacy-value-map', data.table_map_id] }),
  });
}
export function useDeactivateLegacyValueMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; tableMapId: string }) => deactivateLegacyValueMap(id),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['core-legacy-value-map', vars.tableMapId] }),
  });
}

/* Relationship maps */
export function useLegacyRelationshipMaps(tableMapId: string | undefined) {
  return useQuery({
    queryKey: RM(tableMapId ?? ''),
    queryFn: () => (tableMapId ? getLegacyRelationshipMaps(tableMapId) : Promise.resolve([])),
    enabled: !!tableMapId,
  });
}
export function useCreateLegacyRelationshipMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LegacyRelationshipMapFormValues) => createLegacyRelationshipMap(payload),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: RM(vars.source_table_map_id) }),
  });
}
export function useUpdateLegacyRelationshipMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LegacyRelationshipMapFormValues> }) =>
      updateLegacyRelationshipMap(id, payload),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: RM(data.source_table_map_id) }),
  });
}
export function useDeactivateLegacyRelationshipMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; tableMapId: string }) => deactivateLegacyRelationshipMap(id),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: RM(vars.tableMapId) }),
  });
}

/* Eligible legacy tables from registry */
export function useEligibleLegacyTablesFromTableRegistry() {
  return useQuery({
    queryKey: ['core-legacy-eligible-tables'],
    queryFn: getEligibleLegacyTablesFromTableRegistry,
    staleTime: 5 * 60_000,
  });
}
