// ============================================
// AUDIT CHECKLIST TYPES
// ============================================

export interface ChecklistItem {
  id: string;
  category: string;
  question: string;
  response?: 'Yes' | 'No' | 'N/A' | 'Partial';
  notes?: string;
  evidenceRequired: boolean;
  evidenceAttached?: string[]; // File IDs/URLs
}

export interface AuditChecklistTemplate {
  id: string;
  name: string;
  description: string;
  visitType: string;
  riskBand?: string;
  categories: ChecklistCategory[];
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
}

// Pre-defined checklist templates
export const AUDIT_CHECKLIST_TEMPLATES: Record<string, AuditChecklistTemplate> = {
  GENERAL_AUDIT: {
    id: 'general-audit',
    name: 'General Compliance Audit',
    description: 'Standard audit checklist for regular compliance reviews',
    visitType: 'AUDIT',
    categories: [
      {
        id: 'cat-1',
        name: 'Registration & Documentation',
        items: [
          {
            id: 'item-1-1',
            category: 'Registration & Documentation',
            question: 'Is the employer properly registered with Social Security?',
            evidenceRequired: true
          },
          {
            id: 'item-1-2',
            category: 'Registration & Documentation',
            question: 'Are employee records maintained and up to date?',
            evidenceRequired: true
          },
          {
            id: 'item-1-3',
            category: 'Registration & Documentation',
            question: 'Are wage books/payroll records available for inspection?',
            evidenceRequired: true
          }
        ]
      },
      {
        id: 'cat-2',
        name: 'C3 Submissions',
        items: [
          {
            id: 'item-2-1',
            category: 'C3 Submissions',
            question: 'Are C3 forms submitted on time for the last 6 months?',
            evidenceRequired: true
          },
          {
            id: 'item-2-2',
            category: 'C3 Submissions',
            question: 'Do C3 submissions match employment records?',
            evidenceRequired: true
          },
          {
            id: 'item-2-3',
            category: 'C3 Submissions',
            question: 'Are all employees listed on C3 forms?',
            evidenceRequired: false
          }
        ]
      },
      {
        id: 'cat-3',
        name: 'Payments & Contributions',
        items: [
          {
            id: 'item-3-1',
            category: 'Payments & Contributions',
            question: 'Are contributions paid in full and on time?',
            evidenceRequired: true
          },
          {
            id: 'item-3-2',
            category: 'Payments & Contributions',
            question: 'Are payment receipts available for verification?',
            evidenceRequired: true
          },
          {
            id: 'item-3-3',
            category: 'Payments & Contributions',
            question: 'Are there any outstanding arrears?',
            evidenceRequired: false
          }
        ]
      },
      {
        id: 'cat-4',
        name: 'Employment Verification',
        items: [
          {
            id: 'item-4-1',
            category: 'Employment Verification',
            question: 'Physical verification of employees on site completed?',
            evidenceRequired: false
          },
          {
            id: 'item-4-2',
            category: 'Employment Verification',
            question: 'Employee interviews conducted (if required)?',
            evidenceRequired: false
          },
          {
            id: 'item-4-3',
            category: 'Employment Verification',
            question: 'Are wages reported accurately?',
            evidenceRequired: true
          }
        ]
      }
    ]
  },
  HIGH_RISK_AUDIT: {
    id: 'high-risk-audit',
    name: 'High Risk Employer Audit',
    description: 'Enhanced checklist for high-risk employers',
    visitType: 'RISK_BASED_AUDIT',
    riskBand: 'High',
    categories: [
      {
        id: 'cat-hr-1',
        name: 'Compliance History',
        items: [
          {
            id: 'item-hr-1-1',
            category: 'Compliance History',
            question: 'Review previous audit findings - are issues resolved?',
            evidenceRequired: true
          },
          {
            id: 'item-hr-1-2',
            category: 'Compliance History',
            question: 'Check for repeated violations or patterns',
            evidenceRequired: true
          }
        ]
      },
      {
        id: 'cat-hr-2',
        name: 'Enhanced Verification',
        items: [
          {
            id: 'item-hr-2-1',
            category: 'Enhanced Verification',
            question: 'Conduct extended employee interviews (minimum 5)',
            evidenceRequired: true
          },
          {
            id: 'item-hr-2-2',
            category: 'Enhanced Verification',
            question: 'Cross-check wage books against bank statements',
            evidenceRequired: true
          },
          {
            id: 'item-hr-2-3',
            category: 'Enhanced Verification',
            question: 'Verify SSN validity for all employees',
            evidenceRequired: true
          }
        ]
      }
    ]
  }
};
