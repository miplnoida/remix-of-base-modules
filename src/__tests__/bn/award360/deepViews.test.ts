/**
 * BN-AWARD360-B3D — Deep view service tests (Pensioner, Claim, Product).
 *
 * These tests mock supabase and verify:
 *  - canonical mapping (SSN masking, account masking, age, deceased warning)
 *  - correct routes (Person 360, /person/profile/:id, /bn/config/products)
 *  - restricted enrichment skips queries
 *  - partial enrichment failures are captured, not swallowed
 *  - readiness matrix reports states
 *  - source is read-only (no .insert / .update / .delete / .upsert on the mock)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { data: any; error?: any; count?: number };

/** Route calls to arbitrary tables via a table→handler map. */
function makeSupabase(handlers: Record<string, (mode: 'single' | 'list' | 'count') => Row>) {
  const forbidden: string[] = [];
  const from = (table: string) => {
    let head = false;
    const chain: any = {
      __table: table,
      select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
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
        return Promise.resolve(h ? h('single') : { data: null, error: null });
      },
      then: (resolve: any) => {
        const h = handlers[table];
        const r = h ? h(head ? 'count' : 'list') : { data: [], error: null, count: 0 };
        resolve({ data: r.data, error: r.error, count: r.count });
      },
      insert: () => { forbidden.push(`insert:${table}`); return chain; },
      update: () => { forbidden.push(`update:${table}`); return chain; },
      delete: () => { forbidden.push(`delete:${table}`); return chain; },
      upsert: () => { forbidden.push(`upsert:${table}`); return chain; },
    };
    return chain;
  };
  return { from, forbidden };
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

// ── Pensioner ──────────────────────────────────────────────────────────

