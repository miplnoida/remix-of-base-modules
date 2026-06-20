import { supabase } from "@/integrations/supabase/client";
import { coreTemplateService } from "./coreTemplateService";

export interface GenerateDocumentInput {
  template_id: string;
  module_code: string;
  doc_type_code: string;       // e.g. NOTICE, DEMAND, HEARING
  prefix: string;              // e.g. LG-NOT
  entity_type?: string;        // e.g. lg_notice
  entity_id?: string;
  tokens?: Record<string, string | number | null | undefined>;
  layout_id?: string | null;
  generated_by?: string;
}

export interface GeneratedDocument {
  id: string;
  reference_no: string;
  generated_html: string;
  status: string;
}

function resolveTokens(html: string, tokens: Record<string, any>): string {
  if (!html) return html;
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const v = tokens[key];
    return v === null || v === undefined ? `{{${key}}}` : String(v);
  });
}

export const coreDocumentGenerationService = {
  async generate(input: GenerateDocumentInput): Promise<GeneratedDocument> {
    const ver = await coreTemplateService.getActiveVersion(input.template_id);
    if (!ver) throw new Error("Template has no active version");

    const reference_no = await coreTemplateService.allocateReference(
      input.module_code, input.doc_type_code, input.prefix
    );

    const baseTokens: Record<string, any> = {
      "document.reference_no": reference_no,
      "document.generated_date": new Date().toLocaleDateString("en-GB"),
      "institution.name": "Social Security Board",
      ...(input.tokens || {}),
    };

    const generated_html = resolveTokens(ver.body_html || "", baseTokens);

    const { data, error } = await (supabase as any)
      .from("core_generated_document")
      .insert({
        reference_no,
        template_id: input.template_id,
        template_version_id: ver.id,
        layout_id: input.layout_id ?? ver.layout_id ?? null,
        module_code: input.module_code,
        doc_type_code: input.doc_type_code,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        subject: resolveTokens(ver.subject || "", baseTokens),
        generated_html,
        resolved_tokens: baseTokens,
        status: "GENERATED",
        generated_by: input.generated_by || "SYSTEM",
      })
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      reference_no: data.reference_no,
      generated_html: data.generated_html,
      status: data.status,
    };
  },

  async listForEntity(entity_type: string, entity_id: string) {
    const { data, error } = await (supabase as any)
      .from("core_generated_document").select("*")
      .eq("entity_type", entity_type).eq("entity_id", entity_id)
      .order("generated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
