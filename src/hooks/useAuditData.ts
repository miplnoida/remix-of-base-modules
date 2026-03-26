import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= PROFILES (for Department Head selection) =============
export interface IAProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  user_code: string | null;
  is_active: boolean | null;
}

export function useIAProfiles() {
  return useQuery({
    queryKey: ['ia_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, user_code, is_active')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return (data || []) as IAProfile[];
    },
  });
}

// ============= DEPARTMENTS =============
export function useIADepartments() {
  return useQuery({
    queryKey: ['ia_departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useIADepartmentMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (dept: {
      name: string; head: string; email?: string; phone?: string; location?: string;
      risk_rating?: string; created_by?: string;
      office_code?: string; source_department_id?: string | null; head_profile_id?: string | null;
    }) => {
      const { data, error } = await supabase.from('ia_departments').insert(dept).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_departments'] });
      toast({ title: 'Department Added', description: 'New department has been added successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('ia_departments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_departments'] });
      toast({ title: 'Department Updated', description: 'Department has been updated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_departments').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_departments'] });
      toast({ title: 'Department Removed', description: 'Department has been removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
}

// ============= DEPARTMENT FUNCTIONS =============
export function useIADepartmentFunctions(departmentId?: string) {
  return useQuery({
    queryKey: ['ia_department_functions', departmentId],
    queryFn: async () => {
      let query = supabase.from('ia_department_functions').select('*').eq('is_active', true).order('function_name');
      if (departmentId && departmentId !== 'all') query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useIADepartmentFunctionMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (fn: any) => {
      const { data, error } = await supabase.from('ia_department_functions').insert(fn).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_department_functions'] });
      toast({ title: 'Function Added', description: 'New function has been added successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('ia_department_functions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_department_functions'] });
      toast({ title: 'Function Updated', description: 'Function has been updated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_department_functions').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_department_functions'] });
      toast({ title: 'Function Removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
}

// ============= HOLIDAYS =============
export function useIAHolidays(year?: number) {
  return useQuery({
    queryKey: ['ia_holidays', year],
    queryFn: async () => {
      let query = supabase.from('ia_holidays').select('*').eq('is_active', true).order('date');
      if (year) query = query.eq('year', year);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useIAHolidayMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (holiday: any) => {
      const { data, error } = await supabase.from('ia_holidays').insert(holiday).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_holidays'] });
      toast({ title: 'Holiday Added', description: 'New holiday has been added to the calendar' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('ia_holidays').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_holidays'] });
      toast({ title: 'Holiday Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_holidays').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_holidays'] });
      toast({ title: 'Holiday Removed', description: 'Holiday has been removed from the calendar', variant: 'destructive' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
}

// ============= AUDITORS =============
export function useIAAuditors() {
  return useQuery({
    queryKey: ['ia_auditors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_auditors').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Returns only active auditors for use in assignment dropdowns,
 * engagement forms, and any selection context.
 * Inactive auditors are preserved in the registry for history but excluded here.
 */
export function useIAActiveAuditors() {
  return useQuery({
    queryKey: ['ia_auditors', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_auditors')
        .select('*')
        .eq('employment_status', 'Active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useIAAuditorMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (auditor: any) => {
      const { data, error } = await supabase.from('ia_auditors').insert(auditor).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_auditors'] });
      toast({ title: 'Auditor Added', description: 'New auditor profile created successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('ia_auditors').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_auditors'] });
      toast({ title: 'Auditor Updated', description: 'Auditor profile updated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update };
}

// ============= LEAVE REQUESTS =============
export function useIALeaveRequests() {
  return useQuery({
    queryKey: ['ia_leave_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useIALeaveRequestMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (request: any) => {
      const { data, error } = await supabase.from('ia_leave_requests').insert(request).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_leave_requests'] });
      toast({ title: 'Leave Request Created', description: 'Leave request has been submitted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, decision_note }: { id: string; status: string; decision_note?: string }) => {
      const { data, error } = await supabase
        .from('ia_leave_requests')
        .update({ status, decision_note, decided_date: status !== 'Draft' ? new Date().toISOString() : null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_leave_requests'] });
      toast({ title: 'Leave Request Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, updateStatus };
}

// ============= ANNUAL PLANS =============
export function useIAAnnualPlans() {
  return useQuery({
    queryKey: ['ia_annual_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_annual_plans')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useIAAnnualPlanMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (plan: any) => {
      const { data, error } = await supabase.from('ia_annual_plans').insert(plan).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_annual_plans'] });
      toast({ title: 'Plan Created', description: 'Audit plan has been created' });
    },
    onError: (e: any) => { console.error('Annual plan create error:', e); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('ia_annual_plans').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_annual_plans'] });
      toast({ title: 'Plan Updated' });
    },
    onError: (e: any) => { console.error('Annual plan update error:', e); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  return { create, update };
}

// Re-export from split files to avoid TS2589 deep instantiation errors
export {
  useIADepartmentAudits, useIADepartmentAuditMutations,
  useIAActivities, useIAActivityMutations,
  useIAEvidence, useIAEvidenceMutations,
  useIAWorkingPapers, useIAWorkingPaperMutations,
} from './useAuditDataExtended';

export {
  useIAFindings, useIAFindingMutations,
  useIARecommendations, useIARecommendationMutations,
  useIAManagementResponses, useIAManagementResponseMutations,
  useIAActionTracking, useIAActionTrackingMutations,
  useIAFollowUps, useIAFollowUpMutations,
  useIADocumentTemplates, useIADocumentTemplateMutations,
  useIACommunications, useIACommunicationMutations,
  useIAAuditorWorkload,
} from './useAuditDataExtended2';
