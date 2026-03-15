import React, { useState, useCallback } from 'react';
import { usePaymentBatch } from '@/hooks/usePaymentBatch';
import { usePaymentEntry, PayerInfo, PaymentDetailData } from '@/hooks/usePaymentEntry';
import { useReceiptActions } from '@/hooks/useReceiptActions';
import { BatchHeader } from '@/components/payments/BatchHeader';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDateForStorage } from '@/lib/dateFormat';

const PaymentDataEntry = () => {
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

  const [payerType, setPayerType] = useState('ER');
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
    const info = await payment.lookupPayer(payerType, payerId.trim());
    setPayerInfo(info);
    if (!info) toast({ title: 'Not Found', description: 'Payer not found.', variant: 'destructive' });
    setIsValidating(false);
  }, [payerType, payerId, payment]);

  const handlePayerSelect = useCallback((payer: PayerInfo) => {
    setPayerId(payer.id);
    setPayerInfo(payer);
  }, []);

  const handleNewPayment = useCallback(async () => {
    if (!batch.currentBatch || !payerInfo) {
      toast({ title: 'Missing Data', description: 'Validate payer before creating payment.', variant: 'destructive' });
      return;
    }
    const dateRcvd = dateReceived ? formatDateForStorage(dateReceived) : formatDateForStorage(new Date());
    await payment.createPaymentHeader(batch.currentBatch.batch_number, payerType, payerId, dateRcvd, remarks);
    receipt.setCurrentReceipt(null);
  }, [batch.currentBatch, payerType, payerId, payerInfo, dateReceived, remarks, payment, receipt]);

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
  }, [payment, receipt]);

  const handleReprintReceipt = useCallback(async () => {
    if (!payment.currentHeader) return;
    await receipt.reprintReceipt(payment.currentHeader.payment_id, 'USR');
  }, [payment, receipt]);

  const handleCancelReceipt = useCallback(async (reason: string) => {
    if (!payment.currentHeader) return;
    await receipt.cancelReceipt(payment.currentHeader.payment_id, reason, 'USR');
    setShowCancelModal(false);
  }, [payment, receipt]);

  const resetPaymentForm = () => {
    setPayerType('ER');
    setPayerId('');
    setPayerInfo(null);
    setDateReceived(new Date());
    setRemarks('');
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
          <h1 className="text-2xl font-bold tracking-tight">Payment Data Entry</h1>
          <p className="text-sm text-muted-foreground">Current payment processing — enter new payments within an open batch.</p>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

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

        <PaymentHeaderForm
          payerType={payerType} setPayerType={setPayerType}
          payerId={payerId} setPayerId={setPayerId}
          payerInfo={payerInfo}
          dateReceived={dateReceived} setDateReceived={setDateReceived}
          remarks={remarks} setRemarks={setRemarks}
          onValidatePayer={handleValidatePayer}
          onPayerSearch={() => setShowPayerSearch(true)}
          isValidating={isValidating}
          disabled={isDisabled}
        />

        <PaymentDetailGrid
          rows={payment.detailRows}
          onAddRow={() => setShowAddDetail(true)}
          onDeleteRow={handleDeleteDetail}
          onEditMOP={handleEditMOP}
          disabled={isDisabled || !payment.currentHeader}
          totalAmount={payment.totalPaymentAmount}
        />

        <BatchCreationModal open={showBatchModal} onClose={() => setShowBatchModal(false)}
          onCreateBatch={handleCreateBatch} balanceForward={balanceForward} isLoading={batch.isLoading} />
        <PayerSearchModal open={showPayerSearch} onClose={() => setShowPayerSearch(false)}
          payerType={payerType} onSelect={handlePayerSelect} searchFn={payment.searchPayers} />
        <AddDetailModal open={showAddDetail} onClose={() => setShowAddDetail(false)} onAdd={handleAddDetail} />
        <MOPDetailModal open={showMOPModal} onClose={() => { setShowMOPModal(false); setSelectedDetailRow(null); }}
          detailRow={selectedDetailRow} onSave={handleSaveMOP} />
        <ReceiptCancelModal open={showCancelModal} onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelReceipt} isLoading={receipt.isLoading} receiptId={receipt.currentReceipt?.receipt_id} />
      </div>
    </BatchSelectionGuard>
  );
};

export default PaymentDataEntry;
