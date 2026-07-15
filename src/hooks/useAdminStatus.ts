/**
 * BN-AWARD360-ADMIN-1 — Structured Admin-status hook.
 *
 * Exposes not only the boolean admin flag but also loading and error state so
 * downstream consumers (e.g. Award 360) can distinguish "admin still resolving"
 * from "definitely not admin". The canonical role is `Admin` and admin status
 * is resolved server-side via `public.is_admin(_user_id uuid)`.
 *
 * Legacy case-only variants ("admin", "ADMIN") are normalised inside the RPC
 * only if a separate normalisation exists; this hook simply consumes the RPC.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export interface AdminStatus {
  isAdmin: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAdminStatus(): AdminStatus {
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (error) throw error;
      return !!data;
    },
    enabled: isAuthReady && isAuthenticated && !!user?.id,
    staleTime: 5 * 60_000,
  });

  return {
    isAdmin: q.data === true,
    isLoading: q.isLoading || (isAuthReady && isAuthenticated && !!user?.id && q.fetchStatus === 'fetching' && q.data === undefined),
    isError: q.isError,
    error: (q.error as Error | null) ?? null,
    refetch: () => {
      qc.invalidateQueries({ queryKey: ['is-admin', user?.id] });
    },
  };
}
