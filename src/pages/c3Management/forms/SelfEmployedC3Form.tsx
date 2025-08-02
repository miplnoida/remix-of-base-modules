import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, Printer, Check } from "lucide-react";

interface SelfEmployedC3FormProps {
  data?: any;
  mode?: 'add' | 'edit' | 'view';
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export default function SelfEmployedC3Form({ data, mode = 'add', onSave, onClose }: SelfEmployedC3FormProps) {
  const isReadOnly = mode === 'view';
  
  const [formData, setFormData] = useState({
    ssn: data?.ssn || data?.payerId || "",
    name: data?.name || data?.payerName || "",
    address: data?.address || "",
    period: data?.period || "",
    dateReceived: data?.dateReceived || "",
    nilReturn: data?.nilReturn || false,
    status: data?.status || "pending"
  });

  const [weeklyDetails, setWeeklyDetails] = useState({
    weeks: data?.weeklyDetails?.weeks || {
      w1: false,
      w2: false,
      w3: false,
      w4: false,
      w5: false
    },
    totalWages: data?.weeklyDetails?.totalWages || data?.amount || 0,
    socialSecurityContribution: data?.weeklyDetails?.socialSecurityContribution || 0,
    penalties: data?.weeklyDetails?.penalties || 0
  });

  const [transactionInfo, setTransactionInfo] = useState({
    status: data?.transactionInfo?.status || "",
    dateEntered: data?.transactionInfo?.dateEntered || data?.dateEntered || "",
    enteredBy: data?.transactionInfo?.enteredBy || data?.enteredBy || "",
    dateModified: data?.transactionInfo?.dateModified || "",
    modifiedBy: data?.transactionInfo?.modifiedBy || "",
    dateVerified: data?.transactionInfo?.dateVerified || data?.dateVerified || "",
    verifiedBy: data?.transactionInfo?.verifiedBy || data?.verifiedBy || "",
    incomeCategory: data?.transactionInfo?.incomeCategory || ""
  });

  const [paymentInfo, setPaymentInfo] = useState({
    payments: data?.paymentInfo?.payments || 0,
    balance: data?.paymentInfo?.balance || 0
  });

  const [notes, setNotes] = useState(data?.notes || "");

  const handleFormChange = (field: string, value: any) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWeekChange = (week: string, checked: boolean) => {
    if (isReadOnly) return;
    setWeeklyDetails(prev => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [week]: checked
      }
    }));
  };

  const handleWeeklyDetailsChange = (field: string, value: any) => {
    if (isReadOnly) return;
    setWeeklyDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateSocialSecurityDue = () => {
    // Calculate 3% of total wages
    return weeklyDetails.totalWages * 0.03;
  };

  const handleSave = () => {
    if (isReadOnly) return;
    const formDataToSave = {
      ...formData,
      weeklyDetails,
      transactionInfo,
      paymentInfo,
      notes,
      calculatedSSDue: calculateSocialSecurityDue()
    };
    
    console.log("Saving Self Employed C3 form:", formDataToSave);
    onSave?.(formDataToSave);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-4 max-w-full overflow-hidden">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">ST CHRISTOPHER AND NEVIS - SOCIAL SECURITY</CardTitle>
          <CardDescription className="text-sm">
            Social Security Act, 1978; Social Services Levy Act, 1986; and the Protection of Employment Act, 1996<br/>
            <strong>SELF EMPLOYED PERSON CONTRIBUTION REMITTANCE FORM</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Enter full name"
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={formData.period}
                onChange={(e) => handleFormChange("period", e.target.value)}
                placeholder="MMM-YYYY"
                readOnly={isReadOnly}
              />
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="nilReturn"
                checked={formData.nilReturn}
                onCheckedChange={(checked) => handleFormChange("nilReturn", checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor="nilReturn">Nil Return</Label>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleFormChange("address", e.target.value)}
              placeholder="Enter address"
              rows={2}
              readOnly={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Transaction Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Input
                value={transactionInfo.status}
                onChange={(e) => setTransactionInfo({...transactionInfo, status: e.target.value})}
                placeholder="Status"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Entered</Label>
              <Input
                value={transactionInfo.dateEntered}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateEntered: e.target.value})}
                type="date"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Entered By</Label>
              <Input
                value={transactionInfo.enteredBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, enteredBy: e.target.value})}
                placeholder="Staff name"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Modified</Label>
              <Input
                value={transactionInfo.dateModified}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateModified: e.target.value})}
                type="date"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Modified By</Label>
              <Input
                value={transactionInfo.modifiedBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, modifiedBy: e.target.value})}
                placeholder="Staff name"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Verified</Label>
              <Input
                value={transactionInfo.dateVerified}
                onChange={(e) => setTransactionInfo({...transactionInfo, dateVerified: e.target.value})}
                type="date"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Verified By</Label>
              <Input
                value={transactionInfo.verifiedBy}
                onChange={(e) => setTransactionInfo({...transactionInfo, verifiedBy: e.target.value})}
                placeholder="Staff name"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Income Category</Label>
              <Input
                value={transactionInfo.incomeCategory}
                onChange={(e) => setTransactionInfo({...transactionInfo, incomeCategory: e.target.value})}
                placeholder="Income category"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Details</CardTitle>
          <CardDescription>Put the "✓" in the week(s) worked</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Weekly Selection */}
            <div>
              <Label className="text-base font-medium">Week(s)</Label>
              <div className="flex gap-4 mt-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((week) => (
                  <div key={week} className="flex items-center space-x-2">
                    <Checkbox
                      id={`week${week}`}
                      checked={weeklyDetails.weeks[`w${week}` as keyof typeof weeklyDetails.weeks]}
                      onCheckedChange={(checked) => handleWeekChange(`w${week}`, checked as boolean)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor={`week${week}`}>{week}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalWages">Total Wages</Label>
                <Input
                  id="totalWages"
                  type="number"
                  value={weeklyDetails.totalWages}
                  onChange={(e) => handleWeeklyDetailsChange("totalWages", parseFloat(e.target.value) || 0)}
                  placeholder="$0.00"
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialSecurityContribution">Social Security Contribution</Label>
                <Input
                  id="socialSecurityContribution"
                  type="number"
                  value={weeklyDetails.socialSecurityContribution}
                  onChange={(e) => handleWeeklyDetailsChange("socialSecurityContribution", parseFloat(e.target.value) || 0)}
                  placeholder="$0.00"
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="penalties">Penalties</Label>
                <Input
                  id="penalties"
                  type="number"
                  value={weeklyDetails.penalties}
                  onChange={(e) => handleWeeklyDetailsChange("penalties", parseFloat(e.target.value) || 0)}
                  placeholder="$0.00"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Summary */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded border">
              <span className="font-medium">Social Security Contribution due for the month →</span>
              <span className="font-mono text-lg font-bold">${calculateSocialSecurityDue().toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payments:</Label>
                <div className="text-lg font-mono">${paymentInfo.payments.toFixed(2)}</div>
              </div>
              <div className="space-y-2">
                <Label>Balance:</Label>
                <div className="text-lg font-mono">${paymentInfo.balance.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            rows={3}
            readOnly={isReadOnly}
          />
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