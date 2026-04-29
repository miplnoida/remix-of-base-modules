/**
 * Centralized hooks for C3 config lifecycle: analyze + upsert with split
 * Used by all C3 config tabs (Period, Bonus, Holiday, Income Code, Levy)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SplitAnalysis } from '@/components/admin/c3-configuration/C3SplitConfirmDialog';

interface AnalyzeParams {
  tableName: string;
  id?: string | null;
  dateFrom: string;
  dateTo?: string | null;
  scopeFilter?: Record<string, string>;
}

interface UpsertWithSplitParams {
  tableName: string;
  id?: string | null;
  dateFrom: string;
  dateTo?: string | null;
  valuesJson: Record<string, any>;
  userCode?: string;
  forceSplit?: boolean;
}

export function useAnalyzeC3ConfigChange() {
  return useMutation({
    mutationKey: ['C3Config', 'c3_config_lifecycle', 'mutation'],
    mutationFn: async (params: AnalyzeParams): Promise<SplitAnalysis> => {
      const { data, error } = await supabase.rpc('analyze_c3_config_change', {
        p_table_name: params.tableName,
        p_id: params.id || null,
        p_date_from: params.dateFrom,
        p_date_to: params.dateTo || null,
        // jsonb param: pass plain object; supabase-js handles JSON encoding.
        // Pre-stringifying causes Postgres to receive a JSON string scalar,
        // breaking jsonb_each_text() inside the RPC.
        p_scope_filter: (params.scopeFilter ?? null) as any,
      });

      if (error) throw error;
      return data as unknown as SplitAnalysis;
    },
  });
}

export function useUpsertC3ConfigWithSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['C3Config', 'c3_config_lifecycle', 'mutation'],
    mutationFn: async (params: UpsertWithSplitParams) => {
      const { data, error } = await supabase.rpc('upsert_c3_config_with_split', {
        p_table_name: params.tableName,
        p_id: params.id || null,
        p_date_from: params.dateFrom,
        p_date_to: params.dateTo || null,
        // jsonb param: pass plain object (not stringified)
        p_values_json: (params.valuesJson ?? {}) as any,
        p_user_code: params.userCode || null,
        p_force_split: params.forceSplit ?? false,
      });

      if (error) throw error;

      const result = data as unknown as { error?: string; success?: boolean; id?: string; split?: boolean; new_id?: string };
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      queryClient.invalidateQueries({ queryKey: ['c3-sync-status'] });
    },
  });
}

export function useCreateC3ConfigPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['C3Config', 'c3_config_lifecycle', 'create'],
    mutationFn: async (params: {
      startDate: string;
      endDate?: string | null;
      description?: string;
      detailsJson: Record<string, any>;
      userCode?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_c3_config_period', {
        p_start_date: params.startDate,
        p_end_date: params.endDate || null,
        p_description: params.description || null,
        // jsonb param: pass plain object (not stringified)
        p_details_json: (params.detailsJson ?? {}) as any,
        p_user_code: params.userCode || null,
      });

      if (error) throw error;

      const result = data as unknown as { error?: string; success?: boolean; period_id?: string };
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      queryClient.invalidateQueries({ queryKey: ['c3-sync-status'] });
    },
  });
}
