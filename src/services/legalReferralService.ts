import { 
  ContributionComponent, 
  ComponentSubcase, 
  ComponentAggregation,
  LegalReferralComponentSummary,
  COMPONENT_GROUPS 
} from '@/types/contributionComponents';
import { LegalReferralDraft, LegalReferralSubmission } from '@/types/legalReferralTypes';

// Mock data for subcases
const mockSubcases: ComponentSubcase[] = [
  {
    id: 'SUB-001',
    caseId: 'CASE-2024-0008',
    component: ContributionComponent.SSC,
    periodFrom: '2023-01',
    periodTo: '2023-03',
    principal: 12500,
    penalty: 0,
    interest: 125,
    totalAmount: 12625,
    isEstimated: false,
    daysOverdue: 180,
    status: 'LEGAL_RECOMMENDED',
    createdDate: '2023-04-15',
    updatedDate: '2024-01-10'
  },
  {
    id: 'SUB-002',
    caseId: 'CASE-2024-0008',
    component: ContributionComponent.SSF,
    periodFrom: '2023-01',
    periodTo: '2023-03',
    principal: 0,
    penalty: 3750,
    interest: 0,
    totalAmount: 3750,
    isEstimated: false,
    daysOverdue: 180,
    status: 'LEGAL_RECOMMENDED',
    createdDate: '2023-04-15',
    updatedDate: '2024-01-10'
  },
  {
    id: 'SUB-003',
    caseId: 'CASE-2024-0008',
    component: ContributionComponent.LVC,
    periodFrom: '2023-01',
    periodTo: '2023-06',
    principal: 8400,
    penalty: 0,
    interest: 168,
    totalAmount: 8568,
    isEstimated: false,
    daysOverdue: 150,
    status: 'LEGAL_RECOMMENDED',
    createdDate: '2023-07-20',
    updatedDate: '2024-01-10'
  },
  {
    id: 'SUB-004',
    caseId: 'CASE-2024-0008',
    component: ContributionComponent.LVF,
    periodFrom: '2023-01',
    periodTo: '2023-06',
    principal: 0,
    penalty: 2100,
    interest: 0,
    totalAmount: 2100,
    isEstimated: false,
    daysOverdue: 150,
    status: 'LEGAL_RECOMMENDED',
    createdDate: '2023-07-20',
    updatedDate: '2024-01-10'
  },
  {
    id: 'SUB-005',
    caseId: 'CASE-2024-0008',
    component: ContributionComponent.PEC,
    periodFrom: '2023-04',
    periodTo: '2023-09',
    principal: 15000,
    penalty: 0,
    interest: 225,
    totalAmount: 15225,
    isEstimated: false,
    daysOverdue: 120,
    status: 'LEGAL_RECOMMENDED',
    createdDate: '2023-10-15',
    updatedDate: '2024-01-10'
  },
  {
    id: 'SUB-006',
    caseId: 'CASE-2024-0008',
    component: ContributionComponent.PEF,
    periodFrom: '2023-04',
    periodTo: '2023-09',
    principal: 0,
    penalty: 4500,
    interest: 0,
    totalAmount: 4500,
    isEstimated: false,
    daysOverdue: 120,
    status: 'LEGAL_RECOMMENDED',
    createdDate: '2023-10-15',
    updatedDate: '2024-01-10'
  },
];

class LegalReferralService {
  async getSubcasesForEmployer(employerId: string): Promise<ComponentSubcase[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSubcases.filter(s => s.status === 'LEGAL_RECOMMENDED');
  }

