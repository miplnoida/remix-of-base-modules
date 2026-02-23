/**
 * useMeetingCalendar - Fetches meetings for a given month for the logged-in user
 * with realtime subscription and traceability logging.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useSystemLogger } from './useSystemLogger';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface CalendarMeeting {
  id: string;
  meeting_reference: string;
  application_reference: string;
  meeting_type: string;
  status: string;
  outcome: string | null;
  meeting_date: string;
  meeting_time: string;
  meeting_end_time: string | null;
  contact_person_name: string | null;
  office_address: string | null;
  remarks: string | null;
  outcome_remarks: string | null;
  metadata: any;
}

export function useMeetingCalendar(currentMonth: Date) {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const { logTechnical, logError, startNewCorrelation } = useSystemLogger();

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const queryKey = ['meeting-calendar', user?.id, monthStart, monthEnd];

  const { data: meetings = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return [];
      startNewCorrelation();
      const startTime = performance.now();

      try {
        // Fetch meetings where user is assigned OR scheduled_by
        const { data, error: fetchError } = await supabase
          .from('meetings')
          .select('id, meeting_reference, application_reference, meeting_type, status, outcome, meeting_date, meeting_time, meeting_end_time, contact_person_name, office_address, remarks, outcome_remarks, metadata')
          .or(`assigned_user_id.eq.${user.id},scheduled_by.eq.${user.id}`)
          .gte('meeting_date', monthStart)
          .lte('meeting_date', monthEnd)
          .order('meeting_date', { ascending: true })
          .order('meeting_time', { ascending: true });

        if (fetchError) throw fetchError;

        const duration = Math.round(performance.now() - startTime);
        logTechnical({
          api_name: 'meeting-calendar-fetch',
          module: 'meetings',
          entity_type: 'meetings',
          execution_time_ms: duration,
          status: 'success',
          severity: 'info',
        });

        return (data || []) as CalendarMeeting[];
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        logTechnical({
          api_name: 'meeting-calendar-fetch',
          module: 'meetings',
          execution_time_ms: duration,
          status: 'failed',
          severity: 'error',
          stack_trace: err?.stack,
        });
        logError({
          api_name: 'meeting-calendar-fetch',
          module: 'meetings',
          error_type: err?.name || 'QueryError',
          error_message: err?.message,
          severity: 'error',
        });
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('meeting-calendar-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['meeting-calendar'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map: Record<string, CalendarMeeting[]> = {};
    for (const m of meetings) {
      if (!map[m.meeting_date]) map[m.meeting_date] = [];
      map[m.meeting_date].push(m);
    }
    return map;
  }, [meetings]);

  return { meetings, meetingsByDate, isLoading, error };
}
