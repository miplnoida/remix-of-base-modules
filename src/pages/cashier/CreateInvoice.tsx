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
import { PlusCircle, Save, RefreshCw } from 'lucide-react';

interface InvoiceFormData {
  type: 'contribution' | 'rent' | 'loan' | 'service' | '';
  payerType: 'employer' | 'individual' | 'contributor' | '';
  payerName: string;
  payerId: string;
  amount: string;
  currency: 'EC$' | 'US$';
  dueDate: string;
  description: string;
  category: string;
  reference: string;
  isRecurring: boolean;
  recurringFrequency: 'monthly' | 'quarterly' | 'annually' | '';
}

const CreateInvoice: React.FC = () => {
  const [formData, setFormData] = useState<InvoiceFormData>({
    type: '',
    payerType: '',
    payerName: '',
    payerId: '',
    amount: '',
    currency: 'EC$',
    dueDate: '',
    description: '',
    category: '',
    reference: '',
    isRecurring: false,
    recurringFrequency: ''
  });

  const handleInputChange = (field: keyof InvoiceFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${sequence}`;
  };

  const handleCreateInvoice = () => {
    if (!formData.type || !formData.payerName || !formData.amount || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const invoiceNumber = generateInvoiceNumber();
    
    // Here you would normally save to your data store
    toast.success(`Invoice ${invoiceNumber} created successfully`);
    
    // Reset form
    setFormData({
      type: '',
      payerType: '',
      payerName: '',
      payerId: '',
      amount: '',
      currency: 'EC$',
      dueDate: '',
      description: '',
      category: '',
      reference: '',
      isRecurring: false,
      recurringFrequency: ''
    });
  };

  const getCategoryOptions = () => {
    switch (formData.type) {
      case 'contribution':
        return ['Social Security', 'Levy', 'Pension Fund'];
      case 'rent':
        return ['Office Rent', 'Equipment Rental', 'Facility Rental'];
      case 'loan':
        return ['Personal Loan', 'Housing Loan', 'Emergency Loan'];
      case 'service':
        return ['ID Card Replacement', 'Pension Letter', 'Certificate Fee', 'Processing Fee'];
      default:
        return [];
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Invoice</h1>
          <p className="text-muted-foreground">Create new invoices for various payment types</p>
        </div>
        <Badge variant="outline" className="text-sm">
          New Invoice
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Invoice Details
          </CardTitle>
          <CardDescription>
            Enter the invoice information. All invoices must be created before payments can be processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="Enter payer name"
              />
            </div>

            {/* Payer ID */}
            <div className="space-y-2">
              <Label htmlFor="payerId">Payer ID</Label>
              <Input
                id="payerId"
                value={formData.payerId}
                onChange={(e) => handleInputChange('payerId', e.target.value)}
                placeholder="Enter payer ID/SSN"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="flex gap-2">
                <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EC$">EC$</SelectItem>
                    <SelectItem value="US$">US$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                />
              </div>
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

            {/* Category */}
            {formData.type && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoryOptions().map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Enter reference number"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter invoice description"
              rows={3}
            />
          </div>

          {/* Recurring Options */}
          <div className="space-y-4">
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