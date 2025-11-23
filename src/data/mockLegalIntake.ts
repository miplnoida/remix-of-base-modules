export interface LegalActionRequisition {
  id: string;
  intakeId: string;
  caseNumber?: string;
  submissionDate: string;
  employer: {
    name: string;
    registrationNumber: string;
    address: string;
    contactNumber: string;
  };
  reason: string;
  period: string;
  amount: number;
  status: 'Pending Review' | 'Info Requested' | 'Accepted' | 'Rejected';
  submittedBy: string;
  financialDetails: {
    ssc: number;
    ssf: number;
    penalties: number;
    employees: number;
    totalOutstanding: number;
  };
  liabilityStatement: {
    totalContributionsDue: number;
    totalReceivable: number;
    contributionOutstanding: number;
    contributionBreakdown: {
      type: string;
      amountDue: number;
      amountPaid: number;
      outstanding: number;
      penalties: number;
      totalDue: number;
    }[];
    periodBreakdown: {
      period: string;
      sscAmount: number;
      ssfAmount: number;
      penalties: number;
      periodTotal: number;
    }[];
  };
  legalActionDetails: {
    periodsOfArrears: string;
    numberOfAffectedEmployees: number;
    reasonForLegalAction: string;
    particulars: string;
  };
  documents: {
    id: string;
    name: string;
    size: string;
    uploadedAt: string;
  }[];
}

