import { 
  ViolationAction, 
  CreateViolationActionRequest, 
  UpdateViolationActionRequest,
  ActionType,
  ActionPriority,
  ActionStatus
} from '@/types/violationActions';

// Mock data
const mockActions: ViolationAction[] = [
  {
    id: 'action-001',
    violationId: 'VIOA-2024-001',
    violationNumber: 'VIOA-2024-001',
    employerId: 'EMP-2024-001',
    employerName: 'ABC Construction Ltd',
    territory: 'St Kitts',
    assignedToUserId: 'user-001',
    assignedToName: 'John Inspector',
    actionType: ActionType.EMPLOYER_VISIT,
    description: 'Follow-up visit to verify registration status and employee count',
    dueDate: '2024-01-25',
    suggestedWeek: '2024-01-22',
    priority: ActionPriority.HIGH,
    status: ActionStatus.PLANNED,
    createdAt: '2024-01-15T10:00:00Z',
    createdByUserId: 'user-002',
    createdByName: 'Sarah Manager'
  },
  {
    id: 'action-002',
    violationId: 'VIOA-2024-001',
    violationNumber: 'VIOA-2024-001',
    employerId: 'EMP-2024-001',
    employerName: 'ABC Construction Ltd',
    territory: 'St Kitts',
    assignedToUserId: 'user-001',
    assignedToName: 'John Inspector',
    actionType: ActionType.LETTER_NOTICE,
    description: 'Send formal notice regarding registration requirement',
    dueDate: '2024-01-20',
    priority: ActionPriority.URGENT,
    status: ActionStatus.PLANNED,
    createdAt: '2024-01-15T10:05:00Z',
    createdByUserId: 'user-002',
    createdByName: 'Sarah Manager'
  },
  {
    id: 'action-003',
    violationId: 'VIOA-2024-002',
    violationNumber: 'VIOA-2024-002',
    employerId: 'EMP-2024-010',
    employerName: 'Retail Services Inc',
    territory: 'St Kitts',
    assignedToUserId: 'user-001',
    assignedToName: 'John Inspector',
    actionType: ActionType.FOLLOW_UP_PAYMENT,
    description: 'Call employer to confirm payment received for C3 submission',
    dueDate: '2024-01-22',
    suggestedWeek: '2024-01-22',
    priority: ActionPriority.NORMAL,
    status: ActionStatus.PLANNED,
    createdAt: '2024-01-18T11:30:00Z',
    createdByUserId: 'user-001',
    createdByName: 'John Inspector'
  }
];

class ViolationActionsService {
  async getByViolationId(violationId: string): Promise<ViolationAction[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockActions.filter(action => action.violationId === violationId);
  }

  async getSuggestedForInspector(
    inspectorId: string, 
    weekStartDate: string
  ): Promise<ViolationAction[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockActions.filter(action => 
      action.assignedToUserId === inspectorId &&
      action.status === ActionStatus.PLANNED &&
      (action.suggestedWeek === weekStartDate || 
       (action.dueDate && action.dueDate >= weekStartDate))
    );
  }

  async getAllPendingForInspector(
    inspectorId: string,
    weekStartDate: string,
    filterType: 'this-week' | 'past-due' | 'all-pending'
  ): Promise<ViolationAction[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    let filtered = mockActions.filter(action => 
      action.assignedToUserId === inspectorId &&
      (action.status === ActionStatus.PLANNED || action.status === ActionStatus.IN_WEEKLY_PLAN)
    );

    switch (filterType) {
      case 'this-week':
        filtered = filtered.filter(action =>
          (action.suggestedWeek && action.suggestedWeek >= weekStartDate && action.suggestedWeek <= weekEndStr) ||
          (action.dueDate && action.dueDate >= weekStartDate && action.dueDate <= weekEndStr)
        );
        break;
      case 'past-due':
        filtered = filtered.filter(action =>
          action.dueDate && action.dueDate < today && action.status !== ActionStatus.IN_WEEKLY_PLAN
        );
        break;
      case 'all-pending':
        // Return all pending actions
        break;
    }

    return filtered;
  }

  async create(request: CreateViolationActionRequest): Promise<ViolationAction> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newAction: ViolationAction = {
      id: `action-${Date.now()}`,
      violationId: request.violationId,
      assignedToUserId: request.assignedToUserId,
      assignedToName: 'Assigned User',
      actionType: request.actionType,
      description: request.description,
      dueDate: request.dueDate,
      suggestedWeek: request.suggestedWeek,
      priority: request.priority,
      status: ActionStatus.PLANNED,
      createdAt: new Date().toISOString(),
      createdByUserId: 'current-user',
      createdByName: 'Current User'
    };
    
    mockActions.push(newAction);
    return newAction;
  }

  async update(id: string, request: UpdateViolationActionRequest): Promise<ViolationAction> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const action = mockActions.find(a => a.id === id);
    if (!action) {
      throw new Error('Action not found');
    }
    
    if (request.status) action.status = request.status;
    if (request.linkedWeeklyPlanItemId) action.linkedWeeklyPlanItemId = request.linkedWeeklyPlanItemId;
    if (request.completedAt) action.completedAt = request.completedAt;
    if (request.completedByUserId) {
      action.completedByUserId = request.completedByUserId;
      action.completedByName = 'Completing User';
    }
    
    return action;
  }
}

export const violationActionsService = new ViolationActionsService();
