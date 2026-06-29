/**
 * Violation Timeline
 *
 * Purpose: Single chronological feed of EVERYTHING that has happened to a
 * single violation — status changes, assignments / reassignments, follow-up
 * notes, correspondence (calls/emails/SMS), notices issued, and any generic
 * audit entries written to ce_audit_log. This is the "case diary" for the
 * violation: who did what, when, and why.
 *
 * Sources merged (newest first):
 *  - ce_violation_history            → status flips & action events
 *  - ce_violation_assignments        → routing/assignment changes
 *  - ce_violation_notes              → inspector / officer notes
 *  - ce_violation_correspondence     → outbound/inbound communication
 *  - ce_audit_log (entity=violation) → generic audit writes (waivers, etc.)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  History,
  UserCog,
  MessageSquare,
  Mail,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

type EventKind = 'status' | 'assignment' | 'note' | 'correspondence' | 'audit';

interface TimelineEvent {
  id: string;
  kind: EventKind;
  at: string;
  actor: string | null;
  title: string;
  detail?: string | null;
  meta?: string | null;
}

async function loadViolationTimeline(violationId: string): Promise<TimelineEvent[]> {
  const [history, assignments, notes, corr, audit] = await Promise.all([
    supabase
      .from('ce_violation_history')
      .select('id, action, from_value, to_value, notes, performed_by, performed_at')
      .eq('violation_id', violationId)
      .order('performed_at', { ascending: false }),
    supabase
      .from('ce_violation_assignments')
      .select('id, assignment_type, assigned_by, resolution_method, notes, assigned_at, reassignment_reason')
      .eq('violation_id', violationId)
      .order('assigned_at', { ascending: false }),
    supabase
      .from('ce_violation_notes')
      .select('id, note_type, note_text, author_name, created_at')
      .eq('violation_id', violationId)
      .order('created_at', { ascending: false }),
    supabase
      .from('ce_violation_correspondence')
      .select('id, channel, direction, subject, status, summary, contact_person, created_by, correspondence_date, created_at')
      .eq('violation_id', violationId)
      .order('created_at', { ascending: false }),
    supabase
      .from('ce_audit_log')
      .select('id, action, description, reason, performed_by, performed_at')
      .eq('entity_type', 'violation')
      .eq('entity_id', violationId)
      .order('performed_at', { ascending: false }),
  ]);

  const events: TimelineEvent[] = [];

  (history.data ?? []).forEach((r: any) => {
    const transition = r.from_value || r.to_value
      ? `${r.from_value ?? '—'} → ${r.to_value ?? '—'}`
      : null;
    events.push({
      id: `h-${r.id}`,
      kind: 'status',
      at: r.performed_at,
      actor: r.performed_by,
      title: r.action,
      detail: r.notes,
      meta: transition,
    });
  });

  (assignments.data ?? []).forEach((r: any) => {
    events.push({
      id: `a-${r.id}`,
      kind: 'assignment',
      at: r.assigned_at,
      actor: r.assigned_by,
      title:
        r.assignment_type === 'REASSIGN'
          ? 'Reassigned'
          : r.assignment_type === 'ESCALATION'
            ? 'Escalated'
            : r.assignment_type === 'MANUAL'
              ? 'Manually assigned'
              : 'Assigned',
      detail: r.notes,
      meta: r.reassignment_reason || r.resolution_method,
    });
  });

  (notes.data ?? []).forEach((r: any) => {
    events.push({
      id: `n-${r.id}`,
      kind: 'note',
      at: r.created_at,
      actor: r.author_name,
      title: r.note_type || 'Note',
      detail: r.note_text,
    });
  });

  (corr.data ?? []).forEach((r: any) => {
    events.push({
      id: `c-${r.id}`,
      kind: 'correspondence',
      at: r.created_at || r.correspondence_date,
      actor: r.created_by,
      title: `${r.direction ?? 'Outgoing'} ${r.channel}: ${r.subject}`,
      detail: r.summary,
      meta: [r.status, r.contact_person].filter(Boolean).join(' · ') || null,
    });
  });

  (audit.data ?? []).forEach((r: any) => {
    events.push({
      id: `x-${r.id}`,
      kind: 'audit',
      at: r.performed_at,
      actor: r.performed_by,
      title: r.action,
      detail: r.description,
      meta: r.reason,
    });
  });

  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return events;
}

const KIND_META: Record<EventKind, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  status: { label: 'Status', icon: History, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  assignment: { label: 'Assignment', icon: UserCog, tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  note: { label: 'Note', icon: MessageSquare, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  correspondence: { label: 'Comms', icon: Mail, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  audit: { label: 'Audit', icon: ShieldAlert, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export function ViolationTimeline({ violationId }: { violationId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['violation-timeline', violationId],
    queryFn: () => loadViolationTimeline(violationId),
    enabled: !!violationId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Violation Timeline
          <Badge variant="secondary" className="ml-2">{events.length}</Badge>
        </CardTitle>
        <CardDescription className="flex items-start gap-2 pt-1">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Unified case diary for this violation — every status change, assignment,
            note, communication and audit event from when the violation was raised
            until it is closed. Use it to see who acted, when, and why without
            opening each individual tab.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading timeline…</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No timeline events yet. Activity will appear here as the violation is worked.
          </div>
        ) : (
          <ol className="relative border-l border-border ml-2">
            {events.map((e) => {
              const meta = KIND_META[e.kind];
              const Icon = meta.icon;
              return (
                <li key={e.id} className="ml-6 pb-5">
                  <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border ${meta.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={meta.tone}>{meta.label}</Badge>
                    <span className="text-sm font-medium">{e.title}</span>
                    {e.meta && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        {e.meta}
                      </span>
                    )}
                  </div>
                  {e.detail && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{e.detail}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {e.at ? formatDateForDisplay(e.at) : '—'}
                    {e.actor ? ` · ${e.actor}` : ''}
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

export default ViolationTimeline;
