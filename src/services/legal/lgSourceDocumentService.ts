import { supabase } from "@/integrations/supabase/client";

/**
 * Cross-module source document resolver for the Legal module.
 *
 * Legal does not store copies of documents that originate in other modules
 * (Compliance, Benefits/Claims, Employer Services, Insured Person Services,
 * Meetings). Instead, those documents stay in their owning module and the
 * Central DMS. This service returns a normalized view of those source
 * documents so the Legal Intake screen and the Legal Case Documents tab can
 * display them and optionally link them into a legal case via
 * `lg_document_link` with `document_source = 'SOURCE_MODULE'`.
 */

const sb = supabase as any;

export type SourceModule =
  | "COMPLIANCE"
  | "BENEFITS"
  | "CLAIMS"
  | "EMPLOYER_SERVICES"
  | "INSURED_PERSON_SERVICES"
  | "MEETINGS";

export interface SourceDocumentContext {
  source_module?: string | null;
  // Compliance
  compliance_case_id?: string | null;
  compliance_referral_id?: string | null;
  payment_arrangement_id?: string | null;
  // Benefits / Claims
  claim_id?: string | null;
  benefit_application_id?: string | null;
  // Shared
  employer_id?: string | null;
  insured_person_id?: string | null;
  insured_person_ssn?: string | null;
  // Meetings / generic
  meeting_id?: string | null;
}

export interface SourceDocument {
  /** Stable composite id `<table>:<row_id>` used for de-dup + selection. */
  key: string;
  source_module: SourceModule | string;
  source_entity_type: string;
  source_entity_id: string;
  source_reference: string;
  title: string;
  document_type_code: string | null;
  document_sub_type_code: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  confidential: boolean;
  /** DMS reference if the source has already been pushed to the central DMS. */
  dms_document_id: string | null;
  dms_file_id: string | null;
  dms_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
}

function safeArray<T = any>(r: any): T[] {
  return Array.isArray(r?.data) ? (r.data as T[]) : [];
}

async function loadCompliance(ctx: SourceDocumentContext): Promise<SourceDocument[]> {
  const out: SourceDocument[] = [];

  if (ctx.compliance_case_id) {
    const r = await sb
      .from("ce_case_documents")
      .select("id, case_id, document_type, title, file_name, mime_type, file_size_bytes, is_confidential, uploaded_by, uploaded_by_name, created_at")
      .eq("case_id", ctx.compliance_case_id)
      .limit(500);
    for (const d of safeArray<any>(r)) {
      out.push({
        key: `ce_case_documents:${d.id}`,
        source_module: "COMPLIANCE",
        source_entity_type: "CE_CASE",
        source_entity_id: d.case_id,
        source_reference: ctx.compliance_case_id!,
        title: d.title || d.file_name || "Compliance document",
        document_type_code: d.document_type ?? null,
        document_sub_type_code: null,
        uploaded_by: d.uploaded_by_name || d.uploaded_by || null,
        uploaded_at: d.created_at ?? null,
        confidential: !!d.is_confidential,
        dms_document_id: null,
        dms_file_id: null,
        dms_url: null,
        file_name: d.file_name ?? null,
        mime_type: d.mime_type ?? null,
        size_bytes: d.file_size_bytes ?? null,
      });
    }

    // Audit uploads tied to the compliance case via inspection
    const r2 = await sb
      .from("ce_audit_employer_uploaded_documents")
      .select("id, employer_id, document_kind, filename, mime_type, size_bytes, uploaded_by, uploaded_at, inspection_id")
      .eq("employer_id", null) // placeholder, we'll union via OR below
      .limit(0);
    void r2;
  }

  if (ctx.payment_arrangement_id) {
    // Payment arrangement specific documents (best effort — table may or may not exist).
    const r = await sb
      .from("ce_case_documents")
      .select("id, case_id, document_type, title, file_name, mime_type, file_size_bytes, is_confidential, uploaded_by, uploaded_by_name, created_at")
      .ilike("title", `%${ctx.payment_arrangement_id}%`)
      .limit(50);
    for (const d of safeArray<any>(r)) {
      const key = `ce_case_documents:${d.id}`;
      if (out.some(x => x.key === key)) continue;
      out.push({
        key,
        source_module: "COMPLIANCE",
        source_entity_type: "CE_PAYMENT_ARRANGEMENT",
        source_entity_id: ctx.payment_arrangement_id!,
        source_reference: ctx.payment_arrangement_id!,
        title: d.title || d.file_name || "Arrangement document",
        document_type_code: d.document_type ?? null,
        document_sub_type_code: "ARRANGEMENT",
        uploaded_by: d.uploaded_by_name || d.uploaded_by || null,
        uploaded_at: d.created_at ?? null,
        confidential: !!d.is_confidential,
        dms_document_id: null,
        dms_file_id: null,
        dms_url: null,
        file_name: d.file_name ?? null,
        mime_type: d.mime_type ?? null,
        size_bytes: d.file_size_bytes ?? null,
      });
    }
  }

  return out;
}

