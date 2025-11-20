import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlusCircle, Save, RefreshCw, X, Plus, Building2, User, Phone, Mail } from 'lucide-react';

interface PaymentHead {
  id: string;
  type: string;
  amount: string;
  description: string;
}

interface InvoiceFormData {
  // Invoice Classification
  type: 'contribution' | 'rent' | 'loan' | 'service' | '';
  paymentSource: 'counter' | 'online' | 'bank_transfer' | 'check' | 'eft' | '';
  purpose: string;
  
  // Payer Details
  payerType: 'employer' | 'individual' | 'contributor' | '';
  payerName: string;
  payerId: string;
  payerPhone: string;
  payerEmail: string;
  payerAddress: string;
  
  // Organization Details (for employers/organizations)
  organizationName: string;
  organizationDepartment: string;
  organizationDivision: string;
  contactPersonName: string;
  contactPersonPosition: string;
  
  // Payment Details
  paymentHeads: PaymentHead[];
  totalAmount: string;
  currency: 'XCD' | 'USD';
  dueDate: string;
  
  // Additional Information
  description: string;
  reference: string;
  internalNotes: string;
  
  // Tracking Metadata
  receivedBy: string;
  processedBy: string;
  department: string;
  
  // Recurring Options
  isRecurring: boolean;
  recurringFrequency: 'monthly' | 'quarterly' | 'annually' | '';
}

