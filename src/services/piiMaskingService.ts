/**
 * PII Masking Service
 * 
 * Provides utilities for masking Personally Identifiable Information (PII) 
 * for non-admin users. Admin users see full data.
 * 
 * PII fields: SSN, email, phone, address, date of birth, bank details,
 * national ID, license numbers, and any other personally identifiable data.
 * 
 * This instruction should be applied to all future screens that display PII.
 */

import { supabase } from '@/integrations/supabase/client';

export type PIIFieldType = 
  | 'ssn' 
  | 'email' 
  | 'phone' 
  | 'address' 
  | 'dob' 
  | 'national_id' 
  | 'license_number' 
  | 'bank_account' 
  | 'name'
  | 'generic';

/**
 * Mask a value based on its PII type
 */
export function maskPIIValue(value: string | number | null | undefined, type: PIIFieldType = 'generic'): string {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);

  switch (type) {
    case 'ssn':
      // Show last 2 digits: ****XX
      return str.length > 2 ? '****' + str.slice(-2) : '****';
    
    case 'email': {
      // Show first char and domain: j****@example.com
      const atIdx = str.indexOf('@');
      if (atIdx <= 0) return '****';
      return str[0] + '****' + str.slice(atIdx);
    }
    
    case 'phone':
      // Show last 4 digits: ***-***-1234
      return str.length > 4 ? '***-***-' + str.slice(-4) : '****';
    
    case 'address':
      // Show first word only
      const firstSpace = str.indexOf(' ');
      return firstSpace > 0 ? str.slice(0, firstSpace) + ' ****' : '****';
    
    case 'dob':
      // Show only year: ****/****/1990
      const parts = str.split(/[-/]/);
      const year = parts.find(p => p.length === 4) || parts[parts.length - 1];
      return '**/**/​' + year;
    
    case 'national_id':
    case 'license_number':
      return str.length > 3 ? '***' + str.slice(-3) : '****';
    
    case 'bank_account':
      return str.length > 4 ? '****' + str.slice(-4) : '****';
    
    case 'name':
      // Show first letter of each word
      return str.split(' ').map(w => w[0] + '***').join(' ');
    
    default:
      return str.length > 4 ? '***' + str.slice(-4) : '****';
  }
}

/**
 * Check if PII masking is enabled
 */
export async function isPIIMaskingEnabled(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('security_policy_config')
      .select('config_value')
      .eq('config_key', 'pii_mask_enabled')
      .single();
    return data?.config_value === 'true';
  } catch {
    return true; // Default to masking enabled
  }
}

/**
 * Log PII unlock attempt
 */
export async function logPIIUnlock(params: {
  userId: string;
  userCode?: string;
  profileId: string;
  profileType?: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    const unlockDuration = 15; // default, will be overridden by config
    
    await supabase.from('pii_unlock_logs').insert({
      user_id: params.userId,
      user_code: params.userCode || null,
      profile_id: params.profileId,
      profile_type: params.profileType || 'insured_person',
      success: params.success,
      failure_reason: params.failureReason || null,
      ip_address: params.ipAddress || null,
      expires_at: params.success 
        ? new Date(Date.now() + unlockDuration * 60_000).toISOString() 
        : null,
      user_agent: navigator.userAgent,
    });
  } catch (err) {
    console.error('[PIIMasking] Failed to log unlock:', err);
  }
}

/**
 * Verify user credentials for PII unlock
 */
export async function verifyCredentialsForPIIUnlock(
  email: string,
  password: string
): Promise<boolean> {
  try {
    // Verify by attempting a sign in (this doesn't change session if already logged in)
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  } catch {
    return false;
  }
}
