// ============================================
// WEEKLY REPORT SERVICE - DB-BACKED
// ============================================

import { supabase } from '@/integrations/supabase/client';
import {
  WeeklyPlanItem,
  InspectionVisit,
  InspectionEvidence,
  InspectionFinding,
  WeeklyReportSummary,
  InspectionVisitStatus,
  FindingType,
} from '@/types/inspectionTypes';
import { Violation } from '@/types/violation';

function mapPlanItem(row: any): WeeklyPlanItem {
  return {
    id: row.id,
    inspectorUserId: row.created_by ?? '',
    inspectorName: '',
    itemType: row.item_type ?? 'EMPLOYER_VISIT',
    visitDate: row.scheduled_date ?? '',
    plannedDate: row.scheduled_date ?? '',
    employerId: row.employer_id ?? '',
    employerName: row.employer_name ?? '',
    territory: row.territory ?? 'St Kitts',
    status: row.execution_status ?? 'PLANNED',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    rescheduleReason: row.reschedule_reason ?? undefined,
    notDoneReason: row.not_done_reason ?? undefined,
    areaName: row.area_name ?? undefined,
  };
}

function mapInspection(row: any): InspectionVisit {
  return {
    id: row.id,
    weeklyPlanItemId: row.plan_item_id ?? '',
    employerId: row.employer_id ?? '',
    employerName: row.employer_name ?? '',
    inspectorUserId: row.inspector_id ?? '',
    inspectorName: '',
    territory: row.location_address ?? 'St Kitts',
    visitDate: row.scheduled_date ?? '',
    checkInTime: row.check_in_time ?? undefined,
    checkInGPSLat: row.check_in_lat ?? undefined,
    checkInGPSLng: row.check_in_lng ?? undefined,
    checkOutTime: row.check_out_time ?? undefined,
    checkOutGPSLat: row.check_out_lat ?? undefined,
    checkOutGPSLng: row.check_out_lng ?? undefined,
    visitStatus: row.status ?? 'PLANNED',
    status: row.status ?? 'PLANNED',
    visitNotes: row.notes ?? '',
    inspectorId: row.inspector_id ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

class WeeklyReportService {
  async getWeeklyPlanItems(inspectorId: string, weekStartDate: string): Promise<WeeklyPlanItem[]> {
    const weekEnd = this.getWeekEndDate(weekStartDate);
    let query = supabase
      .from('ce_weekly_plan_items' as any)
      .select('*')
      .gte('scheduled_date', weekStartDate)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date');

    if (inspectorId) {
      query = query.eq('created_by', inspectorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapPlanItem);
  }

  async getVisitById(visitId: string): Promise<InspectionVisit | undefined> {
    const { data, error } = await supabase
      .from('ce_inspections' as any)
      .select('*')
      .eq('id', visitId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapInspection(data) : undefined;
  }

  async getVisitByPlanItemId(planItemId: string): Promise<InspectionVisit | undefined> {
    const { data, error } = await supabase
      .from('ce_inspections' as any)
      .select('*')
      .eq('plan_item_id', planItemId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapInspection(data) : undefined;
  }

  async getEvidenceForVisit(visitId: string): Promise<InspectionEvidence[]> {
    const { data, error } = await supabase
      .from('ce_inspection_findings' as any)
      .select('*')
      .eq('inspection_id', visitId)
      .eq('finding_type', 'EVIDENCE');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      inspectionVisitId: row.inspection_id,
      employerId: '',
      visitId: row.inspection_id,
      evidenceType: row.category ?? 'DOCUMENT',
      type: row.category ?? 'DOCUMENT',
      fileName: row.title ?? '',
      fileUrl: '',
      fileSize: 0,
      description: row.description ?? '',
      capturedAt: row.created_at,
      capturedByUserId: row.created_by ?? '',
      capturedBy: row.created_by ?? '',
    }));
  }

  async getFindingsForVisit(visitId: string): Promise<InspectionFinding[]> {
    const { data, error } = await supabase
      .from('ce_inspection_findings' as any)
      .select('*')
      .eq('inspection_id', visitId)
      .neq('finding_type', 'EVIDENCE');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      inspectionVisitId: row.inspection_id,
      employerId: '',
      visitId: row.inspection_id,
      findingType: row.finding_type ?? FindingType.INFORMATION_ONLY,
      category: row.category ?? '',
      title: row.title ?? '',
      description: row.description ?? '',
      severity: row.severity ?? 'Medium',
      evidenceIds: [],
      isViolationCreated: row.violation_created ?? false,
      inspectorNotes: row.inspector_notes ?? '',
      createdAt: row.created_at,
      createdByUserId: row.created_by ?? '',
      createdBy: row.created_by ?? '',
    }));
  }

  async getViolationsForVisit(visitId: string): Promise<Violation[]> {
    const { data, error } = await supabase
      .from('ce_violations')
      .select('*')
      .eq('inspection_id', visitId);
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
  }

  async rescheduleVisit(
    planItemId: string,
    reason: string,
    newDate: string,
    createFollowUp: boolean
  ): Promise<{ updated: WeeklyPlanItem; followUp?: WeeklyPlanItem }> {
    const { data: updated, error } = await supabase
      .from('ce_weekly_plan_items' as any)
      .update({
        execution_status: 'RESCHEDULED',
        reschedule_reason: reason,
        rescheduled_to: newDate,
      })
      .eq('id', planItemId)
      .select('*')
      .single();
    if (error) throw error;

    let followUp: WeeklyPlanItem | undefined;
    if (createFollowUp && updated) {
      const orig = updated as any;
      const { data: newItem } = await supabase
        .from('ce_weekly_plan_items' as any)
        .insert({
          plan_id: orig.plan_id,
          employer_id: orig.employer_id,
          employer_name: orig.employer_name,
          scheduled_date: newDate,
          source_type: orig.source_type,
          source_id: orig.source_id,
          source_ref: orig.source_ref,
          priority: orig.priority,
          created_by: orig.created_by,
          territory: orig.territory,
          execution_status: 'PLANNED',
          outcome_notes: `Follow-up from rescheduled item: ${reason}`,
        } as any)
        .select('*')
        .single();
      if (newItem) followUp = mapPlanItem(newItem);
    }

    return { updated: mapPlanItem(updated), followUp };
  }

  async markAsNotDone(planItemId: string, reason: string): Promise<WeeklyPlanItem> {
    const { data, error } = await supabase
      .from('ce_weekly_plan_items' as any)
      .update({
        execution_status: 'NOT_DONE',
        not_done_reason: reason,
      })
      .eq('id', planItemId)
      .select('*')
      .single();
    if (error) throw error;
    return mapPlanItem(data);
  }

  async validateWeeklyReport(
    inspectorId: string,
    weekStartDate: string
  ): Promise<{
    isValid: boolean;
    issues: { planItemId: string; employerName?: string; areaName?: string; issue: string }[];
  }> {
    const items = await this.getWeeklyPlanItems(inspectorId, weekStartDate);
    const issues: { planItemId: string; employerName?: string; areaName?: string; issue: string }[] = [];

    for (const item of items) {
      if (item.status === InspectionVisitStatus.PLANNED || item.status === InspectionVisitStatus.IN_PROGRESS) {
        issues.push({
          planItemId: item.id,
          employerName: item.employerName,
          areaName: item.areaName,
          issue: 'Visit not completed and not rescheduled',
        });
        continue;
      }
      if (item.status === InspectionVisitStatus.COMPLETED) {
        const visit = await this.getVisitByPlanItemId(item.id);
        if (visit) {
          const findings = await this.getFindingsForVisit(visit.id);
          if (findings.length === 0) {
            issues.push({
              planItemId: item.id,
              employerName: item.employerName,
              issue: 'No findings recorded for completed visit',
            });
          }
          const possibleViolations = findings.filter(
            (f) => f.findingType === FindingType.POSSIBLE_VIOLATION && !f.isViolationCreated
          );
          if (possibleViolations.length > 0) {
            issues.push({
              planItemId: item.id,
              employerName: item.employerName,
              issue: `${possibleViolations.length} possible violation(s) not converted to violations`,
            });
          }
        }
      }
    }

    return { isValid: issues.length === 0, issues };
  }

  async submitWeeklyReport(inspectorId: string, weekStartDate: string): Promise<WeeklyReportSummary> {
    const items = await this.getWeeklyPlanItems(inspectorId, weekStartDate);

    const completedVisits = items.filter((i) => i.status === InspectionVisitStatus.COMPLETED).length;
    const rescheduledVisits = items.filter((i) => i.status === InspectionVisitStatus.RESCHEDULED).length;
    const notDoneVisits = items.filter((i) => i.status === InspectionVisitStatus.NOT_DONE).length;

    let totalEvidence = 0;
    let totalFindings = 0;
    let totalViolations = 0;

    for (const item of items.filter((i) => i.status === InspectionVisitStatus.COMPLETED)) {
      const visit = await this.getVisitByPlanItemId(item.id);
      if (visit) {
        const evidence = await this.getEvidenceForVisit(visit.id);
        const findings = await this.getFindingsForVisit(visit.id);
        const violations = await this.getViolationsForVisit(visit.id);
        totalEvidence += evidence.length;
        totalFindings += findings.length;
        totalViolations += violations.length;
      }
    }

    return {
      weekStartDate,
      weekEndDate: this.getWeekEndDate(weekStartDate),
      inspectorId,
      inspectorName: '',
      totalPlannedVisits: items.length,
      completedVisits,
      rescheduledVisits,
      notDoneVisits,
      totalEvidence,
      totalFindings,
      totalViolations,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
    };
  }

  private getWeekEndDate(weekStartDate: string): string {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  }
}

export const weeklyReportService = new WeeklyReportService();
