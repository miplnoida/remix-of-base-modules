import {
  Violation,
  ViolationStatus,
  ViolationType,
  CreateViolationRequest,
  UpdateViolationRequest,
  LinkViolationToEmployerRequest
} from '@/types/violation';

// Mock data
const mockViolations: Violation[] = [
  {
    id: 'viol-001',
    violationNumber: 'VIOL-2024-001',
    employerId: 'EMP-2024-001',
    employerName: 'ABC Construction Ltd',
    territory: 'St Kitts',
    violationType: ViolationType.UNDER_REPORTING,
    status: ViolationStatus.OPEN,
    priority: 'High',
    summary: 'Employer under-reporting wages on C3 submissions',
    description: 'Inspection found discrepancy between wage books and C3 submissions',
    isUnlinked: false,
    discoveredDate: '2024-01-20',
    discoveredBy: 'John Inspector',
    assignedToUserId: 'inspector-001',
    assignedToName: 'John Inspector',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z'
  }
];

class ViolationService {
  async getAll(): Promise<Violation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockViolations;
  }

  async getById(id: string): Promise<Violation | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockViolations.find(v => v.id === id);
  }

  async getByInspectorId(inspectorId: string): Promise<Violation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockViolations.filter(v => v.assignedToUserId === inspectorId);
  }

  async getActiveByInspectorId(inspectorId: string): Promise<Violation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const activeStatuses = [
      ViolationStatus.OPEN,
      ViolationStatus.IN_PROGRESS,
      ViolationStatus.ESCALATED,
      ViolationStatus.UNDER_REVIEW
    ];
    return mockViolations.filter(
      v => v.assignedToUserId === inspectorId && activeStatuses.includes(v.status)
    );
  }

  async getUnlinkedViolations(): Promise<Violation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockViolations.filter(v => v.isUnlinked);
  }

  async getByVisitId(visitId: string): Promise<Violation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockViolations.filter(v => v.inspectionVisitId === visitId);
  }

  async create(request: CreateViolationRequest): Promise<Violation> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const violationNumber = `VIOL-${new Date().getFullYear()}-${String(mockViolations.length + 1).padStart(3, '0')}`;
    
    const newViolation: Violation = {
      id: `viol-${Date.now()}`,
      violationNumber,
      employerId: request.employerId,
      employerName: request.employerId ? 'Mock Employer Name' : undefined,
      territory: 'St Kitts',
      violationType: request.violationType,
      status: ViolationStatus.OPEN,
      priority: request.priority,
      summary: request.summary,
      description: request.description,
      inspectionVisitId: request.inspectionVisitId,
      inspectionFindingId: request.inspectionFindingId,
      isUnlinked: request.isUnlinked || false,
      candidateBusinessName: request.candidateBusinessName,
      candidateLocation: request.candidateLocation,
      candidateActivityType: request.candidateActivityType,
      estimatedEmployees: request.estimatedEmployees,
      assignedToUserId: request.assignedToUserId,
      assignedToName: 'Mock Inspector',
      discoveredDate: new Date().toISOString().split('T')[0],
      discoveredBy: 'John Inspector',
      dueDate: request.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockViolations.push(newViolation);
    return newViolation;
  }

  async update(id: string, request: UpdateViolationRequest): Promise<Violation> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const violation = mockViolations.find(v => v.id === id);
    if (!violation) throw new Error('Violation not found');

    if (request.status) violation.status = request.status;
    if (request.priority) violation.priority = request.priority;
    if (request.assignedToUserId) {
      violation.assignedToUserId = request.assignedToUserId;
      violation.assignedToName = 'Mock Inspector';
    }
    if (request.dueDate) violation.dueDate = request.dueDate;
    if (request.resolutionNotes) {
      violation.resolutionNotes = request.resolutionNotes;
      if (request.status === ViolationStatus.RESOLVED || request.status === ViolationStatus.CLOSED) {
        violation.resolvedAt = new Date().toISOString();
        violation.resolvedBy = 'Mock Inspector';
      }
    }

    violation.updatedAt = new Date().toISOString();
    return violation;
  }

  async linkToEmployer(request: LinkViolationToEmployerRequest): Promise<Violation> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const violation = mockViolations.find(v => v.id === request.violationId);
    if (!violation) throw new Error('Violation not found');

    violation.employerId = request.employerId;
    violation.employerName = 'Newly Registered Employer';
    violation.isUnlinked = false;
    violation.updatedAt = new Date().toISOString();

    return violation;
  }

  async searchPotentialMatches(territory: string, businessName?: string): Promise<Violation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockViolations.filter(v => 
      v.isUnlinked && 
      v.territory === territory &&
      (!businessName || v.candidateBusinessName?.toLowerCase().includes(businessName.toLowerCase()))
    );
  }
}

export const violationService = new ViolationService();
