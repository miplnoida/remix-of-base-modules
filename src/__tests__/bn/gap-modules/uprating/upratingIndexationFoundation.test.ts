/**
 * Slice 1 — Uprating & Indexation foundation tests.
 *
 * Proves:
 *  - 17 canonical commands map to a capability (fail-closed)
 *  - Command specs enforce maker-checker + transactional + justification
 *    where the epic requires it
 *  - Policy-version and run state machines: reachability, terminals,
 *    no forbidden shortcuts
 *  - Pure calculator: percentage, fixed, index factor, tiered, formula,
 *    min/max, floor/ceiling, rounding modes, deterministic idempotency
 */
import { describe, it, expect } from 'vitest';

import {
  BN_UPRATING_CANONICAL_COMMANDS,
  getUpratingCanonicalCommandSpec,
  type BnUpratingCanonicalCommandName,
} from '@/types/bn/gap/uprating/upratingCanonicalCommands';
import {
  BN_UPRATING_POLICY_TRANSITIONS,
  canUpratingPolicyTransition,
  isUpratingPolicyTerminal,
  reachableUpratingPolicyStates,
  type BnUpratingPolicyStatus,
} from '@/types/bn/gap/uprating/upratingPolicyStateMachine';
import {
  BN_UPRATING_RUN_TRANSITIONS,
  canUpratingRunTransition,
  isUpratingRunTerminal,
  reachableUpratingRunStates,
  type BnUpratingRunCanonicalStatus,
} from '@/types/bn/gap/uprating/upratingRunCanonicalStateMachine';
import {
  BN_UPRATING_EXCEPTION_CODES,
  BN_UPRATING_POLICY_TYPES,
  isBlockingException,
} from '@/types/bn/gap/uprating/upratingPolicyTypes';
import { requiredCapabilityFor } from '@/services/bn/gap/gapCapabilityRegistry';
import {
  calculateUpratedAmount,
  calculateFlatArrearsMinor,
  upratingItemIdempotencyKey,
} from '@/services/bn/gap/upratingCalculator';

const CANONICAL_COMMANDS: readonly BnUpratingCanonicalCommandName[] = [
  'BN_UPRATING_CREATE_POLICY',
  'BN_UPRATING_CREATE_POLICY_VERSION',
  'BN_UPRATING_VALIDATE_POLICY',
  'BN_UPRATING_SUBMIT_POLICY_FOR_APPROVAL',
  'BN_UPRATING_APPROVE_POLICY',
  'BN_UPRATING_CREATE_RUN',
  'BN_UPRATING_BUILD_POPULATION',
  'BN_UPRATING_SIMULATE',
  'BN_UPRATING_RESOLVE_EXCEPTION',
  'BN_UPRATING_SUBMIT_RUN_FOR_APPROVAL',
  'BN_UPRATING_APPROVE_RUN',
  'BN_UPRATING_SCHEDULE_EXECUTION',
  'BN_UPRATING_EXECUTE_BATCH',
  'BN_UPRATING_RETRY_FAILED',
  'BN_UPRATING_RECONCILE_RUN',
  'BN_UPRATING_ROLLBACK_ELIGIBLE',
  'BN_UPRATING_CLOSE_RUN',
];

