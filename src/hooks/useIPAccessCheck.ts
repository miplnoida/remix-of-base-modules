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

  const checkWhitelistDirectly = useCallback(async (ip: string) => {
    const { data, error } = await (supabase.rpc as any)('check_ip_whitelist', {
      p_ip_address: ip,
    });

    if (error) {
      console.error('[IPAccessCheck] Direct whitelist RPC error:', error);
      return null;
    }

    return data?.allowed ?? null;
  }, []);

  const checkAccess = useCallback(async () => {
    setIsChecking(true);
    try {
      const ip = await getClientIP();
      setClientIP(ip);

      const { data, error } = await supabase.functions.invoke('check-ip-access', {
        body: { ip_address: ip },
      });

      if (error) {
        console.error('[IPAccessCheck] Edge function error:', error);
        const directResult = await checkWhitelistDirectly(ip);
        setIsAllowed(directResult ?? true);
        return;
      }

      if (data?.allowed === false && ip && ip !== 'unknown') {
        const directResult = await checkWhitelistDirectly(ip);
        if (directResult === true) {
          console.warn('[IPAccessCheck] Edge function denied a whitelisted IP, using direct RPC fallback.', {
            ip,
            edgeReason: data?.reason,
          });
          setIsAllowed(true);
          return;
        }
      }

      setIsAllowed(data?.allowed ?? true);
    } catch (err) {
      console.error('[IPAccessCheck] Unexpected error:', err);
      setIsAllowed(true);
    } finally {
      setIsChecking(false);
    }
  }, [checkWhitelistDirectly]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { isChecking, isAllowed, clientIP, recheckIP: checkAccess };
}
