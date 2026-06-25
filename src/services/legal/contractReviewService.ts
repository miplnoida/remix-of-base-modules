import { supabase } from "@/integrations/supabase/client";

export const CONTRACT_TYPES = [
  "CONTRACT_REVIEW",
  "MOU_REVIEW",
  "SERVICE_AGREEMENT_REVIEW",
  "PROCUREMENT_CONTRACT_REVIEW",
  "LEASE_REVIEW",
  "SOFTWARE_LICENSE_REVIEW",
  "DATA_SHARING_AGREEMENT",
  "NDA_REVIEW",
  "POLICY_LEGAL_REVIEW",
  "INTERNAL_LEGAL_ADVICE",
] as const;

export const SOURCE_DEPARTMENTS = [
  "Procurement", "Finance", "HR", "IT", "Benefits", "Compliance",
  "Employers Services", "IP Management", "Executive Office",
  "Board Secretariat", "Internal Audit", "Communications", "Projects / PMO",
] as const;

export const REVIEW_STATUSES = [
  "DRAFT", "SUBMITTED_TO_LEGAL", "UNDER_LEGAL_REVIEW", "INFO_REQUESTED",
  "INTERNAL_COMMENTS_PENDING", "SENT_TO_THIRD_PARTY", "THIRD_PARTY_RESPONSE_RECEIVED",
  "APPROVED_WITH_COMMENTS", "APPROVED_FINAL", "REJECTED", "CLOSED",
] as const;

export type ContractReview = {
  id: string;
  request_no: string;
  source_department: string;
  requested_by?: string | null;
  contract_title: string;
  contract_type: string;
  counterparty_name?: string | null;
  contract_value?: number | null;
  currency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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
  // Use sequence via RPC fallback: fetch count + timestamp.
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

export async function createReview(input: Partial<ContractReview> & { contract_title: string; contract_type: string; source_department: string }) {
  const request_no = await nextRequestNo();
  const sla_days = input.urgency === "URGENT" ? 3 : input.urgency === "HIGH" ? 5 : 10;
  const sla_due_at = new Date(Date.now() + sla_days * 86400000).toISOString();
  const row = {
    ...input,
    request_no,
    status: input.status ?? "SUBMITTED_TO_LEGAL",
    sla_due_at,
    sla_status: "ON_TIME",
  };
  const { data, error } = await (supabase as any).from(TABLE).insert(row).select("*").single();
  if (error) throw error;
  await logActivity(data.id, "CREATED", `Contract review ${request_no} submitted from ${input.source_department}`);
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

export async function listDocuments(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_document").select("*").eq("review_id", review_id).order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addDocument(review_id: string, doc: any) {
  const { data, error } = await (supabase as any).from("lg_contract_review_document").insert({ review_id, ...doc }).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "DOCUMENT_ADDED", `Added ${doc.document_kind}: ${doc.file_name ?? ""}`);
  return data;
}

export async function listVersions(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_version").select("*").eq("review_id", review_id).order("version_no", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addVersion(review_id: string, version_label: string, notes?: string, dms_document_id?: string) {
  const existing = await listVersions(review_id);
  const version_no = (existing[0]?.version_no ?? 0) + 1;
  await (supabase as any).from("lg_contract_review_version").update({ is_current: false }).eq("review_id", review_id);
  const { data, error } = await (supabase as any).from("lg_contract_review_version")
    .insert({ review_id, version_no, version_label, notes, dms_document_id, is_current: true })
    .select("*").single();
  if (error) throw error;
  await logActivity(review_id, "VERSION_ADDED", `Version ${version_no} (${version_label})`);
  return data;
}

export async function listComments(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_comment").select("*").eq("review_id", review_id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(review_id: string, c: any) {
  const { data, error } = await (supabase as any).from("lg_contract_review_comment").insert({ review_id, ...c }).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateComment(id: string, patch: any) {
  const { data, error } = await (supabase as any).from("lg_contract_review_comment").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function listCycles(review_id: string) {
  const { data, error } = await (supabase as any)
    .from("lg_contract_review_cycle").select("*").eq("review_id", review_id).order("cycle_no", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addCycle(review_id: string, c: any) {
  const existing = await listCycles(review_id);
  const cycle_no = (existing[0]?.cycle_no ?? 0) + 1;
  const { data, error } = await (supabase as any).from("lg_contract_review_cycle").insert({ review_id, cycle_no, ...c }).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "CYCLE_STARTED", `Cycle ${cycle_no}: ${c.cycle_direction}`);
  return data;
}

export async function listChecklistItems(contract_type: string) {
  const { data, error } = await (supabase as any).from("lg_contract_checklist")
    .select("*").eq("contract_type", contract_type).eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function listChecklistResponses(review_id: string) {
  const { data, error } = await (supabase as any).from("lg_contract_checklist_response")
    .select("*").eq("review_id", review_id);
  if (error) throw error;
  return data ?? [];
}

export async function upsertChecklistResponse(review_id: string, checklist_item_id: string, status: string, notes?: string) {
  const { data, error } = await (supabase as any).from("lg_contract_checklist_response")
    .upsert({ review_id, checklist_item_id, status, notes, reviewed_at: new Date().toISOString() }, { onConflict: "review_id,checklist_item_id" })
    .select("*").single();
  if (error) throw error;
  return data;
}

export async function listActivity(review_id: string) {
  const { data, error } = await (supabase as any).from("lg_contract_activity")
    .select("*").eq("review_id", review_id).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listAiAnalyses(review_id: string) {
  const { data, error } = await (supabase as any).from("lg_contract_ai_analysis")
    .select("*").eq("review_id", review_id).order("generated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveAiAnalysis(payload: any) {
  const { data, error } = await (supabase as any).from("lg_contract_ai_analysis").insert(payload).select("*").single();
  if (error) throw error;
  await logActivity(payload.review_id, "AI_ANALYSIS", `AI analysis generated (${payload.model})`);
  return data;
}

export async function listShares(review_id: string) {
  const { data, error } = await (supabase as any).from("lg_contract_external_share")
    .select("*").eq("review_id", review_id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createShare(review_id: string, s: any) {
  const share_token = crypto.randomUUID().replace(/-/g, "");
  const { data, error } = await (supabase as any).from("lg_contract_external_share")
    .insert({ review_id, share_token, ...s }).select("*").single();
  if (error) throw error;
  await logActivity(review_id, "EXTERNAL_SHARE", `Shared with ${s.recipient_name} (${s.recipient_email})`);
  return data;
}

export async function revokeShare(id: string, user_code?: string) {
  const { data, error } = await (supabase as any).from("lg_contract_external_share")
    .update({ revoked_at: new Date().toISOString(), revoked_by_user_code: user_code })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
