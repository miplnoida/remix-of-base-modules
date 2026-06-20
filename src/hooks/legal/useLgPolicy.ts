import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLgAccess, type LgRoleType } from "./useLgAccess";

export interface LgWorkflowPolicy {
  id: string;
  action_code: string;
  action_label: string;
  approval_required: boolean;
  preparer_role_type: LgRoleType | null;
  approver_role_type: LgRoleType | null;
  min_approvers: number;
  allow_self_approval: boolean;
  assistant_can_prepare: boolean;
  lawyer_must_review: boolean;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

export interface LgDepartmentProfile {
  id: string;
  department_size_mode: "SMALL" | "MEDIUM" | "LARGE";
  auto_assign_mode: "SELF_ASSIGN" | "ROUND_ROBIN" | "MANAGER_ASSIGN";
  approvals_mode: "LIGHT" | "STANDARD" | "STRICT";
  assistant_review_required: boolean;
  manager_role_required: boolean;
}

const POLICIES_KEY = ["lg_workflow_policies"] as const;
const PROFILE_KEY = ["lg_department_profile"] as const;

export function useLgPolicies() {
  return useQuery({
    queryKey: POLICIES_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lg_workflow_policy").select("*").eq("is_active", true).order("action_code");
      if (error) throw error;
      return (data ?? []) as LgWorkflowPolicy[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useLgDepartmentProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lg_department_profile").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as LgDepartmentProfile | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useLgRoleMappings() {
  return useQuery({
    queryKey: ["lg_role_mappings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lg_role_type_mapping").select("*").order("system_role");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useLgPolicy(actionCode: string) {
  const { data: policies } = useLgPolicies();
  return policies?.find((p) => p.action_code === actionCode) ?? null;
}

/**
 * Combined gate: can the current user perform this action in the given mode?
 *
 *  mode = "prepare"  → can the user create/draft the artefact?
 *  mode = "approve"  → can the user approve/finalise it?
 *
 * Honours both role-type capabilities and the configured policy row.
 */
export function useLgCan(actionCode: string, mode: "prepare" | "approve") {
  const access = useLgAccess();
  const policy = useLgPolicy(actionCode);
  const { data: profile } = useLgDepartmentProfile();

  if (access.isAdmin) return { allowed: true, reason: null as string | null, policy, profile };
  if (!access.hasLegalAccess) return { allowed: false, reason: "No legal access", policy, profile };

  // No explicit policy → fall back to permissive (prepare = assistants+lawyers, approve = lawyers)
  if (!policy) {
    if (mode === "prepare") {
      const ok = access.roleTypes.some((t) =>
        ["LG_LEGAL_ASSISTANT","LG_CASE_HANDLER","LG_APPROVER","LG_ADMIN"].includes(t));
      return { allowed: ok, reason: ok ? null : "Role cannot prepare", policy, profile };
    }
    const ok = access.isLawyer;
    return { allowed: ok, reason: ok ? null : "Approver role required", policy, profile };
  }

  if (mode === "prepare") {
    if (!policy.assistant_can_prepare && !access.isLawyer)
      return { allowed: false, reason: "Assistant preparation is disabled for this action", policy, profile };
    const required = policy.preparer_role_type;
    if (!required) {
      const ok = access.roleTypes.length > 0;
      return { allowed: ok, reason: ok ? null : "No legal role assigned", policy, profile };
    }
    // Anyone at or above preparer role-type can prepare
    const elevated = access.roleTypes.includes("LG_APPROVER") || access.roleTypes.includes("LG_ADMIN");
    const ok = elevated || access.roleTypes.includes(required);
    return { allowed: ok, reason: ok ? null : `Requires ${required}`, policy, profile };
  }

  // approve
  if (!policy.approval_required) {
    // approval not required — preparer can also "approve" (i.e. send)
    const ok = access.roleTypes.length > 0;
    return { allowed: ok, reason: ok ? null : "No legal role assigned", policy, profile };
  }
  const required = policy.approver_role_type ?? "LG_APPROVER";
  const ok = access.roleTypes.includes(required) ||
             access.roleTypes.includes("LG_ADMIN");
  return { allowed: ok, reason: ok ? null : `Requires ${required}`, policy, profile };
}
