/**
 * Screen 25: Overpayment Recovery
 * 
 * Manages detection, registration, and recovery of benefit overpayments.
 * Supports installment plans, deductions from ongoing awards, and write-offs.
 * Role visibility: Claims Officer, Finance Officer, Supervisor, Admin
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
import { Progress } from '@/components/ui/progress';
import {
  Search, DollarSign, AlertTriangle, ArrowDownRight, CheckCircle2,
  Filter, TrendingDown, Banknote, FileX2, Plus
} from 'lucide-react';
import { toast } from 'sonner';

type OverpaymentStatus = 'DETECTED' | 'CONFIRMED' | 'RECOVERY_PLAN' | 'RECOVERING' | 'RECOVERED' | 'WRITTEN_OFF' | 'DISPUTED';

interface OverpaymentRecord {
  id: string;
  claimId: string;
  awardId: string;
  ssn: string;
  fullName: string;
  benefitType: string;
  overpaymentAmount: number;
  recoveredAmount: number;
  reason: string;
  detectedDate: string;
  recoveryMethod: 'DEDUCTION' | 'INSTALLMENT' | 'LUMP_SUM' | 'WRITE_OFF' | null;
  monthlyDeduction: number | null;
  status: OverpaymentStatus;
  notes: string | null;
}

const MOCK_DATA: OverpaymentRecord[] = [
  { id: 'OP-001', claimId: 'BN-2025-000123', awardId: 'AWD-2024-005', ssn: '100456', fullName: 'Mary Johnson', benefitType: 'Invalidity Pension', overpaymentAmount: 4500.00, recoveredAmount: 1500.00, reason: 'Returned to work — unreported', detectedDate: '2026-02-10', recoveryMethod: 'DEDUCTION', monthlyDeduction: 375.00, status: 'RECOVERING', notes: null },
  { id: 'OP-002', claimId: 'BN-2025-000089', awardId: 'AWD-2023-012', ssn: '100234', fullName: 'John Williams', benefitType: 'Sickness', overpaymentAmount: 1200.00, recoveredAmount: 0, reason: 'Calculation error — wrong rate applied', detectedDate: '2026-03-15', recoveryMethod: null, monthlyDeduction: null, status: 'CONFIRMED', notes: 'Awaiting recovery plan approval' },
  { id: 'OP-003', claimId: 'BN-2024-000045', awardId: 'AWD-2024-001', ssn: '100789', fullName: 'David Brown', benefitType: 'Age Pension', overpaymentAmount: 800.00, recoveredAmount: 800.00, reason: 'Duplicate payment in batch', detectedDate: '2025-12-01', recoveryMethod: 'LUMP_SUM', monthlyDeduction: null, status: 'RECOVERED', notes: 'Voluntary repayment received' },
  { id: 'OP-004', claimId: 'BN-2025-000200', awardId: 'AWD-2025-008', ssn: '100345', fullName: 'Robert Charles', benefitType: 'Employment Injury', overpaymentAmount: 2300.00, recoveredAmount: 0, reason: 'Employer verification discrepancy', detectedDate: '2026-04-01', recoveryMethod: null, monthlyDeduction: null, status: 'DISPUTED', notes: 'Contributor disputes the overpayment' },
  { id: 'OP-005', claimId: 'BN-2024-000012', awardId: 'AWD-2023-003', ssn: '100112', fullName: 'Grace Thomas', benefitType: 'Survivors Pension', overpaymentAmount: 350.00, recoveredAmount: 0, reason: 'Beneficiary deceased — payment continued', detectedDate: '2026-01-20', recoveryMethod: 'WRITE_OFF', monthlyDeduction: null, status: 'WRITTEN_OFF', notes: 'Amount below threshold — approved for write-off' },
];

const statusConfig: Record<OverpaymentStatus, { label: string; color: string }> = {
  DETECTED: { label: 'Detected', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  RECOVERY_PLAN: { label: 'Plan Set', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  RECOVERING: { label: 'Recovering', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
  RECOVERED: { label: 'Recovered', color: 'bg-emerald-600/10 text-emerald-700 border-emerald-400' },
  WRITTEN_OFF: { label: 'Written Off', color: 'bg-muted text-muted-foreground border-muted' },
  DISPUTED: { label: 'Disputed', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const OverpaymentRecovery: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [records] = useState<OverpaymentRecord[]>(MOCK_DATA);
  const [selectedRecord, setSelectedRecord] = useState<OverpaymentRecord | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<string>('DEDUCTION');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  const filtered = useMemo(() => records.filter(r => {
    const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.ssn.includes(search) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  }), [records, search, statusFilter]);

  const totals = useMemo(() => ({
    totalOwed: records.reduce((s, r) => s + r.overpaymentAmount, 0),
    totalRecovered: records.reduce((s, r) => s + r.recoveredAmount, 0),
    activeRecoveries: records.filter(r => r.status === 'RECOVERING').length,
    disputed: records.filter(r => r.status === 'DISPUTED').length,
  }), [records]);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="h-6 w-6" />Overpayment Recovery</h1>
          <p className="text-sm text-muted-foreground mt-1">Detect, track, and recover benefit overpayments</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-1" />Register Overpayment</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Owed</p>
            <p className="text-2xl font-bold text-destructive">{fmt(totals.totalOwed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Recovered</p>
            <p className="text-2xl font-bold text-emerald-600">{fmt(totals.totalRecovered)}</p>
            <Progress value={(totals.totalRecovered / totals.totalOwed) * 100} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Recoveries</p>
            <p className="text-2xl font-bold">{totals.activeRecoveries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Disputed</p>
            <p className="text-2xl font-bold text-amber-600">{totals.disputed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SSN, or case ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
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
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="font-mono">{r.ssn}</TableCell>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell className="text-sm">{r.benefitType}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{fmt(r.overpaymentAmount)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{fmt(r.recoveredAmount)}</TableCell>
                  <TableCell className="text-sm">{r.recoveryMethod?.replace('_', ' ') || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={statusConfig[r.status].color}>{statusConfig[r.status].label}</Badge></TableCell>
                  <TableCell className="text-right">
                    {['CONFIRMED', 'DETECTED'].includes(r.status) && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRecord(r); setPlanOpen(true); }}>
                        <Banknote className="h-3 w-3 mr-1" />Set Plan
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recovery Plan Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Recovery Plan</DialogTitle>
            <DialogDescription>Configure the repayment method for {selectedRecord?.fullName} — {fmt(selectedRecord?.overpaymentAmount || 0)}</DialogDescription>
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
                <Input type="number" min="0" step="0.01" value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} />
                {monthlyAmount && selectedRecord && (
                  <p className="text-xs text-muted-foreground">
                    Estimated recovery: {Math.ceil(selectedRecord.overpaymentAmount / parseFloat(monthlyAmount || '1'))} months
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} placeholder="Justification or special instructions..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Recovery plan saved'); setPlanOpen(false); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OverpaymentRecovery;
