import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Search, Users, Building2, AlertCircle, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface C3Payment {
  id: string;
  receiptNumber: string;
  contributorType: 'employer' | 'insured';
  contributorId: string;
  contributorName: string;
  employerName?: string;
  period: string;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  currency: string;
  paymentMode: string;
  checkNumber?: string;
  bankName?: string;
  referenceNumber?: string;
  timestamp: Date;
  cashierId: string;
  batchId?: string;
}

const C3Payments: React.FC = () => {
  const { toast } = useToast();
  const [activeBatch, setActiveBatch] = useState<string | null>("BATCH-001-20241225");
  const [payments, setPayments] = useState<C3Payment[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [contributorSearchType, setContributorSearchType] = useState<'employer' | 'insured'>('employer');
  
  const [paymentForm, setPaymentForm] = useState({
    contributorType: 'employer' as 'employer' | 'insured',
    contributorId: '',
    contributorName: '',
    employerName: '',
    period: new Date().toISOString().slice(0, 7), // Current month
    employeeContribution: '',
    employerContribution: '',
    currency: 'EC$',
    paymentMode: 'cash',
    checkNumber: '',
    bankName: '',
    referenceNumber: ''
  });

  useEffect(() => {
    if (!activeBatch) {
      toast({
        title: "No Active Batch",
        description: "Please open a batch before processing C3 payments.",
        variant: "destructive"
      });
    }
  }, [activeBatch, toast]);

  const handleInputChange = (field: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotalContribution = () => {
    const employee = parseFloat(paymentForm.employeeContribution) || 0;
    const employer = parseFloat(paymentForm.employerContribution) || 0;
    return employee + employer;
  };

  const generateReceiptNumber = (): string => {
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = (payments.length + 1).toString().padStart(4, '0');
    return `C3-${dateString}-${sequence}`;
  };

  const processC3Payment = () => {
    if (!activeBatch) {
      toast({
        title: "No Active Batch",
        description: "Please open a batch before processing payments.",
        variant: "destructive"
      });
      return;
    }

    if (!paymentForm.contributorId || !paymentForm.contributorName || !paymentForm.period) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const totalContribution = calculateTotalContribution();
    if (totalContribution <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Total contribution must be greater than 0.",
        variant: "destructive"
      });
      return;
    }

    const newPayment: C3Payment = {
      id: Date.now().toString(),
      receiptNumber: generateReceiptNumber(),
      contributorType: paymentForm.contributorType,
      contributorId: paymentForm.contributorId,
      contributorName: paymentForm.contributorName,
      employerName: paymentForm.employerName,
      period: paymentForm.period,
      employeeContribution: parseFloat(paymentForm.employeeContribution) || 0,
      employerContribution: parseFloat(paymentForm.employerContribution) || 0,
      totalContribution: totalContribution,
      currency: paymentForm.currency,
      paymentMode: paymentForm.paymentMode,
      checkNumber: paymentForm.checkNumber,
      bankName: paymentForm.bankName,
      referenceNumber: paymentForm.referenceNumber,
      timestamp: new Date(),
      cashierId: "current-user",
      batchId: activeBatch
    };

    setPayments(prev => [newPayment, ...prev]);
    
    // Reset form
    setPaymentForm({
      contributorType: 'employer',
      contributorId: '',
      contributorName: '',
      employerName: '',
      period: new Date().toISOString().slice(0, 7),
      employeeContribution: '',
      employerContribution: '',
      currency: 'EC$',
      paymentMode: 'cash',
      checkNumber: '',
      bankName: '',
      referenceNumber: ''
    });

    toast({
      title: "C3 Payment Processed",
      description: `Receipt ${newPayment.receiptNumber} generated successfully.`,
    });
  };

  // Mock data for search
  const mockEmployers = [
    { id: "EMP001", name: "Government of St. Kitts and Nevis", registrationNumber: "REG001" },
    { id: "EMP002", name: "Royal Bank of Canada", registrationNumber: "REG002" },
    { id: "EMP003", name: "Marriott Resort", registrationNumber: "REG003" }
  ];

  const mockInsuredPersons = [
    { id: "IP001", name: "John Smith", ssn: "123-45-6789", employer: "Government of St. Kitts and Nevis" },
    { id: "IP002", name: "Mary Johnson", ssn: "987-65-4321", employer: "Royal Bank of Canada" },
    { id: "IP003", name: "Robert Davis", ssn: "456-78-9123", employer: "Marriott Resort" }
  ];

  const selectContributor = (contributor: any) => {
    if (contributorSearchType === 'employer') {
      setPaymentForm(prev => ({
        ...prev,
        contributorType: 'employer',
        contributorId: contributor.id,
        contributorName: contributor.name,
        employerName: contributor.name
      }));
    } else {
      setPaymentForm(prev => ({
        ...prev,
        contributorType: 'insured',
        contributorId: contributor.id,
        contributorName: contributor.name,
        employerName: contributor.employer
      }));
    }
    setSearchDialogOpen(false);
  };

  if (!activeBatch) {
    return (
      <div className="p-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must open a batch before processing any C3 payments. Please contact your supervisor or open a new batch.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              C3 Social Security Contributions - Batch Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No active batch found. Payment processing is disabled.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">C3 Social Security Contributions</h1>
          <p className="text-muted-foreground">Process employer and insured person contribution payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Batch: {activeBatch}</Badge>
          <Button variant="outline" size="sm">
            <Receipt className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>C3 Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contributorType">Contributor Type</Label>
                  <Select value={paymentForm.contributorType} onValueChange={(value: 'employer' | 'insured') => handleInputChange('contributorType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employer">Employer Payment</SelectItem>
                      <SelectItem value="insured">Insured Person Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="period">Contribution Period *</Label>
                  <Input
                    id="period"
                    type="month"
                    value={paymentForm.period}
                    onChange={(e) => handleInputChange('period', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contributor Information *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={paymentForm.contributorType === 'employer' ? "Search employer..." : "Search insured person..."}
                    value={paymentForm.contributorName}
                    onChange={(e) => handleInputChange('contributorName', e.target.value)}
                    className="flex-1"
                  />
                  <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => setContributorSearchType(paymentForm.contributorType)}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>
                          Search {paymentForm.contributorType === 'employer' ? 'Employers' : 'Insured Persons'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input placeholder={`Search ${paymentForm.contributorType}...`} />
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>{paymentForm.contributorType === 'employer' ? 'Registration' : 'SSN'}</TableHead>
                              {paymentForm.contributorType === 'insured' && <TableHead>Employer</TableHead>}
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(paymentForm.contributorType === 'employer' ? mockEmployers : mockInsuredPersons).map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>
                                  {'registrationNumber' in item ? item.registrationNumber : item.ssn}
                                </TableCell>
                                {paymentForm.contributorType === 'insured' && (
                                  <TableCell>{'employer' in item ? item.employer : ''}</TableCell>
                                )}
                                <TableCell>
                                  <Button size="sm" onClick={() => selectContributor(item)}>
                                    Select
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {paymentForm.contributorId && (
                  <div className="text-sm text-muted-foreground">
                    ID: {paymentForm.contributorId}
                    {paymentForm.employerName && paymentForm.contributorType === 'insured' && 
                      ` | Employer: ${paymentForm.employerName}`
                    }
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="employeeContribution">Employee Contribution</Label>
                  <Input
                    id="employeeContribution"
                    type="number"
                    step="0.01"
                    value={paymentForm.employeeContribution}
                    onChange={(e) => handleInputChange('employeeContribution', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="employerContribution">Employer Contribution</Label>
                  <Input
                    id="employerContribution"
                    type="number"
                    step="0.01"
                    value={paymentForm.employerContribution}
                    onChange={(e) => handleInputChange('employerContribution', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="totalContribution">Total Amount</Label>
                  <Input
                    id="totalContribution"
                    type="number"
                    value={calculateTotalContribution().toFixed(2)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
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
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select value={paymentForm.paymentMode} onValueChange={(value) => handleInputChange('paymentMode', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online/EFT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentForm.paymentMode === 'check' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkNumber">Check Number</Label>
                    <Input
                      id="checkNumber"
                      value={paymentForm.checkNumber}
                      onChange={(e) => handleInputChange('checkNumber', e.target.value)}
                      placeholder="Check number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={paymentForm.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              )}

              {(paymentForm.paymentMode === 'online' || paymentForm.paymentMode === 'card') && (
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    placeholder="Transaction reference"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={processC3Payment} className="flex-1">
                  <Receipt className="h-4 w-4 mr-2" />
                  Process C3 Payment
                </Button>
                <Button variant="outline" onClick={() => setPaymentForm({
                  contributorType: 'employer', contributorId: '', contributorName: '', employerName: '',
                  period: new Date().toISOString().slice(0, 7), employeeContribution: '', employerContribution: '',
                  currency: 'EC$', paymentMode: 'cash', checkNumber: '', bankName: '', referenceNumber: ''
                })}>
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's C3 Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total EC$:</span>
                  <span className="font-semibold">
                    {payments.filter(p => p.currency === 'EC$').reduce((sum, p) => sum + p.totalContribution, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total US$:</span>
                  <span className="font-semibold">
                    {payments.filter(p => p.currency === 'US$').reduce((sum, p) => sum + p.totalContribution, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="font-semibold">{payments.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contribution Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Employee:</span>
                  <span>{payments.reduce((sum, p) => sum + p.employeeContribution, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Employer:</span>
                  <span>{payments.reduce((sum, p) => sum + p.employerContribution, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>{payments.reduce((sum, p) => sum + p.totalContribution, 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent C3 Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Contributor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 10).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono">{payment.receiptNumber}</TableCell>
                  <TableCell>{payment.contributorName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {payment.contributorType}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.period}</TableCell>
                  <TableCell>{payment.currency} {payment.employeeContribution.toFixed(2)}</TableCell>
                  <TableCell>{payment.currency} {payment.employerContribution.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">{payment.currency} {payment.totalContribution.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {payment.paymentMode}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.timestamp.toLocaleTimeString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default C3Payments;