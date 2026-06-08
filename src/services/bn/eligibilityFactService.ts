/**
 * Eligibility Fact service — registry of computable facts that rules reference.
 *
 * Facts are master configuration. CRUD lives here. Resolver code itself is
 * developer-owned; this UI only lets users *select* a registered resolver
 * function by name — never paste arbitrary code.
 */
import { supabase } from '@/integrations/supabase/client';
import { getRegisteredResolverNames } from './eligibility/eligibilityFactResolver';

export type FactDataType = 'number' | 'string' | 'boolean' | 'date' | 'list';
export type FactImplementationStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
export type FactSourceType =
  | 'DIRECT_FIELD'
  | 'DERIVED_AGGREGATE'
  | 'DOCUMENT_CHECK'
  | 'EXISTENCE_CHECK'
  | 'RESOLVER_ONLY';

export type WindowType = 'WEEKS' | 'MONTHS' | 'YEARS' | 'DAYS';

export const FACT_SOURCE_TYPES: FactSourceType[] = [
  'DIRECT_FIELD', 'DERIVED_AGGREGATE', 'DOCUMENT_CHECK', 'EXISTENCE_CHECK', 'RESOLVER_ONLY',
];

export const FACT_DATA_TYPES: FactDataType[] = ['number', 'string', 'boolean', 'date', 'list'];

export const FACT_IMPLEMENTATION_STATUSES: FactImplementationStatus[] =
  ['IMPLEMENTED', 'PARTIAL', 'NOT_IMPLEMENTED'];

export const WINDOW_TYPES: WindowType[] = ['WEEKS', 'MONTHS', 'YEARS', 'DAYS'];

/** Operators available when authoring a fact (mirrors rule catalogue). */
export const FACT_ALLOWED_OPERATORS = [
  'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_OR_EQUAL', 'LESS_THAN', 'LESS_OR_EQUAL',
  'BETWEEN', 'IN', 'NOT_IN', 'BOOLEAN', 'EXISTS', 'CONTAINS',
] as const;

export const FACT_CATEGORIES = [
  'AGE', 'CONTRIBUTION', 'EMPLOYMENT', 'MEDICAL', 'DEPENDENCY',
  'MEANS_TEST', 'INJURY', 'FUNERAL', 'MATERNITY', 'RESIDENCE', 'TIMING', 'IDENTITY', 'DOCUMENT',
] as const;

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

export type EligibilityFactInput = Omit<
  EligibilityFact,
  'id' | 'created_at' | 'updated_at'
> & { id?: string };

export async function listEligibilityFacts(): Promise<EligibilityFact[]> {
  const { data, error } = await (supabase as any)
    .from('bn_eligibility_fact')
    .select('*')
    .order('category', { ascending: true })
    .order('fact_key', { ascending: true });
  if (error) throw error;
  return (data || []) as EligibilityFact[];
}

