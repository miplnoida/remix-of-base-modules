/**
 * AW360-WAVE-1-C1 Stage D4 — Negative security certification.
 *
 * Proves that blocked Award 360 actions cannot execute state changes when
 * invoked directly through the canonical guard, without any UI mediation.
 *
 * The guard is the single choke point that any real handler MUST call at
 * the top of its execution. If the guard throws, no mutation may proceed.
 *
 * Covers, per denial vector, every mutation action key:
 *   - unregistered action key
 *   - REGISTRATION_MISSING (owning-module row absent)
 *   - MODULE_DISABLED
 *   - ROUTES_DISABLED
 *   - PERMISSION_DENIED
 *   - MUTATION_DARK_LAUNCH / SERVER_COMMAND_UNAVAILABLE (default Wave 1 posture)
 *   - BUSINESS_INELIGIBLE (award lifecycle / row context)
 */
import { describe, it, expect } from 'vitest';
import {
  AWARD_ACTION_BINDINGS,
  AWARD_ACTION_IS_MUTATION,
  fullyRolledOutState,
  type AwardActionInput,
  type AwardActionKey,
  type AwardModuleRollout,
  type CapabilityResultLike,
} from '@/services/bn/awards/awardActionAvailability';
import {
  AwardActionGuardError,
  assertAwardActionExecutable,
  evaluateAwardActionGuard,
} from '@/services/bn/awards/awardActionGuard';

const MUTATION_KEYS = (Object.keys(AWARD_ACTION_BINDINGS) as AwardActionKey[])
  .filter((k) => AWARD_ACTION_IS_MUTATION[k]);

function moduleRollout(name: string, opts: Partial<AwardModuleRollout> = {}): AwardModuleRollout {
  return {
    moduleName: name,
    moduleExists: opts.moduleExists ?? true,
    isEnabled: opts.isEnabled ?? true,
    routesEnabled: opts.routesEnabled ?? true,
    actionsEnabled: opts.actionsEnabled ?? true,
    showInMenu: true,
  };
}
function capsFor(key: AwardActionKey, granted: boolean): AwardActionInput['capabilities'] {
  const bind = AWARD_ACTION_BINDINGS[key];
  const list = [bind.requiredCapability, ...(bind.additionalRequiredCapabilities ?? [])].filter(Boolean) as string[];
  const out: Record<string, CapabilityResultLike> = {};
  for (const c of list) {
    out[c] = {
      moduleName: bind.owningModule, action: c, moduleExists: true, actionExists: true,
      permissionGranted: granted, reason: granted ? 'ok' : 'denied',
    };
  }
  return out;
}
function baseInput(key: AwardActionKey, rollout: AwardModuleRollout | null, permsGranted: boolean): AwardActionInput {
  const bind = AWARD_ACTION_BINDINGS[key];
  return {
    action: key,
    awardId: 'award-1',
    claimId: 'claim-1',
    hasClaimId: true,
    hasProductVersion: true,
    awardStatus: key === 'PROPOSE_RESUMPTION' ? 'SUSPENDED' : 'ACTIVE',
    pensionerDeceased: false,
    permissions: {
      canViewAward: true, canViewCentralAudit: true, canServiceLifeCert: true,
      canServiceMedical: true, canServiceOverpayment: true, canServiceSuspension: true,
      canServicePayments: true, canServiceCommunications: true,
      canProposeSuspension: true, canApproveSuspension: true,
    },
    featureEnabled: {
      lifeCert: true, medicalReview: true, overpayment: true, awardSuspension: true, payments: true,
    },
    rolloutStates: fullyRolledOutState(),
    rollout: bind.owningModule && rollout ? { [bind.owningModule]: rollout } : {},
    capabilities: capsFor(key, permsGranted),
  };
}

function fullyOn(key: AwardActionKey): AwardModuleRollout | null {
  const bind = AWARD_ACTION_BINDINGS[key];
  return bind.owningModule ? moduleRollout(bind.owningModule) : null;
}

