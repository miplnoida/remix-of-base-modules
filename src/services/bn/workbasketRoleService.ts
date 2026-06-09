import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface BnWorkbasketRole {
  id: string;
  workbasket_id: string;
  role_name: string;
  is_primary: boolean;
  created_at: string;
  created_by: string | null;
}

export interface WorkbasketForUser {
  workbasket_id: string;
  basket_code: string;
  basket_name: string;
  role_name: string;
  is_primary: boolean;
}

/** All role rows for a workbasket. */
export async function fetchRolesForWorkbasket(workbasketId: string): Promise<BnWorkbasketRole[]> {
  const { data, error } = await db
    .from('bn_workbasket_role')
    .select('*')
    .eq('workbasket_id', workbasketId)
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return (data || []) as BnWorkbasketRole[];
}

/** Replace the role set for a workbasket. The first role becomes primary. */
export async function setWorkbasketRoles(
  workbasketId: string,
  roles: string[],
  userCode?: string,
): Promise<void> {
  const cleaned = Array.from(new Set(roles.filter(Boolean)));
  if (cleaned.length === 0) throw new Error('At least one role is required');

  const { error: delErr } = await db
    .from('bn_workbasket_role')
    .delete()
    .eq('workbasket_id', workbasketId);
  if (delErr) throw delErr;

  const rows = cleaned.map((role_name, idx) => ({
    workbasket_id: workbasketId,
    role_name,
    is_primary: idx === 0,
    created_by: userCode || null,
  }));
  const { error: insErr } = await db.from('bn_workbasket_role').insert(rows);
  if (insErr) throw insErr;

  // Keep legacy assigned_role in sync with the primary role
  const { error: updErr } = await db
    .from('bn_workbasket')
    .update({ assigned_role: cleaned[0], modified_at: new Date().toISOString() })
    .eq('id', workbasketId);
  if (updErr) throw updErr;
}

/** Returns workbaskets visible to a user via direct, bundle, or delegated roles. */
export async function fetchWorkbasketsForUser(userId: string): Promise<WorkbasketForUser[]> {
  const { data, error } = await db.rpc('bn_workbaskets_for_user', { p_user_id: userId });
  if (error) throw error;
  return (data || []) as WorkbasketForUser[];
}

/** Map of workbasket_id → role[] for many baskets at once. */
export async function fetchRolesForWorkbaskets(
  ids: string[],
): Promise<Record<string, string[]>> {
  if (ids.length === 0) return {};
  const { data, error } = await db
    .from('bn_workbasket_role')
    .select('workbasket_id, role_name')
    .in('workbasket_id', ids);
  if (error) throw error;
  const out: Record<string, string[]> = {};
  for (const row of (data || []) as { workbasket_id: string; role_name: string }[]) {
    (out[row.workbasket_id] ||= []).push(row.role_name);
  }
  return out;
}
