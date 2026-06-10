/**
 * Pensioner Register — Long-Term Benefits award list.
 * Source: bn_award + related servicing tables.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, AlertTriangle, Heart, PauseCircle, Eye } from 'lucide-react';
import { BnStatCard } from '@/components/bn/shared';
import { useBnAwards } from '@/hooks/bn/useBnAwards';
import { formatDateForDisplay } from '@/lib/format-config';
import type { AwardFilters } from '@/services/bn/awards/awardService';
import { BNDataGrid, type BNColumnDef, type BNToolbarFilter } from '@/components/bn/grid';

const STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'TERMINATED', 'PAYMENT_HOLD', 'CLOSED'];
const TYPE_OPTIONS = ['LONG_TERM', 'SHORT_TERM', 'ONE_TIME_GRANT'];

export default function PensionerRegister() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AwardFilters>({});
  const { data: awards, isLoading, refetch } = useBnAwards(filters);

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

  const toolbarFilters: BNToolbarFilter[] = [
    { key: 'status', label: 'Status', value: filters.status ?? '', onChange: (v) => update({ status: v || undefined }),
      options: [{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS.map(s => ({ value: s, label: s }))] },
    { key: 'awardType', label: 'Type', value: filters.awardType ?? '', onChange: (v) => update({ awardType: v || undefined }),
      options: [{ value: '', label: 'All types' }, ...TYPE_OPTIONS.map(s => ({ value: s, label: s }))] },
  ];

  const columns: BNColumnDef<any>[] = [
    { accessorKey: 'award_number', header: 'Award #', meta: { label: 'Award #', pinLeft: true, width: 130 },
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'ssn', header: 'SSN', meta: { label: 'SSN', width: 110 },
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'claimant_name', header: 'Pensioner', meta: { label: 'Pensioner', width: 200 } },
    { accessorKey: 'benefit_code', header: 'Benefit', meta: { label: 'Benefit', width: 130 } },
    { accessorKey: 'award_type', header: 'Type', meta: { label: 'Type', width: 130 } },
    { accessorKey: 'status', header: 'Status', meta: { label: 'Status', width: 130 },
      cell: ({ getValue }) => <Badge variant={getValue() === 'ACTIVE' ? 'default' : 'secondary'}>{String(getValue() ?? '—')}</Badge> },
    { accessorKey: 'start_date', header: 'Start', meta: { label: 'Start', width: 110 },
      cell: ({ getValue }) => getValue() ? formatDateForDisplay(String(getValue())) : '—' },
    { accessorKey: 'base_amount', header: 'Base Amt', meta: { label: 'Base Amt', width: 110, align: 'right' },
      cell: ({ getValue }) => <span className="text-right block font-mono">{Number(getValue() ?? 0).toFixed(2)}</span> },
    { accessorKey: 'frequency', header: 'Freq', meta: { label: 'Freq', width: 90 } },
    { accessorKey: 'next_review_date', header: 'Next Review', meta: { label: 'Next Review', width: 120 },
      cell: ({ getValue }) => getValue() ? formatDateForDisplay(String(getValue())) : '—' },
    { accessorKey: 'life_certificate_status', header: 'Life Cert', meta: { label: 'Life Cert', width: 120 },
      cell: ({ getValue }) => String(getValue() ?? '—') },
    { accessorKey: 'last_payment_date', header: 'Last Pay', meta: { label: 'Last Pay', width: 110 },
      cell: ({ getValue }) => getValue() ? formatDateForDisplay(String(getValue())) : '—' },
    { accessorKey: 'next_payment_date', header: 'Next Pay', meta: { label: 'Next Pay', width: 110 },
      cell: ({ getValue }) => getValue() ? formatDateForDisplay(String(getValue())) : '—' },
    { accessorKey: 'overpayment_balance', header: 'Overpay Bal', meta: { label: 'Overpay Bal', width: 120, align: 'right' },
      cell: ({ getValue }) => <span className="text-right block font-mono">{Number(getValue() ?? 0).toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="t-page-title">Pensioner Register</h1>
        <p className="t-page-subtitle mt-1">
          Active long-term benefit awards. Open any award to access the Award 360 view.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <BnStatCard title="Total" value={stats.total} icon={Shield} />
        <BnStatCard title="Active" value={stats.active} icon={Shield} />
        <BnStatCard title="Suspended / Hold" value={stats.suspended} icon={PauseCircle} />
        <BnStatCard title="Life Cert Pending" value={stats.lifeCertDue} icon={AlertTriangle} />
        <BnStatCard title="Survivor Awards" value={stats.survivors} icon={Heart} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Advanced filters</CardTitle></CardHeader>
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
          <Input
            placeholder="Benefit code (e.g. AGE, INV, SURVIVORS)"
            value={filters.benefitCode ?? ''}
            onChange={e => update({ benefitCode: e.target.value || undefined })}
          />
          <div className="flex flex-wrap gap-2 col-span-full">
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

      <BNDataGrid<any>
        id="bn.pensioner-register"
        data={awards ?? []}
        isLoading={isLoading}
        columns={columns}
        toolbarFilters={toolbarFilters}
        onRefresh={() => refetch()}
        onRowClick={(a) => navigate(`/bn/awards/${a.id}`)}
        defaultSort={[{ id: 'start_date', desc: true }]}
        exportFilename="bn_pensioner_register"
        searchPlaceholder="Search award, SSN, name..."
        emptyMessage="No awards match the filters"
        rowActions={[
          { key: 'view', label: 'Open Award 360', icon: <Eye className="h-3.5 w-3.5" />, onClick: (a) => navigate(`/bn/awards/${a.id}`) },
        ]}
      />
    </div>
  );
}
