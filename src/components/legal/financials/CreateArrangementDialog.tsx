import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateArrangementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  totalAmount: number;
}

export function CreateArrangementDialog({ open, onOpenChange, caseId, totalAmount }: CreateArrangementDialogProps) {
  const [terms, setTerms] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    if (!terms || !durationMonths || !startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    // TODO: Implement arrangement plan creation
    toast.success('Payment plan created successfully');
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTerms('');
    setDurationMonths('');
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  const installmentAmount = durationMonths ? (totalAmount / parseInt(durationMonths)).toFixed(2) : '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="terms">Terms *</Label>
            <Textarea
              id="terms"
              placeholder="Describe the payment arrangement terms..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (Months) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="12"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {durationMonths && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Monthly Installment Amount</p>
              <p className="text-2xl font-bold">${installmentAmount}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Payment Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
