import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';

export interface HeadCashierInfo {
  user_id: string;
  user_code: string;
  full_name: string;
  office_code: string;
  assigned_by: string;
  assigned_at: string;
}

export function useHeadCashier(date?: string, officeCode?: string) {
  const { user } = useSupabaseAuth();
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['head-cashier', dateStr, officeCode],
    queryFn: async () => {
      const params: any = { p_date: dateStr };
      if (officeCode) {
        params.p_office_code = officeCode;
      }
      const { data: result, error } = await supabase.rpc('get_active_head_cashier' as any, params);
      if (error) throw error;
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (!parsed?.found) return null;
      return parsed as HeadCashierInfo;
    },
    staleTime: 30_000,
  });

  const isCurrentUserHeadCashier = !!data && !!user && data.user_id === user.id;

  return {
    headCashier: data || null,
    isCurrentUserHeadCashier,
    isLoading,
  };
}
