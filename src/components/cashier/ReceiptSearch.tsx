import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Search, Receipt, Printer, Download, Eye } from 'lucide-react';
import ReceiptPreview, { ReceiptData } from './ReceiptPreview';

interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  payerName: string;
  payerType: 'Employer' | 'Insured Person' | 'Individual' | 'Organization';
  registrationNumber?: string;
  ssn?: string;
  paymentType: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  cashierName: string;
  status: 'Active' | 'Voided' | 'Refunded';
  batchId: string;
}

const ReceiptSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'receipt' | 'payer' | 'employer' | 'ssn'>('receipt');
  const [payerTypeFilter, setPayerTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Mock receipt data
  const mockReceipts: ReceiptRecord[] = [
    {
      id: 'R001',
      receiptNumber: 'SSB-2024-001001',
      payerName: 'Caribbean Construction Ltd',
      payerType: 'Employer',
      registrationNumber: 'EMP-2023-001',
      paymentType: 'C3 Contribution',
      amount: 15750.00,
      currency: 'EC$',
      paymentDate: new Date('2024-01-15'),
      cashierName: 'Maria Rodriguez',
      status: 'Active',
      batchId: 'BATCH-2024-001'
    },
    {
      id: 'R002',
      receiptNumber: 'SSB-2024-001002',
      payerName: 'John Michael Thompson',
      payerType: 'Insured Person',
      ssn: '123-45-6789',
      paymentType: 'Voluntary Contribution',
      amount: 850.00,
      currency: 'EC$',
      paymentDate: new Date('2024-01-15'),
      cashierName: 'Sandra Williams',
      status: 'Active',
      batchId: 'BATCH-2024-001'
    },
    {
      id: 'R003',
      receiptNumber: 'SSB-2024-001003',
      payerName: 'Dominica Agricultural Bank',
      payerType: 'Organization',
      registrationNumber: 'ORG-2020-045',
      paymentType: 'Service Fee',
      amount: 2500.00,
      currency: 'EC$',
      paymentDate: new Date('2024-01-16'),
      cashierName: 'David Clarke',
      status: 'Active',
      batchId: 'BATCH-2024-002'
    },
    {
      id: 'R004',
      receiptNumber: 'SSB-2024-001004',
      payerName: 'Global Tech Solutions',
      payerType: 'Employer',
      registrationNumber: 'EMP-2023-089',
      paymentType: 'C3 Contribution',
      amount: 12300.00,
      currency: 'EC$',
      paymentDate: new Date('2024-01-16'),
      cashierName: 'Maria Rodriguez',
      status: 'Active',
      batchId: 'BATCH-2024-002'
    }
  ];

  const filteredReceipts = useMemo(() => {
    return mockReceipts.filter(receipt => {
      // Search filter
      let matchesSearch = false;
      const searchLower = searchTerm.toLowerCase();
      
      switch (searchType) {
        case 'receipt':
          matchesSearch = receipt.receiptNumber.toLowerCase().includes(searchLower);
          break;
        case 'payer':
          matchesSearch = receipt.payerName.toLowerCase().includes(searchLower);
          break;
        case 'employer':
          matchesSearch = receipt.payerType === 'Employer' && receipt.payerName.toLowerCase().includes(searchLower);
          break;
        case 'ssn':
          matchesSearch = receipt.ssn?.toLowerCase().includes(searchLower) || false;
          break;
        default:
          matchesSearch = true;
      }

      // Payer type filter
      const matchesPayerType = payerTypeFilter === 'all' || receipt.payerType === payerTypeFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;

      // Date filter
      const matchesDateFrom = !dateFrom || receipt.paymentDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || receipt.paymentDate <= new Date(dateTo);

      return (!searchTerm || matchesSearch) && matchesPayerType && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [searchTerm, searchType, payerTypeFilter, statusFilter, dateFrom, dateTo]);

  const handleViewReceipt = (receiptRecord: ReceiptRecord) => {
    // Convert receipt record to receipt data for preview
    const receiptData: ReceiptData = {
      receiptNumber: receiptRecord.receiptNumber,
      batchId: receiptRecord.batchId,
      paymentDate: receiptRecord.paymentDate,
      status: receiptRecord.status,
      payerDetails: {
        name: receiptRecord.payerName,
        payerType: receiptRecord.payerType,
        registrationNumber: receiptRecord.registrationNumber,
        ssn: receiptRecord.ssn,
        address: '123 Main Street, Roseau, Dominica',
        contact: '(767) 123-4567'
      },
      paymentDetails: {
        paymentType: receiptRecord.paymentType,
        paymentMethod: 'Cash',
        currency: receiptRecord.currency,
        amount: receiptRecord.amount,
        referenceNumber: `REF-${receiptRecord.id}`
      },
      cashierDetails: {
        cashierId: 'CASH001',
        cashierName: receiptRecord.cashierName,
        terminalId: 'TERM-01',
        workstation: 'WS-MAIN-01'
      },
      organizationDetails: {
        name: 'DOMINICA SOCIAL SECURITY',
        address: 'Bay Front, Roseau, Commonwealth of Dominica',
        phone: '(767) 266-3608',
        email: 'info@socialsecurity.dm',
        website: 'www.socialsecurity.dm'
      },
      contributionDetails: receiptRecord.paymentType.includes('Contribution') ? {
        period: 'January 2024',
        employeeContribution: receiptRecord.amount * 0.4,
        employerContribution: receiptRecord.amount * 0.6,
        totalContribution: receiptRecord.amount,
        contributorType: receiptRecord.payerType === 'Employer' ? 'employer' : 'insured'
      } : undefined
    };

    setSelectedReceipt(receiptData);
    setIsPreviewOpen(true);
  };

  const columns = [
    {
      key: 'receiptNumber',
      label: 'Receipt Number'
    },
    {
      key: 'payerName',
      label: 'Payer Name'
    },
    {
      key: 'payerType',
      label: 'Payer Type',
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      )
    },
    {
      key: 'registrationNumber',
      label: 'Reg/SSN',
      render: (value: string, row: ReceiptRecord) => (
        <span className="text-sm">{value || row.ssn || 'N/A'}</span>
      )
    },
    {
      key: 'paymentType',
      label: 'Payment Type'
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value: number, row: ReceiptRecord) => (
        <span className="font-medium">{row.currency} {value.toFixed(2)}</span>
      )
    },
    {
      key: 'paymentDate',
      label: 'Date',
      render: (value: Date) => value.toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'Active' ? 'default' : value === 'Voided' ? 'destructive' : 'secondary'}>
          {value}
        </Badge>
      )
    }
  ];

  const clearFilters = () => {
    setSearchTerm('');
    setPayerTypeFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Receipt Search & Reprint</h1>
          <p className="text-muted-foreground">Search and reprint receipts by various criteria</p>
        </div>
        <Button variant="outline" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search Filters</span>
          </CardTitle>
          <CardDescription>Filter receipts by different criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="searchType">Search By</Label>
              <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt Number</SelectItem>
                  <SelectItem value="payer">Payer Name</SelectItem>
                  <SelectItem value="employer">Employer Name</SelectItem>
                  <SelectItem value="ssn">SSN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="searchTerm">Search Term</Label>
              <Input
                placeholder={`Enter ${searchType === 'receipt' ? 'receipt number' : 
                              searchType === 'payer' ? 'payer name' : 
                              searchType === 'employer' ? 'employer name' : 'SSN'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="payerType">Payer Type</Label>
              <Select value={payerTypeFilter} onValueChange={setPayerTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Employer">Employer</SelectItem>
                  <SelectItem value="Insured Person">Insured Person</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Voided">Voided</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Search Results</span>
            </div>
            <Badge variant="outline">
              {filteredReceipts.length} receipt(s) found
            </Badge>
          </CardTitle>
          <CardDescription>Click on a receipt to view and reprint</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredReceipts}
            searchPlaceholder="Search receipts..."
            onView={handleViewReceipt}
            actions={{
              view: true,
              edit: false,
              approve: false,
              reject: false
            }}
          />
        </CardContent>
      </Card>

      {/* Receipt Preview Dialog */}
      {selectedReceipt && (
        <ReceiptPreview
          receiptData={selectedReceipt}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedReceipt(null);
          }}
          title="Receipt Reprint"
          allowReprint={true}
        />
      )}
    </div>
  );
};

export default ReceiptSearch;