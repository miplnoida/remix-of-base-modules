/**
 * AW360-WAVE-1-C1A.1 — Pensioner alert edge-case closure.
 *
 * These tests execute `getAward360Summary` against a configurable in-memory
 * Supabase mock and prove that:
 *   • Missing SSN never confirms a missing verified payment profile.
 *   • Only `verification_status = 'VERIFIED'` counts (no `CONFIRMED`).
 *   • Zero active VERIFIED profiles yields `false`.
 *   • One active VERIFIED profile yields `true`.
 *   • `UNVERIFIED` / `PENDING` profiles never count.
 *   • Missing PAYMENT_PROFILE_VIEW leaves the field `null`.
 *   • A payment-profile query error yields a tri-state `unavailable`.
 *   • The query never uses `CONFIRMED`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FilterCall { column: string; op: string; value: any }
interface QueryLog {
  table: string;
  select?: string;
  filters: FilterCall[];
}

interface MockConfig {
  awardSsn?: string | null;
  paymentProfileRows?: Array<{ verification_status: string; active: boolean }>;
  paymentProfileError?: string;
}

let cfg: MockConfig = {};
const queryLog: QueryLog[] = [];

const makeBuilder = (table: string): any => {
  const q: QueryLog = { table, filters: [] };
  queryLog.push(q);
  const filters = q.filters;

  const applyPaymentProfileCount = () => {
    if (cfg.paymentProfileError) {
      return { data: null, error: { message: cfg.paymentProfileError }, count: null };
    }
    let rows = cfg.paymentProfileRows ?? [];
    for (const f of filters) {
      if (f.column === 'active' && f.op === 'eq') {
        rows = rows.filter((r) => r.active === f.value);
      } else if (f.column === 'verification_status' && f.op === 'eq') {
        rows = rows.filter((r) => r.verification_status === f.value);
      } else if (f.column === 'verification_status' && f.op === 'in') {
        rows = rows.filter((r) => (f.value as string[]).includes(r.verification_status));
      }
    }
    return { data: null, error: null, count: rows.length };
  };

  const b: any = {
    select(cols?: string, _opts?: any) { q.select = cols; return b; },
    eq(c: string, v: any) { filters.push({ column: c, op: 'eq', value: v }); return b; },
    neq() { return b; },
    lt() { return b; },
    lte() { return b; },
    gte() { return b; },
    in(c: string, v: any) { filters.push({ column: c, op: 'in', value: v }); return b; },
    not() { return b; },
    contains() { return b; },
    order() { return b; },
    limit() { return b; },
    maybeSingle() {
      if (table === 'bn_award') {
        return Promise.resolve({ data: { ssn: cfg.awardSsn ?? null, bn_claim_id: null }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    then(res: any) {
      if (table === 'bn_payment_profile') {
        return Promise.resolve(applyPaymentProfileCount()).then(res);
      }
      return Promise.resolve({ data: [], error: null, count: 0 }).then(res);
    },
  };
  return b;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => makeBuilder(t) },
}));

import { getAward360Summary } from '@/services/bn/awards/award360SummaryService';

const runAlert = (over: Partial<Parameters<typeof getAward360Summary>[1]> = {}) =>
  getAward360Summary('award-1', {
    includePensionerAlert: true,
    canViewPerson360: true,
    canViewPaymentProfile: true,
    ...over,
  });

describe('AW360-WAVE-1-C1A.1 · pensioner alert edge cases', () => {
  beforeEach(() => {
    cfg = {};
    queryLog.length = 0;
  });

  it('missing SSN → hasVerifiedPaymentProfile is null (no false alert)', async () => {
    cfg.awardSsn = null;
    const r = await runAlert();
    expect(r.pensionerAlert.status).toBe('ok');
    if (r.pensionerAlert.status !== 'ok') return;
    expect(r.pensionerAlert.value.hasVerifiedPaymentProfile).toBeNull();
    // No payment-profile query should have been fired when SSN is missing.
    expect(queryLog.some((q) => q.table === 'bn_payment_profile')).toBe(false);
  });

  it('zero active VERIFIED profiles → false', async () => {
    cfg.awardSsn = 'SSN-1';
    cfg.paymentProfileRows = [];
    const r = await runAlert();
    expect(r.pensionerAlert.status).toBe('ok');
    if (r.pensionerAlert.status !== 'ok') return;
    expect(r.pensionerAlert.value.hasVerifiedPaymentProfile).toBe(false);
  });

  it('one active VERIFIED profile → true', async () => {
    cfg.awardSsn = 'SSN-1';
    cfg.paymentProfileRows = [{ verification_status: 'VERIFIED', active: true }];
    const r = await runAlert();
    if (r.pensionerAlert.status !== 'ok') throw new Error('expected ok');
    expect(r.pensionerAlert.value.hasVerifiedPaymentProfile).toBe(true);
  });

  it('UNVERIFIED / PENDING profiles do not count', async () => {
    cfg.awardSsn = 'SSN-1';
    cfg.paymentProfileRows = [
      { verification_status: 'UNVERIFIED', active: true },
      { verification_status: 'PENDING', active: true },
    ];
    const r = await runAlert();
    if (r.pensionerAlert.status !== 'ok') throw new Error('expected ok');
    expect(r.pensionerAlert.value.hasVerifiedPaymentProfile).toBe(false);
  });

  it('missing PAYMENT_PROFILE_VIEW → field is null (no query)', async () => {
    cfg.awardSsn = 'SSN-1';
    cfg.paymentProfileRows = [{ verification_status: 'VERIFIED', active: true }];
    const r = await runAlert({ canViewPaymentProfile: false });
    if (r.pensionerAlert.status !== 'ok') throw new Error('expected ok');
    expect(r.pensionerAlert.value.hasVerifiedPaymentProfile).toBeNull();
    expect(queryLog.some((q) => q.table === 'bn_payment_profile')).toBe(false);
  });

  it('payment-profile query error → pensionerAlert unavailable', async () => {
    cfg.awardSsn = 'SSN-1';
    cfg.paymentProfileError = 'boom';
    const r = await runAlert();
    expect(r.pensionerAlert.status).toBe('unavailable');
  });

  it('never uses CONFIRMED — only VERIFIED', async () => {
    cfg.awardSsn = 'SSN-1';
    cfg.paymentProfileRows = [];
    await runAlert();
    const ppQuery = queryLog.find((q) => q.table === 'bn_payment_profile');
    expect(ppQuery).toBeDefined();
    const vsFilters = ppQuery!.filters.filter((f) => f.column === 'verification_status');
    expect(vsFilters.length).toBeGreaterThan(0);
    for (const f of vsFilters) {
      expect(f.op).toBe('eq');
      expect(f.value).toBe('VERIFIED');
    }
    // No `.in([...])` and no 'CONFIRMED' anywhere.
    const serialized = JSON.stringify(ppQuery!.filters);
    expect(serialized).not.toContain('CONFIRMED');
    expect(vsFilters.some((f) => f.op === 'in')).toBe(false);
  });
});
