import { supabase } from "@/integrations/supabase/client";
import { createLegalCaseFull, type PartyDraft } from "./lgCaseCreateService";

const sb = supabase as any;

export type IntakeStatus =
  | "PENDING_REVIEW"
  | "INFO_REQUESTED"
  | "ACCEPTED"
  | "CASE_CREATED"
  | "REJECTED";

export interface LgCaseIntake {
  id: string;
  intake_no: string;
  country_code: string;
  source_module: string;
  source_type: string | null;
  source_record_id: string | null;
  source_reference_no: string | null;
  matter_type_code: string;
  recommended_case_type_code: string | null;
  primary_entity_type: string;
  primary_entity_id: string | null;
  legacy_primary_entity_name: string | null;
  summary: string | null;
  exposure_amount: number | null;
  priority_code: string;
  intake_status: IntakeStatus;
  submitted_by: string | null;
  submitted_at: string;
  recommended_stage_code: string | null;
  recommended_workbasket_code: string | null;
  recommended_team_code: string | null;
  lg_case_id: string | null;
  decision_reason: string | null;
  info_request_notes: string | null;
  payload: any;
  created_at: string;
  updated_at: string;
}

export interface ReferenceOption {
  code: string;
  display_name: string;
  description?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  default_case_type_code?: string | null;
  default_primary_entity_type?: string | null;
}

