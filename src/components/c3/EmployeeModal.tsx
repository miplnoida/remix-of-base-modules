import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Check, Save, X, Loader2 } from 'lucide-react';
import { useEmployerValidation } from '@/hooks/useEmployerValidation';
import { getEnabledWeekTextboxes, getMondayCount } from '@/utils/weekCalculations';

export interface EmployeeData {
  ssn: string;
  name: string;
  days: boolean[];
  categories: boolean[];
  wages: number;
  bonus: number;
  totalWages: number;
  hssdLevy: number;
  socialSecurity: number;
  isVerified: boolean;
  weeklyWages: number[];
  termStartDate?: string;
  payPeriod?: string;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeData | null;
  onSave: (employee: EmployeeData) => void;
  isViewMode?: boolean;
  periodYear: number;
  periodMonth: number;
}

const weekLabels = ['1 Week', '2 Week', '3 Week', '4 Week', '5 Week', 'Bonus Pay', 'Holiday Pay'];

const calculateTotals = (employee: EmployeeData) => {
  const weeklyTotal = (employee.weeklyWages || []).reduce((sum, wage) => sum + wage, 0);
  const totalWages = weeklyTotal + employee.wages + employee.bonus;
  const hssdLevy = totalWages * 0.015;
  const socialSecurity = totalWages * 0.03;
  return { totalWages, hssdLevy, socialSecurity };
};

