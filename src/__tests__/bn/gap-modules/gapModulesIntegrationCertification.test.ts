import { describe, it, expect } from 'vitest';
import { canTransition as canMort, BN_MORTALITY_TRANSITIONS } from '@/types/bn/mortality/mortalityStateMachine';
import { canTransition as canOvp, BN_OVERPAYMENT_TRANSITIONS } from '@/types/bn/overpayments/overpaymentStateMachine';
import { canTransition as canMt, BN_MEANS_TEST_TRANSITIONS } from '@/types/bn/meansTests/meansTestStateMachine';
import { canTransition as canRisk, BN_RISK_TRANSITIONS } from '@/types/bn/risk/riskStateMachine';
import { canTransition as canUpr, BN_UPRATING_TRANSITIONS } from '@/types/bn/uprating/upratingStateMachine';
import { BN_MORTALITY_COMMANDS } from '@/types/bn/mortality/mortalityCommands';
import { BN_OVERPAYMENT_COMMANDS } from '@/types/bn/overpayments/overpaymentCommands';
import { BN_MEANS_TEST_COMMANDS } from '@/types/bn/meansTests/meansTestCommands';
import { BN_RISK_COMMANDS } from '@/types/bn/risk/riskCommands';
import { BN_UPRATING_COMMANDS } from '@/types/bn/uprating/upratingCommands';
import { BN_GAP_COMMAND_CAPABILITY, referencedCapabilities } from '@/services/bn/commands/benefitsCapabilityRegistry';
import { BN_GAP_INTEGRATION_FLOWS } from '@/services/bn/commands/contract-tests/integrationFlows';

describe('BN Gap Modules — state machine reachability', () => {
  it('mortality: REPORTED reaches CLOSED via a valid path', () => {
    expect(canMort('REPORTED', 'MATCHED')).toBe(true);
    expect(canMort('MATCHED', 'VERIFICATION_PENDING')).toBe(true);
    expect(canMort('VERIFICATION_PENDING', 'PROVISIONALLY_HELD')).toBe(true);
    expect(canMort('PROVISIONALLY_HELD', 'VERIFIED')).toBe(true);
    expect(canMort('VERIFIED', 'IMPACT_REVIEW')).toBe(true);
    expect(canMort('IMPACT_REVIEW', 'APPROVAL_PENDING')).toBe(true);
    expect(canMort('APPROVAL_PENDING', 'CONFIRMED')).toBe(true);
    expect(canMort('CONFIRMED', 'FOLLOW_ON_PROCESSING')).toBe(true);
    expect(canMort('FOLLOW_ON_PROCESSING', 'COMPLETED')).toBe(true);
    expect(canMort('COMPLETED', 'CLOSED')).toBe(true);
  });

  it('mortality: forbidden transitions rejected', () => {
    expect(canMort('REPORTED', 'CONFIRMED')).toBe(false);
    expect(canMort('CLOSED', 'REPORTED')).toBe(false);
  });

  it('overpayments: representation → dispute → confirm → recovery is reachable', () => {
    expect(canOvp('REPRESENTATION_PERIOD', 'DISPUTED')).toBe(true);
    expect(canOvp('DISPUTED', 'UNDER_REVIEW')).toBe(true);
    expect(canOvp('REPRESENTATION_PERIOD', 'CONFIRMED')).toBe(true);
    expect(canOvp('CONFIRMED', 'RECOVERY_PLANNING')).toBe(true);
    expect(canOvp('RECOVERY_PLANNING', 'RECOVERING')).toBe(true);
  });

  it('means-tests: FAILED → APPEALED → OVERTURNED → RERUN → AWARD_CREATED', () => {
    expect(canMt('FAILED', 'APPEALED')).toBe(true);
    expect(canMt('APPEALED', 'OVERTURNED')).toBe(true);
    expect(canMt('OVERTURNED', 'ELIGIBILITY_RERUN')).toBe(true);
    expect(canMt('ELIGIBILITY_RERUN', 'AWARD_CREATED')).toBe(true);
  });

  it('risk: DETECTED → HOLD_PAYMENT → CLEARED → HOLD_RELEASED', () => {
    expect(canRisk('DETECTED', 'TRIAGED')).toBe(true);
    expect(canRisk('TRIAGED', 'PAYMENT_HELD')).toBe(true);
    expect(canRisk('PAYMENT_HELD', 'INVESTIGATION')).toBe(true);
    expect(canRisk('INVESTIGATION', 'CLEARED')).toBe(true);
    expect(canRisk('CLEARED', 'HOLD_RELEASED')).toBe(true);
    expect(canRisk('HOLD_RELEASED', 'CLOSED')).toBe(true);
  });

  it('uprating: DRAFT → EXECUTE → RECONCILED is the only golden path', () => {
    expect(canUpr('DRAFT', 'EXECUTING')).toBe(false); // must go through approval
    expect(canUpr('AWAITING_APPROVAL', 'EXECUTING')).toBe(false); // must APPROVE first
    expect(canUpr('APPROVED', 'EXECUTING')).toBe(true);
    expect(canUpr('EXECUTING', 'RECONCILED')).toBe(false); // must rebuild + comms first
  });

  it('every state has a defined transition list', () => {
    for (const [s, tgts] of Object.entries(BN_MORTALITY_TRANSITIONS)) expect(Array.isArray(tgts)).toBe(true);
    for (const [s, tgts] of Object.entries(BN_OVERPAYMENT_TRANSITIONS)) expect(Array.isArray(tgts)).toBe(true);
    for (const [s, tgts] of Object.entries(BN_MEANS_TEST_TRANSITIONS)) expect(Array.isArray(tgts)).toBe(true);
    for (const [s, tgts] of Object.entries(BN_RISK_TRANSITIONS)) expect(Array.isArray(tgts)).toBe(true);
    for (const [s, tgts] of Object.entries(BN_UPRATING_TRANSITIONS)) expect(Array.isArray(tgts)).toBe(true);
  });
});

