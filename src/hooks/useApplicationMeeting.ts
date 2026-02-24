/**
 * useApplicationMeeting - Fetches the active (non-cancelled, non-closed) meeting
 * for a given application reference number, for use outside the calendar view.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Meeting } from '@/types/meetings';
import { useEffect } from 'react';

export function useApplicationMeeting(applicationReference: string | undefined) {
  const queryClient = useQueryClient();

  const queryKey = ['application-meeting', applicationReference];

  const { data: meeting, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<Meeting | null> => {
      if (!applicationReference) return null;

      const { data, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .eq('application_reference', applicationReference)
        .in('status', ['Scheduled', 'Rescheduled', 'InProgress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) return null;

      return data as unknown as Meeting;
    },
    enabled: !!applicationReference,
    staleTime: 30_000,
  });

  // Realtime subscription to keep meeting state in sync
  useEffect(() => {
    if (!applicationReference) return;

    const channel = supabase
      .channel(`app-meeting-${applicationReference}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationReference, queryClient]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    // Also refresh calendar views
    queryClient.invalidateQueries({ queryKey: ['meeting-calendar'] });
  };

  return { meeting: meeting ?? null, isLoading, error, invalidate };
}
