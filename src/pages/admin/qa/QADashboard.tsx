import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Play, RefreshCw, Download, ChevronRight, CheckCircle2, XCircle,
  AlertTriangle, Clock, BarChart3, Shield, Layers, Search, Filter,
  FileText, Activity, TrendingUp, AlertCircle, SkipForward
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchExecutionRuns, fetchRunResults, triggerTestRun,
  type QAExecutionRun, type QATestResult,
} from '@/services/qaService';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  passed: { color: 'text-green-600 bg-green-50 border-green-200', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Passed' },
  failed: { color: 'text-destructive bg-destructive/10 border-destructive/20', icon: <XCircle className="h-3.5 w-3.5" />, label: 'Failed' },
  blocked: { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: <Shield className="h-3.5 w-3.5" />, label: 'Blocked' },
  running: { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />, label: 'Running' },
  pending: { color: 'text-muted-foreground bg-muted border-border', icon: <Clock className="h-3.5 w-3.5" />, label: 'Pending' },
  error: { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Error' },
  skipped: { color: 'text-muted-foreground bg-muted border-border', icon: <SkipForward className="h-3.5 w-3.5" />, label: 'Skipped' },
  cancelled: { color: 'text-muted-foreground bg-muted border-border', icon: <XCircle className="h-3.5 w-3.5" />, label: 'Cancelled' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function PassRateBar({ passed, failed, total }: { passed: number; failed: number; total: number }) {
  if (total === 0) return <span className="text-xs text-muted-foreground">No tests</span>;
  const pct = Math.round((passed / total) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Progress value={pct} className="h-1.5 flex-1" />
      <span className="text-xs font-medium tabular-nums w-8">{pct}%</span>
    </div>
  );
}

function RunDetailModal({ run, onClose }: { run: QAExecutionRun; onClose: () => void }) {
  const [resultFilter, setResultFilter] = useState('all');

  const { data: results, isLoading } = useQuery({
    queryKey: ['qa-run-results', run.id],
    queryFn: () => fetchRunResults(run.id).then(r => r.data || []),
  });

  const filtered = (results || []).filter(r =>
    resultFilter === 'all' ? true : r.status === resultFilter
  ) as QATestResult[];

  const handleExport = () => {
    if (!results) return;
    const rows = [
      ['Test Case', 'Type', 'Priority', 'Status', 'Duration (ms)', 'Error', 'Expected', 'Actual'],
      ...results.map((r: any) => [
        r.qa_test_cases?.title || r.test_case_id,
        r.qa_test_cases?.test_type || '',
        r.qa_test_cases?.priority || '',
        r.status,
        r.execution_duration_ms || '',
        r.error_message || '',
        JSON.stringify(r.expected_outcome || ''),
        JSON.stringify(r.actual_outcome || ''),
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `qa-run-${run.id.slice(0, 8)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {run.run_name}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: run.total_tests, color: 'text-foreground' },
            { label: 'Passed', value: run.passed_count, color: 'text-green-600' },
            { label: 'Failed', value: run.failed_count, color: 'text-destructive' },
            { label: 'Errors', value: run.error_count, color: 'text-orange-600' },
          ].map(m => (
            <Card key={m.label} className="p-3 text-center">
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
            </Card>
          ))}
        </div>

        {run.deployment_blocked && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            <Shield className="h-4 w-4 shrink-0" />
            <span><strong>Deployment Blocked:</strong> {run.blocking_failures} mandatory critical/high test case(s) failed.</span>
          </div>
        )}

        {run.summary_notes && (
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{run.summary_notes}</p>
        )}

        {/* Filter bar */}
        <div className="flex gap-2">
          {['all', 'passed', 'failed', 'error', 'skipped'].map(s => (
            <Button key={s} variant={resultFilter === s ? 'default' : 'outline'} size="sm"
              onClick={() => setResultFilter(s)} className="capitalize h-7 text-xs">
              {s === 'all' ? 'All Results' : s}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={handleExport} className="ml-auto h-7 text-xs gap-1">
            <Download className="h-3 w-3" /> Export CSV
          </Button>
        </div>

        {/* Results table */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading results…</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Test Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No results found</TableCell></TableRow>
                ) : filtered.map((r: any) => (
                  <TableRow key={r.id} className={r.status === 'failed' || r.status === 'error' ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      <div className="truncate">{r.qa_test_cases?.title || r.test_case_id?.slice(0, 8)}</div>
                      {r.qa_test_cases?.is_mandatory && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 border-orange-300 text-orange-600">Mandatory</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{r.qa_test_cases?.test_type || '–'}</Badge></TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium capitalize ${r.qa_test_cases?.priority === 'critical' ? 'text-destructive' : r.qa_test_cases?.priority === 'high' ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {r.qa_test_cases?.priority || '–'}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {r.execution_duration_ms != null ? `${r.execution_duration_ms}ms` : '–'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {r.error_message && (
                        <p className="text-xs text-destructive truncate" title={r.error_message}>{r.error_message}</p>
                      )}
                      {r.actual_outcome?.note && (
                        <p className="text-xs text-muted-foreground truncate">{r.actual_outcome.note}</p>
                      )}
                      {r.diff_details && (
                        <p className="text-xs text-orange-600 truncate">Expected: {r.diff_details.expected} | Got: {r.diff_details.got}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function QADashboard() {
  const qc = useQueryClient();
  const [selectedRun, setSelectedRun] = useState<QAExecutionRun | null>(null);
  const [filters, setFilters] = useState({ status: '', run_type: '', from_date: '', to_date: '' });
  const [triggerModal, setTriggerModal] = useState(false);
  const [triggerModules, setTriggerModules] = useState('');

  const { data: runs, isLoading } = useQuery({
    queryKey: ['qa-runs', filters],
    queryFn: () => fetchExecutionRuns({
      status: filters.status || undefined,
      run_type: filters.run_type || undefined,
      from_date: filters.from_date || undefined,
      to_date: filters.to_date || undefined,
    }).then(r => r.data || []),
    refetchInterval: 10000, // refresh every 10s to pick up running status
  });

  const triggerRun = useMutation({
    mutationFn: (opts: any) => triggerTestRun(opts),
    onSuccess: () => {
      toast.success('Test run initiated successfully');
      setTriggerModal(false);
      qc.invalidateQueries({ queryKey: ['qa-runs'] });
    },
    onError: (e: any) => toast.error(`Failed to start run: ${e.message}`),
  });

  const allRuns = (runs || []) as QAExecutionRun[];
  const latestRun = allRuns[0];

  const summaryMetrics = {
    totalRuns: allRuns.length,
    passRate: allRuns.length
      ? Math.round((allRuns.filter(r => r.status === 'passed').length / allRuns.length) * 100)
      : 0,
    blockedCount: allRuns.filter(r => r.deployment_blocked).length,
    avgDuration: allRuns.length && allRuns.some(r => r.execution_duration_ms)
      ? Math.round(allRuns.reduce((s, r) => s + (r.execution_duration_ms || 0), 0) / allRuns.filter(r => r.execution_duration_ms).length)
      : 0,
  };

  const handleExportAll = () => {
    const rows = [
      ['Run Name', 'Type', 'Status', 'Total', 'Passed', 'Failed', 'Errors', 'Blocked', 'Duration (ms)', 'Created'],
      ...allRuns.map(r => [
        r.run_name, r.run_type, r.status, r.total_tests, r.passed_count,
        r.failed_count, r.error_count, r.deployment_blocked ? 'Yes' : 'No',
        r.execution_duration_ms || '', r.created_at,
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `qa-runs-export-${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Quality Assurance Dashboard"
        subtitle="Automated test execution monitoring, verification reports, and deployment gate control"
        breadcrumbs={[{ label: 'System Administration' }, { label: 'QA Dashboard' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={() => setTriggerModal(true)} className="gap-1">
              <Play className="h-4 w-4" /> Run Tests
            </Button>
          </div>
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Runs', value: summaryMetrics.totalRuns, icon: <Activity className="h-5 w-5" />, color: 'text-primary' },
          { label: 'Pass Rate', value: `${summaryMetrics.passRate}%`, icon: <TrendingUp className="h-5 w-5" />, color: 'text-green-600' },
          { label: 'Deployment Blocks', value: summaryMetrics.blockedCount, icon: <Shield className="h-5 w-5" />, color: 'text-destructive' },
          { label: 'Avg Duration', value: summaryMetrics.avgDuration ? `${(summaryMetrics.avgDuration / 1000).toFixed(1)}s` : '–', icon: <Clock className="h-5 w-5" />, color: 'text-muted-foreground' },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${m.color}`}>{m.value}</p>
                </div>
                <div className={`${m.color} opacity-70`}>{m.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Latest Run Banner */}
      {latestRun && (
        <Card className={`border-l-4 ${latestRun.deployment_blocked ? 'border-l-destructive' : latestRun.status === 'passed' ? 'border-l-green-500' : latestRun.status === 'running' ? 'border-l-blue-500' : 'border-l-orange-400'}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={latestRun.status} />
                <div>
                  <p className="font-medium text-sm">{latestRun.run_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {latestRun.created_at ? format(new Date(latestRun.created_at), 'PPp') : ''}
                    {latestRun.execution_duration_ms ? ` · ${(latestRun.execution_duration_ms / 1000).toFixed(2)}s` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <PassRateBar passed={latestRun.passed_count} failed={latestRun.failed_count} total={latestRun.total_tests} />
                {latestRun.deployment_blocked && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                    <Shield className="h-3 w-3 mr-1" /> Deployment Blocked
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedRun(latestRun)} className="gap-1 text-xs">
                  View <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {['passed', 'failed', 'blocked', 'running', 'pending', 'error', 'cancelled'].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.run_type} onValueChange={v => setFilters(f => ({ ...f, run_type: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {['full', 'module', 'targeted', 'manual'].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-36 h-8 text-xs" value={filters.from_date}
              onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            <Input type="date" className="w-36 h-8 text-xs" value={filters.to_date}
              onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
            <Button variant="outline" size="sm" className="h-8 text-xs"
              onClick={() => setFilters({ status: '', run_type: '', from_date: '', to_date: '' })}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Runs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Verification Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading runs…</div>
          ) : allRuns.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No runs found. Click "Run Tests" to start the first execution.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Run Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center text-green-600">Pass</TableHead>
                  <TableHead className="text-center text-destructive">Fail</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRuns.map(run => (
                  <TableRow key={run.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedRun(run)}>
                    <TableCell className="font-medium max-w-[180px] truncate">{run.run_name}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{run.run_type}</Badge></TableCell>
                    <TableCell><StatusBadge status={run.status} /></TableCell>
                    <TableCell><PassRateBar passed={run.passed_count} failed={run.failed_count} total={run.total_tests} /></TableCell>
                    <TableCell className="text-center tabular-nums">{run.total_tests}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium tabular-nums">{run.passed_count}</TableCell>
                    <TableCell className="text-center text-destructive font-medium tabular-nums">{run.failed_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {run.execution_duration_ms ? `${(run.execution_duration_ms / 1000).toFixed(1)}s` : '–'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {run.created_at ? format(new Date(run.created_at), 'MMM d, HH:mm') : '–'}
                    </TableCell>
                    <TableCell>
                      {run.deployment_blocked
                        ? <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs"><Shield className="h-3 w-3 mr-1" />Blocked</Badge>
                        : run.status === 'passed'
                          ? <Badge className="bg-green-50 text-green-700 border-green-200 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Clear</Badge>
                          : <span className="text-xs text-muted-foreground">–</span>
                      }
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); setSelectedRun(run); }}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Trigger Run Modal */}
      {triggerModal && (
        <Dialog open onOpenChange={() => setTriggerModal(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" /> Trigger Test Run
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium">Modules (comma-separated, leave blank for all)</label>
                <Input placeholder="e.g. IP Registration, Workflow Engine" className="mt-1.5"
                  value={triggerModules} onChange={e => setTriggerModules(e.target.value)} />
              </div>
              <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                <strong>Note:</strong> The runner executes test cases against live database endpoints in a read-safe mode using the service role. Writes are minimal and rolled back where supported.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTriggerModal(false)}>Cancel</Button>
              <Button disabled={triggerRun.isPending} onClick={() => {
                const mods = triggerModules.split(',').map(m => m.trim()).filter(Boolean);
                triggerRun.mutate({
                  run_type: mods.length ? 'module' : 'full',
                  modules: mods.length ? mods : undefined,
                  trigger_source: 'manual',
                });
              }}>
                {triggerRun.isPending ? 'Starting…' : 'Start Run'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedRun && <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </div>
  );
}
