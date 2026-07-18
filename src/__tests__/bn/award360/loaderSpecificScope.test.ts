/**
 * AW360-WAVE-1-C1 Sub-batch B2-b.1a — focused scope tests.
 *
 * Certifies the loader-specific bn_claim scope precedence and the new
 * explicit order-column allow-lists on the payment-profile tables.
 *
 * Precedence:
 *   1. scopeRuleByLoader[loaderName]  (loader-specific override)
 *   2. scopeRule                      (general table rule)
 *   3. requiredScope.column           (fallback filter)
 */
import { describe, it, expect } from 'vitest';
import { AwardQueryRecorder } from '@/test/mocks/award360QueryRecorder';
import { AWARD360_SCHEMA_CONTRACT } from '@/services/bn/awards/award360SchemaContract';

// ─── §2 · explicit order allow-lists ──────────────────────────────────────
describe('AW360 Sub-batch B2-b.1a · order allow-lists', () => {
  it('bn_payment_profile permits ordering by effective_from (approved)', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_payment_profile: [] } });
    await rec.runAs('getAwardPensionerDeep', 'deep-full-access', async () => {
      await rec.client()
        .from('bn_payment_profile')
        .select('id, person_ssn, effective_from')
        .eq('person_ssn', 'SSN-1')
        .order('effective_from', { ascending: false });
    });
    expect(rec.queries[0].orderColumns).toContain('effective_from');
  });

  it('bn_payment_profile_change_request permits ordering by created_at (approved)', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_payment_profile_change_request: [] } });
    await rec.runAs('getAwardPensionerDeep', 'deep-full-access', async () => {
      await rec.client()
        .from('bn_payment_profile_change_request')
        .select('id, person_ssn, created_at')
        .eq('person_ssn', 'SSN-1')
        .order('created_at', { ascending: false });
    });
    expect(rec.queries[0].orderColumns).toContain('created_at');
  });

  it('bn_payment_profile rejects ordering by an existing but unapproved column (updated_at)', () => {
    const rec = new AwardQueryRecorder();
    // `updated_at` is in allowedColumns but not in allowedOrderColumns.
    expect(AWARD360_SCHEMA_CONTRACT.bn_payment_profile.allowedColumns).toContain('updated_at');
    expect(() =>
      rec.client().from('bn_payment_profile').order('updated_at'),
    ).toThrow(/not an allowed order column/);
  });

  it('bn_payment_profile rejects ordering by an unknown column', () => {
    const rec = new AwardQueryRecorder();
    expect(() =>
      rec.client().from('bn_payment_profile').order('totally_invented'),
    ).toThrow(/unknown column/);
  });
});

// ─── §3 · loader-specific bn_claim scope precedence ────────────────────────
describe('AW360 Sub-batch B2-b.1a · scopeRuleByLoader (bn_claim)', () => {
  it('getAwardPensionerDeep + eq(ssn) passes', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: [] } });
    await rec.runAs('getAwardPensionerDeep', 'deep-full-access', async () => {
      await rec.client()
        .from('bn_claim')
        .select('id, claim_number, status')
        .eq('ssn', 'SSN-1')
        .order('claim_date', { ascending: false });
    });
    expect(rec.queries).toHaveLength(1);
  });

  it('getAwardPensionerDeep + eq(id) only FAILS the loader-specific override', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: [] } });
    await expect(
      rec.runAs('getAwardPensionerDeep', 'deep-related-claims', async () => {
        await rec.client()
          .from('bn_claim')
          .select('id, claim_number, status')
          .eq('id', 'c-1');
      }),
    ).rejects.toThrow(/bn_claim.*required scope.*ssn/);
  });

  it('scope-failure diagnostic identifies loader, scenario, table and actual filters', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: [] } });
    let captured: unknown = null;
    try {
      await rec.runAs('getAwardPensionerDeep', 'diag-scenario', async () => {
        await rec.client().from('bn_claim').select('id').eq('id', 'c-1');
      });
    } catch (e) {
      captured = e;
    }
    const msg = (captured as Error).message;
    expect(msg).toContain('bn_claim');
    expect(msg).toContain('getAwardPensionerDeep');
    expect(msg).toContain('diag-scenario');
    expect(msg).toContain('ssn'); // expected loader-specific scope column
    expect(msg).toContain('eq(id='); // actual filter trace
  });

  it('getAwardClaim + eq(id) passes', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: null } });
    await rec.runAs('getAwardClaim', 'claim-linked', async () => {
      await rec.client()
        .from('bn_claim')
        .select('id, claim_number')
        .eq('id', 'c-1')
        .maybeSingle();
    });
    expect(rec.queries).toHaveLength(1);
  });

  it('getAwardClaim + eq(ssn) only FAILS the loader-specific override', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: null } });
    await expect(
      rec.runAs('getAwardClaim', 'claim-linked', async () => {
        await rec.client()
          .from('bn_claim')
          .select('id, claim_number')
          .eq('ssn', 'SSN-1')
          .maybeSingle();
      }),
    ).rejects.toThrow(/bn_claim.*required scope.*id/);
  });

  it('getAwardProduct + eq(id) passes', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: null } });
    await rec.runAs('getAwardProduct', 'product-with-version', async () => {
      await rec.client()
        .from('bn_claim')
        .select('id, product_version_id')
        .eq('id', 'c-1')
        .maybeSingle();
    });
    expect(rec.queries).toHaveLength(1);
  });

  it('unknown loader falls back to the general table rule (anyOf)', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: [] } });
    // General rule accepts either id or ssn.
    await rec.runAs('unknownAdHocLoader', 'ad-hoc', async () => {
      await rec.client().from('bn_claim').select('id, ssn').eq('id', 'c-1');
    });
    await rec.runAs('unknownAdHocLoader', 'ad-hoc', async () => {
      await rec.client().from('bn_claim').select('id, ssn').eq('ssn', 'SSN-1');
    });
    expect(rec.queries).toHaveLength(2);
  });

  it('null loader identity falls back to the general table rule', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: [] } });
    // No runAs() wrapping — loaderName is null.
    await rec.client().from('bn_claim').select('id, ssn').eq('id', 'c-1');
    await rec.client().from('bn_claim').select('id, ssn').eq('ssn', 'SSN-1');
    expect(rec.queries).toHaveLength(2);
  });

  it('reserved-loader overrides are declared without certifying their loaders', () => {
    const claim = AWARD360_SCHEMA_CONTRACT.bn_claim;
    const overrides = claim.scopeRuleByLoader!;
    // Reserved: pre-declared for future certification (do NOT execute here).
    expect(overrides.getAwardClaimDeep).toEqual({
      kind: 'filter', method: 'eq', column: 'id',
    });
    expect(overrides.getAwardProductDeep).toEqual({
      kind: 'filter', method: 'eq', column: 'id',
    });
  });
});
