/**
 * Payment History Inquiry (Screen 21)
 *
 * Business Purpose: Merged modern (bn_issue_record) + legacy (cl_cheques*)
 * payment search with unified view.
 *
 * Tables read: bn_issue_record, cl_cheques, cl_cheques_holding, cl_cheques_survivor
 * Access: Read-only
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CreditCard, Search, Lock, Loader2, X, FileText,
  Landmark, Calendar, DollarSign,
} from 'lucide-react';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { useQuery } from '@tanstack/react-query';
import { formatDateForDisplay } from '@/lib/format-config';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '@/lib/culture/culture';
const db = supabase as any;

interface PaymentRecord {
  id: string;
  source: 'MODERN' | 'LEGACY';
  source_table: string;
  ssn: string;
  claim_number: string | null;
  cheque_number: string | null;
  dd_reference: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  issued_at: string | null;
  period_start: string | null;
  period_end: string | null;
  issued_by: string | null;
  beneficiary_name: string | null;
  bank_code: string | null;
}

interface SearchParams {
  ssn?: string;
  claim_number?: string;
  cheque_number?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  source?: 'ALL' | 'MODERN' | 'LEGACY';
}

function usePaymentHistory(params: SearchParams | null) {
  return useQuery({
    queryKey: ['bn', 'payment-history', params],
    queryFn: async () => {
      if (!params) return [];
      const results: PaymentRecord[] = [];

      // Modern: bn_issue_record
      if (params.source !== 'LEGACY') {
        let q = db.from('bn_issue_record').select('*').order('created_at', { ascending: false }).limit(500);
        if (params.ssn) q = q.eq('ssn', params.ssn);
        if (params.claim_number) q = q.ilike('claim_number', `%${params.claim_number}%`);
        if (params.cheque_number) q = q.or(`cheque_number.ilike.%${params.cheque_number}%,dd_reference.ilike.%${params.cheque_number}%`);
        if (params.status) q = q.eq('status', params.status);
        if (params.date_from) q = q.gte('issued_at', params.date_from);
        if (params.date_to) q = q.lte('issued_at', params.date_to);

        const { data } = await q;
        (data || []).forEach((r: any) => {
          results.push({
            id: r.id,
            source: 'MODERN',
            source_table: r.target_table || 'bn_issue_record',
            ssn: r.ssn,
            claim_number: r.claim_number,
            cheque_number: r.cheque_number,
            dd_reference: r.dd_reference,
            amount: r.amount || 0,
            currency: r.currency || 'XCD',
            status: r.status,
            payment_method: r.issue_method || 'CHEQUE',
            issued_at: r.issued_at,
            period_start: r.period_start,
            period_end: r.period_end,
            issued_by: r.issued_by,
            beneficiary_name: r.beneficiary_name,
            bank_code: null,
          });
        });
      }

      // Legacy: cl_cheques, cl_cheques_holding, cl_cheques_survivor
      if (params.source !== 'MODERN') {
        for (const table of ['cl_cheques', 'cl_cheques_holding', 'cl_cheques_survivor'] as const) {
          let q = db.from(table).select('*').order('date_of_issue', { ascending: false }).limit(200);
          if (params.ssn) {
            // cl_cheques uses different column names
            q = q.or(`insured_ssn.eq.${params.ssn},ssn.eq.${params.ssn}`);
          }
          if (params.claim_number) q = q.ilike('claim_number', `%${params.claim_number}%`);
          if (params.cheque_number) q = q.ilike('cheque_number', `%${params.cheque_number}%`);

          const { data } = await q;
          (data || []).forEach((r: any) => {
            results.push({
              id: r.id || `${table}-${r.cheque_number}-${r.claim_number}`,
              source: 'LEGACY',
              source_table: table,
              ssn: r.insured_ssn || r.ssn || '',
              claim_number: r.claim_number,
              cheque_number: r.cheque_number,
              dd_reference: null,
              amount: r.payment_amount || r.amount || 0,
              currency: 'XCD',
              status: r.cheque_status || r.status || 'ISSUED',
              payment_method: r.cheque_type || 'CHQ',
              issued_at: r.date_of_issue || r.cheque_date,
              period_start: r.date_period_start,
              period_end: r.date_period_end,
              issued_by: r.entered_by,
              beneficiary_name: r.payee_firstname ? `${r.payee_firstname} ${r.payee_surname || ''}`.trim() : null,
              bank_code: r.bank_code || null,
            });
          });
        }
      }

      // Sort by date desc
      results.sort((a, b) => (b.issued_at || '').localeCompare(a.issued_at || ''));
      return results;
    },
    enabled: !!params,
  });
}

export default function PaymentHistoryInquiry() {
  const navigate = useNavigate();
  const [params, setParams] = useState<SearchParams | null>(null);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);

  // Form state
  const [ssn, setSsn] = useState('');
  const [claimNum, setClaimNum] = useState('');
  const [chequeNum, setChequeNum] = useState('');
  const [source, setSource] = useState<'ALL' | 'MODERN' | 'LEGACY'>('ALL');

  const { data: records = [], isLoading } = usePaymentHistory(params);

  const stats = useMemo(() => {
    const total = records.length;
    const totalAmount = records.reduce((s, r) => s + r.amount, 0);
    const modern = records.filter(r => r.source === 'MODERN').length;
    const legacy = records.filter(r => r.source === 'LEGACY').length;
    return { total, totalAmount, modern, legacy };
  }, [records]);

  const handleSearch = () => {
    if (!ssn && !claimNum && !chequeNum) {
      return;
    }
    setParams({
      ssn: ssn || undefined,
      claim_number: claimNum || undefined,
      cheque_number: chequeNum || undefined,
      source,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="t-page-title">Payment History</h1>
            <p className="text-sm text-muted-foreground">
              Search across modern and legacy payment records
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Read-Only</span>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">SSN</Label>
              <Input value={ssn} onChange={(e) => setSsn(e.target.value)} placeholder="SSN" className="w-32" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Claim #</Label>
              <Input value={claimNum} onChange={(e) => setClaimNum(e.target.value)} placeholder="Claim" className="w-36" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cheque / Ref #</Label>
              <Input value={chequeNum} onChange={(e) => setChequeNum(e.target.value)} placeholder="Cheque" className="w-36" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as any)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="MODERN">Modern Only</SelectItem>
                  <SelectItem value="LEGACY">Legacy Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={isLoading || (!ssn && !claimNum && !chequeNum)} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {params && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Results</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold font-mono">
                  {formatNumber(stats.totalAmount, 2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Modern Records</p>
                <p className="text-xl font-bold">{stats.modern}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Landmark className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Legacy Records</p>
                <p className="text-xl font-bold">{stats.legacy}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {params && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No payment records found.</div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Source</TableHead>
                      <TableHead className="font-semibold text-xs">SSN</TableHead>
                      <TableHead className="font-semibold text-xs">Claim</TableHead>
                      <TableHead className="font-semibold text-xs">Cheque/Ref</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-xs">Method</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">Issued</TableHead>
                      <TableHead className="font-semibold text-xs">Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(r)}>
                        <TableCell>
                          <Badge variant={r.source === 'MODERN' ? 'default' : 'secondary'} className="text-[10px]">
                            {r.source === 'MODERN' ? 'Modern' : 'Legacy'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.ssn}</TableCell>
                        <TableCell className="text-xs">{r.claim_number || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.cheque_number || r.dd_reference || '—'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatNumber(r.amount, 2)}
                        </TableCell>
                        <TableCell className="text-xs">{r.payment_method}</TableCell>
                        <TableCell><BnStatusBadge status={r.status} size="sm" dot /></TableCell>
                        <TableCell className="text-xs">{r.issued_at ? formatDateForDisplay(r.issued_at) : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.period_start && r.period_end
                            ? `${formatDateForDisplay(r.period_start)} – ${formatDateForDisplay(r.period_end)}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!params && (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Enter search criteria above</p>
          <p className="text-sm mt-1">Search across modern and legacy payment records</p>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Detail
                  <Badge variant={selected.source === 'MODERN' ? 'default' : 'secondary'} className="text-[10px]">
                    {selected.source}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">SSN</p>
                    <p className="font-mono text-sm">{selected.ssn}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Claim #</p>
                    <p className="text-sm">{selected.claim_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Cheque #</p>
                    <p className="font-mono text-sm">{selected.cheque_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">DD Reference</p>
                    <p className="font-mono text-sm">{selected.dd_reference || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Amount</p>
                    <p className="font-mono text-sm font-medium">
                      {selected.currency} {formatNumber(selected.amount, 2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                    <BnStatusBadge status={selected.status} size="sm" dot />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Method</p>
                    <p className="text-sm">{selected.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Source Table</p>
                    <p className="font-mono text-xs">{selected.source_table}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Issued Date</p>
                    <p className="text-sm">{selected.issued_at ? formatDateForDisplay(selected.issued_at) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Issued By</p>
                    <p className="text-sm">{selected.issued_by || '—'}</p>
                  </div>
                </div>
                {selected.period_start && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Payment Period</p>
                    <p className="text-sm">
                      {formatDateForDisplay(selected.period_start)} – {formatDateForDisplay(selected.period_end || '')}
                    </p>
                  </div>
                )}
                {selected.beneficiary_name && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Beneficiary</p>
                    <p className="text-sm">{selected.beneficiary_name}</p>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/bn/person-360?ssn=${selected.ssn}`)} className="gap-1.5">
                    View Person 360
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