describe('BN Gap Modules — capability and command coverage', () => {
  it('every module command is mapped to a capability', () => {
    const all = [
      ...BN_MORTALITY_COMMANDS,
      ...BN_OVERPAYMENT_COMMANDS,
      ...BN_MEANS_TEST_COMMANDS,
      ...BN_RISK_COMMANDS,
      ...BN_UPRATING_COMMANDS,
    ];
    for (const c of all) {
      expect(BN_GAP_COMMAND_CAPABILITY[c.command], `missing cap for ${c.command}`).toBeDefined();
      expect(BN_GAP_COMMAND_CAPABILITY[c.command]).toBe(c.capability);
    }
  });

  it('referenced capabilities are unique and non-empty', () => {
    const caps = referencedCapabilities();
    expect(caps.length).toBeGreaterThan(20);
    expect(new Set(caps).size).toBe(caps.length);
  });
});

describe('BN Gap Modules — integration flow certification', () => {
  it('every integration-flow step references a real command with a capability', () => {
    for (const flow of BN_GAP_INTEGRATION_FLOWS) {
      for (const step of flow.steps) {
        expect(
          BN_GAP_COMMAND_CAPABILITY[step.commandName],
          `${flow.id}: ${step.commandName} has no capability mapping`,
        ).toBeDefined();
      }
    }
  });

  it('all 6 canonical flows are present', () => {
    const ids = BN_GAP_INTEGRATION_FLOWS.map((f) => f.id);
    expect(ids).toContain('FLOW-1-DEATH-DOWNSTREAM');
    expect(ids).toContain('FLOW-2-OVERPAYMENT-APPEAL');
    expect(ids).toContain('FLOW-3-MEANS-TEST-APPEAL-RERUN');
    expect(ids).toContain('FLOW-4-RISK-SYSTEM-ERROR');
    expect(ids).toContain('FLOW-5-UPRATING-RUN');
    expect(ids).toContain('FLOW-6-RISK-PAYMENT-HOLD');
  });

  it('every flow involves at least one gap module', () => {
    for (const f of BN_GAP_INTEGRATION_FLOWS) {
      expect(f.modulesInvolved.length).toBeGreaterThan(0);
      expect(f.successCriteria.length).toBeGreaterThan(0);
    }
  });
});
