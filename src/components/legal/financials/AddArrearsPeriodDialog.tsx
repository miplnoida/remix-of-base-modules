import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ArrearsPeriod {
  id: string;
  rowType: 'Amount Due on JDS' | 'Payment' | 'Bal Due';
  employer: string;
  periodFrom: string;
  periodTo: string;
  dateOfPayment?: string;
  ssc: number;
  ssf: number;
  ssCosts: number;
  totalSS: number;
  lvc: number;
  lvp: number;
  lvCosts: number;
  totalLV: number;
  pec: number;
  pep: number;
  peCosts: number;
  totalPE: number;
  totalPaid?: number;
  periodCovers?: string;
}

interface AddArrearsPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  period?: ArrearsPeriod | null;
}

export function AddArrearsPeriodDialog({ open, onOpenChange, caseId, period }: AddArrearsPeriodDialogProps) {
  const [rowType, setRowType] = useState<'Amount Due on JDS' | 'Payment' | 'Bal Due'>('Amount Due on JDS');
  const [employer, setEmployer] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [dateOfPayment, setDateOfPayment] = useState('');
  const [ssc, setSsc] = useState('0');
  const [ssf, setSsf] = useState('0');
  const [ssCosts, setSsCosts] = useState('0');
  const [lvc, setLvc] = useState('0');
  const [lvp, setLvp] = useState('0');
  const [lvCosts, setLvCosts] = useState('0');
  const [pec, setPec] = useState('0');
  const [pep, setPep] = useState('0');
  const [peCosts, setPeCosts] = useState('0');
  const [periodCovers, setPeriodCovers] = useState('');

  useEffect(() => {
    if (period) {
      setRowType(period.rowType);
      setEmployer(period.employer);
      setPeriodFrom(period.periodFrom);
      setPeriodTo(period.periodTo);
      setDateOfPayment(period.dateOfPayment || '');
      setSsc(period.ssc.toString());
      setSsf(period.ssf.toString());
      setSsCosts(period.ssCosts.toString());
      setLvc(period.lvc.toString());
      setLvp(period.lvp.toString());
      setLvCosts(period.lvCosts.toString());
      setPec(period.pec.toString());
      setPep(period.pep.toString());
      setPeCosts(period.peCosts.toString());
      setPeriodCovers(period.periodCovers || '');
    }
  }, [period]);

  const totalSS = parseFloat(ssc || '0') + parseFloat(ssf || '0') + parseFloat(ssCosts || '0');
  const totalLV = parseFloat(lvc || '0') + parseFloat(lvp || '0') + parseFloat(lvCosts || '0');
  const totalPE = parseFloat(pec || '0') + parseFloat(pep || '0') + parseFloat(peCosts || '0');
  const totalPaid = rowType === 'Payment' ? totalSS + totalLV + totalPE : undefined;

  const handleSubmit = () => {
    if (!employer || !periodFrom || !periodTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (rowType === 'Payment' && !dateOfPayment) {
      toast.error('Date of Payment is required for payment rows');
      return;
    }

    // TODO: Implement period creation/update via adapter
    toast.success(period ? 'Period updated successfully' : 'Period added successfully');
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setRowType('Amount Due on JDS');
    setEmployer('');
    setPeriodFrom('');
    setPeriodTo('');
    setDateOfPayment('');
    setSsc('0');
    setSsf('0');
    setSsCosts('0');
    setLvc('0');
    setLvp('0');
    setLvCosts('0');
    setPec('0');
    setPep('0');
    setPeCosts('0');
    setPeriodCovers('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{period ? 'Edit' : 'Add'} Arrears Period</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Row Type & Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="row-type">Row Type *</Label>
              <Select value={rowType} onValueChange={(val: any) => setRowType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amount Due on JDS">Amount Due on JDS</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Bal Due">Bal Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employer">Employer *</Label>
              <Input
                id="employer"
                placeholder="ABC Construction Ltd."
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
              />
            </div>
          </div>

          {/* Period Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="period-from">Debt Period From *</Label>
              <Input
                id="period-from"
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="period-to">Debt Period To *</Label>
              <Input
                id="period-to"
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
            {rowType === 'Payment' && (
              <div>
                <Label htmlFor="dop">D.O.P. (Date of Payment) *</Label>
                <Input
                  id="dop"
                  type="date"
                  value={dateOfPayment}
                  onChange={(e) => setDateOfPayment(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* SS Section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-semibold text-sm">Social Security (SS)</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="ssc">SSC</Label>
                <Input
                  id="ssc"
                  type="number"
                  step="0.01"
                  value={ssc}
                  onChange={(e) => setSsc(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ssf">SSF</Label>
                <Input
                  id="ssf"
                  type="number"
                  step="0.01"
                  value={ssf}
                  onChange={(e) => setSsf(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ss-costs">SS Costs</Label>
                <Input
                  id="ss-costs"
                  type="number"
                  step="0.01"
                  value={ssCosts}
                  onChange={(e) => setSsCosts(e.target.value)}
                />
              </div>
              <div>
                <Label>Total SS</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-background font-semibold">
                  ${totalSS.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* LV Section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-semibold text-sm">Local Voluntary (LV)</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="lvc">LVC</Label>
                <Input
                  id="lvc"
                  type="number"
                  step="0.01"
                  value={lvc}
                  onChange={(e) => setLvc(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lvp">LVP</Label>
                <Input
                  id="lvp"
                  type="number"
                  step="0.01"
                  value={lvp}
                  onChange={(e) => setLvp(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lv-costs">LV Costs</Label>
                <Input
                  id="lv-costs"
                  type="number"
                  step="0.01"
                  value={lvCosts}
                  onChange={(e) => setLvCosts(e.target.value)}
                />
              </div>
              <div>
                <Label>Total LV</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-background font-semibold">
                  ${totalLV.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* PE Section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-semibold text-sm">Penalty Enforcement (PE)</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="pec">PEC</Label>
                <Input
                  id="pec"
                  type="number"
                  step="0.01"
                  value={pec}
                  onChange={(e) => setPec(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pep">PEP</Label>
                <Input
                  id="pep"
                  type="number"
                  step="0.01"
                  value={pep}
                  onChange={(e) => setPep(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pe-costs">PE Costs</Label>
                <Input
                  id="pe-costs"
                  type="number"
                  step="0.01"
                  value={peCosts}
                  onChange={(e) => setPeCosts(e.target.value)}
                />
              </div>
              <div>
                <Label>Total PE</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-background font-semibold">
                  ${totalPE.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Total Paid & Period Covers */}
          {rowType === 'Payment' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Paid</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-green-50 dark:bg-green-950/20 font-bold text-green-600">
                  ${totalPaid?.toFixed(2)}
                </div>
              </div>
              <div>
                <Label htmlFor="period-covers">Period Covers</Label>
                <Input
                  id="period-covers"
                  placeholder="e.g., Sep'20, Oct'20, Nov'20"
                  value={periodCovers}
                  onChange={(e) => setPeriodCovers(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{period ? 'Update' : 'Add'} Period</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
