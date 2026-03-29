import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LegalCase {
  id: string;
  number: string;
  title: string;
  case_type: string;
  status: string;
  stage: string;
  priority: string;
  confidential: boolean;
  source: string;
  summary: string | null;
  relief_sought: string | null;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  filed_at: string | null;
  next_event_at: string | null;
  flags: string[];
  related_case_ids: string[];
  updated_at: string;
}

export const useLegalCases = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['legal-cases', filters],
    queryFn: async () => {
      let query = supabase
        .from('legal_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status?.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.case_type?.length > 0) {
        query = query.in('case_type', filters.case_type);
      }
      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LegalCase[];
    },
  });
};

export const useLegalCase = (id: string) => {
  return useQuery({
    queryKey: ['legal-case', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_cases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as LegalCase | null;
    },
    enabled: !!id,
  });
};

export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Legal', 'legal_cases', 'create'],
    mutationFn: async (caseData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate case number
      const { data: existingCases } = await supabase
        .from('legal_cases')
        .select('number')
        .order('number', { ascending: false })
        .limit(1);

      const lastNumber = existingCases?.[0]?.number || 'SSB-2025-000';
      const nextNum = parseInt(lastNumber.split('-')[2]) + 1;
      const newNumber = `SSB-2025-${String(nextNum).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('legal_cases')
        .insert({
          case_type: caseData.case_type,
          title: caseData.title,
          source: caseData.source,
          priority: caseData.priority || 'Medium',
          confidential: caseData.confidential || false,
          summary: caseData.summary,
          relief_sought: caseData.relief_sought,
          flags: caseData.flags || [],
          related_case_ids: caseData.related_case_ids || [],
          number: newNumber,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('Case created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create case: ' + error.message);
    },
  });
};

export const useUpdateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Legal', 'legal_cases', 'update'],
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('legal_cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case', variables.id] });
      toast.success('Case updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update case: ' + error.message);
    },
  });
};
