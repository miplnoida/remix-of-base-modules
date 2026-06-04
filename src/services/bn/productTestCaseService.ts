import { supabase } from '@/integrations/supabase/client';
import { SKN_BENEFIT_BASELINE } from './skn/sknBenefitCatalogueBaseline';

export interface BnProductTestCase {
  id: string;
  product_id: string | null;
  product_version_id: string | null;
  test_case_code: string;
  test_case_name: string;
  scenario_type: 'POSITIVE' | 'NEGATIVE' | 'BOUNDARY' | 'LEGACY_COMPARISON';
  input_json: Record<string, unknown>;
  expected_result_json: Record<string, unknown>;
  is_active: boolean;
}

export interface TestRunResult {
  test_case_id: string;
  test_case_code: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  message: string;
}

export async function fetchProductTestCases(productId: string): Promise<BnProductTestCase[]> {
  const { data, error } = await supabase
    .from('bn_product_test_case')
    .select('*')
    .eq('product_id', productId)
    .order('test_case_code');
  if (error) throw error;
  return (data ?? []) as unknown as BnProductTestCase[];
}

/**
 * Seed baseline SKN test cases into bn_product_test_case (idempotent on code).
 */
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
        .eq('product_id', product.id)
        .eq('test_case_code', tc.test_case_code)
        .maybeSingle();
      if (existing) continue;
      const { error } = await supabase.from('bn_product_test_case').insert({
        product_id: product.id,
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

/**
 * Lightweight runner: today this just echoes expected vs input. The real
 * calculation engine will be wired in a later phase — this runner exists so the
 * dashboard can render Expected vs Actual side-by-side without blocking on
 * the calculation rollout.
 */
export async function runProductTestCase(testCaseId: string): Promise<TestRunResult> {
  const { data, error } = await supabase
    .from('bn_product_test_case')
    .select('*')
    .eq('id', testCaseId)
    .maybeSingle();
  if (error || !data) {
    return {
      test_case_id: testCaseId,
      test_case_code: '?',
      passed: false,
      expected: null,
      actual: null,
      message: 'Test case not found',
    };
  }
  const tc = data as unknown as BnProductTestCase;
  return {
    test_case_id: tc.id,
    test_case_code: tc.test_case_code,
    passed: false,
    expected: tc.expected_result_json,
    actual: { note: 'Calculation engine not yet wired to runner' },
    message: 'Pending engine integration',
  };
}

export async function runAllProductTests(productId: string): Promise<TestRunResult[]> {
  const cases = await fetchProductTestCases(productId);
  const results: TestRunResult[] = [];
  for (const c of cases.filter((c) => c.is_active)) {
    results.push(await runProductTestCase(c.id));
  }
  return results;
}
