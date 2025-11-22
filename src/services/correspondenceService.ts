import {
  Correspondence,
  CorrespondenceDirection,
  CorrespondenceChannel,
  CorrespondenceStatus,
  CorrespondencePriority,
  PartyType,
  ContextType,
  CorrespondenceModule,
  CreateOutgoingCorrespondenceRequest,
  CreateIncomingCorrespondenceRequest,
  CorrespondenceFilters,
  CorrespondenceSummary,
  CorrespondenceStats
} from '@/types/correspondence';

// Mock correspondence data
const MOCK_CORRESPONDENCE: Correspondence[] = [
  {
    id: 'corr-001',
    correspondenceNumber: 'CORR-2024-00001',
    direction: CorrespondenceDirection.OUTGOING,
    channel: CorrespondenceChannel.LETTER,
    status: CorrespondenceStatus.SENT,
    subject: 'First Arrears Notice - Outstanding SSC Contributions',
    body: 'Dear Employer, We have identified outstanding Social Security Contributions for periods Jan-Mar 2024...',
    summary: 'First arrears notice for SSC outstanding Jan-Mar 2024',
    priority: CorrespondencePriority.HIGH,
    isConfidential: false,
    parties: [{
      id: 'party-001',
      partyType: PartyType.EMPLOYER,
      partyId: 'emp-123',
      partyName: 'ABC Construction Ltd',
      contactInfo: {
        email: 'abc@construction.com',
        address: '123 Main St, Basseterre'
      },
      isPrimary: true
    }],
    contexts: [{
      contextType: ContextType.COMPLIANCE_SUBCASE,
      contextId: 'subcase-456',
      contextDescription: 'SSC Arrears Jan-Mar 2024',
      module: CorrespondenceModule.COMPLIANCE
    }],
    templateInfo: {
      templateId: 'tmpl-arrears-001',
      templateName: 'First Arrears Notice',
      templateVersion: 'v1.0',
      language: 'en',
      mergeFields: {
        employerName: 'ABC Construction Ltd',
        periods: 'Jan-Mar 2024',
        totalAmount: 15000
      }
    },
    documents: [{
      id: 'doc-001',
      documentId: 'dm-001',
      documentName: 'First_Arrears_Notice_ABC_Construction.pdf',
      documentType: 'generated_letter',
      mimeType: 'application/pdf',
      fileSize: 256000,
      uploadedDate: '2024-11-15T10:00:00Z'
    }],
    createdDate: '2024-11-15T09:30:00Z',
    sentDate: '2024-11-15T10:15:00Z',
    communicationDate: '2024-11-15T00:00:00Z',
    referenceNumber: 'LTR-2024-SSB-001',
    storingTime: '2024-11-15T14:30:00Z',
    createdBy: 'user-001',
    createdByName: 'John Inspector',
    sentBy: 'user-001',
    sentByName: 'John Inspector',
    lastModifiedDate: '2024-11-15T10:15:00Z',
    lastModifiedBy: 'user-001',
    lastModifiedByName: 'John Inspector'
  },
  {
    id: 'corr-002',
    correspondenceNumber: 'CORR-2024-00002',
    direction: CorrespondenceDirection.INCOMING,
    channel: CorrespondenceChannel.EMAIL,
    status: CorrespondenceStatus.ASSIGNED,
    subject: 'Request for Payment Plan - ABC Construction',
    body: 'Dear Social Security Board, We would like to request a payment arrangement for our outstanding contributions...',
    summary: 'Employer requesting payment plan for arrears',
    priority: CorrespondencePriority.NORMAL,
    isConfidential: false,
    parties: [{
      id: 'party-002',
      partyType: PartyType.EMPLOYER,
      partyId: 'emp-123',
      partyName: 'ABC Construction Ltd',
      contactInfo: {
        email: 'abc@construction.com'
      },
      isPrimary: true
    }],
    contexts: [{
      contextType: ContextType.COMPLIANCE_SUBCASE,
      contextId: 'subcase-456',
      contextDescription: 'SSC Arrears Jan-Mar 2024',
      module: CorrespondenceModule.COMPLIANCE
    }],
    documents: [],
    createdDate: '2024-11-18T14:20:00Z',
    receivedDate: '2024-11-18T14:20:00Z',
    respondByDate: '2024-11-25T17:00:00Z',
    communicationDate: '2024-11-18T10:00:00Z',
    referenceNumber: 'EMAIL-ABC-20241118-001',
    createdBy: 'system',
    createdByName: 'System',
    loggedBy: 'user-002',
    loggedByName: 'Mary Clerk',
    assignedTo: 'user-001',
    assignedToName: 'John Inspector',
    lastModifiedDate: '2024-11-18T14:25:00Z',
    lastModifiedBy: 'user-002',
    lastModifiedByName: 'Mary Clerk',
    inReplyTo: 'corr-001',
    threadId: 'thread-001'
  },
  {
    id: 'corr-003',
    correspondenceNumber: 'CORR-2024-00003',
    direction: CorrespondenceDirection.OUTGOING,
    channel: CorrespondenceChannel.EMAIL,
    status: CorrespondenceStatus.SENT,
    subject: 'Request for Additional Documents - Benefit Claim #BEN-2024-456',
    body: 'Dear Ms. Johnson, To process your maternity benefit claim, we require additional documentation...',
    summary: 'Requesting birth certificate and medical report',
    priority: CorrespondencePriority.NORMAL,
    isConfidential: true,
    parties: [{
      id: 'party-003',
      partyType: PartyType.INSURED_PERSON,
      partyId: 'ip-789',
      partyName: 'Sarah Johnson',
      contactInfo: {
        email: 'sarah.j@email.com',
        phone: '869-555-1234'
      },
      isPrimary: true
    }],
    contexts: [{
      contextType: ContextType.BENEFIT_CLAIM,
      contextId: 'claim-789',
      contextDescription: 'Maternity Benefit Claim',
      module: CorrespondenceModule.BENEFITS
    }],
    deliveryMetadata: {
      to: ['sarah.j@email.com'],
      deliveryStatus: 'delivered',
      deliveryProvider: 'resend',
      deliveryReference: 'msg_abc123',
      deliveredAt: '2024-11-19T08:40:00Z',
      openedAt: '2024-11-19T09:15:00Z'
    },
    documents: [],
    createdDate: '2024-11-19T08:30:00Z',
    sentDate: '2024-11-19T08:35:00Z',
    communicationDate: '2024-11-19T08:35:00Z',
    referenceNumber: 'EMAIL-BEN-20241119-003',
    createdBy: 'user-003',
    createdByName: 'Alice Benefits',
    sentBy: 'user-003',
    sentByName: 'Alice Benefits',
    lastModifiedDate: '2024-11-19T08:35:00Z',
    lastModifiedBy: 'user-003',
    lastModifiedByName: 'Alice Benefits'
  },
  {
    id: 'corr-004',
    correspondenceNumber: 'CORR-2024-00004',
    direction: CorrespondenceDirection.INCOMING,
    channel: CorrespondenceChannel.PHONE,
    status: CorrespondenceStatus.LOGGED,
    subject: 'Phone Inquiry - C3 Submission Deadline',
    body: 'Employer called to inquire about C3 submission deadline for November 2024. Explained grace period and payment due date.',
    summary: 'Phone inquiry about C3 deadline answered',
    priority: CorrespondencePriority.LOW,
    isConfidential: false,
    parties: [{
      id: 'party-004',
      partyType: PartyType.EMPLOYER,
      partyId: 'emp-456',
      partyName: 'XYZ Retail Inc',
      contactInfo: {
        phone: '869-555-9876'
      },
      isPrimary: true
    }],
    contexts: [{
      contextType: ContextType.C3_SUBMISSION,
      contextId: 'c3-202411',
      contextDescription: 'November 2024 C3',
      module: CorrespondenceModule.CONTRIBUTIONS
    }],
    documents: [],
    createdDate: '2024-11-20T11:45:00Z',
    receivedDate: '2024-11-20T11:45:00Z',
    createdBy: 'user-004',
    createdByName: 'Bob Clerk',
    loggedBy: 'user-004',
    loggedByName: 'Bob Clerk',
    lastModifiedDate: '2024-11-20T11:50:00Z',
    lastModifiedBy: 'user-004',
    lastModifiedByName: 'Bob Clerk'
  },
  {
    id: 'corr-005',
    correspondenceNumber: 'CORR-2024-00005',
    direction: CorrespondenceDirection.OUTGOING,
    channel: CorrespondenceChannel.LETTER,
    status: CorrespondenceStatus.DRAFT,
    subject: 'Audit Appointment Notice - Scheduled Inspection',
    body: 'Dear Employer, This is to notify you of a scheduled compliance audit...',
    summary: 'Draft audit appointment letter',
    priority: CorrespondencePriority.HIGH,
    isConfidential: false,
    parties: [{
      id: 'party-005',
      partyType: PartyType.EMPLOYER,
      partyId: 'emp-789',
      partyName: 'DEF Manufacturing Co',
      contactInfo: {
        email: 'def@manufacturing.com',
        address: '456 Industrial Rd, Charlestown'
      },
      isPrimary: true
    }],
    contexts: [{
      contextType: ContextType.AUDIT_PLAN,
      contextId: 'audit-plan-202411',
      contextDescription: 'November 2024 Audit Plan',
      module: CorrespondenceModule.COMPLIANCE
    }],
    deliveryMetadata: {
      deliveryStatus: 'awaiting_acknowledgement',
      assignedInspectorId: 'INS001',
      assignedInspectorName: 'John Inspector',
      assignedAt: '2024-11-22T08:00:00Z'
    },
    documents: [],
    createdDate: '2024-11-20T15:00:00Z',
    referenceNumber: 'LTR-2024-AUDIT-005',
    createdBy: 'user-001',
    createdByName: 'John Inspector',
    lastModifiedDate: '2024-11-20T15:30:00Z',
    lastModifiedBy: 'user-001',
    lastModifiedByName: 'John Inspector',
    requiresApproval: true
  }
];

