/**
 * EPIC-03A — Legal Intake & Qualification (new workflow).
 *
 * This module lives ALONGSIDE the legacy `lgIntakeService.ts` and drives the
 * new mandatory Intake & Qualification workspace introduced in EPIC-03A.
 *
 * Legacy intake helpers remain untouched to preserve compatibility with the
 * previous CaseIntake, IntakeDetail and referral forwarding services.
 *
 * Live Supabase data only, no mock data.
 */
import { supabase } from "@/integrations/supabase/client";

export type QualificationStatus =
  | "NEW"
  | "IN_REVIEW"
  | "INFO_REQUESTED"
  | "SUPERVISOR_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "CONVERTED_TO_CASE";

export type QualificationResult =
  | "ACCEPTED"
  | "REJECTED"
  | "RETURNED"
  | "INFO_REQUIRED"
  | "ESCALATED"
  | "CONVERTED"
  | null;

export interface IntakeRow {
  id: string;
  intake_no: string;
  qualification_status: QualificationStatus;
  qualification_result?: QualificationResult;
  source_module: string;
  source_reference_no?: string | null;
  source_type?: string | null;
  matter_type_code: string;
  primary_entity_type: string;
  primary_entity_id?: string | null;
  legacy_primary_entity_name?: string | null;
  summary?: string | null;
  priority_code: string;
  urgency?: string | null;
  exposure_amount?: number | null;
  financial_exposure?: number | null;
  financial_outstanding?: number | null;
  intake_officer_id?: string | null;
  supervisor_required: boolean;
  supervisor_status?: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  legal_referral_id?: string | null;
  lg_case_id?: string | null;
  country_code: string;
  legal_issue?: string | null;
  legal_basis?: string | null;
  recovery_type?: string | null;
  recommended_path?: string | null;
  risk_level?: string | null;
  complexity?: string | null;
  recommended_officer_id?: string | null;
  recommended_team_code?: string | null;
  internal_remarks?: string | null;
  rejection_reason?: string | null;
  returned_reason?: string | null;
  financial_principal?: number | null;
  financial_interest?: number | null;
  financial_penalty?: number | null;
  financial_court_cost?: number | null;
  financial_legal_cost?: number | null;
  financial_previous_recovery?: number | null;
  financial_estimated_recovery?: number | null;
  financial_estimated_pct?: number | null;
  arrangement_exists: boolean;
  settlement_exists: boolean;
  supervisor_remarks?: string | null;
  supervisor_at?: string | null;
  qualification_started_at?: string | null;
  qualification_completed_at?: string | null;
}

const S: any = supabase;

/* ----- Intake list ----- */
export async function listIntakesQ(): Promise<IntakeRow[]> {
  const { data, error } = await S.from("lg_case_intake")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IntakeRow[];
}

export async function getIntakeQ(id: string): Promise<IntakeRow | null> {
  const { data, error } = await S.from("lg_case_intake").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as IntakeRow | null;
}

export async function updateIntakeQ(id: string, patch: Partial<IntakeRow>, actor?: string) {
  const before = await getIntakeQ(id);
  const { data, error } = await S.from("lg_case_intake")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  await audit(id, actor, "INTAKE_UPDATED", before, data);
  return data as IntakeRow;
}

/* ----- Checklist ----- */
export interface ChecklistTemplate {
  id: string;
  code: string;
  label: string;
  category: string | null;
  mandatory: boolean;
  sort_order: number;
  active: boolean;
  description: string | null;
}
export interface ChecklistResponse {
  id: string;
  intake_id: string;
  template_item_id: string;
  status: "PENDING" | "COMPLETE" | "NA" | "FAILED";
  remarks: string | null;
  completed_by: string | null;
  completed_at: string | null;
}