async function loadBenefits(ctx: SourceDocumentContext): Promise<SourceDocument[]> {
  const out: SourceDocument[] = [];
  if (ctx.claim_id) {
    const r1 = await sb
      .from("bn_claim_document")
      .select("id, claim_id, document_type_code, document_name, file_name, mime_type, file_size, entered_by, entered_at, uploaded_at, verification_status")
      .eq("claim_id", ctx.claim_id)
      .limit(500);
    for (const d of safeArray<any>(r1)) {
      out.push({
        key: `bn_claim_document:${d.id}`,
        source_module: "BENEFITS",
        source_entity_type: "BN_CLAIM",
        source_entity_id: d.claim_id,
        source_reference: ctx.claim_id!,
        title: d.document_name || d.file_name || "Claim document",
        document_type_code: d.document_type_code ?? null,
        document_sub_type_code: null,
        uploaded_by: d.entered_by ?? null,
        uploaded_at: d.uploaded_at || d.entered_at || null,
        confidential: true, // PHI default for benefits
        dms_document_id: null,
        dms_file_id: null,
        dms_url: null,
        file_name: d.file_name ?? null,
        mime_type: d.mime_type ?? null,
        size_bytes: d.file_size ?? null,
      });
    }

    const r2 = await sb
      .from("bn_claim_evidence")
      .select("id, claim_id, document_type_code, document_name, file_name, mime_type, file_size, status, entered_by, entered_at, modified_at")
      .eq("claim_id", ctx.claim_id)
      .limit(500);
    for (const d of safeArray<any>(r2)) {
      out.push({
        key: `bn_claim_evidence:${d.id}`,
        source_module: "BENEFITS",
        source_entity_type: "BN_CLAIM_EVIDENCE",
        source_entity_id: d.claim_id,
        source_reference: ctx.claim_id!,
        title: d.document_name || d.file_name || "Claim evidence",
        document_type_code: d.document_type_code ?? null,
        document_sub_type_code: d.status ?? null,
        uploaded_by: d.entered_by ?? null,
        uploaded_at: d.modified_at || d.entered_at || null,
        confidential: true,
        dms_document_id: null,
        dms_file_id: null,
        dms_url: null,
        file_name: d.file_name ?? null,
        mime_type: d.mime_type ?? null,
        size_bytes: d.file_size ?? null,
      });
    }
  }

  if (ctx.insured_person_id || ctx.insured_person_ssn) {
    const q = sb
      .from("ip_documents")
      .select("id, ssn, document_type, document_name, file_name, mime_type, file_size, uploaded_by, uploaded_at, dms_document_id, application_reference_number")
      .limit(500);
    if (ctx.insured_person_ssn) q.eq("ssn", ctx.insured_person_ssn);
    const r = await q;
    for (const d of safeArray<any>(r)) {
      out.push({
        key: `ip_documents:${d.id}`,
        source_module: "INSURED_PERSON_SERVICES",
        source_entity_type: "INSURED_PERSON",
        source_entity_id: String(d.ssn),
        source_reference: d.application_reference_number || String(d.ssn),
        title: d.document_name || d.file_name || "Member document",
        document_type_code: d.document_type ?? null,
        document_sub_type_code: null,
        uploaded_by: d.uploaded_by ?? null,
        uploaded_at: d.uploaded_at ?? null,
        confidential: true,
        dms_document_id: d.dms_document_id ?? null,
        dms_file_id: null,
        dms_url: null,
        file_name: d.file_name ?? null,
        mime_type: d.mime_type ?? null,
        size_bytes: d.file_size ?? null,
      });
    }
  }

  return out;
}

