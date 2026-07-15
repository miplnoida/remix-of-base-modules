/**
 * BN-AWARD360-2.1H — Beneficiary row-scoped action resolver behaviour.
 *
 * Proves:
 *  - AMEND / END require a selected beneficiary and reject terminal statuses.
 *  - AMEND / END remain disabled because bn_survivors.<amend|end> are unregistered.
 *  - Person 360 disables with an honest reason when no personId exists.
 *  - Payment Profile disables honestly for beneficiary-row context.
 *  - OPEN_SURVIVORS_WORKSPACE enables under bn_survivors.view permission.
 *  - Header does NOT expose row actions when nothing is selected.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
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
  return { moduleName: mod, action: act, moduleExists: true, actionExists: false, permissionGranted: false, reason: `Registered action not found: ${mod}.${act}` };
}

// Full rollout for every bound module, with bn_survivors.actions_enabled=false
// to mirror the migration.
const fullRollout: Record<string, AwardModuleRollout> = {};
for (const b of Object.values(AWARD_ACTION_BINDINGS)) {
  if (b.owningModule) fullRollout[b.owningModule] = moduleOn(b.owningModule, b.owningModule !== 'bn_survivors');
}
fullRollout['bn_survivors'] = moduleOn('bn_survivors', false);

const capabilities: Record<string, CapabilityResultLike> = {
  BENEFICIARY_WORKSPACE_VIEW: granted('bn_survivors', 'view'),
  BENEFICIARY_AMEND: denyMissingAction('bn_survivors', 'amend'),
  BENEFICIARY_END: denyMissingAction('bn_survivors', 'end'),
  BENEFICIARY_ADD: denyMissingAction('bn_survivors', 'add'),
  PENSIONER_VIEW: granted('bn_person_360', 'view'),
  PAYMENT_PROFILE_VIEW: granted('bn_payment_profiles', 'view'),
};

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
    capabilities,
  };
}

describe('BN-AWARD360-2.1H · Beneficiary row actions', () => {
  it('OPEN_SURVIVORS_WORKSPACE enables when bn_survivors.view is granted', () => {
    const r = getAwardActionAvailability({ ...inputBase(), action: 'OPEN_SURVIVORS_WORKSPACE' });
    expect(r.enabled).toBe(true);
    expect(r.executionMode).toBe('NAVIGATE');
    expect(r.targetRoute).toBe('/bn/survivors?awardId=award-1');
  });

  it('OPEN_SURVIVORS_WORKSPACE disables without survivors view capability', () => {
    const input = { ...inputBase(), capabilities: { ...capabilities, BENEFICIARY_WORKSPACE_VIEW: { moduleName: 'bn_survivors', action: 'view', moduleExists: true, actionExists: true, permissionGranted: false, reason: 'Permission not granted' } } };
    const r = getAwardActionAvailability({ ...input, action: 'OPEN_SURVIVORS_WORKSPACE' });
    expect(r.enabled).toBe(false);
    expect(r.permissionGranted).toBe(false);
  });

  it('AMEND with no selected beneficiary is ineligible', () => {
    const r = getAwardActionAvailability({ ...inputBase(), action: 'AMEND_BENEFICIARY' });
    expect(r.businessEligible).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('AMEND for ACTIVE row: business eligible but disabled (action unregistered)', () => {
    const r = getAwardActionAvailability({
      ...inputBase(),
      action: 'AMEND_BENEFICIARY',
      context: { beneficiaryId: 'b1', beneficiaryStatus: 'ACTIVE' },
    });
    expect(r.businessEligible).toBe(true);
    expect(r.permissionGranted).toBe(false);
    expect(r.enabled).toBe(false);
    expect(r.reason).toContain('Registered action not found: bn_survivors.amend');
  });

  it('AMEND for ENDED row is NOT business eligible', () => {
    const r = getAwardActionAvailability({
      ...inputBase(),
      action: 'AMEND_BENEFICIARY',
      context: { beneficiaryId: 'b1', beneficiaryStatus: 'ENDED' },
    });
    expect(r.businessEligible).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('END for ACTIVE row: business eligible but disabled (action unregistered)', () => {
    const r = getAwardActionAvailability({
      ...inputBase(),
      action: 'END_BENEFICIARY',
      context: { beneficiaryId: 'b1', beneficiaryStatus: 'ACTIVE' },
    });
    expect(r.businessEligible).toBe(true);
    expect(r.enabled).toBe(false);
    expect(r.reason).toContain('Registered action not found: bn_survivors.end');
  });

  it.each(['INACTIVE', 'ENDED', 'TERMINATED'])('END for %s row is NOT business eligible', (status) => {
    const r = getAwardActionAvailability({
      ...inputBase(),
      action: 'END_BENEFICIARY',
      context: { beneficiaryId: 'b1', beneficiaryStatus: status },
    });
    expect(r.businessEligible).toBe(false);
    expect(r.enabled).toBe(false);
  });

  it('OPEN_PERSON_360 for beneficiary row without personId returns honest disabled reason', () => {
    const r = getAwardActionAvailability({
      ...inputBase(),
      action: 'OPEN_PERSON_360',
      context: { beneficiaryId: 'b1', beneficiaryStatus: 'ACTIVE' },
    });
    expect(r.enabled).toBe(false);
    expect(r.businessEligible).toBe(false);
    expect(r.reason).toBe('No canonical person reference is available for this beneficiary');
  });

  it('OPEN_PERSON_360 for beneficiary row with personId enables', () => {
    const r = getAwardActionAvailability({
      ...inputBase(),
      action: 'OPEN_PERSON_360',
      context: { beneficiaryId: 'b1', beneficiaryStatus: 'ACTIVE', personId: 'p-9' },
    });
    expect(r.enabled).toBe(true);
    expect(r.executionMode).toBe('NAVIGATE');
  });

  it('OPEN_PAYMENT_PROFILE for beneficiary row disables with linkage reason', () => {
    const r = getAwardActionAvailability({
      ...inputBase(),
      action: 'OPEN_PAYMENT_PROFILE',
      context: { beneficiaryId: 'b1', beneficiaryStatus: 'ACTIVE' },
    });
    expect(r.enabled).toBe(false);
    expect(r.businessEligible).toBe(false);
    expect(r.reason).toBe('No canonical beneficiary payment-profile link is available');
  });

  it('OPEN_PAYMENT_PROFILE without beneficiary context (award shell) is eligible', () => {
    const r = getAwardActionAvailability({ ...inputBase(), action: 'OPEN_PAYMENT_PROFILE' });
    expect(r.businessEligible).toBe(true);
  });

  it('OPEN_PERSON_360 without beneficiary context (award shell) is eligible', () => {
    const r = getAwardActionAvailability({ ...inputBase(), action: 'OPEN_PERSON_360' });
    expect(r.businessEligible).toBe(true);
  });
});

describe('BN-AWARD360-2.1H · Beneficiaries tab structural guardrails', () => {
  const tabPath = path.resolve(process.cwd(), 'src/pages/bn/awards/award-360/tabs/AwardBeneficiariesTab.tsx');
  const source = fs.readFileSync(tabPath, 'utf8');

  it('does not render generic Amend/End Beneficiary buttons at tab-header level', () => {
    // The top-level (non row-scoped) header renders only openSurvivorsWorkspace
    // + addBeneficiary. Amend/End are only inside the row drawer.
    expect(source).not.toMatch(/label="Amend Beneficiary"/);
    expect(source).not.toMatch(/label="End Beneficiary"/);
  });

  it('renders row-scoped Amend and End buttons in the drawer', () => {
    expect(source).toMatch(/rowActions\.amendBeneficiary/);
    expect(source).toMatch(/rowActions\.endBeneficiary/);
    expect(source).toMatch(/rowActions\.openPerson360/);
    expect(source).toMatch(/rowActions\.openPaymentProfile/);
  });

  it('accepts evaluateAction from the parent page', () => {
    expect(source).toMatch(/evaluateAction:/);
    expect(source).toMatch(/AwardActionContext/);
  });
});
