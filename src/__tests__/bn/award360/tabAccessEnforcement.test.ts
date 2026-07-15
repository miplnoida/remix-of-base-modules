/**
 * BN-AWARD360-ADMIN-2 — Central tab-access enforcement.
 *
 * Verifies that:
 *  - Overview requires AWARD_VIEW (bn_awards_list.view), not ALWAYS_VISIBLE.
 *  - Effective access reflects module/route/action enable flags.
 *  - `actions_enabled=false` does NOT block read-only view access.
 *  - Disabled route denies the tab.
 *  - Missing/disabled action denies the tab.
 *  - Admin bypasses per-user permission but NOT module/route disable.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveAward360Capabilities,
  type RegistrySnapshot,
  type Award360ModuleRegistryState,
} from '@/pages/bn/awards/award-360/award360Capabilities';
import { computeAward360TabAccess } from '@/pages/bn/awards/award-360/useAward360TabAccess';
import type { Award360Permissions } from '@/pages/bn/awards/award-360/useAwardPermissions';

const LIVE_MODULES = [
  'bn_awards_list', 'bn_person_360', 'bn_claim_worklist', 'bn_product_catalog',
  'bn_survivors', 'bn_payment_history', 'bn_payment_profiles', 'bn_life_certificates',
  'bn_medical_reviews', 'bn_award_suspension', 'bn_overpayments',
  'communication_hub_lifecycle_log', 'communication_hub_delivery_monitor',
  'communication_hub_dispatch_register', 'communication_hub_retry_queue',
  'bn_audit_history',
];

function state(name: string, overrides: Partial<Award360ModuleRegistryState> = {}): Award360ModuleRegistryState {
  return {
    moduleName: name,
    moduleExists: true,
    moduleEnabled: true,
    routesEnabled: true,
    actionsEnabled: true,
    showInMenu: true,
    rolloutState: 'production',
    internalOnly: false,
    ...overrides,
  };
}

function buildRegistry(overrides: Record<string, Partial<Award360ModuleRegistryState>> = {}): RegistrySnapshot {
  const modules = new Set<string>(LIVE_MODULES);
  const actionsByModule = new Map<string, Set<string>>();
  const actionEnabledByModule = new Map<string, Map<string, boolean>>();
  for (const m of LIVE_MODULES) {
    actionsByModule.set(m, new Set(['view']));
    actionEnabledByModule.set(m, new Map([['view', true]]));
  }
  actionsByModule.get('bn_award_suspension')!.add('propose');
  actionsByModule.get('bn_award_suspension')!.add('approve');
  actionEnabledByModule.get('bn_award_suspension')!.set('propose', true);
  actionEnabledByModule.get('bn_award_suspension')!.set('approve', true);
  const moduleStates = new Map<string, Award360ModuleRegistryState>();
  for (const m of LIVE_MODULES) moduleStates.set(m, state(m, overrides[m]));
  return { modules, actionsByModule, moduleStates, actionEnabledByModule };
}

function permsFromCaps(caps: any, overrides: Partial<Award360Permissions> = {}): Award360Permissions {
  return {
    canViewAward: caps.AWARD_VIEW?.permissionGranted ?? false,
    canViewCentralAudit: false,
    canPropose: false, canApprove: false,
    canServiceLifeCert: false, canServiceMedical: false,
    canServiceOverpayment: false, canServiceSuspension: false,
    canServicePayments: false, canServiceCommunications: false,
    canViewCommunicationContent: false, canViewSensitiveMedical: false,
    isLoading: false, isReady: true,
    admin: { isAdmin: true, isLoading: false, isError: false, error: null, refetch: () => {} },
    registryError: null, userPermissionsError: null,
    hasPermissionResolutionError: false, refetchAllPermissions: () => {},
    capabilities: caps,
    ...overrides,
  };
}

describe('BN-AWARD360-ADMIN-2 · tab access enforcement', () => {
  it('Overview requires AWARD_VIEW (denied for user without bn_awards_list.view)', () => {
    const registry = buildRegistry();
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: false });
    const access = computeAward360TabAccess(permsFromCaps(caps, {
      admin: { isAdmin: false, isLoading: false, isError: false, error: null, refetch: () => {} },
    }));
    expect(access.overview.visible).toBe(false);
    expect(access.overview.queryEnabled).toBe(false);
    expect(access.overview.capability).toBe('AWARD_VIEW');
  });

  it('Admin sees all 13 tabs when all modules/routes/actions are enabled', () => {
    const registry = buildRegistry();
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    const access = computeAward360TabAccess(permsFromCaps(caps));
    for (const tab of Object.values(access)) {
      expect(tab.visible).toBe(true);
      expect(tab.queryEnabled).toBe(true);
    }
  });

  it('routes_enabled=false denies the tab', () => {
    const registry = buildRegistry({ bn_awards_list: { routesEnabled: false } });
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    expect(caps.AWARD_VIEW.effectiveAccess).toBe(false);
    expect(caps.AWARD_VIEW.routeEnabled).toBe(false);
    const access = computeAward360TabAccess(permsFromCaps(caps));
    expect(access.overview.visible).toBe(false);
  });

  it('actions_enabled=false does NOT deny read-only view', () => {
    // Module has actions_enabled=false; view action still enabled → view allowed.
    const registry = buildRegistry({ bn_awards_list: { actionsEnabled: false } });
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    expect(caps.AWARD_VIEW.effectiveAccess).toBe(true);
    expect(caps.AWARD_VIEW.permissionGranted).toBe(true);
  });

  it('disabled view action denies the tab', () => {
    const registry = buildRegistry();
    // Flip bn_audit_history.view enabled=false
    const em = new Map(registry.actionEnabledByModule!.get('bn_audit_history') as any);
    em.set('view', false);
    (registry.actionEnabledByModule as Map<string, Map<string, boolean>>).set('bn_audit_history', em as any);
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    expect(caps.CENTRAL_AUDIT_VIEW.actionEnabled).toBe(false);
    expect(caps.CENTRAL_AUDIT_VIEW.effectiveAccess).toBe(false);
  });

  it('non-admin only sees explicitly authorized tabs', () => {
    const registry = buildRegistry();
    const caps = resolveAward360Capabilities({
      registry,
      userPermissions: [{ module_name: 'bn_awards_list', action_name: 'view' }],
      isAdmin: false,
    });
    const access = computeAward360TabAccess(permsFromCaps(caps, {
      admin: { isAdmin: false, isLoading: false, isError: false, error: null, refetch: () => {} },
    }));
    expect(access.overview.visible).toBe(true);
    expect(access.beneficiaries.visible).toBe(true); // uses AWARD_VIEW
    expect(access.audit.visible).toBe(false);
    expect(access.pensioner.visible).toBe(false);
    expect(access.communications.visible).toBe(false);
  });

  it('Communication content remains hidden even for admin', () => {
    const registry = buildRegistry();
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    expect(caps.COMMUNICATION_CONTENT_VIEW.permissionGranted).toBe(false);
    expect(caps.COMMUNICATION_CONTENT_VIEW.effectiveAccess).toBe(false);
  });
});
