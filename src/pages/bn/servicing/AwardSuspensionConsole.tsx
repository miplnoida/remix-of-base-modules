/**
 * Screen 26: Award Suspension / Resumption Console
 *
 * Real-data wiring against bn_award + bn_award_status_event + bn_award_suspension_event.
 * Role visibility: Claims Officer, Supervisor, Admin
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, PauseCircle, PlayCircle, XCircle, AlertTriangle, CheckCircle2, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  fetchAwards,
  fetchClaimantsBySsns,
  updateAwardStatus,
  type BnAwardRow,
  type ClaimantInfo,
} from '@/services/bn/awardServicingService';

type AwardActionType = 'SUSPEND' | 'RESUME' | 'TERMINATE';

const SUSPEND_REASONS = [
  'Life certificate not submitted',
  'Failed medical review',
  'Returned to work',
  'Under investigation',
  'Beneficiary request',
  'Compliance hold',
  'Other',
];
const TERMINATE_REASONS = [
  'Beneficiary deceased',
  'Maximum duration reached',
  'Permanent return to work',
  'Voluntary withdrawal',
  'Fraud confirmed',
  'Other',
];
const RESUME_REASONS = ['Life certificate verified', 'Medical review passed', 'Investigation cleared', 'Other'];

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
  SUSPENDED: 'bg-amber-500/10 text-amber-700 border-amber-300',
  TERMINATED: 'bg-muted text-muted-foreground border-muted',
};

const AwardSuspensionConsole: React.FC = () => {
  const { isAuthReady, isAuthenticated, profile, hasAnyRole } = useSupabaseAuth();
  const canAct = hasAnyRole(['admin', 'supervisor', 'claims_officer', 'BN_SUPERVISOR', 'BN_MANAGER', 'BN_DIRECTOR']);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [awards, setAwards] = useState<BnAwardRow[]>([]);
  const [claimants, setClaimants] = useState<Record<string, ClaimantInfo>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<BnAwardRow | null>(null);
  const [actionType, setActionType] = useState<AwardActionType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchAwards();
      setAwards(rows);
      const map = await fetchClaimantsBySsns(rows.map((r) => r.ssn));
      setClaimants(map);
    } catch (e) {
      console.error(e);
      toast.error('Unable to load awards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && isAuthenticated) void load();
  }, [isAuthReady, isAuthenticated]);

  const filtered = useMemo(
    () =>
      awards.filter((a) => {
        const name = claimants[a.ssn]?.full_name ?? '';
        const matchSearch =
          !search ||
          name.toLowerCase().includes(search.toLowerCase()) ||
          a.ssn.includes(search) ||
          (a.award_number ?? '').toLowerCase().includes(search.toLowerCase());
        const matchTab = tab === 'all' || a.status === tab;
        return matchSearch && matchTab;
      }),
    [awards, claimants, search, tab]
  );

  const counts = useMemo(
    () => ({
      active: awards.filter((a) => a.status === 'ACTIVE').length,
      suspended: awards.filter((a) => a.status === 'SUSPENDED').length,
      terminated: awards.filter((a) => a.status === 'TERMINATED').length,
    }),
    [awards]
  );

  const openAction = (award: BnAwardRow, type: AwardActionType) => {
    setSelected(award);
    setActionType(type);
    setReason('');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setDialogOpen(true);
  };

  const executeAction = async () => {
    if (!selected || !actionType) return;
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    if (!effectiveDate) {
      toast.error('Please set an effective date');
      return;
    }
    const toStatus = actionType === 'RESUME' ? 'ACTIVE' : actionType === 'SUSPEND' ? 'SUSPENDED' : 'TERMINATED';
    setSubmitting(true);
    try {
      await updateAwardStatus(selected.id, toStatus, reason, effectiveDate, notes || null, profile?.user_code ?? null);
      toast.success(`Award ${selected.award_number ?? selected.id} ${actionType.toLowerCase()}d`);
      setDialogOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-page-title flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Award Suspension & Resumption
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage award lifecycle: suspend, resume, or terminate entitlements</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setTab('ACTIVE')}>
          <CardContent className="p-4 flex items-center gap-3">
            <PlayCircle className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{counts.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setTab('SUSPENDED')}>
          <CardContent className="p-4 flex items-center gap-3">
            <PauseCircle className="h-6 w-6 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Suspended</p>
              <p className="text-2xl font-bold">{counts.suspended}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setTab('TERMINATED')}>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Terminated</p>
              <p className="text-2xl font-bold">{counts.terminated}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SSN, or award ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setTab('all'); setSearch(''); }}>Clear</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Award ID</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead className="text-right">Base Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading awards…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No awards found</TableCell></TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.award_number ?? a.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono">{a.ssn}</TableCell>
                    <TableCell className="font-medium">{claimants[a.ssn]?.full_name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{a.benefit_code ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(a.base_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[a.status] ?? ''}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{a.start_date}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {canAct && a.status === 'ACTIVE' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openAction(a, 'SUSPEND')}>
                            <PauseCircle className="h-3 w-3 mr-1" />Suspend
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => openAction(a, 'TERMINATE')}>
                            <XCircle className="h-3 w-3 mr-1" />Terminate
                          </Button>
                        </>
                      )}
                      {canAct && a.status === 'SUSPENDED' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openAction(a, 'RESUME')}>
                            <PlayCircle className="h-3 w-3 mr-1" />Resume
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => openAction(a, 'TERMINATE')}>
                            <XCircle className="h-3 w-3 mr-1" />Terminate
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'SUSPEND' && (<><PauseCircle className="h-5 w-5 text-amber-600" />Suspend Award</>)}
              {actionType === 'RESUME' && (<><PlayCircle className="h-5 w-5 text-emerald-600" />Resume Award</>)}
              {actionType === 'TERMINATE' && (<><XCircle className="h-5 w-5 text-destructive" />Terminate Award</>)}
            </DialogTitle>
            <DialogDescription>
              {selected?.award_number ?? selected?.id.slice(0, 8)} — {selected ? (claimants[selected.ssn]?.full_name ?? selected.ssn) : ''} ({selected?.benefit_code ?? '—'})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {(actionType === 'TERMINATE' ? TERMINATE_REASONS : actionType === 'RESUME' ? RESUME_REASONS : SUSPEND_REASONS).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Effective Date *</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
            </div>
            {actionType === 'TERMINATE' && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Termination is permanent and will stop all future payments. This action requires supervisor approval.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant={actionType === 'TERMINATE' ? 'destructive' : 'default'} onClick={executeAction} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirm {actionType?.toLowerCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AwardSuspensionConsole;
