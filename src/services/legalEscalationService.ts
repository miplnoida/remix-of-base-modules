import { 
  LegalEscalationPolicy, 
  LegalEscalationRule,
  LegalRecommendation,
  LegalReferralHeader,
  LegalReferralLine,
  LegalRecommendationQueueStats,
  EscalationRuleType,
  EscalationTriggerCondition,
  LegalReferralStatus
} from '@/types/legalEscalation';

// ============================================
// MOCK DATA: Legal Escalation Policies
// ============================================

const mockEscalationRules: LegalEscalationRule[] = [
  {
    id: 'rule-001',
    ruleName: 'Arrears Over 90 Days',
    ruleType: EscalationRuleType.AGE_THRESHOLD,
    description: 'Escalate if contribution arrears exceed 90 days past due',
    enabled: true,
    priority: 1,
    ageDaysOverdue: 90,
    triggerCondition: EscalationTriggerCondition.AND,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: true,
    createdDate: '2024-01-15',
    createdBy: 'system'
  },
  {
    id: 'rule-002',
    ruleName: 'High Amount Threshold',
    ruleType: EscalationRuleType.AMOUNT_THRESHOLD,
    description: 'Escalate if total arrears exceed EC$50,000',
    enabled: true,
    priority: 2,
    totalArrearsThreshold: 50000,
    triggerCondition: EscalationTriggerCondition.OR,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: true,
    createdDate: '2024-01-15',
    createdBy: 'system'
  },
  {
    id: 'rule-003',
    ruleName: 'Multiple Notices No Response',
    ruleType: EscalationRuleType.BEHAVIOUR_THRESHOLD,
    description: 'Escalate after 3 notices sent with no response for 60 days',
    enabled: true,
    priority: 3,
    noticesSentMinimum: 3,
    noResponseDays: 60,
    triggerCondition: EscalationTriggerCondition.AND,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: false,
    createdDate: '2024-01-15',
    createdBy: 'system'
  },
  {
    id: 'rule-004',
    ruleName: 'Broken Payment Plans',
    ruleType: EscalationRuleType.BEHAVIOUR_THRESHOLD,
    description: 'Escalate if employer breaks payment plan twice',
    enabled: true,
    priority: 4,
    paymentPlanBreachesCount: 2,
    triggerCondition: EscalationTriggerCondition.OR,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: true,
    createdDate: '2024-01-15',
    createdBy: 'system'
  },
  {
    id: 'rule-005',
    ruleName: 'High Risk + Overdue Combination',
    ruleType: EscalationRuleType.RISK_THRESHOLD,
    description: 'Escalate high-risk employers with arrears over 60 days',
    enabled: true,
    priority: 5,
    riskBandMinimum: 'High',
    riskScoreMinimum: 70,
    combineWithAgeThreshold: true,
    ageDaysOverdue: 60,
    triggerCondition: EscalationTriggerCondition.AND,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: true,
    createdDate: '2024-01-15',
    createdBy: 'system'
  },
  {
    id: 'rule-006',
    ruleName: 'C3 Not Submitted - 3 Months',
    ruleType: EscalationRuleType.AGE_THRESHOLD,
    description: 'Escalate if C3 not submitted for 3 consecutive months',
    enabled: true,
    priority: 6,
    consecutiveMonthsMissing: 3,
    triggerCondition: EscalationTriggerCondition.OR,
    autoMarkLegalRecommended: true,
    notifyComplianceOfficer: true,
    notifySupervisor: false,
    createdDate: '2024-01-15',
    createdBy: 'system'
  }
];

const mockEscalationPolicy: LegalEscalationPolicy = {
  id: 'policy-001',
  policyName: 'Default Legal Escalation Policy',
  effectiveFrom: '2024-01-01',
  active: true,
  rules: mockEscalationRules,
  evaluationFrequency: 'WEEKLY',
  lastEvaluationDate: '2024-12-15',
  nextEvaluationDate: '2024-12-22',
  createdDate: '2024-01-01',
  createdBy: 'System Administrator'
};

// ============================================
// MOCK DATA: Legal Recommendations
// ============================================

