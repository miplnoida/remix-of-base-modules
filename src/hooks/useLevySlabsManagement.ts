/**
 * Hook for Levy Slabs Management
 * Handles CRUD operations for tb_levy_slabs and tb_levy_slab_details
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logC3ConfigChange, formatAuditDate } from '@/lib/c3AuditLogger';

export interface LevySlab {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string | null;
  created_on: string | null;
  modified_by: string | null;
  modified_on: string | null;
}

export interface LevySlabDetail {
  id: string;
  slab_id: string;
  pay_period: string | null;
  over_amt: number | null;
  base_amt: number | null;
  tax_rate: number | null;
  order_no: number | null;
  is_active: boolean | null;
  created_by: string | null;
  created_on: string | null;
  modified_by: string | null;
  modified_on: string | null;
}

export interface LevySlabWithDetails extends LevySlab {
  details: LevySlabDetail[];
}

// Fetch all levy slabs
export function useLevySlabs() {
  return useQuery({
    queryKey: ['levy-slabs-all'],
    queryFn: async (): Promise<LevySlab[]> => {
      const { data, error } = await supabase
        .from('tb_levy_slabs')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });
}

// Fetch a single levy slab with details
export function useLevySlabWithDetails(slabId: string | undefined) {
  return useQuery({
    queryKey: ['levy-slab', slabId],
    queryFn: async (): Promise<LevySlabWithDetails | null> => {
      if (!slabId) return null;

      const { data: slab, error: slabError } = await supabase
        .from('tb_levy_slabs')
        .select('*')
        .eq('id', slabId)
        .single();

      if (slabError) throw slabError;

      const { data: details, error: detailsError } = await supabase
        .from('tb_levy_slab_details')
        .select('*')
        .eq('slab_id', slabId)
        .order('pay_period')
        .order('order_no');

      if (detailsError) throw detailsError;

      return {
        ...slab,
        details: details || []
      };
    },
    enabled: !!slabId
  });
}

// Create new levy slab
export function useCreateLevySlab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Admin', 'levy_slabs', 'create'],
    mutationFn: async ({
      startDate,
      endDate,
      userCode
    }: {
      startDate: string;
      endDate: string;
      userCode?: string;
      userName?: string;
    }) => {
      const { data, error } = await supabase
        .from('tb_levy_slabs')
        .insert({
          start_date: startDate,
          end_date: endDate,
          is_active: true,
          created_by: userCode,
          created_on: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await logC3ConfigChange({
        configType: 'levy_slab',
        recordId: data.id,
        action: 'CREATE',
        entityName: `Levy Slab (${formatAuditDate(startDate)} - ${formatAuditDate(endDate)})`,
        newValue: { start_date: startDate, end_date: endDate },
        changedBy: userCode
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levy-slabs-all'] });
      toast.success('Levy slab created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create levy slab: ' + error.message);
    }
  });
}

// Update levy slab
export function useUpdateLevySlab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Admin', 'levy_slabs', 'update'],
    mutationFn: async ({
      id,
      startDate,
      endDate,
      isActive,
      userCode,
      oldValues
    }: {
      id: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
      userCode?: string;
      oldValues?: { start_date: string; end_date: string; is_active: boolean };
    }) => {
      // Pre-mutation fetch fallback: if oldValues not provided, fetch current record
      let resolvedOldValues = oldValues;
      if (!resolvedOldValues) {
        const { data: current } = await supabase
          .from('tb_levy_slabs')
          .select('start_date, end_date, is_active')
          .eq('id', id)
          .single();
        if (current) {
          resolvedOldValues = { start_date: current.start_date, end_date: current.end_date, is_active: current.is_active };
        }
      }

      const newValues = { start_date: startDate, end_date: endDate, is_active: isActive };

      // No-change detection
      if (resolvedOldValues &&
          resolvedOldValues.start_date === newValues.start_date &&
          resolvedOldValues.end_date === newValues.end_date &&
          resolvedOldValues.is_active === newValues.is_active) {
        toast.info('No changes detected.');
        return { success: true, id, noChange: true };
      }
      
      const { error } = await supabase
        .from('tb_levy_slabs')
        .update({
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
          modified_by: userCode,
          modified_on: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Log audit with resolved before values
      await logC3ConfigChange({
        configType: 'levy_slab',
        recordId: id,
        action: 'UPDATE',
        entityName: `Levy Slab (${formatAuditDate(startDate)} - ${formatAuditDate(endDate)})`,
        oldValue: resolvedOldValues,
        newValue: newValues,
        changedBy: userCode
      });

      return { success: true, id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levy-slabs-all'] });
      queryClient.invalidateQueries({ queryKey: ['levy-slab'] });
      toast.success('Levy slab updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update levy slab: ' + error.message);
    }
  });
}

// Delete levy slab
export function useDeleteLevySlab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Admin', 'levy_slabs', 'delete'],
    mutationFn: async ({ id, slabInfo, userCode }: { 
      id: string; 
      slabInfo?: { start_date: string; end_date: string };
      userCode?: string;
    }) => {
      // First delete all details
      const { error: detailsError } = await supabase
        .from('tb_levy_slab_details')
        .delete()
        .eq('slab_id', id);

      if (detailsError) throw detailsError;

      // Then delete the slab
      const { error } = await supabase
        .from('tb_levy_slabs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await logC3ConfigChange({
        configType: 'levy_slab',
        recordId: id,
        action: 'DELETE',
        entityName: slabInfo 
          ? `Levy Slab (${formatAuditDate(slabInfo.start_date)} - ${formatAuditDate(slabInfo.end_date)})`
          : 'Levy Slab',
        oldValue: slabInfo,
        changedBy: userCode
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levy-slabs-all'] });
      toast.success('Levy slab deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete levy slab: ' + error.message);
    }
  });
}

// Create levy slab detail
export function useCreateLevySlabDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Admin', 'levy_slabs', 'create'],
    mutationFn: async ({
      slabId,
      payPeriod,
      overAmt,
      baseAmt,
      taxRate,
      orderNo,
      userCode
    }: {
      slabId: string;
      payPeriod: string;
      overAmt: number;
      baseAmt: number;
      taxRate: number;
      orderNo: number;
      userCode?: string;
    }) => {
      const { data, error } = await supabase
        .from('tb_levy_slab_details')
        .insert({
          slab_id: slabId,
          pay_period: payPeriod,
          over_amt: overAmt,
          base_amt: baseAmt,
          tax_rate: taxRate,
          order_no: orderNo,
          is_active: true,
          created_by: userCode,
          created_on: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await logC3ConfigChange({
        configType: 'levy_slab_detail',
        recordId: data.id,
        action: 'CREATE',
        entityName: `${payPeriod} Bracket (Over: ${overAmt})`,
        newValue: { pay_period: payPeriod, over_amt: overAmt, base_amt: baseAmt, tax_rate: taxRate },
        changedBy: userCode,
        metadata: { slab_id: slabId }
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['levy-slab', variables.slabId] });
      toast.success('Slab detail added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add slab detail: ' + error.message);
    }
  });
}

// Update levy slab detail
export function useUpdateLevySlabDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Admin', 'levy_slabs', 'update'],
    mutationFn: async ({
      id,
      slabId,
      payPeriod,
      overAmt,
      baseAmt,
      taxRate,
      orderNo,
      isActive,
      userCode,
      oldValues
    }: {
      id: string;
      slabId: string;
      payPeriod: string;
      overAmt: number;
      baseAmt: number;
      taxRate: number;
      orderNo: number;
      isActive: boolean;
      userCode?: string;
      oldValues?: { pay_period: string | null; over_amt: number | null; base_amt: number | null; tax_rate: number | null; order_no: number | null; is_active: boolean | null };
    }) => {
      // Pre-mutation fetch fallback: if oldValues not provided, fetch current record
      let resolvedOldValues = oldValues;
      if (!resolvedOldValues) {
        const { data: current } = await supabase
          .from('tb_levy_slab_details')
          .select('pay_period, over_amt, base_amt, tax_rate, order_no, is_active')
          .eq('id', id)
          .single();
        if (current) {
          resolvedOldValues = current;
        }
      }

      const newValues = { pay_period: payPeriod, over_amt: overAmt, base_amt: baseAmt, tax_rate: taxRate, order_no: orderNo, is_active: isActive };

      // No-change detection
      if (resolvedOldValues &&
          resolvedOldValues.pay_period === newValues.pay_period &&
          resolvedOldValues.over_amt === newValues.over_amt &&
          resolvedOldValues.base_amt === newValues.base_amt &&
          resolvedOldValues.tax_rate === newValues.tax_rate &&
          resolvedOldValues.order_no === newValues.order_no &&
          resolvedOldValues.is_active === newValues.is_active) {
        toast.info('No changes detected.');
        return { success: true, noChange: true };
      }
      
      const { error } = await supabase
        .from('tb_levy_slab_details')
        .update({
          pay_period: payPeriod,
          over_amt: overAmt,
          base_amt: baseAmt,
          tax_rate: taxRate,
          order_no: orderNo,
          is_active: isActive,
          modified_by: userCode,
          modified_on: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Log audit with resolved before values
      await logC3ConfigChange({
        configType: 'levy_slab_detail',
        recordId: id,
        action: 'UPDATE',
        entityName: `${payPeriod} Bracket (Over: ${overAmt})`,
        oldValue: resolvedOldValues,
        newValue: newValues,
        changedBy: userCode,
        metadata: { slab_id: slabId }
      });

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['levy-slab', variables.slabId] });
      toast.success('Slab detail updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update slab detail: ' + error.message);
    }
  });
}

// Delete levy slab detail
export function useDeleteLevySlabDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Admin', 'levy_slabs', 'delete'],
    mutationFn: async ({ id, slabId, detailInfo, userCode }: { 
      id: string; 
      slabId: string;
      detailInfo?: { pay_period: string; over_amt: number };
      userCode?: string;
    }) => {
      const { error } = await supabase
        .from('tb_levy_slab_details')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await logC3ConfigChange({
        configType: 'levy_slab_detail',
        recordId: id,
        action: 'DELETE',
        entityName: detailInfo 
          ? `${detailInfo.pay_period} Bracket (Over: ${detailInfo.over_amt})`
          : 'Levy Slab Detail',
        oldValue: detailInfo,
        changedBy: userCode,
        metadata: { slab_id: slabId }
      });

      return { success: true, slabId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['levy-slab', result.slabId] });
      toast.success('Slab detail deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete slab detail: ' + error.message);
    }
  });
}

// Clone levy slab with all details
export function useCloneLevySlab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Admin', 'levy_slabs', 'create'],
    mutationFn: async ({
      sourceSlabId,
      newStartDate,
      newEndDate,
      userCode
    }: {
      sourceSlabId: string;
      newStartDate: string;
      newEndDate: string;
      userCode?: string;
    }) => {
      // Create new slab
      const { data: newSlab, error: slabError } = await supabase
        .from('tb_levy_slabs')
        .insert({
          start_date: newStartDate,
          end_date: newEndDate,
          is_active: true,
          created_by: userCode,
          created_on: new Date().toISOString()
        })
        .select()
        .single();

      if (slabError) throw slabError;

      // Get source details
      const { data: sourceDetails, error: detailsError } = await supabase
        .from('tb_levy_slab_details')
        .select('*')
        .eq('slab_id', sourceSlabId);

      if (detailsError) throw detailsError;

      // Clone details
      if (sourceDetails && sourceDetails.length > 0) {
        const newDetails = sourceDetails.map(detail => ({
          slab_id: newSlab.id,
          pay_period: detail.pay_period,
          over_amt: detail.over_amt,
          base_amt: detail.base_amt,
          tax_rate: detail.tax_rate,
          order_no: detail.order_no,
          is_active: detail.is_active,
          created_by: userCode,
          created_on: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('tb_levy_slab_details')
          .insert(newDetails);

        if (insertError) throw insertError;
      }

      // Log audit
      await logC3ConfigChange({
        configType: 'levy_slab',
        recordId: newSlab.id,
        action: 'CLONE',
        entityName: `Levy Slab (${formatAuditDate(newStartDate)} - ${formatAuditDate(newEndDate)})`,
        newValue: { start_date: newStartDate, end_date: newEndDate, details_count: sourceDetails?.length || 0 },
        changedBy: userCode,
        metadata: { source_slab_id: sourceSlabId }
      });

      return newSlab;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levy-slabs-all'] });
      toast.success('Levy slab cloned successfully');
    },
    onError: (error) => {
      toast.error('Failed to clone levy slab: ' + error.message);
    }
  });
}
