/**
 * Slice 1 — Fraud, Error & Risk Management foundation tests.
 *
 * Proves:
 *  - Canonical 18-command → capability map is complete
 *  - Command specs require maker-checker on every benefit-affecting action
 *  - Signal state machine reachability + terminal correctness
 *  - Assessment state machine reachability + benefit-affecting outcomes
 *    require APPROVAL_PENDING gate
 *  - Score engine is explainable, bounded, and deterministic
 *  - Deduplication key is stable
 *  - Category enum contains all 25 required categories
 *  - Benefit-affecting control actions carry the correct flag
 */
import { describe, it, expect } from 'vitest';

import {
  BN_RISK_CANONICAL_COMMANDS,
  getRiskCanonicalCommandSpec,
  type BnRiskCanonicalCommandName,
} from '@/types/bn/risk/riskCanonicalCommands';
import {
  BN_RISK_SIGNAL_TRANSITIONS,
  BN_RISK_SIGNAL_TERMINAL_STATES,
  canRiskSignalTransition,
  isRiskSignalTerminal,
  reachableRiskSignalStates,
  type BnRiskSignalStatus,
} from '@/types/bn/risk/riskSignalStateMachine';
import {
  BN_RISK_ASSESSMENT_TRANSITIONS,
  BN_RISK_ASSESSMENT_TERMINAL_STATES,
  canRiskAssessmentTransition,
  isRiskAssessmentTerminal,
  reachableRiskAssessmentStates,
  type BnRiskAssessmentStatus,
} from '@/types/bn/risk/riskAssessmentStateMachine';
import {
  BN_RISK_CATEGORIES,
  BN_RISK_CONTROL_ACTIONS,
  BN_RISK_BENEFIT_AFFECTING_ACTIONS,
  isBenefitAffectingAction,
} from '@/types/bn/risk/riskCategories';
import {
  BN_GAP_COMMAND_CAPABILITY,
  requiredCapabilityFor,
} from '@/services/bn/commands/benefitsCapabilityRegistry';
import {
  DEFAULT_RISK_SCORING_POLICY,
  scoreRisk,
  signalDedupeKey,
  type RiskFactorInput,
} from '@/services/bn/risk/riskScoringEngine';

const CANONICAL_COMMANDS: readonly BnRiskCanonicalCommandName[] = [
  'BN_RISK_GENERATE_SIGNAL',
  'BN_RISK_REGISTER_MANUAL_SIGNAL',
  'BN_RISK_TRIAGE_SIGNAL',
  'BN_RISK_LINK_SIGNALS',
  'BN_RISK_DISMISS_SIGNAL',
  'BN_RISK_CREATE_ASSESSMENT',
  'BN_RISK_ADD_FACTOR',
  'BN_RISK_REQUEST_EVIDENCE',
  'BN_RISK_RECOMMEND_CONTROL',
  'BN_RISK_APPROVE_CONTROL',
  'BN_RISK_PLACE_PAYMENT_HOLD',
  'BN_RISK_REQUEST_ENH_VERIFICATION',
  'BN_RISK_REFER_TO_LEGAL',
  'BN_RISK_REFER_TO_INVESTIGATION',
  'BN_RISK_RECORD_OUTCOME',
  'BN_RISK_CLOSE_ASSESSMENT',
  'BN_RISK_REOPEN_ASSESSMENT',
  'BN_RISK_UPDATE_RULE_FEEDBACK',
];

describe('BN Risk — canonical command catalogue', () => {
  it('registers all 18 canonical commands', () => {
    const names = BN_RISK_CANONICAL_COMMANDS.map((c) => c.command).sort();
    expect(names).toEqual([...CANONICAL_COMMANDS].sort());
  });

  it('maps every canonical command to a capability', () => {
    for (const c of BN_RISK_CANONICAL_COMMANDS) {
      expect(BN_GAP_COMMAND_CAPABILITY[c.command]).toBe(c.capability);
      expect(requiredCapabilityFor(c.command)).toBe(c.capability);
    }
  });

  it('requires maker-checker on every benefit-affecting canonical command', () => {
    const mc = new Set(
      BN_RISK_CANONICAL_COMMANDS.filter((c) => c.requiresMakerChecker).map(
        (c) => c.command,
      ),
    );
    expect(mc.has('BN_RISK_APPROVE_CONTROL')).toBe(true);
    expect(mc.has('BN_RISK_PLACE_PAYMENT_HOLD')).toBe(true);
    expect(mc.has('BN_RISK_REFER_TO_LEGAL')).toBe(true);
    expect(mc.has('BN_RISK_REFER_TO_INVESTIGATION')).toBe(true);
    // Signal-side commands remain non-MC
    expect(mc.has('BN_RISK_GENERATE_SIGNAL')).toBe(false);
    expect(mc.has('BN_RISK_TRIAGE_SIGNAL')).toBe(false);
  });

  it('marks transactional canonical commands correctly', () => {
    const tx = new Set(
      BN_RISK_CANONICAL_COMMANDS.filter((c) => c.transactional).map(
        (c) => c.command,
      ),
    );
    expect(tx.has('BN_RISK_APPROVE_CONTROL')).toBe(true);
    expect(tx.has('BN_RISK_PLACE_PAYMENT_HOLD')).toBe(true);
  });

  it('getRiskCanonicalCommandSpec throws for unknown commands', () => {
    expect(() =>
      getRiskCanonicalCommandSpec('BN_RISK_UNKNOWN' as BnRiskCanonicalCommandName),
    ).toThrow();
  });
});

