/**
 * VisitCommunicationsTab — Communications view embedded inside the
 * specific Audit Visit Workspace. Treats communications as part of the
 * visit lifecycle, not a side panel.
 *
 * Composition (top → bottom):
 *   1. Stage-aware suggestions (templates filtered by the visit's stage)
 *   2. Reused AuditCommunicationsPanel (drafts, approvals, send, history)
 *
 * All template config comes from Settings (ce_audit_communication_templates)
 * — no separate template store.
 */
import { useState } from 'react';
import { AuditCommunicationsPanel } from './AuditCommunicationsPanel';
import { VisitStageSuggestions } from './VisitStageSuggestions';
import type { VisitStageContext } from '@/lib/compliance/visitStageMapping';

interface Props {
  inspectionId: string;
  employerId: string;
  employerName?: string;
  visitContext: VisitStageContext;
  userCode?: string;
}

export function VisitCommunicationsTab({
  inspectionId,
  employerId,
  employerName,
  visitContext,
  userCode,
}: Props) {
  // Used to force the lower panel to refresh when a draft is created
  // from the suggestions strip.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <VisitStageSuggestions
        inspectionId={inspectionId}
        employerId={employerId}
        employerName={employerName}
        visitContext={visitContext}
        userCode={userCode}
        onDraftCreated={() => setRefreshKey((k) => k + 1)}
      />
      <AuditCommunicationsPanel
        key={refreshKey}
        inspectionId={inspectionId}
        employerId={employerId}
        employerName={employerName}
        userCode={userCode}
      />
    </div>
  );
}
