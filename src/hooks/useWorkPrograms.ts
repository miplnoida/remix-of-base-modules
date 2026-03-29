import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditFields } from '@/hooks/useAuditTrail';

// ============= WORK PROGRAMS =============
export function useWorkPrograms(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_work_programs', engagementId],
    queryFn: async () => {
      let q = supabase.from('ia_work_programs' as any).select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (engagementId) q = q.eq('engagement_id', engagementId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

export function useWorkProgramMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const create = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'create'],
    mutationFn: async (record: any) => {
      const { data, error } = await supabase.from('ia_work_programs' as any)
        .insert({ ...record, ...getCreateFields() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_work_programs'] });
      toast({ title: 'Work Program Created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'create'],
    mutationFn: async ({ id, ...updates }: { id: string;[k: string]: any }) => {
      const { data, error } = await supabase.from('ia_work_programs' as any)
        .update({ ...updates, ...getUpdateFields() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_work_programs'] });
      toast({ title: 'Work Program Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const archive = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'update'],
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_work_programs' as any).update({ is_active: false } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_work_programs'] });
      toast({ title: 'Work Program Archived' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, archive };
}

// ============= WORK PROGRAM STEPS =============
export function useWorkProgramSteps(workProgramId?: string) {
  return useQuery({
    queryKey: ['ia_work_program_steps', workProgramId],
    queryFn: async () => {
      let q = supabase.from('ia_work_program_steps' as any).select('*').eq('is_active', true).order('step_number');
      if (workProgramId) q = q.eq('work_program_id', workProgramId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workProgramId,
  });
}

export function useWorkProgramStepMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const create = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'create'],
    mutationFn: async (record: any) => {
      const { data, error } = await supabase.from('ia_work_program_steps' as any)
        .insert({ ...record, ...getCreateFields() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_work_program_steps'] });
      toast({ title: 'Step Created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'create'],
    mutationFn: async ({ id, ...updates }: { id: string;[k: string]: any }) => {
      const { data, error } = await supabase.from('ia_work_program_steps' as any)
        .update({ ...updates, ...getUpdateFields() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_work_program_steps'] });
      toast({ title: 'Step Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'update'],
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_work_program_steps' as any).update({ is_active: false } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_work_program_steps'] });
      toast({ title: 'Step Removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
}

// ============= TESTING PROCEDURES =============
export function useTestingProcedures(stepId?: string) {
  return useQuery({
    queryKey: ['ia_testing_procedures', stepId],
    queryFn: async () => {
      let q = supabase.from('ia_testing_procedures' as any).select('*').eq('is_active', true).order('created_at');
      if (stepId) q = q.eq('step_id', stepId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!stepId,
  });
}

export function useTestingProcedureMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const create = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'create'],
    mutationFn: async (record: any) => {
      const { data, error } = await supabase.from('ia_testing_procedures' as any)
        .insert({ ...record, ...getCreateFields() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_testing_procedures'] });
      toast({ title: 'Testing Procedure Created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationKey: ['InternalAudit', 'ia_work_programs', 'create'],
    mutationFn: async ({ id, ...updates }: { id: string;[k: string]: any }) => {
      const { data, error } = await supabase.from('ia_testing_procedures' as any)
        .update({ ...updates, ...getUpdateFields() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_testing_procedures'] });
      toast({ title: 'Testing Procedure Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update };
}
