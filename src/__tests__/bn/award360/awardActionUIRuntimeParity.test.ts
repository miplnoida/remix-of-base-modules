/**
 * AW360-WAVE-1-C1 Stage D4 — UI ↔ runtime parity + consumer inventory
 * reconciliation.
 */
import { describe, it, expect } from 'vitest';
import {
  AWARD_ACTION_BINDINGS,
  AWARD_ACTION_IS_MUTATION,
  fullyRolledOutState,
  getAwardActionAvailability,
  type AwardActionInput,
  type AwardActionKey,
  type AwardModuleRollout,
  type CapabilityResultLike,
} from '@/services/bn/awards/awardActionAvailability';
import { evaluateAwardActionGuard } from '@/services/bn/awards/awardActionGuard';
import {
  AWARD_ACTION_CONSUMER_INVENTORY,
  summariseAwardActionInventory,
} from '@/services/bn/awards/awardActionConsumerInventory';
import {
  AWARD360_MANIFEST_STATUS,
  AWARD360_MANIFEST_VERSION,
} from '@/services/bn/awards/award360LoaderManifest';

const KEYS = Object.keys(AWARD_ACTION_BINDINGS) as AwardActionKey[];

function moduleRollout(name: string, actionsEnabled = true): AwardModuleRollout {
  return { moduleName: name, moduleExists: true, isEnabled: true, routesEnabled: true, actionsEnabled, showInMenu: true };
}
function capsFor(key: AwardActionKey, granted: boolean): AwardActionInput['capabilities'] {
  const b = AWARD_ACTION_BINDINGS[key];
  const list = [b.requiredCapability, ...(b.additionalRequiredCapabilities ?? [])].filter(Boolean) as string[];
  const out: Record<string, CapabilityResultLike> = {};
  for (const c of list) {
    out[c] = { moduleName: b.owningModule, action: c, moduleExists: true, actionExists: true, permissionGranted: granted, reason: granted ? 'ok' : 'denied' };
  }
  return out;
}
function baseInput(key: AwardActionKey, permsGranted: boolean, actionsEnabled = true): AwardActionInput {
  const b = AWARD_ACTION_BINDINGS[key];
  return {
    action: key,
    awardId: 'a', claimId: 'c', hasClaimId: true, hasProductVersion: true,
    awardStatus: key === 'PROPOSE_RESUMPTION' ? 'SUSPENDED' : 'ACTIVE',
    pensionerDeceased: false,
    permissions: {
      canViewAward: true, canViewCentralAudit: true, canServiceLifeCert: true,
      canServiceMedical: true, canServiceOverpayment: true, canServiceSuspension: true,
      canServicePayments: true, canServiceCommunications: true,
      canProposeSuspension: true, canApproveSuspension: true,
    },
    featureEnabled: { lifeCert: true, medicalReview: true, overpayment: true, awardSuspension: true, payments: true },
    rolloutStates: fullyRolledOutState(),
    rollout: b.owningModule ? { [b.owningModule]: moduleRollout(b.owningModule, actionsEnabled) } : {},
    capabilities: capsFor(key, permsGranted),
  };
}

describe('Stage D4 · UI ↔ runtime parity', () => {
  it.each(KEYS)('%s: guard.allowed === resolver.enabled (allowed path)', (key) => {
    const input = baseInput(key, true);
    const av = getAwardActionAvailability(input);
    const d = evaluateAwardActionGuard(input);
    expect(d.allowed).toBe(av.enabled);
  });

  it.each(KEYS)('%s: guard.allowed === resolver.enabled (permission denied)', (key) => {
    const input = baseInput(key, false);
    const av = getAwardActionAvailability(input);
    const d = evaluateAwardActionGuard(input);
    expect(d.allowed).toBe(av.enabled);
    expect(d.allowed).toBe(false);
  });
});

describe('Stage D4 · consumer inventory reconciliation', () => {
  it('every registered action has an inventory entry', () => {
    const inventoryKeys = Object.keys(AWARD_ACTION_CONSUMER_INVENTORY);
    expect(new Set(inventoryKeys)).toEqual(new Set(KEYS));
  });

  it('no orphaned registrations (every action has at least one UI surface)', () => {
    const summary = summariseAwardActionInventory();
    expect(summary.orphanedRegistrations).toEqual([]);
    expect(summary.actionsWithUiConsumers).toBe(KEYS.length);
  });

  it('every action is guarded by the canonical runtime guard', () => {
    const summary = summariseAwardActionInventory();
    expect(summary.actionsGuarded).toBe(KEYS.length);
    expect(summary.unguardedMutations).toEqual([]);
  });

  it('mutation vs navigation counts derive from the resolver, not local flags', () => {
    const summary = summariseAwardActionInventory();
    const mutationCount = KEYS.filter((k) => AWARD_ACTION_IS_MUTATION[k]).length;
    expect(summary.mutationActions).toBe(mutationCount);
    expect(summary.navigationActions).toBe(KEYS.length - mutationCount);
  });

  it('Stage D5 posture: only the approved pilot actions have mutation handlers', () => {
    const summary = summariseAwardActionInventory();
    // The rest of the mutation surface stays dark-launched.
    expect(summary.actionsWithMutationHandlers).toBe(summary.pilotActions.length);
    expect(summary.actionsWithMutationHandlers).toBeGreaterThan(0);
    expect(summary.darkLaunchedMutations.length).toBeGreaterThan(0);
  });
});

describe('Stage D5 · manifest promotion', () => {
  it('manifest is promoted to PILOT_MUTATION_CERTIFIED at D5 tag', () => {
    expect(AWARD360_MANIFEST_STATUS).toBe('PILOT_MUTATION_CERTIFIED');
    expect(AWARD360_MANIFEST_VERSION).toMatch(/D5/);
  });
});

