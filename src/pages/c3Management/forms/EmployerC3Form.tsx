import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { updateWageVerification, verifyAllWagesForC3 } from "@/services/c3Service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Save, X, Printer, Loader2, Send, Server, Calculator, CheckCheck, Keyboard, List } from "lucide-react";
import DataEntryGrid from "@/components/c3/DataEntryGrid";
import { useEmployerValidation } from "@/hooks/useEmployerValidation";
import { useUserCode } from "@/hooks/useUserCode";
import { useC3Submit } from "@/hooks/useC3Submit";
import { useToast } from "@/hooks/use-toast";
import MonthYearPicker from "@/components/c3/MonthYearPicker";
import ReceivedBySelect from "@/components/c3/ReceivedBySelect";
import EmployeeModal, { EmployeeData, PenaltyFinesData } from "@/components/c3/EmployeeModal";
import { formatPeriodForStorage, formatPeriodDisplay } from "@/utils/weekCalculations";
import { formatCurrency, calculateAge } from "@/utils/sknPayrollCalculations";
import { useC3ServerCalculations, C3CalculationTotals, C3CalculationConfig } from "@/hooks/useC3ServerCalculations";
import { useC3Payments, calculateC3Balance } from "@/hooks/useC3Payments";
import { validateOtherPaymentPolicies } from "@/hooks/useOtherPayments";

interface EmployerC3FormProps {
  mode: 'add' | 'edit' | 'view';
  initialData?: any;
  onSave?: (data: any) => void;
  onSubmit?: (c3Id: string) => void;
  onCancel?: () => void;
  resetTrigger?: number;
  saveTrigger?: number;
}

// PreviewField component for view mode
const PreviewField = ({ label, value, required = false }: { label: string; value: string | number | null | undefined; required?: boolean }) => (
  <div>
    <Label className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-destructive ml-1">*</span>}
    </Label>
    <div className="mt-1 text-sm text-gray-600 rounded-md py-2">
      {value || 'Not specified'}
    </div>
  </div>
);

// Server-side calculations are now used instead of client-side

