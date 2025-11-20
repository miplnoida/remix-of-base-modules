// ============================================
// CONTRIBUTION COMPONENTS - St. Kitts & Nevis Social Security System
// ============================================

export enum ContributionComponent {
  SSC = 'SSC', // Social Security Contributions
  SSF = 'SSF', // Social Security Penalties
  LVC = 'LVC', // Housing & Social Development Levy Contributions
  LVF = 'LVF', // Levy Penalties
  PEC = 'PEC', // Severance Contributions
  PEF = 'PEF', // Severance Penalties
}

export const COMPONENT_LABELS: Record<ContributionComponent, string> = {
  [ContributionComponent.SSC]: 'Social Security Contributions',
  [ContributionComponent.SSF]: 'Social Security Penalties',
  [ContributionComponent.LVC]: 'Housing & Social Development Levy Contributions',
  [ContributionComponent.LVF]: 'Levy Penalties',
  [ContributionComponent.PEC]: 'Severance Contributions',
  [ContributionComponent.PEF]: 'Severance Penalties',
};

export const COMPONENT_GROUPS = {
  SOCIAL_SECURITY: [ContributionComponent.SSC, ContributionComponent.SSF],
  LEVY: [ContributionComponent.LVC, ContributionComponent.LVF],
  SEVERANCE: [ContributionComponent.PEC, ContributionComponent.PEF],
};

export interface ComponentBreakdown {
  component: ContributionComponent;
  principal: number;
  penalty: number;
  interest: number;
  total: number;
}

export interface ComponentSubcase {
  id: string;
  caseId: string;
  component: ContributionComponent;
  periodFrom: string; // YYYY-MM
  periodTo: string;   // YYYY-MM
  principal: number;
  penalty: number;
  interest: number;
  totalAmount: number;
  isEstimated: boolean;
  daysOverdue: number;
  status: 'OPEN' | 'LEGAL_RECOMMENDED' | 'LEGAL_REFERRED' | 'RESOLVED';
  createdDate: string;
  updatedDate: string;
}

export interface ComponentAggregation {
  component: ContributionComponent;
  totalPrincipal: number;
  totalPenalty: number;
  totalInterest: number;
  grandTotal: number;
  periodCount: number;
  subcaseIds: string[];
}

export interface LegalReferralComponentSummary {
  socialSecurity: ComponentAggregation;
  levy: ComponentAggregation;
  severance: ComponentAggregation;
  overallTotal: number;
  overallPrincipal: number;
  overallPenalty: number;
  overallInterest: number;
}
