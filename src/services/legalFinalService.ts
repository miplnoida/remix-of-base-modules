/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import { CourtCase, CaseDocument, HearingJudgment, Enforcement, LegalDashboardStats } from '@/types/legalFinal';

// Mock data for development
const mockCourtCases: CourtCase[] = [
  {
    caseID: 'CASE-2024-001',
    linkedEmployerID: 'EMP-001',
    employerName: 'Caribbean Resort Ltd.',
    caseType: 'Employer Arrears',
    caseStatus: 'Pending Hearing',
    dateOpened: '2024-01-15',
    officerAssigned: 'Sarah Johnson',
    caseNotes: 'Employer failed to submit contributions for Q4 2023. Amount owed: $45,000.',
    nextHearingDate: '2024-02-15',
    courtReferenceNumber: 'CV-2024-0156'
  },
  {
    caseID: 'CASE-2024-002',
    linkedContributorID: 'CON-234',
    contributorName: 'Marcus Williams',
    caseType: 'Contributor Dispute',
    caseStatus: 'In Court',
    dateOpened: '2024-01-22',
    officerAssigned: 'David Thompson',
    caseNotes: 'Contributor disputes benefit calculation. Claims additional employment history.',
    nextHearingDate: '2024-02-08',
    courtReferenceNumber: 'CV-2024-0167'
  },
  {
    caseID: 'CASE-2024-003',
    linkedEmployerID: 'EMP-045',
    employerName: 'St. Kitts Manufacturing',
    caseType: 'Fraud',
    caseStatus: 'Filed',
    dateOpened: '2024-01-28',
    officerAssigned: 'Lisa Rodriguez',
    caseNotes: 'Suspected false reporting of employee wages to reduce contribution obligations.',
    courtReferenceNumber: 'CV-2024-0178'
  }
];

const mockDocuments: CaseDocument[] = [
  {
    documentID: 'DOC-001',
    caseID: 'CASE-2024-001',
    documentType: 'Summons',
    uploadedBy: 'Sarah Johnson',
    uploadDate: '2024-01-16',
    fileName: 'summons_caribbean_resort.pdf',
    fileSize: '2.4 MB'
  },
  {
    documentID: 'DOC-002',
    caseID: 'CASE-2024-001',
    documentType: 'Payroll Evidence',
    uploadedBy: 'Sarah Johnson',
    uploadDate: '2024-01-18',
    fileName: 'payroll_records_q4_2023.xlsx',
    fileSize: '1.8 MB'
  }
];

const mockHearings: HearingJudgment[] = [
  {
    hearingID: 'HEAR-001',
    caseID: 'CASE-2024-002',
    hearingDate: '2024-01-30',
    courtNotes: 'Preliminary hearing conducted. Additional documentation requested.',
    outcome: 'Adjourned',
    judgmentSummary: 'Case adjourned pending submission of employment records.'
  }
];

const mockEnforcements: Enforcement[] = [
  {
    enforcementID: 'ENF-001',
    caseID: 'CASE-2024-001',
    enforcementType: 'Payment Plan',
    enforcementStatus: 'Ongoing',
    amountOrdered: 45000,
    amountCollected: 15000,
    officerResponsible: 'Sarah Johnson',
    dateCreated: '2024-01-20',
    notes: 'Monthly payment plan of $5,000 established.'
  }
];

