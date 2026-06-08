/**
 * Eligibility Fact service — registry of computable facts that rules reference.
 */
import { supabase } from '@/integrations/supabase/client';

export type FactDataType = 'number' | 'string' | 'boolean' | 'date' | 'list';
export type FactImplementationStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
export type FactSourceType =
  | 'DIRECT_FIELD'
  | 'DERIVED_AGGREGATE'
  | 'DOCUMENT_CHECK'
  | 'EXISTENCE_CHECK'
  | 'RESOLVER_ONLY';

export type WindowType = 'WEEKS' | 'MONTHS' | 'YEARS' | 'DAYS';

export interface EligibilityFact {
  id: string;
  fact_key: string;
  label: string;
  category: string;
  description: string | null;
  source_type: FactSourceType;
  source_table: string | null;
  source_column: string | null;
  resolver_function: string | null;
  data_type: FactDataType;
  allowed_operators: string[];
  applicable_products: string[];
  example_value: string | null;
  implementation_status: FactImplementationStatus;
  requires_snapshot: boolean;
  requires_claim_context: boolean;
  requires_ssn: boolean;
  requires_deceased_ssn: boolean;
  // Derivation metadata (DERIVED_AGGREGATE)
  base_table: string | null;
  base_date_column: string | null;
  base_value_columns: string[];
  base_code_columns: string[];
  window_type: WindowType | null;
  window_size: number | null;
  window_anchor: string | null;
  count_logic: string | null;
  output_table: string | null;
  output_column: string | null;
  output_json_key: string | null;
  snapshot_builder: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listEligibilityFacts(): Promise<EligibilityFact[]> {
  const { data, error } = await (supabase as any)
    .from('bn_eligibility_fact')
    .select('*')
    .order('category', { ascending: true })
    .order('fact_key', { ascending: true });
  if (error) throw error;
  return (data || []) as EligibilityFact[];
}

export function statusBadgeVariant(s: FactImplementationStatus): 'default' | 'secondary' | 'destructive' {
  if (s === 'IMPLEMENTED') return 'default';
  if (s === 'PARTIAL') return 'secondary';
  return 'destructive';
}

export function sourceTypeBadgeVariant(t: FactSourceType): 'default' | 'secondary' | 'outline' {
  if (t === 'DERIVED_AGGREGATE') return 'secondary';
  if (t === 'RESOLVER_ONLY') return 'outline';
  return 'default';
}

/** Human-readable summary of where a fact's value comes from. */
export function describeFactSource(f: EligibilityFact): string {
  switch (f.source_type) {
    case 'DERIVED_AGGREGATE': {
      const base = f.base_table
        ? `${f.base_table}${f.base_date_column ? '.' + f.base_date_column : ''}${f.base_value_columns?.length ? ' + ' + f.base_value_columns.join(',') : ''}`
        : '—';
      const out = f.output_table
        ? `${f.output_table}.${f.output_column}${f.output_json_key ? '.' + f.output_json_key : ''}`
        : '—';
      return `Base: ${base} → Output: ${out}`;
    }
    case 'DOCUMENT_CHECK':
      return `Checks ${f.source_table ?? 'bn_claim_document'}${f.source_column ? '.' + f.source_column : ''}`;
    case 'EXISTENCE_CHECK':
      return `Existence in ${f.source_table ?? '—'}`;
    case 'RESOLVER_ONLY':
      return f.resolver_function ? `Resolver: ${f.resolver_function}` : 'Resolver only';
    case 'DIRECT_FIELD':
    default:
      return f.source_table ? `${f.source_table}${f.source_column ? '.' + f.source_column : ''}` : '—';
  }
}
