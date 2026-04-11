import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Play, Eye, RefreshCw, AlertTriangle, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const PaymentLedgerSync: React.FC = () => {
  const [employerFilter, setEmployerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [autoAllocate, setAutoAllocate] = useState(false);
  const [allocationMode, setAllocationMode] = useState('oldest_due_first');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Pending payments
  const { data: pendingPayments, isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['ce_pending_payments', employerFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('ce_v_payments_unposted_to_ledger' as any).select('*').limit(100);
      if (employerFilter) query = query.eq('employer_id', employerFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Sync log
  const { data: syncLog, isLoading: loadingSyncLog, refetch: refetchSyncLog } = useQuery({
    queryKey: ['ce_payment_sync_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_payment_ledger_sync_log')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Allocations
  const { data: allocations, isLoading: loadingAlloc, refetch: refetchAlloc } = useQuery({
    queryKey: ['ce_payment_allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_payment_allocations')
        .select('*')
        .order('allocated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Reconciliation exceptions
  const { data: exceptions, isLoading: loadingExceptions, refetch: refetchExceptions } = useQuery({
    queryKey: ['ce_payment_recon_exceptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_v_payment_reconciliation_exceptions' as any).select('*').limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.rpc('ce_sync_payments_to_ledger' as any, {
        p_employer_id: employerFilter || null,
        p_payment_date_from: dateFrom || null,
        p_payment_date_to: dateTo || null,
        p_limit: 500,
        p_dry_run: dryRun,
        p_triggered_by: 'ADMIN',
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      setSyncResult(result);
      toast.success(dryRun ? 'Dry run completed' : 'Payment sync completed', {
        description: `Processed: ${result.processed_count}, Posted: ${result.posted_count}, Skipped: ${result.skipped_count}, Failed: ${result.failed_count}`,
      });
      refetchPending();
      refetchSyncLog();
    } catch (err: any) {
      toast.error('Sync failed', { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleAllocate = async (sourcePaymentId: number, employerId: string) => {
    try {
      const { data, error } = await supabase.rpc('ce_allocate_employer_payment' as any, {
        p_source_payment_id: sourcePaymentId,
        p_employer_id: employerId,
        p_allocation_mode: allocationMode,
        p_triggered_by: 'ADMIN',
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.error) {
        toast.error('Allocation issue', { description: result.error });
      } else {
        toast.success('Payment allocated', {
          description: `${result.allocated_count} items, total: ${result.allocated_total?.toFixed(2)}, remaining: ${result.remaining_unallocated?.toFixed(2)}`,
        });
      }
      refetchSyncLog();
      refetchAlloc();
      refetchExceptions();
    } catch (err: any) {
      toast.error('Allocation failed', { description: err.message });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      posted: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
      failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      skipped: { variant: 'secondary', icon: null },
      dry_run: { variant: 'outline', icon: <Eye className="h-3 w-3" /> },
      pending: { variant: 'outline', icon: null },
    };
    const cfg = map[status] || { variant: 'outline' as const, icon: null };
    return (
      <Badge variant={cfg.variant} className="gap-1 text-xs">
        {cfg.icon}{status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Ledger Sync & Allocation</h1>
        <p className="text-muted-foreground">Sync employer payments to the compliance ledger and allocate against outstanding dues.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync Controls</CardTitle>
          <CardDescription>Configure filters and run payment-to-ledger synchronization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Employer ID</Label>
              <Input value={employerFilter} onChange={(e) => setEmployerFilter(e.target.value)} placeholder="e.g. ER-001" className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={dryRun} onCheckedChange={setDryRun} id="dry-run" />
              <Label htmlFor="dry-run" className="text-xs">Dry Run</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={autoAllocate} onCheckedChange={setAutoAllocate} id="auto-alloc" />
              <Label htmlFor="auto-alloc" className="text-xs">Auto-Allocate</Label>
            </div>
            {autoAllocate && (
              <div className="space-y-1">
                <Label className="text-xs">Allocation Mode</Label>
                <Select value={allocationMode} onValueChange={setAllocationMode}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oldest_due_first">Oldest Due First</SelectItem>
                    <SelectItem value="exact_period_match">Exact Period Match</SelectItem>
                    <SelectItem value="dues_then_penalty">Dues then Penalty</SelectItem>
                    <SelectItem value="arrangement_priority">Arrangement Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : dryRun ? <Eye className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {dryRun ? 'Preview Sync' : 'Run Sync'}
            </Button>
          </div>

          {syncResult && (
            <div className="mt-4 p-3 rounded-md border bg-muted/40 grid grid-cols-5 gap-4 text-center text-sm">
              <div><div className="font-bold text-lg">{syncResult.processed_count}</div><div className="text-muted-foreground">Processed</div></div>
              <div><div className="font-bold text-lg text-green-600">{syncResult.posted_count}</div><div className="text-muted-foreground">Posted</div></div>
              <div><div className="font-bold text-lg">{syncResult.skipped_count}</div><div className="text-muted-foreground">Skipped</div></div>
              <div><div className="font-bold text-lg text-destructive">{syncResult.failed_count}</div><div className="text-muted-foreground">Failed</div></div>
              <div><div className="font-bold text-lg">{syncResult.total_amount_processed?.toFixed(2)}</div><div className="text-muted-foreground">Amount</div></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Payments ({pendingPayments?.length || 0})</TabsTrigger>
          <TabsTrigger value="synced">Sync Log ({syncLog?.length || 0})</TabsTrigger>
          <TabsTrigger value="allocations">Allocations ({allocations?.length || 0})</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions ({exceptions?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Pending */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Unsynced Payments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetchPending()}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Fund</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pendingPayments as any[])?.map((p: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{p.source_payment_id}</TableCell>
                          <TableCell>{p.employer_id}</TableCell>
                          <TableCell>{p.receipt_number || p.receipt_id || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{p.fund_code || '—'}</Badge></TableCell>
                          <TableCell>{p.payment_method}</TableCell>
                          <TableCell className="text-xs">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-right font-mono">{Number(p.amount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {(!pendingPayments || pendingPayments.length === 0) && (
                        <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No pending payments found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Log */}
        <TabsContent value="synced">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Sync Results</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetchSyncLog()}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              {loadingSyncLog ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Fund</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Sync Status</TableHead>
                        <TableHead>Allocation</TableHead>
                        <TableHead>Synced At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLog?.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.source_payment_id}</TableCell>
                          <TableCell>{s.employer_id}</TableCell>
                          <TableCell>{s.receipt_no || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{s.fund_code || '—'}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{Number(s.amount_snapshot || 0).toFixed(2)}</TableCell>
                          <TableCell>{statusBadge(s.sync_status)}</TableCell>
                          <TableCell>
                            <Badge variant={s.allocation_status === 'fully_allocated' ? 'default' : s.allocation_status === 'partial' ? 'secondary' : 'outline'}>
                              {s.allocation_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{s.synced_at ? new Date(s.synced_at).toLocaleString() : '—'}</TableCell>
                          <TableCell>
                            {s.sync_status === 'posted' && s.allocation_status === 'unallocated' && (
                              <Button variant="outline" size="sm" onClick={() => handleAllocate(s.source_payment_id, s.employer_id)}>
                                <ArrowRightLeft className="h-3 w-3 mr-1" />Allocate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!syncLog || syncLog.length === 0) && (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No sync records.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocations */}
        <TabsContent value="allocations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Allocation History</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetchAlloc()}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              {loadingAlloc ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Target Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Fund</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations?.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{a.source_payment_id}</TableCell>
                          <TableCell>{a.employer_id}</TableCell>
                          <TableCell><Badge variant="outline">{a.target_type}</Badge></TableCell>
                          <TableCell>{a.target_period || '—'}</TableCell>
                          <TableCell>{a.fund_type || '—'}</TableCell>
                          <TableCell className="text-xs">{a.allocation_mode}</TableCell>
                          <TableCell className="text-right font-mono">{Number(a.allocated_amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{a.allocated_by}</TableCell>
                          <TableCell className="text-xs">{a.allocated_at ? new Date(a.allocated_at).toLocaleString() : '—'}</TableCell>
                        </TableRow>
                      ))}
                      {(!allocations || allocations.length === 0) && (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No allocations yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exceptions */}
        <TabsContent value="exceptions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />Reconciliation Exceptions
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetchExceptions()}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              {loadingExceptions ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exception Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Source ID</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead className="text-right">Source Amt</TableHead>
                        <TableHead className="text-right">Ledger Amt</TableHead>
                        <TableHead className="text-right">Alloc Amt</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(exceptions as any[])?.map((e: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant={e.exception_type === 'over_allocated' || e.exception_type === 'cancelled_source_active_credit' ? 'destructive' : 'secondary'}>
                              {e.exception_type?.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{e.source_table}</TableCell>
                          <TableCell className="font-mono text-xs">{e.source_id}</TableCell>
                          <TableCell>{e.employer_id}</TableCell>
                          <TableCell className="text-right font-mono">{e.source_amount != null ? Number(e.source_amount).toFixed(2) : '—'}</TableCell>
                          <TableCell className="text-right font-mono">{e.ledger_amount != null ? Number(e.ledger_amount).toFixed(2) : '—'}</TableCell>
                          <TableCell className="text-right font-mono">{e.allocated_amount != null ? Number(e.allocated_amount).toFixed(2) : '—'}</TableCell>
                          <TableCell className="text-xs">{e.event_date ? new Date(e.event_date).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{e.description}</TableCell>
                        </TableRow>
                      ))}
                      {(!exceptions || exceptions.length === 0) && (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No exceptions detected.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentLedgerSync;
