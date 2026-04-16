// ============================================
// FIELD AUDIT SERVICE — Unified Compliance Field Audit
// Consolidates: weeklyAuditPlanService, inspectionService, weeklyReportService
// Persists: checklist responses, evidence, structured findings, audit reports
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserCode } from '@/hooks/useUserCode';
import {
  InspectionEvidence,
  InspectionFinding,
  EvidenceType,
  FindingType,
} from '@/types/inspectionTypes';
import { Violation } from '@/types/violation';
import type { ChecklistItem } from '@/types/auditChecklist';

// ── Types ──────────────────────────────────────────

export interface ChecklistResponse {
  id?: string;
  inspectionId: string;
  planItemId?: string;
  templateKey: string;
  category: string;
  questionId: string;
  questionText: string;
  response?: 'Yes' | 'No' | 'Partial' | 'N/A';
  notes?: string;
  evidenceRequired: boolean;
}

export interface StructuredFindingRequest {
  inspectionId: string;
  findingType: FindingType;
  title: string;
  category: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedAction?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
  evidenceIds?: string[];
}

export interface PlanExecutionVisitRow {
  planItemId: string;
  inspectionId?: string;
  visitDate: string;
  employerId?: string;
  employerName?: string;
  areaName?: string;
  visitType: string;
  executionStatus: string;
  checklistTotal: number;
  checklistAnswered: number;
  checklistPct: number;
  evidenceCount: number;
  findingsCount: number;
  hasReport: boolean;
  reportStatus?: string;
  followUpCount: number;
}

export interface PlanExecutionDashboard {
  planId: string;
  planNumber: string;
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  inspectorName?: string;
  visits: PlanExecutionVisitRow[];
  kpis: {
    planned: number;
    inProgress: number;
    completed: number;
    rescheduled: number;
    notDone: number;
    totalEvidence: number;
    totalFindings: number;
    totalReports: number;
  };
}

export interface EmployerAuditReportRow {
  id: string;
  reportNumber: string;
  inspectionId: string;
  employerId?: string;
  employerName?: string;
  inspectorId?: string;
  inspectorName?: string;
  reportDate: string;
  executiveSummary?: string;
  scope?: string;
  conclusions?: string;
  recommendations?: string;
  totalFindings: number;
  totalEvidence: number;
  totalViolations: number;
  checklistCompletionPct: number;
  status: 'DRAFT' | 'FINAL' | 'SHARED';
  pdfUrl?: string;
  generatedAt?: string;
  finalizedAt?: string;
}

