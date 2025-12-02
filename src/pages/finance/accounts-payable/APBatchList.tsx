import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { Search, Plus, Eye, FileText, CheckCircle, Clock, AlertCircle, Printer, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { APBatch, APBatchStatus } from '@/types/accountsPayable';

const statusConfig: Record<APBatchStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  'DRAFT': { label: 'Draft', variant: 'outline', icon: <FileText className="h-3 w-3" /> },
  'PENDING_VERIFICATION': { label: 'Pending Verification', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  'ACCOUNTS_VERIFIED': { label: 'Accounts Verified', variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
  'BENEFITS_VERIFIED': { label: 'Benefits Verified', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  'READY_FOR_CHECK_PRINTING': { label: 'Ready for Checks', variant: 'default', icon: <Printer className="h-3 w-3" /> },
  'READY_FOR_DIRECT_DEPOSIT': { label: 'Ready for DD', variant: 'default', icon: <Download className="h-3 w-3" /> },
  'CHECKS_PRINTED': { label: 'Checks Printed', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  'DD_FILE_GENERATED': { label: 'DD File Generated', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  'POSTED': { label: 'Posted', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  'REVERSED': { label: 'Reversed', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> }
};

const APBatchList: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<APBatch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    const data = await accountsPayableService.getAPBatches();
    setBatches(data);
    setLoading(false);
  };

  const filteredBatches = batches.filter(b => {
    const matchesSearch = 
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.createdByName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesPaymentMethod = filterPaymentMethod === 'all' || b.paymentMethod === filterPaymentMethod;
    return matchesSearch && matchesStatus && matchesPaymentMethod;
  });

  const summaryStats = {
    total: batches.length,
    pendingVerification: batches.filter(b => ['PENDING_VERIFICATION', 'ACCOUNTS_VERIFIED'].includes(b.status)).length,
    readyForPayment: batches.filter(b => ['BENEFITS_VERIFIED', 'READY_FOR_CHECK_PRINTING', 'READY_FOR_DIRECT_DEPOSIT'].includes(b.status)).length,
    posted: batches.filter(b => b.status === 'POSTED').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="AP Batch List"
        subtitle="View and manage Accounts Payable batches"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: 'Batch List' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Batches</p>
                <p className="text-2xl font-bold">{summaryStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
                <p className="text-2xl font-bold">{summaryStats.pendingVerification}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Printer className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ready for Payment</p>
                <p className="text-2xl font-bold">{summaryStats.readyForPayment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Posted</p>
                <p className="text-2xl font-bold">{summaryStats.posted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by batch number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="DIRECT_DEPOSIT">Direct Deposit</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => navigate('/finance/accounts-payable/pending')}>
              <Plus className="h-4 w-4 mr-2" />
              New Batch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>AP Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Batch Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">No batches found</TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => {
                  const statusInfo = statusConfig[batch.status];
                  return (
                    <TableRow key={batch.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/finance/accounts-payable/batch/${batch.id}`)}>
                      <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                      <TableCell>{new Date(batch.batchDate).toLocaleDateString()}</TableCell>
                      <TableCell>{batch.totalItems}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{batch.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(batch.totalAmount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(batch.netAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{batch.createdByName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(batch.createdAt).toLocaleDateString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/finance/accounts-payable/batch/${batch.id}`); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default APBatchList;
