// Legal Case → Payment Arrangements tab.
// Thin wrapper that embeds the cross-module CentralPaymentArrangementPanel
// configured for the Legal context. All creation, linking, supersession,
// default marking, schedule view and payment history flows happen here —
// Legal users do NOT navigate to Compliance.

import CentralPaymentArrangementPanel from "@/components/core/payment-arrangements/CentralPaymentArrangementPanel";
import type { SourceRecordRef } from "@/services/core/corePaymentArrangementService";

interface Props {
  lgCaseId: string;
  employerId?: string | null;
  employerName?: string | null;
  legalActionId?: string | null;
  courtProceedingId?: string | null;
  /** Optional referred compliance case to also link */
  referredComplianceCaseId?: string | null;
  canEdit: boolean;
}

export default function LegalCasePaymentArrangementsPanel({
  lgCaseId, employerId, employerName, legalActionId, courtProceedingId,
  referredComplianceCaseId, canEdit,
}: Props) {
  const sourceRecords: SourceRecordRef[] = [
    {
      module: "LEGAL",
      recordType: "CASE",
      recordId: lgCaseId,
      legalCaseId: lgCaseId,
    },
    ...(legalActionId ? [{
      module: "LEGAL" as const, recordType: "LEGAL_ACTION" as const,
      recordId: legalActionId, legalActionId, legalCaseId: lgCaseId,
    }] : []),
    ...(courtProceedingId ? [{
      module: "LEGAL" as const, recordType: "COURT_PROCEEDING" as const,
      recordId: courtProceedingId, courtProceedingId, legalCaseId: lgCaseId,
    }] : []),
    ...(referredComplianceCaseId ? [{
      module: "COMPLIANCE" as const, recordType: "CASE" as const,
      recordId: referredComplianceCaseId, complianceCaseId: referredComplianceCaseId,
    }] : []),
  ];

  return (
    <CentralPaymentArrangementPanel
      contextModule="LEGAL"
      debtorType="EMPLOYER"
      debtorId={employerId ?? null}
      debtorName={employerName ?? null}
      sourceRecords={sourceRecords}
      defaultArrangementType="LEGAL_PRE_COURT"
      allowCreate={canEdit}
      allowSupersede={canEdit}
      allowLinkExisting={canEdit}
    />
  );
}
