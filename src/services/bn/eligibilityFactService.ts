/**
 * Eligibility Fact service — registry of computable facts that rules reference.
 */
import { supabase } from '@/integrations/supabase/client';

export type FactDataType = 'number' | 'string' | 'boolean' | 'date' | 'list';
export type FactImplementationStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED';

export interface EligibilityFact {
  id: string;
  fact_key: string;
  label: string;
  category: string;
  description: string | null;
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
