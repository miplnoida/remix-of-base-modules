import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FilingConfigPeriod, FilingConfigAnalysis } from '@/types/filingConfigPeriod';
import { toast } from 'sonner';

const QUERY_KEY = ['filing-config-periods'];

export function useFilingConfigPeriods() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<FilingConfigPeriod[]> => {
      const { data, error } = await supabase
        .from('c3_filing_config_periods')
        .select('*')
        .order('date_from', { ascending: false });

      if (error) throw error;
      return data as unknown as FilingConfigPeriod[];
    },
  });
}

export function useAnalyzeFilingConfigChange() {
  return useMutation({
    mutationFn: async (params: {
      id?: string;
      date_from: string;
      date_to: string | null;
      week_start_day: number;
      filing_window_unit: number;
      filing_window_value: number;
      penalty_initial_threshold: number;
      penalty_subsequent_threshold: number;
    }): Promise<FilingConfigAnalysis> => {
      const { data, error } = await supabase.rpc('analyze_filing_config_change', {
        p_id: params.id || null,
        p_date_from: params.date_from,
        p_date_to: params.date_to,
        p_week_start_day: params.week_start_day,
        p_filing_window_unit: params.filing_window_unit,
        p_filing_window_value: params.filing_window_value,
        p_penalty_initial_threshold: params.penalty_initial_threshold,
        p_penalty_subsequent_threshold: params.penalty_subsequent_threshold,
      });

      if (error) throw error;
      return data as unknown as FilingConfigAnalysis;
    },
  });
}

export function useUpsertFilingConfigPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      date_from: string;
      date_to: string | null;
      week_start_day: number;
      filing_window_unit: number;
      filing_window_value: number;
      penalty_initial_threshold: number;
      penalty_subsequent_threshold: number;
      is_active?: boolean;
      user_code?: string;
      force_split?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('upsert_filing_config_period', {
        p_id: params.id || null,
        p_date_from: params.date_from,
        p_date_to: params.date_to,
        p_week_start_day: params.week_start_day,
        p_filing_window_unit: params.filing_window_unit,
        p_filing_window_value: params.filing_window_value,
        p_penalty_initial_threshold: params.penalty_initial_threshold,
        p_penalty_subsequent_threshold: params.penalty_subsequent_threshold,
        p_is_active: params.is_active ?? true,
        p_user_code: params.user_code || null,
        p_force_split: params.force_split ?? false,
      });

      if (error) throw error;

      const result = data as unknown as { error?: string; success?: boolean; id?: string; split?: boolean };
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (result.split) {
        toast.success('Configuration split successfully. Historical data preserved, new period created.');
      } else {
        toast.success('Filing configuration period saved successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save filing configuration period');
    },
  });
}

export function useDeactivateFilingConfigPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, user_code }: { id: string; user_code?: string }) => {
      const { error } = await supabase
        .from('c3_filing_config_periods')
        .update({ is_active: false, updated_by: user_code || null, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Filing configuration period deactivated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to deactivate period');
    },
  });
}
