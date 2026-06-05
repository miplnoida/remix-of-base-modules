import { supabase } from '@/integrations/supabase/client';
import { SKN_BENEFIT_BASELINE } from './skn/sknBenefitCatalogueBaseline';

// ============================================================
// BN Product Test-Case Framework
// ============================================================
// Lightweight runner used by the Configuration Validation Dashboard.
// For each seeded test case we:
//   1. Load the canonical baseline rule set for the benefit_code.
//   2. Evaluate eligibility / calculation / documents / workflow start /
//      claim acceptance against the provided `input_json`.
//   3. Compare the computed actual against the stored `expected_result_json`
//      via compareExpectedActual().
//
// The runner is deterministic and side-effect free — it does NOT call the
// production calculation engine yet. That wiring lands in a later phase;
// keeping this isolated lets us seed and run the full positive / negative /
// boundary suite today.
// ============================================================

export type ScenarioType = 'POSITIVE' | 'NEGATIVE' | 'BOUNDARY' | 'LEGACY_COMPARISON';

export interface BnProductTestCase {
  id: string;
  product_id: string | null;
  product_version_id: string | null;
  test_case_code: string;
  test_case_name: string;
  scenario_type: ScenarioType;
  input_json: Record<string, unknown>;
  expected_result_json: Record<string, unknown>;
  is_active: boolean;
}

export interface TestRunResult {
  test_case_id: string;
  test_case_code: string;
  test_case_name: string;
  scenario_type: ScenarioType;
  benefit_code: string | null;
  passed: boolean;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  diffs: string[];
  checks: {
    eligibility: 'PASS' | 'FAIL' | 'N/A';
    calculation: 'PASS' | 'FAIL' | 'N/A';
    documents: 'PASS' | 'FAIL' | 'N/A';
    workflow_start: 'PASS' | 'FAIL' | 'N/A';
    claim_acceptance: 'PASS' | 'FAIL' | 'N/A';
  };
  message: string;
}

// ─── Fetchers ─────────────────────────────────────────────────

export async function fetchProductTestCases(productId: string): Promise<BnProductTestCase[]> {
  const { data, error } = await supabase
    .from('bn_product_test_case')
    .select('*')
    .eq('product_id', productId)
    .order('test_case_code');
  if (error) throw error;
  return (data ?? []) as unknown as BnProductTestCase[];
}

export async function fetchVersionTestCases(productVersionId: string): Promise<BnProductTestCase[]> {
  const { data, error } = await supabase
    .from('bn_product_test_case')
    .select('*')
    .eq('product_version_id', productVersionId)
    .order('test_case_code');
  if (error) throw error;
  return (data ?? []) as unknown as BnProductTestCase[];
}

async function fetchTestCaseById(id: string): Promise<BnProductTestCase | null> {
  const { data, error } = await supabase
    .from('bn_product_test_case')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as BnProductTestCase;
}

async function lookupBenefitCodeForProduct(productId: string | null): Promise<string | null> {
  if (!productId) return null;
  const { data } = await supabase
    .from('bn_product')
    .select('benefit_code')
    .eq('id', productId)
    .maybeSingle();
  return (data as { benefit_code?: string } | null)?.benefit_code ?? null;
}

// ─── Seeding ──────────────────────────────────────────────────

export async function seedBaselineTestCases(actorUserCode?: string | null): Promise<number> {
  let inserted = 0;
  for (const baseline of SKN_BENEFIT_BASELINE) {
    const { data: product } = await supabase
      .from('bn_product')
      .select('id')
      .eq('benefit_code', baseline.benefit_code)
      .maybeSingle();
    if (!product) continue;

    for (const tc of baseline.test_cases) {
      const { data: existing } = await supabase
        .from('bn_product_test_case')
        .select('id')
        .eq('product_id', (product as { id: string }).id)
        .eq('test_case_code', tc.test_case_code)
        .maybeSingle();
      if (existing) continue;
      const { error } = await supabase.from('bn_product_test_case').insert({
        product_id: (product as { id: string }).id,
        test_case_code: tc.test_case_code,
        test_case_name: tc.test_case_name,
        scenario_type: tc.scenario_type,
        input_json: tc.input as never,
        expected_result_json: tc.expected as never,
        is_active: true,
        entered_by: actorUserCode ?? null,
      });
      if (!error) inserted += 1;
    }
  }
  return inserted;
}

