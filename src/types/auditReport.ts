// Enterprise Employer Audit Report types

export type AuditReportStatus = 'DRAFT' | 'FINAL' | 'SHARED';
export type AcknowledgmentStatus =
  | 'NOT_SENT'
  | 'SENT'
  | 'VIEWED'
  | 'SIGNED'
  | 'REFUSED'
  | 'EXPIRED';

export type SignerRole = 'EMPLOYER_REP' | 'INSPECTOR' | 'SUPERVISOR' | 'WITNESS';
export type SignatureType =
  | 'PHYSICAL'
  | 'ELECTRONIC'
  | 'TYPED_ATTESTATION'
  | 'REFUSED'
  | 'UNAVAILABLE'
  | 'UPLOADED';

export interface AuditReportSignature {
  id: string;
  reportId: string;
  signerRole: SignerRole;
  signerName: string;
  signerDesignation?: string;
  signerEmail?: string;
  // Identity linkage to audit contact
  signerSameAsContact?: boolean;
  signerAuthorityNote?: string;
  signerRelationship?: string;
  // Witness (optional, used for refusal/unavailable)
  witnessName?: string;
  witnessDesignation?: string;
  witnessSignatureImageUrl?: string;
  inspectorAttestationSignatureId?: string;
  // Signature payload
  signatureType: SignatureType;
  signatureImageUrl?: string;
  typedName?: string;
  attestationText?: string;
  comments?: string;
  refusalReason?: string;
  signedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  capturedBy?: string;
  // Supersede chain (replaces hard-delete)
  supersededBy?: string;
  supersededAt?: string;
  supersededReason?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuditReportSignatureEvent {
  id: string;
  reportId: string;
  signatureId?: string;
  eventType: string;
  actorUserCode?: string;
  metadata?: Record<string, any>;
  eventAt: string;
}

export interface AuditReportVersion {
  id: string;
  reportId: string;
  versionNumber: number;
  pdfUrl?: string;
  isFinal: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Violation row attached to an audit report.
 * Sourced from ce_violations where inspection_id = report.inspection_id.
 * Internal report shows the full row; employer report shows only the
 * employer-safe fields (number, summary, statutory ref, amounts, due date).
 */
export interface AuditViolationRow {
  id: string;
  violationNumber?: string;
  violationTypeId?: string;
  violationTypeName?: string;
  statutoryReference?: string;
  summary?: string;
  description?: string;
  severity?: string;
  fundType?: string;
  periodFrom?: string;
  periodTo?: string;
  principalAmount?: number;
  penaltyAmount?: number;
  interestAmount?: number;
  totalAmount?: number;
  dueDate?: string;
  status?: string;
  priority?: string;
  /** Finding number this violation arose from (display index, e.g. 3). */
  sourceFindingNumber?: number;
  sourceFindingId?: string;
  // Internal-only fields
  assignedToName?: string;
  caseId?: string;
  caseFamily?: string;
  resolutionNotes?: string;
}

export interface AuditReportAcknowledgment {
  id: string;
  reportId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientDesignation?: string;
  linkToken: string;
  expiresAt: string;
  sentAt: string;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewCount: number;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'REFUSED' | 'EXPIRED' | 'REVOKED';
  signatureId?: string;
  createdAt: string;
  // Phase 3/4 — frozen online-response permissions for this link
  portalResolvedEnabled?: boolean;
  portalResolvedMode?:
    | 'NONE'
    | 'VIEW_ONLY'
    | 'ACKNOWLEDGMENT_ONLY'
    | 'LIMITED_RESPONSE'
    | 'FULL_RESPONSE';
  portalResolvedPermissions?: Record<string, boolean>;
  /** Phase 5 — frozen review-routing snapshot (workflow_id, review flags). */
  portalResolvedReview?: Record<string, unknown>;
  /** Phase 5 — id of the policy that resolved at send time. */
  portalMatchedPolicyId?: string;
  responseDueAt?: string | null;
}

export interface FullAuditReport {
  // base report fields
  id: string;
  reportNumber: string;
  inspectionId: string;
  planItemId?: string;
  employerId?: string;
  employerName?: string;
  employerRegNumber?: string;
  inspectorId?: string;
  inspectorName?: string;
  reportDate: string;
  auditDate?: string;
  auditLocation?: string;

  // === Audit Contact (person met during audit) ===
  auditContactName?: string;
  auditContactDesignation?: string;
  auditContactRelationship?: string;
  auditContactPresent?: boolean;
  auditContactCapturedAt?: string;

  // Legacy / alias (kept for back-compat with header form)
  employerRepName?: string;
  employerRepDesignation?: string;

  status: AuditReportStatus;
  currentVersion: number;
  verificationRef?: string;

  // narrative
  executiveSummary?: string;
  scope?: string;
  purposeScope?: string;
  recordsReviewed?: string;
  conclusions?: string;
  complianceConclusion?: string;
  recommendations?: string;

  // === NEW: enterprise working-paper fields ===
  /** Internal-only: audit procedures performed (tests, walkthroughs, recalculations…). */
  methodology?: string;
  /** Internal-only: population, sample size, and selection method. */
  samplingBasis?: string;
  /** Internal-only: overall risk rating (Low / Medium / High / Critical). */
  riskRating?: string;
  /** Employer-facing: how to dispute a violation issued from this audit. */
  disputeInstructions?: string;

  // counts
  totalFindings: number;
  totalEvidence: number;
  totalViolations: number;
  checklistCompletionPct: number;

  // pdf / acknowledgment
  pdfUrl?: string;
  signedPdfUrl?: string;
  /** Stored finalized PDF — internal/working-paper variant. */
  internalPdfUrl?: string;
  /** Stored finalized PDF — employer-facing variant. */
  employerPdfUrl?: string;
  acknowledgmentStatus: AcknowledgmentStatus;
  acknowledgmentSentAt?: string;
  acknowledgmentCompletedAt?: string;

  generatedAt?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}
