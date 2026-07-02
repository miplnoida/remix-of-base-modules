import { supabase } from "@/integrations/supabase/client";
import {
  resolveLegalEnterprise,
  type LegalEnterpriseDocMetadata,
} from "@/lib/enterprise/legalEnterpriseMetadata";

export type LgConfidentialityLevel = "PUBLIC" | "INTERNAL" | "RESTRICTED" | "SECRET";

export interface LgDocumentLink {
  id: string;
  lg_case_id: string;
  document_category_code: string;
  document_type_code: string | null;
  document_source: string;
  document_ref_id: string | null;
  document_ref_no: string | null;
  title: string | null;
  notes: string | null;
  linked_stage_code: string | null;
  hearing_id: string | null;
  order_id: string | null;
  settlement_id: string | null;
  notice_id: string | null;
  fee_charge_id: string | null;
  referral_id: string | null;
  intake_id: string | null;
  version_no: number;
  court_filed: boolean;
  filed_date: string | null;
  confidential: boolean;
  confidentiality_level: LgConfidentialityLevel;
  marked_as_evidence: boolean;
  evidence_marked_by: string | null;
  evidence_marked_at: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  linked_by: string | null;
  linked_at: string;
  enterprise_metadata?: LegalEnterpriseDocMetadata | null;
}

export type LgDocumentLinkInsert = Omit<
  LgDocumentLink,
  | "id"
  | "uploaded_at"
  | "linked_at"
  | "version_no"
  | "enterprise_metadata"
  | "marked_as_evidence"
  | "evidence_marked_by"
  | "evidence_marked_at"
  | "confidentiality_level"
> & {
  version_no?: number;
  confidentiality_level?: LgConfidentialityLevel;
  marked_as_evidence?: boolean;
  enterprise_metadata?: LegalEnterpriseDocMetadata | null;
};

const TABLE = "lg_document_link" as const;

async function logDocActivity(
  caseId: string,
  action: string,
  actor: string | null,
  payload: Record<string, unknown>,
) {
  try {
    await (supabase as any).from("lg_case_activity").insert({
      lg_case_id: caseId,
      activity_type: action,
      actor_user_code: actor,
      payload,
    });
  } catch {
    // Non-blocking audit failure — do not fail the primary mutation.
  }
}

