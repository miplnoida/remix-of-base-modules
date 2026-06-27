import { supabase } from "@/integrations/supabase/client";
import { coreTemplateService } from "./coreTemplateService";
import { coreTemplateLegalRefService } from "./coreTemplateLegalRefService";
import { resolveCommunication } from "@/lib/enterprise";
import type {
  CommunicationProfileCode,
  DocumentProfileCode,
} from "@/lib/enterprise/types";

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
  /** Optional — overrides the auto-inferred Communication Profile. */
  communication_profile_code?: CommunicationProfileCode;
  /** Optional — overrides the auto-inferred Document Profile. */
  document_profile_code?: DocumentProfileCode;
  /** Optional — department to scope inheritance. */
  department_code?: string;
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

    // Infer profile codes based on module + doc_type if not supplied.
    const mod = (input.module_code || "").toLowerCase();
    const dtype = (input.doc_type_code || "").toUpperCase();
    const inferComm = (): CommunicationProfileCode | null => {
      if (input.communication_profile_code) return input.communication_profile_code;
      if (/^(lg|legal)/.test(mod)) return "LEGAL_NOTICE";
      if (/^(bn|benefit)/.test(mod)) return "BENEFIT_NOTICE";
      if (/^(ce|compliance)/.test(mod)) return dtype.includes("NOTICE") ? "PAYMENT_NOTICE" : "STANDARD_LETTER";
      if (/^(cn|finance|payment|cashier)/.test(mod)) {
        if (dtype.includes("RECEIPT")) return "RECEIPT";
        if (dtype.includes("STATEMENT")) return "STATEMENT";
        return "PAYMENT_NOTICE";
      }
      return "STANDARD_LETTER";
    };
    const inferDoc = (): DocumentProfileCode => {
      if (input.document_profile_code) return input.document_profile_code;
      if (dtype.includes("RECEIPT")) return "RECEIPT";
      if (dtype.includes("CERTIFICATE") || dtype.includes("CERT")) return "CERTIFICATE";
      if (dtype.includes("STATEMENT")) return "STATEMENT";
      if (dtype.includes("NOTICE")) return "NOTICE";
      if (dtype.includes("MEMO")) return "MEMO";
      return "LETTER";
    };
    const commProfileCode = inferComm();
    const docProfileCode = inferDoc();

    // Resolve enterprise context (org → dept → profile → assets → text blocks)
    const resolution = await resolveCommunication({
      moduleCode: input.module_code,
      departmentCode: input.department_code ?? null,
      profileCode: commProfileCode,
      documentProfileCode: docProfileCode,
    }).catch(() => null);

    const org = resolution?.context.organization;
    const loc = resolution?.context.location;
    const dept = resolution?.context.department;
    const letterhead = resolution?.context.letterhead;
    const primaryRef = legalRefsSnapshot[0];

    // Text-block tokens
    const textBlockTokens: Record<string, string> = {};
    if (resolution) {
      for (const [code, tb] of Object.entries(resolution.textBlocks) as Array<[string, any]>) {
        if (tb) {
          textBlockTokens[`text_block.${code}`] = tb.body_html;
          textBlockTokens[`text_block.${code}_text`] = tb.body_text;
        }
      }
    }
    // Asset tokens
    const assetTokens: Record<string, string> = {};
    if (resolution) {
      for (const [slot, asset] of Object.entries(resolution.assets) as Array<[string, any]>) {
        if (asset) assetTokens[`asset.${slot}`] = asset.url;
      }
    }

    const baseTokens: Record<string, any> = {
      "document.reference_no": reference_no,
      "document.generated_date": new Date().toLocaleDateString("en-GB"),
      // Organization tokens — sourced from resolver (no hardcoded names)
      "institution.name": org?.name ?? "",
      "institution.address": loc?.address ?? "",
      "institution.phone": loc?.phone ?? "",
      "institution.email": loc?.email ?? "",
      "institution.website": org?.website ?? "",
      "institution.logo": org?.primaryLogoUrl ?? "",
      "org.name": org?.name ?? "",
      "org.short_name": org?.shortName ?? "",
      "org.country": org?.country ?? "",
      "org.website": org?.website ?? "",
      "org.logo": org?.primaryLogoUrl ?? "",
      "org.secondary_logo": org?.secondaryLogoUrl ?? "",
      "org.seal": org?.sealUrl ?? "",
      "department.name": dept?.name ?? "",
      "department.code": dept?.code ?? "",
      "department.manager": dept?.manager ?? "",
      "location.name": loc?.name ?? "",
      "location.address": loc?.address ?? "",
      "location.phone": loc?.phone ?? "",
      "location.email": loc?.email ?? "",
      "letterhead.logo": letterhead?.logo ?? org?.primaryLogoUrl ?? "",
      "letterhead.header": letterhead?.header ?? "",
      "letterhead.footer": letterhead?.footer ?? "",
      // Resolve legal_reference.* tokens from the primary linked ref (overridable by caller tokens)
      "legal_reference.full": primaryRef?.full_reference_text || primaryRef?.short_title || "",
      "legal_reference.act_name": primaryRef?.act_name || "",
      "legal_reference.act": primaryRef?.act_name || "",
      "legal_reference.section": primaryRef?.section || "",
      "legal_reference.regulation": primaryRef?.regulation || "",
      ...textBlockTokens,
      ...assetTokens,
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
        communication_profile_id: resolution?.communicationProfile?.id ?? null,
        document_profile_id: resolution?.documentProfile?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;

    // Write-once snapshot rows into core_generated_document_legal_reference
    if (legalRefsSnapshot.length) {
      const snapshotRows = legalRefsSnapshot.map((r: any) => ({
        generated_document_id: data.id,
        legal_reference_id: r.legal_reference_id,
        legal_reference_version_id: r.legal_reference_version_id ?? null,
        ref_code: r.ref_code,
        citation_snapshot: r.full_reference_text || r.short_title || null,
        full_reference_snapshot: r.full_reference_text || null,
        effective_from_snapshot: r.effective_from ?? null,
        effective_to_snapshot: r.effective_to ?? null,
      }));
      await (supabase as any)
        .from("core_generated_document_legal_reference")
        .insert(snapshotRows);
    }

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

