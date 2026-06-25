import { supabase } from "@/integrations/supabase/client";

// Unified Legal Advice Request — request types (stored in contract_type column).
export const REQUEST_TYPES = [
  "CONTRACT_REVIEW",
  "NDA_REVIEW",
  "MOU_REVIEW",
  "POLICY_REVIEW",
  "DATA_SHARING_REVIEW",
  "PROCUREMENT_REVIEW",
  "HR_DOCUMENT_REVIEW",
  "IT_SOFTWARE_REVIEW",
  "INTERNAL_LEGAL_ADVICE",
  "OTHER_DOCUMENT_REVIEW",
] as const;
// Back-compat alias used by older imports.
export const CONTRACT_TYPES = REQUEST_TYPES;

export const ORIGIN_TYPES = [
  "SOURCE_DEPARTMENT_SUBMISSION",
  "LEGAL_CREATED_OFFLINE",
  "LEGAL_CREATED_INTERNAL",
  "EXECUTIVE_INSTRUCTION",
  "BOARD_INSTRUCTION",
  "THIRD_PARTY_RECEIVED",
] as const;

export const RECEIVED_CHANNELS = [
  "PORTAL", "EMAIL", "PHYSICAL_DOCUMENT", "MEETING", "PHONE",
  "BOARD_MINUTE", "EXECUTIVE_INSTRUCTION", "THIRD_PARTY_EMAIL",
] as const;

export const DOCUMENT_SOURCES = [
  "SOURCE_DEPARTMENT", "LEGAL_UPLOAD", "THIRD_PARTY", "DMS_LINKED_EXISTING",
] as const;

export const SOURCE_DEPARTMENTS = [
  "Procurement", "Finance", "HR", "IT", "Benefits", "Compliance",
  "Employers Services", "IP Management", "Executive Office",
  "Board Secretariat", "Internal Audit", "Communications", "Projects / PMO",
] as const;

export const REVIEW_STATUSES = [
  "DRAFT_REQUEST",
  "SUBMITTED_TO_LEGAL",
  "LEGAL_TRIAGE",
  "UNDER_REVIEW",
  "INFO_REQUESTED",
  "SOURCE_RESPONSE_RECEIVED",
  "LEGAL_COMMENTS_ISSUED",
  "THIRD_PARTY_REVIEW",
  "FINAL_LEGAL_REVIEW",
  "APPROVED_WITH_COMMENTS",
  "APPROVED_FINAL",
  "REJECTED",
  "CLOSED",
] as const;

export const VALUE_TYPES = [
  "NONE", "FIXED_AMOUNT", "ESTIMATED", "THRESHOLD_BASED", "RECURRING", "UNKNOWN",
] as const;

export const DOCUMENT_ROLES = [
  "ORIGINAL_DRAFT",
  "SUPPORTING_DOCUMENT",
  "LEGAL_REVIEWED_VERSION",
  "SOURCE_REVISED_VERSION",
  "COUNTERPARTY_VERSION",
  "FINAL_APPROVED_VERSION",
  "SIGNED_VERSION",
] as const;

export const CONFIDENTIALITY_LEVELS = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"] as const;

export const STORAGE_BUCKET = "legal-contract-docs";

export type ContractReview = {
  id: string;
  request_no: string;
  source_department: string;
  requested_by?: string | null;
  requested_by_user_code?: string | null;
  contract_title: string;
  contract_type: string;
  counterparty_name?: string | null;
  counterparty_contact?: string | null;
  has_financial_value?: boolean | null;
  value_type?: string | null;
  contract_value?: number | null;
  currency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  renewal_terms?: string | null;
  urgency?: string | null;
  requested_deadline?: string | null;
  purpose_of_contract?: string | null;
  background_notes?: string | null;
  specific_questions_for_legal?: string | null;
  confidentiality_level?: string | null;
  third_party_sharing_allowed?: boolean | null;
  status: string;
  assigned_to_user_code?: string | null;
  sla_due_at?: string | null;
  sla_status?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
};

const TABLE = "lg_contract_review" as const;

async function nextRequestNo(): Promise<string> {
  const yr = new Date().getFullYear();
  const { count } = await (supabase as any)
    .from(TABLE)
    .select("id", { count: "exact", head: true });
  const seq = (count ?? 0) + 1;
  return `LCR-${yr}-${String(seq).padStart(5, "0")}`;
}

