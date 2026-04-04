/**
 * Enhanced Benefit Work Queue — Operational dashboard with stats + filters
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye, ClipboardList, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useBnClaims } from '@/hooks/bn/useBnClaim';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import type { BnClaim, BnClaimStatus } from '@/types/bn';
import { formatDateForDisplay } from '@/lib/format-config';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { BnStatusBadge, BnEmptyState, BnFilterBar, BnStatCard } from '@/components/bn/shared';
import type { FilterConfig } from '@/components/bn/shared';

export default function ClaimWorklist() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data: claims = [], isLoading } = useBnClaims(statusFilter ? { status: statusFilter } : undefined);

  const filtered = useMemo(() => {
    return claims.filter((c: BnClaim) => {
      const matchesSearch = !search ||
        (c.claim_number || '').toLowerCase().includes(search.toLowerCase()) ||
        c.ssn.includes(search);
      const matchesPriority = !priorityFilter || c.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [claims, search, priorityFilter]);

  const stats = useMemo(() => {
    const all = claims as BnClaim[];
    return {
      total: all.length,
      pending: all.filter(c => ['SUBMITTED', 'INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION'].includes(c.status)).length,
      urgent: all.filter(c => c.priority === 'URGENT' || c.priority === 'HIGH').length,
      approved: all.filter(c => c.status === 'APPROVED').length,
    };
  }, [claims]);

  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: Object.entries(BN_CLAIM_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
    },
    {
      key: 'priority',
      label: 'Priority',
      value: priorityFilter,
      onChange: setPriorityFilter,
      options: [
        { value: 'LOW', label: 'Low' },
        { value: 'NORMAL', label: 'Normal' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' },
      ],
    },
  ];

  const clearAll = () => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); };

  return (
    <PermissionWrapper moduleName="bn_claims">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Benefit Work Queue</h1>
            <p className="text-sm text-muted-foreground">Process and manage benefit claims across all products</p>
          </div>
          <Button onClick={() => navigate('/bn/intake/register')} className="gap-2">
            <Plus className="h-4 w-4" /> New Claim
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <BnStatCard title="Total Claims" value={stats.total} icon={ClipboardList} />
          <BnStatCard title="In Progress" value={stats.pending} icon={Clock} subtitle="Awaiting processing" />
          <BnStatCard title="High Priority" value={stats.urgent} icon={AlertTriangle} />
          <BnStatCard title="Approved" value={stats.approved} icon={CheckCircle2} />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <BnFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search claim # or SSN..."
              filters={filters}
              onClearAll={clearAll}
            />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <BnEmptyState type="loading" />
            ) : filtered.length === 0 ? (
              <BnEmptyState
                type={search || statusFilter || priorityFilter ? 'no-results' : 'empty'}
                title={search ? 'No matching claims' : 'No claims yet'}
                description={search ? 'Try adjusting your search or filters.' : 'Register a new claim to get started.'}
                action={!search ? { label: 'Register Claim', onClick: () => navigate('/bn/intake/register') } : undefined}
              />
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Claim #</TableHead>
                      <TableHead className="w-[100px]">SSN</TableHead>
                      <TableHead>Benefit</TableHead>
                      <TableHead className="w-[110px]">Filed</TableHead>
                      <TableHead className="w-[90px]">Priority</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[120px]">Assigned</TableHead>
                      <TableHead className="w-[60px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((claim: BnClaim) => (
                      <TableRow
                        key={claim.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/bn/claims/${claim.id}`)}
                      >
                        <TableCell className="font-mono text-sm font-medium">{claim.claim_number || '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{claim.ssn}</TableCell>
                        <TableCell className="text-sm">{(claim as any).bn_product?.benefit_name || '—'}</TableCell>
                        <TableCell className="text-sm">{formatDateForDisplay(claim.claim_date)}</TableCell>
                        <TableCell><BnStatusBadge status={claim.priority} size="sm" dot /></TableCell>
                        <TableCell>
                          <BnStatusBadge
                            status={claim.status}
                            label={BN_CLAIM_STATUS_LABELS[claim.status] || claim.status}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{claim.assigned_to || '—'}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/bn/claims/${claim.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
    </PermissionWrapper>
  );
}
