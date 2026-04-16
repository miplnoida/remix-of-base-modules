/**
 * Screen 26: Award Suspension / Resumption Console
 * 
 * Manages award lifecycle actions: Suspend, Resume, Terminate.
 * Tracks reason codes, effective dates, and approval workflows.
 * Supports bulk operations for compliance-triggered suspensions.
 * Role visibility: Claims Officer, Supervisor, Admin
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, PauseCircle, PlayCircle, XCircle, Filter,
  AlertTriangle, CheckCircle2, Clock, Shield
} from 'lucide-react';
import { toast } from 'sonner';

type AwardActionType = 'SUSPEND' | 'RESUME' | 'TERMINATE';
type AwardCurrentStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

interface AwardRecord {
  id: string;
  awardId: string;
  ssn: string;
  fullName: string;
  benefitType: string;
  weeklyRate: number;
  startDate: string;
  currentStatus: AwardCurrentStatus;
  lastActionDate: string | null;
  lastActionType: AwardActionType | null;
  lastActionReason: string | null;
  suspensionCount: number;
}

const MOCK_AWARDS: AwardRecord[] = [
  { id: '1', awardId: 'AWD-2024-001', ssn: '100234', fullName: 'John Williams', benefitType: 'Age Pension', weeklyRate: 450.00, startDate: '2024-06-01', currentStatus: 'ACTIVE', lastActionDate: null, lastActionType: null, lastActionReason: null, suspensionCount: 0 },
  { id: '2', awardId: 'AWD-2024-005', ssn: '100456', fullName: 'Mary Johnson', benefitType: 'Invalidity Pension', weeklyRate: 380.00, startDate: '2024-09-15', currentStatus: 'SUSPENDED', lastActionDate: '2026-03-01', lastActionType: 'SUSPEND', lastActionReason: 'Failed life certificate', suspensionCount: 1 },
  { id: '3', awardId: 'AWD-2023-003', ssn: '100112', fullName: 'Grace Thomas', benefitType: 'Age Pension', weeklyRate: 420.00, startDate: '2023-01-10', currentStatus: 'SUSPENDED', lastActionDate: '2026-02-15', lastActionType: 'SUSPEND', lastActionReason: 'Proof of life overdue', suspensionCount: 2 },
  { id: '4', awardId: 'AWD-2025-012', ssn: '100789', fullName: 'David Brown', benefitType: 'Survivors Pension', weeklyRate: 310.00, startDate: '2025-03-01', currentStatus: 'ACTIVE', lastActionDate: '2026-01-15', lastActionType: 'RESUME', lastActionReason: 'Life certificate verified', suspensionCount: 1 },
  { id: '5', awardId: 'AWD-2022-018', ssn: '100678', fullName: 'Anna Phillip', benefitType: 'Age Pension', weeklyRate: 400.00, startDate: '2022-07-01', currentStatus: 'TERMINATED', lastActionDate: '2025-12-01', lastActionType: 'TERMINATE', lastActionReason: 'Beneficiary deceased', suspensionCount: 0 },
];

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

const statusColors: Record<AwardCurrentStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
  SUSPENDED: 'bg-amber-500/10 text-amber-700 border-amber-300',
  TERMINATED: 'bg-muted text-muted-foreground border-muted',
};

const AwardSuspensionConsole: React.FC = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [awards] = useState<AwardRecord[]>(MOCK_AWARDS);
  const [selected, setSelected] = useState<AwardRecord | null>(null);
  const [actionType, setActionType] = useState<AwardActionType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => awards.filter(a => {
    const matchSearch = !search || a.fullName.toLowerCase().includes(search.toLowerCase()) || a.ssn.includes(search) || a.awardId.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || a.currentStatus === tab;
    return matchSearch && matchTab;
  }), [awards, search, tab]);

  const counts = useMemo(() => ({
    active: awards.filter(a => a.currentStatus === 'ACTIVE').length,
    suspended: awards.filter(a => a.currentStatus === 'SUSPENDED').length,
    terminated: awards.filter(a => a.currentStatus === 'TERMINATED').length,
  }), [awards]);

  const openAction = (award: AwardRecord, type: AwardActionType) => {
    setSelected(award);
    setActionType(type);
    setReason('');
    setEffectiveDate('');
    setNotes('');
    setDialogOpen(true);
  };

  const executeAction = () => {
    if (!reason) { toast.error('Please select a reason'); return; }
    if (!effectiveDate) { toast.error('Please set an effective date'); return; }
    toast.success(`Award ${selected?.awardId} — ${actionType?.toLowerCase()} action submitted`);
    setDialogOpen(false);
  };

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Award Suspension & Resumption</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage award lifecycle: suspend, resume, or terminate entitlements</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setTab('ACTIVE')}>
          <CardContent className="p-4 flex items-center gap-3">
            <PlayCircle className="h-6 w-6 text-emerald-600" />
            <div><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold">{counts.active}</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setTab('SUSPENDED')}>
          <CardContent className="p-4 flex items-center gap-3">
            <PauseCircle className="h-6 w-6 text-amber-600" />
            <div><p className="text-xs text-muted-foreground">Suspended</p><p className="text-2xl font-bold">{counts.suspended}</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setTab('TERMINATED')}>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Terminated</p><p className="text-2xl font-bold">{counts.terminated}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SSN, or award ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setTab('all'); setSearch(''); }}>Clear</Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Award ID</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead className="text-right">Weekly Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Action</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No awards found</TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.awardId}</TableCell>
                  <TableCell className="font-mono">{a.ssn}</TableCell>
                  <TableCell className="font-medium">{a.fullName}</TableCell>
                  <TableCell className="text-sm">{a.benefitType}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(a.weeklyRate)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[a.currentStatus]}>{a.currentStatus}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {a.lastActionType ? (
                      <span>{a.lastActionType} — {a.lastActionDate}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {a.currentStatus === 'ACTIVE' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openAction(a, 'SUSPEND')}>
                          <PauseCircle className="h-3 w-3 mr-1" />Suspend
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => openAction(a, 'TERMINATE')}>
                          <XCircle className="h-3 w-3 mr-1" />Terminate
                        </Button>
                      </>
                    )}
                    {a.currentStatus === 'SUSPENDED' && (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'SUSPEND' && <><PauseCircle className="h-5 w-5 text-amber-600" />Suspend Award</>}
              {actionType === 'RESUME' && <><PlayCircle className="h-5 w-5 text-emerald-600" />Resume Award</>}
              {actionType === 'TERMINATE' && <><XCircle className="h-5 w-5 text-destructive" />Terminate Award</>}
            </DialogTitle>
            <DialogDescription>{selected?.awardId} — {selected?.fullName} ({selected?.benefitType})</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {(actionType === 'TERMINATE' ? TERMINATE_REASONS : actionType === 'RESUME' ? ['Life certificate verified', 'Medical review passed', 'Investigation cleared', 'Other'] : SUSPEND_REASONS).map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Effective Date *</Label>
              <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..." />
            </div>
            {actionType === 'TERMINATE' && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Termination is permanent and will stop all future payments. This action requires supervisor approval.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant={actionType === 'TERMINATE' ? 'destructive' : 'default'} onClick={executeAction}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Confirm {actionType?.toLowerCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AwardSuspensionConsole;
