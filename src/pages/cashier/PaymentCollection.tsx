import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, CreditCard, Banknote, FileText, Search, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  receiptNo: string;
  payerName: string;
  paymentType: string;
  mode: string;
  currency: string;
  amount: number;
  invoiceRef?: string;
  checkNo?: string;
  bank?: string;
  timestamp: string;
}

const PaymentCollection = () => {
  const { toast } = useToast();
  const [activeBatch, setActiveBatch] = useState(`BATCH-${new Date().toISOString().split('T')[0]}-001`);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isInvoiceSearchOpen, setIsInvoiceSearchOpen] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    payerName: '',
    paymentType: '',
    mode: 'cash',
    currency: 'EC$',
    amount: '',
    invoiceRef: '',
    checkNo: '',
    bank: '',
    employer: '',
    notes: ''
  });

  const paymentTypes = [
    'Social Security Contributions - Employer',
    'Social Security Contributions - Self Employed',
    'Social Security Contributions - Non-working',
    'Levy Contributions',
    'Rent - Recurring',
    'Rent - Non-recurring',
    'Loan Repayments',
    'Miscellaneous Invoice',
    'Card Replacement Fee',
    'Pension Letter Fee'
  ];

  const banks = [
    'Bank of Nova Scotia',
    'FirstCaribbean International Bank',
    'Antigua Commercial Bank',
    'Caribbean Union Bank',
    'ABI Bank'
  ];

  const handleInputChange = (field: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const generateReceiptNumber = () => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sequence = String(payments.length + 1).padStart(4, '0');
    return `RCP-${today}-${sequence}`;
  };

  const processPayment = () => {
    if (!paymentForm.payerName || !paymentForm.paymentType || !paymentForm.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (paymentForm.mode === 'check' && (!paymentForm.checkNo || !paymentForm.bank)) {
      toast({
        title: "Validation Error",
        description: "Check number and bank are required for check payments.",
        variant: "destructive",
      });
      return;
    }

    const payment: Payment = {
      receiptNo: generateReceiptNumber(),
      payerName: paymentForm.payerName,
      paymentType: paymentForm.paymentType,
      mode: paymentForm.mode,
      currency: paymentForm.currency,
      amount: parseFloat(paymentForm.amount),
      invoiceRef: paymentForm.invoiceRef || undefined,
      checkNo: paymentForm.checkNo || undefined,
      bank: paymentForm.bank || undefined,
      timestamp: new Date().toISOString()
    };

    setPayments(prev => [...prev, payment]);
    
    // Reset form
    setPaymentForm({
      payerName: '',
      paymentType: '',
      mode: 'cash',
      currency: 'EC$',
      amount: '',
      invoiceRef: '',
      checkNo: '',
      bank: '',
      employer: '',
      notes: ''
    });

    toast({
      title: "Payment Processed",
      description: `Receipt ${payment.receiptNo} generated successfully.`,
    });
  };

  const getTotalAmount = (currency: string) => {
    return payments
      .filter(p => p.currency === currency)
      .reduce((sum, p) => sum + p.amount, 0)
      .toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Collection</h1>
            <p className="text-gray-600">Active Batch: <Badge variant="outline">{activeBatch}</Badge></p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Receipt className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              End Day / Balance
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Process Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payer Information */}
                  <div className="space-y-2">
                    <Label htmlFor="payerName">Payer Name *</Label>
                    <Input
                      id="payerName"
                      placeholder="Enter payer name"
                      value={paymentForm.payerName}
                      onChange={(e) => handleInputChange('payerName', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentType">Payment Type *</Label>
                    <Select value={paymentForm.paymentType} onValueChange={(value) => handleInputChange('paymentType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-2">
                    <Label htmlFor="mode">Payment Mode *</Label>
                    <Select value={paymentForm.mode} onValueChange={(value) => handleInputChange('mode', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="online">Online/EFT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={paymentForm.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EC$">EC$</SelectItem>
                        <SelectItem value="US$">US$</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceRef">
                      Invoice Reference
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2 h-6 w-6 p-0"
                        onClick={() => setIsInvoiceSearchOpen(true)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </Label>
                    <Input
                      id="invoiceRef"
                      placeholder="Enter or search invoice"
                      value={paymentForm.invoiceRef}
                      onChange={(e) => handleInputChange('invoiceRef', e.target.value)}
                    />
                  </div>

                  {/* Check-specific fields */}
                  {paymentForm.mode === 'check' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="checkNo">Check Number *</Label>
                        <Input
                          id="checkNo"
                          placeholder="Enter check number"
                          value={paymentForm.checkNo}
                          onChange={(e) => handleInputChange('checkNo', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bank">Bank *</Label>
                        <Select value={paymentForm.bank} onValueChange={(value) => handleInputChange('bank', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employer">Employer/Reference</Label>
                        <Input
                          id="employer"
                          placeholder="Enter employer or reference"
                          value={paymentForm.employer}
                          onChange={(e) => handleInputChange('employer', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Online/EFT specific field */}
                  {paymentForm.mode === 'online' && (
                    <div className="space-y-2">
                      <Label htmlFor="transactionRef">Transaction Reference</Label>
                      <Input
                        id="transactionRef"
                        placeholder="Enter EFT reference number"
                        value={paymentForm.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={paymentForm.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={processPayment} className="flex-1">
                    <Receipt className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                  <Button variant="outline" onClick={() => setIsInvoiceSearchOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Batch Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total EC$:</span>
                    <span className="font-semibold">EC$ {getTotalAmount('EC$')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total US$:</span>
                    <span className="font-semibold">US$ {getTotalAmount('US$')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Transactions:</span>
                    <span className="font-semibold">{payments.length}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Modes</Label>
                  {['cash', 'check', 'card', 'online'].map(mode => {
                    const count = payments.filter(p => p.mode === mode).length;
                    const amount = payments.filter(p => p.mode === mode).reduce((sum, p) => sum + p.amount, 0);
                    return count > 0 ? (
                      <div key={mode} className="flex justify-between text-sm">
                        <span className="capitalize">{mode}:</span>
                        <span>{count} ({amount.toFixed(2)})</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(-10).reverse().map((payment) => (
                  <TableRow key={payment.receiptNo}>
                    <TableCell className="font-mono">{payment.receiptNo}</TableCell>
                    <TableCell>{payment.payerName}</TableCell>
                    <TableCell className="text-sm">{payment.paymentType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.currency} {payment.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(payment.timestamp).toLocaleTimeString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Receipt className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Search Dialog */}
        <Dialog open={isInvoiceSearchOpen} onOpenChange={setIsInvoiceSearchOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Search Invoices</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="Invoice Number" />
                <Input placeholder="Payer Name" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Invoice Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="misc">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search Invoices
              </Button>
              
              <div className="border rounded-lg p-4">
                <p className="text-center text-gray-500">No invoices found. Search to display results.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PaymentCollection;