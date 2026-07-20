/**
 * BN Mortality — Operational Dashboard  (/bn/mortality)
 *
 * Real data via BenefitsQueryClient. No direct Supabase reads.
 * All mutations are disabled while actions_enabled = false.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from '@/components/bn/access/BnModuleRouteGate';
import { BnMortalityAuthState } from './components/BnMortalityAuthState';
import { BnMortalityBreadcrumbs } from './components/BnMortalityBreadcrumbs';
import {
  BnMortalityAssigneeFilter,
  type AssigneeMode,
} from './components/BnMortalityAssigneeFilter';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

import {
  useMortalityDashboard,
  useMortalityEventList,
  useMortalityAssignableUsers,
  type MortalityListFilters,
} from '@/hooks/bn/mortality/useMortalityQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  ClipboardCheck,
  Clock,
  Filter as FilterIcon,
  Inbox,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';


const STATUS_FILTERS = [
  { value: 'all', label: 'All open' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REPORTED', label: 'Reported' },
  { value: 'VERIFICATION_PENDING', label: 'Verification pending' },
  { value: 'PROVISIONALLY_HELD', label: 'Provisionally held' },
  { value: 'CONFLICT', label: 'Conflict' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'IMPACT_REVIEW', label: 'Impact review' },
  { value: 'APPROVAL_PENDING', label: 'Approval pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'FOLLOW_ON_PROCESSING', label: 'Follow-on processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CLOSED', label: 'Closed' },
];

const SOURCE_FILTERS = [
  { value: 'all', label: 'All sources' },
  { value: 'REGISTRAR_FEED', label: 'Registrar feed' },
  { value: 'IP_MODULE', label: 'IP module' },
  { value: 'FAMILY_NOTIFICATION', label: 'Family notification' },
  { value: 'HOSPITAL_NOTICE', label: 'Hospital notice' },
  { value: 'STAFF_ENTRY', label: 'Staff entry' },
  { value: 'OTHER', label: 'Other' },
];

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: 'default' | 'warn' | 'success' | 'muted';
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-amber-600'
      : tone === 'success'
        ? 'text-emerald-600'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className={toneClass}>{icon}</span>
        </div>
        <div className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function daysAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['CLOSED', 'COMPLETED', 'REVERSED', 'CANCELLED', 'DUPLICATE'].includes(status))
    return 'secondary';
  if (['REJECTED', 'CONFLICT'].includes(status)) return 'destructive';
  return 'default';
}

function DashboardContent({ ctx }: { ctx: BnModuleAccessContext }) {
  const [status, setStatus] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(false);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [reportedFrom, setReportedFrom] = useState<string>('');
  const [reportedTo, setReportedTo] = useState<string>('');
  const [page, setPage] = useState<number>(0);

  const filters = useMemo<MortalityListFilters>(() => {
    const f: MortalityListFilters = {};
    if (status !== 'all') f.status = status;
    if (source !== 'all') f.source = source;
    if (search.trim()) f.search = search.trim();
    if (overdueOnly) f.overdueOnly = true;
    if (unassignedOnly) f.unassignedOnly = true;
    if (assignedTo.trim()) f.assignedTo = assignedTo.trim();
    if (reportedFrom) f.reportedFrom = reportedFrom;
    if (reportedTo) f.reportedTo = reportedTo;
    return f;
  }, [status, source, search, overdueOnly, unassignedOnly, assignedTo, reportedFrom, reportedTo]);

  const dashboardQuery = useMortalityDashboard();
  const pageSize = 25;
  const listQuery = useMortalityEventList(filters, pageSize, page > 0 ? String(page * pageSize) : null);


  const totals = dashboardQuery.data?.data?.totals;
  const byStatus = totals?.byStatus ?? {};

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <BnMortalityBreadcrumbs leaf={{ kind: 'dashboard' }} />
      {/* Header */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Death &amp; Mortality Processing</h1>
            {!ctx.actionsEnabled && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Read-only pilot
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Register, verify and action pensioner / claimant death reports. Mutations
            unlock only when the internal-pilot certification completes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dashboardQuery.refetch();
              listQuery.refetch();
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button asChild size="sm" disabled={!ctx.hasWrite}>
            <Link to="/bn/mortality/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New event
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {dashboardQuery.isLoading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : dashboardQuery.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dashboard failed to load</AlertTitle>
          <AlertDescription>{dashboardQuery.error?.message ?? 'Unknown error'}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <StatCard label="Total open" value={totals?.totalOpen ?? 0} icon={<Inbox className="h-4 w-4" />} />
          <StatCard label="Unassigned" value={totals?.unassigned ?? 0} icon={<UserPlus className="h-4 w-4" />} tone="muted" />
          <StatCard label="Verification pending" value={totals?.verificationPending ?? 0} icon={<Clock className="h-4 w-4" />} />
          <StatCard label="Provisionally held" value={totals?.provisionallyHeld ?? 0} icon={<Lock className="h-4 w-4" />} tone="warn" />
          <StatCard label="Conflicts" value={totals?.conflicts ?? 0} icon={<AlertTriangle className="h-4 w-4" />} tone="warn" />
          <StatCard label="Impact review" value={totals?.impactReview ?? 0} icon={<ClipboardCheck className="h-4 w-4" />} />
          <StatCard label="Approval pending" value={totals?.approvalPending ?? 0} icon={<ClipboardCheck className="h-4 w-4" />} />
          <StatCard label="Follow-on" value={totals?.followOnProcessing ?? 0} icon={<ClipboardCheck className="h-4 w-4" />} />
          <StatCard label="Overdue" value={totals?.overdue ?? 0} icon={<AlertTriangle className="h-4 w-4" />} tone="warn" />
          <StatCard label="Closed this month" value={totals?.closedThisMonth ?? 0} icon={<ShieldCheck className="h-4 w-4" />} tone="success" />
        </div>
      )}


      {/* Worklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Worklist</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search deceased name…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="h-8 w-48 pl-7 text-xs"
                />
              </div>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={source}
                onValueChange={(v) => {
                  setSource(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_FILTERS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={overdueOnly ? 'default' : 'outline'}
                onClick={() => {
                  setOverdueOnly((v) => !v);
                  setPage(0);
                }}
              >
                Overdue only
              </Button>
              <Button
                size="sm"
                variant={unassignedOnly ? 'default' : 'outline'}
                onClick={() => {
                  setUnassignedOnly((v) => !v);
                  setPage(0);
                }}
              >
                Unassigned only
              </Button>
              <Input
                placeholder="Assigned to (user id)"
                value={assignedTo}
                onChange={(e) => { setAssignedTo(e.target.value); setPage(0); }}
                className="h-8 w-40 text-xs"
              />
              <Input
                type="date"
                value={reportedFrom}
                onChange={(e) => { setReportedFrom(e.target.value); setPage(0); }}
                className="h-8 w-36 text-xs"
                aria-label="Reported from"
              />
              <Input
                type="date"
                value={reportedTo}
                onChange={(e) => { setReportedTo(e.target.value); setPage(0); }}
                className="h-8 w-36 text-xs"
                aria-label="Reported to"
              />

            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : listQuery.isError ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Worklist failed to load</AlertTitle>
                <AlertDescription>{listQuery.error?.message ?? 'Unknown error'}</AlertDescription>
              </Alert>
            </div>
          ) : !listQuery.data?.data || listQuery.data.data.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No events match these filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Deceased</TableHead>
                    <TableHead>Death date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>SLA due</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data.data.map((r) => {
                    const overdue =
                      r.sla_due_at &&
                      new Date(r.sla_due_at).getTime() < Date.now() &&
                      !['CLOSED', 'CANCELLED', 'REVERSED', 'DUPLICATE'].includes(r.status);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {r.event_reference ?? r.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate">
                          {r.deceased_full_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">{r.death_date ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.source}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.assigned_to ? r.assigned_to.slice(0, 8) : <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell className={overdue ? 'text-amber-600 text-xs' : 'text-xs'}>
                          {r.sla_due_at ? new Date(r.sla_due_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{daysAgo(r.reported_at)}</TableCell>
                        <TableCell className="text-xs">{daysAgo(r.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/bn/mortality/${r.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
                <span>
                  Showing {listQuery.data.data.length}
                  {listQuery.data.page?.totalCount != null
                    ? ` of ${listQuery.data.page.totalCount}`
                    : ''}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !!listQuery.data.page?.totalCount &&
                      (page + 1) * pageSize >= listQuery.data.page.totalCount
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BnMortalityPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_mortality" requiredAction="view">
      {(ctx) => (
        <BnMortalityAuthState
          frame={
            <div className="p-6 pb-0 max-w-[1400px] mx-auto">
              <BnMortalityBreadcrumbs leaf={{ kind: 'dashboard' }} />
            </div>
          }
        >
          <DashboardContent ctx={ctx} />
        </BnMortalityAuthState>
      )}
    </BnModuleRouteGate>
  );
}

