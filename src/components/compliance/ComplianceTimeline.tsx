/**
 * Generic Compliance timeline. Reads from `ce_audit_log` via
 * `complianceAuditService` and renders a vertical, newest-first feed.
 *
 * Does not expose raw SQL / system internals — only the audited fields
 * intended for end-user display (action, description, reason, before/after
 * for selected status-like keys, performer, timestamp, workflow task link).
 */
import { useQuery } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, GitCommit, ArrowRight, MessageSquare, Workflow } from 'lucide-react';
import {
  listAuditEntries,
  listAggregateAudit,
  type ComplianceAuditEntityType,
  type ComplianceAuditEntry,
  type AggregateAuditInput,
} from '@/services/complianceAuditService';
import { formatDateForDisplay } from '@/lib/format-config';

type Props =
  | {
      mode: 'single';
      entityType: ComplianceAuditEntityType;
      entityId: string;
      title?: string;
      aggregate?: never;
    }
  | {
      mode: 'aggregate';
      aggregate: AggregateAuditInput;
      title?: string;
      entityType?: never;
      entityId?: never;
    };

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-primary/10 text-primary',
  status_changed: 'bg-accent/10 text-accent-foreground',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-destructive/10 text-destructive',
  closed: 'bg-muted text-muted-foreground',
  reopened: 'bg-warning/10 text-warning',
  issued: 'bg-primary/10 text-primary',
  escalated: 'bg-destructive/10 text-destructive',
  waived: 'bg-warning/10 text-warning',
  payment_recorded: 'bg-green-100 text-green-800',
  installment_paid: 'bg-green-100 text-green-800',
  breach_recorded: 'bg-destructive/10 text-destructive',
  workflow_assigned: 'bg-accent/10 text-accent-foreground',
};

function actionColor(action: string): string {
  return ACTION_COLORS[action.toLowerCase()] ?? 'bg-muted text-muted-foreground';
}

function prettyAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pulls a short "old → new" status string out of free-form jsonb, if present. */
function summariseDiff(oldV: unknown, newV: unknown): { from?: string; to?: string } {
  const pick = (v: unknown): string | undefined => {
    if (!v || typeof v !== 'object') return undefined;
    const o = v as Record<string, unknown>;
    const candidate = o.status ?? o.state ?? o.workflow_status ?? o.posting_status;
    return candidate != null ? String(candidate) : undefined;
  };
  return { from: pick(oldV), to: pick(newV) };
}

function entityChip(entity: string): string {
  return entity.replace(/_/g, ' ');
}

export function ComplianceTimeline(props: Props) {
  const { isAuthReady, isAuthenticated } = useSupabaseAuth();
  const enabled = isAuthReady && isAuthenticated;

  const queryKey =
    props.mode === 'single'
      ? ['ce-audit', 'single', props.entityType, props.entityId]
      : ['ce-audit', 'aggregate', props.aggregate];

  const { data: entries = [], isLoading } = useQuery<ComplianceAuditEntry[]>({
    queryKey,
    enabled,
    queryFn: () =>
      props.mode === 'single'
        ? listAuditEntries(props.entityType, props.entityId)
        : listAggregateAudit(props.aggregate),
    staleTime: 30_000,
  });

  const title = props.title ?? 'Timeline';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          {title}
        </CardTitle>
        <Badge variant="outline">{entries.length}</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading timeline…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No timeline events yet
          </div>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-6">
            {entries.map((e) => {
              const { from, to } = summariseDiff(e.old_values, e.new_values);
              return (
                <li key={e.id} className="ml-6">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border">
                    <GitCommit className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={actionColor(e.action)}>{prettyAction(e.action)}</Badge>
                    {props.mode === 'aggregate' && (
                      <Badge variant="outline" className="capitalize">
                        {entityChip(e.entity_type)}
                      </Badge>
                    )}
                    {from && to && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{from.replace(/_/g, ' ')}</Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="outline" className="text-xs">{to.replace(/_/g, ' ')}</Badge>
                      </span>
                    )}
                    {!from && to && (
                      <Badge variant="outline" className="text-xs">{to.replace(/_/g, ' ')}</Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {e.performed_at ? formatDateForDisplay(e.performed_at) : ''}
                      {e.performed_at ? ` • ${new Date(e.performed_at).toLocaleTimeString()}` : ''}
                    </span>
                  </div>
                  {e.description && (
                    <div className="mt-1 text-sm">{e.description}</div>
                  )}
                  {e.reason && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-start gap-1">
                      <MessageSquare className="h-3 w-3 mt-0.5" />
                      <span><span className="font-medium">Reason:</span> {e.reason}</span>
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {e.performed_by && <span>By {e.performed_by}</span>}
                    {e.workflow_task_id && (
                      <span className="inline-flex items-center gap-1">
                        <Workflow className="h-3 w-3" />
                        Workflow task
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default ComplianceTimeline;
