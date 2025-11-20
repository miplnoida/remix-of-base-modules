import { ComplianceSettingsPolicy, ComplianceSettingsHistory } from '@/types/complianceSettings';

// Mock data for policy history
const MOCK_POLICIES: ComplianceSettingsPolicy[] = [
  {
    policyId: 'POL-2024-001',
    policyVersion: 'v1.0',
    effectiveFrom: '2024-01-01',
    effectiveTo: '2024-02-28',
    isActive: false,
    c3GracePeriodDays: 7,
    c3SubmissionDeadlineDay: 15,
    paymentDueDateDay: 20,
    penaltyRatePercent: 3.0,
    interestRatePercent: 2.0,
    penaltyCalculationFrequency: 'monthly',
    minimumAuditFrequencyMonths: 24,
    arrearsEscalationThreshold: 75000,
    autoCaseCreationRules: [
      {
        ruleId: 'RULE-001',
        triggerEvent: 'C3 Submitted After Grace Period',
        caseType: 'LATE_C3_SUBMISSION',
        enabled: true,
        description: 'Create case when C3 is submitted after the grace period expires'
      },
      {
        ruleId: 'RULE-002',
        triggerEvent: 'C3 Not Submitted By Cutoff',
        caseType: 'C3_NOT_SUBMITTED',
        enabled: true,
        description: 'Create case when C3 is not submitted by the final deadline'
      },
      {
        ruleId: 'RULE-003',
        triggerEvent: 'Payment Not Received',
        caseType: 'C3_SUBMITTED_NO_PAYMENT',
        enabled: true,
        description: 'Create case when C3 is submitted but payment is not received'
      },
      {
        ruleId: 'RULE-004',
        triggerEvent: 'Validation Errors Detected',
        caseType: 'C3_VALIDATION_ERROR',
        enabled: false,
        description: 'Create case when validation errors are detected in C3 submission'
      },
      {
        ruleId: 'RULE-005',
        triggerEvent: 'Arrears Exceed Threshold',
        caseType: 'ARREARS_CASE',
        enabled: true,
        description: 'Create case when total arrears exceed the configured threshold'
      },
      {
        ruleId: 'RULE-006',
        triggerEvent: 'Payment Arrangement Defaulted',
        caseType: 'PAYMENT_ARRANGEMENT_DEFAULT',
        enabled: true,
        description: 'Create case when payment arrangement installment is missed'
      }
    ],
    createdBy: 'admin.user',
    createdDate: '2023-12-15T10:00:00Z',
    activatedBy: 'admin.user',
    activatedDate: '2024-01-01T00:00:00Z',
    deactivatedBy: 'admin.user',
    deactivatedDate: '2024-03-01T00:00:00Z',
    notes: 'Initial policy configuration for 2024'
  },
  {
    policyId: 'POL-2024-002',
    policyVersion: 'v2.0',
    effectiveFrom: '2024-03-01',
    effectiveTo: null,
    isActive: true,
    c3GracePeriodDays: 5,
    c3SubmissionDeadlineDay: 15,
    paymentDueDateDay: 20,
    penaltyRatePercent: 2.5,
    interestRatePercent: 1.5,
    penaltyCalculationFrequency: 'monthly',
    minimumAuditFrequencyMonths: 18,
    arrearsEscalationThreshold: 50000,
    autoCaseCreationRules: [
      {
        ruleId: 'RULE-001',
        triggerEvent: 'C3 Submitted After Grace Period',
        caseType: 'LATE_C3_SUBMISSION',
        enabled: true,
        description: 'Create case when C3 is submitted after the grace period expires'
      },
      {
        ruleId: 'RULE-002',
        triggerEvent: 'C3 Not Submitted By Cutoff',
        caseType: 'C3_NOT_SUBMITTED',
        enabled: true,
        description: 'Create case when C3 is not submitted by the final deadline'
      },
      {
        ruleId: 'RULE-003',
        triggerEvent: 'Payment Not Received',
        caseType: 'C3_SUBMITTED_NO_PAYMENT',
        enabled: true,
        description: 'Create case when C3 is submitted but payment is not received'
      },
      {
        ruleId: 'RULE-004',
        triggerEvent: 'Validation Errors Detected',
        caseType: 'C3_VALIDATION_ERROR',
        enabled: true,
        description: 'Create case when validation errors are detected in C3 submission'
      },
      {
        ruleId: 'RULE-005',
        triggerEvent: 'Arrears Exceed Threshold',
        caseType: 'ARREARS_CASE',
        enabled: true,
        description: 'Create case when total arrears exceed the configured threshold'
      },
      {
        ruleId: 'RULE-006',
        triggerEvent: 'Payment Arrangement Defaulted',
        caseType: 'PAYMENT_ARRANGEMENT_DEFAULT',
        enabled: true,
        description: 'Create case when payment arrangement installment is missed'
      }
    ],
    createdBy: 'admin.user',
    createdDate: '2024-02-20T14:30:00Z',
    activatedBy: 'admin.user',
    activatedDate: '2024-03-01T00:00:00Z',
    notes: 'Reduced grace period and lowered escalation threshold for better compliance'
  }
];

export const complianceSettingsService = {
  async getSettingsHistory(): Promise<ComplianceSettingsHistory> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const activePolicy = MOCK_POLICIES.find(p => p.isActive) || null;
    
    return {
      policies: [...MOCK_POLICIES].sort((a, b) => 
        new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      ),
      activePolicy
    };
  },

  async getActivePolicy(): Promise<ComplianceSettingsPolicy | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_POLICIES.find(p => p.isActive) || null;
  },

  async updateActivePolicy(updates: Partial<ComplianceSettingsPolicy>): Promise<ComplianceSettingsPolicy> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const activePolicy = MOCK_POLICIES.find(p => p.isActive);
    if (!activePolicy) {
      throw new Error('No active policy found');
    }
    
    // In a real implementation, this would update the database
    Object.assign(activePolicy, updates);
    
    return activePolicy;
  },

  async activateNewPolicy(policy: Omit<ComplianceSettingsPolicy, 'policyId' | 'createdDate' | 'isActive'>): Promise<ComplianceSettingsPolicy> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Deactivate current policy
    const currentActive = MOCK_POLICIES.find(p => p.isActive);
    if (currentActive) {
      currentActive.isActive = false;
      currentActive.effectiveTo = policy.effectiveFrom;
      currentActive.deactivatedBy = policy.createdBy;
      currentActive.deactivatedDate = new Date().toISOString();
    }
    
    // Create new policy
    const newPolicy: ComplianceSettingsPolicy = {
      ...policy,
      policyId: `POL-${Date.now()}`,
      createdDate: new Date().toISOString(),
      isActive: true,
      effectiveTo: null
    };
    
    MOCK_POLICIES.push(newPolicy);
    
    return newPolicy;
  }
};
