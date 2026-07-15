/**
 * BN-AWARD360-2.1F2 — action-specific capability integration.
 *
 * Verifies that:
 * - Beneficiary Add/Amend/End are gated by BENEFICIARY_* capabilities (never
 *   suspension propose/approve). When the underlying action is not registered
 *   in `app_modules`/`module_actions`, the resolver denies the action with an
 *   explicit "Registered action not found" reason — even for admin.
 * - Overpayment Configure/Waiver are gated by their own capabilities and
 *   apply row-context eligibility (outstanding > 0, not in terminal recovery).
 * - Communication Send/Retry are gated by COMMUNICATION_SEND/RETRY (neither
 *   registered today → denied with the registry reason).
 * - Per-owning-module rollout gates each action independently — disabling
 *   overpayments does not disable beneficiary navigation.
 */
import { describe, it, expect } from 'vitest';
import {
  getAwardActionAvailability,
  AWARD_ACTION_BINDINGS,
  type AwardActionInput,
  type AwardModuleRollout,
  type CapabilityResultLike,
} from '@/services/bn/awards/awardActionAvailability';

const legacyPerms: AwardActionInput['permissions'] = {
  canViewAward: true, canViewCentralAudit: true, canProposeSuspension: true, canApproveSuspension: true,
  canServiceLifeCert: true, canServiceMedical: true, canServiceOverpayment: true,
  canServiceSuspension: true, canServicePayments: true, canServiceCommunications: true,
};
const legacyFeatures: AwardActionInput['featureEnabled'] = {
  lifeCert: true, medicalReview: true, overpayment: true, awardSuspension: true, payments: true,
};

const legacyRolloutOn: AwardActionInput['rolloutStates'] = {
  award: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  beneficiaries: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  overpayments: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  communications: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  payments: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  lifeCertificates: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  medicalReviews: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  suspensions: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
  audit: { moduleExists: true, moduleEnabled: true, routesEnabled: true, actionsEnabled: true },
};

function moduleOn(name: string, actionsEnabled = true): AwardModuleRollout {
  return { moduleName: name, moduleExists: true, isEnabled: true, routesEnabled: true, actionsEnabled, showInMenu: true };
}

function grantedCap(): CapabilityResultLike {
  return { moduleName: 'x', action: 'x', moduleExists: true, actionExists: true, permissionGranted: true, reason: 'Granted' };
}
function actionMissingCap(mod: string, act: string): CapabilityResultLike {
  return {
    moduleName: mod, action: act, moduleExists: true, actionExists: false, permissionGranted: false,
    reason: `Registered action not found: ${mod}.${act}`,
  };
}

const owningModulesFullRollout: Record<string, AwardModuleRollout> = {
  bn_survivors: moduleOn('bn_survivors'),
  bn_overpayments: moduleOn('bn_overpayments'),
  bn_award_suspension: moduleOn('bn_award_suspension'),
  bn_life_certificates: moduleOn('bn_life_certificates'),
  bn_medical_reviews: moduleOn('bn_medical_reviews'),
  bn_payment_history: moduleOn('bn_payment_history'),
  bn_payment_profiles: moduleOn('bn_payment_profiles'),
  bn_person_360: moduleOn('bn_person_360'),
  bn_claim_worklist: moduleOn('bn_claim_worklist'),
  bn_product_catalog: moduleOn('bn_product_catalog'),
  bn_awards_list: moduleOn('bn_awards_list'),
  bn_audit_history: moduleOn('bn_audit_history'),
  communication_hub_lifecycle_log: moduleOn('communication_hub_lifecycle_log'),
  communication_hub_delivery_monitor: moduleOn('communication_hub_delivery_monitor'),
  communication_hub_retry_queue: moduleOn('communication_hub_retry_queue'),
  communication_hub_dispatch_register: moduleOn('communication_hub_dispatch_register'),
};

