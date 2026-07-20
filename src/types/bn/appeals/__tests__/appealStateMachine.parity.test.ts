/**
 * BN-AP-01 §B — Canonical status / command parity.
 *
 * Guards:
 *   1. every command's `validFrom` references only canonical statuses;
 *   2. lifecycle status is disjoint from decision outcome (no DECIDED_UPHELD);
 *   3. the transition graph is closed within `BN_APPEAL_STATUSES`;
 *   4. `BN_APPEAL_STATUSES` is a superset of every state referenced anywhere;
 *   5. terminal states declare zero forward transitions.
 */
import { describe, it, expect } from 'vitest';
import {
  BN_APPEAL_STATUSES,
  BN_APPEAL_TRANSITIONS,
  BN_APPEAL_TERMINAL_STATES,
  BN_APPEAL_OUTCOMES,
  isTerminal,
  canTransition,
} from '@/types/bn/appeals/appealStateMachine';
import { BN_APPEAL_COMMANDS } from '@/types/bn/appeals/appealCommands';

describe('BN Appeals — canonical state/command parity (AP-01 §B)', () => {
  it('every command validFrom references a canonical status', () => {
    for (const cmd of BN_APPEAL_COMMANDS) {
      for (const s of cmd.validFrom) {
        expect(BN_APPEAL_STATUSES).toContain(s);
      }
    }
  });

  it('lifecycle statuses and decision outcomes are disjoint sets', () => {
    for (const outcome of BN_APPEAL_OUTCOMES) {
      // The only allowed overlap is the string INADMISSIBLE / WITHDRAWN which
      // exist in BOTH lists intentionally (they can be either a lifecycle
      // state or a decided outcome). What must NOT exist is a hybrid
      // status like `DECIDED_UPHELD`.
      const combined = `DECIDED_${outcome}`;
      expect(BN_APPEAL_STATUSES as readonly string[]).not.toContain(combined);
    }
  });

  it('transition graph only references canonical statuses', () => {
    for (const from of Object.keys(BN_APPEAL_TRANSITIONS)) {
      expect(BN_APPEAL_STATUSES).toContain(from as any);
      for (const to of BN_APPEAL_TRANSITIONS[from as keyof typeof BN_APPEAL_TRANSITIONS]) {
        expect(BN_APPEAL_STATUSES).toContain(to);
      }
    }
  });

  it('terminal states allow no forward transitions', () => {
    for (const t of BN_APPEAL_TERMINAL_STATES) {
      expect(BN_APPEAL_TRANSITIONS[t].length).toBe(0);
      expect(isTerminal(t)).toBe(true);
    }
  });

  it('new states CASE_PREPARATION, PARTIALLY_IMPLEMENTED, CANCELLED are reachable', () => {
    expect(canTransition('ADMISSIBLE', 'CASE_PREPARATION')).toBe(true);
    expect(canTransition('IMPLEMENTATION_PENDING', 'PARTIALLY_IMPLEMENTED')).toBe(true);
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
    expect(canTransition('SUBMITTED', 'CANCELLED')).toBe(true);
    // CANCELLED is terminal.
    expect(canTransition('CANCELLED', 'CLOSED')).toBe(false);
  });

  it('BN_APPEAL_SUBMIT_CLAIMANT is the only handler currently implemented', () => {
    const implemented = BN_APPEAL_COMMANDS.filter((c) => c.implemented).map((c) => c.command);
    expect(implemented).toEqual(['BN_APPEAL_SUBMIT_CLAIMANT']);
  });

  it('every un-implemented command declares a blocker string for the action panel', () => {
    for (const cmd of BN_APPEAL_COMMANDS) {
      if (!cmd.implemented) {
        expect(cmd.blocker, `${cmd.command} must declare a blocker reason`).toBeTruthy();
      }
    }
  });
});
