/**
 * Payables Queue — Main Page (Enhanced)
 *
 * Business Purpose: Manage payable_instruction records created from
 * approved entitlements before actual payment issue. Enhanced with
 * batch assignment dialog and improved bulk action controls.
 */
import React, { useState, useMemo } from 'react';
import { BnStatCard, BnEmptyState } from '@/components/bn/shared';
import {
  Banknote, CheckCircle, PauseCircle, AlertTriangle,
  Clock, Loader2, XCircle, RotateCcw, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBnPayables } from '@/hooks/bn/useBnPayablesQueue';
import { PayablesQueueFilters } from '@/components/bn/payables/PayablesQueueFilters';
import { PayablesQueueTable } from '@/components/bn/payables/PayablesQueueTable';
import { PayableDetailDrawer } from '@/components/bn/payables/PayableDetailDrawer';
import { PayablesActionBar } from '@/components/bn/payables/PayablesActionBar';
import { AssignToBatchDialog } from '@/components/bn/payables/AssignToBatchDialog';
import type { PayableFilters } from '@/services/bn/payablesQueueService';

export default function PayablesQueue() {
  const [filters, setFilters] = useState<PayableFilters>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchAssign, setShowBatchAssign] = useState(false);

  const { data: payables, isLoading, error, refetch } = useBnPayables(filters);

  const stats = useMemo(() => {
    const items = payables ?? [];
    const totalAmount = items.reduce((s, p) => s + (p.amount ?? 0), 0);
    return {
      total: items.length,
      ready: items.filter(p => p.status === 'READY').length,
      held: items.filter(p => p.status === 'HELD').length,
      blocked: items.filter(p => p.status === 'BLOCKED').length,
      exception: items.filter(p => p.status === 'EXCEPTION').length,
      scheduled: items.filter(p => p.status === 'SCHEDULED').length,
      issuedPending: items.filter(p => p.status === 'ISSUED_PENDING').length,
      reissue: items.filter(p => p.status === 'REISSUE_PENDING').length,
      totalAmount,
    };
  }, [payables]);

  // Only READY payables can be assigned to batch
  const readySelectedIds = selectedIds.filter(id => {
    const p = payables?.find(x => x.id === id);
    return p?.status === 'READY';
  });

  if (error) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load payables queue." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Non-Production Banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 text-center text-sm font-medium text-amber-700 dark:text-amber-400">
        ⚠ Non-Production Environment — Payables Queue
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-page-title">Payables Queue</h1>
          <p className="text-sm text-muted-foreground">
            Manage payable instructions before payment issue. Issued payments persist
            in legacy payment tables (cl_cheques) — not managed here.
          </p>
        </div>
        {readySelectedIds.length > 0 && (
          <Button onClick={() => setShowBatchAssign(true)} className="gap-2">
            <Package className="h-4 w-4" /> Assign to Batch ({readySelectedIds.length})
          </Button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-9">
        <BnStatCard title="Total" value={stats.total} icon={Banknote} />
        <BnStatCard title="Ready" value={stats.ready} icon={CheckCircle} subtitle="Eligible for batch" />
        <BnStatCard title="Held" value={stats.held} icon={PauseCircle} subtitle="Under review" />
        <BnStatCard title="Blocked" value={stats.blocked} icon={XCircle} subtitle="Readiness failed" />
        <BnStatCard title="Exception" value={stats.exception} icon={AlertTriangle} subtitle="Investigation" />
        <BnStatCard title="Scheduled" value={stats.scheduled} icon={Clock} subtitle="Not yet due" />
        <BnStatCard title="Issued" value={stats.issuedPending} icon={Banknote} subtitle="In batch" />
        <BnStatCard title="Reissue" value={stats.reissue} icon={RotateCcw} subtitle="Pending" />
        <BnStatCard
          title="Queue Total"
          value={`$${(stats.totalAmount / 1000).toFixed(1)}K`}
          icon={Banknote}
          subtitle="All items"
        />
      </div>

      {/* Filters */}
      <PayablesQueueFilters filters={filters} onChange={setFilters} totalCount={payables?.length ?? 0} />

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <PayablesActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <PayablesQueueTable
          items={payables ?? []}
          onViewDetail={setViewingId}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isLoading={isLoading}
        />
      )}

      {/* Detail Drawer */}
      <PayableDetailDrawer
        instructionId={viewingId}
        onClose={() => setViewingId(null)}
      />

      {/* Assign to Batch Dialog */}
      <AssignToBatchDialog
        open={showBatchAssign}
        onClose={() => setShowBatchAssign(false)}
        payableIds={readySelectedIds}
        onAssigned={() => {
          setSelectedIds([]);
          refetch();
        }}
      />
    </div>
  );
}
