/**
 * rateTableDimensionSources — loads candidate dimension fields from the
 * various BN registries (Facts, Derived Facts, Product Parameters, Data Field
 * Registry filtered for Claim/Medical/Beneficiary). Used by the Rate Table
 * dimension picker so business users never type physical column names.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type DimensionSourceKind =
  | 'FACT'
  | 'DERIVED_FACT'
  | 'PRODUCT_PARAMETER'
  | 'CLAIM_FIELD'
  | 'MEDICAL_FIELD'
  | 'BENEFICIARY_FIELD';

export interface DimensionSourceItem {
  kind: DimensionSourceKind;
  dimension_key: string;
  label: string;
  dimension_type: DimensionType;
  /** Match types that are valid for this data type. */
  allowed_match_types: MatchType[];
  hint?: string;
}

export type DimensionType =
  | 'NUMBER' | 'AMOUNT' | 'PERCENT' | 'DATE' | 'TEXT' | 'ENUM' | 'BOOLEAN';
export type MatchType = 'RANGE' | 'EXACT' | 'IN';

export const DIMENSION_TYPES: DimensionType[] = [
  'NUMBER', 'AMOUNT', 'PERCENT', 'DATE', 'TEXT', 'ENUM', 'BOOLEAN',
];

export function matchTypesFor(dt: DimensionType): MatchType[] {
  switch (dt) {
    case 'NUMBER':
    case 'AMOUNT':
    case 'PERCENT':
    case 'DATE':
      return ['RANGE', 'EXACT'];
    case 'ENUM':
      return ['EXACT', 'IN'];
    case 'TEXT':
      return ['EXACT', 'IN'];
    case 'BOOLEAN':
      return ['EXACT'];
    default:
      return ['EXACT'];
  }
}

/** Normalize free-form registry data_type strings into our 7 canonical types. */
export function normalizeDataType(raw?: string | null, key?: string): DimensionType {
  const v = (raw ?? '').toLowerCase().trim();
  const k = (key ?? '').toLowerCase();
  if (/percent|pct|rate$/.test(v) || /percent|_pct|_rate$/.test(k)) return 'PERCENT';
  if (/amount|money|currency|numeric|decimal/.test(v) || /amount|amt|salary|wage/.test(k)) return 'AMOUNT';
  if (/int|num|float|double|number/.test(v)) return 'NUMBER';
  if (/date|time/.test(v)) return 'DATE';
  if (/bool/.test(v)) return 'BOOLEAN';
  if (/enum|code|category|status|type/.test(v) || /_code$|_type$|_status$|_category$/.test(k)) return 'ENUM';
  return 'TEXT';
}

async function loadFacts(): Promise<DimensionSourceItem[]> {
  const { data } = await db.from('bn_eligibility_fact')
    .select('fact_key,label,data_type,description')
    .eq('is_active', true).order('fact_key').limit(1000);
  return (data ?? []).map((r: any) => {
    const dt = normalizeDataType(r.data_type, r.fact_key);
    return {
      kind: 'FACT' as const,
      dimension_key: r.fact_key,
      label: r.label ?? r.fact_key,
      dimension_type: dt,
      allowed_match_types: matchTypesFor(dt),
      hint: r.description ?? undefined,
    };
  });
}

async function loadDerivedFacts(): Promise<DimensionSourceItem[]> {
  const { data } = await db.from('bn_derived_fact')
    .select('code,display_name,data_type,description,status')
    .order('code').limit(1000);
  return (data ?? []).filter((r: any) => r.status !== 'RETIRED').map((r: any) => {
    const dt = normalizeDataType(r.data_type, r.code);
    return {
      kind: 'DERIVED_FACT' as const,
      dimension_key: r.code,
      label: r.display_name ?? r.code,
      dimension_type: dt,
      allowed_match_types: matchTypesFor(dt),
      hint: r.description ?? undefined,
    };
  });
}

async function loadProductParameters(): Promise<DimensionSourceItem[]> {
  const { data } = await db.from('bn_product_parameter')
    .select('code,display_name,data_type,description')
    .order('code').limit(1000);
  // dedupe by code (parameters repeat across products/versions)
  const seen = new Set<string>();
  const out: DimensionSourceItem[] = [];
  for (const r of (data ?? []) as any[]) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    const dt = normalizeDataType(r.data_type, r.code);
    out.push({
      kind: 'PRODUCT_PARAMETER',
      dimension_key: r.code,
      label: r.display_name ?? r.code,
      dimension_type: dt,
      allowed_match_types: matchTypesFor(dt),
      hint: r.description ?? undefined,
    });
  }
  return out;
}

async function loadFieldRegistry(tablePrefixes: string[]): Promise<any[]> {
  const { data } = await db.from('bn_data_field_registry')
    .select('table_name,column_name,display_name,data_type')
    .eq('active', true).order('table_name').limit(1000);
  return (data ?? []).filter((r: any) =>
    tablePrefixes.some((p) => r.table_name?.startsWith(p)),
  );
}

async function loadClaimFields(): Promise<DimensionSourceItem[]> {
  const rows = await loadFieldRegistry(['bn_claim']);
  return rows
    .filter((r) => !r.table_name.includes('award') && !r.table_name.includes('beneficiary'))
    .map((r) => {
      const dt = normalizeDataType(r.data_type, r.column_name);
      return {
        kind: 'CLAIM_FIELD' as const,
        dimension_key: r.column_name,
        label: r.display_name ?? r.column_name,
        dimension_type: dt,
        allowed_match_types: matchTypesFor(dt),
        hint: r.table_name,
      };
    });
}

async function loadMedicalFields(): Promise<DimensionSourceItem[]> {
  const rows = await loadFieldRegistry(['bn_medical']);
  return rows.map((r) => {
    const dt = normalizeDataType(r.data_type, r.column_name);
    return {
      kind: 'MEDICAL_FIELD' as const,
      dimension_key: r.column_name,
      label: r.display_name ?? r.column_name,
      dimension_type: dt,
      allowed_match_types: matchTypesFor(dt),
      hint: r.table_name,
    };
  });
}

async function loadBeneficiaryFields(): Promise<DimensionSourceItem[]> {
  const rows = await loadFieldRegistry(['bn_award']);
  return rows.map((r) => {
    const dt = normalizeDataType(r.data_type, r.column_name);
    return {
      kind: 'BENEFICIARY_FIELD' as const,
      dimension_key: r.column_name,
      label: r.display_name ?? r.column_name,
      dimension_type: dt,
      allowed_match_types: matchTypesFor(dt),
      hint: r.table_name,
    };
  });
}

export async function loadDimensionSource(kind: DimensionSourceKind): Promise<DimensionSourceItem[]> {
  switch (kind) {
    case 'FACT': return loadFacts();
    case 'DERIVED_FACT': return loadDerivedFacts();
    case 'PRODUCT_PARAMETER': return loadProductParameters();
    case 'CLAIM_FIELD': return loadClaimFields();
    case 'MEDICAL_FIELD': return loadMedicalFields();
    case 'BENEFICIARY_FIELD': return loadBeneficiaryFields();
  }
}

export const DIMENSION_SOURCE_LABELS: Record<DimensionSourceKind, string> = {
  FACT: 'Fact Registry',
  DERIVED_FACT: 'Derived Fact Registry',
  PRODUCT_PARAMETER: 'Product Parameter',
  CLAIM_FIELD: 'Claim Field',
  MEDICAL_FIELD: 'Medical Field',
  BENEFICIARY_FIELD: 'Beneficiary Field',
};
