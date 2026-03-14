import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, DataTableColumn } from '@/components/common/DataTable';
import { DatePicker } from '@/components/ui/date-picker';
import { Search, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDisplayDate, formatDateForStorage } from '@/lib/dateFormat';

interface ReportRow {
  payment_id: number;
  batch_number: string;
  payer_type: string;
  payer_id: string;
  date_received: string | null;
  payment_code: string;
  payment_amount: number;
  mop_code: string;
  period: string | null;
  receipt_id: string | null;
  receipt_status: string | null;
  reprint_times: number;
  bank_code: string | null;
}

const REPORT_TABS = [
  { value: 'standard', label: 'Standard' },
  { value: 'vc', label: 'Voluntary Contributor' },
  { value: 'c3', label: 'C3 Payments' },
  { value: 'se', label: 'Self-Employed' },
  { value: 'ip', label: 'Insured Person' },
];

const PaymentHistoryReport = () => {
  const [activeTab, setActiveTab] = useState('standard');
  const [payerId, setPayerId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [results, setResults] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [payerName, setPayerName] = useState('');

  const payerTypeMap: Record<string, string> = {
    standard: 'ER',
    vc: 'VC',
    c3: 'ER',
    se: 'SE',
    ip: 'IP',
  };

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('cn_payment_header')
        .select('*')
        .order('payment_id', { ascending: false });

      const pt = payerTypeMap[activeTab];
      if (activeTab !== 'standard') {
        query = query.eq('payer_type', pt);
      }
      if (payerId.trim()) {
        query = query.eq('payer_id', payerId.trim());
      }
      if (dateFrom) {
        query = query.gte('date_received', formatDateForStorage(dateFrom));
      }
      if (dateTo) {
        query = query.lte('date_received', formatDateForStorage(dateTo));
      }

      const { data: headers } = await query.limit(500);
      if (!headers || headers.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      // Lookup payer name
      if (payerId.trim()) {
        if (pt === 'ER' || pt === 'SE') {
          const { data: emp } = await supabase.from('er_master').select('name').eq('regno', payerId.trim()).maybeSingle();
          setPayerName(emp?.name || '');
        } else {
          const { data: ip } = await supabase.from('ip_master').select('firstname, surname').eq('ssn', payerId.trim()).maybeSingle();
          setPayerName(ip ? `${ip.firstname} ${ip.surname}` : '');
        }
      } else {
        setPayerName('');
      }

      const ids = headers.map(h => h.payment_id);
      const [{ data: details }, { data: receipts }] = await Promise.all([
        supabase.from('cn_payment').select('*').in('payment_id', ids),
        supabase.from('cn_receipt').select('*').in('payment_id', ids),
      ]);

      const rows: ReportRow[] = [];
      headers.forEach(h => {
        const dets = (details || []).filter(d => d.payment_id === h.payment_id);
        const rcpt = (receipts || []).find(r => r.payment_id === h.payment_id);
        if (dets.length === 0) {
          rows.push({
            payment_id: h.payment_id,
            batch_number: h.batch_number,
            payer_type: h.payer_type,
            payer_id: h.payer_id,
            date_received: h.date_received,
            payment_code: '',
            payment_amount: 0,
            mop_code: '',
            period: null,
            receipt_id: rcpt?.receipt_id || null,
            receipt_status: rcpt?.status || null,
            reprint_times: rcpt?.reprint_times || 0,
            bank_code: null,
          });
        } else {
          dets.forEach(d => {
            rows.push({
              payment_id: h.payment_id,
              batch_number: h.batch_number,
              payer_type: h.payer_type,
              payer_id: h.payer_id,
              date_received: h.date_received,
              payment_code: d.payment_code,
              payment_amount: d.payment_amount || 0,
              mop_code: d.mop_code,
              period: d.period,
              receipt_id: rcpt?.receipt_id || null,
              receipt_status: rcpt?.status || null,
              reprint_times: rcpt?.reprint_times || 0,
              bank_code: d.bank_code,
            });
          });
        }
      });
      setResults(rows);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, payerId, dateFrom, dateTo]);

  const totalAmount = results.reduce((s, r) => s + r.payment_amount, 0);

  const statusBadge = (status: string | null) => {
    if (!status) return '—';
    const map: Record<string, string> = { P: 'Printed', R: 'Reprinted', C: 'Cancelled' };
    return map[status] || status;
  };

  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'payment_id', header: 'ID', className: 'w-[70px] font-mono' },
    { key: 'batch_number', header: 'Batch', className: 'text-xs' },
    { key: 'payer_id', header: 'Payer ID', className: 'font-mono' },
    { key: 'date_received', header: 'Date', render: r => formatDisplayDate(r.date_received) },
    { key: 'payment_code', header: 'Code' },
    { key: 'payment_amount', header: 'Amount', className: 'text-right font-mono', render: r => `$${r.payment_amount.toFixed(2)}` },
    { key: 'mop_code', header: 'MOP' },
    { key: 'period', header: 'Period' },
    { key: 'receipt_id', header: 'Receipt', className: 'text-xs' },
    { key: 'receipt_status', header: 'Status', render: r => statusBadge(r.receipt_status) },
    { key: 'bank_code', header: 'Bank' },
  ];

  const tabLabel = REPORT_TABS.find(t => t.value === activeTab)?.label || 'Standard';
  const reportTitle = payerName
    ? `Payment History — ${payerName} (${tabLabel})`
    : `Payment History — ${tabLabel}`;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History Report</h1>
        <p className="text-sm text-muted-foreground">Inquiry and reporting on payment records by type, payer, and date range.</p>
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setResults([]); }}>
        <TabsList>
          {REPORT_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <Card className="mt-3">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 min-w-[180px]">
                <Label className="text-xs">Payer ID</Label>
                <Input value={payerId} onChange={e => setPayerId(e.target.value)} placeholder="Registration or SSN" />
              </div>
              <div className="space-y-1 min-w-[160px]">
                <Label className="text-xs">Date From</Label>
                <DatePicker date={dateFrom} onDateChange={setDateFrom} />
              </div>
              <div className="space-y-1 min-w-[160px]">
                <Label className="text-xs">Date To</Label>
                <DatePicker date={dateTo} onDateChange={setDateTo} />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{reportTitle}</h2>
              <div className="flex items-center gap-3 text-sm">
                <span>{results.length} records</span>
                <span className="font-mono font-semibold">Total: ${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={results}
                  keyField="payment_id"
                  pageSize={20}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default PaymentHistoryReport;