const mockLegalRecommendations: LegalRecommendation[] = [
  {
    id: 'rec-001',
    employerId: 'emp-001',
    employerName: 'ABC Construction Ltd',
    employerZone: 'Zone 1 - Basseterre',
    riskBand: 'High',
    riskScore: 82,
    qualifyingSubcaseIds: ['C-001', 'C-002', 'C-003'],
    subcaseSummary: [
      {
        subcaseId: 'C-001',
        caseNumber: 'COMP-2024-001',
        caseType: 'ARREARS_CASE',
        periodFrom: '2024-01',
        periodTo: '2024-03',
        principalAmount: 45000,
        penaltyAmount: 4500,
        interestAmount: 1200,
        totalAmount: 50700
      },
      {
        subcaseId: 'C-002',
        caseNumber: 'COMP-2024-012',
        caseType: 'ARREARS_CASE',
        periodFrom: '2024-04',
        periodTo: '2024-06',
        principalAmount: 38000,
        penaltyAmount: 3800,
        interestAmount: 950,
        totalAmount: 42750
      },
      {
        subcaseId: 'C-003',
        caseNumber: 'COMP-2024-025',
        caseType: 'C3_NOT_SUBMITTED',
        periodFrom: '2024-07',
        periodTo: '2024-09',
        principalAmount: 42000,
        penaltyAmount: 4200,
        interestAmount: 0,
        totalAmount: 46200
      }
    ],
    totalPrincipal: 125000,
    totalPenalties: 12500,
    totalInterest: 2150,
    grandTotal: 139650,
    triggeredRules: [
      {
        ruleId: 'rule-001',
        ruleName: 'Arrears Over 90 Days',
        reason: 'Arrears outstanding for 127 days'
      },
      {
        ruleId: 'rule-002',
        ruleName: 'High Amount Threshold',
        reason: 'Total arrears EC$139,650 exceeds EC$50,000 threshold'
      },
      {
        ruleId: 'rule-005',
        ruleName: 'High Risk + Overdue Combination',
        reason: 'High risk band (82) with 127 days overdue'
      }
    ],
    recommendedDate: '2024-12-10',
    status: 'PENDING_REVIEW'
  },
  {
    id: 'rec-002',
    employerId: 'emp-002',
    employerName: 'XYZ Manufacturing Inc',
    employerZone: 'Zone 2 - Sandy Point',
    riskBand: 'Critical',
    riskScore: 91,
    qualifyingSubcaseIds: ['C-004', 'C-005'],
    subcaseSummary: [
      {
        subcaseId: 'C-004',
        caseNumber: 'COMP-2024-008',
        caseType: 'PAYMENT_ARRANGEMENT_DEFAULT',
        periodFrom: '2023-10',
        periodTo: '2024-02',
        principalAmount: 78000,
        penaltyAmount: 7800,
        interestAmount: 3200,
        totalAmount: 89000
      },
      {
        subcaseId: 'C-005',
        caseNumber: 'COMP-2024-019',
        caseType: 'ARREARS_CASE',
        periodFrom: '2024-03',
        periodTo: '2024-08',
        principalAmount: 92000,
        penaltyAmount: 9200,
        interestAmount: 2800,
        totalAmount: 104000
      }
    ],
    totalPrincipal: 170000,
    totalPenalties: 17000,
    totalInterest: 6000,
    grandTotal: 193000,
    triggeredRules: [
      {
        ruleId: 'rule-002',
        ruleName: 'High Amount Threshold',
        reason: 'Total arrears EC$193,000 exceeds EC$50,000 threshold'
      },
      {
        ruleId: 'rule-004',
        ruleName: 'Broken Payment Plans',
        reason: 'Payment plan broken twice (Oct 2023, Mar 2024)'
      },
      {
        ruleId: 'rule-005',
        ruleName: 'High Risk + Overdue Combination',
        reason: 'Critical risk band (91) with ongoing defaults'
      }
    ],
    recommendedDate: '2024-12-08',
    status: 'PENDING_REVIEW'
  },
  {
    id: 'rec-003',
    employerId: 'emp-003',
    employerName: 'Island Retail Group',
    employerZone: 'Zone 1 - Basseterre',
    riskBand: 'Medium',
    riskScore: 65,
    qualifyingSubcaseIds: ['C-006'],
    subcaseSummary: [
      {
        subcaseId: 'C-006',
        caseNumber: 'COMP-2024-032',
        caseType: 'ARREARS_CASE',
        periodFrom: '2024-03',
        periodTo: '2024-09',
        principalAmount: 55000,
        penaltyAmount: 5500,
        interestAmount: 1800,
        totalAmount: 62300
      }
    ],
    totalPrincipal: 55000,
    totalPenalties: 5500,
    totalInterest: 1800,
    grandTotal: 62300,
    triggeredRules: [
      {
        ruleId: 'rule-001',
        ruleName: 'Arrears Over 90 Days',
        reason: 'Arrears outstanding for 145 days'
      },
      {
        ruleId: 'rule-002',
        ruleName: 'High Amount Threshold',
        reason: 'Total arrears EC$62,300 exceeds EC$50,000 threshold'
      },
      {
        ruleId: 'rule-003',
        ruleName: 'Multiple Notices No Response',
        reason: '4 notices sent with no response for 78 days'
      }
    ],
    recommendedDate: '2024-12-12',
    status: 'APPROVED_FOR_REFERRAL'
  }
];

