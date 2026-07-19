import { describe, it, expect } from 'vitest';
import {
  BN_APPEAL_TRANSITIONS,
  BN_APPEAL_TYPE_CATALOG,
  BN_APPEAL_GROUND_CODES,
  canTransition,
  isTerminal,
  isValidAppealTypeCode,
} from '@/types/bn/appeals/appealStateMachine';
import { BN_APPEAL_COMMANDS } from '@/types/bn/appeals/appealCommands';

describe('BN Appeals — state machine', () => {
  it('has a submit path from DRAFT and SUBMITTED chain', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'ACKNOWLEDGED')).toBe(true);
    expect(canTransition('ACKNOWLEDGED', 'ADMISSIBILITY_REVIEW')).toBe(true);
  });

  it('forbids reverse transitions', () => {
    expect(canTransition('DECIDED', 'SUBMITTED')).toBe(false);
    expect(canTransition('CLOSED', 'DECIDED')).toBe(false);
    expect(canTransition('IMPLEMENTED', 'DRAFT')).toBe(false);
  });

  it('marks CLOSED as terminal and DRAFT as non-terminal', () => {
    expect(isTerminal('CLOSED')).toBe(true);
    expect(isTerminal('DRAFT')).toBe(false);
    expect(isTerminal('SUBMITTED')).toBe(false);
  });

  it('offers no outgoing transitions from CLOSED', () => {
    expect(BN_APPEAL_TRANSITIONS.CLOSED.length).toBe(0);
  });

  it('allows withdrawal from every pre-decision state', () => {
    (['DRAFT','SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW','ADMISSIBLE','HEARING_SCHEDULED'] as const)
      .forEach((s) => expect(canTransition(s, 'WITHDRAWN')).toBe(true));
  });
});

describe('BN Appeals — type catalog', () => {
  it('validates known appeal types and rejects unknown', () => {
    expect(isValidAppealTypeCode('CLAIM_DENIED')).toBe(true);
    expect(isValidAppealTypeCode('BOGUS_TYPE')).toBe(false);
  });

  it('has GENERAL as a fallback ground', () => {
    expect(BN_APPEAL_GROUND_CODES).toContain('GENERAL');
  });

  it('every type covers at least one source module', () => {
    for (const t of BN_APPEAL_TYPE_CATALOG) {
      expect(t.appliesTo.length).toBeGreaterThan(0);
      expect(t.statutoryFilingDays).toBeGreaterThan(0);
    }
  });
});

describe('BN Appeals — command catalog', () => {
  it('has BN_APPEAL_SUBMIT_CLAIMANT implemented and every other command catalogued', () => {
    const submit = BN_APPEAL_COMMANDS.find((c) => c.command === 'BN_APPEAL_SUBMIT_CLAIMANT')!;
    expect(submit).toBeDefined();
    expect(submit.implemented).toBe(true);
    expect(submit.requiresOwnershipCheck).toBe(true);
    // Every other command must exist (pending implementation)
    const names = BN_APPEAL_COMMANDS.map((c) => c.command);
    expect(names).toContain('BN_APPEAL_DECIDE');
    expect(names).toContain('BN_APPEAL_IMPLEMENT');
    expect(names).toContain('BN_APPEAL_REFER_LEGAL');
    expect(names).toContain('BN_APPEAL_WITHDRAW');
  });

  it('maker-checker commands are marked appropriately', () => {
    const decide = BN_APPEAL_COMMANDS.find((c) => c.command === 'BN_APPEAL_DECIDE')!;
    const recommend = BN_APPEAL_COMMANDS.find((c) => c.command === 'BN_APPEAL_RECOMMEND_OUTCOME')!;
    expect(decide.requiresMakerChecker).toBe(true);
    expect(recommend.requiresMakerChecker).toBe(true);
  });
});
