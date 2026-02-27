import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= DEPARTMENT AUDITS =============
export function useIADepartmentAudits(planId?: string) {
  return useQuery({
    queryKey: ['ia_department_audits', planId],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('ia_department_audits').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const result = data ?? [];
      return planId ? result.filter((r: any) => r.plan_id === planId) : result;
    },
  });
}

export function useIADepartmentAuditMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async (audit: any) => {
      const { data, error } = await supabase.from('ia_department_audits').insert(audit).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_department_audits'] }); toast({ title: 'Department Audit Created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => {
      const { data, error } = await supabase.from('ia_department_audits').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_department_audits'] }); toast({ title: 'Department Audit Updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create, update };
}

// ============= ACTIVITIES =============
export function useIAActivities(filters?: { department_audit_id?: string; auditor_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['ia_activities', filters],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('ia_activities').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      let result = data ?? [];
      if (filters?.department_audit_id) result = result.filter((r: any) => r.department_audit_id === filters.department_audit_id);
      if (filters?.auditor_id) result = result.filter((r: any) => r.auditor_id === filters.auditor_id);
      if (filters?.status) result = result.filter((r: any) => r.status === filters.status);
      return result;
    },
  });
}

export function useIAActivityMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async (a: any) => { const { data, error } = await supabase.from('ia_activities').insert(a).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_activities'] }); toast({ title: 'Activity Created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => { const { data, error } = await supabase.from('ia_activities').update(u).eq('id', id).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_activities'] }); toast({ title: 'Activity Updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create, update };
}

// ============= EVIDENCE =============
export function useIAEvidence(activityId?: string) {
  return useQuery({
    queryKey: ['ia_evidence', activityId],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('ia_evidence').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const result = data ?? [];
      return activityId ? result.filter((r: any) => r.activity_id === activityId) : result;
    },
  });
}

export function useIAEvidenceMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async (ev: any) => { const { data, error } = await supabase.from('ia_evidence').insert(ev).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_evidence'] }); toast({ title: 'Evidence Added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => { const { data, error } = await supabase.from('ia_evidence').update(u).eq('id', id).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_evidence'] }); toast({ title: 'Evidence Updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create, update };
}

// ============= WORKING PAPERS =============
export function useIAWorkingPapers(activityId?: string) {
  return useQuery({
    queryKey: ['ia_working_papers', activityId],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('ia_working_papers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const result = data ?? [];
      return activityId ? result.filter((r: any) => r.activity_id === activityId) : result;
    },
  });
}

export function useIAWorkingPaperMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async (wp: any) => { const { data, error } = await supabase.from('ia_working_papers').insert(wp).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_working_papers'] }); toast({ title: 'Working Paper Created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => { const { data, error } = await supabase.from('ia_working_papers').update(u).eq('id', id).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_working_papers'] }); toast({ title: 'Working Paper Updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create, update };
}
