import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  getPaymentReport, exportPaymentReport,
  type PaymentReportRow
} from '@/services/wizReportsService';
import { getCompaniesDropdown, getCompanyUsers, type WizCompanyDropdown, type WizUser } from '@/services/wizAdminApiService';
import { getSelfEmployedReportDropdown } from '@/services/wizReportsService';
import { exportReportToExcel } from '@/utils/reportExcelExport';

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd-MMM-yyyy'); } catch { return d; }
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '$0.00';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: 'Company', label: 'Employer' },
  { value: 'SelfEmployee', label: 'Self Employed' },
];

export default function WizPaymentsHistory() {
  const [data, setData] = useState<PaymentReportRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [paymentStatus, setPaymentStatus] = useState('');
  const [selectedType, setSelectedType] = useState('Company');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedSEId, setSelectedSEId] = useState<string>('');

  // Dropdowns
  const [companies, setCompanies] = useState<WizCompanyDropdown[]>([]);
  const [users, setUsers] = useState<WizUser[]>([]);
  const [selfEmployed, setSelfEmployed] = useState<{ id: number; first_name: string; social_security_number: string }[]>([]);

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  const isSelfEmployed = selectedType === 'SelfEmployee';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPaymentReport({
        payment_status: paymentStatus || undefined,
        types: selectedType,
        company_id: !isSelfEmployed ? selectedCompanyId : null,
        user_id: !isSelfEmployed ? selectedUserId : null,
        page_offset: page * PAGE_SIZE,
        page_limit: PAGE_SIZE,
      });
      setData(res.data?.records || []);
      setTotalRecords(res.data?.total_records || 0);
    } catch (err: any) {
      toast.error('Failed to load payment data', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [paymentStatus, selectedType, selectedCompanyId, selectedUserId, page, isSelfEmployed]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load dropdowns
  useEffect(() => {
    getCompaniesDropdown().then(r => setCompanies(r.data?.companies || [])).catch(() => {});
    getSelfEmployedReportDropdown().then(r => setSelfEmployed(r.data?.self_employed || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      getCompanyUsers(selectedCompanyId).then(r => setUsers(r.data?.users || [])).catch(() => {});
    } else {
      setUsers([]);
      setSelectedUserId(null);
    }
  }, [selectedCompanyId]);

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');
      const res = await exportPaymentReport({
        payment_status: paymentStatus || undefined,
        types: selectedType,
        company_id: selectedCompanyId,
        user_id: selectedUserId,
      });
      const rows = (res.data?.records || []).map(r => ({
        ...r,
        total_wages_fmt: formatCurrency(r.total_wages),
        total_ss_fmt: formatCurrency(r.total_ss_contributions),
        total_levy_fmt: formatCurrency(r.total_levy),
        total_fines_fmt: formatCurrency(r.total_fines_penalties),
        total_severance_fmt: formatCurrency(r.total_severance),
        payment_amount: r.pay_details?.[0]?.payment_amount ? formatCurrency(r.pay_details[0].payment_amount) : '',
        transaction_id: r.pay_details?.map(p => p.transaction_id).join(', ') || '',
        status: r.pay_details?.[0]?.transaction_status || '',
      }));
      const cols = [
        { header: 'Month', key: 'period_month', width: 12 },
        { header: 'Year', key: 'period_year', width: 8 },
        { header: 'Wages', key: 'total_wages_fmt', width: 15 },
        { header: 'Social Security', key: 'total_ss_fmt', width: 15 },
        ...(!isSelfEmployed ? [{ header: 'Levy', key: 'total_levy_fmt', width: 12 }] : []),
        { header: 'Fines and Penalties', key: 'total_fines_fmt', width: 18 },
        ...(!isSelfEmployed ? [{ header: 'Severance', key: 'total_severance_fmt', width: 12 }] : []),
        { header: 'Payment Amount', key: 'payment_amount', width: 15 },
        { header: 'Transaction ID', key: 'transaction_id', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      await exportReportToExcel(rows, cols, 'payment-history', 'Payment History');
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
        title="Payment History"
        breadcrumbs={[
          { label: 'Admin Dashboard', href: '/c3-management/dashboard' },
          { label: 'Payment History' },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Select Payment Status</label>
              <Select value={paymentStatus || 'all'} onValueChange={v => { setPaymentStatus(v === 'all' ? '' : v); setPage(0); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="AUTHORIZED">AUTHORIZED</SelectItem>
                  <SelectItem value="DECLINED">DECLINED</SelectItem>
                  <SelectItem value="INVALID_REQUEST">INVALID_REQUEST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Select Type</label>
              <Select value={selectedType} onValueChange={v => { setSelectedType(v); setSelectedCompanyId(null); setSelectedUserId(null); setPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!isSelfEmployed && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Select Employer</label>
                  <Select value={selectedCompanyId?.toString() || '__all__'} onValueChange={v => { setSelectedCompanyId(v === '__all__' ? null : Number(v)); setPage(0); }}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select Employer" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="__all__">All Employers</SelectItem>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.company_name} ({c.registration_number})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCompanyId && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Select User</label>
                    <Select value={selectedUserId?.toString() || '__all__'} onValueChange={v => { setSelectedUserId(v === '__all__' ? null : Number(v)); setPage(0); }}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select User" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="__all__">All Users</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.first_name} {u.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {isSelfEmployed && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Select Self Employee</label>
                <Select value={selectedSEId || '__all__'} onValueChange={v => { setSelectedSEId(v === '__all__' ? '' : v); setPage(0); }}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select Self Employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__all__">All</SelectItem>
                    {selfEmployed.map(se => (
                      <SelectItem key={se.id} value={se.social_security_number}>{se.first_name} ({se.social_security_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="ml-auto">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary/5" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Payment History</h2>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Wages</TableHead>
                  <TableHead>{isSelfEmployed ? 'Contribution' : 'Social Security'}</TableHead>
                  {!isSelfEmployed && <TableHead>Levy</TableHead>}
                  <TableHead>Fines and Penalties</TableHead>
                  {!isSelfEmployed && <TableHead>Severance</TableHead>}
                  <TableHead>Payment Amount</TableHead>
                  <TableHead>Creation Date</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                ) : data.map((row, idx) => (
                  <TableRow key={`${row.header_id}-${idx}`} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {row.is_submitted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {row.period_month}
                      </div>
                    </TableCell>
                    <TableCell>{row.period_year}</TableCell>
                    <TableCell>{formatCurrency(row.total_wages)}</TableCell>
                    <TableCell>{formatCurrency(row.total_ss_contributions)}</TableCell>
                    {!isSelfEmployed && <TableCell>{formatCurrency(row.total_levy)}</TableCell>}
                    <TableCell>{formatCurrency(row.total_fines_penalties)}</TableCell>
                    {!isSelfEmployed && <TableCell>{formatCurrency(row.total_severance)}</TableCell>}
                    <TableCell>{row.pay_details?.[0] ? formatCurrency(row.pay_details[0].payment_amount) : '—'}</TableCell>
                    <TableCell>{formatDate(row.creation_date)}</TableCell>
                    <TableCell>
                      {row.schedule_no != null && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">{row.schedule_no}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(row.pay_details || []).map((p, pi) => (
                          <div key={pi} className="text-xs font-mono">{p.transaction_id}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(row.pay_details || []).map((p, pi) => (
                          <div key={pi} className="text-xs">{formatDate(p.transaction_date)}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.pay_details?.[0]?.transaction_status && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-700 font-medium">{row.pay_details[0].transaction_status}</span>
                        </div>
                      )}
                    </TableCell>
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
