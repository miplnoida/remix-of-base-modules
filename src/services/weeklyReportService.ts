import { 
  WeeklyPlanItem, 
  InspectionVisit, 
  InspectionEvidence, 
  InspectionFinding, 
  WeeklyReportSummary,
  InspectionVisitStatus,
  FindingType,
  EvidenceType,
  ItemType
} from '@/types/inspectionTypes';
import { Violation, ViolationStatus, ViolationType } from '@/types/violation';

// Mock data for demonstration
const mockWeeklyPlanItems: WeeklyPlanItem[] = [
  {
    id: 'wpi-001',
    inspectorUserId: 'inspector-001',
    inspectorName: 'John Inspector',
    itemType: ItemType.EMPLOYER_VISIT,
    visitDate: '2024-01-22',
    plannedDate: '2024-01-22',
    employerId: 'EMP-2024-001',
    employerName: 'ABC Construction Ltd',
    territory: 'St Kitts',
    plannedStartTime: '09:00',
    plannedEndTime: '17:00',
    status: InspectionVisitStatus.COMPLETED,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-22T17:30:00Z'
  },
  {
    id: 'wpi-002',
    inspectorUserId: 'inspector-001',
    inspectorName: 'John Inspector',
    itemType: ItemType.EMPLOYER_VISIT,
    visitDate: '2024-01-23',
    plannedDate: '2024-01-23',
    employerId: 'EMP-2024-010',
    employerName: 'Retail Services Inc',
    territory: 'St Kitts',
    plannedStartTime: '09:00',
    plannedEndTime: '12:00',
    status: InspectionVisitStatus.PLANNED,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'wpi-003',
    inspectorUserId: 'inspector-001',
    inspectorName: 'John Inspector',
    itemType: ItemType.SCOUTING,
    visitDate: '2024-01-24',
    plannedDate: '2024-01-24',
    areaName: 'Basseterre Industrial Zone',
    territory: 'St Kitts',
    plannedStartTime: '08:00',
    plannedEndTime: '16:00',
    status: InspectionVisitStatus.COMPLETED,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-24T16:30:00Z'
  }
];

const mockVisits: InspectionVisit[] = [
  {
    id: 'visit-001',
    weeklyPlanItemId: 'wpi-001',
    employerId: 'EMP-2024-001',
    employerName: 'ABC Construction Ltd',
    inspectorUserId: 'inspector-001',
    inspectorName: 'John Inspector',
    territory: 'St Kitts',
    visitDate: '2024-01-22',
    checkInTime: '09:15',
    checkInGPSLat: 17.2945,
    checkInGPSLng: -62.7267,
    checkOutTime: '16:45',
    checkOutGPSLat: 17.2945,
    checkOutGPSLng: -62.7267,
    visitStatus: InspectionVisitStatus.COMPLETED,
    status: InspectionVisitStatus.COMPLETED,
    visitNotes: 'Conducted full audit. Employer cooperative. Found several issues with wage reporting.',
    inspectorId: 'inspector-001',
    createdAt: '2024-01-22T09:15:00Z',
    updatedAt: '2024-01-22T16:45:00Z'
  }
];

const mockEvidence: InspectionEvidence[] = [
  {
    id: 'evidence-001',
    inspectionVisitId: 'visit-001',
    visitId: 'visit-001',
    evidenceType: EvidenceType.PHOTO,
    type: EvidenceType.PHOTO,
    fileName: 'wage_book_page1.jpg',
    fileUrl: '/evidence/wage_book_page1.jpg',
    fileSize: 2048000,
    description: 'Wage book showing discrepancies in reported wages',
    capturedAt: '2024-01-22T10:30:00Z',
    capturedByUserId: 'inspector-001',
    capturedBy: 'inspector-001',
    gpsLat: 17.2945,
    gpsLng: -62.7267
  },
  {
    id: 'evidence-002',
    inspectionVisitId: 'visit-001',
    visitId: 'visit-001',
    evidenceType: EvidenceType.DOCUMENT,
    type: EvidenceType.DOCUMENT,
    fileName: 'c3_comparison.pdf',
    fileUrl: '/evidence/c3_comparison.pdf',
    fileSize: 512000,
    description: 'Comparison of C3 submissions vs actual wage records',
    capturedAt: '2024-01-22T14:15:00Z',
    capturedByUserId: 'inspector-001',
    capturedBy: 'inspector-001'
  }
];

const mockFindings: InspectionFinding[] = [
  {
    id: 'finding-001',
    inspectionVisitId: 'visit-001',
    visitId: 'visit-001',
    findingType: FindingType.POSSIBLE_VIOLATION,
    category: 'Under-reporting',
    title: 'Under-reporting of wages',
    description: 'Employer reported lower wages on C3 form than shown in wage books. Discrepancy of approximately $15,000 over 3 months.',
    severity: 'High',
    evidenceIds: ['evidence-001', 'evidence-002'],
    isViolationCreated: false,
    inspectorNotes: 'Need to create violation and calculate penalties',
    createdAt: '2024-01-22T15:00:00Z',
    createdByUserId: 'inspector-001',
    createdBy: 'inspector-001'
  }
];

const mockViolations: Violation[] = [];