describe('BN Risk — signal state machine', () => {
  it('canonical happy path reaches CLOSED', () => {
    const path: BnRiskSignalStatus[] = [
      'NEW',
      'TRIAGED',
      'LINKED',
      'UNDER_REVIEW',
      'CONFIRMED',
      'ACTIONED',
      'CLOSED',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canRiskSignalTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('every state is reachable from NEW', () => {
    const reachable = new Set(reachableRiskSignalStates('NEW'));
    for (const s of [
      'TRIAGED',
      'LINKED',
      'UNDER_REVIEW',
      'CONFIRMED',
      'DISMISSED',
      'ACTIONED',
      'CLOSED',
    ] as BnRiskSignalStatus[]) {
      expect(reachable.has(s), `${s} unreachable`).toBe(true);
    }
  });

  it('terminal states have no outbound transitions', () => {
    for (const s of BN_RISK_SIGNAL_TERMINAL_STATES) {
      expect(BN_RISK_SIGNAL_TRANSITIONS[s]).toEqual([]);
      expect(isRiskSignalTerminal(s)).toBe(true);
    }
  });

  it('rejects forbidden shortcuts', () => {
    expect(canRiskSignalTransition('NEW', 'CONFIRMED')).toBe(false);
    expect(canRiskSignalTransition('DISMISSED', 'ACTIONED')).toBe(false);
  });
});

describe('BN Risk — assessment state machine', () => {
  it('canonical control-action path reaches CLOSED', () => {
    const path: BnRiskAssessmentStatus[] = [
      'DRAFT',
      'OPEN',
      'INFORMATION_PENDING',
      'REVIEW',
      'RECOMMENDATION',
      'APPROVAL_PENDING',
      'CONTROL_ACTION',
      'COMPLETED',
      'CLOSED',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canRiskAssessmentTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('referral path reaches CLOSED', () => {
    expect(canRiskAssessmentTransition('APPROVAL_PENDING', 'REFERRED')).toBe(
      true,
    );
    expect(canRiskAssessmentTransition('REFERRED', 'COMPLETED')).toBe(true);
    expect(canRiskAssessmentTransition('COMPLETED', 'CLOSED')).toBe(true);
  });

  it('every state is reachable from DRAFT', () => {
    const reachable = new Set(reachableRiskAssessmentStates('DRAFT'));
    for (const s of [
      'OPEN',
      'INFORMATION_PENDING',
      'REVIEW',
      'RECOMMENDATION',
      'APPROVAL_PENDING',
      'REFERRED',
      'CONTROL_ACTION',
      'COMPLETED',
      'CLOSED',
    ] as BnRiskAssessmentStatus[]) {
      expect(reachable.has(s), `${s} unreachable`).toBe(true);
    }
  });

  it('terminal state has no outbound transitions', () => {
    for (const s of BN_RISK_ASSESSMENT_TERMINAL_STATES) {
      expect(BN_RISK_ASSESSMENT_TRANSITIONS[s]).toEqual([]);
      expect(isRiskAssessmentTerminal(s)).toBe(true);
    }
  });

  it('cannot reach benefit-affecting outcomes without APPROVAL_PENDING', () => {
    // No direct transition from REVIEW or RECOMMENDATION into CONTROL_ACTION / REFERRED.
    expect(
      canRiskAssessmentTransition('REVIEW', 'CONTROL_ACTION'),
    ).toBe(false);
    expect(
      canRiskAssessmentTransition('RECOMMENDATION', 'CONTROL_ACTION'),
    ).toBe(false);
    expect(canRiskAssessmentTransition('REVIEW', 'REFERRED')).toBe(false);
    expect(canRiskAssessmentTransition('DRAFT', 'CONTROL_ACTION')).toBe(false);
  });
});

describe('BN Risk — categories and control actions', () => {
  it('includes all 25 required categories', () => {
    expect(BN_RISK_CATEGORIES).toHaveLength(25);
    expect(BN_RISK_CATEGORIES).toContain('PAYMENT_AFTER_DEATH');
    expect(BN_RISK_CATEGORIES).toContain('SYSTEM_CALCULATION_ERROR');
    expect(BN_RISK_CATEGORIES).toContain('SUSPECTED_COLLUSION');
    expect(new Set(BN_RISK_CATEGORIES).size).toBe(BN_RISK_CATEGORIES.length);
  });

  it('flags benefit-affecting control actions', () => {
    for (const a of BN_RISK_BENEFIT_AFFECTING_ACTIONS) {
      expect(isBenefitAffectingAction(a)).toBe(true);
    }
    expect(isBenefitAffectingAction('NO_ACTION')).toBe(false);
    expect(isBenefitAffectingAction('ENHANCED_VERIFICATION')).toBe(false);
    expect(isBenefitAffectingAction('REQUEST_DOCUMENTS')).toBe(false);
  });

  it('every benefit-affecting action is in the master action list', () => {
    for (const a of BN_RISK_BENEFIT_AFFECTING_ACTIONS) {
      expect(BN_RISK_CONTROL_ACTIONS).toContain(a);
    }
  });
});

describe('BN Risk — explainable scoring engine', () => {
  const mkFactor = (
    partial: Partial<RiskFactorInput> = {},
  ): RiskFactorInput => ({
    factorId: 'F-1',
    ruleId: 'R-1',
    ruleVersion: 'v1',
    rawScore: 40,
    ruleWeight: 1,
    severity: 'MEDIUM',
    confidence: 'MEDIUM',
    ageDays: 0,
    repeatCount: 0,
    financialExposureMinor: 0,
    explanation: 'test',
    ...partial,
  });

  it('produces one row per factor and a total that equals sum of contributions + manual adj', () => {
    const r = scoreRisk(
      [mkFactor({ factorId: 'F-A' }), mkFactor({ factorId: 'F-B', rawScore: 20 })],
      5,
    );
    expect(r.rows).toHaveLength(2);
    const sum = r.rows.reduce((n, row) => n + row.contribution, 0) + 5;
    expect(Math.abs(r.total - sum)).toBeLessThan(0.01);
  });

  it('is deterministic', () => {
    const factors = [mkFactor(), mkFactor({ severity: 'HIGH', rawScore: 60 })];
    const a = scoreRisk(factors);
    const b = scoreRisk(factors);
    expect(a.total).toBe(b.total);
    expect(a.band).toBe(b.band);
  });

  it('caps manual adjustment by policy', () => {
    const r = scoreRisk([mkFactor()], 999);
    expect(r.manualAdjustment).toBe(DEFAULT_RISK_SCORING_POLICY.manualAdjustmentCap);
    const rNeg = scoreRisk([mkFactor()], -999);
    expect(rNeg.manualAdjustment).toBe(
      -DEFAULT_RISK_SCORING_POLICY.manualAdjustmentCap,
    );
  });

  it('produces LOW band for empty factor set', () => {
    expect(scoreRisk([]).band).toBe('LOW');
  });

  it('escalates band with severity + confidence + exposure', () => {
    const low = scoreRisk([
      mkFactor({ rawScore: 30, severity: 'LOW', confidence: 'LOW' }),
    ]);
    expect(low.band).toBe('LOW');

    const critical = scoreRisk([
      mkFactor({
        rawScore: 90,
        ruleWeight: 1.5,
        severity: 'CRITICAL',
        confidence: 'HIGH',
        repeatCount: 3,
        financialExposureMinor: 3_000_000,
      }),
    ]);
    expect(critical.band).toBe('CRITICAL');
  });

  it('recency decay reduces old factor contributions but never below floor', () => {
    const fresh = scoreRisk([mkFactor({ rawScore: 60, ageDays: 0 })]);
    const stale = scoreRisk([mkFactor({ rawScore: 60, ageDays: 365 })]);
    expect(stale.total).toBeLessThan(fresh.total);
    // Decay is capped
    const veryStale = scoreRisk([mkFactor({ rawScore: 60, ageDays: 10_000 })]);
    expect(fresh.total - veryStale.total).toBeLessThanOrEqual(
      DEFAULT_RISK_SCORING_POLICY.maxRecencyDecay + 0.01,
    );
  });

  it('manual adjustment alone cannot lift LOW into CRITICAL', () => {
    // Empty factors → base 0; max manual adj is 20; CRITICAL threshold is 85.
    const r = scoreRisk([], 999);
    expect(r.band).not.toBe('CRITICAL');
    expect(r.band).not.toBe('HIGH');
  });

  it('every explanation row carries the source factor id', () => {
    const r = scoreRisk([mkFactor({ factorId: 'X-1', explanation: 'why' })]);
    expect(r.rows[0].factorId).toBe('X-1');
    expect(r.rows[0].explanation).toBe('why');
  });
});

describe('BN Risk — deduplication key', () => {
  it('is stable and unique per (module, entity, rule, version, category)', () => {
    const a = signalDedupeKey({
      ruleId: 'R1',
      ruleVersion: 'v1',
      sourceModule: 'BN_PAYMENT',
      sourceEntityId: 'PMT-1',
      category: 'PAYMENT_AFTER_DEATH',
    });
    const same = signalDedupeKey({
      ruleId: 'R1',
      ruleVersion: 'v1',
      sourceModule: 'BN_PAYMENT',
      sourceEntityId: 'PMT-1',
      category: 'PAYMENT_AFTER_DEATH',
    });
    const different = signalDedupeKey({
      ruleId: 'R1',
      ruleVersion: 'v2',
      sourceModule: 'BN_PAYMENT',
      sourceEntityId: 'PMT-1',
      category: 'PAYMENT_AFTER_DEATH',
    });
    expect(a).toBe(same);
    expect(a).not.toBe(different);
  });
});
