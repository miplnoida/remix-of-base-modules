/**
 * Screen 25: Overpayment Recovery
 *
 * Real-data wiring against bn_overpayment + bn_award + ip_master.
 * Role visibility: Claims Officer, Finance Officer, Supervisor, Admin
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
import { Progress } from '@/components/ui/progress';
import { Search, CheckCircle2, Filter, TrendingDown, Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  fetchAwards,
  fetchClaimantsBySsns,
  fetchOverpayments,
  setOverpaymentRecoveryPlan,
  type BnAwardRow,
  type BnOverpaymentRow,
} from '@/services/bn/awardServicingService';

import { formatNumber } from '@/lib/culture/culture';
import ReferToLegalButton from '@/components/legal/lg/ReferToLegalButton';
const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  DETECTED: { label: 'Detected', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  RECOVERY_PLAN: { label: 'Plan Set', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  RECOVERING: { label: 'Recovering', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
  RECOVERED: { label: 'Recovered', color: 'bg-emerald-600/10 text-emerald-700 border-emerald-400' },
  WRITTEN_OFF: { label: 'Written Off', color: 'bg-muted text-muted-foreground border-muted' },
  DISPUTED: { label: 'Disputed', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

interface EnrichedOP extends BnOverpaymentRow {
  awardNumber: string | null;
  ssn: string;
  benefitCode: string | null;
  claimantName: string;
}

const fmt = (n: number) => `$${formatNumber((n ?? 0), 2)}`;

const OverpaymentRecovery: React.FC = () => {
  const { isAuthReady, isAuthenticated, profile, hasAnyRole } = useSupabaseAuth();
  const canAct = hasAnyRole(['admin', 'supervisor', 'claims_officer', 'finance_officer', 'BN_FINANCE_OFFICER', 'BN_MANAGER', 'BN_DIRECTOR']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rows, setRows] = useState<EnrichedOP[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<EnrichedOP | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<string>('DEDUCTION');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ops, awards] = await Promise.all([fetchOverpayments(), fetchAwards()]);
      const awardMap = new Map(awards.map((a) => [a.id, a] as const));
      const ssns = ops.map((o) => awardMap.get(o.bn_award_id)?.ssn).filter(Boolean) as string[];
      const claimants = await fetchClaimantsBySsns(ssns);
      const enriched: EnrichedOP[] = ops.map((o) => {
        const a = awardMap.get(o.bn_award_id) as BnAwardRow | undefined;
        const ssn = a?.ssn ?? '';
        return {
          ...o,
          awardNumber: a?.award_number ?? null,
          ssn,
          benefitCode: a?.benefit_code ?? null,
          claimantName: claimants[ssn]?.full_name ?? ssn,
        };
      });
      setRows(enriched);
    } catch (e) {
      console.error(e);
      toast.error('Unable to load overpayments');
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
        const matchSearch = !search || r.claimantName.toLowerCase().includes(search.toLowerCase()) || r.ssn.includes(search) || r.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || r.recovery_status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [rows, search, statusFilter]
  );

  const totals = useMemo(
    () => ({
      totalOwed: rows.reduce((s, r) => s + (r.original_amount ?? 0), 0),
      totalRecovered: rows.reduce((s, r) => s + (r.recovered_amount ?? 0), 0),
      activeRecoveries: rows.filter((r) => r.recovery_status === 'RECOVERING').length,
      disputed: rows.filter((r) => r.recovery_status === 'DISPUTED').length,
    }),
    [rows]
  );

  const doSavePlan = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await setOverpaymentRecoveryPlan(
        selected.id,
        recoveryMethod,
        monthlyAmount ? parseFloat(monthlyAmount) : null,
        planNotes || null,
        profile?.user_code ?? null
      );
      toast.success('Recovery plan saved');
      setPlanOpen(false);
      setMonthlyAmount(''); setPlanNotes(''); setRecoveryMethod('DEDUCTION');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-page-title flex items-center gap-2"><TrendingDown className="h-6 w-6" />Overpayment Recovery</h1>
          <p className="text-sm text-muted-foreground mt-1">Detect, track, and recover benefit overpayments</p>
        </div>
        <ReferToLegalButton module="benefits" reasonCode="BENEFIT_OVERPAYMENT" matter="BENEFIT_OVERPAYMENT" />
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Owed</p><p className="text-2xl font-bold text-destructive">{fmt(totals.totalOwed)}</p></CardContent></Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Recovered</p>
            <p className="text-2xl font-bold text-emerald-600">{fmt(totals.totalRecovered)}</p>
            <Progress value={totals.totalOwed > 0 ? (totals.totalRecovered / totals.totalOwed) * 100 : 0} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Recoveries</p><p className="text-2xl font-bold">{totals.activeRecoveries}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Disputed</p><p className="text-2xl font-bold text-amber-600">{totals.disputed}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SSN, or case ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <TableHead>Case</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Owed</TableHead>
                <TableHead className="text-right">Recovered</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No overpayments on record</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono">{r.ssn}</TableCell>
                    <TableCell className="font-medium">{r.claimantName}</TableCell>
                    <TableCell className="text-sm">{r.benefitCode ?? '—'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.reason_code ?? r.remarks ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{fmt(r.original_amount)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{fmt(r.recovered_amount ?? 0)}</TableCell>
                    <TableCell className="text-sm">{r.recovery_method?.replace('_', ' ') ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={statusConfig[r.recovery_status]?.color ?? ''}>{statusConfig[r.recovery_status]?.label ?? r.recovery_status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canAct && ['OPEN', 'DETECTED', 'CONFIRMED'].includes(r.recovery_status) && (
                          <Button size="sm" variant="outline" onClick={() => { setSelected(r); setPlanOpen(true); }}>
                            <Banknote className="h-3 w-3 mr-1" />Set Plan
                          </Button>
                        )}
                        {r.ssn && (
                          <ReferToLegalButton
                            module="benefits"
                            reasonCode="BENEFIT_OVERPAYMENT"
                            matter="BENEFIT_OVERPAYMENT"
                            label="Legal"
                            variant="ghost"
                          />
                        )}
                      </div>
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Recovery Plan</DialogTitle>
            <DialogDescription>Configure the repayment method for {selected?.claimantName} — {fmt(selected?.original_amount ?? 0)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Recovery Method</Label>
              <Select value={recoveryMethod} onValueChange={setRecoveryMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEDUCTION">Deduction from Award</SelectItem>
                  <SelectItem value="INSTALLMENT">Installment Plan</SelectItem>
                  <SelectItem value="LUMP_SUM">Lump Sum Repayment</SelectItem>
                  <SelectItem value="WRITE_OFF">Write Off (requires approval)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {['DEDUCTION', 'INSTALLMENT'].includes(recoveryMethod) && (
              <div className="space-y-2">
                <Label>Monthly Amount ($)</Label>
                <Input type="number" min="0" step="0.01" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} />
                {monthlyAmount && selected && (
                  <p className="text-xs text-muted-foreground">
                    Estimated recovery: {Math.ceil((selected.original_amount ?? 0) / parseFloat(monthlyAmount || '1'))} months
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} placeholder="Justification or special instructions..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={doSavePlan} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OverpaymentRecovery;
