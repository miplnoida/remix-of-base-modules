// ============================================
// INSPECTION SERVICE - DB-BACKED
// ============================================

import { supabase } from '@/integrations/supabase/client';
import {
  WeeklyPlanItem,
  InspectionVisit,
  InspectionEvidence,
  InspectionFinding,
  InspectionVisitStatus,
  CreateWeeklyPlanItemRequest,
  CheckInRequest,
  CheckOutRequest,
  CreateEvidenceRequest,
  CreateFindingRequest,
  EvidenceType,
} from '@/types/inspectionTypes';

// ── Map DB rows to domain types ──

function mapPlanItem(row: any): WeeklyPlanItem {
  return {
    id: row.id,
    inspectorUserId: row.created_by ?? '',
    inspectorName: '', // resolved at component level if needed
    itemType: row.item_type ?? 'EMPLOYER_VISIT',
    employerId: row.employer_id ?? undefined,
    employerName: row.employer_name ?? undefined,
    territory: row.territory ?? 'St Kitts',
    plannedDate: row.scheduled_date?.slice(0, 10) ?? '',
    plannedStartTime: row.scheduled_start_time ?? undefined,
    plannedEndTime: row.scheduled_end_time ?? undefined,
    areaName: row.area_name ?? undefined,
    focusNotes: row.purpose ?? undefined,
    status: (row.execution_status ?? 'NOT_STARTED') as InspectionVisitStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInspection(row: any): InspectionVisit {
  return {
    id: row.id,
    weeklyPlanItemId: row.id, // inspections are linked via employer_id context
    employerId: row.employer_id ?? undefined,
    employerName: row.employer_name ?? undefined,
    inspectorUserId: row.inspector_id ?? '',
    inspectorName: row.inspector_name ?? '',
    territory: row.territory ?? 'St Kitts',
    checkInTime: row.check_in_time ?? row.actual_start ?? undefined,
    checkInLocation: row.location_address ?? undefined,
    checkOutTime: row.check_out_time ?? row.actual_end ?? undefined,
    checkOutLocation: row.location_address ?? undefined,
    notes: row.findings_summary ?? undefined,
    visitStatus: (row.status ?? 'IN_PROGRESS') as InspectionVisitStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFinding(row: any): InspectionFinding {
  return {
    id: row.id,
    inspectionVisitId: row.inspection_id ?? '',
    employerId: '', // resolved via inspection
    findingType: row.finding_type ?? 'INFORMATION_ONLY',
    title: row.description?.substring(0, 80) ?? '',
    description: row.description ?? '',
    severity: row.severity ?? 'Low',
    recommendedAction: undefined,
    isViolationCreated: row.violation_created ?? false,
    violationId: row.violation_id ?? undefined,
    createdAt: row.created_at,
    createdByUserId: row.created_by ?? '',
    createdByName: row.created_by ?? '',
  };
}

class InspectionService {
  // Weekly Plan Items — reads from ce_weekly_plan_items
  async getWeeklyPlanItems(inspectorId: string, weekStartDate?: string): Promise<WeeklyPlanItem[]> {
    let query = supabase
      .from('ce_weekly_plan_items')
      .select('*')
      .order('scheduled_date', { ascending: true });

    // If we have a specific plan context, filter by it
    // Otherwise get items from recent plans for this inspector
    if (weekStartDate) {
      query = query.gte('scheduled_date', weekStartDate);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;
    return (data ?? []).map(mapPlanItem);
  }

  async createWeeklyPlanItem(request: CreateWeeklyPlanItemRequest): Promise<WeeklyPlanItem> {
    // Resolve employer name if needed
    let employerName = request.employerId ? undefined : undefined;
    if (request.employerId) {
      const { data: emp } = await supabase
        .from('er_master')
        .select('name')
        .eq('regno', request.employerId)
        .maybeSingle();
      employerName = (emp as any)?.name ?? request.employerId;
    }

    const { data, error } = await supabase
      .from('ce_weekly_plan_items')
      .insert({
        item_type: request.itemType,
        employer_id: request.employerId,
        employer_name: employerName,
        territory: request.territory,
        scheduled_date: request.plannedDate,
        scheduled_start_time: request.plannedStartTime || null,
        scheduled_end_time: request.plannedEndTime || null,
        area_name: request.areaName,
        purpose: request.focusNotes,
        execution_status: 'NOT_STARTED',
        created_by: 'SYSTEM',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapPlanItem(data);
  }

  // Inspection Visit — uses ce_inspections table
  async getVisitByPlanItemId(planItemId: string): Promise<InspectionVisit | undefined> {
    // Look for an inspection linked to this plan item's employer
    const { data: planItem } = await supabase
      .from('ce_weekly_plan_items')
      .select('employer_id')
      .eq('id', planItemId)
      .maybeSingle();

    if (!planItem?.employer_id) return undefined;

    const { data, error } = await supabase
      .from('ce_inspections')
      .select('*')
      .eq('employer_id', planItem.employer_id)
      .in('status', ['IN_PROGRESS', 'SCHEDULED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapInspection(data);
  }

  async checkIn(planItemId: string, request: CheckInRequest): Promise<InspectionVisit> {
    // Get plan item details
    const { data: planItem } = await supabase
      .from('ce_weekly_plan_items')
      .select('*')
      .eq('id', planItemId)
      .single();
    if (!planItem) throw new Error('Plan item not found');

    // Create inspection record
    const inspNumber = `INS-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase
      .from('ce_inspections')
      .insert({
        inspection_number: inspNumber,
        employer_id: planItem.employer_id,
        employer_name: planItem.employer_name,
        territory: planItem.territory ?? 'St Kitts',
        inspection_type: planItem.visit_type ?? 'FIELD_VISIT',
        status: 'IN_PROGRESS',
        inspector_id: planItem.created_by ?? 'SYSTEM',
        inspector_name: 'Inspector', // TODO: from auth
        scheduled_date: planItem.scheduled_date,
        actual_start: new Date().toISOString(),
        check_in_time: new Date().toISOString(),
        location_address: request.location,
        created_by: 'SYSTEM',
      })
      .select('*')
      .single();
    if (error) throw error;

    // Update plan item status
    await supabase
      .from('ce_weekly_plan_items')
      .update({
        execution_status: 'IN_PROGRESS',
        check_in_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', planItemId);

    return mapInspection(data);
  }

  async checkOut(visitId: string, request: CheckOutRequest): Promise<InspectionVisit> {
    const { data, error } = await supabase
      .from('ce_inspections')
      .update({
        check_out_time: new Date().toISOString(),
        actual_end: new Date().toISOString(),
        findings_summary: request.notes,
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId)
      .select('*')
      .single();
    if (error) throw error;
    return mapInspection(data);
  }

  // Evidence — stored in ce_inspections.documents_collected (JSONB) or Storage
  async getEvidenceForVisit(visitId: string): Promise<InspectionEvidence[]> {
    const { data } = await supabase
      .from('ce_inspections')
      .select('documents_collected, photos')
      .eq('id', visitId)
      .maybeSingle();

    if (!data) return [];
    
    const items: InspectionEvidence[] = [];
    const docs = (data.documents_collected as any[]) ?? [];
    const photos = (data.photos as any[]) ?? [];
    
    [...docs, ...photos].forEach((item: any, idx: number) => {
      items.push({
        id: item.id ?? `ev-${idx}`,
        inspectionVisitId: visitId,
        employerId: '',
        evidenceType: item.type ?? 'DOCUMENT' as EvidenceType,
        fileName: item.name ?? item.fileName ?? `file-${idx}`,
        fileUrl: item.url ?? item.fileUrl ?? '',
        fileSize: item.size ?? 0,
        description: item.description ?? '',
        capturedAt: item.capturedAt ?? new Date().toISOString(),
        capturedByUserId: item.capturedBy ?? 'SYSTEM',
        capturedByName: item.capturedByName ?? 'Inspector',
      });
    });
    return items;
  }

  async uploadEvidence(visitId: string, request: CreateEvidenceRequest): Promise<InspectionEvidence> {
    // Upload file to storage
    const fileName = `inspections/${visitId}/${Date.now()}-${request.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, request.file);

    let fileUrl = '';
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    } else {
      // Fallback: store as object URL (for development)
      fileUrl = URL.createObjectURL(request.file);
    }

    // Append to inspection's documents_collected JSONB
    const { data: inspection } = await supabase
      .from('ce_inspections')
      .select('documents_collected')
      .eq('id', visitId)
      .maybeSingle();

    const existing = (inspection?.documents_collected as any[]) ?? [];
    const newEntry = {
      id: `ev-${Date.now()}`,
      type: request.evidenceType,
      name: request.file.name,
      url: fileUrl,
      size: request.file.size,
      description: request.description,
      capturedAt: new Date().toISOString(),
      capturedBy: 'SYSTEM',
      capturedByName: 'Inspector',
    };

    await supabase
      .from('ce_inspections')
      .update({
        documents_collected: [...existing, newEntry],
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitId);

    return {
      id: newEntry.id,
      inspectionVisitId: visitId,
      employerId: '',
      evidenceType: request.evidenceType,
      fileName: request.file.name,
      fileUrl,
      fileSize: request.file.size,
      description: request.description,
      capturedAt: newEntry.capturedAt,
      capturedByUserId: 'SYSTEM',
      capturedByName: 'Inspector',
    };
  }

  // Findings — uses ce_inspection_findings
  async getFindingsForVisit(visitId: string): Promise<InspectionFinding[]> {
    if (visitId === 'all') {
      const { data, error } = await supabase
        .from('ce_inspection_findings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map(mapFinding);
    }

    const { data, error } = await supabase
      .from('ce_inspection_findings')
      .select('*')
      .eq('inspection_id', visitId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapFinding);
  }

  async createFinding(visitId: string, request: CreateFindingRequest): Promise<InspectionFinding> {
    const { data, error } = await supabase
      .from('ce_inspection_findings')
      .insert({
        inspection_id: visitId,
        finding_type: request.findingType,
        description: `${request.title}: ${request.description}`,
        severity: request.severity,
        violation_created: false,
        created_by: 'SYSTEM',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapFinding(data);
  }

  async markFindingAsViolationCreated(findingId: string, violationId: string): Promise<void> {
    const { error } = await supabase
      .from('ce_inspection_findings')
      .update({
        violation_created: true,
        violation_id: violationId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', findingId);
    if (error) throw error;
  }

  // Get findings by employer (across all inspections)
  async getFindingsByEmployer(employerId: string): Promise<InspectionFinding[]> {
    // Get inspection IDs for this employer
    const { data: inspections } = await supabase
      .from('ce_inspections')
      .select('id')
      .eq('employer_id', employerId);

    if (!inspections || inspections.length === 0) return [];

    const inspectionIds = inspections.map(i => i.id);
    const { data, error } = await supabase
      .from('ce_inspection_findings')
      .select('*')
      .in('inspection_id', inspectionIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapFinding);
  }
}

export const inspectionService = new InspectionService();
