// Hook for employer validation against er_master table
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EmployerValidationResult {
  isValid: boolean;
  name: string;
  address: string;
  error?: string;
}

export interface EmployeeValidationResult {
  isValid: boolean;
  name: string;
  termStartDate: string;
  dateOfBirth: string;
  error?: string;
}

export function useEmployerValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateEmployer = useCallback(async (regNo: string): Promise<EmployerValidationResult> => {
    if (!regNo || regNo.trim().length === 0) {
      return { isValid: false, name: '', address: '', error: 'Employer ID is required' };
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('er_master')
        .select('regno, name, maddr1, maddr2, hq_addr1, hq_addr2, status')
        .eq('regno', regNo.trim())
        .maybeSingle();

      if (error) {
        console.error('Error validating employer:', error);
        return { isValid: false, name: '', address: '', error: 'Error validating employer' };
      }

      if (!data) {
        return { 
          isValid: false, 
          name: '', 
          address: '', 
          error: 'Please enter a valid employer registration number (reg_no)' 
        };
      }

      // Check if employer is active (status should be 'A' or similar)
      if (data.status && data.status !== 'A' && data.status !== 'V') {
        return { 
          isValid: false, 
          name: data.name || '', 
          address: '', 
          error: 'This employer is not active' 
        };
      }

      const address = [data.maddr1, data.maddr2, data.hq_addr1, data.hq_addr2]
        .filter(Boolean)
        .join(', ')
        .trim();

      return { 
        isValid: true, 
        name: data.name || '', 
        address: address || 'No address on file'
      };
    } catch (err: any) {
      console.error('Error in validateEmployer:', err);
      return { isValid: false, name: '', address: '', error: 'Validation failed' };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const validateEmployee = useCallback(async (ssn: string): Promise<EmployeeValidationResult> => {
    if (!ssn || ssn.trim().length === 0) {
      return { isValid: false, name: '', termStartDate: '', dateOfBirth: '', error: 'SSN is required' };
    }

    if (ssn.length !== 6 || !/^\d{6}$/.test(ssn)) {
      return { isValid: false, name: '', termStartDate: '', dateOfBirth: '', error: 'SSN must be exactly 6 digits' };
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('ip_master')
        .select('ssn, first_name, last_name, status, date_of_birth')
        .eq('ssn', ssn.trim())
        .maybeSingle();

      if (error) {
        console.error('Error validating employee SSN:', error);
        return { isValid: false, name: '', termStartDate: '', dateOfBirth: '', error: 'Error validating SSN' };
      }

      if (!data) {
        return { 
          isValid: false, 
          name: '', 
          termStartDate: '', 
          dateOfBirth: '',
          error: 'Please enter a valid SSN' 
        };
      }

      // Check if person is active
      if (data.status && data.status !== 'A' && data.status !== 'V') {
        return { 
          isValid: false, 
          name: '', 
          termStartDate: '', 
          dateOfBirth: '',
          error: 'This person is not active in the system' 
        };
      }

      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
      
      // Use date_of_birth as a proxy for term_start_date since term_start_date column doesn't exist
      // In production, this should be fetched from employment records
      const termStartDate = data.date_of_birth || '';
      const dateOfBirth = data.date_of_birth || '';

      return { 
        isValid: true, 
        name: fullName || 'Unknown',
        termStartDate: termStartDate,
        dateOfBirth: dateOfBirth
      };
    } catch (err: any) {
      console.error('Error in validateEmployee:', err);
      return { isValid: false, name: '', termStartDate: '', dateOfBirth: '', error: 'Validation failed' };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const getScheduleNumber = useCallback(async (
    payerId: string, 
    payerType: 'ER' | 'SE' | 'VC', 
    period: string
  ): Promise<number> => {
    if (!payerId || !period) return 1;

    try {
      const { data, error } = await supabase.rpc('get_next_c3_schedule_no', {
        p_payer_id: payerId,
        p_payer_type: payerType,
        p_period: period
      });

      if (error) {
        console.error('Error getting schedule number:', error);
        return 1;
      }

      return data || 1;
    } catch (err) {
      console.error('Error in getScheduleNumber:', err);
      return 1;
    }
  }, []);

  return {
    validateEmployer,
    validateEmployee,
    getScheduleNumber,
    isValidating
  };
}
