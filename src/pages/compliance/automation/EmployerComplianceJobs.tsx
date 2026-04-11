import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Cog, Play, Clock, CheckCircle, XCircle, Calendar, Loader2,
  History, Eye, FlaskConical, Activity, AlertTriangle, BarChart3
} from 'lucide-react';
import {
  useComplianceJobs,
  useJobRunHistory,
  useRunComplianceJob,
  useToggleJob,
  ComplianceJob,
  JobRun,
} from '@/hooks/compliance/useComplianceJobs';

const StatusIcon = ({ status }: { status: string | null }) => {
  if (status === 'success') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  if (status === 'dry_run') return <FlaskConical className="h-3.5 w-3.5 text-primary" />;
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-warning" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const variant = {
    success: 'default' as const,
    failed: 'destructive' as const,
    running: 'secondary' as const,
    dry_run: 'outline' as const,
    pending: 'secondary' as const,
  }[status] || 'outline' as const;
  return <Badge variant={variant} className="text-[10px]">{status}</Badge>;
};

const EmployerComplianceJobs = () => {
  const { data: jobs = [], isLoading } = useComplianceJobs();
  const toggleMutation = useToggleJob();
  const runMutation = useRunComplianceJob();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: runs = [] } = useJobRunHistory(selectedJobId);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const openHistory = (jobId: string) => {
    setSelectedJobId(jobId);
    setHistoryOpen(true);
  };

  const handleRun = (jobCode: string, dryRun: boolean) => {
    runMutation.mutate({ jobCode, dryRun });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCount = jobs.filter(j => j.is_enabled).length;
  const failedCount = jobs.filter(j => j.last_run_status === 'failed').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Employer Compliance Jobs</h1>
          </div>
          <p className="text-muted-foreground">
            Scheduled refresh jobs for employer compliance status, risk scores, flags, and reconciliation
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Jobs</p>
            <p className="text-2xl font-bold text-foreground">{jobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-success">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-muted-foreground">{jobs.length - activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <p className="text-xs text-muted-foreground">Last Failed</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{failedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Cards */}
      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className={`transition-all ${!job.is_enabled ? 'opacity-60' : ''}`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-medium text-foreground">{job.name}</p>
                    <Badge variant="secondary" className="text-[10px]">{job.job_code}</Badge>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{job.frequency}
                    </Badge>
                    <Badge variant={job.is_enabled ? 'default' : 'outline'} className="text-[10px]">
                      {job.is_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <StatusIcon status={job.last_run_status} />
                      Last: {job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never'}
                      {job.last_run_status && <StatusBadge status={job.last_run_status} />}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />Cron: {job.schedule_cron || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => openHistory(job.id)}
                  >
                    <History className="h-3 w-3" />History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!job.is_enabled || runMutation.isPending}
                    onClick={() => handleRun(job.job_code, true)}
                  >
                    <FlaskConical className="h-3 w-3" />Dry Run
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1"
                    disabled={!job.is_enabled || runMutation.isPending}
                    onClick={() => handleRun(job.job_code, false)}
                  >
                    {runMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Run Now
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

      {/* Run History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Run History — {selectedJob?.name}
            </DialogTitle>
          </DialogHeader>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No run history available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Affected</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Triggered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-xs">
                      {new Date(run.started_at).toLocaleString()}
                    </TableCell>
                    <TableCell><StatusBadge status={run.run_status} /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {run.is_dry_run ? 'Dry Run' : 'Live'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{run.records_processed ?? 0}</TableCell>
                    <TableCell className="text-sm">{run.records_affected ?? 0}</TableCell>
                    <TableCell className="text-sm">
                      {(run.errors_count ?? 0) > 0 ? (
                        <span className="text-destructive font-medium">{run.errors_count}</span>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {run.triggered_by || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployerComplianceJobs;
