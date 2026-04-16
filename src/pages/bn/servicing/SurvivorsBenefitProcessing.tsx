/**
 * Screen 27: Survivors' Benefit Processing
 * 
 * Manages the end-to-end workflow for survivors' benefit claims:
 * deceased verification, dependant identification, share allocation,
 * ongoing eligibility, and payment setup.
 * Integrates with existing Survivors' configuration rules.
 * Role visibility: Claims Officer, Pension Admin, Supervisor
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Search, Users, UserCheck, AlertTriangle, CheckCircle2,
  Clock, FileText, Filter, ArrowRight, Heart, Shield
} from 'lucide-react';
import { toast } from 'sonner';

type SurvivorCaseStatus = 'INTAKE' | 'DECEASED_VERIFIED' | 'DEPENDANTS_IDENTIFIED' | 'SHARES_ALLOCATED' | 'APPROVED' | 'IN_PAYMENT' | 'CLOSED' | 'DENIED';

interface SurvivorCase {
  id: string;
  claimId: string;
  deceasedSsn: string;
  deceasedName: string;
  dateOfDeath: string;
  lastContribution: string;
  totalWeeks: number;
  dependantCount: number;
  totalSharePercent: number;
  weeklyBenefitBase: number;
  status: SurvivorCaseStatus;
  createdDate: string;
  assignedTo: string | null;
}

interface SurvivorDependant {
  id: string;
  caseId: string;
  ssn: string | null;
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  sharePercent: number;
  eligible: boolean;
  eligibilityNotes: string | null;
  paymentStatus: 'PENDING' | 'ACTIVE' | 'CEASED';
}

const MOCK_CASES: SurvivorCase[] = [
  { id: 'SC-001', claimId: 'BN-2026-000301', deceasedSsn: '100999', deceasedName: 'Henry Wallace', dateOfDeath: '2026-03-10', lastContribution: '2026-02', totalWeeks: 780, dependantCount: 3, totalSharePercent: 100, weeklyBenefitBase: 420.00, status: 'SHARES_ALLOCATED', createdDate: '2026-03-15', assignedTo: 'JM' },
  { id: 'SC-002', claimId: 'BN-2026-000310', deceasedSsn: '100888', deceasedName: 'Margaret Lewis', dateOfDeath: '2026-04-01', lastContribution: '2026-03', totalWeeks: 1200, dependantCount: 1, totalSharePercent: 50, weeklyBenefitBase: 380.00, status: 'INTAKE', createdDate: '2026-04-05', assignedTo: null },
  { id: 'SC-003', claimId: 'BN-2025-000250', deceasedSsn: '100777', deceasedName: 'Robert Francis', dateOfDeath: '2025-11-20', lastContribution: '2025-10', totalWeeks: 520, dependantCount: 4, totalSharePercent: 100, weeklyBenefitBase: 350.00, status: 'IN_PAYMENT', createdDate: '2025-12-01', assignedTo: 'SK' },
  { id: 'SC-004', claimId: 'BN-2026-000315', deceasedSsn: '100666', deceasedName: 'James Patterson', dateOfDeath: '2026-04-10', lastContribution: '2025-06', totalWeeks: 120, dependantCount: 2, totalSharePercent: 0, weeklyBenefitBase: 0, status: 'DENIED', createdDate: '2026-04-12', assignedTo: 'JM' },
];

const MOCK_DEPENDANTS: Record<string, SurvivorDependant[]> = {
  'SC-001': [
    { id: 'SD-01', caseId: 'SC-001', ssn: '100501', fullName: 'Clara Wallace', relationship: 'Spouse', dateOfBirth: '1975-08-12', sharePercent: 50, eligible: true, eligibilityNotes: null, paymentStatus: 'PENDING' },
    { id: 'SD-02', caseId: 'SC-001', ssn: '100502', fullName: 'Michael Wallace', relationship: 'Child', dateOfBirth: '2010-03-20', sharePercent: 25, eligible: true, eligibilityNotes: 'Under 18 — eligible', paymentStatus: 'PENDING' },
    { id: 'SD-03', caseId: 'SC-001', ssn: '100503', fullName: 'Sophia Wallace', relationship: 'Child', dateOfBirth: '2008-11-05', sharePercent: 25, eligible: true, eligibilityNotes: 'Under 18 — eligible', paymentStatus: 'PENDING' },
  ],
  'SC-003': [
    { id: 'SD-04', caseId: 'SC-003', ssn: '100701', fullName: 'Edith Francis', relationship: 'Spouse', dateOfBirth: '1968-05-22', sharePercent: 50, eligible: true, eligibilityNotes: null, paymentStatus: 'ACTIVE' },
    { id: 'SD-05', caseId: 'SC-003', ssn: null, fullName: 'Thomas Francis', relationship: 'Child', dateOfBirth: '2012-01-15', sharePercent: 16.67, eligible: true, eligibilityNotes: 'Under 18', paymentStatus: 'ACTIVE' },
    { id: 'SD-06', caseId: 'SC-003', ssn: null, fullName: 'Lisa Francis', relationship: 'Child', dateOfBirth: '2014-07-30', sharePercent: 16.67, eligible: true, eligibilityNotes: 'Under 18', paymentStatus: 'ACTIVE' },
    { id: 'SD-07', caseId: 'SC-003', ssn: null, fullName: 'Mark Francis', relationship: 'Child', dateOfBirth: '2005-09-10', sharePercent: 16.66, eligible: true, eligibilityNotes: 'Over 18 — student verification pending', paymentStatus: 'ACTIVE' },
  ],
};

const statusConfig: Record<SurvivorCaseStatus, { label: string; color: string; step: number }> = {
  INTAKE: { label: 'Intake', color: 'bg-blue-500/10 text-blue-700 border-blue-300', step: 1 },
  DECEASED_VERIFIED: { label: 'Deceased Verified', color: 'bg-blue-500/10 text-blue-700 border-blue-300', step: 2 },
  DEPENDANTS_IDENTIFIED: { label: 'Dependants ID\'d', color: 'bg-amber-500/10 text-amber-700 border-amber-300', step: 3 },
  SHARES_ALLOCATED: { label: 'Shares Set', color: 'bg-amber-500/10 text-amber-700 border-amber-300', step: 4 },
  APPROVED: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300', step: 5 },
  IN_PAYMENT: { label: 'In Payment', color: 'bg-emerald-600/10 text-emerald-700 border-emerald-400', step: 6 },
  CLOSED: { label: 'Closed', color: 'bg-muted text-muted-foreground border-muted', step: 7 },
  DENIED: { label: 'Denied', color: 'bg-destructive/10 text-destructive border-destructive/30', step: 0 },
};

const SurvivorsBenefitProcessing: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cases] = useState<SurvivorCase[]>(MOCK_CASES);
  const [selectedCase, setSelectedCase] = useState<SurvivorCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => cases.filter(c => {
    const matchSearch = !search || c.deceasedName.toLowerCase().includes(search.toLowerCase()) || c.deceasedSsn.includes(search) || c.claimId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  }), [cases, search, statusFilter]);

  const counts = useMemo(() => ({
    active: cases.filter(c => !['CLOSED', 'DENIED'].includes(c.status)).length,
    intake: cases.filter(c => c.status === 'INTAKE').length,
    inPayment: cases.filter(c => c.status === 'IN_PAYMENT').length,
  }), [cases]);

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const dependants = selectedCase ? (MOCK_DEPENDANTS[selectedCase.id] || []) : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="h-6 w-6" />Survivors' Benefit Processing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage survivor claims: deceased verification, dependant shares, and payments</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Cases</p><p className="text-2xl font-bold">{counts.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Awaiting Intake</p><p className="text-2xl font-bold text-blue-600">{counts.intake}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Payment</p><p className="text-2xl font-bold text-emerald-600">{counts.inPayment}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by deceased name, SSN, or claim ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
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
                <TableHead>Claim ID</TableHead>
                <TableHead>Deceased</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Date of Death</TableHead>
                <TableHead>Weeks</TableHead>
                <TableHead>Dependants</TableHead>
                <TableHead className="text-right">Base Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No cases found</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.claimId}</TableCell>
                  <TableCell className="font-medium">{c.deceasedName}</TableCell>
                  <TableCell className="font-mono">{c.deceasedSsn}</TableCell>
                  <TableCell>{c.dateOfDeath}</TableCell>
                  <TableCell>{c.totalWeeks}</TableCell>
                  <TableCell className="text-center">{c.dependantCount}</TableCell>
                  <TableCell className="text-right font-mono">{c.weeklyBenefitBase > 0 ? fmt(c.weeklyBenefitBase) : '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={statusConfig[c.status].color}>{statusConfig[c.status].label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedCase(c); setDetailOpen(true); }}>
                      <FileText className="h-3 w-3 mr-1" />View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survivors' Case — {selectedCase?.claimId}</DialogTitle>
            <DialogDescription>Deceased: {selectedCase?.deceasedName} (SSN: {selectedCase?.deceasedSsn})</DialogDescription>
          </DialogHeader>

          {selectedCase && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="dependants">Dependants ({dependants.length})</TabsTrigger>
                <TabsTrigger value="timeline">Progress</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date of Death:</span> {selectedCase.dateOfDeath}</div>
                  <div><span className="text-muted-foreground">Last Contribution:</span> {selectedCase.lastContribution}</div>
                  <div><span className="text-muted-foreground">Total Weeks:</span> {selectedCase.totalWeeks}</div>
                  <div><span className="text-muted-foreground">Weekly Benefit Base:</span> {fmt(selectedCase.weeklyBenefitBase)}</div>
                  <div><span className="text-muted-foreground">Dependant Count:</span> {selectedCase.dependantCount}</div>
                  <div><span className="text-muted-foreground">Total Share:</span> {selectedCase.totalSharePercent}%</div>
                  <div><span className="text-muted-foreground">Assigned To:</span> {selectedCase.assignedTo || 'Unassigned'}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={statusConfig[selectedCase.status].color}>{statusConfig[selectedCase.status].label}</Badge></div>
                </div>
              </TabsContent>

              <TabsContent value="dependants" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>Share %</TableHead>
                      <TableHead>Weekly Amount</TableHead>
                      <TableHead>Eligible</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dependants.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.fullName}</TableCell>
                        <TableCell>{d.relationship}</TableCell>
                        <TableCell>{d.dateOfBirth}</TableCell>
                        <TableCell>{d.sharePercent.toFixed(2)}%</TableCell>
                        <TableCell className="font-mono">{fmt(selectedCase.weeklyBenefitBase * d.sharePercent / 100)}</TableCell>
                        <TableCell>
                          {d.eligible
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <AlertTriangle className="h-4 w-4 text-destructive" />
                          }
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{d.paymentStatus}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {dependants.length > 0 && (
                  <div className="mt-3 text-sm text-muted-foreground text-right">
                    Total allocated: {dependants.reduce((s, d) => s + d.sharePercent, 0).toFixed(2)}% of {fmt(selectedCase.weeklyBenefitBase)}/week
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-3">
                  {Object.entries(statusConfig).filter(([k]) => k !== 'DENIED').map(([key, cfg]) => {
                    const current = statusConfig[selectedCase.status].step;
                    const isComplete = cfg.step > 0 && cfg.step < current;
                    const isCurrent = cfg.step === current;
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-md border ${isCurrent ? 'border-primary bg-primary/5' : isComplete ? 'border-emerald-300 bg-emerald-50/50' : 'border-muted'}`}>
                        {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : isCurrent ? <Clock className="h-4 w-4 text-primary" /> : <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                        <span className={`text-sm ${isCurrent ? 'font-semibold' : isComplete ? 'text-emerald-700' : 'text-muted-foreground'}`}>{cfg.label}</span>
                        {isCurrent && <Badge className="ml-auto text-xs">Current</Badge>}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {selectedCase && !['CLOSED', 'DENIED', 'IN_PAYMENT'].includes(selectedCase.status) && (
              <Button onClick={() => { toast.success('Case advanced to next stage'); setDetailOpen(false); }}>
                <ArrowRight className="h-4 w-4 mr-1" />Advance Stage
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SurvivorsBenefitProcessing;
