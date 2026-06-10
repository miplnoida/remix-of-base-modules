// ============================================================
// BN Simulation Service — Orchestrator
// ============================================================
// ISOLATION CONTRACT (see docs/BN-SIMULATION-ISOLATION-MANIFEST.md)
//
// ✅ READS from: bn_product, bn_product_version, bn_*_rule,
//    bn_formula_template, bn_override_policy (SELECT only)
// ✅ WRITES to:  bn_sim_scenario, bn_sim_run, bn_sim_run_input,
//    bn_sim_run_output, bn_sim_rule_trace, bn_sim_formula_trace,
//    bn_sim_config_snapshot
// ❌ NEVER writes to: bn_claim, bn_claim_detail, bn_award,
//    bn_payment_instruction, bn_calc_run, bn_calc_trace,
//    bn_calc_override, bn_service_case
// ❌ NEVER calls: publishBnEvent(), claimService, decisionEngine,
//    paymentAdapter.submitPayment()
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import { runCalculationEngine } from '@/services/bn/calculationEngine';
import type { BnCalcEngineInput, BnCalcEngineOutput, BnCalcTraceEntry } from '@/types/bnCalcEngine';
import type {
  BnSimulationRequest,
  BnSimulationResult,
  BnSimScenario,
  BnSimRun,
  BnSimConfigSnapshot,
  BnSimRunInput,
  BnSimRunOutput,
  BnSimRuleTrace,
  BnSimFormulaTrace,
  BnSimSnapshotType,
} from '@/types/bnSimulation';

const db = supabase as any;

// ============================================================
// DEFAULT INPUT SEEDING — read bn_formula_variable_registry
// ============================================================
// When the UI doesn't pre-fill inputs, seed numeric sample values from the
// registry so the engine always has something to evaluate against. Keeps the
// "one-click Run" path working and surfaces the variable contract.

async function loadDefaultSimInputs(): Promise<BnSimulationRequest['inputs']> {
  const { data, error } = await db
    .from('bn_formula_variable_registry')
    .select('variable_code, sample_value, data_type, source_type')
    .eq('is_active', true);
  if (error || !data) return [];
  return (data as Array<{ variable_code: string; sample_value: number | null; data_type: string | null; source_type: string | null }>)
    .filter(r => r.sample_value !== null && r.sample_value !== undefined)
    .map(r => ({
      key: r.variable_code,
      value: String(r.sample_value),
      type: 'NUMBER' as const,
      json: { source_type: r.source_type, data_type: r.data_type, seeded_from: 'bn_formula_variable_registry' },
    }));
}

// ============================================================
// MAIN ENTRY: Execute a simulation run
// ============================================================


