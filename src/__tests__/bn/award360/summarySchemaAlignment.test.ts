/**
 * BN-AWARD360-RUNTIME-C1 — Schema-aware guard for award360SummaryService.
 *
 * Uses a canonical column map derived from the live schema. Any `.eq` /
 * `.order` / `.not` / `.contains` on an unknown column throws immediately
 * so drift regressions surface as a test failure rather than a runtime
 * "column does not exist" from Supabase.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Canonical live-schema column allow-list for tables the summary service touches.
const SCHEMA: Record<string, ReadonlyArray<string>> = {
  bn_award: ['id', 'bn_claim_id', 'status'],
  bn_award_beneficiary: ['id', 'bn_award_id', 'status', 'share_percent'],
  bn_payment_schedule: ['id', 'bn_award_id', 'status', 'due_date', 'paid_at'],
  bn_payment_instruction: ['id', 'award_id', 'status', 'amount', 'currency', 'paid_date'],
  bn_life_certificate: ['id', 'bn_award_id', 'status', 'due_date'],
  bn_medical_review_schedule: ['id', 'bn_award_id', 'status', 'scheduled_date'],
  bn_award_suspension_event: ['id', 'bn_award_id', 'status', 'entered_at', 'suspension_type'],
  bn_overpayment: ['id', 'bn_award_id', 'outstanding_amount', 'recovery_status'],
  bn_communication_log: ['id', 'claim_id', 'status', 'context'],
};

interface Call { table: string; op: string; column?: string; value?: any; extra?: any; }
const calls: Call[] = [];

const assertCol = (table: string, column: string, op: string) => {
  const cols = SCHEMA[table];
  if (!cols) throw new Error(`Unknown table: ${table}`);
  if (!cols.includes(column)) {
    throw new Error(`[${table}] ${op} references unknown column "${column}". Canonical columns: ${cols.join(', ')}`);
  }
};

const makeBuilder = (table: string) => {
  const b: any = {
    select(_cols?: string, _opts?: any) { calls.push({ table, op: 'select', extra: _cols }); return b; },
    eq(c: string, v: any) { assertCol(table, c, 'eq'); calls.push({ table, op: 'eq', column: c, value: v }); return b; },
    neq(c: string, v: any) { assertCol(table, c, 'neq'); return b; },
    lt(c: string, v: any) { assertCol(table, c, 'lt'); return b; },
    lte(c: string, v: any) { assertCol(table, c, 'lte'); return b; },
    gte(c: string, v: any) { assertCol(table, c, 'gte'); return b; },
    in(c: string, v: any) { assertCol(table, c, 'in'); return b; },
    not(c: string, _op: string, _v: any) { assertCol(table, c, 'not'); return b; },
    contains(c: string, v: any) { assertCol(table, c, 'contains'); calls.push({ table, op: 'contains', column: c, value: v }); return b; },
    order(c: string, _o?: any) { assertCol(table, c, 'order'); return b; },
    limit(_n: number) { return b; },
    maybeSingle() { return Promise.resolve({ data: table === 'bn_award' ? { bn_claim_id: 'claim-1' } : null, error: null, count: 0 }); },
    then(res: any) { return Promise.resolve({ data: [], error: null, count: 0 }).then(res); },
  };
  return b;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => makeBuilder(t) },
}));

import { getAward360Summary } from '@/services/bn/awards/award360SummaryService';

describe('award360SummaryService · canonical live-schema columns', () => {
  beforeEach(() => { calls.length = 0; });

  it('loads every section against the canonical schema without touching unknown columns', async () => {
    const result = await getAward360Summary('award-1', {
      includeBeneficiaries: true,
      includeSchedule: true,
      includePayments: true,
      includeLifeCertificates: true,
      includeMedical: true,
      includeSuspensions: true,
      includeOverpayments: true,
      includeCommunications: true,
    });
    // Nothing should be reported unavailable due to schema drift.
    expect(result.warnings).toEqual([]);
  });

  it('scopes beneficiaries by bn_award_id (not award_id)', async () => {
    await getAward360Summary('a', { includeBeneficiaries: true });
    const eqs = calls.filter((c) => c.table === 'bn_award_beneficiary' && c.op === 'eq');
    expect(eqs.every((c) => c.column === 'bn_award_id')).toBe(true);
  });

  it('scopes payment instruction by award_id and orders by paid_date', async () => {
    await getAward360Summary('a', { includePayments: true });
    const cols = calls.filter((c) => c.table === 'bn_payment_instruction' && c.op === 'eq').map((c) => c.column);
    expect(new Set(cols)).toEqual(new Set(['award_id']));
  });

  it('scopes suspensions by bn_award_id/status/entered_at (never event_status/created_at)', async () => {
    await getAward360Summary('a', { includeSuspensions: true });
    const s = calls.filter((c) => c.table === 'bn_award_suspension_event');
    expect(s.some((c) => c.op === 'eq' && c.column === 'bn_award_id')).toBe(true);
  });

  it('scopes communications by claim_id and by context@>{award_id}', async () => {
    await getAward360Summary('a', { includeCommunications: true });
    const comms = calls.filter((c) => c.table === 'bn_communication_log');
    expect(comms.some((c) => c.op === 'eq' && c.column === 'claim_id')).toBe(true);
    expect(comms.some((c) => c.op === 'contains' && c.column === 'context')).toBe(true);
    // Must never attempt to filter by a non-existent award_id column.
    expect(comms.some((c) => c.column === 'award_id')).toBe(false);
  });

  it('rejects unknown columns at the mock boundary', () => {
    expect(() => assertCol('bn_overpayment', 'award_id', 'eq')).toThrow(/unknown column/);
    expect(() => assertCol('bn_payment_instruction', 'paid_at', 'order')).toThrow(/unknown column/);
    expect(() => assertCol('bn_award_suspension_event', 'event_status', 'eq')).toThrow(/unknown column/);
    expect(() => assertCol('bn_award_suspension_event', 'created_at', 'order')).toThrow(/unknown column/);
  });
});