async function loadEmployer(ctx: SourceDocumentContext): Promise<SourceDocument[]> {
  const out: SourceDocument[] = [];
  if (!ctx.employer_id) return out;

  const r1 = await sb
    .from("er_documents")
    .select("id, regno, document_type, document_description, file_name, mime_type, file_size, uploaded_by, uploaded_by_code, created_at, dms_document_id, application_reference_number")
    .eq("regno", ctx.employer_id)
    .limit(500);
  for (const d of safeArray<any>(r1)) {
    out.push({
      key: `er_documents:${d.id}`,
      source_module: "EMPLOYER_SERVICES",
      source_entity_type: "EMPLOYER",
      source_entity_id: String(d.regno),
      source_reference: d.application_reference_number || String(d.regno),
      title: d.document_description || d.file_name || "Employer document",
      document_type_code: d.document_type ?? null,
      document_sub_type_code: null,
      uploaded_by: d.uploaded_by_code || d.uploaded_by || null,
      uploaded_at: d.created_at ?? null,
      confidential: false,
      dms_document_id: d.dms_document_id ?? null,
      dms_file_id: null,
      dms_url: null,
      file_name: d.file_name ?? null,
      mime_type: d.mime_type ?? null,
      size_bytes: d.file_size ?? null,
    });
  }

  const r2 = await sb
    .from("er_application_documents")
    .select("id, regno, doc_code, document_type, document_description, file_name, mime_type, file_size, uploaded_by_code, created_at, source_application_reference")
    .eq("regno", ctx.employer_id)
    .limit(500);
  for (const d of safeArray<any>(r2)) {
    out.push({
      key: `er_application_documents:${d.id}`,
      source_module: "EMPLOYER_SERVICES",
      source_entity_type: "EMPLOYER_APPLICATION",
      source_entity_id: String(d.regno),
      source_reference: d.source_application_reference || String(d.regno),
      title: d.document_description || d.file_name || "Employer application document",
      document_type_code: d.document_type || d.doc_code || null,
      document_sub_type_code: d.doc_code ?? null,
      uploaded_by: d.uploaded_by_code ?? null,
      uploaded_at: d.created_at ?? null,
      confidential: false,
      dms_document_id: null,
      dms_file_id: null,
      dms_url: null,
      file_name: d.file_name ?? null,
      mime_type: d.mime_type ?? null,
      size_bytes: d.file_size ?? null,
    });
  }
  return out;
}

/**
 * Load all source-module documents that are visible for a given context.
 * Safe to call with partial context — sections without keys are skipped.
 */
export async function loadSourceDocuments(ctx: SourceDocumentContext): Promise<SourceDocument[]> {
  const results = await Promise.allSettled([
    loadCompliance(ctx),
    loadBenefits(ctx),
    loadEmployer(ctx),
  ]);
  const all: SourceDocument[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
    else console.warn("[lg-source-docs] section failed", r.reason);
  }
  // De-dup
  const seen = new Set<string>();
  return all.filter(d => (seen.has(d.key) ? false : (seen.add(d.key), true)));
}

