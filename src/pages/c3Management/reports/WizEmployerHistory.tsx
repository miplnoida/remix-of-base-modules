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
  getEmployerReport, exportEmployerReport,
  type EmployerReportRow
} from '@/services/wizReportsService';
import { exportReportToExcel } from '@/utils/reportExcelExport';

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd-MMM-yyyy'); } catch { return d; }
}

const PAGE_SIZE = 10;

const SORT_COLUMNS = [
  { key: 'registration_number', label: 'Registration No.' },
  { key: 'registration_date', label: 'C3 Reg. Date' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'company_name', label: 'Employer Name' },
  { key: 'email', label: 'Email Id' },
];

export default function WizEmployerHistory() {
  const [data, setData] = useState<EmployerReportRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('registration_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchInput, setSearchInput] = useState('');
  

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployerReport({
        search,
        sort_col: sortCol,
        sort_dir: sortDir,
        page_offset: page * PAGE_SIZE,
        page_limit: PAGE_SIZE,
      });
      setData(res.data?.employers || []);
      setTotalRecords(res.total_records || 0);
    } catch (err: any) {
      toast.error('Failed to load employer data', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [search, sortCol, sortDir, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search: update search state after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');
      const res = await exportEmployerReport(search);
      const rows = res.data?.employers || [];
      await exportReportToExcel(rows, [
        { header: 'Registration No.', key: 'registration_number', width: 18 },
        { header: 'C3 Reg. Date', key: 'registration_date', width: 15 },
        { header: 'Contact Person', key: 'contact_person', width: 25 },
        { header: 'Employer Name', key: 'company_name', width: 30 },
        { header: 'Mobile No', key: 'mobile', width: 15 },
        { header: 'Email Id', key: 'email', width: 30 },
      ], 'employer-history', 'Employer History');
      toast.success('Export complete');
    } catch (err: any) {
      toast.error('Export failed', { description: err.message });
    }
  };

  const startRecord = page * PAGE_SIZE + 1;
  const endRecord = Math.min((page + 1) * PAGE_SIZE, totalRecords);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Employer History"
        breadcrumbs={[
          { label: 'Admin Dashboard', href: '/c3-management/dashboard' },
          { label: 'Employers History' },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Employer History</h2>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search by employer name or reg number"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-[340px]"
              />
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/5" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {SORT_COLUMNS.map(col => (
                    <TableHead
                      key={col.key}
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>Mobile No</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No records found</TableCell>
                  </TableRow>
                ) : data.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{row.registration_number}</TableCell>
                    <TableCell>{formatDate(row.registration_date)}</TableCell>
                    <TableCell>{row.contact_person}</TableCell>
                    <TableCell>{row.company_name}</TableCell>
                    <TableCell>{row.mobile || ''}</TableCell>
                    <TableCell>{row.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-primary font-medium">
              {totalRecords > 0 ? `${startRecord}-${endRecord} of ${totalRecords}` : '0'}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {Array.from({ length: Math.min(4, totalPages) }, (_, i) => (
                <Button
                  key={i}
                  variant={page === i ? 'default' : 'outline'}
                  size="sm"
                  className="min-w-[36px]"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              {totalPages > 5 && <span className="px-2 text-muted-foreground">...</span>}
              {totalPages > 4 && (
                <Button variant="outline" size="sm" className="min-w-[36px]" onClick={() => setPage(totalPages - 1)}>
                  {totalPages}
                </Button>
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
