// ============================================
// AUDIT REPORT SERVICE
// Enterprise-grade Employer Audit Report operations:
// versioning, signatures, acknowledgment, full payload assembly.
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserCode } from '@/hooks/useUserCode';
import { fieldAuditService } from './fieldAuditService';
import type {
  FullAuditReport,
  AuditReportSignature,
  AuditReportVersion,
  AuditReportAcknowledgment,
  SignerRole,
  SignatureType,
} from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';

const nowIso = () => new Date().toISOString();
const whoami = async () => (await getCurrentUserCode()) ?? 'SYSTEM';

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
    totalFindings: r.total_findings ?? 0,
    totalEvidence: r.total_evidence ?? 0,
    totalViolations: r.total_violations ?? 0,
    checklistCompletionPct: Number(r.checklist_completion_pct ?? 0),
    pdfUrl: r.pdf_url ?? undefined,
    signedPdfUrl: r.signed_pdf_url ?? undefined,
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
    createdAt: r.created_at,
  };
}

function genToken(): string {
  // 32-char URL-safe random
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

  // ---- Update narrative (extended) ----------
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
      auditDate: string;
      auditLocation: string;
      employerRegNumber: string;
    }>
  ): Promise<void> {
    const userCode = await whoami();
    const update: any = {
      updated_by: userCode,
      updated_at: nowIso(),
    };
    if (fields.executiveSummary !== undefined) update.executive_summary = fields.executiveSummary;
    if (fields.scope !== undefined) update.scope = fields.scope;
    if (fields.purposeScope !== undefined) update.purpose_scope = fields.purposeScope;
    if (fields.recordsReviewed !== undefined) update.records_reviewed = fields.recordsReviewed;
    if (fields.conclusions !== undefined) update.conclusions = fields.conclusions;
    if (fields.complianceConclusion !== undefined) update.compliance_conclusion = fields.complianceConclusion;
    if (fields.recommendations !== undefined) update.recommendations = fields.recommendations;
    if (fields.auditDate !== undefined) update.audit_date = fields.auditDate;
    if (fields.auditLocation !== undefined) update.audit_location = fields.auditLocation;
    if (fields.employerRegNumber !== undefined) update.employer_reg_number = fields.employerRegNumber;

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

    // determine next version number
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

    // bump current_version on parent
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
  async listSignatures(reportId: string): Promise<AuditReportSignature[]> {
    const { data, error } = await supabase
      .from('ce_audit_report_signatures')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSignature);
  },

  async captureSignature(params: {
    reportId: string;
    signerRole: SignerRole;
    signerName: string;
    signerDesignation?: string;
    signerEmail?: string;
    signatureType: SignatureType;
    signatureDataUrl?: string; // base64 data URL from canvas
    typedName?: string;
    attestationText?: string;
    comments?: string;
    refusalReason?: string;
  }): Promise<AuditReportSignature> {
    const userCode = await whoami();
    let signatureImageUrl: string | undefined;

    // Upload canvas signature if provided
    if (params.signatureDataUrl && params.signatureDataUrl.startsWith('data:image/')) {
      const blob = dataUrlToBlob(params.signatureDataUrl);
      const path = `audit-reports/${params.reportId}/signatures/${params.signerRole}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(path, blob, { upsert: true, contentType: 'image/png' });
      if (!upErr) {
        const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
        signatureImageUrl = pub.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from('ce_audit_report_signatures')
      .insert({
        report_id: params.reportId,
        signer_role: params.signerRole,
        signer_name: params.signerName,
        signer_designation: params.signerDesignation ?? null,
        signer_email: params.signerEmail ?? null,
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

    return mapSignature(data);
  },

  async deleteSignature(signatureId: string): Promise<void> {
    const { error } = await supabase
      .from('ce_audit_report_signatures')
      .delete()
      .eq('id', signatureId);
    if (error) throw error;
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
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (params.expiryDays ?? 14));

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
      status: data.status,
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

    // record view
    await supabase
      .from('ce_audit_report_acknowledgments')
      .update({
        first_viewed_at: (ack as any).first_viewed_at ?? nowIso(),
        last_viewed_at: nowIso(),
        view_count: ((ack as any).view_count ?? 0) + 1,
        status: (ack as any).status === 'PENDING' ? 'VIEWED' : (ack as any).status,
      } as any)
      .eq('id', (ack as any).id);

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

  // ---- Full payload assembly (for preview + PDF + version snapshot) ----------
  async assembleFullPayload(inspectionId: string): Promise<{
    report: FullAuditReport | null;
    findings: InspectionFinding[];
    evidence: InspectionEvidence[];
    checklist: any[];
    violations: any[];
    signatures: AuditReportSignature[];
    inspection: any;
    metrics: any;
    generatedAt: string;
  }> {
    const report = await this.getReportByInspection(inspectionId);
    const payload = await fieldAuditService.getReportPayload(inspectionId);
    const signatures = report ? await this.listSignatures(report.id) : [];
    return {
      report,
      findings: payload.findings,
      evidence: payload.evidence,
      checklist: payload.checklist,
      violations: payload.violations,
      signatures,
      inspection: payload.inspection,
      metrics: payload.metrics,
      generatedAt: nowIso(),
    };
  },
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);/)?.[1] ?? 'image/png';
  const byteChars = atob(b64);
  const arr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) arr[i] = byteChars.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
