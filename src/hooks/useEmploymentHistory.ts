import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmploymentHistoryRecord {
  id: string;
  ssn: string;
  employer_id: string;
  occupation: string | null;
  source: string | null;
  posting_status: string | null;
  date_entered: string | null;
  entered_by: string | null;
  term_start_date: string | null;
  term_end_date: string | null;
  created_at: string | null;
  // Joined fields
  employer_name?: string | null;
  occupation_description?: string | null;
}

export function useEmploymentHistory(ssn: string | null | undefined) {
  return useQuery({
    queryKey: ['employment-history', ssn],
    queryFn: async (): Promise<EmploymentHistoryRecord[]> => {
      if (!ssn) return [];
      
      // First check if any records exist
      const { data, error } = await supabase
        .from('ip_employer')
        .select('*')
        .eq('ssn', ssn)
        .order('date_entered', { ascending: false });
      
      if (error) {
        console.error('Error fetching employment history:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return [];
      
      // Fetch employer names for each unique employer_id
      const employerIds = [...new Set(data.map(r => r.employer_id))];
      const { data: employers } = await supabase
        .from('er_master')
        .select('regno, name, trade_name')
        .in('regno', employerIds);
      
      const employerMap = new Map(
        employers?.map(e => [e.regno, e.name || e.trade_name || e.regno]) || []
      );
      
      // Map occupation codes to descriptions if needed
      return data.map(record => ({
        ...record,
        employer_name: employerMap.get(record.employer_id) || record.employer_id,
      }));
    },
    enabled: !!ssn,
    staleTime: 30000,
  });
}

export function useHasEmploymentHistory(ssn: string | null | undefined) {
  return useQuery({
    queryKey: ['has-employment-history', ssn],
    queryFn: async (): Promise<boolean> => {
      if (!ssn) return false;
      
      const { count, error } = await supabase
        .from('ip_employer')
        .select('id', { count: 'exact', head: true })
        .eq('ssn', ssn);
      
      if (error) {
        console.error('Error checking employment history:', error);
        return false;
      }
      
      return (count || 0) > 0;
    },
    enabled: !!ssn,
    staleTime: 30000,
  });
}
