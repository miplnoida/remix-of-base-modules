/**
 * Legal Case Integrity Service
 * ----------------------------
 * Detects and repairs structurally broken Legal Cases:
 *   - zero amount despite source exposure
 *   - missing parties / recipient address
 *   - missing child actions
 *   - missing source documents
 *   - financial snapshot drift
 *
 * Repair simply re-runs `enrichCaseFromSource`, which is idempotent.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  enrichCaseFromSource,
  refreshFinancialSnapshot,
  type EnrichmentResult,
} from "./legalCaseEnrichmentService";

const sb = supabase as any;

export interface CaseIntegrityIssue {
  code: string;
  severity: "ERROR" | "WARN";
  message: string;
}

export interface CaseIntegrityRow {
  lg_case_id: string;
  lg_case_no: string;
  source_module: string | null;
  source_record_id: string | null;
  claim_amount: number | null;
  total_outstanding: number | null;
  parties_count: number;
  actions_count: number;
  documents_count: number;
  source_exposure: number | null;
  source_documents: number;
  issues: CaseIntegrityIssue[];
  is_clean: boolean;
}

async function getSourceExposureAndDocs(lgCase: any): Promise<{ exposure: number | null; docs: number }> {
  const mod = String(lgCase.source_module ?? "").toUpperCase();
  if (mod === "BENEFITS") {
    const claimId = lgCase.source_record_id || lgCase.primary_entity_id;
    if (!claimId) return { exposure: null, docs: 0 };
    const { data: ref } = await sb
      .from("bn_legal_referral")
      .select("exposure_amount, total_referred_amount, id")
      .eq("source_claim_id", claimId)
      .maybeSingle();
    let docCount = 0;
    if (ref?.id) {
      const { count } = await sb
        .from("core_legal_referral_document")
        .select("id", { count: "exact", head: true })
        .eq("referral_id", ref.id);
      docCount += count ?? 0;
    }
    const { count: claimDocs } = await sb
      .from("bn_claim_document")
      .select("id", { count: "exact", head: true })
      .eq("claim_id", claimId);
    docCount += claimDocs ?? 0;
    return {
      exposure: Number(ref?.total_referred_amount ?? ref?.exposure_amount ?? 0) || null,
      docs: docCount,
    };
  }
  if (mod === "COMPLIANCE") {
    const ceCaseId = lgCase.source_record_id || lgCase.compliance_case_id;
    if (!ceCaseId) return { exposure: null, docs: 0 };
    const { data: ref } = await sb
      .from("ce_legal_referrals")
      .select("id, total_referred_amount, exposure_amount")
      .eq("legal_case_id", lgCase.id)
      .maybeSingle();
    let docs = 0;
    if (ref?.id) {
      const { count } = await sb
        .from("core_legal_referral_document")
        .select("id", { count: "exact", head: true })
        .eq("referral_id", ref.id);
      docs = count ?? 0;
    }
    return { exposure: Number(ref?.total_referred_amount ?? ref?.exposure_amount ?? 0) || null, docs };
  }
  return { exposure: null, docs: 0 };
}

export async function auditCase(lgCaseId: string): Promise<CaseIntegrityRow | null> {
  const { data: lgCase } = await sb.from("lg_case").select("*").eq("id", lgCaseId).maybeSingle();
  if (!lgCase) return null;
  const [{ count: pc }, { count: ac }, { count: dc }] = await Promise.all([
    sb.from("lg_case_party").select("id", { count: "exact", head: true }).eq("lg_case_id", lgCaseId),
    sb.from("lg_case_action").select("id", { count: "exact", head: true }).eq("case_id", lgCaseId),
    sb.from("lg_document_link").select("id", { count: "exact", head: true }).eq("lg_case_id", lgCaseId),
  ]);
  const partiesCount = pc ?? 0;
  const actionsCount = ac ?? 0;
  const documentsCount = dc ?? 0;

  // Recipient party check: needs at least one party with address
  const { data: partyRows } = await sb
    .from("lg_case_party")
    .select("party_role, contact_info")
    .eq("lg_case_id", lgCaseId);
  const hasRecipientAddress = (partyRows ?? []).some((p: any) => {
    const c = p.contact_info ?? {};
    return p.party_role !== "COMPLAINANT" && (c.address_line1 || c.address_line2);
  });

  const src = await getSourceExposureAndDocs(lgCase);
  const claimAmount = Number(lgCase.claim_amount ?? 0);

  const issues: CaseIntegrityIssue[] = [];
  if (partiesCount === 0) issues.push({ code: "NO_PARTIES", severity: "ERROR", message: "Case has no parties" });
  if (!hasRecipientAddress)
    issues.push({ code: "NO_RECIPIENT_ADDRESS", severity: "ERROR", message: "No party has a usable address for letters" });
  if (actionsCount === 0)
    issues.push({ code: "NO_CHILD_ACTIONS", severity: "ERROR", message: "No child actions imported from source" });
  if (claimAmount === 0 && (src.exposure ?? 0) > 0)
    issues.push({
      code: "ZERO_AMOUNT_VS_SOURCE",
      severity: "ERROR",
      message: `Claim amount is 0 but source has exposure ${src.exposure}`,
    });
  if (documentsCount === 0 && src.docs > 0)
    issues.push({
      code: "MISSING_DOCS",
      severity: "WARN",
      message: `Source has ${src.docs} document(s) but none linked to legal case`,
    });
  if (!lgCase.source_module)
    issues.push({ code: "NO_SOURCE_MODULE", severity: "WARN", message: "source_module is missing on the case" });

  return {
    lg_case_id: lgCase.id,
    lg_case_no: lgCase.lg_case_no,
    source_module: lgCase.source_module,
    source_record_id: lgCase.source_record_id,
    claim_amount: claimAmount,
    total_outstanding: Number(lgCase.total_outstanding ?? lgCase.outstanding_amount_snapshot ?? 0),
    parties_count: partiesCount,
    actions_count: actionsCount,
    documents_count: documentsCount,
    source_exposure: src.exposure,
    source_documents: src.docs,
    issues,
    is_clean: issues.length === 0,
  };
}

export async function auditAllCases(limit = 500): Promise<CaseIntegrityRow[]> {
  const { data: cases } = await sb
    .from("lg_case")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(limit);
  const out: CaseIntegrityRow[] = [];
  for (const c of cases ?? []) {
    const r = await auditCase(c.id);
    if (r && !r.is_clean) out.push(r);
  }
  return out;
}

export async function repairCase(
  lgCaseId: string,
  opts?: { userCode?: string | null },
): Promise<EnrichmentResult> {
  const result = await enrichCaseFromSource(lgCaseId, opts);
  await refreshFinancialSnapshot(lgCaseId);
  // Audit trail
  try {
    await sb.from("lg_case_activity").insert({
      lg_case_id: lgCaseId,
      activity_type: "CASE_REPAIRED",
      description: `Case integrity repair run — ${result.parties_added} parties added, ${result.parties_updated} updated, ${result.actions_created} actions created, ${result.documents_linked} docs linked`,
      payload: result as any,
      performed_by: opts?.userCode ?? "SYSTEM",
    });
  } catch {
    /* ignore */
  }
  return result;
}
