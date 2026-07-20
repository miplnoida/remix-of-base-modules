// deno-lint-ignore-file no-explicit-any
/**
 * BN-MORT-UX-2A — Deno unit tests for the mortality list-events
 * validate + filter-build pipeline. The edge function replays the
 * ordered {@link ListEventsFilterOp} sequence against PostgREST, so
 * asserting the sequence proves the wire behaviour without a DB.
 */
import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  QueryError,
  buildListEventsFilters,
  escapeIlike,
  firstOfCurrentMonthUtcIso,
  validateListEventsParams,
} from './_shared.ts';

const FIXED = new Date('2026-07-20T12:00:00Z');

Deno.test('escapeIlike escapes wildcards and control chars', () => {
  assertEquals(escapeIlike('a%b'), 'a\\%b');
  assertEquals(escapeIlike('a_b'), 'a\\_b');
  assertEquals(escapeIlike('safe'), 'safe');
});

Deno.test('validateListEventsParams: default emits sortBy=reported_at desc', () => {
  const s = validateListEventsParams({});
  assertEquals(s.sortBy, 'reported_at');
  assertEquals(s.sortDir, 'desc');
});

Deno.test('validateListEventsParams: rejects unknown status', () => {
  assertThrows(
    () => validateListEventsParams({ status: 'NOPE' }),
    QueryError,
    'status not allowed',
  );
});

Deno.test('validateListEventsParams: rejects non-UUID assignedTo', () => {
  assertThrows(
    () => validateListEventsParams({ assignedTo: 'not-a-uuid' }),
    QueryError,
    'assignedTo must be UUID',
  );
});

Deno.test('validateListEventsParams: rejects openOnly+status combination', () => {
  assertThrows(
    () => validateListEventsParams({ openOnly: true, status: 'VERIFICATION_PENDING' }),
    QueryError,
    'openOnly cannot be combined',
  );
});

Deno.test('validateListEventsParams: caps search length at 100', () => {
  assertThrows(
    () => validateListEventsParams({ search: 'x'.repeat(101) }),
    QueryError,
    'search too long',
  );
});

Deno.test('buildListEventsFilters: openOnly emits status not_in exclusion', () => {
  const ops = buildListEventsFilters(validateListEventsParams({ openOnly: true }), FIXED);
  const notIn = ops.find((o) => o.kind === 'not_in');
  if (!notIn || notIn.kind !== 'not_in') throw new Error('expected not_in op');
  assertEquals(notIn.column, 'status');
  assertEquals(notIn.value.includes('CLOSED'), true);
  assertEquals(notIn.value.includes('CANCELLED'), true);
  assertEquals(notIn.value.includes('REJECTED'), true);
});

Deno.test('buildListEventsFilters: closedThisMonthOnly gates status=CLOSED and closed_at>=first-of-month', () => {
  const ops = buildListEventsFilters(
    validateListEventsParams({ closedThisMonthOnly: true }),
    FIXED,
  );
  assertEquals(ops.some((o) => o.kind === 'eq' && o.column === 'status' && o.value === 'CLOSED'), true);
  const gte = ops.find((o) => o.kind === 'gte' && o.column === 'closed_at');
  if (!gte || gte.kind !== 'gte') throw new Error('expected gte closed_at');
  assertEquals(gte.value, firstOfCurrentMonthUtcIso(FIXED));
});

Deno.test('buildListEventsFilters: overdueOnly emits sla_due_at < now and status exclusions', () => {
  const ops = buildListEventsFilters(validateListEventsParams({ overdueOnly: true }), FIXED);
  const lt = ops.find((o) => o.kind === 'lt' && o.column === 'sla_due_at');
  if (!lt || lt.kind !== 'lt') throw new Error('expected lt sla_due_at');
  assertEquals(lt.value, FIXED.toISOString());
  assertEquals(ops.some((o) => o.kind === 'not_in' && o.column === 'status'), true);
});

Deno.test('buildListEventsFilters: search term is escaped before OR-ilike', () => {
  const ops = buildListEventsFilters(
    validateListEventsParams({ search: '100% off_now' }),
    FIXED,
  );
  const or = ops.find((o) => o.kind === 'or_ilike');
  if (!or || or.kind !== 'or_ilike') throw new Error('expected or_ilike');
  assertEquals(or.term, '100\\% off\\_now');
  assertEquals(or.columns.includes('deceased_full_name'), true);
  assertEquals(or.columns.includes('event_reference'), true);
});

Deno.test('buildListEventsFilters: unassignedOnly emits assigned_to is_null', () => {
  const ops = buildListEventsFilters(validateListEventsParams({ unassignedOnly: true }), FIXED);
  assertEquals(ops.some((o) => o.kind === 'is_null' && o.column === 'assigned_to'), true);
});
