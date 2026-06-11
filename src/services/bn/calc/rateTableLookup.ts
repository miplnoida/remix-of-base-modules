/**
 * Rate-table / matrix lookup for BN Calculation Engine v2.
 *
 * Resolves bn_rate_table → dimensions → row using each dimension's match_type
 * (RANGE | EXACT | IN). Supports a pluggable provider so tests can run
 * without a database.
 */

import { supabase } from '@/integrations/supabase/client';

export interface RateTableHeader {
  id: string;
  table_code: string;
  table_type: string;
  lookup_mode: string;
  country_code: string;
  version_no: number;
  status: string;
}

export interface RateTableDimension {
  dimension_key: string;
  dimension_label: string;
  dimension_type: string;
  match_type: 'RANGE' | 'EXACT' | 'IN';
  sequence_no: number;
}

export interface RateTableRow {
  id: string;
  row_order: number;
  dimension_values_json: Record<string, unknown>;
  output_key: string | null;
  output_value: number | null;
  output_text: string | null;
  output_type: string;
  effective_from: string | null;
  effective_to: string | null;
}

export interface RateTableBundle {
  header: RateTableHeader;
  dimensions: RateTableDimension[];
  rows: RateTableRow[];
}

export interface LookupTraceEntry {
  table_code: string;
  inputs: Record<string, unknown>;
  matched_row_id: string | null;
  matched_row_order: number | null;
  output_key: string | null;
  output_value: number | string | null;
  output_type: string | null;
  reason?: string;
}

export type RateTableProvider = (tableCode: string) => Promise<RateTableBundle | null>;

/* ----------------------------- Default DB provider ----------------------------- */

const cache = new Map<string, RateTableBundle | null>();

export async function loadRateTable(tableCode: string): Promise<RateTableBundle | null> {
  if (cache.has(tableCode)) return cache.get(tableCode)!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: headers, error: hErr } = await sb
    .from('bn_rate_table')
    .select('id, table_code, table_type, lookup_mode, country_code, version_no, status')
    .eq('table_code', tableCode)
    .eq('status', 'ACTIVE')
    .order('version_no', { ascending: false })
    .limit(1);
  if (hErr) throw hErr;
  const header = (headers ?? [])[0] as RateTableHeader | undefined;
  if (!header) { cache.set(tableCode, null); return null; }
  const [{ data: dims, error: dErr }, { data: rows, error: rErr }] = await Promise.all([
    sb.from('bn_rate_table_dimension')
      .select('dimension_key, dimension_label, dimension_type, match_type, sequence_no')
      .eq('rate_table_id', header.id)
      .order('sequence_no'),
    sb.from('bn_rate_table_row')
      .select('id, row_order, dimension_values_json, output_key, output_value, output_text, output_type, effective_from, effective_to')
      .eq('rate_table_id', header.id)
      .order('row_order'),
  ]);
  if (dErr) throw dErr;
  if (rErr) throw rErr;
  const bundle: RateTableBundle = {
    header,
    dimensions: (dims ?? []) as RateTableDimension[],
    rows: (rows ?? []) as RateTableRow[],
  };
  cache.set(tableCode, bundle);
  return bundle;
}

export function clearRateTableCache(): void { cache.clear(); }

/* --------------------------------- Matcher --------------------------------- */

function matchDimension(
  dim: RateTableDimension,
  rowVal: unknown,
  inputVal: unknown,
): boolean {
  if (dim.match_type === 'EXACT') {
    if (rowVal == null) return false;
    return String(rowVal) === String(inputVal);
  }
  if (dim.match_type === 'IN') {
    if (!Array.isArray(rowVal)) return false;
    return rowVal.map(String).includes(String(inputVal));
  }
  // RANGE: rowVal can be {min, max}, {min}, {max}, or a single value
  const num = Number(inputVal);
  if (!Number.isFinite(num)) return false;
  if (rowVal && typeof rowVal === 'object' && !Array.isArray(rowVal)) {
    const r = rowVal as { min?: unknown; max?: unknown };
    const min = r.min == null ? -Infinity : Number(r.min);
    const max = r.max == null ? Infinity : Number(r.max);
    return num >= min && num <= max;
  }
  return Number(rowVal) === num;
}

export function findRow(
  bundle: RateTableBundle,
  inputs: Record<string, unknown>,
): RateTableRow | null {
  for (const row of bundle.rows) {
    let ok = true;
    for (const dim of bundle.dimensions) {
      const rowVal = row.dimension_values_json?.[dim.dimension_key];
      const inputVal = inputs[dim.dimension_key];
      if (!matchDimension(dim, rowVal, inputVal)) { ok = false; break; }
    }
    if (ok) return row;
  }
  return null;
}

export interface LookupResult {
  value: number | string | null;
  outputType: string | null;
  rowId: string | null;
  rowOrder: number | null;
  trace: LookupTraceEntry;
}

export async function lookupRate(
  tableCode: string,
  inputs: Record<string, unknown>,
  provider: RateTableProvider = loadRateTable,
): Promise<LookupResult> {
  const bundle = await provider(tableCode);
  if (!bundle) {
    return {
      value: null, outputType: null, rowId: null, rowOrder: null,
      trace: { table_code: tableCode, inputs, matched_row_id: null, matched_row_order: null,
        output_key: null, output_value: null, output_type: null, reason: 'TABLE_NOT_FOUND' },
    };
  }
  const row = findRow(bundle, inputs);
  if (!row) {
    return {
      value: null, outputType: null, rowId: null, rowOrder: null,
      trace: { table_code: tableCode, inputs, matched_row_id: null, matched_row_order: null,
        output_key: null, output_value: null, output_type: null, reason: 'NO_MATCH' },
    };
  }
  const value = row.output_value != null ? Number(row.output_value) : row.output_text;
  return {
    value, outputType: row.output_type, rowId: row.id, rowOrder: row.row_order,
    trace: {
      table_code: tableCode, inputs,
      matched_row_id: row.id, matched_row_order: row.row_order,
      output_key: row.output_key, output_value: value, output_type: row.output_type,
    },
  };
}

/** Matrix lookup is just rate lookup with multiple dimensions — same code path. */
export const lookupMatrix = lookupRate;
