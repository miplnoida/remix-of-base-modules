import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createCardIssue, createPrintLog, getNextIssueSequence } from '@/services/cardManagementService';
import { IssueReasonCode, PrintStatus } from '@/types/cardManagement';
import { toast } from 'sonner';

interface CardPrintingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceRequestId: string;
  insuredPersonId: string;
  issueReasonCode: IssueReasonCode;
  onPrintComplete: () => void;
}

export function CardPrintingDialog({
  open,
  onOpenChange,
  serviceRequestId,
  insuredPersonId,
  issueReasonCode,
  onPrintComplete
}: CardPrintingDialogProps) {
  const [notes, setNotes] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<'success' | 'spoiled' | null>(null);

  const issueSequence = getNextIssueSequence(insuredPersonId);

  const handlePrint = async () => {
    setIsPrinting(true);

    // Simulate printer delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create card issue
    const cardIssue = createCardIssue({
      insuredPersonId,
      serviceRequestId,
      issueReasonCode,
      createdBy: 'CURRENT_USER' // Replace with actual user
    });

    // Simulate print success/failure (90% success rate)
    const printSuccess = Math.random() > 0.1;
    const printStatus: PrintStatus = printSuccess ? 'Success' : 'Spoiled';

    // Create print log
    createPrintLog({
      cardIssueId: cardIssue.cardIssueId,
      printedBy: 'CURRENT_USER', // Replace with actual user
      printStatus,
      notes: notes || undefined
    });

    setIsPrinting(false);
    setPrintResult(printSuccess ? 'success' : 'spoiled');

    if (printSuccess) {
      toast.success(`Card #${issueSequence} printed successfully!`);
      setTimeout(() => {
        onPrintComplete();
        onOpenChange(false);
      }, 1500);
    } else {
      toast.error('Print failed - card spoiled. You can retry printing.');
    }
  };

  const handleRetryPrint = () => {
    setPrintResult(null);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Social Security Card
          </DialogTitle>
          <DialogDescription>
            Print card #{issueSequence} for this insured person
          </DialogDescription>
        </DialogHeader>

        {printResult === null && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Ensure printer is ready and card stock is loaded before printing.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Card Details</Label>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Sequence:</span>
                  <span className="font-semibold">#{issueSequence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="font-medium">{issueReasonCode.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="print-notes">Print Notes (Optional)</Label>
              <Textarea
                id="print-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this print job..."
                rows={3}
              />
            </div>
          </div>
        )}

        {printResult === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Success!</strong> Card printed successfully. The card is now active.
            </AlertDescription>
          </Alert>
        )}

        {printResult === 'spoiled' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Print Failed!</strong> The card was spoiled during printing. Please retry.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {printResult === null && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPrinting}>
                Cancel
              </Button>
              <Button onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? (
                  <>
                    <Printer className="h-4 w-4 mr-2 animate-spin" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Card
                  </>
                )}
              </Button>
            </>
          )}

          {printResult === 'success' && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}

          {printResult === 'spoiled' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleRetryPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Retry Print
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
