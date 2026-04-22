import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useComplianceRole } from '@/hooks/useComplianceRole';
import {
  plannerApprovalService,
  APPROVAL_STATUS_LABELS,
  type PlannerActionApproval,
  type PlannerApprovalStatus,
} from '@/services/plannerApprovalService';
import { formatDateForDisplay } from '@/lib/format-config';
import { ACTION_TYPE_LABELS, EXCEPTION_CATEGORY_LABELS } from '@/services/plannerCandidateActionsService';

const STATUS_BADGE: Record<PlannerApprovalStatus, { variant: any; icon: any; className: string }> = {
  PENDING: { variant: 'outline', icon: Clock, className: 'border-amber-500 text-amber-700' },
  APPROVED: { variant: 'outline', icon: CheckCircle2, className: 'border-emerald-500 text-emerald-700' },
  REJECTED: { variant: 'outline', icon: XCircle, className: 'border-destructive text-destructive' },
  ESCALATED: { variant: 'outline', icon: AlertTriangle, className: 'border-orange-500 text-orange-700' },
  EXPIRED: { variant: 'outline', icon: AlertTriangle, className: 'border-muted-foreground text-muted-foreground' },
  CANCELLED: { variant: 'outline', icon: XCircle, className: 'border-muted-foreground text-muted-foreground' },
};

function timeRemaining(dueAt: string): string {
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms <= 0) return 'Overdue';
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h left`;
}

export default function PlannerApprovalInbox() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useSupabaseAuth() as any;
  const role = useComplianceRole();
  const qc = useQueryClient();
  const userCode = auth?.profile?.user_code ?? auth?.user?.user_code ?? '';

  const [tab, setTab] = useState<PlannerApprovalStatus | 'ALL'>('PENDING');
  const [decision, setDecision] = useState<{
    open: boolean; row: PlannerActionApproval | null; intent: 'approve' | 'reject';
  }>({ open: false, row: null, intent: 'approve' });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const canDecide = role === 'senior' || role === 'head';

  const inboxQuery = useQuery({
    queryKey: ['planner-approvals-inbox', userCode, tab],
    queryFn: () => plannerApprovalService.listInbox(userCode, tab),
    enabled: !!userCode,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['planner-approvals-inbox'] });

  const submitDecision = async () => {
    if (!decision.row) return;
    setBusy(true);
    try {
      await plannerApprovalService.decideInApp(
        decision.row.id, userCode, decision.intent, notes.trim() || undefined,
      );
      toast({
        title: decision.intent === 'approve' ? 'Approved' : 'Rejected',
        description: `${decision.row.employer_id} — requester has been notified by email.`,
      });
      setDecision({ open: false, row: null, intent: 'approve' });
      setNotes('');
      refresh();
    } catch (e: any) {
      toast({ title: 'Decision failed', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Approval Inbox"
        subtitle="Pending Supervisor+ approvals for planner exceptions and merges"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        }
      />

      {!canDecide && (
        <Card className="border-amber-500/40 bg-amber-50/40">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You can view items addressed to you but only Senior Inspectors and Compliance Heads
            can approve or reject them.
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="ESCALATED">Escalated</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {inboxQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!inboxQuery.isLoading && (inboxQuery.data?.length ?? 0) === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              No items.
            </CardContent></Card>
          )}
          {(inboxQuery.data ?? []).map((row) => {
            const badge = STATUS_BADGE[row.status];
            const Icon = badge.icon;
            const isSelfRequest = row.requested_by_user_code === userCode;
            return (
              <Card key={row.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        {ACTION_TYPE_LABELS[row.action_type as keyof typeof ACTION_TYPE_LABELS] ?? row.action_type}
                        <span className="text-muted-foreground font-normal ml-2">
                          · {row.employer_id}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Week of {formatDateForDisplay(row.week_start_date)}
                        {row.audit_program ? ` · ${row.audit_program}` : ''}
                        · Requested by {row.requested_by_user_code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant} className={badge.className}>
                        <Icon className="h-3 w-3 mr-1" />
                        {APPROVAL_STATUS_LABELS[row.status]}
                      </Badge>
                      {row.status === 'PENDING' && (
                        <Badge variant="secondary">{timeRemaining(row.sla_due_at)}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {row.exception_category && (
                    <div className="text-sm">
                      <span className="font-medium">Category: </span>
                      {EXCEPTION_CATEGORY_LABELS[row.exception_category as keyof typeof EXCEPTION_CATEGORY_LABELS] ?? row.exception_category}
                    </div>
                  )}
                  {row.exception_justification && (
                    <div className="text-sm bg-muted/40 rounded-md px-3 py-2">
                      <span className="font-medium">Justification: </span>
                      {row.exception_justification}
                    </div>
                  )}
                  {row.capacity_impact_hours > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Capacity impact: {row.capacity_impact_hours}h
                    </div>
                  )}
                  {row.decided_by_user_code && (
                    <div className="text-xs text-muted-foreground">
                      Decision by {row.decided_by_user_code}
                      {row.decided_at ? ` on ${formatDateForDisplay(row.decided_at)}` : ''}
                      {row.decision_notes ? ` — ${row.decision_notes}` : ''}
                    </div>
                  )}
                  {row.status === 'PENDING' && canDecide && !isSelfRequest && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => { setDecision({ open: true, row, intent: 'approve' }); setNotes(''); }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setDecision({ open: true, row, intent: 'reject' }); setNotes(''); }}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  )}
                  {row.status === 'PENDING' && isSelfRequest && (
                    <p className="text-xs text-amber-700">
                      Maker-checker: you cannot approve your own request.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={decision.open} onOpenChange={(o) => !o && setDecision({ open: false, row: null, intent: 'approve' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision.intent === 'approve' ? 'Approve request' : 'Reject request'}
            </DialogTitle>
            <DialogDescription>
              {decision.row?.employer_id} · {decision.row?.action_type} · Week {decision.row && formatDateForDisplay(decision.row.week_start_date)}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={decision.intent === 'reject' ? 'Reason for rejection (required)' : 'Optional notes'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision({ open: false, row: null, intent: 'approve' })}>
              Cancel
            </Button>
            <Button
              onClick={submitDecision}
              disabled={busy || (decision.intent === 'reject' && !notes.trim())}
              variant={decision.intent === 'reject' ? 'destructive' : 'default'}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm {decision.intent === 'approve' ? 'approval' : 'rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
