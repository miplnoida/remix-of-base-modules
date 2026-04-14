import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, Database,
  DollarSign, Eye, FileText, Loader2, Play, RefreshCw, RotateCcw,
  Search, XCircle, ArrowUpDown, Zap, HelpCircle, TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Data hooks ──

function usePostingHealthKPIs() {
  return useQuery({
    queryKey: ["ledger_ops_kpis"],
    queryFn: async () => {
      const [pendingC3, pendingPay, failed, reversedPending, reconExc, stmtOrphan] = await Promise.all([
        supabase.from("ce_posting_queue" as any).select("id", { count: "exact", head: true }).eq("status", "PENDING").eq("source_system", "C3"),
        supabase.from("ce_posting_queue" as any).select("id", { count: "exact", head: true }).eq("status", "PENDING").eq("source_system", "PAYMENT"),
        supabase.from("ce_posting_queue" as any).select("id", { count: "exact", head: true }).eq("status", "FAILED"),
        supabase.from("ce_posting_queue" as any).select("id", { count: "exact", head: true }).eq("event_type", "REVERSAL_PENDING"),
        supabase.from("ce_reconciliation_exceptions").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
        // Orphan employers: source activity but no ledger rows - approximation
        { count: 0 },
      ]);
      return {
        pendingC3: pendingC3.count || 0,
        pendingPayment: pendingPay.count || 0,
        failed: failed.count || 0,
        reversedPending: reversedPending.count || 0,
        reconExceptions: reconExc.count || 0,
        orphanEmployers: stmtOrphan.count || 0,
      };
    },
    refetchInterval: 30000,
  });
}

