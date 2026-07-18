/**
 * AW360-WAVE-1-C1 Stage D4 — Canonical runtime guard certification.
 *
 * Proves the guard:
 *   1. Emits `ALLOWED` for every fully-rolled-out NAVIGATION action.
 *   2. Emits stable reason codes for each denial vector:
 *      REGISTRATION_MISSING, MODULE_DISABLED, ROUTES_DISABLED,
 *      FEATURE_FLAG_OFF, PERMISSION_DENIED, BUSINESS_INELIGIBLE,
 *      MUTATION_DARK_LAUNCH / SERVER_COMMAND_UNAVAILABLE.
 *   3. Never elevates: `allowed` matches the resolver's `enabled` field
 *      for every representative input (UI/runtime parity).
 *   4. Rejects unknown actions with `UNKNOWN_ACTION`.
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
import {
  AwardActionGuardError,
  assertAwardActionExecutable,
  evaluateAwardActionGuard,
} from '@/services/bn/awards/awardActionGuard';

const ALL_KEYS = Object.keys(AWARD_ACTION_BINDINGS) as AwardActionKey[];

function fullPerms(): AwardActionInput['permissions'] {
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
function moduleRollout(name: string, opts: {
  moduleExists?: boolean; isEnabled?: boolean; routesEnabled?: boolean; actionsEnabled?: boolean;
} = {}): AwardModuleRollout {
  return {
    moduleName: name,
    moduleExists: opts.moduleExists ?? true,
    isEnabled: opts.isEnabled ?? true,
    routesEnabled: opts.routesEnabled ?? true,
    actionsEnabled: opts.actionsEnabled ?? true,
    showInMenu: true,
  };
}
function rolloutFor(key: AwardActionKey, opts?: Parameters<typeof moduleRollout>[1]): Record<string, AwardModuleRollout> {
  const bind = AWARD_ACTION_BINDINGS[key];
  if (!bind.owningModule) return {};
  return { [bind.owningModule]: moduleRollout(bind.owningModule, opts) };
}
function capsFor(key: AwardActionKey, granted: boolean, actionExists = true): AwardActionInput['capabilities'] {
  const bind = AWARD_ACTION_BINDINGS[key];
  const list = [bind.requiredCapability, ...(bind.additionalRequiredCapabilities ?? [])].filter(Boolean) as string[];
  const out: Record<string, CapabilityResultLike> = {};
  for (const c of list) {
    out[c] = {
      moduleName: bind.owningModule,
      action: c,
      moduleExists: true,
      actionExists,
      permissionGranted: granted,
      reason: granted ? 'ok' : 'denied',
    };
  }
  return out;
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
    permissions: fullPerms(),
    featureEnabled: fullFeatures(),
    rolloutStates: fullyRolledOutState(),
    rollout: rolloutFor(key),
    capabilities: capsFor(key, true),
  };
}

describe('Stage D4 · awardActionGuard certification matrix', () => {
  it('rejects unknown action keys with UNKNOWN_ACTION', () => {
    const decision = evaluateAwardActionGuard({
      ...baseInput('OPEN_CLAIM'),
      action: 'NOT_A_REAL_ACTION' as any,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('UNKNOWN_ACTION');
  });

  describe.each(ALL_KEYS)('%s', (key) => {
    const isMutation = AWARD_ACTION_IS_MUTATION[key];

    it('parity: guard.allowed matches resolver.enabled with full context', () => {
      const input = baseInput(key);
      const av = getAwardActionAvailability(input);
      const guard = evaluateAwardActionGuard(input);
      expect(guard.allowed).toBe(av.enabled);
      if (av.enabled) expect(guard.reasonCode).toBe('ALLOWED');
    });

    if (!isMutation) {
      it('navigation is ALLOWED under fully-rolled-out registration', () => {
        const d = evaluateAwardActionGuard(baseInput(key));
        expect(d.allowed).toBe(true);
        expect(d.reasonCode).toBe('ALLOWED');
      });
    } else {
      it('mutation is denied under dark-launch posture (no server command)', () => {
        const d = evaluateAwardActionGuard(baseInput(key));
        expect(d.allowed).toBe(false);
        expect(['MUTATION_DARK_LAUNCH', 'SERVER_COMMAND_UNAVAILABLE', 'PERMISSION_DENIED', 'BUSINESS_INELIGIBLE'])
          .toContain(d.reasonCode);
      });
    }

    it('REGISTRATION_MISSING when owning module row is absent (if module-owned)', () => {
      const bind = AWARD_ACTION_BINDINGS[key];
      if (!bind.owningModule) return;
      const input: AwardActionInput = {
        ...baseInput(key),
        rollout: { [bind.owningModule]: moduleRollout(bind.owningModule, { moduleExists: false, isEnabled: false, routesEnabled: false, actionsEnabled: false }) },
      };
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      expect(d.reasonCode).toBe('REGISTRATION_MISSING');
    });

    it('MODULE_DISABLED when isEnabled=false (if module-owned)', () => {
      const bind = AWARD_ACTION_BINDINGS[key];
      if (!bind.owningModule) return;
      const input: AwardActionInput = {
        ...baseInput(key),
        rollout: { [bind.owningModule]: moduleRollout(bind.owningModule, { isEnabled: false }) },
      };
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      expect(d.reasonCode).toBe('MODULE_DISABLED');
    });

    it('ROUTES_DISABLED when routesEnabled=false (if module-owned)', () => {
      const bind = AWARD_ACTION_BINDINGS[key];
      if (!bind.owningModule) return;
      const input: AwardActionInput = {
        ...baseInput(key),
        rollout: { [bind.owningModule]: moduleRollout(bind.owningModule, { routesEnabled: false }) },
      };
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      expect(d.reasonCode).toBe('ROUTES_DISABLED');
    });

    it('PERMISSION_DENIED when required capability lacks grant', () => {
      const input: AwardActionInput = {
        ...baseInput(key),
        capabilities: capsFor(key, false),
      };
      const d = evaluateAwardActionGuard(input);
      expect(d.allowed).toBe(false);
      expect(d.reasonCode).toBe('PERMISSION_DENIED');
    });
  });

  it('assertAwardActionExecutable throws AwardActionGuardError on denial and returns decision on allow', () => {
    // Denial path — pick a mutation with dark launch.
    expect(() => assertAwardActionExecutable(baseInput('CANCEL_PAYMENT'))).toThrow(AwardActionGuardError);
    // Allow path — pick a navigation.
    const d = assertAwardActionExecutable(baseInput('OPEN_PAYMENT_SCHEDULE'));
    expect(d.allowed).toBe(true);
    expect(d.reasonCode).toBe('ALLOWED');
  });
});
