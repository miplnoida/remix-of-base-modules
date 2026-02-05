/**
 * Hook for Bonus Levy Exemptions Management
 * Handles CRUD operations for c3_bonus_levy_exemptions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logC3ConfigChange, formatBonusPeriod } from '@/lib/c3AuditLogger';

export interface BonusLevyExemption {
  id: string;
  period_year: number;
  period_month: number;
  is_exempt: boolean;
  description: string | null;
  is_active: boolean | null;
  created_by: string | null;
  created_on: string | null;
  modified_by: string | null;
  modified_on: string | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}

export function formatPeriod(year: number, month: number): string {
  return `${getMonthName(month)} ${year}`;
}

// Fetch all bonus levy exemptions
export function useBonusLevyExemptions() {
  return useQuery({
    queryKey: ['bonus-levy-exemptions'],
    queryFn: async (): Promise<BonusLevyExemption[]> => {
      const { data, error } = await supabase
        .from('c3_bonus_levy_exemptions')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });
}

// Create new exemption
export function useCreateBonusLevyExemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      periodYear,
      periodMonth,
      isExempt,
      description,
      userCode
    }: {
      periodYear: number;
      periodMonth: number;
      isExempt: boolean;
      description?: string;
      userCode?: string;
    }) => {
      const { data, error } = await supabase
        .from('c3_bonus_levy_exemptions')
        .insert({
          period_year: periodYear,
          period_month: periodMonth,
          is_exempt: isExempt,
          description: description || null,
          is_active: true,
          created_by: userCode,
          created_on: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await logC3ConfigChange({
        configType: 'bonus_exemption',
        recordId: data.id,
        action: 'CREATE',
        entityName: `Bonus Exemption - ${formatBonusPeriod(periodYear, periodMonth)}`,
        newValue: { period_year: periodYear, period_month: periodMonth, is_exempt: isExempt, description },
        changedBy: userCode
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-levy-exemptions'] });
      toast.success('Bonus levy exemption created successfully');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate key')) {
        toast.error('An exemption already exists for this period');
      } else {
        toast.error('Failed to create exemption: ' + error.message);
      }
    }
  });
}

// Update exemption
export function useUpdateBonusLevyExemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isExempt,
      description,
      isActive,
      userCode,
      oldValues
    }: {
      id: string;
      isExempt: boolean;
      description?: string;
      isActive: boolean;
      userCode?: string;
      oldValues?: { period_year: number; period_month: number; is_exempt: boolean; description?: string };
    }) => {
      const newValues = { is_exempt: isExempt, description, is_active: isActive };
      
      const { error } = await supabase
        .from('c3_bonus_levy_exemptions')
        .update({
          is_exempt: isExempt,
          description: description || null,
          is_active: isActive,
          modified_by: userCode,
          modified_on: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Log audit
      if (oldValues) {
        await logC3ConfigChange({
          configType: 'bonus_exemption',
          recordId: id,
          action: 'UPDATE',
          entityName: `Bonus Exemption - ${formatBonusPeriod(oldValues.period_year, oldValues.period_month)}`,
          oldValue: oldValues,
          newValue: { ...newValues, period_year: oldValues.period_year, period_month: oldValues.period_month },
          changedBy: userCode
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-levy-exemptions'] });
      toast.success('Exemption updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update exemption: ' + error.message);
    }
  });
}

// Delete exemption
export function useDeleteBonusLevyExemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, exemptionInfo, userCode }: { 
      id: string;
      exemptionInfo?: { period_year: number; period_month: number; is_exempt: boolean };
      userCode?: string;
    }) => {
      const { error } = await supabase
        .from('c3_bonus_levy_exemptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit
      if (exemptionInfo) {
        await logC3ConfigChange({
          configType: 'bonus_exemption',
          recordId: id,
          action: 'DELETE',
          entityName: `Bonus Exemption - ${formatBonusPeriod(exemptionInfo.period_year, exemptionInfo.period_month)}`,
          oldValue: exemptionInfo,
          changedBy: userCode
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-levy-exemptions'] });
      toast.success('Exemption deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete exemption: ' + error.message);
    }
  });
}

// Check if a period is exempt
export function useCheckBonusExempt(year: number, month: number) {
  return useQuery({
    queryKey: ['bonus-levy-exempt-check', year, month],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('c3_bonus_levy_exemptions')
        .select('is_exempt')
        .eq('period_year', year)
        .eq('period_month', month)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data?.is_exempt ?? false;
    },
    enabled: !!year && !!month
  });
}
