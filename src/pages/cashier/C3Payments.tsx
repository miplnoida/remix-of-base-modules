import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  DollarSign, 
  Calculator,
  AlertTriangle,
  Banknote,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveBanks } from '@/data/bankData';
import { getActivePaymentHeads, type PaymentHead } from '@/data/c3PaymentHeads';

interface PaymentSplit {
  id: string;
  currency: 'EC$' | 'US$';
  paymentMode: 'cash' | 'check' | 'card' | 'eft';
  amount: number;
  checkNumber?: string;
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

interface BatchSummary {
  cashEC: number;
  cashUS: number;
  checksEC: number;
  checksUS: number;
  cardsEC: number;
  cardsUS: number;
  eftEC: number;
  eftUS: number;
  totalTransactions: number;
}

const C3Payments: React.FC = () => {
  const { user } = useAuth();
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState<any>(null);
  const [c3Amount, setC3Amount] = useState('');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [payments, setPayments] = useState<C3Payment[]>([]);
  const [isEmployerDialogOpen, setIsEmployerDialogOpen] = useState(false);
  
  // C3 Period and Payment Heads
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPaymentHeads, setSelectedPaymentHeads] = useState<{[key: string]: number}>({});
  
  const banks = getActiveBanks();
  const paymentHeads = getActivePaymentHeads();

  // Mock employers data
  const mockEmployers = [
    { id: 'EMP001', name: 'ABC Manufacturing Ltd', c3Outstanding: 5000.00 },
    { id: 'EMP002', name: 'XYZ Hotel Group', c3Outstanding: 12000.00 },
    { id: 'EMP003', name: 'Caribbean Foods Inc', c3Outstanding: 3500.00 },
    { id: 'EMP004', name: 'Island Transport Co', c3Outstanding: 7500.00 },
    { id: 'EMP005', name: 'Tech Solutions Ltd', c3Outstanding: 2800.00 }
  ];

