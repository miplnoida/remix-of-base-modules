import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const FUND_TYPES = [
  { id: "ssc", label: "S.S.C (Social Security Contribution)" },
  { id: "ssf", label: "S.S.F (Social Security Fund)" },
  { id: "lvc", label: "L.V.C (Local Voluntary Contribution)" },
  { id: "lvp", label: "L.V.P (Local Voluntary Pension)" },
  { id: "pec", label: "P.E.C (Penalty Enforcement Costs)" },
];

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  periods: any[];
}

export function AddPaymentDialog({ open, onOpenChange, caseId, periods }: AddPaymentDialogProps) {
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    selectedFunds: [] as string[],
    amounts: {} as Record<string, string>,
    appliedPeriod: "",
    receiptReference: "",
    notes: "",
  });

  const handleFundToggle = (fundId: string) => {
    const newFunds = formData.selectedFunds.includes(fundId)
      ? formData.selectedFunds.filter(f => f !== fundId)
      : [...formData.selectedFunds, fundId];
    
    setFormData({ ...formData, selectedFunds: newFunds });
  };

  const handleSubmit = () => {
    if (formData.selectedFunds.length === 0) {
      toast.error("Please select at least one fund");
      return;
    }

    if (!formData.appliedPeriod) {
      toast.error("Please select an applied period");
      return;
    }

    const totalAmount = formData.selectedFunds.reduce((sum, fundId) => {
      return sum + (parseFloat(formData.amounts[fundId]) || 0);
    }, 0);

    if (totalAmount <= 0) {
      toast.error("Total payment amount must be greater than zero");
      return;
    }

    // TODO: Implement save via adapter
    toast.success("Payment recorded successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            />
          </div>

          <div>
            <Label>Fund(s)</Label>
            <div className="space-y-3 mt-2 border rounded-lg p-4">
              {FUND_TYPES.map((fund) => (
                <div key={fund.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={fund.id}
                      checked={formData.selectedFunds.includes(fund.id)}
                      onCheckedChange={() => handleFundToggle(fund.id)}
                    />
                    <Label htmlFor={fund.id} className="cursor-pointer font-normal">
                      {fund.label}
                    </Label>
                  </div>
                  {formData.selectedFunds.includes(fund.id) && (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={formData.amounts[fund.id] || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        amounts: { ...formData.amounts, [fund.id]: e.target.value }
                      })}
                      className="ml-6"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="appliedPeriod">Applied Period</Label>
            <Select value={formData.appliedPeriod} onValueChange={(value) => setFormData({ ...formData, appliedPeriod: value })}>
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
            <Label htmlFor="receiptReference">Receipt/Reference</Label>
            <Input
              id="receiptReference"
              value={formData.receiptReference}
              onChange={(e) => setFormData({ ...formData, receiptReference: e.target.value })}
              placeholder="e.g., REC-2025-001"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this payment"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
