/**
 * Formula Governance Chain Resolver — Phase 7.
 *
 * Walks every formula variable through:
 *   bn_formula_variable_registry
 *     → bn_data_field_registry
 *     → bn_data_source_registry
 *     → bn_rate_table / bn_medical_tariff_table / bn_product_parameter
 *
 * Persists per-variable status to `bn_formula_resolution_report`.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type ResolutionStatus =
  | 'RESOLVED'
  | 'UNKNOWN'
  | 'ORPHAN'
  | 'UNMAPPED'
  | 'MISSING_RATE_TABLE'
  | 'MISSING_MATRIX';

export interface ResolutionRow {
  formula_id: string | null;
  formula_code: string | null;
  formula_version: string | null;
  variable_code: string;
  status: ResolutionStatus;
  detail: string | null;
}

/** Extract `{var}` style identifiers from a formula expression. */
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

export async function runResolution(): Promise<{ runId: string; total: number; unresolved: number }> {
  const runId = crypto.randomUUID();

  // 1) load registries
  const [varReg, fieldReg, srcReg, rateTables, tariffs] = await Promise.all([
    db.from('bn_formula_variable_registry').select('variable_code, source_type, source_path, is_active'),
    db.from('bn_data_field_registry').select('field_code, source_id'),
    db.from('bn_data_source_registry').select('id, source_code'),
    db.from('bn_rate_table').select('id, rate_table_code'),
    db.from('bn_medical_tariff_table').select('id, tariff_table_code'),
  ]);

  const variables = new Map<string, any>();
  for (const r of varReg.data ?? []) variables.set(r.variable_code, r);
  const fields = new Set<string>((fieldReg.data ?? []).map((r: any) => r.field_code));
  const sources = new Set<string>((srcReg.data ?? []).map((r: any) => r.source_code));
  const rates = new Set<string>((rateTables.data ?? []).map((r: any) => r.rate_table_code).filter(Boolean));
  const matrices = new Set<string>((tariffs.data ?? []).map((r: any) => r.tariff_table_code).filter(Boolean));

  // 2) load formula expressions
  const [tmpl, ver] = await Promise.all([
    db.from('bn_formula_template').select('id, formula_code, expression, is_active'),
    db.from('bn_formula_version').select('id, formula_template_id, version_no, expression, is_active'),
  ]);

  const rows: ResolutionRow[] = [];
  const walk = (id: string, code: string, version: string | null, expr: string) => {
    const used = extractVariables(expr);
    if (used.length === 0) {
      rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: '(none)', status: 'RESOLVED', detail: 'no variables' });
      return;
    }
    for (const v of used) {
      const meta = variables.get(v);
      if (!meta) {
        rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: v, status: 'UNKNOWN', detail: 'not in bn_formula_variable_registry' });
        continue;
      }
      if (!meta.is_active) {
        rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: v, status: 'ORPHAN', detail: 'registry entry inactive' });
        continue;
      }
      // source_type-based check
      const st = String(meta.source_type ?? '').toUpperCase();
      const path = String(meta.source_path ?? '');
      if (st === 'RATE_TABLE') {
        if (!rates.has(path)) { rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: v, status: 'MISSING_RATE_TABLE', detail: `rate_table_code=${path}` }); continue; }
      } else if (st === 'MATRIX' || st === 'TARIFF') {
        if (!matrices.has(path)) { rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: v, status: 'MISSING_MATRIX', detail: `tariff_table_code=${path}` }); continue; }
      } else if (st === 'FIELD' || st === 'FACT') {
        if (!fields.has(path)) { rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: v, status: 'UNMAPPED', detail: `field_code=${path}` }); continue; }
      } else if (st === 'SOURCE') {
        if (!sources.has(path)) { rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: v, status: 'UNMAPPED', detail: `source_code=${path}` }); continue; }
      }
      rows.push({ formula_id: id, formula_code: code, formula_version: version, variable_code: v, status: 'RESOLVED', detail: `${st}:${path}` });
    }
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
