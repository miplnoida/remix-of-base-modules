import { BenefitPayRun, BenefitPayRunDetail, PayRunStatus, GLSummary } from '@/types/longTermBenefits';
import { getBeneficiaries } from './longTermBeneficiaryService';

const STORAGE_KEY_RUNS = 'benefit_pay_runs';
const STORAGE_KEY_DETAILS = 'benefit_pay_run_details';

const mockPayRuns: BenefitPayRun[] = [
  {
    id: 'PR-001',
    payRunName: 'Age & Invalidity Pensions – November 2025',
    benefitTypesIncluded: ['AGE', 'INVALIDITY'],
    periodYear: 2025,
    periodMonth: 11,
    payDate: '2025-11-30',
    status: 'POSTED',
    totalBeneficiariesCount: 2,
    totalGrossAmount: 2150.00,
    totalDeductionsAmount: 0,
    totalNetAmount: 2150.00,
    glSummary: {
      byBenefitType: [
        { benefitType: 'AGE', glExpenseAccount: '5-100-AGE', amount: 1200.00 },
        { benefitType: 'INVALIDITY', glExpenseAccount: '5-100-INV', amount: 950.00 }
      ],
      apControl: { apControlAccount: '2-200-AP-BENEFITS', totalCredits: 2150.00 }
    },
    createdBy: 'Officer John',
    createdAt: '2025-11-15T10:00:00Z',
    approvedBy: 'Manager Jane',
    approvedAt: '2025-11-16T14:30:00Z',
    postedBy: 'Finance Admin',
    postedAt: '2025-11-17T09:00:00Z'
  }
];

const mockPayRunDetails: BenefitPayRunDetail[] = [
  {
    id: 'PRD-001',
    payRunId: 'PR-001',
    beneficiaryId: 'LTB-001',
    insuredPersonId: 'IP-001',
    insuredPersonName: 'John Williams',
    insuredPersonSSN: '123-45-6789',
    benefitType: 'AGE',
    grossAmount: 1200.00,
    netAmount: 1200.00,
    paymentMethod: 'EFT',
    apEntryId: 'AP-001',
    included: true,
    lifeCertificateStatus: 'RECEIVED_VALID',
    beneficiaryStatus: 'ACTIVE',
    payOffice: 'ST_KITTS'
  },
  {
    id: 'PRD-002',
    payRunId: 'PR-001',
    beneficiaryId: 'LTB-003',
    insuredPersonId: 'IP-003',
    insuredPersonName: 'Robert Davis',
    insuredPersonSSN: '345-67-8901',
    benefitType: 'INVALIDITY',
    grossAmount: 950.00,
    netAmount: 950.00,
    paymentMethod: 'EFT',
    apEntryId: 'AP-002',
    included: true,
    lifeCertificateStatus: 'RECEIVED_VALID',
    beneficiaryStatus: 'ACTIVE',
    payOffice: 'ST_KITTS'
  }
];

export const getPayRuns = (): BenefitPayRun[] => {
  const stored = localStorage.getItem(STORAGE_KEY_RUNS);
  return stored ? JSON.parse(stored) : mockPayRuns;
};

const savePayRuns = (runs: BenefitPayRun[]) => {
  localStorage.setItem(STORAGE_KEY_RUNS, JSON.stringify(runs));
};

export const getPayRunDetails = (): BenefitPayRunDetail[] => {
  const stored = localStorage.getItem(STORAGE_KEY_DETAILS);
  return stored ? JSON.parse(stored) : mockPayRunDetails;
};

const savePayRunDetails = (details: BenefitPayRunDetail[]) => {
  localStorage.setItem(STORAGE_KEY_DETAILS, JSON.stringify(details));
};

export const getPayRunById = (id: string): BenefitPayRun | undefined => {
  return getPayRuns().find(pr => pr.id === id);
};

export const getPayRunDetailsByRunId = (payRunId: string): BenefitPayRunDetail[] => {
  return getPayRunDetails().filter(d => d.payRunId === payRunId);
};

