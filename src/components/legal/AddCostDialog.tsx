import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LegalReferenceSelect } from "@/components/legal/reference/LegalReferenceSelect";
import { LG_REF } from "@/hooks/legal/useLegalReferenceData";
import { toast } from "sonner";

interface AddCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onCostAdded: () => void;
}

export function AddCostDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  onCostAdded 
}: AddCostDialogProps) {
  const [stage, setStage] = useState('Filing');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!amount || !date) {
      toast.error('Please fill in amount and date');
      return;
    }

    setIsAdding(true);
    try {
      // In real implementation, add cost record to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Cost record added successfully');
      onCostAdded();
      handleClose();
    } catch (error) {
      toast.error('Failed to add cost');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setStage('Filing');
    setAmount('');
    setDate('');
    setNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Court Cost</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cost Stage / Fee Head *</Label>
            <LegalReferenceSelect
              groupCode={LG_REF.FEE_HEAD}
              value={stage}
              onChange={setStage}
              placeholder="Select fee head"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Amount (XCD) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              placeholder="Additional details about this cost"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Cost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
