/**
 * Approval flow: any user with the required role can approve their step.
 * When all required steps are approved, communication.status flips to `approved`.
 * On reject, communication.status flips to `rejected`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CeCommApprovalRole } from '@/types/auditCommunication';

const COMM = 'ce_audit_communications' as any;
const APP = 'ce_audit_communication_approvals' as any;
const EVT = 'ce_audit_communication_events' as any;

async function logEvent(communicationId: string, eventType: string, actor?: string, payload: Record<string, unknown> = {}) {
  await (supabase.from(EVT) as any).insert({
    communication_id: communicationId,
    event_type: eventType,
    actor_user_id: actor,
    payload,
  });
}

export const auditCommunicationApprovalService = {
  /** Pending approvals matching given roles (for an approver inbox). */
  async listPendingForRoles(roles: CeCommApprovalRole[]) {
    if (!roles.length) return [];
    const { data, error } = await (supabase.from(APP) as any)
      .select('*, communication:ce_audit_communications(id, comm_type, employer_id, inspection_id, subject_snapshot, status, created_at)')
      .in('required_role', roles)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async approve(approvalId: string, approver: { userCode: string; name?: string }, comments?: string) {
    const { data: row, error } = await (supabase.from(APP) as any)
      .update({
        status: 'approved',
        approver_user_id: approver.userCode,
        approver_name: approver.name,
        comments: comments ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .select()
      .single();
    if (error) throw error;

    const commId = (row as any).communication_id;
    await logEvent(commId, 'approval_granted', approver.userCode, { step_no: (row as any).step_no, role: (row as any).required_role });

    // If no more pending approvals, flip communication to approved
    const { data: pending } = await (supabase.from(APP) as any)
      .select('id').eq('communication_id', commId).eq('status', 'pending').limit(1);
    if (!pending || pending.length === 0) {
      await (supabase.from(COMM) as any)
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', commId);
      await logEvent(commId, 'fully_approved', approver.userCode);
    }
    return row;
  },

  async reject(approvalId: string, approver: { userCode: string; name?: string }, reason: string) {
    const { data: row, error } = await (supabase.from(APP) as any)
      .update({
        status: 'rejected',
        approver_user_id: approver.userCode,
        approver_name: approver.name,
        comments: reason,
        decided_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .select()
      .single();
    if (error) throw error;
    const commId = (row as any).communication_id;
    await (supabase.from(COMM) as any).update({ status: 'rejected' }).eq('id', commId);
    await logEvent(commId, 'rejected', approver.userCode, { reason });
    return row;
  },
};
