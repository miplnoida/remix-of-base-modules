/**
 * Inspection Planning Nomination service
 *
 * Lets an officer nominate a compliance case's employer for their weekly
 * inspection plan. Nominations are stored on the existing
 * `ce_planner_candidate_actions` table with `action_type = 'nominate_for_planning'`
 * and surface in the Weekly Plan builder alongside auto-scored candidates.
 *
 * Approval of the weekly plan itself continues to sit with Compliance Head;
 * the nomination row itself needs no approval.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PendingNomination {
  nomination_id: string;
  case_id: string | null;
  employer_id: string;
  week_start_date: string;
  officer_user_code: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  case_number: string | null;
  employer_name: string | null;
  risk_band: string | null;
  fund_type: string | null;
}

export interface NominateInput {
  caseId: string;
  caseNumber?: string | null;
  employerId: string;
  employerName?: string | null;
  weekStartDate?: string; // YYYY-MM-DD, defaults to next Monday
  notes?: string;
  officerUserCode: string;
}

/** Next Monday in local YYYY-MM-DD. */
export function nextMondayISO(from: Date = new Date()): string {
  const d = new Date(from);
  const dow = d.getDay(); // 0=Sun..6=Sat
  const delta = ((8 - dow) % 7) || 7;
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const inspectionNominationService = {
  async nominateCaseForInspection(input: NominateInput): Promise<{ id: string }> {
    const week = input.weekStartDate || nextMondayISO();
    const reason = input.caseNumber
      ? `Officer nomination from Case ${input.caseNumber}`
      : 'Officer nomination from case';

    const { data, error } = await supabase
      .from('ce_planner_candidate_actions' as any)
      .insert({
        action_type: 'nominate_for_planning',
        employer_id: input.employerId,
        week_start_date: week,
        linked_case_id: input.caseId,
        reason,
        notes: input.notes ?? null,
        requested_by_user_code: input.officerUserCode,
        approval_required: false,
        approval_status: 'NOT_REQUIRED',
        capacity_impact_hours: 0,
        displaces_candidate: false,
        is_active: true,
        created_by: input.officerUserCode,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: (data as any).id };
  },

  async withdrawNomination(nominationId: string, officerUserCode: string | null): Promise<void> {
    const { error } = await supabase
      .from('ce_planner_candidate_actions' as any)
      .update({
        is_active: false,
        updated_by: officerUserCode,
      })
      .eq('id', nominationId);

    if (error) throw error;
  },

  async listMyPendingNominations(officerUserCode: string): Promise<PendingNomination[]> {
    const { data, error } = await supabase
      .from('ce_v_pending_case_nominations' as any)
      .select('*')
      .eq('officer_user_code', officerUserCode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as PendingNomination[];
  },

  async getNominationForCase(params: {
    caseId: string;
    officerUserCode: string;
  }): Promise<PendingNomination | null> {
    const { data, error } = await supabase
      .from('ce_v_pending_case_nominations' as any)
      .select('*')
      .eq('case_id', params.caseId)
      .eq('officer_user_code', params.officerUserCode)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const rows = (data ?? []) as unknown as PendingNomination[];
    return rows[0] ?? null;
  },

  /** List nominations for a specific officer + week (used by Weekly Plan builder to inject candidates). */
  async listNominationsForWeek(params: {
    officerUserCode: string;
    weekStartDate: string;
  }): Promise<PendingNomination[]> {
    const { data, error } = await supabase
      .from('ce_v_pending_case_nominations' as any)
      .select('*')
      .eq('officer_user_code', params.officerUserCode)
      .eq('week_start_date', params.weekStartDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as PendingNomination[];
  },
};
