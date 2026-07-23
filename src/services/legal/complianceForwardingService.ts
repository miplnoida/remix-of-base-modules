/**
 * Compliance → Legal forwarding service
 * --------------------------------------
 * Flow (numbered, end-to-end linked, no data duplication):
 *
 *   1. Generate Compliance Legal Referral No  (CMP-LR-SKN-{YYYY}-{SEQ})
 *      via coreNumberingService.
 *   2. Insert source-of-truth record into `ce_legal_referrals`.
 *   3. Generate Legal Intake No (LG-INT-SKN-{YYYY}-{SEQ}) and create the
 *      `lg_case_intake` row (status = PENDING_REVIEW).
 *   4. Stamp `ce_cases` with referral / intake numbers + IDs for fast UI.
 *   5. Legal case is NOT created here — it is created when Legal accepts the
 *      intake via `lgIntakeService.acceptAndCreateCase`.
 */
import { supabase } from "@/integrations/supabase/client";
import { generateNumber } from "@/services/core/coreNumberingService";
import { createIntake } from "@/services/legal/lgIntakeService";
import {
  insertReferralItems,
  type ReferralItemDraft,
} from "@/services/legal/coreLegalReferralItemService";
import {
  insertReferralDocuments,
  type ReferralDocumentDraft,
} from "@/services/legal/coreLegalReferralDocumentService";
import {
  triggerLgWorkflow,
  LG_WORKFLOW_MODULES,
} from "@/services/legal/lgWorkflowIntegrationService";




const sb = supabase as any;

export interface ForwardComplianceCaseInput {
  ce_case_id: string;
  referral_reason: string;
  referral_reason_code?: string | null;
  priority_code?: string;
  payment_arrangement_id?: string | null;
  user_code?: string | null;
  notify_team_code?: string | null;
  /** Selected items to refer — empty array means "refer entire case balance". */
  items?: ReferralItemDraft[];
  /** Selected/uploaded documents to attach to the referral packet. */
  documents?: ReferralDocumentDraft[];
}

export interface ForwardComplianceCaseResult {
  referral_id: string;
  referral_no: string;
  lg_intake_id: string;
  lg_intake_no: string;
  items_count: number;
  total_referred_amount: number;
}