// ============================================
// MOCK DATA: Legal Referrals
// ============================================

const mockLegalReferrals: LegalReferralHeader[] = [
  {
    id: 'ref-001',
    referralNumber: 'LR-2024-001',
    employerId: 'emp-004',
    employerName: 'Caribbean Hotels Ltd',
    employerZone: 'Zone 3 - Charlestown',
    totalPrincipal: 145000,
    totalPenalties: 14500,
    totalInterest: 4200,
    grandTotal: 163700,
    periodFrom: '2023-09',
    periodTo: '2024-09',
    periodsCount: 13,
    complianceHistory: `Employer has consistently failed to remit contributions despite multiple interventions:
- Initial contact made on 15-Oct-2023
- First Notice issued on 01-Nov-2023
- Second Notice issued on 15-Dec-2023
- Final Notice issued on 15-Jan-2024
- Site inspection conducted on 05-Feb-2024 - employer confirmed financial difficulties
- Payment arrangement proposed and rejected by employer on 20-Feb-2024
- Multiple follow-up calls made (Mar-Sep 2024) - no response
- Inspector visit on 12-Sep-2024 - business still operating with 45+ employees

Employer has refused all attempts at negotiation and continues to operate without compliance.`,
    noticesSent: 5,
    lastNoticeDate: '2024-09-01',
    paymentPlanHistory: 'Payment arrangement proposed on 20-Feb-2024 but rejected by employer',
    auditFindings: 'Audit conducted Feb 2024 revealed under-reporting of wages for at least 12 employees',
    contactAttempts: '15+ phone calls, 3 site visits, 5 formal notices',
    status: LegalReferralStatus.SUBMITTED_TO_LEGAL,
    createdDate: '2024-11-15',
    createdBy: 'user-001',
    createdByName: 'John Smith',
    submittedDate: '2024-11-18',
    attachments: [
      {
        id: 'att-001',
        fileName: 'Compliance_History_Caribbean_Hotels.pdf',
        fileType: 'PDF',
        uploadedDate: '2024-11-15',
        uploadedBy: 'John Smith'
      },
      {
        id: 'att-002',
        fileName: 'Audit_Report_Feb_2024.pdf',
        fileType: 'PDF',
        uploadedDate: '2024-11-15',
        uploadedBy: 'John Smith'
      }
    ]
  }
];

// ============================================
// SERVICE METHODS
// ============================================

