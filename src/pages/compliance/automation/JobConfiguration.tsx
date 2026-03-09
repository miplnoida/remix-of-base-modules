import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Cog, Plus, Play, Clock, CheckCircle, XCircle, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AutomationJob {
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
}

const StatusIcon = ({ status }: { status: string | null }) => {
  if (status === 'success') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
};

const JobConfiguration = () => {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['ce_automation_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_automation_jobs').select('*').order('job_code');
      if (error) throw error;
      return (data || []) as unknown as AutomationJob[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('ce_automation_jobs').update({ is_enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_automation_jobs'] });
      toast.success('Job updated');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Automation Job Configuration</h1>
          </div>
          <p className="text-muted-foreground">Configure scheduled automation jobs for compliance enforcement</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Custom Job</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Jobs</p><p className="text-2xl font-bold text-foreground">{jobs.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-success">{jobs.filter(j => j.is_enabled).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-muted-foreground">{jobs.filter(j => !j.is_enabled).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Last Failed</p><p className="text-2xl font-bold text-destructive">{jobs.filter(j => j.last_run_status === 'failed').length}</p></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className={`transition-all ${!job.is_enabled ? 'opacity-60' : ''}`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground">{job.name}</p>
                    <Badge variant="secondary" className="text-[10px]">{job.job_type}</Badge>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{job.frequency}
                    </Badge>
                    <Badge variant={job.is_enabled ? 'default' : 'outline'} className="text-[10px]">
                      {job.is_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <StatusIcon status={job.last_run_status} />
                      Last run: {job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />Cron: {job.schedule_cron || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Button variant="outline" size="sm" className="gap-1" disabled={!job.is_enabled}>
                    <Play className="h-3 w-3" />Run Now
                  </Button>
                  <Switch
                    checked={job.is_enabled ?? false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: job.id, is_enabled: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JobConfiguration;
