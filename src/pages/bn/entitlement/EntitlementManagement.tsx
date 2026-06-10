/**
 * Entitlement Management — Main Page (Enhanced)
 *
 * Business Purpose: Manage approved benefit rights independently from
 * claim processing and issued payments. Supports lifecycle operations
 * (activate, suspend, resume, terminate, close, reopen).
 *
 * Enhanced: Create from approved claim, rate adjustment, schedule generation trigger.
 */
import React, { useState, useMemo } from 'react';
import { BnStatCard, BnEmptyState } from '@/components/bn/shared';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, PauseCircle, AlertTriangle, Loader2, Plus, DollarSign } from 'lucide-react';
import { useBnEntitlements } from '@/hooks/bn/useBnEntitlement';
import { EntitlementFiltersBar } from '@/components/bn/entitlement/EntitlementFiltersBar';
import { EntitlementListTable } from '@/components/bn/entitlement/EntitlementListTable';
import { EntitlementDetailDrawer } from '@/components/bn/entitlement/EntitlementDetailDrawer';
import { CreateEntitlementDialog } from '@/components/bn/entitlement/CreateEntitlementDialog';
import { RateAdjustmentDialog } from '@/components/bn/entitlement/RateAdjustmentDialog';
import type { EntitlementFilters, EntitlementWithContext } from '@/services/bn/entitlementService';

export default function EntitlementManagement() {
  const [filters, setFilters] = useState<EntitlementFilters>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [adjustingEnt, setAdjustingEnt] = useState<EntitlementWithContext | null>(null);

  const { data: entitlements, isLoading, error, refetch } = useBnEntitlements(filters);

  const stats = useMemo(() => {
    const items = entitlements ?? [];
    const totalAmount = items.reduce((s, e) => s + (e.total_entitlement ?? 0), 0);
    const remainingAmount = items.reduce((s, e) => s + (e.remaining_amount ?? 0), 0);
    return {
      total: items.length,
      active: items.filter(e => e.status === 'ACTIVE' || e.status === 'REOPENED').length,
      suspended: items.filter(e => e.status === 'SUSPENDED').length,
      exhausted: items.filter(e => e.status === 'EXHAUSTED' || e.status === 'TERMINATED' || e.status === 'CLOSED').length,
      draft: items.filter(e => e.status === 'DRAFT').length,
      totalAmount,
      remainingAmount,
    };
  }, [entitlements]);

  if (error) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load entitlements." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-page-title">Entitlement Management</h1>
          <p className="t-page-subtitle mt-1">
            Manage approved benefit rights. Entitlements bridge approved claims to payment orchestration.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Entitlement
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <BnStatCard title="Total Entitlements" value={stats.total} icon={Shield} />
        <BnStatCard title="Draft" value={stats.draft} icon={Shield} subtitle="Pending activation" />
        <BnStatCard title="Active" value={stats.active} icon={CheckCircle} subtitle="Currently paying" />
        <BnStatCard title="Suspended" value={stats.suspended} icon={PauseCircle} subtitle="On hold" />
        <BnStatCard title="Closed / Exhausted" value={stats.exhausted} icon={AlertTriangle} subtitle="Completed" />
        <BnStatCard
          title="Total Allocated"
          value={`$${(stats.totalAmount / 1000).toFixed(0)}K`}
          icon={DollarSign}
          subtitle="All entitlements"
        />
        <BnStatCard
          title="Remaining Balance"
          value={`$${(stats.remainingAmount / 1000).toFixed(0)}K`}
          icon={DollarSign}
          subtitle="Unpaid"
        />
      </div>

      {/* Filters */}
      <EntitlementFiltersBar filters={filters} onChange={setFilters} totalCount={entitlements?.length ?? 0} />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <EntitlementListTable
          items={entitlements ?? []}
          onViewDetail={setViewingId}
          isLoading={isLoading}
        />
      )}

      {/* Detail Drawer */}
      <EntitlementDetailDrawer
        entitlementId={viewingId}
        onClose={() => setViewingId(null)}
      />

      {/* Create Dialog */}
      <CreateEntitlementDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />

      {/* Rate Adjustment Dialog */}
      <RateAdjustmentDialog
        open={!!adjustingEnt}
        onClose={() => setAdjustingEnt(null)}
        entitlement={adjustingEnt}
      />
    </div>
  );
}
