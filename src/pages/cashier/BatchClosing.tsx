import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Lock, AlertTriangle, ChevronDown, FileText, Landmark, CreditCard, Send, SkipForward } from 'lucide-react';
import { ReceiptCancelModal } from '@/components/payments/ReceiptCancelModal';
import {
  useReceiptCancelRequests,
  useCreateReceiptCancelRequest,
  useApplyReceiptCancellation,
  getActiveCancelRequest,
  ReceiptCancelRequest,
} from '@/hooks/useReceiptCancelRequests';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrency } from '@/utils/formatCurrency';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useOfficeCardMachines } from '@/hooks/useOfficeCardMachines';
import {
  useCardMachineChangeRequests,
  useCreateCardMachineChangeRequest,
  useApplyCardMachineChange,
  useSkipApprovedChange,
  getActiveRequest,
  hasBlockingRequests,
  getApprovedPendingRequests,
  CardMachineChangeRequest,
} from '@/hooks/useCardMachineChangeRequests';

const PHYSICAL_MOP_CODES = ['CSH', 'CHQ', 'CRD', 'DRD'];

interface MopMaster {
  mop_code: string;
  short_description: string;
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

interface PaymentMethodDetail {
  payment_id: number;
  payment_sequence_no: number;
  mop_code: string;
  mop_label: string;
  amount: number;
  card_machine_id: string | null;
  card_machine_name: string | null;
}

interface CardMachineTotalRow {
  card_machine_id: string;
  machine_code: string;
  machine_name: string;
  card_type_support: string;
  txn_count: number;
  total_amount: number;
}

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' => {
  switch (status) {
    case 'Pending': case 'InProgress': return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'destructive';
    case 'Completed': return 'secondary';
    case 'Cancelled': return 'outline';
    default: return 'secondary';
  }
};

