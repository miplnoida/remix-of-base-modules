import { supabase } from "@/integrations/supabase/client";
import type { LegalReference } from "@/services/legal-reference/types";

export interface TemplateLegalRefLink {
  id: string;
  template_id: string;
  template_version_id: string | null;
  legal_reference_id: string;
  legal_reference_version_id: string | null;
  required_flag: boolean;
  display_order: number;
  usage_note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  legal_reference?: LegalReference | null;
}


export const coreTemplateLegalRefService = {
  async listForTemplate(templateId: string): Promise<TemplateLegalRefLink[]> {
    const { data, error } = await (supabase as any)
      .from("core_template_legal_reference")
      .select("*, legal_reference:core_legal_reference(*)")
      .eq("template_id", templateId)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data || []) as TemplateLegalRefLink[];
  },

  async listAvailableRefs(countryCode = "SKN"): Promise<LegalReference[]> {
    const { data, error } = await (supabase as any)
      .from("core_legal_reference")
      .select("*")
      .eq("country_code", countryCode)
      .eq("status", "ACTIVE")
      .eq("is_active", true)
      .order("ref_code", { ascending: true });
    if (error) throw error;
    return (data || []) as LegalReference[];
  },

  async addLink(input: {
    template_id: string;
    legal_reference_id: string;
    template_version_id?: string | null;
    required_flag?: boolean;
    display_order?: number;
    usage_note?: string | null;
    created_by?: string;
  }): Promise<TemplateLegalRefLink> {
    const payload = {
      template_id: input.template_id,
      legal_reference_id: input.legal_reference_id,
      template_version_id: input.template_version_id ?? null,
      required_flag: input.required_flag ?? false,
      display_order: input.display_order ?? 0,
      usage_note: input.usage_note ?? null,
      created_by: input.created_by ?? null,
    };
    const { data, error } = await (supabase as any)
      .from("core_template_legal_reference")
      .insert(payload)
      .select("*, legal_reference:core_legal_reference(*)")
      .single();
    if (error) throw error;
    return data as TemplateLegalRefLink;
  },

  async updateLink(id: string, patch: Partial<Pick<TemplateLegalRefLink, "required_flag" | "display_order" | "usage_note">>) {
    const { data, error } = await (supabase as any)
      .from("core_template_legal_reference")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as TemplateLegalRefLink;
  },

  async removeLink(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("core_template_legal_reference")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Build a snapshot suitable for storing on the generated document.
   * Resolves the active PUBLISHED version of each linked legal reference and
   * captures the exact version_id so the document remains defensible later.
   */
  async buildSnapshotForTemplate(templateId: string) {
    const links = await this.listForTemplate(templateId);
    const out: any[] = [];
    for (const l of links) {
      if (!l.legal_reference) continue;
      const m = l.legal_reference as any;
      let versionId: string | null = l.legal_reference_version_id ?? null;
      let effFrom = m.effective_from ?? null;
      let effTo = m.effective_to ?? null;
      let versionNumber = m.version_number ?? 1;
      let fullText = m.full_reference_text ?? null;
      // Prefer DB-resolved active version (RPC) when not pinned
      if (!versionId) {
        try {
          const { data } = await (supabase as any).rpc('get_active_legal_reference_version', {
            p_ref_code: m.ref_code,
            p_country_code: m.country_code,
            p_as_of: new Date().toISOString().slice(0, 10),
          });
          const v = Array.isArray(data) ? data[0] : data;
          if (v) {
            versionId = v.id;
            effFrom = v.effective_from;
            effTo = v.effective_to;
            versionNumber = v.version_number;
            fullText = v.full_reference_text ?? fullText;
          }
        } catch { /* fall back to master fields */ }
      }
      out.push({
        legal_reference_id: l.legal_reference_id,
        legal_reference_version_id: versionId,
        ref_code: m.ref_code,
        country_code: m.country_code,
        version_number: versionNumber,
        short_title: m.short_title,
        act_name: m.act_name,
        section: m.section,
        regulation: m.regulation,
        full_reference_text: fullText,
        effective_from: effFrom,
        effective_to: effTo,
        required_flag: l.required_flag,
        display_order: l.display_order,
        usage_note: l.usage_note,
      });
    }
    return out;
  },

  /**
   * Freeze (pin) legal_reference_version_id on all links for a template
   * version — typically called when a template version is PUBLISHED.
   */
  async freezeVersionsForTemplateVersion(templateVersionId: string, asOf?: string) {
    const date = asOf || new Date().toISOString().slice(0, 10);
    const { data: links, error: e1 } = await (supabase as any)
      .from('core_template_legal_reference')
      .select('id, legal_reference_id, legal_reference:core_legal_reference(ref_code, country_code)')
      .eq('template_version_id', templateVersionId)
      .is('legal_reference_version_id', null);
    if (e1) throw e1;
    for (const l of links || []) {
      const m = l.legal_reference;
      if (!m) continue;
      const { data: v } = await (supabase as any).rpc('get_active_legal_reference_version', {
        p_ref_code: m.ref_code,
        p_country_code: m.country_code,
        p_as_of: date,
      });
      const ver = Array.isArray(v) ? v[0] : v;
      if (ver?.id) {
        await (supabase as any)
          .from('core_template_legal_reference')
          .update({ legal_reference_version_id: ver.id })
          .eq('id', l.id);
      }
    }
  },
};

