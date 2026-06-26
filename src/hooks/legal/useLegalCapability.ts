import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

/**
 * Legal capability flags derived from the user's LEGAL_* role.
 * Pairs with database role_permissions for module-level access — this hook
 * exposes the domain-specific action flags the workbench and detail screens
 * use to gate buttons (approve closure, reassign, override, etc.).
 */
export type LegalRoleCode =
  | "LEGAL_OFFICER"
  | "SENIOR_LEGAL_OFFICER"
  | "LEGAL_MANAGER"
  | "LEGAL_READ_ONLY"
  | "LEGAL_ADMIN"
  | null;

export interface LegalCapability {
  role: LegalRoleCode;
  isLegal: boolean;
  isReadOnly: boolean;
  // viewing
  canViewWorkbench: boolean;
  canViewTeamWorkbasket: boolean;
  canViewAllWork: boolean;
  // case-level actions
  canAcceptReferral: boolean;
  canCreateNote: boolean;
  canUploadDocument: boolean;
  canRequestInfo: boolean;
  canDraftLetter: boolean;
  canCreateHearing: boolean;
  canUpdateTask: boolean;
  // approval / escalation
  canApproveLetter: boolean;
  canApproveStageMove: boolean;
  canApproveAdvice: boolean;
  canApproveClosure: boolean;
  canApproveEscalation: boolean;
  // management
  canAssignCase: boolean;
  canReassignCase: boolean;
  canOverrideAssignment: boolean;
  // admin
  canManageRouting: boolean;
  canManageTemplates: boolean;
  canManageSla: boolean;
  canManageReferenceData: boolean;
  canRunIntegrityChecks: boolean;
}

const EMPTY: LegalCapability = {
  role: null,
  isLegal: false,
  isReadOnly: false,
  canViewWorkbench: false,
  canViewTeamWorkbasket: false,
  canViewAllWork: false,
  canAcceptReferral: false,
  canCreateNote: false,
  canUploadDocument: false,
  canRequestInfo: false,
  canDraftLetter: false,
  canCreateHearing: false,
  canUpdateTask: false,
  canApproveLetter: false,
  canApproveStageMove: false,
  canApproveAdvice: false,
  canApproveClosure: false,
  canApproveEscalation: false,
  canAssignCase: false,
  canReassignCase: false,
  canOverrideAssignment: false,
  canManageRouting: false,
  canManageTemplates: false,
  canManageSla: false,
  canManageReferenceData: false,
  canRunIntegrityChecks: false,
};

function buildCapability(role: LegalRoleCode): LegalCapability {
  if (!role) return EMPTY;

  const officer = role === "LEGAL_OFFICER";
  const senior = role === "SENIOR_LEGAL_OFFICER";
  const manager = role === "LEGAL_MANAGER";
  const admin = role === "LEGAL_ADMIN";
  const readOnly = role === "LEGAL_READ_ONLY";

  const anyActor = officer || senior || manager || admin;

  return {
    role,
    isLegal: true,
    isReadOnly: readOnly,
    canViewWorkbench: true,
    canViewTeamWorkbasket: anyActor || readOnly,
    canViewAllWork: manager || admin || readOnly,
    canAcceptReferral: anyActor,
    canCreateNote: anyActor,
    canUploadDocument: anyActor,
    canRequestInfo: anyActor,
    canDraftLetter: anyActor,
    canCreateHearing: anyActor,
    canUpdateTask: anyActor,
    canApproveLetter: senior || manager || admin,
    canApproveStageMove: senior || manager || admin,
    canApproveAdvice: senior || manager || admin,
    canApproveClosure: manager || admin,
    canApproveEscalation: manager || admin,
    canAssignCase: manager || admin,
    canReassignCase: manager || admin,
    canOverrideAssignment: manager || admin,
    canManageRouting: admin,
    canManageTemplates: admin,
    canManageSla: admin,
    canManageReferenceData: admin,
    canRunIntegrityChecks: admin || manager,
  };
}

const LEGAL_ROLE_PRIORITY: LegalRoleCode[] = [
  "LEGAL_ADMIN",
  "LEGAL_MANAGER",
  "SENIOR_LEGAL_OFFICER",
  "LEGAL_OFFICER",
  "LEGAL_READ_ONLY",
];

export function useLegalCapability() {
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["legal-capability-role", userId],
    enabled: !!userId && isAuthReady && isAuthenticated,
    staleTime: 60_000,
    queryFn: async (): Promise<LegalRoleCode> => {
      if (!userId) return null;
      const { data: rows, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      const roles = (rows ?? []).map((r) => r.role as string);
      for (const r of LEGAL_ROLE_PRIORITY) {
        if (r && roles.includes(r)) return r;
      }
      return null;
    },
  });

  const capability = useMemo(() => buildCapability(data ?? null), [data]);

  return { capability, isLoading, isReady: isAuthReady && !isLoading };
}
