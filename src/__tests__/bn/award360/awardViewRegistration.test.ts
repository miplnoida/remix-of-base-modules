/**
 * BN-AWARD360-B3-C1 — Award view capability registration.
 *
 * These tests exercise the capability resolver directly (no DB) to prove that
 * the fail-closed / registered / disabled paths for `bn_awards_list.view`
 * behave correctly regardless of admin status, matching the resolver contract
 * the deployment repair migration relies on.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveAward360Capabilities,
  type RegistrySnapshot,
  type UserPermissionRecord,
} from '@/pages/bn/awards/award-360/award360Capabilities';

function makeRegistry(opts: {
  hasModule?: boolean;
  hasAction?: boolean;
  actionEnabled?: boolean;
}): RegistrySnapshot {
  const modules = new Set<string>();
  const actionsByModule = new Map<string, Set<string>>();
  const moduleStates = new Map<string, any>();
  const actionEnabledByModule = new Map<string, Map<string, boolean>>();
  if (opts.hasModule !== false) {
    modules.add('bn_awards_list');
    moduleStates.set('bn_awards_list', {
      moduleName: 'bn_awards_list',
      moduleExists: true,
      moduleEnabled: true,
      routesEnabled: true,
      actionsEnabled: true,
      showInMenu: true,
      rolloutState: 'active',
      internalOnly: false,
    });
    const actions = new Set<string>();
    if (opts.hasAction) actions.add('view');
    actionsByModule.set('bn_awards_list', actions);
    if (opts.hasAction) {
      const em = new Map<string, boolean>();
      em.set('view', opts.actionEnabled !== false);
      actionEnabledByModule.set('bn_awards_list', em);
    }
  }
  return { modules, actionsByModule, moduleStates, actionEnabledByModule };
}

const emptyUserPerms: UserPermissionRecord[] = [];
const withView: UserPermissionRecord[] = [{ module_name: 'bn_awards_list', action_name: 'view' }];

describe('Award view capability registration', () => {
  it('missing action → fail-closed denial with "Registered action not found"', () => {
    const caps = resolveAward360Capabilities({
      registry: makeRegistry({ hasAction: false }),
      userPermissions: emptyUserPerms,
      isAdmin: false,
    });
    expect(caps.AWARD_VIEW.permissionGranted).toBe(false);
    expect(caps.AWARD_VIEW.reason).toMatch(/Registered action not found/);
    expect(caps.AWARD_VIEW.actionExists).toBe(false);
  });

  it('missing action denies admin (no bypass when action is unregistered)', () => {
    const caps = resolveAward360Capabilities({
      registry: makeRegistry({ hasAction: false }),
      userPermissions: emptyUserPerms,
      isAdmin: true,
    });
    expect(caps.AWARD_VIEW.permissionGranted).toBe(false);
    expect(caps.AWARD_VIEW.reason).toMatch(/Registered action not found/);
  });

  it('registered + enabled + admin → granted', () => {
    const caps = resolveAward360Capabilities({
      registry: makeRegistry({ hasAction: true, actionEnabled: true }),
      userPermissions: emptyUserPerms,
      isAdmin: true,
    });
    expect(caps.AWARD_VIEW.permissionGranted).toBe(true);
  });

  it('registered + enabled + non-admin with grant → granted', () => {
    const caps = resolveAward360Capabilities({
      registry: makeRegistry({ hasAction: true, actionEnabled: true }),
      userPermissions: withView,
      isAdmin: false,
    });
    expect(caps.AWARD_VIEW.permissionGranted).toBe(true);
  });

  it('registered + enabled + non-admin without grant → denied', () => {
    const caps = resolveAward360Capabilities({
      registry: makeRegistry({ hasAction: true, actionEnabled: true }),
      userPermissions: emptyUserPerms,
      isAdmin: false,
    });
    expect(caps.AWARD_VIEW.permissionGranted).toBe(false);
    expect(caps.AWARD_VIEW.reason).not.toMatch(/Registered action not found/);
  });

  it('registered but disabled → "Action disabled" (not "not found")', () => {
    const caps = resolveAward360Capabilities({
      registry: makeRegistry({ hasAction: true, actionEnabled: false }),
      userPermissions: withView,
      isAdmin: true,
    });
    expect(caps.AWARD_VIEW.permissionGranted).toBe(false);
    expect(caps.AWARD_VIEW.reason).toMatch(/Action disabled/);
    expect(caps.AWARD_VIEW.reason).not.toMatch(/Registered action not found/);
  });
});
