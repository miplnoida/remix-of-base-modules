/**
 * BN-AWARD360-V2.1 — Action availability & permission gating matrix.
 * Updated for BN-AWARD360-2.1F: rollout is per-capability, not one global flag.
 */
import { describe, it, expect } from 'vitest';
import {
  getAwardActionAvailability,
  getAllAwardActions,
  navigateOnlyRolloutState,
  type AwardActionInput,
} from '@/services/bn/awards/awardActionAvailability';

const basePerms: AwardActionInput['permissions'] = {
  canViewAward: true,
  canViewCentralAudit: false,
  canProposeSuspension: false,
  canApproveSuspension: false,
  canServiceLifeCert: false,
  canServiceMedical: false,
  canServiceOverpayment: false,
  canServiceSuspension: false,
  canServicePayments: false,
  canServiceCommunications: false,
};
const baseFeatures: AwardActionInput['featureEnabled'] = {
  lifeCert: false,
  medicalReview: false,
  overpayment: false,
  awardSuspension: true,
  payments: true,
};
const baseInput: Omit<AwardActionInput, 'action'> = {
  awardId: 'award-1',
  awardStatus: 'ACTIVE',
  pensionerDeceased: false,
  hasClaimId: true,
  hasProductVersion: true,
  permissions: basePerms,
  featureEnabled: baseFeatures,
  rolloutStates: navigateOnlyRolloutState(),
};


describe('BN-AWARD360-V2.1 · action availability', () => {
  it('mutation actions are disabled while actions_enabled=false and no server command exists', () => {
    const actions = getAllAwardActions(baseInput);
    for (const a of Object.values(actions)) {
      if (a.action === 'OPEN_PERSON_360' || a.action === 'OPEN_PRODUCT' || a.action === 'OPEN_CLAIM') continue;
      // navigate actions may still enable when permission+feature+business grant it
      if (a.executionMode === 'NAVIGATE') continue;
      expect(a.enabled).toBe(false);
    }
  });

  it('provides a canonical targetRoute for every action', () => {
    const actions = getAllAwardActions(baseInput);
    for (const a of Object.values(actions)) {
      expect(a.targetRoute).toBeTruthy();
      expect(String(a.targetRoute).startsWith('/')).toBe(true);
      // No /bn/servicing/* placeholders allowed.
      expect(a.targetRoute!.startsWith('/bn/servicing/')).toBe(false);
    }
  });

  it('VERIFY_LIFE_CERTIFICATE routes to /bn/life-certificates with awardId', () => {
    const r = getAwardActionAvailability({ ...baseInput, action: 'VERIFY_LIFE_CERTIFICATE' });
    expect(r.targetRoute).toBe('/bn/life-certificates?awardId=award-1');
    expect(r.enabled).toBe(false);
  });

  it('PROPOSE_SUSPENSION routes to /bn/award-suspension and is disabled without permission', () => {
    const r = getAwardActionAvailability({ ...baseInput, action: 'PROPOSE_SUSPENSION' });
    expect(r.targetRoute).toBe('/bn/award-suspension?awardId=award-1');
    expect(r.enabled).toBe(false);
    expect(r.permissionGranted).toBe(false);
  });

  it('SEND_AWARD_COMMUNICATION routes to canonical Communication Hub', () => {
    const r = getAwardActionAvailability({ ...baseInput, action: 'SEND_AWARD_COMMUNICATION' });
    expect(r.targetRoute).toBe('/admin/communication-hub');
    expect(r.enabled).toBe(false);
  });

  it('OPEN_PAYMENT_SCHEDULE is enabled when user has payments permission and rollout is on', () => {
    const r = getAwardActionAvailability({
      ...baseInput,
      action: 'OPEN_PAYMENT_SCHEDULE',
      permissions: { ...basePerms, canServicePayments: true },
    });
    expect(r.enabled).toBe(true);
    expect(r.executionMode).toBe('NAVIGATE');
    expect(r.targetRoute).toBe('/bn/schedules?awardId=award-1');
  });

  it('PROPOSE_RESUMPTION is business-ineligible when award is not SUSPENDED', () => {
    const r = getAwardActionAvailability({
      ...baseInput,
      action: 'PROPOSE_RESUMPTION',
      awardStatus: 'ACTIVE',
      permissions: { ...basePerms, canServiceSuspension: true, canProposeSuspension: true },
    });
    expect(r.businessEligible).toBe(false);
    expect(r.enabled).toBe(false);
  });
});
