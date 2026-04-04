/**
 * Payment Issue Management Page
 *
 * Business Purpose: Issue outbound benefit disbursements to cl_cheques*
 * with duplicate prevention, partial-failure handling, and reissue support.
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Banknote, Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Zap, RotateCcw,
} from 'lucide-react';
import {
  useBnIssueRecords, useBnIssueSummary, useExecuteIssue, useExecuteIssueAction,
} from '@/hooks/bn/useBnPaymentIssue';
import { IssueListTable } from '@/components/bn/issue/IssueListTable';
import { IssueDetailDrawer } from '@/components/bn/issue/IssueDetailDrawer';
import { IssueFiltersBar } from '@/components/bn/issue/IssueFiltersBar';
import { IssueActionBar } from '@/components/bn/issue/IssueActionBar';
import type { IssueFilters, IssueRecord } from '@/services/bn/paymentIssueService';

const STAT_CARDS = [
  { key: 'total', label: 'Total', icon: Banknote, color: 'text-foreground' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
  { key: 'issued', label: 'Issued', icon: CheckCircle2, color: 'text-green-600' },
  { key: 'failed', label: 'Failed', icon: XCircle, color: 'text-destructive' },
  { key: 'voided', label: 'Voided', icon: AlertTriangle, color: 'text-orange-600' },
];

export default function PaymentIssue() {
  const [filters, setFilters] = useState<IssueFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: records = [], isLoading } = useBnIssueRecords(filters);
  const { data: summary } = useBnIssueSummary(filters.batch_id);
  const executeMutation = useExecuteIssue();
  const actionMutation = useExecuteIssueAction();

  const handleBulkIssue = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      const result = await executeMutation.mutateAsync({ issueIds: ids, userCode: 'CURRENT_USER' });
      toast.success(`Issued: ${result.issued}, Failed: ${result.failed}`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Issue failed');
    }
  };

  const handleAction = async (params: any) => {
    try {
      await actionMutation.mutateAsync(params);
      toast.success(`Action "${params.action}" completed`);
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const pendingRecords = records.filter(r => ['PENDING', 'REISSUE_PENDING'].includes(r.status));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Issue</h1>
          <p className="text-sm text-muted-foreground">
            Issue outbound benefit disbursements to cl_cheques, cl_cheques_holding, or cl_cheques_survivor
          </p>
        </div>
        {pendingRecords.length > 0 && (
          <Button
            onClick={() => {
              setSelectedIds(new Set(pendingRecords.map(r => r.id)));
            }}
            variant="outline"
            className="gap-2"
          >
            <Zap className="h-4 w-4" /> Select All Pending ({pendingRecords.length})
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="p-3 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <div className="text-lg font-bold">{summary?.[key as keyof typeof summary] ?? 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-3 text-center">
            <Banknote className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-lg font-bold">
              {(summary?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Issued Amt</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <IssueFiltersBar filters={filters} onChange={setFilters} />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <IssueActionBar
          selectedCount={selectedIds.size}
          onIssue={handleBulkIssue}
          onClear={() => setSelectedIds(new Set())}
          isActing={executeMutation.isPending}
        />
      )}

      {/* Table */}
      <IssueListTable
        records={records}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggleSelect={(id) => {
          const next = new Set(selectedIds);
          next.has(id) ? next.delete(id) : next.add(id);
          setSelectedIds(next);
        }}
        onSelectRecord={(r) => setSelectedId(r.id)}
      />

      {/* Detail Drawer */}
      <IssueDetailDrawer
        issueId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onAction={handleAction}
        isActing={actionMutation.isPending}
      />
    </div>
  );
}
