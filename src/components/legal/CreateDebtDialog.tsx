import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDetailedDebt, PayerInfo } from "@/hooks/useFinancialTracking";

interface CreateDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function CreateDebtDialog({ open, onOpenChange, caseId }: CreateDebtDialogProps) {
  const [payerInfo, setPayerInfo] = useState<PayerInfo>({
    payer_id: '',
    payer_type: 'Employer',
    payer_name: '',
    registry_ref: ''
  });

  const [baseDebt, setBaseDebt] = useState({
    ss_insured: 0,
    ss_employer: 0,
    levy: 0,
    ei: 0
  });

  const [dueDate, setDueDate] = useState('');

  const createDebt = useCreateDetailedDebt();

  const handleCreate = () => {
    if (!payerInfo.payer_name || !dueDate) {
      return;
    }

    createDebt.mutate(
      {
        caseId,
        payerInfo,
        wagePeriods: [],
        baseDebt,
        dueDate
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setPayerInfo({
            payer_id: '',
            payer_type: 'Employer',
            payer_name: '',
            registry_ref: ''
          });
          setBaseDebt({
            ss_insured: 0,
            ss_employer: 0,
            levy: 0,
            ei: 0
          });
          setDueDate('');
        }
      }
    );
  };

  const totalDebt = Object.values(baseDebt).reduce((sum, val) => sum + val, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Debt Record</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payer Information */}
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="font-semibold">Payer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payer Type</Label>
                <Select 
                  value={payerInfo.payer_type} 
                  onValueChange={(v: any) => setPayerInfo({...payerInfo, payer_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employer">Employer</SelectItem>
                    <SelectItem value="Insured Person">Insured Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payer Name *</Label>
                <Input
                  value={payerInfo.payer_name}
                  onChange={(e) => setPayerInfo({...payerInfo, payer_name: e.target.value})}
                  placeholder="Enter payer name"
                />
              </div>
              <div>
                <Label>Payer ID</Label>
                <Input
                  value={payerInfo.payer_id}
                  onChange={(e) => setPayerInfo({...payerInfo, payer_id: e.target.value})}
                  placeholder="Enter payer ID"
                />
              </div>
              <div>
                <Label>Registry Reference</Label>
                <Input
                  value={payerInfo.registry_ref}
                  onChange={(e) => setPayerInfo({...payerInfo, registry_ref: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Base Debt Amounts */}
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="font-semibold">Base Debt Amounts (XCD)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SS - Insured Person</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={baseDebt.ss_insured}
                  onChange={(e) => setBaseDebt({...baseDebt, ss_insured: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>SS - Employer</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={baseDebt.ss_employer}
                  onChange={(e) => setBaseDebt({...baseDebt, ss_employer: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Housing & Social Development Levy</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={baseDebt.levy}
                  onChange={(e) => setBaseDebt({...baseDebt, levy: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Employment Insurance (EI)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={baseDebt.ei}
                  onChange={(e) => setBaseDebt({...baseDebt, ei: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-semibold">
                Total Base Debt: ${totalDebt.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Penalties will be calculated automatically based on overdue days
              </p>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={createDebt.isPending || !payerInfo.payer_name || !dueDate}
          >
            {createDebt.isPending ? 'Creating...' : 'Create Debt Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
