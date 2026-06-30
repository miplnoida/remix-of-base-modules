import { supabase } from "@/integrations/supabase/client";
import { resolveLegalEnterprise } from "@/lib/enterprise/legalEnterpriseMetadata";

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
  document_source?: string | null;
  linked_stage_code?: string | null;
  hearing_id?: string | null;
  order_id?: string | null;
  settlement_id?: string | null;
  notice_id?: string | null;
  fee_charge_id?: string | null;
  title?: string | null;
  notes?: string | null;
  confidential?: boolean;
  court_filed?: boolean;
  filed_date?: string | null;
  enterprise_metadata?: Record<string, unknown> | null;
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

  /**
   * Convenience: dispatch a generated letter (already saved to
   * `core_generated_document`) into DMS AND link it on the Legal case in one call.
   * If the letter is already linked (idempotent by generated_document_id),
   * the existing link is returned and no duplicate is created.
   */
  async linkGeneratedToLegal(args: {
    generated_document_id: string;
    user_code: string;
    link: CoreDmsLegalLink;
  }): Promise<{ link_id: string | null; skipped: boolean; result?: CoreDmsUploadResult }> {
    // Idempotency: check if this generated doc is already linked on the case
    const { data: existing } = await (supabase as any)
      .from("lg_document_link")
      .select("id")
      .eq("lg_case_id", args.link.lg_case_id)
      .eq("document_ref_id", args.generated_document_id)
      .maybeSingle();
    if (existing?.id) return { link_id: existing.id, skipped: true };

    const result = await invokeUpload({
      generated_document_id: args.generated_document_id,
      user_code: args.user_code,
      // category_id intentionally omitted — server resolves the valid remote
      // DMS CategoryId for LEGAL (defaults to PPIP, overridable via env).
      link: args.link,
    });
    return { link_id: result.link_id ?? null, skipped: false, result };
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
    let enterpriseMetadata: any = null;
    try {
      enterpriseMetadata = (await resolveLegalEnterprise({
        matterId: args.link.lg_case_id,
        matterKind: "LG_CASE",
        documentType: args.link.document_type_code ?? null,
        confidential: !!args.link.confidential,
      })).metadata;
    } catch { enterpriseMetadata = null; }

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
        fee_charge_id: args.link.fee_charge_id ?? null,
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
        enterprise_metadata: enterpriseMetadata,
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

  /** Read a single link row. */
  async getLinkById(linkId: string) {
    const { data, error } = await (supabase as any)
      .from("lg_document_link").select("*").eq("id", linkId).maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Generic filter search over lg_document_link. */
  async searchLinks(opts: {
    lg_case_id?: string;
    document_category_code?: string;
    document_type_code?: string;
    document_source?: string;
    confidential?: boolean;
    court_filed?: boolean;
    limit?: number;
  }) {
    let q = (supabase as any).from("lg_document_link").select("*");
    for (const [k, v] of Object.entries(opts)) {
      if (k === "limit") continue;
      if (v !== undefined && v !== null && v !== "") q = q.eq(k, v);
    }
    const { data, error } = await q.order("uploaded_at", { ascending: false }).limit(opts.limit ?? 100);
    if (error) throw error;
    return data ?? [];
  },

  /** Free-text search across title / file name / reference number. */
  async searchByText(text: string, lg_case_id?: string) {
    let q = (supabase as any).from("lg_document_link").select("*");
    if (lg_case_id) q = q.eq("lg_case_id", lg_case_id);
    const like = `%${text.replace(/[%_]/g, "")}%`;
    q = q.or(`title.ilike.${like},file_name.ilike.${like},document_ref_no.ilike.${like}`);
    const { data, error } = await q.order("uploaded_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  },

  /** All versions for a given logical DMS document, newest first. */
  async getVersionHistory(dms_document_id: string) {
    const { data, error } = await (supabase as any)
      .from("lg_document_link")
      .select("id, version_no, file_name, mime_type, size_bytes, uploaded_at, uploaded_by, upload_status")
      .eq("dms_document_id", dms_document_id)
      .order("version_no", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Soft-archive a link. */
  async archiveLink(linkId: string) {
    const { error } = await (supabase as any)
      .from("lg_document_link").update({ upload_status: "ARCHIVED" }).eq("id", linkId);
    if (error) throw error;
  },

  /** Remove a Legal ↔ DMS link without deleting the underlying file. */
  async unlink(linkId: string, user_code: string) {
    const row = await this.getLinkById(linkId);
    const { error } = await (supabase as any).from("lg_document_link").delete().eq("id", linkId);
    if (error) throw error;
    try {
      await (supabase as any).from("system_audit_trail").insert({
        action: "core_dms_link_removed",
        entity_type: "lg_document_link",
        entity_id: linkId,
        module: "Core DMS",
        user_name: user_code || "SYSTEM",
        severity: "info",
        payload_json: row,
        timestamp: new Date().toISOString(),
      });
    } catch { /* non-blocking */ }
  },

  /** Stream/view a link via document-proxy. */
  async viewByLink(linkId: string): Promise<string> {
    const row = await this.getLinkById(linkId);
    if (!row?.dms_url && !row?.dms_document_id) throw new Error("Link has no DMS reference");
    const target = row.dms_url || (await this.getDownloadUrl(row.dms_document_id));
    return target;
  },

  /**
   * Stream a link's bytes through `document-proxy` and return a blob: URL
   * suitable for `window.open`. The proxy enforces confidentiality + case
   * validation server-side, so the raw DMS URL never reaches the browser.
   */
  async streamByLink(linkId: string, action: "stream" | "download" = "stream", fileName?: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error("Not authenticated");
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-proxy`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, link_id: linkId, fileName }),
    });
    if (!resp.ok) {
      let msg = `document-proxy ${resp.status}`;
      try { const j = await resp.json(); msg = j.error || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  },

  /** Latest DMS audit rows for a case. */
  async getAuditForCase(lg_case_id: string, limit = 50) {
    const { data, error } = await (supabase as any)
      .from("system_audit_trail")
      .select("id, action, entity_type, entity_id, severity, payload_json, timestamp, user_name")
      .eq("module", "Core DMS")
      .contains("payload_json", { link: { lg_case_id } })
      .order("timestamp", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  },

  /**
   * Generic role-based permission probe against module_actions.action_name.
   * Returns true if any of the user's roles grants the named action.
   * Admin / super_admin roles short-circuit to true.
   */
  async hasLegalDocPermission(userId: string, actionName: string): Promise<boolean> {
    const sb = supabase as any;
    const { data: ur } = await sb
      .from("user_roles").select("role").eq("user_id", userId);
    const roleNames: string[] = (ur ?? []).map((r: any) => r.role).filter(Boolean);
    if (!roleNames.length) return false;
    if (roleNames.some((n) => ["admin", "Admin", "super_admin", "SuperAdmin", "SUPER_ADMIN"].includes(n))) return true;

    const { data: roles } = await sb
      .from("roles").select("id").in("role_name", roleNames);
    const roleIds: string[] = (roles ?? []).map((r: any) => r.id);
    if (!roleIds.length) return false;

    const { data: actions } = await sb
      .from("module_actions").select("id").eq("action_name", actionName);
    const actionIds: string[] = (actions ?? []).map((a: any) => a.id);
    if (!actionIds.length) return false;

    const { data: perms } = await sb
      .from("role_permissions")
      .select("id")
      .in("role_id", roleIds)
      .in("action_id", actionIds)
      .limit(1);
    return !!(perms && perms.length);
  },

  /** Back-compat shim — delegates to hasLegalDocPermission. */
  async canViewConfidential(userId: string): Promise<boolean> {
    return this.hasLegalDocPermission(userId, "LEGAL_DOCUMENT_CONFIDENTIAL_VIEW");
  },
};

export type CoreDmsService = typeof coreDmsService;
