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
      const { data, error } = await (supabase as any)
        .from('tb_designations')
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
      const { data: result, error } = await (supabase as any)
        .from('tb_designations')
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
      const { data: result, error } = await (supabase as any)
        .from('tb_designations')
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
      const { error } = await (supabase as any)
        .from('tb_designations')
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
      const { data, error } = await (supabase as any)
        .from('designation_hierarchy')
        .select(`
          *,
          designation:tb_designations!designation_hierarchy_designation_id_fkey(*),
          parent_designation:tb_designations!designation_hierarchy_parent_designation_id_fkey(*)
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

// Higher Designation Users — returns users with designations above the given one
export interface HigherDesignationUser {
  id: string;
  full_name: string;
  designation_id: string;
  designation_name: string;
}

export function useHigherDesignationUsers(designationId: string | undefined) {
  return useQuery({
    queryKey: ['higher-designation-users', designationId],
    queryFn: async (): Promise<HigherDesignationUser[]> => {
      if (!designationId) return [];

      // Step 1: Get the hierarchy entry for the selected designation
      const { data: hierarchyEntry, error: hError } = await supabase
        .from('designation_hierarchy')
        .select('parent_designation_id')
        .eq('designation_id', designationId)
        .maybeSingle();

      if (hError) throw hError;
      if (!hierarchyEntry?.parent_designation_id) return [];

      // Step 2: Walk up the hierarchy to collect all ancestor designation IDs
      const ancestorIds: string[] = [];
      let currentParentId: string | null = hierarchyEntry.parent_designation_id;

      while (currentParentId) {
        ancestorIds.push(currentParentId);
        const { data: parentEntry, error: pError } = await supabase
          .from('designation_hierarchy')
          .select('parent_designation_id')
          .eq('designation_id', currentParentId)
          .maybeSingle();

        if (pError) break;
        currentParentId = parentEntry?.parent_designation_id || null;
        // Safety: prevent infinite loops
        if (currentParentId && ancestorIds.includes(currentParentId)) break;
      }

      if (ancestorIds.length === 0) return [];

      // Step 3: Get all active users with those designations
      const { data: users, error: uError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, designation_id')
        .in('designation_id', ancestorIds)
        .eq('is_active', true);

      if (uError) throw uError;
      if (!users || users.length === 0) return [];

      // Step 4: Get designation names for these users
      const { data: desigs, error: dError } = await (supabase as any)
        .from('tb_designations')
        .select('id, name')
        .in('id', ancestorIds);

      if (dError) throw dError;

      const desigMap = new Map((desigs || []).map((d: any) => [d.id, d.name]));

      return users.map((u: any) => ({
        id: u.id,
        full_name: u.full_name || 'Unknown',
        designation_id: u.designation_id,
        designation_name: desigMap.get(u.designation_id) || 'Unknown',
      }));
    },
    enabled: !!designationId,
  });
}