export const createPayRun = (
  year: number,
  month: number,
  payDate: string,
  benefitTypes: string[],
  filters: any
): { payRun: BenefitPayRun; details: BenefitPayRunDetail[] } => {
  const runs = getPayRuns();
  const allDetails = getPayRunDetails();
  
  const payRunId = `PR-${String(runs.length + 1).padStart(3, '0')}`;
  
  // Get eligible beneficiaries
  const beneficiaries = getBeneficiaries().filter(b => {
    if (!benefitTypes.includes(b.primaryBenefitType)) return false;
    if (b.status !== 'ACTIVE') return false;
    if (filters.excludeSuspended && b.status.startsWith('SUSPENDED')) return false;
    if (!filters.includeOverride && b.lifeCertificateStatus !== 'RECEIVED_VALID' && b.lifeCertificateStatus !== 'NOT_REQUIRED') return false;
    if (filters.payOffice && b.payOffice !== filters.payOffice) return false;
    if (filters.paymentMethod && b.paymentMethod !== filters.paymentMethod) return false;
    return true;
  });

  // Create details
  const newDetails: BenefitPayRunDetail[] = beneficiaries.map((b, index) => ({
    id: `PRD-${String(allDetails.length + index + 1).padStart(3, '0')}`,
    payRunId,
    beneficiaryId: b.id,
    insuredPersonId: b.insuredPersonId,
    insuredPersonName: b.insuredPersonName,
    insuredPersonSSN: b.insuredPersonSSN,
    benefitType: b.primaryBenefitType,
    grossAmount: b.monthlyBenefitAmount,
    netAmount: b.monthlyBenefitAmount,
    paymentMethod: b.paymentMethod,
    included: true,
    lifeCertificateStatus: b.lifeCertificateStatus,
    beneficiaryStatus: b.status,
    payOffice: b.payOffice
  }));

  const totalGross = newDetails.reduce((sum, d) => sum + (d.included ? d.grossAmount : 0), 0);
  const totalNet = newDetails.reduce((sum, d) => sum + (d.included ? d.netAmount : 0), 0);

  const newPayRun: BenefitPayRun = {
    id: payRunId,
    payRunName: `${benefitTypes.join(' & ')} – ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
    benefitTypesIncluded: benefitTypes,
    periodYear: year,
    periodMonth: month,
    payDate,
    status: 'CALCULATED',
    totalBeneficiariesCount: newDetails.filter(d => d.included).length,
    totalGrossAmount: totalGross,
    totalDeductionsAmount: 0,
    totalNetAmount: totalNet,
    createdBy: 'CURRENT_USER',
    createdAt: new Date().toISOString(),
    filters
  };

  runs.push(newPayRun);
  savePayRuns(runs);
  
  allDetails.push(...newDetails);
  savePayRunDetails(allDetails);

  return { payRun: newPayRun, details: newDetails };
};

export const updatePayRunStatus = (id: string, status: PayRunStatus, actor: string): BenefitPayRun | undefined => {
  const runs = getPayRuns();
  const index = runs.findIndex(r => r.id === id);
  if (index !== -1) {
    runs[index].status = status;
    if (status === 'APPROVED') {
      runs[index].approvedBy = actor;
      runs[index].approvedAt = new Date().toISOString();
    } else if (status === 'POSTED') {
      runs[index].postedBy = actor;
      runs[index].postedAt = new Date().toISOString();
    }
    savePayRuns(runs);
    return runs[index];
  }
  return undefined;
};

export const calculateGLSummary = (payRunId: string): GLSummary => {
  const details = getPayRunDetailsByRunId(payRunId).filter(d => d.included);
  
  const byType = details.reduce((acc, d) => {
    const existing = acc.find(item => item.benefitType === d.benefitType);
    if (existing) {
      existing.amount += d.netAmount;
    } else {
      acc.push({
        benefitType: d.benefitType,
        glExpenseAccount: `5-100-${d.benefitType}`,
        amount: d.netAmount
      });
    }
    return acc;
  }, [] as GLSummaryByType[]);

  const totalCredits = details.reduce((sum, d) => sum + d.netAmount, 0);

  return {
    byBenefitType: byType,
    apControl: {
      apControlAccount: '2-200-AP-BENEFITS',
      totalCredits
    }
  };
};

export const updatePayRunDetail = (id: string, updates: Partial<BenefitPayRunDetail>): BenefitPayRunDetail | undefined => {
  const details = getPayRunDetails();
  const index = details.findIndex(d => d.id === id);
  if (index !== -1) {
    details[index] = { ...details[index], ...updates };
    savePayRunDetails(details);
    return details[index];
  }
  return undefined;
};

interface GLSummaryByType {
  benefitType: string;
  glExpenseAccount: string;
  amount: number;
}
