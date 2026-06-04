import { supabase } from '@/integrations/supabase/client';
import { SKN_BENEFIT_BASELINE, type SknBenefitBaseline } from './skn/sknBenefitCatalogueBaseline';

export type ValidationStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';

export interface CheckResult {
  status: ValidationStatus;
  message: string;
  details?: unknown;
}

export interface ProductValidationReport {
  benefit_code: string;
  benefit_name: string;
  product_exists: CheckResult;
  active_version: CheckResult;
  eligibility: CheckResult;
  calculation: CheckResult;
  documents: CheckResult;
  workflow: CheckResult;
  screen_template: CheckResult;
  timeline: CheckResult;
  test_cases: CheckResult;
  overall_status: ValidationStatus;
  issues: string[];
  product_id?: string;
  active_version_id?: string;
}

function worst(...statuses: ValidationStatus[]): ValidationStatus {
  const order: ValidationStatus[] = ['FAIL', 'NEEDS_REVIEW', 'WARNING', 'PASS', 'NOT_APPLICABLE'];
  for (const s of order) if (statuses.includes(s)) return s;
  return 'PASS';
}

async function loadProductByCode(code: string) {
  const { data } = await supabase
    .from('bn_product')
    .select('*')
    .eq('benefit_code', code)
    .maybeSingle();
  return data;
}

