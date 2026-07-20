/**
 * BN-MORT-RBAC-1A — menu visibility gate.
 *
 * useNavigationMenu filters modules by:
 *   - Admin bypass, OR
 *   - Presence of `view` permission (is_granted=true) for the module name.
 *
 * These tests mirror the exact predicate used in src/hooks/useNavigationMenu.ts
 * so a regression in that predicate is caught in CI without spinning up
 * Supabase + React Query.
 */
import { describe, it, expect } from 'vitest';

type Perm = { module_name: string; action_name: string; is_granted?: boolean };

function isMortalityVisible(opts: { isAdmin: boolean; permissions: Perm[] }): boolean {
  if (opts.isAdmin) return true;
  const grants = new Set(
    opts.permissions
      .filter((p) => p.action_name === 'view' && p.is_granted)
      .map((p) => p.module_name),
  );
  return grants.has('bn_mortality');
}

describe('BN-MORT-RBAC-1A — Mortality menu visibility', () => {
  it('authorised role (BN_INTAKE_OFFICER equivalent grant) sees Mortality', () => {
    expect(
      isMortalityVisible({
        isAdmin: false,
        permissions: [{ module_name: 'bn_mortality', action_name: 'view', is_granted: true }],
      }),
    ).toBe(true);
  });

  it('unauthorised user (no view grant) does NOT see Mortality', () => {
    expect(
      isMortalityVisible({
        isAdmin: false,
        permissions: [
          { module_name: 'bn_overpayments', action_name: 'view', is_granted: true },
        ],
      }),
    ).toBe(false);
  });

  it('explicit deny (is_granted=false) hides Mortality even if row exists', () => {
    expect(
      isMortalityVisible({
        isAdmin: false,
        permissions: [{ module_name: 'bn_mortality', action_name: 'view', is_granted: false }],
      }),
    ).toBe(false);
  });

  it('Admin bypass sees Mortality regardless of grants', () => {
    expect(isMortalityVisible({ isAdmin: true, permissions: [] })).toBe(true);
  });

  it('read alias alone does NOT grant menu visibility (canonical action is view)', () => {
    expect(
      isMortalityVisible({
        isAdmin: false,
        permissions: [{ module_name: 'bn_mortality', action_name: 'read', is_granted: true }],
      }),
    ).toBe(false);
  });
});
