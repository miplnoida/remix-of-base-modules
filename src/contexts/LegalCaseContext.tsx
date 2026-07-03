/** @deprecated Legal V1 legacy — retired 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. Not routed / not linked from canonical UI. */
import { createContext, useContext, useState, ReactNode } from 'react';
import { mockCases, MockCase } from '@/data/mockLegalCases';

interface LegalCaseContextType {
  cases: MockCase[];
  addCase: (caseData: any) => void;
  updateCase: (id: string, updates: Partial<MockCase>) => void;
  getCaseById: (id: string) => MockCase | undefined;
}

const LegalCaseContext = createContext<LegalCaseContextType | undefined>(undefined);

export function LegalCaseProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<MockCase[]>(mockCases);

  const addCase = (caseData: any) => {
    const newCase: MockCase = {
      id: `case-${Date.now()}`,
      number: `SSB-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`,
      title: caseData.title,
      type: caseData.type,
      status: 'Draft',
      stage: 'Intake',
      priority: caseData.priority || 'Medium',
      parties: caseData.parties.map((p: any) => p.name),
      assignee: 'Unassigned',
      filed_at: new Date().toISOString(),
      next_event_at: null,
      age_days: 0,
      summary: caseData.summary,
      relief_sought: caseData.relief_sought || '',
      flags: [],
      source: caseData.source,
      enforcement_funnel: caseData.enforcementFunnel,
      assigned_officers: caseData.assignedOfficers,
      court_reference_number: caseData.courtReferenceNumber,
      activities: [{
        date: new Date().toISOString(),
        user: 'Current User',
        action: 'Case created'
      }],
      hearings: []
    };
    setCases(prev => [newCase, ...prev]);
  };

  const updateCase = (id: string, updates: Partial<MockCase>) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const getCaseById = (id: string) => {
    return cases.find(c => c.id === id);
  };

  return (
    <LegalCaseContext.Provider value={{ cases, addCase, updateCase, getCaseById }}>
      {children}
    </LegalCaseContext.Provider>
  );
}

export function useLegalCases() {
  const context = useContext(LegalCaseContext);
  if (!context) {
    throw new Error('useLegalCases must be used within LegalCaseProvider');
  }
  return context;
}
