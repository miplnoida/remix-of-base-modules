/**
 * useClaimantPersona — React hook for the persona-aware claimant portal.
 *
 * Reads the current Supabase auth session, resolves the user's personas
 * via portalPersonaService, and exposes a stable context that gates UI.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  resolvePortalPersonas,
  type PortalPersonaContext,
} from '@/services/external/portalPersonaService';
import { seedSelfLinkIfMissing } from '@/services/external/seedSelfLink';

interface AuthSnapshot {
  userId: string | null;
  email: string | null;
  displayName: string | null;
}

function readSnapshot(): Promise<AuthSnapshot> {
  return supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    if (!u) return { userId: null, email: null, displayName: null };
    const meta = (u.user_metadata ?? {}) as Record<string, any>;
    return {
      userId: u.id,
      email: u.email ?? null,
      displayName: meta.display_name ?? meta.full_name ?? u.email ?? null,
    };
  });
}

export function useClaimantPersona() {
  const [snap, setSnap] = useState<AuthSnapshot>({ userId: null, email: null, displayName: null });
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    readSnapshot().then(s => { if (mounted) { setSnap(s); setAuthReady(true); } });
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const s = await readSnapshot();
      if (mounted) setSnap(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const query = useQuery<PortalPersonaContext>({
    queryKey: ['portalPersona', snap.userId],
    enabled: authReady && !!snap.userId,
    staleTime: 60_000,
    queryFn: async () => {
      // PR-B #1: auto-seed a VERIFIED SELF link from user_metadata.ssn if missing.
      await seedSelfLinkIfMissing(snap.userId as string);
      return resolvePortalPersonas(snap.userId as string, {
        displayNameFallback: snap.displayName,
      });
    },
  });

  return {
    isAuthReady: authReady,
    isAuthenticated: !!snap.userId,
    userId: snap.userId,
    email: snap.email,
    persona: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