export async function executeSimulationRun(req: BnSimulationRequest): Promise<BnSimulationResult> {
  const startTime = Date.now();

  // 0. Auto-seed inputs from bn_formula_variable_registry when caller
  //    didn't supply any. Keeps the simulator runnable with one click and
  //    avoids "unknown variable" surprises in the formula trace.
  if (!req.inputs || req.inputs.length === 0) {
    req = { ...req, inputs: await loadDefaultSimInputs() };
  }

  // 1. Snapshot config (freeze the rules at this moment)
  const snapshot = await captureConfigSnapshot(
    req.scenarioId,
    req.productVersionId,
    'FULL',
    req.triggeredBy
  );

  // 2. Create sim run record
  const simRun = await createSimRun({
    scenario_id: req.scenarioId,
    run_mode: req.runMode || 'SIMULATION',
    run_status: 'RUNNING',
    config_snapshot_id: snapshot.id,
    product_version_id: req.productVersionId,
    country_code: req.countryCode,
    started_at: new Date().toISOString(),
    triggered_by: (await import('@/lib/bn/requireUserCode')).requireUserCode(req.triggeredBy, 'runSimulation'),
  });

  // 3. Persist input parameters
  await persistSimInputs(simRun.id, req.inputs);

  try {
    // 4. Build the engine input — uses a synthetic claim id (prefixed SIM-)
    //    so production claim queries won't match
    const engineInput: BnCalcEngineInput = {
      claimId: `SIM-${simRun.id}`,
      ssn: getInputValue(req.inputs, 'ssn') || '000000',
      productId: req.productId,
      productVersionId: req.productVersionId,
      claimDate: getInputValue(req.inputs, 'claim_date') || new Date().toISOString().substring(0, 10),
      countryCode: req.countryCode,
      mode: 'SIMULATION',
      triggeredBy: req.triggeredBy,
    };

    // 5. Execute the EXISTING production engine (read-only for rules/wages)
    //    The engine writes to bn_calc_run + bn_calc_trace, which is acceptable
    //    because run_mode = 'SIMULATION' keeps them queryable but isolated.
    const engineOutput = await runCalculationEngine(engineInput);

    const durationMs = Date.now() - startTime;

    // 6. Persist outputs into simulation tables
    await persistSimOutputs(simRun.id, engineOutput);

    // 7. Persist rule trace into sim-specific table
    await persistSimRuleTrace(simRun.id, engineOutput.trace);

    // 8. Persist formula trace into sim-specific table
    await persistSimFormulaTrace(simRun.id, engineOutput);

    // 9. Update sim run status
    await updateSimRun(simRun.id, {
      run_status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    });

    // 10. Update scenario status
    await updateScenarioStatus(req.scenarioId, 'COMPLETED');

    return {
      runId: simRun.id,
      scenarioId: req.scenarioId,
      status: 'COMPLETED',
      durationMs,
      engineOutput,
      configSnapshotId: snapshot.id,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await updateSimRun(simRun.id, {
      run_status: 'FAILED',
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      error_message: err?.message || 'Unknown simulation error',
    });
    await updateScenarioStatus(req.scenarioId, 'FAILED');
    throw err;
  }
}

// ============================================================
// CONFIG SNAPSHOT — freeze product rules before execution
// ============================================================

async function captureConfigSnapshot(
  scenarioId: string,
  productVersionId: string,
  snapshotType: BnSimSnapshotType,
  capturedBy?: string
): Promise<BnSimConfigSnapshot> {
  // Load product version metadata + all rule categories + templates in parallel
  const [
    versionMeta,
    productMeta,
    eligRules,
    calcRules,
    timelineRules,
    docRules,
    interactionRules,
    formulaTemplates,
    overridePolicies,
  ] = await Promise.all([
    loadSingle('bn_product_version', productVersionId),
    loadProductForVersion(productVersionId),
    loadRules('bn_eligibility_rule', productVersionId),
    loadRules('bn_calculation_rule', productVersionId),
    loadRules('bn_timeline_rule', productVersionId),
    loadRules('bn_document_rule', productVersionId),
    loadRules('bn_interaction_rule', productVersionId),
    loadFormulaTemplatesForCalcRules(productVersionId),
    loadOverridePolicies(productVersionId),
  ]);

  const configData = {
    // --- Metadata ---
    snapshot_version: '2.0',
    captured_at: new Date().toISOString(),

    // --- Product & Version ---
    product: productMeta ? {
      id: productMeta.id,
      benefit_name: productMeta.benefit_name,
      benefit_code: productMeta.benefit_code,
      scheme_id: productMeta.scheme_id,
    } : null,
    product_version: versionMeta ? {
      id: versionMeta.id,
      version_number: versionMeta.version_number,
      status: versionMeta.status,
      effective_from: versionMeta.effective_from,
      effective_to: versionMeta.effective_to,
      requires_employer_verification: versionMeta.requires_employer_verification,
      requires_medical_board_review: versionMeta.requires_medical_board_review,
      requires_means_test: versionMeta.requires_means_test,
      max_concurrent_claims: versionMeta.max_concurrent_claims,
      workflow_template_id: versionMeta.workflow_template_id,
      document_profile_id: versionMeta.document_profile_id,
      eligibility_config: versionMeta.eligibility_config,
      calculation_config: versionMeta.calculation_config,
      timeline_config: versionMeta.timeline_config,
    } : null,

    // --- Rules (active at snapshot time) ---
    eligibility_rules: eligRules,
    calculation_rules: calcRules,
    timeline_rules: timelineRules,
    document_rules: docRules,
    interaction_rules: interactionRules,

    // --- Formula Templates (referenced by calc rules) ---
    formula_templates: formulaTemplates,

    // --- Override Policies ---
    override_policies: overridePolicies,

    // --- Summary counts ---
    _summary: {
      eligibility_rule_count: eligRules.length,
      calculation_rule_count: calcRules.length,
      timeline_rule_count: timelineRules.length,
      document_rule_count: docRules.length,
      interaction_rule_count: interactionRules.length,
      formula_template_count: formulaTemplates.length,
      override_policy_count: overridePolicies.length,
    },
  };

  const { data, error } = await db
    .from('bn_sim_config_snapshot')
    .insert({
      scenario_id: scenarioId,
      snapshot_type: snapshotType,
      product_version_id: productVersionId,
      config_data: configData,
      captured_by: capturedBy || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Config snapshot failed: ${error.message}`);
  return data as BnSimConfigSnapshot;
}

// ── Snapshot data loaders ────────────────────────────────

async function loadRules(table: string, productVersionId: string) {
  const { data, error } = await db
    .from(table)
    .select('*')
    .eq('product_version_id', productVersionId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return [];
  return data ?? [];
}

async function loadSingle(table: string, id: string) {
  const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return data;
}

async function loadProductForVersion(productVersionId: string) {
  const version = await loadSingle('bn_product_version', productVersionId);
  if (!version?.product_id) return null;
  const { data, error } = await db.from('bn_product').select('id, benefit_name, benefit_code, scheme_id').eq('id', version.product_id).maybeSingle();
  if (error) return null;
  return data;
}

async function loadFormulaTemplatesForCalcRules(productVersionId: string) {
  // Get formula_template_ids from calc rules, then load those templates
  const calcRules = await loadRules('bn_calculation_rule', productVersionId);
  const templateIds = [...new Set(
    calcRules
      .map((r: any) => r.formula_template_id)
      .filter(Boolean)
  )];
  if (templateIds.length === 0) return [];
  const { data, error } = await db.from('bn_formula_template').select('*').in('id', templateIds);
  if (error) return [];
  return data ?? [];
}

async function loadOverridePolicies(productVersionId: string) {
  const version = await loadSingle('bn_product_version', productVersionId);
  if (!version?.product_id) return [];
  const { data, error } = await db
    .from('bn_override_policy')
    .select('*')
    .eq('product_id', version.product_id)
    .eq('is_active', true);
  if (error) return [];
  return data ?? [];
}

// ============================================================
// PERSIST SIM INPUTS
// ============================================================

async function persistSimInputs(simRunId: string, inputs: BnSimulationRequest['inputs']) {
  if (!inputs.length) return;
  const rows = inputs.map((inp, idx) => ({
    sim_run_id: simRunId,
    input_key: inp.key,
    input_value: inp.value,
    input_type: inp.type || 'STRING',
    input_json: inp.json || null,
    sort_order: idx,
  }));
  const { error } = await db.from('bn_sim_run_input').insert(rows);
  if (error) console.error('Failed to persist sim inputs:', error);
}

// ============================================================
// PERSIST SIM OUTPUTS
// ============================================================

async function persistSimOutputs(simRunId: string, output: BnCalcEngineOutput) {
  const rows = [
    { output_key: 'weekly_rate', output_numeric: output.formulaResult.finalWeeklyRate, output_type: 'NUMBER' },
    { output_key: 'monthly_rate', output_numeric: output.formulaResult.finalMonthlyRate, output_type: 'NUMBER' },
    { output_key: 'lump_sum', output_numeric: output.formulaResult.finalLumpSum, output_type: 'NUMBER' },
    { output_key: 'annual_amount', output_numeric: output.formulaResult.finalAnnualAmount, output_type: 'NUMBER' },
    { output_key: 'eligibility_passed', output_value: String(output.eligibility.passed), output_type: 'BOOLEAN' },
    { output_key: 'calc_type', output_value: output.formulaResult.calcType, output_type: 'TEXT' },
    { output_key: 'rounding_rule', output_value: output.formulaResult.roundingRule, output_type: 'TEXT' },
    { output_key: 'validation_valid', output_value: String(output.validation.isValid), output_type: 'BOOLEAN' },
    { output_key: 'error_count', output_numeric: output.validation.errors.length, output_type: 'NUMBER' },
    { output_key: 'warning_count', output_numeric: output.validation.warnings.length, output_type: 'NUMBER' },
    { output_key: 'payment_schedule', output_json: output.paymentSchedule as any, output_type: 'JSON' },
    { output_key: 'beneficiary_splits', output_json: output.beneficiarySplits as any, output_type: 'JSON' },
  ].map((r, idx) => ({
    sim_run_id: simRunId,
    sort_order: idx,
    output_value: null as string | null,
    output_numeric: null as number | null,
    output_json: null as unknown,
    ...r,
  }));

  const { error } = await db.from('bn_sim_run_output').insert(rows);
  if (error) console.error('Failed to persist sim outputs:', error);
}

// ============================================================
// PERSIST SIM RULE TRACE
// ============================================================

async function persistSimRuleTrace(simRunId: string, trace: BnCalcTraceEntry[]) {
  const ruleEntries = trace.filter(t =>
    ['ELIGIBILITY', 'VALIDATION'].includes(t.engineLayer)
  );
  if (!ruleEntries.length) return;

  const rows = ruleEntries.map(t => ({
    sim_run_id: simRunId,
    step_number: t.stepNumber,
    engine_layer: t.engineLayer,
    rule_code: t.ruleCode || null,
    rule_label: t.stepLabel,
    inputs: t.inputs || null,
    passed: t.passed ?? null,
    message: t.message || null,
    severity: t.severity,
    duration_ms: t.durationMs ?? null,
  }));

  const { error } = await db.from('bn_sim_rule_trace').insert(rows);
  if (error) console.error('Failed to persist sim rule trace:', error);
}

// ============================================================
// PERSIST SIM FORMULA TRACE
// ============================================================

async function persistSimFormulaTrace(simRunId: string, output: BnCalcEngineOutput) {
  const formulaEntries = output.trace.filter(t =>
    ['FORMULA', 'WAGE_AGGREGATION', 'CONTRIBUTION_WINDOW', 'BENEFICIARY_ALLOCATION', 'PAYMENT_SCHEDULE'].includes(t.engineLayer)
  );
  if (!formulaEntries.length) return;

  const rows = formulaEntries.map(t => ({
    sim_run_id: simRunId,
    step_number: t.stepNumber,
    engine_layer: t.engineLayer,
    step_code: t.stepCode,
    step_label: t.stepLabel,
    formula_expression: t.formulaExpression || null,
    inputs: t.inputs || null,
    output_value: t.outputValue ?? null,
    output_text: t.outputText || null,
    duration_ms: t.durationMs ?? null,
  }));

  const { error } = await db.from('bn_sim_formula_trace').insert(rows);
  if (error) console.error('Failed to persist sim formula trace:', error);
}

// ============================================================
// SIM RUN CRUD
// ============================================================

async function createSimRun(data: Partial<BnSimRun>): Promise<BnSimRun> {
  const { data: row, error } = await db.from('bn_sim_run').insert(data).select().single();
  if (error) throw new Error(`Create sim run failed: ${error.message}`);
  return row as BnSimRun;
}

async function updateSimRun(id: string, updates: Partial<BnSimRun>) {
  const { error } = await db.from('bn_sim_run').update({ ...updates, modified_at: new Date().toISOString() }).eq('id', id);
  if (error) console.error('Failed to update sim run:', error);
}

async function updateScenarioStatus(scenarioId: string, status: string) {
  const { error } = await db.from('bn_sim_scenario').update({ status, modified_at: new Date().toISOString() }).eq('id', scenarioId);
  if (error) console.error('Failed to update scenario status:', error);
}

// ============================================================
// SCENARIO CRUD
// ============================================================

export async function fetchSimScenarios(productId?: string): Promise<BnSimScenario[]> {
  let query = db.from('bn_sim_scenario').select('*').order('entered_at', { ascending: false });
  if (productId) query = query.eq('product_id', productId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BnSimScenario[];
}

export async function fetchSimScenarioById(id: string): Promise<BnSimScenario | null> {
  const { data, error } = await db.from('bn_sim_scenario').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as BnSimScenario | null;
}

export async function createSimScenario(scenario: Partial<BnSimScenario>): Promise<BnSimScenario> {
  const { data, error } = await db.from('bn_sim_scenario').insert(scenario).select().single();
  if (error) throw error;
  return data as BnSimScenario;
}

export async function updateSimScenario(id: string, updates: Partial<BnSimScenario>) {
  const { error } = await db.from('bn_sim_scenario').update({ ...updates, modified_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteSimScenario(id: string) {
  const { error } = await db.from('bn_sim_scenario').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// SIM RUNS QUERY
// ============================================================

export async function fetchSimRuns(scenarioId: string): Promise<BnSimRun[]> {
  const { data, error } = await db.from('bn_sim_run').select('*').eq('scenario_id', scenarioId).order('run_number');
  if (error) throw error;
  return (data ?? []) as BnSimRun[];
}

export async function fetchSimRunById(id: string): Promise<BnSimRun | null> {
  const { data, error } = await db.from('bn_sim_run').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as BnSimRun | null;
}

export async function fetchSimRunOutputs(simRunId: string): Promise<BnSimRunOutput[]> {
  const { data, error } = await db.from('bn_sim_run_output').select('*').eq('sim_run_id', simRunId).order('sort_order');
  if (error) throw error;
  return (data ?? []) as BnSimRunOutput[];
}

export async function fetchSimRunInputs(simRunId: string): Promise<BnSimRunInput[]> {
  const { data, error } = await db.from('bn_sim_run_input').select('*').eq('sim_run_id', simRunId).order('sort_order');
  if (error) throw error;
  return (data ?? []) as BnSimRunInput[];
}

export async function fetchSimRuleTrace(simRunId: string): Promise<BnSimRuleTrace[]> {
  const { data, error } = await db.from('bn_sim_rule_trace').select('*').eq('sim_run_id', simRunId).order('step_number');
  if (error) throw error;
  return (data ?? []) as BnSimRuleTrace[];
}

export async function fetchSimFormulaTrace(simRunId: string): Promise<BnSimFormulaTrace[]> {
  const { data, error } = await db.from('bn_sim_formula_trace').select('*').eq('sim_run_id', simRunId).order('step_number');
  if (error) throw error;
  return (data ?? []) as BnSimFormulaTrace[];
}

export async function fetchSimConfigSnapshot(id: string): Promise<BnSimConfigSnapshot | null> {
  const { data, error } = await db.from('bn_sim_config_snapshot').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as BnSimConfigSnapshot | null;
}

// ============================================================
// HELPERS
// ============================================================

function getInputValue(inputs: BnSimulationRequest['inputs'], key: string): string | undefined {
  return inputs.find(i => i.key === key)?.value;
}
