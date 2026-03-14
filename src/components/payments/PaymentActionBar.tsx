import React from 'react';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  FileText,
  Printer,
  RotateCcw,
  XCircle,
  Search,
  Loader2,
} from 'lucide-react';

interface PaymentActionBarProps {
  onNewBatch: () => void;
  onNewPayment: () => void;
  onPrintReceipt: () => void;
  onReprintReceipt: () => void;
  onCancelReceipt: () => void;
  onPayerSearch: () => void;
  hasBatch: boolean;
  hasPayment: boolean;
  receiptStatus: string | null; // null=none, P=printed, R=reprinted, C=cancelled
  isBatchOpen: boolean;
  isProcessing?: boolean;
}

export function PaymentActionBar({
  onNewBatch,
  onNewPayment,
  onPrintReceipt,
  onReprintReceipt,
  onCancelReceipt,
  onPayerSearch,
  hasBatch,
  hasPayment,
  receiptStatus,
  isBatchOpen,
  isProcessing,
}: PaymentActionBarProps) {
  const canPrint = hasPayment && !receiptStatus && isBatchOpen;
  const canReprint = hasPayment && (receiptStatus === 'P' || receiptStatus === 'R');
  const canCancel = hasPayment && receiptStatus && receiptStatus !== 'C';

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border">
      <Button onClick={onNewBatch} variant="outline" size="sm" disabled={isProcessing}>
        <PlusCircle className="h-4 w-4 mr-1" /> New Batch
      </Button>

      <Button
        onClick={onNewPayment}
        size="sm"
        disabled={!hasBatch || !isBatchOpen || isProcessing}
      >
        <FileText className="h-4 w-4 mr-1" /> New Payment
      </Button>

      <div className="w-px bg-border mx-1" />

      <Button
        onClick={onPrintReceipt}
        variant={canPrint ? 'default' : 'outline'}
        size="sm"
        disabled={!canPrint || isProcessing}
      >
        {isProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
        Print Receipt
      </Button>

      <Button
        onClick={onReprintReceipt}
        variant="outline"
        size="sm"
        disabled={!canReprint || isProcessing}
      >
        <RotateCcw className="h-4 w-4 mr-1" /> Reprint
      </Button>

      <Button
        onClick={onCancelReceipt}
        variant="destructive"
        size="sm"
        disabled={!canCancel || isProcessing}
      >
        <XCircle className="h-4 w-4 mr-1" /> Cancel Receipt
      </Button>

      <div className="w-px bg-border mx-1" />

      <Button onClick={onPayerSearch} variant="outline" size="sm" disabled={isProcessing}>
        <Search className="h-4 w-4 mr-1" /> Payer Search
      </Button>
    </div>
  );
}