  aggregateComponents(subcases: ComponentSubcase[]): LegalReferralComponentSummary {
    const aggregations: Record<string, ComponentAggregation> = {};

    // Initialize aggregations for each component
    Object.values(ContributionComponent).forEach(component => {
      aggregations[component] = {
        component,
        totalPrincipal: 0,
        totalPenalty: 0,
        totalInterest: 0,
        grandTotal: 0,
        periodCount: 0,
        subcaseIds: []
      };
    });

    // Aggregate subcases by component
    subcases.forEach(subcase => {
      const agg = aggregations[subcase.component];
      agg.totalPrincipal += subcase.principal;
      agg.totalPenalty += subcase.penalty;
      agg.totalInterest += subcase.interest;
      agg.grandTotal += subcase.totalAmount;
      agg.periodCount++;
      agg.subcaseIds.push(subcase.id);
    });

    // Group by component families
    const socialSecurity: ComponentAggregation = {
      component: ContributionComponent.SSC,
      totalPrincipal: aggregations[ContributionComponent.SSC].totalPrincipal,
      totalPenalty: aggregations[ContributionComponent.SSC].totalPenalty + aggregations[ContributionComponent.SSF].totalPenalty,
      totalInterest: aggregations[ContributionComponent.SSC].totalInterest + aggregations[ContributionComponent.SSF].totalInterest,
      grandTotal: aggregations[ContributionComponent.SSC].grandTotal + aggregations[ContributionComponent.SSF].grandTotal,
      periodCount: aggregations[ContributionComponent.SSC].periodCount,
      subcaseIds: [...aggregations[ContributionComponent.SSC].subcaseIds, ...aggregations[ContributionComponent.SSF].subcaseIds]
    };

    const levy: ComponentAggregation = {
      component: ContributionComponent.LVC,
      totalPrincipal: aggregations[ContributionComponent.LVC].totalPrincipal,
      totalPenalty: aggregations[ContributionComponent.LVC].totalPenalty + aggregations[ContributionComponent.LVF].totalPenalty,
      totalInterest: aggregations[ContributionComponent.LVC].totalInterest + aggregations[ContributionComponent.LVF].totalInterest,
      grandTotal: aggregations[ContributionComponent.LVC].grandTotal + aggregations[ContributionComponent.LVF].grandTotal,
      periodCount: aggregations[ContributionComponent.LVC].periodCount,
      subcaseIds: [...aggregations[ContributionComponent.LVC].subcaseIds, ...aggregations[ContributionComponent.LVF].subcaseIds]
    };

    const severance: ComponentAggregation = {
      component: ContributionComponent.PEC,
      totalPrincipal: aggregations[ContributionComponent.PEC].totalPrincipal,
      totalPenalty: aggregations[ContributionComponent.PEC].totalPenalty + aggregations[ContributionComponent.PEF].totalPenalty,
      totalInterest: aggregations[ContributionComponent.PEC].totalInterest + aggregations[ContributionComponent.PEF].totalInterest,
      grandTotal: aggregations[ContributionComponent.PEC].grandTotal + aggregations[ContributionComponent.PEF].grandTotal,
      periodCount: aggregations[ContributionComponent.PEC].periodCount,
      subcaseIds: [...aggregations[ContributionComponent.PEC].subcaseIds, ...aggregations[ContributionComponent.PEF].subcaseIds]
    };

    return {
      socialSecurity,
      levy,
      severance,
      overallTotal: socialSecurity.grandTotal + levy.grandTotal + severance.grandTotal,
      overallPrincipal: socialSecurity.totalPrincipal + levy.totalPrincipal + severance.totalPrincipal,
      overallPenalty: socialSecurity.totalPenalty + levy.totalPenalty + severance.totalPenalty,
      overallInterest: socialSecurity.totalInterest + levy.totalInterest + severance.totalInterest,
    };
  }

  async submitReferral(draft: LegalReferralDraft): Promise<LegalReferralSubmission> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const allPeriods = draft.selectedSubcases.map(s => [s.periodFrom, s.periodTo]).flat();
    const minPeriod = allPeriods.sort()[0];
    const maxPeriod = allPeriods.sort()[allPeriods.length - 1];

    return {
      referralId: draft.id,
      referralNumber: `LR-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      employerId: draft.employerId,
      employerName: draft.employerName,
      componentSummary: draft.componentSummary,
      selectedSubcaseIds: draft.selectedSubcases.map(s => s.id),
      periodFrom: minPeriod,
      periodTo: maxPeriod,
      periodsCount: draft.selectedSubcases.length,
      complianceHistory: draft.complianceNarrative,
      noticesSent: draft.noticesSent,
      lastNoticeDate: draft.lastNoticeDate,
      paymentPlanHistory: draft.paymentPlanHistory,
      auditFindings: draft.auditFindings,
      contactAttempts: draft.contactAttempts,
      attachments: draft.attachments,
      submittedDate: new Date().toISOString(),
      submittedBy: 'USER-001',
      submittedByName: 'Compliance Officer'
    };
  }
}

export const legalReferralService = new LegalReferralService();
