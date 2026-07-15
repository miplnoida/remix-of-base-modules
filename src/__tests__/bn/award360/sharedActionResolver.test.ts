/**
 * BN-AWARD360-2.1F — shared action resolver integration tests.
 *
 * Proves:
 * - Navigation actions use the correct capability module.
 * - Mutations use the correct capability module.
 * - Per-module actions_enabled=false disables only that capability.
 * - Disabling Overpayments does NOT disable Beneficiary navigation.
 * - Missing module produces an explicit reason.
 * - Missing permission produces an explicit reason.
 * - Missing server command produces the resolver reason.
 * - Admin does NOT bypass rollout or missing server command.
 * - Row-scoped RETRY_COMMUNICATION eligibility follows communication status.
 * - Delivered communication is not retry-eligible; failed one may be but
 *   remains disabled without a server command.
 * - New navigation action keys route to canonical /admin/communication-hub/*
 *   and /bn/survivors targets.
 */
import { describe, it, expect } from 'vitest';
import {
  getAwardActionAvailability,
  getAllAwardActions,
  fullyRolledOutState,
  navigateOnlyRolloutState,
  getAwardActionCapability,
  type AwardActionInput,
  type AwardActionRolloutState,
  type CapabilityRolloutState,
} from '@/services/bn/awards/awardActionAvailability';

const allPerms: AwardActionInput['permissions'] = {
  canViewAward: true,
  canViewCentralAudit: true,
  canPropose: true,
  canApprove: true,
  canServiceLifeCert: true,
  canServiceMedical: true,
  canServiceOverpayment: true,
  canServiceSuspension: true,
  canServicePayments: true,
  canServiceCommunications: true,
};
const allFeatures: AwardActionInput['featureEnabled'] = {
  lifeCert: true,
  medicalReview: true,
  overpayment: true,
  awardSuspension: true,
  payments: true,
};

const base: Omit<AwardActionInput, 'action'> = {
  awardId: 'award-1',
  awardStatus: 'ACTIVE',
  pensionerDeceased: false,
  hasClaimId: true,
  hasProductVersion: true,
  claimId: 'claim-9',
  permissions: allPerms,
  featureEnabled: allFeatures,
  rolloutStates: navigateOnlyRolloutState(),
};

