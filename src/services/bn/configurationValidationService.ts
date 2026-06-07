import { supabase } from '@/integrations/supabase/client';
import { SKN_BENEFIT_BASELINE, type SknBenefitBaseline } from './skn/sknBenefitCatalogueBaseline';
import { checkPublicReadiness, checkStaffReadiness } from './productAcceptanceService';

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
  overlap_versions: CheckResult;
  eligibility: CheckResult;
  calculation: CheckResult;
  formula_resolvable: CheckResult;
  documents: CheckResult;
  documents_library: CheckResult;
  workflow: CheckResult;
  workflow_exists: CheckResult;
  screen_template: CheckResult;
  timeline: CheckResult;
  test_cases: CheckResult;
  offline_channel: CheckResult;
  online_channel: CheckResult;
  version_governance: CheckResult;
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

async function loadValidationVersion(productId: string, productVersionId?: string) {
  if (productVersionId) {
    const { data } = await supabase
      .from('bn_product_version')
      .select('*')
      .eq('id', productVersionId)
      .eq('product_id', productId)
      .maybeSingle();
    return data;
  }

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

export async function validateProduct(
  baseline: SknBenefitBaseline,
  options: { productVersionId?: string } = {},
): Promise<ProductValidationReport> {
  const issues: string[] = [...baseline.warnings];
  const product = await loadProductByCode(baseline.benefit_code);

  if (!product) {
    return {
      benefit_code: baseline.benefit_code,
      benefit_name: baseline.benefit_name,
      product_exists: { status: 'FAIL', message: 'Product not found in bn_product' },
      active_version: { status: 'FAIL', message: 'N/A — product missing' },
      overlap_versions: { status: 'NOT_APPLICABLE', message: 'N/A' },
      eligibility: { status: 'FAIL', message: 'N/A' },
      calculation: { status: 'FAIL', message: 'N/A' },
      formula_resolvable: { status: 'NOT_APPLICABLE', message: 'N/A' },
      documents: { status: 'FAIL', message: 'N/A' },
      documents_library: { status: 'NOT_APPLICABLE', message: 'N/A' },
      workflow: { status: 'FAIL', message: 'N/A' },
      workflow_exists: { status: 'NOT_APPLICABLE', message: 'N/A' },
      screen_template: { status: 'FAIL', message: 'N/A' },
      timeline: { status: 'FAIL', message: 'N/A' },
      test_cases: { status: 'FAIL', message: 'N/A' },
      offline_channel: { status: 'FAIL', message: 'N/A' },
      online_channel: { status: 'FAIL', message: 'N/A' },
      version_governance: { status: 'NOT_APPLICABLE', message: 'N/A' },
      overall_status: 'FAIL',
      issues: [`Product ${baseline.benefit_code} not configured.`, ...issues],
    };
  }

  const productCheck: CheckResult = { status: 'PASS', message: `Product found (${product.status})` };

  const activeVersion = await loadValidationVersion(product.id, options.productVersionId);
  const activeVersionCheck: CheckResult = activeVersion
    ? { status: 'PASS', message: options.productVersionId ? `v${activeVersion.version_number} selected for publish validation` : `v${activeVersion.version_number} active` }
    : { status: 'FAIL', message: options.productVersionId ? 'Selected version not found for this product' : 'No ACTIVE version' };

  let eligibilityCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let calculationCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let formulaResolvableCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let docsCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let docsLibraryCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let workflowCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let workflowExistsCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let screenCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let timelineCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let versionGovernanceCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };

  // ─── Version governance: no overlapping ACTIVE versions, draft editable ───
  const { data: allVersions = [] } = await supabase
    .from('bn_product_version')
    .select('id, version_number, status, effective_from, effective_to')
    .eq('product_id', product.id);
  const activeRows = (allVersions ?? []).filter((v) => v.status === 'ACTIVE');
  const draftRows = (allVersions ?? []).filter((v) => v.status === 'DRAFT');
  let overlapCheck: CheckResult;
  if (activeRows.length <= 1) {
    overlapCheck = { status: 'PASS', message: activeRows.length === 1 ? 'Single active version' : 'No active versions' };
  } else {
    const overlaps: string[] = [];
    for (let i = 0; i < activeRows.length; i++) {
      for (let j = i + 1; j < activeRows.length; j++) {
        const a = activeRows[i];
        const b = activeRows[j];
        const aEnd = a.effective_to ? new Date(a.effective_to).getTime() : Infinity;
        const bEnd = b.effective_to ? new Date(b.effective_to).getTime() : Infinity;
        const aStart = new Date(a.effective_from).getTime();
        const bStart = new Date(b.effective_from).getTime();
        if (aStart <= bEnd && bStart <= aEnd) {
          overlaps.push(`v${a.version_number} ↔ v${b.version_number}`);
        }
      }
    }
    overlapCheck = overlaps.length
      ? { status: 'FAIL', message: `Overlapping active versions: ${overlaps.join(', ')}`, details: overlaps }
      : { status: 'PASS', message: `${activeRows.length} active, no overlap` };
    if (overlaps.length) issues.push(overlapCheck.message);
  }

  if (activeVersion) {
    const versionId = activeVersion.id;
    versionGovernanceCheck = {
      status: 'PASS',
      message: `Active v${activeVersion.version_number} is read-only; ${draftRows.length} draft(s) editable`,
    };

    // Eligibility
    const { data: rules = [] } = await supabase
      .from('bn_eligibility_rule')
      .select('id, rule_code, rule_definition, data_source, is_active')
      .eq('product_version_id', versionId);
    const activeRules = (rules ?? []).filter((r) => r.is_active);
    if (!baseline.requires_eligibility) {
      eligibilityCheck = { status: 'NOT_APPLICABLE', message: 'Not required (service case)' };
    } else if (activeRules.length === 0) {
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
      .select('id, rule_code, formula_template_id, formula_definition, variables, is_active')
      .eq('product_version_id', versionId);
    const activeCalcs = (calcs ?? []).filter((c) => c.is_active);
    if (!baseline.requires_calculation) {
      calculationCheck = { status: 'NOT_APPLICABLE', message: 'Not required (service case)' };
      formulaResolvableCheck = { status: 'NOT_APPLICABLE', message: 'Not required' };
    } else if (activeCalcs.length === 0) {
      calculationCheck = { status: 'FAIL', message: 'No active calculation rule' };
      formulaResolvableCheck = { status: 'FAIL', message: 'No calc rule to resolve' };
    } else {
      calculationCheck = { status: 'PASS', message: `${activeCalcs.length} calc rule(s)` };

      // Formula variables resolvable: each variable referenced in formula must exist
      // in either `variables` payload or the linked formula_template.input_variables.
      const templateIds = activeCalcs.map((c) => c.formula_template_id).filter(Boolean);
      const { data: templates = [] } = templateIds.length
        ? await supabase
            .from('bn_formula_template')
            .select('id, input_variables, formula_expression')
            .in('id', templateIds as string[])
        : { data: [] as any[] };
      const templateMap = new Map((templates ?? []).map((t) => [t.id, t]));
      const unresolved: string[] = [];
      for (const c of activeCalcs) {
        const tpl = c.formula_template_id ? templateMap.get(c.formula_template_id) : null;
        const expr: string = (c.formula_definition as any)?.expression
          ?? (tpl as any)?.formula_expression
          ?? '';
        const provided = new Set<string>([
          ...Object.keys((c.variables as any) ?? {}),
          ...(((tpl as any)?.input_variables ?? []) as string[]),
        ]);
        const referenced = Array.from(new Set(
          (String(expr).match(/[a-zA-Z_][a-zA-Z0-9_\.]*/g) ?? [])
            .filter((tok) => !/^(min|max|round|floor|ceil|if|and|or|not|true|false)$/i.test(tok))
        ));
        for (const r of referenced) {
          // accept any prefix match (e.g. wages.avg_weekly resolves against `wages`)
          if (!provided.has(r) && !Array.from(provided).some((p) => r.startsWith(p))) {
            unresolved.push(`${c.rule_code}:${r}`);
          }
        }
      }
      formulaResolvableCheck = unresolved.length
        ? { status: 'NEEDS_REVIEW', message: `${unresolved.length} unresolved variable ref(s)`, details: unresolved.slice(0, 10) }
        : { status: 'PASS', message: 'All formula variables resolvable' };
      if (unresolved.length) issues.push(`Formula variables unresolved: ${unresolved.slice(0, 5).join(', ')}${unresolved.length > 5 ? '…' : ''}`);
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

    // Document library linkage (bn_document_profile)
    if ((activeVersion as any).document_profile_id) {
      const { data: profile } = await supabase
        .from('bn_document_profile')
        .select('id, profile_code, is_active')
        .eq('id', (activeVersion as any).document_profile_id)
        .maybeSingle();
      if (!profile) {
        docsLibraryCheck = { status: 'FAIL', message: 'document_profile_id references missing library row' };
        issues.push('Document profile reference broken.');
      } else if (profile.is_active === false) {
        docsLibraryCheck = { status: 'WARNING', message: `Library profile ${profile.profile_code} is inactive` };
      } else {
        docsLibraryCheck = { status: 'PASS', message: `Library profile ${profile.profile_code}` };
      }
    } else {
      docsLibraryCheck = { status: 'WARNING', message: 'No bn_document_profile linked — docs not governed by library' };
    }

    // Workflow
    workflowCheck = activeVersion.workflow_template_id
      ? { status: 'PASS', message: 'Workflow template linked' }
      : { status: 'WARNING', message: 'No workflow_template_id — relies on fallback transition matrix' };

    // Workflow definition/template exists?
    if (activeVersion.workflow_template_id) {
      const { data: wfTemplate } = await supabase
        .from('bn_workflow_template')
        .select('id, template_name, is_active')
        .eq('id', activeVersion.workflow_template_id)
        .maybeSingle();
      if (!wfTemplate) {
        workflowExistsCheck = { status: 'FAIL', message: 'workflow_template_id points to missing bn_workflow_template row' };
        issues.push('Workflow definition missing.');
      } else if (wfTemplate.is_active === false) {
        workflowExistsCheck = { status: 'WARNING', message: `Workflow "${wfTemplate.template_name}" exists but inactive` };
      } else {
        workflowExistsCheck = { status: 'PASS', message: `Workflow "${wfTemplate.template_name}" present` };
      }
    } else {
      workflowExistsCheck = { status: 'NOT_APPLICABLE', message: 'No workflow linked' };
    }

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

  // Channel readiness (ONLINE / OFFLINE) — only if we have an active version
  let offlineCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  let onlineCheck: CheckResult = { status: 'NOT_APPLICABLE', message: 'Active version required' };
  if (activeVersion) {
    try {
      const off = await checkStaffReadiness(activeVersion.id);
      offlineCheck = off.ok
        ? { status: 'PASS', message: 'Offline channel ready' }
        : { status: off.config?.is_enabled === false ? 'FAIL' : 'WARNING', message: off.issues.join('; ') };
    } catch (e) {
      offlineCheck = { status: 'WARNING', message: (e as Error).message };
    }
    try {
      const on = await checkPublicReadiness(activeVersion.id);
      onlineCheck = on.ok
        ? { status: 'PASS', message: 'Online channel ready' }
        : { status: on.config?.is_enabled === false ? 'NOT_APPLICABLE' : 'WARNING', message: on.issues.join('; ') };
    } catch (e) {
      onlineCheck = { status: 'WARNING', message: (e as Error).message };
    }
  }

  const overall = worst(
    productCheck.status,
    activeVersionCheck.status,
    overlapCheck.status,
    eligibilityCheck.status,
    calculationCheck.status,
    formulaResolvableCheck.status,
    docsCheck.status,
    docsLibraryCheck.status,
    workflowCheck.status,
    workflowExistsCheck.status,
    screenCheck.status,
    timelineCheck.status,
    testCasesCheck.status,
    offlineCheck.status,
    onlineCheck.status,
    versionGovernanceCheck.status,
  );

  return {
    benefit_code: baseline.benefit_code,
    benefit_name: baseline.benefit_name,
    product_id: product.id,
    active_version_id: activeVersion?.id,
    product_exists: productCheck,
    active_version: activeVersionCheck,
    overlap_versions: overlapCheck,
    eligibility: eligibilityCheck,
    calculation: calculationCheck,
    formula_resolvable: formulaResolvableCheck,
    documents: docsCheck,
    documents_library: docsLibraryCheck,
    workflow: workflowCheck,
    workflow_exists: workflowExistsCheck,
    screen_template: screenCheck,
    timeline: timelineCheck,
    test_cases: testCasesCheck,
    offline_channel: offlineCheck,
    online_channel: onlineCheck,
    version_governance: versionGovernanceCheck,
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
