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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  RefreshCw, Play, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
  Database, Search, RotateCcw, FileText, Eye, ArrowUpDown,
} from "lucide-react";

// ── Hooks ──

function usePostingQueue(statusFilter: string) {
  return useQuery({
    queryKey: ["ce_posting_queue", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("ce_posting_queue" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

function useJobRunLog() {
  return useQuery({
    queryKey: ["ce_job_run_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_job_run_log" as any)
        .select("*")
        .order("run_start", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });
}

function useReconExceptions(statusFilter: string) {
  return useQuery({
    queryKey: ["ce_recon_exceptions_admin", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("ce_reconciliation_exceptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

function useRebuildRequests() {
  return useQuery({
    queryKey: ["ce_manual_rebuild_request"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_manual_rebuild_request" as any)
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });
}

function useRunLedgerJob() {
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
      queryClient.invalidateQueries({ queryKey: ["ce_posting_queue"] });
      queryClient.invalidateQueries({ queryKey: ["ce_job_run_log"] });
      queryClient.invalidateQueries({ queryKey: ["ce_recon_exceptions_admin"] });
      const label = variables.dryRun ? "🔍 Dry Run Complete" : "✅ Job Completed";
      toast.success(label, {
        description: `Read: ${data?.records_read ?? 0}, Posted: ${data?.records_posted ?? 0}, Skipped: ${data?.records_skipped ?? 0}, Failed: ${data?.records_failed ?? 0}`,
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

// ── Tab: Posting Queue Monitor ──

function PostingQueueTab() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { data: queue = [], isLoading } = usePostingQueue(statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="SKIPPED">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">{queue.length} entries</div>
      </div>
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : queue.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No entries found</TableCell></TableRow>
            ) : queue.map((q: any) => (
              <TableRow key={q.id}>
                <TableCell><StatusBadge status={q.status} /></TableCell>
                <TableCell className="text-xs">{q.source_system}</TableCell>
                <TableCell className="text-xs">{q.event_type}</TableCell>
                <TableCell className="font-mono text-xs">{q.employer_id}</TableCell>
                <TableCell className="text-xs">{q.period}</TableCell>
                <TableCell className="text-xs">{q.fund_type}</TableCell>
                <TableCell className="text-right font-mono text-xs">${Number(q.amount).toFixed(2)}</TableCell>
                <TableCell className="text-center text-xs">{q.attempt_count}/{q.max_attempts}</TableCell>
                <TableCell className="text-xs">{q.created_at ? format(new Date(q.created_at), "dd/MM HH:mm") : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ── Tab: Job Run History ──

function JobRunHistoryTab() {
  const { data: runs = [], isLoading } = useJobRunLog();

  return (
    <ScrollArea className="h-[550px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Job</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Read</TableHead>
            <TableHead>Posted</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead>Skipped</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
          ) : runs.length === 0 ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No job runs yet</TableCell></TableRow>
          ) : runs.map((r: any) => {
            const duration = r.run_end && r.run_start
              ? `${((new Date(r.run_end).getTime() - new Date(r.run_start).getTime()) / 1000).toFixed(1)}s`
              : "-";
            return (
              <TableRow key={r.id}>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-xs font-medium">{r.job_name}</TableCell>
                <TableCell className="text-xs">{r.run_type}</TableCell>
                <TableCell className="text-center text-xs">{r.records_read}</TableCell>
                <TableCell className="text-center text-xs font-medium text-emerald-600">{r.records_posted}</TableCell>
                <TableCell className="text-center text-xs font-medium text-red-600">{r.records_failed}</TableCell>
                <TableCell className="text-center text-xs">{r.records_skipped}</TableCell>
                <TableCell className="text-xs">{r.run_start ? format(new Date(r.run_start), "dd/MM HH:mm:ss") : "-"}</TableCell>
                <TableCell className="text-xs">{duration}</TableCell>
                <TableCell className="text-xs">{r.triggered_by}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

// ── Tab: Reconciliation Exceptions ──

function ReconciliationTab() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { data: exceptions = [], isLoading } = useReconExceptions(statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="AUTO_RESOLVED">Auto-Resolved</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Source</TableHead>
              <TableHead className="text-right">Ledger</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : exceptions.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No exceptions found</TableCell></TableRow>
            ) : exceptions.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell><StatusBadge status={e.status || "OPEN"} /></TableCell>
                <TableCell className="text-xs">{e.exception_type}</TableCell>
                <TableCell className="font-mono text-xs">{e.employer_id}</TableCell>
                <TableCell className="text-xs">{e.source_period}</TableCell>
                <TableCell className="text-right font-mono text-xs">${Number(e.source_amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs">${Number(e.ledger_amount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-red-600">${Number(e.variance_amount || 0).toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline" className={e.severity === "HIGH" ? "text-red-600" : e.severity === "MEDIUM" ? "text-amber-600" : "text-muted-foreground"}>{e.severity || "MEDIUM"}</Badge></TableCell>
                <TableCell className="text-xs">{e.created_at ? format(new Date(e.created_at), "dd/MM HH:mm") : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ── Tab: Rebuild Employer Ledger ──

function RebuildTab() {
  const { data: requests = [], isLoading } = useRebuildRequests();
  const runJob = useRunLedgerJob();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [rebuildForm, setRebuildForm] = useState({ employer_id: "", from_period: "", to_period: "", reason: "" });

  const submitRebuild = async () => {
    if (!rebuildForm.employer_id) {
      toast.error("Employer ID is required");
      return;
    }

    // Create rebuild request
    const { data, error } = await supabase.from("ce_manual_rebuild_request" as any).insert({
      employer_id: rebuildForm.employer_id,
      from_period: rebuildForm.from_period || null,
      to_period: rebuildForm.to_period || null,
      request_type: "FULL_REBUILD",
      requested_by: "officer", // will be replaced with actual user
      outcome_summary: rebuildForm.reason,
    }).select("id").single();

    if (error) {
      toast.error("Failed to create rebuild request", { description: error.message });
      return;
    }

    setShowDialog(false);

    // Trigger the rebuild job
    runJob.mutate({
      jobCode: "LEDGER-REBUILD",
      dryRun: false,
      params: {
        employer_id: rebuildForm.employer_id,
        from_period: rebuildForm.from_period || undefined,
        to_period: rebuildForm.to_period || undefined,
        rebuild_request_id: (data as any)?.id,
      },
    });

    queryClient.invalidateQueries({ queryKey: ["ce_manual_rebuild_request"] });
    setRebuildForm({ employer_id: "", from_period: "", to_period: "", reason: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Request a full or partial ledger rebuild for a specific employer.</p>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button><RotateCcw className="h-4 w-4 mr-2" /> New Rebuild Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rebuild Employer Ledger</DialogTitle>
              <DialogDescription>This will reverse all existing ledger entries and re-post from source data.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Employer ID (Registration No.)</Label>
                <Input placeholder="e.g. E12345" value={rebuildForm.employer_id} onChange={e => setRebuildForm(p => ({ ...p, employer_id: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From Period (optional)</Label>
                  <Input placeholder="YYYY-MM" value={rebuildForm.from_period} onChange={e => setRebuildForm(p => ({ ...p, from_period: e.target.value }))} />
                </div>
                <div>
                  <Label>To Period (optional)</Label>
                  <Input placeholder="YYYY-MM" value={rebuildForm.to_period} onChange={e => setRebuildForm(p => ({ ...p, to_period: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea placeholder="Why is this rebuild needed?" value={rebuildForm.reason} onChange={e => setRebuildForm(p => ({ ...p, reason: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={submitRebuild} disabled={runJob.isPending}>
                {runJob.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Execute Rebuild
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[450px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Period Range</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No rebuild requests</TableCell></TableRow>
            ) : requests.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="font-mono text-xs">{r.employer_id}</TableCell>
                <TableCell className="text-xs">{r.from_period || "All"} → {r.to_period || "All"}</TableCell>
                <TableCell className="text-xs">{r.request_type}</TableCell>
                <TableCell className="text-xs">{r.requested_by}</TableCell>
                <TableCell className="text-xs">{r.requested_at ? format(new Date(r.requested_at), "dd/MM/yyyy HH:mm") : "-"}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{r.outcome_summary || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ── Tab: Run Jobs ──

function RunJobsTab() {
  const runJob = useRunLedgerJob();

  const jobs = [
    { code: "LEDGER-C3-POST", name: "C3 Incremental Posting", desc: "Post finalized C3 contributions to ledger", icon: FileText, schedule: "Every 15 min" },
    { code: "LEDGER-PAY-POST", name: "Payment Incremental Posting", desc: "Post finalized payments as credits", icon: DollarSign, schedule: "Every 15 min" },
    { code: "LEDGER-PENALTY-ACCRUAL", name: "Penalty & Interest Accrual", desc: "Calculate and post overdue interest", icon: AlertTriangle, schedule: "Nightly" },
    { code: "LEDGER-REVERSAL", name: "Payment Reversal Detection", desc: "Detect cancelled payments, create reversals", icon: RotateCcw, schedule: "Hourly" },
    { code: "LEDGER-RECONCILE", name: "Nightly Reconciliation", desc: "Compare source vs ledger totals", icon: ArrowUpDown, schedule: "Nightly" },
    { code: "LEDGER-BACKFILL", name: "Historical Backfill", desc: "Backfill from historical source data", icon: Database, schedule: "Manual" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {jobs.map(job => (
        <Card key={job.code} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <job.icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm">{job.name}</CardTitle>
            </div>
            <CardDescription className="text-xs">{job.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {job.schedule}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => runJob.mutate({ jobCode: job.code, dryRun: true })}
                disabled={runJob.isPending}
              >
                <Search className="h-3 w-3 mr-1" /> Dry Run
              </Button>
              <Button
                size="sm"
                onClick={() => runJob.mutate({ jobCode: job.code, dryRun: false })}
                disabled={runJob.isPending}
              >
                {runJob.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                Execute
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Tab: Employer Ledger Drilldown ──

function LedgerDrilldownTab() {
  const [employerId, setEmployerId] = useState("");
  const [searchId, setSearchId] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger_drilldown", searchId],
    queryFn: async () => {
      if (!searchId) return [];
      const { data, error } = await supabase
        .from("ce_employer_financial_ledger")
        .select("*")
        .eq("employer_id", searchId)
        .order("posted_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!searchId,
  });

  const totals = entries.reduce(
    (acc, e) => ({
      debits: acc.debits + Number(e.debit_amount || 0),
      credits: acc.credits + Number(e.credit_amount || 0),
    }),
    { debits: 0, credits: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          className="w-[240px]"
          placeholder="Enter Employer ID / Reg No"
          value={employerId}
          onChange={e => setEmployerId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setSearchId(employerId)}
        />
        <Button onClick={() => setSearchId(employerId)}><Search className="h-4 w-4 mr-2" /> Search</Button>
      </div>

      {searchId && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Total Debits</div>
                <div className="text-lg font-bold text-red-600">${totals.debits.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Total Credits</div>
                <div className="text-lg font-bold text-emerald-600">${totals.credits.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Net Balance</div>
                <div className={`text-lg font-bold ${totals.debits - totals.credits > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ${(totals.debits - totals.credits).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Posted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : entries.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No ledger entries found</TableCell></TableRow>
                ) : entries.map((e: any) => (
                  <TableRow key={e.id} className={e.status === "REVERSED" ? "opacity-50 line-through" : ""}>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell className="text-xs">{e.entry_type}</TableCell>
                    <TableCell className="text-xs">{e.fund_type}</TableCell>
                    <TableCell className="text-xs">{e.period}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(e.debit_amount) > 0 ? `$${Number(e.debit_amount).toFixed(2)}` : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(e.credit_amount) > 0 ? `$${Number(e.credit_amount).toFixed(2)}` : "-"}</TableCell>
                    <TableCell className="text-xs">{e.source_system || "-"}</TableCell>
                    <TableCell className="text-xs">{e.posted_at ? format(new Date(e.posted_at), "dd/MM HH:mm") : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

// ── Main Page ──

import { DollarSign } from "lucide-react";

export default function LedgerPostingAdmin() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Ledger Posting Framework</h1>
        <p className="text-sm text-muted-foreground">
          Manage incremental posting, reconciliation, backfill, and rebuild operations for the employer compliance ledger.
        </p>
      </div>

      <Tabs defaultValue="run-jobs" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="run-jobs" className="gap-1.5"><Play className="h-3.5 w-3.5" /> Run Jobs</TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5"><Database className="h-3.5 w-3.5" /> Posting Queue</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Job History</TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" /> Reconciliation</TabsTrigger>
          <TabsTrigger value="rebuild" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Rebuild</TabsTrigger>
          <TabsTrigger value="drilldown" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Ledger Drilldown</TabsTrigger>
        </TabsList>

        <TabsContent value="run-jobs"><RunJobsTab /></TabsContent>
        <TabsContent value="queue"><PostingQueueTab /></TabsContent>
        <TabsContent value="history"><JobRunHistoryTab /></TabsContent>
        <TabsContent value="reconciliation"><ReconciliationTab /></TabsContent>
        <TabsContent value="rebuild"><RebuildTab /></TabsContent>
        <TabsContent value="drilldown"><LedgerDrilldownTab /></TabsContent>
      </Tabs>
    </div>
  );
}
