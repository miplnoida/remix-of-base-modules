// ============================================================
// Simulation Engine — Permission Constants & Guard Hook
// ============================================================
// Centralised permission definitions for the BN Simulation Engine.
// All simulation screens must check these before rendering.
// Uses the real Supabase auth + user_roles for admin detection.
// ============================================================

import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { useActionPermissions } from '@/hooks/useActionPermission';

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
export const SIM_MENU_VISIBLE_ROLES = [
  'CONFIG_ANALYST',
  'SUPERVISOR',
  'ADMIN',
  'AUDITOR',
] as const;

// --- React hook: simulation permission guard ---

export function useSimPermission() {
  const isAdmin = useIsAdmin();
  const { can } = useActionPermissions('bn_simulation');

  // Admin users get full access
  if (isAdmin) {
    return {
      canView: true,
      canCreate: true,
      canRun: true,
      canViewTraces: true,
      canDelete: true,
      canViewAudit: true,
      isMenuVisible: true,
      role: 'ADMIN' as const,
      has: () => true,
    };
  }

  return {
    canView: can('view'),
    canCreate: can('create'),
    canRun: can('run'),
    canViewTraces: can('view_traces'),
    canDelete: can('delete'),
    canViewAudit: can('view_audit'),
    isMenuVisible: can('view'),
    role: undefined,
    has: (perm: SimPermission) => can(perm),
  };
}

// Keep backward-compatible export
export function hasSimPermission(_role: string | undefined | null, _permission: SimPermission): boolean {
  // Deprecated — use the hook instead. Always returns false for non-hook usage.
  return false;
}
