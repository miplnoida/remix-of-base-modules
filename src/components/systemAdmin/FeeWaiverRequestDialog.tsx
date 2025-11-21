import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeeWaiverRequest, WaiverType, InitiatorType } from "@/types/feeWaiver";
import { FeeCategory } from "@/types/feeConfiguration";
import { feeWaiverConfigurations } from "@/services/mockData/feeWaiverData";
import { AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FeeWaiverRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request?: FeeWaiverRequest;
  onSave: (request: Partial<FeeWaiverRequest>) => void;
}

export function FeeWaiverRequestDialog({
  open,
  onOpenChange,
  request,
  onSave,
}: FeeWaiverRequestDialogProps) {
  const [formData, setFormData] = useState<Partial<FeeWaiverRequest>>({
    feeCategory: 'Legal',
    waiverType: 'Percentage',
    initiatorType: 'Officer',
    payerType: 'Employer',
    status: 'Draft',
    ...request,
  });

  const [selectedConfig, setSelectedConfig] = useState<typeof feeWaiverConfigurations[0] | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>("");

  // Find available fees based on selected category
  const availableFees = feeWaiverConfigurations.filter(
    (config) => config.feeCategory === formData.feeCategory && config.allowWaiver && config.isActive
  );

  // Update selected config when fee code changes
  useEffect(() => {
    if (formData.feeCode) {
      const config = feeWaiverConfigurations.find(c => c.feeCode === formData.feeCode);
      setSelectedConfig(config || null);
      if (config) {
        setFormData(prev => ({ ...prev, feeName: config.feeName }));
      }
    }
  }, [formData.feeCode]);

  // Calculate waiver amount
  useEffect(() => {
    if (!formData.originalFeeAmount) return;

    let calculated = 0;
    let error = "";

    if (formData.waiverType === 'Percentage' && formData.waiverPercentage !== undefined) {
      if (formData.waiverPercentage < 0 || formData.waiverPercentage > 100) {
        error = "Percentage must be between 0 and 100";
      } else if (selectedConfig && formData.waiverPercentage > selectedConfig.maxWaiverPercentage) {
        error = `Maximum waiver percentage for this fee is ${selectedConfig.maxWaiverPercentage}%`;
      } else {
        calculated = (formData.originalFeeAmount * formData.waiverPercentage) / 100;
      }
    } else if (formData.waiverType === 'Amount' && formData.waiverAmount !== undefined) {
      if (formData.waiverAmount < 0 || formData.waiverAmount > formData.originalFeeAmount) {
        error = "Waiver amount cannot exceed original fee amount";
      } else if (selectedConfig && formData.waiverAmount > selectedConfig.maxWaiverAmount) {
        error = `Maximum waiver amount for this fee is XCD ${selectedConfig.maxWaiverAmount.toLocaleString()}`;
      } else {
        calculated = formData.waiverAmount;
      }
    }

    setValidationError(error);
    setCalculatedAmount(calculated);
    setFormData(prev => ({
      ...prev,
      calculatedWaiverAmount: calculated,
      amountAfterWaiver: (formData.originalFeeAmount || 0) - calculated,
    }));
  }, [formData.waiverType, formData.waiverPercentage, formData.waiverAmount, formData.originalFeeAmount, selectedConfig]);

  const handleSubmit = () => {
    if (validationError) return;

    const now = new Date().toISOString();
    const finalData: Partial<FeeWaiverRequest> = {
      ...formData,
      waiverNumber: request?.waiverNumber || `WVR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      calculatedWaiverAmount: calculatedAmount,
      amountAfterWaiver: (formData.originalFeeAmount || 0) - calculatedAmount,
      financialImpact: {
        lostRevenue: calculatedAmount,
        affectedGLAccount: '4000-Fee-Revenue',
        financialYear: new Date().getFullYear().toString(),
        posted: false,
      },
      createdBy: 'Current User',
      createdOn: request?.createdOn || now,
      lastModifiedBy: 'Current User',
      lastModifiedOn: now,
    };

    onSave(finalData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{request ? 'Edit' : 'Create'} Fee Waiver Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fee Selection Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fee Category *</Label>
                  <Select
                    value={formData.feeCategory || undefined}
                    onValueChange={(value) => setFormData({ ...formData, feeCategory: value as FeeCategory, feeCode: undefined, feeName: undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Benefits">Benefits</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Audit">Audit</SelectItem>
                      <SelectItem value="CaseManagement">Case Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fee Type *</Label>
                  <Select
                    value={formData.feeCode || undefined}
                    onValueChange={(value) => setFormData({ ...formData, feeCode: value })}
                    disabled={!formData.feeCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFees.length === 0 && (
                        <SelectItem value="none" disabled>No waiverable fees available</SelectItem>
                      )}
                      {availableFees.map((fee) => (
                        <SelectItem key={fee.configId} value={fee.feeCode}>
                          {fee.feeName} ({fee.feeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedConfig && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Waiver Limits:</strong> Max {selectedConfig.maxWaiverPercentage}% or XCD {selectedConfig.maxWaiverAmount.toLocaleString()} | 
                    <strong> Requires:</strong> {selectedConfig.minimumApprovalLevel} approval
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Original Fee Amount (XCD) *</Label>
                <Input
                  type="number"
                  placeholder="Enter original fee amount"
                  value={formData.originalFeeAmount || ''}
                  onChange={(e) => setFormData({ ...formData, originalFeeAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Waiver Type Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Waiver Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Waiver Type *</Label>
                <RadioGroup
                  value={formData.waiverType}
                  onValueChange={(value: WaiverType) => setFormData({ ...formData, waiverType: value, waiverAmount: undefined, waiverPercentage: undefined })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Percentage" id="percentage" />
                    <Label htmlFor="percentage">Percentage-Based</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Amount" id="amount" />
                    <Label htmlFor="amount">Fixed Amount</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.waiverType === 'Percentage' ? (
                <div className="space-y-2">
                  <Label>Waiver Percentage (%) *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Enter percentage (0-100)"
                    value={formData.waiverPercentage || ''}
                    onChange={(e) => setFormData({ ...formData, waiverPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Waiver Amount (XCD) *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter waiver amount"
                    value={formData.waiverAmount || ''}
                    onChange={(e) => setFormData({ ...formData, waiverAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}

              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {!validationError && calculatedAmount > 0 && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Original Amount</p>
                    <p className="text-lg font-semibold">XCD {formData.originalFeeAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Waiver Amount</p>
                    <p className="text-lg font-semibold text-orange-600">- XCD {calculatedAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount After Waiver</p>
                    <p className="text-lg font-semibold text-green-600">XCD {((formData.originalFeeAmount || 0) - calculatedAmount).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Context & Payer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Context & Payer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Context Module *</Label>
                  <Input
                    placeholder="e.g., Legal, Compliance"
                    value={formData.contextModule || ''}
                    onChange={(e) => setFormData({ ...formData, contextModule: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Context Reference *</Label>
                  <Input
                    placeholder="e.g., Case Number, Invoice Number"
                    value={formData.contextReference || ''}
                    onChange={(e) => setFormData({ ...formData, contextReference: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Payer Type *</Label>
                  <Select
                    value={formData.payerType || undefined}
                    onValueChange={(value: 'Employer' | 'InsuredPerson' | 'Other') => setFormData({ ...formData, payerType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employer">Employer</SelectItem>
                      <SelectItem value="InsuredPerson">Insured Person</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payer Name *</Label>
                  <Input
                    placeholder="Enter payer name"
                    value={formData.payerName || ''}
                    onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payer ID (TIN/SSN) *</Label>
                  <Input
                    placeholder="Enter TIN or SSN"
                    value={formData.payerIdentification || ''}
                    onChange={(e) => setFormData({ ...formData, payerIdentification: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Initiator Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Initiator Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Initiator Type *</Label>
                  <Select
                    value={formData.initiatorType || undefined}
                    onValueChange={(value: InitiatorType) => setFormData({ ...formData, initiatorType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Officer">Officer</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="System">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Initiator Name *</Label>
                  <Input
                    placeholder="Enter initiator name"
                    value={formData.initiatorName || ''}
                    onChange={(e) => setFormData({ ...formData, initiatorName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initiator Position</Label>
                  <Input
                    placeholder="Enter position"
                    value={formData.initiatorPosition || ''}
                    onChange={(e) => setFormData({ ...formData, initiatorPosition: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Justification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Justification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Waiver Reason *</Label>
                <Select
                  value={formData.waiverReason || undefined}
                  onValueChange={(value) => setFormData({ ...formData, waiverReason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financial Hardship">Financial Hardship</SelectItem>
                    <SelectItem value="First-Time Offender">First-Time Offender</SelectItem>
                    <SelectItem value="Indigent Applicant">Indigent Applicant</SelectItem>
                    <SelectItem value="Technical Error">Technical Error</SelectItem>
                    <SelectItem value="System Malfunction">System Malfunction</SelectItem>
                    <SelectItem value="Goodwill Gesture">Goodwill Gesture</SelectItem>
                    <SelectItem value="Policy Exception">Policy Exception</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Detailed Justification *</Label>
                <Textarea
                  placeholder="Provide detailed explanation for the waiver request..."
                  rows={4}
                  value={formData.justificationDetails || ''}
                  onChange={(e) => setFormData({ ...formData, justificationDetails: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Supporting Documents</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click or drag files to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG up to 10MB</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add any internal notes (optional)..."
                  rows={2}
                  value={formData.internalNotes || ''}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!!validationError || !formData.feeCode || !formData.originalFeeAmount}>
            {request ? 'Update' : 'Create'} Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