  const filteredEmployers = useMemo(() => {
    return mockEmployers.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

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

  const batchSummary = useMemo(() => {
    const summary: BatchSummary = {
      cashEC: 0, cashUS: 0, checksEC: 0, checksUS: 0,
      cardsEC: 0, cardsUS: 0, eftEC: 0, eftUS: 0,
      totalTransactions: payments.length
    };

    payments.forEach(payment => {
      payment.paymentSplits.forEach(split => {
        const key = `${split.paymentMode}${split.currency.replace('$', '')}` as keyof BatchSummary;
        if (typeof summary[key] === 'number') {
          summary[key] += split.amount;
        }
      });
    });

    return summary;
  }, [payments]);

  const addPaymentSplit = () => {
    const newSplit: PaymentSplit = {
      id: Date.now().toString(),
      currency: 'EC$',
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
    if (!selectedEmployer) {
      toast.error('Please select an employer');
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
      employerName: selectedEmployer.name,
      employerId: selectedEmployer.id,
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
    
    // Reset form
    setSelectedEmployer(null);
    setSelectedPaymentHeads({});
    setPaymentSplits([]);
    addPaymentSplit();
    setIsEmployerDialogOpen(false);

    toast.success(`C3 payment processed. Receipt: ${newPayment.receiptNumber}`);
  };

  const selectEmployer = (employer: any) => {
    setSelectedEmployer(employer);
    // Auto-select Social Security if outstanding amount exists
    if (employer.c3Outstanding > 0) {
      setSelectedPaymentHeads({ 'SS_REGULAR': employer.c3Outstanding });
    }
    setIsEmployerDialogOpen(false);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">C3 Contributions</h1>
          <p className="text-muted-foreground">Process C3 contribution payments with multi-currency and payment mode support</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Batch: {activeBatch.batchNumber}
        </Badge>
      </div>

      {/* Batch Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Batch Summary
          </CardTitle>
          <CardDescription>Real-time summary of all payments in this batch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Cash EC$</div>
              <div className="text-lg font-semibold text-green-600">EC$ {batchSummary.cashEC.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Cash US$</div>
              <div className="text-lg font-semibold text-green-600">US$ {batchSummary.cashUS.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Checks</div>
              <div className="text-lg font-semibold text-blue-600">
                EC$ {batchSummary.checksEC.toFixed(2)}<br/>
                <span className="text-sm">US$ {batchSummary.checksUS.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Cards/EFT</div>
              <div className="text-lg font-semibold text-purple-600">
                EC$ {batchSummary.cardsEC.toFixed(2)}<br/>
                <span className="text-sm">US$ {batchSummary.cardsUS.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm text-muted-foreground">Total Transactions</div>
            <div className="text-2xl font-bold">{batchSummary.totalTransactions}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Processing Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                C3 Payment Processing
              </CardTitle>
              <CardDescription>
                Select employer and configure multiple payment modes and currencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employer Selection */}
              <div className="space-y-2">
                <Label>Employer</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={selectedEmployer ? `${selectedEmployer.name} (${selectedEmployer.id})` : ''}
                    placeholder="Select an employer"
                    className="flex-1"
                  />
                  <Dialog open={isEmployerDialogOpen} onOpenChange={setIsEmployerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Search className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Select Employer</DialogTitle>
                        <DialogDescription>Search and select an employer for C3 payment</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Search by name or ID"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {filteredEmployers.map(employer => (
                            <div
                              key={employer.id}
                              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                              onClick={() => selectEmployer(employer)}
                            >
                              <div className="font-medium">{employer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {employer.id} | Outstanding: EC$ {employer.c3Outstanding.toFixed(2)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Payment Heads Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">C3 Payment Components</Label>
                <div className="grid grid-cols-1 gap-3">
                  {paymentHeads.map(head => (
                    <div key={head.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
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
                        <div>
                          <div className="font-medium text-sm">{head.name}</div>
                          <div className="text-xs text-muted-foreground">{head.description}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {head.category}
                          </Badge>
                        </div>
                      </div>
                      {selectedPaymentHeads[head.id] !== undefined && (
                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.01"
                            value={selectedPaymentHeads[head.id] || ''}
                            onChange={(e) => setSelectedPaymentHeads(prev => ({
                              ...prev,
                              [head.id]: parseFloat(e.target.value) || 0
                            }))}
                            placeholder="0.00"
                            className="text-right"
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
                  <Label className="text-base font-medium">Total C3 Amount</Label>
                  <div className="text-xl font-bold">
                    EC$ {Object.values(selectedPaymentHeads).reduce((sum, amount) => sum + amount, 0).toFixed(2)}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <SelectItem value="EC$">EC$</SelectItem>
                            <SelectItem value="US$">US$</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Mode</Label>
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
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={split.amount || ''}
                          onChange={(e) => updatePaymentSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {split.paymentMode === 'check' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                      </div>
                    )}

                    {(split.paymentMode === 'card' || split.paymentMode === 'eft') && (
                      <div className="mt-4">
                        <div className="space-y-2">
                          <Label>Transaction Reference</Label>
                          <Input
                            value={split.cardReference || ''}
                            onChange={(e) => updatePaymentSplit(split.id, 'cardReference', e.target.value)}
                            placeholder="Enter transaction reference"
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
                    <div className="font-semibold">EC$ {getTotalAmount().toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">C3 Amount</div>
                    <div className="font-semibold">EC$ {(parseFloat(c3Amount) || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Difference</div>
                    <div className={`font-semibold ${Math.abs(getTotalAmount() - (parseFloat(c3Amount) || 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      EC$ {(getTotalAmount() - (parseFloat(c3Amount) || 0)).toFixed(2)}
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
        </div>

        {/* Recent Transactions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Recent C3 Payments
              </CardTitle>
              <CardDescription>Today's processed payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.slice(-5).reverse().map(payment => (
                  <div key={payment.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm">{payment.employerName}</div>
                      <Badge variant="outline" className="text-xs">{payment.receiptNumber}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Total: EC$ {payment.totalAmount.toFixed(2)}
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
                {payments.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No payments processed today
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default C3Payments;