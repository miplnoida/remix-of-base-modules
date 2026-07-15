/**
 * BN-AWARD360-B3 · Capability registry & resolver.
 *
 * Verifies that Award 360 permission resolution is bound to *real* live
 * `app_modules` / `module_actions` rows, that missing modules/actions produce
 * diagnostic denials rather than silent falsy results, and that
 * communication-content view is denied for every user (including admin).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  AWARD_360_CAPABILITY_REGISTRY,
  resolveAward360Capabilities,
  type Award360Capability,
  type RegistrySnapshot,
  type UserPermissionRecord,
} from '@/pages/bn/awards/award-360/award360Capabilities';

/**
 * Live registry fixture — mirrors the modules and view actions that were
 * verified against the connected database on 2026-07-15. If the live registry
 * changes, update this fixture and the affected tests together.
 */
const LIVE_MODULES: Record<string, string[]> = {
  bn_awards_list:                       ['create', 'edit', 'delete', 'view'],
  bn_awards_group:                      [],
  bn_award_suspension:                  ['view', 'propose', 'approve', 'audit', 'resume_propose', 'resume_approve', 'reverse'],
  bn_audit_history:                     ['create', 'edit', 'delete', 'view'],
  bn_life_certificates:                 ['view'],
  bn_medical_reviews:                   ['view'],
  bn_overpayments:                      ['view'],
  bn_payment_history:                   ['create', 'edit', 'delete', 'view'],
  bn_payment_profiles:                  ['create', 'edit', 'delete', 'view', 'verify', 'approve_change', 'reject_change'],
  bn_person_360:                        ['create', 'edit', 'delete', 'view'],
  bn_product_catalog:                   ['create', 'edit', 'delete', 'view'],
  bn_claim_worklist:                    ['create', 'edit', 'delete', 'view'],
  bn_communication_templates:           ['create', 'edit', 'delete', 'view'],
  communication_hub_lifecycle_log:      ['view'],
  communication_hub_delivery_monitor:   ['view'],
  communication_hub_dispatch_register:  ['view'],
};

function makeSnapshot(overrides?: Record<string, string[]>): RegistrySnapshot {
  const source = { ...LIVE_MODULES, ...(overrides ?? {}) };
  const modules = new Set<string>(Object.keys(source));
  const actionsByModule = new Map<string, Set<string>>();
  for (const [name, acts] of Object.entries(source)) {
    actionsByModule.set(name, new Set(acts));
  }
  return { modules, actionsByModule };
}

const NO_PERMS: UserPermissionRecord[] = [];
const grant = (moduleName: string, action_name: string): UserPermissionRecord => ({ module_name: moduleName, action_name });

describe('Award360 capability registry', () => {
  it('references only live app_modules names — no generic placeholders', () => {
    const forbidden = new Set(['bn_awards', 'bn_audit', 'bn_payments', 'bn_communications']);
    for (const cap of Object.keys(AWARD_360_CAPABILITY_REGISTRY) as Award360Capability[]) {
      const b = AWARD_360_CAPABILITY_REGISTRY[cap];
      if (b.moduleName) {
        expect(forbidden.has(b.moduleName), `${cap} must not use forbidden module ${b.moduleName}`).toBe(false);
      }
    }
  });

  it('every non-deny mapping targets a module that exists in the live fixture', () => {
    const snapshot = makeSnapshot();
    for (const cap of Object.keys(AWARD_360_CAPABILITY_REGISTRY) as Award360Capability[]) {
      const b = AWARD_360_CAPABILITY_REGISTRY[cap];
      if (b.denyForAll) continue;
      expect(snapshot.modules.has(b.moduleName!), `${cap}: module ${b.moduleName} not in live registry`).toBe(true);
      expect(snapshot.actionsByModule.get(b.moduleName!)?.has(b.action!),
        `${cap}: action ${b.moduleName}.${b.action} not in live registry`).toBe(true);
    }
  });
});

