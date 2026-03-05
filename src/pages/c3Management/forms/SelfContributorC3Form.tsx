import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, Check, Loader2, AlertCircle, Send } from "lucide-react";
import MonthYearPicker from "@/components/c3/MonthYearPicker";
import DatePickerWithDropdowns from "@/components/shared/DatePickerWithDropdowns";
import ReceivedBySelect from "@/components/c3/ReceivedBySelect";
import { useToast } from "@/hooks/use-toast";
import { useUserCode } from "@/hooks/useUserCode";
import { useC3Submit } from "@/hooks/useC3Submit";
import { 
  validateSelfContributorSSN, 
  getPersonBySSN,
  getWageCategoryDetails,
  getNextScheduleNo,
  saveSelfContributorC3,
  validateEmployer 
} from "@/services/c3Service";
import {
  calculateSelfContributorPenalty,
  getMondaysInMonth,
  calculateTotalWagesFromWeeks,
  calculateSelfContributorDueDate
} from "@/utils/selfContributorPenaltyCalculations";
import { postingStatusToDisplayStatus } from "@/hooks/useC3Management";

// PreviewField component for view mode
const PreviewField = ({ label, value, required = false }: { label: string; value: string | number | null | undefined; required?: boolean }) => (
  <div>
    <Label className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <div className="mt-1 text-sm text-gray-600 rounded-md">
      {value || 'Not specified'}
    </div>
  </div>
);

interface SelfContributorC3FormProps {
  data?: any;
  mode?: 'add' | 'edit' | 'view';
  resetTrigger?: number;
  saveTrigger?: number;
  onSave?: (data: any) => void;
  onSubmit?: (c3Id: string) => void;
  onClose?: () => void;
}

