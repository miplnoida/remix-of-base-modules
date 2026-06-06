/**
 * externalAuthService — auth + role helpers for external portals.
 * Wraps Supabase auth and exposes the portal role from user_metadata.
 */
import { supabase } from '@/integrations/supabase/client';
import type { PortalRole } from './publicBenefitApiClient';

export interface PortalSession {
  userId: string;
  email: string | null;
  role: PortalRole | null;
  displayName: string | null;
}

export const externalAuthService = {
  async getSession(): Promise<PortalSession | null> {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    const meta = (u.user_metadata ?? {}) as Record<string, any>;
    return {
      userId: u.id,
      email: u.email ?? null,
      role: (meta.portal_role as PortalRole) ?? null,
      displayName: meta.display_name ?? meta.full_name ?? u.email ?? null,
    };
  },
  async signInWithPassword(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() { return supabase.auth.signOut(); },
  onAuthStateChange(cb: (s: PortalSession | null) => void) {
    return supabase.auth.onAuthStateChange(async () => cb(await externalAuthService.getSession()));
  },
};
