import { supabase } from "@/integrations/supabase/client";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import jsPDF from "jspdf";

/**
 * EPIC-08 + EPIC-08A — Legal Document Automation & Correspondence
 *
 * Thin service that:
 *  - Lists LEGAL templates from `core_template`.
 *  - Renders a template to DOCX + PDF given a token context.
 *  - Uploads rendered artifacts to Supabase Storage (bucket `legal-documents`)
 *    and persists them into `lg_document_link` with lifecycle state
 *    (draft → pending_approval → approved → issued → dispatched →
 *     acknowledged | failed | cancelled).
 *  - Emits `lg_case_activity` events for every lifecycle transition.
 */

const STORAGE_BUCKET = "legal-documents";

export type LgDocLifecycle =
  | "draft"
  | "pending_approval"
  | "approved"
  | "issued"
  | "dispatched"
  | "acknowledged"
  | "failed"
  | "cancelled";

export type LgTemplateSummary = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  body: string;
};

/** Well-known legal template categories exposed in the workspace. */
export const LG_DOC_CATEGORIES = [
  "Court Order",
  "Judgment",
  "Demand Notice",
  "Breach Notice",
  "Consent Order",
  "Settlement Agreement",
  "Appeal Notice",
  "Enforcement Notice",
  "Court Filing Cover",
  "External Counsel Instruction",
  "Legal Cost Notice",
  "Closure Letter",
] as const;

/** Template codes the audit checks for. Keep in sync with LG_DOC_CATEGORIES. */
export const REQUIRED_LEGAL_TEMPLATE_CODES = [
  "LG_COURT_ORDER",
  "LG_JUDGMENT",
  "LG_DEMAND_NOTICE",
  "LG_BREACH_NOTICE",
  "LG_CONSENT_ORDER",
  "LG_SETTLEMENT_AGREEMENT",
  "LG_APPEAL_NOTICE",
  "LG_ENFORCEMENT_NOTICE",
  "LG_COURT_FILING_COVER",
  "LG_EXTERNAL_COUNSEL_INSTRUCTION",
  "LG_LEGAL_COST_NOTICE",
  "LG_CLOSURE_LETTER",
] as const;

export async function listLegalTemplates(): Promise<LgTemplateSummary[]> {
  const { data, error } = await (supabase as any)
    .from("core_template")
    .select("id, code, name, template_category, description, is_active, module_code")
    .eq("module_code", "LEGAL")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.template_category ?? null,
    body: r.description ?? "",
  }));
}

/** Very small handlebars-lite: {{token}} → context[token]. */
export function renderText(body: string, ctx: Record<string, string | number | null | undefined>) {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const val = ctx[key];
    return val === null || val === undefined ? "" : String(val);
  });
}

/** Build a merge-token context for a matter using existing legal tables. */
export async function buildMatterContext(lgCaseId: string): Promise<Record<string, string>> {
  const [{ data: c }, { data: fin }] = await Promise.all([
    (supabase as any).from("lg_case").select("*").eq("id", lgCaseId).maybeSingle(),
    (supabase as any).from("v_lg_case_financials").select("*").eq("lg_case_id", lgCaseId).maybeSingle(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return {
    "matter.case_no": c?.lg_case_no ?? "",
    "matter.court_case_no": c?.court_case_no ?? "",
    "matter.stage": c?.current_stage_code ?? "",
    "matter.status": c?.status_code ?? "",
    "court.name": c?.court_name ?? "",
    "court.venue": c?.court_venue_code ?? "",
    "judge.code": c?.presiding_officer_code ?? "",
    "employer.account_no": c?.employer_account_no ?? "",
    "hearing.next_date": c?.next_hearing_date ?? "",
    "financial.total_outstanding": fin?.total_outstanding ?? c?.total_outstanding ?? "",
    "financial.total_paid": fin?.total_paid ?? "",
    "financial.total_assessed": fin?.total_assessed ?? "",
    "officer.assigned_id": c?.assigned_legal_officer_id ?? "",
    "date.today": today,
  };
}

export async function renderDocx(title: string, mergedText: string): Promise<Blob> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }),
        ...mergedText.split(/\n\n+/).map((p) =>
          new Paragraph({ children: [new TextRun(p)] })
        ),
      ],
    }],
  });
  return await Packer.toBlob(doc);
}

