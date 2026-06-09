import { useQuery } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { fetchWorkbasketsForUser, type WorkbasketForUser } from '@/services/bn/workbasketRoleService';

/** Workbaskets visible to the current user via effective roles. */
export function useMyWorkbaskets() {
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const enabled = isAuthReady && isAuthenticated && !!user?.id;
  return useQuery({
    queryKey: ['bn', 'my-workbaskets', user?.id],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<WorkbasketForUser[]> => fetchWorkbasketsForUser(user!.id),
  });
}
