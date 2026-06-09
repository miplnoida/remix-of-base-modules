import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface BnRoleBundle {
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BnRoleBundleMember {
  id: string;
  bundle_code: string;
  role_name: string;
}

export async function fetchRoleBundles(): Promise<BnRoleBundle[]> {
  const { data, error } = await db
    .from('bn_role_bundle')
    .select('*')
    .order('code');
  if (error) throw error;
  return (data || []) as BnRoleBundle[];
}

export async function fetchBundleMembers(bundleCode: string): Promise<string[]> {
  const { data, error } = await db
    .from('bn_role_bundle_member')
    .select('role_name')
    .eq('bundle_code', bundleCode);
  if (error) throw error;
  return ((data || []) as { role_name: string }[]).map((r) => r.role_name);
}

export async function setBundleActive(code: string, isActive: boolean): Promise<void> {
  const { error } = await db
    .from('bn_role_bundle')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('code', code);
  if (error) throw error;
}
