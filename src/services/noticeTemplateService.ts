import { supabase } from '@/integrations/supabase/client';

export interface NoticeTemplateRow {
  id: string;
  template_code: string;
  template_name: string;
  category: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export async function fetchNoticeTemplates(): Promise<NoticeTemplateRow[]> {
  const { data, error } = await supabase
    .from('ce_notice_templates')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as NoticeTemplateRow[];
}

export async function createNoticeTemplate(template: Partial<NoticeTemplateRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_notice_templates')
    .insert({
      template_code: template.template_code,
      template_name: template.template_name,
      category: template.category,
      channel: template.channel,
      subject: template.subject,
      body: template.body,
      variables: template.variables,
      is_active: template.is_active ?? true,
      sort_order: template.sort_order ?? 0,
      created_by: template.created_by || 'system',
    } as any);
  if (error) throw error;
}

export async function updateNoticeTemplate(id: string, updates: Partial<NoticeTemplateRow>): Promise<void> {
  const { error } = await supabase
    .from('ce_notice_templates')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNoticeTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('ce_notice_templates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function toggleNoticeTemplate(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('ce_notice_templates')
    .update({ is_active, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function duplicateNoticeTemplate(original: NoticeTemplateRow, newCode: string): Promise<void> {
  await createNoticeTemplate({
    template_code: newCode,
    template_name: `${original.template_name} (Copy)`,
    category: original.category,
    channel: original.channel,
    subject: original.subject,
    body: original.body,
    variables: original.variables,
    is_active: original.is_active,
    sort_order: original.sort_order,
    created_by: 'system',
  });
}
