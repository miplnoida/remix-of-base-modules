import { supabase } from "@/integrations/supabase/client";
import { coreTemplateService } from "./coreTemplateService";
import { coreTemplateChannelService } from "./coreTemplateChannelService";
import { coreTemplateLegalRefService } from "./coreTemplateLegalRefService";
import { coreDmsService, type CoreDmsLegalLink } from "./core/coreDmsService";

/**
 * Channel-aware document dispatcher.
 * - Selects channel variant (falls back to active version body)
 * - Resolves tokens
 * - Hashes content (immutable audit)
 * - Persists into core_generated_document with channel_code & delivery_status
 *
 * Actual physical delivery (SMTP, SMS gateway, push, webhook) is intentionally
 * delegated to downstream edge functions; this service guarantees governance,
 * content integrity, and delivery-state tracking.
 */

export interface DispatchInput {
  template_id: string;
  channel_code: string;          // PDF, EMAIL, SMS, INAPP, WEBHOOK, etc.
  module_code: string;
  doc_type_code: string;
  prefix: string;
  entity_type?: string;
  entity_id?: string;
  recipient_address?: string;     // email, phone, user id, webhook url
  tokens?: Record<string, any>;
  generated_by?: string;
  case_stage_code?: string;
  case_type_code?: string;
}

export interface DispatchResult {
  id: string;
  reference_no: string;
  channel_code: string;
  delivery_status: string;
  content_hash: string;
  generated_html: string;
}

async function sha256Hex(text: string): Promise<string> {
  // Browser + edge supported
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function resolveTokens(html: string, tokens: Record<string, any>): string {
  if (!html) return "";
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) => {
    const v = tokens[k];
    return v === null || v === undefined ? `{{${k}}}` : String(v);
  });
}

export const coreTemplateDispatcherService = {
  async dispatch(input: DispatchInput): Promise<DispatchResult> {
    const ver = await coreTemplateService.getActiveVersion(input.template_id);
    if (!ver) throw new Error("Template has no published version");

    const variant = await coreTemplateChannelService
      .getVariant(input.template_id, input.channel_code)
      .catch(() => null);

    const reference_no = await coreTemplateService.allocateReference(
      input.module_code, input.doc_type_code, input.prefix,
    );

    const snapshot = await coreTemplateLegalRefService
      .buildSnapshotForTemplate(input.template_id).catch(() => []);

    const primary = snapshot[0] as any;
    const baseTokens: Record<string, any> = {
      "document.reference_no": reference_no,
      "document.generated_date": new Date().toLocaleDateString("en-GB"),
      "document.channel": input.channel_code,
      "institution.name": "St. Christopher and Nevis Social Security Board",
      "institution.address": "Bay Road, Basseterre, St. Kitts",
      "institution.phone": "+1 (869) 465-2535",
      "institution.email": "legal@socialsecurity.kn",
      "legal_reference.full": primary?.full_reference_text || primary?.short_title || "",
      "legal_reference.act_name": primary?.act_name || "",
      "legal_reference.section": primary?.section || "",
      ...(input.tokens || {}),
    };

    const subjectSrc = variant?.subject ?? ver.subject ?? "";
    const bodySrc = variant?.body_html ?? variant?.body_text ?? ver.body_html ?? "";
    const subject = resolveTokens(subjectSrc, baseTokens);
    const body = resolveTokens(bodySrc, baseTokens);
    const content_hash = await sha256Hex(`${input.channel_code}::${subject}::${body}`);

    const delivery_status =
      input.channel_code === "PDF" ? "GENERATED" : "QUEUED";

    const { data, error } = await (supabase as any)
      .from("core_generated_document").insert({
        reference_no,
        template_id: input.template_id,
        template_version_id: ver.id,
        layout_id: ver.layout_id ?? null,
        module_code: input.module_code,
        doc_type_code: input.doc_type_code,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        subject,
        generated_html: body,
        resolved_tokens: baseTokens,
        legal_references_snapshot: snapshot,
        status: "GENERATED",
        generated_by: input.generated_by || "SYSTEM",
        channel_code: input.channel_code,
        delivery_status,
        recipient_address: input.recipient_address || null,
        content_hash,
        case_stage_code: input.case_stage_code ?? null,
        case_type_code: input.case_type_code ?? null,
        legal_reference_version_id: primary?.legal_reference_version_id ?? null,
      }).select("*").single();
    if (error) throw error;

    if (snapshot.length) {
      await (supabase as any).from("core_generated_document_legal_reference").insert(
        snapshot.map((r: any) => ({
          generated_document_id: data.id,
          legal_reference_id: r.legal_reference_id,
          legal_reference_version_id: r.legal_reference_version_id ?? null,
          ref_code: r.ref_code,
          citation_snapshot: r.full_reference_text || r.short_title || null,
          full_reference_snapshot: r.full_reference_text || null,
          effective_from_snapshot: r.effective_from ?? null,
          effective_to_snapshot: r.effective_to ?? null,
        })),
      );
    }

    return {
      id: data.id,
      reference_no: data.reference_no,
      channel_code: input.channel_code,
      delivery_status,
      content_hash,
      generated_html: body,
    };
  },

  async markDelivered(generated_document_id: string) {
    const { error } = await (supabase as any)
      .from("core_generated_document")
      .update({ delivery_status: "DELIVERED", delivered_at: new Date().toISOString() })
      .eq("id", generated_document_id);
    if (error) throw error;
  },

  async markFailed(generated_document_id: string, reason: string) {
    const { error } = await (supabase as any)
      .from("core_generated_document")
      .update({ delivery_status: "FAILED", subject: reason.slice(0, 250) })
      .eq("id", generated_document_id);
    if (error) throw error;
  },
};
