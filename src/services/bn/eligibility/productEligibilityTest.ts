/**
 * Product Eligibility Test — runs every active eligibility rule for a
 * product/version against a real claim and returns a trace.
 *
 * Uses the same `resolveFact` runtime as production, so the trace is true.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveFact, type EligibilityContext } from './eligibilityFactResolver';
import { OPERATORS, type EligibilityOperator } from './operators';
import { getFact } from './eligibilityFactRegistry';
import { ensureContributionSnapshot } from './contributionSnapshotService';

const db = supabase as any;

const OPERATOR_ALIASES: Record<string, string> = {
  EQUALS: '=', NOT_EQUALS: '!=', GREATER_THAN: '>', GREATER_OR_EQUAL: '>=',
  LESS_THAN: '<', LESS_OR_EQUAL: '<=', BETWEEN: 'between', IN: 'in', NOT_IN: 'in',
  BOOLEAN: '=', EXISTS: 'exists', CONTAINS: 'in',
};

export interface ProductTestRow {
  rule_code: string;
  rule_name: string;
  fact_key: string | null;
  resolver: string | null;
  source: string | null;
  operator: string;
  expected: unknown;
  actual: unknown;
  result: 'PASS' | 'FAIL' | 'SKIPPED';
  fail_action: string;
  message?: string;
}

export interface ProductTestResult {
  claim_id: string;
  product_code: string | null;
  overall: 'PASS' | 'FAIL' | 'BLOCKED';
  snapshot_refreshed: boolean;
  rows: ProductTestRow[];
}

export async function runProductEligibilityTest(productVersionId: string, claimId: string): Promise<ProductTestResult> {
  // Refresh contribution snapshot before evaluation.
  const snap = await ensureContributionSnapshot(claimId);

  const { data: claim } = await db
    .from('bn_claim')
    .select('id, ssn, claim_date, employer_regno, product:bn_product(code, benefit_code)')
    .eq('id', claimId)
    .maybeSingle();
  const productCode = (claim as any)?.product?.benefit_code ?? (claim as any)?.product?.code ?? null;

  const ctx: EligibilityContext = {
    ssn: (claim as any)?.ssn ?? null,
    claimId,
    claimDate: (claim as any)?.claim_date ?? null,
    productCode,
    employerRegno: (claim as any)?.employer_regno ?? null,
    extras: {},
  };

  // Pull product's active catalogue-linked rules with their catalogue config.
  const { data: prodRules } = await db
    .from('bn_eligibility_rule')
    .select('id, rule_code, catalogue_rule_code, is_active, fact_key')
    .eq('product_version_id', productVersionId)
    .eq('is_active', true);

  const codes = Array.from(new Set(((prodRules as any[]) ?? []).map((r) => r.catalogue_rule_code).filter(Boolean)));
  if (codes.length === 0) {
    return { claim_id: claimId, product_code: productCode, overall: 'PASS', snapshot_refreshed: snap?.refreshed ?? false, rows: [] };
  }

  const { data: catalogue } = await db
    .from('bn_rule_catalogue')
    .select('rule_code, rule_name, fact_key, operator, value_from, value_to, values, default_fail_action, failure_message_text, is_active')
    .in('rule_code', codes);

  const rows: ProductTestRow[] = [];
  let overall: ProductTestResult['overall'] = 'PASS';

  for (const c of (catalogue as any[]) ?? []) {
    if (!c.is_active) continue;
    const factKey: string | null = c.fact_key;
    if (!factKey) {
      rows.push({ rule_code: c.rule_code, rule_name: c.rule_name, fact_key: null, resolver: null, source: null,
        operator: c.operator, expected: null, actual: null, result: 'SKIPPED', fail_action: c.default_fail_action,
        message: 'No fact_key linked' });
      overall = 'BLOCKED'; continue;
    }
    const fact = getFact(factKey);
    if (!fact) {
      rows.push({ rule_code: c.rule_code, rule_name: c.rule_name, fact_key: factKey, resolver: null, source: null,
        operator: c.operator, expected: null, actual: null, result: 'SKIPPED', fail_action: c.default_fail_action,
        message: 'Fact not in registry' });
      overall = 'BLOCKED'; continue;
    }
    let actual: unknown = null;
    let reason: string | undefined;
    try {
      const r = await resolveFact(factKey, ctx);
      actual = r.value; reason = r.reason;
    } catch (e: any) {
      reason = e?.message;
    }
    const opKey = (OPERATOR_ALIASES[c.operator] ?? c.operator) as EligibilityOperator;
    const opDef = OPERATORS[opKey];
    let expected: unknown = c.value_from;
    if (c.operator === 'BETWEEN') expected = [c.value_from, c.value_to];
    if (c.operator === 'IN' || c.operator === 'NOT_IN') expected = c.values;
    const pass = opDef ? opDef.evaluate(actual, expected) : false;
    const result: ProductTestRow['result'] = reason ? 'SKIPPED' : (pass ? 'PASS' : 'FAIL');
    if (result === 'FAIL') overall = 'FAIL';
    if (result === 'SKIPPED' && overall === 'PASS') overall = 'BLOCKED';
    rows.push({
      rule_code: c.rule_code, rule_name: c.rule_name, fact_key: factKey,
      resolver: fact.resolver_function, source: `${fact.source_table}.${fact.source_column}`,
      operator: c.operator, expected, actual, result, fail_action: c.default_fail_action,
      message: reason ?? c.failure_message_text ?? undefined,
    });
  }

  return { claim_id: claimId, product_code: productCode, overall, snapshot_refreshed: snap?.refreshed ?? false, rows };
}
