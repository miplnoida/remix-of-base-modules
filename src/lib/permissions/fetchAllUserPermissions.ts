import { supabase } from '@/integrations/supabase/client';

export interface UserPermissionRow {
  module_name: string;
  action_name: string;
  is_granted?: boolean;
}

/**
 * Fetches ALL rows from the `get_user_permissions` RPC for a given user.
 *
 * The Supabase Data API (PostgREST) applies a default 1000-row cap on every
 * response — including RPC results. Roles with broad permission grants
 * (e.g. ComplianceAdmin, with ~14 actions across ~130+ modules) silently
 * exceed that cap, which causes per-module view grants to be dropped and
 * downstream gates to deny access even though the permissions exist.
 *
 * This helper pages through the RPC using `.range()` until a short page is
 * returned, guaranteeing the caller sees the complete permission set.
 */
export async function fetchAllUserPermissions(userId: string): Promise<UserPermissionRow[]> {
  const PAGE = 1000;
  const out: UserPermissionRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await (supabase.rpc as any)('get_user_permissions', { _user_id: userId })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    const chunk = (data || []) as UserPermissionRow[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
    if (offset > 100_000) break; // hard safety stop
  }
  return out;
}
