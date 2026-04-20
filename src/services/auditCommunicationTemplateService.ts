/**
 * Audit Communication Template Service — CRUD for ce_audit_communication_templates
 * and ce_audit_communication_template_sections.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  AuditCommunicationTemplate,
  AuditCommunicationTemplateSection,
  CeCommType,
} from '@/types/auditCommunication';

const TPL = 'ce_audit_communication_templates' as any;
const SEC = 'ce_audit_communication_template_sections' as any;

export const auditCommunicationTemplateService = {
  async list(opts: { activeOnly?: boolean; commType?: CeCommType; lifecycleStage?: string } = {}) {
    let q = (supabase.from(TPL) as any).select('*').order('sort_order', { ascending: true });
    if (opts.activeOnly) q = q.eq('is_active', true);
    if (opts.commType) q = q.eq('comm_type', opts.commType);
    if (opts.lifecycleStage) q = q.eq('lifecycle_stage', opts.lifecycleStage);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as AuditCommunicationTemplate[];
  },

  async listByStage(stage: string) {
    return this.list({ lifecycleStage: stage });
  },

  /** List comm templates that link to a given report template_type (cross-ref for the report editor). */
  async listLinkedToReport(reportType: string) {
    const { data, error } = await (supabase.from(TPL) as any)
      .select('id,template_code,template_name,lifecycle_stage,is_active')
      .eq('linked_report_template_type', reportType);
    if (error) throw error;
    return (data || []) as Array<Pick<AuditCommunicationTemplate, 'id' | 'template_code' | 'template_name' | 'lifecycle_stage' | 'is_active'>>;
  },

  async getById(id: string) {
    const { data, error } = await (supabase.from(TPL) as any).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as AuditCommunicationTemplate | null;
  },

  async getByCode(code: string) {
    const { data, error } = await (supabase.from(TPL) as any).select('*').eq('template_code', code).maybeSingle();
    if (error) throw error;
    return data as AuditCommunicationTemplate | null;
  },

  async create(payload: Partial<AuditCommunicationTemplate>, userCode?: string) {
    const insert = {
      ...payload,
      version_no: 1,
      created_by: userCode,
      updated_by: userCode,
    };
    const { data, error } = await (supabase.from(TPL) as any).insert(insert).select().single();
    if (error) throw error;
    return data as AuditCommunicationTemplate;
  },

  async update(id: string, patch: Partial<AuditCommunicationTemplate>, userCode?: string) {
    const { data, error } = await (supabase.from(TPL) as any)
      .update({ ...patch, updated_by: userCode, version_no: (patch.version_no ?? 0) + 1 })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AuditCommunicationTemplate;
  },

  async setActive(id: string, isActive: boolean, userCode?: string) {
    return this.update(id, { is_active: isActive }, userCode);
  },

  async clone(id: string, newCode: string, newName: string, userCode?: string) {
    const src = await this.getById(id);
    if (!src) throw new Error('Template not found');
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = src as any;
    return this.create({ ...rest, template_code: newCode, template_name: newName, version_no: 1 }, userCode);
  },

  // Sections
  async listSections(templateId: string) {
    const { data, error } = await (supabase.from(SEC) as any)
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []) as AuditCommunicationTemplateSection[];
  },

  async upsertSection(section: Partial<AuditCommunicationTemplateSection>) {
    const { data, error } = await (supabase.from(SEC) as any)
      .upsert(section, { onConflict: 'template_id,section_key' })
      .select()
      .single();
    if (error) throw error;
    return data as AuditCommunicationTemplateSection;
  },

  async deleteSection(id: string) {
    const { error } = await (supabase.from(SEC) as any).delete().eq('id', id);
    if (error) throw error;
  },
};
