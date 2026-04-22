/**
 * fieldStageTemplateMapService
 *
 * CRUD for `ce_audit_field_stage_template_map` — the central, admin-managed
 * mapping that binds field-execution stages to existing communication
 * templates. The Audit Visit Workspace consumes this via `listForStage`.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  FieldExecutionStage,
  FieldStageTemplateMapping,
} from '@/types/fieldStageMapping';
import type { AuditCommunicationTemplate } from '@/types/auditCommunication';

const MAP = 'ce_audit_field_stage_template_map' as any;
const TPL = 'ce_audit_communication_templates' as any;

export interface FieldStageTemplateRow extends FieldStageTemplateMapping {
  template?: Pick<
    AuditCommunicationTemplate,
    'id' | 'template_code' | 'template_name' | 'comm_type' | 'channel' | 'lifecycle_stage' | 'is_active' | 'send_mode' | 'requires_approval_before_send'
  > | null;
}

export const fieldStageTemplateMapService = {
  /** All mappings (admin grid). */
  async listAll(): Promise<FieldStageTemplateRow[]> {
    const { data, error } = await (supabase.from(MAP) as any)
      .select(
        'id, field_stage, template_id, sort_order, is_default, notes, is_active, created_at, updated_at, created_by, updated_by, template:template_id(id, template_code, template_name, comm_type, channel, lifecycle_stage, is_active, send_mode, requires_approval_before_send)',
      )
      .order('field_stage')
      .order('sort_order');
    if (error) throw error;
    return (data || []) as FieldStageTemplateRow[];
  },

  /**
   * Active templates linked to a single field-execution stage, hydrated
   * with the full template row so the UI can render them directly.
   */
  async listForStage(stage: FieldExecutionStage): Promise<AuditCommunicationTemplate[]> {
    const { data, error } = await (supabase.from(MAP) as any)
      .select(
        'sort_order, is_default, template:template_id(*)',
      )
      .eq('field_stage', stage)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return (data || [])
      .map((r: any) => r.template)
      .filter((t: any): t is AuditCommunicationTemplate => !!t && t.is_active);
  },

  /** Admin: link an existing template to a field stage. */
  async addMapping(
    stage: FieldExecutionStage,
    templateId: string,
    opts: { sortOrder?: number; isDefault?: boolean; notes?: string; userCode?: string } = {},
  ): Promise<FieldStageTemplateMapping> {
    const { data, error } = await (supabase.from(MAP) as any)
      .insert({
        field_stage: stage,
        template_id: templateId,
        sort_order: opts.sortOrder ?? 0,
        is_default: opts.isDefault ?? false,
        notes: opts.notes ?? null,
        created_by: opts.userCode ?? null,
        updated_by: opts.userCode ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as FieldStageTemplateMapping;
  },

  async updateMapping(
    id: string,
    patch: Partial<Pick<FieldStageTemplateMapping, 'sort_order' | 'is_default' | 'notes' | 'is_active'>>,
    userCode?: string,
  ): Promise<FieldStageTemplateMapping> {
    const { data, error } = await (supabase.from(MAP) as any)
      .update({ ...patch, updated_by: userCode ?? null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as FieldStageTemplateMapping;
  },

  async removeMapping(id: string): Promise<void> {
    const { error } = await (supabase.from(MAP) as any).delete().eq('id', id);
    if (error) throw error;
  },

  /** Convenience: list all *active* templates for the picker. */
  async listAvailableTemplates(): Promise<
    Pick<AuditCommunicationTemplate, 'id' | 'template_code' | 'template_name' | 'comm_type' | 'channel' | 'lifecycle_stage'>[]
  > {
    const { data, error } = await (supabase.from(TPL) as any)
      .select('id, template_code, template_name, comm_type, channel, lifecycle_stage')
      .eq('is_active', true)
      .order('template_name');
    if (error) throw error;
    return data || [];
  },
};
