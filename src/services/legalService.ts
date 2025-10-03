import { 
  LegalCase, 
  Party, 
  Hearing, 
  LegalTask, 
  LegalDocument, 
  Order, 
  Penalty, 
  Settlement,
  TimelineEvent,
  AuditLogEntry,
  SavedView
} from '@/types/legal';

// Seed data - 3 cases with varied statuses
const mockCases: LegalCase[] = [
  {
    id: 'CASE-001',
    number: 'SSB-2025-001',
    title: 'Employer Contribution Arrears - Caribbean Resort Ltd',
    caseType: 'Compliance',
    status: 'Under Review',
    stage: 'Investigation',
    priority: 'High',
    confidential: false,
    source: 'Audit',
    summary: 'Employer failed to remit contributions for Q3-Q4 2024. Total arrears of $125,000 identified during routine audit.',
    reliefSought: 'Full payment of arrears plus statutory penalties and interest',
    assignee: 'Sarah Johnson',
    createdOn: '2025-01-15T10:00:00Z',
    filedOn: '2025-01-20T14:30:00Z',
    nextEventAt: '2025-02-15T09:00:00Z',
    flags: ['Urgent', 'Escalated'],
    relatedCaseIds: [],
    ageDays: 18,
    updatedOn: '2025-02-01T16:45:00Z',
  },
  {
    id: 'CASE-002',
    number: 'SSB-2025-002',
    title: 'Benefit Dispute - Marcus Williams vs SSB',
    caseType: 'Appeal',
    status: 'Hearing Scheduled',
    stage: 'Litigation',
    priority: 'Medium',
    confidential: true,
    source: 'Complaint',
    summary: 'Insured person disputes denial of disability benefits. Claims insufficient review of medical evidence.',
    reliefSought: 'Reversal of denial decision and award of disability benefits',
    assignee: 'David Thompson',
    createdOn: '2025-01-05T08:00:00Z',
    filedOn: '2025-01-10T11:00:00Z',
    nextEventAt: '2025-02-08T10:00:00Z',
    flags: ['Confidential'],
    relatedCaseIds: [],
    ageDays: 28,
    updatedOn: '2025-01-30T14:20:00Z',
  },
  {
    id: 'CASE-003',
    number: 'SSB-2025-003',
    title: 'Suspected Fraud - ABC Construction',
    caseType: 'Prosecution',
    status: 'Decision Pending',
    stage: 'Post-Hearing',
    priority: 'Urgent',
    confidential: true,
    source: 'Referral',
    summary: 'False reporting of employee wages to reduce contribution obligations. Evidence of systematic underreporting over 18 months.',
    reliefSought: 'Criminal prosecution, full restitution, and administrative penalties',
    assignee: 'Lisa Rodriguez',
    createdOn: '2024-12-10T09:30:00Z',
    filedOn: '2024-12-20T13:00:00Z',
    nextEventAt: '2025-02-20T14:00:00Z',
    flags: ['Urgent', 'Confidential', 'External Counsel'],
    relatedCaseIds: [],
    ageDays: 53,
    updatedOn: '2025-02-02T10:15:00Z',
  },
];

const mockParties: Party[] = [
  {
    id: 'PARTY-001',
    caseId: 'CASE-001',
    role: 'Primary Respondent',
    registryRef: 'EMP-12345',
    registryType: 'employer',
    name: 'Caribbean Resort Ltd',
    contact: {
      email: 'legal@caribbeanresort.com',
      phone: '(869) 555-0100',
      address: 'Frigate Bay, St. Kitts',
    },
    serviceStatus: 'Served',
    serviceMethod: 'Email',
    serviceDate: '2025-01-22T10:00:00Z',
  },
  {
    id: 'PARTY-002',
    caseId: 'CASE-002',
    role: 'Complainant',
    registryRef: 'IP-67890',
    registryType: 'person',
    name: 'Marcus Williams',
    contact: {
      email: 'marcus.w@email.com',
      phone: '(869) 555-0234',
    },
    serviceStatus: 'Served',
    serviceMethod: 'In Person',
    serviceDate: '2025-01-12T09:00:00Z',
  },
];

