import { supabase } from '@/integrations/supabase/client';

export interface CaseStatusRow {
  id: string;
  status_code: string;
  status_name: string;
  description: string | null;
  category: string;
  is_terminal: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchCaseStatuses(category?: string): Promise<CaseStatusRow[]> {
  let query = supabase
    .from('ce_case_status_masters')
    .select('*')
    .order('sort_order', { ascending: true });
  if (category) {
    query = query.eq('category', category);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as CaseStatusRow[];
}

export async function updateCaseStatus(id: string, updates: Partial<CaseStatusRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_case_status_masters')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function createCaseStatus(status: Partial<CaseStatusRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_case_status_masters')
    .insert({
      status_code: status.status_code,
      status_name: status.status_name,
      description: status.description,
      category: status.category,
      is_terminal: status.is_terminal ?? false,
      sort_order: status.sort_order ?? 0,
      is_active: status.is_active ?? true,
    } as any);
  if (error) throw error;
}
