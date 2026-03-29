import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Designation {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignationHierarchy {
  id: string;
  designation_id: string;
  parent_designation_id: string | null;
  level: number;
  designation?: Designation;
  parent_designation?: Designation;
}

export function useDesignations() {
  return useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designations')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Designation[];
    },
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'designations', 'create'],
    mutationFn: async (data: { name: string; description?: string; is_active?: boolean }) => {
      const { data: result, error } = await supabase
        .from('designations')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      toast.success('Designation created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'designations', 'update'],
    mutationFn: async ({ id, ...data }: Partial<Designation> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('designations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      toast.success('Designation updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'designations', 'delete'],
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('designations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      toast.success('Designation deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Designation Hierarchy
export function useDesignationHierarchy() {
  return useQuery({
    queryKey: ['designation-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designation_hierarchy')
        .select(`
          *,
          designation:designations!designation_hierarchy_designation_id_fkey(*),
          parent_designation:designations!designation_hierarchy_parent_designation_id_fkey(*)
        `)
        .order('level');
      if (error) throw error;
      return data as DesignationHierarchy[];
    },
  });
}

export function useUpsertDesignationHierarchy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'designations', 'delete'],
    mutationFn: async (data: { designation_id: string; parent_designation_id: string | null; level: number }) => {
      const { data: result, error } = await supabase
        .from('designation_hierarchy')
        .upsert(data, { onConflict: 'designation_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designation-hierarchy'] });
      toast.success('Hierarchy updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteDesignationHierarchy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'designations', 'delete'],
    mutationFn: async (designationId: string) => {
      const { error } = await supabase
        .from('designation_hierarchy')
        .delete()
        .eq('designation_id', designationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designation-hierarchy'] });
      toast.success('Hierarchy entry removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
