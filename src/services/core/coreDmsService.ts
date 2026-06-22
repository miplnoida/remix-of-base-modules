import { supabase } from "@/integrations/supabase/client";

/**
 * Generic, module-agnostic DMS client.
 *
 * Backed by the `core-dms-upload` edge function for upload (which centralises
 * config lookup, auth, retries and audit). Other operations (search, download,
 * read, link) are direct table reads or proxy through `document-proxy`.
 */

export interface CoreDmsLegalLink {
  module_code: "LEGAL";
  lg_case_id: string;
  document_category_code: string;
  document_type_code?: string | null;
  linked_stage_code?: string | null;
  hearing_id?: string | null;
  order_id?: string | null;
  settlement_id?: string | null;
  notice_id?: string | null;
  title?: string | null;
  notes?: string | null;
  confidential?: boolean;
  court_filed?: boolean;
  filed_date?: string | null;
}

export interface UploadGeneratedInput {
  generated_document_id: string;
  user_code: string;
  category_id?: string;
  link?: CoreDmsLegalLink | null;
  correlation_id?: string;
}

export interface UploadFileInput {
  file: Blob | File;
  file_name?: string;
  mime_type?: string;
  user_code: string;
  category_id?: string;
  link?: CoreDmsLegalLink | null;
  correlation_id?: string;
}

export interface CoreDmsUploadResult {
  success: boolean;
  skipped?: boolean;
  correlation_id?: string;
  generated_document_id?: string | null;
  dms_document_id?: string | null;
  dms_file_id?: string | null;
  dms_url?: string | null;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  link_id?: string | null;
  message?: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

async function invokeUpload(payload: any): Promise<CoreDmsUploadResult> {
  const { data, error } = await supabase.functions.invoke("core-dms-upload", { body: payload });
  if (error) throw new Error(error.message || "core-dms-upload invocation failed");
  if (data && typeof data === "object" && (data as any).error) {
    throw new Error(`${(data as any).error}: ${(data as any).details ?? ""}`.trim());
  }
  return data as CoreDmsUploadResult;
}

export const coreDmsService = {
  /** Upload an existing core_generated_document (HTML body) into DMS. */
  async uploadGenerated(input: UploadGeneratedInput): Promise<CoreDmsUploadResult> {
    return invokeUpload({
      generated_document_id: input.generated_document_id,
      user_code: input.user_code,
      category_id: input.category_id,
      correlation_id: input.correlation_id,
      link: input.link ?? null,
    });
  },

  /** Upload raw file bytes (e.g. user-selected file) into DMS. */
  async uploadFile(input: UploadFileInput): Promise<CoreDmsUploadResult> {
    const base64 = await blobToBase64(input.file);
    return invokeUpload({
      file_base64: base64,
      file_name: input.file_name || (input.file as File).name || "file.bin",
      mime_type: input.mime_type || input.file.type || "application/octet-stream",
      user_code: input.user_code,
      category_id: input.category_id,
      correlation_id: input.correlation_id,
      link: input.link ?? null,
    });
  },

  /** Build a viewer/download URL via the existing document-proxy function. */
  async getDownloadUrl(dmsDocumentId: string): Promise<string> {
    const { data: cfg } = await (supabase as any)
      .from("api_settings")
      .select("base_url, header_name, api_key")
      .eq("setting_key", "dms_service")
      .maybeSingle();
    if (!cfg?.base_url) throw new Error("DMS not configured");
    const base = String(cfg.base_url).replace(/\/+$/, "");
    return `${base}/api/Dms/files/${encodeURIComponent(dmsDocumentId)}/download`;
  },

  /** Search Legal-side document links by entity (lg_case_id, hearing_id, …). */
  async searchLegalByEntity(opts: {
    lg_case_id?: string;
    hearing_id?: string;
    order_id?: string;
    settlement_id?: string;
    notice_id?: string;
    document_type_code?: string;
    linked_stage_code?: string;
  }) {
    let q = (supabase as any).from("lg_document_link").select("*");
    for (const [k, v] of Object.entries(opts)) {
      if (v !== undefined && v !== null && v !== "") q = q.eq(k, v);
    }
    const { data, error } = await q.order("uploaded_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Link an already-uploaded DMS document to a Legal entity (no re-upload). */
  async linkExistingToLegal(args: {
    dms_document_id: string;
    dms_file_id?: string | null;
    dms_url?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    user_code: string;
    link: CoreDmsLegalLink;
  }) {
    const { data, error } = await (supabase as any)
      .from("lg_document_link")
      .insert({
        lg_case_id: args.link.lg_case_id,
        document_category_code: args.link.document_category_code,
        document_type_code: args.link.document_type_code ?? null,
        document_source: "DMS_EXISTING",
        document_ref_id: null,
        document_ref_no: null,
        title: args.link.title ?? args.file_name ?? args.dms_document_id,
        notes: args.link.notes ?? null,
        linked_stage_code: args.link.linked_stage_code ?? null,
        hearing_id: args.link.hearing_id ?? null,
        order_id: args.link.order_id ?? null,
        settlement_id: args.link.settlement_id ?? null,
        notice_id: args.link.notice_id ?? null,
        court_filed: !!args.link.court_filed,
        filed_date: args.link.filed_date ?? null,
        confidential: !!args.link.confidential,
        uploaded_by: args.user_code,
        linked_by: args.user_code,
        dms_document_id: args.dms_document_id,
        dms_file_id: args.dms_file_id ?? null,
        dms_url: args.dms_url ?? null,
        file_name: args.file_name ?? null,
        mime_type: args.mime_type ?? null,
        size_bytes: args.size_bytes ?? null,
        upload_status: "COMPLETE",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /** Toggle court-filed flag on an existing link. */
  async markCourtFiled(linkId: string, filed: boolean, filed_date?: string | null) {
    const { error } = await (supabase as any)
      .from("lg_document_link")
      .update({ court_filed: filed, filed_date: filed_date ?? (filed ? new Date().toISOString().split("T")[0] : null) })
      .eq("id", linkId);
    if (error) throw error;
  },

  /** Toggle confidential flag on an existing link. */
  async setConfidential(linkId: string, confidential: boolean) {
    const { error } = await (supabase as any)
      .from("lg_document_link")
      .update({ confidential })
      .eq("id", linkId);
    if (error) throw error;
  },

  /** Validate that DMS is reachable & configured (used by Admin → DMS screen). */
  async validateConfig(): Promise<{ ok: boolean; base_url?: string; header_name?: string; reason?: string }> {
    const { data, error } = await (supabase as any)
      .from("api_settings")
      .select("base_url, header_name, is_active")
      .eq("setting_key", "dms_service")
      .maybeSingle();
    if (error) return { ok: false, reason: error.message };
    if (!data) return { ok: false, reason: "dms_service api_settings row missing" };
    if (!data.is_active) return { ok: false, reason: "dms_service is inactive" };
    if (!data.base_url) return { ok: false, reason: "base_url not set" };
    return { ok: true, base_url: data.base_url, header_name: data.header_name || "x-api-key" };
  },
};

export type CoreDmsService = typeof coreDmsService;
