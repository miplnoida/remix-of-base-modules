import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Printer, Check } from "lucide-react";

// PreviewField component for view mode
const PreviewField = ({ label, value, required = false }: { label: string; value: string | number | null | undefined; required?: boolean }) => (
  <div>
    <Label className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <div className="mt-1 text-sm text-gray-600 bg-gray-50 rounded-md">
      {value || 'Not specified'}
    </div>
  </div>
);

interface SelfEmployedC3FormProps {
  data?: any;
  mode?: 'add' | 'edit' | 'view';
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function SelfEmployedC3Form({ data, mode = 'add', onSave, onClose }: SelfEmployedC3FormProps) {
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
    totalWages: data?.totalWages || (isViewMode ? 1500 : 0),
    socialSecurityContribution: data?.socialSecurityContribution || (isViewMode ? 45 : 0),
    penalties: data?.penalties || (isViewMode ? 25 : 0),
    isVerified: data?.isVerified || (isViewMode ? true : false)
  });

  const [totals, setTotals] = useState({
    socialSecurityDue: 0,
    payments: 0,
    balance: 0
  });

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
    
    console.log("Saving Self Employed C3 form:", formDataToSave);
    onSave?.(formDataToSave);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-6 space-y-6">
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
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {formData.status}
                </Badge>
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

      {/* Totals */}
      <div className="space-y-2 flex justify-start">
        <Label className="text-sm font-medium text-gray-600 mr-4">Totals</Label>
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#9D9D9D] w-full">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-900">Social Security Contribution due for this month</Label>
              <div className="text-sm text-gray-600">${calculateSocialSecurityDue().toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="w-full">
          
        </div>
      </div>

      {/* Wages Details */}
      <Card>
        <CardHeader>
          <CardTitle>Wages Details</CardTitle>
         
        </CardHeader>
        <CardContent>
          {isViewMode ? (
            <div className="space-y-6">
              {/* Week checkboxes and Total Wages & Social Security Contribution on same line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Week checkboxes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Weeks Worked</Label>
                                     <div className="flex gap-4">
                     {[1, 2, 3, 4, 5].map((week, index) => (
                       <div key={index} className="flex flex-col items-center space-y-1">
                         <span className="text-sm">{week}</span>
                                                   <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border h-6 flex items-center justify-center min-w-[24px]">
                            {wagesDetails.weeks[index] ? '✓' : ''}
                          </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Total Wages & Social Security Contribution */}
                <div className="grid grid-cols-2 gap-4">
                  <PreviewField label="Total Wages" value={`$${wagesDetails.totalWages?.toFixed(2) || '0.00'}`} />
                  <PreviewField label="Social Security Contribution" value={`$${wagesDetails.socialSecurityContribution?.toFixed(2) || '0.00'}`} />
                </div>
              </div>

              {/* Penalties & Verified checkbox and Record Wages button on same line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <PreviewField label="Penalties" value={`$${wagesDetails.penalties?.toFixed(2) || '0.00'}`} />
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border">
                    {wagesDetails.isVerified ? '✓ Verified' : 'Not Verified'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Week checkboxes and Total Wages & Social Security Contribution on same line */}
              <div className="flex gap-12">
                {/* Week checkboxes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Put the "x" in the week(s) worked</Label>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((week, index) => (
                      <div key={index} className="flex flex-col items-center space-y-1">
                        <span className="text-sm">{week}</span>
                        <Checkbox
                          checked={wagesDetails.weeks[index]}
                          onCheckedChange={(checked) => handleWeekChange(index, checked as boolean)}
                          disabled={isReadOnly}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Wages & Social Security Contribution */}
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalWages">Total Wages</Label>
                    <Input
                      id="totalWages"
                      type="number"
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
                      type="number"
                      value={wagesDetails.socialSecurityContribution}
                      onChange={(e) => handleWagesDetailsChange("socialSecurityContribution", parseFloat(e.target.value) || 0)}
                      placeholder="Social Security Contribution"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>
              </div>

              {/* Penalties & Verified checkbox and Record Wages button on same line */}
              <div className="flex gap-8">
                <div className="space-y-2">
                  <Label htmlFor="penalties">Penalties</Label>
                  <Input
                    id="penalties"
                    type="number"
                    value={wagesDetails.penalties}
                    onChange={(e) => handleWagesDetailsChange("penalties", parseFloat(e.target.value) || 0)}
                    placeholder="Penalties"
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={wagesDetails.isVerified}
                      onCheckedChange={(checked) => handleWagesDetailsChange("isVerified", checked as boolean)}
                      disabled={isReadOnly}
                    />
                    <Label>Verified?</Label>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700" disabled={isReadOnly}>
                    Record Wages
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total (Automatically calculated totals and contributions) */}
      <Card>
        <CardHeader>
          <CardTitle>Total</CardTitle>
          <CardDescription>(Automatically calculated totals and contributions)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-900">Social Security Contribution due for the month</Label>
              <div className="text-sm text-gray-600">${calculateSocialSecurityDue().toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-900">Payments</Label>
              <div className="text-sm text-gray-600">${totals.payments.toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-900">Balance</Label>
              <div className="text-sm text-gray-600">${totals.balance.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {!isReadOnly && (
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                {mode === 'edit' ? 'Update' : 'Save'}
              </Button>
            )}
            {(mode === 'edit' || mode === 'add') && (
              <Button variant="outline" className="gap-2">
                <Check className="h-4 w-4" />
                Verify
              </Button>
            )}
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={onClose} variant="ghost" className="gap-2">
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}