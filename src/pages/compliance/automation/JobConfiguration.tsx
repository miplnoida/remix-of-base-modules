import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cog, Plus, Play, Clock, CheckCircle, XCircle, Calendar, Loader2, AlertTriangle, Archive, Zap, Timer, Hand, ArrowRight, ShieldAlert } from 'lucide-react';
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
  parameters: Record<string, any> | null;
}

const StatusIcon = ({ status }: { status: string | null }) => {
  if (status === 'success') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
};

const ExecutionModeIcon = ({ mode }: { mode: string | undefined }) => {
  if (mode === 'scheduled') return <Timer className="h-3 w-3" />;
  if (mode === 'event-driven') return <Zap className="h-3 w-3" />;
  if (mode === 'manual') return <Hand className="h-3 w-3" />;
  return null;
};

const PhaseBadge = ({ phase, label }: { phase: number | undefined; label: string | undefined }) => {
  if (!phase || !label) return null;
  const colors: Record<number, string> = {
    1: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    2: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
    3: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    4: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    5: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    6: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[phase] || ''}`}>
      P{phase}: {label}
    </Badge>
  );
};

const ReadinessBadge = ({ job }: { job: AutomationJob }) => {
  const params = job.parameters || {};
  const isDeprecated = params.status === 'DEPRECATED';
  const hasRuntime = params.has_runtime === true;
  const blockedReason = params.blocked_reason;

  if (isDeprecated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-dashed gap-1">
              <Archive className="h-3 w-3" /> Deprecated
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">Superseded by <strong>{params.superseded_by}</strong></p>
            <p className="text-xs text-muted-foreground mt-1">{params.deprecation_reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (job.is_enabled && hasRuntime) {
    return (
      <Badge variant="default" className="text-[10px] gap-1">
        <CheckCircle className="h-3 w-3" /> Active
      </Badge>
    );
  }

  if (hasRuntime && !job.is_enabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-1">
              Ready
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Runtime available. Can be enabled for dry-run.</p>
            {blockedReason && <p className="text-xs text-muted-foreground mt-1">{blockedReason}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="text-[10px] bg-destructive/5 text-destructive border-destructive/20 gap-1">
            <ShieldAlert className="h-3 w-3" /> No Runtime
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{blockedReason || 'Edge function not yet implemented'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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

  // Separate canonical from deprecated
  const canonicalJobs = jobs.filter(j => j.parameters?.status !== 'DEPRECATED');
  const deprecatedJobs = jobs.filter(j => j.parameters?.status === 'DEPRECATED');

  // Sort canonical by pipeline phase
  const sortedCanonical = [...canonicalJobs].sort((a, b) => {
    const phaseA = a.parameters?.pipeline_phase ?? 99;
    const phaseB = b.parameters?.pipeline_phase ?? 99;
    return phaseA - phaseB;
  });

  const activeCount = jobs.filter(j => j.is_enabled).length;
  const readyCount = canonicalJobs.filter(j => !j.is_enabled && j.parameters?.has_runtime).length;
  const blockedCount = canonicalJobs.filter(j => !j.parameters?.has_runtime).length;

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Canonical Jobs</p><p className="text-2xl font-bold text-foreground">{canonicalJobs.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-success">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Ready</p><p className="text-2xl font-bold text-primary">{readyCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Blocked</p><p className="text-2xl font-bold text-destructive">{blockedCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Deprecated</p><p className="text-2xl font-bold text-muted-foreground">{deprecatedJobs.length}</p></CardContent></Card>
      </div>

      {/* Canonical Jobs */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-foreground">Canonical Pipeline Jobs</h2>
        <div className="grid gap-3">
          {sortedCanonical.map((job) => {
            const params = job.parameters || {};
            const hasRuntime = params.has_runtime === true;
            const isBlocked = !hasRuntime;

            return (
              <Card key={job.id} className={`transition-all ${isBlocked ? 'opacity-60' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{job.name}</p>
                        <Badge variant="secondary" className="text-[10px] font-mono">{job.job_code}</Badge>
                        <PhaseBadge phase={params.pipeline_phase} label={params.pipeline_label} />
                        {params.execution_mode && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <ExecutionModeIcon mode={params.execution_mode} />
                            {params.execution_mode}
                          </Badge>
                        )}
                        <ReadinessBadge job={job} />
                        {params.activation_wave && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Wave {params.activation_wave}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <StatusIcon status={job.last_run_status} />
                          Last run: {job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{job.frequency}
                        </span>
                        {params.depends_on && params.depends_on.length > 0 && (
                          <span className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            Depends: {params.depends_on.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <Button variant="outline" size="sm" className="gap-1" disabled={isBlocked || !job.is_enabled}>
                        <Play className="h-3 w-3" />Run Now
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch
                                checked={job.is_enabled ?? false}
                                disabled={isBlocked}
                                onCheckedChange={(checked) => toggleMutation.mutate({ id: job.id, is_enabled: checked })}
                              />
                            </span>
                          </TooltipTrigger>
                          {isBlocked && (
                            <TooltipContent>
                              <p className="text-xs">Cannot enable: {params.blocked_reason || 'No runtime'}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Deprecated Jobs */}
      {deprecatedJobs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-muted-foreground flex items-center gap-2">
            <Archive className="h-4 w-4" /> Deprecated Jobs
          </h2>
          <div className="grid gap-3">
            {deprecatedJobs.map((job) => {
              const params = job.parameters || {};
              return (
                <Card key={job.id} className="opacity-50 border-dashed">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-muted-foreground line-through">{job.name}</p>
                          <Badge variant="secondary" className="text-[10px] font-mono">{job.job_code}</Badge>
                          <ReadinessBadge job={job} />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          Replaced by <strong>{params.superseded_by}</strong>
                        </p>
                      </div>
                      <Switch checked={false} disabled />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobConfiguration;
