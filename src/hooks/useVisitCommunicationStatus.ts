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
import { useEffect, useState } from 'react';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import type { AuditCommunication, CeCommType } from '@/types/auditCommunication';

const FINAL_STAGE_TYPES: CeCommType[] = [
  'final_report',
  'violation_notice',
  'corrective_action',
];

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
    refresh: () => setVersion((v) => v + 1),
  };
}
