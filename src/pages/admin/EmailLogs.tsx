import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatAuditDateTime, formatDateForStorage } from "@/lib/dateFormat";
import {
  Mail, Search, Download, Eye, RefreshCw, Filter,
  CheckCircle2, XCircle, Clock, AlertCircle, Loader2
} from "lucide-react";

interface EmailLog {
  id: string;
  channel: string;
  recipient_address: string;
  subject: string | null;
  body: string;
  status: string;
  failure_reason: string | null;
  sent_at: string | null;
  created_at: string;
  resend_message_id: string | null;
  retry_count: number | null;
  last_retry_at: string | null;
  campaign_id: string | null;
  trigger_source: string | null;
  metadata: Record<string, any> | null;
}

const STATUSES = ["queued", "sending", "sent", "failed", "cancelled"];

const statusBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "sent":      return "default";
    case "failed":    return "destructive";
    case "queued":
    case "sending":   return "outline";
    default:          return "secondary";
  }
};

export default function EmailLogs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["email-logs", statusFilter, startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("notification_logs")
        .select("*")
        .eq("channel", "email")
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter) q = q.eq("status", statusFilter as any);
      if (startDate) q = q.gte("created_at", startDate);
      if (endDate) q = q.lte("created_at", endDate + "T23:59:59");

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as EmailLog[];
    },
    refetchInterval: 10000,
  });

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.recipient_address?.toLowerCase().includes(search.toLowerCase()) ||
      l.subject?.toLowerCase().includes(search.toLowerCase()) ||
      l.resend_message_id?.toLowerCase().includes(search.toLowerCase()) ||
      l.metadata?.payer_id?.toString().toLowerCase().includes(search.toLowerCase()) ||
      l.metadata?.document_number?.toString().toLowerCase().includes(search.toLowerCase())
  );

  const handleRetry = async (log: EmailLog) => {
    setRetrying(log.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-campaign", {
        body: { retry_log_id: log.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Re-sent to ${log.recipient_address}`);
        queryClient.invalidateQueries({ queryKey: ["email-logs"] });
        if (selectedLog?.id === log.id) setSelectedLog(null);
      } else {
        toast.error("Retry failed: " + (data?.error || "Unknown"));
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRetrying(null);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Recipient", "Subject", "Status", "Payer Type", "Payer ID", "Document #", "Source", "Resend ID", "Retries", "Failure Reason"].join(","),
      ...filtered.map((l) =>
        [
          l.created_at,
          l.recipient_address,
          l.subject || "",
          l.status,
          l.metadata?.payer_type || "",
          l.metadata?.payer_id || "",
          l.metadata?.document_number || "",
          l.trigger_source || "",
          l.resend_message_id || "",
          l.retry_count ?? 0,
          l.failure_reason || "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-logs-${formatDateForStorage(new Date())}.csv`;
    a.click();
  };

  const totalSent   = filtered.filter((l) => l.status === "sent").length;
  const totalFailed = filtered.filter((l) => l.status === "failed").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Delivery Logs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor all outbound email activity and re-send failed messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Shown", value: filtered.length, icon: <Mail className="h-5 w-5 text-primary" /> },
          { label: "Delivered", value: totalSent, icon: <CheckCircle2 className="h-5 w-5 text-primary" /> },
          { label: "Failed", value: totalFailed, icon: <XCircle className="h-5 w-5 text-destructive" /> },
          { label: "Delivery Rate", value: filtered.length ? `${Math.round((totalSent / filtered.length) * 100)}%` : "—", icon: <AlertCircle className="h-5 w-5 text-primary" /> },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </div>
                {s.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipient, subject, Resend ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="From" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="To" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Log ({filtered.length} records)</CardTitle>
          <CardDescription>All outbound emails sent through Resend</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No email logs match your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Payer Type</TableHead>
                  <TableHead>Payer ID</TableHead>
                  <TableHead>Document #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatAuditDateTime(log.created_at, true)}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{log.recipient_address}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
                      {log.subject || "—"}
                    </TableCell>
                    <TableCell>
                      {log.metadata?.payer_type ? (
                        <Badge variant="outline">{String(log.metadata.payer_type)}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.metadata?.payer_id || "—"}</TableCell>
                    <TableCell className="text-xs">{log.metadata?.document_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(log.status)}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.trigger_source || "—"}</TableCell>
                    <TableCell>{log.retry_count ?? 0}</TableCell>
                    <TableCell>{log.retry_count ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {log.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRetry(log)}
                            disabled={retrying === log.id}
                            title="Re-send"
                          >
                            {retrying === log.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{formatAuditDateTime(selectedLog.created_at, true)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusBadge(selectedLog.status)}>{selectedLog.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-medium">{selectedLog.recipient_address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subject</p>
                  <p className="font-medium">{selectedLog.subject || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resend Message ID</p>
                  <p className="font-mono text-xs break-all">{selectedLog.resend_message_id || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Retry Count</p>
                  <p className="font-medium">{selectedLog.retry_count ?? 0}</p>
                </div>
                {selectedLog.sent_at && (
                  <div>
                    <p className="text-muted-foreground">Sent At</p>
                    <p className="font-medium">{formatAuditDateTime(selectedLog.sent_at, true)}</p>
                  </div>
                )}
                {selectedLog.last_retry_at && (
                  <div>
                    <p className="text-muted-foreground">Last Retry</p>
                    <p className="font-medium">{formatAuditDateTime(selectedLog.last_retry_at, true)}</p>
                  </div>
                )}
                {selectedLog.trigger_source && (
                  <div>
                    <p className="text-muted-foreground">Source</p>
                    <p className="font-medium">{selectedLog.trigger_source}</p>
                  </div>
                )}
              </div>

              {selectedLog.failure_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm font-medium text-destructive">Failure Reason</p>
                  <p className="text-sm text-destructive mt-1">{selectedLog.failure_reason}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Message Body</p>
                <div
                  className="p-3 border rounded-md bg-muted/30 text-sm overflow-auto max-h-48"
                  dangerouslySetInnerHTML={{ __html: selectedLog.body || "(no body)" }}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            {selectedLog?.status === "failed" && (
              <Button
                onClick={() => handleRetry(selectedLog)}
                disabled={retrying === selectedLog.id}
              >
                {retrying === selectedLog.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Re-send Email
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
