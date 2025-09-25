import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Trash2, 
  Receipt, 
  AlertTriangle,
  Banknote,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveBanks } from '@/data/bankData';
import { getActivePaymentHeads, type PaymentHead } from '@/data/c3PaymentHeads';
import ReceiptPreview, { ReceiptData } from '@/components/cashier/ReceiptPreview';

interface PaymentSplit {
  id: string;
  currency: 'XCD' | 'USD';
  paymentMode: 'cash' | 'check' | 'card' | 'eft';
  amount: number;
  checkNumber?: string;
  checkDate?: string;
  bankName?: string;
  cardReference?: string;
}

interface C3PaymentDetail {
  paymentHeadId: string;
  paymentHeadName: string;
  amount: number;
  period: string;
  glAccount?: string;
}

interface C3Payment {
  id: string;
  employerName: string;
  employerId: string;
  period: string;
  month: number;
  year: number;
  totalAmount: number;
  paymentDetails: C3PaymentDetail[];
  paymentSplits: PaymentSplit[];
  receiptNumber: string;
  batchId: string;
  processedAt: string;
  processedBy: string;
}

const C3Payments: React.FC = () => {
  const { user } = useAuth();
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Payer type and selection
  const [payerType, setPayerType] = useState<'employer' | 'insured_person' | 'self_employed' | 'vol_contributor'>('employer');
  const [selectedPayer, setSelectedPayer] = useState<any>(null);
  const [isPayerDialogOpen, setIsPayerDialogOpen] = useState(false);
  
  // Payment configuration
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [payments, setPayments] = useState<C3Payment[]>([]);
  const [referenceNumber, setReferenceNumber] = useState('');
  
  // Receipt Preview State
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState<ReceiptData | null>(null);
  
  // C3 Period and Payment Heads
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPaymentHeads, setSelectedPaymentHeads] = useState<{[key: string]: number}>({});
  
  const banks = getActiveBanks();
  const paymentHeads = getActivePaymentHeads();

  // Mock data for different payer types
  const mockEmployers = [
    { id: 'EMP001', name: 'ABC Manufacturing Ltd', c3Outstanding: 5000.00 },
    { id: 'EMP002', name: 'XYZ Hotel Group', c3Outstanding: 12000.00 },
    { id: 'EMP003', name: 'Caribbean Foods Inc', c3Outstanding: 3500.00 },
    { id: 'EMP004', name: 'Island Transport Co', c3Outstanding: 7500.00 },
    { id: 'EMP005', name: 'Tech Solutions Ltd', c3Outstanding: 2800.00 }
  ];

  const mockInsuredPersons = [
    { id: 'IP001', name: 'John Smith', nationalId: '123456789', outstandingAmount: 1200.00 },
    { id: 'IP002', name: 'Mary Johnson', nationalId: '987654321', outstandingAmount: 800.00 },
    { id: 'IP003', name: 'Robert Brown', nationalId: '456789123', outstandingAmount: 1500.00 }
  ];

  const mockSelfEmployed = [
    { id: 'SE001', name: 'Jane Doe (Contractor)', businessName: 'Doe Consulting', outstandingAmount: 2400.00 },
    { id: 'SE002', name: 'Mike Wilson (Freelancer)', businessName: 'Wilson Graphics', outstandingAmount: 1800.00 }
  ];

  const mockVolContributors = [
    { id: 'VC001', name: 'Sarah Davis', nationalId: '789123456', outstandingAmount: 600.00 },
    { id: 'VC002', name: 'Tom Anderson', nationalId: '321654987', outstandingAmount: 900.00 }
  ];

  const getCurrentPayerData = () => {
    switch (payerType) {
      case 'employer': return mockEmployers;
      case 'insured_person': return mockInsuredPersons;
      case 'self_employed': return mockSelfEmployed;
      case 'vol_contributor': return mockVolContributors;
      default: return [];
    }
  };

  const filteredPayers = useMemo(() => {
    const currentData = getCurrentPayerData();
    return currentData.filter((payer: any) => 
      payer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payer.nationalId && payer.nationalId.includes(searchTerm)) ||
      (payer.businessName && payer.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, payerType]);

  useEffect(() => {
    // Initialize active batch
    setActiveBatch({
      id: 'BATCH-2024-001',
      batchNumber: `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
      cashierId: user?.email?.split('@')[0] || 'cashier',
      cashierName: user?.name || 'Current User',
      date: new Date().toISOString().slice(0, 10),
      status: 'open'
    });

    // Initialize with one payment split
    addPaymentSplit();
  }, [user]);

  const addPaymentSplit = () => {
    const newSplit: PaymentSplit = {
      id: Date.now().toString(),
      currency: 'XCD',
      paymentMode: 'cash',
      amount: 0
    };
    setPaymentSplits(prev => [...prev, newSplit]);
  };

  const updatePaymentSplit = (id: string, field: keyof PaymentSplit, value: any) => {
    setPaymentSplits(prev => prev.map(split => 
      split.id === id ? { ...split, [field]: value } : split
    ));
  };

  const removePaymentSplit = (id: string) => {
    if (paymentSplits.length > 1) {
      setPaymentSplits(prev => prev.filter(split => split.id !== id));
    }
  };

  const getTotalAmount = () => {
    return paymentSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `C3-${dateStr}-${sequence}`;
  };

  const processPayment = () => {
    if (!selectedPayer) {
      toast.error('Please select a payer');
      return;
    }

    const totalC3Amount = Object.values(selectedPaymentHeads).reduce((sum, amount) => sum + amount, 0);
    
    if (totalC3Amount <= 0) {
      toast.error('Please select payment heads and enter valid amounts');
      return;
    }

    const totalSplitAmount = getTotalAmount();

    if (Math.abs(totalSplitAmount - totalC3Amount) > 0.01) {
      toast.error(`Payment splits (${totalSplitAmount.toFixed(2)}) must equal C3 amount (${totalC3Amount.toFixed(2)})`);
      return;
    }

    // Validate splits
    for (const split of paymentSplits) {
      if (!split.amount || split.amount <= 0) {
        toast.error('All payment splits must have valid amounts');
        return;
      }
      if (split.paymentMode === 'check' && (!split.checkNumber || !split.bankName)) {
        toast.error('Check payments require check number and bank name');
        return;
      }
    }

    // Create payment details from selected payment heads
    const paymentDetails: C3PaymentDetail[] = Object.entries(selectedPaymentHeads)
      .filter(([_, amount]) => amount > 0)
      .map(([headId, amount]) => {
        const head = paymentHeads.find(h => h.id === headId);
        return {
          paymentHeadId: headId,
          paymentHeadName: head?.name || '',
          amount,
          period: `${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`,
          glAccount: head?.glAccount
        };
      });

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    
    const newPayment: C3Payment = {
      id: Date.now().toString(),
      employerName: selectedPayer.name,
      employerId: selectedPayer.id,
      period: `${monthName} ${selectedYear}`,
      month: selectedMonth,
      year: selectedYear,
      totalAmount: totalC3Amount,
      paymentDetails,
      paymentSplits: [...paymentSplits],
      receiptNumber: generateReceiptNumber(),
      batchId: activeBatch.id,
      processedAt: new Date().toISOString(),
      processedBy: user?.email || 'current-user'
    };

    setPayments(prev => [...prev, newPayment]);
    
    // Create receipt data for preview
    const receiptData: ReceiptData = {
      receiptNumber: newPayment.receiptNumber,
      batchId: newPayment.batchId,
      paymentDate: new Date(),
      status: 'Active',
      payerDetails: {
        name: selectedPayer.name,
        payerType: payerType === 'employer' ? 'Employer' : 
                  payerType === 'insured_person' ? 'Insured Person' :
                  payerType === 'self_employed' ? 'Individual' : 'Individual',
        registrationNumber: selectedPayer.id,
        ssn: selectedPayer.nationalId
      },
      paymentDetails: {
        paymentType: 'C3 Contribution',
        paymentMethod: paymentSplits.map(split => split.paymentMode).join(', '),
        currency: paymentSplits[0]?.currency || 'XCD',
        amount: totalC3Amount,
        checkNumber: paymentSplits.find(s => s.paymentMode === 'check')?.checkNumber,
        bankName: paymentSplits.find(s => s.paymentMode === 'check')?.bankName,
        referenceNumber: referenceNumber,
        invoiceReference: `C3-${monthName}-${selectedYear}`
      },
      contributionDetails: {
        period: `${monthName} ${selectedYear}`,
        employeeContribution: paymentDetails.find(p => p.paymentHeadName.includes('Employee'))?.amount || 0,
        employerContribution: paymentDetails.find(p => p.paymentHeadName.includes('Employer'))?.amount || totalC3Amount,
        totalContribution: totalC3Amount,
        contributorType: payerType === 'employer' ? 'employer' : 'insured'
      },
      cashierDetails: {
        cashierId: 'CASH001',
        cashierName: user?.email || 'Current User',
        terminalId: 'TERM-01',
        workstation: 'WS-MAIN-01'
      },
      organizationDetails: {
        name: 'ST KITTS AND NEVIS SOCIAL SECURITY DEPARTMENT',
        address: 'P.O. Box 96, Social Security Building, Cayon Street, Basseterre, St. Kitts',
        phone: '(869) 465-5000',
        email: 'info@socialsecurity.kn',
        website: 'www.socialsecurity.kn'
      },
      fees: paymentDetails.map(detail => ({
        description: `${detail.paymentHeadName} - ${detail.period}`,
        amount: detail.amount
      })),
      notes: referenceNumber ? `Reference: ${referenceNumber}` : undefined
    };

    // Show receipt preview
    setCurrentReceiptData(receiptData);
    setIsReceiptPreviewOpen(true);
    
    // Reset form
    setSelectedPayer(null);
    setSelectedPaymentHeads({});
    setPaymentSplits([]);
    setReferenceNumber('');
    addPaymentSplit();
    setIsPayerDialogOpen(false);

    toast.success(`C3 payment processed. Receipt: ${newPayment.receiptNumber}`);
  };

  const selectPayer = (payer: any) => {
    setSelectedPayer(payer);
    // Auto-select Social Security if outstanding amount exists
    const outstandingAmount = payer.c3Outstanding || payer.outstandingAmount || 0;
    if (outstandingAmount > 0) {
      setSelectedPaymentHeads({ 'SS_REGULAR': outstandingAmount });
    }
    setIsPayerDialogOpen(false);
  };

  if (!activeBatch) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Active Batch</AlertTitle>
          <AlertDescription>
            No active batch found for today. Please open a batch before processing payments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">C3 Contributions Payment</h1>
          <p className="text-muted-foreground">Process C3 contribution payments for all payer types</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Batch: {activeBatch.batchNumber}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Payment Processing Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Payer Information */}
              <div className="space-y-6">
                {/* Payer Type Selection */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Payer Type</Label>
                  <Select value={payerType} onValueChange={(value: any) => {
                    setPayerType(value);
                    setSelectedPayer(null);
                    setSelectedPaymentHeads({});
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employer">Employer</SelectItem>
                      <SelectItem value="insured_person">Insured Person</SelectItem>
                      <SelectItem value="self_employed">Self Employed</SelectItem>
                      <SelectItem value="vol_contributor">Voluntary Contributor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payer Selection */}
                <div className="space-y-2">
                  <Label>
                    {payerType === 'employer' && 'Employer'}
                    {payerType === 'insured_person' && 'Insured Person'}
                    {payerType === 'self_employed' && 'Self Employed Person'}
                    {payerType === 'vol_contributor' && 'Voluntary Contributor'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={selectedPayer ? `${selectedPayer.name} (${selectedPayer.id})` : ''}
                      placeholder={`Select a ${payerType.replace('_', ' ')}`}
                      className="flex-1"
                    />
                    <Dialog open={isPayerDialogOpen} onOpenChange={setIsPayerDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Search className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Select {payerType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</DialogTitle>
                          <DialogDescription>Search and select a {payerType.replace('_', ' ')} for C3 payment</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Search by name, ID, or national ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredPayers.map((payer: any) => (
                              <div
                                key={payer.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                                onClick={() => selectPayer(payer)}
                              >
                                <div className="font-medium">{payer.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {payer.id}
                                  {payer.nationalId && ` | National ID: ${payer.nationalId}`}
                                  {payer.businessName && ` | Business: ${payer.businessName}`}
                                </div>
                                <div className="text-sm text-green-600">
                                  Outstanding: XCD {(payer.c3Outstanding || payer.outstandingAmount || 0).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* C3 Period Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={i} value={(new Date().getFullYear() - 5 + i).toString()}>
                            {new Date().getFullYear() - 5 + i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reference Number */}
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Enter reference number (optional)"
                  />
                </div>
              </div>

              {/* Right Column - Payment Details */}
              <div className="space-y-6">
                {/* Payment Heads Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Payment Components</Label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {paymentHeads.map(head => (
                      <div key={head.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            checked={!!selectedPaymentHeads[head.id]}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPaymentHeads(prev => ({ ...prev, [head.id]: 0 }));
                              } else {
                                setSelectedPaymentHeads(prev => {
                                  const newHeads = { ...prev };
                                  delete newHeads[head.id];
                                  return newHeads;
                                });
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{head.name}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {head.category}
                            </Badge>
                          </div>
                        </div>
                        {selectedPaymentHeads[head.id] !== undefined && (
                          <div className="w-24">
                            <Input
                              type="number"
                              step="0.01"
                              value={selectedPaymentHeads[head.id] || ''}
                              onChange={(e) => setSelectedPaymentHeads(prev => ({
                                ...prev,
                                [head.id]: parseFloat(e.target.value) || 0
                              }))}
                              placeholder="0.00"
                              className="text-right text-sm"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total C3 Amount Display */}
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium">Total Amount</Label>
                    <div className="text-xl font-bold">
                      XCD {Object.values(selectedPaymentHeads).reduce((sum, amount) => sum + amount, 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Splits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Payment Methods</Label>
                <Button onClick={addPaymentSplit} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              </div>

              {paymentSplits.map((split, index) => (
                <Card key={split.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Payment {index + 1}</h4>
                    {paymentSplits.length > 1 && (
                      <Button
                        onClick={() => removePaymentSplit(split.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={split.paymentMode}
                        onValueChange={(value) => updatePaymentSplit(split.id, 'paymentMode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="eft">EFT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={split.currency}
                        onValueChange={(value) => updatePaymentSplit(split.id, 'currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="XCD">XCD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={split.amount || ''}
                        onChange={(e) => updatePaymentSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reference</Label>
                      <Input
                        value={split.cardReference || ''}
                        onChange={(e) => updatePaymentSplit(split.id, 'cardReference', e.target.value)}
                        placeholder="Enter reference"
                      />
                    </div>
                  </div>

                  {/* Additional fields for check payments */}
                  {split.paymentMode === 'check' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>Check Number</Label>
                        <Input
                          value={split.checkNumber || ''}
                          onChange={(e) => updatePaymentSplit(split.id, 'checkNumber', e.target.value)}
                          placeholder="Enter check number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Select
                          value={split.bankName || ''}
                          onValueChange={(value) => updatePaymentSplit(split.id, 'bankName', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map(bank => (
                              <SelectItem key={bank.id} value={bank.name}>
                                {bank.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Check Date</Label>
                        <Input
                          type="date"
                          value={split.checkDate || ''}
                          onChange={(e) => updatePaymentSplit(split.id, 'checkDate', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {/* Payment Summary */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Total Payment Splits</div>
                  <div className="font-semibold">XCD {getTotalAmount().toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">C3 Amount</div>
                  <div className="font-semibold">XCD {Object.values(selectedPaymentHeads).reduce((sum, amount) => sum + amount, 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Difference</div>
                  <div className={`font-semibold ${Math.abs(getTotalAmount() - Object.values(selectedPaymentHeads).reduce((sum, amount) => sum + amount, 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    XCD {(getTotalAmount() - Object.values(selectedPaymentHeads).reduce((sum, amount) => sum + amount, 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={processPayment} className="w-full" size="lg">
              <Receipt className="h-4 w-4 mr-2" />
              Process C3 Payment
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Recent C3 Payments
              </CardTitle>
              <CardDescription>Today's processed payments in current batch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {payments.slice(-5).reverse().map(payment => (
                  <div key={payment.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm">{payment.employerName}</div>
                      <Badge variant="outline" className="text-xs">{payment.receiptNumber}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Total: XCD {payment.totalAmount.toFixed(2)} | Period: {payment.period}
                    </div>
                    <div className="space-y-1">
                      {payment.paymentSplits.map(split => (
                        <div key={split.id} className="text-xs flex justify-between">
                          <span className="capitalize">{split.paymentMode} ({split.currency})</span>
                          <span>{split.currency} {split.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Preview Dialog */}
      {currentReceiptData && (
        <ReceiptPreview
          receiptData={currentReceiptData}
          isOpen={isReceiptPreviewOpen}
          onClose={() => {
            setIsReceiptPreviewOpen(false);
            setCurrentReceiptData(null);
          }}
          title="C3 Payment Receipt"
          allowReprint={true}
        />
      )}
    </div>
  );
};

export default C3Payments;