const mockHearings: Hearing[] = [
  {
    id: 'HEAR-001',
    caseId: 'CASE-002',
    type: 'Preliminary Hearing',
    venue: 'SSB Tribunal Room A',
    startAt: '2025-02-08T10:00:00Z',
    endAt: '2025-02-08T12:00:00Z',
    panel: ['Judge Patricia Lewis', 'Adjudicator Michael Brown'],
    agenda: 'Review evidence submission and set timeline for full hearing',
  },
  {
    id: 'HEAR-002',
    caseId: 'CASE-001',
    type: 'Settlement Conference',
    venue: 'SSB Mediation Room',
    startAt: '2025-02-15T09:00:00Z',
    endAt: '2025-02-15T11:00:00Z',
    panel: ['Mediator Susan Clark'],
    agenda: 'Explore settlement options and payment plan',
  },
];

const mockTasks: LegalTask[] = [
  {
    id: 'TASK-001',
    caseId: 'CASE-001',
    title: 'Review financial records',
    description: 'Analyze employer payroll records for Q3-Q4 2024',
    owner: 'Sarah Johnson',
    priority: 'High',
    dueOn: '2025-02-10T17:00:00Z',
    status: 'In Progress',
  },
  {
    id: 'TASK-002',
    caseId: 'CASE-002',
    title: 'Obtain medical expert opinion',
    description: 'Commission independent medical review',
    owner: 'David Thompson',
    priority: 'High',
    dueOn: '2025-02-05T17:00:00Z',
    status: 'Completed',
  },
];

const mockDocuments: LegalDocument[] = [
  {
    id: 'DOC-001',
    caseId: 'CASE-001',
    type: 'Filings',
    name: 'Notice of Non-Compliance.pdf',
    version: 1,
    size: '245 KB',
    uploadedBy: 'Sarah Johnson',
    uploadedOn: '2025-01-20T14:30:00Z',
    linkedEntities: [],
    confidential: false,
    checksum: 'abc123def456',
  },
  {
    id: 'DOC-002',
    caseId: 'CASE-002',
    type: 'Evidence',
    name: 'Medical Report - Dr. Smith.pdf',
    version: 1,
    size: '1.2 MB',
    uploadedBy: 'David Thompson',
    uploadedOn: '2025-01-25T11:00:00Z',
    linkedEntities: ['TASK-002'],
    confidential: true,
    checksum: 'xyz789ghi012',
  },
];

const mockTimeline: TimelineEvent[] = [
  {
    id: 'TL-001',
    caseId: 'CASE-001',
    timestamp: '2025-01-15T10:00:00Z',
    type: 'Case Created',
    actor: 'Sarah Johnson',
    description: 'Case created from audit findings',
  },
  {
    id: 'TL-002',
    caseId: 'CASE-001',
    timestamp: '2025-01-20T14:30:00Z',
    type: 'Status Changed',
    actor: 'Sarah Johnson',
    description: 'Status changed from Draft to Filed',
  },
  {
    id: 'TL-003',
    caseId: 'CASE-001',
    timestamp: '2025-01-22T10:00:00Z',
    type: 'Party Served',
    actor: 'System',
    description: 'Notice served to Caribbean Resort Ltd via email',
  },
];

