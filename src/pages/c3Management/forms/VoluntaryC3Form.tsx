import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, Check, Loader2, AlertCircle } from "lucide-react";
import MonthYearPicker from "@/components/c3/MonthYearPicker";
import DatePickerWithDropdowns from "@/components/shared/DatePickerWithDropdowns";
import { useToast } from "@/hooks/use-toast";
import { 
  validateVoluntaryContributorSSN, 
  getNextScheduleNo,
  saveVoluntaryContributorC3 
} from "@/services/c3Service";
import { getMondaysInMonth } from "@/utils/selfContributorPenaltyCalculations";
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

interface VoluntaryC3FormProps {
  data?: any;
  mode?: 'add' | 'edit' | 'view';
  resetTrigger?: number;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function VoluntaryC3Form({ data, mode = 'add', resetTrigger, onSave, onClose }: VoluntaryC3FormProps) {
  const isReadOnly = mode === 'view';
  const isViewMode = mode === 'view';
  const { toast } = useToast();

  // Form state
  const [ssn, setSSN] = useState(data?.payerId || data?.ssn || "");
  const [period, setPeriod] = useState<{ year: number; month: number } | undefined>(
    data?.periodRaw ? { 
      year: new Date(data.periodRaw).getFullYear(), 
      month: new Date(data.periodRaw).getMonth() 
    } : undefined
  );
  const [dateReceived, setDateReceived] = useState<Date | undefined>(
    data?.dateReceived ? new Date(data.dateReceived) : new Date()
  );
  const [nilReturn, setNilReturn] = useState(data?.nilReturn || false);
  const [scheduleNo, setScheduleNo] = useState<number>(data?.sequence_no || 1);
  const [status, setStatus] = useState(data?.postingStatus || 'DFT');
  const [notes, setNotes] = useState(data?.notes || "");

  // Auto-populated fields from ip_vol_contrib
  const [name, setName] = useState(data?.payerName || "");
  const [address, setAddress] = useState(data?.payerAddress || "");
  const [weeklyWage, setWeeklyWage] = useState<number>(0); // avg_weekly_wage
  const [weeklyContribution, setWeeklyContribution] = useState<number>(0); // contrib_amount

  // Validation states
  const [ssnValidating, setSSNValidating] = useState(false);
  const [ssnError, setSsnError] = useState<string | null>(null);
  const [ssnValid, setSsnValid] = useState(false);

  // Wages Details state
  const [selectedWeeks, setSelectedWeeks] = useState<boolean[]>([false, false, false, false, false]);
  const [isVerified, setIsVerified] = useState(data?.isVerified || false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);

  // Calculate number of Mondays in selected period
  const mondaysInMonth = useMemo(() => {
    if (!period) return 4;
    return getMondaysInMonth(period.year, period.month);
  }, [period]);

  // Calculate total wages based on selected weeks (Weekly Wage * selected weeks)
  const totalWages = useMemo(() => {
    if (nilReturn) return 0;
    const weeksSelected = selectedWeeks.filter(Boolean).length;
    return Math.round(weeklyWage * weeksSelected * 100) / 100;
  }, [weeklyWage, selectedWeeks, nilReturn]);

  // Calculate SS contribution (Weekly Contribution * selected weeks)
  const ssContribution = useMemo(() => {
    if (nilReturn) return 0;
    const weeksSelected = selectedWeeks.filter(Boolean).length;
    return Math.round(weeklyContribution * weeksSelected * 100) / 100;
  }, [weeklyContribution, selectedWeeks, nilReturn]);


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

  // Validate SSN against ip_vol_contrib
  const validateSSN = useCallback(async () => {
    if (!ssn || ssn.length < 1) {
      setSsnError(null);
      setSsnValid(false);
      setName("");
      setAddress("");
      setWeeklyWage(0);
      setWeeklyContribution(0);
      return;
    }

    setSSNValidating(true);
    setSsnError(null);

    try {
      const result = await validateVoluntaryContributorSSN(ssn);
      
      if (!result.isValid) {
        setSsnError(result.message);
        setSsnValid(false);
        setName(result.name || "");
        setAddress(result.address || "");
        setWeeklyWage(0);
        setWeeklyContribution(0);
      } else {
        setName(result.name);
        setAddress(result.address);
        setWeeklyWage(result.avgWeeklyWage);
        setWeeklyContribution(result.contribAmount);
        setSsnValid(true);
      }
    } catch (error: any) {
      setSsnError(error.message || "Error validating SSN");
      setSsnValid(false);
    } finally {
      setSSNValidating(false);
    }
  }, [ssn]);

  // Fetch schedule number when SSN or period changes
  useEffect(() => {
    const fetchScheduleNo = async () => {
      if (ssn && period && !data?.id) {
        const periodStr = new Date(period.year, period.month, 1).toISOString();
        const nextSchedule = await getNextScheduleNo(ssn, 'VC', periodStr);
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
    setNilReturn(false);
    setScheduleNo(1);
    setStatus('DFT');
    setNotes("");
    setName("");
    setAddress("");
    setWeeklyWage(0);
    setWeeklyContribution(0);
    setSelectedWeeks([false, false, false, false, false]);
    setIsVerified(false);
    setSsnError(null);
    setSsnValid(false);
  };

  // Handle reset trigger from parent
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && mode === 'add') {
      resetForm();
    }
  }, [resetTrigger, mode]);

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
      toast({ title: "Error", description: "Please enter a valid SSN with voluntary contribution data", variant: "destructive" });
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
        id: data?.id,
        payer_id: ssn,
        payer_type: 'VC',
        sequence_no: scheduleNo,
        period: periodStr,
        total_wages: totalWages,
        emp_ss_amt_calc: ssContribution,
        emp_ss_fines_due: 0, // Penalties not applicable for Voluntary Contributor
        date_received: dateReceived?.toISOString(),
        nil_return: nilReturn,
        payer_name: name,
        payer_address: address,
        notes,
        posting_status: 'Z', // Draft status (Z=Draft, P=Pending, V=Verified, D=Deleted)
        // Additional data for UI
        weeklyWage,
        weeklyContribution,
        selectedWeeks,
        isVerified
      };

