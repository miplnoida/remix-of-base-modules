import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OfficeDepartment {
  id: string;
  office_code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export function useOfficeDepartments(officeCode?: string) {
  return useQuery({
    queryKey: ['office-departments', officeCode],
    queryFn: async () => {
      let query = supabase
        .from('tb_office_departments')
        .select('*')
        .order('name');
      
      if (officeCode) {
        query = query.eq('office_code', officeCode);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as OfficeDepartment[];
    },
    enabled: officeCode !== null,
  });
}

export function useCreateOfficeDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'office_departments', 'create'],
    mutationFn: async (data: { office_code: string; name: string; description?: string; is_active?: boolean }) => {
      const { data: result, error } = await supabase
        .from('tb_office_departments')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-departments'] });
      toast.success('Department created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateOfficeDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'office_departments', 'update'],
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { data: result, error } = await supabase
        .from('tb_office_departments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-departments'] });
      toast.success('Department updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteOfficeDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['Admin', 'office_departments', 'delete'],
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tb_office_departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-departments'] });
      toast.success('Department deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
