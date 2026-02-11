import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Check, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { useEmployerValidation } from '@/hooks/useEmployerValidation';
import { getEnabledWeekTextboxes, getMondayCount } from '@/utils/weekCalculations';
import { useC3EmployeeCalculation, formatCurrency } from '@/hooks/useC3EmployeeCalculation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

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
  dateOfBirth?: string;
  // Calculation results
  employeeSS?: number;
  employeeLevy?: number;
  employerSS?: number;
  employerLevy?: number;
  employerSeverance?: number;
  periodGross?: number;
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

const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Bonus Pay', 'Holiday Pay'];

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
  const { config, isLoading: isLoadingConfig, error: configError, calculate } = useC3EmployeeCalculation(periodYear, periodMonth);
  
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
    payPeriod: 'Monthly',
    dateOfBirth: ''
  });

  const [ssnError, setSsnError] = useState<string>('');
  const [ssnValidated, setSsnValidated] = useState(false);
  const [pendingPayPeriod, setPendingPayPeriod] = useState<string | null>(null);
  const [showPayPeriodConfirm, setShowPayPeriodConfirm] = useState(false);
  const [defaultPayPeriodFetched, setDefaultPayPeriodFetched] = useState(false);

  // Auto-calculate Term Start Date as the first date of the selected Period month
  const periodTermStartDate = useMemo(() => {
    const monthStr = String(periodMonth + 1).padStart(2, '0');
    return `${periodYear}-${monthStr}-01`;
  }, [periodYear, periodMonth]);

  // Calculate enabled weeks based on period
  const safePeriodYear = isNaN(periodYear) ? new Date().getFullYear() : periodYear;
  const safePeriodMonth = isNaN(periodMonth) ? new Date().getMonth() : periodMonth;
  const mondayCount = getMondayCount(safePeriodYear, safePeriodMonth);
  const enabledWeekCheckboxes = [true, true, true, true, mondayCount >= 5];

  // Calculate enabled textboxes based on pay period
  const enabledTextboxes = getEnabledWeekTextboxes(
    localEmployee.payPeriod || 'Monthly',
    safePeriodYear,
    safePeriodMonth,
    localEmployee.termStartDate
  ) || [false, false, false, false, false];

  // Calculate payroll contributions using database-driven C3 configuration
  const payrollCalc = useMemo(() => {
    return calculate({
      weeklyWages: localEmployee.weeklyWages,
      payPeriod: localEmployee.payPeriod || 'Monthly',
      dateOfBirth: localEmployee.dateOfBirth || '',
      termStartDate: localEmployee.termStartDate || ''
    });
  }, [localEmployee.weeklyWages, localEmployee.payPeriod, localEmployee.termStartDate, localEmployee.dateOfBirth, calculate]);

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      const safeDays = Array.isArray(employee.days) && employee.days.length === 7
        ? employee.days
        : [false, false, false, false, false, false, false];
      const safeWages = Array.isArray(employee.weeklyWages) && employee.weeklyWages.length === 7
        ? employee.weeklyWages
        : [0, 0, 0, 0, 0, 0, 0];
      setLocalEmployee({
        ...employee,
        days: safeDays,
        weeklyWages: safeWages,
        termStartDate: periodTermStartDate
      });
      setSsnValidated(true);
      setSsnError('');
      setWageInputValues(safeWages.map(w => w === 0 ? '' : String(w)));
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
        termStartDate: periodTermStartDate,
        payPeriod: 'Monthly',
        dateOfBirth: ''
      });
      setSsnValidated(false);
      setSsnError('');
      setDefaultPayPeriodFetched(false);
      setWageInputValues(['', '', '', '', '', '', '']);
    }
  }, [employee, isOpen, periodTermStartDate]);

  // Fetch default Pay-Period from latest ip_wages record for SSN
  useEffect(() => {
    if (!ssnValidated || !localEmployee.ssn || defaultPayPeriodFetched || !!employee) return;

    const fetchDefaultPayPeriod = async () => {
      try {
        const { data, error } = await supabase
          .from('ip_wages')
          .select('pay_period')
          .eq('ssn', localEmployee.ssn)
          .eq('payer_type', 'ER')
          .order('date_entered', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.pay_period) {
          const payPeriodMap: Record<string, string> = {
            '1': 'Monthly',
            '2': 'Bi-Weekly',
            '3': 'Weekly',
            '4': '2 Monthly'
          };
          const mappedValue = payPeriodMap[String(data.pay_period)] || 'Monthly';
          setLocalEmployee(prev => ({ ...prev, payPeriod: mappedValue }));
        }
        setDefaultPayPeriodFetched(true);
      } catch {
        setDefaultPayPeriodFetched(true);
      }
    };

    fetchDefaultPayPeriod();
  }, [ssnValidated, localEmployee.ssn, defaultPayPeriodFetched, employee]);

  // Auto-check week checkboxes when pay period changes
  useEffect(() => {
    if (isViewMode) return;
    const newDays = [...(localEmployee.days || [false, false, false, false, false, false, false])];
    const newWages = [...(localEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
    // Auto-check weeks 0-4 based on enabled textboxes
    for (let i = 0; i < 5; i++) {
      if (enabledTextboxes[i] && enabledWeekCheckboxes[i]) {
        newDays[i] = true;
      } else if (!enabledTextboxes[i]) {
        newDays[i] = false;
        newWages[i] = 0;
      }
    }
    setLocalEmployee(prev => ({
      ...prev,
      days: newDays,
      weeklyWages: newWages
    }));
    // Only react to payPeriod changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localEmployee.payPeriod]);

  const handleSSNBlur = useCallback(async () => {
    if (localEmployee.ssn && localEmployee.ssn.length === 6) {
      const result = await validateEmployee(localEmployee.ssn);
      if (result.isValid) {
        setLocalEmployee(prev => ({
          ...prev,
          name: result.name,
          termStartDate: periodTermStartDate,
          dateOfBirth: result.dateOfBirth
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

    // Reset validation when SSN changes
    if (field === 'ssn') {
      setLocalEmployee(prev => ({ ...prev, [field]: value }));
      setSsnValidated(false);
      setSsnError('');
      return;
    }

    // Handle Pay Period change with confirmation
    if (field === 'payPeriod' && value !== localEmployee.payPeriod) {
      // Check if there are any wages entered
      const hasWages = localEmployee.weeklyWages.some(w => w > 0);
      if (hasWages) {
        setPendingPayPeriod(value);
        setShowPayPeriodConfirm(true);
        return;
      }
    }

    setLocalEmployee(prev => ({ ...prev, [field]: value }));
  };

  const handlePayPeriodConfirm = () => {
    if (pendingPayPeriod) {
      // Reset the form wages and update pay period
      setLocalEmployee(prev => ({
        ...prev,
        payPeriod: pendingPayPeriod,
        days: [false, false, false, false, false, false, false],
        weeklyWages: [0, 0, 0, 0, 0, 0, 0]
      }));
    }
    setPendingPayPeriod(null);
    setShowPayPeriodConfirm(false);
  };

  const handlePayPeriodCancel = () => {
    setPendingPayPeriod(null);
    setShowPayPeriodConfirm(false);
  };

  const handleWeekToggle = (index: number) => {
    if (isViewMode) return;
    if (index < 5 && !enabledWeekCheckboxes[index]) return;

    const newDays = [...localEmployee.days];
    const newWages = [...localEmployee.weeklyWages];
    
    newDays[index] = !newDays[index];
    if (!newDays[index]) {
      newWages[index] = 0;
      const newInputValues = [...wageInputValues];
      newInputValues[index] = '';
      setWageInputValues(newInputValues);
    }
    
    setLocalEmployee(prev => ({
      ...prev,
      days: newDays,
      weeklyWages: newWages
    }));
  };

  // Track raw string values for wage inputs to allow decimal entry
  const [wageInputValues, setWageInputValues] = React.useState<string[]>(
    localEmployee.weeklyWages.map(w => w === 0 ? '' : String(w))
  );

  const handleWageChange = (index: number, value: string) => {
    if (isViewMode) return;
    
    // Allow decimal input: numeric(10,2) - max 8 integer digits + 2 decimal places
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    
    const integerPart = parts[0] || '';
    const decimalPart = parts[1] || '';
    
    // Validate: max 8 integer digits, max 2 decimal places
    if (integerPart.length > 8) return;
    if (decimalPart.length > 2) return;
    
    // Store raw string for display (preserves trailing dot/zeros while typing)
    const newInputValues = [...wageInputValues];
    newInputValues[index] = cleanValue;
    setWageInputValues(newInputValues);
    
    const numValue = parseFloat(cleanValue) || 0;
    if (numValue < 0) return; // Validate non-negative
    
    const newWages = [...localEmployee.weeklyWages];
    newWages[index] = numValue;
    setLocalEmployee(prev => ({
      ...prev,
      weeklyWages: newWages
    }));
  };

  const handleSave = () => {
    if (!ssnValidated) {
      setSsnError('Please enter a valid SSN');
      return;
    }
    
    // Include calculation results in saved data
    const savedEmployee: EmployeeData = {
      ...localEmployee,
      totalWages: payrollCalc.totalWages,
      hssdLevy: payrollCalc.employeeLevy, 
      socialSecurity: payrollCalc.employeeSS,
      employeeSS: payrollCalc.employeeSS,
      employeeLevy: payrollCalc.employeeLevy,
      employerSS: payrollCalc.employerSSTotal,
      employerLevy: payrollCalc.employerLevy,
      employerSeverance: payrollCalc.employerSeverance,
      periodGross: payrollCalc.totalWages
    };
    
    onSave(savedEmployee);
    onClose();
  };

  const isWeekFieldEnabled = (index: number) => {
    // Week 1-5 (indices 0-4): based on pay period and week checkbox
    if (index < 5) {
      return localEmployee.days?.[index] && enabledTextboxes?.[index];
    }
    // Bonus Pay (index 5): enabled only if checkbox is checked
    if (index === 5) {
      return localEmployee.days?.[5] ?? false;
    }
    // Holiday Pay (index 6): enabled only if checkbox is checked
    if (index === 6) {
      return localEmployee.days?.[6] ?? false;
    }
    return false;
  };

  return (
    <>
    {/* Pay Period Change Confirmation Dialog */}
    <AlertDialog open={showPayPeriodConfirm} onOpenChange={setShowPayPeriodConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Pay Period?</AlertDialogTitle>
          <AlertDialogDescription>
            Changing the pay period will reset all entered wage data. This action cannot be undone.
            Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handlePayPeriodCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePayPeriodConfirm}>Yes, Reset Form</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: '65vw', maxWidth: '65vw', minWidth: '1000px' }}>
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
                value={periodTermStartDate}
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
            <div className="grid grid-cols-7 gap-1">
              {weekLabels.map((label, index) => {
                const isCheckboxEnabled = index < 5 ? enabledWeekCheckboxes[index] : true;
                const isFieldEnabled = isWeekFieldEnabled(index);
                
                return (
                  <div key={index} className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-center">{label}</span>
                    <div className="flex items-center gap-0">
                      <div
                        className={`h-8 w-7 min-w-[1.75rem] border rounded-l-md flex items-center justify-center ${
                          !isCheckboxEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        } ${
                          localEmployee.days?.[index]
                            ? 'bg-primary border-primary'
                            : 'bg-background border-[#d4d4d8]'
                        }`}
                        onClick={() => isCheckboxEnabled && handleWeekToggle(index)}
                      >
                        {localEmployee.days?.[index] && (
                          <span className="text-primary-foreground text-sm font-bold">✓</span>
                        )}
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={wageInputValues[index] ?? (localEmployee.weeklyWages[index] === 0 ? '' : String(localEmployee.weeklyWages[index]))}
                        onChange={(e) => handleWageChange(index, e.target.value)}
                        className="h-8 text-right rounded-l-none min-w-[4rem] border border-l-0 border-[#d4d4d8] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="0.00"
                        disabled={!isFieldEnabled || isViewMode}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calculation Summary - Using Database-Driven C3 Configuration */}
          <Card className="bg-primary/5 border-primary/20 border-t-4 border-t-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-base">Calculation Summary</CardTitle>
                {isLoadingConfig && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading config...
                  </div>
                )}
              </div>
              
              {configError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{configError}</AlertDescription>
                </Alert>
              )}
              
              {config && (
                <p className="text-xs text-muted-foreground mb-3">
                  Using configuration from {new Date(config.startDate).toLocaleDateString()} 
                  {config.endDate ? ` to ${new Date(config.endDate).toLocaleDateString()}` : ' (current)'}
                  {' | '}SS Rate: {(config.employeeSSRate * 100).toFixed(1)}% | Levy Rate: {(config.employerLevyRate * 100).toFixed(1)}% | Severance: {(config.employerSeveranceRate * 100).toFixed(1)}%
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Total Wages</Label>
                  <div className="text-lg font-semibold">{formatCurrency(payrollCalc.totalWages)}</div>
                  <p className="text-xs text-muted-foreground">Week1-5 + Holiday + Bonus</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Taxable Wages</Label>
                  <div className="text-lg font-semibold">{formatCurrency(payrollCalc.taxableWages)}</div>
                  <p className="text-xs text-muted-foreground">Week1-5 + Holiday (excl. Bonus)</p>
                </div>
              </div>
              
              {/* Employee Contributions */}
              <div className="mt-4 pt-4 border-t border-border">
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Employee Contributions</Label>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Employee SS ({config ? `${(config.employeeSSRate * 100).toFixed(0)}%` : '5%'} of Taxable)</Label>
                    <div className="font-medium">{formatCurrency(payrollCalc.employeeSS)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Employee Levy ({payrollCalc.usedMonthlyLevyLogic ? 'as per monthly Levy slab' : 'as per weekly Levy slab'}
                      {(() => {
                        const bonusAmount = localEmployee.weeklyWages[5] || 0;
                        if (bonusAmount > 0) {
                          if (config.bonusExemptFromLevy) {
                            return ' | levy on Bonus exempted';
                          } else if (config.bonusLevyRate > 0) {
                            return ' | included levy on Bonus';
                          }
                        }
                        return '';
                      })()})
                    </Label>
                    <div className="font-medium">{formatCurrency(payrollCalc.employeeLevy)}</div>
                  </div>
                </div>
              </div>
              
              {/* Employer Contributions */}
              <div className="mt-4 pt-4 border-t border-border">
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Employer Contributions</Label>
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Employer SS ({config ? `${(config.employerSSRate * 100).toFixed(0)}%` : '5%'})</Label>
                    <div className="font-medium">{formatCurrency(payrollCalc.employerSS)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">EIB ({config ? `${(config.employerEIBRate * 100).toFixed(0)}%` : '1%'})</Label>
                    <div className="font-medium">{formatCurrency(payrollCalc.employerEIB)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Employer Levy ({config ? `${(config.employerLevyRate * 100).toFixed(0)}%` : '3%'})</Label>
                    <div className="font-medium">{formatCurrency(payrollCalc.employerLevy)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Severance ({config ? `${(config.employerSeveranceRate * 100).toFixed(0)}%` : '1%'})</Label>
                    <div className="font-medium">{formatCurrency(payrollCalc.employerSeverance)}</div>
                  </div>
                </div>
                {(payrollCalc.isAgeExemptSS || payrollCalc.isAgeExemptLevy) && (
                  <div className="mt-2 space-y-1">
                    {payrollCalc.isAgeExemptSS && (
                      <p className="text-xs text-amber-600">
                        * SS contributions exempt due to employee age (under {config?.minAgeSS || 16} or over {config?.maxAgeSS || 62})
                      </p>
                    )}
                    {payrollCalc.isAgeExemptLevy && (
                      <p className="text-xs text-amber-600">
                        * Levy contributions exempt due to employee age (under {config?.minAgeLevy || 16} or over {config?.maxAgeLevy || 62})
                      </p>
                    )}
                  </div>
                )}
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
    </>
  );
}
