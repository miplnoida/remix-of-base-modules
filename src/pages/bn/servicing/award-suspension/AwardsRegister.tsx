import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Eye, History, PlusCircle, FileText, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AwardSuspensionListItem } from '@/services/bn/awardSuspensionViewService';
import { SuspensionStatusBadge } from './SuspensionStatusBadge';
import { formatDate, formatMoney } from './suspensionViewModels';

interface Props {
  rows: AwardSuspensionListItem[];
  loading: boolean;
  canPropose: boolean;
  onPropose: (award: AwardSuspensionListItem) => void;
  onViewRequest: (requestId: string) => void;
  filterHasOpenRequest?: 'all' | 'yes' | 'no';
  filterAwardStatus?: string;
  onFilterChange?: (patch: Partial<{ hasOpen: 'all' | 'yes' | 'no'; awardStatus: string }>) => void;
  actionsEnabled?: boolean;
}

export function AwardsRegister({
  rows,
  loading,
  canPropose,
  onPropose,
  onViewRequest,
  filterHasOpenRequest = 'all',
  filterAwardStatus = 'all',
  onFilterChange,
  actionsEnabled = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [benefit, setBenefit] = useState('all');

  const benefits = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const code = typeof r.benefitCode === 'string' ? r.benefitCode.trim() : '';
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterAwardStatus !== 'all' && r.awardStatus !== filterAwardStatus) return false;
      if (benefit !== 'all' && r.benefitCode !== benefit) return false;
      if (filterHasOpenRequest === 'yes' && !r.openRequestId) return false;
      if (filterHasOpenRequest === 'no' && r.openRequestId) return false;
      if (!q) return true;
      return (
        (r.awardNumber ?? '').toLowerCase().includes(q) ||
        r.claimantName.toLowerCase().includes(q) ||
        (r.benefitCode ?? '').toLowerCase().includes(q) ||
        r.ssnMasked.includes(q)
      );
    });
  }, [rows, search, benefit, filterAwardStatus, filterHasOpenRequest]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Search award #, claimant, benefit…"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search awards"
            />
          </div>
          <Select
            value={filterAwardStatus}
            onValueChange={(v) => onFilterChange?.({ awardStatus: v })}
          >
            <SelectTrigger className="h-9 w-[160px]" aria-label="Award status filter">
              <SelectValue placeholder="Award status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={benefit} onValueChange={setBenefit}>
            <SelectTrigger className="h-9 w-[160px]" aria-label="Benefit filter">
              <SelectValue placeholder="Benefit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All benefits</SelectItem>
              {benefits.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterHasOpenRequest}
            onValueChange={(v) =>
              onFilterChange?.({ hasOpen: v as 'all' | 'yes' | 'no' })
            }
          >
            <SelectTrigger className="h-9 w-[200px]" aria-label="Open request filter">
              <SelectValue placeholder="Has open request" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All awards</SelectItem>
              <SelectItem value="yes">With open request</SelectItem>
              <SelectItem value="no">Without open request</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-hidden">
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Award #</TableHead>
                  <TableHead>Claimant</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Base amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Next review</TableHead>
                  <TableHead>Open request</TableHead>
                  <TableHead>Req. effective</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-10">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" aria-hidden />
                      Loading awards…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="py-10 text-center text-muted-foreground">
                      <FileText className="h-6 w-6 mx-auto mb-2 opacity-60" aria-hidden />
                      No awards match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.awardId} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">
                        {r.awardNumber ?? r.awardId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">{r.claimantName}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ssnMasked}</TableCell>
                      <TableCell>{r.benefitCode ?? '—'}</TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">
                        {r.awardType ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">
                          {r.awardStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMoney(r.baseAmount, r.currency)}
                      </TableCell>
                      <TableCell className="text-xs">{r.frequency ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatDate(r.startDate)}</TableCell>
                      <TableCell className="text-xs">{formatDate(r.nextReviewDate)}</TableCell>
                      <TableCell>
                        <SuspensionStatusBadge status={r.openRequestStatus} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(r.requestedEffectiveDate)}
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        {r.openRequestId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewRequest(r.openRequestId!)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" aria-hidden />
                            View request
                          </Button>
                        ) : (
                          canPropose && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onPropose(r)}
                              disabled={r.awardStatus !== 'ACTIVE'}
                              title={
                                actionsEnabled
                                  ? 'Propose a suspension for this award'
                                  : 'Form available for review; submission disabled while dark-launched'
                              }
                            >
                              <PlusCircle className="h-3.5 w-3.5 mr-1" aria-hidden />
                              Propose
                            </Button>
                          )
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View suspension history for this award"
                          onClick={() => onViewRequest(r.openRequestId ?? r.awardId)}
                        >
                          <History className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
