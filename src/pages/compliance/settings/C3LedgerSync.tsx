import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Play, Eye, FlaskConical, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

const C3LedgerSync = () => {
  const queryClient = useQueryClient();
  const [employerFilter, setEmployerFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);

  // Fetch pending C3 records from the reconciliation view
  const { data: pendingRecords, isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['ce_v_c3_unposted', employerFilter, periodFilter],
    queryFn: async () => {
      let query = supabase
        .from('ce_v_c3_unposted_to_ledger' as any)
        .select('*')
        .order('period', { ascending: false })
        .limit(200);

      if (employerFilter) query = query.eq('payer_id', employerFilter);
      if (periodFilter) query = query.eq('period', periodFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sync log history
  const { data: syncLogs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['ce_c3_sync_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_c3_ledger_sync_log')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Sync mutation (calls edge function)
  const syncMutation = useMutation({
    mutationFn: async (params: { dry_run: boolean }) => {
      const { data, error } = await supabase.functions.invoke('ce-c3-ledger-sync', {
        body: {
          employer_id: employerFilter || null,
          period: periodFilter || null,
          limit: 500,
          dry_run: params.dry_run,
          triggered_by: 'ADMIN',
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ['ce_v_c3_unposted'] });
      queryClient.invalidateQueries({ queryKey: ['ce_c3_sync_log'] });
      queryClient.invalidateQueries({ queryKey: ['ce_ledger_entries'] });
      queryClient.invalidateQueries({ queryKey: ['ce_ledger_periods'] });
      if (data?.dry_run) {
        toast.info(`Dry run complete: ${data.posted_count} entries would be posted from ${data.processed_count} C3 records.`);
      } else {
        toast.success(`Sync complete: ${data.posted_count} posted, ${data.skipped_count} skipped, ${data.failed_count} failed.`);
      }
    },
    onError: (err: any) => {
      toast.error('Sync failed', { description: err.message });
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(val || 0);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">C3 Ledger Sync</h1>
          <p className="text-muted-foreground">Synchronize posted C3 submissions to the compliance ledger without modifying source tables.</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Employer ID</Label>
              <Input
                placeholder="e.g. ER001"
                value={employerFilter}
                onChange={(e) => setEmployerFilter(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Input
                type="date"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => { refetchPending(); refetchLogs(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => refetchPending()} variant="outline">
          <Eye className="h-4 w-4 mr-2" /> Preview Pending
        </Button>
        <Button
          onClick={() => syncMutation.mutate({ dry_run: true })}
          variant="secondary"
          disabled={syncMutation.isPending}
        >
          <FlaskConical className="h-4 w-4 mr-2" /> Dry Run
        </Button>
        <Button
          onClick={() => syncMutation.mutate({ dry_run: false })}
          disabled={syncMutation.isPending}
        >
          <Play className="h-4 w-4 mr-2" /> Run Sync Now
        </Button>
      </div>

      {/* Last Result Summary */}
      {lastResult && (
        <Card className={lastResult.dry_run ? 'border-blue-500/50' : 'border-green-500/50'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {lastResult.dry_run ? (
                <><FlaskConical className="h-4 w-4 text-blue-500" /> Dry Run Result</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /> Sync Result</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{lastResult.processed_count}</div>
                <div className="text-xs text-muted-foreground">C3 Records Found</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-600">{lastResult.posted_count}</div>
                <div className="text-xs text-muted-foreground">Ledger Entries {lastResult.dry_run ? 'Would Post' : 'Created'}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                <div className="text-2xl font-bold text-yellow-600">{lastResult.skipped_count}</div>
                <div className="text-xs text-muted-foreground">Skipped (Idempotent)</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <div className="text-2xl font-bold text-destructive">{lastResult.failed_count}</div>
                <div className="text-xs text-muted-foreground">Failures</div>
              </div>
            </div>
            {lastResult.errors?.length > 0 && (
              <div className="mt-3 p-3 bg-destructive/5 rounded-lg">
                <div className="flex items-center gap-1 text-sm font-medium text-destructive mb-1">
                  <AlertTriangle className="h-4 w-4" /> Errors
                </div>
                {lastResult.errors.map((e: any, i: number) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    {e.payer_id} / {e.period} seq {e.sequence_no}: {e.error}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending C3 Records ({pendingRecords?.length || 0})</TabsTrigger>
          <TabsTrigger value="logs">Sync Log ({syncLogs?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Seq</TableHead>
                      <TableHead className="text-right">SS Dues</TableHead>
                      <TableHead className="text-right">Levy Dues</TableHead>
                      <TableHead className="text-right">EI Dues</TableHead>
                      <TableHead className="text-right">SS Fine</TableHead>
                      <TableHead className="text-right">Levy Fine</TableHead>
                      <TableHead className="text-right">PE Fine</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPending ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : pendingRecords?.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No pending C3 records to sync.</TableCell></TableRow>
                    ) : (
                      (pendingRecords as any[])?.map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            <div>{r.payer_id}</div>
                            <div className="text-xs text-muted-foreground">{r.employer_name}</div>
                          </TableCell>
                          <TableCell>{r.period}</TableCell>
                          <TableCell>{r.sequence_no}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.ss_dues)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.levy_dues)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.ei_dues)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.ss_penalty)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.levy_penalty)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.pe_penalty)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(r.total_amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Seq</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Synced By</TableHead>
                      <TableHead>Synced At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : syncLogs?.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No sync logs yet.</TableCell></TableRow>
                    ) : (
                      (syncLogs as any[])?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.payer_id}</TableCell>
                          <TableCell>{log.period}</TableCell>
                          <TableCell>{log.sequence_no}</TableCell>
                          <TableCell>{statusBadge(log.sync_status)}</TableCell>
                          <TableCell>{log.ledger_entry_ids?.length || 0}</TableCell>
                          <TableCell>{log.synced_by}</TableCell>
                          <TableCell className="text-xs">{log.synced_at ? formatDateForDisplay(log.synced_at) : '-'}</TableCell>
                          <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default C3LedgerSync;
