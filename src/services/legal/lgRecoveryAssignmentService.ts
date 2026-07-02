import { supabase } from "@/integrations/supabase/client";
import type {
  RecoveryAssignment,
  CreateRecoveryAssignmentInput,
  RecoveryAssignmentStatus,
  RecoveryAssignmentAction,
} from "@/types/legal/recoveryAssignment";

const sb = supabase as any;

async function generateAssignmentCode(): Promise<string> {
  try {
    const { generateNumber } = await import("@/services/core/coreNumberingService");
    const r = await generateNumber({ moduleCode: "LEGAL", entityType: "RECOVERY_ASSIGNMENT", countryCode: "SKN" });
    return r.generatedNumber;
  } catch {
    return `RA-${Date.now().toString(36).toUpperCase()}`;
  }
}

export async function listAssignments(filters?: {
  status?: RecoveryAssignmentStatus | RecoveryAssignmentStatus[];
  officerId?: string;
  teamCode?: string;
  campaignId?: string;
  health?: string;
}): Promise<RecoveryAssignment[]> {
  let q = sb.from("lg_recovery_assignment").select("*").order("created_at", { ascending: false });
  if (filters?.status) {
    q = Array.isArray(filters.status) ? q.in("status", filters.status) : q.eq("status", filters.status);
  }
  if (filters?.officerId) q = q.eq("assigned_officer_id", filters.officerId);
  if (filters?.teamCode) q = q.eq("assigned_team_code", filters.teamCode);
  if (filters?.campaignId) q = q.eq("campaign_id", filters.campaignId);
  if (filters?.health) q = q.eq("health", filters.health);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RecoveryAssignment[];
}

export async function getAssignment(id: string): Promise<RecoveryAssignment | null> {
  const { data, error } = await sb.from("lg_recovery_assignment").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as RecoveryAssignment | null;
}

export async function createAssignment(input: CreateRecoveryAssignmentInput, actor: string): Promise<RecoveryAssignment> {
  const code = input.code ?? (await generateAssignmentCode());
  const status: RecoveryAssignmentStatus = input.assigned_officer_id ? "ASSIGNED" : "DRAFT";
  const { data, error } = await sb
    .from("lg_recovery_assignment")
    .insert({
      code,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "NORMAL",
      status,
      assigned_officer_id: input.assigned_officer_id ?? null,
      assigned_officer_code: input.assigned_officer_code ?? null,
      assigned_team_code: input.assigned_team_code ?? null,
      strategy_type_code: input.strategy_type_code ?? null,
      campaign_id: input.campaign_id ?? null,
      sla_policy_code: input.sla_policy_code ?? null,
      target_recovery_amount: input.target_recovery_amount ?? 0,
      target_date: input.target_date ?? null,
      assigned_at: input.assigned_officer_id ? new Date().toISOString() : null,
      created_by: actor,
      updated_by: actor,
    })
    .select("*").single();
  if (error) throw error;
  const assignment = data as RecoveryAssignment;
  if (input.liability_ids?.length) {
    await linkLiabilities(assignment.id, input.liability_ids, actor);
  }
  await recordHistory(assignment.id, "STATUS_CHANGE", null, status, "Created", actor);
  return assignment;
}

export async function updateAssignment(id: string, patch: Partial<RecoveryAssignment>, actor: string): Promise<RecoveryAssignment> {
  const { data, error } = await sb
    .from("lg_recovery_assignment")
    .update({ ...patch, updated_by: actor, updated_at: new Date().toISOString() })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data as RecoveryAssignment;
}

export async function transitionStatus(id: string, next: RecoveryAssignmentStatus, actor: string, reason?: string): Promise<RecoveryAssignment> {
  const current = await getAssignment(id);
  if (!current) throw new Error("Assignment not found");
  const patch: Partial<RecoveryAssignment> = { status: next };
  const now = new Date().toISOString();
  if (next === "ACTIVE" && !current.activated_at) patch.activated_at = now;
  if (next === "COMPLETED") patch.completed_at = now;
  if (next === "CLOSED") patch.closed_at = now;
  if (next === "ESCALATED") patch.escalation_reason = reason ?? null;
  const updated = await updateAssignment(id, patch, actor);
  await recordHistory(id, "STATUS_CHANGE", current.status, next, reason ?? null, actor);
  return updated;
}

export async function assignOfficer(id: string, officerId: string, officerCode: string | null, teamCode: string | null, actor: string): Promise<RecoveryAssignment> {
  const current = await getAssignment(id);
  if (!current) throw new Error("Assignment not found");
  const nextStatus: RecoveryAssignmentStatus = current.status === "DRAFT" ? "ASSIGNED" : current.status;
  const updated = await updateAssignment(id, {
    assigned_officer_id: officerId,
    assigned_officer_code: officerCode,
    assigned_team_code: teamCode,
    assigned_at: new Date().toISOString(),
    status: nextStatus,
  }, actor);
  await recordHistory(id, "ASSIGN", current.assigned_officer_code, officerCode, `Assigned to ${officerCode ?? officerId}`, actor);
  return updated;
}

