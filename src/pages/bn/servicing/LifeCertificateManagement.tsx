/**
 * Screen 23: Life Certificate Management
 *
 * Real-data wiring against bn_life_certificate, joined to bn_award + ip_master.
 * Role visibility: Claims Officer, Pension Admin, Supervisor
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
import { Search, FileCheck2, AlertTriangle, Clock, CheckCircle2, Send, Filter, RefreshCw, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  fetchAwards,
  fetchClaimantsBySsns,
  fetchLifeCertificates,
  recordLifeCertificateReminder,
  verifyLifeCertificate,
  type BnAwardRow,
  type BnLifeCertificateRow,
  type ClaimantInfo,
} from '@/services/bn/awardServicingService';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  RECEIVED: { label: 'Received', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  OVERDUE: { label: 'Overdue', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  VERIFIED: { label: 'Verified', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
  WAIVED: { label: 'Waived', color: 'bg-muted text-muted-foreground border-muted' },
  SUSPENDED: { label: 'Suspended', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

interface EnrichedCert extends BnLifeCertificateRow {
  awardNumber: string | null;
  ssn: string;
  benefitCode: string | null;
  claimantName: string;
}

const LifeCertificateManagement: React.FC = () => {
  const { isAuthReady, isAuthenticated, profile, hasAnyRole } = useSupabaseAuth();
  const canAct = hasAnyRole(['admin', 'supervisor', 'claims_officer', 'pension_admin', 'BN_PAYMENT_OFFICER', 'BN_MANAGER']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rows, setRows] = useState<EnrichedCert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<EnrichedCert | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [certs, awards] = await Promise.all([fetchLifeCertificates(), fetchAwards()]);
      const awardMap = new Map(awards.map((a) => [a.id, a] as const));
      const ssns = certs.map((c) => awardMap.get(c.bn_award_id)?.ssn).filter(Boolean) as string[];
      const claimants = await fetchClaimantsBySsns(ssns);
      const enriched: EnrichedCert[] = certs.map((c) => {
        const a = awardMap.get(c.bn_award_id) as BnAwardRow | undefined;
        const ssn = a?.ssn ?? '';
        return {
          ...c,
          awardNumber: a?.award_number ?? null,
          ssn,
          benefitCode: a?.benefit_code ?? null,
          claimantName: claimants[ssn]?.full_name ?? ssn,
        };
      });
      setRows(enriched);
    } catch (e) {
      console.error(e);
      toast.error('Unable to load life certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && isAuthenticated) void load();
  }, [isAuthReady, isAuthenticated]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const matchSearch =
          !search ||
          r.claimantName.toLowerCase().includes(search.toLowerCase()) ||
          r.ssn.includes(search) ||
          (r.awardNumber ?? '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [rows, search, statusFilter]
  );

  const counts = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.status === 'PENDING').length,
      overdue: rows.filter((r) => r.status === 'OVERDUE').length,
      received: rows.filter((r) => r.status === 'RECEIVED').length,
      verified: rows.filter((r) => r.status === 'VERIFIED').length,
      suspended: rows.filter((r) => r.status === 'SUSPENDED').length,
    }),
    [rows]
  );

  const doVerify = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await verifyLifeCertificate(selected.id, profile?.user_code ?? null, verifyNotes || null);
      toast.success(`Life certificate for ${selected.claimantName} verified`);
      setVerifyOpen(false);
      setVerifyNotes('');
      setSelected(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const doReminder = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await recordLifeCertificateReminder(selected.id, profile?.user_code ?? null);
      toast.success(`Reminder logged for ${selected.claimantName}`);
      setReminderOpen(false);
      setSelected(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Reminder failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-page-title">Life Certificate Management</h1>
          <p className="t-page-subtitle mt-1 mt-1">Track and verify proof-of-life for ongoing pension and long-term awards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: FileCheck2, color: 'text-foreground', key: 'all' },
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-blue-600', key: 'PENDING' },
          { label: 'Received', value: counts.received, icon: FileCheck2, color: 'text-amber-600', key: 'RECEIVED' },
          { label: 'Verified', value: counts.verified, icon: CheckCircle2, color: 'text-emerald-600', key: 'VERIFIED' },
          { label: 'Overdue', value: counts.overdue, icon: AlertTriangle, color: 'text-destructive', key: 'OVERDUE' },
          { label: 'Suspended', value: counts.suspended, icon: AlertTriangle, color: 'text-destructive', key: 'SUSPENDED' },
        ].map((kpi) => (
          <Card key={kpi.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(kpi.key)}>
            <CardContent className="p-3 flex items-center gap-3">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SSN, or award ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Award</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No life certificate records</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className={r.status === 'OVERDUE' ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-mono text-xs">{r.awardNumber ?? r.bn_award_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono">{r.ssn}</TableCell>
                    <TableCell className="font-medium">{r.claimantName}</TableCell>
                    <TableCell>{r.benefitCode ?? '—'}</TableCell>
                    <TableCell>{r.due_date}</TableCell>
                    <TableCell>{r.submitted_date ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[r.status]?.color ?? ''}>
                        {statusConfig[r.status]?.label ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {canAct && r.status === 'RECEIVED' && (
                        <Button size="sm" variant="outline" onClick={() => { setSelected(r); setVerifyOpen(true); }}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Verify
                        </Button>
                      )}
                      {canAct && ['PENDING', 'OVERDUE'].includes(r.status) && (
                        <Button size="sm" variant="outline" onClick={() => { setSelected(r); setReminderOpen(true); }}>
                          <Send className="h-3 w-3 mr-1" />Remind
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Life Certificate</DialogTitle>
            <DialogDescription>Confirm receipt and verify the life certificate for {selected?.claimantName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Award:</span> {selected?.awardNumber ?? selected?.bn_award_id.slice(0, 8)}</div>
              <div><span className="text-muted-foreground">SSN:</span> {selected?.ssn}</div>
              <div><span className="text-muted-foreground">Benefit:</span> {selected?.benefitCode ?? '—'}</div>
              <div><span className="text-muted-foreground">Due:</span> {selected?.due_date}</div>
            </div>
            <Textarea placeholder="Verification notes (optional)..." value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={doVerify} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirm Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Life Certificate Reminder</DialogTitle>
            <DialogDescription>Log a reminder for {selected?.claimantName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p>This will record a reminder note on the certificate so cashier/contact staff can follow up.</p>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <div><span className="text-muted-foreground">Due Date:</span> {selected?.due_date}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={doReminder} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Log Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LifeCertificateManagement;
