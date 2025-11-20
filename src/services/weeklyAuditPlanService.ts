// ============================================
// WEEKLY AUDIT PLANNING & EXECUTION - SERVICE LAYER
// ============================================

import {
  WeeklyAuditPlan,
  PlannedVisit,
  WeeklyPlanWorkflowStatus,
  VisitType,
  VisitDuration,
  VisitExecutionStatus,
  CreateWeeklyPlanRequest,
  UpdateVisitExecutionRequest,
  SubmitWeeklyReportRequest,
  ReviewPlanRequest,
  WeeklyReportSummary,
  Evidence,
  AuditChecklist
} from '@/types/weeklyAuditPlan';

// ============================================
// MOCK DATA
// ============================================

let mockPlans: WeeklyAuditPlan[] = [
  {
    id: 'plan-001',
    planNumber: 'WP-2025-W02-001',
    inspectorId: 'inspector-001',
    inspectorName: 'John Smith',
    weekStartDate: '2025-01-13',
    weekEndDate: '2025-01-19',
    status: WeeklyPlanWorkflowStatus.APPROVED,
    submittedAt: '2025-01-10T09:00:00Z',
    submittedBy: 'inspector-001',
    reviewedAt: '2025-01-11T14:30:00Z',
    reviewedBy: 'senior-001',
    reviewerRole: 'SENIOR_INSPECTOR',
    reviewComments: 'Good coverage. Approved.',
    approvedAt: '2025-01-12T10:00:00Z',
    approvedBy: 'manager-001',
    plannedVisits: [
      {
        id: 'visit-001',
        planId: 'plan-001',
        dayOfWeek: 'Monday',
        visitDate: '2025-01-13',
        employerId: 'emp-001',
        employerName: 'ABC Manufacturing Ltd',
        visitType: VisitType.AUDIT,
        duration: VisitDuration.FULL_DAY,
        purpose: 'Annual compliance audit - Risk Band: High',
        plannedStartTime: '09:00',
        plannedEndTime: '15:00',
        executionStatus: VisitExecutionStatus.COMPLETED,
        checkInTime: '2025-01-13T09:05:00Z',
        checkInGPSLat: 17.3578,
        checkInGPSLng: -62.7830,
        checkOutTime: '2025-01-13T15:10:00Z',
        checkOutGPSLat: 17.3580,
        checkOutGPSLng: -62.7828,
        visitNotes: 'Full audit conducted. All records reviewed.',
        findings: 'Minor discrepancies in 2 employee records. C3 submissions up to date.',
        createdAt: '2025-01-10T09:00:00Z',
        updatedAt: '2025-01-13T15:10:00Z'
      },
      {
        id: 'visit-002',
        planId: 'plan-001',
        dayOfWeek: 'Tuesday',
        visitDate: '2025-01-14',
        employerId: 'emp-002',
        employerName: 'Caribbean Hotel Group',
        visitType: VisitType.C3_FOLLOW_UP,
        duration: VisitDuration.HALF_DAY_AM,
        purpose: 'Follow-up on late C3 submission',
        plannedStartTime: '09:00',
        plannedEndTime: '12:00',
        executionStatus: VisitExecutionStatus.IN_PROGRESS,
        checkInTime: '2025-01-14T09:00:00Z',
        checkInGPSLat: 17.3000,
        checkInGPSLng: -62.7200,
        createdAt: '2025-01-10T09:00:00Z',
        updatedAt: '2025-01-14T09:00:00Z'
      },
      {
        id: 'visit-003',
        planId: 'plan-001',
        dayOfWeek: 'Wednesday',
        visitDate: '2025-01-15',
        employerId: 'emp-003',
        employerName: 'Island Construction Co',
        visitType: VisitType.PAYMENT_FOLLOW_UP,
        duration: VisitDuration.SHORT,
        purpose: 'Payment arrangement follow-up',
        plannedStartTime: '10:00',
        plannedEndTime: '11:30',
        executionStatus: VisitExecutionStatus.PLANNED,
        createdAt: '2025-01-10T09:00:00Z',
        updatedAt: '2025-01-10T09:00:00Z'
      }
    ],
    totalPlannedVisits: 3,
    completedVisits: 1,
    holidays: [],
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-01-13T15:10:00Z'
  },
  {
    id: 'plan-002',
    planNumber: 'WP-2025-W02-002',
    inspectorId: 'inspector-002',
    inspectorName: 'Sarah Johnson',
    weekStartDate: '2025-01-13',
    weekEndDate: '2025-01-19',
    status: WeeklyPlanWorkflowStatus.SUBMITTED,
    submittedAt: '2025-01-10T11:00:00Z',
    submittedBy: 'inspector-002',
    plannedVisits: [
      {
        id: 'visit-004',
        planId: 'plan-002',
        dayOfWeek: 'Monday',
        visitDate: '2025-01-13',
        employerId: 'emp-004',
        employerName: 'Tech Solutions Ltd',
        visitType: VisitType.RISK_BASED_AUDIT,
        duration: VisitDuration.FULL_DAY,
        purpose: 'Risk-based audit - High risk score',
        plannedStartTime: '09:00',
        plannedEndTime: '16:00',
        executionStatus: VisitExecutionStatus.PLANNED,
        createdAt: '2025-01-10T11:00:00Z',
        updatedAt: '2025-01-10T11:00:00Z'
      },
      {
        id: 'visit-005',
        planId: 'plan-002',
        dayOfWeek: 'Thursday',
        visitDate: '2025-01-16',
        employerId: 'emp-005',
        employerName: 'Retail Mart Inc',
        visitType: VisitType.SCOUTING,
        duration: VisitDuration.HALF_DAY_PM,
        purpose: 'Zone scouting for unregistered employers',
        plannedStartTime: '13:00',
        plannedEndTime: '16:00',
        executionStatus: VisitExecutionStatus.PLANNED,
        createdAt: '2025-01-10T11:00:00Z',
        updatedAt: '2025-01-10T11:00:00Z'
      }
    ],
    totalPlannedVisits: 2,
    completedVisits: 0,
    holidays: [],
    createdAt: '2025-01-10T11:00:00Z',
    updatedAt: '2025-01-10T11:00:00Z'
  }
];

