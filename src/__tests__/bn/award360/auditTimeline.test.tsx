/**
 * BN-AWARD360-B4B — Audit timeline workspace tests.
 *
 * Proves:
 *  - Canonical suspension columns (proposed_by_user_id, NOT proposed_by).
 *  - Actor fallback: proposed_by_user_id ?? entered_by.
 *  - Status/rate/suspension merged chronologically.
 *  - core_audit_log is NOT queried when includeCentralAudit=false.
 *  - core_audit_log uses canonical central-audit columns when allowed.
 *  - A single source failure (thrown or { error }) yields a warning while
 *    the rest of the timeline still renders.
 *  - Supabase { data, error } failures are detected (not silently dropped).
 *  - Filtering, paging and sorting work.
 *  - Summary counts use the full merged result (not the paged slice).
 *  - No inserts/updates/deletes/upserts occur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type QueryChain = {
  select: (spec?: string) => QueryChain;
  eq: (col: string, val: any) => QueryChain;
  or: (expr: string) => QueryChain;
  order: (col: string, opts?: any) => QueryChain;
  range: (a: number, b: number) => QueryChain;
  then: (resolve: any) => any;
};

interface TableBehaviour {
  rows?: any[];
  error?: any;
  throwError?: any;
}

function parseSelect(spec?: string): string[] | null {
  if (!spec || spec.trim() === '' || spec.trim() === '*') return null;
  return spec.split(',').map((s) => s.trim()).filter(Boolean);
}

function makeSupabase(byTable: Record<string, TableBehaviour>) {
  const selectCalls: Record<string, string[][]> = {};
  const forbidden: string[] = [];
  const tableCalls: Record<string, number> = {};

  const from = (table: string) => {
    tableCalls[table] = (tableCalls[table] ?? 0) + 1;
    const chain: any = {
      select: (spec?: string) => {
        const cols = parseSelect(spec);
        (selectCalls[table] ??= []).push(cols ?? []);
        return chain;
      },
      eq: () => chain,
      or: () => chain,
      order: () => chain,
      range: () => chain,
      then: (resolve: any) => {
        const b = byTable[table];
        if (b?.throwError) {
          return Promise.reject(b.throwError).then(resolve, resolve);
        }
        if (b?.error) {
          resolve({ data: null, error: b.error });
          return;
        }
        resolve({ data: b?.rows ?? [], error: null });
      },
      insert: () => { forbidden.push(`insert:${table}`); return chain; },
      update: () => { forbidden.push(`update:${table}`); return chain; },
      delete: () => { forbidden.push(`delete:${table}`); return chain; },
      upsert: () => { forbidden.push(`upsert:${table}`); return chain; },
    };
    return chain as QueryChain;
  };
  return { from, selectCalls, forbidden, tableCalls };
}

const state = { current: null as any };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => state.current.from(t) },
}));

import {
  listAwardAuditPaged,
  listAwardAudit,
  AWARD_AUDIT_STATUS_COLUMNS,
  AWARD_AUDIT_RATE_COLUMNS,
  AWARD_AUDIT_SUSPENSION_COLUMNS,
  AWARD_AUDIT_CENTRAL_COLUMNS,
} from '@/services/bn/awards/award360Service';

beforeEach(() => {
  state.current = null;
});

const statusRow = {
  id: 'st1', bn_award_id: 'a1', event_date: '2024-06-15', entered_by: 'u-status', from_status: 'ACTIVE', to_status: 'SUSPENDED', reason_code: 'MED_REVIEW', remarks: null,
};
const rateRow = {
  id: 'rt1', bn_award_id: 'a1', effective_from: '2024-05-01', entered_by: 'u-rate', rate_amount: 250, currency: 'XCD', change_reason: 'INDEX', reference_doc: null,
};
const suspRow = {
  id: 'sp1', bn_award_id: 'a1', entered_at: '2024-07-01', entered_by: 'u-entered', proposed_by_user_id: 'u-proposer', status: 'SUSPENDED', suspension_type: 'MEDICAL', reason_code: 'BOARD_DECISION', reason_text: null, correlation_id: 'corr-1',
};
const suspRow2 = {
  id: 'sp2', bn_award_id: 'a1', entered_at: '2024-04-01', entered_by: 'u-entered-2', proposed_by_user_id: null, status: 'ACTIVE', reason_code: null, correlation_id: null,
};
const centralRow = {
  id: 'ce1', event_time: '2024-08-01', created_at: '2024-08-01', action: 'AWARD_UPDATED', event_code: 'AWARD_UPDATED', actor_user_id: 'uuid-1', actor_name: 'Alice', before_value: { rate: 100 }, after_value: { rate: 200 }, reason: 'correction', correlation_id: 'corr-2', severity: 'info', domain_code: 'AWARD', entity_type: 'bn_award', entity_id: 'a1',
};

describe('BN-AWARD360-B4B suspension column correction', () => {
  it('requests canonical suspension columns and never `proposed_by`', async () => {
    const s = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow] },
    });
    state.current = s;
    await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 });
    const cols = s.selectCalls['bn_award_suspension_event']?.[0] ?? [];
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'entered_at', 'entered_by', 'proposed_by_user_id',
      'status', 'suspension_type', 'suspended_from', 'suspended_to',
      'resumed_at', 'resumed_by', 'reason_code', 'reason_text', 'correlation_id',
    ]));
    expect(cols).not.toContain('proposed_by');
    // Confirm the constant is also correct.
    expect(AWARD_AUDIT_SUSPENSION_COLUMNS).not.toContain('proposed_by,');
    expect(AWARD_AUDIT_SUSPENSION_COLUMNS).toContain('proposed_by_user_id');
    expect(s.forbidden).toEqual([]);
  });

  it('resolves suspension actor as proposed_by_user_id ?? entered_by', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [] },
      bn_award_rate_history: { rows: [] },
      bn_award_suspension_event: { rows: [suspRow, suspRow2] },
    });
    const { rows } = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId['susp:sp1'].actor).toBe('u-proposer');
    expect(byId['susp:sp2'].actor).toBe('u-entered-2'); // fallback
  });
});

describe('BN-AWARD360-B4B canonical column selection', () => {
  it('status / rate / central selections do not include invented fields', async () => {
    const s = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow] },
      core_audit_log: { rows: [centralRow] },
    });
    state.current = s;
    await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 }, { includeCentralAudit: true });
    const stCols = s.selectCalls['bn_award_status_event']?.[0] ?? [];
    expect(stCols).toEqual(expect.arrayContaining(['id', 'event_date', 'entered_by', 'from_status', 'to_status', 'reason_code', 'remarks']));
    expect(stCols).not.toContain('*');
    const raCols = s.selectCalls['bn_award_rate_history']?.[0] ?? [];
    expect(raCols).toEqual(expect.arrayContaining(['id', 'effective_from', 'rate_amount', 'change_reason']));
    const ceCols = s.selectCalls['core_audit_log']?.[0] ?? [];
    // Uses canonical central columns — actor_user_id (not actor_user_code),
    // event_time (not occurred_at).
    expect(ceCols).toEqual(expect.arrayContaining(['id', 'event_time', 'action', 'actor_user_id', 'before_value', 'after_value', 'severity']));
    expect(ceCols).not.toContain('actor_user_code');
    expect(ceCols).not.toContain('occurred_at');
    expect(AWARD_AUDIT_STATUS_COLUMNS).toContain('event_date');
    expect(AWARD_AUDIT_RATE_COLUMNS).toContain('rate_amount');
    expect(AWARD_AUDIT_CENTRAL_COLUMNS).toContain('actor_user_id');
  });
});

describe('BN-AWARD360-B4B central audit gating', () => {
  it('does NOT touch core_audit_log when includeCentralAudit=false (default)', async () => {
    const s = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow] },
    });
    state.current = s;
    const res = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 });
    expect(s.tableCalls['core_audit_log'] ?? 0).toBe(0);
    const centralSource = res.sources.find((sr) => sr.key === 'central');
    expect(centralSource?.restricted).toBe(true);
    expect(centralSource?.loaded).toBe(false);
  });

  it('queries core_audit_log ONLY when includeCentralAudit=true', async () => {
    const s = makeSupabase({
      bn_award_status_event: { rows: [] },
      bn_award_rate_history: { rows: [] },
      bn_award_suspension_event: { rows: [] },
      core_audit_log: { rows: [centralRow] },
    });
    state.current = s;
    const res = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 }, { includeCentralAudit: true });
    expect(s.tableCalls['core_audit_log']).toBe(1);
    expect(res.rows.some((r) => r.id === 'audit:ce1')).toBe(true);
    expect(res.summary.centralAuditEvents).toBe(1);
  });
});

describe('BN-AWARD360-B4B merge, filter, paging and summary', () => {
  it('merges status / rate / suspension chronologically (desc)', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow, suspRow2] },
    });
    const { rows, summary } = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 });
    // suspRow (2024-07-01) > statusRow (2024-06-15) > rateRow (2024-05-01) > suspRow2 (2024-04-01)
    expect(rows.map((r) => r.id)).toEqual(['susp:sp1', 'status:st1', 'rate:rt1', 'susp:sp2']);
    expect(summary.totalRows).toBe(4);
    expect(summary.statusEvents).toBe(1);
    expect(summary.rateEvents).toBe(1);
    expect(summary.suspensionEvents).toBe(2);
    expect(summary.centralAuditEvents).toBe(0);
    expect(summary.eventsWithCorrelation).toBe(1); // suspRow only
    expect(summary.warnEvents).toBe(2); // both suspensions default to warn
  });

  it('summary reflects the FULL merged result, not the paged slice', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow, suspRow2] },
    });
    const page1 = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 2 });
    expect(page1.rows).toHaveLength(2);
    expect(page1.total).toBe(4);
    expect(page1.summary.totalRows).toBe(4);
  });

  it('filters by domain, severity and correlation id', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow, suspRow2] },
    });
    const byDomain = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50, domains: ['STATUS'] });
    expect(byDomain.rows.map((r) => r.id)).toEqual(['status:st1']);

    const bySev = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50, severities: ['warn'] });
    expect(bySev.rows.every((r) => (r.severity ?? '').toLowerCase() === 'warn')).toBe(true);

    const byCid = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50, correlationId: 'corr-1' });
    expect(byCid.rows.map((r) => r.id)).toEqual(['susp:sp1']);
  });

  it('sorts ascending when requested', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow] },
    });
    const asc = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50, sortDirection: 'asc' });
    expect(asc.rows[0].id).toBe('rate:rt1');
    expect(asc.rows[asc.rows.length - 1].id).toBe('susp:sp1');
  });
});

describe('BN-AWARD360-B4B source failure isolation', () => {
  it('rejected promise on suspension source produces a warning but other rows remain', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { throwError: new Error('boom') },
    });
    const res = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 });
    expect(res.rows.some((r) => r.id === 'status:st1')).toBe(true);
    expect(res.rows.some((r) => r.id === 'rate:rt1')).toBe(true);
    expect(res.warnings.some((w) => /Suspension history unavailable/.test(w))).toBe(true);
    expect(res.sources.find((s) => s.key === 'suspension')?.error).toContain('boom');
    expect(res.summary.sourceWarningCount).toBeGreaterThan(0);
  });

  it('{ data:null, error } response is detected (not silently dropped)', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { error: { message: 'rate blew up' } },
      bn_award_suspension_event: { rows: [] },
    });
    const res = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 });
    expect(res.warnings.some((w) => /Rate history unavailable/.test(w))).toBe(true);
    expect(res.rows.some((r) => r.id === 'status:st1')).toBe(true);
  });

  it('central audit failure with includeCentralAudit=true surfaces a warning', async () => {
    state.current = makeSupabase({
      bn_award_status_event: { rows: [] },
      bn_award_rate_history: { rows: [] },
      bn_award_suspension_event: { rows: [] },
      core_audit_log: { error: { message: 'permission denied' } },
    });
    const res = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 }, { includeCentralAudit: true });
    expect(res.warnings.some((w) => /Central audit history unavailable/.test(w))).toBe(true);
    expect(res.sources.find((s) => s.key === 'central')?.error).toContain('permission denied');
  });
});

describe('BN-AWARD360-B4B safety', () => {
  it('performs no inserts, updates, deletes or upserts', async () => {
    const s = makeSupabase({
      bn_award_status_event: { rows: [statusRow] },
      bn_award_rate_history: { rows: [rateRow] },
      bn_award_suspension_event: { rows: [suspRow] },
      core_audit_log: { rows: [centralRow] },
    });
    state.current = s;
    await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 }, { includeCentralAudit: true });
    await listAwardAudit('a1', { includeCentralAudit: true });
    expect(s.forbidden).toEqual([]);
  });

  it('detail formatting: before/after JSON preview is bounded and never exposes raw large payloads', async () => {
    const big = { huge: 'x'.repeat(500) };
    state.current = makeSupabase({
      bn_award_status_event: { rows: [] },
      bn_award_rate_history: { rows: [] },
      bn_award_suspension_event: { rows: [] },
      core_audit_log: { rows: [{ ...centralRow, before_value: big, after_value: big }] },
    });
    const res = await listAwardAuditPaged({ awardId: 'a1', page: 1, pageSize: 50 }, { includeCentralAudit: true });
    const row = res.rows[0];
    expect((row.fromValue ?? '').length).toBeLessThanOrEqual(80);
    expect((row.toValue ?? '').length).toBeLessThanOrEqual(80);
  });
});

// Hook denied-query tests live in auditHookAccess.test.tsx to keep the
// service mock isolated from the loader tests above.

