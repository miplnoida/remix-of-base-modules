import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockCases, MockCase } from '@/data/mockLegalCases';

interface Party {
  id: string;
  role: string;
  name: string;
  registryType?: string;
  registryRef?: string;
  email?: string;
  phone?: string;
  address?: string;
  serviceStatus: string;
  serviceMethod?: string;
  serviceDate?: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  folder: string;
  uploadedBy: string;
  uploadedAt: string;
  confidential: boolean;
  url?: string;
}

interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'Doing' | 'Done';
  owner: string;
  dueOn?: string;
  priority: string;
  description?: string;
}

interface Hearing {
  id: string;
  type: string;
  venue: string;
  startAt: string;
  endAt: string;
  panel: string[];
  agenda?: string;
  attendance?: any;
  outcome?: string;
}

interface Correspondence {
  id: string;
  direction: string;
  type: string;
  subject: string;
  sentOn: string;
  channels: string[];
}

interface Evidence {
  id: string;
  type: string;
  description: string;
  addedBy: string;
  addedOn: string;
  chain: Array<{ date: string; action: string; user: string }>;
}

interface Order {
  id: string;
  number?: string;
  status: string;
  basis: string;
  findings: string;
  directives: string;
  complianceDue?: string;
  publishedAt?: string;
  pdfUrl?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
  metadata?: any;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  user: string;
  timestamp: string;
}

interface CaseData {
  parties: Party[];
  documents: Document[];
  tasks: Task[];
  hearings: Hearing[];
  correspondence: Correspondence[];
  evidence: Evidence[];
  orders: Order[];
  timeline: TimelineEvent[];
  audit: AuditEntry[];
}

interface LegalCaseContextType {
  cases: MockCase[];
  getCaseData: (caseId: string) => CaseData;
  addCase: (newCase: Omit<MockCase, 'id' | 'age_days'>) => string;
  addParty: (caseId: string, party: Omit<Party, 'id'>) => void;
  updatePartyService: (caseId: string, partyId: string, serviceData: Partial<Party>) => void;
  addDocument: (caseId: string, doc: Omit<Document, 'id' | 'uploadedAt'>) => void;
  addTask: (caseId: string, task: Omit<Task, 'id'>) => void;
  updateTaskStatus: (caseId: string, taskId: string, status: Task['status']) => void;
  addHearing: (caseId: string, hearing: Omit<Hearing, 'id'>) => void;
  updateHearing: (caseId: string, hearingId: string, updates: Partial<Hearing>) => void;
  addCorrespondence: (caseId: string, corr: Omit<Correspondence, 'id' | 'sentOn'>) => void;
  addEvidence: (caseId: string, evid: Omit<Evidence, 'id' | 'addedOn' | 'chain'>) => void;
  addOrder: (caseId: string, order: Omit<Order, 'id'>) => void;
  updateOrder: (caseId: string, orderId: string, updates: Partial<Order>) => void;
  addTimelineEvent: (caseId: string, event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
}

const LegalCaseContext = createContext<LegalCaseContextType | undefined>(undefined);

export function LegalCaseProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<MockCase[]>(mockCases);
  const [caseDataMap, setCaseDataMap] = useState<Record<string, CaseData>>({});

  const getCaseData = (caseId: string): CaseData => {
    if (!caseDataMap[caseId]) {
      return {
        parties: [],
        documents: [],
        tasks: [],
        hearings: [],
        correspondence: [],
        evidence: [],
        orders: [],
        timeline: [],
        audit: []
      };
    }
    return caseDataMap[caseId];
  };