export const legalEscalationService = {
  // Get active escalation policy
  async getActivePolicy(): Promise<LegalEscalationPolicy> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockEscalationPolicy;
  },

  // Update escalation policy
  async updatePolicy(policy: Partial<LegalEscalationPolicy>): Promise<LegalEscalationPolicy> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return {
      ...mockEscalationPolicy,
      ...policy,
      updatedDate: new Date().toISOString(),
      updatedBy: 'Current User'
    };
  },

  // Add escalation rule
  async addRule(rule: Omit<LegalEscalationRule, 'id'>): Promise<LegalEscalationRule> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const newRule: LegalEscalationRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdDate: new Date().toISOString(),
      createdBy: 'Current User'
    };
    mockEscalationPolicy.rules.push(newRule);
    return newRule;
  },

  // Update escalation rule
  async updateRule(ruleId: string, updates: Partial<LegalEscalationRule>): Promise<LegalEscalationRule> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const ruleIndex = mockEscalationPolicy.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      mockEscalationPolicy.rules[ruleIndex] = {
        ...mockEscalationPolicy.rules[ruleIndex],
        ...updates,
        updatedDate: new Date().toISOString(),
        updatedBy: 'Current User'
      };
      return mockEscalationPolicy.rules[ruleIndex];
    }
    throw new Error('Rule not found');
  },

  // Delete escalation rule
  async deleteRule(ruleId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const ruleIndex = mockEscalationPolicy.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      mockEscalationPolicy.rules.splice(ruleIndex, 1);
    }
  },

  // Get legal recommendations (queue)
  async getLegalRecommendations(filters?: {
    status?: string;
    zone?: string;
    riskBand?: string;
    minAmount?: number;
  }): Promise<LegalRecommendation[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    let results = [...mockLegalRecommendations];
    
    if (filters?.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters?.zone) {
      results = results.filter(r => r.employerZone === filters.zone);
    }
    if (filters?.riskBand) {
      results = results.filter(r => r.riskBand === filters.riskBand);
    }
    if (filters?.minAmount) {
      results = results.filter(r => r.grandTotal >= filters.minAmount);
    }
    
    return results;
  },

  // Get queue statistics
  async getQueueStats(): Promise<LegalRecommendationQueueStats> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      totalEmployers: mockLegalRecommendations.length,
      totalSubcases: mockLegalRecommendations.reduce((sum, rec) => sum + rec.qualifyingSubcaseIds.length, 0),
      totalAmountAtRisk: mockLegalRecommendations.reduce((sum, rec) => sum + rec.grandTotal, 0),
      byRiskBand: {
        critical: mockLegalRecommendations.filter(r => r.riskBand === 'Critical').length,
        high: mockLegalRecommendations.filter(r => r.riskBand === 'High').length,
        medium: mockLegalRecommendations.filter(r => r.riskBand === 'Medium').length,
        low: mockLegalRecommendations.filter(r => r.riskBand === 'Low').length
      },
      byZone: [
        { zoneName: 'Zone 1 - Basseterre', count: 2 },
        { zoneName: 'Zone 2 - Sandy Point', count: 1 }
      ],
      pendingReview: mockLegalRecommendations.filter(r => r.status === 'PENDING_REVIEW').length,
      approvedForReferral: mockLegalRecommendations.filter(r => r.status === 'APPROVED_FOR_REFERRAL').length,
      referralCreated: mockLegalRecommendations.filter(r => r.status === 'REFERRAL_CREATED').length
    };
  },

  // Update recommendation status
  async updateRecommendationStatus(
    recommendationId: string,
    status: LegalRecommendation['status'],
    notes?: string
  ): Promise<LegalRecommendation> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const recIndex = mockLegalRecommendations.findIndex(r => r.id === recommendationId);
    if (recIndex !== -1) {
      mockLegalRecommendations[recIndex] = {
        ...mockLegalRecommendations[recIndex],
        status,
        reviewedBy: 'Current User',
        reviewedDate: new Date().toISOString(),
        reviewNotes: notes
      };
      return mockLegalRecommendations[recIndex];
    }
    throw new Error('Recommendation not found');
  },

  // Create legal referral
  async createLegalReferral(referralData: {
    recommendationId: string;
    selectedSubcaseIds: string[];
    complianceHistory: string;
    attachments?: any[];
  }): Promise<LegalReferralHeader> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const recommendation = mockLegalRecommendations.find(r => r.id === referralData.recommendationId);
    if (!recommendation) {
      throw new Error('Recommendation not found');
    }

    const selectedSubcases = recommendation.subcaseSummary.filter(s => 
      referralData.selectedSubcaseIds.includes(s.subcaseId)
    );

    const newReferral: LegalReferralHeader = {
      id: `ref-${Date.now()}`,
      referralNumber: `LR-2024-${String(mockLegalReferrals.length + 1).padStart(3, '0')}`,
      employerId: recommendation.employerId,
      employerName: recommendation.employerName,
      employerZone: recommendation.employerZone,
      totalPrincipal: selectedSubcases.reduce((sum, s) => sum + s.principalAmount, 0),
      totalPenalties: selectedSubcases.reduce((sum, s) => sum + s.penaltyAmount, 0),
      totalInterest: selectedSubcases.reduce((sum, s) => sum + s.interestAmount, 0),
      grandTotal: selectedSubcases.reduce((sum, s) => sum + s.totalAmount, 0),
      periodFrom: selectedSubcases[0]?.periodFrom || '',
      periodTo: selectedSubcases[selectedSubcases.length - 1]?.periodTo || '',
      periodsCount: selectedSubcases.length,
      complianceHistory: referralData.complianceHistory,
      noticesSent: 0, // Would be populated from actual case data
      status: LegalReferralStatus.DRAFT,
      createdDate: new Date().toISOString(),
      createdBy: 'user-001',
      createdByName: 'Current User',
      attachments: referralData.attachments || []
    };

    mockLegalReferrals.push(newReferral);
    
    // Update recommendation status
    recommendation.status = 'REFERRAL_CREATED';
    recommendation.legalReferralId = newReferral.id;

    return newReferral;
  },

  // Get legal referrals
  async getLegalReferrals(filters?: {
    status?: LegalReferralStatus;
    employerId?: string;
  }): Promise<LegalReferralHeader[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    let results = [...mockLegalReferrals];
    
    if (filters?.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters?.employerId) {
      results = results.filter(r => r.employerId === filters.employerId);
    }
    
    return results;
  },

  // Submit referral to legal
  async submitReferralToLegal(referralId: string): Promise<LegalReferralHeader> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const refIndex = mockLegalReferrals.findIndex(r => r.id === referralId);
    if (refIndex !== -1) {
      mockLegalReferrals[refIndex] = {
        ...mockLegalReferrals[refIndex],
        status: LegalReferralStatus.SUBMITTED_TO_LEGAL,
        submittedDate: new Date().toISOString()
      };
      return mockLegalReferrals[refIndex];
    }
    throw new Error('Referral not found');
  }
};