describe('BN-AWARD360-2.1F · resolver capability wiring', () => {
  it('navigation-only actions carry canonical routes and capabilities', () => {
    const nav = getAllAwardActions({ ...base });
    expect(nav.OPEN_SURVIVORS_WORKSPACE.targetRoute).toBe('/bn/survivors?awardId=award-1');
    expect(getAwardActionCapability('OPEN_SURVIVORS_WORKSPACE')).toBe('beneficiaries');

    expect(nav.OPEN_COMMUNICATION_HUB.targetRoute).toBe('/admin/communication-hub');
    expect(nav.OPEN_COMMUNICATION_DELIVERY_MONITOR.targetRoute).toBe('/admin/communication-hub/delivery-monitor');
    expect(nav.OPEN_COMMUNICATION_RETRY_QUEUE.targetRoute).toBe('/admin/communication-hub/retry-queue');
    expect(getAwardActionCapability('OPEN_COMMUNICATION_HUB')).toBe('communications');

    expect(nav.OPEN_OVERPAYMENT.targetRoute).toBe('/bn/overpayments?awardId=award-1');
    expect(getAwardActionCapability('OPEN_OVERPAYMENT')).toBe('overpayments');
  });

  it('mutations map to their specialist capability', () => {
    expect(getAwardActionCapability('ADD_BENEFICIARY')).toBe('beneficiaries');
    expect(getAwardActionCapability('CONFIGURE_RECOVERY_PLAN')).toBe('overpayments');
    expect(getAwardActionCapability('SEND_AWARD_COMMUNICATION')).toBe('communications');
    expect(getAwardActionCapability('VERIFY_LIFE_CERTIFICATE')).toBe('lifeCertificates');
    expect(getAwardActionCapability('PROPOSE_SUSPENSION')).toBe('suspensions');
  });

  it('nav actions enable under nav-only rollout; mutations remain disabled without a server command', () => {
    const m = getAllAwardActions(base);
    expect(m.OPEN_SURVIVORS_WORKSPACE.enabled).toBe(true);
    expect(m.OPEN_SURVIVORS_WORKSPACE.executionMode).toBe('NAVIGATE');
    expect(m.ADD_BENEFICIARY.enabled).toBe(false);
    // reason must come from the resolver — never a hardcoded UI string.
    expect(m.ADD_BENEFICIARY.reason.toLowerCase()).toMatch(/actions_enabled|server-authorised/);
  });

  it('per-capability actions_enabled isolates modules — disabling overpayments does NOT disable beneficiary nav', () => {
    const rollout = navigateOnlyRolloutState();
    // Fully disable overpayments while keeping beneficiaries live.
    rollout.overpayments = {
      moduleExists: true, moduleEnabled: false, routesEnabled: false, actionsEnabled: false,
    };
    const m = getAllAwardActions({ ...base, rolloutStates: rollout });

    // Beneficiaries nav still works.
    expect(m.OPEN_SURVIVORS_WORKSPACE.enabled).toBe(true);
    // Overpayments nav is disabled with an explicit capability reason.
    expect(m.OPEN_OVERPAYMENT.enabled).toBe(false);
    expect(m.OPEN_OVERPAYMENT.reason).toContain('overpayments');
    expect(m.CONFIGURE_RECOVERY_PLAN.enabled).toBe(false);
  });

  it('missing module produces the required explicit reason', () => {
    const rollout = navigateOnlyRolloutState();
    rollout.communications = {
      moduleExists: false, moduleEnabled: false, routesEnabled: false, actionsEnabled: false,
    };
    const m = getAwardActionAvailability({
      ...base, rolloutStates: rollout, action: 'OPEN_COMMUNICATION_HUB',
    });
    expect(m.enabled).toBe(false);
    expect(m.reason).toContain('registered capability module is not available');
  });

  it('missing permission produces an explicit permission reason', () => {
    const perms = { ...allPerms, canServiceOverpayment: false };
    const m = getAwardActionAvailability({
      ...base, permissions: perms, action: 'OPEN_OVERPAYMENT',
    });
    expect(m.enabled).toBe(false);
    expect(m.permissionGranted).toBe(false);
    expect(m.reason).toMatch(/permission/i);
  });

  it('missing server command produces the resolver reason (mutation, full rollout)', () => {
    const m = getAwardActionAvailability({
      ...base,
      rolloutStates: fullyRolledOutState(),
      action: 'CONFIGURE_RECOVERY_PLAN',
    });
    expect(m.enabled).toBe(false);
    expect(m.reason).toMatch(/no server-authorised command/i);
  });

  it('Admin-equivalent perms do NOT bypass rollout or missing command', () => {
    // "Admin" here = all permissions granted. Rollout still gates the action.
    const m = getAwardActionAvailability({
      ...base,
      rolloutStates: navigateOnlyRolloutState(), // actions_enabled=false
      action: 'CONFIGURE_RECOVERY_PLAN',
    });
    expect(m.enabled).toBe(false);
  });

  it('RETRY_COMMUNICATION is not retry-eligible without row status', () => {
    const m = getAwardActionAvailability({
      ...base, rolloutStates: fullyRolledOutState(), action: 'RETRY_COMMUNICATION',
    });
    expect(m.businessEligible).toBe(false);
    expect(m.enabled).toBe(false);
  });

  it('delivered communication is not retry-eligible; failed one is business-eligible but stays disabled', () => {
    const delivered = getAwardActionAvailability({
      ...base,
      rolloutStates: fullyRolledOutState(),
      action: 'RETRY_COMMUNICATION',
      context: { communicationStatus: 'DELIVERED' },
    });
    expect(delivered.businessEligible).toBe(false);
    expect(delivered.enabled).toBe(false);

    const failed = getAwardActionAvailability({
      ...base,
      rolloutStates: fullyRolledOutState(),
      action: 'RETRY_COMMUNICATION',
      context: { communicationStatus: 'FAILED' },
    });
    expect(failed.businessEligible).toBe(true);
    // No server command → still disabled.
    expect(failed.enabled).toBe(false);
    expect(failed.reason).toMatch(/no server-authorised command/i);
  });

  it('OPEN_CLAIM route uses the supplied claimId', () => {
    const m = getAwardActionAvailability({ ...base, action: 'OPEN_CLAIM' });
    expect(m.targetRoute).toBe('/bn/claims/claim-9');
  });
});

describe('BN-AWARD360-2.1F · tab source safety', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const TAB_DIR = path.join(__dirname, '..', '..', '..', 'pages', 'bn', 'awards', 'award-360', 'tabs');
  const TABS = [
    'AwardBeneficiariesTab.tsx',
    'AwardOverpaymentsTab.tsx',
    'AwardCommunicationsTab.tsx',
  ].map((f) => path.join(TAB_DIR, f));

  it('no forbidden hardcoded disabled-reason strings remain in the three tabs', () => {
    const forbidden = [
      'Server command not enabled',
      'Mutations disabled',
      'require accepted server commands',
      'Not exposed on this workspace',
      'Send/retry/cancel/reprint are Communication Hub commands',
      'Beneficiary add/amend/end require',
      'Recovery mutations (disabled)',
    ];
    for (const file of TABS) {
      const src = fs.readFileSync(file, 'utf8');
      for (const s of forbidden) {
        expect(src, `${file} still contains "${s}"`).not.toContain(s);
      }
    }
  });

  it('each tab imports the shared Award360ActionButton', () => {
    for (const file of TABS) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toContain('Award360ActionButton');
    }
  });

  it('no tab contains a raw <Button ... disabled title="...server command..."> pattern', () => {
    for (const file of TABS) {
      const src = fs.readFileSync(file, 'utf8');
      expect(/<Button[^>]*disabled[^>]*title="[^"]*server command[^"]*"/i.test(src)).toBe(false);
    }
  });

  it('no direct write RPCs added to the three tabs', () => {
    for (const file of TABS) {
      const src = fs.readFileSync(file, 'utf8');
      for (const bad of ['.insert(', '.update(', '.upsert(', '.delete(']) {
        expect(src).not.toContain(bad);
      }
    }
  });
});
