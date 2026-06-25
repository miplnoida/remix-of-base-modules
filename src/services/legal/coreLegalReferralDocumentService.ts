/**
 * Core Legal Referral Document service
 * ------------------------------------
 * Links existing Compliance / Benefits documents AND new uploads to a Legal
 * Referral packet WITHOUT duplicating files.
 *
 * - Existing documents → stored as link rows pointing to original entity
 * - New uploads        → uploaded to `legal-referrals` storage bucket AND
 *                        enqueued in `dms_transfer_queue` for permanent
 *                        central-DMS storage. Permanent dms_document_id is
 *                        backfilled by the DMS worker.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type ReferralDocumentSource =
  | "EXISTING_COMPLIANCE"
  | "EXISTING_BENEFITS"
  | "NEW_UPLOAD"
  | "AUDIT"
  | "INSPECTION"
  | "EMPLOYER_RESPONSE"
  | "CORRESPONDENCE"
  | "PAYMENT_ARRANGEMENT"
  | "LEGAL_NOTICE"
  | "OTHER";

export interface ReferralDocumentDraft {
  source_module: "COMPLIANCE" | "BENEFITS" | "FINANCE";
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  source_reference_no?: string | null;
  dms_document_id?: string | null;
  dms_file_id?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  document_type_code?: string | null;
  document_sub_type_code?: string | null;
  document_source: ReferralDocumentSource;
  is_required?: boolean;
  is_legal_relevant?: boolean;
  display_title?: string | null;
  description?: string | null;
  referral_item_id?: string | null;
  metadata?: Record<string, any>;
}

export interface ReferralDocumentRow extends ReferralDocumentDraft {
  id: string;
  referral_id: string;
  transfer_status: "PENDING" | "UPLOADED" | "QUEUED" | "TRANSFERRED" | "FAILED" | "SKIPPED";
  transfer_error?: string | null;
  selected_by?: string | null;
  selected_at: string;
  created_at: string;
  updated_at: string;
}

const STORAGE_BUCKET = "legal-referrals";

export async function listReferralDocuments(referralId: string): Promise<ReferralDocumentRow[]> {
  const { data, error } = await sb
    .from("core_legal_referral_document")
    .select("*")
    .eq("referral_id", referralId)
    .order("selected_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReferralDocumentRow[];
}

export async function insertReferralDocuments(
  referralId: string,
  docs: ReferralDocumentDraft[],
  userCode?: string | null,
): Promise<ReferralDocumentRow[]> {
  if (!docs.length) return [];
  const rows = docs.map((d) => ({
    referral_id: referralId,
    is_required: false,
    is_legal_relevant: true,
    transfer_status: d.document_source === "NEW_UPLOAD" ? "UPLOADED" : "SKIPPED",
    metadata: d.metadata ?? {},
    selected_by: userCode ?? null,
    created_by: userCode ?? null,
    updated_by: userCode ?? null,
    ...d,
  }));
  const { data, error } = await sb
    .from("core_legal_referral_document")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []) as ReferralDocumentRow[];
}

export async function removeReferralDocument(id: string): Promise<void> {
  const { error } = await sb.from("core_legal_referral_document").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Upload a new file to the `legal-referrals` bucket. Returns a draft row.
 * Files are also enqueued for the central DMS worker (best-effort).
 */