function useQueueMonitor(filters: { status: string; source: string }) {
  return useQuery({
    queryKey: ["ledger_ops_queue", filters],
    queryFn: async () => {
      let query = supabase
        .from("ce_posting_queue" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters.status !== "ALL") query = query.eq("status", filters.status);
      if (filters.source !== "ALL") query = query.eq("source_system", filters.source);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

function useJobRunStatus() {
  return useQuery({
    queryKey: ["ledger_ops_job_status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_job_run_log" as any)
        .select("*")
        .order("run_start", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data || []) as any[];
      const byJob = new Map<string, any>();
      for (const run of rows) {
        if (run.job_code && !byJob.has(run.job_code)) byJob.set(run.job_code, run);
      }
      return Array.from(byJob.values());
    },
    refetchInterval: 30000,
  });
}

function useReconSummary() {
  return useQuery({
    queryKey: ["ledger_ops_recon"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_reconciliation_exceptions")
        .select("*")
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
}

function useStatementReadiness() {
  return useQuery({
    queryKey: ["ledger_ops_readiness"],
    queryFn: async () => {
      // Count employers with ledger entries
      const { data: ledgerEmployers } = await supabase
        .from("ce_employer_financial_ledger")
        .select("employer_id")
        .eq("status", "POSTED")
        .limit(1000);
      
      const uniqueEmployers = new Set((ledgerEmployers || []).map((e: any) => e.employer_id));
      
      // Count employers with failed postings
      const { data: failedEmployers } = await supabase
        .from("ce_posting_queue" as any)
        .select("employer_id")
        .eq("status", "FAILED")
        .limit(500);
      const failedSet = new Set((failedEmployers || []).map((e: any) => e.employer_id));
      
      // Count pending rebuilds
      const { count: pendingRebuilds } = await supabase
        .from("ce_manual_rebuild_request" as any)
        .select("id", { count: "exact", head: true })
        .in("status", ["PENDING", "PROCESSING"]);
      
      return {
        readyCount: uniqueEmployers.size - failedSet.size,
        incompleteCount: failedSet.size,
        needsRebuild: pendingRebuilds || 0,
        totalWithLedger: uniqueEmployers.size,
      };
    },
  });
}

function useRunJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobCode, dryRun, params }: { jobCode: string; dryRun: boolean; params?: Record<string, any> }) => {
      const { data, error } = await supabase.functions.invoke("run-compliance-job", {
        body: { job_code: jobCode, dry_run: dryRun, force: true, ...params },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Job failed");
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ledger_ops"] });
      queryClient.invalidateQueries({ queryKey: ["ce_posting_queue"] });
      queryClient.invalidateQueries({ queryKey: ["ce_job_run_log"] });
      const label = variables.dryRun ? "🔍 Dry Run Complete" : "✅ Job Completed";
      toast.success(label, {
        description: `Read: ${data?.records_read ?? 0}, Posted: ${data?.records_posted ?? 0}, Failed: ${data?.records_failed ?? 0}`,
        duration: 8000,
      });
    },
    onError: (err: any) => toast.error("Job failed", { description: err.message }),
  });
}

// ── Status Badge ──
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    POSTED: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-500/10 text-amber-700 border-amber-200",
    RUNNING: "bg-blue-500/10 text-blue-700 border-blue-200",
    PROCESSING: "bg-blue-500/10 text-blue-700 border-blue-200",
    FAILED: "bg-red-500/10 text-red-700 border-red-200",
    COMPLETED_WITH_ERRORS: "bg-orange-500/10 text-orange-700 border-orange-200",
    SKIPPED: "bg-muted text-muted-foreground border-border",
    OPEN: "bg-amber-500/10 text-amber-700 border-amber-200",
    AUTO_RESOLVED: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    RESOLVED: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  };
  return <Badge variant="outline" className={variants[status] || ""}>{status}</Badge>;
}

// ── KPI Card ──
function KPICard({ label, value, icon: Icon, variant = "default", onClick }: {
  label: string; value: number; icon: any; variant?: string; onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    default: "text-foreground",
    warning: "text-amber-600",
    danger: "text-red-600",
    success: "text-emerald-600",
  };
  return (
    <Card className={onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : ""} onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${colors[variant]}`} />
        </div>
        <div>
          <div className={`text-2xl font-bold ${colors[variant]}`}>{value}</div>
          <div className="text-xs text-muted-foreground leading-tight">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab: Health Summary ──
function HealthSummaryTab() {
  const { data: kpis, isLoading } = usePostingHealthKPIs();
  const { data: readiness } = useStatementReadiness();
  const { data: jobStatus = [] } = useJobRunStatus();
  const runJob = useRunJob();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const k = kpis || { pendingC3: 0, pendingPayment: 0, failed: 0, reversedPending: 0, reconExceptions: 0, orphanEmployers: 0 };
  const r = readiness || { readyCount: 0, incompleteCount: 0, needsRebuild: 0, totalWithLedger: 0 };

  const LEDGER_JOBS = [
    { code: "LEDGER-C3-POST", name: "C3 Posting", schedule: "Every 15 min", icon: FileText },
    { code: "LEDGER-PAY-POST", name: "Payment Posting", schedule: "Every 15 min", icon: DollarSign },
    { code: "LEDGER-PENALTY-ACCRUAL", name: "Penalty Accrual", schedule: "Nightly", icon: AlertTriangle },
    { code: "LEDGER-REVERSAL", name: "Reversal Detection", schedule: "Hourly", icon: RotateCcw },
    { code: "LEDGER-RECONCILE", name: "Reconciliation", schedule: "Nightly", icon: ArrowUpDown },
    { code: "LEDGER-BACKFILL", name: "Historical Backfill", schedule: "Manual", icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Pending C3 Postings" value={k.pendingC3} icon={FileText} variant={k.pendingC3 > 0 ? "warning" : "success"} />
        <KPICard label="Pending Payment Postings" value={k.pendingPayment} icon={DollarSign} variant={k.pendingPayment > 0 ? "warning" : "success"} />
        <KPICard label="Failed Postings" value={k.failed} icon={XCircle} variant={k.failed > 0 ? "danger" : "success"} />
        <KPICard label="Reversals Pending" value={k.reversedPending} icon={RotateCcw} variant={k.reversedPending > 0 ? "warning" : "default"} />
        <KPICard label="Recon Exceptions" value={k.reconExceptions} icon={AlertTriangle} variant={k.reconExceptions > 0 ? "danger" : "success"} />
        <KPICard label="Stmt Ready Employers" value={r.readyCount} icon={CheckCircle2} variant="success" />
      </div>

      {/* Statement Readiness Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Statement Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-emerald-600">{r.readyCount}</div>
              <div className="text-xs text-muted-foreground">Ready</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-600">{r.incompleteCount}</div>
              <div className="text-xs text-muted-foreground">Incomplete</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-600">{r.needsRebuild}</div>
              <div className="text-xs text-muted-foreground">Needs Rebuild</div>
            </div>
            <div>
              <div className="text-xl font-bold">{r.totalWithLedger}</div>
              <div className="text-xs text-muted-foreground">Total in Ledger</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Job Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Job Actions</CardTitle>
          <CardDescription>Run posting jobs with one click. Dry Run previews without changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {LEDGER_JOBS.map(job => {
              const lastRun = jobStatus.find((r: any) => r.job_code === job.code);
              return (
                <div key={job.code} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <job.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{job.name}</span>
                    </div>
                    {lastRun && <StatusBadge status={lastRun.status} />}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {job.schedule}
                    {lastRun?.run_start && (
                      <span className="ml-2">• Last: {format(new Date(lastRun.run_start), "dd/MM HH:mm")}</span>
                    )}
                  </div>
                  {lastRun && (
                    <div className="text-xs text-muted-foreground">
                      Read: {lastRun.records_read || 0} | Posted: {lastRun.records_posted || 0} | Failed: {lastRun.records_failed || 0}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1"
                      onClick={() => runJob.mutate({ jobCode: job.code, dryRun: true })}
                      disabled={runJob.isPending}>
                      <Search className="h-3 w-3 mr-1" /> Dry Run
                    </Button>
                    <Button size="sm" className="flex-1"
                      onClick={() => runJob.mutate({ jobCode: job.code, dryRun: false })}
                      disabled={runJob.isPending}>
                      {runJob.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      Execute
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Queue Monitor ──
function QueueMonitorTab() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const { data: queue = [], isLoading } = useQueueMonitor({ status: statusFilter, source: sourceFilter });
  const runJob = useRunJob();
  const queryClient = useQueryClient();

  const retryItem = async (item: any) => {
    // Re-trigger the appropriate job for this employer
    const jobCode = item.source_system === "C3" ? "LEDGER-C3-POST" : "LEDGER-PAY-POST";
    runJob.mutate({
      jobCode,
      dryRun: false,
      params: { employer_id: item.employer_id },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="SKIPPED">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="C3">C3 / Contributions</SelectItem>
            <SelectItem value="PAYMENT">Payment / Cashier</SelectItem>
            <SelectItem value="BACKFILL">Backfill</SelectItem>
            <SelectItem value="PENALTY_ENGINE">Penalty Engine</SelectItem>
            <SelectItem value="REVERSAL">Reversal</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">{queue.length} entries</div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["ledger_ops_queue"] })}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : queue.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No entries found</TableCell></TableRow>
            ) : queue.map((q: any) => (
              <TableRow key={q.id} className={q.status === "FAILED" ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                <TableCell><StatusBadge status={q.status} /></TableCell>
                <TableCell className="text-xs">{q.source_system}</TableCell>
                <TableCell className="text-xs">{q.event_type}</TableCell>
                <TableCell className="font-mono text-xs">{q.employer_id}</TableCell>
                <TableCell className="text-xs">{q.period || "-"}</TableCell>
                <TableCell className="text-xs">{q.fund_type}</TableCell>
                <TableCell className="text-right font-mono text-xs">${Number(q.amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-center text-xs">{q.attempt_count || 0}/{q.max_attempts || 3}</TableCell>
                <TableCell className="text-xs max-w-[150px] truncate text-red-600">{q.error_message || "-"}</TableCell>
                <TableCell className="text-xs">{q.created_at ? format(new Date(q.created_at), "dd/MM HH:mm") : "-"}</TableCell>
                <TableCell>
                  {q.status === "FAILED" && (
                    <Button size="sm" variant="ghost" onClick={() => retryItem(q)} disabled={runJob.isPending}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ── Tab: Job Run Status ──
function JobStatusTab() {
  const { data: runs = [], isLoading } = useJobRunStatus();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Shows the latest run for each job. Green = healthy, Red = needs attention.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : runs.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-muted-foreground">No job runs recorded yet</div>
        ) : runs.map((r: any) => {
          const duration = r.run_end && r.run_start
            ? `${((new Date(r.run_end).getTime() - new Date(r.run_start).getTime()) / 1000).toFixed(1)}s`
            : "Running...";
          const isError = r.status === "FAILED" || r.status === "COMPLETED_WITH_ERRORS";
          return (
            <Card key={r.id} className={isError ? "border-red-200 dark:border-red-800" : "border-emerald-200 dark:border-emerald-800"}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.job_name || r.job_code}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Read:</span> {r.records_read || 0}</div>
                  <div><span className="text-muted-foreground">Posted:</span> <span className="text-emerald-600 font-medium">{r.records_posted || 0}</span></div>
                  <div><span className="text-muted-foreground">Failed:</span> <span className="text-red-600 font-medium">{r.records_failed || 0}</span></div>
                  <div><span className="text-muted-foreground">Skipped:</span> {r.records_skipped || 0}</div>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>{r.run_start ? format(new Date(r.run_start), "dd/MM/yyyy HH:mm:ss") : "-"}</span>
                  <span>Duration: {duration}</span>
                </div>
                {r.summary_message && (
                  <div className="text-xs bg-muted/50 rounded px-2 py-1">{r.summary_message}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Reconciliation Summary ──
function ReconciliationSummaryTab() {
  const { data: exceptions = [], isLoading } = useReconSummary();
  const navigate = useNavigate();

  // Group by severity
  const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  exceptions.forEach((e: any) => {
    const sev = e.severity || "MEDIUM";
    if (sev in bySeverity) bySeverity[sev as keyof typeof bySeverity]++;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-red-600">{bySeverity.HIGH}</div>
            <div className="text-xs text-muted-foreground">High Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{bySeverity.MEDIUM}</div>
            <div className="text-xs text-muted-foreground">Medium Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-muted-foreground">{bySeverity.LOW}</div>
            <div className="text-xs text-muted-foreground">Low Severity</div>
          </CardContent>
        </Card>
      </div>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Source Total</TableHead>
              <TableHead className="text-right">Ledger Total</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : exceptions.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No open reconciliation exceptions</TableCell></TableRow>
            ) : exceptions.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Badge variant="outline" className={
                    e.severity === "HIGH" ? "text-red-600 border-red-200" :
                    e.severity === "MEDIUM" ? "text-amber-600 border-amber-200" :
                    "text-muted-foreground"
                  }>{e.severity}</Badge>
                </TableCell>
                <TableCell className="text-xs">{e.exception_type}</TableCell>
                <TableCell className="font-mono text-xs">{e.employer_id}</TableCell>
                <TableCell className="text-xs">{e.source_period}</TableCell>
                <TableCell className="text-right font-mono text-xs">${Number(e.source_amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs">${Number(e.ledger_amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-red-600">${Number(e.variance_amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-xs">{e.created_at ? format(new Date(e.created_at), "dd/MM HH:mm") : "-"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/field/employer-360/${e.employer_id}`)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ── Tab: Manual Rerun ──
function ManualRerunTab() {
  const runJob = useRunJob();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ employer_id: "", from_period: "", to_period: "", source_type: "ALL", reason: "" });
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [executeResult, setExecuteResult] = useState<any>(null);

  const runPreview = async () => {
    try {
      const jobCode = form.source_type === "C3" ? "LEDGER-C3-POST" :
                       form.source_type === "PAYMENT" ? "LEDGER-PAY-POST" : "LEDGER-BACKFILL";
      const { data, error } = await supabase.functions.invoke("run-compliance-job", {
        body: {
          job_code: jobCode,
          dry_run: true,
          force: true,
          employer_id: form.employer_id,
          from_period: form.from_period || undefined,
          to_period: form.to_period || undefined,
        },
      });
      if (error) throw error;
      setPreviewResult(data);
      setStep(5);
    } catch (err: any) {
      toast.error("Preview failed", { description: err.message });
    }
  };

  const runExecute = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("run-compliance-job", {
        body: {
          job_code: "LEDGER-REBUILD",
          dry_run: false,
          force: true,
          employer_id: form.employer_id,
          from_period: form.from_period || undefined,
          to_period: form.to_period || undefined,
        },
      });
      if (error) throw error;
      setExecuteResult(data);
      setStep(6);
      queryClient.invalidateQueries({ queryKey: ["ledger_ops"] });

      // Log rebuild request
      await supabase.from("ce_manual_rebuild_request" as any).insert({
        employer_id: form.employer_id,
        from_period: form.from_period || null,
        to_period: form.to_period || null,
        request_type: "MANUAL_RERUN",
        requested_by: "operator",
        outcome_summary: form.reason,
        status: "COMPLETED",
      });
    } catch (err: any) {
      toast.error("Execution failed", { description: err.message });
    }
  };

  const resetFlow = () => {
    setStep(1);
    setForm({ employer_id: "", from_period: "", to_period: "", source_type: "ALL", reason: "" });
    setPreviewResult(null);
    setExecuteResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manual Rerun Workflow</CardTitle>
        <CardDescription>Follow the guided steps below to safely rerun posting for a specific employer. All reruns are idempotent — duplicates are prevented automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {["Search", "Period", "Source", "Reason", "Preview", "Execute", "Verify"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step > i + 1 ? "bg-emerald-100 text-emerald-700" :
                step === i + 1 ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className="text-xs hidden sm:inline">{s}</span>
              {i < 6 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Separator className="mb-4" />

        {step === 1 && (
          <div className="space-y-4 max-w-md">
            <Label>Employer ID / Registration Number</Label>
            <Input placeholder="e.g. E12345" value={form.employer_id} onChange={e => setForm(p => ({ ...p, employer_id: e.target.value }))} />
            <Button onClick={() => form.employer_id ? setStep(2) : toast.error("Enter Employer ID")}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 max-w-md">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Period (optional)</Label>
                <Input placeholder="YYYY-MM" value={form.from_period} onChange={e => setForm(p => ({ ...p, from_period: e.target.value }))} />
              </div>
              <div>
                <Label>To Period (optional)</Label>
                <Input placeholder="YYYY-MM" value={form.to_period} onChange={e => setForm(p => ({ ...p, to_period: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave blank to rerun all periods for this employer.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 max-w-md">
            <Label>Source Type</Label>
            <Select value={form.source_type} onValueChange={v => setForm(p => ({ ...p, source_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources (Full Rebuild)</SelectItem>
                <SelectItem value="C3">C3 / Contributions Only</SelectItem>
                <SelectItem value="PAYMENT">Payments Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 max-w-md">
            <Label>Reason / Support Note</Label>
            <Textarea placeholder="Why is this rerun needed?" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={runPreview}>
                <Search className="h-4 w-4 mr-1" /> Preview Impact
              </Button>
            </div>
          </div>
        )}

        {step === 5 && previewResult && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Preview Results (Dry Run)</h4>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div><div className="text-lg font-bold">{previewResult.records_read ?? 0}</div><div className="text-xs text-muted-foreground">Records Read</div></div>
                <div><div className="text-lg font-bold text-emerald-600">{previewResult.records_posted ?? 0}</div><div className="text-xs text-muted-foreground">Would Post</div></div>
                <div><div className="text-lg font-bold">{previewResult.records_skipped ?? 0}</div><div className="text-xs text-muted-foreground">Would Skip (Idempotent)</div></div>
                <div><div className="text-lg font-bold text-red-600">{previewResult.records_failed ?? 0}</div><div className="text-xs text-muted-foreground">Would Fail</div></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">No data was changed. Click Execute to apply.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
              <Button onClick={runExecute} variant="default">
                <Play className="h-4 w-4 mr-1" /> Execute Rerun
              </Button>
            </div>
          </div>
        )}

        {step === 6 && executeResult && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <h4 className="font-medium">Rerun Complete</h4>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-lg font-bold">{executeResult.reversed ?? executeResult.records_read ?? 0}</div><div className="text-xs text-muted-foreground">Reversed</div></div>
                <div><div className="text-lg font-bold text-emerald-600">{executeResult.re_posted ?? executeResult.records_posted ?? 0}</div><div className="text-xs text-muted-foreground">Re-Posted</div></div>
                <div><div className="text-lg font-bold text-red-600">{executeResult.failed ?? executeResult.records_failed ?? 0}</div><div className="text-xs text-muted-foreground">Failed</div></div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/compliance/field/employer-360/${form.employer_id}`)}>
                <Eye className="h-4 w-4 mr-1" /> Open Employer 360
              </Button>
              <Button variant="outline" onClick={() => navigate(`/compliance/field/employer-statement/${form.employer_id}`)}>
                <FileText className="h-4 w-4 mr-1" /> View Statement
              </Button>
              <Button onClick={resetFlow}>
                <RotateCcw className="h-4 w-4 mr-1" /> New Rerun
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
export default function LedgerOperationsDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ledger Posting Operations</h1>
          <p className="text-sm text-muted-foreground">
            Monitor posting health, manage exceptions, and run operational workflows for the employer compliance ledger.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/compliance/admin/settings/ledger-help")}>
            <HelpCircle className="h-4 w-4 mr-2" /> Help & SOP
          </Button>
          <Button variant="outline" onClick={() => navigate("/compliance/admin/settings/ledger-posting")}>
            <Activity className="h-4 w-4 mr-2" /> Admin Framework
          </Button>
        </div>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="health" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Health Summary</TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5"><Database className="h-3.5 w-3.5" /> Queue Monitor</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Job Status</TabsTrigger>
          <TabsTrigger value="recon" className="gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" /> Reconciliation</TabsTrigger>
          <TabsTrigger value="rerun" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Manual Rerun</TabsTrigger>
        </TabsList>

        <TabsContent value="health"><HealthSummaryTab /></TabsContent>
        <TabsContent value="queue"><QueueMonitorTab /></TabsContent>
        <TabsContent value="jobs"><JobStatusTab /></TabsContent>
        <TabsContent value="recon"><ReconciliationSummaryTab /></TabsContent>
        <TabsContent value="rerun"><ManualRerunTab /></TabsContent>
      </Tabs>
    </div>
  );
}
