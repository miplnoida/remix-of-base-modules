/**
 * useTodayMeetingCount - Returns the count of non-cancelled meetings for today
 * for the logged-in user. Uses realtime subscription for live updates.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';

export function useTodayMeetingCount() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: count = 0 } = useQuery({
    queryKey: ['today-meeting-count', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('meetings')
        .select('id', { count: 'exact', head: true })
        .eq('meeting_date', today)
        .or(`assigned_user_id.eq.${user.id},scheduled_by.eq.${user.id}`)
        .not('status', 'in', '("Cancelled","Rejected","Closed")');

      if (error) {
        console.error('Failed to fetch today meeting count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000, // refresh every minute
  });

  // Realtime subscription for immediate updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('today-meeting-count-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['today-meeting-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return count;
}
