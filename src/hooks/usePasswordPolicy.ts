import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PasswordPolicy {
  id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  max_age_days: number;
  prevent_reuse_count: number;
  is_active: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function usePasswordPolicy() {
  return useQuery({
    queryKey: ['password-policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_policies')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as PasswordPolicy | null;
    },
  });
}

export function validatePassword(password: string, policy: PasswordPolicy | null | undefined): PasswordValidationResult {
  // Default policy if none configured
  const effectivePolicy = policy || {
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: false,
  };

  const checks = {
    length: password.length >= effectivePolicy.min_length,
    uppercase: !effectivePolicy.require_uppercase || /[A-Z]/.test(password),
    lowercase: !effectivePolicy.require_lowercase || /[a-z]/.test(password),
    number: !effectivePolicy.require_numbers || /[0-9]/.test(password),
    special: !effectivePolicy.require_special_chars || /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const errors: string[] = [];
  if (!checks.length) errors.push(`Password must be at least ${effectivePolicy.min_length} characters`);
  if (!checks.uppercase) errors.push('Password must contain at least one uppercase letter');
  if (!checks.lowercase) errors.push('Password must contain at least one lowercase letter');
  if (!checks.number) errors.push('Password must contain at least one number');
  if (!checks.special) errors.push('Password must contain at least one special character');

  return {
    isValid: Object.values(checks).every(Boolean),
    errors,
    checks,
  };
}