export const mockLegalRequisitions: LegalActionRequisition[] = [
  {
    id: 'INT-2024-001',
    intakeId: 'INT-2024-001',
    caseNumber: undefined,
    submissionDate: '2024-01-14',
    employer: {
      name: 'Caribbean Construction Ltd',
      registrationNumber: 'EMP-2023-456',
      address: '23 Industrial Park, Basseterre',
      contactNumber: '+1-869-465-1234'
    },
    reason: 'Non-payment of Social Security Contributions',
    period: 'Q2 2023 - Q4 2023',
    amount: 45230,
    status: 'Pending Review',
    submittedBy: 'Inspector John Davis',
    financialDetails: {
      ssc: 32450,
      ssf: 8920,
      penalties: 3860,
      employees: 15,
      totalOutstanding: 45230
    },
    liabilityStatement: {
      totalContributionsDue: 45230,
      totalReceivable: 35480,
      contributionOutstanding: 9750,
      contributionBreakdown: [
        {
          type: 'Social Security (SS)',
          amountDue: 32450,
          amountPaid: 25600,
          outstanding: 6850,
          penalties: 2800,
          totalDue: 35250
        },
        {
          type: 'NRSD Levy (LV)',
          amountDue: 8920,
          amountPaid: 7320,
          outstanding: 1600,
          penalties: 780,
          totalDue: 9700
        },
        {
          type: 'Severance (PE)',
          amountDue: 3860,
          amountPaid: 2450,
          outstanding: 1410,
          penalties: 170,
          totalDue: 4030
        }
      ],
      periodBreakdown: [
        { period: 'Q2 2023', sscAmount: 10300, ssfAmount: 2980, penalties: 1200, periodTotal: 14480 },
        { period: 'Q3 2023', sscAmount: 12100, ssfAmount: 3270, penalties: 1280, periodTotal: 16650 },
        { period: 'Q4 2023', sscAmount: 10050, ssfAmount: 2670, penalties: 1230, periodTotal: 13950 }
      ]
    },
    legalActionDetails: {
      periodsOfArrears: 'Q2 2023 - Q4 2023',
      numberOfAffectedEmployees: 15,
      reasonForLegalAction: 'Non-payment of Social Security Contributions',
      particulars: 'Employer failed to remit SSC for 15 employees over 3 quarters. Total outstanding: $45,230.00 including penalties.'
    },
    documents: [
      { id: '1', name: 'Legal Action Requisition Form.pdf', size: '324 KB', uploadedAt: '2024-01-14' },
      { id: '2', name: 'Employer Records Q2-Q4 2023.xlsx', size: '128 KB', uploadedAt: '2024-01-14' }
    ]
  },
  {
    id: 'INT-2024-002',
    intakeId: 'INT-2024-002',
    caseNumber: undefined,
    submissionDate: '2024-01-17',
    employer: {
      name: 'Island Resort & Spa',
      registrationNumber: 'EMP-2022-789',
      address: 'Frigate Bay, St. Kitts',
      contactNumber: '+1-869-465-5678'
    },
    reason: 'Late Filing and Partial Payment',
    period: 'Q3 2023 - Q4 2023',
    amount: 26100,
    status: 'Pending Review',
    submittedBy: 'Inspector Mary Thompson',
    financialDetails: {
      ssc: 18500,
      ssf: 5200,
      penalties: 2400,
      employees: 22,
      totalOutstanding: 26100
    },
    liabilityStatement: {
      totalContributionsDue: 26100,
      totalReceivable: 22300,
      contributionOutstanding: 3800,
      contributionBreakdown: [
        {
          type: 'Social Security (SS)',
          amountDue: 18500,
          amountPaid: 15200,
          outstanding: 3300,
          penalties: 1600,
          totalDue: 20100
        },
        {
          type: 'NRSD Levy (LV)',
          amountDue: 5200,
          amountPaid: 4800,
          outstanding: 400,
          penalties: 600,
          totalDue: 5800
        },
        {
          type: 'Severance (PE)',
          amountDue: 2400,
          amountPaid: 2300,
          outstanding: 100,
          penalties: 200,
          totalDue: 2600
        }
      ],
      periodBreakdown: [
        { period: 'Q3 2023', sscAmount: 9100, ssfAmount: 2600, penalties: 1100, periodTotal: 12800 },
        { period: 'Q4 2023', sscAmount: 9400, ssfAmount: 2600, penalties: 1300, periodTotal: 13300 }
      ]
    },
    legalActionDetails: {
      periodsOfArrears: 'Q3 2023 - Q4 2023',
      numberOfAffectedEmployees: 22,
      reasonForLegalAction: 'Late Filing and Partial Payment',
      particulars: 'Employer consistently filed late and made partial payments for 22 employees over 2 quarters.'
    },
    documents: [
      { id: '1', name: 'Legal Action Requisition Form.pdf', size: '298 KB', uploadedAt: '2024-01-17' }
    ]
  },
  {
    id: 'INT-2024-003',
    intakeId: 'INT-2024-003',
    caseNumber: undefined,
    submissionDate: '2024-01-19',
    employer: {
      name: 'Tech Solutions Inc',
      registrationNumber: 'EMP-2023-123',
      address: 'Victoria Road, Basseterre',
      contactNumber: '+1-869-465-9012'
    },
    reason: 'Non-registration of New Employees',
    period: 'Q1 2023 - Q4 2023',
    amount: 17330,
    status: 'Info Requested',
    submittedBy: 'Senior Inspector Robert Williams',
    financialDetails: {
      ssc: 12100,
      ssf: 3580,
      penalties: 1650,
      employees: 8,
      totalOutstanding: 17330
    },
    liabilityStatement: {
      totalContributionsDue: 17330,
      totalReceivable: 15680,
      contributionOutstanding: 1650,
      contributionBreakdown: [
        {
          type: 'Social Security (SS)',
          amountDue: 12100,
          amountPaid: 11200,
          outstanding: 900,
          penalties: 800,
          totalDue: 12900
        },
        {
          type: 'NRSD Levy (LV)',
          amountDue: 3580,
          amountPaid: 3180,
          outstanding: 400,
          penalties: 500,
          totalDue: 4080
        },
        {
          type: 'Severance (PE)',
          amountDue: 1650,
          amountPaid: 1300,
          outstanding: 350,
          penalties: 350,
          totalDue: 2000
        }
      ],
      periodBreakdown: [
        { period: 'Q1 2023', sscAmount: 2900, ssfAmount: 820, penalties: 350, periodTotal: 4070 },
        { period: 'Q2 2023', sscAmount: 3150, ssfAmount: 910, penalties: 420, periodTotal: 4480 },
        { period: 'Q3 2023', sscAmount: 3020, ssfAmount: 920, penalties: 440, periodTotal: 4380 },
        { period: 'Q4 2023', sscAmount: 3030, ssfAmount: 930, penalties: 440, periodTotal: 4400 }
      ]
    },
    legalActionDetails: {
      periodsOfArrears: 'Q1 2023 - Q4 2023',
      numberOfAffectedEmployees: 8,
      reasonForLegalAction: 'Non-registration of New Employees',
      particulars: 'Employer failed to register 8 new employees and remit contributions for entire year 2023.'
    },
    documents: []
  },
  {
    id: 'INT-2024-004',
    intakeId: 'INT-2024-004',
    caseNumber: 'LEG-2024-145',
    submissionDate: '2024-01-21',
    employer: {
      name: 'Belmont Construction Ltd',
      registrationNumber: '660217',
      address: 'Industrial Estate, Basseterre',
      contactNumber: '+1-869-465-3456'
    },
    reason: 'Significant Arrears - Multiple Periods',
    period: '2020 - October 2025',
    amount: 10778330.6,
    status: 'Accepted',
    submittedBy: 'Compliance Officer Jane Mitchell',
    financialDetails: {
      ssc: 7544831,
      ssf: 2089123,
      penalties: 1144376.6,
      employees: 143,
      totalOutstanding: 10778330.6
    },
    liabilityStatement: {
      totalContributionsDue: 10778330.6,
      totalReceivable: 9633954,
      contributionOutstanding: 1144376.6,
      contributionBreakdown: [
        {
          type: 'Social Security (SS)',
          amountDue: 7544831,
          amountPaid: 6753210,
          outstanding: 791621,
          penalties: 589432,
          totalDue: 8134263
        },
        {
          type: 'NRSD Levy (LV)',
          amountDue: 2089123,
          amountPaid: 1867543,
          outstanding: 221580,
          penalties: 398765,
          totalDue: 2487888
        },
        {
          type: 'Severance (PE)',
          amountDue: 1144376.6,
          amountPaid: 1013201,
          outstanding: 131175.6,
          penalties: 156179.6,
          totalDue: 1300556.2
        }
      ],
      periodBreakdown: Array.from({ length: 20 }, (_, i) => {
        const quarter = (i % 4) + 1;
        const year = 2020 + Math.floor(i / 4);
        return {
          period: `Q${quarter} ${year}`,
          sscAmount: 377241 + Math.random() * 100000,
          ssfAmount: 104456 + Math.random() * 30000,
          penalties: 57219 + Math.random() * 20000,
          periodTotal: 538916 + Math.random() * 150000
        };
      })
    },
    legalActionDetails: {
      periodsOfArrears: '2020 - October 2025',
      numberOfAffectedEmployees: 143,
      reasonForLegalAction: 'Significant Arrears - Multiple Periods',
      particulars: 'Large-scale non-compliance spanning 5+ years with 143 affected employees. Total arrears exceed $10M including significant penalties.'
    },
    documents: [
      { id: '1', name: 'Legal Action Requisition Form.pdf', size: '456 KB', uploadedAt: '2024-01-21' },
      { id: '2', name: 'Comprehensive Employer Records 2020-2025.xlsx', size: '2.4 MB', uploadedAt: '2024-01-21' },
      { id: '3', name: 'Audit Report.pdf', size: '876 KB', uploadedAt: '2024-01-21' }
    ]
  }
];
