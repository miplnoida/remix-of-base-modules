/**
 * Variable Resolver Service
 *
 * Single source of truth for any identifier a Formula Library template (or
 * Calculation Builder formula) may reference. A variable is valid IFF it
 * resolves to exactly one of:
 *   1. Fact Registry              (bn_eligibility_fact.fact_key)
 *   2. Derived Fact Registry      (bn_derived_fact.code)
 *   3. Product Parameter Registry (bn_product_parameter.code)
 *   4. Prior Formula Result       (bn_formula_template.output_variable
 *                                  OR template_code)
 *
 * Unknown identifiers are surfaced to the UI with a structured error so the
 * user can deep-link to the registry editor and create the missing source.
 */
import { supabase } from '@/integrations/supabase/client';

export type VariableSource =
  | 'FACT'
  | 'DERIVED_FACT'
  | 'PRODUCT_PARAMETER'
  | 'PRIOR_RESULT';

export interface ResolvedVariable {
  code: string;
  source: VariableSource;
  refId: string;
  displayName: string;
  dataType: string | null;
  unit: string | null;
  sampleValue: number | null;
  status: string | null;
  description?: string | null;
}

export type ResolverMap = Map<string, ResolvedVariable>;

const db = supabase as any;
const isCurrent = (from?: string | null, to?: string | null) => {
  const today = new Date().toISOString().slice(0, 10);
  if (from && from > today) return false;
  if (to && to < today) return false;
  return true;
};

const sampleFromArray = (rows: any[] | undefined, code: string): number | null => {
  for (const r of rows ?? []) {
    if (typeof r === 'number') return r;
    if (typeof r === 'object' && r) {
      const v = r[code] ?? r.value ?? r.sample ?? r.default_value;
      if (typeof v === 'number') return v;
    }
  }
  return null;
};

export async function loadResolverMap(): Promise<ResolverMap> {
  const map: ResolverMap = new Map();

  // 1. Facts
  const facts = await db
    .from('bn_eligibility_fact')
    .select('id, fact_key, label, data_type, sample_values, is_active, description')
    .eq('is_active', true);
  for (const f of facts.data ?? []) {
    if (!f.fact_key || map.has(f.fact_key)) continue;
    map.set(f.fact_key, {
      code: f.fact_key,
      source: 'FACT',
      refId: f.id,
      displayName: f.label ?? f.fact_key,
      dataType: f.data_type ?? null,
      unit: null,
      sampleValue: sampleFromArray(f.sample_values, f.fact_key),
      status: 'ACTIVE',
      description: f.description,
    });
  }

  // 2. Derived Facts (APPROVED only, in effective window)
  const derived = await db
    .from('bn_derived_fact')
    .select('id, code, display_name, data_type, unit, sample_value, status, effective_from, effective_to, description');
  for (const d of derived.data ?? []) {
    if (d.status !== 'APPROVED' || !isCurrent(d.effective_from, d.effective_to)) continue;
    if (map.has(d.code)) continue;
    map.set(d.code, {
      code: d.code,
      source: 'DERIVED_FACT',
      refId: d.id,
      displayName: d.display_name,
      dataType: d.data_type,
      unit: d.unit,
      sampleValue: d.sample_value !== null ? Number(d.sample_value) : null,
      status: d.status,
      description: d.description,
    });
  }

  // 3. Product Parameters (APPROVED only, in effective window)
  const params = await db
    .from('bn_product_parameter')
    .select('id, code, display_name, data_type, unit, default_value, status, effective_from, effective_to, description');
  for (const p of params.data ?? []) {
    if (p.status !== 'APPROVED' || !isCurrent(p.effective_from, p.effective_to)) continue;
    if (map.has(p.code)) continue;
    map.set(p.code, {
      code: p.code,
      source: 'PRODUCT_PARAMETER',
      refId: p.id,
      displayName: p.display_name,
      dataType: p.data_type,
      unit: p.unit,
      sampleValue: p.default_value !== null ? Number(p.default_value) : null,
      status: p.status,
      description: p.description,
    });
  }

  // 4. Prior Formula Results
  const formulas = await db
    .from('bn_formula_template')
    .select('id, template_code, template_name, output_variable, output_type, is_active');
  for (const f of formulas.data ?? []) {
    if (f.is_active === false) continue;
    const codes = [f.output_variable, f.template_code].filter(Boolean) as string[];
    for (const c of codes) {
      if (map.has(c)) continue;
      map.set(c, {
        code: c,
        source: 'PRIOR_RESULT',
        refId: f.id,
        displayName: f.template_name ?? c,
        dataType: (f.output_type ?? 'NUMBER').toLowerCase(),
        unit: null,
        sampleValue: null,
        status: 'ACTIVE',
      });
    }
  }

  return map;
}

export interface UnresolvedVariable {
  variable: string;
  reason: 'UNREGISTERED';
  suggestedSources: VariableSource[];
}

export function suggestSourcesFor(varName: string): VariableSource[] {
  const n = varName.toLowerCase();
  if (/(rate|pct|share|cap|amount|grant|max|min|weeks|days|years)$/.test(n)) {
    return ['PRODUCT_PARAMETER', 'DERIVED_FACT'];
  }
  if (/^(avg_|total_|paid_|credited_|deceased_|base_|extra_)/.test(n)) {
    return ['DERIVED_FACT', 'FACT'];
  }
  return ['DERIVED_FACT', 'PRODUCT_PARAMETER', 'FACT'];
}

export function classifyVariables(
  variables: string[],
  resolver: ResolverMap,
): { resolved: ResolvedVariable[]; unresolved: UnresolvedVariable[] } {
  const resolved: ResolvedVariable[] = [];
  const unresolved: UnresolvedVariable[] = [];
  for (const v of variables) {
    const r = resolver.get(v);
    if (r) resolved.push(r);
    else unresolved.push({ variable: v, reason: 'UNREGISTERED', suggestedSources: suggestSourcesFor(v) });
  }
  return { resolved, unresolved };
}

export function sampleValuesFromResolved(resolved: ResolvedVariable[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of resolved) if (typeof r.sampleValue === 'number') out[r.code] = r.sampleValue;
  return out;
}
