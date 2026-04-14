import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OfficeCode {
  code: string;
  description: string;
}

export function useOfficeCodes() {
  return useQuery({
    queryKey: ['tb_office_codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_office')
        .select('code, description')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return (data || []) as OfficeCode[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
