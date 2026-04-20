// ============================================
// AUDIT REPORT SERVICE
// Enterprise-grade Employer Audit Report operations:
// versioning, signatures (audit contact vs signer identity model),
// supersede chain, signature event log, acknowledgment portal.
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserCode } from '@/hooks/useUserCode';
import { fieldAuditService } from './fieldAuditService';
import type {
  FullAuditReport,
  AuditReportSignature,
  AuditReportSignatureEvent,
  AuditReportVersion,
  AuditReportAcknowledgment,
  AuditViolationRow,
  SignerRole,
  SignatureType,
} from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';
import { resolveOnlineResponse } from './onlineResponseResolver';

const nowIso = () => new Date().toISOString();
const whoami = async () => (await getCurrentUserCode()) ?? 'SYSTEM';

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*);base64/)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function mapReport(r: any): FullAuditReport {
  return {
    id: r.id,
    reportNumber: r.report_number,
    inspectionId: r.inspection_id,
    planItemId: r.plan_item_id ?? undefined,
    employerId: r.employer_id ?? undefined,
    employerName: r.employer_name ?? undefined,
    employerRegNumber: r.employer_reg_number ?? undefined,
    inspectorId: r.inspector_id ?? undefined,
    inspectorName: r.inspector_name ?? undefined,
    reportDate: r.report_date,
    auditDate: r.audit_date ?? undefined,
    auditLocation: r.audit_location ?? undefined,
    auditContactName: r.audit_contact_name ?? r.employer_rep_name ?? undefined,
    auditContactDesignation: r.audit_contact_designation ?? r.employer_rep_designation ?? undefined,
    auditContactRelationship: r.audit_contact_relationship ?? undefined,
    auditContactPresent: r.audit_contact_present ?? undefined,
    auditContactCapturedAt: r.audit_contact_captured_at ?? undefined,
    employerRepName: r.employer_rep_name ?? r.audit_contact_name ?? undefined,
    employerRepDesignation: r.employer_rep_designation ?? r.audit_contact_designation ?? undefined,
    status: r.status,
    currentVersion: r.current_version ?? 1,
    verificationRef: r.verification_ref ?? undefined,
    executiveSummary: r.executive_summary ?? undefined,
    scope: r.scope ?? undefined,
    purposeScope: r.purpose_scope ?? undefined,
    recordsReviewed: r.records_reviewed ?? undefined,
    conclusions: r.conclusions ?? undefined,
    complianceConclusion: r.compliance_conclusion ?? undefined,
    recommendations: r.recommendations ?? undefined,
    methodology: r.methodology ?? undefined,
    samplingBasis: r.sampling_basis ?? undefined,
    riskRating: r.risk_rating ?? undefined,
    disputeInstructions: r.dispute_instructions ?? undefined,
    totalFindings: r.total_findings ?? 0,
    totalEvidence: r.total_evidence ?? 0,
    totalViolations: r.total_violations ?? 0,
    checklistCompletionPct: Number(r.checklist_completion_pct ?? 0),
    pdfUrl: r.pdf_url ?? undefined,
    signedPdfUrl: r.signed_pdf_url ?? undefined,
    internalPdfUrl: r.internal_pdf_url ?? undefined,
    employerPdfUrl: r.employer_pdf_url ?? undefined,
    acknowledgmentStatus: r.acknowledgment_status ?? 'NOT_SENT',
    acknowledgmentSentAt: r.acknowledgment_sent_at ?? undefined,
    acknowledgmentCompletedAt: r.acknowledgment_completed_at ?? undefined,
    generatedAt: r.generated_at ?? undefined,
    finalizedAt: r.finalized_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapSignature(r: any): AuditReportSignature {
  return {
    id: r.id,
    reportId: r.report_id,
    signerRole: r.signer_role,
    signerName: r.signer_name,
    signerDesignation: r.signer_designation ?? undefined,
    signerEmail: r.signer_email ?? undefined,
    signerSameAsContact: r.signer_same_as_contact ?? undefined,
    signerAuthorityNote: r.signer_authority_note ?? undefined,
    signerRelationship: r.signer_relationship ?? undefined,
    witnessName: r.witness_name ?? undefined,
    witnessDesignation: r.witness_designation ?? undefined,
    witnessSignatureImageUrl: r.witness_signature_image_url ?? undefined,
    inspectorAttestationSignatureId: r.inspector_attestation_signature_id ?? undefined,
    signatureType: r.signature_type,
    signatureImageUrl: r.signature_image_url ?? undefined,
    typedName: r.typed_name ?? undefined,
    attestationText: r.attestation_text ?? undefined,
    comments: r.comments ?? undefined,
    refusalReason: r.refusal_reason ?? undefined,
    signedAt: r.signed_at ?? undefined,
    ipAddress: r.ip_address ?? undefined,
    userAgent: r.user_agent ?? undefined,
    capturedBy: r.captured_by ?? undefined,
    supersededBy: r.superseded_by ?? undefined,
    supersededAt: r.superseded_at ?? undefined,
    supersededReason: r.superseded_reason ?? undefined,
    isActive: !r.superseded_by,
    createdAt: r.created_at,
  };
}

function genToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function logEvent(
  reportId: string,
  signatureId: string | null,
  eventType: string,
  metadata: Record<string, any> = {}
) {
  const userCode = await whoami();
  await supabase.from('ce_audit_report_signature_events' as any).insert({
    report_id: reportId,
    signature_id: signatureId,
    event_type: eventType,
    actor_user_code: userCode,
    actor_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    metadata,
  } as any);
}

async function uploadSignatureImage(reportId: string, signerRole: string, dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${reportId}/${signerRole}-${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from('audit-signatures')
    .upload(path, blob, { upsert: true, contentType: 'image/png' });
  if (upErr) throw new Error(`Signature image upload failed: ${upErr.message}`);
  const { data: pub } = supabase.storage.from('audit-signatures').getPublicUrl(path);
  return pub.publicUrl;
}

// ─── Service ────────────────────────────────────

export const auditReportService = {
  // ---- Read ----------
  async getReport(reportId: string): Promise<FullAuditReport | null> {
    const { data, error } = await supabase
      .from('ce_employer_audit_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReport(data) : null;
  },

  async getReportByInspection(inspectionId: string): Promise<FullAuditReport | null> {
    const { data, error } = await supabase
      .from('ce_employer_audit_reports')
      .select('*')
      .eq('inspection_id', inspectionId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReport(data) : null;
  },

  // ---- Update narrative + audit contact ----------
  async updateNarrative(
    reportId: string,
    fields: Partial<{
      executiveSummary: string;
      scope: string;
      purposeScope: string;
      recordsReviewed: string;
      conclusions: string;
      complianceConclusion: string;
      recommendations: string;
      methodology: string;
      samplingBasis: string;
      riskRating: string;
      disputeInstructions: string;
      auditDate: string;
      auditLocation: string;
      employerRegNumber: string;
      // Audit contact (canonical)
      auditContactName: string;
      auditContactDesignation: string;
      auditContactRelationship: string;
      auditContactPresent: boolean;
      // Legacy aliases (kept for callers)
      employerRepName: string;
      employerRepDesignation: string;
    }>
  ): Promise<void> {
    const userCode = await whoami();
    const update: any = { updated_by: userCode, updated_at: nowIso() };

    if (fields.executiveSummary !== undefined) update.executive_summary = fields.executiveSummary;
    if (fields.scope !== undefined) update.scope = fields.scope;
    if (fields.purposeScope !== undefined) update.purpose_scope = fields.purposeScope;
    if (fields.recordsReviewed !== undefined) update.records_reviewed = fields.recordsReviewed;
    if (fields.conclusions !== undefined) update.conclusions = fields.conclusions;
    if (fields.complianceConclusion !== undefined) update.compliance_conclusion = fields.complianceConclusion;
    if (fields.recommendations !== undefined) update.recommendations = fields.recommendations;
    if (fields.methodology !== undefined) update.methodology = fields.methodology;
    if (fields.samplingBasis !== undefined) update.sampling_basis = fields.samplingBasis;
    if (fields.riskRating !== undefined) update.risk_rating = fields.riskRating;
    if (fields.disputeInstructions !== undefined) update.dispute_instructions = fields.disputeInstructions;
    if (fields.auditDate !== undefined) update.audit_date = fields.auditDate;
    if (fields.auditLocation !== undefined) update.audit_location = fields.auditLocation;
    if (fields.employerRegNumber !== undefined) update.employer_reg_number = fields.employerRegNumber;

    // Audit contact — write to canonical and legacy column for back-compat
    const contactName = fields.auditContactName ?? fields.employerRepName;
    const contactDesg = fields.auditContactDesignation ?? fields.employerRepDesignation;
    if (contactName !== undefined) {
      update.audit_contact_name = contactName;
      update.employer_rep_name = contactName;
    }
    if (contactDesg !== undefined) {
      update.audit_contact_designation = contactDesg;
      update.employer_rep_designation = contactDesg;
    }
    if (fields.auditContactRelationship !== undefined) update.audit_contact_relationship = fields.auditContactRelationship;
    if (fields.auditContactPresent !== undefined) update.audit_contact_present = fields.auditContactPresent;
    if ((contactName !== undefined || contactDesg !== undefined) && !update.audit_contact_captured_at) {
      update.audit_contact_captured_at = nowIso();
      update.audit_contact_captured_by = userCode;
    }

    const { error } = await supabase
      .from('ce_employer_audit_reports')
      .update(update)
      .eq('id', reportId);
    if (error) throw error;
  },

  // ---- Versions ----------
  async snapshotVersion(reportId: string, opts: { isFinal?: boolean; pdfUrl?: string; notes?: string } = {}): Promise<AuditReportVersion> {
    const userCode = await whoami();
    const report = await this.getReport(reportId);
    if (!report) throw new Error('Report not found');

    const { data: maxRow } = await supabase
      .from('ce_audit_report_versions')
      .select('version_number')
      .eq('report_id', reportId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = ((maxRow as any)?.version_number ?? 0) + 1;
    const fullPayload = await this.assembleFullPayload(report.inspectionId);

    const { data, error } = await supabase
      .from('ce_audit_report_versions')
      .insert({
        report_id: reportId,
        version_number: nextVersion,
        snapshot_json: fullPayload as any,
        pdf_url: opts.pdfUrl ?? null,
        is_final: !!opts.isFinal,
        notes: opts.notes ?? null,
        created_by: userCode,
      } as any)
      .select('*')
      .single();
    if (error) throw error;

    await supabase
      .from('ce_employer_audit_reports')
      .update({ current_version: nextVersion, updated_by: userCode, updated_at: nowIso() } as any)
      .eq('id', reportId);

    return {
      id: data.id,
      reportId: data.report_id,
      versionNumber: data.version_number,
      pdfUrl: data.pdf_url ?? undefined,
      isFinal: data.is_final,
      notes: data.notes ?? undefined,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  },

  async listVersions(reportId: string): Promise<AuditReportVersion[]> {
    const { data, error } = await supabase
      .from('ce_audit_report_versions')
      .select('*')
      .eq('report_id', reportId)
      .order('version_number', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      id: d.id,
      reportId: d.report_id,
      versionNumber: d.version_number,
      pdfUrl: d.pdf_url ?? undefined,
      isFinal: d.is_final,
      notes: d.notes ?? undefined,
      createdBy: d.created_by,
      createdAt: d.created_at,
    }));
  },

  // ---- Finalize ----------
  async finalize(reportId: string, pdfUrl?: string): Promise<void> {
    const userCode = await whoami();
    const verificationRef = `VR-${reportId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase
      .from('ce_employer_audit_reports')
      .update({
        status: 'FINAL',
        pdf_url: pdfUrl ?? null,
        finalized_at: nowIso(),
        finalized_by: userCode,
        verification_ref: verificationRef,
        updated_by: userCode,
        updated_at: nowIso(),
      } as any)
      .eq('id', reportId);
    if (error) throw error;
    await this.snapshotVersion(reportId, { isFinal: true, pdfUrl, notes: 'Finalized' });
  },

  // ---- Signatures ----------
  /** Active (non-superseded) signatures only. */
  async listSignatures(reportId: string): Promise<AuditReportSignature[]> {
    const { data, error } = await supabase
      .from('ce_audit_report_signatures')
      .select('*')
      .eq('report_id', reportId)
      .is('superseded_by', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSignature);
  },

  /** Full history including superseded rows (for audit trail UI). */
  async listAllSignatures(reportId: string): Promise<AuditReportSignature[]> {
    const { data, error } = await supabase
      .from('ce_audit_report_signatures')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSignature);
  },

  async listSignatureEvents(reportId: string): Promise<AuditReportSignatureEvent[]> {
    const { data, error } = await supabase
      .from('ce_audit_report_signature_events' as any)
      .select('*')
      .eq('report_id', reportId)
      .order('event_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as any[]).map((d: any) => ({
      id: d.id,
      reportId: d.report_id,
      signatureId: d.signature_id ?? undefined,
      eventType: d.event_type,
      actorUserCode: d.actor_user_code ?? undefined,
      metadata: d.metadata ?? {},
      eventAt: d.event_at,
    }));
  },

  async captureSignature(params: {
    reportId: string;
    signerRole: SignerRole;
    signerName: string;
    signerDesignation?: string;
    signerEmail?: string;
    // Identity linkage
    signerSameAsContact?: boolean;
    signerAuthorityNote?: string;
    signerRelationship?: string;
    // Witness (optional)
    witnessName?: string;
    witnessDesignation?: string;
    witnessSignatureDataUrl?: string;
    // Signature payload
    signatureType: SignatureType;
    signatureDataUrl?: string;
    typedName?: string;
    attestationText?: string;
    comments?: string;
    refusalReason?: string;
    /** If supplied, supersede this signature (replace). */
    supersedePrevious?: boolean;
  }): Promise<AuditReportSignature> {
    const userCode = await whoami();
    let signatureImageUrl: string | undefined;
    let witnessSignatureImageUrl: string | undefined;

    if (params.signatureDataUrl?.startsWith('data:image/')) {
      signatureImageUrl = await uploadSignatureImage(params.reportId, params.signerRole, params.signatureDataUrl);
    }
    if (params.witnessSignatureDataUrl?.startsWith('data:image/')) {
      witnessSignatureImageUrl = await uploadSignatureImage(params.reportId, `${params.signerRole}-WITNESS`, params.witnessSignatureDataUrl);
    }

    // Supersede any existing active signature for the same role
    let supersededId: string | null = null;
    if (params.supersedePrevious !== false) {
      const { data: existing } = await supabase
        .from('ce_audit_report_signatures')
        .select('id')
        .eq('report_id', params.reportId)
        .eq('signer_role', params.signerRole)
        .is('superseded_by', null)
        .maybeSingle();
      if (existing) supersededId = (existing as any).id;
    }

    const { data, error } = await supabase
      .from('ce_audit_report_signatures')
      .insert({
        report_id: params.reportId,
        signer_role: params.signerRole,
        signer_name: params.signerName,
        signer_designation: params.signerDesignation ?? null,
        signer_email: params.signerEmail ?? null,
        signer_same_as_contact: params.signerSameAsContact ?? false,
        signer_authority_note: params.signerAuthorityNote ?? null,
        signer_relationship: params.signerRelationship ?? null,
        witness_name: params.witnessName ?? null,
        witness_designation: params.witnessDesignation ?? null,
        witness_signature_image_url: witnessSignatureImageUrl ?? null,
        signature_type: params.signatureType,
        signature_image_url: signatureImageUrl ?? null,
        typed_name: params.typedName ?? null,
        attestation_text: params.attestationText ?? null,
        comments: params.comments ?? null,
        refusal_reason: params.refusalReason ?? null,
        signed_at: ['REFUSED', 'UNAVAILABLE'].includes(params.signatureType) ? null : nowIso(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        captured_by: userCode,
      } as any)
      .select('*')
      .single();
    if (error) throw error;

    // Mark previous as superseded
    if (supersededId) {
      await supabase
        .from('ce_audit_report_signatures')
        .update({
          superseded_by: data.id,
          superseded_at: nowIso(),
          superseded_reason: 'Replaced by new signature',
        } as any)
        .eq('id', supersededId);
      await logEvent(params.reportId, supersededId, 'SUPERSEDED', { replaced_by: data.id });
    }

    await logEvent(params.reportId, data.id, 'CREATED', {
      role: params.signerRole,
      type: params.signatureType,
      same_as_contact: params.signerSameAsContact ?? false,
    });

    return mapSignature(data);
  },

  /** Supersede (soft-delete) a signature with a reason. */
  async supersedeSignature(signatureId: string, reason: string): Promise<void> {
    const { data: row, error: fetchErr } = await supabase
      .from('ce_audit_report_signatures')
      .select('report_id')
      .eq('id', signatureId)
      .single();
    if (fetchErr) throw fetchErr;

    const { error } = await supabase
      .from('ce_audit_report_signatures')
      .update({
        superseded_at: nowIso(),
        superseded_reason: reason,
      } as any)
      .eq('id', signatureId);
    if (error) throw error;
    await logEvent((row as any).report_id, signatureId, 'SUPERSEDED', { reason });
  },

  // ---- Acknowledgment (deferred e-sign tokens) ----------
  async createAcknowledgmentLink(params: {
    reportId: string;
    recipientName: string;
    recipientEmail?: string;
    recipientDesignation?: string;
    expiryDays?: number;
  }): Promise<AuditReportAcknowledgment> {
    const userCode = await whoami();
    const token = genToken();

    // Phase 3 — Resolve & snapshot online-response permissions for this ack link.
    let snap: Awaited<ReturnType<typeof resolveOnlineResponse>>;
    try {
      snap = await resolveOnlineResponse({
        communicationType: 'final_report',
        reportType: 'audit_report',
      });
    } catch {
      snap = { enabled: false, mode: 'ACKNOWLEDGMENT_ONLY', permissions: {}, review: {} };
    }

    const ttlHours = snap.ttl_hours ?? (params.expiryDays ?? 14) * 24;
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + ttlHours);
    const dueAt = snap.due_days
      ? new Date(Date.now() + snap.due_days * 24 * 3600 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('ce_audit_report_acknowledgments')
      .insert({
        report_id: params.reportId,
        recipient_name: params.recipientName,
        recipient_email: params.recipientEmail ?? null,
        recipient_designation: params.recipientDesignation ?? null,
        link_token: token,
        expires_at: expiry.toISOString(),
        created_by: userCode,
        portal_resolved_enabled: snap.enabled,
        portal_resolved_mode: snap.mode,
        portal_resolved_permissions_json: snap.permissions,
        response_due_at: dueAt,
      } as any)
      .select('*')
      .single();
    if (error) throw error;

    await supabase
      .from('ce_employer_audit_reports')
      .update({
        acknowledgment_status: 'SENT',
        acknowledgment_sent_at: nowIso(),
        updated_by: userCode,
        updated_at: nowIso(),
      } as any)
      .eq('id', params.reportId);

    return {
      id: data.id,
      reportId: data.report_id,
      recipientName: data.recipient_name,
      recipientEmail: data.recipient_email ?? undefined,
      recipientDesignation: data.recipient_designation ?? undefined,
      linkToken: data.link_token,
      expiresAt: data.expires_at,
      sentAt: data.sent_at,
      firstViewedAt: data.first_viewed_at ?? undefined,
      lastViewedAt: data.last_viewed_at ?? undefined,
      viewCount: data.view_count ?? 0,
      status: data.status as AuditReportAcknowledgment['status'],
      signatureId: data.signature_id ?? undefined,
      createdAt: data.created_at,
    };
  },

  async listAcknowledgments(reportId: string): Promise<AuditReportAcknowledgment[]> {
    const { data, error } = await supabase
      .from('ce_audit_report_acknowledgments')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      id: d.id,
      reportId: d.report_id,
      recipientName: d.recipient_name,
      recipientEmail: d.recipient_email ?? undefined,
      recipientDesignation: d.recipient_designation ?? undefined,
      linkToken: d.link_token,
      expiresAt: d.expires_at,
      sentAt: d.sent_at,
      firstViewedAt: d.first_viewed_at ?? undefined,
      lastViewedAt: d.last_viewed_at ?? undefined,
      viewCount: d.view_count ?? 0,
      status: d.status,
      signatureId: d.signature_id ?? undefined,
      createdAt: d.created_at,
    }));
  },

  async getReportByToken(token: string): Promise<{ ack: AuditReportAcknowledgment; report: FullAuditReport } | null> {
    const { data: ack } = await supabase
      .from('ce_audit_report_acknowledgments')
      .select('*')
      .eq('link_token', token)
      .maybeSingle();
    if (!ack) return null;

    await supabase
      .from('ce_audit_report_acknowledgments')
      .update({
        first_viewed_at: (ack as any).first_viewed_at ?? nowIso(),
        last_viewed_at: nowIso(),
        view_count: ((ack as any).view_count ?? 0) + 1,
        status: (ack as any).status === 'PENDING' ? 'VIEWED' : (ack as any).status,
      } as any)
      .eq('id', (ack as any).id);

    await logEvent((ack as any).report_id, null, 'VIEWED_VIA_TOKEN', { token_id: (ack as any).id });

    const report = await this.getReport((ack as any).report_id);
    if (!report) return null;

    return {
      ack: {
        id: (ack as any).id,
        reportId: (ack as any).report_id,
        recipientName: (ack as any).recipient_name,
        recipientEmail: (ack as any).recipient_email ?? undefined,
        recipientDesignation: (ack as any).recipient_designation ?? undefined,
        linkToken: (ack as any).link_token,
        expiresAt: (ack as any).expires_at,
        sentAt: (ack as any).sent_at,
        firstViewedAt: (ack as any).first_viewed_at ?? undefined,
        lastViewedAt: (ack as any).last_viewed_at ?? undefined,
        viewCount: (ack as any).view_count ?? 0,
        status: (ack as any).status as AuditReportAcknowledgment['status'],
        signatureId: (ack as any).signature_id ?? undefined,
        createdAt: (ack as any).created_at,
      },
      report,
    };
  },

  // ---- Violations attached to this report ----------
  /**
   * Returns audit-grade violation rows for a report.
   * Joins ce_violations → ce_violation_types so the report can show the
   * violation code/category alongside finance fields.
   * Each row also carries a sourceFindingNumber when a 1:1 finding link exists.
   */
  async listViolationsForReport(inspectionId: string): Promise<AuditViolationRow[]> {
    const [{ data: vRows, error }, { data: findingRows }] = await Promise.all([
      supabase
        .from('ce_violations')
        .select('*, ce_violation_types(code, name, category, fund_type)')
        .eq('inspection_id', inspectionId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: true }),
      supabase
        .from('ce_inspection_findings')
        .select('id, violation_id, created_at')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: true }),
    ]);
    if (error) throw error;

    // Build a finding-id → display index (1-based) map matching the report
    const findingIndexById = new Map<string, number>();
    const violationToFinding = new Map<string, string>();
    (findingRows ?? []).forEach((f: any, i: number) => {
      findingIndexById.set(f.id, i + 1);
      if (f.violation_id) violationToFinding.set(f.violation_id, f.id);
    });

    return (vRows ?? []).map((row: any): AuditViolationRow => {
      const vt = row.ce_violation_types ?? {};
      const sourceFindingId = violationToFinding.get(row.id);
      return {
        id: row.id,
        violationNumber: row.violation_number ?? undefined,
        violationTypeId: row.violation_type_id ?? undefined,
        violationTypeName: vt.name ?? undefined,
        statutoryReference: vt.code ?? undefined,
        summary: row.summary ?? row.description ?? undefined,
        description: row.description ?? undefined,
        severity: row.severity ?? undefined,
        fundType: row.fund_type ?? vt.fund_type ?? undefined,
        periodFrom: row.period_from ?? undefined,
        periodTo: row.period_to ?? undefined,
        principalAmount: row.principal_amount != null ? Number(row.principal_amount) : undefined,
        penaltyAmount: row.penalty_amount != null ? Number(row.penalty_amount) : undefined,
        interestAmount: row.interest_amount != null ? Number(row.interest_amount) : undefined,
        totalAmount: row.total_amount != null ? Number(row.total_amount) : undefined,
        dueDate: row.due_date ?? undefined,
        status: row.status ?? undefined,
        priority: row.priority ?? undefined,
        sourceFindingId,
        sourceFindingNumber: sourceFindingId ? findingIndexById.get(sourceFindingId) : undefined,
        assignedToName: row.assigned_to_name ?? undefined,
        caseId: row.case_id ?? undefined,
        caseFamily: row.case_family ?? undefined,
        resolutionNotes: row.resolution_notes ?? undefined,
      };
    });
  },

  // ---- Full payload assembly ----------
  async assembleFullPayload(inspectionId: string): Promise<{
    report: FullAuditReport | null;
    findings: InspectionFinding[];
    evidence: InspectionEvidence[];
    checklist: any[];
    violations: AuditViolationRow[];
    signatures: AuditReportSignature[];
    inspection: any;
    metrics: any;
    generatedAt: string;
  }> {
    const report = await this.getReportByInspection(inspectionId);
    const [payload, evidence, signatures, violations] = await Promise.all([
      fieldAuditService.getReportPayload(inspectionId),
      fieldAuditService.getEvidenceForVisit(inspectionId),
      report ? this.listSignatures(report.id) : Promise.resolve([] as AuditReportSignature[]),
      this.listViolationsForReport(inspectionId),
    ]);
    return {
      report,
      findings: payload.findings,
      evidence,
      checklist: payload.checklist,
      violations,
      signatures,
      inspection: payload.inspection,
      metrics: payload.metrics,
      generatedAt: nowIso(),
    };
  },
};
