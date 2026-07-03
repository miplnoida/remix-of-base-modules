import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LegalReferenceSelect } from "@/components/legal/reference/LegalReferenceSelect";
import { LG_REF } from "@/hooks/legal/useLegalReferenceData";

interface AddCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function AddCostDialog({ open, onOpenChange, caseId }: AddCostDialogProps) {
  const [formData, setFormData] = useState({
    costDate: new Date().toISOString().split('T')[0],
    costType: "",
    amount: "",
    description: "",
  });

  const handleSubmit = () => {
    if (!formData.costType) {
      toast.error("Please select a cost type");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // TODO: Implement save via adapter
    toast.success("Cost added successfully");
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      costDate: new Date().toISOString().split('T')[0],
      costType: "",
      amount: "",
      description: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Cost/Fee</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="costDate">Cost Date</Label>
            <Input
              id="costDate"
              type="date"
              value={formData.costDate}
              onChange={(e) => setFormData({ ...formData, costDate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="costType">Cost Type</Label>
            <LegalReferenceSelect
              groupCode={LG_REF.FEE_HEAD}
              value={formData.costType}
              onChange={(value) => setFormData({ ...formData, costType: value })}
              placeholder="Select cost type"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details about this cost or fee"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Cost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