export async function listIntakeSources(): Promise<ReferenceOption[]> {
  const { data, error } = await sb
    .from("lg_case_intake_source")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function listMatterTypes(): Promise<ReferenceOption[]> {
  const { data, error } = await sb
    .from("lg_matter_type")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function listPrimaryEntityTypes(): Promise<ReferenceOption[]> {
  const { data, error } = await sb
    .from("lg_primary_entity_type")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function listIntakes(filters?: {
  status?: IntakeStatus | "ALL";
  source?: string | "ALL";
  matterType?: string | "ALL";
}): Promise<LgCaseIntake[]> {
  let q = sb.from("lg_case_intake").select("*").order("submitted_at", { ascending: false });
  if (filters?.status && filters.status !== "ALL") q = q.eq("intake_status", filters.status);
  if (filters?.source && filters.source !== "ALL") q = q.eq("source_module", filters.source);
  if (filters?.matterType && filters.matterType !== "ALL") q = q.eq("matter_type_code", filters.matterType);
  const { data, error } = await q.limit(500);
  if (error) throw error;
  return (data ?? []) as LgCaseIntake[];
}

export async function getIntake(id: string): Promise<LgCaseIntake | null> {
  const { data, error } = await sb.from("lg_case_intake").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as LgCaseIntake | null;
}

export async function listIntakeAudit(intakeId: string) {
  const { data, error } = await sb
    .from("lg_case_intake_audit")
    .select("*")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function nextIntakeNo(): Promise<string> {
  const { generateNumber } = await import("@/services/core/coreNumberingService");
  const r = await generateNumber({ moduleCode: "LEGAL", entityType: "LEGAL_INTAKE", countryCode: "SKN" });
  return r.generatedNumber;
}

export interface CreateIntakeInput {
  source_module: string;
  source_type?: string | null;
  source_record_id?: string | null;
  source_reference_no?: string | null;
  matter_type_code: string;
  recommended_case_type_code?: string | null;
  primary_entity_type: string;
  primary_entity_id?: string | null;
  legacy_primary_entity_name?: string | null;
  summary?: string | null;
  exposure_amount?: number | null;
  priority_code?: string;
  intake_status?: IntakeStatus;
  submitted_by?: string | null;
  recommended_stage_code?: string | null;
  recommended_workbasket_code?: string | null;
  recommended_team_code?: string | null;
  payload?: any;
}

/** Source modules allowed to create a Legal Intake (referred matters only). */
export const ALLOWED_INTAKE_SOURCES = [
  "COMPLIANCE",
  "BENEFITS",
  "CLAIMS",
  "EMPLOYER_SERVICES",
  "INSURED_PERSON_SERVICES",
  "COURT_EXTERNAL",
  "INTERNAL_ADMIN",
  "LEGACY_MIGRATION",
] as const;

export async function createIntake(input: CreateIntakeInput): Promise<LgCaseIntake> {
  if (input.source_module === "LEGAL_DIRECT" || input.source_module === "LEGAL") {
    throw new Error(
      "Direct Legal cases must be created via /legal/cases/new and do not require a Legal Intake record."
    );
  }
  if (!ALLOWED_INTAKE_SOURCES.includes(input.source_module as any)) {
    throw new Error(`Source module '${input.source_module}' is not allowed for Legal Intake.`);
  }
  const intake_no = await nextIntakeNo();
  const row = {
    intake_no,
    country_code: "SKN",
    priority_code: "MEDIUM",
    intake_status: "PENDING_REVIEW",
    ...input,
  };
  const { data, error } = await sb.from("lg_case_intake").insert(row).select("*").single();
  if (error) throw error;
  await sb.from("lg_case_intake_audit").insert({
    intake_id: data.id,
    action: "CREATED",
    to_status: data.intake_status,
    performed_by: input.submitted_by ?? null,
  });
  return data as LgCaseIntake;
}

export async function requestInfo(intakeId: string, notes: string, actor: string): Promise<void> {
  const intake = await getIntake(intakeId);
  if (!intake) throw new Error("Intake not found");

  // Find linked unified referral (it is created automatically when intake is submitted from a source module)
  const { data: ref, error: refErr } = await sb
    .from("legal_referral")
    .select("id, source_module")
    .eq("lg_intake_id", intakeId)
    .maybeSingle();
  if (refErr) throw refErr;
  if (!ref) throw new Error(
    "This intake has no linked source-module referral. Info requests can only be sent for intakes originating from Benefits or Compliance."
  );

  // Atomic: creates info_request + source_task + updates referral.status + mirrors intake_status + audit
  const { legalReferralCollaborationService } = await import("./legalReferralCollaborationService");
  await legalReferralCollaborationService.requestMoreInformation(ref.id, {
    requested_by: actor,
    request_reason: notes,
    requested_items: [],
    due_date: null,
  });

  // Legacy intake audit (best-effort)
  await sb.from("lg_case_intake_audit").insert({
    intake_id: intakeId,
    action: "REQUEST_INFO",
    from_status: intake.intake_status,
    to_status: "INFO_REQUESTED",
    performed_by: actor,
    notes,
  });
}

/** Legal acknowledges the source response and resumes review.
 * Sets lg_case_intake.intake_status back to PENDING_REVIEW and the unified
 * referral status to UNDER_LEGAL_REVIEW. Writes audit on both sides. */
export async function continueReview(intakeId: string, actor: string): Promise<void> {
  const intake = await getIntake(intakeId);
  if (!intake) throw new Error("Intake not found");

  const { data: ref } = await sb
    .from("legal_referral")
    .select("id")
    .eq("lg_intake_id", intakeId)
    .maybeSingle();

  await sb.from("lg_case_intake")
    .update({ intake_status: "PENDING_REVIEW" })
    .eq("id", intakeId);

  await sb.from("lg_case_intake_audit").insert({
    intake_id: intakeId,
    action: "CONTINUE_REVIEW",
    from_status: intake.intake_status,
    to_status: "PENDING_REVIEW",
    performed_by: actor,
    notes: "Resumed review after source response received",
  });

  if (ref?.id) {
    await sb.from("legal_referral")
      .update({ status: "UNDER_LEGAL_REVIEW", last_status_at: new Date().toISOString() })
      .eq("id", ref.id);
    await sb.from("legal_referral_audit").insert({
      legal_referral_id: ref.id,
      event_code: "STATUS_UNDER_LEGAL_REVIEW",
      event_module: "LEGAL",
      actor,
      notes: "Continue Review after info response",
    });
  }
}

export async function rejectIntake(intakeId: string, reason: string, actor: string): Promise<void> {
  const intake = await getIntake(intakeId);
  if (!intake) throw new Error("Intake not found");
  const { error } = await sb
    .from("lg_case_intake")
    .update({ intake_status: "REJECTED", decision_reason: reason })
    .eq("id", intakeId);
  if (error) throw error;
  await sb.from("lg_case_intake_audit").insert({
    intake_id: intakeId,
    action: "REJECT",
    from_status: intake.intake_status,
    to_status: "REJECTED",
    performed_by: actor,
    notes: reason,
  });
}

export async function linkExistingCase(intakeId: string, lgCaseId: string, actor: string): Promise<void> {
  const intake = await getIntake(intakeId);
  if (!intake) throw new Error("Intake not found");
  const { error } = await sb
    .from("lg_case_intake")
    .update({ intake_status: "CASE_CREATED", lg_case_id: lgCaseId })
    .eq("id", intakeId);
  if (error) throw error;
  await sb.from("lg_case_intake_audit").insert({
    intake_id: intakeId,
    action: "LINK_EXISTING",
    from_status: intake.intake_status,
    to_status: "CASE_CREATED",
    performed_by: actor,
  });
}

/** Build SSB complainant + respondent parties based on the intake primary entity. */
export function buildIntakeParties(intake: LgCaseIntake, respondentName?: string): PartyDraft[] {
  const ssb: PartyDraft = {
    party_role: "COMPLAINANT",
    party_type: "INTERNAL_DEPARTMENT",
    display_name: "St. Christopher and Nevis Social Security Board",
    notes: "Auto-added complainant",
  };
  const respDisplay =
    respondentName ??
    intake.legacy_primary_entity_name ??
    `${intake.primary_entity_type} ${intake.primary_entity_id ?? ""}`.trim();

  const roleMap: Record<string, { role: string; type: string }> = {
    EMPLOYER: { role: "RESPONDENT", type: "EMPLOYER" },
    INSURED_PERSON: { role: "RESPONDENT", type: "INSURED_PERSON" },
    CLAIM: { role: "CLAIMANT", type: "INSURED_PERSON" },
    BENEFICIARY: { role: "CLAIMANT", type: "BENEFICIARY" },
    PAYMENT_ARRANGEMENT: { role: "RESPONDENT", type: "EMPLOYER" },
    COMPLIANCE_CASE: { role: "RESPONDENT", type: "EMPLOYER" },
    COURT_CASE: { role: "RESPONDENT", type: "OTHER" },
    VENDOR: { role: "RESPONDENT", type: "OTHER" },
    INTERNAL_DEPARTMENT: { role: "SUBJECT", type: "INTERNAL_DEPARTMENT" },
    ESTATE: { role: "RESPONDENT", type: "ESTATE" },
    LEGACY_EXTERNAL: { role: "RESPONDENT", type: "OTHER" },
  };
  const r = roleMap[intake.primary_entity_type] ?? { role: "RESPONDENT", type: "OTHER" };
  const respondent: PartyDraft = {
    party_role: r.role,
    party_type: r.type,
    display_name: respDisplay || "Unknown Respondent",
    external_ref_id: intake.primary_entity_id ?? null,
    notes: `Auto-added from intake ${intake.intake_no}`,
  };
  return [ssb, respondent];
}

export interface AcceptIntakeInput {
  intakeId: string;
  actor: string;
  caseTypeCode?: string;
  stageCode?: string;
  priorityCode?: string;
  exposureAmount?: number | null;
  respondentName?: string;
  documentIds?: string[];
  /** Source-module documents selected during intake review to link into the new case. */
  sourceDocuments?: import("./lgSourceDocumentService").SourceDocument[];
  /** Mark linked source docs as legally relevant. */
  markLegallyRelevant?: boolean;
}

export async function acceptAndCreateCase(input: AcceptIntakeInput): Promise<{ lg_case_id: string; lg_case_no: string }> {
  const intake = await getIntake(input.intakeId);
  if (!intake) throw new Error("Intake not found");
  if (intake.lg_case_id) throw new Error("Intake already linked to a case");

  const parties = buildIntakeParties(intake, input.respondentName);
  const sourceModeMap: Record<string, any> = {
    COMPLIANCE: "COMPLIANCE_REFERRAL",
    BENEFITS: "INTERNAL",
    CLAIMS: "INTERNAL",
    EMPLOYER_SERVICES: "MANUAL_EMPLOYER",
    INSURED_PERSON_SERVICES: "MANUAL_MEMBER",
    COURT_EXTERNAL: "COURT_FILED",
    INTERNAL_ADMIN: "INTERNAL",
    LEGACY_MIGRATION: "LEGACY",
  };

  const result = await createLegalCaseFull({
    source_mode: sourceModeMap[intake.source_module] ?? "INTERNAL",
    country_code: intake.country_code,
    case_type_code: input.caseTypeCode ?? intake.recommended_case_type_code ?? "GENERIC",
    priority_code: input.priorityCode ?? intake.priority_code ?? "MEDIUM",
    current_stage_code: input.stageCode ?? intake.recommended_stage_code ?? "REFERRAL_RECEIVED",
    opened_date: new Date().toISOString().slice(0, 10),
    summary: intake.summary,
    claim_amount: input.exposureAmount ?? intake.exposure_amount ?? null,
    outstanding_amount_snapshot: input.exposureAmount ?? intake.exposure_amount ?? null,
    employer_id: intake.primary_entity_type === "EMPLOYER" ? intake.primary_entity_id : null,
    person_id:
      intake.primary_entity_type === "INSURED_PERSON" || intake.primary_entity_type === "CLAIM"
        ? intake.primary_entity_id
        : null,
    compliance_case_id: intake.primary_entity_type === "COMPLIANCE_CASE" ? intake.primary_entity_id : null,
    payment_arrangement_id:
      intake.primary_entity_type === "PAYMENT_ARRANGEMENT" ? intake.primary_entity_id : null,
    court_case_no: intake.primary_entity_type === "COURT_CASE" ? intake.source_reference_no : null,
    legacy_primary_entity_name: intake.legacy_primary_entity_name,
    parties,
    document_ids: input.documentIds,
    created_by: input.actor,
  } as any);

  // Patch new lg_case columns + link back
  await sb
    .from("lg_case")
    .update({
      primary_entity_type: intake.primary_entity_type,
      primary_entity_id: intake.primary_entity_id,
      source_intake_id: intake.id,
      source_module: intake.source_module,
      source_type: "REFERRAL",
      source_record_id: intake.source_record_id,
    })
    .eq("id", result.case.id);

  await sb.from("lg_case_intake").update({
    intake_status: "CASE_CREATED",
    lg_case_id: result.case.id,
  }).eq("id", intake.id);

  // Link selected source-module documents (no file duplication — references only)
  if (input.sourceDocuments?.length) {
    try {
      const { linkSourceDocumentsToCase } = await import("./lgSourceDocumentService");
      await linkSourceDocumentsToCase({
        lg_case_id: result.case.id,
        documents: input.sourceDocuments,
        linked_stage_code: input.stageCode ?? intake.recommended_stage_code ?? "REFERRAL_RECEIVED",
        linked_by: input.actor,
        is_legally_relevant: input.markLegallyRelevant ?? true,
        remarks: `Linked at intake review (${intake.intake_no})`,
      });
    } catch (e) {
      console.warn("[lg-intake] source-document linking failed", e);
    }
  }

  await sb.from("lg_case_intake_audit").insert({
    intake_id: intake.id,
    action: "ACCEPT_CREATE_CASE",
    from_status: intake.intake_status,
    to_status: "CASE_CREATED",
    performed_by: input.actor,
    routing_snapshot: {
      lg_case_id: result.case.id,
      lg_case_no: result.case.lg_case_no,
      party_count: result.party_count,
    },
  });

  // mirror referral row (legacy table compatibility)
  try {
    await sb.from("lg_case_referral").insert({
      lg_case_id: result.case.id,
      source_module: intake.source_module,
      source_reference_id: intake.source_record_id,
      source_reference_no: intake.source_reference_no,
      referral_reason: intake.summary,
      referred_by: input.actor,
      payload: { intake_id: intake.id, intake_no: intake.intake_no },
    });
  } catch (e) {
    console.warn("[lg-intake] referral mirror failed", e);
  }

  // Back-link the source module's referral / source record with the new Legal Case.
  try {
    if (intake.source_module === "COMPLIANCE" && intake.source_reference_no) {
      await sb
        .from("ce_legal_referrals")
        .update({
          status: "ACCEPTED_BY_LEGAL",
          accepted_date: new Date().toISOString(),
          accepted_by: input.actor,
          legal_case_id: result.case.id,
          lg_case_no: result.case.lg_case_no,
          lg_intake_id: intake.id,
          lg_intake_no: intake.intake_no,
        })
        .eq("referral_number", intake.source_reference_no);
      if (intake.source_record_id) {
        await sb
          .from("ce_cases")
          .update({
            legal_case_id: result.case.id,
            lg_case_no: result.case.lg_case_no,
            lg_intake_id: intake.id,
            lg_intake_no: intake.intake_no,
          })
          .eq("id", intake.source_record_id);
      }
    } else if (intake.source_module === "BENEFITS" && intake.source_reference_no) {
      await sb
        .from("bn_legal_referral")
        .update({
          status: "ACCEPTED_BY_LEGAL",
          accepted_date: new Date().toISOString(),
          lg_case_id: result.case.id,
          lg_case_no: result.case.lg_case_no,
          lg_intake_id: intake.id,
          lg_intake_no: intake.intake_no,
        })
        .eq("referral_number", intake.source_reference_no);
      if (intake.source_record_id) {
        await sb
          .from("bn_claim")
          .update({
            lg_case_id: result.case.id,
            lg_case_no: result.case.lg_case_no,
            lg_intake_id: intake.id,
            lg_intake_no: intake.intake_no,
          })
          .eq("id", intake.source_record_id);
      }
    }
  } catch (e) {
    console.warn("[lg-intake] source-module back-link failed", e);
  }

  // Generate Legal Case Actions from referral items (NEW)
  try {
    const refTable = intake.source_module === "BENEFITS" ? "bn_legal_referral" : "ce_legal_referrals";
    if (intake.source_reference_no) {
      const { data: refRow } = await sb
        .from(refTable)
        .select("id")
        .eq("referral_number", intake.source_reference_no)
        .maybeSingle();
      if (refRow?.id) {
        const { generateLegalActionsFromItems } = await import("./coreLegalReferralItemService");
        await generateLegalActionsFromItems({
          lgCaseId: result.case.id,
          referralId: refRow.id,
          userCode: input.actor,
        });
      }
    }
  } catch (e) {
    console.warn("[lg-intake] action-generation from referral items failed", e);
  }

  return { lg_case_id: result.case.id, lg_case_no: result.case.lg_case_no };
}

export interface IntakeValidationRow {
  intake_no: string;
  source_module: string;
  matter_type_code: string;
  primary_entity_status: "LINKED" | "LEGACY" | "MISSING";
  legal_case_status: "LINKED" | "NOT_LINKED";
  parties_count: number;
  documents_count: number;
  routing_result: string;
  assignment_result: string;
  issues: string[];
}

export async function buildValidationReport(): Promise<IntakeValidationRow[]> {
  const intakes = await listIntakes();
  const rows: IntakeValidationRow[] = [];
  for (const it of intakes) {
    let parties = 0;
    let docs = 0;
    let routing = "—";
    let assignment = "—";
    const issues: string[] = [];
    if (it.lg_case_id) {
      const [{ count: pc }, { count: dc }, { data: asg }] = await Promise.all([
        sb.from("lg_case_party").select("id", { count: "exact", head: true }).eq("lg_case_id", it.lg_case_id),
        sb.from("lg_document_link").select("id", { count: "exact", head: true }).eq("lg_case_id", it.lg_case_id),
        sb.from("lg_case_assignment").select("assigned_team_code, assigned_to_user_id").eq("lg_case_id", it.lg_case_id).maybeSingle(),
      ]);
      parties = pc ?? 0;
      docs = dc ?? 0;
      if (asg) {
        routing = asg.assigned_team_code ?? "—";
        assignment = asg.assigned_to_user_id ? "ASSIGNED" : "QUEUED";
      } else {
        issues.push("No assignment record");
      }
      if (parties === 0) issues.push("No parties");
    } else if (it.intake_status === "ACCEPTED" || it.intake_status === "CASE_CREATED") {
      issues.push("Accepted but no case linked");
    }
    const entityStatus: IntakeValidationRow["primary_entity_status"] = it.primary_entity_id
      ? "LINKED"
      : it.legacy_primary_entity_name
      ? "LEGACY"
      : it.primary_entity_type === "LEGACY_EXTERNAL"
      ? "LEGACY"
      : "MISSING";
    if (entityStatus === "MISSING") issues.push("No primary entity link");
    rows.push({
      intake_no: it.intake_no,
      source_module: it.source_module,
      matter_type_code: it.matter_type_code,
      primary_entity_status: entityStatus,
      legal_case_status: it.lg_case_id ? "LINKED" : "NOT_LINKED",
      parties_count: parties,
      documents_count: docs,
      routing_result: routing,
      assignment_result: assignment,
      issues,
    });
  }
  return rows;
}
