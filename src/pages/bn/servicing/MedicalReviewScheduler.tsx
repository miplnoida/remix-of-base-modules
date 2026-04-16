/**
 * Screen 24: Medical Review Scheduler
 * 
 * Manages periodic medical reviews for invalidity and injury benefits.
 * Tracks scheduling, outcomes, disability ratings, and next review dates.
 * Integrates with Medical Board for complex cases.
 * Role visibility: Claims Officer, Medical Admin, Supervisor
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
import {
  Search, Stethoscope, Calendar, AlertTriangle, CheckCircle2,
  Clock, User, Filter, FileText, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

type ReviewStatus = 'SCHEDULED' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'REFERRED_BOARD' | 'PENDING_SCHEDULE';

interface MedicalReview {
  id: string;
  awardId: string;
  ssn: string;
  fullName: string;
  benefitType: string;
  reviewType: 'PERIODIC' | 'INITIAL' | 'BOARD_REFERRAL' | 'REASSESSMENT';
  scheduledDate: string | null;
  completedDate: string | null;
  outcome: string | null;
  disabilityRating: number | null;
  nextReviewDate: string | null;
  doctorName: string | null;
  status: ReviewStatus;
  notes: string | null;
}

const MOCK_REVIEWS: MedicalReview[] = [
  { id: 'MR-001', awardId: 'AWD-2024-005', ssn: '100456', fullName: 'Mary Johnson', benefitType: 'Invalidity Pension', reviewType: 'PERIODIC', scheduledDate: '2026-04-20', completedDate: null, outcome: null, disabilityRating: 75, nextReviewDate: null, doctorName: 'Dr. Smith', status: 'SCHEDULED', notes: null },
  { id: 'MR-002', awardId: 'AWD-2025-003', ssn: '100890', fullName: 'Peter Clarke', benefitType: 'Employment Injury', reviewType: 'REASSESSMENT', scheduledDate: '2026-03-01', completedDate: null, outcome: null, disabilityRating: 50, nextReviewDate: null, doctorName: null, status: 'OVERDUE', notes: 'Patient missed appointment' },
  { id: 'MR-003', awardId: 'AWD-2024-015', ssn: '100123', fullName: 'Sarah Adams', benefitType: 'Invalidity Pension', reviewType: 'PERIODIC', scheduledDate: '2026-02-15', completedDate: '2026-02-15', outcome: 'CONTINUE', disabilityRating: 80, nextReviewDate: '2027-02-15', doctorName: 'Dr. Lee', status: 'COMPLETED', notes: 'Condition stable' },
  { id: 'MR-004', awardId: 'AWD-2025-009', ssn: '100567', fullName: 'James Martin', benefitType: 'Invalidity Pension', reviewType: 'BOARD_REFERRAL', scheduledDate: null, completedDate: null, outcome: null, disabilityRating: 60, nextReviewDate: null, doctorName: null, status: 'REFERRED_BOARD', notes: 'Complex case — referred to full board' },
  { id: 'MR-005', awardId: 'AWD-2024-022', ssn: '100234', fullName: 'Lisa Herbert', benefitType: 'Employment Injury', reviewType: 'INITIAL', scheduledDate: null, completedDate: null, outcome: null, disabilityRating: null, nextReviewDate: null, doctorName: null, status: 'PENDING_SCHEDULE', notes: null },
];

const statusConfig: Record<ReviewStatus, { label: string; color: string }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
  OVERDUE: { label: 'Overdue', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  CANCELLED: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-muted' },
  REFERRED_BOARD: { label: 'Referred to Board', color: 'bg-purple-500/10 text-purple-700 border-purple-300' },
  PENDING_SCHEDULE: { label: 'Needs Scheduling', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
};

const MedicalReviewScheduler: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reviews] = useState<MedicalReview[]>(MOCK_REVIEWS);
  const [selectedReview, setSelectedReview] = useState<MedicalReview | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleDr, setScheduleDr] = useState('');
  const [outcomeResult, setOutcomeResult] = useState('CONTINUE');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [newRating, setNewRating] = useState('');

  const filtered = useMemo(() => reviews.filter(r => {
    const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.ssn.includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  }), [reviews, search, statusFilter]);

  const counts = useMemo(() => ({
    scheduled: reviews.filter(r => r.status === 'SCHEDULED').length,
    overdue: reviews.filter(r => r.status === 'OVERDUE').length,
    needsScheduling: reviews.filter(r => r.status === 'PENDING_SCHEDULE').length,
    boardReferrals: reviews.filter(r => r.status === 'REFERRED_BOARD').length,
  }), [reviews]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6" />Medical Review Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and track periodic medical reviews for invalidity and injury awards</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Upcoming', value: counts.scheduled, icon: Calendar, color: 'text-blue-600' },
          { label: 'Overdue', value: counts.overdue, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Needs Scheduling', value: counts.needsScheduling, icon: Clock, color: 'text-amber-600' },
          { label: 'Board Referrals', value: counts.boardReferrals, icon: FileText, color: 'text-purple-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
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
            <Input placeholder="Search by name or SSN..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                <TableHead>Award</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead>Review Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No reviews found</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className={r.status === 'OVERDUE' ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-mono text-xs">{r.awardId}</TableCell>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell className="text-sm">{r.benefitType}</TableCell>
                  <TableCell className="text-sm capitalize">{r.reviewType.replace('_', ' ').toLowerCase()}</TableCell>
                  <TableCell>{r.scheduledDate || '—'}</TableCell>
                  <TableCell>{r.disabilityRating != null ? `${r.disabilityRating}%` : '—'}</TableCell>
                  <TableCell>{r.doctorName || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={statusConfig[r.status].color}>{statusConfig[r.status].label}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    {['PENDING_SCHEDULE', 'OVERDUE'].includes(r.status) && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedReview(r); setScheduleOpen(true); }}>
                        <Calendar className="h-3 w-3 mr-1" />Schedule
                      </Button>
                    )}
                    {r.status === 'SCHEDULED' && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedReview(r); setOutcomeOpen(true); }}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Record Outcome
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Medical Review</DialogTitle>
            <DialogDescription>Schedule a review for {selectedReview?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Appointment Date</Label>
              <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Examining Doctor</Label>
              <Input placeholder="Doctor name..." value={scheduleDr} onChange={e => setScheduleDr(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Review scheduled'); setScheduleOpen(false); }}>
              <Calendar className="h-4 w-4 mr-1" />Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome Dialog */}
      <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Review Outcome</DialogTitle>
            <DialogDescription>Record the medical review result for {selectedReview?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcomeResult} onValueChange={setOutcomeResult}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTINUE">Continue Award</SelectItem>
                  <SelectItem value="UPGRADE">Upgrade Rating</SelectItem>
                  <SelectItem value="DOWNGRADE">Downgrade Rating</SelectItem>
                  <SelectItem value="CEASE">Cease Award</SelectItem>
                  <SelectItem value="REFER_BOARD">Refer to Medical Board</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Updated Disability Rating (%)</Label>
              <Input type="number" min="0" max="100" value={newRating} onChange={e => setNewRating(e.target.value)} placeholder={selectedReview?.disabilityRating?.toString() || ''} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)} placeholder="Medical findings and recommendations..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Outcome recorded'); setOutcomeOpen(false); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalReviewScheduler;
