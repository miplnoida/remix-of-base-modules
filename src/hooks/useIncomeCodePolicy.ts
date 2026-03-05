import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { IncomeCode, IncomeCodePolicyDefault, IncomeCodePolicyException } from '@/types/incomeCodePolicy';

// ---- Income Codes ----
export function useIncomeCodes(activeOnly = false) {
  return useQuery({
    queryKey: ['tb_income_codes', activeOnly],
    queryFn: async (): Promise<IncomeCode[]> => {
      let query = (supabase as any).from('tb_income_codes').select('*').order('code');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as IncomeCode[];
    },
  });
}

export function useCreateIncomeCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, description, userCode }: { code: string; description: string; userCode?: string }) => {
      const { error } = await (supabase as any).from('tb_income_codes').insert({
        code: code.trim().toUpperCase(),
        description: description.trim(),
        created_by: userCode || null,
        updated_by: userCode || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tb_income_codes'] });
      toast.success('Income code created');
    },
    onError: (e: Error) => toast.error('Save failed: ' + e.message),
  });
}

export function useUpdateIncomeCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, code, description, is_active, userCode }: { id: string; code: string; description: string; is_active: boolean; userCode?: string }) => {
      const { error } = await (supabase as any).from('tb_income_codes').update({
        code: code.trim().toUpperCase(),
        description: description.trim(),
        is_active,
        updated_by: userCode || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tb_income_codes'] });
      toast.success('Income code updated');
    },
    onError: (e: Error) => toast.error('Update failed: ' + e.message),
  });
}

export function useDeleteIncomeCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Hard delete – consistent with existing master data pattern (IncomeCategoryManagement)
      const { error } = await (supabase as any).from('tb_income_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tb_income_codes'] });
      toast.success('Income code deleted');
    },
    onError: (e: Error) => toast.error('Delete failed: ' + e.message),
  });
}

// ---- Income Code Policy Defaults ----
export function useIncomeCodePolicyDefaults(incomeCodeId?: string) {
  return useQuery({
    queryKey: ['income-code-policy-defaults', incomeCodeId],
    queryFn: async (): Promise<IncomeCodePolicyDefault[]> => {
      let query = (supabase as any).from('c3_income_code_policy_default').select('*').order('date_from', { ascending: false });
      if (incomeCodeId) query = query.eq('income_code_id', incomeCodeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as IncomeCodePolicyDefault[];
    },
    enabled: !!incomeCodeId,
  });
}

export function useCreateIncomeCodePolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ policy, userCode }: { policy: Omit<IncomeCodePolicyDefault, 'id' | 'created_on' | 'modified_on'>; userCode?: string }) => {
      const { error } = await (supabase as any).from('c3_income_code_policy_default').insert({
        ...policy,
        created_by: userCode || null,
        modified_by: userCode || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-code-policy-defaults'] });
      toast.success('Income code policy created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateIncomeCodePolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, userCode }: { id: string; updates: Partial<IncomeCodePolicyDefault>; userCode?: string }) => {
      const { error } = await (supabase as any).from('c3_income_code_policy_default').update({
        ...updates,
        modified_by: userCode || null,
        modified_on: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-code-policy-defaults'] });
      toast.success('Income code policy updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteIncomeCodePolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('c3_income_code_policy_default').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-code-policy-defaults'] });
      toast.success('Policy deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Income Code Policy Exceptions ----
export function useIncomeCodePolicyExceptions(incomeCodeId?: string) {
  return useQuery({
    queryKey: ['income-code-policy-exceptions', incomeCodeId],
    queryFn: async (): Promise<IncomeCodePolicyException[]> => {
      let query = (supabase as any).from('c3_income_code_policy_exceptions').select('*').order('date_from', { ascending: false });
      if (incomeCodeId) query = query.eq('income_code_id', incomeCodeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as IncomeCodePolicyException[];
    },
    enabled: !!incomeCodeId,
  });
}

export function useCreateIncomeCodePolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ exception, userCode }: { exception: Omit<IncomeCodePolicyException, 'id' | 'created_on' | 'modified_on'>; userCode?: string }) => {
      const { error } = await (supabase as any).from('c3_income_code_policy_exceptions').insert({
        ...exception,
        created_by: userCode || null,
        modified_by: userCode || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-code-policy-exceptions'] });
      toast.success('Exception created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateIncomeCodePolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, userCode }: { id: string; updates: Partial<IncomeCodePolicyException>; userCode?: string }) => {
      const { error } = await (supabase as any).from('c3_income_code_policy_exceptions').update({
        ...updates,
        modified_by: userCode || null,
        modified_on: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-code-policy-exceptions'] });
      toast.success('Exception updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteIncomeCodePolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('c3_income_code_policy_exceptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-code-policy-exceptions'] });
      toast.success('Exception deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Overlap detection ----
export function checkDateOverlap(
  dateFrom: string,
  dateTo: string | null,
  existingRecords: Array<{ id: string; date_from: string; date_to: string | null; policy_type?: string }>,
  excludeId?: string,
  policyType?: string
): { overlaps: boolean; overlappingRecord?: { id: string; date_from: string; date_to: string | null } } {
  const newFrom = new Date(dateFrom).getTime();
  const newTo = dateTo ? new Date(dateTo).getTime() : Infinity;

  for (const rec of existingRecords) {
    if (excludeId && rec.id === excludeId) continue;
    if (policyType && rec.policy_type && rec.policy_type !== policyType) continue;
    const exFrom = new Date(rec.date_from).getTime();
    const exTo = rec.date_to ? new Date(rec.date_to).getTime() : Infinity;
    if (newFrom <= exTo && newTo >= exFrom) {
      return { overlaps: true, overlappingRecord: rec };
    }
  }
  return { overlaps: false };
}
