import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AddWaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

const WAIVER_TYPES = [
  'Penalty Reduction',
  'Interest Waiver',
  'Penalty 5k',
  'Full Waiver',
  'Partial Waiver',
  'Administrative Fee Waiver'
];

export function AddWaiverDialog({ open, onOpenChange, caseId }: AddWaiverDialogProps) {
  const [waiverType, setWaiverType] = useState('');
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!waiverType || !amount || !authorizedBy || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    // TODO: Implement waiver creation via adapter
    toast.success('Waiver added successfully');
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setWaiverType('');
    setAmount('');
    setPercent('');
    setAuthorizedBy('');
    setDate(new Date().toISOString().split('T')[0]);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Waiver</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="waiver-type">Waiver Type *</Label>
            <Select value={waiverType} onValueChange={setWaiverType}>
              <SelectTrigger>
                <SelectValue placeholder="Select waiver type" />
              </SelectTrigger>
              <SelectContent>
                {WAIVER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="percent">Percent (optional)</Label>
              <Input
                id="percent"
                type="number"
                step="1"
                placeholder="%"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="authorized-by">Authorized By *</Label>
            <Input
              id="authorized-by"
              placeholder="Name of authorizing officer"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Explain the justification for this waiver..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Waiver</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
