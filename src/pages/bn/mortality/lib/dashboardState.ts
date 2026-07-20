/**
 * BN-MORT-UX-2A — Mortality dashboard state (pure, testable).
 *
 * All non-UI decisions about the interactive worklist live here:
 *   • Canonical shape of the persisted filter state.
 *   • A single {@link reduceDashboardState} transition helper that keeps
 *     dashboard cards and toolbar filters in sync (no ad-hoc conditions
 *     scattered across the page).
 *   • User-scoped sessionStorage load/save that never leaks another
 *     user's assignee UUID and never exposes UUIDs in the URL.
 *   • Strict `normaliseDashboardState` validation so replays of arbitrary
 *     storage payloads fall back safely to defaults.
 */

import { MORTALITY_STATUS_LABELS, MORTALITY_SOURCE_LABELS } from './mortalityLabels';

export type CardId =
  | 'totalOpen'
  | 'unassigned'
  | 'verificationPending'
  | 'provisionallyHeld'
  | 'conflicts'
  | 'impactReview'
  | 'approvalPending'
  | 'followOn'
  | 'overdue'
  | 'closedThisMonth';

export const CARD_IDS: readonly CardId[] = [
  'totalOpen', 'unassigned', 'verificationPending', 'provisionallyHeld',
  'conflicts', 'impactReview', 'approvalPending', 'followOn', 'overdue',
  'closedThisMonth',
];

export type AssigneeMode =
  | { kind: 'all' }
  | { kind: 'unassigned' }
  | { kind: 'me' }
  | { kind: 'user'; userId: string };

export interface DashState {
  status: string;              // 'all' | canonical status
  source: string;              // 'all' | canonical source
  search: string;
  overdueOnly: boolean;
  assignee: AssigneeMode;
  reportedFrom: string;        // '' or YYYY-MM-DD
  reportedTo: string;
  activeCard: CardId | null;
  page: number;
}

export const DEFAULT_STATE: DashState = {
  status: 'all',
  source: 'all',
  search: '',
  overdueOnly: false,
  assignee: { kind: 'all' },
  reportedFrom: '',
  reportedTo: '',
  activeCard: null,
  page: 0,
};

export const MAX_SEARCH_LENGTH = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------------------------------------------ */
/* Card → filter mapping (single source of truth)                      */
/* ------------------------------------------------------------------ */

/**
 * Every card resets to a base of "All open" (status=all, overdue=off,
 * assignee=all) then applies a single card-specific filter. Clicking an
 * already-active card clears it. `closedThisMonth` is applied by the
 * consumer via the `activeCard === 'closedThisMonth'` sentinel so we can
 * emit `closedThisMonthOnly=true` instead of a plain status filter.
 */
export function applyCard(prev: DashState, id: CardId): DashState {
  if (prev.activeCard === id) {
    return {
      ...prev,
      activeCard: null,
      status: 'all',
      overdueOnly: false,
      assignee: { kind: 'all' },
      page: 0,
    };
  }
  const base: DashState = {
    ...prev,
    activeCard: id,
    status: 'all',
    overdueOnly: false,
    assignee: { kind: 'all' },
    page: 0,
  };
  switch (id) {
    case 'totalOpen':           return base;
    case 'unassigned':          return { ...base, assignee: { kind: 'unassigned' } };
    case 'verificationPending': return { ...base, status: 'VERIFICATION_PENDING' };
    case 'provisionallyHeld':   return { ...base, status: 'PROVISIONALLY_HELD' };
    case 'conflicts':           return { ...base, status: 'CONFLICT' };
    case 'impactReview':        return { ...base, status: 'IMPACT_REVIEW' };
    case 'approvalPending':     return { ...base, status: 'APPROVAL_PENDING' };
    case 'followOn':            return { ...base, status: 'FOLLOW_ON_PROCESSING' };
    case 'overdue':             return { ...base, overdueOnly: true };
    case 'closedThisMonth':     return { ...base }; // consumer maps to closedThisMonthOnly
  }
}

/* ------------------------------------------------------------------ */
/* Central transition helper                                           */
/* ------------------------------------------------------------------ */

/**
 * Which activeCard, if any, is "compatible" with a manual field change?
 * Any manual status change clears the card. Assignee changes clear the
 * card only when the card was Unassigned; overdue toggle-off clears only
 * when the card was Overdue. Removing a chip that a card generated also
 * clears the card — encoded in {@link chipClear}.
 */
function afterManual(prev: DashState, patch: Partial<DashState>): DashState {
  let next: DashState = { ...prev, ...patch };

  // Status changes always clear the active card. Selecting "All open"
  // (status=all) is a manual status change too — the openOnly=true
  // dashboard default is restored automatically by the filters selector
  // in the page (based on status==='all' && activeCard!=='closedThisMonth').
  if (patch.status !== undefined && patch.status !== prev.status) {
    next = { ...next, activeCard: null };
  }
  if (patch.assignee !== undefined && prev.activeCard === 'unassigned') {
    next = { ...next, activeCard: null };
  }
  if (
    patch.overdueOnly !== undefined &&
    patch.overdueOnly === false &&
    prev.activeCard === 'overdue'
  ) {
    next = { ...next, activeCard: null };
  }
  return next;
}

export type DashAction =
  | { type: 'PATCH'; patch: Partial<DashState> }
  | { type: 'CARD'; id: CardId }
  | { type: 'CHIP_CLEAR'; key: ChipKey }
  | { type: 'CLEAR_ALL' };

export function reduceDashboardState(prev: DashState, action: DashAction): DashState {
  switch (action.type) {
    case 'PATCH':      return afterManual(prev, action.patch);
    case 'CARD':       return applyCard(prev, action.id);
    case 'CHIP_CLEAR': return chipClear(prev, action.key);
    case 'CLEAR_ALL':  return { ...DEFAULT_STATE };
  }
}

