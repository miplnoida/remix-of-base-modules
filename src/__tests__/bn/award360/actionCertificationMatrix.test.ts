/**
 * AW360-WAVE-1-C1 Stage D3 — Matrix-driven action certification.
 *
 * Parameterised suite that iterates every AwardActionKey and asserts:
 *  1. Definition metadata (feature flag, business eligibility, route,
 *     capability, module) matches the canonical resolver source in
 *     `awardActionAvailability.ts` — the catalog cannot drift.
 *  2. Missing owning-module registration disables the action (fail-closed).
 *  3. Missing action registration disables the action (fail-closed).
 *  4. Navigation actions are enabled with a fully-registered module + full
 *     permissions + business context.
 *  5. Mutation actions remain DISABLED even when all gates pass, because
 *     `serverCommandAvailable=false` in Wave 1 (dark launch preserved).
 *  6. `actions_enabled=false` disables mutations but preserves navigation.
 */
import { describe, it, expect } from 'vitest';
import {
  AWARD_ACTION_BINDINGS,
  AWARD_ACTION_BUSINESS_ELIGIBILITY,
  AWARD_ACTION_FEATURE_FLAG,
  AWARD_ACTION_IS_MUTATION,
  AWARD_ACTION_SERVER_COMMAND_AVAILABLE,
  fullyRolledOutState,
  getAwardActionAvailability,
  type AwardActionInput,
  type AwardActionKey,
  type AwardModuleRollout,
  type CapabilityResultLike,
} from '@/services/bn/awards/awardActionAvailability';
import { AWARD_ACTION_DEFINITIONS } from '@/services/bn/awards/awardActionCatalog';

const ACTION_KEYS = Object.keys(AWARD_ACTION_BINDINGS) as AwardActionKey[];

function fullPermissions(): AwardActionInput['permissions'] {
  return {
    canViewAward: true,
    canViewCentralAudit: true,
    canServiceLifeCert: true,
    canServiceMedical: true,
    canServiceOverpayment: true,
    canServiceSuspension: true,
    canServicePayments: true,
    canServiceCommunications: true,
    canProposeSuspension: true,
    canApproveSuspension: true,
  };
}

function fullFeatures(): AwardActionInput['featureEnabled'] {
  return {
    lifeCert: true,
    medicalReview: true,
    overpayment: true,
    awardSuspension: true,
    payments: true,
  };
}

function capabilityFor(key: AwardActionKey, granted: boolean, actionExists = true): CapabilityResultLike {
  const binding = AWARD_ACTION_BINDINGS[key];
  return {
    moduleName: binding.owningModule,
    action: binding.requiredCapability ?? 'view',
    moduleExists: true,
    actionExists,
    permissionGranted: granted,
    reason: granted ? 'ok' : 'denied',
  };
}

function fullCapabilities(key: AwardActionKey, granted = true): AwardActionInput['capabilities'] {
  const binding = AWARD_ACTION_BINDINGS[key];
  const caps: Record<string, CapabilityResultLike> = {};
  const list = [binding.requiredCapability, ...(binding.additionalRequiredCapabilities ?? [])].filter(Boolean) as string[];
  for (const cap of list) caps[cap] = capabilityFor(key, granted);
  return caps;
}

function moduleRollout(name: string, enabled: boolean, actionsEnabled = true): AwardModuleRollout {
  return {
    moduleName: name,
    moduleExists: true,
    isEnabled: enabled,
    routesEnabled: enabled,
    actionsEnabled,
    showInMenu: enabled,
  };
}

function baseInput(key: AwardActionKey): AwardActionInput {
  return {
    action: key,
    awardId: 'award-1',
    claimId: 'claim-1',
    hasClaimId: true,
    hasProductVersion: true,
    awardStatus: key === 'PROPOSE_RESUMPTION' ? 'SUSPENDED' : 'ACTIVE',
    pensionerDeceased: false,
    permissions: fullPermissions(),
    featureEnabled: fullFeatures(),
    rolloutStates: fullyRolledOutState(),
    context: {
      beneficiaryStatus: null,
      overpaymentOutstanding: 100,
      overpaymentRecoveryStatus: 'ACTIVE',
      communicationStatus: 'FAILED',
      personId: 'p-1',
    },
  };
}


