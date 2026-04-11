import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface LedgerEntry {
  entry_id: string;
  posted_at: string;
  period: string;
  fund_type: string;
  entry_type: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  status: string;
  reference_type: string | null;
  reference_id: string | null;
  reversal_of_id: string | null;
  reversal_reason: string | null;
  posted_by: string;
}

export interface ArrearsBreakdown {
  fund_type: string;
  principal_due: number;
  penalties: number;
  interest: number;
  payments: number;
  waivers: number;
  adjustments: number;
  write_offs: number;
  net_balance: number;
  period_count: number;
}

export interface LedgerPeriod {
  id: string;
  employer_id: string;
  period: string;
  fund_type: string;
  principal_due: number;
  penalties: number;
  interest: number;
  payments: number;
  waivers: number;
  adjustments: number;
  write_offs: number;
  balance: number;
  entry_count: number;
  last_recalculated_at: string;
}

// Hook: Get employer statement (ledger entries)
export function useEmployerStatement(
  employerId: string | undefined,
  fromPeriod?: string,
  toPeriod?: string,
  fundType?: string
) {
  return useQuery({
    queryKey: ['ce_employer_statement', employerId, fromPeriod, toPeriod, fundType],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase.rpc('ce_generate_employer_statement', {
        p_employer_id: employerId,
        p_from_period: fromPeriod || null,
        p_to_period: toPeriod || null,
        p_fund_type: (fundType || null) as any,
      });
      if (error) throw error;
      return (data || []) as LedgerEntry[];
    },
    enabled: !!employerId,
  });
}

// Hook: Get employer arrears breakdown
export function useEmployerArrears(employerId: string | undefined) {
  return useQuery({
    queryKey: ['ce_employer_arrears', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase.rpc('ce_calculate_employer_arrears', {
        p_employer_id: employerId,
      });
      if (error) throw error;
      return (data || []) as ArrearsBreakdown[];
    },
    enabled: !!employerId,
  });
}

// Hook: Get ledger periods
export function useLedgerPeriods(employerId?: string) {
  return useQuery({
    queryKey: ['ce_ledger_periods', employerId],
    queryFn: async () => {
      let query = supabase
        .from('ce_ledger_periods')
        .select('*')
        .order('period', { ascending: false });

      if (employerId) {
        query = query.eq('employer_id', employerId);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as LedgerPeriod[];
    },
  });
}

// Hook: Get all ledger entries (for admin)
export function useLedgerEntries(filters?: {
  employerId?: string;
  fundType?: string;
  entryType?: string;
  status?: string;
  period?: string;
}) {
  return useQuery({
    queryKey: ['ce_ledger_entries', filters],
    queryFn: async () => {
      let query = supabase
        .from('ce_employer_financial_ledger')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(500);

      if (filters?.employerId) query = query.eq('employer_id', filters.employerId);
      if (filters?.fundType) query = query.eq('fund_type', filters.fundType as any);
      if (filters?.entryType) query = query.eq('entry_type', filters.entryType as any);
      if (filters?.status) query = query.eq('status', filters.status as any);
      if (filters?.period) query = query.eq('period', filters.period);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Mutation: Post ledger entry
export function usePostLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      employer_id: string;
      employer_name?: string;
      territory?: string;
      entry_type: string;
      fund_type: string;
      period: string;
      amount: number;
      description: string;
      reference_type?: string;
      reference_id?: string;
      idempotency_key?: string;
      posted_by: string;
    }) => {
      const { data, error } = await supabase.rpc('ce_post_ledger_entry', {
        p_employer_id: params.employer_id,
        p_employer_name: params.employer_name || null,
        p_territory: params.territory || null,
        p_entry_type: params.entry_type as any,
        p_fund_type: params.fund_type as any,
        p_period: params.period,
        p_amount: params.amount,
        p_description: params.description,
        p_reference_type: params.reference_type || null,
        p_reference_id: params.reference_id || null,
        p_idempotency_key: params.idempotency_key || null,
        p_posted_by: params.posted_by,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_employer_statement'] });
      queryClient.invalidateQueries({ queryKey: ['ce_employer_arrears'] });
      queryClient.invalidateQueries({ queryKey: ['ce_ledger_periods'] });
      queryClient.invalidateQueries({ queryKey: ['ce_ledger_entries'] });
      toast.success('Ledger entry posted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to post ledger entry', { description: error.message });
    },
  });
}

// Mutation: Reverse ledger entry
export function useReverseLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      original_entry_id: string;
      reversal_reason: string;
      reversed_by: string;
    }) => {
      const { data, error } = await supabase.rpc('ce_reverse_ledger_entry', {
        p_original_entry_id: params.original_entry_id,
        p_reversal_reason: params.reversal_reason,
        p_reversed_by: params.reversed_by,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_employer_statement'] });
      queryClient.invalidateQueries({ queryKey: ['ce_employer_arrears'] });
      queryClient.invalidateQueries({ queryKey: ['ce_ledger_periods'] });
      queryClient.invalidateQueries({ queryKey: ['ce_ledger_entries'] });
      toast.success('Entry reversed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to reverse entry', { description: error.message });
    },
  });
}

// Mutation: Trigger automation job
export function useTriggerAutomationJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      functionName: string;
      body: Record<string, any>;
    }) => {
      const { data, error } = await supabase.functions.invoke(params.functionName, {
        body: params.body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ce_automation_runs'] });
      toast.success(`Job ${variables.functionName} triggered successfully`);
    },
    onError: (error: any) => {
      toast.error('Failed to trigger job', { description: error.message });
    },
  });
}
