import { supabase } from "@/integrations/supabase/client";
import { createLgCase } from "@/services/legal/lgCaseService";

export interface ForwardComplianceCaseInput {
  ce_case_id: string;
  referral_reason: string;
  priority_code?: string;
  ce_referral_id?: string | null;
  payment_arrangement_id?: string | null;
  user_code?: string | null;
  notify_team_code?: string | null;
}

export interface ForwardComplianceCaseResult {
  lg_case_id: string;
  lg_case_no: string;
  documents_linked: number;
}

/**
 * Forward a Compliance case to the Legal module.
 *
 * Creates the new lg_case + referral + party + linked docs + initial task and
 * back-links Compliance via ce_cases.legal_case_id. Compliance data is NOT
 * duplicated — only references are stored on the Legal side.
 */
export async function forwardComplianceCaseToLegal(
  input: ForwardComplianceCaseInput
): Promise<ForwardComplianceCaseResult> {
  const { data: ceCase, error: ceErr } = await supabase
    .from("ce_cases")
    .select("*")
    .eq("id", input.ce_case_id)
    .maybeSingle();
  if (ceErr) throw ceErr;
  if (!ceCase) throw new Error("Compliance case not found");
  if (ceCase.legal_case_id) {
    throw new Error("This compliance case has already been forwarded to Legal");
  }

  const outstanding =
    Number(ceCase.total_amount ?? 0) -
    Number(ceCase.amount_collected ?? 0) -
    Number((ceCase as any).amount_waived ?? 0);

  // Resolve linked payment arrangement (do NOT copy, just reference)
  let paymentArrangementId = input.payment_arrangement_id ?? null;
  if (!paymentArrangementId) {
    const { data: pa } = await supabase
      .from("ce_payment_arrangements")
      .select("id")
      .eq("case_id", input.ce_case_id)
      .in("status", ["ACTIVE", "DRAFT", "DEFAULTED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    paymentArrangementId = pa?.id ?? null;
  }

  // Create lg_case
  const lgCase = await createLgCase({
    case_type_code: "NON_COMPLIANCE",
    case_category_code: ceCase.case_type ?? null,
    status_code: "OPEN",
    current_stage_code: "REFERRAL_RECEIVED",
    priority_code: input.priority_code ?? mapPriority(ceCase.priority),
    compliance_case_id: input.ce_case_id,
    compliance_referral_id: input.ce_referral_id ?? null,
    payment_arrangement_id: paymentArrangementId,
    assigned_team_code: input.notify_team_code ?? "LEGAL_INTAKE",
    claim_amount: ceCase.total_amount != null ? Number(ceCase.total_amount) : null,
    outstanding_amount_snapshot: Number.isFinite(outstanding) ? outstanding : null,
    summary:
      `Forwarded from Compliance case ${ceCase.case_number}. ${input.referral_reason}`.slice(
        0,
        2000
      ),
    created_by: input.user_code ?? null,
    updated_by: input.user_code ?? null,
  });

  // Referral row
  const { error: refErr } = await supabase.from("lg_case_referral").insert({
    lg_case_id: lgCase.id,
    source_module: "COMPLIANCE",
    source_reference_id: input.ce_case_id,
    source_reference_no: ceCase.case_number,
    referral_reason: input.referral_reason,
    referred_by: input.user_code ?? null,
    payload: {
      ce_case: {
        case_number: ceCase.case_number,
        case_type: ceCase.case_type,
        fund_type: ceCase.fund_type,
        employer_id: ceCase.employer_id,
        employer_name: ceCase.employer_name,
        territory: ceCase.territory,
        risk_band: ceCase.risk_band,
        risk_score: ceCase.risk_score,
        total_principal: ceCase.total_principal,
        total_penalties: ceCase.total_penalties,
        total_interest: ceCase.total_interest,
        total_amount: ceCase.total_amount,
        amount_collected: ceCase.amount_collected,
        amount_waived: (ceCase as any).amount_waived,
        outstanding_snapshot: outstanding,
        violation_count: ceCase.violation_count,
        assigned_officer_id: ceCase.assigned_officer_id,
        assigned_officer_name: ceCase.assigned_officer_name,
        opened_date: ceCase.opened_date,
      },
      ce_referral_id: input.ce_referral_id ?? null,
      ce_payment_arrangement_id: paymentArrangementId,
    },
  });
  if (refErr) throw refErr;

  // Party (employer)
  if (ceCase.employer_id) {
    await supabase.from("lg_case_party").insert({
      lg_case_id: lgCase.id,
      party_role: "RESPONDENT",
      party_type: "EMPLOYER",
      display_name: ceCase.employer_name || ceCase.employer_id,
      contact_info: { employer_ref: ceCase.employer_id, territory: ceCase.territory },
      notes: `Employer ref ${ceCase.employer_id} (Compliance)`,
    });
  }

  // Document references — link only (no copies)
  const { data: docs } = await supabase
    .from("ce_case_documents")
    .select("id, document_type, title")
    .eq("case_id", input.ce_case_id);

  let documentsLinked = 0;
  if (docs && docs.length > 0) {
    const rows = docs.map((d) => ({
      lg_case_id: lgCase.id,
      document_category_code: mapDocCategory(d.document_type),
      document_source: "COMPLIANCE",
      document_ref_id: d.id,
      title: d.title,
      linked_by: input.user_code ?? null,
    }));
    const { error: dErr } = await supabase.from("lg_document_link").insert(rows);
    if (!dErr) documentsLinked = rows.length;
  }

  // Initial intake task for the Legal workbasket
  await supabase.from("lg_case_task").insert({
    lg_case_id: lgCase.id,
    task_type_code: "REVIEW_EVIDENCE",
    title: `Review compliance referral for ${ceCase.case_number}`,
    description: input.referral_reason,
    status: "OPEN",
    due_date: addBusinessDaysISO(5),
    created_by: input.user_code ?? null,
  });

  // Stage history + activity
  await supabase.from("lg_case_stage_history").insert({
    lg_case_id: lgCase.id,
    from_stage_code: null,
    to_stage_code: "REFERRAL_RECEIVED",
    transitioned_by: input.user_code ?? null,
    notes: `Created from Compliance case ${ceCase.case_number}`,
  });
  await supabase.from("lg_case_activity").insert({
    lg_case_id: lgCase.id,
    activity_type: "REFERRAL_RECEIVED",
    description: `Forwarded from Compliance case ${ceCase.case_number}`,
    payload: { ce_case_id: input.ce_case_id, ce_case_number: ceCase.case_number },
    performed_by: input.user_code ?? null,
  });

  // Back-link on Compliance side
  await supabase
    .from("ce_cases")
    .update({
      legal_case_id: lgCase.id,
      status: "ESCALATED_LEGAL",
      updated_by: input.user_code ?? null,
    })
    .eq("id", input.ce_case_id);

  // Audit trail — fire and forget
  supabase
    .from("system_audit_trail")
    .insert({
      module: "COMPLIANCE_TO_LEGAL",
      action: "FORWARD_TO_LEGAL",
      entity_type: "ce_case",
      entity_id: input.ce_case_id,
      severity: "info",
      user_name: input.user_code ?? null,
      payload_json: {
        ce_case_number: ceCase.case_number,
        lg_case_id: lgCase.id,
        lg_case_no: lgCase.lg_case_no,
        outstanding_snapshot: outstanding,
        payment_arrangement_id: paymentArrangementId,
        documents_linked: documentsLinked,
        referral_reason: input.referral_reason,
      },
    })
    .then(() => undefined, () => undefined);

  return {
    lg_case_id: lgCase.id,
    lg_case_no: lgCase.lg_case_no,
    documents_linked: documentsLinked,
  };
}

function mapPriority(p?: string | null): string {
  switch ((p ?? "").toUpperCase()) {
    case "URGENT":
    case "CRITICAL":
      return "URGENT";
    case "HIGH":
      return "HIGH";
    case "LOW":
      return "LOW";
    default:
      return "MEDIUM";
  }
}

function mapDocCategory(t?: string | null): string {
  const v = (t ?? "").toUpperCase();
  if (v.includes("ORDER")) return "ORDER";
  if (v.includes("SETTLE")) return "SETTLEMENT";
  if (v.includes("LETTER") || v.includes("NOTICE") || v.includes("CORRESP"))
    return "CORRESPONDENCE";
  if (v.includes("FILING") || v.includes("COURT")) return "COURT_FILING";
  if (v.includes("EVIDENCE") || v.includes("PROOF")) return "EVIDENCE";
  return "REFERRAL_PACK";
}

function addBusinessDaysISO(days: number): string {
  const d = new Date();
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}
