import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEmployerContactView(employerId?: string) {
  return useQuery({
    queryKey: ['ce-employer-contact-view', employerId],
    queryFn: async () => {
      let query = supabase.from('ce_employer_contact_view').select('*');
      if (employerId) query = query.eq('employer_id', employerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!employerId,
  });
}

export function useEmployerContactPreferences(employerId?: string) {
  return useQuery({
    queryKey: ['ce-employer-contact-prefs', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_employer_contact_preferences')
        .select('*')
        .eq('employer_id', employerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employerId,
  });
}

export function useUpsertContactPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Record<string, any>) => {
      const { data, error } = await supabase
        .from('ce_employer_contact_preferences')
        .upsert(prefs as any, { onConflict: 'employer_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ce-employer-contact-prefs'] });
      qc.invalidateQueries({ queryKey: ['ce-employer-contact-view'] });
      toast.success('Contact preferences saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useNoticeRecipients(employerId?: string) {
  return useQuery({
    queryKey: ['ce-notice-recipients', employerId],
    queryFn: async () => {
      let query = supabase
        .from('ce_employer_notice_recipients')
        .select('*')
        .order('created_at', { ascending: false });
      if (employerId) query = query.eq('employer_id', employerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!employerId,
  });
}

export function useCreateNoticeRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipient: Record<string, any>) => {
      const { data, error } = await supabase
        .from('ce_employer_notice_recipients')
        .insert(recipient as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-notice-recipients'] });
      toast.success('Notice recipient created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateNoticeRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from('ce_employer_notice_recipients')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-notice-recipients'] });
      toast.success('Notice recipient updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useServiceLog(employerId?: string) {
  return useQuery({
    queryKey: ['ce-service-log', employerId],
    queryFn: async () => {
      let query = supabase
        .from('ce_employer_service_log')
        .select('*')
        .order('attempted_at', { ascending: false });
      if (employerId) query = query.eq('employer_id', employerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!employerId,
  });
}

export function useCreateServiceLogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Record<string, any>) => {
      const { data, error } = await supabase
        .from('ce_employer_service_log')
        .insert(entry as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-service-log'] });
      toast.success('Service log entry created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
