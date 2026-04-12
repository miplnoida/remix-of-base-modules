import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, CheckCircle, XCircle, Search, Eye, RefreshCw, Loader2, FlaskConical, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { StandardModal } from '@/components/common/StandardModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AutomationRun {
  id: string;
  job_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_processed: number | null;
  records_affected: number | null;
  error_message: string | null;
  triggered_by: string | null;
  execution_log: Record<string, any> | null;
  is_dry_run: boolean | null;
  idempotency_key: string | null;
  parameters: Record<string, any> | null;
}

interface AutomationJob {
  id: string;
  name: string;
}

const DetailField = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={className}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground mt-0.5">{value ?? '—'}</p>
  </div>
);

const ScanDetailsView = ({ scan }: { scan: Record<string, any> }) => {
  const ruleBreakdown = scan.rule_breakdown || scan.per_rule_counts;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {scan.total_employers_scanned != null && (
          <DetailField label="Employers Scanned" value={scan.total_employers_scanned.toLocaleString()} />
        )}
        {scan.violations_detected != null && (
          <DetailField label="Violations Detected" value={scan.violations_detected.toLocaleString()} />
        )}
        {scan.violations_created != null && (
          <DetailField label="Violations Created" value={scan.violations_created.toLocaleString()} />
        )}
        {scan.violations_skipped_dedupe != null && (
          <DetailField label="Duplicates Skipped" value={scan.violations_skipped_dedupe.toLocaleString()} />
        )}
        {scan.rules_evaluated != null && (
          <DetailField label="Rules Evaluated" value={scan.rules_evaluated} />
        )}
        {scan.dry_run != null && (
          <DetailField label="Mode" value={scan.dry_run ? 'Dry Run' : 'Live Run'} />
        )}
      </div>

      {ruleBreakdown && typeof ruleBreakdown === 'object' && Object.keys(ruleBreakdown).length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Rule Breakdown</p>
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Rule</th>
                  <th className="text-right py-1.5 px-3 text-muted-foreground font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ruleBreakdown).map(([rule, count]) => (
                  <tr key={rule} className="border-t border-border">
                    <td className="py-1.5 px-3 text-foreground">{rule}</td>
                    <td className="py-1.5 px-3 text-right text-foreground">{String(count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const CollapsibleSection = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const JobHistory = () => {
  const [jobFilter, setJobFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ['ce_automation_jobs_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_automation_jobs').select('id, name');
      if (error) throw error;
      return (data || []) as unknown as AutomationJob[];
    },
  });

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ['ce_automation_runs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_automation_runs').select('*').order('started_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []) as unknown as AutomationRun[];
    },
  });

  const jobNameMap = Object.fromEntries(jobs.map(j => [j.id, j.name]));
  const jobNames = ['All', ...jobs.map(j => j.name)];

  const filtered = runs.filter(h => {
    const jName = jobNameMap[h.job_id] || 'Unknown';
    return (jobFilter === 'All' || jName === jobFilter) &&
      (search === '' || h.id.toLowerCase().includes(search.toLowerCase()));
  });

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  };

  const getExecutionLog = (run: AutomationRun) => {
    const log = run.execution_log;
    if (!log) return null;
    return log.scan_details || log.result || log;
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
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Job Execution History</h1>
          </div>
          <p className="text-muted-foreground">View execution logs and results for all automation jobs</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Executions</p><p className="text-2xl font-bold text-foreground">{runs.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Successful</p><p className="text-2xl font-bold text-success">{runs.filter(h => h.status === 'COMPLETED').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-destructive">{runs.filter(h => h.status === 'FAILED').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Records Processed</p><p className="text-2xl font-bold text-primary">{runs.reduce((sum, h) => sum + (h.records_processed || 0), 0).toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by execution ID..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Filter by job" /></SelectTrigger>
              <SelectContent>{jobNames.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No execution history found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Job Name</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Start Time</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Duration</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Mode</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Records</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Affected</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Triggered By</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(h => (
                    <tr key={h.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                      <td className="py-2 px-3 text-foreground">{jobNameMap[h.job_id] || 'Unknown'}</td>
                      <td className="py-2 px-3 text-foreground text-xs">{new Date(h.started_at).toLocaleString()}</td>
                      <td className="py-2 px-3 text-muted-foreground">{getDuration(h.started_at, h.completed_at)}</td>
                      <td className="py-2 px-3 text-center">
                        {h.is_dry_run ? (
                          <Badge variant="outline" className="text-[10px] gap-1"><FlaskConical className="h-3 w-3" />Dry Run</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] gap-1"><Zap className="h-3 w-3" />Live</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={h.status === 'COMPLETED' ? 'default' : h.status === 'FAILED' ? 'destructive' : 'secondary'} className="text-[10px] gap-1">
                          {h.status === 'COMPLETED' ? <CheckCircle className="h-3 w-3" /> : h.status === 'FAILED' ? <XCircle className="h-3 w-3" /> : null}
                          {h.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right text-foreground">{(h.records_processed || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-foreground">{h.records_affected || 0}</td>
                      <td className="py-2 px-3 text-foreground">{h.triggered_by || '—'}</td>
                      <td className="py-2 px-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRun(h)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Detail Modal */}
      <StandardModal
        open={!!selectedRun}
        onOpenChange={(open) => { if (!open) setSelectedRun(null); }}
        title="Execution Details"
        mode="view"
        size="3xl"
      >
        {selectedRun && (() => {
          const run = selectedRun;
          const jobName = jobNameMap[run.job_id] || 'Unknown Job';
          const scanDetails = run.execution_log?.scan_details;
          const hasLog = run.execution_log && Object.keys(run.execution_log).length > 0;

          return (
            <div className="space-y-5">
              {/* Section 1: Run Overview */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Run Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DetailField label="Job Name" value={jobName} />
                  <DetailField label="Status" value={
                    <Badge variant={run.status === 'COMPLETED' ? 'default' : run.status === 'FAILED' ? 'destructive' : 'secondary'} className="text-[10px] gap-1">
                      {run.status === 'COMPLETED' ? <CheckCircle className="h-3 w-3" /> : run.status === 'FAILED' ? <XCircle className="h-3 w-3" /> : run.status === 'RUNNING' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {run.status}
                    </Badge>
                  } />
                  <DetailField label="Mode" value={
                    run.is_dry_run ? (
                      <Badge variant="outline" className="text-[10px] gap-1"><FlaskConical className="h-3 w-3" />Dry Run</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] gap-1"><Zap className="h-3 w-3" />Live Run</Badge>
                    )
                  } />
                  <DetailField label="Triggered By" value={run.triggered_by || '—'} />
                  <DetailField label="Started At" value={new Date(run.started_at).toLocaleString()} />
                  <DetailField label="Completed At" value={run.completed_at ? new Date(run.completed_at).toLocaleString() : '—'} />
                  <DetailField label="Duration" value={getDuration(run.started_at, run.completed_at)} />
                  <DetailField label="Idempotency Key" value={run.idempotency_key || '—'} />
                  <DetailField label="Run ID" value={<span className="font-mono text-xs break-all">{run.id}</span>} />
                </div>
              </div>

              {/* Section 2: Results */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DetailField label="Records Processed" value={(run.records_processed ?? 0).toLocaleString()} />
                  <DetailField label="Records Affected" value={(run.records_affected ?? 0).toLocaleString()} />
                </div>
                {run.error_message && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-xs font-medium text-destructive mb-1">Error Message</p>
                    <p className="text-sm text-destructive">{run.error_message}</p>
                  </div>
                )}
              </div>

              {/* Section 3: Execution Log (collapsible) */}
              <div className="border-t border-border pt-2">
                <CollapsibleSection title="Execution Log" defaultOpen={!!scanDetails}>
                  {!hasLog ? (
                    <p className="text-sm text-muted-foreground italic">No execution log recorded</p>
                  ) : scanDetails ? (
                    <ScanDetailsView scan={scanDetails} />
                  ) : (
                    <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-auto max-h-64 text-foreground font-mono">
                      {JSON.stringify(run.execution_log, null, 2)}
                    </pre>
                  )}
                </CollapsibleSection>
              </div>

              {/* Section 4: Parameters (collapsible, if present) */}
              {run.parameters && Object.keys(run.parameters).length > 0 && (
                <div className="border-t border-border pt-2">
                  <CollapsibleSection title="Input Parameters">
                    <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-auto max-h-40 text-foreground font-mono">
                      {JSON.stringify(run.parameters, null, 2)}
                    </pre>
                  </CollapsibleSection>
                </div>
              )}
            </div>
          );
        })()}
      </StandardModal>
    </div>
  );
};

export default JobHistory;
