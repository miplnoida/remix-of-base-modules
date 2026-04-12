import { supabase } from '@/integrations/supabase/client';
import {
  FollowUpAction,
  FollowUpActionHistory,
  CreateFollowUpActionRequest,
  UpdateFollowUpActionRequest,
  ActionStatus
} from '@/types/violationActions';

const TABLE = 'ce_follow_up_actions';
const HISTORY_TABLE = 'ce_follow_up_action_history';

class ViolationActionsService {
  async getByViolationId(violationId: string): Promise<FollowUpAction[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('violation_id', violationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as FollowUpAction[];
  }

  async getHistoryByActionId(actionId: string): Promise<FollowUpActionHistory[]> {
    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .select('*')
      .eq('action_id', actionId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as FollowUpActionHistory[];
  }

  async getAllPendingForInspector(
    inspectorId: string,
    weekStartDate: string,
    filterType: 'this-week' | 'past-due' | 'all-pending'
  ): Promise<FollowUpAction[]> {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('assigned_to_user_id', inspectorId)
      .eq('is_deleted', false)
      .in('status', [ActionStatus.PLANNED, ActionStatus.SCHEDULED, ActionStatus.IN_PROGRESS]);

    switch (filterType) {
      case 'this-week':
        query = query.gte('due_date', weekStartDate).lte('due_date', weekEndStr);
        break;
      case 'past-due':
        query = query.lt('due_date', today);
        break;
      case 'all-pending':
        break;
    }

    const { data, error } = await query.order('due_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as FollowUpAction[];
  }

  async create(request: CreateFollowUpActionRequest): Promise<FollowUpAction> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        violation_id: request.violation_id,
        employer_id: request.employer_id || null,
        employer_name: request.employer_name || null,
        action_type: request.action_type,
        description: request.description,
        priority: request.priority || 'NORMAL',
        status: ActionStatus.PLANNED,
        due_date: request.due_date || null,
        scheduled_date: request.scheduled_date || null,
        notes: request.notes || null,
        assigned_to_user_id: request.assigned_to_user_id || null,
        assigned_to_name: request.assigned_to_name || null,
        assigned_queue_id: request.assigned_queue_id || null,
        source: request.source || 'MANUAL',
        created_by: request.created_by
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as FollowUpAction;
  }

  async update(id: string, request: UpdateFollowUpActionRequest): Promise<FollowUpAction> {
    const updatePayload: Record<string, unknown> = {
      updated_by: request.updated_by
    };
    if (request.status !== undefined) updatePayload.status = request.status;
    if (request.notes !== undefined) updatePayload.notes = request.notes;
    if (request.outcome !== undefined) updatePayload.outcome = request.outcome;
    if (request.scheduled_date !== undefined) updatePayload.scheduled_date = request.scheduled_date;
    if (request.due_date !== undefined) updatePayload.due_date = request.due_date;
    if (request.assigned_to_user_id !== undefined) updatePayload.assigned_to_user_id = request.assigned_to_user_id;
    if (request.assigned_to_name !== undefined) updatePayload.assigned_to_name = request.assigned_to_name;
    if (request.completed_at !== undefined) updatePayload.completed_at = request.completed_at;
    if (request.completed_by !== undefined) updatePayload.completed_by = request.completed_by;

    const { data, error } = await supabase
      .from(TABLE)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as FollowUpAction;
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ is_deleted: true, updated_by: updatedBy })
      .eq('id', id);

    if (error) throw error;
  }
}

export const violationActionsService = new ViolationActionsService();
