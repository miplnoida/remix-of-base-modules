import { useUserCode } from '@/hooks/useUserCode';
/**
 * Benefits Dashboard — Screen 1
 *
 * Business Purpose: Operational overview for claims officers, supervisors, and managers.
 * Read-only aggregation screen — no writes to any table.
 *
 * Sections:
 *   1. KPI Summary Cards (total, open, pending approval, in-payment, closed, denied, avg days)
 *   2. Claims by Status (donut chart)
 *   3. Claims by Benefit Type (horizontal bar chart)
 *   4. Aging Summary (bar chart with buckets)
 *   5. Recent Activity Feed
 *   6. My Assigned Worklist
 *
 * Tables READ: bn_claim, bn_claim_event, bn_product
 * Tables WRITE: None
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, Users, ShieldCheck, Banknote, CheckCircle2,
  XCircle, Clock, TrendingUp, Activity, ClipboardList,
  ArrowRight, RefreshCw, AlertTriangle, Loader2,
} from 'lucide-react';
import { BnStatCard, BnStatusBadge, BnEmptyState } from '@/components/bn/shared';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import { formatDateForDisplay } from '@/lib/format-config';
import {
  useBnDashboardSummary,
  useBnClaimsByStatus,
  useBnClaimsByProduct,
  useBnClaimAging,
  useBnRecentActivity,
  useBnMyAssignments,
} from '@/hooks/bn/useBnDashboard';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useQueryClient } from '@tanstack/react-query';

// ── Color palette for status chart ──────────────────────
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  SUBMITTED: '#3b82f6',
  INTAKE_REVIEW: '#6366f1',
  ELIGIBILITY_CHECK: '#8b5cf6',
  EVIDENCE_REVIEW: '#a855f7',
  CALCULATION: '#f59e0b',
  DECISION: '#f97316',
  APPROVED: '#10b981',
  DENIED: '#ef4444',
  AWARD_SETUP: '#14b8a6',
  PAYMENT_QUEUE: '#06b6d4',
  IN_PAYMENT: '#0ea5e9',
  SUSPENDED: '#f43f5e',
  CLOSED: '#6b7280',
  PENDING_INFO: '#eab308',
  WITHDRAWN: '#9ca3af',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'destructive',
  HIGH: 'destructive',
  NORMAL: 'secondary',
  LOW: 'outline',
};

export default function BenefitsDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // TODO: Replace with actual auth context userCode
  const { userCode: _uc } = useUserCode(); const userCode = _uc ?? '';

  const { data: summary, isLoading: summaryLoading } = useBnDashboardSummary();
  const { data: byStatus = [], isLoading: statusLoading } = useBnClaimsByStatus();
  const { data: byProduct = [], isLoading: productLoading } = useBnClaimsByProduct();
  const { data: aging = [], isLoading: agingLoading } = useBnClaimAging();
  const { data: recentActivity = [], isLoading: activityLoading } = useBnRecentActivity(15);
  const { data: myAssignments = [], isLoading: assignmentsLoading } = useBnMyAssignments(userCode);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['bn', 'dashboard'] });
  };

  // Compute max for bar chart scaling
  const maxAgingCount = useMemo(() => Math.max(1, ...aging.map(a => a.count)), [aging]);
  const maxProductCount = useMemo(() => Math.max(1, ...byProduct.map(p => p.count)), [byProduct]);
  const totalStatusCount = useMemo(() => byStatus.reduce((s, b) => s + b.count, 0), [byStatus]);

  if (summaryLoading) {
    return <BnEmptyState type="loading" title="Loading Benefits Dashboard..." />;
  }

  return (
    <PermissionWrapper moduleName="bn_dashboard">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="t-page-title">Benefits Dashboard</h1>
            <p className="t-page-subtitle mt-1">
              Operational overview — Claims, Payments & Processing Metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => navigate('/bn/intake/register')} className="gap-2">
              <FileText className="h-4 w-4" /> New Claim
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <BnStatCard
            title="Total Claims"
            value={summary?.totalClaims ?? 0}
            icon={ClipboardList}
            subtitle="All time"
          />
          <BnStatCard
            title="Open Claims"
            value={summary?.openClaims ?? 0}
            icon={FileText}
            subtitle="Active processing"
          />
          <BnStatCard
            title="Pending Approval"
            value={summary?.pendingApproval ?? 0}
            icon={ShieldCheck}
            subtitle="Awaiting decision"
          />
          <BnStatCard
            title="In Payment"
            value={summary?.inPayment ?? 0}
            icon={Banknote}
            subtitle="Payment pipeline"
          />
          <BnStatCard
            title="Closed (Month)"
            value={summary?.closedThisMonth ?? 0}
            icon={CheckCircle2}
            subtitle="This month"
          />
          <BnStatCard
            title="Denied (Month)"
            value={summary?.deniedThisMonth ?? 0}
            icon={XCircle}
            subtitle="This month"
          />
          <BnStatCard
            title="Avg. Days"
            value={summary?.avgProcessingDays ?? 0}
            icon={Clock}
            subtitle="Processing time"
          />
        </div>

        {/* ── Charts Row ───────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Claims by Status — Donut-like visual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Claims by Status</CardTitle>
              <CardDescription>{totalStatusCount} total claims</CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : byStatus.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No claims found</p>
              ) : (
                <div className="space-y-2">
                  {byStatus.slice(0, 8).map((item) => {
                    const pct = totalStatusCount > 0 ? (item.count / totalStatusCount) * 100 : 0;
                    const label = BN_CLAIM_STATUS_LABELS[item.status as keyof typeof BN_CLAIM_STATUS_LABELS] || item.status;
                    return (
                      <div key={item.status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: STATUS_COLORS[item.status] || '#6b7280',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claims by Product — Horizontal bar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Claims by Benefit Type</CardTitle>
              <CardDescription>Distribution across products</CardDescription>
            </CardHeader>
            <CardContent>
              {productLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : byProduct.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-3">
                  {byProduct.slice(0, 8).map((item) => (
                    <div key={item.product_code} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[180px]" title={item.product_name}>
                          {item.product_name}
                        </span>
                        <span className="font-mono font-medium">{item.count}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${(item.count / maxProductCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aging Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Claim Aging</CardTitle>
                  <CardDescription>Open claims by age bucket</CardDescription>
                </div>
                {aging.some(a => a.count > 0 && a.min_days >= 31) && (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {agingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {aging.map((bucket) => {
                    const isOverdue = bucket.min_days >= 31;
                    return (
                      <div key={bucket.bucket} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={isOverdue ? 'font-medium text-amber-600' : 'text-muted-foreground'}>
                            {bucket.bucket}
                          </span>
                          <span className={`font-medium ${isOverdue && bucket.count > 0 ? 'text-amber-600' : ''}`}>
                            {bucket.count}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${maxAgingCount > 0 ? (bucket.count / maxAgingCount) * 100 : 0}%`,
                              backgroundColor: isOverdue ? '#f59e0b' : 'hsl(var(--primary))',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Bottom Row: Activity + Worklist ──────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" /> Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/bn/history')} className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {recentActivity.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => event.claim_id && navigate(`/bn/claims/${event.claim_id}`)}
                    >
                      <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {event.claim_number || event.claim_id?.slice(0, 8)}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {event.event_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {event.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatDateForDisplay(event.event_date)}</span>
                          {event.performed_by && <span>by {event.performed_by}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Assigned Worklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> My Worklist
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/bn/claims')} className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : myAssignments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No claims assigned to you
                </p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Claim</TableHead>
                        <TableHead className="text-xs">SSN</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Priority</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myAssignments.slice(0, 15).map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/bn/claims/${item.id}`)}
                        >
                          <TableCell className="text-xs font-mono">
                            {item.claim_number || item.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-xs">{item.ssn}</TableCell>
                          <TableCell className="text-xs truncate max-w-[100px]" title={item.product_name || ''}>
                            {item.product_code || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={(PRIORITY_COLORS[item.priority] || 'outline') as any} className="text-xs">
                              {item.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <BnStatusBadge
                              status={item.status}
                              label={BN_CLAIM_STATUS_LABELS[item.status as keyof typeof BN_CLAIM_STATUS_LABELS] || item.status}
                              size="sm"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Navigation ─────────────────────────────── */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/bn/intake/register')} className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Register Claim
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/bn/claims')} className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Claim Worklist
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/bn/approval')} className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Approval Queue
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/bn/entitlements')} className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Entitlements
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/bn/batches')} className="gap-1.5">
                <Banknote className="h-3.5 w-3.5" /> Payment Batches
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/bn/person-360')} className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Person 360
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/bn/config/products')} className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Product Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}
