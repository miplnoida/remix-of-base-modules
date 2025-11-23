import { EmployerObservation, CreateObservationRequest } from '@/types/employerObservation';

// Mock data
const mockObservations: EmployerObservation[] = [
  {
    id: 'obs-001',
    employerId: 'EMP-2024-001',
    inspectionVisitId: 'visit-001',
    authorUserId: 'inspector-001',
    authorName: 'John Inspector',
    noteText: 'Employer cooperative during inspection. Wage books are well maintained.',
    createdAt: '2024-01-20T14:30:00Z'
  }
];

class EmployerObservationService {
  async getByEmployerId(employerId: string): Promise<EmployerObservation[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockObservations.filter(o => o.employerId === employerId);
  }

  async getByVisitId(visitId: string): Promise<EmployerObservation[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockObservations.filter(o => o.inspectionVisitId === visitId);
  }

  async create(request: CreateObservationRequest): Promise<EmployerObservation> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newObservation: EmployerObservation = {
      id: `obs-${Date.now()}`,
      employerId: request.employerId,
      inspectionVisitId: request.inspectionVisitId,
      authorUserId: 'inspector-001',
      authorName: 'John Inspector',
      noteText: request.noteText,
      createdAt: new Date().toISOString()
    };

    mockObservations.push(newObservation);
    return newObservation;
  }
}

export const employerObservationService = new EmployerObservationService();