export async function listReviews(filters: { status?: string; source_department?: string; mineUserCode?: string } = {}) {
  let q = (supabase as any).from(TABLE).select("*").order("created_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.source_department) q = q.eq("source_department", filters.source_department);
  if (filters.mineUserCode) q = q.or(`requested_by_user_code.eq.${filters.mineUserCode},assigned_to_user_code.eq.${filters.mineUserCode}`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ContractReview[];
}

export async function getReview(id: string) {
  const { data, error } = await (supabase as any).from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ContractReview | null;
}

export async function createReview(input: Partial<ContractReview> & { contract_title: string; contract_type: string; source_department?: string | null } & Record<string, any>) {
  const request_no = await nextRequestNo();
  const sla_days = input.urgency === "URGENT" ? 3 : input.urgency === "HIGH" ? 5 : 10;
  const sla_due_at = new Date(Date.now() + sla_days * 86400000).toISOString();
  const has_fv = !!input.has_financial_value;
  const origin_type = (input as any).origin_type || "SOURCE_DEPARTMENT_SUBMISSION";
  const isLegalCreated = origin_type !== "SOURCE_DEPARTMENT_SUBMISSION";
  const row = {
    ...input,
    has_financial_value: has_fv,
    value_type: has_fv ? (input.value_type ?? "FIXED_AMOUNT") : "NONE",
    contract_value: has_fv ? (input.contract_value ?? null) : null,
    currency: has_fv ? (input.currency ?? null) : null,
    request_no,
    origin_type,
    // Legal-created starts at OPENED_BY_LEGAL (skips "Submit to Legal" gate);
    // source-dept submissions start at DRAFT_REQUEST and auto-promote on first doc.
    status: input.status ?? (isLegalCreated ? "OPENED_BY_LEGAL" : "DRAFT_REQUEST"),
    sla_due_at,
    sla_status: "ON_TIME",
  };
  const { data, error } = await (supabase as any).from(TABLE).insert(row).select("*").single();
  if (error) throw error;
  await logActivity(
    data.id,
    "CREATED",
    isLegalCreated
      ? `Legal-created request ${request_no} (${origin_type})`
      : `Contract review ${request_no} submitted from ${input.source_department ?? "—"}`,
  );
  return data as ContractReview;
}

export async function updateReview(id: string, patch: Partial<ContractReview>) {
  const { data, error } = await (supabase as any).from(TABLE).update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as ContractReview;
}

export async function setStatus(id: string, status: string, note?: string) {
  const r = await updateReview(id, { status });
  await logActivity(id, "STATUS_CHANGED", note ?? `Status changed to ${status}`);
  return r;
}

export async function logActivity(review_id: string, activity_type: string, description: string, metadata?: any) {
  await (supabase as any).from("lg_contract_activity").insert({ review_id, activity_type, description, metadata });
}

// ---------- Documents ----------

export async function listDocuments(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_document").select("*").eq("review_id", review_id).order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadDocumentFile(review_id: string, file: File): Promise<{ storage_path: string }> {
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
  const storage_path = `${review_id}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storage_path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return { storage_path };
}

export async function getDocumentSignedUrl(storage_path: string, expires = 600) {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storage_path, expires);
  if (error) throw error;
  return data.signedUrl;
}

export async function addDocument(review_id: string, doc: {
  document_role: string;
  document_kind?: string;
  file_name?: string | null;
  dms_document_id?: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  confidentiality_level?: string | null;
  ai_analysis_allowed?: boolean;
  version_no?: number | null;
  uploaded_by_user_code?: string | null;
  source_department?: string | null;
}) {
  const payload = {
    review_id,
    document_kind: doc.document_kind ?? doc.document_role,
    ...doc,
  };
  const { data, error } = await (supabase as any).from("lg_contract_review_document").insert(payload).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "DOCUMENT_ADDED", `${doc.document_role}: ${doc.file_name ?? doc.dms_document_id ?? ""}`);
  // Auto-promote on first document
  try {
    const review = await getReview(review_id);
    if (review?.status === "DRAFT_REQUEST") {
      await updateReview(review_id, { status: "SUBMITTED_TO_LEGAL" });
      await logActivity(review_id, "STATUS_CHANGED", "Auto-submitted to Legal after first document attached");
    } else if (review?.status === "OPENED_BY_LEGAL") {
      await updateReview(review_id, { status: "UNDER_LEGAL_REVIEW" });
      await logActivity(review_id, "STATUS_CHANGED", "Activated to Under Legal Review (Legal-created request)");
    }
  } catch { /* non-blocking */ }
  return data;
}

// ---------- Versions ----------

export async function listVersions(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_version").select("*").eq("review_id", review_id).order("version_no", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addVersion(review_id: string, version_label: string, notes?: string, dms_document_id?: string) {
  const existing = await listVersions(review_id);
  const version_no = (existing[0]?.version_no ?? 0) + 1;
  const { data, error } = await (supabase as any).from("lg_contract_review_version")
    .insert({ review_id, version_no, version_label, notes, dms_document_id }).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "VERSION_ADDED", `v${version_no}: ${version_label}`);
  return data;
}

// ---------- Comments ----------

export async function listComments(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_comment").select("*").eq("review_id", review_id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(review_id: string, comment: any) {
  const { data, error } = await (supabase as any).from("lg_contract_review_comment").insert({ review_id, ...comment }).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "COMMENT_ADDED", comment.comment_text?.slice(0, 80) ?? "");
  return data;
}

// ---------- AI ----------

export async function listAiAnalyses(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_ai_analysis").select("*").eq("review_id", review_id).order("generated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveAiAnalysis(row: any) {
  const { data, error } = await (supabase as any).from("lg_contract_ai_analysis").insert(row).select("*").single();
  if (error) throw error;
  await logActivity(row.review_id, "AI_ANALYSIS", `Analysis generated by ${row.model}`);
  return data;
}

// ---------- Activity ----------

export async function listActivity(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_activity").select("*").eq("review_id", review_id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- Cycles / Checklist / Share ----------

export async function listCycles(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_cycle").select("*").eq("review_id", review_id).order("cycle_no", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listChecklistResponses(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_checklist_response").select("*").eq("review_id", review_id);
  if (error) throw error;
  return data ?? [];
}

export async function listExternalShares(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_external_share").select("*").eq("review_id", review_id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- Checklist items (templates) ----------

export async function listChecklistItems(contract_type: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_checklist").select("*").eq("contract_type", contract_type).order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertChecklistResponse(review_id: string, checklist_item_id: string, status: string, notes?: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_checklist_response")
    .upsert({ review_id, checklist_item_id, status, notes }, { onConflict: "review_id,checklist_item_id" })
    .select("*").single();
  if (error) throw error;
  return data;
}

// ---------- Comments helpers ----------

export async function updateComment(id: string, patch: any) {
  const { data, error } = await (supabase as any).from("lg_contract_review_comment").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

// ---------- Cycles helpers ----------

export async function addCycle(review_id: string, cycle: any) {
  const existing = await listCycles(review_id);
  const cycle_no = (existing[0]?.cycle_no ?? 0) + 1;
  const { data, error } = await (supabase as any).from("lg_contract_review_cycle")
    .insert({ review_id, cycle_no, status: "OPEN", sent_date: new Date().toISOString(), ...cycle }).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "CYCLE_STARTED", `Cycle #${cycle_no} ${cycle.cycle_direction}`);
  return data;
}

// ---------- External shares ----------

function randomToken(len = 40) {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(36).padStart(2, "0")).join("").slice(0, len);
}

export async function listShares(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_external_share").select("*").eq("review_id", review_id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createShare(review_id: string, share: any) {
  const token = randomToken();
  const { data, error } = await (supabase as any).from("lg_contract_external_share")
    .insert({ review_id, status: "ACTIVE", share_token: token, ...share }).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "EXTERNAL_SHARE_CREATED", `Shared with ${share.recipient_email}`);
  return data;
}

export async function revokeShare(id: string, by_user_code?: string) {
  const { data, error } = await (supabase as any).from("lg_contract_external_share")
    .update({ status: "REVOKED", revoked_at: new Date().toISOString(), revoked_by_user_code: by_user_code ?? null })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
