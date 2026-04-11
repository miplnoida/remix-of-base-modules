import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ComplianceJob {
  id: string;
  job_code: string;
  name: string;
  description: string | null;
  job_type: string;
  schedule_cron: string | null;
  frequency: string | null;
  is_enabled: boolean | null;
  last_run_at: string | null;
  last_run_status: string | null;
  next_scheduled_at: string | null;
  parameters: Record<string, any> | null;
}

export interface JobRun {
  id: string;
  job_id: string;
  run_status: string;
  is_dry_run: boolean;
  triggered_by: string | null;
  records_processed: number | null;
  records_affected: number | null;
  errors_count: number | null;
  error_details: any;
  summary: any;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export function useComplianceJobs() {
  return useQuery({
    queryKey: ['ce_employer_compliance_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_automation_jobs')
        .select('*')
        .eq('job_type', 'employer_compliance')
        .order('job_code');
      if (error) throw error;
      return (data || []) as unknown as ComplianceJob[];
    },
  });
}

export function useJobRunHistory(jobId: string | null) {
  return useQuery({
    queryKey: ['ce_job_runs', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('ce_automation_job_runs')
        .select('*')
        .eq('job_id', jobId)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as JobRun[];
    },
    enabled: !!jobId,
  });
}

export function useRunComplianceJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobCode, dryRun }: { jobCode: string; dryRun: boolean }) => {
      const { data, error } = await supabase.functions.invoke('run-compliance-job', {
        body: { job_code: jobCode, dry_run: dryRun },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ce_employer_compliance_jobs'] });
      queryClient.invalidateQueries({ queryKey: ['ce_job_runs'] });
      const label = variables.dryRun ? 'Dry run' : 'Job';
      toast.success(`${label} completed`, {
        description: `Processed: ${data?.result?.processed ?? 0}, Affected: ${data?.result?.affected ?? 0}`,
      });
    },
    onError: (error: any) => {
      toast.error('Job execution failed', { description: error.message });
    },
  });
}

export function useToggleJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('ce_automation_jobs')
        .update({ is_enabled } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_employer_compliance_jobs'] });
      toast.success('Job status updated');
    },
  });
}