export async function uploadNewReferralFile(params: {
  referralId?: string | null;
  sourceModule: "COMPLIANCE" | "BENEFITS" | "FINANCE";
  file: File;
  document_type_code?: string | null;
  document_sub_type_code?: string | null;
  display_title?: string | null;
  description?: string | null;
}): Promise<ReferralDocumentDraft> {
  const ts = Date.now();
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = params.referralId ?? "staging";
  const storagePath = `${folder}/${ts}_${safeName}`;

  const { error: upErr } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, params.file, {
      contentType: params.file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  return {
    source_module: params.sourceModule,
    source_entity_type: "REFERRAL_UPLOAD",
    source_entity_id: storagePath,
    document_source: "NEW_UPLOAD",
    storage_bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    file_name: params.file.name,
    file_size: params.file.size,
    mime_type: params.file.type || null,
    document_type_code: params.document_type_code ?? "NEW_REFERRAL_UPLOAD",
    document_sub_type_code: params.document_sub_type_code ?? null,
    display_title: params.display_title ?? params.file.name,
    description: params.description ?? null,
  };
}

export async function getDownloadUrl(
  bucket: string,
  path: string,
  expiresInSec = 600,
): Promise<string | null> {
  try {
    const { data } = await sb.storage.from(bucket).createSignedUrl(path, expiresInSec);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Existing-document discovery — COMPLIANCE
// ---------------------------------------------------------------------------

export interface ExistingDocOption {
  key: string;
  source_entity_type: string;
  source_entity_id: string;
  source_reference_no: string | null;
  document_type_code: string;
  document_sub_type_code: string | null;
  document_source: ReferralDocumentSource;
  display_title: string;
  file_name: string | null;
  mime_type: string | null;
  created_at: string | null;
  raw: any;
}

export async function listExistingComplianceDocs(params: {
  employerId?: string | null;
  ceCaseId?: string | null;
}): Promise<ExistingDocOption[]> {
  const out: ExistingDocOption[] = [];

  if (params.ceCaseId) {
    try {
      const { data } = await sb
        .from("ce_case_documents")
        .select("id, case_id, document_type, file_name, mime_type, created_at")
        .eq("case_id", params.ceCaseId)
        .limit(200);
      for (const r of data ?? []) {
        out.push({
          key: `CE_CASE_DOC:${r.id}`,
          source_entity_type: "CE_CASE_DOCUMENT",
          source_entity_id: r.id,
          source_reference_no: null,
          document_type_code: r.document_type ?? "CASE_DOC",
          document_sub_type_code: null,
          document_source: "EXISTING_COMPLIANCE",
          display_title: r.file_name ?? r.document_type ?? "Case Document",
          file_name: r.file_name ?? null,
          mime_type: r.mime_type ?? null,
          created_at: r.created_at ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }
  }

  if (params.employerId) {
    try {
      const { data } = await sb
        .from("ce_notices")
        .select("id, notice_number, notice_type, issue_date, employer_id, status")
        .eq("employer_id", params.employerId)
        .order("issue_date", { ascending: false })
        .limit(200);
      for (const r of data ?? []) {
        out.push({
          key: `CE_NOTICE:${r.id}`,
          source_entity_type: "CE_NOTICE",
          source_entity_id: r.id,
          source_reference_no: r.notice_number ?? null,
          document_type_code: r.notice_type ?? "NOTICE",
          document_sub_type_code: null,
          document_source: "LEGAL_NOTICE",
          display_title: `${r.notice_type ?? "Notice"} ${r.notice_number ?? ""}`.trim(),
          file_name: null,
          mime_type: null,
          created_at: r.issue_date ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }

    try {
      const { data: insp } = await sb
        .from("ce_inspections")
        .select("id, inspection_number, employer_id, status, scheduled_date")
        .eq("employer_id", params.employerId)
        .limit(100);
      const inspIds = (insp ?? []).map((i: any) => i.id);
      if (inspIds.length) {
        const { data: ev } = await sb
          .from("ce_inspection_evidence")
          .select("id, inspection_id, evidence_type, file_name, mime_type, created_at, description")
          .in("inspection_id", inspIds)
          .limit(300);
        for (const r of ev ?? []) {
          const parent = (insp ?? []).find((i: any) => i.id === r.inspection_id);
          out.push({
            key: `CE_INSP_EV:${r.id}`,
            source_entity_type: "CE_INSPECTION_EVIDENCE",
            source_entity_id: r.id,
            source_reference_no: parent?.inspection_number ?? null,
            document_type_code: r.evidence_type ?? "INSPECTION_EVIDENCE",
            document_sub_type_code: null,
            document_source: "INSPECTION",
            display_title: r.file_name ?? r.description ?? "Inspection Evidence",
            file_name: r.file_name ?? null,
            mime_type: r.mime_type ?? null,
            created_at: r.created_at ?? null,
            raw: r,
          });
        }
      }
    } catch { /* optional */ }

    try {
      const { data: ar } = await sb
        .from("ce_employer_audit_reports")
        .select("id, report_number, employer_id, status, created_at, report_type")
        .eq("employer_id", params.employerId)
        .order("created_at", { ascending: false })
        .limit(100);
      for (const r of ar ?? []) {
        out.push({
          key: `CE_AUDIT_RPT:${r.id}`,
          source_entity_type: "CE_AUDIT_REPORT",
          source_entity_id: r.id,
          source_reference_no: r.report_number ?? null,
          document_type_code: r.report_type ?? "AUDIT_REPORT",
          document_sub_type_code: null,
          document_source: "AUDIT",
          display_title: `Audit Report ${r.report_number ?? ""}`.trim(),
          file_name: null,
          mime_type: null,
          created_at: r.created_at ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }

    try {
      const { data: er } = await sb
        .from("ce_audit_employer_uploaded_documents")
        .select("id, audit_id, file_name, mime_type, created_at, document_type")
        .order("created_at", { ascending: false })
        .limit(100);
      for (const r of er ?? []) {
        out.push({
          key: `CE_EMP_RESP:${r.id}`,
          source_entity_type: "CE_AUDIT_EMP_DOC",
          source_entity_id: r.id,
          source_reference_no: null,
          document_type_code: r.document_type ?? "EMPLOYER_RESPONSE",
          document_sub_type_code: null,
          document_source: "EMPLOYER_RESPONSE",
          display_title: r.file_name ?? "Employer Response",
          file_name: r.file_name ?? null,
          mime_type: r.mime_type ?? null,
          created_at: r.created_at ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }
  }

  if (params.ceCaseId) {
    try {
      const { data: cc } = await sb
        .from("ce_case_correspondence")
        .select("id, case_id, correspondence_type, subject, sent_date, created_at")
        .eq("case_id", params.ceCaseId)
        .order("created_at", { ascending: false })
        .limit(100);
      for (const r of cc ?? []) {
        out.push({
          key: `CE_CASE_CORR:${r.id}`,
          source_entity_type: "CE_CASE_CORRESPONDENCE",
          source_entity_id: r.id,
          source_reference_no: null,
          document_type_code: r.correspondence_type ?? "CORRESPONDENCE",
          document_sub_type_code: null,
          document_source: "CORRESPONDENCE",
          display_title: r.subject ?? "Correspondence",
          file_name: null,
          mime_type: null,
          created_at: r.created_at ?? r.sent_date ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Existing-document discovery — BENEFITS
// ---------------------------------------------------------------------------

export async function listExistingBenefitsDocs(params: {
  claimId?: string | null;
  ssn?: string | null;
}): Promise<ExistingDocOption[]> {
  const out: ExistingDocOption[] = [];

  if (params.claimId) {
    try {
      const { data } = await sb
        .from("bn_claim_document")
        .select("id, claim_id, document_type, file_name, mime_type, created_at")
        .eq("claim_id", params.claimId)
        .limit(300);
      for (const r of data ?? []) {
        out.push({
          key: `BN_CLAIM_DOC:${r.id}`,
          source_entity_type: "BN_CLAIM_DOCUMENT",
          source_entity_id: r.id,
          source_reference_no: null,
          document_type_code: r.document_type ?? "CLAIM_DOC",
          document_sub_type_code: null,
          document_source: "EXISTING_BENEFITS",
          display_title: r.file_name ?? r.document_type ?? "Claim Document",
          file_name: r.file_name ?? null,
          mime_type: r.mime_type ?? null,
          created_at: r.created_at ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }

    try {
      const { data } = await sb
        .from("bn_claim_evidence")
        .select("id, claim_id, evidence_type, file_name, mime_type, created_at, description")
        .eq("claim_id", params.claimId)
        .limit(200);
      for (const r of data ?? []) {
        out.push({
          key: `BN_CLAIM_EV:${r.id}`,
          source_entity_type: "BN_CLAIM_EVIDENCE",
          source_entity_id: r.id,
          source_reference_no: null,
          document_type_code: r.evidence_type ?? "CLAIM_EVIDENCE",
          document_sub_type_code: null,
          document_source: "EXISTING_BENEFITS",
          display_title: r.file_name ?? r.description ?? "Claim Evidence",
          file_name: r.file_name ?? null,
          mime_type: r.mime_type ?? null,
          created_at: r.created_at ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }

    try {
      const { data } = await sb
        .from("bn_communication_log")
        .select("id, claim_id, channel, subject, created_at")
        .eq("claim_id", params.claimId)
        .order("created_at", { ascending: false })
        .limit(100);
      for (const r of data ?? []) {
        out.push({
          key: `BN_COMM:${r.id}`,
          source_entity_type: "BN_COMMUNICATION_LOG",
          source_entity_id: r.id,
          source_reference_no: null,
          document_type_code: r.channel ?? "COMMUNICATION",
          document_sub_type_code: null,
          document_source: "CORRESPONDENCE",
          display_title: r.subject ?? "Communication",
          file_name: null,
          mime_type: null,
          created_at: r.created_at ?? null,
          raw: r,
        });
      }
    } catch { /* optional */ }
  }

  return out;
}
