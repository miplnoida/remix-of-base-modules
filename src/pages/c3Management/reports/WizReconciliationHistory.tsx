import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  getReconciliationReport, getReconciliationCardHolders, exportReconciliationReport,
  type ReconciliationReportRow
} from '@/services/wizReportsService';
import { exportReportToExcel } from '@/utils/reportExcelExport';

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd-MMM-yyyy'); } catch { return d; }
}

function formatCurrency(n: number | null) {
  if (n == null) return '$0.00';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAGE_SIZE = 10;

export default function WizReconciliationHistory() {
  const [data, setData] = useState<ReconciliationReportRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<string>('Pending');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardHolders, setCardHolders] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReconciliationReport({
        status: status || null,
        card_holder_name: cardHolder || null,
        from_date: fromDate || null,
        to_date: toDate || null,
        page_offset: page * PAGE_SIZE,
        page_limit: PAGE_SIZE,
      });
      setData(res.data?.records || []);
      setTotalRecords(res.data?.total_records || 0);
    } catch (err: any) {
      toast.error('Failed to load reconciliation data', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [status, cardHolder, fromDate, toDate, page]);

  useEffect(() => {
    getReconciliationCardHolders()
      .then(res => setCardHolders((res.data?.card_holders || []).map(c => c.card_holder_name)))
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };

  // Load with defaults on mount only
  useEffect(() => { fetchData(); }, [page]);

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');
      const res = await exportReconciliationReport({ status: status || null, card_holder_name: cardHolder || null });
      const rows = res.data?.records || [];
      await exportReportToExcel(rows, [
        { header: 'Payment Transaction ID', key: 'payment_transaction_id', width: 28 },
        { header: 'Transaction Date', key: 'transaction_date', width: 15 },
        { header: 'Payment Amount', key: 'payment_amount', width: 15 },
        { header: 'Payment Status', key: 'payment_status', width: 18 },
        { header: 'Reconciled By Name', key: 'reconciled_by_name', width: 20 },
        { header: 'Reconciled By Date', key: 'reconciled_by_date', width: 15 },
        { header: 'Notes', key: 'notes', width: 40 },
      ], 'reconciliation-history', 'Reconciliation History');
      toast.success('Export complete');
    } catch (err: any) {
      toast.error('Export failed', { description: err.message });
    }
  };

  const startRecord = totalRecords > 0 ? page * PAGE_SIZE + 1 : 0;
  const endRecord = Math.min((page + 1) * PAGE_SIZE, totalRecords);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Reconciliation History"
        breadcrumbs={[
          { label: 'Dashboard', href: '/c3-management/dashboard' },
          { label: 'Administration', href: '#' },
          { label: 'Reconciliation History' },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Reconcile Status</label>
              <Select value={status || '__all__'} onValueChange={v => setStatus(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="Reconciled">Reconciled</SelectItem>
                  <SelectItem value="Pending">Not Reconciled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Card Holder Name</label>
              <Select value={cardHolder || '__all__'} onValueChange={v => setCardHolder(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Card holder name" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__all__">All</SelectItem>
                  {cardHolders.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button variant="outline" className="text-primary border-primary hover:bg-primary/5" onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
            <div className="ml-auto">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/5" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Reconciliation History</h2>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Payment Transaction ID</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>Payment Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Reconciled By Name</TableHead>
                  <TableHead>Reconciled By Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                ) : data.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{row.payment_transaction_id}</TableCell>
                    <TableCell>{formatDate(row.transaction_date)}</TableCell>
                    <TableCell>{formatCurrency(row.payment_amount)}</TableCell>
                    <TableCell>
                      <span className={row.payment_status === 'Reconciled' ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                        {row.payment_status}
                      </span>
                    </TableCell>
                    <TableCell>{row.reconciled_by_name || '—'}</TableCell>
                    <TableCell>{formatDate(row.reconciled_by_date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.notes || ''}>{row.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-primary font-medium">
              {totalRecords > 0 ? `${startRecord}-${endRecord} of ${totalRecords}` : '0 records'}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