      const result = await saveVoluntaryContributorC3(formDataToSave);

      if (result.success) {
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

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isViewMode ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <PreviewField label="SSN" value={ssn} required />
              <PreviewField label="Period" value={period ? `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][period.month]} ${period.year}` : ''} required />
              <PreviewField label="Date Received" value={dateReceived ? formatDate(dateReceived) : ''} required />
              <PreviewField label="Schedule" value={`SCH-${scheduleNo}`} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wages Details - Only show if NOT Nil Return */}
      {!nilReturn && (
        <Card>
          <CardHeader>
            <CardTitle>Wages Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isViewMode ? (
              <div className="space-y-6">
                {/* Row 1: Totals preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Total Wages</Label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border">
                      {formatMoney(totalWages)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Social Security Contribution</Label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border">
                      {formatMoney(ssContribution)}
                    </div>
                  </div>
                </div>

                {/* Row 2: Selected Weeks preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Weeks</Label>
                  <div className="flex gap-8">
                    {[1, 2, 3, 4, 5].map((week, index) => (
                      <div key={index} className="flex flex-col items-start space-y-2">
                        <span className="text-sm">{week} Week</span>
                        <div
                          className={`h-10 w-10 rounded-md border flex items-center justify-center ${
                            index < mondaysInMonth 
                              ? (selectedWeeks[index] ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300')
                              : 'bg-gray-100 border-gray-200 opacity-50'
                          }`}
                        >
                          {selectedWeeks[index] && index < mondaysInMonth && <Check className="h-5 w-5 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 3: Verified indicator */}
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-md border flex items-center justify-center ${isVerified ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'}`}
                  >
                    {isVerified && <Check className="h-5 w-5 text-white" />}
                  </div>
                  <Label className="text-base">Verified</Label>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Row 1: Total Wages, Social Security Contribution - All Read-Only */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Total Wages</Label>
                    <Input
                      value={formatMoney(totalWages)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Social Security Contribution</Label>
                    <Input
                      value={formatMoney(ssContribution)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* Row 2: Selected Weeks with button-style checkboxes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Weeks in Period</Label>
                  <div className="flex gap-8">
                    {[1, 2, 3, 4, 5].map((week, index) => {
                      const isEnabled = index < mondaysInMonth;
                      return (
                        <div key={index} className="flex flex-col items-start space-y-2">
                          <span className={`text-sm ${!isEnabled ? 'text-muted-foreground' : ''}`}>{week} Week</span>
                          <button
                            type="button"
                            onClick={() => isEnabled && handleWeekChange(index, !selectedWeeks[index])}
                            className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${
                              isEnabled 
                                ? (selectedWeeks[index] ? 'bg-blue-600 border-blue-600 hover:bg-blue-700' : 'bg-white border-gray-300 hover:border-blue-400')
                                : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                            }`}
                            disabled={isReadOnly || !isEnabled}
                            title={isEnabled ? `Week ${week}` : `No ${week}th Monday in this month`}
                          >
                            {selectedWeeks[index] && isEnabled && <Check className="h-5 w-5 text-white" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mondaysInMonth === 5 
                      ? "This month has 5 Mondays - all weeks available" 
                      : `This month has ${mondaysInMonth} Mondays - Week 5 is disabled`
                    }
                  </p>
                </div>

                {/* Row 3: Verified and Actions */}
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => !isReadOnly && setIsVerified(!isVerified)}
                      className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${
                        isVerified ? 'bg-green-600 border-green-600 hover:bg-green-700' : 'bg-white border-gray-300 hover:border-green-400'
                      }`}
                      disabled={isReadOnly}
                      title="Mark as Verified"
                    >
                      {isVerified && <Check className="h-5 w-5 text-white" />}
                    </button>
                    <Label className="text-base">Verified</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleSave} 
                      className="bg-green-600 hover:bg-green-700 gap-2" 
                      disabled={isReadOnly || isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300" 
                      onClick={resetForm} 
                      disabled={isReadOnly}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Nil Return Message */}
      {nilReturn && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Nil Return Selected</p>
              <p className="text-sm mt-2">No wages data is required for this submission.</p>
              <div className="mt-6">
                <Button 
                  onClick={handleSave} 
                  className="bg-green-600 hover:bg-green-700 gap-2" 
                  disabled={isReadOnly || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Nil Return
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Summary */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <CardTitle>Total</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-500">Total Wages</Label>
            <div className="text-lg font-semibold">{formatMoney(totalWages)}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-500">Social Security Due</Label>
            <div className="text-lg font-semibold">{formatMoney(ssContribution)}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-500">Total Due</Label>
            <div className="text-lg font-semibold text-primary">
              {formatMoney(ssContribution)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
