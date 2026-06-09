import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

/**
 * Server-side self-approval / role guard.
 * Returns true if user is allowed to approve the policy for the given requester.
 */
export async function canApprove(params: {
  userId: string;
  policyId: string;
  requesterUserId: string;
}): Promise<boolean> {
  const { data, error } = await db.rpc('bn_can_approve', {
    p_user_id: params.userId,
    p_policy_id: params.policyId,
    p_requester_user_id: params.requesterUserId,
  });
  if (error) throw error;
  return Boolean(data);
}
