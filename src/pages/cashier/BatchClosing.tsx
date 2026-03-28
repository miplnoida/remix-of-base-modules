import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, Lock, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrency } from '@/utils/formatCurrency';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

// The 4 MOPs that require physical verification
const PHYSICAL_MOP_CODES = ['CSH', 'CHQ', 'CRD', 'DRD'];

interface MopMaster {
  mop_code: string;
  short_description: string;
}

const BatchClosing: React.FC = () => {
  const { toast } = useToast();
  const batchSel = useBatchSelection();
  const { userCode } = useUserCode();

  const [allMops, setAllMops] = useState<MopMaster[]>([]);
  const [physical, setPhysical] = useState<Record<string, number>>({});
  const [system, setSystem] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [batchClosed, setBatchClosed] = useState(false);

  // Fetch all MOPs from tb_method_of_payment on mount
  useEffect(() => {
    const fetchMops = async () => {
      const { data, error } = await supabase
        .from('tb_method_of_payment')
        .select('mop_code, short_description')
        .order('mop_code');
      if (!error && data) {
        setAllMops(data as MopMaster[]);
      }
    };
    fetchMops();
  }, []);

  const fetchTotals = useCallback(async (batchNumber: string) => {
    setLoading(true);
    try {
      // ---- Physical CSH ----
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

      // ---- Physical CHQ from verified cheques ----
      let physChq = 0;
      const { data: chqData } = await supabase.rpc('get_batch_cheques_for_verification' as any, {
        p_batch_number: batchNumber,
      });
      if (chqData && Array.isArray(chqData)) {
        const verifiedCheques = (chqData as any[]).filter((c: any) => c.is_verified);
        // Fetch currency rates for conversion
        const chqCurrCodes = [...new Set(verifiedCheques.map((c: any) => c.currency_code).filter(Boolean))];
        if (chqCurrCodes.length > 0) {
          const { data: chqCurrData } = await supabase
            .from('tb_currencies')
            .select('currency_code, is_main_currency, exchange_rate')
            .in('currency_code', chqCurrCodes)
            .eq('is_active', true);
          const chqCurrMap = new Map((chqCurrData || []).map(c => [c.currency_code, { isMain: c.is_main_currency, rate: c.exchange_rate }]));

          for (const chq of verifiedCheques) {
            const amt = chq.override_amount ?? chq.amount;
            const info = chqCurrMap.get(chq.currency_code);
            const rate = info?.isMain ? 1 : (info?.rate || 1);
            physChq += Number(amt) * rate;
          }
        }
      }

      // ---- Physical CRD / DRD ----
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

      // ---- System totals for ALL MOPs ----
      const { data: headers } = await supabase
        .from('cn_payment_header')
        .select('payment_id')
        .eq('batch_number', batchNumber)
        .or('status.is.null,status.eq.active');

      const sysTotals: Record<string, number> = {};

      if (headers && headers.length > 0) {
        const paymentIds = headers.map(h => h.payment_id);
        const { data: payments } = await supabase
          .from('cn_payment')
          .select('mop_code, payment_amount')
          .in('payment_id', paymentIds);

        (payments || []).forEach(p => {
          const code = p.mop_code || '';
          sysTotals[code] = (sysTotals[code] || 0) + Number(p.payment_amount || 0);
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

  // Derive lists
  const physicalMops = allMops.filter(m => PHYSICAL_MOP_CODES.includes(m.mop_code));
  const systemOnlyMops = allMops.filter(m => !PHYSICAL_MOP_CODES.includes(m.mop_code) && (system[m.mop_code] || 0) > 0);
  const mopLabel = (code: string) => allMops.find(m => m.mop_code === code)?.short_description || code;

  const physicalTotal = PHYSICAL_MOP_CODES.reduce((s, k) => s + (physical[k] || 0), 0);
  const systemPhysicalTotal = PHYSICAL_MOP_CODES.reduce((s, k) => s + (system[k] || 0), 0);
  const systemOnlyTotal = systemOnlyMops.reduce((s, m) => s + (system[m.mop_code] || 0), 0);

  // Validation only on physical MOPs
  const allMatch = PHYSICAL_MOP_CODES.every(k =>
    Math.round((physical[k] || 0) * 100) === Math.round((system[k] || 0) * 100)
  );

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
            {/* Physical vs System Reconciliation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MOP Reconciliation — Physical Count</CardTitle>
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
                    {physicalMops.map(mop => {
                      const phys = physical[mop.mop_code] || 0;
                      const sys = system[mop.mop_code] || 0;
                      const variance = phys - sys;
                      const match = Math.round(phys * 100) === Math.round(sys * 100);
                      return (
                        <TableRow key={mop.mop_code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">{mop.mop_code}</Badge>
                              <span className="text-sm">{mop.short_description}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(phys)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(sys)}</TableCell>
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
                      <TableCell>Total (Physical MOPs)</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(physicalTotal)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(systemPhysicalTotal)}</TableCell>
                      <TableCell className={`text-right font-mono ${physicalTotal !== systemPhysicalTotal ? 'text-destructive' : ''}`}>
                        {physicalTotal - systemPhysicalTotal >= 0 ? '+' : ''}{formatCurrency(physicalTotal - systemPhysicalTotal)}
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

            {/* System-only MOPs (informational) */}
            {systemOnlyMops.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    System Summary — Other Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    These payment methods do not require physical verification and are shown for informational purposes only.
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">System Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemOnlyMops.map(mop => (
                        <TableRow key={mop.mop_code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-mono text-xs">{mop.mop_code}</Badge>
                              <span className="text-sm">{mop.short_description}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(system[mop.mop_code] || 0)}</TableCell>
                        </TableRow>
                      ))}
                      {systemOnlyMops.length > 1 && (
                        <TableRow className="border-t-2 font-semibold">
                          <TableCell>Total (Other MOPs)</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(systemOnlyTotal)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Status & Action */}
            <Card>
              <CardContent className="p-6">
                {!allMatch ? (
                  <div className="text-center space-y-3">
                    <XCircle className="h-10 w-10 text-destructive mx-auto" />
                    <p className="font-semibold text-destructive">Cannot Close Batch</p>
                    <p className="text-sm text-muted-foreground">
                      One or more physical payment method totals do not match. Please correct the physical counts in Cash Details Entry before closing.
                    </p>
                    {PHYSICAL_MOP_CODES.filter(k => Math.round((physical[k] || 0) * 100) !== Math.round((system[k] || 0) * 100)).map(k => (
                      <Badge key={k} variant="destructive" className="mr-1">
                        {mopLabel(k)}: Physical {formatCurrency(physical[k] || 0)} ≠ System {formatCurrency(system[k] || 0)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                    <p className="font-semibold text-green-600">All Physical Totals Match — Ready to Close</p>
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
