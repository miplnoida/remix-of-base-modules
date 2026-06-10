/**
 * Screen 9: Approval Queue
 * 
 * Dedicated queue view with enhanced filtering, priority sorting,
 * assignment controls, and SLA tracking. Separate from ApprovalConsole
 * which handles the adjudication workspace.
 * 
 * Roles: Supervisor (view/act), Manager (override), Director (escalated), Auditor (read-only)
 * Tables: bn_claim, bn_claim_decision, bn_claim_eligibility, bn_claim_calculation, bn_claim_evidence
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BnStatCard, BnEmptyState, BnStatusBadge } from '@/components/bn/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle, XCircle,
  Loader2, Search, Filter, ArrowUpDown, Eye, UserPlus, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBnApprovalQueue } from '@/hooks/bn/useBnApprovalConsole';
import type { ApprovalFilters, ApprovalQueueItem } from '@/services/bn/approvalConsoleService';
import { formatDateForDisplay } from '@/lib/format-config';
import { BN_CATEGORY_LABELS } from '@/types/bn';

type SortField = 'age_days' | 'claim_date' | 'priority' | 'benefit_type';

const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const priorityColors: Record<string, string> = {
  URGENT: 'bg-destructive text-destructive-foreground',
  HIGH: 'bg-amber-500 text-white',
  NORMAL: 'bg-muted text-muted-foreground',
  LOW: 'bg-muted/50 text-muted-foreground',
};

export default function ApprovalQueue() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ApprovalFilters>({ status: ['DECISION'] });
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: queue, isLoading, error } = useBnApprovalQueue(filters);

  // Apply client-side search & sort
  const filteredItems = useMemo(() => {
    let items = queue ?? [];
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i =>
        (i.claim_number || '').toLowerCase().includes(s) ||
        i.ssn.toLowerCase().includes(s) ||
        i.benefit_type.toLowerCase().includes(s)
      );
    }
    items = [...items].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'priority') cmp = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      else if (sortField === 'age_days') cmp = b.age_days - a.age_days;
      else if (sortField === 'claim_date') cmp = new Date(a.claim_date).getTime() - new Date(b.claim_date).getTime();
      else if (sortField === 'benefit_type') cmp = a.benefit_type.localeCompare(b.benefit_type);
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [queue, search, sortField, sortAsc]);

  const stats = useMemo(() => {
    const items = queue ?? [];
    return {
      total: items.length,
      decision: items.filter(i => i.status === 'DECISION').length,
      urgent: items.filter(i => i.priority === 'URGENT').length,
      overdue: items.filter(i => i.age_days > 14).length,
      avgAge: items.length > 0 ? Math.round(items.reduce((s, i) => s + i.age_days, 0) / items.length) : 0,
    };
  }, [queue]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.filter(i => i.status === 'DECISION').map(i => i.claim_id)));
    }
  };

  const handleOpenCase = (claimId: string) => {
    navigate(`/bn/approval/workspace/${claimId}`);
  };

  if (error) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load approval queue." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div>
        <h1 className="t-page-title flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Approval Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Claims pending supervisor review and approval decision.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <BnStatCard title="Awaiting Decision" value={stats.decision} icon={ClipboardCheck} />
        <BnStatCard title="Total in Queue" value={stats.total} icon={Clock} />
        <BnStatCard title="Urgent" value={stats.urgent} icon={AlertTriangle} subtitle="Priority cases" />
        <BnStatCard title="Overdue (>14d)" value={stats.overdue} icon={AlertTriangle} subtitle="SLA breached" />
        <BnStatCard title="Avg Age" value={`${stats.avgAge}d`} icon={Clock} subtitle="Days in queue" />
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search claim # or SSN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-48 h-8 text-sm"
              />
            </div>

            <Select
              value={filters.status?.[0] || 'ALL'}
              onValueChange={v => setFilters(prev => ({ ...prev, status: v === 'ALL' ? undefined : [v] }))}
            >
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DECISION">Decision</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING_INFO">Pending Info</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority?.[0] || 'ALL'}
              onValueChange={v => setFilters(prev => ({ ...prev, priority: v === 'ALL' ? undefined : [v] }))}
            >
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.benefitCategory || 'ALL'}
              onValueChange={v => setFilters(prev => ({ ...prev, benefitCategory: v === 'ALL' ? undefined : v }))}
            >
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Benefit Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {Object.entries(BN_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || filters.priority?.length || filters.benefitCategory) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilters({ status: ['DECISION'] }); }}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">{filteredItems.length} cases</span>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === filteredItems.filter(i => i.status === 'DECISION').length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Claim #</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('priority')}>
                    <span className="flex items-center gap-1">
                      Priority <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('age_days')}>
                    <span className="flex items-center gap-1">
                      Age <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No cases match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {filteredItems.map(item => (
                  <TableRow
                    key={item.claim_id}
                    className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(item.claim_id) ? 'bg-primary/5' : ''} ${item.age_days > 14 ? 'border-l-2 border-l-destructive' : ''}`}
                    onClick={() => handleOpenCase(item.claim_id)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(item.claim_id)}
                        onCheckedChange={() => toggleSelection(item.claim_id)}
                        disabled={item.status !== 'DECISION'}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {item.claim_number || item.claim_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.ssn}</TableCell>
                    <TableCell className="text-sm">{item.benefit_type}</TableCell>
                    <TableCell><BnStatusBadge status={item.status} /></TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${priorityColors[item.priority] || ''}`}>{item.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${item.age_days > 14 ? 'text-destructive font-bold' : item.age_days > 7 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                        {item.age_days}d
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {item.has_eligibility ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                        {item.has_calculation ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                        {item.evidence_complete ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.assigned_to || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleOpenCase(item.claim_id); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Selected Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-10 rounded-lg border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            <Button size="sm" onClick={() => {
              if (selectedIds.size === 1) {
                handleOpenCase(Array.from(selectedIds)[0]);
              } else {
                navigate('/bn/approval');
              }
            }}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              {selectedIds.size === 1 ? 'Open Workspace' : 'Bulk Review'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
