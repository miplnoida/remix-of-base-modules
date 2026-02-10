import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CloudflareConfig {
  enabled: boolean;
  allowedRiskLevel: string;
}

export const useCloudflareConfig = () => {
  return useQuery({
    queryKey: ['cloudflare-config'],
    queryFn: async (): Promise<CloudflareConfig> => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-turnstile', {
          body: { action: 'get-config' },
        });

        if (error) throw error;

        return {
          enabled: data?.enabled !== false,
          allowedRiskLevel: data?.allowedRiskLevel || 'LOW',
        };
      } catch (err) {
        console.error('[CloudflareConfig] Failed to fetch:', err);
        // Default to enabled for safety
        return { enabled: true, allowedRiskLevel: 'LOW' };
      }
    },
    staleTime: 30000,
  });
};
