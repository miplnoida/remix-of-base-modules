/**
 * Phase 3 — Planner Candidate Actions service
 *
 * Backs the new Weekly Plan Builder V3 governance controls:
 *   pin · suppress · demote_watchlist · convert_exception ·
 *   merge_duplicate · recalc_request
 *
 * One row per (week × inspector × employer × audit_program × action_type).
 * No RLS — role gating is enforced in the UI via useComplianceRole.
 */
import { supabase } from '@/integrations/supabase/client';

export type PlannerActionType =
  | 'pin'
  | 'suppress'
  | 'demote_watchlist'
  | 'convert_exception'
  | 'merge_duplicate'
  | 'recalc_request';

export type ExceptionCategory =
  | 'urgent_enforcement'
  | 'court_legal'
  | 'management_instruction'
  | 'field_intelligence'
  | 'external_meeting'
  | 'admin_workload'
  | 'zone_campaign'
  | 'other';

export interface PlannerCandidateAction {
  id: string;
  plan_id: string | null;
  inspector_id: string | null;
  week_start_date: string;
  employer_id: string;
  audit_program: string | null;
  zone_id: string | null;
  action_type: PlannerActionType;
  reason: string | null;
  notes: string | null;
  exception_category: ExceptionCategory | null;
  exception_justification: string | null;
  requested_by_user_code: string | null;
  approval_required: boolean;
  approval_status: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by_user_code: string | null;
  approved_at: string | null;
  linked_case_id: string | null;
  linked_violation_id: string | null;
  linked_campaign_id: string | null;
  capacity_impact_hours: number;
  displaces_candidate: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RecordActionInput {
  planId?: string | null;
  inspectorId?: string | null;
  weekStartDate: string;
  employerId: string;
  auditProgram?: string | null;
  zoneId?: string | null;
  actionType: PlannerActionType;
  reason?: string;
  notes?: string;
  exception?: {
    category: ExceptionCategory;
    justification: string;
    requestedByUserCode?: string;
    approvalRequired?: boolean;
    capacityImpactHours?: number;
    displacesCandidate?: boolean;
    linkedCaseId?: string | null;
    linkedViolationId?: string | null;
    linkedCampaignId?: string | null;
  };
  userCode?: string;
}

const TBL = 'ce_planner_candidate_actions' as any;

export const plannerCandidateActionsService = {
  /** Active actions for a given week (and optionally inspector). */
  async listForWeek(weekStartDate: string, inspectorId?: string | null) {
    let q = (supabase.from(TBL) as any)
      .select('*')
      .eq('week_start_date', weekStartDate)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (inspectorId) q = q.eq('inspector_id', inspectorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PlannerCandidateAction[];
  },

  async record(input: RecordActionInput): Promise<PlannerCandidateAction> {
    const isException = input.actionType === 'convert_exception';
    const row: any = {
      plan_id: input.planId ?? null,
      inspector_id: input.inspectorId ?? null,
      week_start_date: input.weekStartDate,
      employer_id: input.employerId,
      audit_program: input.auditProgram ?? null,
      zone_id: input.zoneId ?? null,
      action_type: input.actionType,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      exception_category: isException ? input.exception?.category ?? null : null,
      exception_justification: isException
        ? input.exception?.justification ?? null
        : null,
      requested_by_user_code: isException
        ? input.exception?.requestedByUserCode ?? input.userCode ?? null
        : null,
      approval_required: isException
        ? Boolean(input.exception?.approvalRequired)
        : false,
      approval_status:
        isException && input.exception?.approvalRequired
          ? 'PENDING'
          : isException
          ? 'APPROVED'
          : 'NOT_REQUIRED',
      capacity_impact_hours: isException
        ? Number(input.exception?.capacityImpactHours ?? 0)
        : 0,
      displaces_candidate: isException
        ? Boolean(input.exception?.displacesCandidate)
        : false,
      linked_case_id: input.exception?.linkedCaseId ?? null,
      linked_violation_id: input.exception?.linkedViolationId ?? null,
      linked_campaign_id: input.exception?.linkedCampaignId ?? null,
      created_by: input.userCode ?? null,
      updated_by: input.userCode ?? null,
    };
    const { data, error } = await (supabase.from(TBL) as any)
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return data as PlannerCandidateAction;
  },

  /** Soft-revert an action (e.g. unpin, un-suppress). */
  async revert(actionId: string, userCode?: string) {
    const { error } = await (supabase.from(TBL) as any)
      .update({ is_active: false, updated_by: userCode ?? null })
      .eq('id', actionId);
    if (error) throw error;
  },

  async approveException(actionId: string, userCode: string) {
    const { error } = await (supabase.from(TBL) as any)
      .update({
        approval_status: 'APPROVED',
        approved_by_user_code: userCode,
        approved_at: new Date().toISOString(),
        updated_by: userCode,
      })
      .eq('id', actionId);
    if (error) throw error;
  },

  async rejectException(actionId: string, userCode: string, reason?: string) {
    const { error } = await (supabase.from(TBL) as any)
      .update({
        approval_status: 'REJECTED',
        approved_by_user_code: userCode,
        approved_at: new Date().toISOString(),
        notes: reason ?? null,
        updated_by: userCode,
      })
      .eq('id', actionId);
    if (error) throw error;
  },
};

export const EXCEPTION_CATEGORY_LABELS: Record<ExceptionCategory, string> = {
  urgent_enforcement: 'Urgent enforcement action',
  court_legal: 'Court / legal appearance',
  management_instruction: 'Management instruction',
  field_intelligence: 'Field intelligence follow-up',
  external_meeting: 'External meeting / stakeholder action',
  admin_workload: 'Admin / documentation workload',
  zone_campaign: 'Zone campaign / sweep',
  other: 'Other justified exception',
};

export const ACTION_TYPE_LABELS: Record<PlannerActionType, string> = {
  pin: 'Pinned',
  suppress: 'Suppressed',
  demote_watchlist: 'Demoted to watchlist',
  convert_exception: 'Exception',
  merge_duplicate: 'Merged duplicate',
  recalc_request: 'Recalc requested',
};
