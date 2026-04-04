import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Filter } from 'lucide-react';
import { useBnClaims } from '@/hooks/bn/useBnClaim';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import type { BnClaim, BnClaimStatus } from '@/types/bn';
import { formatDateForDisplay } from '@/lib/format-config';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  SUBMITTED: 'secondary',
  INTAKE_REVIEW: 'secondary',
  ELIGIBILITY_CHECK: 'secondary',
  EVIDENCE_REVIEW: 'secondary',
  CALCULATION: 'secondary',
  DECISION: 'secondary',
  APPROVED: 'default',
  DENIED: 'destructive',
  SUSPENDED: 'destructive',
  CLOSED: 'outline',
  PENDING_INFO: 'destructive',
};

export default function ClaimWorklist() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const { data: claims = [], isLoading } = useBnClaims(statusFilter ? { status: statusFilter } : undefined);

  const filtered = claims.filter(
    (c: BnClaim) =>
      (c.claim_number || '').toLowerCase().includes(search.toLowerCase()) ||
      c.ssn.includes(search)
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Claim Worklist</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and process benefit claims</p>
        </div>
        <Button onClick={() => navigate('/bn/intake/register')} className="gap-2">
          <Plus className="h-4 w-4" /> New Claim
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Claims ({filtered.length})</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search claim # or SSN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  {Object.entries(BN_CLAIM_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading claims...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {search || statusFilter ? 'No claims match your filters.' : 'No claims found. Register a new claim to get started.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Claim Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[80px]">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((claim: BnClaim) => (
                  <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/bn/claims/${claim.id}`)}>
                    <TableCell className="font-mono text-sm">{claim.claim_number || '—'}</TableCell>
                    <TableCell>{claim.ssn}</TableCell>
                    <TableCell>{(claim as any).bn_product?.benefit_name || '—'}</TableCell>
                    <TableCell>{formatDateForDisplay(claim.claim_date)}</TableCell>
                    <TableCell>
                      <Badge variant={claim.priority === 'URGENT' || claim.priority === 'HIGH' ? 'destructive' : 'outline'}>
                        {claim.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[claim.status] || 'outline'}>
                        {BN_CLAIM_STATUS_LABELS[claim.status] || claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{claim.assigned_to || '—'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/bn/claims/${claim.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
