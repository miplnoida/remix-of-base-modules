/**
 * VisitCommunicationsIntelligenceCard
 *
 * Visit-workspace dashboard card that summarises the *communications health*
 * of an audit visit so the auditor can see — at a glance, before closing —
 * what comm action is pending or overdue.
 *
 * Surfaces:
 *   • Pending communications count (drafts + pending approval + scheduled)
 *   • Overdue acknowledgments (sent items past response_due_at, no ack)
 *   • Overdue employer responses (sent items past response_due_at, no response)
 *   • Escalation-needed alert (escalation_level >= 1, or any overdue + no ack/response)
 *   • Last communication sent (type, when, to whom)
 *   • Next recommended action (top SUGGEST decision from the trigger engine)
 *
 * Read-only summary — actions still happen inside the Communications tab and
 * the existing trigger-suggestions banner. This card is purely to *make the
 * pending state visible* near the top of the workspace.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, Bell, CheckCircle2, Clock, Inbox, MessageSquare, Send, Sparkles, TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { COMM_TYPE_LABELS } from '@/types/auditCommunication';
import type { VisitCommunicationStatus } from '@/hooks/useVisitCommunicationStatus';
import { useVisitTriggerEvaluation } from '@/hooks/useVisitTriggerEvaluation';
import type { TriggerContext } from '@/types/commTriggerRule';

interface Props {
  inspectionId: string;
  employerId: string;
  employerName?: string;
  /** Lifecycle context used to evaluate "next recommended action". */
  triggerContext: Omit<TriggerContext, 'existingByType'>;
  userCode?: string;
  status: VisitCommunicationStatus;
  /** Jump-to-tab handler — when user clicks "Open Communications". */
  onOpenCommunicationsTab?: () => void;
}

function tile(
  Icon: typeof Bell,
  label: string,
  value: React.ReactNode,
  tone: 'neutral' | 'warning' | 'danger' | 'success' = 'neutral',
  sub?: React.ReactNode,
) {
  const toneCls =
    tone === 'danger'
      ? 'border-destructive/40 bg-destructive/5'
      : tone === 'warning'
      ? 'border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/10'
      : tone === 'success'
      ? 'border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-950/10'
      : 'border-border bg-muted/30';
  const iconCls =
    tone === 'danger'
      ? 'text-destructive'
      : tone === 'warning'
      ? 'text-amber-600'
      : tone === 'success'
      ? 'text-emerald-600'
      : 'text-muted-foreground';
  return (
    <div className={`rounded-md border ${toneCls} px-3 py-2 flex items-start gap-2 min-w-0`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconCls}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          {label}
        </div>
        <div className="text-sm font-semibold truncate">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}

export function VisitCommunicationsIntelligenceCard({
  inspectionId,
  employerId,
  employerName,
  triggerContext,
  userCode,
  status,
  onOpenCommunicationsTab,
}: Props) {
  const { suggestions, autoActions } = useVisitTriggerEvaluation({
    inspectionId,
    employerId,
    employerName,
    visitContext: triggerContext,
    userCode,
  });

  const pending = status.drafts + status.pendingApproval + status.scheduled;
  const overdueAck = status.overdueAcknowledgments.length;
  const overdueResp = status.overdueResponses.length;
  const escalation = status.maxEscalationLevel;
  const last = status.lastSent;
  const nextRecommended = suggestions[0]?.rule ?? autoActions[0]?.rule ?? null;

  // Escalation banner — louder than tiles when needed
  const needsEscalation = escalation > 0 || overdueAck > 0 || overdueResp > 0;

  return (
    <Card className={needsEscalation ? 'border-amber-300/70' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Communications intelligence
            {status.total > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                {status.total} total
              </Badge>
            )}
            {status.finalStageIssued && (
              <Badge variant="outline" className="h-5 text-[10px] text-emerald-600 border-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Final-stage issued
              </Badge>
            )}
          </CardTitle>
          {onOpenCommunicationsTab && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onOpenCommunicationsTab}>
              Open Communications →
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Escalation banner */}
        {needsEscalation && (
          <div className="rounded-md border border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200 min-w-0">
              <div className="font-semibold">
                Escalation needed
                {escalation > 0 && <> — current level <span className="font-mono">L{escalation}</span></>}
              </div>
              <div className="text-amber-800/90 dark:text-amber-200/80">
                {[
                  overdueAck > 0 && `${overdueAck} overdue acknowledgment${overdueAck === 1 ? '' : 's'}`,
                  overdueResp > 0 && `${overdueResp} overdue employer response${overdueResp === 1 ? '' : 's'}`,
                  escalation > 0 && `${status.escalationItems.length} item(s) already in escalation`,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            </div>
          </div>
        )}

        {/* Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {tile(
            Inbox,
            'Pending',
            pending,
            pending > 0 ? 'warning' : 'neutral',
            pending > 0
              ? `${status.drafts} draft • ${status.pendingApproval} approval • ${status.scheduled} scheduled`
              : 'No work in flight',
          )}
          {tile(
            Clock,
            'Overdue ack.',
            overdueAck,
            overdueAck > 0 ? 'danger' : 'neutral',
            status.overdueAcknowledgments[0]
              ? `${status.overdueAcknowledgments[0].label} (${status.overdueAcknowledgments[0].days_overdue}d)`
              : 'All acknowledged',
          )}
          {tile(
            Bell,
            'Overdue response',
            overdueResp,
            overdueResp > 0 ? 'danger' : 'neutral',
            status.overdueResponses[0]
              ? `${status.overdueResponses[0].label} (${status.overdueResponses[0].days_overdue}d)`
              : 'No outstanding responses',
          )}
          {tile(
            TrendingUp,
            'Escalation level',
            escalation > 0 ? `L${escalation}` : '—',
            escalation >= 2 ? 'danger' : escalation === 1 ? 'warning' : 'neutral',
            escalation > 0 ? `${status.escalationItems.length} item(s)` : 'Not escalated',
          )}
        </div>

        {/* Last sent + Next recommended */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-md border bg-muted/20 px-3 py-2 flex items-start gap-2 min-w-0">
            <Send className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Last communication sent
              </div>
              {last ? (
                <>
                  <div className="text-sm font-medium truncate">
                    {COMM_TYPE_LABELS[last.comm_type] ?? last.comm_type}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {last.sent_at
                      ? `${formatDistanceToNow(new Date(last.sent_at), { addSuffix: true })}`
                      : 'Sent'}
                    {last.recipients?.length
                      ? ` • to ${last.recipients[0].recipient_email || last.recipients[0].recipient_mobile || 'recipient'}`
                      : ''}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No communication sent yet</div>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-primary/5 border-primary/20 px-3 py-2 flex items-start gap-2 min-w-0">
            <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Next recommended action
              </div>
              {nextRecommended ? (
                <>
                  <div className="text-sm font-medium truncate">{nextRecommended.rule_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {COMM_TYPE_LABELS[nextRecommended.comm_type] ?? nextRecommended.comm_type}
                    {' • '}
                    {nextRecommended.trigger_mode === 'AUTO_SEND'
                      ? 'auto send'
                      : nextRecommended.trigger_mode === 'AUTO_CREATE_DRAFT'
                      ? 'auto draft'
                      : 'suggested'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {pending > 0
                    ? 'Resolve pending items in the Communications tab'
                    : 'Nothing recommended right now'}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