  const addCase = (newCase: Omit<MockCase, 'id' | 'age_days'>): string => {
    const id = `case-${Date.now()}`;
    const filedDate = new Date(newCase.filed_at);
    const today = new Date();
    const age_days = Math.floor((today.getTime() - filedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const fullCase: MockCase = {
      ...newCase,
      id,
      age_days,
      activities: [],
      hearings: []
    };
    
    setCases(prev => [...prev, fullCase]);
    
    setCaseDataMap(prev => ({
      ...prev,
      [id]: {
        parties: [],
        documents: [],
        tasks: [],
        hearings: [],
        correspondence: [],
        evidence: [],
        orders: [],
        timeline: [{
          id: `timeline-${Date.now()}`,
          type: 'Case Created',
          description: 'Case filed and created in system',
          timestamp: new Date().toISOString(),
          user: 'System'
        }],
        audit: [{
          id: `audit-${Date.now()}`,
          action: 'CREATE',
          entity: 'Case',
          entityId: id,
          before: null,
          after: fullCase,
          user: 'Current User',
          timestamp: new Date().toISOString()
        }]
      }
    }));
    
    return id;
  };

  const addParty = (caseId: string, party: Omit<Party, 'id'>) => {
    const id = `party-${Date.now()}`;
    setCaseDataMap(prev => ({
      ...prev,
      [caseId]: {
        ...getCaseData(caseId),
        parties: [...getCaseData(caseId).parties, { ...party, id }],
        timeline: [...getCaseData(caseId).timeline, {
          id: `timeline-${Date.now()}`,
          type: 'Party Added',
          description: `${party.name} added as ${party.role}`,
          timestamp: new Date().toISOString(),
          user: 'Current User'
        }]
      }
    }));
  };

  const updatePartyService = (caseId: string, partyId: string, serviceData: Partial<Party>) => {
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          parties: data.parties.map(p => p.id === partyId ? { ...p, ...serviceData } : p),
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Service Recorded',
            description: `Service marked for party via ${serviceData.serviceMethod}`,
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const addDocument = (caseId: string, doc: Omit<Document, 'id' | 'uploadedAt'>) => {
    const id = `doc-${Date.now()}`;
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          documents: [...data.documents, { ...doc, id, uploadedAt: new Date().toISOString() }],
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Document Uploaded',
            description: `${doc.name} added to ${doc.folder}`,
            timestamp: new Date().toISOString(),
            user: doc.uploadedBy
          }]
        }
      };
    });
  };

  const addTask = (caseId: string, task: Omit<Task, 'id'>) => {
    const id = `task-${Date.now()}`;
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          tasks: [...data.tasks, { ...task, id }],
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Task Created',
            description: `Task "${task.title}" assigned to ${task.owner}`,
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const updateTaskStatus = (caseId: string, taskId: string, status: Task['status']) => {
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          tasks: data.tasks.map(t => t.id === taskId ? { ...t, status } : t),
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Task Updated',
            description: `Task moved to ${status}`,
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const addHearing = (caseId: string, hearing: Omit<Hearing, 'id'>) => {
    const id = `hearing-${Date.now()}`;
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          hearings: [...data.hearings, { ...hearing, id }],
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Hearing Scheduled',
            description: `${hearing.type} scheduled at ${hearing.venue}`,
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const updateHearing = (caseId: string, hearingId: string, updates: Partial<Hearing>) => {
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          hearings: data.hearings.map(h => h.id === hearingId ? { ...h, ...updates } : h),
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Hearing Updated',
            description: 'Hearing details updated',
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const addCorrespondence = (caseId: string, corr: Omit<Correspondence, 'id' | 'sentOn'>) => {
    const id = `corr-${Date.now()}`;
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          correspondence: [...data.correspondence, { ...corr, id, sentOn: new Date().toISOString() }],
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Correspondence Sent',
            description: `${corr.type}: ${corr.subject}`,
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const addEvidence = (caseId: string, evid: Omit<Evidence, 'id' | 'addedOn' | 'chain'>) => {
    const id = `evid-${Date.now()}`;
    const timestamp = new Date().toISOString();
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          evidence: [...data.evidence, { 
            ...evid, 
            id, 
            addedOn: timestamp,
            chain: [{ date: timestamp, action: 'Evidence collected', user: evid.addedBy }]
          }],
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Evidence Added',
            description: `${evid.type}: ${evid.description}`,
            timestamp,
            user: evid.addedBy
          }]
        }
      };
    });
  };

  const addOrder = (caseId: string, order: Omit<Order, 'id'>) => {
    const id = `order-${Date.now()}`;
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          orders: [...data.orders, { ...order, id }],
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Order Created',
            description: `Order draft created (${order.status})`,
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const updateOrder = (caseId: string, orderId: string, updates: Partial<Order>) => {
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          orders: data.orders.map(o => o.id === orderId ? { ...o, ...updates } : o),
          timeline: [...data.timeline, {
            id: `timeline-${Date.now()}`,
            type: 'Order Updated',
            description: updates.status === 'Published' ? 'Order published' : 'Order updated',
            timestamp: new Date().toISOString(),
            user: 'Current User'
          }]
        }
      };
    });
  };

  const addTimelineEvent = (caseId: string, event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    setCaseDataMap(prev => {
      const data = getCaseData(caseId);
      return {
        ...prev,
        [caseId]: {
          ...data,
          timeline: [...data.timeline, {
            ...event,
            id: `timeline-${Date.now()}`,
            timestamp: new Date().toISOString()
          }]
        }
      };
    });
  };

  return (
    <LegalCaseContext.Provider value={{
      cases,
      getCaseData,
      addCase,
      addParty,
      updatePartyService,
      addDocument,
      addTask,
      updateTaskStatus,
      addHearing,
      updateHearing,
      addCorrespondence,
      addEvidence,
      addOrder,
      updateOrder,
      addTimelineEvent
    }}>
      {children}
    </LegalCaseContext.Provider>
  );
}

export function useLegalCases() {
  const context = useContext(LegalCaseContext);
  if (!context) {
    throw new Error('useLegalCases must be used within a LegalCaseProvider');
  }
  return context;
}
