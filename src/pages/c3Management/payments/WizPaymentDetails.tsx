import React, { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/common/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Printer, FileSpreadsheet, Download, Loader2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  getPaymentDetailsList,
  getTransactionReceipt,
  type PaymentRecord,
  type PaymentPayDetail,
  type TransactionReceipt,
} from '@/services/wizPaymentService';
import { getCompaniesDropdown, getCompanyUsers, type WizCompanyDropdown, type WizUser } from '@/services/wizAdminApiService';

// ─── Currency Formatter ───────────────────────────────
function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return '$0.00';
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return format(parseISO(iso), 'dd-MMM-yyyy');
  } catch {
    return iso;
  }
}

// ─── Main Component ───────────────────────────────────
export default function WizPaymentDetails() {
  // Filters
  const ALL = '__all__';
  // removed unused val helper

  const [paymentStatus, setPaymentStatus] = useState(ALL);
  const [selectedType, setSelectedType] = useState('SSB');
  const [companyId, setCompanyId] = useState<string>(ALL);
  const [userId, setUserId] = useState<string>(ALL);
  const [selfEmployedId, setSelfEmployedId] = useState<string>(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Dropdown data
  const [companies, setCompanies] = useState<WizCompanyDropdown[]>([]);
  const [companyUsers, setCompanyUsers] = useState<WizUser[]>([]);
  const [selfEmployedList, setSelfEmployedList] = useState<any[]>([]);

  // Table
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Receipt modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Export loading
  const [exporting, setExporting] = useState(false);

  // ─── Load dropdowns ─────────────────────────────────
  useEffect(() => {
    getCompaniesDropdown().then(res => {
      if (res.data?.companies) setCompanies(res.data.companies);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedType === 'SelfEmployee') {
      import('@/services/wizSelfEmployedService').then(mod => {
        mod.getSelfEmployedList({ page_offset: 0, page_limit: 1000 }).then(res => {
          if (res.data?.records) setSelfEmployedList(res.data.records);
        }).catch(() => {});
      });
    }
  }, [selectedType]);

  useEffect(() => {
    if (companyId && companyId !== ALL) {
      getCompanyUsers(Number(companyId)).then(res => {
        if (res.data?.users) setCompanyUsers(res.data.users);
      }).catch(() => {});
    } else {
      setCompanyUsers([]);
      setUserId(ALL);
    }
  }, [companyId]);

  // ─── Fetch data ─────────────────────────────────────
  const fetchData = useCallback(async (page = pageNumber) => {
    // Date validation
    if (fromDate && toDate && fromDate > toDate) {
      toast.error('Start Date cannot be greater than End Date');
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, any> = {
        payment_status: paymentStatus === ALL ? '' : paymentStatus,
        from_date: fromDate || null,
        to_date: toDate || null,
        types: selectedType,
        page_number: page,
        page_size: pageSize,
        export_all: false,
      };

      if (selectedType === 'Company') {
        params.company_id = companyId && companyId !== ALL ? Number(companyId) : null;
        params.user_id = userId && userId !== ALL ? Number(userId) : null;
      } else if (selectedType === 'SelfEmployee') {
        params.user_id = selfEmployedId && selfEmployedId !== ALL ? Number(selfEmployedId) : null;
      }

      const res = await getPaymentDetailsList(params);
      if (res.data) {
        setRecords(res.data.records || []);
        setTotalRecords(res.data.total_records || 0);
        setTotalPages(res.data.total_pages || 0);
        setPageNumber(res.data.page_number ?? page);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load payment details');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [paymentStatus, selectedType, companyId, userId, selfEmployedId, fromDate, toDate, pageSize, pageNumber]);

  // Auto-fetch on filter change
  useEffect(() => {
    fetchData(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus, selectedType, companyId, userId, selfEmployedId, fromDate, toDate]);

  // ─── Receipt modal ─────────────────────────────────
  const handleOpenReceipt = async (record: PaymentRecord, detail: PaymentPayDetail) => {
    setReceiptLoading(true);
    setReceiptOpen(true);
    setReceipt(null);
    try {
      if (!record.user_id) {
        throw new Error('User ID is not available for this record');
      }
      const res = await getTransactionReceipt({
        user_id: record.user_id,
        c3_header_id: record.header_id,
        transaction_id: detail.transaction_id,
      });
      if (res.data) setReceipt(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load receipt');
      setReceiptOpen(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  // ─── Excel export ──────────────────────────────────
  const handleExportExcel = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      toast.error('Start Date cannot be greater than End Date');
      return;
    }
    setExporting(true);
    try {
      const params: Record<string, any> = {
        payment_status: paymentStatus === ALL ? '' : paymentStatus,
        from_date: fromDate || null,
        to_date: toDate || null,
        types: selectedType,
        export_all: true,
      };
      if (selectedType === 'Company') {
        params.company_id = companyId && companyId !== ALL ? Number(companyId) : null;
        params.user_id = userId && userId !== ALL ? Number(userId) : null;
      } else if (selectedType === 'SelfEmployee') {
        params.user_id = selfEmployedId && selfEmployedId !== ALL ? Number(selfEmployedId) : null;
      }

      const res = await getPaymentDetailsList(params);
      const allRecords = res.data?.records || [];

      if (allRecords.length === 0) {
        toast.error('No records to export');
        return;
      }

      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Payment History');

      const isSE = selectedType === 'SelfEmployee';
      const columns: any[] = [
        { header: 'Month', key: 'month', width: 15 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Wages', key: 'wages', width: 15 },
        { header: isSE ? 'Contribution' : 'SocialSecurity', key: 'ss', width: 18 },
      ];
      if (!isSE) {
        columns.push({ header: 'Levy', key: 'levy', width: 15 });
      }
      columns.push(
        { header: 'FinesAndPenalties', key: 'fines', width: 18 },
      );
      if (!isSE) {
        columns.push({ header: 'Severance', key: 'severance', width: 15 });
      }
      columns.push(
        { header: 'CreationDate', key: 'creationDate', width: 18 },
        { header: 'Schedule', key: 'schedule', width: 12 },
        { header: 'PaymentAmount', key: 'paymentAmount', width: 18 },
        { header: 'TransactionID', key: 'transactionId', width: 30 },
        { header: 'TransactionDate', key: 'transactionDate', width: 18 },
        { header: 'TransactionStatus', key: 'transactionStatus', width: 18 },
      );
      sheet.columns = columns;

      for (const rec of allRecords) {
        const firstPay = rec.pay_details?.[0];
        const row: Record<string, any> = {
          month: rec.period_month,
          year: rec.period_year,
          wages: rec.total_wages?.toFixed(2),
          ss: rec.total_ss_contributions?.toFixed(2),
          fines: rec.total_fines_and_penalties?.toFixed(2),
          creationDate: fmtDate(rec.insert_datetime),
          schedule: rec.schedule_no ?? '',
          paymentAmount: firstPay?.payment_amount?.toFixed(2) ?? '',
          transactionId: firstPay?.transaction_id ?? '',
          transactionDate: firstPay ? fmtDate(firstPay.transaction_date) : '',
          transactionStatus: firstPay?.transaction_status ?? '',
        };
        if (!isSE) {
          row.levy = rec.total_levy_employee?.toFixed(2);
          row.severance = rec.total_severance?.toFixed(2);
        }
        sheet.addRow(row);

        // Additional payment detail rows
        if (rec.pay_details && rec.pay_details.length > 1) {
          for (let i = 1; i < rec.pay_details.length; i++) {
            const pd = rec.pay_details[i];
            const extraRow: Record<string, any> = {
              month: '', year: '', wages: '', ss: '', fines: '', creationDate: '', schedule: '',
              paymentAmount: pd.payment_amount?.toFixed(2) ?? '',
              transactionId: pd.transaction_id ?? '',
              transactionDate: fmtDate(pd.transaction_date),
              transactionStatus: pd.transaction_status ?? '',
            };
            if (!isSE) {
              extraRow.levy = '';
              extraRow.severance = '';
            }
            sheet.addRow(extraRow);
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Payment_History.xlsx');
      toast.success('Excel exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  // ─── PDF download ──────────────────────────────────
  const handleDownloadReceiptPDF = async () => {
    if (!receipt) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(16);
      doc.text('St. Christopher and Nevis Social Security Board', 105, y, { align: 'center' });
      y += 10;
      doc.setFontSize(14);
      doc.text('RECEIPT', 105, y, { align: 'center' });
      y += 10;
      doc.setFontSize(10);
      doc.text('Head Office: P.O. Box 79, Bay Road, Basseterre, St. Kitts', 105, y, { align: 'center' });
      y += 6;
      doc.text('Branch Office: Pinney\'s Commercial Site, Charlestown, Nevis', 105, y, { align: 'center' });
      y += 10;

      doc.setFontSize(11);
      doc.text(`Receipt#: ${receipt.receipt_number}`, 15, y);
      y += 10;

      const rows: [string, string][] = [
        ['Reg No.', receipt.reg_no],
        ['Customer Name', receipt.ref_customer_name],
        ['Transaction ID', receipt.payment_gateway_transaction_id],
      ];
      if (receipt.total_ss_contributions > 0) rows.push(['Total SS Contributions', fmtCurrency(receipt.total_ss_contributions)]);
      if (receipt.total_ss_penalty > 0) rows.push(['Total SS Penalty', fmtCurrency(receipt.total_ss_penalty)]);
      if (receipt.total_levy > 0) rows.push(['Total Levy', fmtCurrency(receipt.total_levy)]);
      if (receipt.total_levy_penalty > 0) rows.push(['Total Levy Penalty', fmtCurrency(receipt.total_levy_penalty)]);
      if (receipt.total_severance > 0) rows.push(['Total Severance', fmtCurrency(receipt.total_severance)]);
      if (receipt.total_pe_penalty > 0) rows.push(['Total PE Penalty', fmtCurrency(receipt.total_pe_penalty)]);
      rows.push(
        ['Amount', fmtCurrency(receipt.payment_amount)],
        ['Status', receipt.payment_status],
        ['Period', receipt.period],
        ['Transaction Date', receipt.create_time],
      );

      for (const [label, value] of rows) {
        doc.text(`${label}:`, 15, y);
        doc.text(value || '-', 80, y);
        y += 7;
      }

      y += 5;
      doc.setFontSize(8);
      doc.text('This is an electronically generated receipt and does not require a signature.', 15, y);

      doc.save(`Receipt_${receipt.receipt_number}.pdf`);
    } catch (err: any) {
      toast.error('Failed to download PDF');
    }
  };

  const isSelfEmployed = selectedType === 'SelfEmployee';

  return (
    <PageShell
      title="Payment Details"
      subtitle="View payment transaction history"
      breadcrumbs={[
        { label: 'C3 Management', href: '/c3-management/dashboard' },
        { label: 'Payment Details' },
      ]}
    >
      {/* ─── Filter Bar ──────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Payment Status */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Select Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Status</SelectItem>
                  <SelectItem value="AUTHORIZED">AUTHORIZED</SelectItem>
                  <SelectItem value="DECLINED">DECLINED</SelectItem>
                  <SelectItem value="INVALID_REQUEST">INVALID_REQUEST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select Type */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Select Type</Label>
              <Select value={selectedType} onValueChange={(v) => {
                setSelectedType(v);
                setCompanyId(ALL);
                setUserId(ALL);
                setSelfEmployedId(ALL);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSB">All Types</SelectItem>
                  <SelectItem value="Company">Employer</SelectItem>
                  <SelectItem value="SelfEmployee">Self Employed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: Employer dropdown */}
            {selectedType === 'Company' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Select Employer</Label>
                <SearchableSelect
                  value={companyId === ALL ? '' : companyId}
                  onValueChange={(v) => { setCompanyId(v || ALL); setUserId(ALL); }}
                  options={companies.map(c => ({
                    value: String(c.id),
                    label: `${c.company_name} (${c.registration_number})`,
                    searchText: c.registration_number,
                  }))}
                  placeholder="Select Employer"
                  searchPlaceholder="Search by name or reg number..."
                  includeAllOption="All Employers"
                  className="w-[240px]"
                />
              </div>
            )}

            {/* Conditional: User dropdown */}
            {selectedType === 'Company' && companyId && companyId !== ALL && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Select User</Label>
                <SearchableSelect
                  value={userId === ALL ? '' : userId}
                  onValueChange={(v) => setUserId(v || ALL)}
                  options={companyUsers.map(u => ({
                    value: String(u.id),
                    label: `${u.first_name} ${u.last_name}`,
                  }))}
                  placeholder="Select User"
                  searchPlaceholder="Search by name..."
                  includeAllOption="All Users"
                  className="w-[200px]"
                />
              </div>
            )}

            {/* Conditional: Self-Employed dropdown */}
            {selectedType === 'SelfEmployee' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Select Self Employee</Label>
                <SearchableSelect
                  value={selfEmployedId === ALL ? '' : selfEmployedId}
                  onValueChange={(v) => setSelfEmployedId(v || ALL)}
                  options={selfEmployedList.map((se: any) => ({
                    value: String(se.userId || se.id),
                    label: `${se.fullName || se.full_name} (${se.socSecNum || se.ssn})`,
                    searchText: se.socSecNum || se.ssn || '',
                  }))}
                  placeholder="Select Self Employee"
                  searchPlaceholder="Search by name or SSN..."
                  includeAllOption="All Self Employed"
                  className="w-[240px]"
                />
              </div>
            )}

            {/* From Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[160px]"
                placeholder="Start Date"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[160px]"
                min={fromDate || undefined}
                placeholder="End Date"
              />
            </div>

            {/* Export button */}
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
                Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Report List Table ───────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Inbox className="h-10 w-10" />
              <p>No data available</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableHead>Transaction Status</TableHead>
                      <TableHead>Download Pdf</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((rec) => (
                      <TableRow key={`${rec.header_id}-${rec.user_id}`}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {rec.is_submitted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="text-foreground">{rec.period_month}</span>
                          </div>
                        </TableCell>
                        <TableCell>{rec.period_year}</TableCell>
                        <TableCell>{fmtCurrency(rec.total_wages)}</TableCell>
                        <TableCell>{fmtCurrency(rec.total_ss_contributions)}</TableCell>
                        {!isSelfEmployed && <TableCell>{fmtCurrency(rec.total_levy_employee)}</TableCell>}
                        <TableCell>{fmtCurrency(rec.total_fines_and_penalties)}</TableCell>
                        {!isSelfEmployed && <TableCell>{fmtCurrency(rec.total_severance)}</TableCell>}
                        <TableCell>{fmtCurrency(rec.pay_details?.[0]?.payment_amount)}</TableCell>
                        <TableCell>{fmtDate(rec.insert_datetime)}</TableCell>
                        <TableCell>
                          {rec.schedule_no != null && (
                            <Badge variant="default" className="bg-primary text-primary-foreground">
                              {rec.schedule_no}
                            </Badge>
                          )}
                        </TableCell>
                        {/* Transaction columns: multi-row */}
                        <TableCell>
                          <div className="space-y-1">
                            {rec.pay_details?.map((pd, idx) => (
                              <div key={idx} className={idx > 0 ? 'border-t pt-1' : ''}>
                                <span className="text-xs break-all">{pd.transaction_id || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rec.pay_details?.map((pd, idx) => (
                              <div key={idx} className={idx > 0 ? 'border-t pt-1' : ''}>
                                <span className="text-xs">{fmtDate(pd.transaction_date)}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rec.pay_details?.map((pd, idx) => (
                              <div key={idx} className={`flex items-center gap-1 ${idx > 0 ? 'border-t pt-1' : ''}`}>
                                {pd.transaction_status === 'AUTHORIZED' ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-destructive" />
                                )}
                                <span className="text-xs">{pd.transaction_status || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rec.pay_details?.map((pd, idx) => (
                              <div key={idx} className={idx > 0 ? 'border-t pt-1' : ''}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleOpenReceipt(rec, pd)}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {pageNumber * pageSize + 1}–{Math.min((pageNumber + 1) * pageSize, totalRecords)} of {totalRecords}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageNumber === 0}
                      onClick={() => { setPageNumber(pageNumber - 1); fetchData(pageNumber - 1); }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageNumber >= totalPages - 1}
                      onClick={() => { setPageNumber(pageNumber + 1); fetchData(pageNumber + 1); }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Receipt Modal ───────────────────────── */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receiptLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                <span>Loading receipt...</span>
              </div>
            </div>
          ) : receipt ? (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-foreground">St. Christopher and Nevis Social Security Board</h3>
                <p className="text-lg font-semibold text-foreground">RECEIPT</p>
                <p className="text-xs text-muted-foreground">Head Office: P.O. Box 79, Bay Road, Basseterre, St. Kitts</p>
                <p className="text-xs text-muted-foreground">Branch Office: Pinney's Commercial Site, Charlestown, Nevis</p>
              </div>

              <p className="font-medium text-foreground">Receipt#: {receipt.receipt_number}</p>

              <div className="rounded-md border">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Reg No.</TableCell>
                      <TableCell>{receipt.reg_no}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Customer Name</TableCell>
                      <TableCell>{receipt.ref_customer_name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Transaction ID</TableCell>
                      <TableCell className="break-all text-xs">{receipt.payment_gateway_transaction_id}</TableCell>
                    </TableRow>
                    {receipt.total_ss_contributions > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Total SS Contributions</TableCell>
                        <TableCell>{fmtCurrency(receipt.total_ss_contributions)}</TableCell>
                      </TableRow>
                    )}
                    {receipt.total_ss_penalty > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Total SS Penalty</TableCell>
                        <TableCell>{fmtCurrency(receipt.total_ss_penalty)}</TableCell>
                      </TableRow>
                    )}
                    {receipt.total_levy > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Total Levy</TableCell>
                        <TableCell>{fmtCurrency(receipt.total_levy)}</TableCell>
                      </TableRow>
                    )}
                    {receipt.total_levy_penalty > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Total Levy Penalty</TableCell>
                        <TableCell>{fmtCurrency(receipt.total_levy_penalty)}</TableCell>
                      </TableRow>
                    )}
                    {receipt.total_severance > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Total Severance</TableCell>
                        <TableCell>{fmtCurrency(receipt.total_severance)}</TableCell>
                      </TableRow>
                    )}
                    {receipt.total_pe_penalty > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Total PE Penalty</TableCell>
                        <TableCell>{fmtCurrency(receipt.total_pe_penalty)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium">Amount</TableCell>
                      <TableCell className="font-bold">{fmtCurrency(receipt.payment_amount)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Status</TableCell>
                      <TableCell>
                        <Badge variant={receipt.payment_status === 'AUTHORIZED' ? 'default' : 'destructive'}>
                          {receipt.payment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Period</TableCell>
                      <TableCell>{receipt.period}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Transaction Date</TableCell>
                      <TableCell>{receipt.create_time}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground italic">
                This is an electronically generated receipt and does not require a signature.
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>Close</Button>
            {receipt && (
              <Button onClick={handleDownloadReceiptPDF}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
