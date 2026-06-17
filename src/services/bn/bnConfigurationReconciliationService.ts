/**
 * BN Configuration Reconciliation — 7 cross-cutting checks that verify the
 * Formula Library, Rate/Matrix Tables, Medical Reimbursement and Product
 * Catalog are wired together correctly. Runs purely client-side reads against
 * the existing DB tables; no schema dependencies.
 */
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type ReconStatus = 'PASS' | 'WARN' | 'FAIL';

export interface ReconCheck {
  id: string;
  label: string;
  status: ReconStatus;
  message: string;
  details?: string[];
}

// Canonical seeded examples that must exist as ACTIVE and be structurally
// valid — one per major benefit family (Age Pension, Age Grant, Survivor,
// Medical, Sickness, Maternity).
const SEEDED_FORMULAS = [
  'CONTRIBUTION_BASED_PENSION', // Age Pension
  'AGE_GRANT',                   // Age Grant
  'SPOUSE_SURVIVOR_AMOUNT',      // Survivor (spouse)
  'CHILD_SURVIVOR_AMOUNT',       // Survivor (child)
  'MEDICAL_REIMBURSEMENT',       // Medical
  'SICKNESS_RATE_V1',            // Sickness
  'MATERNITY_RATE_V1',           // Maternity
];

function ok(id: string, label: string, message: string): ReconCheck { return { id, label, status: 'PASS', message }; }
function warn(id: string, label: string, message: string, details?: string[]): ReconCheck { return { id, label, status: 'WARN', message, details }; }
function fail(id: string, label: string, message: string, details?: string[]): ReconCheck { return { id, label, status: 'FAIL', message, details }; }

const EXPR_VAR_RE = /[a-zA-Z_][a-zA-Z0-9_]*/g;
const RESERVED = new Set(['min', 'max', 'round', 'floor', 'ceil', 'abs', 'if', 'then', 'else', 'and', 'or', 'not', 'true', 'false']);

function collectExprVars(expr: string | null | undefined): string[] {
  if (!expr) return [];
  const out = new Set<string>();
  for (const m of expr.matchAll(EXPR_VAR_RE)) {
    if (!RESERVED.has(m[0]) && !/^\d/.test(m[0])) out.add(m[0]);
  }
  return [...out];
}

function collectStepsVars(stepsJson: any): { vars: string[]; tables: string[]; medicalSteps: number; lookupSteps: { table: string; inputs: string[] }[] } {
  const vars = new Set<string>();
  const tables = new Set<string>();
  const lookupSteps: { table: string; inputs: string[] }[] = [];
  let medicalSteps = 0;
  if (!stepsJson) return { vars: [], tables: [], medicalSteps: 0, lookupSteps: [] };
  if (stepsJson.expression) collectExprVars(stepsJson.expression).forEach((v) => vars.add(v));
  if (stepsJson.lookup) { tables.add(stepsJson.lookup.table_code); lookupSteps.push({ table: stepsJson.lookup.table_code, inputs: Object.keys(stepsJson.lookup.inputs ?? {}) }); }
  if (stepsJson.medical) medicalSteps++;
  for (const s of stepsJson.steps ?? []) {
    if (s.kind === 'LOOKUP') { tables.add(s.table_code); lookupSteps.push({ table: s.table_code, inputs: Object.keys(s.inputs ?? {}) }); }
    else if (s.kind === 'MEDICAL_TARIFF') medicalSteps++;
    else if (s.kind === 'EXPRESSION') collectExprVars(s.expression).forEach((v) => vars.add(v));
  }
  for (const br of stepsJson.conditional?.branches ?? []) {
    collectExprVars(br.condition).forEach((v) => vars.add(v));
    collectExprVars(br.expression).forEach((v) => vars.add(v));
  }
  return { vars: [...vars], tables: [...tables], medicalSteps, lookupSteps };
}

