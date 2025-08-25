import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Check } from "lucide-react";

// PreviewField component for view mode
const PreviewField = ({ label, value, required = false }: { label: string; value: string | number | null | undefined; required?: boolean }) => (
  <div>
    <Label className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <div className="mt-1 text-sm text-gray-600  rounded-md">
      {value || 'Not specified'}
    </div>
  </div>
);

interface VoluntaryC3FormProps {
  data?: any;
  mode?: 'add' | 'edit' | 'view';
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function VoluntaryC3Form({ data, mode = 'add', onSave, onClose }: VoluntaryC3FormProps) {
  const isReadOnly = mode === 'view';
  const isViewMode = mode === 'view';
  
  const [formData, setFormData] = useState({
    ssn: data?.ssn || (isViewMode ? "123-45-6789" : ""),
    period: data?.period || "June 2028",
    dateReceived: data?.dateReceived || (isViewMode ? "2024-01-15" : "06-Jun-2025"),
    name: data?.name || "Flemming, Rodney And Melissa",
    address: data?.address || "Cades Bay Nevis",
    numberOfEmployees: data?.numberOfEmployees || "1",
    status: data?.status || "Pending",
    payments: data?.payments || "0.00",
    balance: data?.balance || "0.00"
  });

  const [wagesDetails, setWagesDetails] = useState({
    weeks: isViewMode ? [true, true, true, false, false] : [false, false, false, false, false],
    totalWages: data?.totalWages || (isViewMode ? 1200 : 0),
    socialSecurityContribution: data?.socialSecurityContribution || (isViewMode ? 36 : 0),
    isVerified: data?.isVerified || (isViewMode ? true : false)
  });

  const [totals, setTotals] = useState({
    socialSecurityDue: 0,
    payments: 0,
    balance: 0
  });

  const formatMoney = (amount: number | string) => {
    const numeric = typeof amount === 'string' ? Number(amount || 0) : amount || 0;
    return `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleFormChange = (field: string, value: any) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWeekChange = (index: number, checked: boolean) => {
    if (isReadOnly) return;
    const newWeeks = [...wagesDetails.weeks];
    newWeeks[index] = checked;
    setWagesDetails(prev => ({
      ...prev,
      weeks: newWeeks
    }));
  };

  const handleWagesDetailsChange = (field: string, value: any) => {
    if (isReadOnly) return;
    setWagesDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateSocialSecurityDue = () => {
    return wagesDetails.totalWages * 0.03; // 3% of total wages
  };

  const handleSave = () => {
    if (isReadOnly) return;
    const formDataToSave = {
      ...formData,
      wagesDetails,
      totals: {
        ...totals,
        socialSecurityDue: calculateSocialSecurityDue()
      }
    };
    
    console.log("Saving Voluntary C3 form:", formDataToSave);
    onSave?.(formDataToSave);
  };

  const handlePrint = () => {
    window.print();
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PreviewField label="SSN" value={formData.ssn} required />
              <PreviewField label="Period" value={formData.period} required />
              <PreviewField label="Date Received" value={formData.dateReceived} required />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ssn">SSN</Label>
                <Input
                  id="ssn"
                  value={formData.ssn}
                  onChange={(e) => handleFormChange("ssn", e.target.value)}
                  placeholder="Enter SSN"
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select value={formData.period} onValueChange={(value) => handleFormChange("period", value)} disabled={isReadOnly}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="June 2028">June 2028</SelectItem>
                    <SelectItem value="July 2028">July 2028</SelectItem>
                    <SelectItem value="August 2028">August 2028</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateReceived">Date Received</Label>
                <Input
                  id="dateReceived"
                  type="date"
                  value={formData.dateReceived}
                  onChange={(e) => handleFormChange("dateReceived", e.target.value)}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          )}

          {/* Read-only information in gray card */}
          <div className="mt-6 bg-gray-100 rounded-lg p-4 border-2 border-[#9D9D9D]">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Name</Label>
                <div className="text-sm text-gray-600">{formData.name}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Address</Label>
                <div className="text-sm text-gray-600">{formData.address}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Number Of Employees</Label>
                <div className="text-sm text-gray-600">{formData.numberOfEmployees}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Status</Label>
                <div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {formData.status}
                </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Payments</Label>
                <div className="text-sm text-gray-600">${formData.payments}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-900">Balance</Label>
                <div className="text-sm text-gray-600">${formData.balance}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      

      {/* Wages Details */}
      <Card>
        <CardHeader>
          <CardTitle>Wages Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isViewMode ? (
            <div className="space-y-6">
              {/* Row 1: Totals preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Total Wages</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border">
                    {formatMoney(wagesDetails.totalWages)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Social Security Contribution</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border">
                    {formatMoney(wagesDetails.socialSecurityContribution)}
                  </div>
                </div>
              </div>

              {/* Row 2: Selected Weeks preview (button-style, non-interactive) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Weeks</Label>
                <div className="flex gap-8">
                  {[1, 2, 3, 4, 5].map((week, index) => (
                    <div key={index} className="flex flex-col items-start space-y-2">
                      <span className="text-sm">{week} Week</span>
                      <div
                        className={`h-10 w-10 rounded-md border flex items-center justify-center ${wagesDetails.weeks[index] ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                        title={`Week ${week}`}
                      >
                        {wagesDetails.weeks[index] && <Check className="h-5 w-5 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Verified indicator */}
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-md border flex items-center justify-center ${wagesDetails.isVerified ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'}`}
                    title="Verified?"
                  >
                    {wagesDetails.isVerified && <Check className="h-5 w-5 text-white" />}
                  </div>
                  <Label className="text-base">Verified</Label>
                </div>
                <div />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Row 1: Total Wages, Social Security Contribution */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="totalWages">Total Wages</Label>
                  <Input
                    id="totalWages"
                    type="text"
                    value={wagesDetails.totalWages}
                    onChange={(e) => handleWagesDetailsChange("totalWages", parseFloat(e.target.value) || 0)}
                    placeholder="Wage"
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialSecurityContribution">Social Security Contribution</Label>
                  <Input
                    id="socialSecurityContribution"
                    type="text"
                    value={wagesDetails.socialSecurityContribution}
                    onChange={(e) => handleWagesDetailsChange("socialSecurityContribution", parseFloat(e.target.value) || 0)}
                    placeholder="Social Security Contribution"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* Row 2: Selected Weeks with button-style checkboxes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Weeks</Label>
                <div className="flex gap-8">
                  {[1, 2, 3, 4, 5].map((week, index) => (
                    <div key={index} className="flex flex-col items-start space-y-2">
                      <span className="text-sm">{week} Week</span>
                      <button
                        type="button"
                        onClick={() => handleWeekChange(index, !wagesDetails.weeks[index])}
                        className={`h-10 w-10 rounded-md border flex items-center justify-center ${wagesDetails.weeks[index] ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                        disabled={isReadOnly}
                        title={`Week ${week}`}
                      >
                        {wagesDetails.weeks[index] && <Check className="h-5 w-5 text-white" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Verified left; Save Changes and Clear right */}
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => !isReadOnly && handleWagesDetailsChange("isVerified", !wagesDetails.isVerified)}
                    className={`h-10 w-10 rounded-md border flex items-center justify-center ${wagesDetails.isVerified ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'}`}
                    disabled={isReadOnly}
                    title="Verified?"
                  >
                    {wagesDetails.isVerified && <Check className="h-5 w-5 text-white" />}
                  </button>
                  <Label className="text-base">Verified</Label>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 gap-2" disabled={isReadOnly}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button variant="outline" className="bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300" onClick={() => setWagesDetails({ weeks: [false, false, false, false, false], totalWages: 0, socialSecurityContribution: 0, isVerified: false })} disabled={isReadOnly}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <CardTitle>Total</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium  text-gray-500">Social Security Contribution due for the month</Label>
            <div className="text-lg font-semibold">{formatMoney(calculateSocialSecurityDue())}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-500">Payments</Label>
            <div className="text-lg font-semibold ">{formatMoney(totals.payments)}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-500">Balance</Label>
            <div className="text-lg font-semibold ">{formatMoney(totals.balance)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}