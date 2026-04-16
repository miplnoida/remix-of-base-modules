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
  createdAt: string;
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

  // counts
  totalFindings: number;
  totalEvidence: number;
  totalViolations: number;
  checklistCompletionPct: number;

  // pdf / acknowledgment
  pdfUrl?: string;
  signedPdfUrl?: string;
  acknowledgmentStatus: AcknowledgmentStatus;
  acknowledgmentSentAt?: string;
  acknowledgmentCompletedAt?: string;

  generatedAt?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}
