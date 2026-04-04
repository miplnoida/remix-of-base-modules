/**
 * Entitlement Management — Main Page
 *
 * Business Purpose: Manage approved benefit rights independently from
 * claim processing and issued payments. Supports lifecycle operations
 * (activate, suspend, resume, terminate, close, reopen).
 *
 * Existing tables: bn_claim, bn_claim_event, bn_product
 * New tables: bn_entitlement, bn_payment_instruction
 * Outbound payments: cl_cheques ONLY (managed by payment batch, not here)
 */
import React, { useState, useMemo } from 'react';
import { BnStatCard, BnEmptyState } from '@/components/bn/shared';
import { Shield, CheckCircle, PauseCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useBnEntitlements } from '@/hooks/bn/useBnEntitlement';
import { EntitlementFiltersBar } from '@/components/bn/entitlement/EntitlementFiltersBar';
import { EntitlementListTable } from '@/components/bn/entitlement/EntitlementListTable';
import { EntitlementDetailDrawer } from '@/components/bn/entitlement/EntitlementDetailDrawer';
import type { EntitlementFilters } from '@/services/bn/entitlementService';

export default function EntitlementManagement() {
  const [filters, setFilters] = useState<EntitlementFilters>({});
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: entitlements, isLoading, error } = useBnEntitlements(filters);

  const stats = useMemo(() => {
    const items = entitlements ?? [];
    return {
      total: items.length,
      active: items.filter(e => e.status === 'ACTIVE' || e.status === 'REOPENED').length,
      suspended: items.filter(e => e.status === 'SUSPENDED').length,
      exhausted: items.filter(e => e.status === 'EXHAUSTED' || e.status === 'TERMINATED' || e.status === 'CLOSED').length,
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
      <div>
        <h1 className="text-xl font-bold tracking-tight">Entitlement Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage approved benefit rights. Entitlements bridge approved claims to payment orchestration.
          Issued payments persist in the legacy payment tables — not managed here.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <BnStatCard title="Total Entitlements" value={stats.total} icon={Shield} />
        <BnStatCard title="Active" value={stats.active} icon={CheckCircle} subtitle="Currently paying" />
        <BnStatCard title="Suspended" value={stats.suspended} icon={PauseCircle} subtitle="On hold" />
        <BnStatCard title="Closed / Exhausted" value={stats.exhausted} icon={AlertTriangle} subtitle="Completed" />
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
    </div>
  );
}
