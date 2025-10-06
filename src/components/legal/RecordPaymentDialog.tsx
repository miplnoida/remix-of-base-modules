import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onPaymentRecorded: () => void;
}

export function RecordPaymentDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  onPaymentRecorded 
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [method, setMethod] = useState('Check');
  const [reference, setReference] = useState('');
  const [appliedPeriod, setAppliedPeriod] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = async () => {
    if (!amount || !date) {
      toast.error('Please fill in amount and date');
      return;
    }

    setIsRecording(true);
    try {
      // In real implementation, call financeAdapter.postPayment
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Payment recorded successfully');
      onPaymentRecorded();
      handleClose();
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setIsRecording(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDate('');
    setMethod('Check');
    setReference('');
    setAppliedPeriod('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Payment Amount (XCD) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Debit Card">Debit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reference / Receipt No.</Label>
            <Input
              placeholder="Payment reference number"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Applied to Period</Label>
            <Select value={appliedPeriod} onValueChange={setAppliedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-01">January 2024</SelectItem>
                <SelectItem value="2024-02">February 2024</SelectItem>
                <SelectItem value="2024-03">March 2024</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link payment to a specific arrears period
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleRecord} disabled={isRecording}>
            {isRecording ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
