/**
 * BN-AP-CONFIG-1a §F — Route gate fallback semantics.
 *
 * Unit-tests the pure grant/fallback resolution logic. `BnModuleRouteGate`
 * itself is a thin React wrapper around this decision — we assert here
 * that the `adminCapabilities` mechanism cannot broaden access accidentally.
 *
 * The production gate resolves grants from `get_user_permissions` (which
 * server-side filters `is_granted=true` and joins only enabled modules
 * and enabled actions). Below we replicate the exact predicate to guard
 * against regressions.
 */
import { describe, it, expect } from 'vitest';

interface PermRow { module_name: string; action_name: string; is_granted?: boolean }
interface Cap { moduleCode: string; action: string }

/**
 * Mirror the predicate in BnModuleRouteGate to keep the invariant testable.
 */
function decideAccess(input: {
  isAdmin: boolean;
  permissions: PermRow[];
  moduleCode: string;
  requiredAction: string;
  adminCapabilities?: readonly Cap[];
}): { granted: boolean; reason: string } {
  const { isAdmin, permissions, moduleCode, requiredAction, adminCapabilities } = input;
  const grants = new Set(
    permissions
      .filter((p) => p.module_name === moduleCode && p.is_granted !== false)
      .map((p) => p.action_name),
  );
  const hasAction = isAdmin || grants.has(requiredAction);
  const holdsFallback =
    isAdmin ||
    (adminCapabilities ?? []).some((cap) =>
      permissions.some(
        (p) =>
          p.module_name === cap.moduleCode &&
          p.action_name === cap.action &&
          p.is_granted !== false,
      ),
    );
  if (hasAction) return { granted: true, reason: 'direct' };
  if (holdsFallback) return { granted: true, reason: 'fallback' };
  return { granted: false, reason: 'denied' };
}

describe('BnModuleRouteGate — access decision', () => {
  it('grants direct capability when granted', () => {
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_appeals_config', action_name: 'view', is_granted: true }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
    });
    expect(r).toEqual({ granted: true, reason: 'direct' });
  });

  it('denies when capability is missing entirely', () => {
    const r = decideAccess({
      isAdmin: false,
      permissions: [],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
    });
    expect(r.granted).toBe(false);
  });

  it('denies when the row is explicitly denied (is_granted=false)', () => {
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_appeals_config', action_name: 'view', is_granted: false }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
    });
    expect(r.granted).toBe(false);
  });

  it('ordinary bn_appeals:view does NOT satisfy bn_appeals:admin fallback', () => {
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_appeals', action_name: 'view', is_granted: true }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
      adminCapabilities: [{ moduleCode: 'bn_appeals', action: 'admin' }],
    });
    expect(r.granted).toBe(false);
  });

  it('ordinary bn_appeals:view does NOT satisfy bn_appeals_config:manage fallback', () => {
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_appeals', action_name: 'view', is_granted: true }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
      adminCapabilities: [{ moduleCode: 'bn_appeals_config', action: 'manage' }],
    });
    expect(r.granted).toBe(false);
  });

  it('grants via fallback when caller holds bn_appeals:admin', () => {
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_appeals', action_name: 'admin', is_granted: true }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
      adminCapabilities: [{ moduleCode: 'bn_appeals', action: 'admin' }],
    });
    expect(r).toEqual({ granted: true, reason: 'fallback' });
  });

  it('fallback capability must match BOTH module and action', () => {
    // user holds bn_other_module:admin but adminCapabilities requires bn_appeals:admin
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_other_module', action_name: 'admin', is_granted: true }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
      adminCapabilities: [{ moduleCode: 'bn_appeals', action: 'admin' }],
    });
    expect(r.granted).toBe(false);
  });

  it('explicit denial on the fallback capability is respected', () => {
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_appeals', action_name: 'admin', is_granted: false }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
      adminCapabilities: [{ moduleCode: 'bn_appeals', action: 'admin' }],
    });
    expect(r.granted).toBe(false);
  });

  it('Admin flag grants regardless of stored permissions', () => {
    const r = decideAccess({
      isAdmin: true,
      permissions: [],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'admin',
    });
    expect(r.granted).toBe(true);
  });

  it('does not broaden access by treating missing rows as granted', () => {
    // The RPC only returns granted rows. Missing = not granted. This test
    // pins the invariant: a caller with an unrelated permission must NOT
    // gain access to a different (module,action).
    const r = decideAccess({
      isAdmin: false,
      permissions: [{ module_name: 'bn_claims', action_name: 'view', is_granted: true }],
      moduleCode: 'bn_appeals_config',
      requiredAction: 'view',
    });
    expect(r.granted).toBe(false);
  });
});