export async function listLgDocumentLinks(caseId: string): Promise<LgDocumentLink[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("lg_case_id", caseId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LgDocumentLink[];
}

export interface LgDocumentSearchFilters {
  caseId?: string;
  referralId?: string;
  intakeId?: string;
  hearingId?: string;
  orderId?: string;
  noticeId?: string;
  categoryCode?: string;
  typeCode?: string;
  source?: string;
  confidentialityLevel?: LgConfidentialityLevel;
  markedAsEvidence?: boolean;
  courtFiled?: boolean;
  searchText?: string;
  limit?: number;
}

/**
 * Cross-matter search across every lg_document_link row for the
 * global Legal Document Center. Server-side filters keep the payload small.
 */
export async function searchLgDocumentLinks(
  filters: LgDocumentSearchFilters = {},
): Promise<LgDocumentLink[]> {
  let q = (supabase as any).from(TABLE).select("*");
  if (filters.caseId) q = q.eq("lg_case_id", filters.caseId);
  if (filters.referralId) q = q.eq("referral_id", filters.referralId);
  if (filters.intakeId) q = q.eq("intake_id", filters.intakeId);
  if (filters.hearingId) q = q.eq("hearing_id", filters.hearingId);
  if (filters.orderId) q = q.eq("order_id", filters.orderId);
  if (filters.noticeId) q = q.eq("notice_id", filters.noticeId);
  if (filters.categoryCode) q = q.eq("document_category_code", filters.categoryCode);
  if (filters.typeCode) q = q.eq("document_type_code", filters.typeCode);
  if (filters.source) q = q.eq("document_source", filters.source);
  if (filters.confidentialityLevel) q = q.eq("confidentiality_level", filters.confidentialityLevel);
  if (typeof filters.markedAsEvidence === "boolean") q = q.eq("marked_as_evidence", filters.markedAsEvidence);
  if (typeof filters.courtFiled === "boolean") q = q.eq("court_filed", filters.courtFiled);
  if (filters.searchText && filters.searchText.trim()) {
    const s = filters.searchText.trim().replace(/[%_]/g, "\\$&");
    q = q.or(
      `title.ilike.%${s}%,document_ref_no.ilike.%${s}%,file_name.ilike.%${s}%,notes.ilike.%${s}%`,
    );
  }
  q = q.order("uploaded_at", { ascending: false }).limit(filters.limit ?? 500);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LgDocumentLink[];
}

export async function createLgDocumentLink(input: LgDocumentLinkInsert): Promise<LgDocumentLink> {
  let metadata = input.enterprise_metadata ?? null;
  if (!metadata) {
    try {
      const resolved = await resolveLegalEnterprise({
        matterId: input.lg_case_id,
        matterKind: "LG_CASE",
        documentType: input.document_type_code ?? null,
        confidential: !!input.confidential,
      });
      metadata = resolved.metadata;
    } catch {
      metadata = null;
    }
  }

  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({
      ...input,
      confidentiality_level: input.confidentiality_level ?? (input.confidential ? "RESTRICTED" : "INTERNAL"),
      enterprise_metadata: metadata,
    })
    .select("*")
    .single();
  if (error) throw error;
  const row = data as LgDocumentLink;
  await logDocActivity(row.lg_case_id, "DOCUMENT_LINKED", input.uploaded_by ?? input.linked_by ?? null, {
    document_link_id: row.id,
    title: row.title,
    document_type_code: row.document_type_code,
    document_source: row.document_source,
  });
  return row;
}

export async function deleteLgDocumentLink(id: string, actor?: string | null): Promise<void> {
  const { data: existing } = await (supabase as any)
    .from(TABLE)
    .select("id, lg_case_id, title")
    .eq("id", id)
    .maybeSingle();
  const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
  if (error) throw error;
  if (existing?.lg_case_id) {
    await logDocActivity(existing.lg_case_id, "DOCUMENT_UNLINKED", actor ?? null, {
      document_link_id: id,
      title: existing.title,
    });
  }
}

export async function setLgDocumentEvidence(
  id: string,
  marked: boolean,
  actor?: string | null,
): Promise<void> {
  const { data: existing } = await (supabase as any)
    .from(TABLE)
    .select("lg_case_id")
    .eq("id", id)
    .maybeSingle();
  const patch = marked
    ? { marked_as_evidence: true, evidence_marked_by: actor ?? null, evidence_marked_at: new Date().toISOString() }
    : { marked_as_evidence: false, evidence_marked_by: null, evidence_marked_at: null };
  const { error } = await (supabase as any).from(TABLE).update(patch).eq("id", id);
  if (error) throw error;
  if (existing?.lg_case_id) {
    await logDocActivity(existing.lg_case_id, marked ? "DOCUMENT_MARKED_EVIDENCE" : "DOCUMENT_UNMARKED_EVIDENCE", actor ?? null, {
      document_link_id: id,
    });
  }
}

export async function setLgDocumentConfidentialityLevel(
  id: string,
  level: LgConfidentialityLevel,
  actor?: string | null,
): Promise<void> {
  const { data: existing } = await (supabase as any)
    .from(TABLE)
    .select("lg_case_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({ confidentiality_level: level, confidential: level === "RESTRICTED" || level === "SECRET" })
    .eq("id", id);
  if (error) throw error;
  if (existing?.lg_case_id) {
    await logDocActivity(existing.lg_case_id, "DOCUMENT_CONFIDENTIALITY_CHANGED", actor ?? null, {
      document_link_id: id,
      confidentiality_level: level,
    });
  }
}

export async function associateLgDocument(
  id: string,
  assoc: { hearing_id?: string | null; order_id?: string | null; notice_id?: string | null; settlement_id?: string | null },
  actor?: string | null,
): Promise<void> {
  const { data: existing } = await (supabase as any)
    .from(TABLE)
    .select("lg_case_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await (supabase as any).from(TABLE).update(assoc).eq("id", id);
  if (error) throw error;
  if (existing?.lg_case_id) {
    await logDocActivity(existing.lg_case_id, "DOCUMENT_ASSOCIATED", actor ?? null, {
      document_link_id: id,
      ...assoc,
    });
  }
}
