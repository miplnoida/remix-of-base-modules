/**
 * Pensioner Register — Long-Term Benefits award list.
 * Source: bn_award + related servicing tables.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Shield, AlertTriangle, Heart, PauseCircle } from 'lucide-react';
import { BnStatCard } from '@/components/bn/shared';
import { useBnAwards } from '@/hooks/bn/useBnAwards';
import { formatDateForDisplay } from '@/lib/format-config';
import type { AwardFilters } from '@/services/bn/awards/awardService';

const STATUS_OPTIONS = ['', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'PAYMENT_HOLD', 'CLOSED'];
const TYPE_OPTIONS = ['', 'LONG_TERM', 'SHORT_TERM', 'ONE_TIME_GRANT'];

export default function PensionerRegister() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AwardFilters>({});
  const { data: awards, isLoading, error } = useBnAwards(filters);

  const stats = useMemo(() => {
    const items = awards ?? [];
    return {
      total: items.length,
      active: items.filter(a => a.status === 'ACTIVE').length,
      suspended: items.filter(a => a.status === 'SUSPENDED' || a.status === 'PAYMENT_HOLD').length,
      lifeCertDue: items.filter(a => a.life_certificate_status && a.life_certificate_status !== 'VERIFIED').length,
      survivors: items.filter(a => ['SURVIVORS', 'SB', 'SURV'].includes(a.benefit_code ?? '')).length,
    };
  }, [awards]);

  const update = (patch: Partial<AwardFilters>) => setFilters(f => ({ ...f, ...patch }));

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pensioner Register</h1>
        <p className="text-sm text-muted-foreground">
          Active long-term benefit awards. Open any award to access the Award 360 view.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <BnStatCard label="Total" value={stats.total} icon={Shield} />
        <BnStatCard label="Active" value={stats.active} icon={Shield} tone="success" />
        <BnStatCard label="Suspended / Hold" value={stats.suspended} icon={PauseCircle} tone="warning" />
        <BnStatCard label="Life Cert Pending" value={stats.lifeCertDue} icon={AlertTriangle} tone="warning" />
        <BnStatCard label="Survivor Awards" value={stats.survivors} icon={Heart} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="SSN, name, or award no."
              className="pl-8"
              value={filters.search ?? ''}
              onChange={e => update({ search: e.target.value })}
            />
          </div>
          <Select value={filters.status ?? ''} onValueChange={v => update({ status: v || undefined })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s || 'any'} value={s || 'all'}>{s || 'All statuses'}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.awardType ?? ''} onValueChange={v => update({ awardType: v && v !== 'all' ? v : undefined })}>
            <SelectTrigger><SelectValue placeholder="Award Type" /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(s => <SelectItem key={s || 'any'} value={s || 'all'}>{s || 'All award types'}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Benefit code (e.g. AGE, INV, SURVIVORS)"
            value={filters.benefitCode ?? ''}
            onChange={e => update({ benefitCode: e.target.value || undefined })}
          />
          <div className="flex gap-2 col-span-full">
            <Button variant={filters.lifeCert === 'OVERDUE' ? 'default' : 'outline'} size="sm"
              onClick={() => update({ lifeCert: filters.lifeCert === 'OVERDUE' ? undefined : 'OVERDUE' })}>Life Cert Overdue</Button>
            <Button variant={filters.medicalReviewDue ? 'default' : 'outline'} size="sm"
              onClick={() => update({ medicalReviewDue: !filters.medicalReviewDue })}>Medical Review Due</Button>
            <Button variant={filters.survivorsOnly ? 'default' : 'outline'} size="sm"
              onClick={() => update({ survivorsOnly: !filters.survivorsOnly })}>Survivor Awards</Button>
            <Button variant={filters.paymentHold ? 'default' : 'outline'} size="sm"
              onClick={() => update({ paymentHold: !filters.paymentHold })}>Payment Hold</Button>
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Award #</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Pensioner</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead className="text-right">Base Amt</TableHead>
                  <TableHead>Freq</TableHead>
                  <TableHead>Next Review</TableHead>
                  <TableHead>Life Cert</TableHead>
                  <TableHead>Last Pay</TableHead>
                  <TableHead>Next Pay</TableHead>
                  <TableHead className="text-right">Overpay Bal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={14} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                )}
                {error && (
                  <TableRow><TableCell colSpan={14} className="text-center text-destructive py-8">Unable to load awards</TableCell></TableRow>
                )}
                {!isLoading && !error && (awards ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">No awards match the filters</TableCell></TableRow>
                )}
                {(awards ?? []).map(a => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/bn/awards/${a.id}`)}>
                    <TableCell className="font-mono text-xs">{a.award_number ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.ssn ?? '—'}</TableCell>
                    <TableCell>{a.claimant_name ?? '—'}</TableCell>
                    <TableCell>{a.benefit_code ?? '—'}</TableCell>
                    <TableCell>{a.award_type ?? '—'}</TableCell>
                    <TableCell><Badge variant={a.status === 'ACTIVE' ? 'default' : 'secondary'}>{a.status ?? '—'}</Badge></TableCell>
                    <TableCell>{a.start_date ? formatDateForDisplay(a.start_date) : '—'}</TableCell>
                    <TableCell className="text-right">{a.base_amount?.toFixed?.(2) ?? '—'}</TableCell>
                    <TableCell>{a.frequency ?? '—'}</TableCell>
                    <TableCell>{a.next_review_date ? formatDateForDisplay(a.next_review_date) : '—'}</TableCell>
                    <TableCell>{a.life_certificate_status ?? '—'}</TableCell>
                    <TableCell>{a.last_payment_date ? formatDateForDisplay(a.last_payment_date) : '—'}</TableCell>
                    <TableCell>{a.next_payment_date ? formatDateForDisplay(a.next_payment_date) : '—'}</TableCell>
                    <TableCell className="text-right">{(a.overpayment_balance ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