describe('Uprating & Indexation — Slice 1 foundation', () => {
  describe('canonical command catalogue', () => {
    it('exposes 17 canonical commands', () => {
      expect(BN_UPRATING_CANONICAL_COMMANDS).toHaveLength(17);
      expect(new Set(BN_UPRATING_CANONICAL_COMMANDS.map((c) => c.command)))
        .toEqual(new Set(CANONICAL_COMMANDS));
    });

    it('every canonical command has a capability mapping (fail-closed)', () => {
      for (const name of CANONICAL_COMMANDS) {
        expect(requiredCapabilityFor(name)).not.toBeNull();
      }
    });

    it('APPROVE_POLICY, APPROVE_RUN, EXECUTE_BATCH, ROLLBACK require maker-checker', () => {
      const mustBeMC: BnUpratingCanonicalCommandName[] = [
        'BN_UPRATING_APPROVE_POLICY',
        'BN_UPRATING_APPROVE_RUN',
        'BN_UPRATING_EXECUTE_BATCH',
        'BN_UPRATING_ROLLBACK_ELIGIBLE',
      ];
      for (const name of mustBeMC) {
        expect(getUpratingCanonicalCommandSpec(name).requiresMakerChecker).toBe(true);
      }
    });

    it('rollback + approve steps require justification', () => {
      const mustJustify: BnUpratingCanonicalCommandName[] = [
        'BN_UPRATING_APPROVE_POLICY',
        'BN_UPRATING_APPROVE_RUN',
        'BN_UPRATING_ROLLBACK_ELIGIBLE',
        'BN_UPRATING_RESOLVE_EXCEPTION',
      ];
      for (const name of mustJustify) {
        expect(getUpratingCanonicalCommandSpec(name).requiresJustification).toBe(true);
      }
    });

    it('bulk execution + rollback + population build + retry are transactional', () => {
      const mustTx: BnUpratingCanonicalCommandName[] = [
        'BN_UPRATING_BUILD_POPULATION',
        'BN_UPRATING_EXECUTE_BATCH',
        'BN_UPRATING_RETRY_FAILED',
        'BN_UPRATING_ROLLBACK_ELIGIBLE',
      ];
      for (const name of mustTx) {
        expect(getUpratingCanonicalCommandSpec(name).transactional).toBe(true);
      }
    });

    it('command names never collide with legacy BN_UPR_* catalogue', () => {
      for (const c of CANONICAL_COMMANDS) {
        expect(c.startsWith('BN_UPR_') && !c.startsWith('BN_UPRATING_')).toBe(false);
      }
    });
  });

  describe('policy-version state machine', () => {
    it('reaches RETIRED from every non-terminal state', () => {
      const states = Object.keys(
        BN_UPRATING_POLICY_TRANSITIONS,
      ) as BnUpratingPolicyStatus[];
      for (const s of states) {
        if (isUpratingPolicyTerminal(s)) continue;
        expect(reachableUpratingPolicyStates(s)).toContain('RETIRED');
      }
    });

    it('RETIRED is terminal (no outbound transitions)', () => {
      expect(BN_UPRATING_POLICY_TRANSITIONS.RETIRED).toEqual([]);
      expect(isUpratingPolicyTerminal('RETIRED')).toBe(true);
    });

    it('DRAFT cannot skip straight to ACTIVE', () => {
      expect(canUpratingPolicyTransition('DRAFT', 'ACTIVE')).toBe(false);
    });

    it('happy path DRAFT→REVIEW→APPROVED→ACTIVE→SUPERSEDED→RETIRED is legal', () => {
      const seq: BnUpratingPolicyStatus[] = [
        'DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED',
      ];
      for (let i = 0; i < seq.length - 1; i++) {
        expect(canUpratingPolicyTransition(seq[i]!, seq[i + 1]!)).toBe(true);
      }
    });
  });

  describe('run state machine', () => {
    it('reaches CLOSED from every non-terminal state', () => {
      const states = Object.keys(
        BN_UPRATING_RUN_TRANSITIONS,
      ) as BnUpratingRunCanonicalStatus[];
      for (const s of states) {
        if (isUpratingRunTerminal(s)) continue;
        expect(reachableUpratingRunStates(s)).toContain('CLOSED');
      }
    });

    it('canonical happy path is legal', () => {
      const seq: BnUpratingRunCanonicalStatus[] = [
        'DRAFT', 'POPULATION_BUILT', 'SIMULATED', 'APPROVAL_PENDING',
        'APPROVED', 'SCHEDULED', 'EXECUTING', 'COMPLETED',
        'RECONCILIATION', 'RECONCILED', 'CLOSED',
      ];
      for (let i = 0; i < seq.length - 1; i++) {
        expect(canUpratingRunTransition(seq[i]!, seq[i + 1]!)).toBe(true);
      }
    });

    it('DRAFT cannot skip to EXECUTING', () => {
      expect(canUpratingRunTransition('DRAFT', 'EXECUTING')).toBe(false);
    });

    it('APPROVAL_PENDING cannot skip approval and go straight to SCHEDULED', () => {
      expect(canUpratingRunTransition('APPROVAL_PENDING', 'SCHEDULED')).toBe(false);
    });

    it('PARTIAL can be retried into EXECUTING or reconciled', () => {
      expect(canUpratingRunTransition('PARTIAL', 'EXECUTING')).toBe(true);
      expect(canUpratingRunTransition('PARTIAL', 'RECONCILIATION')).toBe(true);
    });

    it('CLOSED is terminal', () => {
      expect(BN_UPRATING_RUN_TRANSITIONS.CLOSED).toEqual([]);
    });
  });

  describe('policy types & exceptions', () => {
    it('exposes 7 canonical policy types', () => {
      expect(BN_UPRATING_POLICY_TYPES).toHaveLength(7);
    });

    it('lists all 13 required exception codes', () => {
      expect(BN_UPRATING_EXCEPTION_CODES).toHaveLength(13);
      // Every exception is blocking by default — spec forbids silent ignore.
      for (const code of BN_UPRATING_EXCEPTION_CODES) {
        expect(isBlockingException(code)).toBe(true);
      }
    });
  });

  describe('pure calculator', () => {
    it('applies a flat percentage in basis points', () => {
      const r = calculateUpratedAmount(100_00, {
        type: 'PERCENTAGE', percentageBp: 250, // 2.5%
      });
      expect(r.newMinor).toBe(102_50);
      expect(r.increaseMinor).toBe(2_50);
      expect(r.increaseBp).toBe(250);
    });

    it('applies a fixed amount', () => {
      const r = calculateUpratedAmount(100_00, {
        type: 'FIXED_AMOUNT', fixedMinor: 15_00,
      });
      expect(r.newMinor).toBe(115_00);
    });

    it('applies percentage + fixed together', () => {
      const r = calculateUpratedAmount(200_00, {
        type: 'PERCENTAGE_PLUS_FIXED', percentageBp: 300, fixedMinor: 10_00,
      });
      expect(r.newMinor).toBe(216_00);
    });

    it('applies index factor (10_200 = ×1.02)', () => {
      const r = calculateUpratedAmount(500_00, {
        type: 'INDEX_FACTOR', indexFactorBp: 10_200,
      });
      expect(r.newMinor).toBe(510_00);
    });

    it('applies tiered increase in band', () => {
      const r = calculateUpratedAmount(750_00, {
        type: 'TIERED',
        tiers: [
          { fromMinor: 0,        toMinor: 500_00, bpts: 500 },
          { fromMinor: 500_00,   toMinor: null,   bpts: 200, fixedMinor: 5_00 },
        ],
      });
      // 750_00 + 2% + $5 = 750_00 + 1_500 + 500 = 767_00
      expect(r.newMinor).toBe(767_00);
    });

    it('accepts precomputed formula/manual amounts', () => {
      const r = calculateUpratedAmount(300_00, {
        type: 'FORMULA_DRIVEN', precomputedNewMinor: 333_33,
      });
      expect(r.newMinor).toBe(333_33);
    });

    it('clamps by minimum and maximum increase', () => {
      const min = calculateUpratedAmount(1000_00, {
        type: 'PERCENTAGE', percentageBp: 10, // 0.1% = $1
        minIncreaseMinor: 25_00,
      });
      expect(min.clampedByMinIncrease).toBe(true);
      expect(min.increaseMinor).toBe(25_00);

      const max = calculateUpratedAmount(1000_00, {
        type: 'PERCENTAGE', percentageBp: 5000, // 50% = $500
        maxIncreaseMinor: 100_00,
      });
      expect(max.clampedByMaxIncrease).toBe(true);
      expect(max.newMinor).toBe(1100_00);
    });

    it('applies floor and ceiling to new amount', () => {
      const floor = calculateUpratedAmount(50_00, {
        type: 'PERCENTAGE', percentageBp: 0, floorNewMinor: 60_00,
      });
      expect(floor.clampedByFloor).toBe(true);
      expect(floor.newMinor).toBe(60_00);

      const ceiling = calculateUpratedAmount(999_00, {
        type: 'PERCENTAGE', percentageBp: 5000, ceilingNewMinor: 1000_00,
      });
      expect(ceiling.clampedByCeiling).toBe(true);
      expect(ceiling.newMinor).toBe(1000_00);
    });

    it('rounds to the nearest whole minor unit by default', () => {
      const r = calculateUpratedAmount(333_33, {
        type: 'PERCENTAGE', percentageBp: 250,
      });
      // 333_33 × 1.025 = 341.66325 → nearest 1 = 341_66
      expect(r.newMinor).toBe(341_66);
    });

    it('supports NEAREST_100 rounding', () => {
      const r = calculateUpratedAmount(500_00, {
        type: 'PERCENTAGE', percentageBp: 175, // 500 × 1.0175 = 508.75
        rounding: 'NEAREST_100',
      });
      // 50_875 → nearest 100 minor = 50_900
      expect(r.newMinor).toBe(50_900);
    });

    it('rejects a negative current amount', () => {
      expect(() =>
        calculateUpratedAmount(-1, { type: 'FIXED_AMOUNT', fixedMinor: 10 }),
      ).toThrow();
    });

    it('flat arrears = (new − current) × periods', () => {
      expect(calculateFlatArrearsMinor(100_00, 110_00, 3)).toBe(30_00);
      expect(calculateFlatArrearsMinor(100_00, 90_00, 3)).toBe(0);
    });

    it('idempotency key is deterministic and stable', () => {
      const a = upratingItemIdempotencyKey({
        runId: 'r1', awardId: 'a1', policyVersionId: 'pv1', effectiveDate: '2026-01-01',
      });
      const b = upratingItemIdempotencyKey({
        runId: 'r1', awardId: 'a1', policyVersionId: 'pv1', effectiveDate: '2026-01-01',
      });
      expect(a).toBe(b);
      const c = upratingItemIdempotencyKey({
        runId: 'r1', awardId: 'a2', policyVersionId: 'pv1', effectiveDate: '2026-01-01',
      });
      expect(a).not.toBe(c);
    });
  });
});