describe('resolveAward360Capabilities', () => {
  it('denies COMMUNICATION_CONTENT_VIEW for every user, including admin', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [],
      isAdmin: true,
    });
    expect(out.COMMUNICATION_CONTENT_VIEW.permissionGranted).toBe(false);
    expect(out.COMMUNICATION_CONTENT_VIEW.reason).toMatch(/deny/i);
  });

  it('admin bypass grants every mapped capability except deny-for-all', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [],
      isAdmin: true,
    });
    for (const cap of Object.keys(out) as Award360Capability[]) {
      const b = AWARD_360_CAPABILITY_REGISTRY[cap];
      if (b.denyForAll) continue;
      expect(out[cap].permissionGranted, `${cap} must be granted for admin`).toBe(true);
    }
  });

  it('non-admin viewer with only bn_awards_list.view opens Award 360 shell but nothing else', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [grant('bn_awards_list', 'view')],
      isAdmin: false,
    });
    expect(out.AWARD_VIEW.permissionGranted).toBe(true);
    expect(out.PENSIONER_VIEW.permissionGranted).toBe(false);
    expect(out.CLAIM_VIEW.permissionGranted).toBe(false);
    expect(out.PRODUCT_VIEW.permissionGranted).toBe(false);
    expect(out.PAYMENT_HISTORY_VIEW.permissionGranted).toBe(false);
    expect(out.CENTRAL_AUDIT_VIEW.permissionGranted).toBe(false);
  });

  it('person-360 viewer opens Pensioner data independently of Award view', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [grant('bn_person_360', 'view')],
      isAdmin: false,
    });
    expect(out.PENSIONER_VIEW.permissionGranted).toBe(true);
    expect(out.AWARD_VIEW.permissionGranted).toBe(false);
  });

  it('claim / product / payment-profile / payment-history / audit permissions are independent', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [
        grant('bn_claim_worklist', 'view'),
        grant('bn_product_catalog', 'view'),
        grant('bn_payment_profiles', 'view'),
      ],
      isAdmin: false,
    });
    expect(out.CLAIM_VIEW.permissionGranted).toBe(true);
    expect(out.PRODUCT_VIEW.permissionGranted).toBe(true);
    expect(out.PAYMENT_PROFILE_VIEW.permissionGranted).toBe(true);
    expect(out.PAYMENT_HISTORY_VIEW.permissionGranted).toBe(false);
    expect(out.CENTRAL_AUDIT_VIEW.permissionGranted).toBe(false);
  });

  it('communication metadata permission does NOT grant content access', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [grant('communication_hub_lifecycle_log', 'view')],
      isAdmin: false,
    });
    expect(out.COMMUNICATION_METADATA_VIEW.permissionGranted).toBe(true);
    expect(out.COMMUNICATION_CONTENT_VIEW.permissionGranted).toBe(false);
  });

  it('bn_communication_templates.view does NOT grant communication metadata access', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [grant('bn_communication_templates', 'view')],
      isAdmin: false,
    });
    expect(out.COMMUNICATION_METADATA_VIEW.permissionGranted).toBe(false);
  });

  it('missing module produces a diagnostic denial with a "Registered module not found" reason', () => {
    // Build a snapshot omitting bn_person_360 entirely.
    const { bn_person_360: _drop, ...rest } = LIVE_MODULES;
    const modules = new Set(Object.keys(rest));
    const actionsByModule = new Map<string, Set<string>>();
    for (const [name, acts] of Object.entries(rest)) actionsByModule.set(name, new Set(acts));
    const snapshot: RegistrySnapshot = { modules, actionsByModule };
    const warn = vi.fn();
    const out = resolveAward360Capabilities({
      registry: snapshot,
      userPermissions: [grant('bn_person_360', 'view')],
      isAdmin: false,
      warn,
    });
    expect(out.PENSIONER_VIEW.permissionGranted).toBe(false);
    expect(out.PENSIONER_VIEW.moduleExists).toBe(false);
    expect(out.PENSIONER_VIEW.reason).toMatch(/Registered module not found/);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/PENSIONER_VIEW/));
  });

  it('missing action produces a diagnostic denial with a "Registered action not found" reason', () => {
    const snapshot = makeSnapshot({ bn_life_certificates: [] });
    const warn = vi.fn();
    const out = resolveAward360Capabilities({
      registry: snapshot,
      userPermissions: [grant('bn_life_certificates', 'view')],
      isAdmin: false,
      warn,
    });
    expect(out.LIFE_CERTIFICATE_VIEW.permissionGranted).toBe(false);
    expect(out.LIFE_CERTIFICATE_VIEW.moduleExists).toBe(true);
    expect(out.LIFE_CERTIFICATE_VIEW.actionExists).toBe(false);
    expect(out.LIFE_CERTIFICATE_VIEW.reason).toMatch(/Registered action not found/);
    expect(warn).toHaveBeenCalled();
  });

  it('Batches 1 and 2 permissions execute when authorized', () => {
    const out = resolveAward360Capabilities({
      registry: makeSnapshot(),
      userPermissions: [
        grant('bn_awards_list', 'view'),
        grant('bn_life_certificates', 'view'),
        grant('bn_overpayments', 'view'),
        grant('communication_hub_lifecycle_log', 'view'),
        grant('bn_award_suspension', 'view'),
        grant('bn_payment_history', 'view'),
      ],
      isAdmin: false,
    });
    expect(out.LIFE_CERTIFICATE_VIEW.permissionGranted).toBe(true);
    expect(out.OVERPAYMENT_VIEW.permissionGranted).toBe(true);
    expect(out.COMMUNICATION_METADATA_VIEW.permissionGranted).toBe(true);
    expect(out.SUSPENSION_VIEW.permissionGranted).toBe(true);
    expect(out.PAYMENT_HISTORY_VIEW.permissionGranted).toBe(true);
    // Restricted queries still denied.
    expect(out.CENTRAL_AUDIT_VIEW.permissionGranted).toBe(false);
    expect(out.CLAIM_VIEW.permissionGranted).toBe(false);
  });
});