function baseInput(): Omit<AwardActionInput, 'action'> {
  return {
    awardId: 'award-1',
    awardStatus: 'ACTIVE',
    pensionerDeceased: false,
    hasClaimId: true,
    hasProductVersion: true,
    claimId: 'claim-9',
    permissions: legacyPerms,
    featureEnabled: legacyFeatures,
    rolloutStates: legacyRolloutOn,
    rollout: owningModulesFullRollout,
    capabilities: {},
  };
}

describe('BN-AWARD360-2.1F2 · action bindings', () => {
  it('every mutation binds to an action-specific capability, not a suspension shorthand', () => {
    const nonSuspensionMutations: (keyof typeof AWARD_ACTION_BINDINGS)[] = [
      'ADD_BENEFICIARY', 'AMEND_BENEFICIARY', 'END_BENEFICIARY',
      'CONFIGURE_RECOVERY_PLAN', 'REQUEST_OVERPAYMENT_WAIVER',
      'SEND_AWARD_COMMUNICATION', 'RETRY_COMMUNICATION',
      'CANCEL_PAYMENT', 'REISSUE_PAYMENT',
      'VERIFY_LIFE_CERTIFICATE', 'RECORD_LIFE_CERTIFICATE_RECEIPT', 'SEND_LIFE_CERTIFICATE_REMINDER',
      'SCHEDULE_MEDICAL_REVIEW', 'RECORD_MEDICAL_OUTCOME', 'REFER_MEDICAL_BOARD',
    ];
    for (const key of nonSuspensionMutations) {
      const b = AWARD_ACTION_BINDINGS[key];
      expect(b.requiredCapability, `${key} needs a specific capability`).toBeTruthy();
      expect(b.requiredCapability, `${key} must not borrow SUSPENSION_*`).not.toMatch(/^SUSPENSION_/);
    }
    // Suspension actions bind only to SUSPENSION_* capabilities.
    expect(AWARD_ACTION_BINDINGS.PROPOSE_SUSPENSION.requiredCapability).toBe('SUSPENSION_PROPOSE');
    expect(AWARD_ACTION_BINDINGS.REVIEW_SUSPENSION.requiredCapability).toBe('SUSPENSION_APPROVE');
  });
});

describe('BN-AWARD360-2.1F2 · capability-driven permission gating', () => {
  it('ADD_BENEFICIARY denied — action not registered — even when legacy propose is granted', () => {
    const input = { ...baseInput() };
    input.capabilities = {
      BENEFICIARY_ADD: actionMissingCap('bn_survivors', 'add'),
    };
    const m = getAwardActionAvailability({ ...input, action: 'ADD_BENEFICIARY' });
    expect(m.permissionGranted).toBe(false);
    expect(m.reason).toMatch(/Registered action not found: bn_survivors\.add/);
  });

  it('SEND_AWARD_COMMUNICATION denied with registry reason', () => {
    const input = { ...baseInput() };
    input.capabilities = {
      COMMUNICATION_SEND: actionMissingCap('communication_hub_dispatch_register', 'send'),
    };
    const m = getAwardActionAvailability({ ...input, action: 'SEND_AWARD_COMMUNICATION' });
    expect(m.permissionGranted).toBe(false);
    expect(m.reason).toMatch(/Registered action not found/);
  });

  it('CONFIGURE_RECOVERY_PLAN row-eligibility: outstanding=0 → not business-eligible', () => {
    const input = { ...baseInput() };
    input.capabilities = { OVERPAYMENT_CONFIGURE_RECOVERY: grantedCap() };
    const m = getAwardActionAvailability({
      ...input,
      action: 'CONFIGURE_RECOVERY_PLAN',
      context: { overpaymentId: 'op-1', overpaymentOutstanding: 0, overpaymentRecoveryStatus: 'RECOVERED' },
    });
    expect(m.businessEligible).toBe(false);
  });

  it('CONFIGURE_RECOVERY_PLAN row-eligibility: outstanding>0 & ACTIVE → business-eligible', () => {
    const input = { ...baseInput() };
    input.capabilities = { OVERPAYMENT_CONFIGURE_RECOVERY: grantedCap() };
    const m = getAwardActionAvailability({
      ...input,
      action: 'CONFIGURE_RECOVERY_PLAN',
      context: { overpaymentId: 'op-1', overpaymentOutstanding: 100, overpaymentRecoveryStatus: 'IN_RECOVERY' },
    });
    expect(m.businessEligible).toBe(true);
  });

  it('END_BENEFICIARY: already-ENDED row is not business-eligible', () => {
    const input = { ...baseInput() };
    input.capabilities = { BENEFICIARY_END: grantedCap() };
    const m = getAwardActionAvailability({
      ...input,
      action: 'END_BENEFICIARY',
      context: { beneficiaryId: 'b-1', beneficiaryStatus: 'ENDED' },
    });
    expect(m.businessEligible).toBe(false);
  });

  it('RETRY_COMMUNICATION: DELIVERED not eligible, FAILED eligible', () => {
    const input = { ...baseInput() };
    input.capabilities = { COMMUNICATION_RETRY: grantedCap() };
    const delivered = getAwardActionAvailability({
      ...input, action: 'RETRY_COMMUNICATION',
      context: { communicationStatus: 'DELIVERED' },
    });
    const failed = getAwardActionAvailability({
      ...input, action: 'RETRY_COMMUNICATION',
      context: { communicationStatus: 'FAILED' },
    });
    expect(delivered.businessEligible).toBe(false);
    expect(failed.businessEligible).toBe(true);
  });
});

