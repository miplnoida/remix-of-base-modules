/**
 * Hook for Levy Slabs Management
 * Handles CRUD operations for tb_levy_slabs and tb_levy_slab_details
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    mutationFn: async ({
      startDate,
      endDate,
      userCode
    }: {
      startDate: string;
      endDate: string;
      userCode?: string;
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
    mutationFn: async ({
      id,
      startDate,
      endDate,
      isActive,
      userCode
    }: {
      id: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
      userCode?: string;
    }) => {
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
      return { success: true };
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
    mutationFn: async (id: string) => {
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
    mutationFn: async ({
      id,
      slabId,
      payPeriod,
      overAmt,
      baseAmt,
      taxRate,
      orderNo,
      isActive,
      userCode
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
    }) => {
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
    mutationFn: async ({ id, slabId }: { id: string; slabId: string }) => {
      const { error } = await supabase
        .from('tb_levy_slab_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
