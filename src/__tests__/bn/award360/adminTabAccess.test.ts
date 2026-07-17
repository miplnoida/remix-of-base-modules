/**
 * BN-AWARD360-ADMIN-1 — Administrator tab access and diagnostics.
 *
 * Verifies that:
 *  - Admin sees every tab whose module/route/view action is registered + enabled.
 *  - Admin does not require an explicit role_permissions grant.
 *  - Missing modules / actions remain denied even for admin.
 *  - Loading state does not prematurely deny access.
 *  - Communication rendered content stays hidden.
 *  - Tab visibility and query-enabled flag come from the same central result.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveAward360Capabilities,
  AWARD_360_CAPABILITY_REGISTRY,
  type Award360Capability,
  type RegistrySnapshot,
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

function buildFullRegistry(): RegistrySnapshot {
  const modules = new Set<string>(LIVE_MODULES);
  const actionsByModule = new Map<string, Set<string>>();
  for (const m of LIVE_MODULES) actionsByModule.set(m, new Set(['view']));
  // Extra actions found in live DB
  actionsByModule.get('bn_award_suspension')!.add('propose');
  actionsByModule.get('bn_award_suspension')!.add('approve');
  return { modules, actionsByModule };
}

function permsFromCapabilities(
  caps: Record<Award360Capability, ReturnType<typeof resolveAward360Capabilities>[Award360Capability]>,
  overrides: Partial<Award360Permissions> = {},
): Award360Permissions {
  const g = (c: Award360Capability) => caps[c]?.permissionGranted ?? false;
  return {
    canViewAward: g('AWARD_VIEW'),
    canViewCentralAudit: g('CENTRAL_AUDIT_VIEW'),
    canPropose: false,
    canApprove: false,
    canServiceLifeCert: g('LIFE_CERTIFICATE_VIEW'),
    canServiceMedical: g('MEDICAL_REVIEW_VIEW'),
    canServiceOverpayment: g('OVERPAYMENT_VIEW'),
    canServiceSuspension: g('SUSPENSION_VIEW'),
    canServicePayments: g('PAYMENT_HISTORY_VIEW') || g('PAYMENT_PROFILE_VIEW'),
    canServiceCommunications: g('COMMUNICATION_METADATA_VIEW'),
    canViewCommunicationContent: false,
    canViewSensitiveMedical: g('MEDICAL_REVIEW_VIEW'),
    isLoading: false,
    isReady: true,
    admin: { isAdmin: true, isLoading: false, isError: false, error: null, refetch: () => {} },
    registryError: null,
    userPermissionsError: null,
    hasPermissionResolutionError: false,
    refetchAllPermissions: async () => {},
    capabilities: caps,
    ...overrides,
  };
}

describe('BN-AWARD360-ADMIN-1 · administrator tab access', () => {
  const registry = buildFullRegistry();

  it('admin is granted every view capability when module + action exist', () => {
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    for (const cap of Object.keys(AWARD_360_CAPABILITY_REGISTRY) as Award360Capability[]) {
      const binding = AWARD_360_CAPABILITY_REGISTRY[cap];
      if (binding.denyForAll) {
        expect(caps[cap].permissionGranted).toBe(false);
      } else if (
        binding.moduleName &&
        binding.action &&
        registry.modules.has(binding.moduleName) &&
        registry.actionsByModule.get(binding.moduleName)?.has(binding.action)
      ) {
        expect(caps[cap].permissionGranted).toBe(true);
      }
    }
    // Communication rendered content always denied.
    expect(caps.COMMUNICATION_CONTENT_VIEW.permissionGranted).toBe(false);
  });

  it('admin does not need any explicit role_permissions row', () => {
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    const perms = permsFromCapabilities(caps);
    const tabs = computeAward360TabAccess(perms);
    for (const key of Object.keys(tabs)) {
      expect(tabs[key as keyof typeof tabs].visible).toBe(true);
      expect(tabs[key as keyof typeof tabs].queryEnabled).toBe(true);
    }
  });

  it('admin still denied when the module is missing', () => {
    const broken: RegistrySnapshot = {
      modules: new Set(LIVE_MODULES.filter((m) => m !== 'bn_survivors')),
      actionsByModule: registry.actionsByModule,
    };
    const caps = resolveAward360Capabilities({ registry: broken, userPermissions: [], isAdmin: true });
    expect(caps.BENEFICIARY_WORKSPACE_VIEW.permissionGranted).toBe(false);
    expect(caps.BENEFICIARY_WORKSPACE_VIEW.reason).toMatch(/module not found/i);
  });

  it('admin still denied when the view action is missing', () => {
    const modules = new Set(LIVE_MODULES);
    const actionsByModule = new Map<string, Set<string>>();
    for (const m of LIVE_MODULES) actionsByModule.set(m, new Set(['view']));
    actionsByModule.set('bn_awards_list', new Set()); // remove view
    const caps = resolveAward360Capabilities({
      registry: { modules, actionsByModule },
      userPermissions: [],
      isAdmin: true,
    });
    expect(caps.AWARD_VIEW.permissionGranted).toBe(false);
    expect(caps.AWARD_VIEW.reason).toMatch(/action not found/i);
  });

  it('non-admin without grants sees no tabs (BN-AWARD360-ADMIN-2: overview requires AWARD_VIEW)', () => {
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: false });
    const perms = permsFromCapabilities(caps, {
      admin: { isAdmin: false, isLoading: false, isError: false, error: null, refetch: () => {} },
    });
    const tabs = computeAward360TabAccess(perms);
    expect(tabs.overview.visible).toBe(false);
    expect(tabs.pensioner.visible).toBe(false);
    expect(tabs.pensioner.queryEnabled).toBe(false);
    expect(tabs.communications.visible).toBe(false);
  });

  it('loading state does not report denied tabs', () => {
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: false });
    const perms = permsFromCapabilities(caps, {
      isLoading: true,
      isReady: false,
      admin: { isAdmin: false, isLoading: true, isError: false, error: null, refetch: () => {} },
    });
    const tabs = computeAward360TabAccess(perms);
    // All tabs stay hidden with "Awaiting…" during resolution.
    expect(tabs.pensioner.reason).toMatch(/awaiting/i);
    expect(tabs.pensioner.queryEnabled).toBe(false);
    expect(tabs.overview.reason).toMatch(/awaiting/i);
    expect(tabs.overview.queryEnabled).toBe(false);
  });

  it('visibility and queryEnabled remain in sync from the same result', () => {
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    const tabs = computeAward360TabAccess(permsFromCapabilities(caps));
    for (const t of Object.values(tabs)) {
      if (t.capability === 'ALWAYS_VISIBLE') continue;
      expect(t.visible).toBe(t.queryEnabled);
    }
  });

  it('communication metadata visible to admin, content stays hidden', () => {
    const caps = resolveAward360Capabilities({ registry, userPermissions: [], isAdmin: true });
    expect(caps.COMMUNICATION_METADATA_VIEW.permissionGranted).toBe(true);
    expect(caps.COMMUNICATION_CONTENT_VIEW.permissionGranted).toBe(false);
    const perms = permsFromCapabilities(caps);
    expect(perms.canViewCommunicationContent).toBe(false);
    const tabs = computeAward360TabAccess(perms);
    expect(tabs.communications.visible).toBe(true);
  });
});