export function renderPdf(title: string, mergedText: string): Blob {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  pdf.setFontSize(16); pdf.text(title, 40, 60);
  pdf.setFontSize(11);
  const lines = pdf.splitTextToSize(mergedText, 515);
  pdf.text(lines, 40, 90);
  return pdf.output("blob");
}

async function auditEvent(
  lgCaseId: string,
  activityType: string,
  description: string,
  payload?: Record<string, unknown>,
) {
  const { data: u } = await supabase.auth.getUser();
  await (supabase as any).from("lg_case_activity").insert({
    lg_case_id: lgCaseId,
    activity_type: activityType,
    description,
    entity_type: "LG_DOCUMENT",
    payload: payload ?? {},
    performed_by: u?.user?.id ?? null,
    occurred_at: new Date().toISOString(),
  });
}

async function uploadBlob(
  lgCaseId: string,
  fileName: string,
  blob: Blob,
  ts: number = Date.now(),
): Promise<{ path: string; size: number; mime: string }> {
  const path = `${lgCaseId}/${ts}_${fileName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return { path, size: blob.size, mime: blob.type };
}

export async function getSignedDownloadUrl(storageRef: string, expiresIn = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storageRef, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export interface GenerateDocumentInput {
  lgCaseId: string;
  templateId: string;
  templateCode: string;
  title: string;
  hearingId?: string | null;
  orderId?: string | null;
  settlementId?: string | null;
  docxBlob: Blob;
  pdfBlob: Blob;
  fileBase: string;
}

export async function generateDocument(input: GenerateDocumentInput) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id ?? null;
  let storage_ref: string | null = null;
  let file_name: string | null = null;
  let mime_type: string | null = null;
  let size_bytes: number | null = null;
  let renderError: string | null = null;
  try {
    const ts = Date.now();
    const pdfUp = await uploadBlob(input.lgCaseId, `${input.fileBase}.pdf`, input.pdfBlob, ts);
    await uploadBlob(input.lgCaseId, `${input.fileBase}.docx`, input.docxBlob, ts);
    storage_ref = pdfUp.path;
    file_name = `${input.fileBase}.pdf`;
    mime_type = pdfUp.mime || "application/pdf";
    size_bytes = pdfUp.size;
  } catch (e: any) {
    renderError = e?.message ?? "Storage upload failed";
  }

  const { data: link, error } = await (supabase as any)
    .from("lg_document_link")
    .insert({
      lg_case_id: input.lgCaseId,
      title: input.title,
      template_id: input.templateId,
      template_code: input.templateCode,
      lifecycle_status: renderError ? "failed" : "draft",
      generated_at: new Date().toISOString(),
      generated_by: userId,
      document_category_code: "LEGAL_GENERATED",
      document_source: "AUTOMATION",
      hearing_id: input.hearingId ?? null,
      order_id: input.orderId ?? null,
      settlement_id: input.settlementId ?? null,
      linked_at: new Date().toISOString(),
      linked_by: userId,
      storage_provider: "supabase",
      storage_ref,
      file_name,
      mime_type,
      size_bytes,
      render_error: renderError,
    })
    .select("*").single();
  if (error) throw error;
  await auditEvent(
    input.lgCaseId,
    renderError ? "DOCUMENT_FAILED" : "DOCUMENT_GENERATED",
    renderError
      ? `Failed to generate document ${input.templateCode}: ${renderError}`
      : `Generated document from template ${input.templateCode}`,
    { document_link_id: link.id, template_code: input.templateCode, storage_ref },
  );
  return link;
}

export interface DispatchInput {
  channel: string;
  recipient: string;
  recipientAddress: string;
  status?: string;
  failureReason?: string;
}

export async function transitionDocument(
  linkId: string,
  next: LgDocLifecycle,
  extra: Partial<Record<string, unknown>> = {},
) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id ?? null;
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { lifecycle_status: next, ...extra };
  if (next === "approved")     { patch.approved_by = userId;     patch.approved_at = nowIso; }
  if (next === "issued")       { patch.issued_by = userId;       patch.issued_at = nowIso; }
  if (next === "dispatched")   { patch.dispatched_by = userId;   patch.dispatched_at = nowIso; }
  if (next === "acknowledged") { patch.acknowledged_by = userId; patch.acknowledged_at = nowIso;
                                 patch.acknowledgement_status = "acknowledged"; }
  if (next === "cancelled")    { patch.cancelled_by = userId;    patch.cancelled_at = nowIso; }

  const { data, error } = await (supabase as any)
    .from("lg_document_link")
    .update(patch).eq("id", linkId).select("*").single();
  if (error) throw error;

  const map: Record<LgDocLifecycle, string> = {
    draft: "DOCUMENT_DRAFTED",
    pending_approval: "DOCUMENT_SUBMITTED_FOR_APPROVAL",
    approved: "DOCUMENT_APPROVED",
    issued: "DOCUMENT_ISSUED",
    dispatched: "DOCUMENT_DISPATCHED",
    acknowledged: "DOCUMENT_ACKNOWLEDGED",
    failed: "DOCUMENT_FAILED",
    cancelled: "DOCUMENT_CANCELLED",
  };
  await auditEvent(data.lg_case_id, map[next], `Document ${data.title} → ${next}`, {
    document_link_id: linkId, lifecycle_status: next,
  });
  return data;
}

export async function dispatchDocument(linkId: string, input: DispatchInput) {
  return transitionDocument(linkId, "dispatched", {
    dispatch_channel: input.channel,
    dispatch_recipient: input.recipient,
    dispatch_recipient_address: input.recipientAddress,
    dispatch_status: input.status ?? "sent",
    dispatch_failure_reason: input.failureReason ?? null,
  });
}

export async function listGeneratedDocuments(status?: LgDocLifecycle) {
  let q = (supabase as any)
    .from("lg_document_link")
    .select("id, lg_case_id, title, template_code, lifecycle_status, generated_at, approved_at, issued_at, dispatched_at, dispatch_channel, dispatch_recipient, dispatch_recipient_address, dispatch_status, acknowledgement_status, storage_ref, file_name, mime_type, size_bytes, render_error")
    .eq("document_source", "AUTOMATION")
    .order("generated_at", { ascending: false, nullsFirst: false });
  if (status) q = q.eq("lifecycle_status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ---------- EPIC-08A: Missing template audit ----------

export interface TemplateAuditRow {
  template_code: string;
  status: "mapped" | "missing" | "inactive";
  core_template_id: string | null;
  name: string | null;
  render_failures: number;
}

export async function runTemplateAudit(): Promise<TemplateAuditRow[]> {
  const { data: templates } = await (supabase as any)
    .from("core_template")
    .select("id, code, name, is_active")
    .eq("module_code", "LEGAL");
  const { data: failures } = await (supabase as any)
    .from("lg_document_link")
    .select("template_code")
    .eq("document_source", "AUTOMATION")
    .not("render_error", "is", null);

  const failCount = new Map<string, number>();
  (failures ?? []).forEach((r: any) => {
    const c = r.template_code as string | null;
    if (!c) return;
    failCount.set(c, (failCount.get(c) ?? 0) + 1);
  });

  const byCode = new Map<string, any>();
  (templates ?? []).forEach((t: any) => byCode.set(t.code, t));

  return REQUIRED_LEGAL_TEMPLATE_CODES.map((code) => {
    const t = byCode.get(code);
    let status: TemplateAuditRow["status"] = "missing";
    if (t) status = t.is_active ? "mapped" : "inactive";
    return {
      template_code: code,
      status,
      core_template_id: t?.id ?? null,
      name: t?.name ?? null,
      render_failures: failCount.get(code) ?? 0,
    };
  });
}
