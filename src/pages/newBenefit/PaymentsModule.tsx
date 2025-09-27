import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  CreditCard, 
  Download, 
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Banknote,
  ArrowDownUp,
  Search,
  Filter
} from 'lucide-react';

// Mock payment data
const mockPayments = [
  {
    id: 'PAY001',
    awardId: 'AWD001',
    beneficiaryName: 'Margaret Thompson',
    benefitType: 'AGE_PENSION',
    amount: 850.00,
    paymentDate: '2024-01-31',
    method: 'EFT',
    reference: 'EFT240131001',
    status: 'PAID',
    batchId: 'BATCH_JAN2024'
  },
  {
    id: 'PAY002',
    awardId: 'AWD002',
    beneficiaryName: 'David Wilson',
    benefitType: 'INVALIDITY',
    amount: 1200.00,
    paymentDate: '2024-01-31',
    method: 'EFT',
    reference: 'EFT240131002',
    status: 'PAID',
    batchId: 'BATCH_JAN2024'
  },
  {
    id: 'PAY003',
    awardId: 'AWD005',
    beneficiaryName: 'John Contributor',
    benefitType: 'SICKNESS',
    amount: 325.00,
    paymentDate: '2024-02-05',
    method: 'EFT',
    reference: 'EFT240205001',
    status: 'PENDING',
    batchId: 'BATCH_FEB2024_WK1'
  },
  {
    id: 'PAY004',
    awardId: 'AWD006',
    beneficiaryName: 'Maria Santos',
    benefitType: 'MATERNITY',
    amount: 400.00,
    paymentDate: '2024-02-05',
    method: 'CHECK',
    reference: 'CHK240205001',
    status: 'RETURNED',
    batchId: 'BATCH_FEB2024_WK1',
    returnReason: 'Invalid account number'
  }
];

const mockBatches = [
  {
    id: 'BATCH_JAN2024',
    name: 'January 2024 Monthly Pensions',
    paymentCount: 342,
    totalAmount: 289750.00,
    status: 'COMPLETED',
    createdDate: '2024-01-30',
    processedDate: '2024-01-31'
  },
  {
    id: 'BATCH_FEB2024_WK1',
    name: 'February 2024 Week 1 Benefits',
    paymentCount: 87,
    totalAmount: 42350.00,
    status: 'PENDING',
    createdDate: '2024-02-04',
    processedDate: null
  }
];

const mockOverpayments = [
  {
    id: 'OVP001',
    awardId: 'AWD007',
    beneficiaryName: 'Robert Brown',
    amount: 2100.00,
    reason: 'Pension continued after return to work',
    discoveredDate: '2024-01-15',
    recoveryPlan: {
      monthlyDeduction: 150.00,
      startDate: '2024-02-01',
      estimatedCompletion: '2024-04-01'
    },
    status: 'ACTIVE'
  }
];

