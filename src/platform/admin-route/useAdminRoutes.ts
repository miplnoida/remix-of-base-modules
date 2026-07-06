import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminRoute,
  deleteOrDeactivateAdminRoute,
  getAdminDomains,
  getAdminRoutes,
  reactivateAdminRoute,
  updateAdminRoute,
} from './adminRouteService';
import type { AdminRouteFilters, AdminRouteFormValues } from './adminRouteTypes';

const KEY = ['admin-route-registry'];

export function useAdminDomains() {
  return useQuery({
    queryKey: ['admin-domain-registry'],
    queryFn: getAdminDomains,
    staleTime: 5 * 60_000,
  });
}

export function useAdminRoutes(filters: AdminRouteFilters = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => getAdminRoutes(filters),
  });
}

export function useCreateAdminRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_admin_route_registry:create'],
    mutationFn: (payload: AdminRouteFormValues) => createAdminRoute(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAdminRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_admin_route_registry:update'],
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminRouteFormValues> }) =>
      updateAdminRoute(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeactivateAdminRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_admin_route_registry:deactivate'],
    mutationFn: (id: string) => deleteOrDeactivateAdminRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReactivateAdminRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['core_admin_route_registry:reactivate'],
    mutationFn: (id: string) => reactivateAdminRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
