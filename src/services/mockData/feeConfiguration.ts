import { FeeConfiguration } from '@/types/serviceRequest';

export const FEE_CONFIGURATIONS: FeeConfiguration[] = [
  {
    id: 'FEE001',
    serviceTypeId: 'SVC001',
    amount: 20.00,
    accountingHeadCode: 'FEE_CARD_REPLACEMENT',
    accountingHeadName: 'Card Replacement Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE002',
    serviceTypeId: 'SVC002',
    amount: 150.00,
    accountingHeadCode: 'FEE_CARD_REPLACEMENT_3RD',
    accountingHeadName: 'Third+ Card Replacement Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE003',
    serviceTypeId: 'SVC003',
    amount: 25.00,
    accountingHeadCode: 'FEE_NAME_CHANGE',
    accountingHeadName: 'Name/Address Change Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE004',
    serviceTypeId: 'SVC004',
    amount: 40.00,
    accountingHeadCode: 'FEE_CONTRIBUTION_CERT',
    accountingHeadName: 'Contribution History Certificate Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE005',
    serviceTypeId: 'SVC005',
    amount: 15.00,
    accountingHeadCode: 'FEE_CONTRIBUTION_STMT',
    accountingHeadName: 'Contribution Statement Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE006',
    serviceTypeId: 'SVC006',
    amount: 10.00,
    accountingHeadCode: 'FEE_BENEFIT_REPRINT',
    accountingHeadName: 'Benefit Letter Reprint Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE007',
    serviceTypeId: 'SVC007',
    amount: 20.00,
    accountingHeadCode: 'FEE_BENEFIT_HISTORY',
    accountingHeadName: 'Benefit Payment History Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE008',
    serviceTypeId: 'SVC008',
    amount: 30.00,
    accountingHeadCode: 'FEE_LATE_APPEAL',
    accountingHeadName: 'Late Submission Appeal Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE009',
    serviceTypeId: 'SVC009',
    amount: 35.00,
    accountingHeadCode: 'FEE_COVERAGE_CERT',
    accountingHeadName: 'Certificate of Coverage Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE010',
    serviceTypeId: 'SVC010',
    amount: 50.00,
    accountingHeadCode: 'FEE_VOLUNTARY_REG',
    accountingHeadName: 'Voluntary Insured Registration Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  },
  {
    id: 'FEE011',
    serviceTypeId: 'SVC011',
    amount: 75.00,
    accountingHeadCode: 'FEE_EXPRESS',
    accountingHeadName: 'Express Handling Fee Revenue',
    effectiveFrom: '2024-01-01',
    active: true
  }
];