const CreateInvoice: React.FC = () => {
  const [formData, setFormData] = useState<InvoiceFormData>({
    type: '',
    paymentSource: '',
    purpose: '',
    payerType: '',
    payerName: '',
    payerId: '',
    payerPhone: '',
    payerEmail: '',
    payerAddress: '',
    organizationName: '',
    organizationDepartment: '',
    organizationDivision: '',
    contactPersonName: '',
    contactPersonPosition: '',
    paymentHeads: [{ id: '1', type: '', amount: '', description: '' }],
    totalAmount: '0.00',
    currency: 'XCD',
    dueDate: '',
    description: '',
    reference: '',
    internalNotes: '',
    receivedBy: '',
    processedBy: '',
    department: '',
    isRecurring: false,
    recurringFrequency: ''
  });

  const handleInputChange = (field: keyof InvoiceFormData, value: string | boolean | PaymentHead[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPaymentHeadOptions = () => {
    switch (formData.type) {
      case 'loan':
        return [
          'Loan Repayment - Principal',
          'Loan Repayment - Interest',
          'Loan Repayment - Penalty',
          'Late Payment Fee'
        ];
      case 'service':
        return [
          'Card Reissuance',
          'ID Card Replacement',
          'Pension Letter',
          'Certificate Fee',
          'Processing Fee',
          'Document Verification',
          'Statement Request'
        ];
      case 'contribution':
        return [
          'Social Security Contribution',
          'Levy Payment',
          'Pension Fund Contribution',
          'Late Payment Penalty',
          'Interest Charge'
        ];
      case 'rent':
        return [
          'Office Rent',
          'Equipment Rental',
          'Facility Rental',
          'Utility Charges',
          'Maintenance Fee'
        ];
      default:
        return [];
    }
  };

  const addPaymentHead = () => {
    const newId = (formData.paymentHeads.length + 1).toString();
    const newPaymentHead: PaymentHead = {
      id: newId,
      type: '',
      amount: '',
      description: ''
    };
    handleInputChange('paymentHeads', [...formData.paymentHeads, newPaymentHead]);
  };

  const removePaymentHead = (id: string) => {
    if (formData.paymentHeads.length > 1) {
      const updatedHeads = formData.paymentHeads.filter(head => head.id !== id);
      handleInputChange('paymentHeads', updatedHeads);
      calculateTotal(updatedHeads);
    }
  };

  const updatePaymentHead = (id: string, field: keyof PaymentHead, value: string) => {
    const updatedHeads = formData.paymentHeads.map(head =>
      head.id === id ? { ...head, [field]: value } : head
    );
    handleInputChange('paymentHeads', updatedHeads);
    
    if (field === 'amount') {
      calculateTotal(updatedHeads);
    }
  };

  const calculateTotal = (paymentHeads: PaymentHead[]) => {
    const total = paymentHeads.reduce((sum, head) => {
      const amount = parseFloat(head.amount) || 0;
      return sum + amount;
    }, 0);
    handleInputChange('totalAmount', total.toFixed(2));
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${sequence}`;
  };

  const handleCreateInvoice = () => {
    // Validation
    if (!formData.type || !formData.payerName || !formData.dueDate || 
        !formData.paymentSource || !formData.purpose ||
        formData.paymentHeads.some(head => !head.type || !head.amount)) {
      toast.error('Please fill in all required fields including payment source, purpose, and payment heads');
      return;
    }

    const invoiceNumber = generateInvoiceNumber();
    
    // Here you would normally save to your data store
    toast.success(`Invoice ${invoiceNumber} created successfully with ${formData.paymentHeads.length} payment head(s)`);
    
    // Reset form
    setFormData({
      type: '',
      paymentSource: '',
      purpose: '',
      payerType: '',
      payerName: '',
      payerId: '',
      payerPhone: '',
      payerEmail: '',
      payerAddress: '',
      organizationName: '',
      organizationDepartment: '',
      organizationDivision: '',
      contactPersonName: '',
      contactPersonPosition: '',
      paymentHeads: [{ id: '1', type: '', amount: '', description: '' }],
      totalAmount: '0.00',
      currency: 'XCD',
      dueDate: '',
      description: '',
      reference: '',
      internalNotes: '',
      receivedBy: '',
      processedBy: '',
      department: '',
      isRecurring: false,
      recurringFrequency: ''
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Invoice</h1>
          <p className="text-muted-foreground">Create comprehensive invoices with full tracking details</p>
        </div>
        <Badge variant="outline" className="text-sm">
          New Invoice
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Invoice Classification & Source
          </CardTitle>
          <CardDescription>
            Define the type, source, and purpose of this invoice for comprehensive tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Invoice Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Invoice Type *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">Contribution</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Source */}
            <div className="space-y-2">
              <Label htmlFor="paymentSource">Payment Source *</Label>
              <Select value={formData.paymentSource} onValueChange={(value) => handleInputChange('paymentSource', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counter">Counter Payment</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="eft">EFT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose/Reason *</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="e.g., Monthly contribution, Service fee"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Payer Information
          </CardTitle>
          <CardDescription>
            Complete details about the person or organization making the payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payer Type */}
            <div className="space-y-2">
              <Label htmlFor="payerType">Payer Type *</Label>
              <Select value={formData.payerType} onValueChange={(value) => handleInputChange('payerType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payer Name */}
            <div className="space-y-2">
              <Label htmlFor="payerName">Payer Name *</Label>
              <Input
                id="payerName"
                value={formData.payerName}
                onChange={(e) => handleInputChange('payerName', e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            {/* Payer ID */}
            <div className="space-y-2">
              <Label htmlFor="payerId">Payer ID/SSN</Label>
              <Input
                id="payerId"
                value={formData.payerId}
                onChange={(e) => handleInputChange('payerId', e.target.value)}
                placeholder="Enter ID or SSN"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="payerPhone">Phone Number</Label>
              <div className="flex gap-2">
                <Phone className="h-4 w-4 self-center text-muted-foreground" />
                <Input
                  id="payerPhone"
                  value={formData.payerPhone}
                  onChange={(e) => handleInputChange('payerPhone', e.target.value)}
                  placeholder="(869) 123-4567"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="payerEmail">Email Address</Label>
              <div className="flex gap-2">
                <Mail className="h-4 w-4 self-center text-muted-foreground" />
                <Input
                  id="payerEmail"
                  type="email"
                  value={formData.payerEmail}
                  onChange={(e) => handleInputChange('payerEmail', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="payerAddress">Address</Label>
              <Input
                id="payerAddress"
                value={formData.payerAddress}
                onChange={(e) => handleInputChange('payerAddress', e.target.value)}
                placeholder="Street address, city, parish"
              />
            </div>
          </div>

          {/* Organization Details (shown for employer type) */}
          {formData.payerType === 'employer' && (
            <>
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Name</Label>
                    <Input
                      id="organizationName"
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange('organizationName', e.target.value)}
                      placeholder="Company/Organization name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organizationDepartment">Department</Label>
                    <Input
                      id="organizationDepartment"
                      value={formData.organizationDepartment}
                      onChange={(e) => handleInputChange('organizationDepartment', e.target.value)}
                      placeholder="e.g., Finance, HR, Operations"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organizationDivision">Division/Branch</Label>
                    <Input
                      id="organizationDivision"
                      value={formData.organizationDivision}
                      onChange={(e) => handleInputChange('organizationDivision', e.target.value)}
                      placeholder="Division or branch location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPersonName">Contact Person</Label>
                    <Input
                      id="contactPersonName"
                      value={formData.contactPersonName}
                      onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                      placeholder="Contact person name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPersonPosition">Contact Position</Label>
                    <Input
                      id="contactPersonPosition"
                      value={formData.contactPersonPosition}
                      onChange={(e) => handleInputChange('contactPersonPosition', e.target.value)}
                      placeholder="Job title/position"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Heads</CardTitle>
          <CardDescription>
            Add multiple payment heads for different charge types within this invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Payment Heads *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addPaymentHead}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Payment Head
              </Button>
            </div>

            {formData.paymentHeads.map((head, index) => (
              <Card key={head.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Type *</Label>
                      <Select 
                        value={head.type} 
                        onValueChange={(value) => updatePaymentHead(head.id, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {getPaymentHeadOptions().map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <div className="flex gap-2">
                        <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm">
                          {formData.currency}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          value={head.amount}
                          onChange={(e) => updatePaymentHead(head.id, 'amount', e.target.value)}
                          placeholder="0.00"
                          className="rounded-l-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={head.description}
                        onChange={(e) => updatePaymentHead(head.id, 'description', e.target.value)}
                        placeholder="Enter description"
                      />
                    </div>

                    <div className="flex items-end">
                      {formData.paymentHeads.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePaymentHead(head.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Total Amount Display */}
            <div className="flex justify-end">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold text-primary">
                  {formData.currency} {formData.totalAmount}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Currency Selection */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XCD">XCD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="External reference"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processing & Tracking Information</CardTitle>
          <CardDescription>
            Internal tracking details for audit and management purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="receivedBy">Received By</Label>
              <Input
                id="receivedBy"
                value={formData.receivedBy}
                onChange={(e) => handleInputChange('receivedBy', e.target.value)}
                placeholder="Staff member name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="processedBy">Processed By</Label>
              <Input
                id="processedBy"
                value={formData.processedBy}
                onChange={(e) => handleInputChange('processedBy', e.target.value)}
                placeholder="Processing officer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="contributions">Contributions</SelectItem>
                  <SelectItem value="benefits">Benefits</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Public Notes/Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional notes visible to payer"
              rows={2}
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes (Private)</Label>
            <Textarea
              id="internalNotes"
              value={formData.internalNotes}
              onChange={(e) => handleInputChange('internalNotes', e.target.value)}
              placeholder="Internal notes for staff use only"
              rows={2}
            />
          </div>

          {/* Recurring Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => handleInputChange('isRecurring', checked)}
              />
              <Label htmlFor="isRecurring">Recurring Invoice</Label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="recurringFrequency">Frequency</Label>
                <Select value={formData.recurringFrequency} onValueChange={(value) => handleInputChange('recurringFrequency', value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button onClick={handleCreateInvoice} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Create Invoice
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateInvoice;
