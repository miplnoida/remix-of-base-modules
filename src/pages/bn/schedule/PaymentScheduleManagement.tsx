/**
 * Payment Schedule Management — Main Page
 *
 * Business Purpose: Plan one-time and recurring benefit disbursements.
 * Schedule rows are orchestration records only — issued payments persist
 * to cl_cheques. cn_payment* NEVER used for outbound benefit payments.
 */
import React, { useState, useMemo } from 'react';
import { BnStatCard, BnEmptyState } from '@/components/bn/shared';
import {
  CalendarDays, CheckCircle, PauseCircle, AlertTriangle,
  Clock, Loader2, RotateCcw, Banknote,
} from 'lucide-react';
import { useBnScheduleRows } from '@/hooks/bn/useBnSchedule';
import { ScheduleFiltersBar } from '@/components/bn/schedule/ScheduleFiltersBar';
import { ScheduleGrid } from '@/components/bn/schedule/ScheduleGrid';
import { ScheduleRowDrawer } from '@/components/bn/schedule/ScheduleRowDrawer';
import { ScheduleActionBar } from '@/components/bn/schedule/ScheduleActionBar';
import type { ScheduleFilters } from '@/services/bn/scheduleService';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD' }).format(n);

export default function PaymentScheduleManagement() {
  const [filters, setFilters] = useState<ScheduleFilters>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: rows, isLoading, error } = useBnScheduleRows(filters);

  const stats = useMemo(() => {
    const items = rows ?? [];
    return {
      total: items.length,
      projected: items.filter(r => r.status === 'PROJECTED').length,
      due: items.filter(r => r.status === 'DUE').length,
      generated: items.filter(r => r.status === 'GENERATED').length,
      suspended: items.filter(r => r.status === 'SUSPENDED').length,
      arrears: items.filter(r => r.status === 'ARREARS').length,
      totalAmount: items
        .filter(r => !['CANCELLED', 'SKIPPED'].includes(r.status))
        .reduce((s, r) => s + (r.amount ?? 0), 0),
    };
  }, [rows]);

  if (error) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load payment schedules." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Non-Production Banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 text-center text-sm font-medium text-amber-700 dark:text-amber-400">
        ⚠ Non-Production Environment — Payment Schedule Management
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Payment Schedule Management</h1>
        <p className="text-sm text-muted-foreground">
          Plan one-time and recurring benefit disbursements. Schedule rows are orchestration
          records — issued payments persist in legacy payment tables (cl_cheques).
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <BnStatCard title="Total Rows" value={stats.total} icon={CalendarDays} />
        <BnStatCard title="Projected" value={stats.projected} icon={Clock} subtitle="Future" />
        <BnStatCard title="Due" value={stats.due} icon={AlertTriangle} subtitle="Ready to generate" />
        <BnStatCard title="Generated" value={stats.generated} icon={CheckCircle} subtitle="Instruction created" />
        <BnStatCard title="Suspended" value={stats.suspended} icon={PauseCircle} subtitle="On hold" />
        <BnStatCard title="Arrears" value={stats.arrears} icon={RotateCcw} subtitle="Catch-up" />
        <BnStatCard title="Scheduled Total" value={formatCurrency(stats.totalAmount)} icon={Banknote} subtitle="Active amount" />
      </div>

      {/* Filters */}
      <ScheduleFiltersBar filters={filters} onChange={setFilters} totalCount={rows?.length ?? 0} />

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <ScheduleActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <ScheduleGrid
          items={rows ?? []}
          onViewDetail={setViewingId}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {/* Detail Drawer */}
      <ScheduleRowDrawer
        rowId={viewingId}
        onClose={() => setViewingId(null)}
      />
    </div>
  );
}
