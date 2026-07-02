import { useLegalCapability } from "./useLegalCapability";

/**
 * Legal Task permissions per role:
 *  - LEGAL_ADMIN / LEGAL_MANAGER: full control – create, edit, assign, reassign, escalate, close, reopen
 *  - SENIOR_LEGAL_OFFICER: create/edit + escalate; can close own assignments
 *  - LEGAL_OFFICER: create/edit/complete own tasks; escalate; cannot reassign to other users
 *  - LEGAL_READ_ONLY: view only
 */
export function useLgTaskPermissions(opts?: { isAssignedToMe?: boolean }) {
  const { capability, isLoading } = useLegalCapability();
  const role = capability.role;
  const isAdmin = role === "LEGAL_ADMIN";
  const isManager = role === "LEGAL_MANAGER";
  const isSenior = role === "SENIOR_LEGAL_OFFICER";
  const isOfficer = role === "LEGAL_OFFICER";
  const isReadOnly = role === "LEGAL_READ_ONLY";
  const mine = Boolean(opts?.isAssignedToMe);

  const anyActor = isAdmin || isManager || isSenior || isOfficer;

  return {
    isLoading,
    canView: capability.isLegal,
    canCreate: anyActor,
    canEdit: anyActor,
    canAssign: isAdmin || isManager,
    canReassign: isAdmin || isManager,
    canEscalate: anyActor,
    canComplete: isAdmin || isManager || isSenior || (isOfficer && mine),
    canClose: isAdmin || isManager || isSenior,
    canCancel: isAdmin || isManager,
    canReopen: isAdmin || isManager,
    canViewAudit: capability.isLegal,
    isReadOnly,
    role,
  };
}