/* ------------------------------------------------------------------ */
/* Active-chip modelling                                               */
/* ------------------------------------------------------------------ */

export type ChipKey =
  | 'card'      // closedThisMonth card marker
  | 'status'
  | 'source'
  | 'assignee'
  | 'overdue'
  | 'search'
  | 'reported';

/**
 * Removing a chip that a card generated also drops the active card.
 * Removing a purely-user-set chip does not touch the card.
 */
export function chipClear(prev: DashState, key: ChipKey): DashState {
  switch (key) {
    case 'card':
      return { ...prev, activeCard: null, status: 'all', page: 0 };
    case 'status':
      // Any card that produced this status chip is also cleared.
      return { ...prev, status: 'all', activeCard: null, page: 0 };
    case 'source':
      return { ...prev, source: 'all', page: 0 };
    case 'assignee':
      return {
        ...prev,
        assignee: { kind: 'all' },
        activeCard: prev.activeCard === 'unassigned' ? null : prev.activeCard,
        page: 0,
      };
    case 'overdue':
      return {
        ...prev,
        overdueOnly: false,
        activeCard: prev.activeCard === 'overdue' ? null : prev.activeCard,
        page: 0,
      };
    case 'search':
      return { ...prev, search: '', page: 0 };
    case 'reported':
      return { ...prev, reportedFrom: '', reportedTo: '', page: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const KNOWN_STATUS = new Set(Object.keys(MORTALITY_STATUS_LABELS));
const KNOWN_SOURCE = new Set(Object.keys(MORTALITY_SOURCE_LABELS));
const KNOWN_CARD = new Set<string>(CARD_IDS);

function validAssignee(raw: unknown): AssigneeMode {
  if (!raw || typeof raw !== 'object') return { kind: 'all' };
  const r = raw as Record<string, unknown>;
  switch (r.kind) {
    case 'all':        return { kind: 'all' };
    case 'unassigned': return { kind: 'unassigned' };
    case 'me':         return { kind: 'me' };
    case 'user': {
      if (typeof r.userId === 'string' && UUID_RE.test(r.userId)) {
        return { kind: 'user', userId: r.userId };
      }
      return { kind: 'all' };
    }
    default: return { kind: 'all' };
  }
}

/**
 * Validate and normalise a raw dashboard payload (e.g. from sessionStorage).
 * Every invalid or obsolete value falls back to a safe default. Never
 * throws — safe for restore code paths that must always yield a state.
 */
export function normaliseDashboardState(raw: unknown): DashState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE };
  const r = raw as Record<string, unknown>;

  const status = typeof r.status === 'string' && (r.status === 'all' || KNOWN_STATUS.has(r.status))
    ? r.status : 'all';
  const source = typeof r.source === 'string' && (r.source === 'all' || KNOWN_SOURCE.has(r.source))
    ? r.source : 'all';
  const activeCard = typeof r.activeCard === 'string' && KNOWN_CARD.has(r.activeCard)
    ? (r.activeCard as CardId) : null;
  const overdueOnly = r.overdueOnly === true;
  const page = typeof r.page === 'number' && Number.isFinite(r.page) && r.page >= 0
    ? Math.floor(r.page) : 0;
  const reportedFrom = typeof r.reportedFrom === 'string' && (r.reportedFrom === '' || ISO_DATE_RE.test(r.reportedFrom))
    ? r.reportedFrom : '';
  const reportedTo = typeof r.reportedTo === 'string' && (r.reportedTo === '' || ISO_DATE_RE.test(r.reportedTo))
    ? r.reportedTo : '';
  const searchRaw = typeof r.search === 'string' ? r.search : '';
  const search = searchRaw.slice(0, MAX_SEARCH_LENGTH);
  const assignee = validAssignee(r.assignee);

  return {
    status, source, search, overdueOnly, assignee,
    reportedFrom, reportedTo, activeCard, page,
  };
}

/* ------------------------------------------------------------------ */
/* User-scoped sessionStorage                                          */
/* ------------------------------------------------------------------ */

const LEGACY_KEY = 'bn.mortality.dashboard.filters.v1';
const KEY_PREFIX = 'bn.mortality.dashboard.filters.v2:';

export function storageKeyForUser(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/**
 * Load and validate a user's persisted filters. When no user is known,
 * the caller receives {@link DEFAULT_STATE} and no storage read happens
 * — guaranteeing User B never restores User A's specific-assignee UUID.
 * The obsolete v1 global key is removed on best-effort basis.
 */
export function loadDashboardState(userId: string | null | undefined): DashState {
  // Best-effort: always drop the legacy shared key so identity swaps
  // cannot silently inherit a prior user's specific-assignee UUID.
  try { sessionStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  if (!userId) return { ...DEFAULT_STATE };
  try {
    const raw = sessionStorage.getItem(storageKeyForUser(userId));
    if (!raw) return { ...DEFAULT_STATE };
    return normaliseDashboardState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveDashboardState(userId: string | null | undefined, state: DashState): void {
  if (!userId) return;
  try {
    sessionStorage.setItem(storageKeyForUser(userId), JSON.stringify(state));
  } catch { /* ignore */ }
}

/**
 * Clear another user's persisted state when identity changes. Called by
 * the page on `useEffect` transitions so a signed-out user cannot leave
 * their assignee UUID lingering in the session of the machine's next user.
 */
export function clearOtherUserStates(currentUserId: string | null | undefined): void {
  try {
    const keep = currentUserId ? storageKeyForUser(currentUserId) : null;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k === LEGACY_KEY) { sessionStorage.removeItem(k); continue; }
      if (k.startsWith(KEY_PREFIX) && k !== keep) sessionStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}
