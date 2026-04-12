import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play, Clock, CheckCircle, XCircle, Shield, Archive, Timer, Zap, Hand,
  Database, FileOutput, AlertTriangle, ArrowRight, ArrowDown, Bell, BookOpen,
  Loader2, ShieldAlert, BarChart3, Pencil,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatAuditDateTime } from '@/lib/dateFormat';

import type { AutomationJob, JobRun } from '@/types/automationJob';

interface JobDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: AutomationJob | null;
  allJobs: AutomationJob[];
  onEdit: () => void;
  onToggle: (enable: boolean) => void;
  onRunNow: () => void;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    success: { icon: <CheckCircle className="h-3 w-3" />, cls: 'bg-success/10 text-success border-success/20' },
    failed: { icon: <XCircle className="h-3 w-3" />, cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    running: { icon: <Loader2 className="h-3 w-3 animate-spin" />, cls: 'bg-primary/10 text-primary border-primary/20' },
  };
  const s = map[status] || { icon: <Clock className="h-3 w-3" />, cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={`text-[10px] gap-1 ${s.cls}`}>{s.icon}{status}</Badge>;
};

const BoolFlag = ({ value, label }: { value: boolean; label: string }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    {value
      ? <Badge variant="default" className="text-[10px]">Yes</Badge>
      : <Badge variant="outline" className="text-[10px] text-muted-foreground">No</Badge>
    }
  </div>
);

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  open, onOpenChange, job, allJobs, onEdit, onToggle, onRunNow,
}) => {
  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['ce_job_runs_detail', job?.id],
    queryFn: async () => {
      if (!job) return [];
      const { data, error } = await supabase
        .from('ce_automation_job_runs')
        .select('*')
        .eq('job_id', job.id)
        .order('started_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data || []) as unknown as JobRun[];
    },
    enabled: !!job?.id && open,
  });

  if (!job) return null;

  const params = job.parameters || {};
  const actions = params.actions || {};
  const isDeprecated = params.status === 'DEPRECATED';
  const hasRuntime = params.has_runtime === true;
  const deps = (params.depends_on || []) as string[];
  const downstream = (params.downstream_jobs || []) as string[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="flex items-center gap-2 text-lg">
                {job.name}
                <Badge variant="secondary" className="text-[10px] font-mono">{job.job_code}</Badge>
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {params.job_classification === 'canonical' && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 text-primary border-primary/20">
                    <Shield className="h-3 w-3" />System
                  </Badge>
                )}
                {isDeprecated && (
                  <Badge variant="outline" className="text-[10px] border-dashed text-muted-foreground gap-1">
                    <Archive className="h-3 w-3" />Deprecated
                  </Badge>
                )}
                {params.pipeline_phase && (
                  <Badge variant="outline" className="text-[10px]">
                    P{params.pipeline_phase}: {params.pipeline_label}
                  </Badge>
                )}
                {params.execution_mode && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    {params.execution_mode === 'scheduled' ? <Timer className="h-3 w-3" /> :
                     params.execution_mode === 'event-driven' ? <Zap className="h-3 w-3" /> :
                     <Hand className="h-3 w-3" />}
                    {params.execution_mode}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-6">

            {/* Schedule & Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Schedule & Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Switch
                        checked={job.is_enabled ?? false}
                        onCheckedChange={onToggle}
                        disabled={!hasRuntime && !(job.is_enabled)}
                      />
                      <span className={job.is_enabled ? 'text-success font-medium' : 'text-muted-foreground'}>
                        {job.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cron</p>
                    <p className="font-mono text-sm mt-1">{job.schedule_cron || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Frequency</p>
                    <p className="text-sm mt-1">{job.frequency || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Timezone</p>
                    <p className="text-sm mt-1">{params.timezone || 'UTC'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Run</p>
                    <p className="text-sm mt-1">{job.last_run_at ? formatAuditDateTime(job.last_run_at) : 'Never'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Next Scheduled</p>
                    <p className="text-sm mt-1">{job.next_scheduled_at ? formatAuditDateTime(job.next_scheduled_at) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Overlap Policy</p>
                    <p className="text-sm mt-1 capitalize">{params.overlap_policy || 'skip'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Runtime Handler</p>
                    <p className="text-sm mt-1 font-mono">{params.edge_function || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" disabled={!hasRuntime || !job.is_enabled} onClick={onRunNow} className="gap-1">
                    <Play className="h-3 w-3" />Run Now
                  </Button>
                  {params.dry_run_default && (
                    <Button size="sm" variant="outline" disabled={!hasRuntime} className="gap-1">
                      <Play className="h-3 w-3" />Dry Run
                    </Button>
                  )}
                </div>
                {!hasRuntime && (
                  <div className="flex items-center gap-2 text-xs text-destructive p-2 bg-destructive/5 rounded">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {params.blocked_reason || 'No edge function runtime implemented'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* What This Job Does */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> What This Job Does
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{params.canonical_purpose || job.description || '—'}</p>
                <Separator />
                <BoolFlag value={actions.creates_records ?? false} label="Creates new records" />
                <BoolFlag value={actions.updates_records ?? false} label="Updates existing records" />
                <BoolFlag value={actions.sends_notices ?? false} label="Sends notices / notifications" />
                <BoolFlag value={actions.posts_ledger ?? false} label="Posts ledger entries" />
                <BoolFlag value={actions.affects_risk ?? false} label="Affects risk profile" />
                <BoolFlag value={params.dry_run_default ?? false} label="Supports dry-run mode" />
              </CardContent>
            </Card>

            {/* Data Sources & Targets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" /> Data Sources & Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(actions.reads_from || []).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Database className="h-3 w-3" /> Reads from</p>
                    <div className="flex flex-wrap gap-1">
                      {actions.reads_from.map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px] font-mono">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(actions.writes_to || []).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileOutput className="h-3 w-3" /> Writes to</p>
                    <div className="flex flex-wrap gap-1">
                      {actions.writes_to.map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[10px] font-mono">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dependencies & Downstream */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" /> Dependencies & Downstream
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Depends on (upstream)</p>
                  {deps.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No upstream dependencies — can run independently</p>
                  ) : (
                    <div className="space-y-1">
                      {deps.map(d => {
                        const depJob = allJobs.find(j => j.job_code === d);
                        return (
                          <div key={d} className="flex items-center gap-2 text-sm">
                            <ArrowDown className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className="font-mono text-[10px]">{d}</Badge>
                            <span className="text-muted-foreground">{depJob?.name || 'Unknown'}</span>
                            {depJob && (
                              depJob.is_enabled
                                ? <CheckCircle className="h-3 w-3 text-success" />
                                : <XCircle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Downstream (consumes output)</p>
                  {downstream.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Terminal job — no downstream consumers</p>
                  ) : (
                    <div className="space-y-1">
                      {downstream.map(d => {
                        const dsJob = allJobs.find(j => j.job_code === d);
                        return (
                          <div key={d} className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className="font-mono text-[10px]">{d}</Badge>
                            <span className="text-muted-foreground">{dsJob?.name || 'Unknown'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-1">
                  <BoolFlag value={params.safe_independent_run ?? false} label="Safe to run independently" />
                  <BoolFlag value={params.block_on_upstream_failure ?? false} label="Block if upstream failed" />
                </div>
              </CardContent>
            </Card>

            {/* Communication Chain */}
            {(actions.sends_notices || actions.affects_risk || actions.posts_ledger) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Impact & Communication Chain
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {actions.affects_risk && (
                      <p className="flex items-center gap-2">
                        <BarChart3 className="h-3.5 w-3.5 text-primary" />
                        This job affects employer risk profiles — downstream risk recalculation may be needed
                      </p>
                    )}
                    {actions.posts_ledger && (
                      <p className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-primary" />
                        This job posts financial entries to the compliance ledger
                      </p>
                    )}
                    {actions.sends_notices && (
                      <p className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-primary" />
                        This job creates and/or sends notices to employers
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Run History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Recent Run History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {runsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">No run history</p>
                ) : (
                  <div className="space-y-2">
                    {runs.map(run => (
                      <div key={run.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge status={run.run_status} />
                          {run.is_dry_run && <Badge variant="outline" className="text-[10px]">dry-run</Badge>}
                          <span className="text-xs text-muted-foreground truncate">
                            {formatAuditDateTime(run.started_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          <span>{run.records_processed ?? 0} scanned</span>
                          <span>{run.records_affected ?? 0} changed</span>
                          {(run.errors_count ?? 0) > 0 && (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />{run.errors_count} errors
                            </span>
                          )}
                          {run.duration_ms != null && (
                            <span>{(run.duration_ms / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {params.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Operational Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{params.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
