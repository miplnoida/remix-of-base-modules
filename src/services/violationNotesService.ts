// ============================================
// VIOLATION NOTES SERVICE - DB-BACKED
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { ViolationNote, CreateViolationNoteRequest } from '@/types/violationNotes';
import { getCurrentUserCode } from '@/hooks/useUserCode';

function mapRow(row: any): ViolationNote {
  return {
    id: row.id,
    violationId: row.violation_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    noteType: row.note_type,
    noteText: row.note_text,
    createdAt: row.created_at,
    linkedWeeklyPlanItemId: row.linked_weekly_plan_item_id ?? undefined,
  };
}

class ViolationNotesService {
  async getByViolationId(violationId: string): Promise<ViolationNote[]> {
    const { data, error } = await supabase
      .from('ce_violation_notes')
      .select('*')
      .eq('violation_id', violationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  async create(request: CreateViolationNoteRequest): Promise<ViolationNote> {
    // Resolve current user
    const userCode = await getCurrentUserCode();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, user_code')
      .eq('user_code', userCode ?? '')
      .maybeSingle();

    const authorName = (profile as any)?.full_name ?? userCode ?? 'System';
    const authorUserId = userCode ?? 'SYSTEM';

    const { data, error } = await supabase
      .from('ce_violation_notes')
      .insert({
        violation_id: request.violationId,
        author_user_id: authorUserId,
        author_name: authorName,
        note_type: request.noteType,
        note_text: request.noteText,
        linked_weekly_plan_item_id: request.linkedWeeklyPlanItemId ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapRow(data);
  }
}

export const violationNotesService = new ViolationNotesService();