const BatchClosing: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const batchSel = useBatchSelection({ skipDateFilter: true });
  const { userCode } = useUserCode();

  const [allMops, setAllMops] = useState<MopMaster[]>([]);
  const [physical, setPhysical] = useState<Record<string, number>>({});
  const [system, setSystem] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [batchClosed, setBatchClosed] = useState(false);

  const [chequeInfo, setChequeInfo] = useState<ChequeInfo>({ total: 0, verified: 0, unverified: 0 });
  const [batchPayments, setBatchPayments] = useState<BatchPaymentRow[]>([]);
  const [paymentSectionOpen, setPaymentSectionOpen] = useState(false);

  const [cardMachineTotals, setCardMachineTotals] = useState<CardMachineTotalRow[]>([]);
  const [cardMachineSectionOpen, setCardMachineSectionOpen] = useState(false);

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [methodModalPayment, setMethodModalPayment] = useState<BatchPaymentRow | null>(null);
  const [methodModalDetails, setMethodModalDetails] = useState<PaymentMethodDetail[]>([]);
  const [methodModalLoading, setMethodModalLoading] = useState(false);

  // Change request dialog state
  const [changeRequestDialogOpen, setChangeRequestDialogOpen] = useState(false);
  const [changeRequestTarget, setChangeRequestTarget] = useState<PaymentMethodDetail | null>(null);
  const [changeRequestComment, setChangeRequestComment] = useState('');

  // Apply change dialog state
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<{ request: CardMachineChangeRequest; detail: PaymentMethodDetail } | null>(null);
  const [applyMachineId, setApplyMachineId] = useState('');

  // Skip approval dialog state
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipTarget, setSkipTarget] = useState<CardMachineChangeRequest | null>(null);
  const [skipComment, setSkipComment] = useState('');

  // Batch close guard dialog
  const [batchCloseGuardOpen, setBatchCloseGuardOpen] = useState(false);

  // Receipt cancel states
  const [showBatchCancelModal, setShowBatchCancelModal] = useState(false);
  const [cancelTargetPayment, setCancelTargetPayment] = useState<BatchPaymentRow | null>(null);

  const officeCode = batchSel.selectedBatch?.office_code;
  const { allMachines } = useOfficeCardMachines(officeCode);

  // Change requests for this batch
  const batchNumber = batchSel.selectedBatch?.batch_number;
  const { data: changeRequests = [], refetch: refetchChangeRequests } = useCardMachineChangeRequests(batchNumber);
  const createChangeRequest = useCreateCardMachineChangeRequest();
  const applyChange = useApplyCardMachineChange();
  const skipApproval = useSkipApprovedChange();

  // Receipt cancel requests for this batch
  const { data: cancelRequests = [] } = useReceiptCancelRequests(batchNumber);
  const createCancelRequest = useCreateReceiptCancelRequest();
  const applyCancellation = useApplyReceiptCancellation();

  const handleBatchCancelReceipt = useCallback(async (reason: string) => {
    if (!cancelTargetPayment || !batchNumber) return;
    // Find receipt for this payment
    const { data: rcpt } = await supabase
      .from('cn_receipt')
      .select('receipt_id, receipt_total')
      .eq('payment_id', cancelTargetPayment.payment_id)
      .maybeSingle();
    if (!rcpt) {
      toast({ title: 'No receipt found', variant: 'destructive' });
      return;
    }
    try {
      await createCancelRequest.mutateAsync({
        batchNumber,
        paymentId: cancelTargetPayment.payment_id,
        receiptId: rcpt.receipt_id,
        receiptTotal: rcpt.receipt_total,
        reason,
      });
      setShowBatchCancelModal(false);
      setCancelTargetPayment(null);
    } catch (_) {}
  }, [cancelTargetPayment, batchNumber, createCancelRequest]);

  const handleApplyBatchCancellation = useCallback(async (req: ReceiptCancelRequest) => {
    try {
      await applyCancellation.mutateAsync({
        requestId: req.id,
        receiptId: req.receipt_id,
        paymentId: req.payment_id,
        batchNumber: req.batch_number,
        reason: req.reason,
      });
    } catch (_) {}
  }, [applyCancellation]);

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

  const openingBalance = Number(batchSel.selectedBatch?.offset_amount || 0);

  const fetchTotals = useCallback(async (batchNumber: string) => {
    setLoading(true);
    try {
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

      const { data: headers } = await supabase
        .from('cn_payment_header')
        .select('payment_id, payer_id, status')
        .eq('batch_number', batchNumber)
        .or('status.is.null,status.eq.active');

      const sysTotals: Record<string, number> = {};
      const cmTotalsMap: Record<string, { machine_code: string; machine_name: string; card_type_support: string; txn_count: number; total_amount: number }> = {};

      if (headers && headers.length > 0) {
        const paymentIds = headers.map(h => h.payment_id);

        const [receiptsRes, paymentsRes] = await Promise.all([
          supabase.from('cn_receipt').select('payment_id, receipt_number, receipt_total, status').in('payment_id', paymentIds),
          supabase.from('cn_payment').select('payment_id, mop_code, payment_amount, card_machine_id').in('payment_id', paymentIds),
        ]);

        const receiptMap = new Map((receiptsRes.data || []).map(r => [r.payment_id, r]));
        const activePaymentIds = new Set(
          (receiptsRes.data || [])
            .filter(r => r.status !== 'C')
            .map(r => r.payment_id)
        );

        const paymentRows: BatchPaymentRow[] = headers
          .filter(h => activePaymentIds.has(h.payment_id))
          .map(h => {
            const receipt = receiptMap.get(h.payment_id);
            return {
              payment_id: h.payment_id,
              receipt_number: receipt?.receipt_number || '—',
              payer_id: h.payer_id,
              receipt_total: Number(receipt?.receipt_total || 0),
              status: receipt?.status || h.status,
            };
          });
        setBatchPayments(paymentRows);

        (paymentsRes.data || []).forEach(p => {
          if (!activePaymentIds.has(p.payment_id)) return;
          const code = p.mop_code || '';
          sysTotals[code] = (sysTotals[code] || 0) + Number(p.payment_amount || 0);

          if (p.card_machine_id) {
            if (!cmTotalsMap[p.card_machine_id]) {
              cmTotalsMap[p.card_machine_id] = { machine_code: '', machine_name: '', card_type_support: '', txn_count: 0, total_amount: 0 };
            }
            cmTotalsMap[p.card_machine_id].txn_count += 1;
            cmTotalsMap[p.card_machine_id].total_amount += Number(p.payment_amount || 0);
          }
        });
      } else {
        setBatchPayments([]);
      }

      const openingBalance = Number(batchSel.selectedBatch?.offset_amount || 0);
      if (openingBalance !== 0) {
        sysTotals['CSH'] = (sysTotals['CSH'] || 0) + openingBalance;
      }

      setSystem(sysTotals);

      const physCrd = sysTotals['CRD'] || 0;
      const physDrd = sysTotals['DRD'] || 0;
      setPhysical({ CSH: physCsh, CHQ: physChq, CRD: physCrd, DRD: physDrd });

      if (Object.keys(cmTotalsMap).length > 0) {
        const cmIds = Object.keys(cmTotalsMap);
        const { data: cmData } = await supabase
          .from('cn_card_machine')
          .select('id, machine_code, machine_name, card_type_support')
          .in('id', cmIds);

        const cmRows: CardMachineTotalRow[] = (cmData || []).map(cm => ({
          card_machine_id: cm.id,
          machine_code: cm.machine_code,
          machine_name: cm.machine_name,
          card_type_support: cm.card_type_support,
          txn_count: cmTotalsMap[cm.id]?.txn_count || 0,
          total_amount: cmTotalsMap[cm.id]?.total_amount || 0,
        }));
        setCardMachineTotals(cmRows);
      } else {
        setCardMachineTotals([]);
      }
    } catch (err) {
      console.error('Failed to fetch totals:', err);
    } finally {
      setLoading(false);
    }
  }, [openingBalance]);

  useEffect(() => {
    if (batchSel.selectedBatch?.batch_number) {
      setBatchClosed(batchSel.selectedBatch.batch_status === 'P');
      if (batchSel.selectedBatch.batch_status === 'O') {
        fetchTotals(batchSel.selectedBatch.batch_number);
      }
    }
  }, [batchSel.selectedBatch?.batch_number, batchSel.selectedBatch?.batch_status, fetchTotals]);

  // Batch close guard logic
  const handleCloseBatchAttempt = () => {
    const blocking = hasBlockingRequests(changeRequests);
    const approvedPending = getApprovedPendingRequests(changeRequests);

    if (blocking) {
      toast({
        title: 'Cannot Close Batch',
        description: 'There are pending or in-progress card machine change requests. Please wait for approval decisions before closing.',
        variant: 'destructive',
      });
      return;
    }

    if (approvedPending.length > 0) {
      setBatchCloseGuardOpen(true);
      return;
    }

    setConfirmOpen(true);
  };

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

  const handlePaymentRowClick = async (payment: BatchPaymentRow) => {
    setMethodModalPayment(payment);
    setMethodModalOpen(true);
    setMethodModalLoading(true);
    setMethodModalDetails([]);

    try {
      const { data: cnData } = await supabase
        .from('cn_payment')
        .select('payment_id, payment_sequence_no, mop_code, payment_amount, card_machine_id')
        .eq('payment_id', payment.payment_id);

      const cmIds = [...new Set((cnData || []).map((p: any) => p.card_machine_id).filter(Boolean))] as string[];
      let cmNameMap: Record<string, string> = {};
      if (cmIds.length > 0) {
        const { data: cmData } = await supabase
          .from('cn_card_machine')
          .select('id, machine_name')
          .in('id', cmIds);
        cmNameMap = Object.fromEntries((cmData || []).map(cm => [cm.id, cm.machine_name]));
      }

      const details: PaymentMethodDetail[] = (cnData || []).map((p: any) => ({
        payment_id: p.payment_id,
        payment_sequence_no: p.payment_sequence_no,
        mop_code: p.mop_code || '',
        mop_label: allMops.find(m => m.mop_code === p.mop_code)?.short_description || p.mop_code || '',
        amount: Number(p.payment_amount || 0),
        card_machine_id: p.card_machine_id || null,
        card_machine_name: p.card_machine_id ? (cmNameMap[p.card_machine_id] || null) : null,
      }));

      setMethodModalDetails(details);
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    } finally {
      setMethodModalLoading(false);
    }
  };

  const getCompatibleMachines = (mopCode: string) => {
    return allMachines.filter(m => m.card_type_support === mopCode || m.card_type_support === 'BOTH');
  };

  // Change request submission
  const handleSubmitChangeRequest = async () => {
    if (!changeRequestTarget || !batchNumber) return;
    await createChangeRequest.mutateAsync({
      batchNumber,
      paymentId: changeRequestTarget.payment_id,
      paymentSequenceNo: changeRequestTarget.payment_sequence_no,
      currentCardMachineId: changeRequestTarget.card_machine_id,
      comment: changeRequestComment,
    });
    setChangeRequestDialogOpen(false);
    setChangeRequestComment('');
    setChangeRequestTarget(null);
    refetchChangeRequests();
  };

  // Apply approved change
  const handleApplyChange = async () => {
    if (!applyTarget || !applyMachineId || !batchNumber) return;
    await applyChange.mutateAsync({
      requestId: applyTarget.request.id,
      paymentId: applyTarget.detail.payment_id,
      paymentSequenceNo: applyTarget.detail.payment_sequence_no,
      newCardMachineId: applyMachineId,
      batchNumber,
    });
    setApplyDialogOpen(false);
    setApplyTarget(null);
    setApplyMachineId('');
    refetchChangeRequests();
    if (batchNumber) fetchTotals(batchNumber);
  };

  // Skip approved change
  const handleSkipApproval = async (request: CardMachineChangeRequest) => {
    if (!batchNumber) return;
    await skipApproval.mutateAsync({
      requestId: request.id,
      batchNumber,
      skipComment,
    });
    setSkipDialogOpen(false);
    setSkipTarget(null);
    setSkipComment('');
    refetchChangeRequests();
  };

  // Build unified MOP rows
  const allMopCodes = new Set([...PHYSICAL_MOP_CODES, ...Object.keys(system)]);
  const reconMops = allMops.filter(m => allMopCodes.has(m.mop_code));
  const mopLabel = (code: string) => allMops.find(m => m.mop_code === code)?.short_description || code;

  const grandPhysicalTotal = reconMops.reduce((s, m) => s + (physical[m.mop_code] || 0), 0);
  const grandSystemTotal = reconMops.reduce((s, m) => s + (system[m.mop_code] || 0), 0);

  const allMatch = reconMops.every(m => {
    const phys = physical[m.mop_code] || 0;
    const sys = system[m.mop_code] || 0;
    if (PHYSICAL_MOP_CODES.includes(m.mop_code)) {
      return Math.round(phys * 100) === Math.round(sys * 100);
    }
    return true;
  });

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

  const cardMachineGrandTotal = cardMachineTotals.reduce((s, r) => s + r.total_amount, 0);
  const cardMachineTxnCount = cardMachineTotals.reduce((s, r) => s + r.txn_count, 0);

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

            {openingBalance > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Opening Balance: {formatCurrency(openingBalance)}</p>
                    <p className="text-xs text-muted-foreground">
                      The opening cash balance is included in the CSH system total for reconciliation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Change Requests Warning */}
            {hasBlockingRequests(changeRequests) && (
              <Card className="border-destructive">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      Card machine change requests pending approval
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Batch cannot be closed until all change requests are resolved (approved or rejected).
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MOP Reconciliation */}
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
                    {reconMops.map(mop => {
                      const isPhysical = PHYSICAL_MOP_CODES.includes(mop.mop_code);
                      const phys = physical[mop.mop_code] || 0;
                      const sys = system[mop.mop_code] || 0;
                      const variance = phys - sys;
                      const match = isPhysical
                        ? Math.round(phys * 100) === Math.round(sys * 100)
                        : true;
                      return (
                        <TableRow key={mop.mop_code} className={!isPhysical ? 'bg-muted/30' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={isPhysical ? 'outline' : 'secondary'} className="font-mono text-xs">{mop.mop_code}</Badge>
                              <div>
                                <span className="text-sm">{mop.short_description}</span>
                                {renderMopExtra(mop.mop_code)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {isPhysical ? formatCurrency(phys) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(sys)}</TableCell>
                          <TableCell className={`text-right font-mono ${!match ? 'text-destructive font-semibold' : ''}`}>
                            {isPhysical ? (
                              <>{variance >= 0 ? '+' : ''}{formatCurrency(variance)}</>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {match ? (
                              <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>Grand Total</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(grandPhysicalTotal)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(grandSystemTotal)}</TableCell>
                      <TableCell className={`text-right font-mono ${grandPhysicalTotal !== grandSystemTotal ? 'text-destructive' : ''}`}>
                        {grandPhysicalTotal - grandSystemTotal >= 0 ? '+' : ''}{formatCurrency(grandPhysicalTotal - grandSystemTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        {allMatch ? (
                          <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Card Machine Totals */}
            <Collapsible open={cardMachineSectionOpen} onOpenChange={setCardMachineSectionOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Card Machine Totals
                      {cardMachineTotals.length > 0 && (
                        <Badge variant="secondary" className="ml-auto">{cardMachineTxnCount} txns</Badge>
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${cardMachineSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {cardMachineTotals.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No card machine transactions in this batch.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Machine Code</TableHead>
                            <TableHead>Machine Name</TableHead>
                            <TableHead>Card Type</TableHead>
                            <TableHead className="text-right">Transactions</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cardMachineTotals.map(row => (
                            <TableRow key={row.card_machine_id}>
                              <TableCell className="font-mono text-xs">{row.machine_code}</TableCell>
                              <TableCell className="text-sm">{row.machine_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {row.card_type_support === 'BOTH' ? 'CRD / DRD' : row.card_type_support}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">{row.txn_count}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(row.total_amount)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-semibold">
                            <TableCell colSpan={3}>Grand Total</TableCell>
                            <TableCell className="text-right font-mono">{cardMachineTxnCount}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(cardMachineGrandTotal)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Batch Transactions */}
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
                            <TableHead className="text-center">Cancel</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchPayments.map(p => {
                            const cancelReq = cancelRequests ? getActiveCancelRequest(cancelRequests, p.payment_id) : undefined;
                            const isPending = cancelReq && ['Pending', 'InProgress'].includes(cancelReq.status);
                            const isApproved = cancelReq?.status === 'Approved';
                            return (
                              <TableRow
                                key={p.payment_id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handlePaymentRowClick(p)}
                              >
                                <TableCell className="font-mono text-xs">{p.receipt_number}</TableCell>
                                <TableCell className="text-sm">{p.payer_id || '—'}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(p.receipt_total)}</TableCell>
                                <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                  {isPending && (
                                    <Badge variant="warning" className="text-[10px]">Pending</Badge>
                                  )}
                                  {isApproved && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-6 text-xs px-2"
                                      disabled={applyCancellation.isPending}
                                      onClick={() => handleApplyBatchCancellation(cancelReq!)}
                                    >
                                      Apply Cancel
                                    </Button>
                                  )}
                                  {p.status === 'O' && !cancelReq && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setCancelTargetPayment(p);
                                        setShowBatchCancelModal(true);
                                      }}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />Cancel
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="border-t-2 font-semibold">
                            <TableCell colSpan={3}>Grand Total</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(batchPayments.reduce((s, p) => s + p.receipt_total, 0))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
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
                    {Math.round((physical['CHQ'] || 0) * 100) !== Math.round((system['CHQ'] || 0) * 100) && chequeInfo.unverified > 0 && (
                      <p className="text-xs text-accent-foreground mt-2">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {chequeInfo.unverified} cheque{chequeInfo.unverified > 1 ? 's' : ''} pending verification in Cash Details — verify them to match CHQ total.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                    <p className="font-semibold text-primary">All Physical Totals Match — Ready to Close</p>
                    <Button size="lg" onClick={handleCloseBatchAttempt} disabled={closing}>
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

        {/* Payment Methods Detail Modal — with workflow-controlled card machine */}
        <Dialog open={methodModalOpen} onOpenChange={setMethodModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Payment Methods
                {methodModalPayment && (
                  <Badge variant="outline" className="font-mono text-xs ml-2">
                    Receipt: {methodModalPayment.receipt_number}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {methodModalLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : methodModalDetails.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payment method details found.</p>
            ) : (
              <div className="space-y-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Card Machine</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {methodModalDetails.map(d => {
                      const isCard = d.mop_code === 'CRD' || d.mop_code === 'DRD';
                      const rowKey = `${d.payment_id}_${d.payment_sequence_no}`;
                      const activeReq = isCard ? getActiveRequest(changeRequests, d.payment_id, d.payment_sequence_no) : undefined;

                      return (
                        <TableRow key={rowKey}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">{d.mop_code}</Badge>
                              <span className="text-sm">{d.mop_label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(d.amount)}</TableCell>
                          <TableCell>
                            {isCard ? (
                              <span className="text-xs">{d.card_machine_name || '—'}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isCard && (
                              <div className="flex flex-col items-center gap-1">
                                {activeReq ? (
                                  <>
                                    <Badge variant={statusVariant(activeReq.status)} className="text-[10px]">
                                      {activeReq.status === 'InProgress' ? 'Approval Pending' : activeReq.status}
                                    </Badge>
                                    {activeReq.status === 'Approved' && !batchClosed && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setApplyTarget({ request: activeReq, detail: d });
                                          setApplyMachineId('');
                                          setApplyDialogOpen(true);
                                        }}
                                      >
                                        Apply Change
                                      </Button>
                                    )}
                                  </>
                                ) : !batchClosed ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setChangeRequestTarget(d);
                                      setChangeRequestComment('');
                                      setChangeRequestDialogOpen(true);
                                    }}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Request Change
                                  </Button>
                                ) : null}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {methodModalDetails.length > 1 && (
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(methodModalDetails.reduce((s, d) => s + d.amount, 0))}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Request Card Machine Change Dialog */}
        <Dialog open={changeRequestDialogOpen} onOpenChange={setChangeRequestDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Card Machine Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Payment ID: <span className="font-mono">{changeRequestTarget?.payment_id}</span></p>
                <p>Current Machine: <span className="font-medium">{changeRequestTarget?.card_machine_name || '—'}</span></p>
              </div>
              <div>
                <Label>Reason for Change <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Enter reason for requesting card machine change..."
                  value={changeRequestComment}
                  onChange={e => setChangeRequestComment(e.target.value)}
                  className="min-h-[80px] mt-1"
                />
                {changeRequestComment.trim().length === 0 && (
                  <p className="text-xs text-destructive mt-1">A comment is required to submit this request.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangeRequestDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmitChangeRequest}
                disabled={!changeRequestComment.trim() || createChangeRequest.isPending}
              >
                {createChangeRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Apply Approved Change Dialog */}
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply Card Machine Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This change request has been approved. Select the new card machine to apply.
              </p>
              <div>
                <Label>New Card Machine</Label>
                <Select value={applyMachineId} onValueChange={setApplyMachineId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select card machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {applyTarget && getCompatibleMachines(applyTarget.detail.mop_code).map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.machine_code} — {m.machine_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleApplyChange}
                disabled={!applyMachineId || applyChange.isPending}
              >
                {applyChange.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Apply Change
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Skip Approval Dialog */}
        <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Skip Approved Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will disregard the approved card machine change. The approver will be notified.
              </p>
              <div>
                <Label>Reason for Skipping <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Enter reason for skipping this approved change..."
                  value={skipComment}
                  onChange={e => setSkipComment(e.target.value)}
                  className="min-h-[80px] mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => skipTarget && handleSkipApproval(skipTarget)}
                disabled={!skipComment.trim() || skipApproval.isPending}
              >
                {skipApproval.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Skip & Notify Approver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Close Guard — approved but unapplied changes */}
        <Dialog open={batchCloseGuardOpen} onOpenChange={setBatchCloseGuardOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Approved Changes Pending</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The following card machine change requests have been approved but not yet applied. You can apply them or skip them before closing the batch.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getApprovedPendingRequests(changeRequests).map(req => (
                  <div key={req.id} className="flex items-center justify-between border rounded p-3">
                    <div className="text-sm">
                      <p className="font-mono text-xs">Payment {req.payment_id}/{req.payment_sequence_no}</p>
                      <p className="text-xs text-muted-foreground">{req.comment}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const detail = methodModalDetails.find(d => d.payment_id === req.payment_id && d.payment_sequence_no === req.payment_sequence_no);
                          if (detail) {
                            setApplyTarget({ request: req, detail });
                            setApplyMachineId('');
                            setApplyDialogOpen(true);
                            setBatchCloseGuardOpen(false);
                          }
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSkipTarget(req);
                          setSkipComment('');
                          setSkipDialogOpen(true);
                          setBatchCloseGuardOpen(false);
                        }}
                      >
                        <SkipForward className="h-3 w-3 mr-1" />
                        Skip
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchCloseGuardOpen(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Receipt Cancel Modal for Batch Transactions */}
        <ReceiptCancelModal
          open={showBatchCancelModal}
          onClose={() => { setShowBatchCancelModal(false); setCancelTargetPayment(null); }}
          onConfirm={handleBatchCancelReceipt}
          isLoading={createCancelRequest.isPending}
          receiptId={cancelTargetPayment?.payment_id}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default BatchClosing;