export default function EmployerC3Form({ mode, initialData, onSave, onSubmit, onCancel, resetTrigger, saveTrigger }: EmployerC3FormProps) {
  const isViewMode = mode === 'view';
  const isReadOnly = mode === 'view';
  const { toast } = useToast();
  
  const { validateEmployer, getScheduleNumber, isValidating } = useEmployerValidation();
  const { userCode } = useUserCode();
  const { submitC3Record, isSubmitting } = useC3Submit();
  const { calculate: calculateServerSide, isCalculating, calculationResult } = useC3ServerCalculations();
  
  // Ref to track calculation debounce
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref for auto-focusing Employer-ID input
  const employerIdInputRef = useRef<HTMLInputElement>(null);
  
  // Check if record can be submitted (only DFT/Draft status)
  const canSubmit = initialData?.id && (initialData?.postingStatus === 'DFT' || initialData?.postingStatus === 'Z');

  // Compute default period (one month before current) for Add mode
  const defaultPeriod = useMemo(() => {
    if (mode !== 'add') return null;
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() - 1; // 0-indexed, so subtract 1
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    return { year, month };
  }, [mode]);

  // Form state
  const [formData, setFormData] = useState({
    employerId: "",
    period: defaultPeriod as { year: number; month: number } | null,
    dateReceived: new Date().toISOString().split('T')[0], // Auto-set to current date
    receivedBy: "",
    schedule: "",
    employerName: "",
    address: "",
    numberOfEmployees: "0",
    status: "Draft",
    nilReturn: false
  });

  // Auto-focus Employer-ID when blank on form load
  useEffect(() => {
    if (!formData.employerId && !isViewMode) {
      setTimeout(() => {
        employerIdInputRef.current?.focus();
      }, 100);
    }
  }, []);

  // Fetch payments from database - uses formData so must be after formData state declaration
  const { 
    totalPayments, 
    isLoading: isLoadingPayments, 
    error: paymentsError,
    refetch: refetchPayments 
  } = useC3Payments({
    payerId: formData.employerId,
    payerType: 'ER', // Employer type
    periodYear: formData.period?.year ?? null,
    periodMonth: formData.period?.month ?? null
  });

  const [employerError, setEmployerError] = useState<string>('');
  const [employerValidated, setEmployerValidated] = useState(false);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [dataEntryMode, setDataEntryMode] = useState(false);
  const [isModalViewMode, setIsModalViewMode] = useState(false);

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      const periodParsed = initialData.periodRaw ? (() => {
        const dateStr = typeof initialData.periodRaw === 'string' ? initialData.periodRaw.split('T')[0] : String(initialData.periodRaw);
        const [year, month] = dateStr.split('-').map(Number);
        return year && month ? { year, month: month - 1 } : null;
      })() : null;

      // Parse dateReceived: prefer raw ISO, fallback to parsing display string
      let dateReceivedValue = new Date().toISOString().split('T')[0];
      if (initialData.dateReceivedRaw) {
        // Raw ISO timestamp from DB
        dateReceivedValue = new Date(initialData.dateReceivedRaw).toISOString().split('T')[0];
      } else if (initialData.dateReceived) {
        // Try parsing display format "01 Mar 2026" or ISO
        const parsed = new Date(initialData.dateReceived);
        if (!isNaN(parsed.getTime())) {
          dateReceivedValue = parsed.toISOString().split('T')[0];
        }
      }

      setFormData({
        employerId: initialData.payerId || initialData.employerId || "",
        period: periodParsed,
        dateReceived: dateReceivedValue,
        receivedBy: initialData.received_by || "",
        schedule: initialData.scheduleNo || "",
        employerName: initialData.payerName || initialData.employerName || "",
        address: initialData.payerAddress || initialData.address || "",
        numberOfEmployees: String(initialData.numberOfEmployees || "0"),
        status: initialData.status || "Draft",
        nilReturn: initialData.nilReturn || false
      });
      
      // If we have employer data already loaded (name/address), mark as validated without error
      if ((initialData.payerId || initialData.employerId) && (initialData.payerName || initialData.employerName)) {
        setEmployerValidated(true);
        setEmployerError('');
      } else if (initialData.payerId || initialData.employerId) {
        // Have ID but no name — run validation silently
        const empId = initialData.payerId || initialData.employerId;
        validateEmployer(empId).then(result => {
          if (result.isValid) {
            setFormData(prev => ({
              ...prev,
              employerName: result.name,
              address: result.address
            }));
            setEmployerValidated(true);
            setEmployerError('');
          }
        });
      }

      if (initialData.employees) {
        setEmployees(initialData.employees);
      }
    }
  }, [initialData]);

  // Auto-switch to data entry mode when no employee rows exist after load or validation
  useEffect(() => {
    if (employerValidated && !isViewMode) {
      if (employees.length === 0) {
        setDataEntryMode(true);
      }
    }
  }, [employerValidated, isViewMode, employees.length]);

  // Set default received by to current user on mount
  useEffect(() => {
    if (!formData.receivedBy && userCode) {
      setFormData(prev => ({ ...prev, receivedBy: userCode }));
    }
  }, [userCode, formData.receivedBy]);

  // Auto-update number of employees when employees array changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      numberOfEmployees: String(employees.length)
    }));
  }, [employees]);

  // Validate employer on blur
  const handleEmployerBlur = useCallback(async () => {
    if (!formData.employerId) {
      setEmployerError('Employer ID is required');
      setEmployerValidated(false);
      return;
    }

    const result = await validateEmployer(formData.employerId);
    
    if (result.isValid) {
      setFormData(prev => ({
        ...prev,
        employerName: result.name,
        address: result.address
      }));
      setEmployerError('');
      setEmployerValidated(true);
      
      // Recalculate schedule number
      if (formData.period) {
        const periodStr = formatPeriodForStorage(formData.period.year, formData.period.month);
        const scheduleNo = await getScheduleNumber(formData.employerId, 'ER', periodStr);
        setFormData(prev => ({ ...prev, schedule: String(scheduleNo) }));
      }
    } else {
      setEmployerError(result.error || 'Invalid employer');
      setEmployerValidated(false);
      setFormData(prev => ({
        ...prev,
        employerName: '',
        address: ''
      }));
    }
  }, [formData.employerId, formData.period, validateEmployer, getScheduleNumber]);

  // Update schedule number when period changes
  const handlePeriodChange = useCallback(async (value: { year: number; month: number }) => {
    setFormData(prev => ({ ...prev, period: value }));
    
    if (employerValidated && formData.employerId) {
      const periodStr = formatPeriodForStorage(value.year, value.month);
      const scheduleNo = await getScheduleNumber(formData.employerId, 'ER', periodStr);
      setFormData(prev => ({ ...prev, schedule: String(scheduleNo) }));
    }
  }, [employerValidated, formData.employerId, getScheduleNumber]);

  const handleFormChange = (field: string, value: any) => {
    if (isReadOnly) return;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'employerId') {
      setEmployerValidated(false);
      setEmployerError('');
    }
  };

  // Trigger server-side calculation when inputs change
  useEffect(() => {
    if (formData.nilReturn || !formData.period || employees.length === 0) {
      return;
    }

    // Debounce calculation
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    calculationTimeoutRef.current = setTimeout(async () => {
      await calculateServerSide(
        formData.period!.year,
        formData.period!.month,
        formData.dateReceived,
        employees
      );
    }, 500); // 500ms debounce

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [employees, formData.period, formData.dateReceived, formData.nilReturn, calculateServerSide]);

  // Derived overall figures from server calculation results
  const overall = useMemo(() => {
    const totals = calculationResult?.totals;
    
    if (!totals) {
      return {
        periodGross: 0,
        employeeSS: 0,
        employeeLevy: 0,
        employerSS: 0,
        employerLevy: 0,
        employerSeverance: 0,
        employeeLevySS: 0,
        employerThreePercent: 0,
        employerOnePercent: 0,
        totalWagesPlusEmployeeLevyPlusSS: 0,
        employersThreePercentLevyPlusSS: 0,
        employersOnePercentSeverancePay: 0,
        levyPenalty: 0,
        severancePenalty: 0,
        fines: 0,
        totalLateCharges: 0,
        daysLate: 0,
        monthsLate: 0
      };
    }
    
    return {
      periodGross: totals.periodGross,
      employeeSS: totals.employeeSS,
      employeeLevy: totals.employeeLevy,
      employerSS: totals.employerSS,
      employerLevy: totals.employerLevy,
      employerSeverance: totals.employerSeverance,
      employeeLevySS: totals.employeeLevy + totals.employeeSS,
      employerThreePercent: totals.employersThreePercentLevyPlusSS,
      employerOnePercent: totals.employersOnePercentSeverancePay,
      totalWagesPlusEmployeeLevyPlusSS: totals.totalWagesPlusEmployeeLevyPlusSS,
      employersThreePercentLevyPlusSS: totals.employersThreePercentLevyPlusSS,
      employersOnePercentSeverancePay: totals.employersOnePercentSeverancePay,
      levyPenalty: totals.levyPenalty,
      severancePenalty: totals.severancePenalty,
      fines: totals.ssFine,
      totalLateCharges: totals.totalLateCharges,
      daysLate: totals.daysLate,
      monthsLate: totals.monthsLate || 0
    };
  }, [calculationResult]);

  // Calculate SS Contribution due for the month and Total due to Accountant General
  const ssContributionDue = useMemo(() => {
    return overall.employeeSS + overall.employerSS + overall.fines;
  }, [overall.employeeSS, overall.employerSS, overall.fines]);

  const totalDueToAG = useMemo(() => {
    return overall.employeeLevy + overall.employerLevy + overall.employerSeverance + 
           overall.levyPenalty + overall.severancePenalty;
  }, [overall.employeeLevy, overall.employerLevy, overall.employerSeverance, 
      overall.levyPenalty, overall.severancePenalty]);

  // Calculate Balance = (SS Contribution due + Total due to AG) - Payments
  const calculatedBalance = useMemo(() => {
    return calculateC3Balance(ssContributionDue, totalDueToAG, totalPayments);
  }, [ssContributionDue, totalDueToAG, totalPayments]);

  const formatMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = async () => {
    if (isReadOnly) return;
    
    if (!employerValidated && !formData.nilReturn) {
      setEmployerError('Please enter a valid employer registration number');
      return;
    }

    // Validate Other Payments policy coverage before save
    if (!formData.nilReturn && formData.period && employees.length > 0) {
      const allOtherPayments = employees.flatMap(emp => emp.otherPayments || []);
      if (allOtherPayments.length > 0) {
        const policyValidation = await validateOtherPaymentPolicies(
          allOtherPayments,
          formData.period.year,
          formData.period.month
        );
        if (!policyValidation.valid) {
          toast({
            title: "Policy Validation Failed",
            description: policyValidation.errors[0] || "One or more income codes do not have an active policy for the selected period.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    const periodStr = formData.period 
      ? formatPeriodForStorage(formData.period.year, formData.period.month)
      : '';

    const formDataToSave = {
      ...formData,
      period: periodStr,
      regNo: formData.employerId,
      received_by: formData.receivedBy, // UserCode of selected user
      payerName: formData.employerName,
      payerAddress: formData.address,
      employees: formData.nilReturn ? [] : employees,
      totalWages: overall.periodGross,
      empSsAmtCalc: overall.employeeLevySS,
      empLevyAmtCalc: overall.employerThreePercent,
      empPeAmtCalc: overall.employerOnePercent,
    };
    
    onSave?.(formDataToSave);
  };

  // Handle submit - transitions record from DFT to PEN and triggers workflow
  const handleSubmit = async () => {
    if (!initialData?.id) {
      toast({ title: "Error", description: "Please save the record first before submitting", variant: "destructive" });
      return;
    }

    // Validate Other Payments policy coverage before submit
    if (!formData.nilReturn && formData.period && employees.length > 0) {
      const allOtherPayments = employees.flatMap(emp => emp.otherPayments || []);
      if (allOtherPayments.length > 0) {
        const policyValidation = await validateOtherPaymentPolicies(
          allOtherPayments,
          formData.period.year,
          formData.period.month
        );
        if (!policyValidation.valid) {
          toast({
            title: "Policy Validation Failed",
            description: policyValidation.errors[0] || "One or more income codes do not have an active policy for the selected period.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    const periodDisplay = formData.period 
      ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][formData.period.month]} ${formData.period.year}` 
      : '';
    const recordName = `${formData.employerName || formData.employerId} - ${periodDisplay}`;
    
    const result = await submitC3Record(initialData.id, 'ER', recordName);

    if (result.success) {
      toast({ 
        title: "Record Submitted", 
        description: result.workflowInstanceId 
          ? "C3 record submitted and workflow started" 
          : "C3 record submitted for verification"
      });
      onSubmit?.(initialData.id);
    } else {
      toast({ title: "Error", description: result.error || "Failed to submit record", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Reset form functionality
  const resetFormToDefaults = () => {
    setFormData({
      employerId: "",
      period: defaultPeriod,
      dateReceived: new Date().toISOString().split('T')[0],
      receivedBy: userCode || "",
      schedule: "",
      employerName: "",
      address: "",
      numberOfEmployees: "0",
      status: "Draft",
      nilReturn: false
    });
    setEmployees([]);
    setEmployerValidated(false);
    setEmployerError('');
    // Re-focus employer ID after reset
    setTimeout(() => employerIdInputRef.current?.focus(), 100);
  };

  // Handle reset trigger from parent component
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && mode === 'add') {
      resetFormToDefaults();
    }
  }, [resetTrigger, mode]);

  // Handle save trigger from parent component (header Save button)
  useEffect(() => {
    if (saveTrigger && saveTrigger > 0 && mode !== 'view') {
      handleSave();
    }
  }, [saveTrigger]);

  // Modal handlers
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsModalViewMode(false);
    setIsModalOpen(true);
  };

  const handleViewEmployee = (employee: EmployeeData) => {
    setSelectedEmployee(employee);
    setIsModalViewMode(true);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: EmployeeData) => {
    setSelectedEmployee(employee);
    setIsModalViewMode(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = (updatedEmployee: EmployeeData) => {
    const index = employees.findIndex(emp => emp.ssn === updatedEmployee.ssn);
    if (index !== -1) {
      const updatedEmployees = [...employees];
      updatedEmployees[index] = updatedEmployee;
      setEmployees(updatedEmployees);
    } else {
      setEmployees(prev => [...prev, updatedEmployee]);
    }
  };

  const handleDeleteEmployee = (employee: EmployeeData) => {
    setEmployees(prev => prev.filter(emp => emp.ssn !== employee.ssn));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "Draft":
        return <Badge className="bg-blue-100 text-blue-800">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Period for employee modal
  const periodYear = formData.period?.year || new Date().getFullYear();
  const periodMonth = formData.period?.month || new Date().getMonth();

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isViewMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PreviewField label="Employer ID" value={formData.employerId} required />
              <PreviewField 
                label="Period" 
                value={formData.period ? formatPeriodDisplay(formData.period.year, formData.period.month) : ''} 
                required 
              />
              <PreviewField label="Date Received" value={formData.dateReceived} required />
              <PreviewField label="Schedule" value={formData.schedule} required />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Nil Return Checkbox */}
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="nilReturn"
                  checked={formData.nilReturn}
                  onCheckedChange={(checked) => handleFormChange("nilReturn", checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="nilReturn" className="text-sm font-medium cursor-pointer">
                  Nil Return (No employees to report for this period)
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employerId">Employer ID <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      ref={employerIdInputRef}
                      id="employerId"
                      value={formData.employerId}
                      onChange={(e) => handleFormChange("employerId", e.target.value)}
                      onBlur={handleEmployerBlur}
                      placeholder="Enter Employer ID"
                      readOnly={isReadOnly}
                      className={employerError ? 'border-destructive' : ''}
                    />
                    {isValidating && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {employerError && <p className="text-xs text-destructive">{employerError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period <span className="text-destructive">*</span></Label>
                  <MonthYearPicker
                    value={formData.period || undefined}
                    onChange={handlePeriodChange}
                    placeholder="Select Month & Year"
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateReceived">Date Received</Label>
                  <Input
                    id="dateReceived"
                    type="date"
                    value={formData.dateReceived}
                    onChange={(e) => handleFormChange("dateReceived", e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>

                {/* Received By */}
                <ReceivedBySelect
                  value={formData.receivedBy}
                  onChange={(value) => handleFormChange("receivedBy", value)}
                  disabled={isReadOnly}
                  required
                />

                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule</Label>
                  <Input
                    id="schedule"
                    value={formData.schedule}
                    readOnly
                    disabled
                    className="bg-muted"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Read-only information in gray card */}
          <div className="mt-6 bg-muted rounded-lg p-4 border-2 border-muted-foreground/20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Employer Name</Label>
                <div className="text-sm text-muted-foreground">{formData.employerName || '-'}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Address</Label>
                <div className="text-sm text-muted-foreground">{formData.address || '-'}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Number Of Employees</Label>
                <div className="text-sm text-muted-foreground">{formData.numberOfEmployees}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Status</Label><br/>
                {getStatusBadge(formData.status)}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Payments</Label>
                <div className="text-sm text-muted-foreground">
                  {isLoadingPayments ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    formatMoney(totalPayments)
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Balance</Label>
                <div className={`text-sm font-semibold ${calculatedBalance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {isLoadingPayments ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Calculating...
                    </span>
                  ) : (
                    formatMoney(calculatedBalance)
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Section - Disabled if Nil Return */}
      {!formData.nilReturn && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Details</CardTitle>
                  <CardDescription>
                    Record employee wages and salaries for this period.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!isViewMode && initialData?.id && employees.some(e => !e.isVerified) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const result = await verifyAllWagesForC3(initialData.id, userCode);
                        if (result.success) {
                          setEmployees(prev => prev.map(emp => ({ ...emp, isVerified: true })));
                          toast({ title: "All Rows Verified", description: `${result.count || 0} wage row(s) verified.` });
                        } else {
                          toast({ title: "Error", description: result.error || "Failed to verify all rows.", variant: "destructive" });
                        }
                      }}
                      className="gap-1"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Verify All
                    </Button>
                  )}
                  {!isViewMode && (
                    <>
                      <Button
                        variant={dataEntryMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDataEntryMode(!dataEntryMode)}
                        disabled={!employerValidated}
                        className="gap-1"
                      >
                        <Keyboard className="h-4 w-4" />
                        {dataEntryMode ? 'Exit Data Entry' : 'Data Entry Mode'}
                      </Button>
                      {!dataEntryMode && (
                        <Button onClick={handleAddEmployee} disabled={!employerValidated}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Employee
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Data Entry Grid Mode */}
              {dataEntryMode && !isViewMode && employerValidated && (
                <div className="mb-6">
                  <DataEntryGrid
                    periodYear={periodYear}
                    periodMonth={periodMonth}
                    receivedDate={formData.dateReceived}
                    employees={employees}
                    onSaveEmployee={handleSaveEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    allEmployees={employees}
                    isViewMode={isViewMode}
                  />
                </div>
              )}

              {/* Existing employee list - hidden when data entry mode is active */}
              {!dataEntryMode && employees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {!employerValidated 
                    ? "Enter a valid Employer ID to add employees"
                    : "No employees added yet. Click 'Add Employee' or enable 'Data Entry Mode' to begin."}
                </div>
              )}
              {!dataEntryMode && employees.length > 0 && (
                <DataTable
                  data={employees}
                  columns={[
                    { key: 'ssn', label: 'SSN', minWidth: '100px' },
                    { key: 'name', label: 'Employee Name', minWidth: '150px' },
                    { key: 'payPeriod', label: 'Pay Period', minWidth: '120px' },
                    {
                      key: 'weeklyWages',
                      label: '1 Week',
                      minWidth: '80px',
                      render: (weeklyWages) => `$${(weeklyWages?.[0] ?? 0).toFixed(2)}`
                    },
                    {
                      key: 'weeklyWages',
                      label: '2 Week',
                      minWidth: '80px',
                      render: (weeklyWages) => `$${(weeklyWages?.[1] ?? 0).toFixed(2)}`
                    },
                    {
                      key: 'weeklyWages',
                      label: '3 Week',
                      minWidth: '80px',
                      render: (weeklyWages) => `$${(weeklyWages?.[2] ?? 0).toFixed(2)}`
                    },
                    {
                      key: 'weeklyWages',
                      label: '4 Week',
                      minWidth: '80px',
                      render: (weeklyWages) => `$${(weeklyWages?.[3] ?? 0).toFixed(2)}`
                    },
                    {
                      key: 'weeklyWages',
                      label: '5 Week',
                      minWidth: '80px',
                      render: (weeklyWages) => `$${(weeklyWages?.[4] ?? 0).toFixed(2)}`
                    },
                    {
                      key: 'weeklyWages',
                      label: 'Bonus',
                      minWidth: '80px',
                      render: (weeklyWages) => `$${(weeklyWages?.[5] ?? 0).toFixed(2)}`
                    },
                    {
                      key: 'weeklyWages',
                      label: 'Holiday',
                      minWidth: '80px',
                      render: (weeklyWages) => `$${(weeklyWages?.[6] ?? 0).toFixed(2)}`
                    },
                    {
                      key: 'isVerified',
                      label: 'Verified',
                      minWidth: '100px',
                      render: (isVerified: boolean, row: any) => (
                        isViewMode ? (
                          <Badge
                            variant={isVerified ? 'secondary' : 'destructive'}
                            className={`text-xs ${isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {isVerified ? 'Yes' : 'No'}
                          </Badge>
                        ) : (
                          <Checkbox
                            checked={!!isVerified}
                            onCheckedChange={async (checked) => {
                              const newVal = !!checked;
                              setEmployees(prev => prev.map(emp =>
                                emp.ssn === row.ssn ? { ...emp, isVerified: newVal } : emp
                              ));
                              if (row.id) {
                                const result = await updateWageVerification(row.id, newVal, userCode);
                                if (!result.success) {
                                  setEmployees(prev => prev.map(emp =>
                                    emp.ssn === row.ssn ? { ...emp, isVerified: !newVal } : emp
                                  ));
                                  toast({ title: "Error", description: result.error || "Failed to update verification.", variant: "destructive" });
                                }
                              }
                            }}
                          />
                        )
                      )
                    }
                  ]}
                  title=""
                  searchPlaceholder="Search by SSN/Name"
                  actions={{ view: true, edit: !isReadOnly, delete: !isReadOnly && !isViewMode }}
                  onView={handleViewEmployee}
                  onEdit={handleEditEmployee}
                  onDelete={(row: any) => handleDeleteEmployee(row as EmployeeData)}
                />
              )}
            </CardContent>
          </Card>

          {/* Calculation Summary */}
          <Card className="border-primary/20 overflow-hidden">
            <div className="bg-primary/5 px-6 py-4 border-b border-primary/10">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Calculation Summary
                {isCalculating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </div>
            <CardContent className="pt-5">
              {/* Row 1: Main contribution totals as cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Wages + Employee Levy + SS</Label>
                  <div className="text-2xl font-bold mt-1 tabular-nums">
                    {formatMoney(overall.totalWagesPlusEmployeeLevyPlusSS)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMoney(overall.periodGross)} + {formatMoney(overall.employeeLevy)} + {formatMoney(overall.employeeSS)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Employer's {calculationResult?.config ? `${(calculationResult.config.employerLevyRate * 100).toFixed(0)}%` : '3%'} Levy + SS
                  </Label>
                  <div className="text-2xl font-bold mt-1 tabular-nums">
                    {formatMoney(overall.employersThreePercentLevyPlusSS)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMoney(overall.employerLevy)} + {formatMoney(overall.employerSS)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Employer's {calculationResult?.config ? `${(calculationResult.config.employerSeveranceRate * 100).toFixed(0)}%` : '1%'} Severance
                  </Label>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{formatMoney(overall.employersOnePercentSeverancePay)}</div>
                </div>
              </div>

              {/* Row 2: Penalties with conditional styling */}
              {(overall.levyPenalty > 0 || overall.severancePenalty > 0 || overall.fines > 0) ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <Label className="text-xs font-medium text-destructive uppercase tracking-wider mb-3 block">Penalties & Fines</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Levy Penalty</span>
                      <div className="text-xl font-semibold text-destructive tabular-nums">{formatMoney(overall.levyPenalty)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Severance Penalty</span>
                      <div className="text-xl font-semibold text-destructive tabular-nums">{formatMoney(overall.severancePenalty)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Fine on Social Security</span>
                      <div className="text-xl font-semibold text-destructive tabular-nums">{formatMoney(overall.fines)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                  <span className="text-sm text-green-700 font-medium">✓ No penalties or fines applicable</span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Nil Return Message */}
      {formData.nilReturn && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-yellow-800 font-medium mb-2">Nil Return Selected</div>
              <p className="text-yellow-700 text-sm">
                This C3 will be submitted without any employee data. 
                Use this option when there are no employees to report for the selected period.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals and Details Section */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Totals Section */}
            <div className="col-span-12 lg:col-span-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="h-5 w-1 bg-primary rounded-full" />
                Totals
              </h3>
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <Label className="text-sm font-medium">
                    Social Security Contribution due for the month
                  </Label>
                  <div className="text-xl font-bold mt-1 tabular-nums">
                    {formatMoney(overall.employeeSS + overall.employerSS + overall.fines)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Employee SS + Employer SS + SS Fine
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <Label className="text-sm font-medium">
                    Total due to Accountant General
                  </Label>
                  <div className="text-xl font-bold mt-1 tabular-nums">
                    {formatMoney(
                      overall.employeeLevy + 
                      overall.employerLevy + 
                      overall.employerSeverance + 
                      overall.levyPenalty + 
                      overall.severancePenalty
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Levy + Severance + Penalties
                  </p>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="col-span-12 lg:col-span-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="h-5 w-1 bg-primary rounded-full" />
                Details
              </h3>
              <div className="rounded-lg bg-muted/50 border p-4 h-[calc(100%-2.5rem)]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Entered</Label>
                    <div className="text-sm font-medium">{initialData?.dateEntered || '—'}</div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Modified</Label>
                    <div className="text-sm font-medium">{initialData?.cnc3ReportedModifiedDate || '—'}</div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Verified</Label>
                    <div className="text-sm font-medium">{initialData?.dateVerified || '—'}</div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Received By</Label>
                    <div className="text-sm font-medium">{initialData?.cnc3ReportedReceivedBy || '—'}</div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entered By</Label>
                    <div className="text-sm font-medium">{initialData?.enteredBy || '—'}</div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verified By</Label>
                    <div className="text-sm font-medium">{initialData?.verifiedBy || '—'}</div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modified By</Label>
                    <div className="text-sm font-medium">{initialData?.cnc3ReportedModifiedBy || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
        isViewMode={isModalViewMode}
        periodYear={periodYear}
        periodMonth={periodMonth}
        receivedDate={formData.dateReceived}
        penaltyData={{
          levyPenalty: overall.levyPenalty,
          severancePenalty: overall.severancePenalty,
          ssFines: overall.fines,
          daysLate: overall.daysLate,
          monthsLate: overall.monthsLate,
          totalLateCharges: overall.totalLateCharges
        }}
        allEmployees={employees}
      />
    </div>
  );
}