/** Build a context object from an `lg_case` row. */
export function contextFromLgCase(c: any): SourceDocumentContext {
  return {
    source_module: c.source_module ?? null,
    compliance_case_id: c.compliance_case_id ?? null,
    compliance_referral_id: c.compliance_referral_id ?? null,
    payment_arrangement_id: c.payment_arrangement_id ?? null,
    employer_id: c.employer_id ?? null,
    insured_person_id: c.person_id ?? null,
    insured_person_ssn: c.person_ssn ?? null,
    claim_id: c.claim_id ?? null,
    benefit_application_id: c.benefit_application_id ?? null,
    meeting_id: c.meeting_id ?? null,
  };
}

/** Build a context object from an `lg_case_intake` row. */
export function contextFromIntake(intake: any): SourceDocumentContext {
  const payload = intake?.payload ?? {};
  const ctx: SourceDocumentContext = {
    source_module: intake.source_module ?? null,
    compliance_case_id:
      intake.primary_entity_type === "COMPLIANCE_CASE" ? intake.primary_entity_id : payload.compliance_case_id ?? null,
    compliance_referral_id: payload.compliance_referral_id ?? null,
    payment_arrangement_id:
      intake.primary_entity_type === "PAYMENT_ARRANGEMENT" ? intake.primary_entity_id : payload.payment_arrangement_id ?? null,
    employer_id:
      intake.primary_entity_type === "EMPLOYER" ? intake.primary_entity_id : payload.employer_id ?? null,
    insured_person_id:
      intake.primary_entity_type === "INSURED_PERSON" ? intake.primary_entity_id : payload.insured_person_id ?? null,
    insured_person_ssn: payload.insured_person_ssn ?? null,
    claim_id: intake.primary_entity_type === "CLAIM" ? intake.primary_entity_id : payload.claim_id ?? null,
    benefit_application_id: payload.benefit_application_id ?? null,
    meeting_id: payload.meeting_id ?? null,
  };
  return ctx;
}

/**
 * Insert lg_document_link rows for a set of selected SourceDocuments.
 * Files stay in their owning module / DMS — only references are stored.
 */
export async function linkSourceDocumentsToCase(args: {
  lg_case_id: string;
  documents: SourceDocument[];
  linked_stage_code?: string | null;
  linked_by?: string | null;
  is_legally_relevant?: boolean;
  remarks?: string | null;
}): Promise<number> {
  if (!args.documents.length) return 0;
  const rows = args.documents.map(d => ({
    lg_case_id: args.lg_case_id,
    document_category_code: mapCategory(d),
    document_type_code: d.document_type_code,
    document_source: "SOURCE_MODULE",
    source_module: d.source_module,
    source_entity_type: d.source_entity_type,
    source_entity_id: d.source_entity_id,
    document_ref_id: null,
    document_ref_no: d.source_reference,
    title: d.title,
    file_name: d.file_name,
    mime_type: d.mime_type,
    size_bytes: d.size_bytes,
    dms_document_id: d.dms_document_id,
    dms_file_id: d.dms_file_id,
    dms_url: d.dms_url,
    confidential: d.confidential,
    uploaded_by: d.uploaded_by,
    uploaded_at: d.uploaded_at ?? new Date().toISOString(),
    linked_stage_code: args.linked_stage_code ?? null,
    linked_by: args.linked_by ?? null,
    is_legally_relevant: !!args.is_legally_relevant,
    notes: args.remarks ?? null,
  }));
  const { error, data } = await sb.from("lg_document_link").insert(rows).select("id");
  if (error) throw error;
  return data?.length ?? rows.length;
}

function mapCategory(d: SourceDocument): string {
  const t = (d.document_type_code || "").toUpperCase();
  if (t.includes("ORDER")) return "ORDER";
  if (t.includes("NOTICE")) return "NOTICE";
  if (t.includes("LETTER") || t.includes("CORRESP")) return "CORRESPONDENCE";
  if (t.includes("EVIDENCE") || t.includes("PROOF") || t.includes("MEDICAL")) return "EVIDENCE";
  if (t.includes("PLEAD")) return "PLEADING";
  return "EVIDENCE";
}
