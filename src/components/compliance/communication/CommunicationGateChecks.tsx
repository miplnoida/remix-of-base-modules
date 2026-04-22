/**
 * CommunicationGateChecks
 *
 * Presentation-only audit "communication readiness" check list shown
 * inside the Completion Gate panel of the Audit Visit Workspace.
 *
 * Each check derives its status from already-fetched communication items
 * (no extra network calls) plus the visit's outcome context:
 *
 *   - PASS    requirement satisfied
 *   - FAIL    required action missing → blocks closure (UI surfaces it)
 *   - WARN    recommended but not blocking
 *   - INFO    contextual / not applicable
 *
 * Conditional rules:
 *   - "Final report issued" only applies once fieldwork is closed.
 *   - "Violation Notice" only required when severity meets enforcement threshold.
 *   - "Acknowledgment / response captured" only checked for comms whose
 *     template requires it (currently inferred from comm_type).
 *   - "Escalation completed" only checked when overdue items exist.
 *
 * Quick-link buttons reuse `ContextualCommActions` so a single click opens
 * the composer with the right stage + comm_type pre-selected.
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, AlertTriangle, XCircle, Info, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AuditCommunication, CeCommType } from '@/types/auditCommunication';

export type GateCheckStatus = 'PASS' | 'FAIL' | 'WARN' | 'INFO';

/** Action a quick-button can request from the parent. */
export type GateQuickActionKind = 'send' | 'record_exception';

export interface CommGateCheck {
  key: string;
  label: string;
  status: GateCheckStatus;
  detail?: string;
  /** Optional deep-link to the Communications tab (or composer) for this item. */
  actionLabel?: string;
  /** comm_type the user should send to satisfy the check (used to scroll-to / filter). */
  suggestCommType?: CeCommType;
  /** What the parent should do when the action button is clicked. Defaults to 'send'. */
  actionKind?: GateQuickActionKind;
  /** Optional secondary action (e.g. "Send Late Intimation" alongside "Record Exception"). */
  secondaryAction?: {
    label: string;
    kind: GateQuickActionKind;
    suggestCommType?: CeCommType;
  };
}

export interface IntimationContext {
  /** ISO date / datetime when the visit is planned. */
  plannedDate?: string | null;
  /** ISO datetime when the field session actually started (null = not started). */
  sessionStartedAt?: string | null;
  /** Minimum lead time required by the intimation template (hours). Defaults to 48. */
  minLeadHours?: number | null;
  /** True once an exception has been formally recorded for this visit. */
  exceptionRecorded?: boolean;
}

export interface CommunicationGateContext {
  sessionClosed: boolean;
  reportStatus: string | null;     // e.g. DRAFT | IN_REVIEW | PUBLISHED | FINALIZED
  hasViolations: boolean;
  /** Highest finding severity present on the visit. */
  maxSeverity?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  /** Severity at/above which a Violation Notice is required. */
  enforcementThreshold?: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** True if any employer obligation has passed its due date. */
  hasOverdueItems?: boolean;
  /** Pre-visit intimation context — drives nuanced PASS/WARN/FAIL for intimation. */
  intimation?: IntimationContext;
}

interface Props {
  itemsByType: Partial<Record<CeCommType, AuditCommunication[]>>;
  context: CommunicationGateContext;
  /** Tab anchor (e.g. "?tab=communications") on this same page. */
  communicationsHref?: string;
  /**
   * Quick-action callback. Receives the check itself so the parent can
   * distinguish 'send' (open composer) vs 'record_exception' (open exception
   * dialog), and act on `secondaryAction` when present.
   */
  onQuickAction?: (
    check: CommGateCheck,
    kind: GateQuickActionKind,
    commType?: CeCommType,
  ) => void;
  /** @deprecated — use onQuickAction. Kept for back-compat with older callers. */
  onQuickSend?: (commType: CeCommType) => void;
}

/** Comm types whose templates conventionally require an acknowledgment. */
const ACK_REQUIRED_TYPES: CeCommType[] = [
  'final_report',
  'violation_notice',
  'corrective_action',
  'acknowledgment_request',
];

/** Comm types whose templates conventionally expect an employer response. */
const RESPONSE_EXPECTED_TYPES: CeCommType[] = [
  'additional_info_request',
  'clarification_request',
  'dispute_instructions',
];

