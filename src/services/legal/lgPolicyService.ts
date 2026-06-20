import { supabase } from "@/integrations/supabase/client";
import type { LgRoleType } from "@/hooks/legal/useLgAccess";

const sb = supabase as any;

export async function updateDepartmentProfile(id: string, patch: Record<string, any>, userCode?: string) {
  const { error } = await sb
    .from("lg_department_profile")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: userCode ?? null })
    .eq("id", id);
  if (error) throw error;
}

export interface RoleMappingInput {
  id?: string;
  system_role: string;
  role_type: LgRoleType;
  can_prepare?: boolean;
  can_review?: boolean;
  can_approve?: boolean;
  can_post_fee?: boolean;
  can_close_case?: boolean;
  is_active?: boolean;
}

export function validateRoleMapping(row: RoleMappingInput): string | null {
  if (!row.system_role || !row.system_role.trim()) return "System role is required";
  if (!row.role_type) return "Legal role type is required";
  if (row.is_active === false &&
      (row.can_approve || row.can_post_fee || row.can_close_case)) {
    // allowed but warned — inactive mapping never grants capability; no hard error
  }
  // An assistant role-type cannot be granted approve/post-fee/close — those require lawyer role-types
  if (row.role_type === "LG_LEGAL_ASSISTANT" &&
      (row.can_approve || row.can_post_fee || row.can_close_case)) {
    return "Legal Assistant cannot have Approve / Post Fee / Close Case. Map the system role to LG_APPROVER instead.";
  }
  if (row.role_type === "LG_READ_ONLY" &&
      (row.can_prepare || row.can_review || row.can_approve || row.can_post_fee || row.can_close_case)) {
    return "Read-Only role type cannot have any action capability.";
  }
  return null;
}

export async function upsertRoleMapping(row: RoleMappingInput, userCode?: string) {
  const err = validateRoleMapping(row);
  if (err) throw new Error(err);
  const payload: any = {
    ...row,
    updated_by: userCode ?? null,
    updated_at: new Date().toISOString(),
  };
  if (!row.id) payload.created_by = userCode ?? null;
  const { error } = await sb.from("lg_role_type_mapping").upsert(payload);
  if (error) throw error;
}

export async function deleteRoleMapping(id: string) {
  const { error } = await sb.from("lg_role_type_mapping").delete().eq("id", id);
  if (error) throw error;
}

export interface WorkflowPolicyPatch {
  approval_required?: boolean;
  preparer_role_type?: LgRoleType | null;
  approver_role_type?: LgRoleType | null;
  min_approvers?: number;
  allow_self_approval?: boolean;
  assistant_can_prepare?: boolean;
  lawyer_must_review?: boolean;
  is_active?: boolean;
}

export function validateWorkflowPolicy(patch: WorkflowPolicyPatch & { action_label?: string }): string | null {
  if (patch.approval_required && !patch.approver_role_type) {
    return "Approver role is required when Approval Required is on.";
  }
  if ((patch.min_approvers ?? 1) < 1) return "Minimum approvers must be at least 1.";
  if (patch.approver_role_type === "LG_LEGAL_ASSISTANT") {
    return "Legal Assistant cannot be the approver. Choose LG_REVIEWER, LG_APPROVER or LG_ADMIN.";
  }
  if (patch.approver_role_type === "LG_READ_ONLY" || patch.preparer_role_type === "LG_READ_ONLY") {
    return "Read-Only role type cannot prepare or approve.";
  }
  return null;
}

export async function updateWorkflowPolicy(id: string, patch: WorkflowPolicyPatch, userCode?: string) {
  const err = validateWorkflowPolicy(patch);
  if (err) throw new Error(err);
  const { error } = await sb
    .from("lg_workflow_policy")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: userCode ?? null })
    .eq("id", id);
  if (error) throw error;
}
