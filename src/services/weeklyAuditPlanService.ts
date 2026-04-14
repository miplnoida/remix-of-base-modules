// ============================================
// WEEKLY AUDIT PLANNING & EXECUTION - DB-BACKED SERVICE
// ============================================

import { supabase } from '@/integrations/supabase/client';
import {
  WeeklyAuditPlan,
  PlannedVisit,
  WeeklyPlanWorkflowStatus,
  ReviewPlanRequest,
  SubmitWeeklyReportRequest,
  WeeklyReportSummary,
} from '@/types/weeklyAuditPlan';

// ── Map DB rows to domain types ──

function mapPlanRow(row: any): WeeklyAuditPlan {
  return {
    id: row.id,
    planNumber: row.plan_number ?? '',
    inspectorId: row.inspector_id ?? '',
    inspectorName: row.inspector_name ?? '',
    weekStartDate: row.week_start_date?.slice(0, 10) ?? '',
    weekEndDate: row.week_end_date?.slice(0, 10) ?? '',
    status: (row.status ?? 'DRAFT') as WeeklyPlanWorkflowStatus,
    submittedAt: row.submitted_date ?? undefined,
    submittedBy: row.created_by ?? undefined,
    reviewedAt: row.approved_date ?? row.rejected_date ?? undefined,
    reviewedBy: row.approved_by ?? undefined,
    reviewerRole: undefined,
    reviewComments: row.reviewer_comments ?? row.supervisor_comments ?? undefined,
    approvedAt: row.approved_date ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    weeklyReportNarrative: row.outcome_narrative ?? undefined,
    weeklyReportSubmittedAt: row.outcome_submitted_at ?? undefined,
    plannedVisits: (row.ce_weekly_plan_items ?? []).map(mapPlanItemToVisit),
    totalPlannedVisits: row.total_planned_visits ?? 0,
    completedVisits: row.completed_visits ?? 0,
    holidays: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlanItemToVisit(item: any): PlannedVisit {
  return {
    id: item.id,
    planId: item.plan_id,
    itemType: item.item_type ?? 'EMPLOYER_VISIT',
    dayOfWeek: item.day_of_week ?? '',
    visitDate: item.scheduled_date?.slice(0, 10) ?? '',
    employerId: item.employer_id ?? undefined,
    employerName: item.employer_name ?? undefined,
    areaName: item.area_name ?? undefined,
    territory: item.territory ?? 'St Kitts',
    visitType: item.visit_type ?? 'AUDIT',
    duration: item.duration ?? 'FULL_DAY',
    purpose: item.purpose ?? '',
    plannedStartTime: item.scheduled_start_time ?? undefined,
    plannedEndTime: item.scheduled_end_time ?? undefined,
    executionStatus: item.execution_status ?? 'PLANNED',
    checkInTime: item.check_in_time ?? undefined,
    checkInGPSLat: item.check_in_gps_lat ? Number(item.check_in_gps_lat) : undefined,
    checkInGPSLng: item.check_in_gps_lng ? Number(item.check_in_gps_lng) : undefined,
    checkOutTime: item.check_out_time ?? undefined,
    checkOutGPSLat: item.check_out_gps_lat ? Number(item.check_out_gps_lat) : undefined,
    checkOutGPSLng: item.check_out_gps_lng ? Number(item.check_out_gps_lng) : undefined,
    visitNotes: item.outcome_notes ?? undefined,
    findings: item.findings ?? undefined,
    rescheduledTo: item.rescheduled_to ?? undefined,
    rescheduledReason: item.reschedule_reason ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

const PLAN_SELECT = '*, ce_weekly_plan_items(*)';

export const weeklyAuditPlanService = {
  // Get all plans (with optional filters)
  getAll: async (filters?: {
    inspectorId?: string;
    status?: WeeklyPlanWorkflowStatus;
    weekStartDate?: string;
  }): Promise<WeeklyAuditPlan[]> => {
    let query = supabase
      .from('ce_weekly_plans')
      .select(PLAN_SELECT)
      .order('week_start_date', { ascending: false });

    if (filters?.inspectorId) {
      query = query.eq('inspector_id', filters.inspectorId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.weekStartDate) {
      query = query.eq('week_start_date', filters.weekStartDate);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;
    return (data ?? []).map(mapPlanRow);
  },

  // Get plan by ID
  getById: async (id: string): Promise<WeeklyAuditPlan | null> => {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .select(PLAN_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPlanRow(data) : null;
  },

  // Submit plan for review
  submit: async (planId: string): Promise<WeeklyAuditPlan> => {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: 'SUBMITTED',
        submitted_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select(PLAN_SELECT)
      .single();
    if (error) throw error;
    return mapPlanRow(data);
  },

  // Review plan (Senior Inspector or Manager)
  review: async (request: ReviewPlanRequest): Promise<WeeklyAuditPlan> => {
    const updates: Record<string, any> = {
      reviewer_comments: request.comments,
      updated_at: new Date().toISOString(),
    };

    if (request.approved) {
      updates.status = 'APPROVED';
      updates.approved_date = new Date().toISOString();
      updates.approved_by = 'SYSTEM'; // TODO: use auth user code
    } else {
      updates.status = 'NEED_CHANGES';
      updates.rejected_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .update(updates)
      .eq('id', request.planId)
      .select(PLAN_SELECT)
      .single();
    if (error) throw error;
    return mapPlanRow(data);
  },

  // Submit weekly report
  submitWeeklyReport: async (request: SubmitWeeklyReportRequest): Promise<WeeklyAuditPlan> => {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .update({
        outcome_narrative: request.narrative,
        outcome_submitted_at: new Date().toISOString(),
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.planId)
      .select(PLAN_SELECT)
      .single();
    if (error) throw error;
    return mapPlanRow(data);
  },

  // Generate weekly report summary from DB data
  generateWeeklyReportSummary: async (planId: string): Promise<WeeklyReportSummary> => {
    const { data: items, error } = await supabase
      .from('ce_weekly_plan_items')
      .select('*')
      .eq('plan_id', planId);
    if (error) throw error;

    const allItems = items ?? [];
    const completed = allItems.filter(i => i.execution_status === 'COMPLETED');
    const cancelled = allItems.filter(i => i.execution_status === 'CANCELLED');
    const rescheduled = allItems.filter(i => i.execution_status === 'RESCHEDULED');

    // Calculate total hours from check-in/check-out
    let totalHours = 0;
    completed.forEach(i => {
      if (i.check_in_time && i.check_out_time) {
        const diff = new Date(i.check_out_time).getTime() - new Date(i.check_in_time).getTime();
        totalHours += diff / (1000 * 60 * 60);
      }
    });

    const { data: plan } = await supabase
      .from('ce_weekly_plans')
      .select('outcome_narrative')
      .eq('id', planId)
      .maybeSingle();

    return {
      planId,
      plannedVisits: allItems.length,
      completedVisits: completed.length,
      cancelledVisits: cancelled.length,
      rescheduledVisits: rescheduled.length,
      totalHoursSpent: Math.round(totalHours * 10) / 10,
      evidenceCollected: 0, // TODO: count from ce_inspection_findings
      violationsOpened: 0, // TODO: count from ce_violations created this week
      violationsUpdated: 0,
      findingsSummary: completed.map(i => i.findings).filter(Boolean).join('; '),
      inspectorNarrative: plan?.outcome_narrative ?? '',
      generatedAt: new Date().toISOString(),
    };
  },

  // Get plans pending review
  getPendingReview: async (_reviewerRole: 'SENIOR_INSPECTOR' | 'MANAGER'): Promise<WeeklyAuditPlan[]> => {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .select(PLAN_SELECT)
      .in('status', ['SUBMITTED', 'RESUBMITTED'])
      .order('submitted_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapPlanRow);
  },

  // Update visit execution (check-in, check-out, notes) on plan items
  updateVisitExecution: async (itemId: string, updates: Record<string, any>): Promise<void> => {
    const { error } = await supabase
      .from('ce_weekly_plan_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) throw error;
  },
};