describe('BN-AWARD360-2.1F2 · per-owning-module rollout isolation', () => {
  it('disabling bn_overpayments module does NOT disable beneficiary navigation', () => {
    const rollout: Record<string, AwardModuleRollout> = {
      ...owningModulesFullRollout,
      bn_overpayments: { moduleName: 'bn_overpayments', moduleExists: true, isEnabled: false, routesEnabled: false, actionsEnabled: false, showInMenu: false },
    };
    const input = { ...baseInput(), rollout };
    input.capabilities = {
      BENEFICIARY_WORKSPACE_VIEW: grantedCap(),
      OVERPAYMENT_WORKSPACE_VIEW: grantedCap(),
    };
    const bene = getAwardActionAvailability({ ...input, action: 'OPEN_SURVIVORS_WORKSPACE' });
    const op = getAwardActionAvailability({ ...input, action: 'OPEN_OVERPAYMENT' });
    expect(bene.enabled).toBe(true);
    expect(op.enabled).toBe(false);
    expect(op.reason).toContain('overpayments');
  });

  it('missing owning module produces the explicit "module is not available" reason', () => {
    const rollout = { ...owningModulesFullRollout };
    delete (rollout as any).communication_hub_lifecycle_log;
    const input = { ...baseInput(), rollout };
    input.capabilities = { COMMUNICATION_HUB_VIEW: grantedCap() };
    const m = getAwardActionAvailability({ ...input, action: 'OPEN_COMMUNICATION_HUB' });
    expect(m.enabled).toBe(false);
    expect(m.reason).toContain('registered capability module is not available');
  });

  it('actions_enabled=false on beneficiaries only disables beneficiary mutations', () => {
    const rollout = {
      ...owningModulesFullRollout,
      bn_survivors: moduleOn('bn_survivors', /*actionsEnabled*/ false),
    };
    const input = { ...baseInput(), rollout };
    input.capabilities = {
      BENEFICIARY_ADD: grantedCap(),
      OVERPAYMENT_CONFIGURE_RECOVERY: grantedCap(),
    };
    const add = getAwardActionAvailability({ ...input, action: 'ADD_BENEFICIARY' });
    const configureRecovery = getAwardActionAvailability({
      ...input, action: 'CONFIGURE_RECOVERY_PLAN',
      context: { overpaymentId: 'op-1', overpaymentOutstanding: 100, overpaymentRecoveryStatus: 'ACTIVE' },
    });
    expect(add.enabled).toBe(false);
    expect(add.reason).toMatch(/actions_enabled|server-authorised/);
    // Overpayment configure still disabled only for lack of server command, not rollout.
    expect(configureRecovery.reason).toMatch(/no server-authorised command/i);
  });
});