class WeeklyReportService {
  async getWeeklyPlanItems(inspectorId: string, weekStartDate: string): Promise<WeeklyPlanItem[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockWeeklyPlanItems.filter(item => 
      item.visitDate >= weekStartDate && 
      item.visitDate <= this.getWeekEndDate(weekStartDate)
    );
  }

  async getVisitById(visitId: string): Promise<InspectionVisit | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockVisits.find(v => v.id === visitId);
  }

  async getVisitByPlanItemId(planItemId: string): Promise<InspectionVisit | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockVisits.find(v => v.weeklyPlanItemId === planItemId);
  }

  async getEvidenceForVisit(visitId: string): Promise<InspectionEvidence[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockEvidence.filter(e => e.visitId === visitId);
  }

  async getFindingsForVisit(visitId: string): Promise<InspectionFinding[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockFindings.filter(f => f.visitId === visitId);
  }

  async getViolationsForVisit(visitId: string): Promise<Violation[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockViolations.filter(v => v.inspectionVisitId === visitId);
  }

  async rescheduleVisit(
    planItemId: string,
    reason: string,
    newDate: string,
    createFollowUp: boolean
  ): Promise<{ updated: WeeklyPlanItem; followUp?: WeeklyPlanItem }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const item = mockWeeklyPlanItems.find(i => i.id === planItemId);
    if (!item) {
      throw new Error('Plan item not found');
    }

    // Update original item
    item.status = InspectionVisitStatus.RESCHEDULED;
    item.rescheduleReason = reason;
    item.rescheduledTo = newDate;
    item.updatedAt = new Date().toISOString();

    let followUp: WeeklyPlanItem | undefined;

    if (createFollowUp) {
      followUp = {
        ...item,
        id: `wpi-${Date.now()}`,
        visitDate: newDate,
        status: InspectionVisitStatus.PLANNED,
        rescheduleReason: undefined,
        rescheduledTo: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockWeeklyPlanItems.push(followUp);
    }

    return { updated: item, followUp };
  }

  async markAsNotDone(planItemId: string, reason: string): Promise<WeeklyPlanItem> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const item = mockWeeklyPlanItems.find(i => i.id === planItemId);
    if (!item) {
      throw new Error('Plan item not found');
    }

    item.status = InspectionVisitStatus.NOT_DONE;
    item.notDoneReason = reason;
    item.updatedAt = new Date().toISOString();

    return item;
  }

  async validateWeeklyReport(
    inspectorId: string,
    weekStartDate: string
  ): Promise<{
    isValid: boolean;
    issues: {
      planItemId: string;
      employerName?: string;
      areaName?: string;
      issue: string;
    }[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const items = await this.getWeeklyPlanItems(inspectorId, weekStartDate);
    const issues: { planItemId: string; employerName?: string; areaName?: string; issue: string }[] = [];

    for (const item of items) {
      // Check if visit is completed, rescheduled, or not done
      if (item.status === InspectionVisitStatus.PLANNED || item.status === InspectionVisitStatus.IN_PROGRESS) {
        issues.push({
          planItemId: item.id,
          employerName: item.employerName,
          areaName: item.areaName,
          issue: 'Visit not completed and not rescheduled'
        });
        continue;
      }

      // For completed visits, check findings and violations
      if (item.status === InspectionVisitStatus.COMPLETED) {
        const visit = await this.getVisitByPlanItemId(item.id);
        if (visit) {
          const findings = await this.getFindingsForVisit(visit.id);
          
          if (findings.length === 0) {
            issues.push({
              planItemId: item.id,
              employerName: item.employerName,
              areaName: item.areaName,
              issue: 'No findings recorded for completed visit'
            });
          }

          // Check for possible violations without created violations
          const possibleViolations = findings.filter(
            f => f.findingType === FindingType.POSSIBLE_VIOLATION && !f.isViolationCreated
          );

          if (possibleViolations.length > 0) {
            issues.push({
              planItemId: item.id,
              employerName: item.employerName,
              areaName: item.areaName,
              issue: `${possibleViolations.length} possible violation(s) not converted to violations`
            });
          }
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  async submitWeeklyReport(inspectorId: string, weekStartDate: string): Promise<WeeklyReportSummary> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const items = await this.getWeeklyPlanItems(inspectorId, weekStartDate);
    
    const completedVisits = items.filter(i => i.status === InspectionVisitStatus.COMPLETED).length;
    const rescheduledVisits = items.filter(i => i.status === InspectionVisitStatus.RESCHEDULED).length;
    const notDoneVisits = items.filter(i => i.status === InspectionVisitStatus.NOT_DONE).length;

    let totalEvidence = 0;
    let totalFindings = 0;
    let totalViolations = 0;

    for (const item of items.filter(i => i.status === InspectionVisitStatus.COMPLETED)) {
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

    const summary: WeeklyReportSummary = {
      weekStartDate,
      weekEndDate: this.getWeekEndDate(weekStartDate),
      inspectorId,
      inspectorName: 'John Inspector',
      totalPlannedVisits: items.length,
      completedVisits,
      rescheduledVisits,
      notDoneVisits,
      totalEvidence,
      totalFindings,
      totalViolations,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED'
    };

    return summary;
  }

  private getWeekEndDate(weekStartDate: string): string {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  }
}

export const weeklyReportService = new WeeklyReportService();
