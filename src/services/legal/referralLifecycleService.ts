import { supabase } from "@/integrations/supabase/client";
import {
  getReferral,
  updateReferralStatus,
  type LegalReferralRow,
  type ReferralStatus,
} from "./legalReferralUnifiedService";
import { acceptAndCreateCase, createIntake } from "./lgIntakeService";
import { assignCase } from "./lgAssignmentService";

const sb = supabase as any;

/**
 * ============================================================================
 * REFERRAL LIFECYCLE SERVICE
 * ============================================================================
 * Single source of truth for every Department Referrals Workbench action.
 * Each function:
 *   1. Loads the current referral
 *   2. Validates the transition against the state machine
 *   3. Applies the state change (referral row + related mirrors)
 *   4. Writes an audit record into `legal_referral_audit`
 * Callers add react-query cache invalidation + toasts at the hook layer.
 *
 * See /docs/legal/referral-state-machine.md
 * ============================================================================
 */

export type LifecycleAction =
  | "VIEW"
  | "ACCEPT"
  | "REJECT"
  | "REQUEST_INFO"
  | "RECEIVE_INFO_RESPONSE"
  | "CREATE_INTAKE"
  | "CREATE_CASE"
  | "ASSIGN_OFFICER"
  | "REASSIGN"
  | "ESCALATE"
  | "CLOSE";

const TERMINAL: ReferralStatus[] = ["REJECTED", "CLOSED"];

/** Allowed status transitions. */
const TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  DRAFT: ["SUBMITTED_TO_LEGAL"],
  SUBMITTED_TO_LEGAL: ["RECEIVED_BY_LEGAL", "INFO_REQUESTED", "REJECTED"],
  RECEIVED_BY_LEGAL: [
    "UNDER_LEGAL_REVIEW",
    "INFO_REQUESTED",
    "ACCEPTED",
    "REJECTED",
    "LEGAL_CASE_CREATED",
  ],
  INFO_REQUESTED: ["INFO_RESPONDED", "REJECTED", "CLOSED"],
  INFO_RESPONDED: [
    "UNDER_LEGAL_REVIEW",
    "ACCEPTED",
    "REJECTED",
    "INFO_REQUESTED",
    "LEGAL_CASE_CREATED",
  ],
  UNDER_LEGAL_REVIEW: [
    "ACCEPTED",
    "REJECTED",
    "INFO_REQUESTED",
    "LEGAL_CASE_CREATED",
    "CLOSED",
  ],
  ACCEPTED: ["LEGAL_CASE_CREATED", "CLOSED"],
  LEGAL_CASE_CREATED: ["CLOSED"],
  REJECTED: [],
  CLOSED: [],
};

