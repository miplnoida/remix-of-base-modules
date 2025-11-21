export interface BenefitApplication {
  id: string;
  applicationNumber: string;
  benefitType: string;
  insuredPersonSSN: string;
  insuredPersonName: string;
  applicationDate: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Payment Pending' | 'Completed';
  claimAmount?: number;
  approvedAmount?: number;
  reviewedBy?: string;
  reviewDate?: string;
  notes?: string;
}

export const BENEFIT_APPLICATIONS: BenefitApplication[] = [
  {
    id: 'BA001',
    applicationNumber: 'SB-2024-001',
    benefitType: 'Sickness Benefit',
    insuredPersonSSN: '123-45-6789',
    insuredPersonName: 'John Williams',
    applicationDate: '2024-01-15',
    status: 'Completed',
    claimAmount: 1200.00,
    approvedAmount: 1200.00,
    reviewedBy: 'Sarah Johnson',
    reviewDate: '2024-01-18',
    notes: 'Medical certificate verified. 4 weeks sickness benefit approved.'
  },
  {
    id: 'BA002',
    applicationNumber: 'MAT-2024-001',
    benefitType: 'Maternity Benefit',
    insuredPersonSSN: '234-56-7890',
    insuredPersonName: 'Mary Johnson',
    applicationDate: '2024-02-10',
    status: 'Payment Pending',
    claimAmount: 2400.00,
    approvedAmount: 2400.00,
    reviewedBy: 'David Brown',
    reviewDate: '2024-02-15',
    notes: '13 weeks maternity allowance approved. Payment processing.'
  },
  {
    id: 'BA003',
    applicationNumber: 'EIB-2024-001',
    benefitType: 'Employment Injury Benefit',
    insuredPersonSSN: '345-67-8901',
    insuredPersonName: 'Robert Brown',
    applicationDate: '2024-03-05',
    status: 'Under Review',
    claimAmount: 3500.00,
    notes: 'Workplace injury claim. Awaiting employer verification.'
  },
  {
    id: 'BA004',
    applicationNumber: 'FG-2024-001',
    benefitType: 'Funeral Grant',
    insuredPersonSSN: '901-23-4567',
    insuredPersonName: 'James Taylor',
    applicationDate: '2024-03-20',
    status: 'Approved',
    claimAmount: 5000.00,
    approvedAmount: 5000.00,
    reviewedBy: 'Patricia White',
    reviewDate: '2024-03-22',
    notes: 'Death certificate and funeral expenses verified.'
  },
  {
    id: 'BA005',
    applicationNumber: 'AGE-2024-001',
    benefitType: 'Age Benefit',
    insuredPersonSSN: '789-01-2345',
    insuredPersonName: 'David Wilson',
    applicationDate: '2024-01-05',
    status: 'Completed',
    claimAmount: 0,
    approvedAmount: 850.00,
    reviewedBy: 'Michael Thompson',
    reviewDate: '2024-01-10',
    notes: 'Pension approved at XCD 850/month. 500+ weeks contributions verified.'
  },
  {
    id: 'BA006',
    applicationNumber: 'SB-2024-002',
    benefitType: 'Sickness Benefit',
    insuredPersonSSN: '456-78-9012',
    insuredPersonName: 'Sarah Davis',
    applicationDate: '2024-03-25',
    status: 'Submitted',
    claimAmount: 900.00,
    notes: 'Recently submitted. Pending initial review.'
  },
  {
    id: 'BA007',
    applicationNumber: 'INV-2024-001',
    benefitType: 'Invalidity Benefit',
    insuredPersonSSN: '567-89-0123',
    insuredPersonName: 'Michael Thompson',
    applicationDate: '2024-02-28',
    status: 'Under Review',
    claimAmount: 0,
    notes: 'Medical board review scheduled. Contribution history verified.'
  },
  {
    id: 'BA008',
    applicationNumber: 'MAT-2024-002',
    benefitType: 'Maternity Benefit',
    insuredPersonSSN: '678-90-1234',
    insuredPersonName: 'Jennifer Martinez',
    applicationDate: '2024-03-15',
    status: 'Approved',
    claimAmount: 2600.00,
    approvedAmount: 2600.00,
    reviewedBy: 'Sarah Johnson',
    reviewDate: '2024-03-18',
    notes: '13 weeks maternity allowance approved.'
  },
  {
    id: 'BA009',
    applicationNumber: 'SUR-2024-001',
    benefitType: 'Survivors Benefit',
    insuredPersonSSN: '890-12-3456',
    insuredPersonName: 'Lisa Anderson',
    applicationDate: '2024-03-10',
    status: 'Under Review',
    claimAmount: 0,
    notes: 'Widow benefit claim. Verifying deceased contributor contributions.'
  },
  {
    id: 'BA010',
    applicationNumber: 'AP-2024-001',
    benefitType: 'Assistance Pension',
    insuredPersonSSN: '012-34-5678',
    insuredPersonName: 'Patricia White',
    applicationDate: '2024-03-01',
    status: 'Rejected',
    claimAmount: 0,
    reviewedBy: 'David Brown',
    reviewDate: '2024-03-05',
    notes: 'Does not meet age requirement for assistance pension.'
  }
];
