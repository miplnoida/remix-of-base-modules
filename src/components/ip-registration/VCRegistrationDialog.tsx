import { useState, useEffect } from 'react';
import { format, addWeeks, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calculator, DollarSign, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCalculateVCWage, useRegisterVC, VCEligibilityResult } from '@/hooks/useVoluntaryContributor';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VCRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ssn: string;
  eligibilityData: VCEligibilityResult;
  onSuccess?: () => void;
}

export function VCRegistrationDialog({
  open,
  onOpenChange,
  ssn,
  eligibilityData,
  onSuccess
}: VCRegistrationDialogProps) {
  const today = new Date();
  const [dateRegistered, setDateRegistered] = useState<Date>(today);
  const [dateCommenced, setDateCommenced] = useState<Date | undefined>(undefined);
  const [paymentInterval, setPaymentInterval] = useState<'W' | 'M'>('W');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  const dateRegisteredStr = dateRegistered ? format(dateRegistered, 'yyyy-MM-dd') : null;
  
  const { data: wageCalc, isLoading: wageLoading } = useCalculateVCWage(ssn, dateRegisteredStr);
  const registerVC = useRegisterVC();

  // Calculate default due date based on payment interval
  useEffect(() => {
    if (dateCommenced && paymentInterval) {
      const newDueDate = paymentInterval === 'W' 
        ? addWeeks(dateCommenced, 1)
        : addMonths(dateCommenced, 1);
      setDueDate(newDueDate);
    }
  }, [dateCommenced, paymentInterval]);

  const contributionAmount = wageCalc && eligibilityData.config
    ? (wageCalc.weekly_avg * eligibilityData.config.contrib_pct / 100).toFixed(2)
    : '0.00';

  const handleSubmit = async () => {
    if (!dateCommenced || !dueDate) return;

    const result = await registerVC.mutateAsync({
      ssn,
      dateRegistered: format(dateRegistered, 'yyyy-MM-dd'),
      dateCommenced: format(dateCommenced, 'yyyy-MM-dd'),
      paymentInterval,
      dueDate: format(dueDate, 'yyyy-MM-dd')
    });

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const isFormValid = dateRegistered && dateCommenced && paymentInterval && dueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Register as Voluntary Contributor
          </DialogTitle>
          <DialogDescription>
            Complete the registration for {eligibilityData.ip_details?.name} (SSN: {ssn})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wage Calculation Summary */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Wage Calculation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {wageLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Calculating wages...</span>
                </div>
              ) : wageCalc ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <p className="font-medium">{wageCalc.months_covered} months</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Wages:</span>
                    <p className="font-medium">${wageCalc.total_wages.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Average Earnings:</span>
                    <p className="font-medium">${wageCalc.avg_earnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weekly Average:</span>
                    <p className="font-medium text-primary">${wageCalc.weekly_avg.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No wage history found for the specified period.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Contribution Amount */}
          <Card className="border-primary/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-medium">Contribution Amount</span>
                </div>
                <span className="text-2xl font-bold text-primary">${contributionAmount} / week</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {eligibilityData.config?.contrib_pct}% of average weekly wage
              </p>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRegistered">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Registered
              </Label>
              <DatePicker
                date={dateRegistered}
                onDateChange={(date) => date && setDateRegistered(date)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateCommenced">
                <Calendar className="h-4 w-4 inline mr-1" />
                Payment Commencement Date
              </Label>
              <DatePicker
                date={dateCommenced}
                onDateChange={setDateCommenced}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentInterval">Payment Interval</Label>
              <Select value={paymentInterval} onValueChange={(v) => setPaymentInterval(v as 'W' | 'M')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="W">Weekly</SelectItem>
                  <SelectItem value="M">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">
                <Calendar className="h-4 w-4 inline mr-1" />
                First Due Date
              </Label>
              <DatePicker
                date={dueDate}
                onDateChange={setDueDate}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid || registerVC.isPending}
          >
            {registerVC.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Complete Registration'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
