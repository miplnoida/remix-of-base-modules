import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, DollarSign, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';

const GLPostingSummary = () => {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Mock GL posting data
  const glPostings = [
    {
      id: 'GL001',
      batchId: 'BATCH-2024-001',
      accountCode: '1100-001',
      accountName: 'Contribution Revenue',
      debitAmount: 125000.00,
      creditAmount: 0.00,
      description: 'Employee contributions for January 2024',
      postingDate: '2024-01-15',
      status: 'Posted',
      reference: 'CONTRIB-JAN-2024'
    },
    {
      id: 'GL002',
      batchId: 'BATCH-2024-001',
      accountCode: '2100-001',
      accountName: 'Employer Contributions Payable',
      debitAmount: 0.00,
      creditAmount: 98000.00,
      description: 'Employer contributions for January 2024',
      postingDate: '2024-01-15',
      status: 'Posted',
      reference: 'EMP-CONTRIB-JAN-2024'
    },
    {
      id: 'GL003',
      batchId: 'BATCH-2024-002',
      accountCode: '4100-001',
      accountName: 'Investment Income',
      debitAmount: 45000.00,
      creditAmount: 0.00,
      description: 'Monthly investment returns',
      postingDate: '2024-01-16',
      status: 'Pending',
      reference: 'INV-INCOME-JAN-2024'
    },
    {
      id: 'GL004',
      batchId: 'BATCH-2024-002',
      accountCode: '1200-001',
      accountName: 'Bank Account - Operations',
      debitAmount: 0.00,
      creditAmount: 45000.00,
      description: 'Investment income deposit',
      postingDate: '2024-01-16',
      status: 'Pending',
      reference: 'BANK-DEP-JAN-2024'
    }
  ];

  const columns = [
    {
      key: 'id',
      label: 'GL Entry ID'
    },
    {
      key: 'batchId',
      label: 'Batch ID'
    },
    {
      key: 'accountCode',
      label: 'Account Code'
    },
    {
      key: 'accountName',
      label: 'Account Name'
    },
    {
      key: 'debitAmount',
      label: 'Debit Amount',
      render: (value: number) => {
        return value > 0 ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
      }
    },
    {
      key: 'creditAmount',
      label: 'Credit Amount',
      render: (value: number) => {
        return value > 0 ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'Posted' ? 'default' : 'secondary'}>
          {value === 'Posted' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
          {value}
        </Badge>
      )
    }
  ];

  // Calculate totals
  const totalDebits = glPostings.reduce((sum, entry) => sum + entry.debitAmount, 0);
  const totalCredits = glPostings.reduce((sum, entry) => sum + entry.creditAmount, 0);
  const isBalanced = totalDebits === totalCredits;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GL Posting Summary</h1>
          <p className="text-muted-foreground">Review and manage General Ledger posting entries</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <DollarSign className="w-4 h-4 mr-2" />
            Post to GL
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter GL entries by batch, date range, or status</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="batch">Batch ID</Label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="BATCH-2024-001">BATCH-2024-001</SelectItem>
                <SelectItem value="BATCH-2024-002">BATCH-2024-002</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fromDate">From Date</Label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="toDate">To Date</Label>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Status</CardTitle>
            {isBalanced ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {isBalanced ? 'Balanced' : 'Unbalanced'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{glPostings.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* GL Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>GL Posting Entries</CardTitle>
          <CardDescription>Detailed view of all General Ledger entries</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={glPostings}
            searchPlaceholder="Search by account name..."
            actions={{
              view: true,
              edit: false,
              approve: false,
              reject: false
            }}
          />
        </CardContent>
      </Card>

      {/* Balance Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Verification</CardTitle>
          <CardDescription>Ensure debits equal credits before posting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Debits:</span>
              <span className="font-mono">${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Credits:</span>
              <span className="font-mono">${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-bold">Difference:</span>
              <span className={`font-mono font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {!isBalanced && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700 font-medium">Entries are out of balance!</span>
                </div>
                <p className="text-red-600 text-sm mt-1">
                  Please review the entries before posting to the General Ledger.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GLPostingSummary;