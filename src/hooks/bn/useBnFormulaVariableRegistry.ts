/**
 * useBnFormulaVariableRegistry — reads the seeded bn_formula_variable_registry
 * table so Calculation Builder, Formula Library and the simulator can share a
 * single source of truth for variable labels, units, source_type and
 * sample values (no more hard-coded SAMPLE_INPUTS in component code).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BnFormulaVariableRow {
  id: string;
  variable_code: string;
  display_name: string;
  description: string | null;
  category: string | null;
  source_type: string | null;
  source_path: string | null;
  data_type: string | null;
  unit: string | null;
  sample_value: number | null;
  is_active: boolean;
}

export function useBnFormulaVariableRegistry() {
  return useQuery({
    queryKey: ['bn', 'formula-variable-registry'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BnFormulaVariableRow[]> => {
      const { data, error } = await (supabase as any)
        .from('bn_formula_variable_registry')
        .select('id, variable_code, display_name, description, category, source_type, source_path, data_type, unit, sample_value, is_active')
        .eq('is_active', true)
        .order('category')
        .order('variable_code');
      if (error) throw error;
      return (data ?? []) as BnFormulaVariableRow[];
    },
  });
}

/** Build a `{ variable_code: sample_value }` map for quick formula evaluation. */
export function buildSampleMap(rows: BnFormulaVariableRow[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows ?? []) {
    if (typeof r.sample_value === 'number') out[r.variable_code] = Number(r.sample_value);
  }
  return out;
}

/** Build a `{ variable_code: display_name }` map for label rendering. */
export function buildLabelMap(rows: BnFormulaVariableRow[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows ?? []) out[r.variable_code] = r.display_name;
  return out;
}