describe('getAwardPensionerDeep', () => {
  it('masks SSN, computes age, flags deceased on active award, and returns /person/profile route', async () => {
    const dob30 = new Date(Date.now() - 30 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const s = makeSupabase({
      // BN-AWARD360-RUNTIME-C2: canonical ip_master schema. `status='D'` derives deceased.
      bn_award: () => ({ data: { id: 'a1', ssn: '950003', status: 'ACTIVE' } }),
      ip_master: () => ({ data: {
        ssn: '950003', firstname: 'Jane', middle_name: null, surname: 'Doe',
        dob: dob30, sex: 'F', nationality: 'KN', status: 'D',
        place_of_residence: 'KN', phone_mobile: null, phone: null, email_addr: null,
        resident_addr1: '1 Main', mail_addr1: '1 Main',
      } }),
      bn_payment_profile: () => ({ data: null }),
      bn_payment_profile_change_request: () => ({ data: null }),
      bn_claim: () => ({ data: [], count: 0 }),
      ip_depend: () => ({ data: [], count: 0 }),
    });
    supabaseMock.current = s;
    const v = await getAwardPensionerDeep('a1', { canViewPaymentProfile: true, canViewPerson360: true });
    expect(v).not.toBeNull();
    expect(v!.identity.ssnMasked).toMatch(/\*\*\*-\*\*-003$/);
    expect(v!.identity.age).toBeGreaterThanOrEqual(29);
    expect(v!.identity.isDeceased).toBe(true);
    expect(v!.routes.personProfile).toBe('/person/profile/950003');
    expect(v!.routes.person360).toContain('/bn/person-360');
    expect(v!.routes.person360 + (v!.routes.personProfile ?? '')).not.toMatch(/\/insured-persons\//);
    // deceased on ACTIVE award
    expect(v!.warnings.find((w) => w.key === 'DECEASED_ACTIVE_AWARD')).toBeTruthy();
    // no contact
    expect(v!.warnings.find((w) => w.key === 'NO_CONTACT')).toBeTruthy();
    // no writes issued
    expect(s.forbidden).toEqual([]);
  });

  it('skips payment-profile enrichment when access.canViewPaymentProfile=false and marks section restricted', async () => {
    const s = makeSupabase({
      bn_award: (mode) => mode === 'single'
        ? ({ data: { id: 'a1', ssn: '111', status: 'ACTIVE' } })
        : ({ data: [], count: 0 }),
      ip_master: () => ({ data: { ssn: '111', firstname: 'X', surname: 'Y', dob: '1990-01-01', status: 'A', preferred_channel: null, is_deceased: false } }),
      bn_payment_profile: () => ({ data: null, error: new Error('should not be called') }),
      bn_payment_profile_change_request: () => ({ data: null, error: new Error('should not be called') }),
      bn_claim: () => ({ data: [] }),
      ip_depend: () => ({ data: [] }),
    });
    supabaseMock.current = s;
    const v = await getAwardPensionerDeep('a1', { canViewPaymentProfile: false, canViewPerson360: true });
    expect(v!.paymentProfile.restricted).toBe(true);
    expect(v!.partialWarnings).toEqual([]);
  });

  it('captures optional enrichment failure as a partial warning, not a hard error', async () => {
    const s = makeSupabase({
      bn_award: () => ({ data: { id: 'a1', ssn: '222', status: 'ACTIVE' } }),
      ip_master: () => ({ data: { ssn: '222', firstname: 'X', surname: 'Y', dob: '1990-01-01', status: 'A', preferred_channel: null, is_deceased: false, mobile: '555' } }),
      bn_payment_profile: () => ({ data: null, error: new Error('boom') }),
      bn_payment_profile_change_request: () => ({ data: null }),
      bn_claim: () => ({ data: [], count: 0 }),
      ip_depend: () => ({ data: [], count: 0 }),
    });
    supabaseMock.current = s;
    const v = await getAwardPensionerDeep('a1', { canViewPaymentProfile: true, canViewPerson360: true });
    expect(v).not.toBeNull();
    expect(v!.partialWarnings.some((p) => p.includes('Payment profile'))).toBe(true);
  });
});

// ── Claim ──────────────────────────────────────────────────────────────

describe('getAwardClaimDeep', () => {
  it('maps header, counts failed rules, and returns correct workbench routes', async () => {
    const s = makeSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_claim_id: 'c1', base_amount: 100, start_date: '2026-01-01', status: 'ACTIVE' } }),
      bn_claim: () => ({ data: {
        id: 'c1', claim_number: 'CLM-1', status: 'APPROVED', product_version_id: 'pv1',
        submission_date: '2026-01-01', claim_date: '2026-01-01', application_channel: 'STAFF',
        priority: 'NORMAL', assigned_officer: 'Alice', workbasket_id: 'wb', current_workflow_task_id: null,
        sla_due_at: null, sla_breached: false, eligibility_result: 'PASS', calculation_result: 'OK',
        decision_status: 'DECIDED', approval_status: 'APPROVED', award_creation_date: '2026-01-01', benefit_code: 'SB',
      } }),
      bn_product_version: () => ({ data: { version_number: 3, status: 'PUBLISHED' } }),
      bn_claim_eligibility: () => ({ data: {
        id: 'e1', check_date: '2026-01-01', overall_result: false,
        rule_results: [{ passed: false, rule_code: 'R1', rule_name: 'Rule 1', message: 'fail' }, { passed: true, rule_code: 'R2', rule_name: 'Rule 2' }],
        override_id: null,
      } }),
      bn_claim_evidence: () => ({ data: [
        { id: 'ev1', document_name: 'Doc', status: 'REJECTED', rejection_reason: 'bad' },
        { id: 'ev2', document_name: 'Doc2', status: 'VERIFIED' },
      ] }),
      bn_claim_calculation: () => ({ data: {
        id: 'cc1', calc_date: '2026-01-01', weekly_rate: 100, monthly_rate: 400, lump_sum: 0, formula_version: '1.0',
        outputs: { trace: [{ severity: 'INFO' }, { severity: 'ERROR' }] },
      } }),
      bn_claim_decision: () => ({ data: {
        id: 'd1', action_code: 'APPROVE', from_status: 'REVIEW', to_status: 'APPROVED',
        narrative: 'ok', effective_date: '2026-01-01', performed_by: 'Bob', performed_at: '2026-01-01T00:00:00Z',
      } }),
      bn_claim_event: () => ({ data: [
        { id: 'e1', event_type: 'SUBMITTED', from_status: null, to_status: 'INTAKE', performed_by: 'A', performed_at: '2026-01-01T00:00:00Z' },
      ] }),
      bn_claim_note: () => ({ data: [] }),
    });
    supabaseMock.current = s;
    const v = await getAwardClaimDeep('a1', { canViewEvidence: true, canViewWorkflow: true });
    expect(v).not.toBeNull();
    expect(v!.header.claimNumber).toBe('CLM-1');
    expect(v!.eligibility.failedCount).toBe(1);
    expect(v!.eligibility.failedRules[0].code).toBe('R1');
    expect(v!.evidence.blocking.length).toBe(1);
    expect(v!.evidence.verified).toBe(1);
    expect(v!.calculation.weeklyRate).toBe(100);
    expect(v!.decision.decision).toBe('APPROVE');
    expect(v!.routes.workbench).toBe('/bn/claims/c1');
    expect(v!.routes.eligibility).toBe('/bn/claims/c1/eligibility');
    expect(v!.routes.eligibility).not.toContain('?section=');
    expect(s.forbidden).toEqual([]);
  });

  it('skips evidence when access.canViewEvidence=false', async () => {
    const s = makeSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_claim_id: 'c1' } }),
      bn_claim: () => ({ data: { id: 'c1', product_version_id: null, status: 'APPROVED' } }),
      bn_claim_evidence: () => ({ data: null, error: new Error('should not be called') }),
      bn_claim_eligibility: () => ({ data: null }),
      bn_claim_calculation: () => ({ data: null }),
      bn_claim_decision: () => ({ data: null }),
      bn_claim_event: () => ({ data: [] }),
      bn_claim_note: () => ({ data: [] }),
    });
    supabaseMock.current = s;
    const v = await getAwardClaimDeep('a1', { canViewEvidence: false, canViewWorkflow: true });
    expect(v!.evidence.restricted).toBe(true);
    expect(v!.partialWarnings).toEqual([]);
  });
});

