import { supabase } from "@/integrations/supabase/client";

export type ModuleCode = "LEGAL" | "BENEFITS" | "COMPLIANCE" | "EMPLOYER" | "COMMON";
export type TemplateType = "LETTER" | "NOTICE" | "EMAIL" | "SMS" | "PDF" | "FORM";
export type TemplateStatus = "DRAFT" | "ACTIVE" | "RETIRED";
export type SourceSystem = "CORE" | "COMPLIANCE_LEGACY";

export interface CoreTemplate {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  module_code: ModuleCode | string;
  module_name?: string | null;
  country_code: string;
  institution_code: string;
  template_type: TemplateType | string;
  template_category?: string | null;
  owning_department?: string | null;
  status: TemplateStatus | string;
  active_version_id?: string | null;
  default_layout_id?: string | null;
  source_system: SourceSystem | string;
  source_ref_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoreTemplateVersion {
  id: string;
  template_id: string;
  version_no: number;
  status: string;
  subject?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  layout_id?: string | null;
  published_at?: string | null;
}

export interface CoreTemplateLayout {
  id: string;
  code: string;
  name: string;
  has_letterhead: boolean;
  show_page_numbers: boolean;
  show_generated_date: boolean;
  show_doc_reference: boolean;
  is_pre_printed: boolean;
  is_active: boolean;
}

export interface CoreTemplateToken {
  id: string;
  token_code: string;
  token_label: string;
  module_code: string;
  entity_type?: string | null;
  resolver_service?: string | null;
  sample_value?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface CoreTemplateUsage {
  id: string;
  template_id: string;
  template_version_id?: string | null;
  module_code: string;
  feature_area?: string | null;
  screen_code?: string | null;
  workflow_code?: string | null;
  trigger_event?: string | null;
  entity_type?: string | null;
  is_active: boolean;
}

export const coreTemplateService = {
  async listTemplates(filters?: { module_code?: string; source_system?: string; search?: string }) {
    let q = (supabase as any)
      .from("core_template")
      .select("*")
      .order("module_code", { ascending: true })
      .order("name", { ascending: true });
    if (filters?.module_code) q = q.eq("module_code", filters.module_code);
    if (filters?.source_system) q = q.eq("source_system", filters.source_system);
    if (filters?.search) q = q.ilike("name", `%${filters.search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as CoreTemplate[];
  },

  async getTemplate(id: string) {
    const { data, error } = await (supabase as any)
      .from("core_template").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as CoreTemplate | null;
  },

  async listVersions(template_id: string) {
    const { data, error } = await (supabase as any)
      .from("core_template_version").select("*")
      .eq("template_id", template_id)
      .order("version_no", { ascending: false });
    if (error) throw error;
    return (data || []) as CoreTemplateVersion[];
  },

  async getActiveVersion(template_id: string) {
    const tpl = await this.getTemplate(template_id);
    if (!tpl?.active_version_id) return null;
    const { data, error } = await (supabase as any)
      .from("core_template_version").select("*")
      .eq("id", tpl.active_version_id).maybeSingle();
    if (error) throw error;
    return data as CoreTemplateVersion | null;
  },

  async listLayouts() {
    const { data, error } = await (supabase as any)
      .from("core_template_layout").select("*").eq("is_active", true).order("name");
    if (error) throw error;
    return (data || []) as CoreTemplateLayout[];
  },

  async listTokens(module_code?: string) {
    let q = (supabase as any).from("core_template_token").select("*").eq("is_active", true).order("token_code");
    if (module_code) q = q.in("module_code", [module_code, "COMMON"]);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as CoreTemplateToken[];
  },

  async listUsage(template_id?: string, module_code?: string) {
    let q = (supabase as any).from("core_template_usage").select("*").order("module_code");
    if (template_id) q = q.eq("template_id", template_id);
    if (module_code) q = q.eq("module_code", module_code);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as CoreTemplateUsage[];
  },

  async createTemplate(input: Partial<CoreTemplate> & { code: string; name: string; module_code: string; template_type: string }) {
    const { data, error } = await (supabase as any)
      .from("core_template").insert(input).select("*").single();
    if (error) throw error;
    return data as CoreTemplate;
  },

  async updateTemplate(id: string, patch: Partial<CoreTemplate>) {
    const { data, error } = await (supabase as any)
      .from("core_template").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CoreTemplate;
  },

  async createDraftVersion(template_id: string, body_html: string, subject?: string, layout_id?: string | null) {
    const versions = await this.listVersions(template_id);
    const next = (versions[0]?.version_no || 0) + 1;
    const { data, error } = await (supabase as any)
      .from("core_template_version").insert({
        template_id, version_no: next, status: "DRAFT",
        subject, body_html, layout_id,
      }).select("*").single();
    if (error) throw error;
    return data as CoreTemplateVersion;
  },

  async publishVersion(version_id: string) {
    const { data: ver, error: e1 } = await (supabase as any)
      .from("core_template_version")
      .update({ status: "PUBLISHED", published_at: new Date().toISOString() })
      .eq("id", version_id).select("*").single();
    if (e1) throw e1;
    await (supabase as any).from("core_template")
      .update({ active_version_id: version_id, status: "ACTIVE" })
      .eq("id", ver.template_id);
    return ver as CoreTemplateVersion;
  },

  async allocateReference(module_code: string, doc_type_code: string, prefix: string): Promise<string> {
    // Route through the central numbering framework when a sequence is configured.
    // Legal generated documents use entity_type LEGAL_DOCUMENT; other modules can register
    // their own `<MODULE>_DOCUMENT` sequence and this will pick it up automatically.
    const entityType = module_code === "LEGAL" ? "LEGAL_DOCUMENT" : `${module_code}_DOCUMENT`;
    try {
      const { generateNumber } = await import("@/services/core/coreNumberingService");
      const r = await generateNumber({
        moduleCode: module_code,
        entityType,
        countryCode: "SKN",
      });
      return r.generatedNumber;
    } catch {
      const { data, error } = await (supabase as any).rpc("core_allocate_document_reference", {
        p_module_code: module_code,
        p_doc_type_code: doc_type_code,
        p_prefix: prefix,
      });
      if (error) throw error;
      return data as string;
    }
  },
};
