/**
 * Hook for C3 Configuration Period Management
 * Handles CRUD operations for c3_config_periods and c3_config_details
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logC3ConfigChange, formatAuditDate } from '@/lib/c3AuditLogger';

export interface C3ConfigPeriod {
  id: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_on: string;
  modified_by: string | null;
  modified_on: string;
}

export interface C3ConfigDetails {
  id: string;
  config_period_id: string;
  min_age_ss: number;
  max_age_ss: number;
  min_age_levy: number;
  max_age_levy: number;
  employee_ss_rate: number;
  employee_ss_max_wage: number;
  employer_ss_rate: number;
  employer_eib_rate: number;
  employer_ss_max_wage: number;
  employer_levy_rate: number;
  employer_severance_rate: number;
  submission_due_day: number;
  levy_penalty_initial_rate: number;
  levy_penalty_subsequent_rate: number;
  severance_penalty_initial_rate: number;
  severance_penalty_subsequent_rate: number;
  ss_fine_initial_rate: number;
  ss_fine_subsequent_rate: number;
  levy_slab_id: string | null;
  // Monthly levy switching parameters
  levy_monthly_threshold: number;
  levy_use_monthly_when_exceeded: boolean;
}

export interface C3ConfigWithDetails extends C3ConfigPeriod {
  details: C3ConfigDetails | null;
}

export interface C3ConfigAudit {
  id: string;
  config_period_id: string;
  action: string;
  old_values: any;
  new_values: any;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  reason: string | null;
}

// Fetch all configuration periods with their details
export function useC3ConfigPeriods() {
  return useQuery({
    queryKey: ['c3-config-periods'],
    queryFn: async (): Promise<C3ConfigWithDetails[]> => {
      const { data: periods, error: periodsError } = await supabase
        .from('c3_config_periods')
        .select('*')
        .order('start_date', { ascending: false });

      if (periodsError) throw periodsError;

      const { data: details, error: detailsError } = await supabase
        .from('c3_config_details')
        .select('*');

      if (detailsError) throw detailsError;

      // Map details to periods
      return (periods || []).map(period => ({
        ...period,
        details: details?.find(d => d.config_period_id === period.id) || null
      }));
    }
  });
}

// Fetch a single configuration period with details
export function useC3ConfigPeriod(periodId: string | undefined) {
  return useQuery({
    queryKey: ['c3-config-period', periodId],
    queryFn: async (): Promise<C3ConfigWithDetails | null> => {
      if (!periodId) return null;

      const { data: period, error: periodError } = await supabase
        .from('c3_config_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError) throw periodError;

      const { data: details, error: detailsError } = await supabase
        .from('c3_config_details')
        .select('*')
        .eq('config_period_id', periodId)
        .single();

      if (detailsError && detailsError.code !== 'PGRST116') {
        throw detailsError;
      }

      return {
        ...period,
        details: details || null
      };
    },
    enabled: !!periodId
  });
}

// Update configuration details
export function useUpdateC3ConfigDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      configPeriodId,
      details,
      userCode,
      oldDetails,
      periodInfo
    }: {
      configPeriodId: string;
      details: Partial<C3ConfigDetails>;
      userCode?: string;
      oldDetails?: Partial<C3ConfigDetails>;
      periodInfo?: { start_date: string; end_date: string | null };
    }) => {
      const { error } = await supabase
        .from('c3_config_details')
        .update({
          ...details,
          modified_by: userCode,
          modified_on: new Date().toISOString()
        })
        .eq('config_period_id', configPeriodId);

      if (error) throw error;

      // Log to unified audit
      const periodLabel = periodInfo 
        ? `Period Config (${formatAuditDate(periodInfo.start_date)} - ${periodInfo.end_date ? formatAuditDate(periodInfo.end_date) : 'Current'})`
        : 'Period Configuration';

      await logC3ConfigChange({
        configType: 'period_config',
        recordId: configPeriodId,
        action: 'UPDATE',
        entityName: periodLabel,
        oldValue: oldDetails,
        newValue: details,
        changedBy: userCode
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      queryClient.invalidateQueries({ queryKey: ['c3-config-period'] });
      toast.success('Configuration updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update configuration: ' + error.message);
    }
  });
}

// Clone a configuration
export function useCloneC3Config() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      newStartDate,
      newEndDate,
      description,
      userCode
    }: {
      sourceId: string;
      newStartDate: string;
      newEndDate?: string | null;
      description?: string;
      userCode?: string;
    }) => {
      const { data, error } = await supabase.rpc('clone_c3_config', {
        p_source_period_id: sourceId,
        p_new_start_date: newStartDate,
        p_new_end_date: newEndDate || null,
        p_description: description || null,
        p_user_code: userCode || null
      });

      if (error) throw error;

      // Log to unified audit
      await logC3ConfigChange({
        configType: 'period_config',
        recordId: data,
        action: 'CLONE',
        entityName: `Period Config (${formatAuditDate(newStartDate)} - ${newEndDate ? formatAuditDate(newEndDate) : 'Current'})`,
        newValue: { start_date: newStartDate, end_date: newEndDate, description },
        changedBy: userCode,
        metadata: { source_period_id: sourceId }
      });

      return { newPeriodId: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      toast.success('Configuration cloned successfully');
    },
    onError: (error) => {
      toast.error('Failed to clone configuration: ' + error.message);
    }
  });
}

// Toggle active status
export function useToggleC3ConfigActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      periodId,
      isActive,
       userCode
    }: {
      periodId: string;
      isActive: boolean;
      userCode?: string;
    }) => {
       // Fetch current period info for audit logging
       const { data: periodInfo } = await supabase
         .from('c3_config_periods')
         .select('start_date, end_date, is_active')
         .eq('id', periodId)
         .single();
 
      const { error } = await supabase
        .from('c3_config_periods')
        .update({
          is_active: isActive,
          modified_by: userCode,
          modified_on: new Date().toISOString()
        })
        .eq('id', periodId);

      if (error) throw error;

      // Log to unified audit
      if (periodInfo) {
        await logC3ConfigChange({
          configType: 'period_config',
          recordId: periodId,
          action: 'UPDATE',
          entityName: `Period Config (${formatAuditDate(periodInfo.start_date)} - ${periodInfo.end_date ? formatAuditDate(periodInfo.end_date) : 'Current'})`,
          fieldName: 'is_active',
          oldValue: periodInfo.is_active,
          newValue: isActive,
          changedBy: userCode
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      toast.success('Configuration status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    }
  });
}

// Fetch configuration audit history
export function useC3ConfigAudit(periodId?: string) {
  return useQuery({
    queryKey: ['c3-config-audit', periodId],
    queryFn: async (): Promise<C3ConfigAudit[]> => {
      let query = supabase
        .from('c3_config_audit')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100);

      if (periodId) {
        query = query.eq('config_period_id', periodId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });
}

// Fetch levy slabs for dropdown
export function useLevySlabs() {
  return useQuery({
    queryKey: ['levy-slabs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_levy_slabs')
        .select('id, start_date, end_date, is_active')
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });
}