let mockEvidence: Evidence[] = [];
let mockChecklists: AuditChecklist[] = [];

// ============================================
// SERVICE FUNCTIONS
// ============================================

export const weeklyAuditPlanService = {
  // Get all plans (with optional filters)
  getAll: async (filters?: {
    inspectorId?: string;
    status?: WeeklyPlanWorkflowStatus;
    weekStartDate?: string;
  }): Promise<WeeklyAuditPlan[]> => {
    let filtered = [...mockPlans];
    
    if (filters?.inspectorId) {
      filtered = filtered.filter(p => p.inspectorId === filters.inspectorId);
    }
    if (filters?.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters?.weekStartDate) {
      filtered = filtered.filter(p => p.weekStartDate === filters.weekStartDate);
    }
    
    return filtered;
  },

  // Get plan by ID
  getById: async (id: string): Promise<WeeklyAuditPlan | null> => {
    return mockPlans.find(p => p.id === id) || null;
  },

  // Create new plan
  create: async (request: CreateWeeklyPlanRequest): Promise<WeeklyAuditPlan> => {
    const newPlan: WeeklyAuditPlan = {
      id: `plan-${Date.now()}`,
      planNumber: `WP-${new Date().getFullYear()}-W${Math.floor(Math.random() * 52 + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
      inspectorId: request.inspectorId,
      inspectorName: 'Inspector Name', // Would be fetched from user service
      weekStartDate: request.weekStartDate,
      weekEndDate: request.weekEndDate,
      status: WeeklyPlanWorkflowStatus.DRAFT,
      plannedVisits: request.visits.map((v, idx) => ({
        ...v,
        id: `visit-${Date.now()}-${idx}`,
        planId: `plan-${Date.now()}`,
        executionStatus: VisitExecutionStatus.PLANNED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
      totalPlannedVisits: request.visits.length,
      completedVisits: 0,
      holidays: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockPlans.push(newPlan);
    return newPlan;
  },

  // Submit plan for review
  submit: async (planId: string): Promise<WeeklyAuditPlan> => {
    const plan = mockPlans.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    
    plan.status = WeeklyPlanWorkflowStatus.SUBMITTED;
    plan.submittedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    
    return plan;
  },

  // Review plan (Senior Inspector or Manager)
  review: async (request: ReviewPlanRequest): Promise<WeeklyAuditPlan> => {
    const plan = mockPlans.find(p => p.id === request.planId);
    if (!plan) throw new Error('Plan not found');
    
    if (request.approved) {
      if (request.reviewerRole === 'MANAGER') {
        plan.status = WeeklyPlanWorkflowStatus.APPROVED;
        plan.approvedAt = new Date().toISOString();
        plan.approvedBy = 'current-user-id'; // Would be from auth context
      } else {
        plan.status = WeeklyPlanWorkflowStatus.APPROVED;
      }
    } else {
      plan.status = WeeklyPlanWorkflowStatus.NEED_CHANGES;
    }
    
    plan.reviewedAt = new Date().toISOString();
    plan.reviewedBy = 'current-user-id';
    plan.reviewerRole = request.reviewerRole;
    plan.reviewComments = request.comments;
    plan.updatedAt = new Date().toISOString();
    
    return plan;
  },

  // Update visit execution (check-in, check-out, notes)
  updateVisitExecution: async (request: UpdateVisitExecutionRequest): Promise<PlannedVisit> => {
    const plan = mockPlans.find(p => 
      p.plannedVisits.some(v => v.id === request.visitId)
    );
    
    if (!plan) throw new Error('Visit not found');
    
    const visit = plan.plannedVisits.find(v => v.id === request.visitId);
    if (!visit) throw new Error('Visit not found');
    
    if (request.checkInTime) {
      visit.checkInTime = request.checkInTime;
      visit.checkInGPSLat = request.checkInGPS?.latitude;
      visit.checkInGPSLng = request.checkInGPS?.longitude;
      visit.executionStatus = VisitExecutionStatus.IN_PROGRESS;
    }
    
    if (request.checkOutTime) {
      visit.checkOutTime = request.checkOutTime;
      visit.checkOutGPSLat = request.checkOutGPS?.latitude;
      visit.checkOutGPSLng = request.checkOutGPS?.longitude;
      visit.executionStatus = VisitExecutionStatus.COMPLETED;
      plan.completedVisits = plan.plannedVisits.filter(v => 
        v.executionStatus === VisitExecutionStatus.COMPLETED
      ).length;
    }
    
    if (request.visitNotes) visit.visitNotes = request.visitNotes;
    if (request.findings) visit.findings = request.findings;
    if (request.executionStatus) visit.executionStatus = request.executionStatus;
    
    visit.updatedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    
    return visit;
  },

  // Submit weekly report
  submitWeeklyReport: async (request: SubmitWeeklyReportRequest): Promise<WeeklyAuditPlan> => {
    const plan = mockPlans.find(p => p.id === request.planId);
    if (!plan) throw new Error('Plan not found');
    
    plan.weeklyReportNarrative = request.narrative;
    plan.weeklyReportSubmittedAt = new Date().toISOString();
    plan.status = WeeklyPlanWorkflowStatus.COMPLETED;
    plan.updatedAt = new Date().toISOString();
    
    return plan;
  },

  // Generate weekly report summary
  generateWeeklyReportSummary: async (planId: string): Promise<WeeklyReportSummary> => {
    const plan = mockPlans.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    
    const completedVisits = plan.plannedVisits.filter(v => 
      v.executionStatus === VisitExecutionStatus.COMPLETED
    );
    
    const cancelledVisits = plan.plannedVisits.filter(v => 
      v.executionStatus === VisitExecutionStatus.CANCELLED
    );
    
    const rescheduledVisits = plan.plannedVisits.filter(v => 
      v.executionStatus === VisitExecutionStatus.RESCHEDULED
    );
    
    return {
      planId: plan.id,
      plannedVisits: plan.totalPlannedVisits,
      completedVisits: completedVisits.length,
      cancelledVisits: cancelledVisits.length,
      rescheduledVisits: rescheduledVisits.length,
      totalHoursSpent: completedVisits.length * 4, // Mock calculation
      evidenceCollected: mockEvidence.filter(e => 
        completedVisits.some(v => v.id === e.visitId)
      ).length,
      casesOpened: 2, // Mock
      casesUpdated: 5, // Mock
      findingsSummary: completedVisits.map(v => v.findings).filter(Boolean).join('; '),
      inspectorNarrative: plan.weeklyReportNarrative || '',
      generatedAt: new Date().toISOString()
    };
  },

  // Get plans pending review (for Senior Inspector/Manager)
  getPendingReview: async (reviewerRole: 'SENIOR_INSPECTOR' | 'MANAGER'): Promise<WeeklyAuditPlan[]> => {
    return mockPlans.filter(p => 
      p.status === WeeklyPlanWorkflowStatus.SUBMITTED ||
      p.status === WeeklyPlanWorkflowStatus.RESUBMITTED
    );
  },

  // Reschedule visit
  rescheduleVisit: async (visitId: string, newDate: string, reason: string): Promise<PlannedVisit> => {
    const plan = mockPlans.find(p => 
      p.plannedVisits.some(v => v.id === visitId)
    );
    
    if (!plan) throw new Error('Visit not found');
    
    const visit = plan.plannedVisits.find(v => v.id === visitId);
    if (!visit) throw new Error('Visit not found');
    
    visit.rescheduledTo = newDate;
    visit.rescheduledReason = reason;
    visit.executionStatus = VisitExecutionStatus.RESCHEDULED;
    visit.updatedAt = new Date().toISOString();
    
    return visit;
  }
};
