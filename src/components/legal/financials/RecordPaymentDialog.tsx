import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ArrearsPeriod {
  id: string;
  employer: string;
  periodFrom: string;
  periodTo: string;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  periods: ArrearsPeriod[];
}

const FUND_TYPES = ['SSC', 'SSF', 'LVC', 'LVP', 'PEC', 'PEP'];

export function RecordPaymentDialog({ open, onOpenChange, caseId, periods }: RecordPaymentDialogProps) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [fund, setFund] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [appliedPeriod, setAppliedPeriod] = useState('');
  const [receiptReference, setReceiptReference] = useState('');

  const handleSubmit = () => {
    if (!fund || !amountPaid || !appliedPeriod) {
      toast.error('Please fill in all required fields');
      return;
    }

    // TODO: Implement payment recording via adapter
    toast.success('Payment recorded successfully');
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setFund('');
    setAmountPaid('');
    setAppliedPeriod('');
    setReceiptReference('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="payment-date">Payment Date</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="fund">Fund *</Label>
            <Select value={fund} onValueChange={setFund}>
              <SelectTrigger>
                <SelectValue placeholder="Select fund type" />
              </SelectTrigger>
              <SelectContent>
                {FUND_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount Paid *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="applied-period">Applied Period *</Label>
            <Select value={appliedPeriod} onValueChange={setAppliedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {new Date(period.periodFrom).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} - {new Date(period.periodTo).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="receipt">Receipt/Reference</Label>
            <Input
              id="receipt"
              placeholder="REC-2024-001"
              value={receiptReference}
              onChange={(e) => setReceiptReference(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
