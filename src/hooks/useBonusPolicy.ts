import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BonusPolicyDefault, BonusPolicyException } from '@/types/bonusPolicy';

// ---- Default Policies (now multiple) ----
export function useBonusPolicyDefaults() {
  return useQuery({
    queryKey: ['bonus-policy-defaults'],
    queryFn: async (): Promise<BonusPolicyDefault[]> => {
      const { data, error } = await supabase
        .from('c3_bonus_policy_default')
        .select('*')
        .order('date_from', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BonusPolicyDefault[];
    },
  });
}

// Keep single-policy hook for backward compat (returns first active/current)
export function useBonusPolicyDefault() {
  return useQuery({
    queryKey: ['bonus-policy-default'],
    queryFn: async (): Promise<BonusPolicyDefault | null> => {
      const { data, error } = await supabase
        .from('c3_bonus_policy_default')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BonusPolicyDefault | null;
    },
  });
}

export function useCreateBonusPolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ policy, userCode }: { policy: Omit<BonusPolicyDefault, 'id' | 'created_on' | 'modified_on'>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_bonus_policy_default')
        .insert({ ...policy, created_by: userCode || null, modified_by: userCode || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bonus-policy-defaults'] });
      qc.invalidateQueries({ queryKey: ['bonus-policy-default'] });
      toast.success('Bonus policy created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBonusPolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, userCode }: { id: string; updates: Partial<BonusPolicyDefault>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_bonus_policy_default')
        .update({ ...updates, modified_by: userCode || null, modified_on: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bonus-policy-defaults'] });
      qc.invalidateQueries({ queryKey: ['bonus-policy-default'] });
      toast.success('Bonus policy saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBonusPolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('c3_bonus_policy_default')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bonus-policy-defaults'] });
      qc.invalidateQueries({ queryKey: ['bonus-policy-default'] });
      toast.success('Bonus policy deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Exceptions ----
export function useBonusPolicyExceptions() {
  return useQuery({
    queryKey: ['bonus-policy-exceptions'],
    queryFn: async (): Promise<BonusPolicyException[]> => {
      const { data, error } = await supabase
        .from('c3_bonus_policy_exceptions')
        .select('*')
        .order('date_from', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BonusPolicyException[];
    },
  });
}

export function useCreateBonusPolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ exception, userCode }: { exception: Omit<BonusPolicyException, 'id' | 'created_on' | 'modified_on'>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_bonus_policy_exceptions')
        .insert({ ...exception, created_by: userCode || null, modified_by: userCode || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bonus-policy-exceptions'] });
      toast.success('Exception created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBonusPolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, userCode }: { id: string; updates: Partial<BonusPolicyException>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_bonus_policy_exceptions')
        .update({ ...updates, modified_by: userCode || null, modified_on: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bonus-policy-exceptions'] });
      toast.success('Exception updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBonusPolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('c3_bonus_policy_exceptions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bonus-policy-exceptions'] });
      toast.success('Exception deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Overlap detection utility ----
export function checkDateOverlap(
  dateFrom: string,
  dateTo: string | null,
  existingRecords: Array<{ id: string; date_from: string; date_to: string | null }>,
  excludeId?: string
): { overlaps: boolean; overlappingRecord?: { id: string; date_from: string; date_to: string | null } } {
  const newFrom = new Date(dateFrom).getTime();
  const newTo = dateTo ? new Date(dateTo).getTime() : Infinity;

  for (const rec of existingRecords) {
    if (excludeId && rec.id === excludeId) continue;
    const exFrom = new Date(rec.date_from).getTime();
    const exTo = rec.date_to ? new Date(rec.date_to).getTime() : Infinity;

    if (newFrom <= exTo && newTo >= exFrom) {
      return { overlaps: true, overlappingRecord: rec };
    }
  }
  return { overlaps: false };
}
