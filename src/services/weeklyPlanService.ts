// ============================================
// WEEKLY PLAN SERVICE - DB-BACKED (UNIFIED)
// ============================================

import { supabase } from '@/integrations/supabase/client';
import {
  WeeklyPlan,
  WeeklyPlanItem,
  WeeklyPlanReview,
  WeeklyPlanStatus,
  PlanItemExecutionStatus,
  PlanReviewAction,
  CreateWeeklyPlanRequest,
  CreatePlanItemRequest,
} from '@/types/weeklyPlan';

// ============================================
// PLAN NUMBER GENERATION
// ============================================
function generatePlanNumber(weekStart: string): string {
  const year = weekStart.substring(0, 4);
  const d = new Date(weekStart);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WP-${year}-W${String(weekNum).padStart(2, '0')}-${rand}`;
}

// ============================================
// WEEKLY REPORT SUMMARY (from DB view)
// ============================================
export interface WeeklyReportSummary {
  plan_id: string;
  plan_number: string;
  inspector_id: string;
  inspector_name: string;
  week_start_date: string;
  week_end_date: string;
  plan_status: string;
  total_planned: number;
  completed_visits: number;
  rescheduled_visits: number;
  cancelled_visits: number;
  not_done_visits: number;
  still_planned: number;
  total_hours: number;
  evidence_count: number;
  findings_count: number;
  violations_created: number;
  outcome_narrative: string | null;
  outcome_submitted_at: string | null;
}

// ============================================
// WEEKLY PLAN CRUD
// ============================================

export const weeklyPlanService = {
  // Fetch all plans with optional filters
  async getAll(filters?: {
    inspectorId?: string;
    status?: string;
    weekStartDate?: string;
  }): Promise<WeeklyPlan[]> {
    let query = supabase
      .from('ce_weekly_plans')
      .select('*, ce_weekly_plan_items(*), ce_weekly_plan_reviews(*)')
      .order('week_start_date', { ascending: false });

    if (filters?.inspectorId && filters.inspectorId !== 'ALL') {
      query = query.eq('inspector_id', filters.inspectorId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.weekStartDate) {
      query = query.eq('week_start_date', filters.weekStartDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as WeeklyPlan[];
  },

  // Fetch single plan by ID
  async getById(id: string): Promise<WeeklyPlan | null> {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .select('*, ce_weekly_plan_items(*), ce_weekly_plan_reviews(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as WeeklyPlan | null;
  },

  // Check for existing active plan for this inspector and week
  async checkDuplicatePlan(inspectorId: string, weekStartDate: string): Promise<WeeklyPlan | null> {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .select('id, plan_number, status')
      .eq('inspector_id', inspectorId)
      .eq('week_start_date', weekStartDate)
      .neq('status', WeeklyPlanStatus.WITHDRAWN)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = multiple rows (shouldn't happen with constraint)
    return data as unknown as WeeklyPlan | null;
  },

  // Create a new weekly plan (with duplicate check)
  async create(req: CreateWeeklyPlanRequest): Promise<WeeklyPlan> {
    // Check for existing active plan
    const existing = await this.checkDuplicatePlan(req.inspector_id, req.week_start_date);
    if (existing) {
      throw new Error(`An active plan (${existing.plan_number}) already exists for this week. Status: ${existing.status}`);
    }

    const planNumber = generatePlanNumber(req.week_start_date);
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .insert({
        plan_number: planNumber,
        inspector_id: req.inspector_id,
        inspector_name: req.inspector_name,
        week_start_date: req.week_start_date,
        week_end_date: req.week_end_date,
        status: WeeklyPlanStatus.DRAFT,
        narrative: req.narrative || null,
        created_by: req.created_by,
        updated_by: req.created_by,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as WeeklyPlan;
  },

  // Update plan fields
  async update(id: string, updates: Partial<{
    narrative: string;
    outcome_narrative: string;
    status: string;
    supervisor_comments: string;
    updated_by: string;
  }>): Promise<WeeklyPlan> {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as WeeklyPlan;
  },

  // Submit plan for review
  async submit(planId: string, userId: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: WeeklyPlanStatus.SUBMITTED,
        submitted_date: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', planId);
    if (updateError) throw updateError;

    // Log review action
    const { error: reviewError } = await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: PlanReviewAction.SUBMITTED,
        performed_by: userId,
      });
    if (reviewError) throw reviewError;
  },

  // Approve plan
  async approve(planId: string, reviewerId: string, comments?: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: WeeklyPlanStatus.APPROVED,
        approved_date: new Date().toISOString(),
        approved_by: reviewerId,
        reviewer_comments: comments || null,
        updated_by: reviewerId,
      })
      .eq('id', planId);
    if (updateError) throw updateError;

    const { error: reviewError } = await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: PlanReviewAction.APPROVED,
        comments: comments || null,
        performed_by: reviewerId,
      });
    if (reviewError) throw reviewError;
  },

  // Reject plan
  async reject(planId: string, reviewerId: string, comments: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: WeeklyPlanStatus.NEEDS_CHANGES,
        rejected_date: new Date().toISOString(),
        reviewer_comments: comments,
        updated_by: reviewerId,
      })
      .eq('id', planId);
    if (updateError) throw updateError;

    // Increment rejection count
    const { data: plan } = await supabase
      .from('ce_weekly_plans')
      .select('rejection_count')
      .eq('id', planId)
      .single();
    if (plan) {
      await supabase
        .from('ce_weekly_plans')
        .update({ rejection_count: (plan.rejection_count || 0) + 1 })
        .eq('id', planId);
    }

    const { error: reviewError } = await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: PlanReviewAction.REJECTED,
        comments,
        performed_by: reviewerId,
      });
    if (reviewError) throw reviewError;
  },

  // Resubmit after changes
  async resubmit(planId: string, userId: string, narrative?: string): Promise<void> {
    const updates: Record<string, any> = {
      status: WeeklyPlanStatus.RESUBMITTED,
      submitted_date: new Date().toISOString(),
      updated_by: userId,
      reviewer_comments: null,
    };
    if (narrative !== undefined) {
      updates.narrative = narrative;
    }

    const { error: updateError } = await supabase
      .from('ce_weekly_plans')
      .update(updates)
      .eq('id', planId);
    if (updateError) throw updateError;

    const { error: reviewError } = await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: PlanReviewAction.RESUBMITTED,
        performed_by: userId,
      });
    if (reviewError) throw reviewError;
  },

  // Withdraw a submitted/resubmitted plan
  async withdraw(planId: string, userId: string, reason?: string): Promise<void> {
    // Verify the plan is in a withdrawable state
    const { data: plan, error: fetchError } = await supabase
      .from('ce_weekly_plans')
      .select('status')
      .eq('id', planId)
      .single();
    if (fetchError) throw fetchError;

    if (!plan || (plan.status !== WeeklyPlanStatus.SUBMITTED && plan.status !== 'RESUBMITTED')) {
      throw new Error('Plan can only be withdrawn when in SUBMITTED or RESUBMITTED status.');
    }

    const { error: updateError } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: WeeklyPlanStatus.WITHDRAWN,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);
    if (updateError) throw updateError;

    const { error: reviewError } = await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: 'WITHDRAWN',
        comments: reason || 'Plan withdrawn by inspector',
        performed_by: userId,
      });
    if (reviewError) throw reviewError;
  },

  // ============================================
  // PHASE 3 — Approved Plan Revision Flow
  // ============================================

  /**
   * Request a revision on an APPROVED plan. Clones the plan + items into a new
   * DRAFT version (parent_plan_id, version_no=N+1) using fn_ce_create_plan_revision.
   * The original APPROVED plan stays immutable until the revision is later promoted.
   */
  async requestRevision(planId: string, reason: string, actor: string): Promise<string> {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Please provide a revision reason (min 5 characters).');
    }
    const { data, error } = await supabase.rpc('fn_ce_create_plan_revision', {
      p_plan_id: planId,
      p_reason: reason.trim(),
      p_actor: actor,
    });
    if (error) throw error;
    return data as string;
  },

  /**
   * Promote an APPROVED revision to current. Marks the previous current version
   * as SUPERSEDED and sets is_current_version on the revision.
   */
  async promoteRevision(revisionId: string, actor: string): Promise<void> {
    const { error } = await supabase.rpc('fn_ce_promote_plan_revision', {
      p_revision_id: revisionId,
      p_actor: actor,
    });
    if (error) throw error;
  },

  /**
   * Fetch the full version history (all versions) of a plan family. Accepts any
   * plan id within the family (root or revision). Returns ordered by version_no.
   */
  async getVersionHistory(planId: string): Promise<WeeklyPlan[]> {
    const { data: anchor, error: anchorErr } = await supabase
      .from('ce_weekly_plans')
      .select('id, parent_plan_id')
      .eq('id', planId)
      .single();
    if (anchorErr) throw anchorErr;
    const rootId = anchor?.parent_plan_id ?? anchor?.id;
    if (!rootId) return [];

    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .select('*')
      .or(`id.eq.${rootId},parent_plan_id.eq.${rootId}`)
      .order('version_no', { ascending: true });
    if (error) throw error;
    return (data ?? []) as WeeklyPlan[];
  },

  // Start execution (status = IN_EXECUTION)
  async startExecution(planId: string, userId: string): Promise<void> {
    await supabase
      .from('ce_weekly_plans')
      .update({
        status: WeeklyPlanStatus.IN_EXECUTION,
        updated_by: userId,
      })
      .eq('id', planId);
  },

  // Submit outcome (OUTCOME_SUBMITTED, not COMPLETED)
  async submitOutcome(planId: string, userId: string, outcomeNarrative: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: WeeklyPlanStatus.OUTCOME_SUBMITTED,
        outcome_narrative: outcomeNarrative,
        outcome_submitted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', planId);
    if (updateError) throw updateError;

    const { error: reviewError } = await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: PlanReviewAction.OUTCOME_SUBMITTED,
        performed_by: userId,
      });
    if (reviewError) throw reviewError;
  },

  // Complete plan (supervisor approves outcomes)
  async complete(planId: string, reviewerId: string, comments?: string): Promise<void> {
    const { error } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: WeeklyPlanStatus.COMPLETED,
        outcome_reviewed_at: new Date().toISOString(),
        outcome_reviewed_by: reviewerId,
        updated_by: reviewerId,
      })
      .eq('id', planId);
    if (error) throw error;

    await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: PlanReviewAction.OUTCOME_APPROVED,
        comments: comments || null,
        performed_by: reviewerId,
      });
  },

  // Get pending review plans (for supervisor)
  async getPendingReview(): Promise<WeeklyPlan[]> {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .select('*, ce_weekly_plan_items(*), ce_weekly_plan_reviews(*)')
      .in('status', [WeeklyPlanStatus.SUBMITTED, WeeklyPlanStatus.RESUBMITTED, WeeklyPlanStatus.OUTCOME_SUBMITTED])
      .order('submitted_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as WeeklyPlan[];
  },

  // Recalculate plan stats
  async recalculateStats(planId: string): Promise<void> {
    const { data: items } = await supabase
      .from('ce_weekly_plan_items')
      .select('execution_status')
      .eq('plan_id', planId);

    if (items) {
      const total = items.length;
      const completed = items.filter(i => i.execution_status === PlanItemExecutionStatus.COMPLETED).length;
      await supabase
        .from('ce_weekly_plans')
        .update({ total_planned_visits: total, completed_visits: completed })
        .eq('id', planId);
    }
  },

  // Get weekly report summary from DB view
  async getReportSummary(planId: string): Promise<WeeklyReportSummary | null> {
    const { data, error } = await supabase
      .from('ce_v_weekly_report_summary' as any)
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as WeeklyReportSummary | null;
  },

  // Submit weekly report (sets status to OUTCOME_SUBMITTED, not COMPLETED)
  async submitWeeklyReport(planId: string, userId: string, narrative: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('ce_weekly_plans')
      .update({
        outcome_narrative: narrative,
        outcome_submitted_at: new Date().toISOString(),
        status: WeeklyPlanStatus.OUTCOME_SUBMITTED,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);
    if (updateError) throw updateError;

    const { error: reviewError } = await supabase
      .from('ce_weekly_plan_reviews')
      .insert({
        plan_id: planId,
        action: PlanReviewAction.OUTCOME_SUBMITTED,
        performed_by: userId,
      });
    if (reviewError) throw reviewError;
  },
};

// ============================================
// PLAN ITEM CRUD
// ============================================

export const planItemService = {
  // Get items for a plan
  async getByPlanId(planId: string): Promise<WeeklyPlanItem[]> {
    const { data, error } = await supabase
      .from('ce_weekly_plan_items')
      .select('*')
      .eq('plan_id', planId)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as WeeklyPlanItem[];
  },

  // Create item
  async create(req: CreatePlanItemRequest): Promise<WeeklyPlanItem> {
    const { data, error } = await supabase
      .from('ce_weekly_plan_items')
      .insert({
        plan_id: req.plan_id,
        item_type: req.item_type,
        day_of_week: req.day_of_week || null,
        scheduled_date: req.scheduled_date || null,
        scheduled_start_time: req.scheduled_start_time || null,
        scheduled_end_time: req.scheduled_end_time || null,
        duration: req.duration || null,
        source_type: req.source_type || null,
        source_id: req.source_id || null,
        source_ref: req.source_ref || null,
        employer_id: req.employer_id || null,
        employer_name: req.employer_name || null,
        area_name: req.area_name || null,
        territory: req.territory || null,
        scouting_type: req.scouting_type || null,
        scouting_confidence: req.scouting_confidence || null,
        visit_type: req.visit_type || null,
        purpose: req.purpose || null,
        priority: req.priority || 'MEDIUM',
        recommendation_score: req.recommendation_score || null,
        is_mandatory: req.is_mandatory || false,
        created_by: req.created_by,
        updated_by: req.created_by,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as WeeklyPlanItem;
  },

  // Update item
  async update(id: string, updates: Partial<WeeklyPlanItem> & { updated_by: string }): Promise<WeeklyPlanItem> {
    const { data, error } = await supabase
      .from('ce_weekly_plan_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as WeeklyPlanItem;
  },

  // Delete item
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ce_weekly_plan_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Check in
  async checkIn(id: string, userId: string, gpsLat?: number, gpsLng?: number): Promise<WeeklyPlanItem> {
    return this.update(id, {
      execution_status: PlanItemExecutionStatus.IN_PROGRESS,
      check_in_time: new Date().toISOString(),
      check_in_gps_lat: gpsLat ?? null,
      check_in_gps_lng: gpsLng ?? null,
      updated_by: userId,
    });
  },

  // Check out
  async checkOut(id: string, userId: string, notes?: string, findings?: string, gpsLat?: number, gpsLng?: number): Promise<WeeklyPlanItem> {
    return this.update(id, {
      execution_status: PlanItemExecutionStatus.COMPLETED,
      check_out_time: new Date().toISOString(),
      check_out_gps_lat: gpsLat ?? null,
      check_out_gps_lng: gpsLng ?? null,
      outcome_notes: notes ?? null,
      findings: findings ?? null,
      updated_by: userId,
    });
  },

  // Reschedule
  async reschedule(id: string, userId: string, newDate: string, reason: string): Promise<WeeklyPlanItem> {
    return this.update(id, {
      execution_status: PlanItemExecutionStatus.RESCHEDULED,
      rescheduled_to: newDate,
      reschedule_reason: reason,
      updated_by: userId,
    });
  },

  // Cancel
  async cancel(id: string, userId: string, reason: string): Promise<WeeklyPlanItem> {
    return this.update(id, {
      execution_status: PlanItemExecutionStatus.CANCELLED,
      not_done_reason: reason,
      updated_by: userId,
    });
  },

  // Mark not done
  async markNotDone(id: string, userId: string, reason: string): Promise<WeeklyPlanItem> {
    return this.update(id, {
      execution_status: PlanItemExecutionStatus.NOT_DONE,
      not_done_reason: reason,
      updated_by: userId,
    });
  },
};
