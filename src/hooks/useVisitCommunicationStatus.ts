/**
 * useVisitCommunicationStatus
 *
 * Lightweight summary of the communications associated with a single
 * inspection visit. Drives:
 *   - The "Communications" KPI tile in the visit workspace
 *   - The advisory completion-gate check ("final-stage communication issued?")
 *
 * Read-only — does not mutate gate enforcement on the server.
 */
import { useEffect, useMemo, useState } from 'react';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import { COMM_TYPE_LABELS, type AuditCommunication, type CeCommType } from '@/types/auditCommunication';

const FINAL_STAGE_TYPES: CeCommType[] = [
  'final_report',
  'violation_notice',
  'corrective_action',
];

/**
 * Fields added to the table by migration 20260422112003 but not yet in the
 * generated TS type. We read them defensively via this loose extension.
 */
type AuditCommExt = AuditCommunication & {
  delivered_at?: string | null;
  acknowledged_at?: string | null;
  response_due_at?: string | null;
  responded_at?: string | null;
  escalation_level?: number | null;
};

export interface CommIntelligenceItem {
  id: string;
  comm_type: CeCommType;
  label: string;
  status: string;
  due_at?: string | null;
  days_overdue: number;
}

export interface VisitCommunicationStatus {
  loading: boolean;
  total: number;
  drafts: number;
  pendingApproval: number;
  scheduled: number;
  sent: number;
  failed: number;
  /** True if at least one communication of a final-stage type has been sent. */
  finalStageIssued: boolean;
  /** True if any communication is currently in a non-terminal state. */
  hasOpenItems: boolean;
  /** Raw items (read-only) for downstream gate checks. */
  items: AuditCommunication[];
  /** Items grouped by comm_type — convenience for gate-check lookups. */
  itemsByType: Partial<Record<CeCommType, AuditCommunication[]>>;

  /** ── Intelligence summary ───────────────────────────────── */
  /** Sent items still awaiting acknowledgment past their due date. */
  overdueAcknowledgments: CommIntelligenceItem[];
  /** Sent items still awaiting employer response past their due date. */
  overdueResponses: CommIntelligenceItem[];
  /** Items where escalation_level >= 1, indicating escalation is needed/active. */
  escalationItems: CommIntelligenceItem[];
  /** Highest escalation_level across all items (0 if none). */
  maxEscalationLevel: number;
  /** Most recent successfully sent communication (sent_at desc). */
  lastSent: AuditCommunication | null;

  refresh: () => void;
}

export function useVisitCommunicationStatus(
  inspectionId?: string | null,
): VisitCommunicationStatus {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AuditCommunication[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!inspectionId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    auditCommunicationService
      .listForInspection(inspectionId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inspectionId, version]);

  const drafts = items.filter((c) => c.status === 'draft' || c.status === 'rejected').length;
  const pendingApproval = items.filter((c) => c.status === 'pending_approval').length;
  const scheduled = items.filter((c) => !!c.scheduled_at && c.status !== 'sent' && c.status !== 'cancelled').length;
  const sent = items.filter((c) => c.status === 'sent' || c.status === 'partial').length;
  const failed = items.filter((c) => c.status === 'failed').length;
  const finalStageIssued = items.some(
    (c) => FINAL_STAGE_TYPES.includes(c.comm_type) && (c.status === 'sent' || c.status === 'partial'),
  );
  const hasOpenItems = drafts + pendingApproval + scheduled > 0;

  const itemsByType: Partial<Record<CeCommType, AuditCommunication[]>> = {};
  for (const it of items) {
    (itemsByType[it.comm_type] ||= []).push(it);
  }

  // ── Intelligence derivations ─────────────────────────────────
  const intelligence = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const sentLike = (c: AuditCommExt) => c.status === 'sent' || c.status === 'partial';
    const toItem = (c: AuditCommExt, due: string | null | undefined): CommIntelligenceItem => ({
      id: c.id,
      comm_type: c.comm_type,
      label: COMM_TYPE_LABELS[c.comm_type] ?? c.comm_type,
      status: c.status,
      due_at: due ?? null,
      days_overdue: due ? Math.max(0, Math.floor((now - new Date(due).getTime()) / dayMs)) : 0,
    });

    const overdueAcknowledgments: CommIntelligenceItem[] = [];
    const overdueResponses: CommIntelligenceItem[] = [];
    const escalationItems: CommIntelligenceItem[] = [];
    let maxEscalationLevel = 0;
    let lastSent: AuditCommunication | null = null;

    for (const raw of items) {
      const c = raw as AuditCommExt;
      const due = c.response_due_at ? new Date(c.response_due_at).getTime() : null;

      if (sentLike(c) && due && due < now) {
        if (!c.acknowledged_at) overdueAcknowledgments.push(toItem(c, c.response_due_at));
        if (!c.responded_at) overdueResponses.push(toItem(c, c.response_due_at));
      }

      const lvl = c.escalation_level ?? 0;
      if (lvl > 0) {
        escalationItems.push(toItem(c, c.response_due_at));
        if (lvl > maxEscalationLevel) maxEscalationLevel = lvl;
      }

      if (sentLike(c) && c.sent_at) {
        if (!lastSent || new Date(c.sent_at).getTime() > new Date(lastSent.sent_at!).getTime()) {
          lastSent = c;
        }
      }
    }

    return { overdueAcknowledgments, overdueResponses, escalationItems, maxEscalationLevel, lastSent };
  }, [items]);

  return {
    loading,
    total: items.length,
    drafts,
    pendingApproval,
    scheduled,
    sent,
    failed,
    finalStageIssued,
    hasOpenItems,
    items,
    itemsByType,
    overdueAcknowledgments: intelligence.overdueAcknowledgments,
    overdueResponses: intelligence.overdueResponses,
    escalationItems: intelligence.escalationItems,
    maxEscalationLevel: intelligence.maxEscalationLevel,
    lastSent: intelligence.lastSent,
    refresh: () => setVersion((v) => v + 1),
  };
}
