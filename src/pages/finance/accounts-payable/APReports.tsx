import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { Download, FileText, Printer, DollarSign, Building2, Calendar, Filter, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

// Mock report data
const mockBenefitsPayments = [
  { id: 1, batchNumber: 'APB-2024-0001', paymentDate: '2024-01-23', benefitType: 'AGE', itemCount: 5, totalAmount: 12500.00 },
  { id: 2, batchNumber: 'APB-2024-0001', paymentDate: '2024-01-23', benefitType: 'SICKNESS', itemCount: 3, totalAmount: 4500.00 },
  { id: 3, batchNumber: 'APB-2024-0001', paymentDate: '2024-01-23', benefitType: 'MATERNITY', itemCount: 4, totalAmount: 14000.00 },
  { id: 4, batchNumber: 'APB-2024-0002', paymentDate: '2024-01-25', benefitType: 'AGE', itemCount: 6, totalAmount: 15000.00 },
  { id: 5, batchNumber: 'APB-2024-0002', paymentDate: '2024-01-25', benefitType: 'INVALIDITY', itemCount: 2, totalAmount: 5000.00 },
];

const mockCheckRegister = [
  { checkNumber: '10001', payee: 'John Williams', amount: 2500.00, batchNumber: 'APB-2024-0001', printDate: '2024-01-23', status: 'CLEARED' },
  { checkNumber: '10002', payee: 'Mary Thompson', amount: 1050.00, batchNumber: 'APB-2024-0001', printDate: '2024-01-23', status: 'CLEARED' },
  { checkNumber: '10003', payee: 'Patricia Adams', amount: 5000.00, batchNumber: 'APB-2024-0001', printDate: '2024-01-23', status: 'OUTSTANDING' },
  { checkNumber: '10004', payee: 'Robert Johnson', amount: 850.00, batchNumber: 'APB-2024-0001', printDate: '2024-01-23', status: 'CLEARED' },
  { checkNumber: '10005', payee: 'James Wilson', amount: 2800.00, batchNumber: 'APB-2024-0003', printDate: '2024-01-28', status: 'OUTSTANDING' },
];

const mockDDRegister = [
  { batchRef: 'DD-APB-2024-0001', payee: 'David Charles', amount: 3200.00, bank: 'Bank of Nevis', accountLast4: '8901', processDate: '2024-01-23', status: 'SETTLED' },
  { batchRef: 'DD-APB-2024-0001', payee: 'Linda Martinez', amount: 1600.00, bank: 'CIBC FirstCaribbean', accountLast4: '2345', processDate: '2024-01-23', status: 'SETTLED' },
  { batchRef: 'DD-APB-2024-0002', payee: 'Elizabeth Brown', amount: 3500.00, bank: 'First Caribbean Bank', accountLast4: '5678', processDate: '2024-01-25', status: 'PENDING' },
];

const mockGLSummary = [
  { accountCode: '6100-001', accountName: 'Age Pension Expense', debit: 27500.00, credit: 0, period: 'Jan 2024' },
  { accountCode: '6100-002', accountName: 'Sickness Benefit Expense', debit: 4500.00, credit: 0, period: 'Jan 2024' },
  { accountCode: '6100-003', accountName: 'Maternity Benefit Expense', debit: 14000.00, credit: 0, period: 'Jan 2024' },
  { accountCode: '6100-004', accountName: 'Invalidity Benefit Expense', debit: 5000.00, credit: 0, period: 'Jan 2024' },
  { accountCode: '2100-001', accountName: 'AP Liability - Checks', debit: 0, credit: 25000.00, period: 'Jan 2024' },
  { accountCode: '1100-001', accountName: 'Bank - Operating Account', debit: 0, credit: 26000.00, period: 'Jan 2024' },
];

const APReports: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-01-31');
  const [filterBenefitType, setFilterBenefitType] = useState('all');

  const handleExport = (reportType: string) => {
    console.log(`Exporting ${reportType} report...`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="AP Reports"
        subtitle="Accounts Payable reporting and analytics"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: 'Reports' }
        ]}
      />

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Benefit Type</Label>
              <Select value={filterBenefitType} onValueChange={setFilterBenefitType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="AGE">Age Pension</SelectItem>
                  <SelectItem value="SICKNESS">Sickness</SelectItem>
                  <SelectItem value="MATERNITY">Maternity</SelectItem>
                  <SelectItem value="INVALIDITY">Invalidity</SelectItem>
                  <SelectItem value="FUNERAL_GRANT">Funeral Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="benefits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="benefits" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Benefits Payments
          </TabsTrigger>
          <TabsTrigger value="checks" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Check Register
          </TabsTrigger>
          <TabsTrigger value="dd" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            DD Register
          </TabsTrigger>
          <TabsTrigger value="gl" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            GL Summary
          </TabsTrigger>
        </TabsList>

        {/* Benefits Payments Report */}
        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Benefits Payments Report</CardTitle>
                  <CardDescription>Summary of benefit payments by type and batch</CardDescription>
                </div>
                <Button onClick={() => handleExport('benefits')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead className="text-right">Item Count</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBenefitsPayments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.batchNumber}</TableCell>
                      <TableCell>{new Date(row.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.benefitType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.itemCount}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">{mockBenefitsPayments.reduce((s, r) => s + r.itemCount, 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(mockBenefitsPayments.reduce((s, r) => s + r.totalAmount, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check Register */}
        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Check Register</CardTitle>
                  <CardDescription>List of all checks issued</CardDescription>
                </div>
                <Button onClick={() => handleExport('checks')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check #</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Print Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCheckRegister.map((row) => (
                    <TableRow key={row.checkNumber}>
                      <TableCell className="font-medium">{row.checkNumber}</TableCell>
                      <TableCell>{row.payee}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                      <TableCell>{row.batchNumber}</TableCell>
                      <TableCell>{new Date(row.printDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'CLEARED' ? 'default' : 'secondary'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(mockCheckRegister.reduce((s, r) => s + r.amount, 0))}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DD Register */}
        <TabsContent value="dd">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Direct Deposit Register</CardTitle>
                  <CardDescription>List of all direct deposit transactions</CardDescription>
                </div>
                <Button onClick={() => handleExport('dd')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Ref</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Process Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDDRegister.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.batchRef}</TableCell>
                      <TableCell>{row.payee}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                      <TableCell>{row.bank}</TableCell>
                      <TableCell>****{row.accountLast4}</TableCell>
                      <TableCell>{new Date(row.processDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'SETTLED' ? 'default' : 'secondary'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(mockDDRegister.reduce((s, r) => s + r.amount, 0))}</TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GL Summary */}
        <TabsContent value="gl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>GL Summary</CardTitle>
                  <CardDescription>General Ledger posting summary by account</CardDescription>
                </div>
                <Button onClick={() => handleExport('gl')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockGLSummary.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{row.accountCode}</TableCell>
                      <TableCell>{row.accountName}</TableCell>
                      <TableCell className="text-right">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</TableCell>
                      <TableCell className="text-right">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</TableCell>
                      <TableCell>{row.period}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(mockGLSummary.reduce((s, r) => s + r.debit, 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(mockGLSummary.reduce((s, r) => s + r.credit, 0))}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APReports;
