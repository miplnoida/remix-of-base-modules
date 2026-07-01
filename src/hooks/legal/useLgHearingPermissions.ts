import { useLegalCapability } from "./useLegalCapability";

/**
 * Hearing Calendar permissions per business decision:
 *  - Legal Admin / Legal Manager: create/edit/reschedule/cancel
 *  - Legal Officer: view + update notes/status ONLY IF assigned
 *  - Legal Read Only: view only
 *  - Senior Legal Officer: treated as Officer + can approve stage moves (no schedule mgmt)
 */
export function useLgHearingPermissions(opts?: { isAssignedToCase?: boolean }) {
  const { capability, isLoading } = useLegalCapability();
  const role = capability.role;
  const isAdmin = role === "LEGAL_ADMIN";
  const isManager = role === "LEGAL_MANAGER";
  const isOfficer = role === "LEGAL_OFFICER" || role === "SENIOR_LEGAL_OFFICER";
  const isReadOnly = role === "LEGAL_READ_ONLY";
  const assigned = Boolean(opts?.isAssignedToCase);

  return {
    isLoading,
    canView: capability.isLegal,
    canCreate: isAdmin || isManager,
    canEdit: isAdmin || isManager,
    canReschedule: isAdmin || isManager,
    canCancel: isAdmin || isManager,
    canUpdateNotes: isAdmin || isManager || (isOfficer && assigned),
    canUpdateStatus: isAdmin || isManager || (isOfficer && assigned),
    isReadOnly,
  };
}
