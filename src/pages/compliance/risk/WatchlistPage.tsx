import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import {
  listWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from '@/services/riskProfileService';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';
import { Eye, ShieldOff, Plus, Trash2, ShieldAlert, AlertTriangle, TrendingUp } from 'lucide-react';

const PERMISSION = 'manage_compliance';
const STATUSES = ['ACTIVE', 'EXPIRED', 'REMOVED', 'ALL'];

export default function WatchlistPage() {
  if (!isComplianceFeatureEnabled('risk.watchlist')) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ShieldOff className="mx-auto h-8 w-8 mb-2" /> Watchlist is disabled.
        </CardContent></Card>
      </div>
    );
  }
  return <PermissionWrapper moduleName={PERMISSION}><Inner /></PermissionWrapper>;
}

function Inner() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [status, setStatus] = useState('ACTIVE');
  const [add, setAdd] = useState<{ open: boolean; employer_id: string; employer_name: string; reason: string; end_date: string; notes: string }>({
    open: false, employer_id: '', employer_name: '', reason: '', end_date: '', notes: '',
  });
  const [remove, setRemove] = useState<{ open: boolean; id: string; notes: string }>({ open: false, id: '', notes: '' });

  const { data = [], isLoading } = useQuery({
    queryKey: ['watchlist', status],
    queryFn: () => listWatchlist(status),
  });

  const addMut = useMutation({
    mutationFn: () => addToWatchlist({
      employer_id: add.employer_id.trim(),
      employer_name: add.employer_name.trim() || null,
      reason: add.reason,
      end_date: add.end_date || null,
      notes: add.notes || null,
      source: 'MANUAL',
    }, userCode || 'SYSTEM'),
    onSuccess: () => {
      toast.success('Added to watchlist');
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      setAdd({ open: false, employer_id: '', employer_name: '', reason: '', end_date: '', notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: () => removeFromWatchlist(remove.id, remove.notes, userCode || 'SYSTEM'),
    onSuccess: () => {
      toast.success('Removed from watchlist');
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      setRemove({ open: false, id: '', notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> Employer Watchlist
          </h1>
          <p className="text-sm text-muted-foreground">System-generated and manual entries with reason, dates, and audit fields.</p>
        </div>
        <PermissionButton moduleName={PERMISSION} actionName="manage" onClick={() => setAdd((s) => ({ ...s, open: true }))}>
          <Plus className="h-4 w-4 mr-2" /> Add Employer
        </PermissionButton>
      </div>

      {/* Peer navigation to sibling Risk & Employer Profile pages. */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/high-risk')}>
          <ShieldAlert className="h-4 w-4 mr-2" /> High Risk Employers
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/repeat-defaulters')}>
          <AlertTriangle className="h-4 w-4 mr-2" /> Repeat Defaulters
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/score-details')}>
          <TrendingUp className="h-4 w-4 mr-2" /> Score Details
        </Button>
      </div>


      <Card>
        <CardContent className="py-4 flex gap-3 items-end">
          <div className="w-48">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Badge variant="outline">{data.length} entry/entries</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watchlist Entries</CardTitle>
          <CardDescription>Manual entries are auditable. System entries are created by rules / automation.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div>{w.employer_name || w.employer_id}</div>
                      <div className="text-xs text-muted-foreground font-mono">{w.employer_id}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">{w.reason}</TableCell>
                    <TableCell><Badge variant="outline">{w.source}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={w.status === 'ACTIVE' ? 'default' : 'secondary'}>{w.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{w.start_date}</TableCell>
                    <TableCell className="text-xs">{w.end_date || '—'}</TableCell>
                    <TableCell className="text-xs">{w.added_by || '—'}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/risk/score-details?employer=${w.employer_id}`)}>
                        Score
                      </Button>
                      {w.status === 'ACTIVE' && (
                        <PermissionButton
                          moduleName={PERMISSION}
                          actionName="manage"
                          size="sm"
                          variant="outline"
                          onClick={() => setRemove({ open: true, id: w.id, notes: '' })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </PermissionButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No watchlist entries</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={add.open} onOpenChange={(o) => !o && setAdd((s) => ({ ...s, open: false }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Employer To Watchlist</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Employer Reg #</Label>
                <Input value={add.employer_id} onChange={(e) => setAdd((s) => ({ ...s, employer_id: e.target.value }))} />
              </div>
              <div>
                <Label>Employer Name (optional)</Label>
                <Input value={add.employer_name} onChange={(e) => setAdd((s) => ({ ...s, employer_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea rows={3} value={add.reason} onChange={(e) => setAdd((s) => ({ ...s, reason: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>End Date (optional)</Label>
                <Input type="date" value={add.end_date} onChange={(e) => setAdd((s) => ({ ...s, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={add.notes} onChange={(e) => setAdd((s) => ({ ...s, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdd((s) => ({ ...s, open: false }))}>Cancel</Button>
            <Button onClick={() => addMut.mutate()} disabled={!add.employer_id.trim() || !add.reason.trim() || addMut.isPending}>
              Add To Watchlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove dialog */}
      <Dialog open={remove.open} onOpenChange={(o) => !o && setRemove({ open: false, id: '', notes: '' })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove From Watchlist</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Removal Notes</Label>
            <Textarea rows={4} value={remove.notes} onChange={(e) => setRemove((s) => ({ ...s, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemove({ open: false, id: '', notes: '' })}>Cancel</Button>
            <Button onClick={() => removeMut.mutate()} disabled={!remove.notes.trim() || removeMut.isPending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