export function canTransition(from: ReferralStatus, to: ReferralStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

function assertTransition(from: ReferralStatus, to: ReferralStatus) {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid referral transition: ${from} → ${to}. Allowed: ${
        TRANSITIONS[from]?.join(", ") || "(none — terminal state)"
      }`
    );
  }
}

async function audit(
  legal_referral_id: string,
  event_code: string,
  actor: string,
  notes?: string | null,
  metadata?: Record<string, unknown>
) {
  await sb.from("legal_referral_audit").insert({
    legal_referral_id,
    event_code,
    event_module: "LEGAL",
    actor,
    notes: notes ?? null,
    metadata: metadata ?? null,
  });
}

// ---------------------------------------------------------------------------
// VIEW / TRIAGE actions
// ---------------------------------------------------------------------------

export async function receiveReferral(id: string, actor: string): Promise<void> {
  const r = await getReferral(id);
  if (!r) throw new Error("Referral not found");
  if (r.status !== "SUBMITTED_TO_LEGAL") return; // idempotent
  assertTransition(r.status, "RECEIVED_BY_LEGAL");
  await updateReferralStatus(id, "RECEIVED_BY_LEGAL", actor, "Received by Legal");
}

// ---------------------------------------------------------------------------
// ACCEPT
// ---------------------------------------------------------------------------

export interface AcceptReferralInput {
  legal_referral_id: string;
  actor: string;
  notes?: string;
  /** If true and referral has an intake, also promote to ACCEPTED (post-review). */
  finalizeReview?: boolean;
}

export async function acceptReferral(input: AcceptReferralInput): Promise<LegalReferralRow> {
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  const target: ReferralStatus = input.finalizeReview ? "ACCEPTED" : "UNDER_LEGAL_REVIEW";
  assertTransition(r.status, target);

  await sb
    .from("legal_referral")
    .update({ status: target, last_status_at: new Date().toISOString() })
    .eq("id", input.legal_referral_id);

  // Mirror intake status when present so both surfaces stay in sync.
  if (r.lg_intake_id) {
    await sb
      .from("lg_case_intake")
      .update({ intake_status: input.finalizeReview ? "ACCEPTED" : "PENDING_REVIEW" })
      .eq("id", r.lg_intake_id);
  }

  await audit(r.id, target === "ACCEPTED" ? "REFERRAL_ACCEPTED" : "REFERRAL_UNDER_REVIEW", input.actor, input.notes ?? null, {
    from: r.status,
    to: target,
  });
  return { ...r, status: target };
}

// ---------------------------------------------------------------------------
// REJECT
// ---------------------------------------------------------------------------

export interface RejectReferralInput {
  legal_referral_id: string;
  actor: string;
  reason: string;
}

export async function rejectReferral(input: RejectReferralInput): Promise<LegalReferralRow> {
  if (!input.reason || input.reason.trim().length < 5) {
    throw new Error("A rejection reason of at least 5 characters is required");
  }
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  assertTransition(r.status, "REJECTED");

  await sb
    .from("legal_referral")
    .update({ status: "REJECTED", last_status_at: new Date().toISOString() })
    .eq("id", input.legal_referral_id);

  if (r.lg_intake_id) {
    await sb
      .from("lg_case_intake")
      .update({ intake_status: "REJECTED", decision_reason: input.reason })
      .eq("id", r.lg_intake_id);
  }

  // Return referral to source module so the originating officer sees the outcome.
  try {
    if (r.source_module === "COMPLIANCE" && r.source_reference_no) {
      await sb
        .from("ce_legal_referrals")
        .update({ status: "REJECTED_BY_LEGAL", rejection_reason: input.reason })
        .eq("referral_number", r.source_reference_no);
    } else if (r.source_module === "BENEFITS" && r.source_reference_no) {
      await sb
        .from("bn_legal_referral")
        .update({ status: "REJECTED_BY_LEGAL", rejection_reason: input.reason })
        .eq("referral_number", r.source_reference_no);
    }
  } catch (e) {
    console.warn("[referral-lifecycle] source rejection mirror failed", e);
  }

  await audit(r.id, "REFERRAL_REJECTED", input.actor, input.reason, { from: r.status });
  return { ...r, status: "REJECTED" };
}

// ---------------------------------------------------------------------------
// CLOSE
// ---------------------------------------------------------------------------

export interface CloseReferralInput {
  legal_referral_id: string;
  actor: string;
  reason: string;
}

export async function closeReferral(input: CloseReferralInput): Promise<LegalReferralRow> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("A close reason is required");
  }
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  assertTransition(r.status, "CLOSED");

  await sb
    .from("legal_referral")
    .update({ status: "CLOSED", last_status_at: new Date().toISOString() })
    .eq("id", input.legal_referral_id);

  await audit(r.id, "REFERRAL_CLOSED", input.actor, input.reason, { from: r.status });
  return { ...r, status: "CLOSED" };
}

// ---------------------------------------------------------------------------
// ESCALATE (overdue)
// ---------------------------------------------------------------------------

export interface EscalateReferralInput {
  legal_referral_id: string;
  actor: string;
  reason: string;
  raisePriorityTo?: "HIGH" | "URGENT";
}

export async function escalateReferral(input: EscalateReferralInput): Promise<void> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("An escalation reason is required");
  }
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  if (TERMINAL.includes(r.status)) {
    throw new Error(`Cannot escalate a ${r.status} referral`);
  }

  const patch: Record<string, unknown> = {
    last_status_at: new Date().toISOString(),
    priority_code: input.raisePriorityTo ?? r.priority_code ?? "HIGH",
  };
  await sb.from("legal_referral").update(patch).eq("id", input.legal_referral_id);

  // Mark any pending info request as escalated in the SLA table too.
  await sb
    .from("legal_referral_info_request")
    .update({ sla_status: "ESCALATED", escalation_at: new Date().toISOString() })
    .eq("legal_referral_id", input.legal_referral_id)
    .eq("status", "PENDING_SOURCE_RESPONSE");

  // Record the escalation on the SLA event log so it surfaces on the timeline.
  try {
    await sb.from("legal_referral_sla_event").insert({
      legal_referral_id: input.legal_referral_id,
      event_code: "ESCALATED",
      actor: input.actor,
      notes: input.reason,
    });
  } catch (e) {
    console.warn("[referral-lifecycle] sla event insert failed", e);
  }

  await audit(input.legal_referral_id, "REFERRAL_ESCALATED", input.actor, input.reason, {
    priority: patch.priority_code,
    original_status: r.status,
  });
}

// ---------------------------------------------------------------------------
// REASSIGN team / workbasket
// ---------------------------------------------------------------------------

export interface ReassignReferralInput {
  legal_referral_id: string;
  actor: string;
  team_code?: string | null;
  workbasket_code?: string | null;
  reason?: string;
}

export async function reassignReferral(input: ReassignReferralInput): Promise<void> {
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  if (TERMINAL.includes(r.status)) {
    throw new Error(`Cannot reassign a ${r.status} referral`);
  }
  if (input.team_code == null && input.workbasket_code == null) {
    throw new Error("Provide a team_code or workbasket_code");
  }

  const patch: Record<string, unknown> = { last_status_at: new Date().toISOString() };
  if (input.team_code !== undefined) patch.legal_team_code = input.team_code;
  if (input.workbasket_code !== undefined) patch.legal_workbasket_code = input.workbasket_code;

  await sb.from("legal_referral").update(patch).eq("id", input.legal_referral_id);

  await audit(input.legal_referral_id, "REFERRAL_REASSIGNED", input.actor, input.reason ?? null, {
    from: { team: r.legal_team_code, workbasket: r.legal_workbasket_code },
    to: { team: patch.legal_team_code, workbasket: patch.legal_workbasket_code },
  });
}

// ---------------------------------------------------------------------------
// CREATE INTAKE from referral
// ---------------------------------------------------------------------------

export interface CreateIntakeFromReferralInput {
  legal_referral_id: string;
  actor: string;
  matter_type_code: string;
  primary_entity_type: string;
  recommended_case_type_code?: string | null;
  priority_code?: string;
  summary?: string | null;
}

export async function createIntakeFromReferral(
  input: CreateIntakeFromReferralInput
): Promise<{ intake_id: string; intake_no: string }> {
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  if (TERMINAL.includes(r.status)) {
    throw new Error(`Cannot create intake from a ${r.status} referral`);
  }
  if (r.lg_intake_id) {
    return { intake_id: r.lg_intake_id, intake_no: "" };
  }

  const intake = await createIntake({
    source_module: r.source_module,
    source_type: r.source_record_type,
    source_record_id: r.source_record_id,
    source_reference_no: r.source_reference_no,
    matter_type_code: input.matter_type_code,
    recommended_case_type_code: input.recommended_case_type_code ?? null,
    primary_entity_type: input.primary_entity_type,
    primary_entity_id: r.primary_entity_id,
    summary: input.summary ?? r.summary ?? null,
    exposure_amount: r.exposure_amount,
    priority_code: input.priority_code ?? r.priority_code ?? "MEDIUM",
    submitted_by: input.actor,
  });

  await sb
    .from("legal_referral")
    .update({ lg_intake_id: intake.id, last_status_at: new Date().toISOString() })
    .eq("id", r.id);

  await audit(r.id, "INTAKE_CREATED", input.actor, null, {
    intake_id: intake.id,
    intake_no: intake.intake_no,
  });
  return { intake_id: intake.id, intake_no: intake.intake_no };
}

// ---------------------------------------------------------------------------
// CREATE CASE from referral (accept + create case in one step)
// ---------------------------------------------------------------------------

export interface CreateCaseFromReferralInput {
  legal_referral_id: string;
  actor: string;
  case_type_code?: string;
  priority_code?: string;
  stage_code?: string;
  respondent_name?: string;
}

export async function createCaseFromReferral(
  input: CreateCaseFromReferralInput
): Promise<{ lg_case_id: string; lg_case_no: string }> {
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  if (!r.lg_intake_id) {
    throw new Error("Create a Legal Intake from this referral first");
  }
  if (r.legal_case_id) {
    return { lg_case_id: r.legal_case_id, lg_case_no: "" };
  }
  assertTransition(r.status, "LEGAL_CASE_CREATED");

  const created = await acceptAndCreateCase({
    intakeId: r.lg_intake_id,
    actor: input.actor,
    caseTypeCode: input.case_type_code,
    priorityCode: input.priority_code,
    stageCode: input.stage_code,
    respondentName: input.respondent_name,
  });

  await sb
    .from("legal_referral")
    .update({
      status: "LEGAL_CASE_CREATED",
      legal_case_id: created.lg_case_id,
      last_status_at: new Date().toISOString(),
    })
    .eq("id", r.id);

  await audit(r.id, "LEGAL_CASE_CREATED", input.actor, null, {
    lg_case_id: created.lg_case_id,
    lg_case_no: created.lg_case_no,
  });

  return created;
}

// ---------------------------------------------------------------------------
// ASSIGN OFFICER (delegates to case-level assignment engine)
// ---------------------------------------------------------------------------

export interface AssignOfficerToReferralInput {
  legal_referral_id: string;
  actor: string;
  override_user_id?: string | null;
  override_team_code?: string | null;
  reason?: "reassign" | "intake" | "escalation" | "workload" | "override" | "queue";
}

export async function assignOfficerToReferral(input: AssignOfficerToReferralInput) {
  const r = await getReferral(input.legal_referral_id);
  if (!r) throw new Error("Referral not found");
  if (!r.legal_case_id) {
    throw new Error(
      "Officer assignment requires a Legal Case. Create the case from this referral first."
    );
  }
  const result = await assignCase({
    lg_case_id: r.legal_case_id,
    actor_user_code: input.actor,
    reason: input.reason ?? "reassign",
    override_user_id: input.override_user_id ?? null,
    override_team_code: input.override_team_code ?? null,
  });

  await audit(r.id, "OFFICER_ASSIGNED", input.actor, null, {
    lg_case_id: r.legal_case_id,
    assigned_user_code: result.assigned_user_code,
    team_code: result.team_code,
  });
  return result;
}