// ─── Built-in benefit evaluator ───────────────────────────────
// Mirrors the published SKN catalogue rules for the seeded baseline.
// Returns an "actual" computed result for an input, plus per-stage checks.

interface EvaluatedActual {
  actual: Record<string, unknown>;
  checks: TestRunResult['checks'];
}

function evaluateBenefit(benefitCode: string | null, input: Record<string, unknown>): EvaluatedActual {
  const n = (key: string): number => Number(input[key] ?? 0);
  const b = (key: string, def = true): boolean =>
    input[key] === undefined ? def : Boolean(input[key]);

  const actual: Record<string, unknown> = {};
  const checks: TestRunResult['checks'] = {
    eligibility: 'N/A',
    calculation: 'N/A',
    documents: 'N/A',
    workflow_start: 'N/A',
    claim_acceptance: 'N/A',
  };

  switch (benefitCode) {
    case 'SKN-AGE': {
      const age = n('age'), total = n('total'), paid = n('paid');
      const pensionEligible = age >= 62 && total >= 500 && paid >= 150;
      const grantEligible = age >= 62 && total >= 50 && total < 500;
      actual.eligible = pensionEligible || grantEligible;
      actual.path = pensionEligible ? 'AGE_PENSION' : grantEligible ? 'AGE_GRANT' : 'NONE';
      checks.eligibility = actual.eligible ? 'PASS' : 'FAIL';
      checks.calculation = actual.eligible ? 'PASS' : 'N/A';
      break;
    }
    case 'SKN-SICK': {
      const paid = n('paid'), recent = n('recent');
      const medical = input.medical_cert === undefined ? true : Boolean(input.medical_cert);
      const eligible = paid >= 26 && recent >= 8;
      actual.eligible = eligible && medical;
      actual.blocked = !medical;
      checks.eligibility = eligible ? 'PASS' : 'FAIL';
      checks.documents = medical ? 'PASS' : 'FAIL';
      break;
    }
    case 'SKN-MAT': {
      const weeks = n('weeks'), paidL39 = n('paid_last_39');
      actual.eligible = weeks >= 39 && paidL39 >= 20;
      checks.eligibility = actual.eligible ? 'PASS' : 'FAIL';
      break;
    }
    case 'SKN-FUN': {
      const paid = n('paid');
      const injury = b('injury', false);
      if (paid < 26) {
        actual.eligible = false;
        checks.eligibility = 'FAIL';
      } else {
        actual.eligible = true;
        actual.amount = injury ? 4000 : 2500;
        checks.eligibility = 'PASS';
        checks.calculation = 'PASS';
      }
      break;
    }
    case 'SKN-INV': {
      const paid = n('paid');
      actual.eligible = paid >= 150;
      checks.eligibility = actual.eligible ? 'PASS' : 'FAIL';
      break;
    }
    case 'SKN-SUR': {
      const paid = n('paid');
      const proof = input.proof === undefined ? true : Boolean(input.proof);
      if (!proof) {
        actual.blocked = true;
        checks.documents = 'FAIL';
      } else if (paid >= 150 && input.relation === 'SPOUSE') {
        actual.share = 0.5;
        checks.eligibility = 'PASS';
        checks.calculation = 'PASS';
      }
      break;
    }
    case 'SKN-EI-INJ': {
      const work = b('work', false);
      const report = b('report', true);
      const cert = b('cert', true);
      actual.eligible = work && report && cert;
      checks.eligibility = work ? 'PASS' : 'FAIL';
      checks.documents = report && cert ? 'PASS' : 'FAIL';
      break;
    }
    case 'SKN-EI-DIS': {
      const degree = n('degree');
      actual.eligible = degree > 0;
      checks.eligibility = actual.eligible ? 'PASS' : 'FAIL';
      break;
    }
    case 'SKN-EI-MED': {
      const amount = n('amount');
      actual.reimbursed = Math.min(amount, 100000);
      checks.calculation = 'PASS';
      break;
    }
    case 'SKN-EI-DTH': {
      actual.eligible = b('work', false) && b('cert', true);
      checks.eligibility = actual.eligible ? 'PASS' : 'FAIL';
      break;
    }
    case 'SKN-NCP': {
      const age = n('age');
      const means = b('means', false);
      actual.eligible = age > 62 && means;
      checks.eligibility = actual.eligible ? 'PASS' : 'FAIL';
      break;
    }
    default:
      actual.note = 'No built-in evaluator for this benefit_code';
  }

  // Workflow & claim acceptance defaults
  const blocked = actual.blocked === true;
  const eligibleVal = actual.eligible;
  if (typeof eligibleVal === 'boolean') {
    checks.workflow_start = eligibleVal && !blocked ? 'PASS' : 'FAIL';
    checks.claim_acceptance = blocked ? 'FAIL' : eligibleVal ? 'PASS' : 'FAIL';
  } else if (blocked) {
    checks.workflow_start = 'FAIL';
    checks.claim_acceptance = 'FAIL';
  }

  return { actual, checks };
}

