import {
  WeeklyPlanItem,
  InspectionVisit,
  InspectionEvidence,
  InspectionFinding,
  InspectionVisitStatus,
  ItemType,
  FindingType,
  EvidenceType,
  CreateWeeklyPlanItemRequest,
  CheckInRequest,
  CheckOutRequest,
  CreateEvidenceRequest,
  CreateFindingRequest
} from '@/types/inspectionTypes';

// Mock data
const mockPlanItems: WeeklyPlanItem[] = [
  {
    id: 'wpi-001',
    inspectorUserId: 'inspector-001',
    inspectorName: 'John Inspector',
    itemType: ItemType.EMPLOYER_VISIT,
    employerId: 'EMP-2024-001',
    employerName: 'ABC Construction Ltd',
    territory: 'St Kitts',
    plannedDate: '2024-01-22',
    plannedStartTime: '09:00',
    plannedEndTime: '12:00',
    status: InspectionVisitStatus.NOT_STARTED,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'wpi-002',
    inspectorUserId: 'inspector-001',
    inspectorName: 'John Inspector',
    itemType: ItemType.SCOUTING,
    territory: 'St Kitts',
    plannedDate: '2024-01-23',
    plannedStartTime: '14:00',
    plannedEndTime: '17:00',
    areaName: 'Basseterre Industrial Zone',
    focusNotes: 'Check for unregistered businesses in new industrial area',
    status: InspectionVisitStatus.NOT_STARTED,
    createdAt: '2024-01-15T10:05:00Z',
    updatedAt: '2024-01-15T10:05:00Z'
  }
];

const mockVisits: InspectionVisit[] = [];
const mockEvidence: InspectionEvidence[] = [];
const mockFindings: InspectionFinding[] = [];

class InspectionService {
  // Weekly Plan Items
  async getWeeklyPlanItems(inspectorId: string, weekStartDate?: string): Promise<WeeklyPlanItem[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPlanItems.filter(item => item.inspectorUserId === inspectorId);
  }

  async createWeeklyPlanItem(request: CreateWeeklyPlanItemRequest): Promise<WeeklyPlanItem> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newItem: WeeklyPlanItem = {
      id: `wpi-${Date.now()}`,
      inspectorUserId: 'inspector-001',
      inspectorName: 'John Inspector',
      itemType: request.itemType,
      employerId: request.employerId,
      employerName: request.employerId ? 'Mock Employer Name' : undefined,
      territory: request.territory,
      plannedDate: request.plannedDate,
      plannedStartTime: request.plannedStartTime,
      plannedEndTime: request.plannedEndTime,
      areaName: request.areaName,
      focusNotes: request.focusNotes,
      status: InspectionVisitStatus.NOT_STARTED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockPlanItems.push(newItem);
    return newItem;
  }

  // Inspection Visit
  async getVisitByPlanItemId(planItemId: string): Promise<InspectionVisit | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockVisits.find(v => v.weeklyPlanItemId === planItemId);
  }

  async checkIn(planItemId: string, request: CheckInRequest): Promise<InspectionVisit> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const planItem = mockPlanItems.find(p => p.id === planItemId);
    if (!planItem) throw new Error('Plan item not found');

    const existingVisit = mockVisits.find(v => v.weeklyPlanItemId === planItemId);
    if (existingVisit) return existingVisit;

    const newVisit: InspectionVisit = {
      id: `visit-${Date.now()}`,
      weeklyPlanItemId: planItemId,
      employerId: planItem.employerId,
      employerName: planItem.employerName,
      inspectorUserId: planItem.inspectorUserId,
      inspectorName: planItem.inspectorName,
      territory: planItem.territory,
      checkInTime: new Date().toISOString(),
      checkInLocation: request.location,
      visitStatus: InspectionVisitStatus.IN_PROGRESS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockVisits.push(newVisit);
    planItem.status = InspectionVisitStatus.IN_PROGRESS;
    planItem.updatedAt = new Date().toISOString();

    return newVisit;
  }

  async checkOut(visitId: string, request: CheckOutRequest): Promise<InspectionVisit> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const visit = mockVisits.find(v => v.id === visitId);
    if (!visit) throw new Error('Visit not found');

    visit.checkOutTime = new Date().toISOString();
    visit.checkOutLocation = request.location;
    visit.notes = request.notes;
    visit.visitStatus = InspectionVisitStatus.COMPLETED;
    visit.updatedAt = new Date().toISOString();

    const planItem = mockPlanItems.find(p => p.id === visit.weeklyPlanItemId);
    if (planItem) {
      planItem.status = InspectionVisitStatus.COMPLETED;
      planItem.updatedAt = new Date().toISOString();
    }

    return visit;
  }

  // Evidence
  async getEvidenceForVisit(visitId: string): Promise<InspectionEvidence[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockEvidence.filter(e => e.inspectionVisitId === visitId);
  }

  async uploadEvidence(visitId: string, request: CreateEvidenceRequest): Promise<InspectionEvidence> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In real implementation, upload file to storage
    const visit = mockVisits.find(v => v.id === visitId);
    if (!visit) throw new Error('Visit not found');

    const evidence: InspectionEvidence = {
      id: `evidence-${Date.now()}`,
      inspectionVisitId: visitId,
      employerId: visit.employerId || '',
      evidenceType: request.evidenceType,
      fileName: request.file.name,
      fileUrl: URL.createObjectURL(request.file),
      fileSize: request.file.size,
      description: request.description,
      capturedAt: new Date().toISOString(),
      capturedByUserId: 'inspector-001',
      capturedByName: 'John Inspector'
    };

    mockEvidence.push(evidence);
    return evidence;
  }

  // Findings
  async getFindingsForVisit(visitId: string): Promise<InspectionFinding[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockFindings.filter(f => f.inspectionVisitId === visitId);
  }

  async createFinding(visitId: string, request: CreateFindingRequest): Promise<InspectionFinding> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const visit = mockVisits.find(v => v.id === visitId);
    if (!visit) throw new Error('Visit not found');
    
    const finding: InspectionFinding = {
      id: `finding-${Date.now()}`,
      inspectionVisitId: visitId,
      employerId: visit.employerId || '',
      findingType: request.findingType,
      title: request.title,
      description: request.description,
      severity: request.severity,
      recommendedAction: request.recommendedAction,
      isViolationCreated: false,
      createdAt: new Date().toISOString(),
      createdByUserId: 'inspector-001',
      createdByName: 'John Inspector'
    };

    mockFindings.push(finding);
    return finding;
  }

  async markFindingAsViolationCreated(findingId: string, violationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const finding = mockFindings.find(f => f.id === findingId);
    if (finding) {
      finding.isViolationCreated = true;
      finding.violationId = violationId;
    }
  }
}

export const inspectionService = new InspectionService();