export async function linkLiabilities(assignmentId: string, liabilityIds: string[], actor: string): Promise<void> {
  if (!liabilityIds.length) return;
  const rows = liabilityIds.map((liability_id) => ({
    assignment_id: assignmentId,
    liability_id,
    added_by: actor,
  }));
  const { error } = await sb.from("lg_recovery_assignment_liability").insert(rows);
  if (error && !`${error.message}`.includes("duplicate")) throw error;
}

export async function unlinkLiability(assignmentId: string, liabilityId: string): Promise<void> {
  const { error } = await sb
    .from("lg_recovery_assignment_liability")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("liability_id", liabilityId);
  if (error) throw error;
}

export async function listLinkedLiabilities(assignmentId: string): Promise<any[]> {
  const { data, error } = await sb
    .from("lg_recovery_assignment_liability")
    .select("liability_id, added_at, added_by, remarks, lg_recoverable_liability!inner(*)")
    .eq("assignment_id", assignmentId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r.lg_recoverable_liability, _link: r }));
}

export async function bulkAssign(assignmentIds: string[], officerId: string, officerCode: string | null, teamCode: string | null, actor: string): Promise<number> {
  let n = 0;
  for (const id of assignmentIds) {
    await assignOfficer(id, officerId, officerCode, teamCode, actor);
    n++;
  }
  return n;
}

export async function recordHistory(assignmentId: string, eventType: string, from: string | null, to: string | null, reason: string | null, actor: string): Promise<void> {
  await sb.from("lg_recovery_assignment_history").insert({
    assignment_id: assignmentId,
    event_type: eventType,
    from_value: from,
    to_value: to,
    reason,
    actor_code: actor,
  });
}

export async function listHistory(assignmentId: string): Promise<any[]> {
  const { data, error } = await sb
    .from("lg_recovery_assignment_history")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAudit(assignmentId: string): Promise<any[]> {
  const { data, error } = await sb
    .from("lg_recovery_assignment_audit")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

// -------- Diary / actions --------
export async function listActions(assignmentId: string): Promise<RecoveryAssignmentAction[]> {
  const { data, error } = await sb
    .from("lg_recovery_assignment_action")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("action_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RecoveryAssignmentAction[];
}

export async function addAction(assignmentId: string, input: Partial<RecoveryAssignmentAction>, actor: string): Promise<RecoveryAssignmentAction> {
  const { data, error } = await sb
    .from("lg_recovery_assignment_action")
    .insert({
      assignment_id: assignmentId,
      action_type: input.action_type ?? "NOTE",
      action_at: input.action_at ?? new Date().toISOString(),
      subject: input.subject ?? null,
      notes: input.notes ?? null,
      outcome_code: input.outcome_code ?? null,
      contact_person: input.contact_person ?? null,
      contact_channel: input.contact_channel ?? null,
      linked_task_id: input.linked_task_id ?? null,
      linked_document_id: input.linked_document_id ?? null,
      linked_hearing_id: input.linked_hearing_id ?? null,
      amount_promised: input.amount_promised ?? null,
      promise_date: input.promise_date ?? null,
      created_by: actor,
    })
    .select("*").single();
  if (error) throw error;
  // touch last_action_at
  await sb.from("lg_recovery_assignment")
    .update({ last_action_at: new Date().toISOString(), updated_by: actor })
    .eq("id", assignmentId);
  return data as RecoveryAssignmentAction;
}

// -------- Assignments by liability (for cross-module integration) --------
export async function listAssignmentsForLiability(liabilityId: string): Promise<RecoveryAssignment[]> {
  const { data, error } = await sb
    .from("lg_recovery_assignment_liability")
    .select("lg_recovery_assignment!inner(*)")
    .eq("liability_id", liabilityId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.lg_recovery_assignment as RecoveryAssignment);
}

export async function listAssignmentsForCase(caseId: string): Promise<RecoveryAssignment[]> {
  const { data, error } = await sb
    .from("lg_recovery_assignment_liability")
    .select("lg_recovery_assignment!inner(*), lg_recoverable_liability!inner(lg_case_id)")
    .eq("lg_recoverable_liability.lg_case_id", caseId);
  if (error) throw error;
  const seen = new Set<string>();
  const out: RecoveryAssignment[] = [];
  for (const r of data ?? []) {
    const a = r.lg_recovery_assignment as RecoveryAssignment;
    if (a && !seen.has(a.id)) { seen.add(a.id); out.push(a); }
  }
  return out;
}
