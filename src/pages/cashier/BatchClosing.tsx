import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrency } from '@/utils/formatCurrency';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface MopTotals {
  CSH: number;
  CHQ: number;
  CRD: number;
  DRD: number;
}

const MOP_LABELS: Record<string, string> = {
  CSH: 'Cash',
  CHQ: 'Cheques',
  CRD: 'Credit Card',
  DRD: 'Debit Card',
};

const BatchClosing: React.FC = () => {
  const { toast } = useToast();
  const batchSel = useBatchSelection();
  const { userCode } = useUserCode();

  const [physical, setPhysical] = useState<MopTotals>({ CSH: 0, CHQ: 0, CRD: 0, DRD: 0 });
  const [system, setSystem] = useState<MopTotals>({ CSH: 0, CHQ: 0, CRD: 0, DRD: 0 });
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [batchClosed, setBatchClosed] = useState(false);

  const fetchTotals = useCallback(async (batchNumber: string) => {
    setLoading(true);
    try {
      // Physical CSH: cn_cash_count joined with denominations and currency config
      const { data: cashRows } = await supabase
        .from('cn_cash_count')
        .select('count, denomination_id, currency_id')
        .eq('batch_number', batchNumber);

      let physCsh = 0;
      if (cashRows && cashRows.length > 0) {
        const denomIds = [...new Set(cashRows.map(r => r.denomination_id))];
        const currIds = [...new Set(cashRows.map(r => r.currency_id))];

        const [denomRes, currRes] = await Promise.all([
          supabase.from('cashier_currency_denominations').select('id, denomination_value').in('id', denomIds),
          supabase.from('tb_currencies').select('id, is_main_currency, exchange_rate').in('id', currIds),
        ]);

        const denomMap = new Map((denomRes.data || []).map(d => [d.id, d.denomination_value]));
        const currMap = new Map((currRes.data || []).map(c => [c.id, { isMain: c.is_main_currency, rate: c.exchange_rate }]));

        for (const row of cashRows) {
          const denomVal = denomMap.get(row.denomination_id) || 0;
          const currInfo = currMap.get(row.currency_id);
          const rate = currInfo?.isMain ? 1 : (currInfo?.rate || 1);
          physCsh += row.count * denomVal * rate;
        }
      }

      // Physical CHQ — convert each cheque to base currency
      const { data: chqRows } = await supabase
        .from('cn_batch_cheque')
        .select('amount, currency_code')
        .eq('batch_number', batchNumber);

      let physChq = 0;
      if (chqRows && chqRows.length > 0) {
        const chqCurrCodes = [...new Set(chqRows.map(r => r.currency_code).filter(Boolean))];
        const { data: chqCurrData } = await supabase
          .from('tb_currencies')
          .select('currency_code, is_main_currency, exchange_rate')
          .in('currency_code', chqCurrCodes)
          .eq('is_active', true);
        const chqCurrMap = new Map((chqCurrData || []).map(c => [c.currency_code, { isMain: c.is_main_currency, rate: c.exchange_rate }]));

        for (const row of chqRows) {
          const info = chqCurrMap.get(row.currency_code);
          const rate = info?.isMain ? 1 : (info?.rate || 1);
          physChq += Number(row.amount) * rate;
        }
      }

      // Physical CRD / DRD
      const { data: cardRows } = await supabase
        .from('cn_batch_card_total')
        .select('mop_code, amount')
        .eq('batch_number', batchNumber);
      let physCrd = 0, physDrd = 0;
      (cardRows || []).forEach(r => {
        if (r.mop_code === 'CRD') physCrd = Number(r.amount);
        if (r.mop_code === 'DRD') physDrd = Number(r.amount);
      });

      setPhysical({ CSH: physCsh, CHQ: physChq, CRD: physCrd, DRD: physDrd });

      // System totals from cn_payment via cn_payment_header
      const { data: headers } = await supabase
        .from('cn_payment_header')
        .select('payment_id')
        .eq('batch_number', batchNumber)
        .or('status.is.null,status.eq.active');

      const sysTotals: MopTotals = { CSH: 0, CHQ: 0, CRD: 0, DRD: 0 };

      if (headers && headers.length > 0) {
        const paymentIds = headers.map(h => h.payment_id);
        const { data: payments } = await supabase
          .from('cn_payment')
          .select('mop_code, payment_amount')
          .in('payment_id', paymentIds);

        (payments || []).forEach(p => {
          const code = p.mop_code as keyof MopTotals;
          if (code in sysTotals) {
            sysTotals[code] += Number(p.payment_amount || 0);
          }
        });
      }

      setSystem(sysTotals);
    } catch (err) {
      console.error('Failed to fetch totals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batchSel.selectedBatch?.batch_number) {
      setBatchClosed(batchSel.selectedBatch.batch_status === 'P');
      if (batchSel.selectedBatch.batch_status === 'O') {
        fetchTotals(batchSel.selectedBatch.batch_number);
      }
    }
  }, [batchSel.selectedBatch?.batch_number, batchSel.selectedBatch?.batch_status, fetchTotals]);

  const handleCloseBatch = async () => {
    const batchNumber = batchSel.selectedBatch?.batch_number;
    if (!batchNumber || !userCode) return;

    setClosing(true);
    try {
      const { data, error } = await supabase.rpc('close_batch', {
        p_batch_number: batchNumber,
        p_user_code: userCode,
      });

      if (error) throw error;

      toast({ title: 'Batch Closed', description: `Batch ${batchNumber} has been posted successfully.` });
      setBatchClosed(true);
      setConfirmOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to close batch';
      toast({ title: 'Batch Close Failed', description: msg, variant: 'destructive' });
      setConfirmOpen(false);
    } finally {
      setClosing(false);
    }
  };

  const mopCodes: (keyof MopTotals)[] = ['CSH', 'CHQ', 'CRD', 'DRD'];
  const physicalTotal = mopCodes.reduce((s, k) => s + physical[k], 0);
  const systemTotal = mopCodes.reduce((s, k) => s + system[k], 0);
  const allMatch = mopCodes.every(k => Math.round(physical[k] * 100) === Math.round(system[k] * 100));

  return (
    <BatchSelectionGuard
      isLoading={batchSel.isLoading}
      isReady={batchSel.isReady}
      noBatchesAvailable={batchSel.noBatchesAvailable}
      showPopup={batchSel.showPopup}
      openBatches={batchSel.openBatches}
      canManageAllBatches={batchSel.canManageAllBatches}
      selectedBatch={batchSel.selectedBatch}
      onSelectBatch={batchSel.selectBatch}
      onChangeBatch={batchSel.changeBatch}
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Batch Closing</h1>
          <p className="text-muted-foreground text-sm">Reconcile physical counts with system totals and close the batch</p>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {batchClosed ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">Batch is Posted</h2>
              <p className="text-sm text-muted-foreground">This batch has already been closed and posted. No further changes can be made.</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading reconciliation data...</span>
          </div>
        ) : (
          <>
            {/* Comparison Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MOP Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Physical Count</TableHead>
                      <TableHead className="text-right">System Total</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-center w-20">Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mopCodes.map(code => {
                      const variance = physical[code] - system[code];
                      const match = Math.round(physical[code] * 100) === Math.round(system[code] * 100);
                      return (
                        <TableRow key={code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">{code}</Badge>
                              <span className="text-sm">{MOP_LABELS[code]}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(physical[code])}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(system[code])}</TableCell>
                          <TableCell className={`text-right font-mono ${!match ? 'text-destructive font-semibold' : ''}`}>
                            {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                          </TableCell>
                          <TableCell className="text-center">
                            {match ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(physicalTotal)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(systemTotal)}</TableCell>
                      <TableCell className={`text-right font-mono ${physicalTotal !== systemTotal ? 'text-destructive' : ''}`}>
                        {physicalTotal - systemTotal >= 0 ? '+' : ''}{formatCurrency(physicalTotal - systemTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        {allMatch ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Status & Action */}
            <Card>
              <CardContent className="p-6">
                {!allMatch ? (
                  <div className="text-center space-y-3">
                    <XCircle className="h-10 w-10 text-destructive mx-auto" />
                    <p className="font-semibold text-destructive">Cannot Close Batch</p>
                    <p className="text-sm text-muted-foreground">
                      One or more payment method totals do not match. Please correct the physical counts in Cash Details Entry before closing.
                    </p>
                    {mopCodes.filter(k => Math.round(physical[k] * 100) !== Math.round(system[k] * 100)).map(k => (
                      <Badge key={k} variant="destructive" className="mr-1">
                        {MOP_LABELS[k]}: Physical {formatCurrency(physical[k])} ≠ System {formatCurrency(system[k])}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                    <p className="font-semibold text-green-600">All Totals Match — Ready to Close</p>
                    <Button size="lg" onClick={() => setConfirmOpen(true)} disabled={closing}>
                      {closing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Close & Post Batch
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm Batch Closing"
          description={`Are you sure you want to close batch ${batchSel.selectedBatch?.batch_number}? This will update the batch status to Posted and cannot be undone.`}
          confirmLabel="Close & Post"
          onConfirm={handleCloseBatch}
          isLoading={closing}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default BatchClosing;
