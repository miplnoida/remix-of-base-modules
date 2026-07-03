import { supabase } from "@/integrations/supabase/client";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import jsPDF from "jspdf";

/**
 * EPIC-08 — Legal Document Automation & Correspondence
 *
 * Thin service that:
 *  - Lists LEGAL templates from `core_template` (single source of truth).
 *  - Renders a template to DOCX + PDF given a token context.
 *  - Persists generated documents into `lg_document_link` with lifecycle state
 *    (draft → pending_approval → approved → issued → dispatched → acknowledged).
 *  - Emits `lg_case_activity` events for every lifecycle transition.
 *
 * No mock data. No DMS duplication. Uses existing tables:
 *   - core_template          (template body)
 *   - lg_document_link       (generated document ledger; extended in EPIC-08 migration)
 *   - lg_case_activity       (audit + timeline)
 *   - v_lg_case_financials   (financial rollup for merge fields)
 */

export type LgDocLifecycle =
  | "draft"
  | "pending_approval"
  | "approved"
  | "issued"
  | "dispatched"
  | "acknowledged"
  | "failed";

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

export async function listLegalTemplates(): Promise<LgTemplateSummary[]> {
  const { data, error } = await (supabase as any)
    .from("core_template")
    .select("id, template_code, template_name, category_code, body")
    .eq("module_code", "LEGAL")
    .eq("is_active", true)
    .order("template_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    code: r.template_code,
    name: r.template_name,
    category: r.category_code ?? null,
    body: typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? ""),
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
  const buf = await Packer.toBlob(doc);
  return buf;
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

export interface GenerateDocumentInput {
  lgCaseId: string;
  templateId: string;
  templateCode: string;
  title: string;
  hearingId?: string | null;
  orderId?: string | null;
  settlementId?: string | null;
}

export async function generateDocument(input: GenerateDocumentInput) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id ?? null;
  const { data: link, error } = await (supabase as any)
    .from("lg_document_link")
    .insert({
      lg_case_id: input.lgCaseId,
      title: input.title,
      template_id: input.templateId,
      template_code: input.templateCode,
      lifecycle_status: "draft",
      generated_at: new Date().toISOString(),
      generated_by: userId,
      document_category_code: "LEGAL_GENERATED",
      document_source: "AUTOMATION",
      hearing_id: input.hearingId ?? null,
      order_id: input.orderId ?? null,
      settlement_id: input.settlementId ?? null,
      linked_at: new Date().toISOString(),
      linked_by: userId,
    })
    .select("*").single();
  if (error) throw error;
  await auditEvent(input.lgCaseId, "DOCUMENT_GENERATED",
    `Generated document from template ${input.templateCode}`,
    { document_link_id: link.id, template_code: input.templateCode });
  return link;
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
  if (next === "approved")   { patch.approved_by = userId;   patch.approved_at = nowIso; }
  if (next === "issued")     { patch.issued_by = userId;     patch.issued_at = nowIso; }
  if (next === "dispatched") { patch.dispatched_by = userId; patch.dispatched_at = nowIso; }
  if (next === "acknowledged"){ patch.acknowledged_by = userId; patch.acknowledged_at = nowIso; }

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
  };
  await auditEvent(data.lg_case_id, map[next], `Document ${data.title} → ${next}`, {
    document_link_id: linkId, lifecycle_status: next,
  });
  return data;
}

export async function listGeneratedDocuments(status?: LgDocLifecycle) {
  let q = (supabase as any)
    .from("lg_document_link")
    .select("id, lg_case_id, title, template_code, lifecycle_status, generated_at, approved_at, issued_at, dispatched_at, dispatch_channel, render_error")
    .eq("document_source", "AUTOMATION")
    .order("generated_at", { ascending: false, nullsFirst: false });
  if (status) q = q.eq("lifecycle_status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
