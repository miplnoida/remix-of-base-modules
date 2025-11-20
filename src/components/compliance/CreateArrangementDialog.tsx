import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComponentInstallmentBreakdown } from '@/types/paymentArrangement';
import { ContributionComponent, COMPONENT_LABELS, COMPONENT_GROUPS } from '@/types/contributionComponents';
import { Calendar } from 'lucide-react';

interface CreateArrangementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  employerId: string;
  componentBreakdown: ComponentInstallmentBreakdown[];
  onSubmit: (arrangementData: any) => void;
}

export function CreateArrangementDialog({
  open,
  onOpenChange,
  caseId,
  employerId,
  componentBreakdown,
  onSubmit
}: CreateArrangementDialogProps) {
  const [installmentType, setInstallmentType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('MONTHLY');
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(6);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [downPaymentRequired, setDownPaymentRequired] = useState(false);
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);
  const [requiresCurrentPayments, setRequiresCurrentPayments] = useState(true);
  const [defaultThreshold, setDefaultThreshold] = useState<number>(2);
  const [terms, setTerms] = useState('');

  const totalDebt = componentBreakdown.reduce((sum, comp) => sum + comp.totalAmount, 0);
  const remainingAfterDown = totalDebt - downPaymentAmount;
  const installmentAmount = installmentType === 'EQUAL' 
    ? remainingAfterDown / numberOfInstallments 
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = () => {
    const arrangementData = {
      caseId,
      employerId,
      componentBreakdown,
      installmentType,
      numberOfInstallments: installmentType === 'EQUAL' ? numberOfInstallments : undefined,
      frequency,
      startDate,
      downPaymentRequired,
      downPaymentAmount: downPaymentRequired ? downPaymentAmount : 0,
      requiresCurrentPayments,
      defaultThreshold,
      terms,
      conditions: [
        requiresCurrentPayments ? 'Must submit all C3s on time during arrangement period' : '',
        'Late payment fee of 10% applies after 5 days past due',
        `Default after ${defaultThreshold} consecutive missed payments`,
        'Upon default, full balance becomes immediately due'
      ].filter(Boolean),
    };
    
    onSubmit(arrangementData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Arrangement</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Component Breakdown Summary */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Debt Amount</span>
                  <span className="text-xl font-bold">{formatCurrency(totalDebt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {componentBreakdown.map(comp => (
                    <div key={comp.component} className="flex justify-between items-center p-2 bg-background rounded">
                      <Badge variant="outline" className="text-xs">{comp.component}</Badge>
                      <span className="font-medium">{formatCurrency(comp.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Down Payment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="down-payment">Require Down Payment</Label>
              <Switch
                id="down-payment"
                checked={downPaymentRequired}
                onCheckedChange={setDownPaymentRequired}
              />
            </div>
            
            {downPaymentRequired && (
              <div>
                <Label htmlFor="down-payment-amount">Down Payment Amount *</Label>
                <Input
                  id="down-payment-amount"
                  type="number"
                  min="0"
                  max={totalDebt}
                  step="0.01"
                  value={downPaymentAmount}
                  onChange={(e) => setDownPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining balance: {formatCurrency(remainingAfterDown)}
                </p>
              </div>
            )}
          </div>

          {/* Installment Type */}
          <div className="space-y-3">
            <Label>Installment Type *</Label>
            <RadioGroup value={installmentType} onValueChange={(value) => setInstallmentType(value as 'EQUAL' | 'CUSTOM')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="EQUAL" id="equal" />
                <Label htmlFor="equal" className="font-normal cursor-pointer">
                  Equal Installments (Recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CUSTOM" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom Installments (Advanced)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {installmentType === 'EQUAL' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number-installments">Number of Installments *</Label>
                <Input
                  id="number-installments"
                  type="number"
                  min="2"
                  max="24"
                  value={numberOfInstallments}
                  onChange={(e) => setNumberOfInstallments(parseInt(e.target.value) || 6)}
                />
              </div>
              
              <div>
                <Label htmlFor="frequency">Payment Frequency *</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value as any)}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <Label htmlFor="start-date">Start Date *</Label>
            <div className="relative">
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Calculated Installment Amount */}
          {installmentType === 'EQUAL' && (
            <Card className="bg-green-50/30 border-green-200">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Calculated Installment Amount</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(installmentAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {frequency} × {numberOfInstallments} installments = {formatCurrency(remainingAfterDown)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Terms & Conditions */}
          <div>
            <Label htmlFor="terms">Arrangement Terms *</Label>
            <Textarea
              id="terms"
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Describe the payment arrangement terms, including any special conditions or requirements..."
            />
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="current-payments">Require Current C3 Submissions</Label>
                <p className="text-xs text-muted-foreground">Employer must stay current during arrangement</p>
              </div>
              <Switch
                id="current-payments"
                checked={requiresCurrentPayments}
                onCheckedChange={setRequiresCurrentPayments}
              />
            </div>

            <div>
              <Label htmlFor="default-threshold">Default Threshold (Missed Payments)</Label>
              <Input
                id="default-threshold"
                type="number"
                min="1"
                max="5"
                value={defaultThreshold}
                onChange={(e) => setDefaultThreshold(parseInt(e.target.value) || 2)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Arrangement defaults after {defaultThreshold} consecutive missed payment{defaultThreshold > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!terms || (downPaymentRequired && downPaymentAmount <= 0)}
          >
            Create Arrangement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
