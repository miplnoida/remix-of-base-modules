import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Save, X, Loader2, AlertCircle, User, CalendarDays, DollarSign, ShieldCheck, Gift, Palmtree, Clock } from 'lucide-react';
import { useEmployerValidation } from '@/hooks/useEmployerValidation';
import { getEnabledWeekTextboxes, getMondayCount, getMondaysInMonth } from '@/utils/weekCalculations';
import { useC3EmployeeCalculation, formatCurrency } from '@/hooks/useC3EmployeeCalculation';
import { useBonusPolicyCalculation } from '@/hooks/useBonusPolicyCalculation';
import { usePendingHolidayPay } from '@/hooks/useHolidayPayCalculation';
import { useHolidayPolicyLookup } from '@/hooks/useHolidayPolicyLookup';
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
  employeeSS?: number;
  employeeLevy?: number;
  employerSS?: number;
  employerLevy?: number;
  employerSeverance?: number;
  periodGross?: number;
  // New bonus/holiday metadata fields
  bonusDate?: string;
  bonusExemptLevy?: boolean;
  holidayStartDate?: string;
  holidayEndDate?: string;
  holidayNoDates?: boolean;
}

export interface PenaltyFinesData {
  levyPenalty: number;
  severancePenalty: number;
  ssFines: number;
  daysLate: number;
  monthsLate: number;
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
  receivedDate?: string;
  penaltyData?: PenaltyFinesData;
  allEmployees?: EmployeeData[];
}

