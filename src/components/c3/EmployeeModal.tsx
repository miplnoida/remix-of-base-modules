import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Save, X, Loader2, AlertCircle, User, DollarSign, ShieldCheck, Calculator } from 'lucide-react';
import { useEmployerValidation } from '@/hooks/useEmployerValidation';
import { getEnabledWeekTextboxes, getMondayCount } from '@/utils/weekCalculations';
import { useC3EmployeeCalculation, formatCurrency } from '@/hooks/useC3EmployeeCalculation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

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

  const periodTermStartDate = useMemo(() => {
    const monthStr = String(periodMonth + 1).padStart(2, '0');
    return `${periodYear}-${monthStr}-01`;
  }, [periodYear, periodMonth]);

  const safePeriodYear = isNaN(periodYear) ? new Date().getFullYear() : periodYear;
  const safePeriodMonth = isNaN(periodMonth) ? new Date().getMonth() : periodMonth;
  const mondayCount = getMondayCount(safePeriodYear, safePeriodMonth);
  const enabledWeekCheckboxes = [true, true, true, true, mondayCount >= 5];

  const enabledTextboxes = getEnabledWeekTextboxes(
    localEmployee.payPeriod || 'Monthly',
    safePeriodYear,
    safePeriodMonth,
    localEmployee.termStartDate
  ) || [false, false, false, false, false];

  const payrollCalc = useMemo(() => {
    return calculate({
      weeklyWages: localEmployee.weeklyWages,
      payPeriod: localEmployee.payPeriod || 'Monthly',
      dateOfBirth: localEmployee.dateOfBirth || '',
      termStartDate: localEmployee.termStartDate || ''
    });
  }, [localEmployee.weeklyWages, localEmployee.payPeriod, localEmployee.termStartDate, localEmployee.dateOfBirth, calculate]);

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

  useEffect(() => {
    if (isViewMode) return;
    const newDays = [...(localEmployee.days || [false, false, false, false, false, false, false])];
    const newWages = [...(localEmployee.weeklyWages || [0, 0, 0, 0, 0, 0, 0])];
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

    if (field === 'ssn') {
      setLocalEmployee(prev => ({ ...prev, [field]: value }));
      setSsnValidated(false);
      setSsnError('');
      return;
    }

    if (field === 'payPeriod' && value !== localEmployee.payPeriod) {
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

  const [wageInputValues, setWageInputValues] = React.useState<string[]>(
    localEmployee.weeklyWages.map(w => w === 0 ? '' : String(w))
  );

  const handleWageChange = (index: number, value: string) => {
    if (isViewMode) return;
    
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    
    const integerPart = parts[0] || '';
    const decimalPart = parts[1] || '';
    
    if (integerPart.length > 8) return;
    if (decimalPart.length > 2) return;
    
    const newInputValues = [...wageInputValues];
    newInputValues[index] = cleanValue;
    setWageInputValues(newInputValues);
    
    const numValue = parseFloat(cleanValue) || 0;
    if (numValue < 0) return;
    
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
    if (index < 5) {
      return localEmployee.days?.[index] && enabledTextboxes?.[index];
    }
    if (index === 5) {
      return localEmployee.days?.[5] ?? false;
    }
    if (index === 6) {
      return localEmployee.days?.[6] ?? false;
    }
    return false;
  };

  // Calculate net pay
  const netPay = useMemo(() => {
    const totalDeductions = payrollCalc.employeeSS + payrollCalc.employeeLevy;
    return payrollCalc.totalWages - totalDeductions;
  }, [payrollCalc]);

  const hasPenalties = penaltyData && (penaltyData.levyPenalty > 0 || penaltyData.severancePenalty > 0 || penaltyData.ssFines > 0);

  const modalTitle = isViewMode ? 'View Employee' : (employee ? 'Edit Employee' : 'Add New Employee');

  return (
    <>
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
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 flex flex-col w-[96vw] max-w-[920px] sm:rounded-xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] px-5 py-3.5 flex-shrink-0">
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <User className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight">{modalTitle}</DialogTitle>
                <DialogDescription className="text-xs text-white/70 mt-0.5">
                  {isViewMode ? 'Viewing employee contribution details' : 'Enter employee details and wage information'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-5">
          {/* Employee Info Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ssn" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">SSN <span className="text-destructive">*</span></Label>
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
                  className={`h-9 text-sm font-medium ${ssnError ? 'border-destructive focus-visible:ring-destructive' : ssnValidated ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                {isValidating && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                {ssnValidated && !isValidating && (
                  <div className="absolute right-2.5 top-2 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              {ssnError && <p className="text-[10px] text-destructive leading-tight">{ssnError}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="employeeName" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employee Name</Label>
              <Input id="employeeName" value={localEmployee.name} readOnly disabled className="h-9 text-sm bg-muted/40 font-medium" placeholder="Auto-populated" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="termStartDate" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Term Start</Label>
              <Input id="termStartDate" type="date" value={periodTermStartDate} readOnly disabled className="h-9 text-sm bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payPeriod" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pay Period</Label>
              <Select value={localEmployee.payPeriod || 'Monthly'} onValueChange={(value) => handleChange('payPeriod', value)} disabled={isViewMode}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="2 Monthly">2 Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Content: Wages + Calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Wages & Salary */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Wages & Salary</h3>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-2 flex-1 flex flex-col gap-1">
                {weekLabels.map((label, index) => {
                  const isCheckboxEnabled = index < 5 ? enabledWeekCheckboxes[index] : true;
                  const isFieldEnabled = isWeekFieldEnabled(index);
                  const isBonus = index === 5;
                  const isHoliday = index === 6;
                  const isSpecialRow = isBonus || isHoliday;
                  
                  return (
                    <div key={index} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                      isSpecialRow 
                        ? isBonus ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-orange-50 dark:bg-orange-950/30'
                        : index % 2 === 0 ? 'bg-muted/30' : ''
                    }`}>
                      <div
                        className={`h-5 w-5 min-w-[1.25rem] border-2 rounded flex items-center justify-center transition-all ${
                          !isCheckboxEnabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:shadow-sm'
                        } ${localEmployee.days?.[index] 
                          ? 'bg-primary border-primary shadow-sm' 
                          : 'bg-background border-muted-foreground/30'
                        }`}
                        onClick={() => isCheckboxEnabled && handleWeekToggle(index)}
                      >
                        {localEmployee.days?.[index] && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="text-xs font-medium text-foreground min-w-[70px]">{label}</span>
                      {isBonus && (
                        <Badge className="bg-blue-500 text-white text-[9px] px-1.5 py-0 h-4 font-semibold">BONUS</Badge>
                      )}
                      {isHoliday && (
                        <Badge className="bg-orange-500 text-white text-[9px] px-1.5 py-0 h-4 font-semibold">HOLIDAY</Badge>
                      )}
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={wageInputValues[index] ?? (localEmployee.weeklyWages[index] === 0 ? '' : String(localEmployee.weeklyWages[index]))}
                        onChange={(e) => handleWageChange(index, e.target.value)}
                        className="h-7 text-right min-w-0 flex-1 ml-auto max-w-[120px] border border-input font-mono text-xs"
                        placeholder="0.00"
                        disabled={!isFieldEnabled || isViewMode}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Calculations */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <Calculator className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Calculations</h3>
                {isLoadingConfig && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
                )}
                {config && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Badge variant="outline" className="text-[9px] font-semibold h-5 px-1.5 border-primary/30 text-primary">SS·{(config.employeeSSRate * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline" className="text-[9px] font-semibold h-5 px-1.5 border-primary/30 text-primary">Levy·{(config.employerLevyRate * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline" className="text-[9px] font-semibold h-5 px-1.5 border-primary/30 text-primary">Sev·{(config.employerSeveranceRate * 100).toFixed(0)}%</Badge>
                  </div>
                )}
              </div>
              
              {configError && (
                <Alert variant="destructive" className="mb-2 py-1.5">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-[10px]">{configError}</AlertDescription>
                </Alert>
              )}
              
              <div className="rounded-lg border border-border/60 p-3 flex-1 flex flex-col">
                {/* Total Wages */}
                <div className="bg-muted/40 rounded-md px-3 py-2 mb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Wages (incl. Bonus)</p>
                  <p className="text-xl font-bold text-green-600 leading-tight">{formatCurrency(payrollCalc.totalWages)}</p>
                </div>

                {/* Employee Contributions */}
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Employee Contributions</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-border/40 px-2.5 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Social Security ({config ? `${(config.employeeSSRate * 100).toFixed(0)}%` : '5%'})</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(payrollCalc.employeeSS)}</p>
                    </div>
                    <div className="rounded-md border border-border/40 px-2.5 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
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
                      <p className="text-sm font-bold text-foreground">{formatCurrency(payrollCalc.employeeLevy)}</p>
                    </div>
                  </div>
                </div>

                {/* Employer Contributions */}
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Employer Contributions</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-md border border-border/40 px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">SS ({config ? `${(config.employerSSRate * 100).toFixed(0)}%` : '5%'})</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(payrollCalc.employerSS)}</p>
                    </div>
                    <div className="rounded-md border border-border/40 px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">EIB ({config ? `${(config.employerEIBRate * 100).toFixed(0)}%` : '1%'})</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(payrollCalc.employerEIB)}</p>
                    </div>
                    <div className="rounded-md border border-border/40 px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Levy ({config ? `${(config.employerLevyRate * 100).toFixed(0)}%` : '3%'})</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(payrollCalc.employerLevy)}</p>
                    </div>
                    <div className="rounded-md border border-border/40 px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Sev. ({config ? `${(config.employerSeveranceRate * 100).toFixed(0)}%` : '1%'})</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(payrollCalc.employerSeverance)}</p>
                    </div>
                  </div>
                  {(payrollCalc.isAgeExemptSS || payrollCalc.isAgeExemptLevy) && (
                    <div className="mt-1.5 flex gap-2">
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
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Penalties & Fines</p>
                    {penaltyData && penaltyData.daysLate > 0 && (
                      <Badge variant="destructive" className="text-[9px] h-5 px-1.5 ml-auto font-semibold gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {penaltyData.daysLate} days late
                      </Badge>
                    )}
                  </div>
                  {hasPenalties ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Levy Penalty</p>
                        <p className="text-sm font-bold text-destructive">{formatCurrency(penaltyData!.levyPenalty)}</p>
                      </div>
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Severance Penalty</p>
                        <p className="text-sm font-bold text-destructive">{formatCurrency(penaltyData!.severancePenalty)}</p>
                      </div>
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">SS Fine</p>
                        <p className="text-sm font-bold text-destructive">{formatCurrency(penaltyData!.ssFines)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border/40 bg-muted/10 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-muted-foreground">No penalties or fines applicable</p>
                    </div>
                  )}
                </div>

                {/* Net Pay */}
                <div className="mt-auto rounded-md border border-border/40 bg-muted/20 px-3 py-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Net Pay</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(netPay)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 bg-muted/20 px-5 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!isViewMode ? (
              <div className="flex items-center gap-3">
                <Switch
                  checked={localEmployee.isVerified}
                  onCheckedChange={(checked) => handleChange('isVerified', checked)}
                />
                <div>
                  <Label className="text-xs font-semibold">Mark as Verified</Label>
                  <p className="text-[10px] text-muted-foreground">Mark as verified before saving</p>
                </div>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} className="gap-1.5 h-9 text-xs px-4">
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              {!isViewMode && (
                <Button onClick={handleSave} disabled={!ssnValidated} className="gap-1.5 h-9 text-xs px-5 min-w-[130px]">
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
