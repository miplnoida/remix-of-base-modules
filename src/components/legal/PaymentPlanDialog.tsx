import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePaymentPlan, PaymentPlan } from "@/hooks/useLegalPaymentPlans";
import { Calendar } from "lucide-react";

interface PaymentPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  totalAmount: number;
}

export function PaymentPlanDialog({ open, onOpenChange, caseId, totalAmount }: PaymentPlanDialogProps) {
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [installmentCount, setInstallmentCount] = useState(12);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [terms, setTerms] = useState('');

  const createPaymentPlan = useCreatePaymentPlan();

  const generateInstallments = () => {
    const installments = [];
    const installmentAmount = totalAmount / installmentCount;
    let currentDate = new Date(startDate);

    for (let i = 0; i < installmentCount; i++) {
      installments.push({
        amount: Number(installmentAmount.toFixed(2)),
        dueDate: currentDate.toISOString(),
        paid: false,
      });

      // Increment date based on frequency
      if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 3);
      }
    }

    return installments;
  };

  const handleCreate = () => {
    const plan: PaymentPlan = {
      installments: generateInstallments(),
      totalAmount,
      frequency,
      startDate,
      notes: terms,
    };

    createPaymentPlan.mutate(
      { caseId, plan, terms },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const installmentAmount = totalAmount / installmentCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Total Amount</Label>
            <Input value={`$${totalAmount.toFixed(2)}`} disabled />
          </div>

          <div>
            <Label>Payment Frequency</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Number of Installments</Label>
            <Input
              type="number"
              min="2"
              max="60"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">
              <strong>Installment Amount:</strong> ${installmentAmount.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {installmentCount} payments of ${installmentAmount.toFixed(2)} each
            </p>
          </div>

          <div>
            <Label>Terms & Conditions</Label>
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Enter payment plan terms and conditions..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createPaymentPlan.isPending}>
            Create Payment Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
