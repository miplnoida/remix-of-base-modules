/**
 * Planner Approval Workflow service
 * ---------------------------------
 * Client-side helpers for the Supervisor+ approval workflow that gates
 * `convert_exception` and `merge_duplicate` planner actions.
 */
import { supabase } from '@/integrations/supabase/client';

export type PlannerApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface PlannerActionApproval {
  id: string;
  action_id: string;
  week_start_date: string;
  inspector_id: string | null;
  employer_id: string;
  audit_program: string | null;
  zone_id: string | null;
  action_type: string;
  exception_category: string | null;
  exception_justification: string | null;
  capacity_impact_hours: number;
  requested_by_user_code: string;
  requested_at: string;
  status: PlannerApprovalStatus;
  decision_notes: string | null;
  decided_by_user_code: string | null;
  decided_at: string | null;
  decided_via: string | null;
  sla_due_at: string;
  escalated_at: string | null;
  escalation_count: number;
  reminder_sent_count: number;
  approver_user_codes: string[];
  approver_emails: string[];
  created_at: string;
  updated_at: string;
}

export const plannerApprovalService = {
  async submit(actionId: string, requestedByUserCode: string) {
    const { data, error } = await supabase.functions.invoke(
      'planner-approval-request',
      {
        body: {
          actionId,
          requestedByUserCode,
          appBaseUrl: window.location.origin,
        },
      },
    );
    if (error) throw error;
    return data as { ok: boolean; approvalId: string; approvers: number };
  },

  async listInbox(approverUserCode: string, status: PlannerApprovalStatus | 'ALL' = 'PENDING') {
    let q = (supabase.from('ce_planner_action_approvals' as any) as any)
      .select('*')
      .contains('approver_user_codes', [approverUserCode])
      .order('sla_due_at', { ascending: true });
    if (status !== 'ALL') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PlannerActionApproval[];
  },

  async listForAction(actionId: string) {
    const { data, error } = await (supabase.from('ce_planner_action_approvals' as any) as any)
      .select('*')
      .eq('action_id', actionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PlannerActionApproval[];
  },

  async listAuditTrail(approvalId: string) {
    const { data, error } = await (supabase.from('ce_planner_approval_audit' as any) as any)
      .select('*')
      .eq('approval_id', approvalId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Array<{
      id: string;
      event_type: string;
      actor_user_code: string | null;
      recipient_email: string | null;
      channel: string | null;
      payload: Record<string, any>;
      created_at: string;
    }>;
  },

  async decide(token: string, intent: 'approve' | 'reject', notes?: string) {
    const { data, error } = await supabase.functions.invoke(
      'planner-approval-decide',
      {
        body: { token, intent, notes },
        headers: { 'x-source': 'inbox' },
      },
    );
    if (error) throw error;
    return data as { ok: boolean; status: PlannerApprovalStatus };
  },

  /** Direct in-app decision (no token) — Supervisor uses Inbox UI. */
  async decideInApp(
    approvalId: string,
    deciderUserCode: string,
    intent: 'approve' | 'reject',
    notes?: string,
  ) {
    const newStatus = intent === 'approve' ? 'APPROVED' : 'REJECTED';
    const { error } = await (supabase.from('ce_planner_action_approvals' as any) as any)
      .update({
        status: newStatus,
        decision_notes: notes ?? null,
        decided_by_user_code: deciderUserCode,
        decided_at: new Date().toISOString(),
        decided_via: 'inbox_ui',
        updated_by: deciderUserCode,
      })
      .eq('id', approvalId);
    if (error) {
      if (String(error.message ?? '').includes('maker_checker_violation')) {
        throw new Error('Maker-checker: requester cannot approve own action');
      }
      throw error;
    }

    // Mirror onto the planner action
    const { data: appr } = await (supabase.from('ce_planner_action_approvals' as any) as any)
      .select('action_id')
      .eq('id', approvalId)
      .maybeSingle();
    if (appr?.action_id) {
      await (supabase.from('ce_planner_candidate_actions' as any) as any)
        .update({
          approval_status: newStatus,
          approved_by_user_code: deciderUserCode,
          approved_at: new Date().toISOString(),
          notes: notes ?? null,
          updated_by: deciderUserCode,
        })
        .eq('id', appr.action_id);
    }

    await (supabase.from('ce_planner_approval_audit' as any) as any).insert({
      approval_id: approvalId,
      event_type: intent === 'approve' ? 'approved' : 'rejected',
      actor_user_code: deciderUserCode,
      payload: { via: 'inbox_ui', notes: notes ?? null },
    });

    return { ok: true, status: newStatus as PlannerApprovalStatus };
  },
};

export const APPROVAL_STATUS_LABELS: Record<PlannerApprovalStatus, string> = {
  PENDING: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};
