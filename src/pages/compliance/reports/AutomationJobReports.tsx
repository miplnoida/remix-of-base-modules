import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StandardModal } from '@/components/common/StandardModal';
import { Zap, CheckCircle, XCircle, AlertTriangle, Download, Loader2, Eye, FlaskConical, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportReportToExcel } from '@/utils/reportExcelExport';

interface RunRow {
  id: string;
  job_id: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_processed: number | null;
  records_affected: number | null;
  error_message: string | null;
  execution_log: any;
  triggered_by: string | null;
  is_dry_run: boolean | null;
  parameters: any;
}

interface JobRow {
  id: string;
  job_code: string;
  name: string;
  is_enabled: boolean | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function AutomationJobReports() {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ['ce_automation_jobs_for_report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_automation_jobs')
        .select('id, job_code, name, is_enabled')
        .order('job_code');
      if (error) throw error;
      return (data || []) as unknown as JobRow[];
    },
  });

  const {
    data: runs = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['ce_automation_runs_report', from, to, jobFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('ce_automation_runs')
        .select('*')
        .gte('started_at', `${from}T00:00:00Z`)
        .lte('started_at', `${to}T23:59:59Z`)
        .order('started_at', { ascending: false })
        .limit(1000);
      if (jobFilter !== 'all') q = q.eq('job_id', jobFilter);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RunRow[];
    },
  });

  const jobMap = useMemo(
    () => Object.fromEntries(jobs.map(j => [j.id, j])),
    [jobs],
  );

  const summary = useMemo(() => {
    const total = runs.length;
    const success = runs.filter(r => r.status === 'COMPLETED').length;
    const failed = runs.filter(r => r.status === 'FAILED').length;
    const running = runs.filter(r => r.status === 'RUNNING').length;
    const dryRuns = runs.filter(r => r.is_dry_run).length;
    const totalErrors = runs.reduce((sum, r) => {
      const log = r.execution_log;
      const fromLog =
        (log?.scan_details?.errors_count as number) ??
        (Array.isArray(log?.errors) ? log.errors.length : 0);
      return sum + (r.status === 'FAILED' ? 1 : 0) + (fromLog || 0);
    }, 0);
    const totalWarnings = runs.reduce((sum, r) => {
      const log = r.execution_log;
      return sum + (Array.isArray(log?.warnings) ? log.warnings.length : 0);
    }, 0);
    return { total, success, failed, running, dryRuns, totalErrors, totalWarnings };
  }, [runs]);

  // Per-job breakdown
  const perJob = useMemo(() => {
    const map = new Map<string, { jobId: string; name: string; code: string; total: number; success: number; failed: number; lastRun: string | null; lastStatus: string | null; errors: number }>();
    for (const r of runs) {
      if (!r.job_id) continue;
      const j = jobMap[r.job_id];
      const key = r.job_id;
      const entry = map.get(key) ?? {
        jobId: r.job_id,
        name: j?.name ?? 'Unknown',
        code: j?.job_code ?? '—',
        total: 0,
        success: 0,
        failed: 0,
        lastRun: null,
        lastStatus: null,
        errors: 0,
      };
      entry.total++;
      if (r.status === 'COMPLETED') entry.success++;
      if (r.status === 'FAILED') {
        entry.failed++;
        entry.errors++;
      }
      const logErrs =
        (r.execution_log?.scan_details?.errors_count as number) ??
        (Array.isArray(r.execution_log?.errors) ? r.execution_log.errors.length : 0);
      entry.errors += logErrs || 0;
      if (!entry.lastRun || new Date(r.started_at) > new Date(entry.lastRun)) {
        entry.lastRun = r.started_at;
        entry.lastStatus = r.status;
      }
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.failed - a.failed || b.total - a.total);
  }, [runs, jobMap]);

  const failures = useMemo(
    () =>
      runs
        .filter(r => r.status === 'FAILED' || (r.execution_log?.scan_details?.errors_count ?? 0) > 0 || (Array.isArray(r.execution_log?.errors) && r.execution_log.errors.length > 0))
        .slice(0, 100),
    [runs],
  );

  const handleExport = async () => {
    await exportReportToExcel(
      runs.map(r => ({
        job_code: jobMap[r.job_id || '']?.job_code ?? '—',
        job_name: jobMap[r.job_id || '']?.name ?? 'Unknown',
        started_at: r.started_at,
        completed_at: r.completed_at ?? '',
        status: r.status,
        mode: r.is_dry_run ? 'Dry Run' : 'Live',
        records_processed: r.records_processed ?? 0,
        records_affected: r.records_affected ?? 0,
        triggered_by: r.triggered_by ?? '',
        error_message: r.error_message ?? '',
      })),
      [
        { header: 'Job Code', key: 'job_code', width: 18 },
        { header: 'Job Name', key: 'job_name', width: 32 },
        { header: 'Started At', key: 'started_at', width: 22 },
        { header: 'Completed At', key: 'completed_at', width: 22 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Mode', key: 'mode', width: 12 },
        { header: 'Records Processed', key: 'records_processed', width: 18 },
        { header: 'Records Affected', key: 'records_affected', width: 18 },
        { header: 'Triggered By', key: 'triggered_by', width: 18 },
        { header: 'Error Message', key: 'error_message', width: 60 },
      ],
      `automation-job-report-${from}-to-${to}`,
      'Automation Job Runs',
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Automation Job Reports</h1>
          </div>
          <p className="text-muted-foreground">
            Execution outcomes, errors, and warnings across compliance automation jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="gap-2" onClick={handleExport} disabled={runs.length === 0}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Job</Label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_code} — {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="RUNNING">Running</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Runs</p><p className="text-2xl font-bold text-foreground">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-success">{summary.success}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-destructive">{summary.failed}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Running</p><p className="text-2xl font-bold text-primary">{summary.running}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Dry Runs</p><p className="text-2xl font-bold text-foreground">{summary.dryRuns}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Errors</p><p className="text-2xl font-bold text-destructive">{summary.totalErrors}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Warnings</p><p className="text-2xl font-bold text-warning">{summary.totalWarnings}</p></CardContent></Card>
      </div>

      {/* Per-job breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Job Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          {perJob.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No runs in selected range</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-center">Last Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perJob.map(j => {
                  const rate = j.total > 0 ? Math.round((j.success / j.total) * 100) : 0;
                  return (
                    <TableRow key={j.jobId}>
                      <TableCell className="font-medium">{j.name}</TableCell>
                      <TableCell className="font-mono text-xs">{j.code}</TableCell>
                      <TableCell className="text-right">{j.total}</TableCell>
                      <TableCell className="text-right text-success">{j.success}</TableCell>
                      <TableCell className="text-right text-destructive">{j.failed}</TableCell>
                      <TableCell className="text-right text-destructive">{j.errors}</TableCell>
                      <TableCell className="text-right">{rate}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {j.lastRun ? new Date(j.lastRun).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {j.lastStatus === 'COMPLETED' ? (
                          <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>
                        ) : j.lastStatus === 'FAILED' ? (
                          <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="h-3 w-3" />Failed</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">{j.lastStatus ?? '—'}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent failures & warnings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Errors & Warnings ({failures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No errors or warnings in selected range</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-center">Mode</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{jobMap[r.job_id || '']?.name ?? 'Unknown'}</TableCell>
                    <TableCell className="text-xs">{new Date(r.started_at).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      {r.is_dry_run ? (
                        <Badge variant="outline" className="text-[10px] gap-1"><FlaskConical className="h-3 w-3" />Dry</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Live</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.status === 'FAILED' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[360px] truncate">
                      {r.error_message || (Array.isArray(r.execution_log?.errors) && r.execution_log.errors.length > 0 ? r.execution_log.errors[0] : '—')}
                    </TableCell>
                    <TableCell className="text-xs">{r.triggered_by ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRun(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StandardModal
        open={!!selectedRun}
        onOpenChange={(open) => { if (!open) setSelectedRun(null); }}
        title="Run Diagnostics"
        mode="view"
        size="3xl"
      >
        {selectedRun && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Job</p><p>{jobMap[selectedRun.job_id || '']?.name ?? 'Unknown'}</p></div>
              <div><p className="text-xs text-muted-foreground">Code</p><p className="font-mono text-xs">{jobMap[selectedRun.job_id || '']?.job_code ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><p>{selectedRun.status}</p></div>
              <div><p className="text-xs text-muted-foreground">Started</p><p>{new Date(selectedRun.started_at).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Completed</p><p>{selectedRun.completed_at ? new Date(selectedRun.completed_at).toLocaleString() : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Triggered By</p><p>{selectedRun.triggered_by ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Records Processed</p><p>{(selectedRun.records_processed ?? 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Records Affected</p><p>{(selectedRun.records_affected ?? 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Mode</p><p>{selectedRun.is_dry_run ? 'Dry Run' : 'Live'}</p></div>
            </div>
            {selectedRun.error_message && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-xs font-medium text-destructive mb-1">Error Message</p>
                <p className="text-sm text-destructive whitespace-pre-wrap">{selectedRun.error_message}</p>
              </div>
            )}
            {selectedRun.execution_log && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Execution Log</p>
                <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-auto max-h-96 font-mono">
                  {JSON.stringify(selectedRun.execution_log, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </StandardModal>
    </div>
  );
}
