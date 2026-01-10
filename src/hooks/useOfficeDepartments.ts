import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OfficeDepartment {
  id: string;
  office_id: string;
  department_id: string;
  created_at: string;
}

export function useOfficeDepartments(officeId?: string) {
  return useQuery({
    queryKey: ['office-departments', officeId],
    queryFn: async () => {
      let query = supabase
        .from('office_departments')
        .select('*, department:departments!office_departments_department_id_fkey(*)');
      
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: officeId !== null,
  });
}

export function useSetOfficeDepartments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ officeId, departmentIds }: { officeId: string; departmentIds: string[] }) => {
      // Delete existing associations
      const { error: deleteError } = await supabase
        .from('office_departments')
        .delete()
        .eq('office_id', officeId);
      if (deleteError) throw deleteError;

      // Insert new associations
      if (departmentIds.length > 0) {
        const newAssociations = departmentIds.map(deptId => ({
          office_id: officeId,
          department_id: deptId,
        }));
        
        const { error: insertError } = await supabase
          .from('office_departments')
          .insert(newAssociations);
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-departments'] });
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
      toast.success('Office departments updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
