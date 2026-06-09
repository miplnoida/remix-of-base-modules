import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type DelegationStatus = 'PENDING' | 'APPROVED' | 'REVOKED' | 'EXPIRED';

export interface BnRoleDelegation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  role_name: string;
  workbasket_id: string | null;
  valid_from: string;
  valid_to: string;
  reason: string;
  status: DelegationStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export async function listDelegations(filter?: {
  toUserId?: string;
  fromUserId?: string;
  status?: DelegationStatus;
}): Promise<BnRoleDelegation[]> {
  let q = db.from('bn_role_delegation').select('*').order('created_at', { ascending: false });
  if (filter?.toUserId) q = q.eq('to_user_id', filter.toUserId);
  if (filter?.fromUserId) q = q.eq('from_user_id', filter.fromUserId);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as BnRoleDelegation[];
}

export async function createDelegation(params: {
  fromUserId: string;
  toUserId: string;
  roleName: string;
  workbasketId?: string | null;
  validFrom: string;
  validTo: string;
  reason: string;
  createdBy?: string;
}): Promise<BnRoleDelegation> {
  const { data, error } = await db
    .from('bn_role_delegation')
    .insert({
      from_user_id: params.fromUserId,
      to_user_id: params.toUserId,
      role_name: params.roleName,
      workbasket_id: params.workbasketId ?? null,
      valid_from: params.validFrom,
      valid_to: params.validTo,
      reason: params.reason,
      status: 'PENDING',
      created_by: params.createdBy || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as BnRoleDelegation;
}

export async function approveDelegation(id: string, approverUserId: string): Promise<void> {
  const { error } = await db
    .from('bn_role_delegation')
    .update({
      status: 'APPROVED',
      approved_by: approverUserId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function revokeDelegation(id: string): Promise<void> {
  const { error } = await db
    .from('bn_role_delegation')
    .update({ status: 'REVOKED' })
    .eq('id', id);
  if (error) throw error;
}
