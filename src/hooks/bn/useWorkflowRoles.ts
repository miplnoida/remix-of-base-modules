/**
 * useWorkflowRoles — React Query hook returning active workflow roles
 * sourced from public.roles (BN_* + generic operational allow-list).
 */
import { useQuery } from '@tanstack/react-query';
import { fetchWorkflowRoles } from '@/services/bn/workflowRoleCatalogService';
import { BN_WORKFLOW_ROLES } from '@/services/bn/registries/workflowRolesRegistry';

export function useWorkflowRoles() {
  const q = useQuery({
    queryKey: ['bn', 'workflow-roles'],
    queryFn: () => fetchWorkflowRoles(),
    staleTime: 5 * 60 * 1000,
  });
  return {
    roles: q.data ?? ([...BN_WORKFLOW_ROLES] as string[]),
    isLoading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
  };
}
