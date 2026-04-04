import { supabase } from '@/integrations/supabase/client';
import type { BnWorkbasket, BnClaimQueueAssignment } from '@/types/bn';

const db = supabase as any;

export async function fetchWorkbaskets(): Promise<BnWorkbasket[]> {
  const { data, error } = await db
    .from('bn_workbasket')
    .select('*')
    .eq('is_active', true)
    .order('basket_name');
  if (error) throw error;
  return (data || []) as BnWorkbasket[];
}

export async function fetchWorkbasketsByRole(role: string): Promise<BnWorkbasket[]> {
  const { data, error } = await db
    .from('bn_workbasket')
    .select('*')
    .eq('is_active', true)
    .eq('assigned_role', role)
    .order('basket_name');
  if (error) throw error;
  return (data || []) as BnWorkbasket[];
}

export async function createWorkbasket(basket: Partial<BnWorkbasket>): Promise<BnWorkbasket> {
  const { data, error } = await db.from('bn_workbasket').insert(basket).select().single();
  if (error) throw error;
  return data as BnWorkbasket;
}

export async function updateWorkbasket(id: string, updates: Partial<BnWorkbasket>): Promise<BnWorkbasket> {
  const { data, error } = await db.from('bn_workbasket').update({ ...updates, modified_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data as BnWorkbasket;
}

export async function fetchQueueClaims(workbasketId: string): Promise<BnClaimQueueAssignment[]> {
  const { data, error } = await db
    .from('bn_claim_queue_assignment')
    .select('*, bn_claim(*, bn_product(benefit_code, benefit_name, category)), bn_workbasket(*)')
    .eq('workbasket_id', workbasketId)
    .eq('is_active', true)
    .is('completed_at', null)
    .order('priority', { ascending: true })
    .order('assigned_at', { ascending: true });
  if (error) throw error;
  return (data || []) as BnClaimQueueAssignment[];
}

export async function fetchMyQueue(userCode: string): Promise<BnClaimQueueAssignment[]> {
  const { data, error } = await db
    .from('bn_claim_queue_assignment')
    .select('*, bn_claim(*, bn_product(benefit_code, benefit_name, category)), bn_workbasket(*)')
    .eq('assigned_to', userCode)
    .eq('is_active', true)
    .is('completed_at', null)
    .order('priority', { ascending: true });
  if (error) throw error;
  return (data || []) as BnClaimQueueAssignment[];
}

export async function assignClaimToQueue(params: {
  claimId: string;
  workbasketId: string;
  assignedTo?: string;
  priority?: number;
  dueAt?: string;
}): Promise<BnClaimQueueAssignment> {
  const { data, error } = await db
    .from('bn_claim_queue_assignment')
    .insert({
      claim_id: params.claimId,
      workbasket_id: params.workbasketId,
      assigned_to: params.assignedTo || null,
      priority: params.priority || 5,
      due_at: params.dueAt || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as BnClaimQueueAssignment;
}

export async function pickClaim(assignmentId: string, userCode: string): Promise<void> {
  const { error } = await db
    .from('bn_claim_queue_assignment')
    .update({ assigned_to: userCode, picked_at: new Date().toISOString() })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function releaseClaim(assignmentId: string): Promise<void> {
  const { error } = await db
    .from('bn_claim_queue_assignment')
    .update({ assigned_to: null, picked_at: null })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function completeClaim(assignmentId: string): Promise<void> {
  const { error } = await db
    .from('bn_claim_queue_assignment')
    .update({ completed_at: new Date().toISOString(), is_active: false })
    .eq('id', assignmentId);
  if (error) throw error;
}