async function loadActiveVersion(productId: string) {
  const { data } = await supabase
    .from('bn_product_version')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'ACTIVE')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function validateProduct(baseline: SknBenefitBaseline): Promise<ProductValidationReport> {
  const issues: string[] = [...baseline.warnings];
  const product = await loadProductByCode(baseline.benefit_code);

  if (!product) {
    return {
      benefit_code: baseline.benefit_code,
      benefit_name: baseline.benefit_name,
      product_exists: { status: 'FAIL', message: 'Product not found in bn_product' },
      active_version: { status: 'FAIL', message: 'N/A — product missing' },
      eligibility: { status: 'FAIL', message: 'N/A' },
      calculation: { status: 'FAIL', message: 'N/A' },
      documents: { status: 'FAIL', message: 'N/A' },
      workflow: { status: 'FAIL', message: 'N/A' },
      screen_template: { status: 'FAIL', message: 'N/A' },
      timeline: { status: 'FAIL', message: 'N/A' },
      test_cases: { status: 'FAIL', message: 'N/A' },
      overall_status: 'FAIL',
      issues: [`Product ${baseline.benefit_code} not configured.`, ...issues],
    };
  }

  const productCheck: CheckResult = { status: 'PASS', message: `Product found (${product.status})` };

  const activeVersion = await loadActiveVersion(product.id);
  const activeVersionCheck: CheckResult = activeVersion
    ? { status: 'PASS', message: `v${activeVersion.version_number} active` }
    : { status: 'FAIL', message: 'No ACTIVE version' };

  let eligibilityCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let calculationCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let docsCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let workflowCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let screenCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let timelineCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };

  if (activeVersion) {
    const versionId = activeVersion.id;

    // Eligibility
    const { data: rules = [] } = await supabase
      .from('bn_eligibility_rule')
      .select('id, rule_code, rule_definition, data_source, is_active')
      .eq('product_version_id', versionId);
    const activeRules = (rules ?? []).filter((r) => r.is_active);
    if (activeRules.length === 0) {
      eligibilityCheck = { status: 'FAIL', message: 'No active eligibility rules' };
    } else {
      const freeText = activeRules.filter((r) => {
        const def = (r.rule_definition ?? {}) as Record<string, unknown>;
        const field = def.field_key ?? def.field;
        return !field || field === '';
      });
      if (freeText.length > 0) {
        eligibilityCheck = {
          status: 'NEEDS_REVIEW',
          message: `${freeText.length} rule(s) missing field_key — replace free-text field with registry key`,
          details: freeText.map((r) => r.rule_code),
        };
      } else {
        eligibilityCheck = { status: 'PASS', message: `${activeRules.length} rules` };
      }
    }

    // Calculation
    const { data: calcs = [] } = await supabase
      .from('bn_calculation_rule')
      .select('id, is_active')
      .eq('product_version_id', versionId);
    const activeCalcs = (calcs ?? []).filter((c) => c.is_active);
    if (activeCalcs.length === 0) {
      calculationCheck = { status: 'FAIL', message: 'No active calculation rule' };
    } else {
      calculationCheck = { status: 'PASS', message: `${activeCalcs.length} calc rule(s)` };
    }

    // Documents
    const { data: docs = [] } = await supabase
      .from('bn_doc_requirement')
      .select('id, document_type_code, requirement_level, stage, is_active')
      .or(`product_version_id.eq.${versionId},product_id.eq.${product.id}`);
    const activeDocs = (docs ?? []).filter((d) => d.is_active);
    if (activeDocs.length === 0) {
      docsCheck = { status: 'FAIL', message: 'No document requirements configured' };
    } else {
      const present = new Set(activeDocs.map((d) => d.document_type_code));
      const missing = baseline.expected_documents.filter((d) => !present.has(d));
      if (missing.length > 0) {
        docsCheck = {
          status: 'WARNING',
          message: `Missing expected docs: ${missing.join(', ')}`,
          details: missing,
        };
        issues.push(`Document(s) missing: ${missing.join(', ')}`);
      } else {
        docsCheck = { status: 'PASS', message: `${activeDocs.length} docs configured` };
      }
    }

    // Workflow
    workflowCheck = activeVersion.workflow_template_id
      ? { status: 'PASS', message: 'Workflow template linked' }
      : { status: 'WARNING', message: 'No workflow_template_id — relies on fallback transition matrix' };

    // Screen template
    if (baseline.requires_screen_template) {
      screenCheck = activeVersion.screen_template_id
        ? { status: 'PASS', message: 'Screen template linked' }
        : { status: 'WARNING', message: 'No screen template assigned' };
    } else {
      screenCheck = { status: 'NOT_APPLICABLE', message: 'Not required' };
    }

    // Timeline
    if (baseline.requires_timeline) {
      const { data: timelines = [] } = await supabase
        .from('bn_timeline_rule')
        .select('id')
        .eq('product_version_id', versionId);
      timelineCheck = (timelines ?? []).length > 0
        ? { status: 'PASS', message: `${timelines!.length} timeline rule(s)` }
        : { status: 'WARNING', message: 'No timeline rules' };
    } else {
      timelineCheck = { status: 'NOT_APPLICABLE', message: 'Not required' };
    }
  }

  // Test cases
  const { data: tests = [] } = await supabase
    .from('bn_product_test_case')
    .select('id, is_active')
    .eq('product_id', product.id);
  const activeTests = (tests ?? []).filter((t) => t.is_active);
  const testCasesCheck: CheckResult = activeTests.length === 0
    ? { status: 'WARNING', message: 'No test cases — seed baseline tests' }
    : { status: 'PASS', message: `${activeTests.length} test case(s)` };

  const overall = worst(
    productCheck.status,
    activeVersionCheck.status,
    eligibilityCheck.status,
    calculationCheck.status,
    docsCheck.status,
    workflowCheck.status,
    screenCheck.status,
    timelineCheck.status,
    testCasesCheck.status,
  );

  return {
    benefit_code: baseline.benefit_code,
    benefit_name: baseline.benefit_name,
    product_id: product.id,
    active_version_id: activeVersion?.id,
    product_exists: productCheck,
    active_version: activeVersionCheck,
    eligibility: eligibilityCheck,
    calculation: calculationCheck,
    documents: docsCheck,
    workflow: workflowCheck,
    screen_template: screenCheck,
    timeline: timelineCheck,
    test_cases: testCasesCheck,
    overall_status: overall,
    issues,
  };
}

export async function validateAllProducts(): Promise<ProductValidationReport[]> {
  const results: ProductValidationReport[] = [];
  for (const baseline of SKN_BENEFIT_BASELINE) {
    results.push(await validateProduct(baseline));
  }
  return results;
}
