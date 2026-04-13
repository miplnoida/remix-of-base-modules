/**
 * Arrangement Detail Panel — Compliance Officer Operational View
 *
 * Read-only + action panel for a single payment arrangement.
 * Tabs: Installments | Breaches | Reconciliation | Case History
 *
 * Actions are backed by existing server-side RPCs only:
 *   - reconcileLedgerPayment (manual retry)
 *   - recalculateArrangementSummary (repair totals)
 *
 * Does NOT modify payment posting or arrangement creation flows.
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock,
  FileText, Loader2, RefreshCw, Shield, XCircle,
} from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { toast } from 'sonner';
import { fetchArrangementWithInstallments, recalculateArrangementSummary } from '@/services/compliance/paymentReconciliationService';

// ── Types ───────────────────────────────────────────────────

interface ArrangementDetailPanelProps {
  arrangementId: string;
  onBack: () => void;
}

// ── Helpers ─────────────────────────────────────────────────

const formatCurrency = (amount: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 })
    .format(Number(amount ?? 0));

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'ACTIVE': return 'default';
    case 'COMPLETED': return 'secondary';
    case 'DEFAULTED': return 'destructive';
    case 'PAID': return 'secondary';
    case 'OVERDUE': return 'destructive';
    case 'PARTIAL': return 'outline';
    default: return 'outline';
  }
};

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-success/10 text-success',
    COMPLETED: 'bg-primary/10 text-primary',
    DEFAULTED: 'bg-destructive/10 text-destructive',
    DRAFT: 'bg-muted text-muted-foreground',
    CANCELLED: 'bg-muted text-muted-foreground',
    PAID: 'bg-success/10 text-success',
    OVERDUE: 'bg-destructive/10 text-destructive',
    PARTIAL: 'bg-warning/10 text-warning-foreground',
    PENDING: 'bg-muted text-muted-foreground',
  };
  return map[status] || 'bg-muted text-muted-foreground';
};

// ── Component ───────────────────────────────────────────────

export const ArrangementDetailPanel: React.FC<ArrangementDetailPanelProps> = ({
  arrangementId,
  onBack,
}) => {
  const queryClient = useQueryClient();

  // ── Arrangement + Installments ────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['arrangement_detail', arrangementId],
    queryFn: () => fetchArrangementWithInstallments(arrangementId),
    enabled: !!arrangementId,
  });

  // ── Breaches ──────────────────────────────────────────────
  const { data: breaches = [] } = useQuery({
    queryKey: ['arrangement_breaches', arrangementId],
    queryFn: async () => {
      const { data: b, error } = await supabase
        .from('ce_arrangement_breaches')
        .select('*')
        .eq('arrangement_id', arrangementId)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return b ?? [];
    },
    enabled: !!arrangementId,
  });

  // ── Case History (linked case) ────────────────────────────
  const caseId = data?.arrangement?.case_id;
  const { data: caseHistory = [] } = useQuery({
    queryKey: ['arrangement_case_history', caseId],
    queryFn: async () => {
      const { data: h, error } = await supabase
        .from('ce_case_history')
        .select('*')
        .eq('case_id', caseId!)
        .order('performed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return h ?? [];
    },
    enabled: !!caseId,
  });

  // ── Case info ─────────────────────────────────────────────
  const { data: linkedCase } = useQuery({
    queryKey: ['arrangement_linked_case', caseId],
    queryFn: async () => {
      const { data: c, error } = await supabase
        .from('ce_cases')
        .select('id, case_number, status, priority, summary, assigned_officer_name')
        .eq('id', caseId!)
        .single();
      if (error) throw error;
      return c;
    },
    enabled: !!caseId,
  });

  // ── Reconciliation log ────────────────────────────────────
  const employerId = data?.arrangement?.employer_id;
  const { data: recentReconciliations = [] } = useQuery({
    queryKey: ['arrangement_reconciliation_log', employerId],
    queryFn: async () => {
      const { data: r, error } = await supabase
        .from('ce_payment_observation_log')
        .select('*')
        .eq('employer_id', employerId!)
        .order('observed_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return r ?? [];
    },
    enabled: !!employerId,
  });

  // ── Notices for this case ─────────────────────────────────
  const { data: notices = [] } = useQuery({
    queryKey: ['arrangement_notices', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data: n, error } = await supabase
        .from('ce_notices')
        .select('id, notice_number, notice_type, status, subject, created_at, delivery_method')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return n ?? [];
    },
    enabled: !!caseId,
  });

  // ── Actions ───────────────────────────────────────────────

  const recalcMutation = useMutation({
    mutationFn: () => recalculateArrangementSummary(arrangementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrangement_detail', arrangementId] });
      toast.success('Arrangement summary recalculated');
    },
    onError: (e: any) => toast.error('Recalculation failed', { description: e.message }),
  });

  // ── Render ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.arrangement) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Arrangement not found</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
      </div>
    );
  }

  const arr = data.arrangement;
  const installments = data.installments;
  const outstanding = Number(arr.total_debt ?? 0) - Number(arr.total_paid ?? 0);
  const progressPct = arr.number_of_installments
    ? ((arr.installments_paid ?? 0) / arr.number_of_installments) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{arr.arrangement_number}</h2>
          <p className="text-sm text-muted-foreground">{arr.employer_name} · {arr.employer_id}</p>
        </div>
        <Badge className={statusColor(arr.status)}>{arr.status}</Badge>
        {arr.breach_detected && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />BREACH
          </Badge>
        )}
        <Button
          variant="outline" size="sm"
          onClick={() => recalcMutation.mutate()}
          disabled={recalcMutation.isPending}
        >
          {recalcMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Recalculate
        </Button>
      </div>

      {/* ── Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Debt</p>
            <p className="text-lg font-bold">{formatCurrency(arr.total_debt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-success">{formatCurrency(arr.total_paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Installments</p>
            <p className="text-lg font-bold">{arr.installments_paid ?? 0} / {arr.number_of_installments ?? 0}</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Arrangement Meta ────────────────────────────── */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Frequency</p>
              <p className="font-medium">{arr.frequency ?? '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Start Date</p>
              <p className="font-medium">{arr.start_date ? formatDateForDisplay(arr.start_date) : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Next Due</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {arr.next_due_date ? formatDateForDisplay(arr.next_due_date) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Missed Payments</p>
              <p className={`font-medium ${(arr.missed_payments ?? 0) > 0 ? 'text-destructive' : ''}`}>
                {arr.missed_payments ?? 0} / {arr.max_missed_before_breach ?? 2} max
              </p>
            </div>
          </div>
          {arr.breach_detected && arr.breach_reason && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-destructive text-xs">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{arr.breach_reason}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Linked Case ─────────────────────────────────── */}
      {linkedCase && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Linked Case
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-muted-foreground text-xs">Case #</p>
                <p className="font-mono text-xs font-medium">{linkedCase.case_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge className={statusColor(linkedCase.status ?? '')} >{linkedCase.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Priority</p>
                <p className="font-medium">{linkedCase.priority ?? '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Officer</p>
                <p className="font-medium">{linkedCase.assigned_officer_name ?? 'Unassigned'}</p>
              </div>
            </div>
            {linkedCase.summary && (
              <p className="text-xs text-muted-foreground mt-2 italic">{linkedCase.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ────────────────────────────────────────── */}
      <Tabs defaultValue="installments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="installments">
            Installments ({installments.length})
          </TabsTrigger>
          <TabsTrigger value="breaches">
            Breaches ({breaches.length})
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            Reconciliation ({recentReconciliations.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Case History ({caseHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Installments Tab ──────────────────────────── */}
        <TabsContent value="installments">
          <Card>
            <CardContent className="pt-4">
              {installments.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No installments found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Overdue Days</TableHead>
                        <TableHead>Payment Ref</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installments.map((inst: any) => {
                        const remaining = Number(inst.amount ?? 0) - Number(inst.paid_amount ?? 0);
                        return (
                          <TableRow key={inst.id} className={inst.status === 'OVERDUE' ? 'bg-destructive/5' : ''}>
                            <TableCell className="font-mono text-xs">{inst.installment_number}</TableCell>
                            <TableCell className="flex items-center gap-1.5">
                              <CalendarDays className="h-3 w-3 text-muted-foreground" />
                              {inst.due_date ? formatDateForDisplay(inst.due_date) : '-'}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(inst.amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inst.paid_amount)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {remaining > 0 ? formatCurrency(remaining) : <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColor(inst.status ?? 'PENDING')}>
                                {inst.status ?? 'PENDING'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {inst.status === 'OVERDUE' ? (
                                <span className="text-destructive font-medium">{inst.overdue_days ?? 0}d</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs truncate max-w-[120px]">
                              {inst.payment_reference || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Breaches Tab ──────────────────────────────── */}
        <TabsContent value="breaches">
          <Card>
            <CardContent className="pt-4">
              {breaches.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No breaches recorded</p>
              ) : (
                <div className="space-y-3">
                  {breaches.map((b: any) => (
                    <div key={b.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${b.resolution ? 'text-muted-foreground' : 'text-destructive'}`} />
                          <Badge variant={b.resolution ? 'secondary' : 'destructive'}>
                            {b.breach_type ?? 'STANDARD'}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {b.detected_at ? formatDateForDisplay(b.detected_at) : '-'}
                        </span>
                      </div>
                      <p className="text-sm">{b.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Detected by: {b.detected_by ?? 'SYSTEM'}</span>
                        {b.resolution && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span className="text-success flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolved: {b.resolution}
                            </span>
                            {b.resolved_at && <span>on {formatDateForDisplay(b.resolved_at)}</span>}
                          </>
                        )}
                      </div>
                      {b.resolution_notes && (
                        <p className="text-xs italic text-muted-foreground border-t pt-1 mt-1">{b.resolution_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reconciliation Tab ────────────────────────── */}
        <TabsContent value="reconciliation">
          <Card>
            <CardContent className="pt-4">
              {recentReconciliations.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No recent reconciliation activity</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Observed At</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Ledger Entry</TableHead>
                      <TableHead>Observed By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReconciliations.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.observed_at ? formatDateForDisplay(r.observed_at) : '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.observation_type ?? '-'}</Badge></TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[120px]">{r.ledger_entry_id?.slice(0, 8) ?? '-'}</TableCell>
                        <TableCell className="text-xs">{r.observed_by ?? 'SYSTEM'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{r.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Case History Tab ──────────────────────────── */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-4">
              {!caseId ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No linked case</p>
              ) : caseHistory.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No case history entries</p>
              ) : (
                <div className="space-y-2">
                  {caseHistory.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                      <div className="mt-0.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{h.action}</span>
                          {h.from_status && h.to_status && (
                            <span className="text-xs text-muted-foreground">
                              {h.from_status} → {h.to_status}
                            </span>
                          )}
                        </div>
                        {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        <p>{h.performed_at ? formatDateForDisplay(h.performed_at) : '-'}</p>
                        <p>{h.performed_by ?? 'SYSTEM'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Notices (if any exist for linked case) ───────── */}
      {notices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Related Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notice #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.notice_number}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{n.notice_type}</Badge></TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">{n.subject}</TableCell>
                    <TableCell><Badge className={statusColor(n.status ?? '')}>{n.status}</Badge></TableCell>
                    <TableCell className="text-xs">{n.delivery_method ?? '-'}</TableCell>
                    <TableCell className="text-xs">{n.created_at ? formatDateForDisplay(n.created_at) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