export default function EmployeeModal({
  isOpen,
  onClose,
  employee,
  onSave,
  isViewMode = false,
  periodYear,
  periodMonth,
  receivedDate,
  penaltyData,
  allEmployees
}: EmployeeModalProps) {
  const { validateEmployee, isValidating } = useEmployerValidation();
  const { config, isLoading: isLoadingConfig, error: configError, calculate } = useC3EmployeeCalculation(periodYear, periodMonth);
  const { result: bonusPolicyResult, isCalculating: isBonusCalcRunning, error: bonusPolicyError, calculate: calcBonusPolicy, reset: resetBonusPolicy } = useBonusPolicyCalculation();
  
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
    dateOfBirth: '',
    bonusDate: '',
    bonusExemptLevy: false,
    holidayStartDate: '',
    holidayEndDate: '',
    holidayNoDates: false
  });

  // Pending holiday pay hook
  const { pendingPay, totalPending, isLoading: isPendingLoading } = usePendingHolidayPay(
    localEmployee.ssn, periodYear, periodMonth
  );

  // Holiday policy lookup based on checkbox state (with_dates vs without_dates)
  const holidayPolicyLookup = useHolidayPolicyLookup(
    periodYear,
    periodMonth,
    localEmployee.days?.[6] ?? false,
    localEmployee.holidayNoDates ?? false,
    localEmployee.holidayStartDate || '',
    localEmployee.holidayEndDate || '',
    localEmployee.weeklyWages?.[6] ?? 0
  );

  const [ssnError, setSsnError] = useState<string>('');
  const [ssnValidated, setSsnValidated] = useState(false);
  const [pendingPayPeriod, setPendingPayPeriod] = useState<string | null>(null);
  const [showPayPeriodConfirm, setShowPayPeriodConfirm] = useState(false);
  const [defaultPayPeriodFetched, setDefaultPayPeriodFetched] = useState(false);
  const [holidayDateError, setHolidayDateError] = useState('');
  const [bonusDateError, setBonusDateError] = useState('');

  // Track if auto-fill has been applied
  const autoFillAppliedRef = useRef(false);

  // Server-side recalculated penalty data for Edit mode
  const [livePenalty, setLivePenalty] = useState<PenaltyFinesData | null>(null);
  const [isPenaltyCalculating, setIsPenaltyCalculating] = useState(false);
  const penaltyDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Server-authoritative per-employee calculation from RPC (includes bonus policy)
  const [serverEmployeeCalc, setServerEmployeeCalc] = useState<any>(null);

  // The effective penalty data: use live recalculated in Edit mode, otherwise prop
  const effectivePenalty = useMemo(() => {
    if (!isViewMode && livePenalty) return livePenalty;
    return penaltyData || { levyPenalty: 0, severancePenalty: 0, ssFines: 0, daysLate: 0, monthsLate: 0, totalLateCharges: 0 };
  }, [isViewMode, livePenalty, penaltyData]);

  // Auto-calculate Term Start Date as the first date of the selected Period month
  const periodTermStartDate = useMemo(() => {
    const monthStr = String(periodMonth + 1).padStart(2, '0');
    return `${periodYear}-${monthStr}-01`;
  }, [periodYear, periodMonth]);

  // Calculate enabled weeks based on period
  const safePeriodYear = isNaN(periodYear) ? new Date().getFullYear() : periodYear;
  const safePeriodMonth = isNaN(periodMonth) ? new Date().getMonth() : periodMonth;
  const mondayCount = getMondayCount(safePeriodYear, safePeriodMonth);
  const mondays = getMondaysInMonth(safePeriodYear, safePeriodMonth);
  const enabledWeekCheckboxes = [true, true, true, true, mondayCount >= 5];

  const enabledTextboxes = useMemo(() => {
    return getEnabledWeekTextboxes(
      localEmployee.payPeriod || 'Monthly',
      safePeriodYear,
      safePeriodMonth,
      localEmployee.termStartDate
    ) || [false, false, false, false, false];
  }, [localEmployee.payPeriod, safePeriodYear, safePeriodMonth, localEmployee.termStartDate]);

  // Which week indices are "generated" (exist in this month)
  const generatedWeekIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < mondayCount && i < 5; i++) {
      indices.push(i);
    }
    return indices;
  }, [mondayCount]);

  // Compute effective wages: zero out amounts for unchecked slots
  const effectiveWages = useMemo(() => {
    return localEmployee.weeklyWages.map((w, i) => {
      if (i < 5) return (localEmployee.days?.[i] && enabledTextboxes?.[i]) ? w : 0;
      if (i === 5) return localEmployee.days?.[5] ? w : 0;
      if (i === 6) return localEmployee.days?.[6] ? w : 0;
      return w;
    });
  }, [localEmployee.weeklyWages, localEmployee.days, enabledTextboxes]);

  // Stable string key for effectiveWages to prevent useEffect re-triggers on same values
  const effectiveWagesKey = effectiveWages.join(',');

  // Calculate payroll contributions using database-driven C3 configuration (client-side fallback)
  const clientPayrollCalc = useMemo(() => {
    return calculate({
      weeklyWages: effectiveWages,
      payPeriod: localEmployee.payPeriod || 'Monthly',
      dateOfBirth: localEmployee.dateOfBirth || '',
      termStartDate: localEmployee.termStartDate || ''
    });
  }, [effectiveWages, localEmployee.payPeriod, localEmployee.termStartDate, localEmployee.dateOfBirth, calculate]);

  // Trigger server-side bonus policy calculation when bonus amount changes
  useEffect(() => {
    const bonusAmount = effectiveWages[5] || 0;
    if (bonusAmount > 0 && isOpen) {
      calcBonusPolicy({
        periodYear,
        periodMonth,
        bonusAmount,
        weeklyWages: effectiveWages,
        payPeriod: localEmployee.payPeriod || 'Monthly',
        dateOfBirth: localEmployee.dateOfBirth || '',
        termStartDate: localEmployee.termStartDate || periodTermStartDate,
      });
    } else {
      resetBonusPolicy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveWagesKey, localEmployee.payPeriod, localEmployee.dateOfBirth, localEmployee.termStartDate, periodYear, periodMonth, isOpen]);

  // Use server-authoritative result: prefer RPC per-employee calc (includes bonus policy + penalties consistency),
  // then edge function result for quick preview, then client calc as fallback
  const payrollCalc = useMemo(() => {
    if (serverEmployeeCalc) {
      return {
        ...clientPayrollCalc,
        totalWages: serverEmployeeCalc.totalWages,
        taxableWages: serverEmployeeCalc.taxableWages,
        employeeSS: serverEmployeeCalc.employeeSS,
        employeeLevy: serverEmployeeCalc.employeeLevy,
        employerSS: serverEmployeeCalc.employerSS ?? serverEmployeeCalc.employerSSTotal,
        employerEIB: serverEmployeeCalc.employerEIB,
        employerSSTotal: serverEmployeeCalc.employerSSTotal,
        employerLevy: serverEmployeeCalc.employerLevy,
        employerSeverance: serverEmployeeCalc.employerSeverance,
        isAgeExemptSS: serverEmployeeCalc.isAgeExemptSS,
        isAgeExemptLevy: serverEmployeeCalc.isAgeExemptLevy,
        periodGross: serverEmployeeCalc.periodGross,
      };
    }
    if (bonusPolicyResult && (effectiveWages[5] || 0) > 0) {
      return {
        ...clientPayrollCalc,
        totalWages: bonusPolicyResult.totalWages,
        taxableWages: bonusPolicyResult.taxableWages,
        employeeSS: bonusPolicyResult.employeeSS,
        employeeLevy: bonusPolicyResult.employeeLevy,
        employerSS: bonusPolicyResult.employerSS,
        employerEIB: bonusPolicyResult.employerEIB,
        employerSSTotal: bonusPolicyResult.employerSSTotal,
        employerLevy: bonusPolicyResult.employerLevy,
        employerSeverance: bonusPolicyResult.employerSeverance,
        isAgeExemptSS: bonusPolicyResult.isAgeExemptSS,
        isAgeExemptLevy: bonusPolicyResult.isAgeExemptLevy,
        periodGross: bonusPolicyResult.periodGross,
      };
    }
    return clientPayrollCalc;
  }, [serverEmployeeCalc, clientPayrollCalc, bonusPolicyResult, effectiveWages]);

  // Debounced server-side penalty recalculation when wages change in Edit mode
  // Uses ALL employees (substituting the current one's wages) for correct C3-level penalties
  useEffect(() => {
    if (isViewMode || !isOpen) return;
    const hasWages = effectiveWages.some(w => w > 0);
    if (!hasWages || !receivedDate) {
      setLivePenalty({ levyPenalty: 0, severancePenalty: 0, ssFines: 0, daysLate: 0, monthsLate: 0, totalLateCharges: 0 });
      return;
    }

    if (penaltyDebounceRef.current) clearTimeout(penaltyDebounceRef.current);

    penaltyDebounceRef.current = setTimeout(async () => {
      setIsPenaltyCalculating(true);
      setServerEmployeeCalc(null); // Clear stale values while recalculating
      try {
        // Build the current employee's data with live wages
        const currentEmpData = {
          ssn: localEmployee.ssn || '000000',
          name: localEmployee.name || 'Employee',
          week1: effectiveWages[0] || 0,
          week2: effectiveWages[1] || 0,
          week3: effectiveWages[2] || 0,
          week4: effectiveWages[3] || 0,
          week5: effectiveWages[4] || 0,
          bonus: effectiveWages[5] || 0,
          holiday: effectiveWages[6] || 0,
          payPeriod: localEmployee.payPeriod || 'Monthly',
          termStartDate: localEmployee.termStartDate || periodTermStartDate,
          dateOfBirth: localEmployee.dateOfBirth || null,
          holidayStartDate: localEmployee.holidayNoDates ? null : (localEmployee.holidayStartDate || null),
          holidayEndDate: localEmployee.holidayNoDates ? null : (localEmployee.holidayEndDate || null),
          holidayNoDates: localEmployee.holidayNoDates ? 'true' : 'false'
        };

        // Build full employee list: replace edited employee, keep others as-is
        let fullEmployeeData: any[];
        if (allEmployees && allEmployees.length > 0) {
          fullEmployeeData = allEmployees.map(emp => {
            // Match by SSN to substitute the currently edited employee
            if (emp.ssn === localEmployee.ssn) {
              return currentEmpData;
            }
            return {
              ssn: emp.ssn || '000000',
              name: emp.name || 'Employee',
              week1: emp.weeklyWages?.[0] || 0,
              week2: emp.weeklyWages?.[1] || 0,
              week3: emp.weeklyWages?.[2] || 0,
              week4: emp.weeklyWages?.[3] || 0,
              week5: emp.weeklyWages?.[4] || 0,
              bonus: emp.weeklyWages?.[5] || 0,
              holiday: emp.weeklyWages?.[6] || 0,
              payPeriod: emp.payPeriod || 'Monthly',
              termStartDate: emp.termStartDate || null,
              dateOfBirth: emp.dateOfBirth || null,
              holidayStartDate: emp.holidayNoDates ? null : (emp.holidayStartDate || null),
              holidayEndDate: emp.holidayNoDates ? null : (emp.holidayEndDate || null),
              holidayNoDates: emp.holidayNoDates ? 'true' : 'false'
            };
          });
          // If this is a new employee (not found by SSN), add them
          if (!allEmployees.some(emp => emp.ssn === localEmployee.ssn)) {
            fullEmployeeData.push(currentEmpData);
          }
        } else {
          fullEmployeeData = [currentEmpData];
        }

        const { data, error } = await supabase.rpc('calculate_c3_contributions', {
          p_period_year: periodYear,
          p_period_month: periodMonth,
          p_received_date: receivedDate,
          p_employee_data: fullEmployeeData
        });

        if (!error && data) {
          const result = typeof data === 'string' ? JSON.parse(data) : data;
          if (result.success && result.totals) {
            setLivePenalty({
              levyPenalty: result.totals.levyPenalty || 0,
              severancePenalty: result.totals.severancePenalty || 0,
              ssFines: result.totals.ssFine || 0,
              daysLate: result.totals.daysLate || 0,
              monthsLate: result.totals.monthsLate || 0,
              totalLateCharges: result.totals.totalLateCharges || 0
            });
            // Extract current employee's per-employee calc from RPC for consistent display
            if (result.employees && Array.isArray(result.employees)) {
              const matchSsn = localEmployee.ssn || '000000';
              const empCalc = result.employees.find((e: any) => e.ssn === matchSsn);
              if (empCalc) {
                setServerEmployeeCalc(empCalc);
              }
            }
          }
        }
      } catch (err) {
        console.error('Penalty recalculation error:', err);
      } finally {
        setIsPenaltyCalculating(false);
      }
    }, 600);

    return () => {
      if (penaltyDebounceRef.current) clearTimeout(penaltyDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewMode, isOpen, effectiveWagesKey, localEmployee.payPeriod, localEmployee.dateOfBirth, localEmployee.termStartDate, localEmployee.ssn, localEmployee.name, receivedDate, periodYear, periodMonth, periodTermStartDate, allEmployees]);

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
        termStartDate: periodTermStartDate,
        bonusDate: employee.bonusDate || '',
        bonusExemptLevy: employee.bonusExemptLevy || false,
        holidayStartDate: employee.holidayStartDate || '',
        holidayEndDate: employee.holidayEndDate || '',
        holidayNoDates: employee.holidayNoDates || false
      });
      setSsnValidated(true);
      setSsnError('');
      setWageInputValues(safeWages.map(w => w === 0 ? '' : String(w)));
      setLivePenalty(null);
      setServerEmployeeCalc(null);
      autoFillAppliedRef.current = true; // Existing data = don't auto-fill
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
        dateOfBirth: '',
        bonusDate: '',
        bonusExemptLevy: false,
        holidayStartDate: '',
        holidayEndDate: '',
        holidayNoDates: false
      });
      setSsnValidated(false);
      setSsnError('');
      setDefaultPayPeriodFetched(false);
      setWageInputValues(['', '', '', '', '', '', '']);
      setLivePenalty(null);
      setServerEmployeeCalc(null);
      autoFillAppliedRef.current = false;
    }
    setHolidayDateError('');
    setBonusDateError('');
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

  // When pay period changes: reset auto-fill flag AND auto-mark all generated weeks as Present
  useEffect(() => {
    if (isViewMode) return;
    autoFillAppliedRef.current = false;

    // Auto-mark all generated weeks as present when pay period is selected/changed
    if (localEmployee.payPeriod) {
      setLocalEmployee(prev => {
        const newDays = [...prev.days];
        for (const idx of generatedWeekIndices) {
          newDays[idx] = true;
        }
        return { ...prev, days: newDays };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localEmployee.payPeriod]);

  const handleSSNBlur = useCallback(async () => {
    if (localEmployee.ssn && localEmployee.ssn.length === 6) {
      // Check for duplicate SSN when adding a new employee (not editing)
      if (!employee && allEmployees) {
        const isDuplicate = allEmployees.some(emp => emp.ssn === localEmployee.ssn);
        if (isDuplicate) {
          setSsnError('This SSN already exists in this C3. Duplicate employees are not allowed.');
          setSsnValidated(false);
          return;
        }
      }
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
  }, [localEmployee.ssn, validateEmployee, employee, allEmployees]);

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
      // Preserve presence (days) — only reset wage amounts
      const newWages = [...localEmployee.weeklyWages];
      for (let i = 0; i < 5; i++) newWages[i] = 0;
      setLocalEmployee(prev => ({
        ...prev,
        payPeriod: pendingPayPeriod,
        weeklyWages: newWages
      }));
      const newInputValues = [...wageInputValues];
      for (let i = 0; i < 5; i++) newInputValues[i] = '';
      setWageInputValues(newInputValues);
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
    // For weeks 0-4: only check if the Monday exists in this month
    if (index < 5 && !enabledWeekCheckboxes[index]) return;

    const newDays = [...localEmployee.days];
    const wasChecked = newDays[index];
    newDays[index] = !wasChecked;

    // When unchecking, clear the amount for that slot
    if (wasChecked) {
      const newWages = [...localEmployee.weeklyWages];
      newWages[index] = 0;
      const newInputValues = [...wageInputValues];
      newInputValues[index] = '';
      setWageInputValues(newInputValues);
      setLocalEmployee(prev => ({
        ...prev,
        days: newDays,
        weeklyWages: newWages
      }));
    } else {
      setLocalEmployee(prev => ({
        ...prev,
        days: newDays
      }));
    }
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
    
    const numValue = parseFloat(cleanValue) || 0;
    if (numValue < 0) return;

    const newInputValues = [...wageInputValues];
    const newWages = [...localEmployee.weeklyWages];
    const newDays = [...localEmployee.days];

    newInputValues[index] = cleanValue;
    newWages[index] = numValue;

    // Auto-fill logic: if all week amounts (0-4 within generated weeks) are blank and user enters a value
    if (index < 5 && !autoFillAppliedRef.current && numValue > 0) {
      const allWeeksBlanks = generatedWeekIndices.every(i => {
        if (i === index) return true; // Skip current
        return (localEmployee.weeklyWages[i] || 0) === 0;
      });

      if (allWeeksBlanks) {
        // Auto-fill all generated weeks with the same amount
        for (const i of generatedWeekIndices) {
          newWages[i] = numValue;
          newInputValues[i] = cleanValue;
          newDays[i] = true;
        }
        autoFillAppliedRef.current = true;
      }
    }

    setWageInputValues(newInputValues);
    setLocalEmployee(prev => ({
      ...prev,
      weeklyWages: newWages,
      days: newDays
    }));
  };

  // Validate bonus date within selected month
  const validateBonusDate = (dateStr: string): boolean => {
    if (!dateStr) { setBonusDateError(''); return true; }
    const d = new Date(dateStr);
    if (d.getFullYear() !== safePeriodYear || d.getMonth() !== safePeriodMonth) {
      setBonusDateError('Bonus date must be within the selected month');
      return false;
    }
    setBonusDateError('');
    return true;
  };

  // Validate holiday dates
  const validateHolidayDates = (start: string, end: string): boolean => {
    if (!start || !end) { setHolidayDateError(''); return true; }
    if (new Date(end) < new Date(start)) {
      setHolidayDateError('End date cannot be before start date');
      return false;
    }
    setHolidayDateError('');
    return true;
  };

  const handleSave = () => {
    if (!ssnValidated) {
      setSsnError('Please enter a valid SSN');
      return;
    }
    // Final duplicate check on save (guards against race conditions)
    if (!employee && allEmployees) {
      const isDuplicate = allEmployees.some(emp => emp.ssn === localEmployee.ssn);
      if (isDuplicate) {
        setSsnError('This SSN already exists in this C3. Duplicate employees are not allowed.');
        return;
      }
    }

    if (localEmployee.bonusDate && !validateBonusDate(localEmployee.bonusDate)) return;
    if (localEmployee.holidayStartDate && localEmployee.holidayEndDate && !validateHolidayDates(localEmployee.holidayStartDate, localEmployee.holidayEndDate)) return;

    // Holiday policy validation: block save if holiday is enabled but policy lookup fails
    if (localEmployee.days?.[6] && (localEmployee.weeklyWages?.[6] ?? 0) > 0) {
      if (!holidayPolicyLookup.canSaveHoliday) {
        setHolidayDateError(holidayPolicyLookup.holidayValidationError || 'Holiday pay configuration issue. Cannot save.');
        return;
      }
    }
    
    const savedEmployee: EmployeeData = {
      ...localEmployee,
      weeklyWages: effectiveWages,
      totalWages: payrollCalc.totalWages,
      hssdLevy: payrollCalc.employeeLevy, 
      socialSecurity: payrollCalc.employeeSS,
      employeeSS: payrollCalc.employeeSS,
      employeeLevy: payrollCalc.employeeLevy,
      employerSS: payrollCalc.employerSSTotal,
      employerLevy: payrollCalc.employerLevy,
      employerSeverance: payrollCalc.employerSeverance,
      periodGross: payrollCalc.totalWages,
      // Clear bonus/holiday metadata if their checkboxes are unchecked
      bonusDate: localEmployee.days?.[5] ? localEmployee.bonusDate : '',
      bonusExemptLevy: localEmployee.days?.[5] ? localEmployee.bonusExemptLevy : false,
      holidayStartDate: localEmployee.days?.[6] ? localEmployee.holidayStartDate : '',
      holidayEndDate: localEmployee.days?.[6] ? localEmployee.holidayEndDate : '',
      holidayNoDates: localEmployee.days?.[6] ? localEmployee.holidayNoDates : false,
    };
    
    onSave(savedEmployee);
    onClose();
  };

  const isWeekFieldEnabled = (index: number) => {
    if (index < 5) {
      // Payment input: editable only if pay-period allows it AND presence is marked
      return localEmployee.days?.[index] && enabledTextboxes?.[index];
    }
    if (index === 5) return localEmployee.days?.[5] ?? false;
    if (index === 6) return localEmployee.days?.[6] ?? false;
    return false;
  };

  // Computed totals
  const employeeTotal = payrollCalc.employeeSS + payrollCalc.employeeLevy;
  const employerTotal = payrollCalc.employerSS + payrollCalc.employerEIB + payrollCalc.employerLevy + payrollCalc.employerSeverance;
  const penaltiesTotal = (effectivePenalty.levyPenalty || 0) + (effectivePenalty.severancePenalty || 0) + (effectivePenalty.ssFines || 0);
  const netPay = employeeTotal + employerTotal + penaltiesTotal;

  const modalTitle = isViewMode ? 'View Employee' : (employee ? 'Edit Employee' : 'Add New Employee');

  // Format monday date for display
  const formatMondayDate = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Period min/max dates for bonus date validation
  const periodMonthStart = `${safePeriodYear}-${String(safePeriodMonth + 1).padStart(2, '0')}-01`;
  const periodMonthEnd = useMemo(() => {
    const lastDay = new Date(safePeriodYear, safePeriodMonth + 1, 0).getDate();
    return `${safePeriodYear}-${String(safePeriodMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }, [safePeriodYear, safePeriodMonth]);

  const hasPayPeriodSelected = !!localEmployee.payPeriod;

  return (
    <>
    <AlertDialog open={showPayPeriodConfirm} onOpenChange={setShowPayPeriodConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Pay Period?</AlertDialogTitle>
          <AlertDialogDescription>
            Changing the pay period will reset all entered wage amounts. Presence selections will be preserved.
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
      <DialogContent className="max-h-[94vh] overflow-hidden p-0 flex flex-col w-[96vw] max-w-[1080px] sm:rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-3 border-b border-border/50 flex-shrink-0">
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight">{modalTitle}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0">
                  {isViewMode ? 'Viewing employee contribution details' : 'Enter employee details and wage information'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          {/* Employee Info Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="ssn" className="text-xs font-medium text-muted-foreground">SSN <span className="text-destructive">*</span></Label>
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
                  className={`h-9 text-sm ${ssnError ? 'border-destructive focus-visible:ring-destructive' : ssnValidated ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                {isValidating && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                {ssnValidated && !isValidating && <Check className="absolute right-2 top-2 h-4 w-4 text-green-500" />}
              </div>
              {ssnError && <p className="text-xs text-destructive leading-tight">{ssnError}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="employeeName" className="text-xs font-medium text-muted-foreground">Employee Name</Label>
              <Input id="employeeName" value={localEmployee.name} readOnly disabled className="h-9 text-sm bg-muted/50 font-medium" placeholder="Auto-populated" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="termStartDate" className="text-xs font-medium text-muted-foreground">Term Start</Label>
              <Input id="termStartDate" type="date" value={periodTermStartDate} readOnly disabled className="h-9 text-sm bg-muted/50" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payPeriod" className="text-xs font-medium text-muted-foreground">Pay Period <span className="text-destructive">*</span></Label>
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

          {/* Two-column layout: Left (Presence + Payment) | Right (Bonus + Holiday) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Column: Presence + Weekly Payment */}
            <div className="flex flex-col gap-3">
              {/* Weekly Presence */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                  <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Weekly Presence</h3>
                  <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 ml-auto border-blue-300 text-blue-700">
                    {mondayCount} {mondayCount === 1 ? 'Monday' : 'Mondays'}
                  </Badge>
                </div>
                <p className="text-[10px] text-blue-600/80 mb-2">Mark which weeks the employee was present</p>
                <div className="flex flex-wrap gap-1.5">
                  {generatedWeekIndices.map((weekIdx) => {
                    const isChecked = localEmployee.days?.[weekIdx] || false;
                    const mondayDate = mondays[weekIdx];
                    return (
                      <div
                        key={weekIdx}
                        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 cursor-pointer transition-all select-none ${
                          isChecked ? 'bg-green-50 border-green-400 shadow-sm ring-1 ring-green-300' : 'bg-background border-blue-200 hover:bg-blue-100/50'
                        }`}
                        onClick={() => !isViewMode && handleWeekToggle(weekIdx)}
                      >
                        <div className={`h-4 w-4 min-w-[1rem] border rounded flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-green-500 border-green-600' : 'bg-background border-input'
                        }`}>
                          {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className={`text-xs font-medium ${isChecked ? 'text-green-800' : 'text-foreground'}`}>Wk {weekIdx + 1}</span>
                          {mondayDate && <span className="text-[9px] text-muted-foreground">{formatMondayDate(mondayDate)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Payment */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Weekly Payment</h3>
                  {localEmployee.payPeriod && (
                    <Badge variant="secondary" className="text-[10px] font-normal h-5 px-1.5 ml-auto bg-emerald-100 text-emerald-700 border-emerald-300">
                      {localEmployee.payPeriod}
                    </Badge>
                  )}
                </div>
                {!hasPayPeriodSelected ? (
                  <div className="rounded-md border border-dashed border-emerald-300 bg-background p-4 text-center">
                    <p className="text-xs text-muted-foreground">Select a Pay Period above to configure weekly wages</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {generatedWeekIndices.map((weekIdx) => {
                      const isPayEditable = enabledTextboxes[weekIdx];
                      const isPresent = localEmployee.days?.[weekIdx] || false;
                      const fieldEnabled = isPresent && isPayEditable;
                      const mondayDate = mondays[weekIdx];
                      return (
                        <div key={weekIdx} className={`flex items-center gap-2 rounded-md border border-emerald-200/80 px-2.5 py-1.5 ${fieldEnabled ? 'bg-background' : 'bg-muted/30'}`}>
                          <div className="flex items-center gap-1.5 min-w-[6rem]">
                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isPresent ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            <div className="flex flex-col">
                              <span className={`text-xs font-medium ${isPayEditable ? 'text-foreground' : 'text-muted-foreground'}`}>Week {weekIdx + 1}</span>
                              {mondayDate && <span className="text-[10px] text-muted-foreground leading-tight">Mon {formatMondayDate(mondayDate)}</span>}
                            </div>
                          </div>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={wageInputValues[weekIdx] ?? (localEmployee.weeklyWages[weekIdx] === 0 ? '' : String(localEmployee.weeklyWages[weekIdx]))}
                            onChange={(e) => handleWageChange(weekIdx, e.target.value)}
                            className="h-7 text-right min-w-0 flex-1 border border-input shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 font-mono text-xs"
                            placeholder="0.00"
                            disabled={!fieldEnabled || isViewMode}
                          />
                          {!isPayEditable && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1 flex-shrink-0">
                              {localEmployee.payPeriod === 'Monthly' ? 'auto' : 'N/A'}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Bonus + Holiday Pay */}
            <div className="flex flex-col gap-3">
              {/* Bonus */}
              {hasPayPeriodSelected && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gift className="h-3.5 w-3.5 text-amber-600" />
                    <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Bonus</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 min-w-[1.25rem] border rounded flex items-center justify-center transition-colors cursor-pointer hover:bg-amber-100/50 ${
                          localEmployee.days?.[5] ? 'bg-primary border-primary shadow-sm' : 'bg-background border-amber-300'
                        }`}
                        onClick={() => handleWeekToggle(5)}
                      >
                        {localEmployee.days?.[5] && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="text-xs font-medium text-amber-800 w-20">Amount</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={wageInputValues[5] ?? (localEmployee.weeklyWages[5] === 0 ? '' : String(localEmployee.weeklyWages[5]))}
                        onChange={(e) => handleWageChange(5, e.target.value)}
                        className="h-7 text-right min-w-0 flex-1 border border-input shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 font-mono text-xs"
                        placeholder="0.00"
                        disabled={!isWeekFieldEnabled(5) || isViewMode}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Holiday Pay */}
              {hasPayPeriodSelected && (
                <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Palmtree className="h-3.5 w-3.5 text-teal-600" />
                    <h3 className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Holiday Pay</h3>
                    {totalPending > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 ml-auto border-teal-400 bg-teal-100 text-teal-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending: {formatCurrency(totalPending)}
                      </Badge>
                    )}
                  </div>

                  {/* Pending holiday pay alert */}
                  {totalPending > 0 && localEmployee.days?.[6] && (
                    <Alert className="mb-2 py-1.5 border-teal-300 bg-teal-50">
                      <Clock className="h-3.5 w-3.5 text-teal-600" />
                      <AlertDescription className="text-[10px] text-teal-800">
                        {pendingPay.length} pending holiday pay record(s) totaling <strong>{formatCurrency(totalPending)}</strong> from prior C3 period(s) will be auto-applied by the backend.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 min-w-[1.25rem] border rounded flex items-center justify-center transition-colors cursor-pointer hover:bg-teal-100/50 ${
                          localEmployee.days?.[6] ? 'bg-primary border-primary shadow-sm' : 'bg-background border-teal-300'
                        }`}
                        onClick={() => handleWeekToggle(6)}
                      >
                        {localEmployee.days?.[6] && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="text-xs font-medium text-teal-800 w-20">Amount</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={wageInputValues[6] ?? (localEmployee.weeklyWages[6] === 0 ? '' : String(localEmployee.weeklyWages[6]))}
                        onChange={(e) => handleWageChange(6, e.target.value)}
                        className="h-7 text-right min-w-0 flex-1 border border-input shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 font-mono text-xs"
                        placeholder="0.00"
                        disabled={!isWeekFieldEnabled(6) || isViewMode}
                      />
                    </div>
                    {localEmployee.days?.[6] && (
                      <>
                        {/* No-dates toggle */}
                        <div className="flex items-center gap-2 pl-7">
                          <div
                            className={`h-4 w-4 min-w-[1rem] border rounded flex items-center justify-center transition-colors cursor-pointer ${
                              localEmployee.holidayNoDates ? 'bg-primary border-primary' : 'bg-background border-input'
                            }`}
                            onClick={() => {
                              if (!isViewMode) {
                                const newVal = !localEmployee.holidayNoDates;
                                setLocalEmployee(prev => ({
                                  ...prev,
                                  holidayNoDates: newVal,
                                  holidayStartDate: newVal ? '' : prev.holidayStartDate,
                                  holidayEndDate: newVal ? '' : prev.holidayEndDate
                                }));
                                setHolidayDateError('');
                              }
                            }}
                          >
                            {localEmployee.holidayNoDates && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground">Holiday pay does not belong to any dates</span>
                        </div>

                        {/* Date inputs (hidden when no-dates is checked) */}
                        {!localEmployee.holidayNoDates && (
                          <div className="flex items-center gap-3 pl-7">
                            <div className="flex-1 space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">Start Date</Label>
                              <Input
                                type="date"
                                value={localEmployee.holidayStartDate || ''}
                                onChange={(e) => {
                                  handleChange('holidayStartDate', e.target.value);
                                  validateHolidayDates(e.target.value, localEmployee.holidayEndDate || '');
                                }}
                                className="h-7 text-xs"
                                disabled={isViewMode}
                              />
                            </div>
                            <div className="flex-1 space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">End Date</Label>
                              <Input
                                type="date"
                                value={localEmployee.holidayEndDate || ''}
                                onChange={(e) => {
                                  handleChange('holidayEndDate', e.target.value);
                                  validateHolidayDates(localEmployee.holidayStartDate || '', e.target.value);
                                }}
                                className="h-7 text-xs"
                                disabled={isViewMode}
                              />
                            </div>
                          </div>
                        )}

                        {/* Holiday policy status - driven by real-time DB lookup */}
                        {(localEmployee.weeklyWages?.[6] ?? 0) > 0 && (
                          <div className={`ml-7 flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${
                            holidayPolicyLookup.defaultPolicyLoading
                              ? 'border-muted bg-muted/30'
                              : holidayPolicyLookup.defaultPolicyFound
                                ? 'border-teal-300 bg-teal-50/60'
                                : 'border-destructive/40 bg-destructive/5'
                          }`}>
                            {holidayPolicyLookup.defaultPolicyLoading ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /> Looking up holiday policy…
                              </div>
                            ) : holidayPolicyLookup.defaultPolicyFound ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Check className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
                                <span className="text-xs font-medium text-teal-800">
                                  Holiday policy applied ({holidayPolicyLookup.defaultPolicyType === 'with_dates' ? 'with_dates' : 'without_dates'})
                                </span>
                                {holidayPolicyLookup.exceptionPolicyFound && (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-teal-400 text-teal-700 ml-auto">
                                    Exception active
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1">
                                <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                                <span className="text-xs font-medium text-destructive">
                                  {holidayPolicyLookup.holidayValidationError || `No active holiday pay policy configured for "${localEmployee.holidayNoDates ? 'Without Dates' : 'With Dates'}" for this period.`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Exception policy status */}
                        {(localEmployee.weeklyWages?.[6] ?? 0) > 0 && !holidayPolicyLookup.exceptionPolicyLoading && !holidayPolicyLookup.exceptionPolicyFound && holidayPolicyLookup.defaultPolicyFound && (
                          <div className="ml-7 flex items-center gap-2 rounded-md border border-muted bg-muted/20 px-2.5 py-1.5">
                            <span className="text-[10px] text-muted-foreground">No holiday pay exception policy configured for this period.</span>
                          </div>
                        )}
                      </>
                    )}
                    {holidayDateError && <p className="text-[10px] text-destructive pl-7">{holidayDateError}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Calculations — full width below */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-slate-600" />
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Calculations</h3>
              {isLoadingConfig && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
              )}
              {config && (
                <div className="flex items-center gap-1 ml-auto">
                  <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 border-slate-300">SS:{(config.employeeSSRate * 100).toFixed(0)}%</Badge>
                  <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 border-slate-300">Levy:{(config.employerLevyRate * 100).toFixed(0)}%</Badge>
                  <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 border-slate-300">Sev:{(config.employerSeveranceRate * 100).toFixed(0)}%</Badge>
                </div>
              )}
            </div>
            
            {configError && (
              <Alert variant="destructive" className="mb-1.5 py-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">{configError}</AlertDescription>
              </Alert>
            )}

            {/* Calculations grid — horizontal layout on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Total Wages */}
              <div className="rounded-md border border-slate-200 bg-background p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Wages (incl. Bonus)</p>
                <p className="text-base font-bold text-foreground leading-tight mt-0.5">{formatCurrency(payrollCalc.totalWages)}</p>
              </div>

              {/* Employee Contributions */}
              <div className="rounded-md border border-blue-200 bg-blue-50/30 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">SS ({config ? `${(config.employeeSSRate * 100).toFixed(0)}%` : '5%'})</p>
                    <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employeeSS)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Levy ({payrollCalc.usedMonthlyLevyLogic ? 'mth' : 'wk'}
                      )
                    </p>
                    <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employeeLevy)}</p>
                  </div>
                </div>
              </div>

              {/* Employer Contributions */}
              <div className="rounded-md border border-emerald-200 bg-emerald-50/30 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employer</p>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground">SS ({config ? `${(config.employerSSRate * 100).toFixed(0)}%` : '5%'})</p>
                    <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerSS)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">EIB ({config ? `${(config.employerEIBRate * 100).toFixed(0)}%` : '1%'})</p>
                    <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerEIB)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Levy ({config ? `${(config.employerLevyRate * 100).toFixed(0)}%` : '3%'})</p>
                    <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerLevy)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Sev. ({config ? `${(config.employerSeveranceRate * 100).toFixed(0)}%` : '1%'})</p>
                    <p className="text-sm font-bold text-foreground leading-tight">{formatCurrency(payrollCalc.employerSeverance)}</p>
                  </div>
                </div>
                {(payrollCalc.isAgeExemptSS || payrollCalc.isAgeExemptLevy) && (
                  <div className="mt-1.5 pt-1 border-t border-emerald-200 flex gap-2">
                    {payrollCalc.isAgeExemptSS && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-0.5">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" /> SS exempt
                      </p>
                    )}
                    {payrollCalc.isAgeExemptLevy && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-0.5">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" /> Levy exempt
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Penalties & Fines */}
              <div className={`rounded-md border p-2.5 ${penaltiesTotal > 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-background'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`h-2 w-2 rounded-full ${penaltiesTotal > 0 ? 'bg-destructive' : 'bg-muted-foreground/40'}`} />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Penalties</p>
                  {isPenaltyCalculating && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
                  )}
                  {effectivePenalty.monthsLate > 0 && (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1.5 ml-auto">{effectivePenalty.monthsLate}m late</Badge>
                  )}
                  {effectivePenalty.daysLate > 0 && effectivePenalty.monthsLate === 0 && (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1.5 ml-auto">{effectivePenalty.daysLate}d late</Badge>
                  )}
                </div>
                {penaltiesTotal > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex justify-between items-baseline">
                      <p className="text-[10px] text-muted-foreground">Levy</p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(effectivePenalty.levyPenalty)}</p>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <p className="text-[10px] text-muted-foreground">Sev.</p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(effectivePenalty.severancePenalty)}</p>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <p className="text-[10px] text-muted-foreground">SS Fine</p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(effectivePenalty.ssFines)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No penalties</p>
                )}
              </div>
            </div>

            {/* Net Pay row inside calculations */}
            <div className="mt-3 pt-2.5 border-t border-slate-300/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                    Employee: <strong className="text-foreground">{formatCurrency(employeeTotal)}</strong>
                  </span>
                  <span className="text-muted-foreground/60">+</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Employer: <strong className="text-foreground">{formatCurrency(employerTotal)}</strong>
                  </span>
                  <span className="text-muted-foreground/60">+</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                    Penalties: <strong className="text-foreground">{formatCurrency(penaltiesTotal)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Pay</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(netPay)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer with Verified + Actions */}
        <div className="border-t border-border/50 bg-muted/20 px-5 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!isViewMode ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('isVerified', !localEmployee.isVerified)}
                  className={`h-9 w-9 rounded-lg border-2 flex items-center justify-center transition-all ${
                    localEmployee.isVerified 
                      ? 'bg-green-600 border-green-600 shadow-sm shadow-green-600/20' 
                      : 'bg-background border-input hover:border-green-400'
                  }`}
                >
                  {localEmployee.isVerified && <ShieldCheck className="h-4 w-4 text-white" />}
                </button>
                <div>
                  <Label className="text-sm font-medium">Verified</Label>
                  <p className="text-xs text-muted-foreground">Mark as verified</p>
                </div>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} className="gap-1.5 h-9 text-sm">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              {!isViewMode && (
                <Button onClick={handleSave} disabled={!ssnValidated} className="gap-1.5 h-9 text-sm min-w-[130px]">
                  <Save className="h-4 w-4" />
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