export const correspondenceService = {
  async getAll(filters?: CorrespondenceFilters): Promise<Correspondence[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filtered = [...MOCK_CORRESPONDENCE];

    if (filters) {
      if (filters.direction) {
        filtered = filtered.filter(c => c.direction === filters.direction);
      }
      if (filters.channel && filters.channel.length > 0) {
        filtered = filtered.filter(c => filters.channel!.includes(c.channel));
      }
      if (filters.status && filters.status.length > 0) {
        filtered = filtered.filter(c => filters.status!.includes(c.status));
      }
      if (filters.partyId) {
        filtered = filtered.filter(c => c.parties.some(p => p.partyId === filters.partyId));
      }
      if (filters.contextId) {
        filtered = filtered.filter(c => c.contexts?.some(ctx => ctx.contextId === filters.contextId));
      }
      if (filters.module && filters.module.length > 0) {
        filtered = filtered.filter(c => c.contexts?.some(ctx => filters.module!.includes(ctx.module)));
      }
      if (filters.assignedTo) {
        filtered = filtered.filter(c => c.assignedTo === filters.assignedTo);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          c.subject.toLowerCase().includes(query) ||
          c.body.toLowerCase().includes(query) ||
          c.correspondenceNumber.toLowerCase().includes(query)
        );
      }
    }

    return filtered.sort((a, b) => 
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  },

  async getById(id: string): Promise<Correspondence | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_CORRESPONDENCE.find(c => c.id === id) || null;
  },

  async getByParty(partyId: string, partyType: PartyType): Promise<Correspondence[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return MOCK_CORRESPONDENCE.filter(c =>
      c.parties.some(p => p.partyId === partyId && p.partyType === partyType)
    );
  },

  async getByContext(contextType: ContextType, contextId: string): Promise<Correspondence[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return MOCK_CORRESPONDENCE.filter(c =>
      c.contexts?.some(ctx => ctx.contextType === contextType && ctx.contextId === contextId)
    );
  },

  async createOutgoing(request: CreateOutgoingCorrespondenceRequest): Promise<Correspondence> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newCorrespondence: Correspondence = {
      id: `corr-${Date.now()}`,
      correspondenceNumber: `CORR-2024-${String(MOCK_CORRESPONDENCE.length + 1).padStart(5, '0')}`,
      direction: CorrespondenceDirection.OUTGOING,
      channel: request.channel,
      status: request.sendImmediately ? CorrespondenceStatus.SENT : CorrespondenceStatus.DRAFT,
      subject: request.subject,
      body: request.body,
      priority: request.priority || CorrespondencePriority.NORMAL,
      isConfidential: request.isConfidential || false,
      parties: request.parties.map((p, idx) => ({
        id: `party-${Date.now()}-${idx}`,
        partyType: p.partyType,
        partyId: p.partyId,
        partyName: 'Party Name', // Would be fetched
        isPrimary: p.isPrimary
      })),
      contexts: request.contexts?.map(c => ({
        contextType: c.contextType,
        contextId: c.contextId,
        contextDescription: 'Context Description', // Would be fetched
        module: c.module
      })),
      documents: [],
      createdDate: new Date().toISOString(),
      sentDate: request.sendImmediately ? new Date().toISOString() : undefined,
      createdBy: 'current-user',
      createdByName: 'Current User',
      sentBy: request.sendImmediately ? 'current-user' : undefined,
      sentByName: request.sendImmediately ? 'Current User' : undefined,
      lastModifiedDate: new Date().toISOString(),
      lastModifiedBy: 'current-user',
      lastModifiedByName: 'Current User',
      requiresApproval: request.requiresApproval,
      inReplyTo: request.inReplyTo
    };

    MOCK_CORRESPONDENCE.push(newCorrespondence);
    return newCorrespondence;
  },

  async createIncoming(request: CreateIncomingCorrespondenceRequest): Promise<Correspondence> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newCorrespondence: Correspondence = {
      id: `corr-${Date.now()}`,
      correspondenceNumber: `CORR-2024-${String(MOCK_CORRESPONDENCE.length + 1).padStart(5, '0')}`,
      direction: CorrespondenceDirection.INCOMING,
      channel: request.channel,
      status: request.assignTo ? CorrespondenceStatus.ASSIGNED : CorrespondenceStatus.RECEIVED,
      subject: request.subject,
      body: request.body,
      summary: request.summary,
      priority: request.priority || CorrespondencePriority.NORMAL,
      isConfidential: request.isConfidential || false,
      parties: request.parties.map((p, idx) => ({
        id: `party-${Date.now()}-${idx}`,
        partyType: p.partyType,
        partyId: p.partyId,
        partyName: 'Party Name', // Would be fetched
        isPrimary: p.isPrimary
      })),
      contexts: request.contexts?.map(c => ({
        contextType: c.contextType,
        contextId: c.contextId,
        contextDescription: 'Context Description', // Would be fetched
        module: c.module
      })),
      documents: [],
      createdDate: new Date().toISOString(),
      receivedDate: request.receivedDate,
      respondByDate: request.respondByDate,
      createdBy: 'current-user',
      createdByName: 'Current User',
      loggedBy: 'current-user',
      loggedByName: 'Current User',
      assignedTo: request.assignTo,
      assignedToName: request.assignTo ? 'Assigned User' : undefined,
      lastModifiedDate: new Date().toISOString(),
      lastModifiedBy: 'current-user',
      lastModifiedByName: 'Current User'
    };

    MOCK_CORRESPONDENCE.push(newCorrespondence);
    return newCorrespondence;
  },

  async updateStatus(id: string, status: CorrespondenceStatus, metadata?: any): Promise<Correspondence> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_CORRESPONDENCE.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Correspondence not found');
    }

    MOCK_CORRESPONDENCE[index].status = status;
    MOCK_CORRESPONDENCE[index].lastModifiedDate = new Date().toISOString();

    if (status === CorrespondenceStatus.SENT) {
      MOCK_CORRESPONDENCE[index].sentDate = new Date().toISOString();
    }

    return MOCK_CORRESPONDENCE[index];
  },

  async getSummary(filters?: CorrespondenceFilters): Promise<CorrespondenceSummary> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filtered = await this.getAll(filters);

    return {
      totalCount: filtered.length,
      byDirection: {
        outgoing: filtered.filter(c => c.direction === CorrespondenceDirection.OUTGOING).length,
        incoming: filtered.filter(c => c.direction === CorrespondenceDirection.INCOMING).length
      },
      byStatus: filtered.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byChannel: filtered.reduce((acc, c) => {
        acc[c.channel] = (acc[c.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byModule: filtered.reduce((acc, c) => {
        c.contexts?.forEach(ctx => {
          acc[ctx.module] = (acc[ctx.module] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
      pendingResponse: filtered.filter(c =>
        c.direction === CorrespondenceDirection.INCOMING &&
        c.status === CorrespondenceStatus.ASSIGNED &&
        c.respondByDate
      ).length,
      overdueResponse: filtered.filter(c =>
        c.direction === CorrespondenceDirection.INCOMING &&
        c.status === CorrespondenceStatus.ASSIGNED &&
        c.respondByDate &&
        new Date(c.respondByDate) < new Date()
      ).length
    };
  },

  async getStats(): Promise<CorrespondenceStats> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const all = MOCK_CORRESPONDENCE;

    return {
      totalCorrespondence: all.length,
      outgoingCount: all.filter(c => c.direction === CorrespondenceDirection.OUTGOING).length,
      incomingCount: all.filter(c => c.direction === CorrespondenceDirection.INCOMING).length,
      draftCount: all.filter(c => c.status === CorrespondenceStatus.DRAFT).length,
      sentCount: all.filter(c => c.status === CorrespondenceStatus.SENT || c.status === CorrespondenceStatus.DELIVERED).length,
      receivedCount: all.filter(c => c.status === CorrespondenceStatus.RECEIVED || c.status === CorrespondenceStatus.LOGGED).length,
      pendingResponseCount: all.filter(c =>
        c.direction === CorrespondenceDirection.INCOMING &&
        c.status === CorrespondenceStatus.ASSIGNED
      ).length,
      overdueResponseCount: all.filter(c =>
        c.direction === CorrespondenceDirection.INCOMING &&
        c.respondByDate &&
        new Date(c.respondByDate) < new Date()
      ).length,
      byChannel: all.reduce((acc, c) => {
        acc[c.channel] = (acc[c.channel] || 0) + 1;
        return acc;
      }, {} as Record<CorrespondenceChannel, number>),
      byModule: all.reduce((acc, c) => {
        c.contexts?.forEach(ctx => {
          acc[ctx.module] = (acc[ctx.module] || 0) + 1;
        });
        return acc;
      }, {} as Record<CorrespondenceModule, number>),
      averageResponseTime: 2.5, // Mock
      recentActivity: all.slice(0, 5)
    };
  }
};
