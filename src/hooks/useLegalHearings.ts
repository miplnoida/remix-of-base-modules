import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LegalHearing {
  id: string;
  case_id: string;
  type: string;
  venue: string;
  start_at: string;
  end_at: string;
  panel: string[];
  agenda: string | null;
  attendance: any;
  outcome: string | null;
  minutes_doc_id: string | null;
  recording_link: string | null;
  created_at: string;
  created_by: string | null;
  legal_cases?: {
    number: string;
    title: string;
    case_type: string;
  };
}

export const useLegalHearings = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['legal-hearings', filters],
    queryFn: async () => {
      let query = supabase
        .from('legal_hearings')
        .select(`
          *,
          legal_cases (
            number,
            title,
            case_type
          )
        `)
        .order('start_at', { ascending: true });

      if (filters?.startDate && filters?.endDate) {
        query = query
          .gte('start_at', filters.startDate)
          .lte('start_at', filters.endDate);
      }

      if (filters?.type?.length > 0) {
        query = query.in('type', filters.type);
      }

      if (filters?.venue) {
        query = query.eq('venue', filters.venue);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LegalHearing[];
    },
  });
};

export const useCreateHearing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hearingData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('legal_hearings')
        .insert({
          ...hearingData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-hearings'] });
      toast.success('Hearing scheduled successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to schedule hearing: ' + error.message);
    },
  });
};

export const useUpdateHearing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('legal_hearings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-hearings'] });
      toast.success('Hearing updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update hearing: ' + error.message);
    },
  });
};

export const useRecordAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, attendance }: { id: string; attendance: any }) => {
      const { data, error } = await supabase
        .from('legal_hearings')
        .update({ attendance })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-hearings'] });
      toast.success('Attendance recorded successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to record attendance: ' + error.message);
    },
  });
};

export const detectConflicts = (
  newHearing: { start_at: string; end_at: string; panel: string[] },
  existingHearings: LegalHearing[]
): { hasConflict: boolean; conflicts: string[] } => {
  const conflicts: string[] = [];
  const newStart = new Date(newHearing.start_at);
  const newEnd = new Date(newHearing.end_at);

  existingHearings.forEach((hearing) => {
    const existingStart = new Date(hearing.start_at);
    const existingEnd = new Date(hearing.end_at);

    // Check for time overlap
    const hasTimeOverlap =
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd);

    if (hasTimeOverlap) {
      // Check for panel member conflicts
      const conflictingMembers = newHearing.panel.filter((member) =>
        hearing.panel.includes(member)
      );

      if (conflictingMembers.length > 0) {
        conflicts.push(
          `Panel member(s) ${conflictingMembers.join(', ')} have overlapping hearing at ${existingStart.toLocaleTimeString()}`
        );
      }
    }
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
};
