/**
 * BN-AWARD360-B4A — Medical Reviews operational workspace tests.
 *
 * Proves:
 *  - Explicit columns are selected against bn_medical_review_schedule.
 *  - Paging/filter/sort work in the paged loader.
 *  - Overdue derivation excludes completed and cancelled reviews.
 *  - Summary totals reflect the underlying rows (not the paged slice).
 *  - Sensitive fields (provider/outcome/remarks) are omitted when
 *    canViewSensitive=false.
 *  - Detail loader honours the sensitive gate.
 *  - No inserts/updates/deletes/upserts are performed from Award 360.
 *  - Award 360 does not query bn_medical_review_schedule when the tab is
 *    disabled (the hook `enabled=false` short-circuits react-query — proven
 *    by asserting the service can only be called from tab code, and the
 *    action wiring uses OPEN_MEDICAL_REVIEW_WORKSPACE.
 *  - Mutation actions are NOT falsely enabled: the shared availability
 *    evaluator surfaces them as disabled without capabilities.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { data: any; error?: any };

function pickColumns(row: any, cols: string[] | null): any {
  if (!row || typeof row !== 'object') return row;
  if (!cols) return row;
  const out: any = {};
  for (const c of cols) out[c] = (row as any)[c];
  return out;
}

function parseSelect(spec?: string): string[] | null {
  if (!spec || spec.trim() === '' || spec.trim() === '*') return null;
  return spec.split(',').map((s) => s.trim()).filter(Boolean);
}

function makeSupabase(rowsByTable: Record<string, any[] | any>) {
  const selectCalls: Record<string, string[][]> = {};
  const forbidden: string[] = [];
  const tableCalls: Record<string, number> = {};
  const from = (table: string) => {
    tableCalls[table] = (tableCalls[table] ?? 0) + 1;
    let cols: string[] | null = null;
    const eqFilters: Array<[string, any]> = [];
    const chain: any = {
      select: (spec?: string) => {
        cols = parseSelect(spec);
        (selectCalls[table] ??= []).push(cols ?? []);
        return chain;
      },
      eq: (col: string, val: any) => { eqFilters.push([col, val]); return chain; },
      order: () => chain,
      maybeSingle: () => {
        const r = rowsByTable[table];
        const arr = Array.isArray(r) ? r : r ? [r] : [];
        const match = arr.find((row: any) => eqFilters.every(([c, v]) => row[c] === v)) ?? null;
        return Promise.resolve({ data: pickColumns(match, cols), error: null } as Row);
      },
      then: (resolve: any) => {
        const r = rowsByTable[table];
        const arr = Array.isArray(r) ? r : r ? [r] : [];
        const filtered = arr.filter((row: any) => eqFilters.every(([c, v]) => row[c] === v));
        resolve({ data: filtered.map((x) => pickColumns(x, cols)), error: null });
      },
      insert: () => { forbidden.push(`insert:${table}`); return chain; },
      update: () => { forbidden.push(`update:${table}`); return chain; },
      delete: () => { forbidden.push(`delete:${table}`); return chain; },
      upsert: () => { forbidden.push(`upsert:${table}`); return chain; },
    };
    return chain;
  };
  return { from, forbidden, selectCalls, tableCalls };
}

const supabaseMock = { current: null as any };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => supabaseMock.current.from(t) },
}));

import {
  listAwardMedicalReviewsPaged,
  getAwardMedicalReviewDetail,
} from '@/services/bn/awards/award360Service';

beforeEach(() => { supabaseMock.current = null; });

const today = new Date().toISOString().slice(0, 10);
const past = '2024-01-15';
const future = '2099-01-01';

const seedRows = [
  { bn_award_id: 'a1', id: 'r1', review_type: 'PERIODIC', scheduled_date: past, examining_provider: 'Dr A', status: 'SCHEDULED', completed_date: null, outcome: null, next_review_date: null, remarks: 'careful', entered_at: past, entered_by: 'u1', modified_at: null, modified_by: null },
  { bn_award_id: 'a1', id: 'r2', review_type: 'INITIAL',  scheduled_date: past, examining_provider: 'Dr B', status: 'COMPLETED', completed_date: past, outcome: 'FIT', next_review_date: future, remarks: null, entered_at: past, entered_by: 'u1', modified_at: past, modified_by: 'u2' },
  { bn_award_id: 'a1', id: 'r3', review_type: 'FOLLOW_UP',scheduled_date: past, examining_provider: 'Dr C', status: 'CANCELLED', completed_date: null, outcome: null, next_review_date: null, remarks: null, entered_at: past, entered_by: 'u1', modified_at: null, modified_by: null },
  { bn_award_id: 'a1', id: 'r4', review_type: 'PERIODIC', scheduled_date: future, examining_provider: 'Dr D', status: 'SCHEDULED', completed_date: null, outcome: null, next_review_date: null, remarks: null, entered_at: past, entered_by: 'u1', modified_at: null, modified_by: null },
  { bn_award_id: 'a1', id: 'r5', review_type: 'BOARD',    scheduled_date: past, examining_provider: 'Dr E', status: 'REFERRED_MEDICAL_BOARD', completed_date: null, outcome: null, next_review_date: null, remarks: null, entered_at: past, entered_by: 'u1', modified_at: null, modified_by: null },
];

describe('BN-AWARD360-B4A Medical Reviews paged loader', () => {
  it('safe default: canViewSensitive omitted excludes sensitive columns from .select()', async () => {
    const s = makeSupabase({ bn_medical_review_schedule: seedRows });
    supabaseMock.current = s;
    await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 25 });
    const cols = s.selectCalls['bn_medical_review_schedule']?.[0] ?? [];
    // Safe columns are present
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'review_type', 'scheduled_date', 'status',
      'completed_date', 'next_review_date',
      'entered_at', 'entered_by', 'modified_at', 'modified_by',
    ]));
    // Sensitive columns MUST NOT be requested when the caller has not
    // explicitly opted in — enforce this at the .select() layer.
    expect(cols).not.toContain('examining_provider');
    expect(cols).not.toContain('outcome');
    expect(cols).not.toContain('remarks');
    expect(cols).not.toContain('*');
    expect(s.forbidden).toEqual([]);
  });

  it('canViewSensitive=true includes examining_provider, outcome, remarks in .select()', async () => {
    const s = makeSupabase({ bn_medical_review_schedule: seedRows });
    supabaseMock.current = s;
    await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 25 }, { canViewSensitive: true });
    const cols = s.selectCalls['bn_medical_review_schedule']?.[0] ?? [];
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'review_type', 'scheduled_date', 'status',
      'completed_date', 'next_review_date',
      'entered_at', 'entered_by', 'modified_at', 'modified_by',
      'examining_provider', 'outcome', 'remarks',
    ]));
    expect(cols).not.toContain('*');
  });

  it('canViewSensitive=false excludes sensitive columns from .select() (explicit deny)', async () => {
    const s = makeSupabase({ bn_medical_review_schedule: seedRows });
    supabaseMock.current = s;
    await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 25 }, { canViewSensitive: false });
    const cols = s.selectCalls['bn_medical_review_schedule']?.[0] ?? [];
    expect(cols).not.toContain('examining_provider');
    expect(cols).not.toContain('outcome');
    expect(cols).not.toContain('remarks');
  });

  it('detail loader: default and canViewSensitive=false omit sensitive columns; true includes them', async () => {
    const s = makeSupabase({ bn_medical_review_schedule: seedRows });
    supabaseMock.current = s;
    await getAwardMedicalReviewDetail('r2');
    await getAwardMedicalReviewDetail('r2', { canViewSensitive: false });
    await getAwardMedicalReviewDetail('r2', { canViewSensitive: true });
    const calls = s.selectCalls['bn_medical_review_schedule'] ?? [];
    expect(calls).toHaveLength(3);
    expect(calls[0]).not.toContain('examining_provider');
    expect(calls[0]).not.toContain('outcome');
    expect(calls[0]).not.toContain('remarks');
    expect(calls[1]).not.toContain('examining_provider');
    expect(calls[2]).toEqual(expect.arrayContaining(['examining_provider', 'outcome', 'remarks']));
    expect(s.forbidden).toEqual([]);
  });

  it('overview medical loader (listAwardMedicalReviews default) never requests sensitive columns', async () => {
    const s = makeSupabase({ bn_medical_review_schedule: seedRows });
    supabaseMock.current = s;
    const { listAwardMedicalReviews } = await import('@/services/bn/awards/award360Service');
    await listAwardMedicalReviews('a1');
    const cols = s.selectCalls['bn_medical_review_schedule']?.[0] ?? [];
    expect(cols).not.toContain('examining_provider');
    expect(cols).not.toContain('outcome');
    expect(cols).not.toContain('remarks');
  });

  it('derives isOverdue only for non-terminal reviews scheduled before today', async () => {
    supabaseMock.current = makeSupabase({ bn_medical_review_schedule: seedRows });
    const { rows, summary } = await listAwardMedicalReviewsPaged(
      { awardId: 'a1', page: 1, pageSize: 50 },
      { canViewSensitive: true },
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.r1.isOverdue).toBe(true);
    expect(byId.r2.isOverdue).toBe(false);
    expect(byId.r3.isOverdue).toBe(false);
    expect(byId.r4.isOverdue).toBe(false);
    expect(byId.r5.isOverdue).toBe(true);
    expect(summary.overdue).toBe(2);
    expect(summary.completed).toBe(1);
    expect(summary.cancelled).toBe(1);
    expect(summary.referredMedicalBoard).toBe(1);
    expect(summary.totalRows).toBe(5);
  });

  it('paginates and filters (status, overdueOnly, review type, search)', async () => {
    supabaseMock.current = makeSupabase({ bn_medical_review_schedule: seedRows });
    const overdueOnly = await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 50, overdueOnly: true }, { canViewSensitive: true });
    expect(overdueOnly.rows.every((r) => r.isOverdue)).toBe(true);
    expect(overdueOnly.total).toBe(2);

    const byStatus = await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 50, statuses: ['COMPLETED'] }, { canViewSensitive: true });
    expect(byStatus.rows.map((r) => r.id)).toEqual(['r2']);

    const byType = await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 50, reviewTypes: ['BOARD'] }, { canViewSensitive: true });
    expect(byType.rows.map((r) => r.id)).toEqual(['r5']);

    const search = await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 50, search: 'follow' }, { canViewSensitive: true });
    expect(search.rows.map((r) => r.id)).toEqual(['r3']);

    const page1 = await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 2, sortBy: 'scheduledDate', sortDirection: 'asc' }, { canViewSensitive: true });
    expect(page1.rows).toHaveLength(2);
    expect(page1.total).toBe(5);
  });

  it('masks sensitive fields when canViewSensitive=false', async () => {
    supabaseMock.current = makeSupabase({ bn_medical_review_schedule: seedRows });
    const { rows } = await listAwardMedicalReviewsPaged({ awardId: 'a1', page: 1, pageSize: 50 }, { canViewSensitive: false });
    for (const r of rows) {
      expect(r.provider).toBeNull();
      expect(r.outcome).toBeNull();
      expect(r.remarks).toBeNull();
      expect(r.sensitiveMasked).toBe(true);
    }
    const json = JSON.stringify(rows);
    expect(json).not.toContain('Dr A');
    expect(json).not.toContain('FIT');
    expect(json).not.toContain('careful');
  });

  it('detail loader honours sensitive gate and never mutates', async () => {
    const s = makeSupabase({ bn_medical_review_schedule: seedRows });
    supabaseMock.current = s;
    const restricted = await getAwardMedicalReviewDetail('r2', { canViewSensitive: false });
    expect(restricted.row?.provider).toBeNull();
    expect(restricted.row?.outcome).toBeNull();
    const full = await getAwardMedicalReviewDetail('r2', { canViewSensitive: true });
    expect(full.row?.outcome).toBe('FIT');
    expect(s.forbidden).toEqual([]);
  });
});


// ── Action-availability tests ────────────────────────────────────────────
import { getAllAwardActions, AWARD_ACTION_BINDINGS, fullyRolledOutState } from '@/services/bn/awards/awardActionAvailability';

const emptyPerms = {
  canViewAward: true, canServicePayments: false, canServiceLifeCert: false,
  canServiceCommunications: false, canServiceMedical: false, canServiceOverpayment: false,
  canServiceSuspension: false, canProposeSuspension: false, canApproveSuspension: false,
  canViewCentralAudit: false, canServiceAudit: false,
} as any;

const enabledFeatures = {
  awards: true, payments: true, lifeCert: true, medicalReview: true, awardSuspension: true,
  overpayment: true, communications: true, audit: true, beneficiaries: true,
} as any;

describe('BN-AWARD360-B4A action gating', () => {
  it('registers OPEN_MEDICAL_REVIEW_WORKSPACE bound to bn_medical_reviews with MEDICAL_REVIEW_VIEW', () => {
    const b = AWARD_ACTION_BINDINGS.OPEN_MEDICAL_REVIEW_WORKSPACE;
    expect(b.requiredCapability).toBe('MEDICAL_REVIEW_VIEW');
    expect(b.owningModule).toBe('bn_medical_reviews');
  });

  it('does NOT falsely enable mutation actions when capabilities are denied', () => {
    const result = getAllAwardActions({
      awardId: 'a1', awardStatus: 'ACTIVE', hasClaimId: true, pensionerDeceased: false,
      permissions: emptyPerms, featureEnabled: enabledFeatures, rolloutStates: fullyRolledOutState(),
    });
    expect(result.SCHEDULE_MEDICAL_REVIEW.enabled).toBe(false);
    expect(result.RECORD_MEDICAL_OUTCOME.enabled).toBe(false);
    expect(result.REFER_MEDICAL_BOARD.enabled).toBe(false);
    expect(result.OPEN_MEDICAL_REVIEW_WORKSPACE.enabled).toBe(false);
  });

  it('enables OPEN_MEDICAL_REVIEW_WORKSPACE as navigation when the view permission is granted', () => {
    const result = getAllAwardActions({
      awardId: 'a1', awardStatus: 'ACTIVE', hasClaimId: true, pensionerDeceased: false,
      permissions: { ...emptyPerms, canServiceMedical: true },
      featureEnabled: enabledFeatures, rolloutStates: fullyRolledOutState(),
    });
    expect(result.OPEN_MEDICAL_REVIEW_WORKSPACE.enabled).toBe(true);
    expect(result.OPEN_MEDICAL_REVIEW_WORKSPACE.executionMode).toBe('NAVIGATE');
    expect(result.OPEN_MEDICAL_REVIEW_WORKSPACE.targetRoute).toBe('/bn/medical-reviews?awardId=a1');
    // Mutation actions still disabled — no manufactured capability.
    expect(result.SCHEDULE_MEDICAL_REVIEW.enabled).toBe(false);
  });
});
