import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { WagePeriod, useUpdateWagePeriod } from "@/hooks/useFinancialTracking";

interface WagePeriodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  debtId: string;
  existingPeriods: WagePeriod[];
}

const PAYMENT_CODES = [
  { value: 'REG', label: 'Regular Contribution' },
  { value: 'ARR', label: 'Arrears' },
  { value: 'PEN', label: 'Penalty Payment' },
  { value: 'INT', label: 'Interest' },
  { value: 'ADJ', label: 'Adjustment' },
];

const CONTRIBUTION_TYPES = [
  { value: 'SS_Insured', label: 'SS - Insured Person' },
  { value: 'SS_Employer', label: 'SS - Employer' },
  { value: 'Levy', label: 'Housing & Social Development Levy' },
  { value: 'EI', label: 'Employment Insurance' },
];

export function WagePeriodsDialog({ 
  open, 
  onOpenChange, 
  caseId,
  debtId,
  existingPeriods 
}: WagePeriodsDialogProps) {
  const [periods, setPeriods] = useState<WagePeriod[]>(existingPeriods);
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<WagePeriod>>({
    period: 1,
    wages_paid: 0,
    payment_code: 'REG',
    contribution_type: 'SS_Insured'
  });

  const updateWagePeriod = useUpdateWagePeriod();

  const handleAddPeriod = () => {
    if (!formData.wages_paid || formData.wages_paid <= 0) return;

    const newPeriod: WagePeriod = {
      period: formData.period || periods.length + 1,
      wages_paid: formData.wages_paid,
      payment_code: formData.payment_code || 'REG',
      contribution_type: formData.contribution_type as any || 'SS_Insured',
      date_paid: formData.date_paid,
      reference: formData.reference
    };

    setPeriods([...periods, newPeriod]);
    setFormData({
      period: (formData.period || 0) + 1,
      wages_paid: 0,
      payment_code: 'REG',
      contribution_type: 'SS_Insured'
    });
  };

  const handleRemovePeriod = (period: number) => {
    setPeriods(periods.filter(p => p.period !== period));
  };

  const handleSave = async () => {
    // Save all periods
    for (const period of periods) {
      await updateWagePeriod.mutateAsync({
        debtId,
        caseId,
        wagePeriod: period
      });
    }
    onOpenChange(false);
  };

  const getTotalByType = (type: string) => {
    return periods
      .filter(p => p.contribution_type === type)
      .reduce((sum, p) => sum + p.wages_paid, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Wage Periods & Contributions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Period Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Add Wage Period</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Period #</Label>
                <Input
                  type="number"
                  min="1"
                  max="6"
                  value={formData.period}
                  onChange={(e) => setFormData({...formData, period: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Contribution Type</Label>
                <Select 
                  value={formData.contribution_type} 
                  onValueChange={(v) => setFormData({...formData, contribution_type: v as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Wages Paid (XCD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.wages_paid}
                  onChange={(e) => setFormData({...formData, wages_paid: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Payment Code</Label>
                <Select 
                  value={formData.payment_code} 
                  onValueChange={(v) => setFormData({...formData, payment_code: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_CODES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date Paid</Label>
                <Input
                  type="date"
                  value={formData.date_paid || ''}
                  onChange={(e) => setFormData({...formData, date_paid: e.target.value})}
                />
              </div>
              <div>
                <Label>Reference</Label>
                <Input
                  value={formData.reference || ''}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>
            <Button onClick={handleAddPeriod} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          </div>

          {/* Existing Periods Table */}
          {periods.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Wage Periods</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Wages Paid</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map(period => (
                    <TableRow key={period.period}>
                      <TableCell>
                        <Badge variant="outline">P{period.period}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {CONTRIBUTION_TYPES.find(t => t.value === period.contribution_type)?.label}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{period.payment_code}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${period.wages_paid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm">{period.date_paid || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {period.reference || '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePeriod(period.period)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary by Contribution Type */}
          {periods.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Summary by Contribution Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CONTRIBUTION_TYPES.map(type => {
                  const total = getTotalByType(type.value);
                  return (
                    <div key={type.value} className="text-center p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">{type.label}</p>
                      <p className="text-lg font-bold">${total.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateWagePeriod.isPending}>
            {updateWagePeriod.isPending ? 'Saving...' : 'Save All Periods'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