export async function runReconciliationChecks(): Promise<ReconCheck[]> {
  const results: ReconCheck[] = [];

  const [vR, fvR, rtR, rtdR, mrlR, mttR, pfbR, pvR, pmR] = await Promise.all([
    db.from('bn_formula_variable_registry').select('variable_code').eq('is_active', true),
    db.from('bn_formula_version').select('id, formula_code, expression, expression_type, steps_json, governance_status'),
    db.from('bn_rate_table').select('id, table_code, status'),
    db.from('bn_rate_table_dimension').select('rate_table_id, dimension_key'),
    db.from('bn_medical_reimbursement_limit').select('id').limit(1),
    db.from('bn_medical_tariff_table').select('id').limit(1),
    db.from('bn_product_formula_binding').select('id, product_version_id, formula_template_id, formula_version_id, step_mapping_json'),
    db.from('bn_product_version').select('id, status'),
    db.from('bn_product_formula_variable_mapping').select('binding_id, variable_name'),
  ]);

  const registrySet = new Set((vR.data ?? []).map((r: any) => r.variable_code));
  const versions = (fvR.data ?? []) as any[];
  const rateTables = (rtR.data ?? []) as any[];
  const activeRateTableCodes = new Set(rateTables.filter((t) => (t.status ?? 'ACTIVE') === 'ACTIVE').map((t) => t.table_code));
  const rateTableByCode = new Map(rateTables.map((t) => [t.table_code, t]));
  const dims = (rtdR.data ?? []) as any[];
  const dimsByTable = new Map<string, string[]>();
  for (const d of dims) {
    const tbl = rateTables.find((t) => t.id === d.rate_table_id);
    if (!tbl) continue;
    const arr = dimsByTable.get(tbl.table_code) ?? [];
    arr.push(d.dimension_key);
    dimsByTable.set(tbl.table_code, arr);
  }
  const bindings = (pfbR.data ?? []) as any[];
  const productVersions = (pvR.data ?? []) as any[];
  const mappings = (pmR.data ?? []) as any[];
  const activePVIds = new Set(productVersions.filter((pv) => pv.status === 'ACTIVE').map((pv) => pv.id));

  // 1) Every formula version's referenced variables exist in registry.
  const unknownVars: string[] = [];
  for (const v of versions) {
    const all = new Set<string>([...collectExprVars(v.expression), ...collectStepsVars(v.steps_json).vars]);
    for (const code of all) if (!registrySet.has(code)) unknownVars.push(`${v.formula_code}: ${code}`);
  }
  results.push(unknownVars.length
    ? fail('vars', 'Formula variables registered', `${unknownVars.length} unknown variable reference(s)`, unknownVars.slice(0, 25))
    : ok('vars', 'Formula variables registered', `All variables resolved against registry (${registrySet.size} codes)`));

  // 2) Every LOOKUP step's table_code exists & is ACTIVE.
  const missingTables: string[] = [];
  for (const v of versions) {
    for (const t of collectStepsVars(v.steps_json).tables) {
      if (!activeRateTableCodes.has(t)) missingTables.push(`${v.formula_code} → ${t}`);
    }
  }
  results.push(missingTables.length
    ? fail('tables', 'LOOKUP tables exist & ACTIVE', `${missingTables.length} reference(s) to missing/inactive tables`, missingTables.slice(0, 25))
    : ok('tables', 'LOOKUP tables exist & ACTIVE', 'All LOOKUP table_codes resolve to ACTIVE rate tables'));

  // 3) Each LOOKUP step's dim inputs match the table's dimensions.
  const dimMismatches: string[] = [];
  for (const v of versions) {
    for (const step of collectStepsVars(v.steps_json).lookupSteps) {
      const expected = new Set(dimsByTable.get(step.table) ?? []);
      const got = new Set(step.inputs);
      const missing = [...expected].filter((d) => !got.has(d));
      const extra = [...got].filter((d) => !expected.has(d));
      if (missing.length || extra.length) {
        dimMismatches.push(`${v.formula_code} → ${step.table}: missing=[${missing.join(',')}] extra=[${extra.join(',')}]`);
      }
    }
  }
  results.push(dimMismatches.length
    ? fail('dims', 'LOOKUP dimensions match', `${dimMismatches.length} step(s) with dimension mismatch`, dimMismatches.slice(0, 25))
    : ok('dims', 'LOOKUP dimensions match', 'All LOOKUP step inputs match their rate-table dimensions'));

  // 4) Medical resolver source = bn_medical_reimbursement_limit (legacy table empty or read-only).
  const legacyHasData = (mttR.data ?? []).length > 0;
  const newHasData = (mrlR.data ?? []).length > 0;
  if (!newHasData) {
    results.push(fail('medical', 'Medical reimbursement source', 'bn_medical_reimbursement_limit is empty — runtime cannot resolve medical tariffs'));
  } else if (legacyHasData) {
    results.push(warn('medical', 'Medical reimbursement source', 'bn_medical_reimbursement_limit is live (legacy bn_medical_tariff_table retained as read-only history)'));
  } else {
    results.push(ok('medical', 'Medical reimbursement source', 'bn_medical_reimbursement_limit is the sole source; legacy tariff tables empty'));
  }

  // 5) Every ACTIVE product version has at least one binding + mappings (or step_mapping_json).
  const incompletePV: string[] = [];
  const mappedBindings = new Set(mappings.map((m) => m.binding_id));
  for (const pvId of activePVIds) {
    const pvBindings = bindings.filter((b) => b.product_version_id === pvId);
    if (!pvBindings.length) { incompletePV.push(`${pvId}: no bindings`); continue; }
    const hasMapping = pvBindings.some((b) => mappedBindings.has(b.id) || (b.step_mapping_json && Object.keys(b.step_mapping_json?.steps ?? {}).length));
    if (!hasMapping) incompletePV.push(`${pvId}: bindings exist but no variable mappings`);
  }
  results.push(incompletePV.length
    ? fail('bindings', 'ACTIVE products fully bound', `${incompletePV.length} ACTIVE product version(s) incomplete`, incompletePV.slice(0, 25))
    : ok('bindings', 'ACTIVE products fully bound', `${activePVIds.size} ACTIVE version(s), all with bindings + mappings`));

  // 6) No ACTIVE product references legacy calculation_config.
  const { data: legacyProducts = [] } = await db
    .from('bn_product_version')
    .select('id, status, calculation_config')
    .eq('status', 'ACTIVE');
  const usingLegacy = (legacyProducts ?? []).filter((p: any) => {
    const c = p.calculation_config;
    return c && typeof c === 'object' && Object.keys(c).length > 0;
  });
  results.push(usingLegacy.length
    ? warn('legacy_config', 'No legacy calculation_config in ACTIVE', `${usingLegacy.length} ACTIVE product version(s) still carry legacy calculation_config`, usingLegacy.map((p: any) => p.id).slice(0, 25))
    : ok('legacy_config', 'No legacy calculation_config in ACTIVE', 'No ACTIVE product references legacy calculation_config'));

  // 7) Seeded formulas are structurally complete (have expression or steps_json,
  //    and all referenced variables exist in the registry). Full runtime simulation
  //    is covered by the dedicated simulation tab — this check is a fast smoke test.
  const simFails: string[] = [];
  const seededVersions = versions.filter((v) => SEEDED_FORMULAS.includes(v.formula_code) && v.governance_status === 'ACTIVE');
  for (const v of seededVersions) {
    const hasBody = !!v.expression || (v.steps_json && Object.keys(v.steps_json).length > 0);
    if (!hasBody) { simFails.push(`${v.formula_code}: empty body`); continue; }
    const refd = new Set<string>([...collectExprVars(v.expression), ...collectStepsVars(v.steps_json).vars]);
    const unknown = [...refd].filter((c) => !registrySet.has(c));
    if (unknown.length) simFails.push(`${v.formula_code}: unknown vars ${unknown.join(',')}`);
  }
  if (!seededVersions.length) {
    results.push(warn('sims', 'Seeded formulas structurally complete', 'No ACTIVE seeded formulas found'));
  } else if (simFails.length) {
    results.push(fail('sims', 'Seeded formulas structurally complete', `${simFails.length}/${seededVersions.length} failed`, simFails));
  } else {
    results.push(ok('sims', 'Seeded formulas structurally complete', `All ${seededVersions.length} seeded formulas are structurally valid`));
  }

  return results;
}
