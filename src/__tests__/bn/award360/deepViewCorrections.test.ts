/**
 * BN-AWARD360-B3D-C1 — Deep-view correction tests.
 *
 * Proves:
 *  1. Product-version .select() actually requests every column the readiness
 *     resolver reads. A select-aware mock returns ONLY requested columns; if
 *     the service forgets a column, readiness collapses to MISSING and this
 *     test fails.
 *  2. Claim evidence honours the canonical bn_doc_requirement baseline and
 *     bn_claim_evidence status/waiver semantics — including the
 *     baselineUnknown case when no baseline is resolvable.
 *  3. When canViewWorkflow=false the service NEVER queries bn_claim_event or
 *     bn_claim_note, workbasket/currentTask are masked, and workflowRestricted
 *     is true.
 *  4. When canViewPerson360=false the pensioner routes.person360 and
 *     routes.personProfile are null so SSN is not exposed via URL.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Select-aware Supabase harness ──────────────────────────────────────
// Records requested column lists, returns ONLY those columns from the
// registered row. This surfaces missing-column defects instead of hiding them.

type Row = { data: any; error?: any; count?: number };
type HandlerMode = 'single' | 'list' | 'count';

function pickColumns(row: any, cols: string[] | null): any {
  if (!row || typeof row !== 'object') return row;
  if (!cols || cols.length === 0) return row;
  const out: any = {};
  for (const c of cols) out[c] = (row as any)[c];
  return out;
}

function parseSelect(spec: string | undefined): string[] | null {
  if (!spec || spec.trim() === '' || spec.trim() === '*') return null;
  return spec.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
}

function makeSelectAwareSupabase(
  handlers: Record<string, (mode: HandlerMode) => Row>,
) {
  const selectCalls: Record<string, string[][]> = {};
  const tableCalls: Record<string, number> = {};
  const forbidden: string[] = [];

  const from = (table: string) => {
    tableCalls[table] = (tableCalls[table] ?? 0) + 1;
    let cols: string[] | null = null;
    let head = false;
    const chain: any = {
      __table: table,
      select: (spec?: string, opts?: { count?: string; head?: boolean }) => {
        cols = parseSelect(spec);
        (selectCalls[table] ??= []).push(cols ?? []);
        head = !!opts?.head;
        return chain;
      },
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => {
        const h = handlers[table];
        const r = h ? h('single') : { data: null, error: null };
        return Promise.resolve({ ...r, data: pickColumns(r.data, cols) });
      },
      then: (resolve: any) => {
        const h = handlers[table];
        const r = h ? h(head ? 'count' : 'list') : { data: [], error: null, count: 0 };
        const data = Array.isArray(r.data) ? r.data.map((row: any) => pickColumns(row, cols)) : r.data;
        resolve({ data, error: r.error, count: r.count });
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
  getAwardPensionerDeep,
  getAwardClaimDeep,
  getAwardProductDeep,
} from '@/services/bn/awards/award360DeepService';

beforeEach(() => { supabaseMock.current = null; });

// ── 1. Product readiness — select-aware ────────────────────────────────

describe('Product readiness (select-aware)', () => {
  it('reports READY for every configured area — proves the service selects the columns it later reads', async () => {
    const fullyConfiguredVersion = {
      id: 'pv1', product_id: 'p1', version_number: 2, status: 'PUBLISHED',
      effective_from: '2026-01-01', effective_to: null,
      entered_by: 'x', entered_at: null, modified_by: null, modified_at: null,
      formula_template_id: 'ft1',
      workflow_template_id: 'wf1',
      document_profile_id: 'dp1',
      screen_template_id: 'st1',
      payment_frequency: 'MONTHLY',
      life_certificate_policy: { every: 12 },
      medical_review_policy: { annual: true },
      review_policy: { on_change: true },
      survivor_beneficiary_policy: { split: 'equal' },
    };
    const s = makeSelectAwareSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_product_id: 'p1', bn_claim_id: 'c1', start_date: '2026-06-01', base_amount: 100 } }),
      bn_product: () => ({ data: { id: 'p1', benefit_code: 'STB', benefit_name: 'Short Term',
        scheme_id: 'S', branch_id: 'B', category: 'C', branch: 'B', payment_type: 'PT',
        country_code: 'KN', status: 'ACTIVE' } }),
      bn_claim: () => ({ data: { product_version_id: 'pv1' } }),
      bn_product_version: () => ({ data: fullyConfiguredVersion }),
      bn_product_formula_binding: () => ({ data: [{ id: 'fb1' }], count: 1 }),
      bn_eligibility_rule: () => ({ data: null, count: 5 }),
      bn_approval_policy: () => ({ data: null, count: 1 }),
      bn_comm_mapping: () => ({ data: null, count: 5 }),
    });
    supabaseMock.current = s;

    const v = await getAwardProductDeep('a1', { canViewConfiguration: true });
    expect(v).not.toBeNull();
    const byKey = Object.fromEntries(v!.readiness.map((r) => [r.key, r.state]));

    // These would collapse to MISSING if the service failed to .select() the
    // corresponding bn_product_version column — the mock returns only the
    // columns the service asks for.
    expect(byKey.FORMULA).toBe('READY');
    expect(byKey.WF).toBe('READY');
    expect(byKey.DOC).toBe('READY');
    expect(byKey.SCREEN).toBe('READY');
    expect(byKey.PAY).toBe('READY');
    expect(byKey.LC).toBe('READY');
    expect(byKey.MR).toBe('READY');
    expect(byKey.SUSP).toBe('READY');
    expect(byKey.BEN).toBe('READY');

    // Prove the .select() actually included the readiness columns.
    const pvSelects = s.selectCalls['bn_product_version'] ?? [];
    const anyReadinessSelect = pvSelects.find((cs) => cs.includes('workflow_template_id'));
    expect(anyReadinessSelect, 'expected bn_product_version select to include readiness columns').toBeTruthy();
    for (const col of [
      'formula_template_id', 'workflow_template_id', 'document_profile_id',
      'screen_template_id', 'payment_frequency', 'life_certificate_policy',
      'medical_review_policy', 'review_policy', 'survivor_beneficiary_policy',
    ]) {
      expect(anyReadinessSelect).toContain(col);
    }
  });

  it('reports MISSING for policy fields left null on the version row', async () => {
    const partiallyConfigured = {
      id: 'pv1', product_id: 'p1', version_number: 2, status: 'PUBLISHED',
      effective_from: '2026-01-01', effective_to: null,
      entered_by: null, entered_at: null, modified_by: null, modified_at: null,
      formula_template_id: null,
      workflow_template_id: null,
      document_profile_id: null,
      screen_template_id: null,
      payment_frequency: null,
      life_certificate_policy: null,
      medical_review_policy: null,
      review_policy: null,
      survivor_beneficiary_policy: null,
    };
    const s = makeSelectAwareSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_product_id: 'p1', bn_claim_id: 'c1', start_date: '2026-06-01' } }),
      bn_product: () => ({ data: { id: 'p1', benefit_code: 'X', benefit_name: 'X', status: 'ACTIVE' } }),
      bn_claim: () => ({ data: { product_version_id: 'pv1' } }),
      bn_product_version: () => ({ data: partiallyConfigured }),
      bn_product_formula_binding: () => ({ data: [], count: 0 }),
      bn_eligibility_rule: () => ({ data: null, count: 0 }),
      bn_approval_policy: () => ({ data: null, count: 0 }),
      bn_comm_mapping: () => ({ data: null, count: 0 }),
    });
    supabaseMock.current = s;
    const v = await getAwardProductDeep('a1', { canViewConfiguration: true });
    const byKey = Object.fromEntries(v!.readiness.map((r) => [r.key, r.state]));
    expect(byKey.WF).toBe('MISSING');
    expect(byKey.DOC).toBe('MISSING');
    expect(byKey.SCREEN).toBe('MISSING');
    expect(byKey.PAY).toBe('MISSING');
    expect(byKey.FORMULA).toBe('MISSING');
  });
});

// ── 2. Claim evidence — canonical baseline ─────────────────────────────

describe('Claim evidence (canonical baseline)', () => {
  const baseAward = { id: 'a1', bn_claim_id: 'c1', base_amount: 100, start_date: '2026-01-01', status: 'ACTIVE' };
  const baseClaim = {
    id: 'c1', claim_number: 'CLM-1', status: 'APPROVED', product_version_id: 'pv1',
    submission_date: null, claim_date: null, application_channel: null, priority: null,
    assigned_officer: null, workbasket_id: null, current_workflow_task_id: null,
    sla_due_at: null, sla_breached: false, approval_status: null, award_creation_date: null,
    benefit_code: null,
  };

  function buildS(rows: any[], reqs: any[] | null) {
    return makeSelectAwareSupabase({
      bn_award: () => ({ data: baseAward }),
      bn_claim: () => ({ data: baseClaim }),
      bn_product_version: () => ({ data: { version_number: 1, status: 'PUBLISHED' } }),
      bn_claim_eligibility: () => ({ data: null }),
      bn_claim_calculation: () => ({ data: null }),
      bn_claim_decision: () => ({ data: null }),
      bn_claim_evidence: () => ({ data: rows }),
      bn_doc_requirement: () => reqs == null ? ({ data: [] }) : ({ data: reqs }),
      bn_claim_event: () => ({ data: [] }),
      bn_claim_note: () => ({ data: [] }),
    });
  }

  it('required doc with no evidence → 1 missing', async () => {
    supabaseMock.current = buildS([], [
      { id: 'r1', document_type_code: 'ID', blocks_decision: true, is_active: true, requirement_level: 'REQUIRED' },
    ]);
    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: true });
    expect(v!.evidence.required).toBe(1);
    expect(v!.evidence.missing).toBe(1);
    expect(v!.evidence.baselineUnknown).toBe(false);
  });

  it('fulfilled requirement → 0 missing, 1 verified', async () => {
    supabaseMock.current = buildS(
      [{ id: 'e1', document_name: 'Passport', status: 'VERIFIED', requirement_id: 'r1' }],
      [{ id: 'r1', document_type_code: 'ID', is_active: true, requirement_level: 'REQUIRED' }],
    );
    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: true });
    expect(v!.evidence.required).toBe(1);
    expect(v!.evidence.missing).toBe(0);
    expect(v!.evidence.verified).toBe(1);
  });

  it('waived requirement → counted as waived, not missing', async () => {
    supabaseMock.current = buildS(
      [{ id: 'e1', document_name: 'Passport', status: 'PENDING', waived_at: '2026-01-01', requirement_id: 'r1' }],
      [{ id: 'r1', is_active: true, requirement_level: 'REQUIRED' }],
    );
    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: true });
    expect(v!.evidence.waived).toBe(1);
    expect(v!.evidence.missing).toBe(0);
  });

  it('rejected evidence surfaces in blocking list', async () => {
    supabaseMock.current = buildS(
      [{ id: 'e1', document_name: 'BadDoc', status: 'REJECTED', rejection_reason: 'unreadable', requirement_id: 'r1' }],
      [{ id: 'r1', is_active: true, requirement_level: 'REQUIRED' }],
    );
    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: true });
    expect(v!.evidence.blocking.length).toBe(1);
    expect(v!.evidence.blocking[0].name).toBe('BadDoc');
    // Rejected does NOT fulfill the requirement.
    expect(v!.evidence.missing).toBe(1);
  });

  it('no baseline available → baselineUnknown=true and null counts, partial warning emitted', async () => {
    // bn_doc_requirement returns empty AND product_version_id is null on claim
    const s = makeSelectAwareSupabase({
      bn_award: () => ({ data: baseAward }),
      bn_claim: () => ({ data: { ...baseClaim, product_version_id: null } }),
      bn_claim_eligibility: () => ({ data: null }),
      bn_claim_calculation: () => ({ data: null }),
      bn_claim_decision: () => ({ data: null }),
      bn_claim_evidence: () => ({ data: [{ id: 'e1', document_name: 'X', status: 'VERIFIED' }] }),
      bn_claim_event: () => ({ data: [] }),
      bn_claim_note: () => ({ data: [] }),
    });
    supabaseMock.current = s;
    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: true });
    expect(v!.evidence.baselineUnknown).toBe(true);
    expect(v!.evidence.required).toBeNull();
    expect(v!.evidence.missing).toBeNull();
    expect(v!.partialWarnings.some((p) => p.toLowerCase().includes('baseline'))).toBe(true);
    // bn_doc_requirement must NOT have been queried when product_version_id is null.
    expect(s.tableCalls['bn_doc_requirement']).toBeUndefined();
  });
});

// ── 3. Workflow capability gating ──────────────────────────────────────

describe('Claim workflow capability', () => {
  it('when canViewWorkflow=false: bn_claim_event and bn_claim_note are NEVER queried; workbasket/currentTask masked; workflowRestricted true', async () => {
    const s = makeSelectAwareSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_claim_id: 'c1', start_date: '2026-01-01', status: 'ACTIVE' } }),
      bn_claim: () => ({ data: {
        id: 'c1', claim_number: 'CLM-9', status: 'APPROVED', product_version_id: null,
        workbasket_id: 'WB-SECRET', current_workflow_task_id: 'TASK-SECRET',
        sla_due_at: null, sla_breached: false,
      } }),
      bn_claim_eligibility: () => ({ data: null }),
      bn_claim_calculation: () => ({ data: null }),
      bn_claim_decision: () => ({ data: null }),
      bn_claim_evidence: () => ({ data: [] }),
      bn_claim_event: () => ({ data: null, error: new Error('should not be called') }),
      bn_claim_note: () => ({ data: null, error: new Error('should not be called') }),
    });
    supabaseMock.current = s;

    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: false });
    expect(v!.workflowRestricted).toBe(true);
    expect(v!.timeline).toEqual([]);
    expect(v!.header.workbasket).toBeNull();
    expect(v!.header.currentTask).toBeNull();
    // Hard proof: the workflow tables were never touched.
    expect(s.tableCalls['bn_claim_event']).toBeUndefined();
    expect(s.tableCalls['bn_claim_note']).toBeUndefined();
  });
});

// ── 4. Person 360 capability ───────────────────────────────────────────

describe('Pensioner person360 capability', () => {
  it('when canViewPerson360=false: routes and canonicalPersonId are null, full SSN never appears in the returned deep view', async () => {
    const s = makeSelectAwareSupabase({
      bn_award: () => ({ data: { id: 'a1', ssn: '999123456', status: 'ACTIVE' } }),
      ip_master: () => ({ data: {
        ssn: '999123456', firstname: 'A', surname: 'B', dob: '1990-01-01', status: 'A',
        preferred_channel: null, is_deceased: false, mobile: '555',
      } }),
      bn_payment_profile: () => ({ data: null }),
      bn_payment_profile_change_request: () => ({ data: null }),
      bn_claim: () => ({ data: [] }),
      ip_depend: () => ({ data: [] }),
    });
    supabaseMock.current = s;

    const v = await getAwardPensionerDeep('a1', { canViewPaymentProfile: true, canViewPerson360: false });
    expect(v).not.toBeNull();
    expect(v!.routes.person360).toBeNull();
    expect(v!.routes.personProfile).toBeNull();
    // BN-AWARD360-B3D-C2: canonicalPersonId must NOT be the SSN when access is denied.
    expect(v!.identity.canonicalPersonId).toBeNull();
    // Masked SSN is fine and expected.
    expect(v!.identity.ssnMasked).toContain('***');
    // The full SSN must not appear anywhere in the serialized deep view.
    const fullBlob = JSON.stringify(v);
    expect(fullBlob).not.toContain('999123456');
  });

  it('when canViewPerson360=true: canonicalPersonId is exposed and routes are populated', async () => {
    const s = makeSelectAwareSupabase({
      bn_award: () => ({ data: { id: 'a1', ssn: '111222333', status: 'ACTIVE' } }),
      ip_master: () => ({ data: {
        ssn: '111222333', firstname: 'A', surname: 'B', dob: '1990-01-01', status: 'A',
        preferred_channel: null, is_deceased: false, mobile: '555',
      } }),
      bn_payment_profile: () => ({ data: null }),
      bn_payment_profile_change_request: () => ({ data: null }),
      bn_claim: () => ({ data: [] }),
      ip_depend: () => ({ data: [] }),
    });
    supabaseMock.current = s;
    const v = await getAwardPensionerDeep('a1', { canViewPaymentProfile: true, canViewPerson360: true });
    expect(v!.identity.canonicalPersonId).toBe('111222333');
    expect(v!.routes.person360).not.toBeNull();
  });
});

// ── 5. Evidence baseline — empty requirements are Unknown, not zero ────

describe('Claim evidence baseline — empty requirements (C2)', () => {
  const baseAward = { id: 'a1', bn_claim_id: 'c1', base_amount: 100, start_date: '2026-01-01', status: 'ACTIVE' };
  const baseClaim = {
    id: 'c1', claim_number: 'CLM-1', status: 'APPROVED', product_version_id: 'pv1',
    submission_date: null, claim_date: null, application_channel: null, priority: null,
    assigned_officer: null, workbasket_id: null, current_workflow_task_id: null,
    sla_due_at: null, sla_breached: false, approval_status: null, award_creation_date: null,
    benefit_code: null,
  };

  it('product version with zero active doc_requirement rows and no explicit no-document config → Unknown, warning emitted', async () => {
    const s = makeSelectAwareSupabase({
      bn_award: () => ({ data: baseAward }),
      bn_claim: () => ({ data: baseClaim }),
      bn_product_version: () => ({ data: { version_number: 1, status: 'PUBLISHED' } }),
      bn_claim_eligibility: () => ({ data: null }),
      bn_claim_calculation: () => ({ data: null }),
      bn_claim_decision: () => ({ data: null }),
      bn_claim_evidence: () => ({ data: [] }),
      bn_doc_requirement: () => ({ data: [] }),
      bn_claim_event: () => ({ data: [] }),
      bn_claim_note: () => ({ data: [] }),
    });
    supabaseMock.current = s;
    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: true });
    // Was previously required=0/missing=0; C2 requires honest Unknown because
    // no canonical "no documents required" configuration exists on the product.
    expect(v!.evidence.required).toBeNull();
    expect(v!.evidence.missing).toBeNull();
    expect(v!.evidence.baselineUnknown).toBe(true);
    expect(v!.partialWarnings.some((p) =>
      p.toLowerCase().includes('no active document requirements are configured'),
    )).toBe(true);
  });
});

// ── 6. Workflow-sensitive nav gating in AwardClaimTab ──────────────────

describe('AwardClaimTab workflow nav gating (C2)', () => {
  it('hides Recommendation and Determination links when workflowRestricted', async () => {
    // Source-behaviour proof: read the compiled component source and verify the
    // links are rendered inside a !workflowRestricted branch. This avoids
    // pulling the full React/DOM stack into a unit test.
    const fs = await import('fs');
    const src = fs.readFileSync(
      'src/pages/bn/awards/award-360/tabs/AwardClaimTab.tsx',
      'utf8',
    );
    // The Recommendation and Determination buttons must live inside a
    // `!workflowRestricted && (` branch — no unconditional rendering.
    const guardedBlock = src.match(
      /!workflowRestricted\s*&&\s*\([\s\S]*?claim-recommendation-link[\s\S]*?claim-determination-link[\s\S]*?\)/,
    );
    expect(guardedBlock, 'expected Recommendation + Determination links to be gated by !workflowRestricted').toBeTruthy();
    // And they must NOT also appear outside that gated block.
    const outsideGuard = src
      .replace(/!workflowRestricted\s*&&\s*\([\s\S]*?\)\s*\}/, '')
      .match(/claim-(recommendation|determination)-link/);
    expect(outsideGuard).toBeNull();
  });
});

