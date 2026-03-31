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
import { EmailDeliveryPrompt } from '@/components/payments/EmailDeliveryPrompt';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { supabase } from '@/integrations/supabase/client';
import { useMopDetailConfig } from '@/hooks/usePaymentModuleConfig';
import { useEmailDeliveryConfig, sendDocumentEmail } from '@/hooks/useEmailDeliveryConfig';
import { toast } from '@/hooks/use-toast';
import { formatDateForStorage } from '@/lib/dateFormat';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { logApplicationError } from '@/lib/globalErrorHandler';
import { printConfiguredReceipt } from '@/lib/receiptPrinter';
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
  const { showChequeDetails, showCardDetails, isLoading: mopConfigLoading } = useMopDetailConfig();
  const { receiptEmailMode } = useEmailDeliveryConfig();

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
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [pendingEmailDoc, setPendingEmailDoc] = useState<{ id: number; number: string; email: string } | null>(null);

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
      if ((detail.mop_code === 'CHQ' || detail.mop_code === 'CHK') && showChequeDetails) {
        setPendingMopLineIndex(newIdx);
        setTimeout(() => setShowChequeModal(true), 100);
      } else if ((detail.mop_code === 'CRD' || detail.mop_code === 'DRD') && showCardDetails) {
        setPendingMopLineIndex(newIdx);
        setTimeout(() => setShowCardModal(true), 100);
      }
    }
  }, [editIndex, detailLines.length, showChequeDetails, showCardDetails]);

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
    if ((row.mop_code === 'CHQ' || row.mop_code === 'CHK') && showChequeDetails) {
      setShowChequeModal(true);
    } else if ((row.mop_code === 'CRD' || row.mop_code === 'DRD') && showCardDetails) {
      setShowCardModal(true);
    }
  }, [detailLines, showChequeDetails, showCardDetails]);

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
    const logContext = {
      module: 'PaymentDataEntry',
      action: 'handleGenerateReceipt',
      entity_type: 'cn_receipt',
    };

    // Validate all required inputs before processing
    if (!batch.currentBatch) {
      const msg = 'No active batch selected.';
      toast({ title: 'No Batch', description: msg, variant: 'destructive' });
      await logApplicationError(new Error(msg), { ...logContext, request_payload: { payerType, payerId } });
      return;
    }
    if (!payerInfo) {
      const msg = 'Please enter and validate a Payer ID.';
      toast({ title: 'Missing Payer', description: msg, variant: 'destructive' });
      await logApplicationError(new Error(msg), { ...logContext, request_payload: { payerType, payerId, batch_number: batch.currentBatch.batch_number } });
      return;
    }
    if (detailLines.length === 0) {
      const msg = 'Add at least one payment detail line.';
      toast({ title: 'No Detail Lines', description: msg, variant: 'destructive' });
      await logApplicationError(new Error(msg), { ...logContext, request_payload: { payerType, payerId, batch_number: batch.currentBatch.batch_number } });
      return;
    }
    if (totalAmount <= 0) {
      const msg = 'Total payment amount must be greater than zero.';
      toast({ title: 'Invalid Amount', description: msg, variant: 'destructive' });
      await logApplicationError(new Error(msg), { ...logContext, request_payload: { totalAmount, detailLines: detailLines.length } });
      return;
    }
    const uCode = userCode || 'SYS';

    setFlowState('saving');

    try {
      // Build detail lines array for the atomic RPC (expiry normalization happens server-side)
      const detailLinesJson = detailLines.map((d) => ({
        payment_code: d.payment_code,
        fund_code: d.fund_code,
        payment_amount: d.payment_amount,
        mop_code: d.mop_code,
        period: d.period || null,
        payment_date: d.payment_date || null,
        bank_code: d.bank_code || null,
        mop_number: d.mop_number || null,
        cheque_date: d.cheque_date || null,
        mop_account_number: d.mop_account_number || null,
        mop_notes1: d.mop_notes1 || null,
        credit_card_code: d.credit_card_code || null,
        expiration_date: d.expiration_date || null,
      }));

      const dateRcvd = dateReceived ? formatDateForStorage(dateReceived) : formatDateForStorage(new Date());

      // Single atomic RPC — header + details + receipt + print log in one DB transaction.
      // If ANY step fails, PostgreSQL rolls back everything automatically.
      const { data: result, error: rpcErr } = await supabase.rpc('create_payment_with_receipt', {
        p_batch_number: batch.currentBatch.batch_number,
        p_payer_type: payerType,
        p_payer_id: payerId.trim(),
        p_date_received: dateRcvd,
        p_remarks: remarks || null,
        p_detail_lines: detailLinesJson,
        p_receipt_total: totalAmount,
        p_total_payments: detailLines.length,
        p_user_code: uCode,
      });

      if (rpcErr) {
        await logApplicationError(rpcErr, {
          ...logContext,
          action: 'create_payment_with_receipt_rpc',
          request_payload: {
            batch_number: batch.currentBatch.batch_number,
            payer_type: payerType,
            payer_id: payerId.trim(),
            total_amount: totalAmount,
            detail_lines: detailLines.length,
          },
        });
        throw rpcErr;
      }

      // Parse the result — returns { payment_id, receipt_id, status }
      const res = typeof result === 'string' ? JSON.parse(result) : result;
      if (!res || !res.payment_id) {
        const nullErr = new Error('Atomic RPC returned null or missing payment_id.');
        await logApplicationError(nullErr, { ...logContext, action: 'create_payment_with_receipt_rpc', request_payload: { result: res } });
        throw nullErr;
      }

      const generatedPaymentId = res.payment_id as number;
      const generatedReceiptId = String(res.receipt_id);

      // Load receipt into state
      await receipt.loadReceipt(generatedPaymentId);
      setSavedPaymentId(generatedPaymentId);
      setFlowState('saved');

      toast({ title: 'Receipt Generated', description: `Receipt #${generatedReceiptId} created successfully.` });

      // Email delivery logic — defer print until after email prompt resolves for 'ask' mode
      let payerEmailAddr = '';
      if (receiptEmailMode !== 'never') {
        try {
          const { data: payerData } = await supabase
            .from('cn_payer')
            .select('email')
            .eq('payer_id', payerId.trim())
            .maybeSingle();
          payerEmailAddr = payerData?.email || '';
        } catch (emailErr) {
          console.error('[PaymentDataEntry] Email lookup error:', emailErr);
        }
      }

      if (receiptEmailMode === 'ask') {
        // Defer print — show email prompt first, print fires after user responds
        setPendingEmailDoc({ id: generatedPaymentId, number: generatedReceiptId, email: payerEmailAddr });
        setPendingPrintPaymentId(generatedPaymentId);
        setShowEmailPrompt(true);
      } else {
        // For 'always' mode, send email then print
        if (receiptEmailMode === 'always' && payerEmailAddr) {
          sendDocumentEmail({
            documentType: 'receipt',
            documentId: generatedPaymentId,
            documentNumber: generatedReceiptId,
            recipientEmail: payerEmailAddr,
            userCode: uCode,
          });
        }
        // Print immediately for 'always' and 'never' modes
        setTimeout(() => printConfiguredReceipt(generatedPaymentId).catch(e => console.error('Receipt print error:', e)), 300);
      }
    } catch (err: any) {
      // Always log to system_error_logs
      await logApplicationError(err, {
        ...logContext,
        action: 'handleGenerateReceipt_catch',
        request_payload: {
          batch_number: batch.currentBatch?.batch_number,
          payer_type: payerType,
          payer_id: payerId,
          total_amount: totalAmount,
          detail_lines: detailLines.length,
        },
      });
      toast({ title: 'Error Generating Receipt', description: err.message || 'An unexpected error occurred.', variant: 'destructive' });
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
      setTimeout(() => printConfiguredReceipt(savedPaymentId).catch(e => console.error('Receipt print error:', e)), 300);
    } catch (err: any) {
      await logApplicationError(err, { module: 'PaymentDataEntry', action: 'handleReprint', entity_type: 'cn_receipt', entity_id: String(receipt.currentReceipt?.receipt_id), request_payload: { payment_id: savedPaymentId } });
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
      await logApplicationError(err, { module: 'PaymentDataEntry', action: 'handleCancelReceipt', entity_type: 'cn_receipt', entity_id: String(receipt.currentReceipt?.receipt_id), request_payload: { payment_id: savedPaymentId, reason } });
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
      hasOpenBatchesButNotForToday={batchSel.hasOpenBatchesButNotForToday}
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
          <Button onClick={handleGenerateReceipt} disabled={!isEntry || isSaving || detailLines.length === 0 || !payerInfo || mopConfigLoading} size="sm">
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
          showChequeDetails={showChequeDetails}
          showCardDetails={showCardDetails}
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
        <EmailDeliveryPrompt
          open={showEmailPrompt}
          onClose={() => { setShowEmailPrompt(false); setPendingEmailDoc(null); }}
          onConfirm={() => {
            if (pendingEmailDoc) {
              sendDocumentEmail({
                documentType: 'receipt',
                documentId: pendingEmailDoc.id,
                documentNumber: pendingEmailDoc.number,
                recipientEmail: pendingEmailDoc.email,
                userCode: userCode || 'SYS',
              });
            }
            setShowEmailPrompt(false);
            setPendingEmailDoc(null);
          }}
          recipientEmail={pendingEmailDoc?.email || ''}
          documentType="receipt"
          documentNumber={pendingEmailDoc?.number}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default PaymentDataEntry;