export default function SelfContributorC3Form({ data, mode = 'add', resetTrigger, saveTrigger, onSave, onSubmit, onClose }: SelfContributorC3FormProps) {
  const isReadOnly = mode === 'view';
  const isViewMode = mode === 'view';
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { submitC3Record, isSubmitting } = useC3Submit();

  // Form state
  const [ssn, setSSN] = useState(data?.payerId || data?.ssn || "");
  const [period, setPeriod] = useState<{ year: number; month: number } | undefined>(
    data?.periodRaw ? (() => {
      const dateStr = typeof data.periodRaw === 'string' ? data.periodRaw.split('T')[0] : String(data.periodRaw);
      const [year, month] = dateStr.split('-').map(Number);
      return year && month ? { year, month: month - 1 } : undefined;
    })() : undefined
  );
  const [dateReceived, setDateReceived] = useState<Date | undefined>(
    data?.dateReceived ? new Date(data.dateReceived) : new Date()
  );
  const [receivedBy, setReceivedBy] = useState(data?.received_by || "");
  const [nilReturn, setNilReturn] = useState(data?.nilReturn || false);
  const [scheduleNo, setScheduleNo] = useState<number>(data?.sequence_no || 1);
  const [status, setStatus] = useState(data?.postingStatus || 'DFT');
  const [notes, setNotes] = useState(data?.notes || "");
  const [recordId, setRecordId] = useState<string | null>(data?.id || null);

  // Auto-populated fields
  const [name, setName] = useState(data?.payerName || "");
  const [address, setAddress] = useState(data?.payerAddress || "");
  const [weeklyWage, setWeeklyWage] = useState<number>(0);
  const [weeklyContribution, setWeeklyContribution] = useState<number>(0);
  const [wageCategory, setWageCategory] = useState<number | null>(null);
  const [ssRate, setSsRate] = useState<number>(0);
  const [penaltyRate, setPenaltyRate] = useState<number | null>(null);
  const [configFound, setConfigFound] = useState<boolean>(true);
  const [configWarning, setConfigWarning] = useState<string | null>(null);

  // Validation states
  const [ssnValidating, setSSNValidating] = useState(false);
  const [ssnError, setSsnError] = useState<string | null>(null);
  const [ssnValid, setSsnValid] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);

  // Wages Details state - Initialize from wage data if available (edit/view mode)
  const [selectedWeeks, setSelectedWeeks] = useState<boolean[]>(() => {
    // Check if employees/wages data is available (from getRecordWithWages)
    if (data?.employees?.[0]) {
      const emp = data.employees[0];
      return [
        (emp.weeklyWages?.[0] || 0) > 0,
        (emp.weeklyWages?.[1] || 0) > 0,
        (emp.weeklyWages?.[2] || 0) > 0,
        (emp.weeklyWages?.[3] || 0) > 0,
        (emp.weeklyWages?.[4] || 0) > 0,
      ];
    }
    return [false, false, false, false, false];
  });
  const [isVerified, setIsVerified] = useState(data?.isVerified || false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if record can be submitted (only DFT/Draft status)
  const canSubmit = recordId && (status === 'DFT' || status === 'Z');

  // Set default received by to current user on mount
  useEffect(() => {
    if (!receivedBy && userCode) {
      setReceivedBy(userCode);
    }
  }, [userCode, receivedBy]);

  // Calculate number of Mondays in selected period
  const mondaysInMonth = useMemo(() => {
    if (!period) return 4;
    return getMondaysInMonth(period.year, period.month);
  }, [period]);

  // Calculate total wages based on selected weeks
  const totalWages = useMemo(() => {
    if (nilReturn) return 0;
    return calculateTotalWagesFromWeeks(weeklyWage, selectedWeeks);
  }, [weeklyWage, selectedWeeks, nilReturn]);

  // Calculate SS contribution using the rate from tb_self_emp_contrib_rate (typically 10%)
  const ssContribution = useMemo(() => {
    if (nilReturn) return 0;
    // Total wages * SS rate (e.g., 10%)
    return Math.round(totalWages * (ssRate / 100) * 100) / 100;
  }, [totalWages, ssRate, nilReturn]);

  // Calculate penalty
  const penaltyResult = useMemo(() => {
    if (nilReturn || !period || ssContribution <= 0) {
      return { lateFine: 0, monthsLate: 0, dueDate: null };
    }
    
    return calculateSelfContributorPenalty({
      contributionMonth: period,
      socialSecurityDue: ssContribution,
      paymentDate: dateReceived || null,
      today: new Date()
    });
  }, [period, ssContribution, dateReceived, nilReturn]);

  // Format money
  const formatMoney = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Get status badge
  const getStatusBadge = (statusCode: string) => {
    const displayStatus = postingStatusToDisplayStatus(statusCode);
    switch (displayStatus) {
      case "Verified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{displayStatus}</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{displayStatus}</Badge>;
      case "Draft":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{displayStatus}</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{displayStatus}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{displayStatus}</Badge>;
    }
  };

  // Validate SSN against ip_self_category
  const validateSSN = useCallback(async () => {
    if (!ssn || ssn.length < 1) {
      setSsnError(null);
      setSsnValid(false);
      setName("");
      setAddress("");
      setWeeklyWage(0);
      setWeeklyContribution(0);
      setWageCategory(null);
      return;
    }

    setSSNValidating(true);
    setSsnError(null);

    try {
      // First get person details
      const personResult = await getPersonBySSN(ssn);
      
      if (!personResult.isValid) {
        setSsnError(personResult.message);
        setSsnValid(false);
        setName("");
        setAddress("");
        setWeeklyWage(0);
        setWeeklyContribution(0);
        setWageCategory(null);
        setSsRate(10);
        setSSNValidating(false);
        return;
      }

      setName(personResult.name);
      setAddress(personResult.address);

      // If period is selected, validate wage category
      if (period) {
        const categoryResult = await validateSelfContributorSSN(ssn, period.year, period.month);
        
        if (!categoryResult.isValid) {
          setSsnError(categoryResult.message);
          setSsnValid(false);
          setWeeklyWage(0);
          setWeeklyContribution(0);
          setWageCategory(null);
          setSsRate(10);
        } else if (categoryResult.wageCategory) {
          // Fetch wage category details - weeklyWage is the wage_category value itself
          // weeklyContribution is calculated as weeklyWage * SS rate from tb_self_emp_contrib_rate
          const wageDetails = await getWageCategoryDetails(categoryResult.wageCategory);
          if (wageDetails) {
            setWeeklyWage(wageDetails.weeklyWage);
            setWeeklyContribution(wageDetails.weeklyContribution);
            setWageCategory(categoryResult.wageCategory);
            setSsRate(wageDetails.ssRate);
            setSsnValid(true);
          } else {
            setSsnError("Could not fetch wage category details");
            setSsnValid(false);
          }
        }
      } else {
        // Period not selected yet - defer wage category validation
        setSsnValid(true);
        setPeriodError("Please select a period to validate wage category");
      }
    } catch (error: any) {
      setSsnError(error.message || "Error validating SSN");
      setSsnValid(false);
    } finally {
      setSSNValidating(false);
    }
  }, [ssn, period]);

  // Re-validate when period changes and clear period error
  useEffect(() => {
    if (period) {
      // Clear the period error since a period is now selected
      setPeriodError(null);
      
      if (ssn) {
        validateSSN();
      }
    }
  }, [period]);

  // Fetch schedule number when SSN or period changes
  useEffect(() => {
    const fetchScheduleNo = async () => {
      if (ssn && period && !data?.id) {
        const periodStr = new Date(period.year, period.month, 1).toISOString();
        const nextSchedule = await getNextScheduleNo(ssn, 'SE', periodStr);
        setScheduleNo(nextSchedule);
      }
    };
    fetchScheduleNo();
  }, [ssn, period, data?.id]);

  // Handle week checkbox change
  const handleWeekChange = (index: number, checked: boolean) => {
    if (isReadOnly || nilReturn) return;
    if (index >= mondaysInMonth) return; // Don't allow selecting weeks beyond Mondays in month
    
    const newWeeks = [...selectedWeeks];
    newWeeks[index] = checked;
    setSelectedWeeks(newWeeks);
  };

  // Handle Nil Return toggle
  const handleNilReturnChange = (checked: boolean) => {
    if (isReadOnly) return;
    setNilReturn(checked);
    if (checked) {
      // Clear wages data when Nil Return is selected
      setSelectedWeeks([false, false, false, false, false]);
    }
  };

  // Reset form
  const resetForm = () => {
    setSSN("");
    setPeriod(undefined);
    setDateReceived(new Date());
    setReceivedBy(userCode || "");
    setNilReturn(false);
    setScheduleNo(1);
    setStatus('DFT');
    setNotes("");
    setName("");
    setAddress("");
    setWeeklyWage(0);
    setWeeklyContribution(0);
    setWageCategory(null);
    setSsRate(10);
    setSelectedWeeks([false, false, false, false, false]);
    setIsVerified(false);
    setSsnError(null);
    setSsnValid(false);
    setPeriodError(null);
  };

  // Handle reset trigger from parent
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && mode === 'add') {
      resetForm();
    }
  }, [resetTrigger, mode]);

  // Handle save trigger from parent component (header Save button)
  useEffect(() => {
    if (saveTrigger && saveTrigger > 0 && mode !== 'view') {
      handleSave();
    }
  }, [saveTrigger]);

  // Handle save
  const handleSave = async () => {
    if (isReadOnly) return;

    // Validation
    if (!ssn) {
      toast({ title: "Error", description: "Please enter an SSN", variant: "destructive" });
      return;
    }

    if (!period) {
      toast({ title: "Error", description: "Please select a period", variant: "destructive" });
      return;
    }

    if (!nilReturn && !ssnValid) {
      toast({ title: "Error", description: "Please enter a valid SSN with a declared wage category", variant: "destructive" });
      return;
    }

    if (!nilReturn && selectedWeeks.filter(Boolean).length === 0) {
      toast({ title: "Error", description: "Please select at least one week or mark as Nil Return", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const periodStr = new Date(period.year, period.month, 1).toISOString();
      
      const formDataToSave: any = {
        id: data?.id || recordId,
        payer_id: ssn,
        payer_type: 'SE',
        sequence_no: scheduleNo,
        period: periodStr,
        total_wages: totalWages,
        emp_ss_amt_calc: ssContribution,
        emp_ss_fines_due: penaltyResult.lateFine,
        date_received: dateReceived?.toISOString(),
        received_by: receivedBy, // UserCode of selected user
        nil_return: nilReturn,
        payer_name: name,
        payer_address: address,
        notes,
        posting_status: 'DFT',
        // Additional data for UI
        weeklyWage,
        weeklyContribution,
        wageCategory,
        ssRate,
        selectedWeeks,
        isVerified
      };

      const result = await saveSelfContributorC3(formDataToSave, userCode || undefined);

      if (result.success) {
        // Store the record ID for submit capability
        if (result.data?.id) {
          setRecordId(result.data.id);
          setStatus('DFT');
        }
        toast({ title: "Success", description: "C3 record saved successfully" });
        onSave?.(result.data);
      } else {
        toast({ title: "Error", description: result.error || "Failed to save record", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submit - transitions record from DFT to PEN and triggers workflow
  const handleSubmit = async () => {
    if (!recordId) {
      toast({ title: "Error", description: "Please save the record first before submitting", variant: "destructive" });
      return;
    }

    const recordName = `${name || ssn} - ${period ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][period.month]} ${period.year}` : ''}`;
    
    const result = await submitC3Record(recordId, 'SE', recordName);

    if (result.success) {
      setStatus('PEN');
      toast({ 
        title: "Record Submitted", 
        description: result.workflowInstanceId 
          ? "C3 record submitted and workflow started" 
          : "C3 record submitted for verification"
      });
      onSubmit?.(recordId);
    } else {
      toast({ title: "Error", description: result.error || "Failed to submit record", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isViewMode ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <PreviewField label="SSN" value={ssn} required />
              <PreviewField label="Period" value={period ? `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][period.month]} ${period.year}` : ''} required />
              <PreviewField label="Date Received" value={dateReceived ? formatDate(dateReceived) : ''} required />
              <PreviewField label="Received By" value={receivedBy} />
              <PreviewField label="Schedule" value={`SCH-${scheduleNo}`} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* SSN Input */}
                <div className="space-y-2">
                  <Label htmlFor="ssn">SSN <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="ssn"
                      value={ssn}
                      onChange={(e) => setSSN(e.target.value)}
                      onBlur={validateSSN}
                      placeholder="Enter SSN"
                      className={ssnError ? "border-destructive pr-10" : "pr-10"}
                      readOnly={isReadOnly}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {ssnValidating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {!ssnValidating && ssnValid && <Check className="h-4 w-4 text-green-500" />}
                      {!ssnValidating && ssnError && <AlertCircle className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  {ssnError && <p className="text-xs text-destructive">{ssnError}</p>}
                </div>

                {/* Period (Month/Year) */}
                <div className="space-y-2">
                  <Label>Period <span className="text-red-500">*</span></Label>
                  <MonthYearPicker
                    value={period}
                    onChange={setPeriod}
                    placeholder="Select period"
                    disabled={isReadOnly}
                    error={periodError || undefined}
                  />
                </div>

                {/* Date Received */}
                <div className="space-y-2">
                  <Label>Date Received <span className="text-red-500">*</span></Label>
                  <DatePickerWithDropdowns
                    date={dateReceived}
                    onSelect={setDateReceived}
                    placeholder="Select date"
                    disabled={isReadOnly}
                  />
                </div>

                {/* Received By */}
                <ReceivedBySelect
                  value={receivedBy}
                  onChange={setReceivedBy}
                  disabled={isReadOnly}
                  required
                />

                {/* Schedule */}
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Input
                    value={`SCH-${scheduleNo}`}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Nil Return Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="nilReturn"
                  checked={nilReturn}
                  onCheckedChange={(checked) => handleNilReturnChange(!!checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="nilReturn" className="font-medium">Nil Return</Label>
                {nilReturn && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (No wages data required)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Read-only information in gray card */}
          <div className="mt-6 bg-muted rounded-lg p-4 border-2 border-border">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Name</Label>
                <div className="text-sm">{name || '-'}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Address</Label>
                <div className="text-sm">{address || '-'}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Weekly Wage</Label>
                <div className="text-sm font-semibold text-primary">
                  {weeklyWage > 0 ? formatMoney(weeklyWage) : '-'}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Weekly Contribution</Label>
                <div className="text-sm font-semibold text-primary">
                  {weeklyContribution > 0 ? formatMoney(weeklyContribution) : '-'}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Status</Label>
                <div>{getStatusBadge(status)}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Due Date</Label>
                <div className="text-sm">
                  {penaltyResult.dueDate ? formatDate(penaltyResult.dueDate) : '-'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wages Details */}
      <Card className={nilReturn ? "opacity-50" : ""}>
        <CardHeader>
          <CardTitle>Wages Details</CardTitle>
          {nilReturn && (
            <p className="text-sm text-muted-foreground">
              Wages details disabled for Nil Return
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Row 1: Calculated fields (read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Total Wages</Label>
                <Input
                  value={formatMoney(totalWages)}
                  readOnly
                  className="bg-muted font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label>Social Security Contribution</Label>
                <Input
                  value={formatMoney(ssContribution)}
                  readOnly
                  className="bg-muted font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label>Penalties</Label>
                <Input
                  value={formatMoney(penaltyResult.lateFine)}
                  readOnly
                  className={`bg-muted font-semibold ${penaltyResult.lateFine > 0 ? 'text-destructive' : ''}`}
                />
                {penaltyResult.monthsLate > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {penaltyResult.monthsLate} month(s) late - 5% per month
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Week checkboxes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Weeks ({mondaysInMonth} Mondays in period)</Label>
              <div className="flex gap-6">
                {[1, 2, 3, 4, 5].map((week, index) => {
                  const isDisabled = isReadOnly || nilReturn || index >= mondaysInMonth;
                  return (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <span className={`text-sm ${isDisabled && index < 5 && index >= mondaysInMonth ? 'text-muted-foreground' : ''}`}>
                        Week {week}
                      </span>
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleWeekChange(index, !selectedWeeks[index])}
                        className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${
                          isDisabled 
                            ? 'bg-muted border-muted-foreground/20 cursor-not-allowed opacity-50' 
                            : selectedWeeks[index] 
                              ? 'bg-primary border-primary' 
                              : 'bg-background border-border hover:border-primary'
                        }`}
                        disabled={isDisabled}
                        title={index >= mondaysInMonth ? `No Week ${week} in this month` : `Week ${week}`}
                      >
                        {selectedWeeks[index] && <Check className="h-5 w-5 text-primary-foreground" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Verified checkbox and actions */}
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => !isReadOnly && !nilReturn && setIsVerified(!isVerified)}
                  className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${
                    nilReturn
                      ? 'bg-muted border-muted-foreground/20 cursor-not-allowed opacity-50'
                      : isVerified 
                        ? 'bg-green-600 border-green-600' 
                        : 'bg-background border-border hover:border-green-500'
                  }`}
                  disabled={isReadOnly || nilReturn}
                  title="Mark as Verified"
                >
                  {isVerified && <Check className="h-5 w-5 text-white" />}
                </button>
                <Label className="text-base">Verified</Label>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleSave} 
                    className="gap-2"
                    disabled={isSaving || isSubmitting}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {mode === 'edit' ? 'Update' : 'Save'}
                  </Button>
                  
                  {canSubmit && (
                    <Button 
                      onClick={handleSubmit}
                      variant="default"
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                      disabled={isSaving || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isSaving || isSubmitting}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section (optional) */}
      {!isViewMode && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this C3 submission..."
              className="w-full min-h-[100px] p-3 border rounded-md resize-none"
              disabled={isReadOnly}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
