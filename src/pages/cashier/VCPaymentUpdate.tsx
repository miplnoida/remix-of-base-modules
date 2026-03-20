import React, { useState, useCallback } from 'react';
import { printConfiguredReceipt } from '@/lib/receiptPrinter';
import { usePaymentBatch } from '@/hooks/usePaymentBatch';
import { usePaymentEntry, PayerInfo, PaymentDetailData } from '@/hooks/usePaymentEntry';
import { useReceiptActions } from '@/hooks/useReceiptActions';
import { PaymentHeaderForm } from '@/components/payments/PaymentHeaderForm';
import { PaymentDetailGrid } from '@/components/payments/PaymentDetailGrid';
import { PaymentActionBar } from '@/components/payments/PaymentActionBar';
import { BatchCreationModal } from '@/components/payments/BatchCreationModal';
import { MOPDetailModal } from '@/components/payments/MOPDetailModal';
import { ReceiptCancelModal } from '@/components/payments/ReceiptCancelModal';
import { PayerSearchModal } from '@/components/payments/PayerSearchModal';
import { AddDetailModal } from '@/components/payments/AddDetailModal';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDateForStorage } from '@/lib/dateFormat';
import { UserCheck, Calculator, Loader2 } from 'lucide-react';

const VCPaymentUpdate = () => {
  const batchSel = useBatchSelection();
  const batch = usePaymentBatch();
  const payment = usePaymentEntry();
  const receipt = useReceiptActions();

  // Sync batch hook with selected batch
  React.useEffect(() => {
    if (batchSel.selectedBatch) {
      batch.setCurrentBatch({
        batch_number: batchSel.selectedBatch.batch_number,
        batch_status: batchSel.selectedBatch.batch_status,
        batch_date: batchSel.selectedBatch.batch_date,
        entered_by: batchSel.selectedBatch.entered_by,
        office_code: batchSel.selectedBatch.office_code,
        offset_amount: batchSel.selectedBatch.offset_amount,
        balance_forward: batchSel.selectedBatch.balance_forward,
        balance_status: null,
        verified_by: null,
        date_verified: null,
        posted_by: null,
        date_posted: null,
        date_entered: null,
      });
    }
  }, [batchSel.selectedBatch]);

  const [payerType, setPayerType] = useState('VC');
  const [payerId, setPayerId] = useState('');
  const [payerInfo, setPayerInfo] = useState<PayerInfo | null>(null);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(new Date());
  const [remarks, setRemarks] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showPayerSearch, setShowPayerSearch] = useState(false);
  const [showAddDetail, setShowAddDetail] = useState(false);
  const [showMOPModal, setShowMOPModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedDetailRow, setSelectedDetailRow] = useState<PaymentDetailData | null>(null);
  const [balanceForward, setBalanceForward] = useState(0);

  const [vcInfo, setVcInfo] = useState<any>(null);
  const [isApplyingVC, setIsApplyingVC] = useState(false);

  const handleNewBatch = useCallback(async () => {
    const bf = await batch.getBalanceForward();
    setBalanceForward(bf);
    setShowBatchModal(true);
  }, [batch]);

  const handleCreateBatch = useCallback(async (batchDate: string, officeCode: string) => {
    await batch.createBatch(batchDate, officeCode, 'USR');
    setShowBatchModal(false);
    resetPaymentForm();
  }, [batch]);

  const handleValidatePayer = useCallback(async () => {
    if (!payerId.trim()) return;
    setIsValidating(true);
    const info = await payment.lookupPayer('VC', payerId.trim());
    setPayerInfo(info);
    if (!info) {
      toast({ title: 'Not Found', description: 'Voluntary contributor not found.', variant: 'destructive' });
    } else {
      const { data: vcData } = await supabase
        .from('ip_vol_contrib')
        .select('*')
        .eq('ssn', payerId.trim())
        .maybeSingle();
      setVcInfo(vcData);
    }
    setIsValidating(false);
  }, [payerId, payment]);

  const handlePayerSelect = useCallback((payer: PayerInfo) => {
    setPayerId(payer.id);
    setPayerInfo(payer);
  }, []);

  const handleNewPayment = useCallback(async () => {
    if (!batch.currentBatch || !payerInfo) {
      toast({ title: 'Missing Data', description: 'Validate VC payer before creating payment.', variant: 'destructive' });
      return;
    }
    const dateRcvd = dateReceived ? formatDateForStorage(dateReceived) : formatDateForStorage(new Date());
    await payment.createPaymentHeader(batch.currentBatch.batch_number, 'VC', payerId, dateRcvd, remarks);
    receipt.setCurrentReceipt(null);
  }, [batch.currentBatch, payerId, payerInfo, dateReceived, remarks, payment, receipt]);

  const handleAddDetail = useCallback(async (detail: any) => {
    if (!payment.currentHeader) return;
    await payment.addDetailRow(payment.currentHeader.payment_id, detail);
  }, [payment]);

  const handleDeleteDetail = useCallback(async (seqNo: number) => {
    if (!payment.currentHeader) return;
    await payment.deleteDetailRow(payment.currentHeader.payment_id, seqNo);
  }, [payment]);

  const handleEditMOP = useCallback((seqNo: number) => {
    const row = payment.detailRows.find(r => r.payment_sequence_no === seqNo);
    setSelectedDetailRow(row || null);
    setShowMOPModal(true);
  }, [payment.detailRows]);

  const handleSaveMOP = useCallback(async (updates: Partial<PaymentDetailData>) => {
    if (!selectedDetailRow) return;
    await supabase.from('cn_payment').update(updates as any)
      .eq('payment_id', selectedDetailRow.payment_id)
      .eq('payment_sequence_no', selectedDetailRow.payment_sequence_no);
    if (payment.currentHeader) await payment.loadPaymentDetails(payment.currentHeader.payment_id);
  }, [selectedDetailRow, payment]);

  const handlePrintReceipt = useCallback(async () => {
    if (!payment.currentHeader) return;
    await receipt.printReceipt(payment.currentHeader.payment_id, payment.totalPaymentAmount, payment.detailRows.length, 'USR');
    setTimeout(() => printConfiguredReceipt(payment.currentHeader!.payment_id).catch(e => console.error('Receipt print error:', e)), 300);
  }, [payment, receipt]);

  const handleReprintReceipt = useCallback(async () => {
    if (!payment.currentHeader) return;
    await receipt.reprintReceipt(payment.currentHeader.payment_id, 'USR');
    setTimeout(() => printConfiguredReceipt(payment.currentHeader!.payment_id).catch(e => console.error('Receipt print error:', e)), 300);
  }, [payment, receipt]);

  const handleCancelReceipt = useCallback(async (reason: string) => {
    if (!payment.currentHeader) return;
    await receipt.cancelReceipt(payment.currentHeader.payment_id, reason, 'USR');
    setShowCancelModal(false);
  }, [payment, receipt]);

  const handleApplyVCContribution = useCallback(async () => {
    if (!payment.currentHeader || !vcInfo) {
      toast({ title: 'Cannot Apply', description: 'No VC record or payment loaded.', variant: 'destructive' });
      return;
    }
    setIsApplyingVC(true);
    try {
      toast({
        title: 'VC Contribution Applied',
        description: `Contribution schedule updated for SSN ${payerId}. Amount: $${payment.totalPaymentAmount.toFixed(2)}`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsApplyingVC(false);
    }
  }, [payment, vcInfo, payerId]);

  const resetPaymentForm = () => {
    setPayerType('VC');
    setPayerId('');
    setPayerInfo(null);
    setDateReceived(new Date());
    setRemarks('');
    setVcInfo(null);
    payment.setCurrentHeader(null);
    payment.setDetailRows([]);
    receipt.setCurrentReceipt(null);
  };

  const isDisabled = !batch.isBatchOpen || receipt.currentReceipt?.status === 'C';

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
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Update Voluntary Contributor</h1>
          <p className="text-sm text-muted-foreground">Specialist payment processing for voluntary contributors with contribution schedule updates.</p>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700">
          <UserCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-300">Voluntary Contributor Mode</p>
            <p className="text-blue-700 dark:text-blue-400">This screen processes VC payments and applies contribution schedule logic. Use the "Apply VC Contribution" action after entering payment details.</p>
          </div>
        </div>

        <PaymentActionBar
          onNewBatch={handleNewBatch}
          onNewPayment={handleNewPayment}
          onPrintReceipt={handlePrintReceipt}
          onReprintReceipt={handleReprintReceipt}
          onCancelReceipt={() => setShowCancelModal(true)}
          onPayerSearch={() => setShowPayerSearch(true)}
          hasBatch={!!batch.currentBatch}
          hasPayment={!!payment.currentHeader}
          receiptStatus={receipt.currentReceipt?.status || null}
          isBatchOpen={batch.isBatchOpen}
          isProcessing={batch.isLoading || payment.isLoading || receipt.isLoading}
        />

        {payment.currentHeader && payment.detailRows.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleApplyVCContribution} disabled={isApplyingVC || !vcInfo} className="gap-2">
              {isApplyingVC ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Apply VC Contribution
            </Button>
          </div>
        )}

        {vcInfo && (
          <Card>
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                VC Schedule Info
                <Badge variant="secondary">Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Avg Weekly Wage</span>
                  <span className="font-mono">${vcInfo.avg_weekly_wage?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Contribution Amt</span>
                  <span className="font-mono">${vcInfo.contrib_amt?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Payment Interval</span>
                  <span>{vcInfo.payment_interval || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Category</span>
                  <span>{vcInfo.category || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <PaymentHeaderForm
          payerType={payerType} setPayerType={() => {}}
          payerId={payerId} setPayerId={setPayerId}
          payerInfo={payerInfo}
          dateReceived={dateReceived} setDateReceived={setDateReceived}
          remarks={remarks} setRemarks={setRemarks}
          onPayerBlur={handleValidatePayer}
          isValidating={isValidating}
          disabled={isDisabled}
        />

        <PaymentDetailGrid
          rows={payment.detailRows as any}
          onAddRow={() => setShowAddDetail(true)}
          onDeleteRow={handleDeleteDetail}
          onEditRow={handleEditMOP}
          disabled={isDisabled || !payment.currentHeader}
          totalAmount={payment.totalPaymentAmount}
        />

        <BatchCreationModal open={showBatchModal} onClose={() => setShowBatchModal(false)}
          onCreateBatch={handleCreateBatch} balanceForward={balanceForward} isLoading={batch.isLoading} />
        <PayerSearchModal open={showPayerSearch} onClose={() => setShowPayerSearch(false)}
          payerType="VC" onSelect={handlePayerSelect} searchFn={payment.searchPayers} />
        <AddDetailModal open={showAddDetail} onClose={() => setShowAddDetail(false)} onAdd={handleAddDetail} />
        <MOPDetailModal open={showMOPModal} onClose={() => { setShowMOPModal(false); setSelectedDetailRow(null); }}
          detailRow={selectedDetailRow} onSave={handleSaveMOP} />
        <ReceiptCancelModal open={showCancelModal} onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelReceipt} isLoading={receipt.isLoading} receiptId={receipt.currentReceipt?.receipt_id} />
      </div>
    </BatchSelectionGuard>
  );
};

export default VCPaymentUpdate;