export async function listChecklistTemplate(): Promise<ChecklistTemplate[]> {
  const { data, error } = await S.from("lg_intake_checklist_template")
    .select("*").eq("active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function listChecklistResponses(intakeId: string): Promise<ChecklistResponse[]> {
  const { data, error } = await S.from("lg_intake_checklist_response")
    .select("*").eq("intake_id", intakeId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertChecklistResponse(
  intakeId: string,
  templateItemId: string,
  patch: Partial<ChecklistResponse>,
  actor?: string
) {
  const completing = patch.status === "COMPLETE" || patch.status === "NA";
  const payload: any = {
    intake_id: intakeId,
    template_item_id: templateItemId,
    ...patch,
    completed_by: completing ? (actor ?? patch.completed_by ?? null) : patch.completed_by ?? null,
    completed_at: completing ? new Date().toISOString() : patch.completed_at ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await S.from("lg_intake_checklist_response")
    .upsert(payload, { onConflict: "intake_id,template_item_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  await audit(intakeId, actor, "CHECKLIST_UPDATED", null, { template_item_id: templateItemId, ...patch });
  return data as ChecklistResponse;
}

/* ----- Info requests ----- */
export interface InfoRequest {
  id: string;
  intake_id: string;
  recipient: string;
  recipient_type: string | null;
  department: string | null;
  information_requested: string;
  reason: string | null;
  due_date: string | null;
  reminder_date: string | null;
  status: "OPEN" | "RESPONDED" | "CANCELLED" | "OVERDUE";
  response_received_at: string | null;
  response_text: string | null;
  requested_by: string | null;
  requested_at: string;
}

export async function listInfoRequests(intakeId: string): Promise<InfoRequest[]> {
  const { data, error } = await S.from("lg_intake_info_request")
    .select("*").eq("intake_id", intakeId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInfoRequest(
  payload: {
    intake_id: string;
    recipient: string;
    recipient_type?: string | null;
    department?: string | null;
    information_requested: string;
    reason?: string | null;
    due_date?: string | null;
    reminder_date?: string | null;
    requested_by?: string | null;
    status?: string;
  },
  actor?: string
) {
  const { data, error } = await S.from("lg_intake_info_request")
    .insert({ ...payload, requested_by: actor ?? payload.requested_by ?? null, status: payload.status ?? "OPEN" })
    .select()
    .maybeSingle();
  if (error) throw error;
  await audit(payload.intake_id, actor, "INFO_REQUESTED", null, data);
  await S.from("lg_case_intake").update({
    qualification_status: "INFO_REQUESTED", updated_at: new Date().toISOString(),
  }).eq("id", payload.intake_id);
  return data as InfoRequest;
}

export async function respondInfoRequest(id: string, responseText: string, actor?: string) {
  const { data, error } = await S.from("lg_intake_info_request").update({
    status: "RESPONDED",
    response_text: responseText,
    response_received_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select().maybeSingle();
  if (error) throw error;
  await audit(data.intake_id, actor, "INFO_RECEIVED", null, data);
  return data;
}

/* ----- Audit ----- */
export async function audit(
  intakeId: string,
  actor: string | undefined,
  action: string,
  oldValue: any,
  newValue: any,
  remarks?: string
) {
  try {
    await S.from("lg_intake_decision_audit").insert({
      intake_id: intakeId,
      actor: actor ?? null,
      action,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      remarks: remarks ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

export interface AuditRow {
  id: string;
  intake_id: string;
  actor: string | null;
  action: string;
  old_value: any;
  new_value: any;
  remarks: string | null;
  performed_at: string;
}
export async function listAudit(intakeId: string): Promise<AuditRow[]> {
  const { data, error } = await S.from("lg_intake_decision_audit")
    .select("*").eq("intake_id", intakeId).order("performed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ----- State transitions ----- */
export async function assignIntakeOfficer(intakeId: string, officerId: string, actor?: string) {
  const before = await getIntakeQ(intakeId);
  const { data, error } = await S.from("lg_case_intake").update({
    intake_officer_id: officerId,
    intake_officer_assigned_at: new Date().toISOString(),
    qualification_status: before?.qualification_status === "NEW" ? "IN_REVIEW" : before?.qualification_status,
    qualification_started_at: before?.qualification_started_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", intakeId).select().maybeSingle();
  if (error) throw error;
  await audit(intakeId, actor, "ASSIGNED", { officer: before?.intake_officer_id }, { officer: officerId });
  return data;
}

export async function submitForSupervisor(intakeId: string, actor?: string) {
  const { data, error } = await S.from("lg_case_intake").update({
    qualification_status: "SUPERVISOR_REVIEW",
    supervisor_required: true,
    supervisor_status: "PENDING",
    updated_at: new Date().toISOString(),
  }).eq("id", intakeId).select().maybeSingle();
  if (error) throw error;
  await audit(intakeId, actor, "SUBMITTED_FOR_SUPERVISOR", null, data);
  return data;
}

export async function supervisorDecision(
  intakeId: string,
  decision: "APPROVED" | "REJECTED" | "RETURNED",
  remarks: string | undefined,
  actor: string | undefined
) {
  const newStatus =
    decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "IN_REVIEW";
  const { data, error } = await S.from("lg_case_intake").update({
    supervisor_status: decision,
    supervisor_by: actor ?? null,
    supervisor_at: new Date().toISOString(),
    supervisor_remarks: remarks ?? null,
    qualification_status: newStatus,
    qualification_result:
      decision === "APPROVED" ? "ACCEPTED" : decision === "REJECTED" ? "REJECTED" : "RETURNED",
    qualification_completed_at: decision !== "RETURNED" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", intakeId).select().maybeSingle();
  if (error) throw error;
  await audit(intakeId, actor, `SUPERVISOR_${decision}`, null, data, remarks);
  return data;
}

export async function officerDecision(
  intakeId: string,
  decision: "ACCEPT" | "REJECT" | "RETURN" | "ESCALATE",
  reason: string | undefined,
  actor: string | undefined
) {
  const patch: any = { updated_at: new Date().toISOString() };
  switch (decision) {
    case "ACCEPT":
      patch.qualification_status = "APPROVED";
      patch.qualification_result = "ACCEPTED";
      patch.qualification_completed_at = new Date().toISOString();
      break;
    case "REJECT":
      patch.qualification_status = "REJECTED";
      patch.qualification_result = "REJECTED";
      patch.rejection_reason = reason ?? null;
      patch.qualification_completed_at = new Date().toISOString();
      break;
    case "RETURN":
      patch.qualification_status = "RETURNED";
      patch.qualification_result = "RETURNED";
      patch.returned_reason = reason ?? null;
      break;
    case "ESCALATE":
      patch.qualification_status = "SUPERVISOR_REVIEW";
      patch.qualification_result = "ESCALATED";
      patch.supervisor_required = true;
      patch.supervisor_status = "PENDING";
      break;
  }
  const { data, error } = await S.from("lg_case_intake").update(patch).eq("id", intakeId).select().maybeSingle();
  if (error) throw error;
  await audit(intakeId, actor, `OFFICER_${decision}`, null, data, reason);
  return data;
}

/**
 * Create a Legal Case from an approved intake using the RPC that atomically
 * validates the mandatory checklist + assessment + supervisor gates.
 */
export async function createCaseFromIntake(intakeId: string, actor: string): Promise<string> {
  const { data, error } = await S.rpc("lg_create_case_from_intake", {
    p_intake_id: intakeId,
    p_actor: actor,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Deterministic client-side gate validation used to disable the Create Case action. */
export async function validateCaseCreationGate(
  intakeId: string
): Promise<{ ok: boolean; failures: string[] }> {
  const intake = await getIntakeQ(intakeId);
  if (!intake) return { ok: false, failures: ["Intake not found"] };
  const failures: string[] = [];
  const [tpl, resp] = await Promise.all([listChecklistTemplate(), listChecklistResponses(intakeId)]);
  const byItem = new Map(resp.map((r) => [r.template_item_id, r]));
  const missing = tpl
    .filter((t) => t.mandatory)
    .filter((t) => {
      const r = byItem.get(t.id);
      return !r || (r.status !== "COMPLETE" && r.status !== "NA");
    });
  if (missing.length) failures.push(`${missing.length} mandatory checklist item(s) outstanding`);
  if (intake.financial_exposure == null && intake.financial_outstanding == null)
    failures.push("Financial assessment incomplete");
  if (!intake.legal_issue || !intake.recovery_type) failures.push("Legal assessment incomplete");
  if (intake.qualification_status !== "APPROVED")
    failures.push(`Intake status must be APPROVED (currently ${intake.qualification_status})`);
  if (intake.supervisor_required && intake.supervisor_status !== "APPROVED")
    failures.push("Supervisor approval required and not granted");
  return { ok: failures.length === 0, failures };
}
