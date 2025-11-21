export interface MedicalExpense {
  id: string;
  provider: string;
  serviceDate: string;
  description: string;
  amount: number;
  invoiceNumber: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Document {
  id: string;
  type: string;
  filename: string;
  uploadDate: string;
  verified: boolean;
}

export interface BenefitApplication {
  id: string;
  applicationNumber: string;
  benefitType: string;
  insuredPersonSSN: string;
  insuredPersonName: string;
  dateOfBirth?: string;
  applicationDate: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Payment Pending' | 'Completed';
  workflowStage?: string;
  claimAmount?: number;
  approvedAmount?: number;
  reviewedBy?: string;
  reviewDate?: string;
  notes?: string;
  
  // Additional details
  contactPhone?: string;
  contactEmail?: string;
  employerName?: string;
  employerId?: string;
  employerVerified?: boolean;
  recentContributions?: number;
  documents?: Document[];
  
  // Sickness Benefit specific
  lastDayWorked?: string;
  expectedReturnDate?: string;
  diagnosis?: string;
  doctorName?: string;
  medicalCertificateDate?: string;
  
  // Maternity specific
  expectedDeliveryDate?: string;
  confinementDate?: string;
  maternityType?: 'Allowance' | 'Grant';
  
  // Employment Injury specific
  injuryDate?: string;
  injuryLocation?: string;
  injuryDescription?: string;
  witnessNames?: string[];
  medicalExpenses?: MedicalExpense[];
  disabilityPercentage?: number;
  
  // Funeral Grant specific
  deceasedName?: string;
  deceasedSSN?: string;
  deathDate?: string;
  deathCertificateNumber?: string;
  relationship?: string;
  funeralExpenses?: number;
  
  // Age Benefit specific
  age?: number;
  contributionWeeks?: number;
  pensionStartDate?: string;
  pensionType?: 'Pension' | 'Grant';
  
  // Invalidity specific
  disabilityStartDate?: string;
  medicalBoardDate?: string;
  permanentDisability?: boolean;
  
  // Survivors specific
  dependents?: Array<{
    name: string;
    relationship: string;
    age: number;
    studentStatus?: boolean;
  }>;
  
  // Assistance specific
  incomeProofProvided?: boolean;
  residenceProofProvided?: boolean;
  unemploymentDeclared?: boolean;
}

export const BENEFIT_APPLICATIONS: BenefitApplication[] = [
  // Sickness Benefits
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
    notes: 'Medical certificate verified. 4 weeks sickness benefit approved.',
    contactPhone: '(869) 465-1234',
    contactEmail: 'john.williams@email.com',
    employerName: 'Island Construction Ltd',
    employerId: 'EMP-001',
    lastDayWorked: '2024-01-10',
    expectedReturnDate: '2024-02-07',
    diagnosis: 'Acute bronchitis with complications',
    doctorName: 'Dr. Patricia Clarke',
    medicalCertificateDate: '2024-01-12'
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
    notes: 'Recently submitted. Pending initial review.',
    contactPhone: '(869) 465-5678',
    contactEmail: 'sarah.davis@email.com',
    employerName: 'Royal Bank SKN',
    employerId: 'EMP-012',
    lastDayWorked: '2024-03-20',
    expectedReturnDate: '2024-04-10',
    diagnosis: 'Post-surgical recovery',
    doctorName: 'Dr. Marcus Thompson',
    medicalCertificateDate: '2024-03-22'
  },
  {
    id: 'BA015',
    applicationNumber: 'SB-2024-003',
    benefitType: 'Sickness Benefit',
    insuredPersonSSN: '789-01-2345',
    insuredPersonName: 'Michael Chen',
    applicationDate: '2024-03-28',
    status: 'Under Review',
    claimAmount: 1500.00,
    reviewedBy: 'David Brown',
    contactPhone: '(869) 465-9012',
    contactEmail: 'michael.chen@email.com',
    employerName: 'Caribbean Airways',
    employerId: 'EMP-023',
    lastDayWorked: '2024-03-22',
    expectedReturnDate: '2024-04-19',
    diagnosis: 'Severe back injury',
    doctorName: 'Dr. Angela Roberts',
    medicalCertificateDate: '2024-03-24',
    notes: 'Extended medical leave required. Specialist consultation pending.'
  },

  // Maternity Benefits
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
    notes: '13 weeks maternity allowance approved. Payment processing.',
    contactPhone: '(869) 465-2345',
    contactEmail: 'mary.johnson@email.com',
    employerName: 'Ministry of Health',
    employerId: 'EMP-005',
    expectedDeliveryDate: '2024-03-15',
    confinementDate: '2024-03-12',
    maternityType: 'Allowance',
    doctorName: 'Dr. Jennifer Williams',
    medicalCertificateDate: '2024-02-08'
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
    notes: '13 weeks maternity allowance approved.',
    contactPhone: '(869) 465-6789',
    contactEmail: 'jennifer.martinez@email.com',
    employerName: 'St. Kitts Tourism Authority',
    employerId: 'EMP-018',
    expectedDeliveryDate: '2024-04-20',
    maternityType: 'Allowance',
    doctorName: 'Dr. Michael Foster',
    medicalCertificateDate: '2024-03-10'
  },
  {
    id: 'BA016',
    applicationNumber: 'MAT-2024-003',
    benefitType: 'Maternity Benefit',
    insuredPersonSSN: '345-67-8912',
    insuredPersonName: 'Angela Thompson',
    applicationDate: '2024-03-29',
    status: 'Under Review',
    claimAmount: 500.00,
    contactPhone: '(869) 465-3456',
    contactEmail: 'angela.thompson@email.com',
    expectedDeliveryDate: '2024-05-10',
    maternityType: 'Grant',
    doctorName: 'Dr. Sarah Mitchell',
    medicalCertificateDate: '2024-03-25',
    notes: 'Grant application - insufficient contribution weeks for allowance.'
  },

  // Employment Injury Benefits
  {
    id: 'BA003',
    applicationNumber: 'EIB-2024-001',
    benefitType: 'Employment Injury Benefit',
    insuredPersonSSN: '345-67-8901',
    insuredPersonName: 'Robert Brown',
    applicationDate: '2024-03-05',
    status: 'Under Review',
    claimAmount: 3500.00,
    notes: 'Workplace injury claim. Awaiting employer verification.',
    contactPhone: '(869) 465-3456',
    contactEmail: 'robert.brown@email.com',
    employerName: 'Sugar Factory Operations',
    employerId: 'EMP-008',
    injuryDate: '2024-02-28',
    injuryLocation: 'Factory Floor - Production Line 2',
    injuryDescription: 'Crushed hand in machinery. Multiple fractures requiring surgery.',
    witnessNames: ['Thomas Richards', 'Patricia Wilson'],
    disabilityPercentage: 15,
    doctorName: 'Dr. Richard Harrison',
    medicalExpenses: [
      {
        id: 'EXP-001',
        provider: 'JNF General Hospital',
        serviceDate: '2024-02-28',
        description: 'Emergency treatment and surgery',
        amount: 2500.00,
        invoiceNumber: 'INV-2024-0245',
        status: 'Approved'
      },
      {
        id: 'EXP-002',
        provider: 'Caribbean Medical Supplies',
        serviceDate: '2024-03-01',
        description: 'Post-surgical medical supplies and cast',
        amount: 450.00,
        invoiceNumber: 'INV-2024-0892',
        status: 'Approved'
      },
      {
        id: 'EXP-003',
        provider: 'Island Physiotherapy Center',
        serviceDate: '2024-03-10',
        description: 'Physical therapy sessions (4 weeks)',
        amount: 550.00,
        invoiceNumber: 'INV-2024-1124',
        status: 'Pending'
      }
    ]
  },
  {
    id: 'BA017',
    applicationNumber: 'EIB-2024-002',
    benefitType: 'Employment Injury Benefit',
    insuredPersonSSN: '901-23-4567',
    insuredPersonName: 'Carlos Rodriguez',
    applicationDate: '2024-03-30',
    status: 'Submitted',
    claimAmount: 1800.00,
    contactPhone: '(869) 465-9012',
    contactEmail: 'carlos.rodriguez@email.com',
    employerName: 'Port Zante Shipping',
    employerId: 'EMP-027',
    injuryDate: '2024-03-25',
    injuryLocation: 'Loading Dock B',
    injuryDescription: 'Fell from loading platform, sprained ankle and back strain',
    witnessNames: ['David Johnson', 'Maria Santos'],
    doctorName: 'Dr. Patricia Clarke',
    medicalExpenses: [
      {
        id: 'EXP-004',
        provider: 'JNF General Hospital',
        serviceDate: '2024-03-25',
        description: 'X-rays and emergency treatment',
        amount: 650.00,
        invoiceNumber: 'INV-2024-1456',
        status: 'Pending'
      },
      {
        id: 'EXP-005',
        provider: 'Medical Centre Pharmacy',
        serviceDate: '2024-03-26',
        description: 'Pain medication and support brace',
        amount: 180.00,
        invoiceNumber: 'INV-2024-3892',
        status: 'Pending'
      }
    ]
  },

  // Funeral Grants
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
    notes: 'Death certificate and funeral expenses verified.',
    contactPhone: '(869) 465-0123',
    contactEmail: 'james.taylor@email.com',
    deceasedName: 'Margaret Taylor',
    deceasedSSN: '234-56-7891',
    deathDate: '2024-03-15',
    deathCertificateNumber: 'DC-2024-0089',
    relationship: 'Son',
    funeralExpenses: 6500.00
  },
  {
    id: 'BA018',
    applicationNumber: 'FG-2024-002',
    benefitType: 'Funeral Grant',
    insuredPersonSSN: '567-89-0123',
    insuredPersonName: 'Patricia Williams',
    applicationDate: '2024-03-30',
    status: 'Under Review',
    claimAmount: 5000.00,
    contactPhone: '(869) 465-5678',
    contactEmail: 'patricia.williams@email.com',
    deceasedName: 'George Williams',
    deceasedSSN: '123-45-6780',
    deathDate: '2024-03-22',
    deathCertificateNumber: 'DC-2024-0102',
    relationship: 'Daughter',
    funeralExpenses: 7200.00,
    notes: 'Awaiting verification of funeral invoices.'
  },

  // Age Benefits
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
    notes: 'Pension approved at XCD 850/month. 500+ weeks contributions verified.',
    contactPhone: '(869) 465-7890',
    contactEmail: 'david.wilson@email.com',
    age: 65,
    contributionWeeks: 520,
    pensionStartDate: '2024-02-01',
    pensionType: 'Pension'
  },
  {
    id: 'BA019',
    applicationNumber: 'AGE-2024-002',
    benefitType: 'Age Benefit',
    insuredPersonSSN: '234-56-7892',
    insuredPersonName: 'Margaret Foster',
    applicationDate: '2024-03-31',
    status: 'Under Review',
    claimAmount: 0,
    contactPhone: '(869) 465-2345',
    contactEmail: 'margaret.foster@email.com',
    age: 63,
    contributionWeeks: 420,
    pensionType: 'Pension',
    notes: 'Contribution history verification in progress.'
  },
  {
    id: 'BA020',
    applicationNumber: 'AGE-2024-003',
    benefitType: 'Age Benefit',
    insuredPersonSSN: '890-12-3456',
    insuredPersonName: 'Thomas Richards',
    applicationDate: '2024-03-28',
    status: 'Approved',
    claimAmount: 0,
    approvedAmount: 2500.00,
    reviewedBy: 'Sarah Johnson',
    reviewDate: '2024-03-30',
    contactPhone: '(869) 465-8901',
    contactEmail: 'thomas.richards@email.com',
    age: 62,
    contributionWeeks: 180,
    pensionType: 'Grant',
    notes: 'One-time grant approved - insufficient weeks for pension.'
  },

  // Invalidity Benefits
  {
    id: 'BA007',
    applicationNumber: 'INV-2024-001',
    benefitType: 'Invalidity Benefit',
    insuredPersonSSN: '567-89-0123',
    insuredPersonName: 'Michael Thompson',
    applicationDate: '2024-02-28',
    status: 'Under Review',
    claimAmount: 0,
    notes: 'Medical board review scheduled. Contribution history verified.',
    contactPhone: '(869) 465-5670',
    contactEmail: 'michael.thompson@email.com',
    disabilityStartDate: '2024-01-15',
    medicalBoardDate: '2024-03-15',
    permanentDisability: true,
    doctorName: 'Dr. Angela Roberts',
    age: 45,
    contributionWeeks: 380,
    diagnosis: 'Permanent spinal injury - unable to work'
  },
  {
    id: 'BA021',
    applicationNumber: 'INV-2024-002',
    benefitType: 'Invalidity Benefit',
    insuredPersonSSN: '456-78-9013',
    insuredPersonName: 'Linda Martinez',
    applicationDate: '2024-03-31',
    status: 'Submitted',
    claimAmount: 0,
    contactPhone: '(869) 465-4567',
    contactEmail: 'linda.martinez@email.com',
    disabilityStartDate: '2024-02-10',
    permanentDisability: true,
    doctorName: 'Dr. Richard Harrison',
    age: 52,
    contributionWeeks: 450,
    diagnosis: 'Progressive neurological condition',
    notes: 'Medical board assessment scheduled for April 15.'
  },

  // Survivors Benefits
  {
    id: 'BA009',
    applicationNumber: 'SUR-2024-001',
    benefitType: 'Survivors Benefit',
    insuredPersonSSN: '890-12-3456',
    insuredPersonName: 'Lisa Anderson',
    applicationDate: '2024-03-10',
    status: 'Under Review',
    claimAmount: 0,
    notes: 'Widow benefit claim. Verifying deceased contributor contributions.',
    contactPhone: '(869) 465-8902',
    contactEmail: 'lisa.anderson@email.com',
    deceasedName: 'Robert Anderson',
    deceasedSSN: '345-67-8903',
    deathDate: '2024-02-28',
    deathCertificateNumber: 'DC-2024-0067',
    relationship: 'Widow',
    dependents: [
      { name: 'Emma Anderson', relationship: 'Daughter', age: 16, studentStatus: true },
      { name: 'Noah Anderson', relationship: 'Son', age: 14, studentStatus: true }
    ]
  },
  {
    id: 'BA022',
    applicationNumber: 'SUR-2024-002',
    benefitType: 'Survivors Benefit',
    insuredPersonSSN: '678-90-1235',
    insuredPersonName: 'Carlos Santos',
    applicationDate: '2024-03-31',
    status: 'Submitted',
    claimAmount: 0,
    contactPhone: '(869) 465-6780',
    contactEmail: 'carlos.santos@email.com',
    deceasedName: 'Maria Santos',
    deceasedSSN: '234-56-7893',
    deathDate: '2024-03-20',
    deathCertificateNumber: 'DC-2024-0098',
    relationship: 'Widower',
    dependents: [
      { name: 'Sofia Santos', relationship: 'Daughter', age: 12, studentStatus: true },
      { name: 'Miguel Santos', relationship: 'Son', age: 9, studentStatus: true },
      { name: 'Isabella Santos', relationship: 'Daughter', age: 19, studentStatus: true }
    ]
  },

  // Assistance Pension
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
    notes: 'Does not meet age requirement for assistance pension.',
    contactPhone: '(869) 465-0124',
    contactEmail: 'patricia.white@email.com',
    age: 58,
    incomeProofProvided: true,
    residenceProofProvided: true,
    unemploymentDeclared: true
  },
  {
    id: 'BA023',
    applicationNumber: 'AP-2024-002',
    benefitType: 'Assistance Pension',
    insuredPersonSSN: '123-45-6791',
    insuredPersonName: 'George Mitchell',
    applicationDate: '2024-03-31',
    status: 'Under Review',
    claimAmount: 0,
    contactPhone: '(869) 465-1235',
    contactEmail: 'george.mitchell@email.com',
    age: 68,
    incomeProofProvided: true,
    residenceProofProvided: true,
    unemploymentDeclared: true,
    notes: 'Non-contributory pension assessment ongoing. Means test in progress.'
  },

  // Invalidity Assistance
  {
    id: 'BA024',
    applicationNumber: 'IA-2024-001',
    benefitType: 'Invalidity Assistance',
    insuredPersonSSN: '345-67-8914',
    insuredPersonName: 'Rachel Thompson',
    applicationDate: '2024-03-30',
    status: 'Submitted',
    claimAmount: 0,
    contactPhone: '(869) 465-3457',
    contactEmail: 'rachel.thompson@email.com',
    age: 35,
    disabilityStartDate: '2024-01-10',
    permanentDisability: true,
    doctorName: 'Dr. Michael Foster',
    diagnosis: 'Congenital disability - unable to maintain employment',
    incomeProofProvided: true,
    residenceProofProvided: true,
    notes: 'Non-contributory invalidity assessment. Medical board scheduled.'
  },

  // Assistance Benefits
  {
    id: 'BA025',
    applicationNumber: 'AST-2024-001',
    benefitType: 'Assistance Benefit',
    insuredPersonSSN: '567-89-0124',
    insuredPersonName: 'Kevin Brown',
    applicationDate: '2024-03-29',
    status: 'Under Review',
    claimAmount: 0,
    contactPhone: '(869) 465-5671',
    contactEmail: 'kevin.brown@email.com',
    age: 72,
    incomeProofProvided: true,
    residenceProofProvided: true,
    unemploymentDeclared: false,
    notes: 'General assistance evaluation. Income below threshold verified.'
  }
];
