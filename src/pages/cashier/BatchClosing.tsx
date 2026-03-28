import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, CheckCircle2, XCircle, Lock, Info, AlertTriangle, ChevronDown, CreditCard, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrency } from '@/utils/formatCurrency';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useNavigate } from 'react-router-dom';

const PHYSICAL_MOP_CODES = ['CSH', 'CHQ', 'CRD', 'DRD'];

interface MopMaster {
  mop_code: string;
  short_description: string;
}

interface CardTransaction {
  id: string;
  machine_id: string;
  card_type: string;
  amount: number;
  machine_code?: string;
  machine_name?: string;
}

interface BatchPaymentRow {
  payment_id: number;
  receipt_number: string;
  payer_id: string;
  receipt_total: number;
  status: string | null;
}

interface ChequeInfo {
  total: number;
  verified: number;
  unverified: number;
}

const BatchClosing: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const batchSel = useBatchSelection();
  const { userCode } = useUserCode();

  const [allMops, setAllMops] = useState<MopMaster[]>([]);
  const [physical, setPhysical] = useState<Record<string, number>>({});
  const [system, setSystem] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [batchClosed, setBatchClosed] = useState(false);

  // Enhanced data
  const [chequeInfo, setChequeInfo] = useState<ChequeInfo>({ total: 0, verified: 0, unverified: 0 });
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [batchPayments, setBatchPayments] = useState<BatchPaymentRow[]>([]);
  const [cardSectionOpen, setCardSectionOpen] = useState(false);
  const [paymentSectionOpen, setPaymentSectionOpen] = useState(false);

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

      // ---- Physical CHQ from verified cheques + cheque info ----
      let physChq = 0;
      let chqTotal = 0, chqVerified = 0, chqUnverified = 0;
      const { data: chqData } = await supabase.rpc('get_batch_cheques_for_verification' as any, {
        p_batch_number: batchNumber,
      });
      if (chqData && Array.isArray(chqData)) {
        const allCheques = chqData as any[];
        chqTotal = allCheques.length;
        chqVerified = allCheques.filter((c: any) => c.is_verified).length;
        chqUnverified = chqTotal - chqVerified;

        const verifiedCheques = allCheques.filter((c: any) => c.is_verified);
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
      setChequeInfo({ total: chqTotal, verified: chqVerified, unverified: chqUnverified });

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

      // ---- Card transactions detail ----
      const { data: cardTxns } = await supabase
        .from('cn_batch_card_transaction')
        .select('id, machine_id, card_type, amount')
        .eq('batch_number', batchNumber)
        .order('created_at', { ascending: true });

      if (cardTxns && cardTxns.length > 0) {
        const machineIds = [...new Set(cardTxns.map(t => t.machine_id))];
        const { data: machines } = await supabase
          .from('cn_card_machine')
          .select('id, machine_code, machine_name')
          .in('id', machineIds);
        const machineMap = new Map((machines || []).map(m => [m.id, m]));

        setCardTransactions(cardTxns.map(t => ({
          ...t,
          machine_code: machineMap.get(t.machine_id)?.machine_code || '',
          machine_name: machineMap.get(t.machine_id)?.machine_name || '',
        })));
      } else {
        setCardTransactions([]);
      }

      // ---- System totals for ALL MOPs ----
      const { data: headers } = await supabase
        .from('cn_payment_header')
        .select('payment_id, payer_id, status')
        .eq('batch_number', batchNumber)
        .or('status.is.null,status.eq.active');

      const sysTotals: Record<string, number> = {};

      if (headers && headers.length > 0) {
        const paymentIds = headers.map(h => h.payment_id);

        // Fetch receipts and payments in parallel
        const [receiptsRes, paymentsRes] = await Promise.all([
          supabase.from('cn_receipt').select('payment_id, receipt_number, receipt_total, status').in('payment_id', paymentIds),
          supabase.from('cn_payment').select('payment_id, mop_code, payment_amount').in('payment_id', paymentIds),
        ]);

        const receiptMap = new Map((receiptsRes.data || []).map(r => [r.payment_id, r]));

        // Build batch payment rows for display
        const paymentRows: BatchPaymentRow[] = headers.map(h => {
          const receipt = receiptMap.get(h.payment_id);
          return {
            payment_id: h.payment_id,
            receipt_number: receipt?.receipt_number || '—',
            payer_id: h.payer_id,
            receipt_total: Number(receipt?.receipt_total || 0),
            status: h.status,
          };
        });
        setBatchPayments(paymentRows);

        (paymentsRes.data || []).forEach(p => {
          const code = p.mop_code || '';
          sysTotals[code] = (sysTotals[code] || 0) + Number(p.payment_amount || 0);
        });
      } else {
        setBatchPayments([]);
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

  const allMatch = PHYSICAL_MOP_CODES.every(k =>
    Math.round((physical[k] || 0) * 100) === Math.round((system[k] || 0) * 100)
  );

  const renderMopExtra = (mopCode: string) => {
    if (mopCode === 'CHQ' && chequeInfo.total > 0) {
      return (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {chequeInfo.verified}/{chequeInfo.total} verified
          </span>
          {chequeInfo.unverified > 0 && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {chequeInfo.unverified} pending
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

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
            {/* Cheque verification warning */}
            {chequeInfo.unverified > 0 && (
              <Card className="border-accent">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-accent-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {chequeInfo.unverified} cheque{chequeInfo.unverified > 1 ? 's' : ''} pending verification
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Unverified cheques are excluded from the CHQ physical count. Verify them in Cash Details to match the system total.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/cashier/cash-details?batch=${batchSel.selectedBatch?.batch_number}`)}
                  >
                    Go to Cash Details
                  </Button>
                </CardContent>
              </Card>
            )}

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
                              <div>
                                <span className="text-sm">{mop.short_description}</span>
                                {renderMopExtra(mop.mop_code)}
                              </div>
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

            {/* Card Transaction Details */}
            {cardTransactions.length > 0 && (
              <Collapsible open={cardSectionOpen} onOpenChange={setCardSectionOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Card Machine Transactions
                        <Badge variant="secondary" className="ml-auto">{cardTransactions.length}</Badge>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${cardSectionOpen ? 'rotate-180' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Machine</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cardTransactions.map(txn => (
                            <TableRow key={txn.id}>
                              <TableCell>
                                <div>
                                  <span className="font-mono text-xs">{txn.machine_code}</span>
                                  {txn.machine_name && (
                                    <span className="text-xs text-muted-foreground ml-2">{txn.machine_name}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={txn.card_type === 'CRD' ? 'default' : 'secondary'} className="text-xs">
                                  {txn.card_type === 'CRD' ? 'Credit' : 'Debit'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(txn.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Batch Transactions Breakdown */}
            {batchPayments.length > 0 && (
              <Collapsible open={paymentSectionOpen} onOpenChange={setPaymentSectionOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Batch Transactions
                        <Badge variant="secondary" className="ml-auto">{batchPayments.length}</Badge>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${paymentSectionOpen ? 'rotate-180' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Payer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchPayments.map(p => (
                            <TableRow key={p.payment_id}>
                              <TableCell className="font-mono text-xs">{p.receipt_number || '—'}</TableCell>
                              <TableCell className="text-sm">{p.payer_name || '—'}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(Number(p.total_amount || 0))}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-semibold">
                            <TableCell colSpan={2}>Grand Total</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(batchPayments.reduce((s, p) => s + Number(p.total_amount || 0), 0))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* System-only MOPs */}
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
                    <div className="flex flex-wrap justify-center gap-1">
                      {PHYSICAL_MOP_CODES.filter(k => Math.round((physical[k] || 0) * 100) !== Math.round((system[k] || 0) * 100)).map(k => (
                        <Badge key={k} variant="destructive" className="mr-1">
                          {mopLabel(k)}: Physical {formatCurrency(physical[k] || 0)} ≠ System {formatCurrency(system[k] || 0)}
                        </Badge>
                      ))}
                    </div>
                    {/* Specific CHQ guidance */}
                    {Math.round((physical['CHQ'] || 0) * 100) !== Math.round((system['CHQ'] || 0) * 100) && chequeInfo.unverified > 0 && (
                      <p className="text-xs text-accent-foreground mt-2">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {chequeInfo.unverified} cheque{chequeInfo.unverified > 1 ? 's' : ''} pending verification in Cash Details — verify them to match CHQ total.
                      </p>
                    )}
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
