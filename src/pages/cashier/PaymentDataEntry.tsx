import React, { useState, useCallback } from 'react';
import { usePaymentBatch } from '@/hooks/usePaymentBatch';
import { usePaymentEntry, PayerInfo } from '@/hooks/usePaymentEntry';
import { useReceiptActions } from '@/hooks/useReceiptActions';
import { useUserCode } from '@/hooks/useUserCode';
import { BatchHeader } from '@/components/payments/BatchHeader';
import { PaymentHeaderForm } from '@/components/payments/PaymentHeaderForm';
import { PaymentDetailGrid } from '@/components/payments/PaymentDetailGrid';
import { AddDetailModal, DetailLineData } from '@/components/payments/AddDetailModal';
import { ChequeDetailModal, ChequeDetails } from '@/components/payments/ChequeDetailModal';
import { CardDetailModal, CardDetails } from '@/components/payments/CardDetailModal';
import { ReceiptCancelModal } from '@/components/payments/ReceiptCancelModal';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDateForStorage } from '@/lib/dateFormat';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  RotateCcw, XCircle, Loader2, Receipt, PlusCircle,
} from 'lucide-react';

type FlowState = 'entry' | 'saving' | 'saved';

const PaymentDataEntry = () => {
  const batchSel = useBatchSelection();
  const batch = usePaymentBatch();
  const payment = usePaymentEntry();
  const receipt = useReceiptActions();
  const { userCode } = useUserCode();

  // Sync batch
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

  // --- Form State (client-side only until Generate Receipt) ---
  const [payerType, setPayerType] = useState('ER');
  const [payerId, setPayerId] = useState('');
  const [payerInfo, setPayerInfo] = useState<PayerInfo | null>(null);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(new Date());
  const [remarks, setRemarks] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Detail lines in client state
  const [detailLines, setDetailLines] = useState<DetailLineData[]>([]);
  const [flowState, setFlowState] = useState<FlowState>('entry');
  const [savedPaymentId, setSavedPaymentId] = useState<number | null>(null);

  // Modals
  const [showAddDetail, setShowAddDetail] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingMopLineIndex, setPendingMopLineIndex] = useState<number | null>(null);

  const totalAmount = detailLines.reduce((s, r) => s + (r.payment_amount || 0), 0);

  // --- Payer auto-search on blur ---
  const handlePayerBlur = useCallback(async () => {
    if (!payerId.trim() || isValidating) return;
    setIsValidating(true);
    const info = await payment.lookupPayer(payerType, payerId.trim());
    setPayerInfo(info);
    if (!info) toast({ title: 'Not Found', description: 'Payer not found. Please check the ID.', variant: 'destructive' });
    setIsValidating(false);
  }, [payerType, payerId, payment, isValidating]);

  // --- Detail line management (client state) ---
  const handleAddDetail = useCallback((detail: DetailLineData) => {
    if (editIndex !== null) {
      setDetailLines(prev => prev.map((d, i) => i === editIndex ? detail : d));
      setEditIndex(null);
    } else {
      const newIdx = detailLines.length;
      setDetailLines(prev => [...prev, detail]);
      // Check if MOP popup needed
      if (detail.mop_code === 'CHQ' || detail.mop_code === 'CHK') {
        setPendingMopLineIndex(newIdx);
        setTimeout(() => setShowChequeModal(true), 100);
      } else if (detail.mop_code === 'CRD') {
        setPendingMopLineIndex(newIdx);
        setTimeout(() => setShowCardModal(true), 100);
      }
    }
  }, [editIndex, detailLines.length]);

  const handleEditRow = useCallback((index: number) => {
    setEditIndex(index);
    setShowAddDetail(true);
  }, []);

  const handleDeleteRow = useCallback((index: number) => {
    setDetailLines(prev => prev.filter((_, i) => i !== index));
  }, []);

  // MOP detail edit from grid action button
  const handleEditMopDetail = useCallback((index: number) => {
    const row = detailLines[index];
    if (!row) return;
    setPendingMopLineIndex(index);
    if (row.mop_code === 'CHQ' || row.mop_code === 'CHK') {
      setShowChequeModal(true);
    } else if (row.mop_code === 'CRD') {
      setShowCardModal(true);
    }
  }, [detailLines]);

  const handleChequeDetailsSave = useCallback((details: ChequeDetails) => {
    if (pendingMopLineIndex !== null) {
      setDetailLines(prev => prev.map((d, i) => i === pendingMopLineIndex ? { ...d, ...details } : d));
    }
    setPendingMopLineIndex(null);
    setShowChequeModal(false);
  }, [pendingMopLineIndex]);

  const handleCardDetailsSave = useCallback((details: CardDetails) => {
    if (pendingMopLineIndex !== null) {
      setDetailLines(prev => prev.map((d, i) => i === pendingMopLineIndex ? { ...d, ...details } : d));
    }
    setPendingMopLineIndex(null);
    setShowCardModal(false);
  }, [pendingMopLineIndex]);

  // --- Generate Receipt: save everything at once ---
  const handleGenerateReceipt = useCallback(async () => {
    if (!batch.currentBatch) {
      toast({ title: 'No Batch', description: 'No active batch selected.', variant: 'destructive' });
      return;
    }
    if (!payerInfo) {
      toast({ title: 'Missing Payer', description: 'Please enter and validate a Payer ID.', variant: 'destructive' });
      return;
    }
    if (detailLines.length === 0) {
      toast({ title: 'No Detail Lines', description: 'Add at least one payment detail line.', variant: 'destructive' });
      return;
    }
    const uCode = userCode || 'SYS';

    setFlowState('saving');
    try {
      // 1) Create header and next payment_id atomically in one backend call
      const dateRcvd = dateReceived ? formatDateForStorage(dateReceived) : formatDateForStorage(new Date());
      const { data: paymentId, error: hdrErr } = await supabase.rpc('create_payment_header_with_next_id', {
        p_batch_number: batch.currentBatch.batch_number,
        p_payer_type: payerType,
        p_payer_id: payerId.trim(),
        p_date_received: dateRcvd,
        p_remarks: remarks || null,
      });
      if (hdrErr) throw hdrErr;
      if (!paymentId) throw new Error('Failed to generate payment header ID.');

      // 3) Insert detail lines
      const detailInserts = detailLines.map((d, i) => ({
        payment_id: paymentId,
        payment_sequence_no: i + 1,
        payment_code: d.payment_code,
        fund_code: d.fund_code,
        payment_amount: d.payment_amount,
        mop_code: d.mop_code,
        period: d.period,
        payment_date: d.payment_date,
        bank_code: d.bank_code,
        mop_number: d.mop_number,
        cheque_date: d.cheque_date,
        mop_account_number: d.mop_account_number,
        mop_notes1: d.mop_notes1,
        credit_card_code: d.credit_card_code,
        expiration_date: d.expiration_date,
      }));
      const { error: dtlErr } = await supabase.from('cn_payment').insert(detailInserts as any);
      if (dtlErr) throw dtlErr;

      // 4) Create receipt with status 'O' (Original)
      const now = new Date();
      const receiptId = `RCP-${format(now, 'yyyyMMdd-HHmmss')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const { error: rcpErr } = await supabase.from('cn_receipt').insert({
        receipt_id: receiptId,
        payment_id: paymentId,
        status: 'O',
        receipt_total: totalAmount,
        total_number_of_payments: detailLines.length,
        reprint_times: 0,
        created_by: uCode,
        updated_by: uCode,
      } as any);
      if (rcpErr) throw rcpErr;

      // 5) Log original print
      await supabase.from('cn_receipt_prints').insert({
        receipt_id: receiptId,
        printed_by: uCode,
        print_type: 'ORIGINAL',
      } as any);

      // 6) Load receipt into state
      await receipt.loadReceipt(paymentId);
      setSavedPaymentId(paymentId);
      setFlowState('saved');

      toast({ title: 'Receipt Generated', description: `Receipt ${receiptId} created successfully.` });

      // 7) Trigger browser print
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      toast({ title: 'Error Generating Receipt', description: err.message, variant: 'destructive' });
      setFlowState('entry');
    }
  }, [batch.currentBatch, payerInfo, payerType, payerId, dateReceived, remarks, detailLines, totalAmount, userCode, receipt, payment]);

  // --- Reprint ---
  const handleReprint = useCallback(async () => {
    if (!savedPaymentId || !receipt.currentReceipt) return;
    const uCode = userCode || 'SYS';
    try {
      const { error: updErr } = await supabase.from('cn_receipt').update({
        reprint_times: (receipt.currentReceipt.reprint_times || 0) + 1,
        updated_by: uCode,
        updated_at: new Date().toISOString(),
      } as any).eq('receipt_id', receipt.currentReceipt.receipt_id);
      if (updErr) throw updErr;

      await supabase.from('cn_receipt_prints').insert({
        receipt_id: receipt.currentReceipt.receipt_id,
        printed_by: uCode,
        print_type: 'REPRINT',
      } as any);

      await receipt.loadReceipt(savedPaymentId);
      toast({ title: 'Receipt Reprinted', description: `Reprint #${(receipt.currentReceipt.reprint_times || 0) + 1}` });
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [savedPaymentId, receipt, userCode]);

  // --- Cancel Receipt ---
  const handleCancelReceipt = useCallback(async (reason: string) => {
    if (!savedPaymentId || !receipt.currentReceipt) return;
    if (receipt.currentReceipt.status !== 'O') {
      toast({ title: 'Cannot Cancel', description: 'Only receipts with status Original (O) can be cancelled.', variant: 'destructive' });
      setShowCancelModal(false);
      return;
    }
    const uCode = userCode || 'SYS';
    try {
      const { error } = await supabase.from('cn_receipt').update({
        status: 'C',
        cancel_reason: reason,
        cancel_date: new Date().toISOString(),
        cancel_user: uCode,
        updated_by: uCode,
        updated_at: new Date().toISOString(),
      } as any).eq('receipt_id', receipt.currentReceipt.receipt_id);
      if (error) throw error;

      await receipt.loadReceipt(savedPaymentId);
      toast({ title: 'Receipt Cancelled', description: 'Receipt has been cancelled.' });
      setShowCancelModal(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [savedPaymentId, receipt, userCode]);

  // --- New Payment (reset) ---
  const resetForm = useCallback(() => {
    setPayerType('ER');
    setPayerId('');
    setPayerInfo(null);
    setDateReceived(new Date());
    setRemarks('');
    setDetailLines([]);
    setFlowState('entry');
    setSavedPaymentId(null);
    receipt.setCurrentReceipt(null);
  }, [receipt]);

  const isEntry = flowState === 'entry';
  const isSaving = flowState === 'saving';
  const isSaved = flowState === 'saved';
  const canCancel = isSaved && receipt.currentReceipt?.status === 'O';
  const canReprint = isSaved && !!receipt.currentReceipt;

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
          <p className="text-sm text-muted-foreground">Enter new payments within an open batch.</p>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border">
          <Button onClick={handleGenerateReceipt} disabled={!isEntry || isSaving || detailLines.length === 0 || !payerInfo} size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Receipt className="h-4 w-4 mr-1" />}
            Generate Receipt
          </Button>

          <div className="w-px bg-border mx-1" />

          <Button onClick={handleReprint} variant="outline" size="sm" disabled={!canReprint}>
            <RotateCcw className="h-4 w-4 mr-1" /> Re-Print
          </Button>

          <Button onClick={() => setShowCancelModal(true)} variant="destructive" size="sm" disabled={!canCancel}>
            <XCircle className="h-4 w-4 mr-1" /> Cancel Receipt
          </Button>

          <div className="w-px bg-border mx-1" />

          <Button onClick={resetForm} variant="outline" size="sm" disabled={isEntry && detailLines.length === 0 && !payerInfo}>
            <PlusCircle className="h-4 w-4 mr-1" /> New Payment
          </Button>
        </div>

        <PaymentHeaderForm
          payerType={payerType} setPayerType={setPayerType}
          payerId={payerId} setPayerId={setPayerId}
          payerInfo={payerInfo}
          dateReceived={dateReceived} setDateReceived={setDateReceived}
          remarks={remarks} setRemarks={setRemarks}
          onPayerBlur={handlePayerBlur}
          isValidating={isValidating}
          disabled={!isEntry}
        />

        <PaymentDetailGrid
          rows={detailLines}
          onAddRow={() => { setEditIndex(null); setShowAddDetail(true); }}
          onDeleteRow={handleDeleteRow}
          onEditRow={handleEditRow}
          onEditMopDetail={handleEditMopDetail}
          disabled={!isEntry}
          totalAmount={totalAmount}
        />

        {/* Modals */}
        <AddDetailModal
          open={showAddDetail}
          onClose={() => { setShowAddDetail(false); setEditIndex(null); }}
          onAdd={handleAddDetail}
          editData={editIndex !== null ? detailLines[editIndex] : null}
        />
        <ChequeDetailModal
          open={showChequeModal}
          onClose={() => { setShowChequeModal(false); setPendingMopLineIndex(null); }}
          onSave={handleChequeDetailsSave}
          initialData={pendingMopLineIndex !== null ? detailLines[pendingMopLineIndex] : undefined}
        />
        <CardDetailModal
          open={showCardModal}
          onClose={() => { setShowCardModal(false); setPendingMopLineIndex(null); }}
          onSave={handleCardDetailsSave}
          initialData={pendingMopLineIndex !== null ? detailLines[pendingMopLineIndex] : undefined}
        />
        <ReceiptCancelModal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelReceipt}
          isLoading={receipt.isLoading}
          receiptId={receipt.currentReceipt?.receipt_id}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default PaymentDataEntry;
