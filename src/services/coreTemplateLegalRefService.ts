import { supabase } from "@/integrations/supabase/client";
import type { LegalReference } from "@/services/legal-reference/types";

export interface TemplateLegalRefLink {
  id: string;
  template_id: string;
  template_version_id: string | null;
  legal_reference_id: string;
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
   * Build a snapshot suitable for storing on core_generated_document.legal_references_snapshot.
   * Captures the exact ref version used at generation time.
   */
  async buildSnapshotForTemplate(templateId: string) {
    const links = await this.listForTemplate(templateId);
    return links
      .filter((l) => l.legal_reference)
      .map((l) => ({
        legal_reference_id: l.legal_reference_id,
        ref_code: l.legal_reference!.ref_code,
        country_code: l.legal_reference!.country_code,
        version_number: l.legal_reference!.version_number,
        short_title: l.legal_reference!.short_title,
        act_name: l.legal_reference!.act_name,
        section: l.legal_reference!.section,
        regulation: l.legal_reference!.regulation,
        full_reference_text: l.legal_reference!.full_reference_text,
        required_flag: l.required_flag,
        display_order: l.display_order,
        usage_note: l.usage_note,
      }));
  },
};
