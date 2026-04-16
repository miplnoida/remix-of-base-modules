/**
 * Screen 23: Life Certificate Management
 * 
 * Manages proof-of-life / life certificate tracking for ongoing pension & long-term awards.
 * Tracks due dates, submissions, overdue items, and generates reminder notifications.
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, FileCheck2, AlertTriangle, Clock, CheckCircle2,
  Send, Calendar, User, Filter, RefreshCw, Download
} from 'lucide-react';
import { toast } from 'sonner';

type CertStatus = 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'VERIFIED' | 'WAIVED' | 'SUSPENDED';

interface LifeCertRecord {
  id: string;
  awardId: string;
  ssn: string;
  fullName: string;
  benefitType: string;
  dueDate: string;
  receivedDate: string | null;
  verifiedDate: string | null;
  verifiedBy: string | null;
  status: CertStatus;
  cycleYear: number;
  remindersSent: number;
  notes: string | null;
}

const MOCK_CERTS: LifeCertRecord[] = [
  { id: 'LC-001', awardId: 'AWD-2024-001', ssn: '100234', fullName: 'John Williams', benefitType: 'Age Pension', dueDate: '2026-03-15', receivedDate: '2026-03-10', verifiedDate: '2026-03-12', verifiedBy: 'SJ', status: 'VERIFIED', cycleYear: 2026, remindersSent: 0, notes: null },
  { id: 'LC-002', awardId: 'AWD-2024-005', ssn: '100456', fullName: 'Mary Johnson', benefitType: 'Invalidity Pension', dueDate: '2026-04-01', receivedDate: null, verifiedDate: null, verifiedBy: null, status: 'OVERDUE', cycleYear: 2026, remindersSent: 2, notes: 'Second reminder sent 2026-04-10' },
  { id: 'LC-003', awardId: 'AWD-2025-012', ssn: '100789', fullName: 'David Brown', benefitType: 'Survivors Pension', dueDate: '2026-06-30', receivedDate: null, verifiedDate: null, verifiedBy: null, status: 'PENDING', cycleYear: 2026, remindersSent: 0, notes: null },
  { id: 'LC-004', awardId: 'AWD-2023-003', ssn: '100112', fullName: 'Grace Thomas', benefitType: 'Age Pension', dueDate: '2026-02-28', receivedDate: null, verifiedDate: null, verifiedBy: null, status: 'SUSPENDED', cycleYear: 2026, remindersSent: 3, notes: 'Award suspended due to non-compliance' },
  { id: 'LC-005', awardId: 'AWD-2024-009', ssn: '100345', fullName: 'Robert Charles', benefitType: 'Invalidity Pension', dueDate: '2026-05-15', receivedDate: null, verifiedDate: null, verifiedBy: null, status: 'PENDING', cycleYear: 2026, remindersSent: 0, notes: null },
  { id: 'LC-006', awardId: 'AWD-2022-018', ssn: '100678', fullName: 'Anna Phillip', benefitType: 'Age Pension', dueDate: '2026-04-30', receivedDate: '2026-04-20', verifiedDate: null, verifiedBy: null, status: 'RECEIVED', cycleYear: 2026, remindersSent: 1, notes: null },
];

const statusConfig: Record<CertStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  RECEIVED: { label: 'Received', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  OVERDUE: { label: 'Overdue', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  VERIFIED: { label: 'Verified', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
  WAIVED: { label: 'Waived', color: 'bg-muted text-muted-foreground border-muted' },
  SUSPENDED: { label: 'Suspended', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const LifeCertificateManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [records] = useState<LifeCertRecord[]>(MOCK_CERTS);
  const [selectedRecord, setSelectedRecord] = useState<LifeCertRecord | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.ssn.includes(search) || r.awardId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  const counts = useMemo(() => ({
    total: records.length,
    pending: records.filter(r => r.status === 'PENDING').length,
    overdue: records.filter(r => r.status === 'OVERDUE').length,
    received: records.filter(r => r.status === 'RECEIVED').length,
    verified: records.filter(r => r.status === 'VERIFIED').length,
    suspended: records.filter(r => r.status === 'SUSPENDED').length,
  }), [records]);

  const handleVerify = () => {
    if (!selectedRecord) return;
    toast.success(`Life certificate for ${selectedRecord.fullName} verified`);
    setVerifyOpen(false);
    setVerifyNotes('');
    setSelectedRecord(null);
  };

  const handleSendReminder = () => {
    if (!selectedRecord) return;
    toast.success(`Reminder sent to ${selectedRecord.fullName} (${selectedRecord.ssn})`);
    setReminderOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Life Certificate Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and verify proof-of-life for ongoing pension and long-term awards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: FileCheck2, color: 'text-foreground' },
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-blue-600' },
          { label: 'Received', value: counts.received, icon: FileCheck2, color: 'text-amber-600' },
          { label: 'Verified', value: counts.verified, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Overdue', value: counts.overdue, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Suspended', value: counts.suspended, icon: AlertTriangle, color: 'text-destructive' },
        ].map(kpi => (
          <Card key={kpi.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(kpi.label === 'Total' ? 'all' : kpi.label.toUpperCase())}>
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SSN, or award ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                <TableHead>Award ID</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reminders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className={r.status === 'OVERDUE' ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-mono text-xs">{r.awardId}</TableCell>
                  <TableCell className="font-mono">{r.ssn}</TableCell>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell>{r.benefitType}</TableCell>
                  <TableCell>{r.dueDate}</TableCell>
                  <TableCell>{r.receivedDate || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={statusConfig[r.status].color}>{statusConfig[r.status].label}</Badge></TableCell>
                  <TableCell className="text-center">{r.remindersSent}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.status === 'RECEIVED' && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRecord(r); setVerifyOpen(true); }}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Verify
                      </Button>
                    )}
                    {['PENDING', 'OVERDUE'].includes(r.status) && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRecord(r); setReminderOpen(true); }}>
                        <Send className="h-3 w-3 mr-1" />Remind
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verify Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Life Certificate</DialogTitle>
            <DialogDescription>Confirm receipt and verify the life certificate for {selectedRecord?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Award:</span> {selectedRecord?.awardId}</div>
              <div><span className="text-muted-foreground">SSN:</span> {selectedRecord?.ssn}</div>
              <div><span className="text-muted-foreground">Benefit:</span> {selectedRecord?.benefitType}</div>
              <div><span className="text-muted-foreground">Received:</span> {selectedRecord?.receivedDate}</div>
            </div>
            <Textarea placeholder="Verification notes (optional)..." value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button>
            <Button onClick={handleVerify}><CheckCircle2 className="h-4 w-4 mr-1" />Confirm Verification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Life Certificate Reminder</DialogTitle>
            <DialogDescription>Send a reminder notification to {selectedRecord?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p>This will send an SMS/email reminder to the beneficiary requesting submission of their life certificate.</p>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <div><span className="text-muted-foreground">Due Date:</span> {selectedRecord?.dueDate}</div>
              <div><span className="text-muted-foreground">Previous Reminders:</span> {selectedRecord?.remindersSent}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>Cancel</Button>
            <Button onClick={handleSendReminder}><Send className="h-4 w-4 mr-1" />Send Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LifeCertificateManagement;
