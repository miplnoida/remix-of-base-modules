import { supabase } from '@/integrations/supabase/client';
import { FollowUpAction, ActionStatus } from '@/types/violationActions';

const TABLE = 'ce_follow_up_actions';
const PAGE = 1000;

const ACTIVE_STATUSES = [ActionStatus.PLANNED, ActionStatus.SCHEDULED, ActionStatus.IN_PROGRESS];

async function fetchAll(queryBuilder: any): Promise<FollowUpAction[]> {
  const all: FollowUpAction[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await queryBuilder.range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as FollowUpAction[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

export interface WorkboardCounts {
  dueToday: number;
  overdue: number;
  thisWeek: number;
  completed: number;
  total: number;
}

class InspectorWorkboardService {
  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private weekEnd(): string {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d.toISOString().split('T')[0];
  }

  private weekStart(): string {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  }

  async getCounts(inspectorId?: string): Promise<WorkboardCounts> {
    const today = this.today();
    const ws = this.weekStart();
    const we = this.weekEnd();

    const baseFilter = (q: any) => {
      q = q.from(TABLE).select('id', { count: 'exact', head: true }).eq('is_deleted', false);
      if (inspectorId) q = q.eq('assigned_to_user_id', inspectorId);
      return q;
    };

    const [dueTodayRes, overdueRes, thisWeekRes, completedRes, totalRes] = await Promise.all([
      baseFilter(supabase).in('status', ACTIVE_STATUSES).eq('due_date', today),
      baseFilter(supabase).in('status', ACTIVE_STATUSES).lt('due_date', today).not('due_date', 'is', null),
      baseFilter(supabase).in('status', ACTIVE_STATUSES).gte('due_date', ws).lte('due_date', we),
      baseFilter(supabase).eq('status', ActionStatus.COMPLETED).gte('completed_at', ws),
      baseFilter(supabase).in('status', ACTIVE_STATUSES),
    ]);

    return {
      dueToday: dueTodayRes.count ?? 0,
      overdue: overdueRes.count ?? 0,
      thisWeek: thisWeekRes.count ?? 0,
      completed: completedRes.count ?? 0,
      total: totalRes.count ?? 0,
    };
  }

  async getOverdue(inspectorId?: string, limit = 20): Promise<FollowUpAction[]> {
    const today = this.today();
    let q = supabase
      .from(TABLE)
      .select('*')
      .eq('is_deleted', false)
      .in('status', ACTIVE_STATUSES)
      .lt('due_date', today)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(limit);
    if (inspectorId) q = q.eq('assigned_to_user_id', inspectorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as FollowUpAction[];
  }

  async getDueToday(inspectorId?: string): Promise<FollowUpAction[]> {
    const today = this.today();
    let q = supabase
      .from(TABLE)
      .select('*')
      .eq('is_deleted', false)
      .in('status', ACTIVE_STATUSES)
      .eq('due_date', today)
      .order('priority', { ascending: true });
    if (inspectorId) q = q.eq('assigned_to_user_id', inspectorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as FollowUpAction[];
  }

  async getThisWeek(inspectorId?: string): Promise<FollowUpAction[]> {
    const today = this.today();
    const we = this.weekEnd();
    let q = supabase
      .from(TABLE)
      .select('*')
      .eq('is_deleted', false)
      .in('status', ACTIVE_STATUSES)
      .gt('due_date', today)
      .lte('due_date', we)
      .order('due_date', { ascending: true })
      .limit(50);
    if (inspectorId) q = q.eq('assigned_to_user_id', inspectorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as FollowUpAction[];
  }

  async getUpcoming(inspectorId?: string, limit = 20): Promise<FollowUpAction[]> {
    const we = this.weekEnd();
    let q = supabase
      .from(TABLE)
      .select('*')
      .eq('is_deleted', false)
      .in('status', ACTIVE_STATUSES)
      .gt('due_date', we)
      .order('due_date', { ascending: true })
      .limit(limit);
    if (inspectorId) q = q.eq('assigned_to_user_id', inspectorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as FollowUpAction[];
  }

  async getByStatus(status: ActionStatus, inspectorId?: string, limit = 50): Promise<FollowUpAction[]> {
    let q = supabase
      .from(TABLE)
      .select('*')
      .eq('is_deleted', false)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (inspectorId) q = q.eq('assigned_to_user_id', inspectorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as FollowUpAction[];
  }

  async startAction(id: string, userId: string): Promise<FollowUpAction> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status: ActionStatus.IN_PROGRESS, updated_by: userId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FollowUpAction;
  }

  async completeAction(id: string, userId: string, outcome: string, notes?: string): Promise<FollowUpAction> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: ActionStatus.COMPLETED,
        outcome,
        notes: notes || null,
        completed_at: new Date().toISOString(),
        completed_by: userId,
        updated_by: userId,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FollowUpAction;
  }

  async cancelAction(id: string, userId: string, reason: string): Promise<FollowUpAction> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: ActionStatus.CANCELLED,
        outcome: reason,
        updated_by: userId,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FollowUpAction;
  }

  async rescheduleAction(id: string, userId: string, newDueDate: string, newScheduledDate?: string, notes?: string): Promise<FollowUpAction> {
    const payload: Record<string, unknown> = {
      due_date: newDueDate,
      status: ActionStatus.SCHEDULED,
      updated_by: userId,
    };
    if (newScheduledDate) payload.scheduled_date = newScheduledDate;
    if (notes) payload.notes = notes;

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FollowUpAction;
  }

  async addNotes(id: string, userId: string, notes: string): Promise<FollowUpAction> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ notes, updated_by: userId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FollowUpAction;
  }

  async claimAction(id: string, userId: string, userName: string): Promise<FollowUpAction> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        assigned_to_user_id: userId,
        assigned_to_name: userName,
        updated_by: userId,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as FollowUpAction;
  }
}

export const inspectorWorkboardService = new InspectorWorkboardService();
