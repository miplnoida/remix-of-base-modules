/**
 * Formula Governance Chain Resolver — Phase 7 (hardened).
 *
 * For every formula expression (templates + versions) walk each variable
 * through every possible source store and emit one row per variable into
 * `bn_formula_resolution_report` with one of:
 *
 *   RESOLVED                       — runtime can resolve this variable.
 *   UNKNOWN                        — not in any registry / unrecognised.
 *   ORPHAN                         — registry entry exists but inactive.
 *   UNMAPPED                       — registry entry present but no source path.
 *   MISSING_RATE_TABLE             — references a rate table that doesn't exist.
 *   MISSING_MATRIX_TABLE           — references a matrix/share/condition table that doesn't exist.
 *   MISSING_MEDICAL_TARIFF         — references a tariff table that doesn't exist.
 *   MISSING_DERIVED_FACT           — references a derived-fact code that doesn't exist.
 *   MISSING_PRODUCT_PARAMETER      — references a product param code that doesn't exist.
 *   MISSING_PRIOR_FORMULA_OUTPUT   — references a prior-formula result that doesn't exist.
 *
 * Sources consulted (in this order):
 *   1. bn_formula_variable_registry        (canonical map of variable → source)
 *   2. bn_data_field_registry              (claim / fact field codes)
 *   3. bn_derived_fact                     (APPROVED, in effective window)
 *   4. bn_product_parameter                (APPROVED, in effective window)
 *   5. bn_rate_table                       (table_type RATE / MATRIX / SHARE_TABLE / CONDITION_TABLE)
 *   6. bn_rate_table_dimension             (matrix coverage check)
 *   7. bn_rate_table_row                   (presence of at least one active row)
 *   8. bn_medical_tariff_table             + bn_medical_reimbursement_limit
 *   9. bn_formula_template.output_variable / template_code  (prior-result chain)
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type ResolutionStatus =
  | 'RESOLVED'
  | 'UNKNOWN'
  | 'ORPHAN'
  | 'UNMAPPED'
  | 'MISSING_RATE_TABLE'
  | 'MISSING_MATRIX_TABLE'
  | 'MISSING_MEDICAL_TARIFF'
  | 'MISSING_DERIVED_FACT'
  | 'MISSING_PRODUCT_PARAMETER'
  | 'MISSING_PRIOR_FORMULA_OUTPUT';

export interface ResolutionRow {
  formula_id: string | null;
  formula_code: string | null;
  formula_version: string | null;
  variable_code: string;
  status: ResolutionStatus;
  detail: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const inEffectiveWindow = (from?: string | null, to?: string | null) => {
  const t = today();
  if (from && from > t) return false;
  if (to && to < t) return false;
  return true;
};

function extractVariables(expr: string): string[] {
  if (!expr) return [];
  const set = new Set<string>();
  const re = /\{([A-Za-z_][A-Za-z0-9_]*)\}|\b([A-Z][A-Z0-9_]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr)) !== null) {
    const v = (m[1] ?? m[2]).trim();
    if (v) set.add(v);
  }
  return [...set];
}

const MATRIX_TYPES = new Set(['MATRIX', 'SHARE_TABLE', 'CONDITION_TABLE']);

export async function runResolution(): Promise<{ runId: string; total: number; unresolved: number }> {
  const runId = crypto.randomUUID();

  // ── 1) load every source store in parallel ───────────────────────────
  const [
    varReg, fieldReg, derived, params,
    rateTables, rateRows, rateDims,
    tariffs, tariffLimits,
    tmpl, ver,
  ] = await Promise.all([
    db.from('bn_formula_variable_registry').select('variable_code, source_type, source_path, is_active'),
    db.from('bn_data_field_registry').select('field_code'),
    db.from('bn_derived_fact').select('code, status, effective_from, effective_to'),
    db.from('bn_product_parameter').select('code, status, default_value, string_value, effective_from, effective_to'),
    db.from('bn_rate_table').select('id, table_code, table_type, status'),
    db.from('bn_rate_table_row').select('rate_table_id'),
    db.from('bn_rate_table_dimension').select('rate_table_id'),
    db.from('bn_medical_tariff_table').select('tariff_code, status'),
    db.from('bn_medical_reimbursement_limit').select('procedure_code, is_active'),
    db.from('bn_formula_template').select('id, formula_code, expression, output_variable, template_code, is_active'),
    db.from('bn_formula_version').select('id, formula_template_id, version_no, expression, is_active'),
  ]);

  const variables = new Map<string, any>();
  for (const r of varReg.data ?? []) variables.set(r.variable_code, r);

  const fields = new Set<string>((fieldReg.data ?? []).map((r: any) => r.field_code));

  const derivedActive = new Set<string>();
  for (const d of derived.data ?? []) {
    if (String(d.status ?? '').toUpperCase() === 'APPROVED' && inEffectiveWindow(d.effective_from, d.effective_to)) {
      derivedActive.add(d.code);
    }
  }

  const paramsActive = new Set<string>();
  for (const p of params.data ?? []) {
    if (String(p.status ?? '').toUpperCase() === 'APPROVED' && inEffectiveWindow(p.effective_from, p.effective_to)) {
      paramsActive.add(p.code);
    }
  }

  const rateTableByCode = new Map<string, any>();
  for (const t of rateTables.data ?? []) if (t.table_code) rateTableByCode.set(t.table_code, t);

  const rowsByTableId = new Set<string>();
  for (const r of rateRows.data ?? []) rowsByTableId.add(r.rate_table_id);
  const dimsByTableId = new Set<string>();
  for (const r of rateDims.data ?? []) dimsByTableId.add(r.rate_table_id);

  const tariffByCode = new Map<string, any>();
  for (const t of tariffs.data ?? []) if (t.tariff_code) tariffByCode.set(t.tariff_code, t);
  const tariffProcedures = new Set<string>();
  for (const l of tariffLimits.data ?? []) if (l.procedure_code && l.is_active !== false) tariffProcedures.add(l.procedure_code);

  // Prior-formula outputs are addressable by either `output_variable` or `template_code`.
  const priorOutputs = new Set<string>();
  for (const f of tmpl.data ?? []) {
    if (f.is_active === false) continue;
    if (f.output_variable) priorOutputs.add(f.output_variable);
    if (f.template_code) priorOutputs.add(f.template_code);
    if (f.formula_code) priorOutputs.add(f.formula_code);
  }

  // ── 2) classify each variable ────────────────────────────────────────
  const rows: ResolutionRow[] = [];

  const classify = (
    formulaId: string,
    code: string,
    version: string | null,
    v: string,
  ): ResolutionRow => {
    const meta = variables.get(v);
    if (!meta) {
      // Last-chance fallback — variable may match a known source by name alone.
      if (derivedActive.has(v))    return mk('RESOLVED', `derived_fact=${v} (implicit)`);
      if (paramsActive.has(v))     return mk('RESOLVED', `product_parameter=${v} (implicit)`);
      if (priorOutputs.has(v))     return mk('RESOLVED', `prior_formula_output=${v} (implicit)`);
      if (rateTableByCode.has(v))  return mk('RESOLVED', `rate_table=${v} (implicit)`);
      if (fields.has(v))           return mk('RESOLVED', `data_field=${v} (implicit)`);
      return mk('UNKNOWN', 'not in bn_formula_variable_registry and no implicit match');
    }
    if (!meta.is_active) return mk('ORPHAN', 'registry entry inactive');

    const st = String(meta.source_type ?? '').toUpperCase();
    const path = String(meta.source_path ?? '').trim();
    if (!path && !['MANUAL', 'MANUAL_INPUT', 'CLAIM_FIELD'].includes(st)) {
      return mk('UNMAPPED', `source_type=${st} has no source_path`);
    }

    switch (st) {
      case 'RATE_TABLE':
      case 'TABLE': {
        const t = rateTableByCode.get(path);
        if (!t) return mk('MISSING_RATE_TABLE', `rate_table_code=${path}`);
        if (!rowsByTableId.has(t.id)) return mk('MISSING_RATE_TABLE', `rate_table=${path} has no rows`);
        return mk('RESOLVED', `rate_table=${path}`);
      }
      case 'MATRIX':
      case 'SHARE_TABLE':
      case 'CONDITION_TABLE': {
        const t = rateTableByCode.get(path);
        if (!t || !MATRIX_TYPES.has(String(t.table_type ?? '').toUpperCase())) {
          return mk('MISSING_MATRIX_TABLE', `matrix_table_code=${path}`);
        }
        if (!dimsByTableId.has(t.id) || !rowsByTableId.has(t.id)) {
          return mk('MISSING_MATRIX_TABLE', `matrix=${path} missing dimensions or rows`);
        }
        return mk('RESOLVED', `matrix=${path}`);
      }
      case 'MEDICAL_TARIFF':
      case 'TARIFF': {
        if (!tariffByCode.has(path) && !tariffProcedures.has(path)) {
          return mk('MISSING_MEDICAL_TARIFF', `tariff_code=${path}`);
        }
        return mk('RESOLVED', `medical_tariff=${path}`);
      }
      case 'DERIVED_FACT': {
        if (!derivedActive.has(path)) return mk('MISSING_DERIVED_FACT', `derived_fact=${path}`);
        return mk('RESOLVED', `derived_fact=${path}`);
      }
      case 'PRODUCT_PARAMETER':
      case 'PARAMETER': {
        if (!paramsActive.has(path)) return mk('MISSING_PRODUCT_PARAMETER', `product_parameter=${path}`);
        return mk('RESOLVED', `product_parameter=${path}`);
      }
      case 'FORMULA_RESULT':
      case 'PRIOR_FORMULA_RESULT':
      case 'PRIOR_RESULT': {
        if (!priorOutputs.has(path)) return mk('MISSING_PRIOR_FORMULA_OUTPUT', `prior_output=${path}`);
        return mk('RESOLVED', `prior_formula_output=${path}`);
      }
      case 'FACT':
      case 'FIELD':
      case 'CLAIM_FIELD': {
        if (path && !fields.has(path)) return mk('UNMAPPED', `field_code=${path}`);
        return mk('RESOLVED', `claim_field=${path || v}`);
      }
      case 'MANUAL':
      case 'MANUAL_INPUT':
        return mk('RESOLVED', 'manual input');
      default:
        return mk('UNMAPPED', `unknown source_type=${st}`);
    }

    function mk(status: ResolutionStatus, detail: string): ResolutionRow {
      return { formula_id: formulaId, formula_code: code, formula_version: version, variable_code: v, status, detail };
    }
  };

  const walk = (id: string, code: string, version: string | null, expr: string) => {
    const used = extractVariables(expr);
    if (used.length === 0) {
      rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: '(none)', status: 'RESOLVED', detail: 'no variables' });
      return;
    }
    for (const v of used) rows.push(classify(id, code, version, v));
  };

  for (const t of tmpl.data ?? []) walk(t.id, t.formula_code, null, t.expression ?? '');
  for (const v of ver.data ?? []) walk(v.id, String(v.formula_template_id ?? ''), String(v.version_no ?? ''), v.expression ?? '');

  if (rows.length > 0) {
    const { error } = await db.from('bn_formula_resolution_report').insert(rows.map(r => ({ run_id: runId, ...r })));
    if (error) throw error;
  }
  const unresolved = rows.filter(r => r.status !== 'RESOLVED').length;
  return { runId, total: rows.length, unresolved };
}
