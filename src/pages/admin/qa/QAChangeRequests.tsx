import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatAuditDateTime } from '@/lib/dateFormat';
import {
  ShieldAlert, CheckCircle2, XCircle, Clock, Eye, RefreshCw, Loader2,
  Filter, Search, History,
} from 'lucide-react';
import { PageHeader } from '@/components/shared';

interface ChangeRequest {
  id: string;
  target_type: string;
  target_id: string | null;
  change_type: string;
  module: string | null;
  title: string;
  reason: string;
  proposed_changes: Record<string, any>;
  before_snapshot: Record<string, any> | null;
  status: string;
  requested_by: string | null;
  requested_by_code: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_by_code: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  applied_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  variant: 'outline',      icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'default',      icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', variant: 'destructive',  icon: <XCircle className="h-3 w-3" /> },
  withdrawn: { label: 'Withdrawn', variant: 'secondary',  icon: <XCircle className="h-3 w-3" /> },
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  create: 'bg-primary/10 text-primary border-primary/20',
  update: 'bg-secondary text-secondary-foreground border-border',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  archive: 'bg-muted text-muted-foreground border-border',
};

export default function QAChangeRequests() {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ChangeRequest | null>(null);
  const [reviewerCode, setReviewerCode] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['qa-change-requests', statusFilter, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from('qa_change_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(200);
      if (statusFilter) q = q.eq('status', statusFilter as any);
      if (typeFilter) q = q.eq('target_type', typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ChangeRequest[];
    },
  });

  const filtered = requests.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.module?.toLowerCase().includes(search.toLowerCase()) ||
    r.requested_by_code?.toLowerCase().includes(search.toLowerCase())
  );

  const pending   = requests.filter(r => r.status === 'pending').length;
  const approved  = requests.filter(r => r.status === 'approved').length;
  const rejected  = requests.filter(r => r.status === 'rejected').length;

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    if (!reviewerCode.trim()) { toast.error('Reviewer code is required'); return; }
    setActionLoading(decision);
    try {
      const fn = decision === 'approve'
        ? 'apply_qa_change_request'
        : 'reject_qa_change_request';
      const { data, error } = await supabase.rpc(fn as any, {
        p_request_id: selected.id,
        p_reviewer_id: user?.id,
        p_reviewer_code: reviewerCode,
        p_notes: reviewNotes || null,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success(decision === 'approve' ? 'Change approved and applied ✓' : 'Change request rejected');
        qc.invalidateQueries({ queryKey: ['qa-change-requests'] });
        qc.invalidateQueries({ queryKey: ['qa-knowledge'] });
        qc.invalidateQueries({ queryKey: ['qa-knowledge-all'] });
        qc.invalidateQueries({ queryKey: ['qa-test-cases'] });
        setSelected(null);
        setReviewNotes('');
        setReviewerCode('');
      } else {
        toast.error(result?.error || 'Operation failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="QA Change Requests"
        subtitle="Review, approve, or reject proposed changes to Knowledge Repository entries and Test Cases"
        breadcrumbs={[
          { label: 'QA Dashboard', href: '/admin/qa' },
          { label: 'Change Requests' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: requests.length, icon: <ShieldAlert className="h-5 w-5 text-primary" /> },
          { label: 'Pending Review', value: pending, icon: <Clock className="h-5 w-5 text-amber-500" /> },
          { label: 'Approved', value: approved, icon: <CheckCircle2 className="h-5 w-5 text-primary" /> },
          { label: 'Rejected', value: rejected, icon: <XCircle className="h-5 w-5 text-destructive" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </div>
                {s.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, module, requester code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Target Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="knowledge_entry">Knowledge Entry</SelectItem>
                <SelectItem value="test_case">Test Case</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change Requests ({filtered.length})
          </CardTitle>
          <CardDescription>
            All modifications to QA artefacts require approval before being committed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No change requests match your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => { setSelected(r); setReviewNotes(''); setReviewerCode(''); }}>
                      <TableCell className="font-medium max-w-[220px] truncate">{r.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.module || '—'}</TableCell>
                      <TableCell>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {r.target_type.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs border px-1.5 py-0.5 rounded font-medium ${CHANGE_TYPE_COLORS[r.change_type] || ''}`}>
                          {r.change_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.requested_by_code || 'System'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAuditDateTime(r.requested_at, false)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant} className="flex items-center gap-1 w-fit text-xs">
                          {sc.icon} {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => { setSelected(r); setReviewNotes(''); setReviewerCode(''); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail / Review Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Change Request Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Title</p><p className="font-medium">{selected.title}</p></div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={STATUS_CONFIG[selected.status]?.variant || 'secondary'} className="flex items-center gap-1 w-fit mt-0.5">
                    {STATUS_CONFIG[selected.status]?.icon} {STATUS_CONFIG[selected.status]?.label}
                  </Badge>
                </div>
                <div><p className="text-muted-foreground text-xs">Target Type</p><p className="font-mono text-xs">{selected.target_type.replace('_', ' ')}</p></div>
                <div><p className="text-muted-foreground text-xs">Change Type</p>
                  <span className={`text-xs border px-1.5 py-0.5 rounded font-medium ${CHANGE_TYPE_COLORS[selected.change_type] || ''}`}>{selected.change_type}</span>
                </div>
                <div><p className="text-muted-foreground text-xs">Module</p><p>{selected.module || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Requester</p><p>{selected.requested_by_code || 'N/A'}</p></div>
                <div><p className="text-muted-foreground text-xs">Requested At</p><p>{formatAuditDateTime(selected.requested_at, true)}</p></div>
                {selected.reviewed_at && (
                  <div><p className="text-muted-foreground text-xs">Reviewed At</p><p>{formatAuditDateTime(selected.reviewed_at, true)}</p></div>
                )}
                {selected.reviewed_by_code && (
                  <div><p className="text-muted-foreground text-xs">Reviewed By</p><p>{selected.reviewed_by_code}</p></div>
                )}
              </div>

              {/* Reason */}
              <div>
                <p className="text-muted-foreground text-xs mb-1">Reason / Justification</p>
                <div className="p-3 bg-muted/30 border rounded-md text-sm">{selected.reason}</div>
              </div>

              {/* Proposed changes */}
              {Object.keys(selected.proposed_changes || {}).length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Proposed Changes</p>
                  <pre className="p-3 bg-muted/30 border rounded-md text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                    {JSON.stringify(selected.proposed_changes, null, 2)}
                  </pre>
                </div>
              )}

              {/* Before snapshot */}
              {selected.before_snapshot && Object.keys(selected.before_snapshot).length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Before Snapshot</p>
                  <pre className="p-3 bg-muted/20 border rounded-md text-xs font-mono overflow-auto max-h-36 whitespace-pre-wrap">
                    {JSON.stringify(selected.before_snapshot, null, 2)}
                  </pre>
                </div>
              )}

              {/* Review notes (existing) */}
              {selected.review_notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Review Notes</p>
                  <div className="p-3 bg-muted/30 border rounded-md text-sm">{selected.review_notes}</div>
                </div>
              )}

              {/* Approve / Reject form — only for pending */}
              {selected.status === 'pending' && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="font-medium text-sm">Review Decision</p>
                  <div className="space-y-2">
                    <Label className="text-xs">Your User Code <span className="text-destructive">*</span></Label>
                    <Input
                      value={reviewerCode}
                      onChange={e => setReviewerCode(e.target.value)}
                      placeholder="e.g. ADMIN1"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Review Notes (optional)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      placeholder="Add context for this decision…"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  disabled={!!actionLoading || !reviewerCode.trim()}
                  onClick={() => handleDecision('reject')}
                >
                  {actionLoading === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
                <Button
                  disabled={!!actionLoading || !reviewerCode.trim()}
                  onClick={() => handleDecision('approve')}
                >
                  {actionLoading === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Approve & Apply
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
