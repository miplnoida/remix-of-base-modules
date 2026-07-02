import { supabase } from "@/integrations/supabase/client";
import type { RecoveryAssignmentTransfer, TransferState } from "@/types/legal/recoveryAssignment";
import { assignOfficer, recordHistory } from "@/services/legal/lgRecoveryAssignmentService";

const sb = supabase as any;

export async function requestTransfer(input: {
  assignment_id: string;
  from_officer_id?: string | null;
  from_officer_code?: string | null;
  to_officer_id?: string | null;
  to_officer_code?: string | null;
  to_team_code?: string | null;
  reason: string;
  requested_by: string;
}): Promise<RecoveryAssignmentTransfer> {
  const { data, error } = await sb.from("lg_recovery_assignment_transfer").insert({
    assignment_id: input.assignment_id,
    from_officer_id: input.from_officer_id ?? null,
    from_officer_code: input.from_officer_code ?? null,
    to_officer_id: input.to_officer_id ?? null,
    to_officer_code: input.to_officer_code ?? null,
    to_team_code: input.to_team_code ?? null,
    reason: input.reason,
    approval_state: "PENDING" as TransferState,
    requested_by: input.requested_by,
  }).select("*").single();
  if (error) throw error;
  await sb.from("lg_recovery_assignment").update({ transfer_pending: true }).eq("id", input.assignment_id);
  await recordHistory(input.assignment_id, "TRANSFER", input.from_officer_code ?? null, input.to_officer_code ?? null, `Transfer requested: ${input.reason}`, input.requested_by);
  return data as RecoveryAssignmentTransfer;
}

export async function approveTransfer(transferId: string, actor: string, notes?: string): Promise<RecoveryAssignmentTransfer> {
  const { data: t, error: e1 } = await sb.from("lg_recovery_assignment_transfer").select("*").eq("id", transferId).single();
  if (e1) throw e1;
  if (t.approval_state !== "PENDING") throw new Error("Transfer already decided");

  if (t.to_officer_id) {
    await assignOfficer(t.assignment_id, t.to_officer_id, t.to_officer_code, t.to_team_code, actor);
  } else if (t.to_team_code) {
    await sb.from("lg_recovery_assignment").update({ assigned_team_code: t.to_team_code, updated_by: actor }).eq("id", t.assignment_id);
  }
  const { data, error } = await sb.from("lg_recovery_assignment_transfer").update({
    approval_state: "APPROVED",
    decided_by: actor,
    decided_at: new Date().toISOString(),
    decision_notes: notes ?? null,
  }).eq("id", transferId).select("*").single();
  if (error) throw error;
  await sb.from("lg_recovery_assignment").update({ transfer_pending: false }).eq("id", t.assignment_id);
  return data as RecoveryAssignmentTransfer;
}

export async function rejectTransfer(transferId: string, actor: string, notes?: string): Promise<RecoveryAssignmentTransfer> {
  const { data, error } = await sb.from("lg_recovery_assignment_transfer").update({
    approval_state: "REJECTED",
    decided_by: actor,
    decided_at: new Date().toISOString(),
    decision_notes: notes ?? null,
  }).eq("id", transferId).select("*").single();
  if (error) throw error;
  await sb.from("lg_recovery_assignment").update({ transfer_pending: false }).eq("id", data.assignment_id);
  return data as RecoveryAssignmentTransfer;
}

export async function listTransfers(assignmentId?: string): Promise<RecoveryAssignmentTransfer[]> {
  let q = sb.from("lg_recovery_assignment_transfer").select("*").order("requested_at", { ascending: false });
  if (assignmentId) q = q.eq("assignment_id", assignmentId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RecoveryAssignmentTransfer[];
}