export class LegalFinalService {
  // Court Cases
  static async getCourtCases(): Promise<CourtCase[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockCourtCases), 500);
    });
  }

  static async getCourtCaseById(caseID: string): Promise<CourtCase | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const courtCase = mockCourtCases.find(c => c.caseID === caseID);
        resolve(courtCase || null);
      }, 300);
    });
  }

  static async createCourtCase(caseData: Omit<CourtCase, 'caseID'>): Promise<CourtCase> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newCase: CourtCase = {
          ...caseData,
          caseID: `CASE-${Date.now()}`
        };
        mockCourtCases.push(newCase);
        resolve(newCase);
      }, 500);
    });
  }

  static async updateCourtCase(caseID: string, updates: Partial<CourtCase>): Promise<CourtCase | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockCourtCases.findIndex(c => c.caseID === caseID);
        if (index !== -1) {
          mockCourtCases[index] = { ...mockCourtCases[index], ...updates };
          resolve(mockCourtCases[index]);
        } else {
          resolve(null);
        }
      }, 500);
    });
  }

  // Documents
  static async getCaseDocuments(caseID: string): Promise<CaseDocument[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const documents = mockDocuments.filter(d => d.caseID === caseID);
        resolve(documents);
      }, 300);
    });
  }

  static async uploadDocument(documentData: Omit<CaseDocument, 'documentID'>): Promise<CaseDocument> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newDocument: CaseDocument = {
          ...documentData,
          documentID: `DOC-${Date.now()}`
        };
        mockDocuments.push(newDocument);
        resolve(newDocument);
      }, 800);
    });
  }

  // Hearings
  static async getCaseHearings(caseID: string): Promise<HearingJudgment[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hearings = mockHearings.filter(h => h.caseID === caseID);
        resolve(hearings);
      }, 300);
    });
  }

  static async createHearing(hearingData: Omit<HearingJudgment, 'hearingID'>): Promise<HearingJudgment> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newHearing: HearingJudgment = {
          ...hearingData,
          hearingID: `HEAR-${Date.now()}`
        };
        mockHearings.push(newHearing);
        resolve(newHearing);
      }, 500);
    });
  }

  // Enforcement
  static async getCaseEnforcements(caseID: string): Promise<Enforcement[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const enforcements = mockEnforcements.filter(e => e.caseID === caseID);
        resolve(enforcements);
      }, 300);
    });
  }

  static async createEnforcement(enforcementData: Omit<Enforcement, 'enforcementID'>): Promise<Enforcement> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newEnforcement: Enforcement = {
          ...enforcementData,
          enforcementID: `ENF-${Date.now()}`
        };
        mockEnforcements.push(newEnforcement);
        resolve(newEnforcement);
      }, 500);
    });
  }

  // Dashboard Stats
  static async getDashboardStats(): Promise<LegalDashboardStats> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stats: LegalDashboardStats = {
          totalOpenCases: mockCourtCases.filter(c => c.caseStatus !== 'Closed').length,
          casesByType: {
            employerArrears: mockCourtCases.filter(c => c.caseType === 'Employer Arrears').length,
            contributorDispute: mockCourtCases.filter(c => c.caseType === 'Contributor Dispute').length,
            fraud: mockCourtCases.filter(c => c.caseType === 'Fraud').length,
            overpayment: mockCourtCases.filter(c => c.caseType === 'Overpayment').length,
            appeal: mockCourtCases.filter(c => c.caseType === 'Appeal').length,
          },
          financialRecovery: {
            totalOrdered: mockEnforcements.reduce((sum, e) => sum + e.amountOrdered, 0),
            totalCollected: mockEnforcements.reduce((sum, e) => sum + e.amountCollected, 0),
            collectionRate: 0.67
          },
          upcomingHearings: mockCourtCases.filter(c => c.nextHearingDate).length,
          topEmployersInArrears: [
            { employerName: 'Caribbean Resort Ltd.', caseCount: 1, amountOwed: 45000 },
            { employerName: 'St. Kitts Manufacturing', caseCount: 1, amountOwed: 32000 }
          ]
        };
        resolve(stats);
      }, 500);
    });
  }

  // Mock employer and contributor data
  static async getEmployers(): Promise<Array<{id: string, name: string}>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'EMP-001', name: 'Caribbean Resort Ltd.' },
          { id: 'EMP-002', name: 'St. Kitts Bank' },
          { id: 'EMP-003', name: 'Nevis Construction Co.' },
          { id: 'EMP-004', name: 'Island Medical Center' },
          { id: 'EMP-005', name: 'Sugar Factory Ltd.' }
        ]);
      }, 300);
    });
  }

  static async getContributors(): Promise<Array<{id: string, name: string}>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'CON-001', name: 'John Smith' },
          { id: 'CON-002', name: 'Maria Garcia' },
          { id: 'CON-003', name: 'Robert Johnson' },
          { id: 'CON-004', name: 'Sarah Williams' },
          { id: 'CON-005', name: 'Marcus Brown' }
        ]);
      }, 300);
    });
  }
}