// ─── Compare expected vs actual ───────────────────────────────

export function compareExpectedActual(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): { passed: boolean; diffs: string[] } {
  const diffs: string[] = [];
  for (const key of Object.keys(expected)) {
    const e = expected[key];
    const a = actual[key];
    if (typeof e === 'number' && typeof a === 'number') {
      if (Math.abs(e - a) > 0.001) diffs.push(`${key}: expected ${e}, got ${a}`);
    } else if (JSON.stringify(e) !== JSON.stringify(a)) {
      diffs.push(`${key}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`);
    }
  }
  return { passed: diffs.length === 0, diffs };
}

// ─── Runner ───────────────────────────────────────────────────

export async function runProductTestCase(testCaseId: string): Promise<TestRunResult> {
  const tc = await fetchTestCaseById(testCaseId);
  if (!tc) {
    return {
      test_case_id: testCaseId,
      test_case_code: '?',
      test_case_name: '(not found)',
      scenario_type: 'POSITIVE',
      benefit_code: null,
      passed: false,
      expected: {},
      actual: {},
      diffs: ['Test case not found'],
      checks: {
        eligibility: 'N/A', calculation: 'N/A', documents: 'N/A',
        workflow_start: 'N/A', claim_acceptance: 'N/A',
      },
      message: 'Test case not found',
    };
  }
  const benefitCode = await lookupBenefitCodeForProduct(tc.product_id);
  const { actual, checks } = evaluateBenefit(benefitCode, tc.input_json ?? {});
  const cmp = compareExpectedActual(tc.expected_result_json ?? {}, actual);
  return {
    test_case_id: tc.id,
    test_case_code: tc.test_case_code,
    test_case_name: tc.test_case_name,
    scenario_type: tc.scenario_type,
    benefit_code: benefitCode,
    passed: cmp.passed,
    expected: tc.expected_result_json ?? {},
    actual,
    diffs: cmp.diffs,
    checks,
    message: cmp.passed ? 'PASS' : `FAIL — ${cmp.diffs.length} diff(s)`,
  };
}

/**
 * Run every active test case for a product OR a specific product_version.
 * Pass the product_version_id when validating a draft version in isolation;
 * pass the product_id to cover all versions seeded under that benefit.
 */
export async function runAllProductTests(
  productOrVersionId: string,
  opts: { scope?: 'product' | 'version' } = {},
): Promise<TestRunResult[]> {
  const scope = opts.scope ?? 'product';
  const cases = scope === 'version'
    ? await fetchVersionTestCases(productOrVersionId)
    : await fetchProductTestCases(productOrVersionId);
  const results: TestRunResult[] = [];
  for (const c of cases.filter((c) => c.is_active)) {
    results.push(await runProductTestCase(c.id));
  }
  return results;
}

// ─── Reporting ────────────────────────────────────────────────

export function buildValidationReportCsv(results: TestRunResult[]): string {
  const header = [
    'test_case_code', 'test_case_name', 'benefit_code', 'scenario_type',
    'passed', 'eligibility', 'calculation', 'documents', 'workflow_start',
    'claim_acceptance', 'expected', 'actual', 'diffs',
  ].join(',');
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = results.map((r) =>
    [
      r.test_case_code, r.test_case_name, r.benefit_code ?? '', r.scenario_type,
      r.passed ? 'PASS' : 'FAIL',
      r.checks.eligibility, r.checks.calculation, r.checks.documents,
      r.checks.workflow_start, r.checks.claim_acceptance,
      JSON.stringify(r.expected), JSON.stringify(r.actual), r.diffs.join(' | '),
    ].map(escape).join(','),
  );
  return [header, ...rows].join('\n');
}