const formatMoney = (n: number) => 
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EmployeeModal({
  isOpen,
  onClose,
  employee,
  onSave,
  isViewMode = false,
  periodYear,
  periodMonth
}: EmployeeModalProps) {
  const { validateEmployee, isValidating } = useEmployerValidation();
  
  const [localEmployee, setLocalEmployee] = useState<EmployeeData>({
    ssn: '',
    name: '',
    days: [false, false, false, false, false, false, false],
    categories: [false, false, false],
    wages: 0,
    bonus: 0,
    totalWages: 0,
    hssdLevy: 0,
    socialSecurity: 0,
    isVerified: false,
    weeklyWages: [0, 0, 0, 0, 0, 0, 0],
    termStartDate: '',
    payPeriod: 'Monthly'
  });

  const [ssnError, setSsnError] = useState<string>('');
  const [ssnValidated, setSsnValidated] = useState(false);

  // Calculate enabled weeks based on period
  const mondayCount = getMondayCount(periodYear, periodMonth);
  const enabledWeekCheckboxes = [true, true, true, true, mondayCount >= 5];

  // Calculate enabled textboxes based on pay period
  const enabledTextboxes = getEnabledWeekTextboxes(
    localEmployee.payPeriod || 'Monthly',
    periodYear,
    periodMonth,
    localEmployee.termStartDate
  );

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      setLocalEmployee(employee);
      setSsnValidated(true);
      setSsnError('');
    } else {
      setLocalEmployee({
        ssn: '',
        name: '',
        days: [false, false, false, false, false, false, false],
        categories: [false, false, false],
        wages: 0,
        bonus: 0,
        totalWages: 0,
        hssdLevy: 0,
        socialSecurity: 0,
        isVerified: false,
        weeklyWages: [0, 0, 0, 0, 0, 0, 0],
        termStartDate: '',
        payPeriod: 'Monthly'
      });
      setSsnValidated(false);
      setSsnError('');
    }
  }, [employee, isOpen]);

  const handleSSNBlur = useCallback(async () => {
    if (localEmployee.ssn && localEmployee.ssn.length === 6) {
      const result = await validateEmployee(localEmployee.ssn);
      if (result.isValid) {
        setLocalEmployee(prev => ({
          ...prev,
          name: result.name,
          termStartDate: result.termStartDate
        }));
        setSsnValidated(true);
        setSsnError('');
      } else {
        setSsnError(result.error || 'Invalid SSN');
        setSsnValidated(false);
      }
    }
  }, [localEmployee.ssn, validateEmployee]);

  const handleChange = (field: keyof EmployeeData, value: any) => {
    if (isViewMode) return;
    
    setLocalEmployee(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalculate totals when wages change
      if (field === 'weeklyWages' || field === 'wages' || field === 'bonus') {
        const totals = calculateTotals(updated);
        return { ...updated, ...totals };
      }
      
      return updated;
    });

    // Reset validation when SSN changes
    if (field === 'ssn') {
      setSsnValidated(false);
      setSsnError('');
    }
  };

  const handleWeekToggle = (index: number) => {
    if (isViewMode) return;
    if (index < 5 && !enabledWeekCheckboxes[index]) return;

    const newDays = [...localEmployee.days];
    const newWages = [...localEmployee.weeklyWages];
    
    newDays[index] = !newDays[index];
    if (!newDays[index]) {
      newWages[index] = 0;
    }
    
    handleChange('days', newDays);
    handleChange('weeklyWages', newWages);
  };

  const handleWageChange = (index: number, value: string) => {
    if (isViewMode) return;
    
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    const integerPart = parts[0];
    
    if (integerPart.length <= 6) {
      const newWages = [...localEmployee.weeklyWages];
      newWages[index] = parseFloat(cleanValue) || 0;
      handleChange('weeklyWages', newWages);
    }
  };

  const handleSave = () => {
    if (!ssnValidated) {
      setSsnError('Please enter a valid SSN');
      return;
    }
    
    const totals = calculateTotals(localEmployee);
    onSave({ ...localEmployee, ...totals });
    onClose();
  };

  const isWeekFieldEnabled = (index: number) => {
    // Week 1-5 (indices 0-4): based on pay period and week checkbox
    if (index < 5) {
      return localEmployee.days[index] && enabledTextboxes[index];
    }
    // Bonus Pay (index 5): enabled only if checkbox is checked
    if (index === 5) {
      return localEmployee.days[5];
    }
    // Holiday Pay (index 6): enabled only if checkbox is checked
    if (index === 6) {
      return localEmployee.days[6];
    }
    return false;
  };

  const totals = calculateTotals(localEmployee);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? 'View Employee' : (employee ? 'Edit Employee' : 'Add New Employee')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Information */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ssn">SSN <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="ssn"
                  value={localEmployee.ssn}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleChange('ssn', value);
                  }}
                  onBlur={handleSSNBlur}
                  placeholder="Enter 6-digit SSN"
                  maxLength={6}
                  disabled={isViewMode || !!employee}
                  className={ssnError ? 'border-destructive' : ''}
                />
                {isValidating && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {ssnError && <p className="text-xs text-destructive">{ssnError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeName">Employee Name</Label>
              <Input
                id="employeeName"
                value={localEmployee.name}
                readOnly
                disabled
                className="bg-muted"
                placeholder="Auto-populated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termStartDate">Term Start Date</Label>
              <Input
                id="termStartDate"
                type="date"
                value={localEmployee.termStartDate || ''}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payPeriod">Pay Period</Label>
              <Select 
                value={localEmployee.payPeriod || 'Monthly'} 
                onValueChange={(value) => handleChange('payPeriod', value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Pay Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="2 Monthly">2 Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Wages Entry */}
          <div>
            <Label className="text-sm font-medium text-primary mb-3 block">
              Record Wages/Salaries in respect of the weeks worked or Holiday Pay or Bonuses
            </Label>
            <div className="grid grid-cols-7 gap-4">
              {weekLabels.map((label, index) => {
                const isCheckboxEnabled = index < 5 ? enabledWeekCheckboxes[index] : true;
                const isFieldEnabled = isWeekFieldEnabled(index);
                
                return (
                  <div key={index} className="flex flex-col space-y-2">
                    <span className="text-sm font-medium">{label}</span>
                    <div className="flex items-center gap-0">
                      <div
                        className={`h-8 w-8 border-l border-t border-b rounded-l-md flex items-center justify-center ${
                          !isCheckboxEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        } ${
                          localEmployee.days[index]
                            ? 'bg-primary border-primary'
                            : 'bg-background border-input'
                        }`}
                        onClick={() => isCheckboxEnabled && handleWeekToggle(index)}
                      >
                        {localEmployee.days[index] && (
                          <span className="text-primary-foreground text-sm font-bold">✓</span>
                        )}
                      </div>
                      <Input
                        type="text"
                        value={localEmployee.weeklyWages[index] === 0 ? '' : localEmployee.weeklyWages[index].toFixed(2)}
                        onChange={(e) => handleWageChange(index, e.target.value)}
                        className={`flex-1 h-8 text-center rounded-l-none ${
                          localEmployee.days[index] ? 'border-primary' : ''
                        }`}
                        placeholder="$0.00"
                        disabled={!isFieldEnabled || isViewMode}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calculation Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <CardTitle className="text-base mb-4">Calculation Summary</CardTitle>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Total Wages + Employee Levy + SS</Label>
                  <div className="text-lg font-semibold">{formatMoney(totals.totalWages + totals.hssdLevy + totals.socialSecurity)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Employer's 3% Levy + SS</Label>
                  <div className="text-lg font-semibold">{formatMoney(totals.totalWages * 0.03)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Employer's 1% Severance Pay</Label>
                  <div className="text-lg font-semibold">{formatMoney(totals.totalWages * 0.01)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verified Toggle */}
          {!isViewMode && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange('isVerified', !localEmployee.isVerified)}
                className={`h-10 w-10 rounded-md border flex items-center justify-center ${
                  localEmployee.isVerified ? 'bg-green-600 border-green-600' : 'bg-background border-input'
                }`}
              >
                {localEmployee.isVerified && <Check className="h-5 w-5 text-white" />}
              </button>
              <Label>Verified</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          {!isViewMode && (
            <Button onClick={handleSave} disabled={!ssnValidated}>
              <Save className="h-4 w-4 mr-2" />
              Save Employee
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