describe('Stage D4 · negative security — blocked mutations cannot execute directly', () => {
  it('rejects an unregistered action key even with full context', () => {
    const decision = evaluateAwardActionGuard({
      ...baseInput('CANCEL_PAYMENT', fullyOn('CANCEL_PAYMENT'), true),
      action: 'DOES_NOT_EXIST' as any,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('UNKNOWN_ACTION');
    expect(() => assertAwardActionExecutable({
      ...baseInput('CANCEL_PAYMENT', fullyOn('CANCEL_PAYMENT'), true),
      action: 'DOES_NOT_EXIST' as any,
    })).toThrow(AwardActionGuardError);
  });

  describe.each(MUTATION_KEYS)('mutation %s cannot execute when', (key) => {
    it('REGISTRATION_MISSING', () => {
      const bind = AWARD_ACTION_BINDINGS[key];
      if (!bind.owningModule) return;
      const input = baseInput(key, moduleRollout(bind.owningModule, {
        moduleExists: false, isEnabled: false, routesEnabled: false, actionsEnabled: false,
      }), true);
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      expect(d.reasonCode).toBe('REGISTRATION_MISSING');
      expect(() => assertAwardActionExecutable(input)).toThrow(AwardActionGuardError);
    });

    it('MODULE_DISABLED', () => {
      const bind = AWARD_ACTION_BINDINGS[key];
      if (!bind.owningModule) return;
      const input = baseInput(key, moduleRollout(bind.owningModule, { isEnabled: false }), true);
      const d = evaluateAwardActionGuard(input);
      expect(d.reasonCode).toBe('MODULE_DISABLED');
      expect(() => assertAwardActionExecutable(input)).toThrow(AwardActionGuardError);
    });

    it('ROUTES_DISABLED', () => {
      const bind = AWARD_ACTION_BINDINGS[key];
      if (!bind.owningModule) return;
      const input = baseInput(key, moduleRollout(bind.owningModule, { routesEnabled: false }), true);
      expect(evaluateAwardActionGuard(input).reasonCode).toBe('ROUTES_DISABLED');
      expect(() => assertAwardActionExecutable(input)).toThrow(AwardActionGuardError);
    });

    it('MUTATION_DARK_LAUNCH (actions_enabled=false, default posture)', () => {
      const bind = AWARD_ACTION_BINDINGS[key];
      if (!bind.owningModule) return;
      const input = baseInput(key, moduleRollout(bind.owningModule, { actionsEnabled: false }), true);
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      // Legacy suspension actions with `canProposeSuspension` fallback may
      // still reach MUTATION_DARK_LAUNCH; all mutations must be blocked.
      expect(['MUTATION_DARK_LAUNCH', 'SERVER_COMMAND_UNAVAILABLE', 'PERMISSION_DENIED', 'BUSINESS_INELIGIBLE'])
        .toContain(d.reasonCode);
      expect(() => assertAwardActionExecutable(input)).toThrow(AwardActionGuardError);
    });

    it('SERVER_COMMAND_UNAVAILABLE (rollout fully on, but no server command)', () => {
      const input = baseInput(key, fullyOn(key), true);
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      // Every Wave 1 mutation has serverCommandAvailable=false.
      expect(['SERVER_COMMAND_UNAVAILABLE', 'MUTATION_DARK_LAUNCH', 'PERMISSION_DENIED', 'BUSINESS_INELIGIBLE'])
        .toContain(d.reasonCode);
      expect(() => assertAwardActionExecutable(input)).toThrow(AwardActionGuardError);
    });

    it('PERMISSION_DENIED (capability revoked)', () => {
      const input = baseInput(key, fullyOn(key), false);
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      expect(d.reasonCode).toBe('PERMISSION_DENIED');
      expect(() => assertAwardActionExecutable(input)).toThrow(AwardActionGuardError);
    });
  });

  it('BUSINESS_INELIGIBLE — PROPOSE_RESUMPTION blocked when award is not SUSPENDED', () => {
    const input: AwardActionInput = {
      ...baseInput('PROPOSE_RESUMPTION', fullyOn('PROPOSE_RESUMPTION'), true),
      awardStatus: 'ACTIVE',
    };
    const d = evaluateAwardActionGuard(input);
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('BUSINESS_INELIGIBLE');
    expect(() => assertAwardActionExecutable(input)).toThrow(AwardActionGuardError);
  });

  it('BUSINESS_INELIGIBLE — ADD_BENEFICIARY blocked when pensioner is deceased', () => {
    const input: AwardActionInput = {
      ...baseInput('ADD_BENEFICIARY', fullyOn('ADD_BENEFICIARY'), true),
      pensionerDeceased: true,
    };
    const d = evaluateAwardActionGuard(input);
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('BUSINESS_INELIGIBLE');
  });

  it('stale-state coverage: an action initially allowed becomes denied after registration flips', () => {
    // Snapshot 1: fully on — navigation is ALLOWED.
    const t1 = baseInput('OPEN_PAYMENT_SCHEDULE', fullyOn('OPEN_PAYMENT_SCHEDULE'), true);
    expect(evaluateAwardActionGuard(t1).allowed).toBe(true);
    // Snapshot 2 (guard re-evaluated at execution time): module disabled since UI cached decision.
    const bind = AWARD_ACTION_BINDINGS['OPEN_PAYMENT_SCHEDULE'];
    const t2: AwardActionInput = {
      ...t1,
      rollout: { [bind.owningModule!]: moduleRollout(bind.owningModule!, { isEnabled: false }) },
    };
    const d = evaluateAwardActionGuard(t2);
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('MODULE_DISABLED');
  });
});