describe('AW360 Stage D3 · matrix-driven action certification', () => {
  it.each(ACTION_KEYS)('%s · definition metadata matches canonical resolver source', (key) => {
    const def = AWARD_ACTION_DEFINITIONS.find((d) => d.key === key)!;
    expect(def).toBeDefined();
    expect(def.featureFlag).toBe(AWARD_ACTION_FEATURE_FLAG[key]);
    expect(def.businessEligibilityCode).toBe(AWARD_ACTION_BUSINESS_ELIGIBILITY[key].code);
    expect(def.businessEligibilityDescription).toBe(AWARD_ACTION_BUSINESS_ELIGIBILITY[key].description);
    expect(def.isMutation).toBe(AWARD_ACTION_IS_MUTATION[key]);
    expect(def.serverCommandAvailable).toBe(AWARD_ACTION_SERVER_COMMAND_AVAILABLE[key]);
    expect(def.requiredCapability).toBe(AWARD_ACTION_BINDINGS[key].requiredCapability);
    expect(def.owningModule).toBe(AWARD_ACTION_BINDINGS[key].owningModule);
    expect(def.routeTemplate.startsWith('/')).toBe(true);
  });

  it.each(ACTION_KEYS)('%s · missing owning-module registration → disabled', (key) => {
    const binding = AWARD_ACTION_BINDINGS[key];
    if (!binding.owningModule) return; // skip if no module binding
    const input: AwardActionInput = {
      ...baseInput(key),
      capabilities: fullCapabilities(key, true),
      rollout: { [binding.owningModule]: { moduleExists: false, moduleEnabled: false, routesEnabled: false, actionsEnabled: false } },
    };
    const r = getAwardActionAvailability(input);
    expect(r.enabled).toBe(false);
    expect(r.executionMode).toBe('DISABLED');
  });

  it.each(ACTION_KEYS)('%s · missing action registration → disabled (fail-closed)', (key) => {
    const binding = AWARD_ACTION_BINDINGS[key];
    if (!binding.requiredCapability) return;
    const caps: Record<string, CapabilityResultLike> = {};
    caps[binding.requiredCapability] = { ...capabilityFor(key, false, false), permissionGranted: false };
    for (const extra of binding.additionalRequiredCapabilities ?? []) {
      caps[extra] = capabilityFor(key, true);
    }
    const input: AwardActionInput = {
      ...baseInput(key),
      capabilities: caps,
      rollout: binding.owningModule ? { [binding.owningModule]: moduleRollout(true) } : undefined,
    };
    const r = getAwardActionAvailability(input);
    expect(r.permissionGranted).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it.each(ACTION_KEYS.filter((k) => !AWARD_ACTION_IS_MUTATION[k]))(
    '%s · navigation action enables when all gates pass',
    (key) => {
      const binding = AWARD_ACTION_BINDINGS[key];
      const input: AwardActionInput = {
        ...baseInput(key),
        capabilities: fullCapabilities(key, true),
        rollout: binding.owningModule ? { [binding.owningModule]: moduleRollout(true) } : undefined,
      };
      const r = getAwardActionAvailability(input);
      expect(r.enabled).toBe(true);
      expect(r.executionMode).toBe('NAVIGATE');
      expect(r.targetRoute).toBeTruthy();
    },
  );

  it.each(ACTION_KEYS.filter((k) => AWARD_ACTION_IS_MUTATION[k]))(
    '%s · mutation stays DISABLED with serverCommandAvailable=false (Wave 1 dark launch preserved)',
    (key) => {
      const binding = AWARD_ACTION_BINDINGS[key];
      const input: AwardActionInput = {
        ...baseInput(key),
        capabilities: fullCapabilities(key, true),
        rollout: binding.owningModule ? { [binding.owningModule]: moduleRollout(true, true) } : undefined,
      };
      const r = getAwardActionAvailability(input);
      expect(AWARD_ACTION_SERVER_COMMAND_AVAILABLE[key]).toBe(false);
      expect(r.executionMode).toBe('DISABLED');
      expect(r.enabled).toBe(false);
    },
  );

  it.each(ACTION_KEYS.filter((k) => AWARD_ACTION_IS_MUTATION[k]))(
    '%s · actions_enabled=false keeps navigation reachable via route but the mutation stays disabled',
    (key) => {
      const binding = AWARD_ACTION_BINDINGS[key];
      const input: AwardActionInput = {
        ...baseInput(key),
        capabilities: fullCapabilities(key, true),
        rollout: binding.owningModule ? { [binding.owningModule]: moduleRollout(true, false) } : undefined,
      };
      const r = getAwardActionAvailability(input);
      expect(r.enabled).toBe(false);
      expect(r.executionMode).toBe('DISABLED');
      // Route still resolvable so the UI can open specialist workspace.
      expect(r.targetRoute).toBeTruthy();
    },
  );
});
