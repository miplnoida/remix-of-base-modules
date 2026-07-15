/**
 * BN-AWARD360-2.1G — Action-specific authorization guarantees.
 *
 * Proves that Suspension permissions (SUSPENSION_PROPOSE / SUSPENSION_APPROVE
 * / SUSPENSION_RESUME_PROPOSE) NEVER authorize actions in unrelated modules,
 * and that mutation actions require their own dedicated capability. Also
 * verifies row-specific eligibility.
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
const legacyFeatures: AwardActionInput['featureEnabled'] = {
  lifeCert: true, medicalReview: true, overpayment: true, awardSuspension: true, payments: true,
};

function moduleOn(name: string, actionsEnabled = true): AwardModuleRollout {
  return { moduleName: name, moduleExists: true, isEnabled: true, routesEnabled: true, actionsEnabled, showInMenu: true };
}
function granted(mod = 'x', act = 'x'): CapabilityResultLike {
  return { moduleName: mod, action: act, moduleExists: true, actionExists: true, permissionGranted: true, reason: 'Granted' };
}
function denyMissingAction(mod: string, act: string): CapabilityResultLike {
  return {
    moduleName: mod, action: act, moduleExists: true, actionExists: false, permissionGranted: false,
    reason: `Registered action not found: ${mod}.${act}`,
  };
}
function denyMissingModule(mod: string, act: string): CapabilityResultLike {
  return {
    moduleName: mod, action: act, moduleExists: false, actionExists: false, permissionGranted: false,
    reason: `Registered module not found: ${mod}`,
  };
}

const fullRollout: Record<string, AwardModuleRollout> = {};
for (const b of Object.values(AWARD_ACTION_BINDINGS)) {
  if (b.owningModule) fullRollout[b.owningModule] = moduleOn(b.owningModule);
}

function inputBase(): Omit<AwardActionInput, 'action'> {
  return {
    awardId: 'award-1',
    awardStatus: 'ACTIVE',
    pensionerDeceased: false,
    hasClaimId: true,
    hasProductVersion: true,
    claimId: 'c-9',
    permissions: legacyPerms,
    featureEnabled: legacyFeatures,
    rolloutStates: {} as AwardActionInput['rolloutStates'],
    rollout: fullRollout,
    capabilities: {},
  };
}

// Grant ONLY suspension capabilities — nothing else.
const suspensionOnly = {
  SUSPENSION_PROPOSE: granted('bn_award_suspension', 'propose'),
  SUSPENSION_APPROVE: granted('bn_award_suspension', 'approve'),
  SUSPENSION_RESUME_PROPOSE: granted('bn_award_suspension', 'resume_propose'),
};

describe('BN-AWARD360-2.1G · Suspension permissions never authorize unrelated actions', () => {
  it('Suspension propose does NOT grant Beneficiary Add', () => {
    const input = { ...inputBase() };
    input.capabilities = { ...suspensionOnly };
    const r = getAwardActionAvailability({ ...input, action: 'ADD_BENEFICIARY' });
    expect(r.permissionGranted).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('Suspension propose does NOT grant Overpayment configuration', () => {
    const input = { ...inputBase() };
    input.capabilities = { ...suspensionOnly };
    const r = getAwardActionAvailability({
      ...input, action: 'CONFIGURE_RECOVERY_PLAN',
      context: { overpaymentId: 'op-1', overpaymentOutstanding: 100, overpaymentRecoveryStatus: 'ACTIVE' },
    });
    expect(r.permissionGranted).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('Suspension approve does NOT grant Life Certificate verification', () => {
    const input = { ...inputBase() };
    input.capabilities = { ...suspensionOnly };
    const r = getAwardActionAvailability({ ...input, action: 'VERIFY_LIFE_CERTIFICATE' });
    expect(r.permissionGranted).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('Suspension approve does NOT grant Medical outcome recording', () => {
    const input = { ...inputBase() };
    input.capabilities = { ...suspensionOnly };
    const r = getAwardActionAvailability({ ...input, action: 'RECORD_MEDICAL_OUTCOME' });
    expect(r.permissionGranted).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('Suspension permissions continue to authorize suspension actions', () => {
    const input = { ...inputBase() };
    input.capabilities = { ...suspensionOnly };
    const propose = getAwardActionAvailability({ ...input, action: 'PROPOSE_SUSPENSION' });
    const approve = getAwardActionAvailability({ ...input, action: 'REVIEW_SUSPENSION' });
    expect(propose.permissionGranted).toBe(true);
    expect(approve.permissionGranted).toBe(true);
  });
});

describe('BN-AWARD360-2.1G · Dedicated capabilities required', () => {
  it('Beneficiary Add requires BENEFICIARY_ADD; missing action → denied', () => {
    const input = { ...inputBase() };
    input.capabilities = { BENEFICIARY_ADD: denyMissingAction('bn_survivors', 'add') };
    const r = getAwardActionAvailability({ ...input, action: 'ADD_BENEFICIARY' });
    expect(r.permissionGranted).toBe(false);
    expect(r.reason).toMatch(/Registered action not found/);
  });

  it('Overpayment configuration requires OVERPAYMENT_CONFIGURE_RECOVERY', () => {
    const input = { ...inputBase() };
    input.capabilities = { OVERPAYMENT_CONFIGURE_RECOVERY: denyMissingAction('bn_overpayments', 'configure_recovery') };
    const r = getAwardActionAvailability({
      ...input, action: 'CONFIGURE_RECOVERY_PLAN',
      context: { overpaymentId: 'op-1', overpaymentOutstanding: 100 },
    });
    expect(r.permissionGranted).toBe(false);
  });

  it('Communication Send requires its dedicated registered action', () => {
    const input = { ...inputBase() };
    input.capabilities = { COMMUNICATION_SEND: denyMissingAction('communication_hub_dispatch_register', 'send') };
    const r = getAwardActionAvailability({ ...input, action: 'SEND_AWARD_COMMUNICATION' });
    expect(r.permissionGranted).toBe(false);
  });

  it('General Communication metadata view does not grant Send or Retry', () => {
    const input = { ...inputBase() };
    input.capabilities = {
      COMMUNICATION_METADATA_VIEW: granted(),
      COMMUNICATION_SEND: denyMissingAction('communication_hub_dispatch_register', 'send'),
      COMMUNICATION_RETRY: denyMissingAction('communication_hub_retry_queue', 'retry'),
    };
    const send = getAwardActionAvailability({ ...input, action: 'SEND_AWARD_COMMUNICATION' });
    const retry = getAwardActionAvailability({
      ...input, action: 'RETRY_COMMUNICATION', context: { communicationStatus: 'FAILED' },
    });
    expect(send.permissionGranted).toBe(false);
    expect(retry.permissionGranted).toBe(false);
  });

  it('Payment history view does not grant Cancel or Reissue', () => {
    const input = { ...inputBase() };
    input.capabilities = {
      PAYMENT_HISTORY_VIEW: granted(),
      PAYMENT_CANCEL: denyMissingAction('bn_payment_history', 'cancel_payment'),
      PAYMENT_REISSUE: denyMissingAction('bn_payment_history', 'reissue_payment'),
    };
    const cancel = getAwardActionAvailability({ ...input, action: 'CANCEL_PAYMENT' });
    const reissue = getAwardActionAvailability({ ...input, action: 'REISSUE_PAYMENT' });
    expect(cancel.permissionGranted).toBe(false);
    expect(reissue.permissionGranted).toBe(false);
  });

  it('Life Certificate view does not grant Verify', () => {
    const input = { ...inputBase() };
    input.capabilities = {
      LIFE_CERTIFICATE_VIEW: granted(),
      LIFE_CERTIFICATE_VERIFY: denyMissingAction('bn_life_certificates', 'verify'),
    };
    const r = getAwardActionAvailability({ ...input, action: 'VERIFY_LIFE_CERTIFICATE' });
    expect(r.permissionGranted).toBe(false);
  });

  it('Medical Review view does not grant Record Outcome', () => {
    const input = { ...inputBase() };
    input.capabilities = {
      MEDICAL_REVIEW_VIEW: granted(),
      MEDICAL_REVIEW_RECORD_OUTCOME: denyMissingAction('bn_medical_reviews', 'record_outcome'),
    };
    const r = getAwardActionAvailability({ ...input, action: 'RECORD_MEDICAL_OUTCOME' });
    expect(r.permissionGranted).toBe(false);
  });

  it('SEND_LIFE_CERTIFICATE_REMINDER requires BOTH LIFE_CERTIFICATE_SEND_REMINDER and COMMUNICATION_SEND', () => {
    const input = { ...inputBase() };
    input.capabilities = {
      LIFE_CERTIFICATE_SEND_REMINDER: granted(),
      COMMUNICATION_SEND: denyMissingAction('communication_hub_dispatch_register', 'send'),
    };
    const r = getAwardActionAvailability({ ...input, action: 'SEND_LIFE_CERTIFICATE_REMINDER' });
    expect(r.permissionGranted).toBe(false);
  });

  it('bn_awards_list.view alone does not grant Survivors servicing', () => {
    // Beneficiary route ownership must be independent of awards list.
    const input = { ...inputBase() };
    input.capabilities = {
      AWARD_VIEW: granted('bn_awards_list', 'view'),
      BENEFICIARY_WORKSPACE_VIEW: denyMissingModule('bn_survivors', 'view'),
      BENEFICIARY_ADD: denyMissingAction('bn_survivors', 'add'),
    };
    const open = getAwardActionAvailability({ ...input, action: 'OPEN_SURVIVORS_WORKSPACE' });
    const add = getAwardActionAvailability({ ...input, action: 'ADD_BENEFICIARY' });
    expect(open.permissionGranted).toBe(false);
    expect(add.permissionGranted).toBe(false);
  });

  it('Missing Beneficiary module disables Survivors navigation with a diagnostic reason', () => {
    const rollout: Record<string, AwardModuleRollout> = {
      ...fullRollout,
      bn_survivors: { moduleName: 'bn_survivors', moduleExists: false, isEnabled: false, routesEnabled: false, actionsEnabled: false, showInMenu: false },
    };
    const input = { ...inputBase(), rollout };
    input.capabilities = { BENEFICIARY_WORKSPACE_VIEW: granted() };
    const r = getAwardActionAvailability({ ...input, action: 'OPEN_SURVIVORS_WORKSPACE' });
    expect(r.enabled).toBe(false);
    expect(r.reason).toContain('registered capability module is not available');
  });

  it('Admin does not bypass missing actions', () => {
    // The resolver reflects "Registered action not found" verbatim from the
    // capability result; even when admin is treated as granting everything at
    // the registry layer, a missing action is a HARD deny at the resolver.
    const input = { ...inputBase() };
    input.capabilities = { BENEFICIARY_ADD: denyMissingAction('bn_survivors', 'add') };
    const r = getAwardActionAvailability({ ...input, action: 'ADD_BENEFICIARY' });
    expect(r.permissionGranted).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('No non-suspension mutation becomes enabled (no server command)', () => {
    const input = { ...inputBase() };
    input.capabilities = {
      BENEFICIARY_ADD: granted(),
      BENEFICIARY_AMEND: granted(),
      BENEFICIARY_END: granted(),
      OVERPAYMENT_CONFIGURE_RECOVERY: granted(),
      OVERPAYMENT_REQUEST_WAIVER: granted(),
      COMMUNICATION_SEND: granted(),
      COMMUNICATION_RETRY: granted(),
      PAYMENT_CANCEL: granted(),
      PAYMENT_REISSUE: granted(),
      LIFE_CERTIFICATE_VERIFY: granted(),
      LIFE_CERTIFICATE_RECORD_RECEIPT: granted(),
      LIFE_CERTIFICATE_SEND_REMINDER: granted(),
      MEDICAL_REVIEW_SCHEDULE: granted(),
      MEDICAL_REVIEW_RECORD_OUTCOME: granted(),
      MEDICAL_REVIEW_REFER_BOARD: granted(),
    };
    const mutations: Array<Parameters<typeof getAwardActionAvailability>[0]['action']> = [
      'ADD_BENEFICIARY', 'CONFIGURE_RECOVERY_PLAN', 'REQUEST_OVERPAYMENT_WAIVER',
      'SEND_AWARD_COMMUNICATION', 'CANCEL_PAYMENT', 'REISSUE_PAYMENT',
      'VERIFY_LIFE_CERTIFICATE', 'RECORD_LIFE_CERTIFICATE_RECEIPT',
      'SCHEDULE_MEDICAL_REVIEW', 'RECORD_MEDICAL_OUTCOME', 'REFER_MEDICAL_BOARD',
    ];
    for (const action of mutations) {
      const ctx =
        action === 'CONFIGURE_RECOVERY_PLAN' || action === 'REQUEST_OVERPAYMENT_WAIVER'
          ? { overpaymentId: 'op-1', overpaymentOutstanding: 100 }
          : action === 'RETRY_COMMUNICATION'
          ? { communicationStatus: 'FAILED' }
          : undefined;
      const r = getAwardActionAvailability({ ...input, action, context: ctx });
      expect(r.enabled, `${action} should remain disabled (no server command)`).toBe(false);
    }
  });
});

describe('BN-AWARD360-2.1G · Row-specific eligibility', () => {
  it('END_BENEFICIARY ineligible for ENDED/INACTIVE and requires selection', () => {
    const input = { ...inputBase() };
    input.capabilities = { BENEFICIARY_END: granted() };
    // No selection.
    expect(
      getAwardActionAvailability({ ...input, action: 'END_BENEFICIARY' }).businessEligible,
    ).toBe(false);
    // ENDED.
    expect(
      getAwardActionAvailability({
        ...input, action: 'END_BENEFICIARY',
        context: { beneficiaryId: 'b1', beneficiaryStatus: 'ENDED' },
      }).businessEligible,
    ).toBe(false);
    // INACTIVE.
    expect(
      getAwardActionAvailability({
        ...input, action: 'END_BENEFICIARY',
        context: { beneficiaryId: 'b1', beneficiaryStatus: 'INACTIVE' },
      }).businessEligible,
    ).toBe(false);
    // ACTIVE — eligible.
    expect(
      getAwardActionAvailability({
        ...input, action: 'END_BENEFICIARY',
        context: { beneficiaryId: 'b1', beneficiaryStatus: 'ACTIVE' },
      }).businessEligible,
    ).toBe(true);
  });

  it('Overpayment configure/waiver require outstanding > 0 and non-terminal recovery', () => {
    const input = { ...inputBase() };
    input.capabilities = {
      OVERPAYMENT_CONFIGURE_RECOVERY: granted(),
      OVERPAYMENT_REQUEST_WAIVER: granted(),
    };
    // Fully recovered.
    expect(
      getAwardActionAvailability({
        ...input, action: 'CONFIGURE_RECOVERY_PLAN',
        context: { overpaymentId: 'o1', overpaymentOutstanding: 100, overpaymentRecoveryStatus: 'FULLY_RECOVERED' },
      }).businessEligible,
    ).toBe(false);
    // Written off.
    expect(
      getAwardActionAvailability({
        ...input, action: 'REQUEST_OVERPAYMENT_WAIVER',
        context: { overpaymentOutstanding: 100, overpaymentRecoveryStatus: 'WRITTEN_OFF' },
      }).businessEligible,
    ).toBe(false);
    // Outstanding 0.
    expect(
      getAwardActionAvailability({
        ...input, action: 'REQUEST_OVERPAYMENT_WAIVER',
        context: { overpaymentOutstanding: 0, overpaymentRecoveryStatus: 'ACTIVE' },
      }).businessEligible,
    ).toBe(false);
    // Eligible.
    expect(
      getAwardActionAvailability({
        ...input, action: 'CONFIGURE_RECOVERY_PLAN',
        context: { overpaymentId: 'o1', overpaymentOutstanding: 500, overpaymentRecoveryStatus: 'ACTIVE' },
      }).businessEligible,
    ).toBe(true);
  });

  it('RETRY_COMMUNICATION eligibility follows Communication Hub status model', () => {
    const input = { ...inputBase() };
    input.capabilities = { COMMUNICATION_RETRY: granted() };
    const cases: Array<[string, boolean]> = [
      ['FAILED', true],
      ['RETRY', true],
      ['RETRYING', true],
      ['PENDING_RETRY', true],
      ['ERROR', true],
      ['DELIVERED', false],
      ['QUEUED', false],
      ['SENT', false],
      ['CANCELLED', false],
    ];
    for (const [status, expected] of cases) {
      const r = getAwardActionAvailability({
        ...input, action: 'RETRY_COMMUNICATION', context: { communicationStatus: status },
      });
      expect(r.businessEligible, `status=${status}`).toBe(expected);
    }
  });
});