// ── Product ─────────────────────────────────────────────────────────────

describe('getAwardProductDeep', () => {
  it('resolves product/version, validates match and effective date, and returns readiness matrix', async () => {
    const s = makeSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_product_id: 'p1', bn_claim_id: 'c1', start_date: '2026-06-01', base_amount: 100 } }),
      bn_product: () => ({ data: { id: 'p1', product_code: 'STB', product_name: 'Short Term', benefit_code: 'STB',
        scheme_id: 'S', branch_id: 'B', category: 'C', payment_type: 'PT', country_code: 'KN', status: 'ACTIVE' } }),
      bn_claim: () => ({ data: { product_version_id: 'pv1' } }),
      bn_product_version: () => ({ data: {
        id: 'pv1', product_id: 'p1', version_number: 2, status: 'PUBLISHED',
        effective_from: '2026-01-01', effective_to: null,
        workflow_template_id: 'wf1', document_profile_id: 'dp1', screen_template_id: 'st1',
        payment_frequency: 'MONTHLY',
        life_certificate_policy: { every: 12 }, medical_review_policy: {},
        survivor_beneficiary_policy: {}, review_policy: {},
        formula_template_id: null,
      } }),
      bn_product_formula_binding: () => ({ data: [], count: 0 }),
      bn_eligibility_rule: () => ({ data: null, count: 5 }),
      bn_approval_policy: () => ({ data: null, count: 1 }),
      bn_comm_mapping: () => ({ data: null, count: 4 }),
    });
    supabaseMock.current = s;
    const v = await getAwardProductDeep('a1', { canViewConfiguration: true });
    expect(v).not.toBeNull();
    expect(v!.identity.productCode).toBe('STB');
    expect(v!.version.productMatchesAward).toBe(true);
    expect(v!.version.awardWithinEffective).toBe(true);
    expect(v!.routes.catalog).toBe('/bn/config/products');
    // no /bn/products anywhere
    const allRoutes = Object.values(v!.routes).join(' ');
    expect(allRoutes).not.toMatch(/^\/bn\/products$/);
    expect(allRoutes).not.toMatch(/[\s]\/bn\/products$/);
    expect(allRoutes.includes('/bn/products?')).toBe(false);
    // readiness states
    const byKey = Object.fromEntries(v!.readiness.map((r) => [r.key, r.state]));
    expect(byKey.FORMULA).toBe('MISSING');
    expect(byKey.ELIG).toBe('READY');
    expect(byKey.WF).toBe('READY');
    expect(byKey.DOC).toBe('READY');
    expect(byKey.PAY).toBe('READY');
    expect(byKey.COMM).toBe('READY');
    expect(s.forbidden).toEqual([]);
  });

  it('marks readiness RESTRICTED when configuration view is denied', async () => {
    const s = makeSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_product_id: 'p1', bn_claim_id: null, start_date: '2026-06-01' } }),
      bn_product: () => ({ data: { id: 'p1', product_code: 'X', product_name: 'X', status: 'ACTIVE' } }),
    });
    supabaseMock.current = s;
    const v = await getAwardProductDeep('a1', { canViewConfiguration: false });
    expect(v!.restrictedConfiguration).toBe(true);
    for (const r of v!.readiness) {
      expect(r.state).toBe('RESTRICTED');
    }
  });

  it('warns on product/version mismatch', async () => {
    const s = makeSupabase({
      bn_award: () => ({ data: { id: 'a1', bn_product_id: 'p1', bn_claim_id: 'c1', start_date: '2026-06-01' } }),
      bn_product: () => ({ data: { id: 'p1', product_code: 'X', product_name: 'X', status: 'ACTIVE' } }),
      bn_claim: () => ({ data: { product_version_id: 'pv1' } }),
      bn_product_version: () => ({ data: {
        id: 'pv1', product_id: 'DIFFERENT', version_number: 1, status: 'PUBLISHED',
        effective_from: '2026-01-01', effective_to: null,
      } }),
      bn_product_formula_binding: () => ({ data: [], count: 0 }),
      bn_eligibility_rule: () => ({ data: null, count: 0 }),
      bn_approval_policy: () => ({ data: null, count: 0 }),
      bn_comm_mapping: () => ({ data: null, count: 0 }),
    });
    supabaseMock.current = s;
    const v = await getAwardProductDeep('a1', { canViewConfiguration: true });
    expect(v!.version.productMatchesAward).toBe(false);
    expect(v!.warnings.find((w) => w.key === 'PRODUCT_VERSION_MISMATCH')).toBeTruthy();
  });
});
