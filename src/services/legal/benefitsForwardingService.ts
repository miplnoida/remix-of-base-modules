/**
 * Benefits → Legal forwarding service
 * ------------------------------------
 * Symmetric to complianceForwardingService. Numbers issued centrally.
 *
 *   1. Generate Benefits Legal Referral No  (BN-LR-SKN-{YYYY}-{SEQ})
 *   2. Insert into bn_legal_referral (source of truth)
 *   3. Create Legal Intake (LG-INT-SKN-{YYYY}-{SEQ}, status PENDING_REVIEW)
 *   4. Cross-link bn_claim with referral/intake numbers + IDs
 */
import { supabase } from "@/integrations/supabase/client";
import { generateNumber } from "@/services/core/coreNumberingService";
import { createIntake } from "@/services/legal/lgIntakeService";

const sb = supabase as any;

export interface ForwardBenefitsClaimInput {
  bn_claim_id: string;
  matter_type_code?: string;
  referral_reason: string;
  priority_code?: string;
  exposure_amount?: number | null;
  user_code?: string | null;
  notify_team_code?: string | null;
}

export interface ForwardBenefitsClaimResult {
  referral_id: string;
  referral_no: string;
  lg_intake_id: string;
  lg_intake_no: string;
}

export async function forwardBenefitsClaimToLegal(
  input: ForwardBenefitsClaimInput
): Promise<ForwardBenefitsClaimResult> {
  const { data: claim, error: cErr } = await sb
    .from("bn_claim")
    .select("*")
    .eq("id", input.bn_claim_id)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!claim) throw new Error("Benefit claim not found");
  if (claim.lg_intake_id || claim.lg_case_id) {
    throw new Error("This claim has already been forwarded to Legal");
  }

  // 1. Benefits Legal Referral number
  const refNo = await generateNumber({
    moduleCode: "BENEFITS",
    entityType: "LEGAL_REFERRAL",
    countryCode: "SKN",
    userCode: input.user_code ?? null,
  });

  // 2. Source referral record (bn_legal_referral)
  const { data: ref, error: refErr } = await sb
    .from("bn_legal_referral")
    .insert({
      referral_number: refNo.generatedNumber,
      source_claim_id: input.bn_claim_id,
      insured_person_id: claim.insured_person_id ?? null,
      beneficiary_id: claim.primary_beneficiary_id ?? null,
      employer_id: claim.employer_id ?? null,
      product_code: claim.product_code ?? null,
      matter_type_code: input.matter_type_code ?? "BENEFIT_DISPUTE",
      exposure_amount: input.exposure_amount ?? null,
      priority_code: input.priority_code ?? "MEDIUM",
      referral_reason: input.referral_reason,
      status: "SUBMITTED_TO_LEGAL",
      submitted_by: input.user_code ?? null,
      created_by: input.user_code ?? "SYSTEM",
      updated_by: input.user_code ?? null,
    })
    .select("id")
    .single();
  if (refErr) throw refErr;

  // 3. Legal Intake (PENDING_REVIEW)
  const primaryEntityType = claim.insured_person_id ? "INSURED_PERSON" : "CLAIM";
  const intake = await createIntake({
    source_module: "BENEFITS",
    source_type: "BN_CLAIM",
    source_record_id: input.bn_claim_id,
    source_reference_no: refNo.generatedNumber,
    matter_type_code: input.matter_type_code ?? "BENEFIT_DISPUTE",
    recommended_case_type_code: "BENEFIT_LITIGATION",
    primary_entity_type: primaryEntityType,
    primary_entity_id: claim.insured_person_id ?? input.bn_claim_id,
    legacy_primary_entity_name: claim.claimant_name ?? null,
    summary:
      `Forwarded from Benefits claim ${claim.claim_number ?? claim.id}. ${input.referral_reason}`.slice(0, 2000),
    exposure_amount: input.exposure_amount ?? null,
    priority_code: input.priority_code ?? "MEDIUM",
    intake_status: "PENDING_REVIEW",
    submitted_by: input.user_code ?? null,
    recommended_team_code: input.notify_team_code ?? "LEGAL_INTAKE",
    payload: {
      bn_claim_id: input.bn_claim_id,
      bn_claim_number: claim.claim_number,
      bn_referral_id: ref.id,
      bn_referral_no: refNo.generatedNumber,
      product_code: claim.product_code,
      referral_reason: input.referral_reason,
    },
  });

  // 4. Cross-link the referral and claim with the intake
  await sb
    .from("bn_legal_referral")
    .update({ lg_intake_id: intake.id, lg_intake_no: intake.intake_no })
    .eq("id", ref.id);

  await sb
    .from("bn_claim")
    .update({
      lg_referral_id: ref.id,
      lg_referral_no: refNo.generatedNumber,
      lg_intake_id: intake.id,
      lg_intake_no: intake.intake_no,
    })
    .eq("id", input.bn_claim_id);

  // Fire-and-forget audit
  sb.from("system_audit_trail")
    .insert({
      module: "BENEFITS_TO_LEGAL",
      action: "FORWARD_TO_LEGAL",
      entity_type: "bn_claim",
      entity_id: input.bn_claim_id,
      severity: "info",
      user_name: input.user_code ?? null,
      payload_json: {
        bn_claim_number: claim.claim_number,
        referral_id: ref.id,
        referral_no: refNo.generatedNumber,
        lg_intake_id: intake.id,
        lg_intake_no: intake.intake_no,
        referral_reason: input.referral_reason,
      },
    })
    .then(() => undefined, () => undefined);

  return {
    referral_id: ref.id,
    referral_no: refNo.generatedNumber,
    lg_intake_id: intake.id,
    lg_intake_no: intake.intake_no,
  };
}
