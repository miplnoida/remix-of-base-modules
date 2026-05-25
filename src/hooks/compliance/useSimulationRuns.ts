import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import type { SimulationOutput, SimulationFactContext } from '@/services/complianceSimulatorEngine';

export interface SaveSimulationRunInput {
  ruleCode?: string | null;
  ruleType?: 'detection' | 'calculation' | 'escalation' | 'all';
  employerRegno?: string | null;
  period?: string | null;
  facts: SimulationFactContext;
  output: SimulationOutput;
  notes?: string;
}

export function useSaveSimulationRun() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async (input: SaveSimulationRunInput) => {
      const status: 'completed' | 'partial' | 'failed' =
        input.output.errors.length > 0
          ? 'failed'
          : input.output.missingData.length > 0
          ? 'partial'
          : 'completed';
      const { error } = await supabase.from('ce_rule_simulation_runs').insert({
        rule_code: input.ruleCode ?? null,
        rule_type: input.ruleType ?? 'all',
        employer_regno: input.employerRegno ?? null,
        period: input.period ?? null,
        simulation_context: input.facts as any,
        result: input.output as any,
        status,
        notes: input.notes ?? null,
        executed_by: userCode || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ce_rule_simulation_runs'] }),
  });
}
