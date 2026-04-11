import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployerSnapshot {
  id: string;
  employer_id: string;
  snapshot_trigger: string;
  snapshot_trigger_id: string | null;
  snapshot_trigger_type: string | null;
  snapshot_at: string;
  snapshot_by: string | null;
  employer_name: string | null;
  employer_status: string | null;
  trade_name: string | null;
  sector_code: string | null;
  office_code: string | null;
  compliance_status: string | null;
  filing_status: string | null;
  payment_status: string | null;
  current_arrears: number | null;
  current_penalties: number | null;
  active_violations: number | null;
  active_cases: number | null;
  risk_score: number | null;
  risk_band: string | null;
  group_name: string | null;
  active_flags: any;
  created_at: string;
}

export function useEmployerSnapshots(employerId?: string) {
  return useQuery({
    queryKey: ['ce-employer-snapshots', employerId],
    queryFn: async () => {
      let query = supabase
        .from('ce_employer_snapshots')
        .select('*')
        .order('snapshot_at', { ascending: false });
      if (employerId) query = query.eq('employer_id', employerId);
      const { data, error } = await query;
      if (error) throw error;
      return data as EmployerSnapshot[];
    },
    enabled: !!employerId,
  });
}

export function useSnapshotDetail(snapshotId?: string) {
  return useQuery({
    queryKey: ['ce-employer-snapshot-detail', snapshotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_employer_snapshots')
        .select('*')
        .eq('id', snapshotId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!snapshotId,
  });
}

export function useCreateEmployerSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      employer_id: string;
      trigger: string;
      trigger_id?: string;
      trigger_type?: string;
      snapshot_by?: string;
    }) => {
      const { data, error } = await supabase.rpc('ce_create_employer_snapshot', {
        p_employer_id: params.employer_id,
        p_trigger: params.trigger,
        p_trigger_id: params.trigger_id || null,
        p_trigger_type: params.trigger_type || null,
        p_snapshot_by: params.snapshot_by || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-employer-snapshots'] });
      toast.success('Employer snapshot created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCaseSnapshots(caseId?: string) {
  return useQuery({
    queryKey: ['ce-case-snapshots', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_case_employer_snapshot')
        .select('*, snapshot:ce_employer_snapshots(*)')
        .eq('case_id', caseId!);
      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });
}

export function useViolationSnapshots(violationId?: string) {
  return useQuery({
    queryKey: ['ce-violation-snapshots', violationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_violation_employer_snapshot')
        .select('*, snapshot:ce_employer_snapshots(*)')
        .eq('violation_id', violationId!);
      if (error) throw error;
      return data;
    },
    enabled: !!violationId,
  });
}

export function useLinkSnapshotToCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ case_id, snapshot_id, created_by }: { case_id: string; snapshot_id: string; created_by?: string }) => {
      const { data, error } = await supabase
        .from('ce_case_employer_snapshot')
        .insert({ case_id, snapshot_id, created_by } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-case-snapshots'] });
      toast.success('Snapshot linked to case');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLinkSnapshotToViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ violation_id, snapshot_id, created_by }: { violation_id: string; snapshot_id: string; created_by?: string }) => {
      const { data, error } = await supabase
        .from('ce_violation_employer_snapshot')
        .insert({ violation_id, snapshot_id, created_by } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-violation-snapshots'] });
      toast.success('Snapshot linked to violation');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