export async function getEligibilityFactUsage(): Promise<Record<string, number>> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_catalogue')
    .select('fact_key')
    .not('fact_key', 'is', null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const r of (data as any[]) || []) {
    const k = r.fact_key as string;
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

function normalizeForDb(input: EligibilityFactInput): any {
  return {
    ...input,
    base_value_columns: input.base_value_columns ?? [],
    base_code_columns: input.base_code_columns ?? [],
    allowed_operators: input.allowed_operators ?? [],
    applicable_products: input.applicable_products ?? [],
  };
}

export async function createEligibilityFact(input: EligibilityFactInput, userCode: string): Promise<EligibilityFact> {
  const err = validateEligibilityFact(input);
  if (err) throw new Error(err);
  const payload = { ...normalizeForDb(input), created_by: userCode, updated_by: userCode };
  delete (payload as any).id;
  const { data, error } = await (supabase as any)
    .from('bn_eligibility_fact').insert(payload).select('*').single();
  if (error) throw error;
  return data as EligibilityFact;
}

export async function updateEligibilityFact(id: string, input: EligibilityFactInput, userCode: string): Promise<EligibilityFact> {
  const err = validateEligibilityFact(input);
  if (err) throw new Error(err);
  const payload = { ...normalizeForDb(input), updated_by: userCode };
  delete (payload as any).id;
  delete (payload as any).fact_key; // fact_key is immutable after create
  const { data, error } = await (supabase as any)
    .from('bn_eligibility_fact').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as EligibilityFact;
}

export async function upsertEligibilityFact(input: EligibilityFactInput, userCode: string): Promise<EligibilityFact> {
  return input.id ? updateEligibilityFact(input.id, input, userCode) : createEligibilityFact(input, userCode);
}

export async function cloneEligibilityFact(source: EligibilityFact, newFactKey: string, userCode: string): Promise<EligibilityFact> {
  const { id, created_at, updated_at, ...rest } = source;
  return createEligibilityFact({ ...(rest as any), fact_key: newFactKey, label: `${source.label} (copy)` }, userCode);
}

export async function deleteEligibilityFact(id: string, factKey: string): Promise<void> {
  const { count, error: usageErr } = await (supabase as any)
    .from('bn_rule_catalogue')
    .select('id', { count: 'exact', head: true })
    .eq('fact_key', factKey);
  if (usageErr) throw usageErr;
  if ((count ?? 0) > 0) {
    throw new Error(`Fact is used by ${count} rule(s). Deactivate instead of deleting.`);
  }
  const { error } = await (supabase as any).from('bn_eligibility_fact').delete().eq('id', id);
  if (error) throw error;
}

export async function setEligibilityFactActive(id: string, isActive: boolean, userCode: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('bn_eligibility_fact')
    .update({ is_active: isActive, updated_by: userCode })
    .eq('id', id);
  if (error) throw error;
}

/** Metadata validation — no claim context needed. */
export function validateEligibilityFact(input: Partial<EligibilityFactInput>): string | null {
  if (!input.fact_key?.trim()) return 'Fact key is required';
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(input.fact_key))
    return 'Fact key must be lowercase dot notation (e.g. contribution.weeks_last_13)';
  if (!input.label?.trim()) return 'Label is required';
  if (!input.category?.trim()) return 'Category is required';
  if (!input.source_type) return 'Source type is required';
  if (!input.data_type) return 'Data type is required';
  if (!input.allowed_operators?.length) return 'At least one allowed operator is required';

  const status = input.implementation_status ?? 'NOT_IMPLEMENTED';
  const registered = new Set(getRegisteredResolverNames());

  switch (input.source_type) {
    case 'DIRECT_FIELD':
      if (!input.source_table) return 'DIRECT_FIELD requires source table';
      if (!input.source_column) return 'DIRECT_FIELD requires source column';
      break;
    case 'DERIVED_AGGREGATE':
      if (!input.base_table) return 'DERIVED_AGGREGATE requires base table';
      if (!input.base_date_column) return 'DERIVED_AGGREGATE requires base date column';
      if (!input.output_table) return 'DERIVED_AGGREGATE requires output table';
      if (!input.output_column) return 'DERIVED_AGGREGATE requires output column';
      if (!input.output_json_key) return 'DERIVED_AGGREGATE requires output JSON key';
      if (!input.snapshot_builder) return 'DERIVED_AGGREGATE requires a snapshot builder';
      break;
    case 'DOCUMENT_CHECK':
    case 'EXISTENCE_CHECK':
      if (!input.source_table) return `${input.source_type} requires source table`;
      if (!input.resolver_function) return `${input.source_type} requires a resolver function`;
      break;
    case 'RESOLVER_ONLY':
      if (!input.resolver_function) return 'RESOLVER_ONLY requires a resolver function';
      break;
  }

  if ((status === 'IMPLEMENTED' || status === 'PARTIAL') && !input.resolver_function) {
    return 'IMPLEMENTED/PARTIAL facts require a resolver function';
  }
  if (input.resolver_function && !registered.has(input.resolver_function) && status === 'IMPLEMENTED') {
    return `Resolver "${input.resolver_function}" is not registered in code`;
  }
  return null;
}

export function isResolverRegistered(name: string | null | undefined): boolean {
  if (!name) return false;
  return new Set(getRegisteredResolverNames()).has(name);
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

export function emptyFactInput(): EligibilityFactInput {
  return {
    fact_key: '', label: '', category: 'CONTRIBUTION', description: '',
    source_type: 'DIRECT_FIELD', source_table: null, source_column: null,
    resolver_function: null, data_type: 'number',
    allowed_operators: ['EQUALS'], applicable_products: [],
    example_value: null, implementation_status: 'NOT_IMPLEMENTED',
    requires_snapshot: false, requires_claim_context: false,
    requires_ssn: false, requires_deceased_ssn: false,
    base_table: null, base_date_column: null,
    base_value_columns: [], base_code_columns: [],
    window_type: null, window_size: null, window_anchor: null, count_logic: null,
    output_table: null, output_column: null, output_json_key: null, snapshot_builder: null,
    is_active: true,
  };
}
