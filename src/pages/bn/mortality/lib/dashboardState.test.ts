/**
 * BN-MORT-UX-2A — dashboardState unit tests.
 *
 * Covers:
 *   1. Dashboard-card ↔ toolbar sync via {@link reduceDashboardState}
 *   2. User-scoped sessionStorage isolation
 *   3. Strict validation of restored payloads
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  applyCard,
  chipClear,
  clearOtherUserStates,
  loadDashboardState,
  normaliseDashboardState,
  reduceDashboardState,
  saveDashboardState,
  storageKeyForUser,
} from './dashboardState';

const UID_A = '11111111-1111-4111-8111-111111111111';
const UID_B = '22222222-2222-4222-8222-222222222222';
const UID_C = '33333333-3333-4333-8333-333333333333';

beforeEach(() => sessionStorage.clear());

describe('applyCard', () => {
  it('unassigned card sets assignee.unassigned and clears status', () => {
    const next = applyCard({ ...DEFAULT_STATE, status: 'CLOSED' }, 'unassigned');
    expect(next.activeCard).toBe('unassigned');
    expect(next.status).toBe('all');
    expect(next.assignee).toEqual({ kind: 'unassigned' });
  });

  it('overdue card sets overdueOnly and does not touch status', () => {
    const next = applyCard(DEFAULT_STATE, 'overdue');
    expect(next.activeCard).toBe('overdue');
    expect(next.overdueOnly).toBe(true);
    expect(next.status).toBe('all');
  });

  it('closedThisMonth card leaves status=all so the page emits closedThisMonthOnly', () => {
    const next = applyCard(DEFAULT_STATE, 'closedThisMonth');
    expect(next.activeCard).toBe('closedThisMonth');
    expect(next.status).toBe('all');
  });

  it('clicking the active card again clears it', () => {
    const first = applyCard(DEFAULT_STATE, 'verificationPending');
    const cleared = applyCard(first, 'verificationPending');
    expect(cleared.activeCard).toBeNull();
    expect(cleared.status).toBe('all');
  });

  it('resets pagination on any card change', () => {
    const next = applyCard({ ...DEFAULT_STATE, page: 5 }, 'conflicts');
    expect(next.page).toBe(0);
  });
});

describe('reduceDashboardState — sync between cards and toolbar', () => {
  it('manual status change clears the active card', () => {
    const carded = applyCard(DEFAULT_STATE, 'verificationPending');
    const next = reduceDashboardState(carded, { type: 'PATCH', patch: { status: 'CLOSED' } });
    expect(next.activeCard).toBeNull();
    expect(next.status).toBe('CLOSED');
  });

  it('changing assignee clears the Unassigned card only', () => {
    const unassignedCard = applyCard(DEFAULT_STATE, 'unassigned');
    const swapped = reduceDashboardState(unassignedCard, {
      type: 'PATCH',
      patch: { assignee: { kind: 'me' } },
    });
    expect(swapped.activeCard).toBeNull();

    const overdueCard = applyCard(DEFAULT_STATE, 'overdue');
    const swapped2 = reduceDashboardState(overdueCard, {
      type: 'PATCH',
      patch: { assignee: { kind: 'me' } },
    });
    expect(swapped2.activeCard).toBe('overdue');
  });

  it('turning overdue off clears the Overdue card only', () => {
    const overdueCard = applyCard(DEFAULT_STATE, 'overdue');
    const off = reduceDashboardState(overdueCard, {
      type: 'PATCH',
      patch: { overdueOnly: false },
    });
    expect(off.activeCard).toBeNull();
  });

  it('CLEAR_ALL restores DEFAULT_STATE', () => {
    const messy = applyCard({ ...DEFAULT_STATE, search: 'x', page: 3 }, 'conflicts');
    expect(reduceDashboardState(messy, { type: 'CLEAR_ALL' })).toEqual(DEFAULT_STATE);
  });
});

describe('chipClear', () => {
  it('removing the status chip also drops the card that generated it', () => {
    const card = applyCard(DEFAULT_STATE, 'verificationPending');
    const cleared = chipClear(card, 'status');
    expect(cleared.status).toBe('all');
    expect(cleared.activeCard).toBeNull();
  });

  it('removing the assignee chip drops the Unassigned card only', () => {
    const card = applyCard(DEFAULT_STATE, 'unassigned');
    const cleared = chipClear(card, 'assignee');
    expect(cleared.assignee).toEqual({ kind: 'all' });
    expect(cleared.activeCard).toBeNull();
  });
});

describe('normaliseDashboardState', () => {
  it('rejects unknown status and falls back to "all"', () => {
    const s = normaliseDashboardState({ status: '__hack__' });
    expect(s.status).toBe('all');
  });

  it('rejects unknown source', () => {
    expect(normaliseDashboardState({ source: 'nope' }).source).toBe('all');
  });

  it('rejects unknown activeCard', () => {
    expect(normaliseDashboardState({ activeCard: 'evil' }).activeCard).toBeNull();
  });

  it('rejects malformed reportedFrom/reportedTo', () => {
    const s = normaliseDashboardState({ reportedFrom: '2026/01/01', reportedTo: 'yesterday' });
    expect(s.reportedFrom).toBe('');
    expect(s.reportedTo).toBe('');
  });

  it('accepts valid ISO dates', () => {
    const s = normaliseDashboardState({ reportedFrom: '2026-01-01', reportedTo: '2026-01-31' });
    expect(s.reportedFrom).toBe('2026-01-01');
    expect(s.reportedTo).toBe('2026-01-31');
  });

  it('truncates search to 100 chars', () => {
    const s = normaliseDashboardState({ search: 'x'.repeat(300) });
    expect(s.search.length).toBe(100);
  });

  it('rejects non-UUID user assignee, falling back to all', () => {
    const s = normaliseDashboardState({ assignee: { kind: 'user', userId: 'nope' } });
    expect(s.assignee).toEqual({ kind: 'all' });
  });

  it('preserves valid UUID user assignee', () => {
    const s = normaliseDashboardState({ assignee: { kind: 'user', userId: UID_A } });
    expect(s.assignee).toEqual({ kind: 'user', userId: UID_A });
  });

  it('returns DEFAULT_STATE for non-object payloads', () => {
    expect(normaliseDashboardState(null)).toEqual(DEFAULT_STATE);
    expect(normaliseDashboardState('junk')).toEqual(DEFAULT_STATE);
    expect(normaliseDashboardState(42)).toEqual(DEFAULT_STATE);
  });
});

describe('sessionStorage — user isolation', () => {
  it('save + load round-trips per user', () => {
    const s = { ...DEFAULT_STATE, search: 'alice', page: 2 };
    saveDashboardState(UID_A, s);
    expect(loadDashboardState(UID_A)).toEqual(s);
  });

  it('user B never restores user A state', () => {
    saveDashboardState(UID_A, {
      ...DEFAULT_STATE,
      assignee: { kind: 'user', userId: UID_C },
    });
    const forB = loadDashboardState(UID_B);
    expect(forB.assignee).toEqual({ kind: 'all' });
    expect(forB).toEqual(DEFAULT_STATE);
  });

  it('no userId returns DEFAULT_STATE and does not read storage', () => {
    saveDashboardState(UID_A, { ...DEFAULT_STATE, search: 'ghost' });
    expect(loadDashboardState(null)).toEqual(DEFAULT_STATE);
    expect(loadDashboardState(undefined)).toEqual(DEFAULT_STATE);
  });

  it('malformed JSON payload yields DEFAULT_STATE', () => {
    sessionStorage.setItem(storageKeyForUser(UID_A), 'not-json');
    expect(loadDashboardState(UID_A)).toEqual(DEFAULT_STATE);
  });

  it('legacy v1 key is removed on load', () => {
    sessionStorage.setItem('bn.mortality.dashboard.filters.v1', JSON.stringify({ search: 'leaky' }));
    loadDashboardState(UID_A);
    expect(sessionStorage.getItem('bn.mortality.dashboard.filters.v1')).toBeNull();
  });

  it('clearOtherUserStates removes other users but keeps current', () => {
    saveDashboardState(UID_A, { ...DEFAULT_STATE, search: 'a' });
    saveDashboardState(UID_B, { ...DEFAULT_STATE, search: 'b' });
    clearOtherUserStates(UID_A);
    expect(sessionStorage.getItem(storageKeyForUser(UID_A))).not.toBeNull();
    expect(sessionStorage.getItem(storageKeyForUser(UID_B))).toBeNull();
  });

  it('clearOtherUserStates with null clears everyone', () => {
    saveDashboardState(UID_A, DEFAULT_STATE);
    saveDashboardState(UID_B, DEFAULT_STATE);
    clearOtherUserStates(null);
    expect(sessionStorage.getItem(storageKeyForUser(UID_A))).toBeNull();
    expect(sessionStorage.getItem(storageKeyForUser(UID_B))).toBeNull();
  });
});
