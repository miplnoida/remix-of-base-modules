import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmployerComplianceProfile {
  employer_id: string;
  employer_name: string;
  master_status: string;
  sector_code: string;
  territory: string;
  office_code: string;
  inspector_code: string;
  phone: string;
  email: string;
  hq_addr1: string;
  hq_addr2: string;
  compliance_status: string | null;
  compliance_effective_from: string | null;
  assigned_officer_id: string | null;
  review_due_date: string | null;
  risk_score: number | null;
  risk_band: string | null;
  arrears_score: number | null;
  violation_score: number | null;
  filing_score: number | null;
  payment_behavior_score: number | null;
  legal_history_score: number | null;
  risk_last_calculated: string | null;
  risk_next_review: string | null;
  total_debits: number;
  total_credits: number;
  outstanding_balance: number;
  open_cases_count: number;
  open_violations_count: number;
  active_flags_count: number;
  critical_flags: number | null;
  related_employers_count: number;
}

export function useEmployerComplianceProfile(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-compliance-profile', employerId],
    queryFn: async (): Promise<EmployerComplianceProfile | null> => {
      if (!employerId) return null;
      const { data, error } = await supabase
        .from('ce_employer_profile_view' as any)
        .select('*')
        .eq('employer_id', employerId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as EmployerComplianceProfile;
    },
    enabled: !!employerId,
  });
}

export function useEmployerComplianceFlags(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-compliance-flags', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('ce_employer_compliance_flags')
        .select('*')
        .eq('employer_id', employerId)
        .eq('is_active', true)
        .order('raised_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!employerId,
  });
}

export function useEmployerStatusHistory(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-status-history', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('ce_employer_status_history')
        .select('*')
        .eq('employer_id', employerId)
        .order('changed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employerId,
  });
}

export function useEmployerViolations(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-violations-workspace', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('ce_violations')
        .select('*')
        .eq('employer_id', employerId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employerId,
  });
}

export function useEmployerCases(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-cases-workspace', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('ce_cases')
        .select('*')
        .eq('employer_id', employerId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employerId,
  });
}

export function useEmployerLedgerRecent(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-ledger-recent', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('ce_employer_financial_ledger')
        .select('*')
        .eq('employer_id', employerId)
        .order('posted_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employerId,
  });
}

export function useEmployerSnapshots(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-snapshots', employerId],
    queryFn: async () => {
      if (!employerId) return [];
      const { data, error } = await supabase
        .from('ce_employer_snapshot_history')
        .select('*')
        .eq('employer_id', employerId)
        .order('snapshot_date', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employerId,
  });
}
