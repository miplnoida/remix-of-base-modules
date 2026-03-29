import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VCEligibilityResult {
  eligible: boolean;
  errors: Array<{ code: string; message: string }>;
  ip_details?: {
    ssn: string;
    name: string;
    dob: string;
    age: number;
    place_of_residence: string;
    vol_contrib: string;
  };
  config?: {
    min_age: number;
    max_age: number;
    contrib_pct: number;
    termination_grace_weeks: number;
    wage_history_months: number;
  };
}

export interface VCWageCalculation {
  total_wages: number;
  avg_earnings: number;
  weekly_avg: number;
  start_date: string;
  end_date: string;
  months_covered: number;
}

export interface VCRegistrationResult {
  success: boolean;
  ssn?: string;
  date_registered?: string;
  date_commenced?: string;
  payment_interval?: string;
  avg_weekly_wage?: number;
  contrib_amt?: number;
  wage_calculation?: VCWageCalculation;
  error?: string;
  details?: Array<{ code: string; message: string }>;
}

export interface VCRecord {
  ssn: string;
  date_registered: string;
  date_commenced: string | null;
  date_ceased: string | null;
  contrib_amt: number | null;
  payment_interval: string | null;
  due_date: string | null;
  avg_weekly_wage: number | null;
  last_payment_date: string | null;
}

// Check eligibility for a specific SSN
export function useCheckVCEligibility(ssn: string | null) {
  return useQuery({
    queryKey: ['vc-eligibility', ssn],
    queryFn: async (): Promise<VCEligibilityResult> => {
      if (!ssn) throw new Error('SSN is required');
      
      const { data, error } = await supabase.rpc('check_vc_eligibility', { p_ssn: ssn });
      
      if (error) throw error;
      return data as unknown as VCEligibilityResult;
    },
    enabled: !!ssn && ssn.length >= 6
  });
}

// Calculate average weekly wage for registration
export function useCalculateVCWage(ssn: string | null, dateRegistered: string | null) {
  return useQuery({
    queryKey: ['vc-wage-calc', ssn, dateRegistered],
    queryFn: async (): Promise<VCWageCalculation> => {
      if (!ssn || !dateRegistered) throw new Error('SSN and date are required');
      
      const { data, error } = await supabase.rpc('calculate_vc_avg_weekly_wage', { 
        p_ssn: ssn,
        p_date_registered: dateRegistered
      });
      
      if (error) throw error;
      return data as unknown as VCWageCalculation;
    },
    enabled: !!ssn && !!dateRegistered
  });
}

// Register as voluntary contributor
export function useRegisterVC() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Registration', 'voluntary_contributors', 'mutation'],
    mutationFn: async (params: {
      ssn: string;
      dateRegistered: string;
      dateCommenced: string;
      paymentInterval: 'W' | 'M';
      dueDate: string;
    }): Promise<VCRegistrationResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      const userCode = user?.user_metadata?.user_code || null;
      
      const { data, error } = await supabase.rpc('register_voluntary_contributor', {
        p_ssn: params.ssn,
        p_date_registered: params.dateRegistered,
        p_date_commenced: params.dateCommenced,
        p_payment_interval: params.paymentInterval,
        p_due_date: params.dueDate,
        p_user_code: userCode
      });
      
      if (error) throw error;
      return data as unknown as VCRegistrationResult;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['vc-eligibility'] });
        queryClient.invalidateQueries({ queryKey: ['vc-records'] });
        queryClient.invalidateQueries({ queryKey: ['ip-master'] });
        toast.success('Successfully registered as Voluntary Contributor');
      } else {
        toast.error(data.error || 'Registration failed');
      }
    },
    onError: (error: Error) => {
      toast.error('Registration failed: ' + error.message);
    }
  });
}

// Cease voluntary contributor status
export function useCeaseVC() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['Registration', 'voluntary_contributors', 'status_change'],
    mutationFn: async (params: { ssn: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('cease_voluntary_contributor', {
        p_ssn: params.ssn,
        p_reason: params.reason || 'MANUAL'
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vc-eligibility'] });
      queryClient.invalidateQueries({ queryKey: ['vc-records'] });
      queryClient.invalidateQueries({ queryKey: ['ip-master'] });
      toast.success('Voluntary contributor status ceased');
    },
    onError: (error: Error) => {
      toast.error('Failed to cease VC status: ' + error.message);
    }
  });
}

// Get active VC record for an SSN
export function useVCRecord(ssn: string | null) {
  return useQuery({
    queryKey: ['vc-records', ssn],
    queryFn: async (): Promise<VCRecord | null> => {
      if (!ssn) return null;
      
      const { data, error } = await supabase
        .from('ip_vol_contrib')
        .select('*')
        .eq('ssn', ssn)
        .order('date_registered', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as VCRecord | null;
    },
    enabled: !!ssn
  });
}

// Get all VC records for an SSN (history)
export function useVCHistory(ssn: string | null) {
  return useQuery({
    queryKey: ['vc-history', ssn],
    queryFn: async (): Promise<VCRecord[]> => {
      if (!ssn) return [];
      
      const { data, error } = await supabase
        .from('ip_vol_contrib')
        .select('*')
        .eq('ssn', ssn)
        .order('date_registered', { ascending: false });
      
      if (error) throw error;
      return (data || []) as VCRecord[];
    },
    enabled: !!ssn
  });
}

// Get VC eligibility configuration
export function useVCConfig() {
  return useQuery({
    queryKey: ['vc-config'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tb_vc_eligibility_config')
        .select('*')
        .eq('is_active', true)
        .lte('effstart', today)
        .or(`effend.is.null,effend.gte.${today}`)
        .order('effstart', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });
}