export const PaymentsModule: React.FC = () => {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleCreateBatch = () => {
    console.log('Creating payment batch...');
  };

  const handleExportBankFile = () => {
    console.log('Exporting bank file...');
  };

  const handleProcessReturns = () => {
    console.log('Processing returned payments...');
  };

  const handleSetupRecovery = () => {
    console.log('Setting up overpayment recovery...', recoveryAmount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'RETURNED':
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredPayments = mockPayments.filter(payment => {
    const matchesSearch = payment.beneficiaryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTotalPendingAmount = () => {
    return mockPayments
      .filter(payment => payment.status === 'PENDING')
      .reduce((total, payment) => total + payment.amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments Module</h1>
          <p className="text-muted-foreground">Manage benefit payments, batch processing, and bank file exports</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <CreditCard className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Bank File
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  ${getTotalPendingAmount().toLocaleString()}
                </p>
                <p className="text-sm text-blue-600">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {mockPayments.filter(p => p.status === 'PAID').length}
                </p>
                <p className="text-sm text-green-600">Successful Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {mockPayments.filter(p => p.status === 'RETURNED').length}
                </p>
                <p className="text-sm text-red-600">Returned Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <ArrowDownUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  ${mockOverpayments.reduce((sum, ovp) => sum + ovp.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-orange-600">Active Overpayments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="batch-builder" className="w-full">
        <TabsList>
          <TabsTrigger value="batch-builder">Batch Payment Builder</TabsTrigger>
          <TabsTrigger value="bank-files">Bank File Export</TabsTrigger>
          <TabsTrigger value="returns">Handle Returns</TabsTrigger>
          <TabsTrigger value="overpayments">Overpayment Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="batch-builder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Payment Builder</CardTitle>
              <CardDescription>Create and manage payment batches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Batch Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly_pension">Monthly Pensions</SelectItem>
                      <SelectItem value="weekly_benefits">Weekly Benefits</SelectItem>
                      <SelectItem value="lump_sum">Lump Sum Payments</SelectItem>
                      <SelectItem value="manual">Manual Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFT">Electronic Funds Transfer</SelectItem>
                      <SelectItem value="CHECK">Check Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input 
                    id="paymentDate"
                    type="date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="batchName">Batch Name</Label>
                <Input 
                  id="batchName"
                  placeholder="Enter batch name (e.g., February 2024 Monthly Pensions)"
                />
              </div>

              <Button onClick={handleCreateBatch} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Build Payment Batch
              </Button>
            </CardContent>
          </Card>

          {/* Existing Batches */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockBatches.map((batch) => (
                  <div 
                    key={batch.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedBatch?.id === batch.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedBatch(batch)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Banknote className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{batch.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {batch.paymentCount} payments • ${batch.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(batch.createdDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(batch.status)}>
                          {batch.status}
                        </Badge>
                        {batch.status === 'COMPLETED' && (
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank File Export</CardTitle>
              <CardDescription>Generate and export payment files for banking systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Select Batch</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch to export" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockBatches
                        .filter(batch => batch.status === 'PENDING')
                        .map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>File Format</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select file format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACH">ACH Format</SelectItem>
                      <SelectItem value="NACHA">NACHA Standard</SelectItem>
                      <SelectItem value="CSV">CSV Export</SelectItem>
                      <SelectItem value="CUSTOM">Bank Custom Format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Export Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm text-blue-700">
                  <div>
                    <p>Total Payments: 87</p>
                  </div>
                  <div>
                    <p>Total Amount: $42,350.00</p>
                  </div>
                  <div>
                    <p>File Size: ~15KB</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleExportBankFile} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Generate & Export Bank File
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">January 2024 Monthly Pensions</p>
                    <p className="text-sm text-muted-foreground">
                      Exported: 2024-01-31 • Format: ACH • Size: 45KB
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Re-download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">December 2023 Monthly Pensions</p>
                    <p className="text-sm text-muted-foreground">
                      Exported: 2023-12-29 • Format: NACHA • Size: 42KB
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Re-download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Handle Returned Payments</CardTitle>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="RETURNED">Returned</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPayments
                  .filter(payment => payment.status === 'RETURNED' || payment.status === 'FAILED')
                  .map((payment) => (
                    <div key={payment.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <h3 className="font-medium">{payment.beneficiaryName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {payment.reference} • ${payment.amount.toFixed(2)} • {payment.method}
                            </p>
                            {payment.returnReason && (
                              <p className="text-xs text-red-600">
                                Reason: {payment.returnReason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Update Details
                          </Button>
                          <Button size="sm">
                            Reprocess
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <Button onClick={handleProcessReturns} className="w-full mt-4">
                <Upload className="h-4 w-4 mr-2" />
                Import Bank Return File
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overpayments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overpayment Recovery Management</CardTitle>
              <CardDescription>Manage overpayments and set up recovery plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockOverpayments.map((overpayment) => (
                  <div key={overpayment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <ArrowDownUp className="h-5 w-5 text-orange-500" />
                        <div>
                          <h3 className="font-medium">{overpayment.beneficiaryName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Overpayment: ${overpayment.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Reason: {overpayment.reason}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-orange-600">
                          ${overpayment.recoveryPlan.monthlyDeduction.toFixed(2)}/month
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Until {new Date(overpayment.recoveryPlan.estimatedCompletion).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Set Up Recovery Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Beneficiary</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select beneficiary" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEN001">Margaret Thompson</SelectItem>
                      <SelectItem value="BEN002">David Wilson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="overpaymentAmount">Overpayment Amount</Label>
                  <Input 
                    id="overpaymentAmount"
                    type="number"
                    placeholder="Enter overpayment amount"
                  />
                </div>
                <div>
                  <Label htmlFor="recoveryAmount">Monthly Recovery Amount</Label>
                  <Input 
                    id="recoveryAmount"
                    type="number"
                    value={recoveryAmount}
                    onChange={(e) => setRecoveryAmount(e.target.value)}
                    placeholder="Enter monthly deduction"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Recovery Start Date</Label>
                  <Input 
                    id="startDate"
                    type="date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Overpayment Reason</Label>
                <Textarea 
                  id="reason"
                  placeholder="Describe the reason for overpayment..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSetupRecovery} className="w-full">
                <ArrowDownUp className="h-4 w-4 mr-2" />
                Set Up Recovery Plan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
