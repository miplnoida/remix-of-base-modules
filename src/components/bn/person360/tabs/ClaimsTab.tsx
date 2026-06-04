/**
 * Person 360 — Claims Tab
 * 
 * Source: bn_claim joined with bn_product
 * Future: cl_head for legacy claim_no display
 * Read-only with navigation to Claim 360
 * 
 * Columns: Claim #, Benefit Type, Status, Priority, Claim Date, Decision Date, Assigned To
 * Filters: Status, Benefit Type
 * Actions: Click row → /bn/claims/:id
 * Role visibility: All BN roles
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ExternalLink } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { Person360Claim } from '@/services/bn/person360Service';

const claimStatusColor: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SUBMITTED: 'bg-blue-500/15 text-blue-700',
  INTAKE_REVIEW: 'bg-blue-500/15 text-blue-700',
  ELIGIBILITY_CHECK: 'bg-amber-500/15 text-amber-700',
  EVIDENCE_REVIEW: 'bg-amber-500/15 text-amber-700',
  CALCULATION: 'bg-violet-500/15 text-violet-700',
  DECISION: 'bg-violet-500/15 text-violet-700',
  APPROVED: 'bg-emerald-500/15 text-emerald-700',
  DENIED: 'bg-destructive/15 text-destructive',
  CLOSED: 'bg-muted text-muted-foreground',
  PENDING_INFO: 'bg-amber-500/15 text-amber-700',
};

const priorityColor: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  NORMAL: 'bg-blue-500/15 text-blue-700',
  HIGH: 'bg-amber-500/15 text-amber-700',
  URGENT: 'bg-destructive/15 text-destructive',
};

interface ClaimsTabProps {
  claims: Person360Claim[];
  isLoading?: boolean;
}

export const ClaimsTab: React.FC<ClaimsTabProps> = ({ claims, isLoading }) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = claims;
    if (statusFilter !== 'ALL') result = result.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.claim_number.toLowerCase().includes(q) ||
        c.benefit_type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [claims, statusFilter, search]);

  const statuses = ['ALL', ...Array.from(new Set(claims.map(c => c.status)))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Claim #</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Benefit Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Claim Date</TableHead>
              <TableHead>Decision Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No claims found</TableCell></TableRow>
            ) : filtered.map(claim => (
              <TableRow
                key={claim.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => navigate(`/bn/claims/${claim.id}`)}
              >
                <TableCell className="font-mono font-medium">{claim.claim_number}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={claim.source === 'LEGACY_BEMA'
                      ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                      : 'bg-primary/10 text-primary border-primary/20'}
                  >
                    {claim.source_badge}
                  </Badge>
                </TableCell>
                <TableCell>{claim.product_name || claim.benefit_type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={claimStatusColor[claim.status] || ''}>
                    {claim.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={priorityColor[claim.priority] || ''}>
                    {claim.priority}
                  </Badge>
                </TableCell>
                <TableCell>{claim.claim_date ? formatDateForDisplay(claim.claim_date) : '—'}</TableCell>
                <TableCell>{claim.decision_date ? formatDateForDisplay(claim.decision_date) : '—'}</TableCell>
                <TableCell>{claim.assigned_to || '—'}</TableCell>
                <TableCell>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}

          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {claims.length} claims shown</p>
    </div>
  );
};
