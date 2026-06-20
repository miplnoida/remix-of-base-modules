import { supabase } from "@/integrations/supabase/client";
import { coreTemplateService } from "./coreTemplateService";
import { coreTemplateLegalRefService } from "./coreTemplateLegalRefService";

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
  legal_references_snapshot?: any[];
}

function resolveTokens(html: string, tokens: Record<string, any>): string {
  if (!html) return html;
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const v = tokens[key];
    return v === null || v === undefined ? `{{${key}}}` : String(v);
  });
}

function renderRefsAppendix(snapshot: any[]): string {
  if (!snapshot?.length) return "";
  const items = snapshot
    .map(
      (r) =>
        `<li><strong>${r.short_title || r.ref_code}</strong>` +
        (r.act_name ? ` — ${r.act_name}` : "") +
        (r.section ? `, Section ${r.section}` : "") +
        (r.regulation ? ` (${r.regulation})` : "") +
        ` <span style="color:#666">[v${r.version_number}]</span>` +
        (r.full_reference_text ? `<br/><small>${r.full_reference_text}</small>` : "") +
        `</li>`,
    )
    .join("");
  return `<hr/><div class="legal-references"><h4>Legal References</h4><ol>${items}</ol></div>`;
}

export const coreDocumentGenerationService = {
  async generate(input: GenerateDocumentInput): Promise<GeneratedDocument> {
    const ver = await coreTemplateService.getActiveVersion(input.template_id);
    if (!ver) throw new Error("Template has no active version");

    const reference_no = await coreTemplateService.allocateReference(
      input.module_code, input.doc_type_code, input.prefix
    );

    // Snapshot linked legal references at generation time
    const legalRefsSnapshot = await coreTemplateLegalRefService
      .buildSnapshotForTemplate(input.template_id)
      .catch(() => [] as any[]);

    const primaryRef = legalRefsSnapshot[0];
    const baseTokens: Record<string, any> = {
      "document.reference_no": reference_no,
      "document.generated_date": new Date().toLocaleDateString("en-GB"),
      "institution.name": "St. Christopher and Nevis Social Security Board",
      "institution.address": "Bay Road, Basseterre, St. Kitts",
      "institution.phone": "+1 (869) 465-2535",
      "institution.email": "legal@socialsecurity.kn",
      "institution.website": "www.socialsecurity.kn",
      // Resolve legal_reference.* tokens from the primary linked ref (overridable by caller tokens)
      "legal_reference.full": primaryRef?.full_reference_text || primaryRef?.short_title || "",
      "legal_reference.act_name": primaryRef?.act_name || "",
      "legal_reference.act": primaryRef?.act_name || "",
      "legal_reference.section": primaryRef?.section || "",
      "legal_reference.regulation": primaryRef?.regulation || "",
      ...(input.tokens || {}),
    };

    const body = (ver.body_html || "") + renderRefsAppendix(legalRefsSnapshot);
    const generated_html = resolveTokens(body, baseTokens);

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
        legal_references_snapshot: legalRefsSnapshot,
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
      legal_references_snapshot: data.legal_references_snapshot,
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

