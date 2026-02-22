import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Check, Save, X, Loader2, AlertCircle, User, CalendarDays, DollarSign, ShieldCheck } from 'lucide-react';
import { useEmployerValidation } from '@/hooks/useEmployerValidation';
import { getEnabledWeekTextboxes, getMondayCount } from '@/utils/weekCalculations';
import { useC3EmployeeCalculation, formatCurrency } from '@/hooks/useC3EmployeeCalculation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

import { Badge } from '@/components/ui/badge';

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

export interface PenaltyFinesData {
  levyPenalty: number;
  severancePenalty: number;
  ssFines: number;
  daysLate: number;
  totalLateCharges: number;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeData | null;
  onSave: (employee: EmployeeData) => void;
  isViewMode?: boolean;
  periodYear: number;
  periodMonth: number;
  penaltyData?: PenaltyFinesData;
}

const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Bonus Pay', 'Holiday Pay'];

export default function EmployeeModal({
  isOpen,
  onClose,
  employee,
  onSave,
  isViewMode = false,
  periodYear,
  periodMonth,
  penaltyData
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

  const modalTitle = isViewMode ? 'View Employee' : (employee ? 'Edit Employee' : 'Add New Employee');

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
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 flex flex-col w-[95vw] max-w-[900px] sm:rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2.5 border-b border-border/50 flex-shrink-0">
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold tracking-tight">{modalTitle}</DialogTitle>
                <DialogDescription className="text-[10px] text-muted-foreground mt-0">
                  {isViewMode ? 'Viewing employee contribution details' : 'Enter employee details and wage information'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="px-4 py-3 flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
          {/* Employee Info Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <div className="space-y-0.5">
              <Label htmlFor="ssn" className="text-[10px] font-medium text-muted-foreground">SSN <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="ssn"
                  value={localEmployee.ssn}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleChange('ssn', value);
                  }}
                  onBlur={handleSSNBlur}
                  placeholder="6-digit SSN"
                  maxLength={6}
                  disabled={isViewMode || !!employee}
                  className={`h-7 text-xs ${ssnError ? 'border-destructive focus-visible:ring-destructive' : ssnValidated ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                {isValidating && <Loader2 className="absolute right-2 top-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {ssnValidated && !isValidating && <Check className="absolute right-2 top-1.5 h-3.5 w-3.5 text-green-500" />}
              </div>
              {ssnError && <p className="text-[10px] text-destructive leading-tight">{ssnError}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="employeeName" className="text-[10px] font-medium text-muted-foreground">Employee Name</Label>
              <Input id="employeeName" value={localEmployee.name} readOnly disabled className="h-7 text-xs bg-muted/50 font-medium" placeholder="Auto-populated" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="termStartDate" className="text-[10px] font-medium text-muted-foreground">Term Start</Label>
              <Input id="termStartDate" type="date" value={periodTermStartDate} readOnly disabled className="h-7 text-xs bg-muted/50" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="payPeriod" className="text-[10px] font-medium text-muted-foreground">Pay Period</Label>
              <Select value={localEmployee.payPeriod || 'Monthly'} onValueChange={(value) => handleChange('payPeriod', value)} disabled={isViewMode}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="2 Monthly">2 Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Wages + Calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left: Wages Entry */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="h-3 w-3 text-primary" />
                <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-wide">Wages & Salary</h3>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/10 p-1.5 flex-1 flex flex-col justify-between">
                {weekLabels.map((label, index) => {
                  const isCheckboxEnabled = index < 5 ? enabledWeekCheckboxes[index] : true;
                  const isFieldEnabled = isWeekFieldEnabled(index);
                  const isSpecialRow = index >= 5;
                  return (
                    <div key={index} className={`flex items-center gap-1.5 rounded px-1.5 py-[3px] ${
                      isSpecialRow ? 'bg-accent/30' : index % 2 === 0 ? 'bg-muted/30' : ''
                    }`}>
                      <div
                        className={`h-5 w-5 min-w-[1.25rem] border rounded flex items-center justify-center transition-colors ${
                          !isCheckboxEnabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-muted/30'
                        } ${localEmployee.days?.[index] ? 'bg-primary border-primary shadow-sm' : 'bg-background border-input'}`}
                        onClick={() => isCheckboxEnabled && handleWeekToggle(index)}
                      >
                        {localEmployee.days?.[index] && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className={`text-[10px] font-medium w-20 ${isSpecialRow ? 'text-accent-foreground' : 'text-muted-foreground'}`}>{label}</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={wageInputValues[index] ?? (localEmployee.weeklyWages[index] === 0 ? '' : String(localEmployee.weeklyWages[index]))}
                        onChange={(e) => handleWageChange(index, e.target.value)}
                        className="h-6 text-right min-w-0 flex-1 border border-input shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 font-mono text-[11px]"
                        placeholder="0.00"
                        disabled={!isFieldEnabled || isViewMode}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Calculation Summary */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1 mb-1">
                <CalendarDays className="h-3 w-3 text-primary" />
                <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-wide">Calculations</h3>
                {isLoadingConfig && (
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground ml-auto">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  </div>
                )}
                {config && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Badge variant="outline" className="text-[9px] font-normal h-4 px-1">SS:{(config.employeeSSRate * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline" className="text-[9px] font-normal h-4 px-1">Levy:{(config.employerLevyRate * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline" className="text-[9px] font-normal h-4 px-1">Sev:{(config.employerSeveranceRate * 100).toFixed(0)}%</Badge>
                  </div>
                )}
              </div>
              
              {configError && (
                <Alert variant="destructive" className="mb-1 py-1">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-[10px]">{configError}</AlertDescription>
                </Alert>
              )}
              
              <div className="rounded-md border border-border/60 p-2 flex-1 flex flex-col justify-between">
                {/* Wages summary row */}
                <div className="grid grid-cols-1 gap-2 pb-1.5 border-b border-border/40">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Wages (incl. Bonus)</p>
                    <p className="text-base font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.totalWages)}</p>
                  </div>
                </div>

                {/* Employee Contributions */}
                <div className="py-1.5 border-b border-border/40">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Employee Contributions</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Social Security ({config ? `${(config.employeeSSRate * 100).toFixed(0)}%` : '5%'})</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employeeSS)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">
                        Levy ({payrollCalc.usedMonthlyLevyLogic ? 'monthly' : 'weekly'}
                        {(() => {
                          const bonusAmount = localEmployee.weeklyWages[5] || 0;
                          if (bonusAmount > 0) {
                            if (config.bonusExemptFromLevy) return ' | exempt';
                            else if (config.bonusLevyRate > 0) return ' | +bonus';
                          }
                          return '';
                        })()})
                      </p>
                      <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employeeLevy)}</p>
                    </div>
                  </div>
                </div>

                {/* Employer Contributions */}
                <div className="pt-1.5 border-b border-border/40 pb-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Employer Contributions</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground">SS ({config ? `${(config.employerSSRate * 100).toFixed(0)}%` : '5%'})</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerSS)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">EIB ({config ? `${(config.employerEIBRate * 100).toFixed(0)}%` : '1%'})</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerEIB)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Levy ({config ? `${(config.employerLevyRate * 100).toFixed(0)}%` : '3%'})</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerLevy)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Sev. ({config ? `${(config.employerSeveranceRate * 100).toFixed(0)}%` : '1%'})</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerSeverance)}</p>
                    </div>
                  </div>
                  {(payrollCalc.isAgeExemptSS || payrollCalc.isAgeExemptLevy) && (
                    <div className="mt-1 pt-1 border-t border-border/40 flex gap-2">
                      {payrollCalc.isAgeExemptSS && (
                        <p className="text-[9px] text-amber-600 flex items-center gap-0.5">
                          <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" /> SS exempt
                        </p>
                      )}
                      {payrollCalc.isAgeExemptLevy && (
                        <p className="text-[9px] text-amber-600 flex items-center gap-0.5">
                          <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" /> Levy exempt
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Penalties & Fines */}
                <div className="pt-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    {penaltyData && (penaltyData.levyPenalty > 0 || penaltyData.severancePenalty > 0 || penaltyData.ssFines > 0) ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Penalties & Fines</p>
                    {penaltyData && penaltyData.daysLate > 0 && (
                      <Badge variant="destructive" className="text-[8px] h-3.5 px-1 ml-auto">{penaltyData.daysLate}d late</Badge>
                    )}
                  </div>
                  {penaltyData && (penaltyData.levyPenalty > 0 || penaltyData.severancePenalty > 0 || penaltyData.ssFines > 0) ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Levy Penalty</p>
                        <p className="text-sm font-bold text-destructive leading-tight">{formatCurrency(penaltyData.levyPenalty)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Sev. Penalty</p>
                        <p className="text-sm font-bold text-destructive leading-tight">{formatCurrency(penaltyData.severancePenalty)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">SS Fine</p>
                        <p className="text-sm font-bold text-destructive leading-tight">{formatCurrency(penaltyData.ssFines)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No penalties or fines applicable</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Net Pay Footer */}
        <div className="border-t border-border/50 bg-primary/5 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Net Pay</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span>Employee: <strong className="text-foreground">{formatCurrency(payrollCalc.employeeSS + payrollCalc.employeeLevy)}</strong></span>
              <span>+</span>
              <span>Employer: <strong className="text-foreground">{formatCurrency(payrollCalc.employerSS + payrollCalc.employerEIB + payrollCalc.employerLevy + payrollCalc.employerSeverance)}</strong></span>
              <span>+</span>
              <span>Penalties: <strong className="text-foreground">{formatCurrency((penaltyData?.levyPenalty || 0) + (penaltyData?.severancePenalty || 0) + (penaltyData?.ssFines || 0))}</strong></span>
              <span>=</span>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(
                  payrollCalc.employeeSS + payrollCalc.employeeLevy +
                  payrollCalc.employerSS + payrollCalc.employerEIB + payrollCalc.employerLevy + payrollCalc.employerSeverance +
                  (penaltyData?.levyPenalty || 0) + (penaltyData?.severancePenalty || 0) + (penaltyData?.ssFines || 0)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Footer with Verified + Actions */}
        <div className="border-t border-border/50 bg-muted/20 px-4 py-2.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Verified Toggle - left side */}
            {!isViewMode ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleChange('isVerified', !localEmployee.isVerified)}
                  className={`h-8 w-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                    localEmployee.isVerified 
                      ? 'bg-green-600 border-green-600 shadow-sm shadow-green-600/20' 
                      : 'bg-background border-input hover:border-green-400'
                  }`}
                >
                  {localEmployee.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-white" />}
                </button>
                <div>
                  <Label className="text-xs font-medium">Verified</Label>
                  <p className="text-[10px] text-muted-foreground">Mark as verified</p>
                </div>
              </div>
            ) : (
              <div />
            )}
            {/* Action buttons - right side */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} className="gap-1.5 h-8 text-xs">
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              {!isViewMode && (
                <Button onClick={handleSave} disabled={!ssnValidated} className="gap-1.5 h-8 text-xs min-w-[120px]">
                  <Save className="h-3.5 w-3.5" />
                  Save Employee
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
