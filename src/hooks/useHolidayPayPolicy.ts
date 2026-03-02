import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HolidayPayPolicyDefault, HolidayPayPolicyException } from '@/types/holidayPayPolicy';

// ---- Default Policies ----
export function useHolidayPayPolicyDefaults() {
  return useQuery({
    queryKey: ['holiday-pay-policy-defaults'],
    queryFn: async (): Promise<HolidayPayPolicyDefault[]> => {
      const { data, error } = await supabase
        .from('c3_holiday_pay_policy_default')
        .select('*')
        .order('date_from', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HolidayPayPolicyDefault[];
    },
  });
}

export function useCreateHolidayPayPolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ policy, userCode }: { policy: Omit<HolidayPayPolicyDefault, 'id' | 'created_on' | 'modified_on'>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_holiday_pay_policy_default')
        .insert({ ...policy, created_by: userCode || null, modified_by: userCode || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holiday-pay-policy-defaults'] });
      toast.success('Holiday pay policy created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHolidayPayPolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, userCode }: { id: string; updates: Partial<HolidayPayPolicyDefault>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_holiday_pay_policy_default')
        .update({ ...updates, modified_by: userCode || null, modified_on: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holiday-pay-policy-defaults'] });
      toast.success('Holiday pay policy saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHolidayPayPolicyDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('c3_holiday_pay_policy_default')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holiday-pay-policy-defaults'] });
      toast.success('Holiday pay policy deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Exceptions ----
export function useHolidayPayPolicyExceptions() {
  return useQuery({
    queryKey: ['holiday-pay-policy-exceptions'],
    queryFn: async (): Promise<HolidayPayPolicyException[]> => {
      const { data, error } = await supabase
        .from('c3_holiday_pay_policy_exceptions')
        .select('*')
        .order('date_from', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HolidayPayPolicyException[];
    },
  });
}

export function useCreateHolidayPayPolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ exception, userCode }: { exception: Omit<HolidayPayPolicyException, 'id' | 'created_on' | 'modified_on'>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_holiday_pay_policy_exceptions')
        .insert({ ...exception, created_by: userCode || null, modified_by: userCode || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holiday-pay-policy-exceptions'] });
      toast.success('Holiday pay exception created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHolidayPayPolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, userCode }: { id: string; updates: Partial<HolidayPayPolicyException>; userCode?: string }) => {
      const { error } = await supabase
        .from('c3_holiday_pay_policy_exceptions')
        .update({ ...updates, modified_by: userCode || null, modified_on: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holiday-pay-policy-exceptions'] });
      toast.success('Holiday pay exception updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHolidayPayPolicyException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('c3_holiday_pay_policy_exceptions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holiday-pay-policy-exceptions'] });
      toast.success('Holiday pay exception deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Overlap detection (reuse pattern from bonus) ----
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
    // Only check overlap within same policy_type
    if (policyType && rec.policy_type && rec.policy_type !== policyType) continue;
    const exFrom = new Date(rec.date_from).getTime();
    const exTo = rec.date_to ? new Date(rec.date_to).getTime() : Infinity;

    if (newFrom <= exTo && newTo >= exFrom) {
      return { overlaps: true, overlappingRecord: rec };
    }
  }
  return { overlaps: false };
}
