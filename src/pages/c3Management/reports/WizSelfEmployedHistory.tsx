import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Download, Users, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  getSelfEmployedReport, getSelfEmployedReportDropdown, exportSelfEmployedReport,
  type SelfEmployedReportRow
} from '@/services/wizReportsService';
import { exportReportToExcel } from '@/utils/reportExcelExport';

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd-MMM-yyyy'); } catch { return d; }
}

const PAGE_SIZE = 10;

const SORT_COLUMNS = [
  { key: 'social_security_number', label: 'SSN' },
  { key: 'created_at', label: 'C3 Reg. Date' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

export default function WizSelfEmployedHistory() {
  const [data, setData] = useState<SelfEmployedReportRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('social_security_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchInput, setSearchInput] = useState('');

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSelfEmployedReport({
        search,
        sort_col: sortCol,
        sort_dir: sortDir,
        page_offset: page * PAGE_SIZE,
        page_limit: PAGE_SIZE,
      });
      setData(res.data?.self_employed || []);
      // Handle both response shapes: { total_records } and { data: { total_records } }
      setTotalRecords(res.total_records ?? (res as any).data?.total_records ?? 0);
    } catch (err: any) {
      toast.error('Failed to load data', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [search, sortCol, sortDir, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounce search: update search state after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');
      const res = await exportSelfEmployedReport(search);
      const rows = res.data?.self_employed || [];
      await exportReportToExcel(rows, [
        { header: 'SSN', key: 'social_security_number', width: 15 },
        { header: 'C3 Reg. Date', key: 'created_at', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Mobile', key: 'mobile', width: 18 },
      ], 'self-employed-history', 'Self Employed History');
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
        title="Self Employed History"
        breadcrumbs={[
          { label: 'Admin Dashboard', href: '/c3-management/dashboard' },
          { label: 'Self Employee History' },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Self Employed History</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[340px]">
                <Select value={search || '__all__'} onValueChange={handleSearchSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search by self employer name or SSN" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__all__">All Self Employed</SelectItem>
                    {dropdown.map(se => (
                      <SelectItem key={se.id} value={se.social_security_number}>
                        {se.first_name} ({se.social_security_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/5" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {SORT_COLUMNS.map(col => (
                    <TableHead key={col.key} className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort(col.key)}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>Mobile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                ) : data.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{row.social_security_number}</TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.mobile || ''}</TableCell>
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
              {Array.from({ length: Math.min(4, totalPages) }, (_, i) => (
                <Button key={i} variant={page === i ? 'default' : 'outline'} size="sm" className="min-w-[36px]" onClick={() => setPage(i)}>
                  {i + 1}
                </Button>
              ))}
              {totalPages > 5 && <span className="px-2 text-muted-foreground">...</span>}
              {totalPages > 4 && (
                <Button variant={page === totalPages - 1 ? 'default' : 'outline'} size="sm" className="min-w-[36px]" onClick={() => setPage(totalPages - 1)}>{totalPages}</Button>
              )}
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