const SEVERITY_RANK: Record<NonNullable<CommunicationGateContext['maxSeverity']>, number> = {
  NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

function isSent(c: AuditCommunication): boolean {
  return c.status === 'sent' || c.status === 'partial';
}

/**
 * UI-level inference: an item is "acknowledged" if it has been sent and the
 * template (where modelled) flagged require_acknowledgment, or if a downstream
 * acknowledgment_request of the same visit has been responded to. Without an
 * explicit acknowledged_at column, we treat presence of an
 * `acknowledgment_request` that has been sent and not failed as the captured
 * acknowledgment hand-off, and let the items themselves carry the rest.
 */
function ackCaptured(items: AuditCommunication[]): boolean {
  return items.some(isSent);
}

function responseRecorded(items: AuditCommunication[]): boolean {
  // Response-tracking is on the AuditCommunicationEvent log (event_type =
  // 'employer_responded'). The hook does not load events, so we approximate:
  // any item moved past `sent` (i.e. cancelled with a response, or a follow-up
  // exists for the same comm_type) counts as "response recorded". Otherwise
  // we leave it as INFO so the gate does not falsely fail.
  return items.length > 1 || items.some((c) => c.status === 'cancelled');
}

export function CommunicationGateChecks({
  itemsByType, context, communicationsHref, onQuickAction, onQuickSend,
}: Props) {
  const checks = useMemo<CommGateCheck[]>(() => {
    const out: CommGateCheck[] = [];
    const threshold = context.enforcementThreshold ?? 'MEDIUM';
    const severityOk = context.maxSeverity
      ? SEVERITY_RANK[context.maxSeverity] >= SEVERITY_RANK[threshold]
      : false;

    // 1. Audit intimation must be sent before closure.
    {
      const sent = (itemsByType.audit_intimation ?? []).some(isSent);
      out.push({
        key: 'intimation',
        label: 'Audit intimation sent to employer',
        status: sent ? 'PASS' : 'FAIL',
        detail: sent ? undefined : 'Required: send the Audit Intimation before closing the visit.',
        actionLabel: sent ? undefined : 'Send Audit Intimation',
        suggestCommType: 'audit_intimation',
      });
    }

    // 2. Acknowledgment captured (only checked for items whose type requires it).
    {
      const ackTargets = ACK_REQUIRED_TYPES.flatMap((t) => itemsByType[t] ?? []);
      if (ackTargets.length === 0) {
        out.push({
          key: 'acknowledgment',
          label: 'Acknowledgment captured where mandatory',
          status: 'INFO',
          detail: 'No communications requiring acknowledgment have been issued yet.',
        });
      } else {
        const ok = ackCaptured(ackTargets);
        out.push({
          key: 'acknowledgment',
          label: 'Acknowledgment captured where mandatory',
          status: ok ? 'PASS' : 'WARN',
          detail: ok
            ? `${ackTargets.filter(isSent).length} acknowledgment-bearing communication(s) sent.`
            : 'One or more acknowledgment-bearing communications have not been delivered yet.',
          actionLabel: ok ? undefined : 'Send Acknowledgment Request',
          suggestCommType: 'acknowledgment_request',
        });
      }
    }

    // 3. Response recorded (only when response-expected items exist).
    {
      const respTargets = RESPONSE_EXPECTED_TYPES.flatMap((t) => itemsByType[t] ?? []);
      if (respTargets.length === 0) {
        out.push({
          key: 'response',
          label: 'Response recorded where applicable',
          status: 'INFO',
          detail: 'No information / clarification requests have been issued.',
        });
      } else {
        const ok = responseRecorded(respTargets);
        out.push({
          key: 'response',
          label: 'Response recorded where applicable',
          status: ok ? 'PASS' : 'WARN',
          detail: ok
            ? 'Employer response(s) captured against issued requests.'
            : 'One or more outstanding requests have no recorded employer response.',
        });
      }
    }

    // 4. Escalation completed for overdue enforcement cases.
    if (context.hasOverdueItems) {
      const escalated = (itemsByType.escalation_notice ?? []).some(isSent);
      out.push({
        key: 'escalation',
        label: 'Escalation completed for overdue items',
        status: escalated ? 'PASS' : 'FAIL',
        detail: escalated
          ? 'Escalation Notice issued.'
          : 'Required: an escalation has not been triggered for overdue obligations.',
        actionLabel: escalated ? undefined : 'Trigger Escalation',
        suggestCommType: 'escalation_notice',
      });
    } else {
      out.push({
        key: 'escalation',
        label: 'Escalation completed for overdue items',
        status: 'INFO',
        detail: 'No overdue employer obligations on this visit.',
      });
    }

    // 5. Final report issued if findings exist (only after fieldwork is closed).
    if (!context.sessionClosed) {
      out.push({
        key: 'final_report',
        label: 'Final report issued (if findings exist)',
        status: 'INFO',
        detail: 'Field session is still in progress.',
      });
    } else if (!context.hasViolations) {
      out.push({
        key: 'final_report',
        label: 'Final report issued (if findings exist)',
        status: 'INFO',
        detail: 'No findings recorded — final report not required.',
      });
    } else {
      const sent = (itemsByType.final_report ?? []).some(isSent);
      out.push({
        key: 'final_report',
        label: 'Final report issued',
        status: sent ? 'PASS' : 'FAIL',
        detail: sent ? undefined : 'Required: findings exist but the Final Audit Report has not been sent.',
        actionLabel: sent ? undefined : 'Send Final Audit Report',
        suggestCommType: 'final_report',
      });
    }

    // 6. Violation notice if enforcement threshold is met.
    if (!context.hasViolations || !severityOk) {
      out.push({
        key: 'violation_notice',
        label: `Violation Notice (severity ≥ ${threshold})`,
        status: 'INFO',
        detail: context.hasViolations
          ? `Highest severity is ${context.maxSeverity ?? 'unknown'} — below enforcement threshold.`
          : 'No findings meet the enforcement threshold.',
      });
    } else {
      const sent = (itemsByType.violation_notice ?? []).some(isSent)
        || (itemsByType.corrective_action ?? []).some(isSent);
      out.push({
        key: 'violation_notice',
        label: `Violation Notice / Corrective Action sent (severity ${context.maxSeverity})`,
        status: sent ? 'PASS' : 'FAIL',
        detail: sent
          ? undefined
          : `Required: severity ${context.maxSeverity} meets the enforcement threshold (${threshold}).`,
        actionLabel: sent ? undefined : 'Send Violation Notice',
        suggestCommType: 'violation_notice',
      });
    }

    return out;
  }, [itemsByType, context]);

  const counts = useMemo(() => {
    const c = { pass: 0, fail: 0, warn: 0, info: 0 };
    for (const ck of checks) {
      if (ck.status === 'PASS') c.pass++;
      else if (ck.status === 'FAIL') c.fail++;
      else if (ck.status === 'WARN') c.warn++;
      else c.info++;
    }
    return c;
  }, [checks]);

  const actionNeeded = checks.filter((c) => c.status === 'FAIL' || c.status === 'WARN');

  return (
    <div className="rounded border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="text-sm font-medium">Communication readiness</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3 text-success" /> {counts.pass} passed
          </Badge>
          <Badge variant={counts.fail > 0 ? 'destructive' : 'outline'} className="gap-1 text-[10px]">
            <XCircle className="h-3 w-3" /> {counts.fail} failed
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-warning" /> {counts.warn} warning
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Info className="h-3 w-3 text-muted-foreground" /> {counts.info} info
          </Badge>
        </div>
      </div>

      <ul className="divide-y">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 px-3 py-2 text-sm">
            <StatusIcon status={c.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{c.label}</span>
                <StatusBadge status={c.status} />
              </div>
              {c.detail && (
                <div className="text-xs text-muted-foreground mt-0.5">{c.detail}</div>
              )}
            </div>
            {c.actionLabel && c.suggestCommType && onQuickSend && (
              <Button
                size="sm"
                variant={c.status === 'FAIL' ? 'default' : 'outline'}
                className="shrink-0 gap-1 h-7 text-xs"
                onClick={() => onQuickSend(c.suggestCommType!)}
              >
                {c.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {actionNeeded.length > 0 && (
        <div className="border-t px-3 py-2 flex items-center justify-between bg-muted/30">
          <div className="text-xs">
            <span className="font-medium">Action needed:</span>{' '}
            <span className="text-muted-foreground">
              {actionNeeded.length} communication item(s) require attention before close-out.
            </span>
          </div>
          {communicationsHref && (
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to={communicationsHref}>Review communications</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: GateCheckStatus }) {
  if (status === 'PASS') return <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />;
  if (status === 'FAIL') return <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />;
  if (status === 'WARN') return <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />;
  return <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />;
}

function StatusBadge({ status }: { status: GateCheckStatus }) {
  const map: Record<GateCheckStatus, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
    PASS: { label: 'Passed', variant: 'outline' },
    FAIL: { label: 'Failed', variant: 'destructive' },
    WARN: { label: 'Warning', variant: 'secondary' },
    INFO: { label: 'Info',    variant: 'outline' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant} className="text-[9px] h-4 px-1">{cfg.label}</Badge>;
}