export interface AccurateWeeklySummary {
  planId: string;
  plannedVisits: number;
  completedVisits: number;
  inProgressVisits: number;
  rescheduledVisits: number;
  notDoneVisits: number;
  totalHoursSpent: number;
  evidenceCollected: number;
  findingsByseverity: { Low: number; Medium: number; High: number; Critical: number };
  totalFindings: number;
  reportsGenerated: number;
  violationsOpened: number;
  violationsUpdated: number;
  followUpsCreated: number;
  inspectorNarrative: string;
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

async function whoami(): Promise<string> {
  return (await getCurrentUserCode()) ?? 'SYSTEM';
}

// ── Service ────────────────────────────────────────

export const fieldAuditService = {
  // ── Checklist Responses ──────────────────────────

  async saveChecklistResponses(
    inspectionId: string,
    planItemId: string | undefined,
    templateKey: string,
    items: ChecklistItem[]
  ): Promise<void> {
    const userCode = await whoami();
    const rows = items.map((it) => ({
      inspection_id: inspectionId,
      plan_item_id: planItemId ?? null,
      template_key: templateKey,
      category: it.category,
      question_id: it.id,
      question_text: it.question,
      response: it.response ?? null,
      notes: it.notes ?? null,
      evidence_required: !!it.evidenceRequired,
      created_by: userCode,
      updated_by: userCode,
      updated_at: nowIso(),
    }));

    const { error } = await supabase
      .from('ce_audit_checklist_responses')
      .upsert(rows as any, { onConflict: 'inspection_id,question_id' });
    if (error) throw error;
  },

  async getChecklistResponses(inspectionId: string): Promise<ChecklistResponse[]> {
    const { data, error } = await supabase
      .from('ce_audit_checklist_responses')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('category', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      inspectionId: r.inspection_id,
      planItemId: r.plan_item_id ?? undefined,
      templateKey: r.template_key,
      category: r.category,
      questionId: r.question_id,
      questionText: r.question_text,
      response: r.response ?? undefined,
      notes: r.notes ?? undefined,
      evidenceRequired: !!r.evidence_required,
    }));
  },

  async getChecklistCompletionStats(
    inspectionId: string
  ): Promise<{ total: number; answered: number; pct: number }> {
    const { data, error } = await supabase
      .from('ce_audit_checklist_responses')
      .select('response')
      .eq('inspection_id', inspectionId);
    if (error) throw error;
    const total = data?.length ?? 0;
    const answered = (data ?? []).filter((r: any) => r.response).length;
    const pct = total === 0 ? 0 : Math.round((answered / total) * 1000) / 10;
    return { total, answered, pct };
  },

  // ── Evidence (FIXED: writes to ce_inspection_evidence) ──

  async uploadEvidence(params: {
    inspectionId: string;
    planItemId?: string;
    findingId?: string;
    file: File;
    evidenceType: EvidenceType;
    description?: string;
    gpsLat?: number;
    gpsLng?: number;
  }): Promise<InspectionEvidence> {
    const userCode = await whoami();
    const path = `inspections/${params.inspectionId}/${Date.now()}-${params.file.name}`;
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, params.file, { upsert: false });

    let fileUrl = '';
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('ce_inspection_evidence')
      .insert({
        inspection_id: params.inspectionId,
        plan_item_id: params.planItemId ?? null,
        finding_id: params.findingId ?? null,
        evidence_type: params.evidenceType,
        file_name: params.file.name,
        file_url: fileUrl,
        file_size: params.file.size,
        description: params.description ?? null,
        gps_lat: params.gpsLat ?? null,
        gps_lng: params.gpsLng ?? null,
        captured_at: nowIso(),
        captured_by: userCode,
        created_by: userCode,
      } as any)
      .select('*')
      .single();
    if (error) throw error;

    return {
      id: data.id,
      inspectionVisitId: data.inspection_id,
      employerId: '',
      evidenceType: data.evidence_type as EvidenceType,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size ?? 0,
      description: data.description ?? '',
      capturedAt: data.captured_at,
      capturedByUserId: data.captured_by ?? userCode,
      capturedByName: data.captured_by ?? userCode,
      gpsLat: data.gps_lat ?? undefined,
      gpsLng: data.gps_lng ?? undefined,
    };
  },

  async getEvidenceForVisit(inspectionId: string): Promise<InspectionEvidence[]> {
    const { data, error } = await supabase
      .from('ce_inspection_evidence')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('captured_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      inspectionVisitId: r.inspection_id,
      employerId: '',
      evidenceType: r.evidence_type,
      fileName: r.file_name,
      fileUrl: r.file_url,
      fileSize: r.file_size ?? 0,
      description: r.description ?? '',
      capturedAt: r.captured_at,
      capturedByUserId: r.captured_by ?? '',
      capturedByName: r.captured_by ?? '',
      gpsLat: r.gps_lat ?? undefined,
      gpsLng: r.gps_lng ?? undefined,
    }));
  },

  async linkEvidenceToFinding(evidenceId: string, findingId: string): Promise<void> {
    const userCode = await whoami();
    const { error } = await supabase
      .from('ce_inspection_evidence')
      .update({ finding_id: findingId, updated_by: userCode, updated_at: nowIso() } as any)
      .eq('id', evidenceId);
    if (error) throw error;
  },

  // ── Structured Findings ─────────────────────────

  async createStructuredFinding(req: StructuredFindingRequest): Promise<{ id: string }> {
    const userCode = await whoami();
    const { data, error } = await supabase
      .from('ce_inspection_findings')
      .insert({
        inspection_id: req.inspectionId,
        finding_type: req.findingType,
        title: req.title,
        category: req.category,
        description: req.description,
        severity: req.severity,
        recommended_action: req.recommendedAction ?? null,
        follow_up_required: req.followUpRequired ?? false,
        follow_up_notes: req.followUpNotes ?? null,
        violation_created: false,
        created_by: userCode,
      } as any)
      .select('id')
      .single();
    if (error) throw error;

    if (req.evidenceIds && req.evidenceIds.length > 0) {
      await Promise.all(
        req.evidenceIds.map((evId) => this.linkEvidenceToFinding(evId, data.id))
      );
    }
    return { id: data.id };
  },

  // ── Follow-up from Finding ──────────────────────

  async createFollowUpFromFinding(params: {
    findingId: string;
    employerId?: string;
    employerName?: string;
    actionType: string;
    description: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    dueDate: string;
    assignedToUserId?: string;
    assignedToName?: string;
    notes?: string;
  }): Promise<{ id: string }> {
    const userCode = await whoami();
    const { data, error } = await supabase
      .from('ce_follow_up_actions')
      .insert({
        finding_id: params.findingId,
        violation_id: null,
        employer_id: params.employerId ?? null,
        employer_name: params.employerName ?? null,
        action_type: params.actionType,
        description: params.description,
        priority: params.priority,
        status: 'OPEN',
        due_date: params.dueDate,
        assigned_to_user_id: params.assignedToUserId ?? null,
        assigned_to_name: params.assignedToName ?? null,
        notes: params.notes ?? null,
        source: 'FINDING',
        created_by: userCode,
      } as any)
      .select('id')
      .single();
    if (error) throw error;

    // Mark finding follow_up_required = true
    await supabase
      .from('ce_inspection_findings')
      .update({ follow_up_required: true, updated_by: userCode, updated_at: nowIso() } as any)
      .eq('id', params.findingId);

    return { id: data.id };
  },

  // ── Findings & Violations reads (canonical) ─────

  async getFindingsForVisit(inspectionId: string): Promise<InspectionFinding[]> {
    const { data, error } = await supabase
      .from('ce_inspection_findings')
      .select('*, ce_inspection_evidence(id)')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      inspectionVisitId: row.inspection_id ?? '',
      employerId: '',
      findingType: row.finding_type ?? 'INFORMATION_ONLY',
      title: row.title ?? (row.description?.substring(0, 80) ?? ''),
      category: row.category ?? '',
      description: row.description ?? '',
      severity: row.severity ?? 'Medium',
      recommendedAction: row.recommended_action ?? undefined,
      followUpRequired: !!row.follow_up_required,
      isViolationCreated: !!row.violation_created,
      violationId: row.violation_id ?? undefined,
      evidenceIds: (row.ce_inspection_evidence ?? []).map((e: any) => e.id),
      createdAt: row.created_at,
      createdByUserId: row.created_by ?? '',
      createdByName: row.created_by ?? '',
    }));
  },

  async getViolationsForVisit(inspectionId: string): Promise<Violation[]> {
    const { data, error } = await supabase
      .from('ce_violations')
      .select('*')
      .eq('inspection_id', inspectionId);
    if (error) throw error;
    return (data ?? []).map((row: any): Violation => ({
      id: row.id,
      violationNumber: row.violation_number ?? '',
      employerId: row.employer_id ?? '',
      employerName: row.employer_name ?? '',
      violationType: row.violation_type ?? 'OTHER',
      status: row.status ?? 'OPEN',
      severity: row.severity ?? 'Medium',
      priority: row.severity ?? 'Medium',
      description: row.description ?? '',
      summary: row.description ?? '',
      territory: row.territory ?? 'St Kitts',
      discoveredDate: row.detected_date ?? row.created_at,
      discoveredBy: row.detected_by ?? '',
      assignedToUserId: row.assigned_to_user_id ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
      inspectionVisitId: row.inspection_id,
      isUnlinked: false,
    }));
  },

  // ── Unified per-visit metrics (single source of truth) ──

  async getVisitMetrics(inspectionId: string) {
    const { data, error } = await supabase
      .from('ce_v_visit_execution_metrics' as any)
      .select('*')
      .eq('inspection_id', inspectionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getVisitMetricsBatch(inspectionIds: string[]) {
    if (!inspectionIds.length) return [] as any[];
    const { data, error } = await supabase
      .from('ce_v_visit_execution_metrics' as any)
      .select('*')
      .in('inspection_id', inspectionIds);
    if (error) throw error;
    return data ?? [];
  },

  // ── Plan Execution Dashboard (refactored to use view) ──

  async getPlanExecutionDashboard(planId: string): Promise<PlanExecutionDashboard> {
    const { data: plan, error: planErr } = await supabase
      .from('ce_weekly_plans')
      .select('*')
      .eq('id', planId)
      .single();
    if (planErr) throw planErr;

    const { data: items, error: itemsErr } = await supabase
      .from('ce_weekly_plan_items')
      .select('*')
      .eq('plan_id', planId)
      .order('scheduled_date', { ascending: true });
    if (itemsErr) throw itemsErr;

    const planItemIds = (items ?? []).map((i: any) => i.id);

    // Pull metrics by plan_item_id (now linked via ce_inspections.plan_item_id)
    let metricsByPlanItem = new Map<string, any>();
    if (planItemIds.length) {
      const { data: metrics } = await supabase
        .from('ce_v_visit_execution_metrics' as any)
        .select('*')
        .in('plan_item_id', planItemIds);
      (metrics ?? []).forEach((m: any) => {
        if (m.plan_item_id) metricsByPlanItem.set(m.plan_item_id, m);
      });
    }

    // Follow-ups by employer (carry over count)
    const employerIds = Array.from(
      new Set((items ?? []).map((i: any) => i.employer_id).filter(Boolean))
    );
    const followUpByEmp = new Map<string, number>();
    if (employerIds.length) {
      const { data: fu } = await supabase
        .from('ce_follow_up_actions')
        .select('employer_id')
        .in('employer_id', employerIds)
        .eq('is_deleted', false);
      (fu ?? []).forEach((r: any) =>
        followUpByEmp.set(r.employer_id, (followUpByEmp.get(r.employer_id) ?? 0) + 1)
      );
    }

    const visits: PlanExecutionVisitRow[] = (items ?? []).map((it: any) => {
      const m = metricsByPlanItem.get(it.id);
      return {
        planItemId: it.id,
        inspectionId: m?.inspection_id,
        visitDate: it.scheduled_date,
        employerId: it.employer_id ?? undefined,
        employerName: it.employer_name ?? undefined,
        areaName: it.area_name ?? undefined,
        visitType: it.visit_type ?? it.item_type ?? 'AUDIT',
        executionStatus: it.execution_status ?? 'PLANNED',
        checklistTotal: m?.checklist_total ?? 0,
        checklistAnswered: m?.checklist_answered ?? 0,
        checklistPct: Number(m?.checklist_pct ?? 0),
        evidenceCount: m?.evidence_count ?? 0,
        findingsCount: m?.findings_count ?? 0,
        hasReport: !!m?.report_id,
        reportStatus: m?.report_status ?? undefined,
        followUpCount: it.employer_id ? followUpByEmp.get(it.employer_id) ?? 0 : 0,
      };
    });

    const kpis = {
      planned: visits.filter((v) => v.executionStatus === 'PLANNED' || v.executionStatus === 'NOT_STARTED').length,
      inProgress: visits.filter((v) => v.executionStatus === 'IN_PROGRESS').length,
      completed: visits.filter((v) => v.executionStatus === 'COMPLETED').length,
      rescheduled: visits.filter((v) => v.executionStatus === 'RESCHEDULED').length,
      notDone: visits.filter((v) => v.executionStatus === 'NOT_DONE' || v.executionStatus === 'CANCELLED').length,
      totalEvidence: visits.reduce((s, v) => s + v.evidenceCount, 0),
      totalFindings: visits.reduce((s, v) => s + v.findingsCount, 0),
      totalReports: visits.filter((v) => v.hasReport).length,
    };

    return {
      planId,
      planNumber: (plan as any).plan_number,
      weekStartDate: (plan as any).week_start_date,
      weekEndDate: (plan as any).week_end_date,
      status: (plan as any).status,
      inspectorName: (plan as any).inspector_name,
      visits,
      kpis,
    };
  },

  // ── Report Payload Aggregation (auto-derive) ────

  async getReportPayload(inspectionId: string) {
    const [
      { data: inspection },
      { data: checklist },
      { data: evidence },
      findings,
      violations,
      { data: interaction },
      { data: workingPapers },
      metrics,
    ] = await Promise.all([
      supabase.from('ce_inspections').select('*').eq('id', inspectionId).maybeSingle(),
      supabase.from('ce_audit_checklist_responses').select('*').eq('inspection_id', inspectionId).order('category'),
      supabase.from('ce_inspection_evidence').select('*').eq('inspection_id', inspectionId).order('captured_at'),
      this.getFindingsForVisit(inspectionId),
      this.getViolationsForVisit(inspectionId),
      supabase.from('ce_inspection_employer_interactions').select('*').eq('inspection_id', inspectionId).maybeSingle(),
      supabase.from('ce_inspection_working_papers').select('*').eq('inspection_id', inspectionId),
      this.getVisitMetrics(inspectionId),
    ]);

    return {
      inspection,
      checklist: checklist ?? [],
      evidence: evidence ?? [],
      findings,
      violations,
      interaction,
      workingPapers: workingPapers ?? [],
      metrics,
    };
  },

  // ── Employer Audit Report ───────────────────────

  async generateEmployerAuditReport(inspectionId: string): Promise<EmployerAuditReportRow> {
    const userCode = await whoami();
    const payload = await this.getReportPayload(inspectionId);
    if (!payload.inspection) throw new Error('Inspection not found');

    const insp: any = payload.inspection;
    const m: any = payload.metrics ?? {};

    const reportFields = {
      inspection_id: inspectionId,
      plan_item_id: insp.plan_item_id ?? null,
      employer_id: insp.employer_id,
      employer_name: insp.employer_name,
      inspector_id: insp.inspector_id,
      inspector_name: insp.inspector_name,
      total_findings: m.findings_count ?? payload.findings.length,
      total_evidence: m.evidence_count ?? payload.evidence.length,
      total_violations: m.violations_count ?? payload.violations.length,
      checklist_completion_pct: Number(m.checklist_pct ?? 0),
      generated_at: nowIso(),
      generated_by: userCode,
      updated_by: userCode,
      updated_at: nowIso(),
    };

    const { data: existing } = await supabase
      .from('ce_employer_audit_reports')
      .select('*')
      .eq('inspection_id', inspectionId)
      .maybeSingle();

    let row: any;
    if (existing && existing.status !== 'FINAL') {
      const { data, error } = await supabase
        .from('ce_employer_audit_reports')
        .update(reportFields as any)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      row = data;
    } else if (!existing) {
      const { data, error } = await supabase
        .from('ce_employer_audit_reports')
        .insert({ ...reportFields, created_by: userCode } as any)
        .select('*')
        .single();
      if (error) throw error;
      row = data;
    } else {
      row = existing;
    }

    // Back-fill audit_report_id on violations of this inspection
    if (row?.id) {
      await supabase
        .from('ce_violations')
        .update({ audit_report_id: row.id, updated_by: userCode, updated_at: nowIso() } as any)
        .eq('inspection_id', inspectionId)
        .is('audit_report_id', null);
    }

    return mapReport(row);
  },

  async getEmployerAuditReport(inspectionId: string): Promise<EmployerAuditReportRow | null> {
    const { data, error } = await supabase
      .from('ce_employer_audit_reports')
      .select('*')
      .eq('inspection_id', inspectionId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReport(data) : null;
  },

  async updateAuditReportNarrative(
    reportId: string,
    fields: { executiveSummary?: string; scope?: string; conclusions?: string; recommendations?: string }
  ): Promise<void> {
    const userCode = await whoami();
    const { error } = await supabase
      .from('ce_employer_audit_reports')
      .update({
        executive_summary: fields.executiveSummary ?? null,
        scope: fields.scope ?? null,
        conclusions: fields.conclusions ?? null,
        recommendations: fields.recommendations ?? null,
        updated_by: userCode,
        updated_at: nowIso(),
      } as any)
      .eq('id', reportId);
    if (error) throw error;
  },

  async finalizeAuditReport(reportId: string, pdfUrl?: string): Promise<void> {
    const userCode = await whoami();
    const { error } = await supabase
      .from('ce_employer_audit_reports')
      .update({
        status: 'FINAL',
        pdf_url: pdfUrl ?? null,
        finalized_at: nowIso(),
        finalized_by: userCode,
        updated_by: userCode,
        updated_at: nowIso(),
      } as any)
      .eq('id', reportId);
    if (error) throw error;
  },

  // ── Violation creation from Finding ─────────────

  async createViolationFromFinding(params: {
    findingId: string;
    inspectionId: string;
    employerId: string;
    employerName?: string;
    violationType: string;
    description: string;
    severity?: 'Low' | 'Medium' | 'High' | 'Critical';
    territory?: string;
  }): Promise<{ id: string; violationNumber: string }> {
    const userCode = await whoami();
    const violationNumber = `V-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

    // Look up existing report (if any) to back-link
    const { data: report } = await supabase
      .from('ce_employer_audit_reports')
      .select('id')
      .eq('inspection_id', params.inspectionId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('ce_violations')
      .insert({
        violation_number: violationNumber,
        employer_id: params.employerId,
        employer_name: params.employerName ?? null,
        violation_type: params.violationType,
        description: params.description,
        severity: params.severity ?? 'Medium',
        status: 'OPEN',
        territory: params.territory ?? 'St Kitts',
        inspection_id: params.inspectionId,
        audit_report_id: report?.id ?? null,
        detected_date: new Date().toISOString().slice(0, 10),
        detected_by: userCode,
        created_by: userCode,
      } as any)
      .select('id, violation_number')
      .single();
    if (error) throw error;

    // Mark finding as violation-created
    await supabase
      .from('ce_inspection_findings')
      .update({
        violation_created: true,
        violation_id: data.id,
        updated_by: userCode,
        updated_at: nowIso(),
      } as any)
      .eq('id', params.findingId);

    return { id: data.id, violationNumber: data.violation_number };
  },

  // ── Accurate Weekly Report Summary (uses view) ──

  async getAccurateWeeklySummary(planId: string): Promise<AccurateWeeklySummary> {
    const { data: plan } = await supabase
      .from('ce_weekly_plans')
      .select('*')
      .eq('id', planId)
      .single();

    const { data: items } = await supabase
      .from('ce_weekly_plan_items')
      .select('*')
      .eq('plan_id', planId);

    const allItems = items ?? [];
    const completed = allItems.filter((i: any) => i.execution_status === 'COMPLETED');
    const inProgress = allItems.filter((i: any) => i.execution_status === 'IN_PROGRESS');
    const rescheduled = allItems.filter((i: any) => i.execution_status === 'RESCHEDULED');
    const notDone = allItems.filter(
      (i: any) => i.execution_status === 'NOT_DONE' || i.execution_status === 'CANCELLED'
    );

    let totalHours = 0;
    completed.forEach((i: any) => {
      if (i.check_in_time && i.check_out_time) {
        totalHours += (new Date(i.check_out_time).getTime() - new Date(i.check_in_time).getTime()) / 3600000;
      }
    });

    // Pull all metrics by plan_item_id in one shot
    const planItemIds = allItems.map((i: any) => i.id);
    const metricsRows = await this.getVisitMetricsBatch(planItemIds.length ? [] : []);
    // Need fetch by plan_item_id, not inspection_id; use a direct query
    let metrics: any[] = [];
    if (planItemIds.length) {
      const { data } = await supabase
        .from('ce_v_visit_execution_metrics' as any)
        .select('*')
        .in('plan_item_id', planItemIds);
      metrics = data ?? [];
    }

    const sev = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    let evidenceCollected = 0;
    let totalFindings = 0;
    let reportsGenerated = 0;
    let violationsOpened = 0;
    let followUpsCreated = 0;

    metrics.forEach((m: any) => {
      evidenceCollected += m.evidence_count ?? 0;
      totalFindings += m.findings_count ?? 0;
      sev.Critical += m.findings_critical ?? 0;
      sev.High += m.findings_high ?? 0;
      sev.Medium += m.findings_medium ?? 0;
      sev.Low += m.findings_low ?? 0;
      if (m.report_id) reportsGenerated += 1;
      violationsOpened += m.violations_count ?? 0;
      followUpsCreated += m.followup_count ?? 0;
    });

    return {
      planId,
      plannedVisits: allItems.length,
      completedVisits: completed.length,
      inProgressVisits: inProgress.length,
      rescheduledVisits: rescheduled.length,
      notDoneVisits: notDone.length,
      totalHoursSpent: Math.round(totalHours * 10) / 10,
      evidenceCollected,
      findingsByseverity: sev,
      totalFindings,
      reportsGenerated,
      violationsOpened,
      violationsUpdated: 0,
      followUpsCreated,
      inspectorNarrative: (plan as any)?.outcome_narrative ?? '',
      generatedAt: nowIso(),
    };
  },

  // ── Weekly Report Submission / Review ──────────

  async submitWeeklyReport(planId: string, narrative: string): Promise<void> {
    const userCode = await whoami();
    const { error } = await supabase
      .from('ce_weekly_plans')
      .update({
        outcome_narrative: narrative,
        outcome_submitted_at: nowIso(),
        status: 'SUBMITTED',
        updated_by: userCode,
        updated_at: nowIso(),
      } as any)
      .eq('id', planId);
    if (error) throw error;
  },

  async reviewWeeklyReport(planId: string, approve: boolean, comments: string): Promise<void> {
    const userCode = await whoami();
    const { error } = await supabase
      .from('ce_weekly_plans')
      .update({
        status: approve ? 'COMPLETED' : 'NEED_CHANGES',
        reviewer_comments: comments,
        approved_by: approve ? userCode : null,
        approved_date: approve ? nowIso() : null,
        updated_by: userCode,
        updated_at: nowIso(),
      } as any)
      .eq('id', planId);
    if (error) throw error;
  },

  async getSubmittedWeeklyReports(): Promise<any[]> {
    const { data, error } = await supabase
      .from('ce_weekly_plans')
      .select('*')
      .in('status', ['SUBMITTED'])
      .order('outcome_submitted_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

function mapReport(r: any): EmployerAuditReportRow {
  return {
    id: r.id,
    reportNumber: r.report_number,
    inspectionId: r.inspection_id,
    employerId: r.employer_id ?? undefined,
    employerName: r.employer_name ?? undefined,
    inspectorId: r.inspector_id ?? undefined,
    inspectorName: r.inspector_name ?? undefined,
    reportDate: r.report_date,
    executiveSummary: r.executive_summary ?? undefined,
    scope: r.scope ?? undefined,
    conclusions: r.conclusions ?? undefined,
    recommendations: r.recommendations ?? undefined,
    totalFindings: r.total_findings ?? 0,
    totalEvidence: r.total_evidence ?? 0,
    totalViolations: r.total_violations ?? 0,
    checklistCompletionPct: Number(r.checklist_completion_pct ?? 0),
    status: r.status,
    pdfUrl: r.pdf_url ?? undefined,
    generatedAt: r.generated_at ?? undefined,
    finalizedAt: r.finalized_at ?? undefined,
  };
}