export async function forwardComplianceCaseToLegal(
  input: ForwardComplianceCaseInput
): Promise<ForwardComplianceCaseResult> {
  const { data: ceCase, error: ceErr } = await sb
    .from("ce_cases")
    .select("*")
    .eq("id", input.ce_case_id)
    .maybeSingle();
  if (ceErr) throw ceErr;
  if (!ceCase) throw new Error("Compliance case not found");
  if (ceCase.lg_intake_id || ceCase.legal_case_id) {
    throw new Error("This compliance case has already been forwarded to Legal");
  }

  // Guard against uq_ce_legal_ref_source_active: an active (non-REJECTED/CLOSED)
  // referral on the same source case would raise a raw Postgres unique-violation
  // at insert time. Detect it early and surface a friendly, actionable message.
  const { data: existingActive } = await sb
    .from("ce_legal_referrals")
    .select("id, referral_number, status")
    .eq("source_case_id", input.ce_case_id)
    .not("status", "in", "(REJECTED,CLOSED)")
    .maybeSingle();
  if (existingActive) {
    throw new Error(
      `An active Legal Referral (${existingActive.referral_number}, status ${existingActive.status}) already exists for this compliance case. Reject or close it before creating a new one.`,
    );
  }

  const outstanding =
    Number(ceCase.total_amount ?? 0) -
    Number(ceCase.amount_collected ?? 0) -
    Number((ceCase as any).amount_waived ?? 0);

  // Resolve linked payment arrangement (reference only)
  let paymentArrangementId = input.payment_arrangement_id ?? null;
  if (!paymentArrangementId) {
    const { data: pa } = await sb
      .from("ce_payment_arrangements")
      .select("id")
      .eq("case_id", input.ce_case_id)
      .in("status", ["ACTIVE", "DRAFT", "DEFAULTED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    paymentArrangementId = pa?.id ?? null;
  }

  // 1. Compliance Legal Referral number (CMP-LR-SKN-{YYYY}-{SEQ})
  const refNo = await generateNumber({
    moduleCode: "COMPLIANCE",
    entityType: "LEGAL_REFERRAL",
    countryCode: "SKN",
    userCode: input.user_code ?? null,
  });

  // 2. Source referral record (ce_legal_referrals) — header with new packet fields
  const { data: ref, error: refErr } = await sb
    .from("ce_legal_referrals")
    .insert({
      referral_number: refNo.generatedNumber,
      source_case_id: input.ce_case_id,
      source_module: "COMPLIANCE",
      source_record_id: input.ce_case_id,
      source_reference_no: ceCase.case_number ?? null,
      referred_by: input.user_code ?? null,
      referred_at: new Date().toISOString(),
      referral_reason_code: input.referral_reason_code ?? null,
      referral_reason_text: input.referral_reason,
      employer_id: ceCase.employer_id ?? "UNKNOWN",
      employer_name: ceCase.employer_name ?? "Unknown",
      employer_zone: ceCase.territory ?? null,
      total_principal: ceCase.total_principal ?? 0,
      total_penalties: ceCase.total_penalties ?? 0,
      total_interest: ceCase.total_interest ?? 0,
      grand_total: ceCase.total_amount ?? 0,
      status: "SUBMITTED_TO_LEGAL",
      submitted_date: new Date().toISOString(),
      created_by: input.user_code ?? "SYSTEM",
      updated_by: input.user_code ?? null,
    })
    .select("id")
    .single();
  if (refErr) {
    if ((refErr as any)?.code === "23505") {
      throw new Error(
        "An active Legal Referral already exists for this compliance case. Reject or close the existing referral before creating a new one.",
      );
    }
    throw refErr;
  }

  // 2b. Insert selected referral items (if any). Header totals are auto-synced
  //     by the trigger core_lri_sync_header_totals.
  const insertedItems = await insertReferralItems(
    ref.id,
    "COMPLIANCE",
    (input.items ?? []).map((it) => ({
      ...it,
      debtor_type: it.debtor_type ?? "EMPLOYER",
      debtor_id: it.debtor_id ?? ceCase.employer_id ?? null,
      debtor_name: it.debtor_name ?? ceCase.employer_name ?? null,
      referral_reason_code: it.referral_reason_code ?? input.referral_reason_code ?? null,
    })),
    input.user_code ?? null,
  );

  const totalReferred = insertedItems.reduce((s, x) => s + Number(x.amount_referred ?? 0), 0);
  const referredSnapshot = insertedItems.length ? totalReferred : outstanding;

  // 2c. Insert referral document links (existing Compliance docs + new uploads).
  const insertedDocs = await insertReferralDocuments(
    ref.id,
    (input.documents ?? []).map((d) => ({ ...d, source_module: "COMPLIANCE" })),
    input.user_code ?? null,
  );

  // 3. Legal Intake (PENDING_REVIEW)
  const intake = await createIntake({
    source_module: "COMPLIANCE",
    source_type: "COMPLIANCE_CASE",
    source_record_id: input.ce_case_id,
    source_reference_no: refNo.generatedNumber,
    matter_type_code: "CONTRIBUTION_RECOVERY",
    recommended_case_type_code: "NON_COMPLIANCE",
    primary_entity_type: ceCase.employer_id ? "EMPLOYER" : "COMPLIANCE_CASE",
    primary_entity_id: ceCase.employer_id ? null : input.ce_case_id,
    legacy_primary_entity_name: ceCase.employer_name ?? null,
    summary:
      `Forwarded from Compliance case ${ceCase.case_number}. ${input.referral_reason}`.slice(0, 2000),
    exposure_amount: Number.isFinite(referredSnapshot) ? referredSnapshot : null,
    priority_code: input.priority_code ?? mapPriority(ceCase.priority),
    intake_status: "PENDING_REVIEW",
    submitted_by: input.user_code ?? null,
    recommended_team_code: input.notify_team_code ?? "LEGAL_INTAKE",
    payload: {
      ce_case_id: input.ce_case_id,
      ce_case_number: ceCase.case_number,
      ce_referral_id: ref.id,
      ce_referral_no: refNo.generatedNumber,
      payment_arrangement_id: paymentArrangementId,
      outstanding_snapshot: outstanding,
      referred_amount: referredSnapshot,
      retained_amount: Math.max(0, outstanding - referredSnapshot),
      items_count: insertedItems.length,
      referral_reason: input.referral_reason,
    },
  });

  // 4. Cross-link source referral row with the intake
  await sb
    .from("ce_legal_referrals")
    .update({ lg_intake_id: intake.id, lg_intake_no: intake.intake_no })
    .eq("id", ref.id);

  // 5. Stamp ce_cases for fast UI lookup
  await sb
    .from("ce_cases")
    .update({
      lg_intake_id: intake.id,
      lg_intake_no: intake.intake_no,
      lg_referral_no: refNo.generatedNumber,
      status: "ESCALATED_LEGAL",
      updated_by: input.user_code ?? null,
    })
    .eq("id", input.ce_case_id);

  // 6. Fire-and-forget audit
  sb.from("system_audit_trail")
    .insert({
      module: "COMPLIANCE_TO_LEGAL",
      action: "FORWARD_TO_LEGAL",
      entity_type: "ce_case",
      entity_id: input.ce_case_id,
      severity: "info",
      user_name: input.user_code ?? null,
      payload_json: {
        ce_case_number: ceCase.case_number,
        referral_id: ref.id,
        referral_no: refNo.generatedNumber,
        lg_intake_id: intake.id,
        lg_intake_no: intake.intake_no,
        outstanding_snapshot: outstanding,
        referred_snapshot: referredSnapshot,
        items_count: insertedItems.length,
        payment_arrangement_id: paymentArrangementId,
        referral_reason: input.referral_reason,
      },
    })
    .then(() => undefined, () => undefined);

  // 7. Kick off central workflow on the intake (Compliance → Legal handoff).
  triggerLgWorkflow({
    sourceModule: LG_WORKFLOW_MODULES.INTAKE,
    entityId: intake.id,
    entityName: intake.intake_no ?? intake.id,
    actionName: "submit",
    userId: input.user_code ?? "system",
    lgCaseId: null,
    metadata: {
      origin: "COMPLIANCE",
      ce_case_id: input.ce_case_id,
      ce_referral_id: ref.id,
    },
  }).catch((err) => console.warn("[compliance-forwarding] workflow trigger failed", err));

  return {
    referral_id: ref.id,
    referral_no: refNo.generatedNumber,
    lg_intake_id: intake.id,
    lg_intake_no: intake.intake_no,
    items_count: insertedItems.length,
    total_referred_amount: referredSnapshot,
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
