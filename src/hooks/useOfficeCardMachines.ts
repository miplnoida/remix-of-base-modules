import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CardMachineOption {
  id: string;
  machine_code: string;
  machine_name: string;
  card_type_support: string; // 'CRD' | 'DRD' | 'BOTH'
}

/**
 * Fetches active card machines for a given office, optionally filtered by mop compatibility.
 * @param officeCode - The office_code from the selected batch
 * @param mopCode - Optional 'CRD' or 'DRD' to filter compatible machines
 */
export function useOfficeCardMachines(officeCode: string | undefined, mopCode?: string) {
  const query = useQuery({
    queryKey: ['office-card-machines', officeCode],
    enabled: !!officeCode,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_card_machine')
        .select('id, machine_code, machine_name, card_type_support')
        .eq('office_code', officeCode!)
        .eq('is_active', true)
        .order('machine_name');
      if (error) throw error;
      return (data || []) as CardMachineOption[];
    },
  });

  // Filter by mop compatibility client-side
  const compatibleMachines = (query.data || []).filter((m) => {
    if (!mopCode || (mopCode !== 'CRD' && mopCode !== 'DRD')) return false;
    return m.card_type_support === mopCode || m.card_type_support === 'BOTH';
  });

  return {
    machines: compatibleMachines,
    allMachines: query.data || [],
    isLoading: query.isLoading,
  };
}
