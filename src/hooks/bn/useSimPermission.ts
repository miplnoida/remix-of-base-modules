// ============================================================
// Simulation Engine — Permission Constants & Guard Hook
// ============================================================
// Centralised permission definitions for the BN Simulation Engine.
// All simulation screens must check these before rendering.
// ============================================================

import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import type { UserRole } from '@/types/newBenefit';

// --- Permission strings ---

export const SIM_PERMISSIONS = {
  /** View the simulation dashboard and scenario list */
  VIEW_SIMULATIONS: 'view_simulations',
  /** Create new scenarios and configure inputs */
  CREATE_SCENARIOS: 'create_scenarios',
  /** Execute simulation runs */
  RUN_SIMULATIONS: 'run_simulations',
  /** View rule trace, formula trace, and config snapshots */
  VIEW_SIM_TRACES: 'view_sim_traces',
  /** Delete or archive simulation scenarios */
  DELETE_SCENARIOS: 'delete_scenarios',
  /** View simulation audit trail */
  VIEW_SIM_AUDIT: 'view_sim_audit',
} as const;

export type SimPermission = (typeof SIM_PERMISSIONS)[keyof typeof SIM_PERMISSIONS];

// --- Roles that receive each permission ---
// This mapping is additive — it does NOT grant any production claim/approval powers.

const SIM_ROLE_GRANTS: Record<SimPermission, UserRole[]> = {
  [SIM_PERMISSIONS.VIEW_SIMULATIONS]: ['CONFIG_ANALYST', 'SUPERVISOR', 'ADMIN', 'AUDITOR'],
  [SIM_PERMISSIONS.CREATE_SCENARIOS]: ['CONFIG_ANALYST', 'SUPERVISOR', 'ADMIN'],
  [SIM_PERMISSIONS.RUN_SIMULATIONS]: ['CONFIG_ANALYST', 'SUPERVISOR', 'ADMIN'],
  [SIM_PERMISSIONS.VIEW_SIM_TRACES]: ['CONFIG_ANALYST', 'SUPERVISOR', 'ADMIN', 'AUDITOR'],
  [SIM_PERMISSIONS.DELETE_SCENARIOS]: ['ADMIN'],
  [SIM_PERMISSIONS.VIEW_SIM_AUDIT]: ['SUPERVISOR', 'ADMIN', 'AUDITOR'],
};

// --- Roles allowed to see the Simulation menu entry ---

export const SIM_MENU_VISIBLE_ROLES: UserRole[] = [
  'CONFIG_ANALYST',
  'SUPERVISOR',
  'ADMIN',
  'AUDITOR',
];

// --- Helper: check a role against a permission ---

export function hasSimPermission(role: UserRole | undefined | null, permission: SimPermission): boolean {
  if (!role) return false;
  return SIM_ROLE_GRANTS[permission]?.includes(role) ?? false;
}

// --- React hook: simulation permission guard ---

export function useSimPermission() {
  const { currentUser } = useNewBenefitAuth();
  const role = currentUser?.role;

  return {
    /** Whether the user can see the simulation workspace at all */
    canView: hasSimPermission(role, SIM_PERMISSIONS.VIEW_SIMULATIONS),
    /** Whether the user can create/edit scenarios */
    canCreate: hasSimPermission(role, SIM_PERMISSIONS.CREATE_SCENARIOS),
    /** Whether the user can execute runs */
    canRun: hasSimPermission(role, SIM_PERMISSIONS.RUN_SIMULATIONS),
    /** Whether the user can view traces and snapshots */
    canViewTraces: hasSimPermission(role, SIM_PERMISSIONS.VIEW_SIM_TRACES),
    /** Whether the user can delete scenarios */
    canDelete: hasSimPermission(role, SIM_PERMISSIONS.DELETE_SCENARIOS),
    /** Whether the user can view simulation audit logs */
    canViewAudit: hasSimPermission(role, SIM_PERMISSIONS.VIEW_SIM_AUDIT),
    /** Whether the simulation menu item should be visible */
    isMenuVisible: SIM_MENU_VISIBLE_ROLES.includes(role as UserRole),
    /** The current user's role */
    role,
    /** Generic checker */
    has: (perm: SimPermission) => hasSimPermission(role, perm),
  };
}
