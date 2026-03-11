/**
 * Hook to check if the current user's IP is whitelisted.
 * Calls edge function which does server-side validation.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/services/securityPolicyService';

interface IPCheckResult {
  isChecking: boolean;
  isAllowed: boolean | null;
  clientIP: string | null;
  recheckIP: () => void;
}

export function useIPAccessCheck(): IPCheckResult {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [clientIP, setClientIP] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    setIsChecking(true);
    try {
      // Get client IP
      const ip = await getClientIP();
      setClientIP(ip);

      // Call edge function for server-side validation
      const { data, error } = await supabase.functions.invoke('check-ip-access', {
        body: { ip_address: ip },
      });

      if (error) {
        console.error('[IPAccessCheck] Edge function error:', error);
        // Fail-open on error to prevent lockout
        setIsAllowed(true);
        return;
      }

      setIsAllowed(data?.allowed ?? true);
    } catch (err) {
      console.error('[IPAccessCheck] Unexpected error:', err);
      // Fail-open
      setIsAllowed(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { isChecking, isAllowed, clientIP, recheckIP: checkAccess };
}
