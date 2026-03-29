import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryInfo {
  status: string;
  sent_at: string | null;
  resend_message_id: string | null;
  failure_reason: string | null;
}

export function useDeliveryStatus(recipientEmail?: string) {
  return useQuery({
    queryKey: ['ia_delivery_status', recipientEmail],
    queryFn: async (): Promise<DeliveryInfo | null> => {
      const { data, error } = await supabase
        .from('notification_logs' as any)
        .select('status, sent_at, resend_message_id, failure_reason')
        .eq('recipient_address', recipientEmail!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as DeliveryInfo) || null;
    },
    enabled: !!recipientEmail,
    staleTime: 30000,
  });
}
