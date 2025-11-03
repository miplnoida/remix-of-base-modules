import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ArrearsPeriod {
  id: string;
  employer: string;
  periodFrom: string;
  periodTo: string;
  dateOfPayment?: string;
  ssc: number;
  ssf: number;
  costsFees: number;
  lvc: number;
  lvp: number;
  pec: number;
}

interface AddArrearsPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  period?: ArrearsPeriod | null;
}

export function AddArrearsPeriodDialog({ open, onOpenChange, caseId, period }: AddArrearsPeriodDialogProps) {
  const [formData, setFormData] = useState({
    employer: "",
    periodFrom: "",
    periodTo: "",
    dateOfPayment: "",
    ssc: "0.00",
    ssf: "0.00",
    costsFees: "0.00",
    lvc: "0.00",
    lvp: "0.00",
    pec: "0.00",
  });

  useEffect(() => {
    if (period) {
      setFormData({
        employer: period.employer,
        periodFrom: period.periodFrom,
        periodTo: period.periodTo,
        dateOfPayment: period.dateOfPayment || "",
        ssc: period.ssc.toFixed(2),
        ssf: period.ssf.toFixed(2),
        costsFees: period.costsFees.toFixed(2),
        lvc: period.lvc.toFixed(2),
        lvp: period.lvp.toFixed(2),
        pec: period.pec.toFixed(2),
      });
    } else {
      resetForm();
    }
  }, [period, open]);

  const resetForm = () => {
    setFormData({
      employer: "",
      periodFrom: "",
      periodTo: "",
      dateOfPayment: "",
      ssc: "0.00",
      ssf: "0.00",
      costsFees: "0.00",
      lvc: "0.00",
      lvp: "0.00",
      pec: "0.00",
    });
  };

  const handleSubmit = () => {
    // Validate dates
    if (formData.periodFrom && formData.periodTo && new Date(formData.periodFrom) > new Date(formData.periodTo)) {
      toast.error("Period 'From' date must be before 'To' date");
      return;
    }

    if (formData.dateOfPayment && new Date(formData.dateOfPayment) > new Date()) {
      toast.error("Date of Payment cannot be in the future");
      return;
    }

    // TODO: Implement save via adapter
    toast.success(period ? "Period updated successfully" : "Period added successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{period ? "Edit" : "Add"} Arrears Period</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label htmlFor="employer">Employer</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
              placeholder="Employer name"
            />
          </div>

          <div>
            <Label htmlFor="periodFrom">Period From</Label>
            <Input
              id="periodFrom"
              type="date"
              value={formData.periodFrom}
              onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="periodTo">Period To</Label>
            <Input
              id="periodTo"
              type="date"
              value={formData.periodTo}
              onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="dateOfPayment">Date of Payment (Optional)</Label>
            <Input
              id="dateOfPayment"
              type="date"
              value={formData.dateOfPayment}
              onChange={(e) => setFormData({ ...formData, dateOfPayment: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="ssc">S.S.C (Social Security Contribution)</Label>
            <Input
              id="ssc"
              type="number"
              step="0.01"
              min="0"
              value={formData.ssc}
              onChange={(e) => setFormData({ ...formData, ssc: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="ssf">S.S.F (Social Security Fund)</Label>
            <Input
              id="ssf"
              type="number"
              step="0.01"
              min="0"
              value={formData.ssf}
              onChange={(e) => setFormData({ ...formData, ssf: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="costsFees">Costs/Fees</Label>
            <Input
              id="costsFees"
              type="number"
              step="0.01"
              min="0"
              value={formData.costsFees}
              onChange={(e) => setFormData({ ...formData, costsFees: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="lvc">L.V.C (Local Voluntary Contribution)</Label>
            <Input
              id="lvc"
              type="number"
              step="0.01"
              min="0"
              value={formData.lvc}
              onChange={(e) => setFormData({ ...formData, lvc: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="lvp">L.V.P (Local Voluntary Pension)</Label>
            <Input
              id="lvp"
              type="number"
              step="0.01"
              min="0"
              value={formData.lvp}
              onChange={(e) => setFormData({ ...formData, lvp: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="pec">P.E.C (Penalty Enforcement Costs)</Label>
            <Input
              id="pec"
              type="number"
              step="0.01"
              min="0"
              value={formData.pec}
              onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {period ? "Update" : "Add"} Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