const mockSavedViews: SavedView[] = [
  {
    id: 'VIEW-001',
    name: 'My Active Cases',
    filters: {
      assignee: '@me',
      status: ['Filed', 'Under Review', 'Hearing Scheduled', 'Decision Pending', 'Order Issued'],
    },
    isDefault: true,
  },
  {
    id: 'VIEW-002',
    name: 'Hearings This Week',
    filters: {
      nextEventAt: { from: new Date().toISOString(), to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    },
  },
  {
    id: 'VIEW-003',
    name: 'Awaiting Decision',
    filters: {
      status: ['Decision Pending'],
    },
  },
];

export class LegalService {
  // Cases
  static async getCases(filters?: Record<string, any>): Promise<LegalCase[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    let filtered = [...mockCases];
    
    if (filters?.status?.length > 0) {
      filtered = filtered.filter(c => filters.status.includes(c.status));
    }
    if (filters?.caseType?.length > 0) {
      filtered = filtered.filter(c => filters.caseType.includes(c.caseType));
    }
    if (filters?.assignee) {
      filtered = filtered.filter(c => c.assignee === filters.assignee);
    }
    
    return filtered;
  }

  static async getCaseById(id: string): Promise<LegalCase | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCases.find(c => c.id === id) || null;
  }

  static async createCase(data: Partial<LegalCase>): Promise<LegalCase> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newCase: LegalCase = {
      id: `CASE-${Date.now()}`,
      number: `SSB-2025-${String(mockCases.length + 1).padStart(3, '0')}`,
      title: data.title || '',
      caseType: data.caseType || 'Other',
      status: 'Draft',
      stage: 'Intake',
      priority: data.priority || 'Medium',
      confidential: data.confidential || false,
      source: data.source || 'Complaint',
      summary: data.summary || '',
      reliefSought: data.reliefSought || '',
      assignee: data.assignee || '',
      createdOn: new Date().toISOString(),
      flags: data.flags || [],
      relatedCaseIds: data.relatedCaseIds || [],
      ageDays: 0,
      updatedOn: new Date().toISOString(),
    };
    mockCases.push(newCase);
    return newCase;
  }

  static async updateCase(id: string, data: Partial<LegalCase>): Promise<LegalCase | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockCases.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    mockCases[index] = { ...mockCases[index], ...data, updatedOn: new Date().toISOString() };
    return mockCases[index];
  }

  // Parties
  static async getParties(caseId: string): Promise<Party[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockParties.filter(p => p.caseId === caseId);
  }

  static async addParty(data: Omit<Party, 'id'>): Promise<Party> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newParty: Party = { ...data, id: `PARTY-${Date.now()}` };
    mockParties.push(newParty);
    return newParty;
  }

  // Hearings
  static async getHearings(caseId?: string): Promise<Hearing[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return caseId ? mockHearings.filter(h => h.caseId === caseId) : mockHearings;
  }

  static async createHearing(data: Omit<Hearing, 'id'>): Promise<Hearing> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newHearing: Hearing = { ...data, id: `HEAR-${Date.now()}` };
    mockHearings.push(newHearing);
    return newHearing;
  }

  // Tasks
  static async getTasks(caseId: string): Promise<LegalTask[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockTasks.filter(t => t.caseId === caseId);
  }

  static async createTask(data: Omit<LegalTask, 'id'>): Promise<LegalTask> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newTask: LegalTask = { ...data, id: `TASK-${Date.now()}` };
    mockTasks.push(newTask);
    return newTask;
  }

  // Documents
  static async getDocuments(caseId: string): Promise<LegalDocument[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockDocuments.filter(d => d.caseId === caseId);
  }

  static async uploadDocument(data: Omit<LegalDocument, 'id'>): Promise<LegalDocument> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const newDoc: LegalDocument = { ...data, id: `DOC-${Date.now()}` };
    mockDocuments.push(newDoc);
    return newDoc;
  }

  // Timeline
  static async getTimeline(caseId: string): Promise<TimelineEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockTimeline.filter(t => t.caseId === caseId);
  }

  // Saved Views
  static async getSavedViews(): Promise<SavedView[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockSavedViews;
  }

  // Audit Log
  static async getAuditLog(caseId: string): Promise<AuditLogEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [
      {
        id: 'AUD-001',
        caseId,
        timestamp: '2025-01-20T14:30:00Z',
        userId: 'user-001',
        userName: 'Sarah Johnson',
        action: 'UPDATE',
        entity: 'Case',
        entityId: caseId,
        before: { status: 'Draft' },
        after: { status: 'Filed' },
        ipAddress: '192.168.1.1',
      },
    ];
  }
}
