import { 
  Zone, Department, Employer, Auditor, AuditorWorkload, AuditorAvailability, 
  Holiday, LeaveRequest, AuditPlan, AuditPlanEmployer, AuditActivity, 
  Finding, ManagementResponse, ActionTracking, Evidence, DocumentTemplate,
  AuditActivityResult, AuditFollowUp, CalendarEvent, DepartmentAuditPlan,
  AnnualAuditPlan
} from '@/types/audit';

// ============= ZONES & DEPARTMENTS =============

export const zones: Zone[] = [
  { id: 'zone-a', name: 'Zone A', description: 'Central Business District' },
  { id: 'zone-b', name: 'Zone B', description: 'Industrial Area' },
  { id: 'zone-c', name: 'Zone C', description: 'Residential and Commercial' }
];

export const departments: Department[] = [
  { 
    id: 'dept-benefits', 
    name: 'Benefits Department', 
    head: 'Sarah Williams', 
    email: 'depthead.benefits@ssb.kn', 
    phone: '(869) 465-2001', 
    location: 'Main Building - Floor 2', 
    riskRating: 'High',
    functions: [
      {
        id: 'func-ben-001',
        departmentId: 'dept-benefits',
        functionName: 'Benefit Claims Processing',
        description: 'Processing and approval of all benefit claims including sickness, maternity, and unemployment benefits',
        riskRating: 'High',
        likelihood: 'High',
        impact: 'High',
        controlEffectiveness: 'Partially Effective',
        lastAuditDate: '2024-01-15',
        nextAuditDate: '2025-01-15',
        responsiblePerson: 'Sarah Williams',
        notes: 'High transaction volume requires frequent monitoring'
      },
      {
        id: 'func-ben-002',
        departmentId: 'dept-benefits',
        functionName: 'Eligibility Verification',
        description: 'Verification of contributor eligibility for various benefit programs',
        riskRating: 'High',
        likelihood: 'Medium',
        impact: 'High',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-02-20',
        nextAuditDate: '2025-02-20',
        responsiblePerson: 'Sarah Williams',
        notes: 'Critical control point for benefit disbursements'
      },
      {
        id: 'func-ben-003',
        departmentId: 'dept-benefits',
        functionName: 'Payment Processing',
        description: 'Processing of benefit payments to approved claimants',
        riskRating: 'High',
        likelihood: 'Medium',
        impact: 'High',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-01-10',
        nextAuditDate: '2025-01-10',
        responsiblePerson: 'Sarah Williams',
        notes: 'Automated payments with segregation of duties'
      }
    ]
  },
  { 
    id: 'dept-contributions', 
    name: 'Contributions Department', 
    head: 'Michael Brown', 
    email: 'michael.brown@ssb.kn', 
    phone: '(869) 465-2002', 
    location: 'Main Building - Floor 3', 
    riskRating: 'High',
    functions: [
      {
        id: 'func-con-001',
        departmentId: 'dept-contributions',
        functionName: 'Contribution Collection',
        description: 'Collection and processing of monthly employer contributions',
        riskRating: 'High',
        likelihood: 'High',
        impact: 'High',
        controlEffectiveness: 'Partially Effective',
        lastAuditDate: '2024-01-20',
        nextAuditDate: '2025-01-20',
        responsiblePerson: 'Michael Brown',
        notes: 'Revenue collection is critical to fund operations'
      },
      {
        id: 'func-con-002',
        departmentId: 'dept-contributions',
        functionName: 'C3 Form Processing',
        description: 'Processing and validation of monthly C3 contribution forms',
        riskRating: 'Medium',
        likelihood: 'Medium',
        impact: 'Medium',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-03-05',
        nextAuditDate: '2025-03-05',
        responsiblePerson: 'Michael Brown',
        notes: 'Electronic submissions improving accuracy'
      },
      {
        id: 'func-con-003',
        departmentId: 'dept-contributions',
        functionName: 'Employer Compliance',
        description: 'Monitoring employer compliance with contribution requirements',
        riskRating: 'High',
        likelihood: 'High',
        impact: 'Medium',
        controlEffectiveness: 'Partially Effective',
        lastAuditDate: '2024-02-10',
        nextAuditDate: '2025-02-10',
        responsiblePerson: 'Michael Brown',
        notes: 'High delinquency rate requires intensive follow-up'
      }
    ]
  },
  { 
    id: 'dept-finance', 
    name: 'Finance & Accounts Payable', 
    head: 'Jennifer Davis', 
    email: 'jennifer.davis@ssb.kn', 
    phone: '(869) 465-2003', 
    location: 'Main Building - Floor 1', 
    riskRating: 'High',
    functions: [
      {
        id: 'func-fin-001',
        departmentId: 'dept-finance',
        functionName: 'Accounts Payable',
        description: 'Processing vendor payments and expense reimbursements',
        riskRating: 'Medium',
        likelihood: 'Medium',
        impact: 'Medium',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-02-15',
        nextAuditDate: '2025-02-15',
        responsiblePerson: 'Jennifer Davis',
        notes: 'Three-way match controls in place'
      },
      {
        id: 'func-fin-002',
        departmentId: 'dept-finance',
        functionName: 'Cash Management',
        description: 'Management of cash receipts, disbursements, and bank reconciliations',
        riskRating: 'High',
        likelihood: 'Medium',
        impact: 'High',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-01-25',
        nextAuditDate: '2025-01-25',
        responsiblePerson: 'Jennifer Davis',
        notes: 'Daily reconciliations and segregation of duties'
      },
      {
        id: 'func-fin-003',
        departmentId: 'dept-finance',
        functionName: 'Financial Reporting',
        description: 'Preparation of monthly and annual financial statements',
        riskRating: 'High',
        likelihood: 'Low',
        impact: 'High',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-03-01',
        nextAuditDate: '2025-03-01',
        responsiblePerson: 'Jennifer Davis',
        notes: 'External audit annually'
      }
    ]
  },
  { 
    id: 'dept-it', 
    name: 'IT Department', 
    head: 'Robert Johnson', 
    email: 'robert.johnson@ssb.kn', 
    phone: '(869) 465-2004', 
    location: 'Annex Building', 
    riskRating: 'Medium',
    functions: [
      {
        id: 'func-it-001',
        departmentId: 'dept-it',
        functionName: 'System Security & Access Control',
        description: 'Management of user access rights and system security',
        riskRating: 'High',
        likelihood: 'High',
        impact: 'High',
        controlEffectiveness: 'Partially Effective',
        lastAuditDate: '2024-01-30',
        nextAuditDate: '2025-01-30',
        responsiblePerson: 'Robert Johnson',
        notes: 'Need to implement multi-factor authentication'
      },
      {
        id: 'func-it-002',
        departmentId: 'dept-it',
        functionName: 'Data Backup & Recovery',
        description: 'Backup procedures and disaster recovery planning',
        riskRating: 'High',
        likelihood: 'Low',
        impact: 'High',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-02-28',
        nextAuditDate: '2025-02-28',
        responsiblePerson: 'Robert Johnson',
        notes: 'Regular backup testing conducted'
      },
      {
        id: 'func-it-003',
        departmentId: 'dept-it',
        functionName: 'Application Development',
        description: 'Development and maintenance of SSB applications',
        riskRating: 'Medium',
        likelihood: 'Medium',
        impact: 'Medium',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-03-10',
        nextAuditDate: '2025-03-10',
        responsiblePerson: 'Robert Johnson',
        notes: 'Change management controls in place'
      }
    ]
  },
  { 
    id: 'dept-hr', 
    name: 'Human Resources', 
    head: 'Lisa Martinez', 
    email: 'lisa.martinez@ssb.kn', 
    phone: '(869) 465-2005', 
    location: 'Main Building - Floor 4', 
    riskRating: 'Low',
    functions: [
      {
        id: 'func-hr-001',
        departmentId: 'dept-hr',
        functionName: 'Recruitment & Hiring',
        description: 'Staff recruitment, selection, and onboarding',
        riskRating: 'Low',
        likelihood: 'Low',
        impact: 'Medium',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-03-15',
        nextAuditDate: '2025-03-15',
        responsiblePerson: 'Lisa Martinez',
        notes: 'Structured hiring process with Board approval'
      },
      {
        id: 'func-hr-002',
        departmentId: 'dept-hr',
        functionName: 'Payroll Processing',
        description: 'Monthly payroll processing and related tax filings',
        riskRating: 'Medium',
        likelihood: 'Medium',
        impact: 'Medium',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-02-25',
        nextAuditDate: '2025-02-25',
        responsiblePerson: 'Lisa Martinez',
        notes: 'Automated system with supervisory review'
      },
      {
        id: 'func-hr-003',
        departmentId: 'dept-hr',
        functionName: 'Performance Management',
        description: 'Employee performance evaluation and development',
        riskRating: 'Low',
        likelihood: 'Low',
        impact: 'Low',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-04-01',
        nextAuditDate: '2025-04-01',
        responsiblePerson: 'Lisa Martinez',
        notes: 'Annual performance reviews conducted'
      }
    ]
  },
  { 
    id: 'dept-compliance', 
    name: 'Compliance & Legal', 
    head: 'David Thompson', 
    email: 'david.thompson@ssb.kn', 
    phone: '(869) 465-2006', 
    location: 'Main Building - Floor 5', 
    riskRating: 'Medium',
    functions: [
      {
        id: 'func-comp-001',
        departmentId: 'dept-compliance',
        functionName: 'Regulatory Compliance',
        description: 'Monitoring compliance with SSB Act and regulations',
        riskRating: 'Medium',
        likelihood: 'Medium',
        impact: 'High',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-02-05',
        nextAuditDate: '2025-02-05',
        responsiblePerson: 'David Thompson',
        notes: 'Regular compliance reviews conducted'
      },
      {
        id: 'func-comp-002',
        departmentId: 'dept-compliance',
        functionName: 'Legal Case Management',
        description: 'Management of legal cases and proceedings',
        riskRating: 'Medium',
        likelihood: 'Low',
        impact: 'High',
        controlEffectiveness: 'Effective',
        lastAuditDate: '2024-03-20',
        nextAuditDate: '2025-03-20',
        responsiblePerson: 'David Thompson',
        notes: 'External legal counsel engaged as needed'
      },
      {
        id: 'func-comp-003',
        departmentId: 'dept-compliance',
        functionName: 'Enforcement Actions',
        description: 'Enforcement of contribution requirements and penalties',
        riskRating: 'Medium',
        likelihood: 'Medium',
        impact: 'Medium',
        controlEffectiveness: 'Partially Effective',
        lastAuditDate: '2024-01-18',
        nextAuditDate: '2025-01-18',
        responsiblePerson: 'David Thompson',
        notes: 'Need to improve follow-up on outstanding penalties'
      }
    ]
  }
];

// ============= ANNUAL AUDIT PLANS =============

export const annualAuditPlans: AnnualAuditPlan[] = [
  {
    id: 'annual-plan-2025',
    fiscalYear: 'FY2025',
    title: 'FY2025 Annual Internal Audit Plan',
    objective: 'Provide independent, objective assurance and consulting activities to improve SSB operations',
    scope: 'All SSB departments and critical functions based on risk assessment',
    methodology: 'Risk-based audit approach using professional standards',
    status: 'Approved',
    createdBy: 'manager@ssb.kn',
    createdDate: '2025-07-15',
    submittedDate: '2025-08-01',
    reviewedBy: 'manager@ssb.kn',
    reviewedDate: '2025-08-10',
    approvedBy: 'director@ssb.kn',
    approvedDate: '2025-08-15',
    approvalComments: 'Approved - comprehensive coverage of high-risk areas',
    totalDepartmentAudits: 6
  }
];

// ============= DEPARTMENT AUDIT PLANS =============

export const departmentAuditPlans: DepartmentAuditPlan[] = [
  {
    id: 'dept-audit-001',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-benefits',
    departmentName: 'Benefits Department',
    period: 'Q3',
    monthYear: 'September 2025',
    functions: ['Claims Processing', 'Eligibility Verification', 'Payment Processing'],
    objective: 'Assess effectiveness of benefit claims processing and payment controls',
    scope: 'Claims processing, eligibility verification, payment accuracy, customer service',
    riskRating: 'High',
    leadAuditor: 'aud-003',
    leadAuditorName: 'John Doe',
    teamMembers: ['aud-004'],
    status: 'In Progress',
    plannedStart: '2025-09-01',
    plannedEnd: '2025-09-30',
    actualStart: '2025-09-01'
  },
  {
    id: 'dept-audit-002',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-contributions',
    departmentName: 'Contributions Department',
    period: 'Q4',
    monthYear: 'October 2025',
    functions: ['Contribution Collection', 'C3 Form Processing', 'Employer Compliance'],
    objective: 'Verify accuracy and timeliness of contribution collections',
    scope: 'Contribution collection, C3 processing, employer compliance monitoring',
    riskRating: 'High',
    leadAuditor: 'aud-004',
    leadAuditorName: 'Alice Smith',
    teamMembers: ['aud-003'],
    status: 'Planned',
    plannedStart: '2025-10-01',
    plannedEnd: '2025-10-31'
  },
  {
    id: 'dept-audit-003',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-finance',
    departmentName: 'Finance & Accounts Payable',
    period: 'Q4',
    monthYear: 'November 2025',
    functions: ['Accounts Payable', 'Cash Management', 'Financial Reporting'],
    objective: 'Evaluate financial controls and reporting accuracy',
    scope: 'AP processing, cash management, financial reporting, GL reconciliations',
    riskRating: 'High',
    leadAuditor: 'aud-003',
    leadAuditorName: 'John Doe',
    teamMembers: [],
    status: 'Planned',
    plannedStart: '2025-11-01',
    plannedEnd: '2025-11-30'
  },
  {
    id: 'dept-audit-004',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-it',
    departmentName: 'IT Department',
    period: 'Q4',
    monthYear: 'December 2025',
    functions: ['System Access Management', 'Change Management', 'Backup & Recovery'],
    objective: 'Evaluate IT general controls supporting SSB systems',
    scope: 'Access controls, change management, backup/recovery, security monitoring',
    riskRating: 'Medium',
    leadAuditor: 'aud-003',
    leadAuditorName: 'John Doe',
    teamMembers: ['aud-004'],
    status: 'Draft',
    plannedStart: '2025-12-01',
    plannedEnd: '2025-12-31'
  }
];

export const employers: Employer[] = [
  // Zone A Employers
  { id: 'emp-001', name: 'Caribbean Bank Ltd', registrationNumber: 'REG-2020-001', zone: 'zone-a', status: 'Active', address: '123 Main St, Basseterre', contactPerson: 'John Smith', phone: '(869) 465-1234', email: 'hr@caribbank.com' },
  { id: 'emp-002', name: 'Island Resort Hotels', registrationNumber: 'REG-2019-045', zone: 'zone-a', status: 'Active', address: '456 Beach Road, Frigate Bay', contactPerson: 'Mary Johnson', phone: '(869) 465-5678', email: 'admin@islandresort.com' },
  { id: 'emp-003', name: 'St. Kitts Trading Co.', registrationNumber: 'REG-2021-012', zone: 'zone-a', status: 'Active', address: '789 Commerce Ave, Basseterre', contactPerson: 'Robert Davis', phone: '(869) 465-9012', email: 'contact@skttrading.com' },
  { id: 'emp-004', name: 'Medical Center SKN', registrationNumber: 'REG-2018-067', zone: 'zone-a', status: 'Active', address: '321 Hospital Road, Basseterre', contactPerson: 'Dr. Lisa Brown', phone: '(869) 465-3456', email: 'admin@medcenter.com' },
  { id: 'emp-005', name: 'Tech Solutions Inc.', registrationNumber: 'REG-2022-089', zone: 'zone-a', status: 'Active', address: '654 IT Park, Basseterre', contactPerson: 'Michael Wilson', phone: '(869) 465-7890', email: 'hr@techsolutions.com' },
  // Zone B Employers
  { id: 'emp-011', name: 'Industrial Manufacturing', registrationNumber: 'REG-2019-102', zone: 'zone-b', status: 'Active', address: '123 Factory St, Industrial Park', contactPerson: 'Mark Thompson', phone: '(869) 466-1111', email: 'hr@indmfg.com' },
  { id: 'emp-012', name: 'Port Authority SKN', registrationNumber: 'REG-2018-001', zone: 'zone-b', status: 'Active', address: '456 Port Road, Zante', contactPerson: 'Carol White', phone: '(869) 466-2222', email: 'admin@portauth.com' },
  // Zone C Employers
  { id: 'emp-021', name: 'Retail Chain SKN', registrationNumber: 'REG-2020-111', zone: 'zone-c', status: 'Active', address: '123 Shopping St, Charlestown', contactPerson: 'Andrew Wright', phone: '(869) 467-1111', email: 'hr@retailchain.com' },
  { id: 'emp-022', name: 'Community Health Center', registrationNumber: 'REG-2018-023', zone: 'zone-c', status: 'Active', address: '456 Health Ave, Charlestown', contactPerson: 'Rachel Green', phone: '(869) 467-2222', email: 'admin@healthcenter.com' },
  { id: 'emp-023', name: 'Real Estate Group', registrationNumber: 'REG-2021-045', zone: 'zone-c', status: 'Active', address: '789 Property Road, Charlestown', contactPerson: 'Daniel Adams', phone: '(869) 467-3333', email: 'office@realestate.com' }
];

// ============= AUDITORS =============

export const auditors: Auditor[] = [
  {
    id: 'aud-001',
    name: 'Director Audit Services',
    employeeNo: 'EMP-DIR-001',
    email: 'director@ssb.kn',
    phone: '(869) 465-9001',
    role: 'Audit Director',
    skills: ['Strategic Planning', 'Risk Assessment', 'Governance', 'Leadership'],
    certifications: ['CIA', 'CISA', 'CFE'],
    seniorityLevel: 'Lead',
    employmentStatus: 'Active',
    workLocation: 'SSB Head Office'
  },
  {
    id: 'aud-002',
    name: 'Manager Internal Audit',
    employeeNo: 'EMP-MGR-001',
    email: 'manager@ssb.kn',
    phone: '(869) 465-9002',
    role: 'Audit Manager',
    skills: ['Audit Planning', 'Team Management', 'Quality Review', 'Reporting'],
    certifications: ['CIA', 'CPA'],
    seniorityLevel: 'Senior',
    employmentStatus: 'Active',
    workLocation: 'SSB Head Office',
    supervisorId: 'aud-001'
  },
  {
    id: 'aud-003',
    name: 'John Doe',
    employeeNo: 'EMP-AUD-001',
    email: 'auditor1@ssb.kn',
    phone: '(869) 465-9003',
    role: 'Auditor',
    skills: ['Payroll Audit', 'Compliance Testing', 'IT Audit', 'Data Analytics'],
    certifications: ['CIA', 'CISA'],
    seniorityLevel: 'Senior',
    employmentStatus: 'Active',
    workLocation: 'SSB Head Office',
    supervisorId: 'aud-002'
  },
  {
    id: 'aud-004',
    name: 'Alice Smith',
    employeeNo: 'EMP-AUD-002',
    email: 'auditor2@ssb.kn',
    phone: '(869) 465-9004',
    role: 'Auditor',
    skills: ['Financial Audit', 'Benefits Audit', 'Documentation', 'Interviewing'],
    certifications: ['CIA'],
    seniorityLevel: 'Mid',
    employmentStatus: 'Active',
    workLocation: 'SSB Head Office',
    supervisorId: 'aud-002'
  },
  {
    id: 'aud-005',
    name: 'Compliance Reader',
    employeeNo: 'EMP-COM-001',
    email: 'compliance.reader1@ssb.kn',
    phone: '(869) 465-9005',
    role: 'Admin',
    skills: ['Compliance Monitoring', 'Reporting', 'Documentation'],
    certifications: [],
    seniorityLevel: 'Junior',
    employmentStatus: 'Active',
    workLocation: 'SSB Head Office',
    supervisorId: 'aud-002'
  }
];

// ============= HOLIDAYS =============

export const holidays: Holiday[] = [
  { id: 'hol-001', date: '2025-01-01', name: 'New Year\'s Day', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-002', date: '2025-04-18', name: 'Good Friday', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-003', date: '2025-04-21', name: 'Easter Monday', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-004', date: '2025-05-05', name: 'Labour Day', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-005', date: '2025-06-02', name: 'Whit Monday', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-006', date: '2025-08-04', name: 'Emancipation Day', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-007', date: '2025-09-19', name: 'Independence Day', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-008', date: '2025-12-25', name: 'Christmas Day', country: 'St. Kitts & Nevis', isSSBSpecific: false },
  { id: 'hol-009', date: '2025-12-26', name: 'Boxing Day', country: 'St. Kitts & Nevis', isSSBSpecific: false }
];

// ============= LEAVE REQUESTS =============

export const leaveRequests: LeaveRequest[] = [
  {
    id: 'leave-001',
    requestId: 'LR-2025-001',
    auditorId: 'aud-003',
    auditorName: 'John Doe',
    leaveType: 'Annual',
    startDate: '2025-10-15',
    endDate: '2025-10-19',
    reason: 'Family vacation',
    status: 'Approved',
    approverId: 'aud-002',
    approverName: 'Manager Internal Audit',
    decisionNote: 'Approved - enjoy your time off',
    submittedDate: '2025-09-01',
    decidedDate: '2025-09-02'
  },
  {
    id: 'leave-002',
    requestId: 'LR-2025-002',
    auditorId: 'aud-004',
    auditorName: 'Alice Smith',
    leaveType: 'Training',
    startDate: '2025-11-10',
    endDate: '2025-11-12',
    reason: 'CIA certification training in Barbados',
    attachment: 'training-schedule.pdf',
    status: 'Approved',
    approverId: 'aud-002',
    approverName: 'Manager Internal Audit',
    decisionNote: 'Approved - training aligns with development goals',
    submittedDate: '2025-09-10',
    decidedDate: '2025-09-12'
  },
  {
    id: 'leave-003',
    requestId: 'LR-2025-003',
    auditorId: 'aud-003',
    auditorName: 'John Doe',
    leaveType: 'Sick',
    startDate: '2025-09-25',
    endDate: '2025-09-25',
    reason: 'Medical appointment',
    status: 'Submitted',
    submittedDate: '2025-09-24'
  }
];

// ============= AUDIT PLANS =============

export const auditPlans: any[] = [
  {
    id: 'plan-001',
    title: 'FY2025 Q3 Employer Compliance Audit - Zone A',
    fiscalYear: 'FY2025',
    period: 'Quarterly',
    monthYear: 'September 2025',
    zone: 'zone-a',
    departments: [],
    objective: 'Verify employer compliance with contribution reporting and payment requirements',
    scope: 'Zone A employers - payroll records, contribution calculations, and payment timeliness',
    methodology: 'Sampling-based testing of payroll records, contribution calculations, and payment history',
    riskBasis: 'High-risk zone with large financial institutions and complex payroll structures',
    status: 'In Progress',
    createdBy: 'manager@ssb.kn',
    createdDate: '2025-08-15',
    submittedDate: '2025-08-20',
    approvedDate: '2025-08-25',
    approver: 'director@ssb.kn',
    approvalComments: 'Approved with priority on high-risk employers',
    plannedStart: '2025-09-01',
    plannedEnd: '2025-09-30',
    actualStart: '2025-09-01',
    totalEmployers: 10,
    assignedEmployers: 5,
    attachments: ['risk-assessment-2025.pdf']
  },
  {
    id: 'plan-002',
    title: 'FY2025 Benefits Department Operational Audit',
    fiscalYear: 'FY2025',
    period: 'Annual',
    monthYear: 'October 2025',
    departments: ['dept-benefits'],
    objective: 'Assess effectiveness of benefit claims processing and payment controls',
    scope: 'Benefits Department - claims processing, eligibility verification, payment accuracy, customer service',
    methodology: 'Process walkthroughs, transaction testing, control evaluation, stakeholder interviews',
    riskBasis: 'High-value transactions, multiple benefit types, complex eligibility rules',
    status: 'Scheduled',
    createdBy: 'manager@ssb.kn',
    createdDate: '2025-09-05',
    submittedDate: '2025-09-10',
    approvedDate: '2025-09-15',
    approver: 'director@ssb.kn',
    approvalComments: 'Critical audit - allocate sufficient resources',
    plannedStart: '2025-10-01',
    plannedEnd: '2025-11-30',
    totalEmployers: 0,
    assignedEmployers: 0,
    attachments: ['benefits-risk-matrix.xlsx']
  },
  {
    id: 'plan-003',
    title: 'FY2025 IT General Controls Review',
    fiscalYear: 'FY2025',
    period: 'Annual',
    monthYear: 'November 2025',
    departments: ['dept-it'],
    objective: 'Evaluate IT general controls supporting financial and operational systems',
    scope: 'IT Department - access controls, change management, backup/recovery, security monitoring',
    methodology: 'Control testing, configuration reviews, access rights analysis, security assessments',
    riskBasis: 'Critical IT infrastructure supporting all SSB operations',
    status: 'Draft',
    createdBy: 'manager@ssb.kn',
    createdDate: '2025-09-20',
    plannedStart: '2025-11-01',
    plannedEnd: '2025-12-15',
    totalEmployers: 0,
    assignedEmployers: 0,
    attachments: []
  }
];

export const auditPlanEmployers: AuditPlanEmployer[] = [
  {
    id: 'pe-001',
    planId: 'plan-001',
    employerId: 'emp-001',
    employer: employers[0],
    riskRating: 'High',
    rationale: 'Large financial institution with complex payroll and high employee count',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    status: 'In Progress'
  },
  {
    id: 'pe-002',
    planId: 'plan-001',
    employerId: 'emp-002',
    employer: employers[1],
    riskRating: 'Medium',
    rationale: 'Tourism sector with seasonal employment variations',
    auditor: 'auditor2@ssb.kn',
    auditorName: 'Alice Smith',
    status: 'Assigned'
  },
  {
    id: 'pe-003',
    planId: 'plan-001',
    employerId: 'emp-003',
    employer: employers[2],
    riskRating: 'Medium',
    rationale: 'Trading company with multiple locations',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    status: 'Assigned'
  },
  {
    id: 'pe-004',
    planId: 'plan-001',
    employerId: 'emp-004',
    employer: employers[3],
    riskRating: 'Low',
    rationale: 'Medical facility with standard payroll practices',
    auditor: 'auditor2@ssb.kn',
    auditorName: 'Alice Smith',
    status: 'Assigned'
  },
  {
    id: 'pe-005',
    planId: 'plan-001',
    employerId: 'emp-005',
    employer: employers[4],
    riskRating: 'High',
    rationale: 'New technology company with complex compensation structures',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    status: 'Completed'
  }
];

// ============= AUDIT ACTIVITIES =============

export const auditActivities: AuditActivity[] = [
  {
    id: 'act-001',
    departmentAuditId: 'dept-audit-001',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-benefits',
    functionArea: 'Claims Processing',
    name: 'Claims Processing Control Review',
    description: 'Evaluation of claims processing controls and workflows in Benefits Department',
    controlArea: 'Benefits',
    type: 'Process Review',
    evidenceExpected: ['Process documentation', 'Sample claims files', 'Approval records', 'Payment records'],
    assignedAuditors: ['auditor1@ssb.kn'],
    title: 'Benefits Department - Claims Processing Review',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    startDate: '2025-09-15T09:00:00',
    endDate: '2025-09-15T17:00:00',
    plannedDateFrom: '2025-09-15T09:00:00',
    plannedDateTo: '2025-09-15T17:00:00',
    actualDateFrom: '2025-09-15T09:00:00',
    actualDateTo: '2025-09-15T17:00:00',
    location: 'SSB Main Building - Floor 2',
    status: 'In Progress',
    priority: 'High'
  },
  {
    id: 'act-002',
    departmentAuditId: 'dept-audit-001',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-benefits',
    functionArea: 'Eligibility Verification',
    name: 'Eligibility Verification Testing',
    description: 'Testing of eligibility verification procedures and documentation',
    controlArea: 'Benefits',
    type: 'Compliance Check',
    evidenceExpected: ['Eligibility checklists', 'Verification documents', 'Approval records'],
    assignedAuditors: ['auditor2@ssb.kn'],
    title: 'Benefits Department - Eligibility Verification',
    auditor: 'auditor2@ssb.kn',
    auditorName: 'Alice Smith',
    startDate: '2025-09-20T10:00:00',
    endDate: '2025-09-20T15:00:00',
    plannedDateFrom: '2025-09-20T10:00:00',
    plannedDateTo: '2025-09-20T15:00:00',
    location: 'SSB Main Building - Floor 2',
    status: 'Planned',
    priority: 'High'
  },
  {
    id: 'act-003',
    departmentAuditId: 'dept-audit-002',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-contributions',
    functionArea: 'Contribution Collection',
    name: 'Contribution Collection Review',
    description: 'Review of contribution collection procedures and reconciliation',
    controlArea: 'Contributions',
    type: 'Records Review',
    evidenceExpected: ['Collection reports', 'Reconciliations', 'Bank deposits', 'C3 forms'],
    assignedAuditors: ['auditor2@ssb.kn'],
    title: 'Contributions Department - Collection Review',
    auditor: 'auditor2@ssb.kn',
    auditorName: 'Alice Smith',
    startDate: '2025-10-10T08:30:00',
    endDate: '2025-10-10T16:30:00',
    plannedDateFrom: '2025-10-10T08:30:00',
    plannedDateTo: '2025-10-10T16:30:00',
    location: 'SSB Main Building - Floor 3',
    status: 'Planned',
    priority: 'High'
  },
  {
    id: 'act-004',
    departmentAuditId: 'dept-audit-003',
    annualPlanId: 'annual-plan-2025',
    departmentId: 'dept-finance',
    functionArea: 'Accounts Payable',
    name: 'AP Controls Testing',
    description: 'Testing of accounts payable controls and approval processes',
    controlArea: 'Finance/AP',
    type: 'Compliance Check',
    evidenceExpected: ['AP policy', 'Sample invoices', 'Approval documentation', 'Payment records'],
    assignedAuditors: ['auditor1@ssb.kn'],
    title: 'Finance Department - AP Controls Review',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    startDate: '2025-11-05T09:00:00',
    endDate: '2025-11-05T17:00:00',
    plannedDateFrom: '2025-11-05T09:00:00',
    plannedDateTo: '2025-11-05T17:00:00',
    location: 'SSB Main Building - Floor 1',
    status: 'Planned',
    priority: 'High'
  }
];

// ============= FINDINGS =============

export const findings: Finding[] = [
  {
    id: 'find-001',
    findingId: 'F-2025-001',
    planId: 'plan-001',
    activityId: 'act-001',
    title: 'Late Contribution Payments',
    condition: 'Three instances of contribution payments submitted after the statutory deadline during Q2 2025',
    criteria: 'Social Security Act requires contributions to be paid by the 15th of the following month',
    cause: 'Inadequate monitoring of payment deadlines by HR department',
    effect: 'Potential penalties and interest charges; non-compliance with legislation',
    riskRating: 'Medium',
    impactArea: 'Compliance',
    ownerRole: 'HR Manager - Caribbean Bank Ltd',
    status: 'For Mgmt Response',
    createdBy: 'auditor1@ssb.kn',
    createdDate: '2025-09-15'
  },
  {
    id: 'find-002',
    findingId: 'F-2025-002',
    planId: 'plan-001',
    activityId: 'act-001',
    title: 'Incorrect Contribution Calculations',
    condition: 'Two employees had contributions calculated on incorrect salary amounts (excluding overtime)',
    criteria: 'Contributions must be calculated on gross earnings including overtime, bonuses, and allowances',
    cause: 'Payroll system configuration error not capturing all earning components',
    effect: 'Under-remittance of contributions by approximately $1,240; reduced employee benefits coverage',
    riskRating: 'High',
    impactArea: 'Financial',
    ownerRole: 'Payroll Manager - Caribbean Bank Ltd',
    status: 'Agreed',
    createdBy: 'auditor1@ssb.kn',
    createdDate: '2025-09-15'
  },
  {
    id: 'find-003',
    findingId: 'F-2025-003',
    planId: 'plan-001',
    activityId: 'act-003',
    title: 'Missing Employee Records',
    condition: 'Employment records for 3 out of 45 employees were not readily available for audit review',
    criteria: 'Employers must maintain complete employment records for all contributors',
    cause: 'Incomplete transition to new document management system',
    effect: 'Difficulty verifying employment status and contribution accuracy',
    riskRating: 'Low',
    impactArea: 'Operational',
    ownerRole: 'HR Director - Tech Solutions Inc',
    status: 'Under Review',
    createdBy: 'auditor1@ssb.kn',
    createdDate: '2025-09-10'
  }
];

export const recommendations: any[] = [
  {
    id: 'rec-001',
    findingId: 'find-001',
    recommendationText: 'Implement automated payment reminders and calendar alerts for contribution deadlines',
    priority: 'High',
    targetDate: '2025-10-01',
    responsibleParty: 'HR Manager',
    status: 'Pending',
    createdDate: '2025-09-15'
  },
  {
    id: 'rec-002',
    findingId: 'find-001',
    recommendationText: 'Establish monthly reconciliation process for contribution payments',
    priority: 'Medium',
    targetDate: '2025-10-15',
    responsibleParty: 'Finance Manager',
    status: 'Pending',
    createdDate: '2025-09-15'
  },
  {
    id: 'rec-003',
    findingId: 'find-002',
    recommendationText: 'Review and update payroll system configuration to capture all earning components',
    priority: 'High',
    targetDate: '2025-09-25',
    responsibleParty: 'Payroll Manager',
    status: 'Accepted',
    createdDate: '2025-09-15'
  },
  {
    id: 'rec-004',
    findingId: 'find-002',
    recommendationText: 'Process retrospective adjustments for affected employees',
    priority: 'High',
    targetDate: '2025-10-15',
    responsibleParty: 'Payroll Manager',
    status: 'Accepted',
    createdDate: '2025-09-15'
  },
  {
    id: 'rec-005',
    findingId: 'find-003',
    recommendationText: 'Complete digitization of employee records',
    priority: 'Medium',
    targetDate: '2025-11-30',
    responsibleParty: 'HR Director',
    status: 'Pending',
    createdDate: '2025-09-10'
  }
];

export const workingPapers = [
  {
    id: "wp1",
    workingPaperId: "WP-2025-001",
    annualPlanId: "ap1",
    departmentAuditId: "dap1",
    activityId: "act1",
    title: "Benefit Processing Controls Review",
    description: "Assessment of controls over benefit claim processing and approvals",
    objective: "To evaluate the effectiveness of internal controls over benefit claim processing",
    auditArea: "Benefits Department",
    procedure: "Review of benefit processing procedures and controls documentation",
    testPerformed: "Sample testing of 50 benefit claims for proper authorization and processing",
    evidenceIds: ["ev1", "ev2"],
    results: "48 out of 50 claims processed correctly. 2 claims lacked proper secondary approval.",
    observations: "Minor control weakness identified in secondary approval process",
    conclusion: "Overall controls are effective with minor improvements needed",
    linkedFindingIds: ["f1"],
    preparedBy: "Sarah Johnson",
    preparedDate: "2025-01-10",
    reviewedBy: "Michael Chen",
    reviewedDate: "2025-01-14",
    approvedBy: "Director Audit Services",
    approvedDate: "2025-01-15",
    status: "Approved" as const,
    version: 2,
    createdDate: "2025-01-10",
    lastModifiedDate: "2025-01-15",
    tags: ["controls", "benefits"],
    auditTrail: [
      { action: "Created" as const, performedBy: "Sarah Johnson", performedDate: "2025-01-10", notes: "Initial draft" },
      { action: "Modified" as const, performedBy: "Sarah Johnson", performedDate: "2025-01-12", notes: "Added test results" },
      { action: "Reviewed" as const, performedBy: "Michael Chen", performedDate: "2025-01-14", notes: "Review complete" },
      { action: "Approved" as const, performedBy: "Director Audit Services", performedDate: "2025-01-15" },
    ],
  },
  {
    id: "wp2",
    workingPaperId: "WP-2025-002",
    annualPlanId: "ap1",
    departmentAuditId: "dap2",
    activityId: "act5",
    title: "Contribution Collection Testing",
    description: "Testing of contribution collection and recording procedures",
    objective: "Verify accuracy and completeness of employer contribution collections",
    auditArea: "Finance Department",
    procedure: "Sample testing of employer contributions for proper recording and deposit",
    testPerformed: "Selected 50 employer contributions for detailed verification",
    evidenceIds: ["ev3", "ev4"],
    results: "All 50 contributions properly recorded and deposited within required timeframes",
    observations: "Strong controls over contribution collection process",
    conclusion: "No exceptions noted. Controls operating effectively.",
    linkedFindingIds: [],
    preparedBy: "David Rodriguez",
    preparedDate: "2025-01-12",
    reviewedBy: "Senior Auditor",
    reviewedDate: "2025-01-18",
    status: "Under Review" as const,
    version: 1,
    createdDate: "2025-01-12",
    lastModifiedDate: "2025-01-18",
    tags: ["contributions", "testing"],
    auditTrail: [
      { action: "Created" as const, performedBy: "David Rodriguez", performedDate: "2025-01-12" },
      { action: "Modified" as const, performedBy: "David Rodriguez", performedDate: "2025-01-16", notes: "Completed fieldwork" },
      { action: "Reviewed" as const, performedBy: "Senior Auditor", performedDate: "2025-01-18" },
    ],
  },
  {
    id: "wp3",
    workingPaperId: "WP-2025-003",
    annualPlanId: "ap1",
    departmentAuditId: "dap3",
    activityId: "act7",
    title: "HR Payroll System Access Controls",
    description: "Review of system access controls and segregation of duties",
    objective: "Assess IT access controls and user privileges in payroll system",
    auditArea: "Human Resources",
    procedure: "Review user access matrices, system logs, and approval documentation",
    testPerformed: "Analyzed 25 user accounts for appropriate access levels and segregation of duties",
    evidenceIds: ["ev5"],
    results: "3 users identified with inappropriate access combinations",
    observations: "Segregation of duties weaknesses identified for setup and payment processing",
    conclusion: "Moderate risk - requires management attention",
    linkedFindingIds: ["f3"],
    preparedBy: "Emily Thompson",
    preparedDate: "2025-01-20",
    status: "Draft" as const,
    version: 1,
    createdDate: "2025-01-20",
    lastModifiedDate: "2025-01-20",
    tags: ["IT", "access controls"],
    auditTrail: [
      { action: "Created" as const, performedBy: "Emily Thompson", performedDate: "2025-01-20", notes: "Initial draft in progress" },
    ],
  },
];

// ============= MANAGEMENT RESPONSES =============

export const managementResponses: ManagementResponse[] = [
  {
    id: 'resp-001',
    findingId: 'find-002',
    responseText: 'We acknowledge the payroll system configuration error and have already begun corrective action.',
    actionPlan: '1. Engage payroll system vendor to reconfigure earning components\n2. Perform retrospective analysis for past 12 months\n3. Process adjustments for all affected employees\n4. Submit corrected contributions to SSB',
    responsiblePerson: 'Jane Doe, Payroll Manager',
    targetDate: '2025-10-15',
    supportingDocs: ['action-plan-2025-09.pdf'],
    status: 'Submitted',
    submittedBy: 'jane.doe@caribbank.com',
    submittedDate: '2025-09-18'
  }
];

// ============= ACTION TRACKING =============

export const actionTracking: ActionTracking[] = [
  {
    id: 'action-001',
    findingId: 'find-002',
    actionStatus: 'In Progress',
    evidenceOfImplementation: [],
    notes: 'Vendor engaged - configuration changes scheduled for week of September 25',
  }
];

// ============= EVIDENCE =============

export const evidence: Evidence[] = [
  {
    id: 'ev-001',
    evidenceId: 'EV-2025-001',
    activityId: 'act-001',
    file: 'payroll-register-q2-2025.xlsx',
    description: 'Q2 2025 Payroll Register for Caribbean Bank Ltd',
    referenceNo: 'WP-001-01',
    hash: 'sha256:abc123...',
    uploadedBy: 'auditor1@ssb.kn',
    uploadDate: '2025-09-15'
  },
  {
    id: 'ev-002',
    evidenceId: 'EV-2025-002',
    activityId: 'act-001',
    findingId: 'find-001',
    file: 'payment-receipts-late.pdf',
    description: 'Payment receipts showing late submission dates',
    referenceNo: 'WP-001-05',
    hash: 'sha256:def456...',
    uploadedBy: 'auditor1@ssb.kn',
    uploadDate: '2025-09-15'
  }
];

// ============= DOCUMENT TEMPLATES =============

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'tmpl-001',
    name: 'Notice of Audit (Engagement Letter)',
    type: 'Notice of Audit',
    category: 'Planning',
    content: `[SSB Letterhead & Logo]\nDate: {{today_date}}\n\nTo: {{dept_head_name}}, {{department_name}}\nSubject: Notice of Internal Audit – {{plan_title}} ({{fiscal_year}})\n\nDear {{dept_head_name}},\n\nThis is to inform you that the Internal Audit Department will conduct an audit of {{department_name}} covering the period {{period_text}}.\n\nScope & Objectives:\n{{scope}}\n\nProposed Schedule:\nStart: {{planned_start}}   End: {{planned_end}}\nAuditors: {{auditor_names}}\n\nPlease nominate a focal point and ensure records listed in the attached PBC are available by {{pbc_due_date}}.\n\nRegards,\n{{audit_manager_name}}\nInternal Audit Department\nSocial Security Board, St. Kitts & Nevis`,
    mergeFields: ['today_date', 'dept_head_name', 'department_name', 'plan_title', 'fiscal_year', 'period_text', 'scope', 'planned_start', 'planned_end', 'auditor_names', 'pbc_due_date', 'audit_manager_name'],
    active: true
  },
  {
    id: 'tmpl-002',
    name: 'PBC Request (Provided By Client)',
    type: 'PBC Request',
    content: `[SSB Letterhead]\nDate: {{today_date}}\n\nRe: Documents Required for {{plan_title}}\n\nDear {{contact_name}},\n\nIn connection with our upcoming audit, please provide the following documents by {{due_date}}:\n\n{{document_list}}\n\nPlease submit to: {{auditor_email}}\n\nThank you for your cooperation.\n\n{{auditor_name}}\nInternal Auditor`,
    mergeFields: ['today_date', 'plan_title', 'contact_name', 'due_date', 'document_list', 'auditor_email', 'auditor_name'],
    active: true
  },
  {
    id: 'tmpl-003',
    name: 'Exit Meeting Invitation',
    type: 'Exit Meeting Invite',
    content: `Subject: Exit Meeting - {{plan_title}}\n\nDear {{recipient_name}},\n\nWe are pleased to invite you to the exit meeting for {{plan_title}}.\n\nDate: {{meeting_date}}\nTime: {{meeting_time}}\nLocation: {{meeting_location}}\n\nAgenda:\n- Summary of audit scope and procedures\n- Discussion of preliminary findings\n- Management comments and feedback\n- Next steps and timelines\n\nPlease confirm your attendance.\n\nBest regards,\n{{auditor_name}}`,
    mergeFields: ['plan_title', 'recipient_name', 'meeting_date', 'meeting_time', 'meeting_location', 'auditor_name'],
    active: true
  }
];

// ============= ACTIVITY RESULTS =============

export const auditActivityResults: AuditActivityResult[] = [
  {
    id: 'res-001',
    activityId: 'act-001',
    observations: 'Payroll system generally well-controlled with automated calculations. Payment processing follows documented procedures.',
    findings: 'Three instances of late payments; two calculation errors affecting overtime inclusion.',
    complianceStatus: 'Partially Compliant',
    monetaryVariance: 1240,
    recommendation: 'Implement automated reminders and review payroll system configuration.',
    followUpRequired: true,
    completedDate: '2025-09-15',
    attachments: ['audit-workpapers-001.pdf']
  },
  {
    id: 'res-002',
    activityId: 'act-003',
    observations: 'New company with developing processes. Good cooperation from management during audit.',
    findings: 'Missing employment records for 3 employees; otherwise adequate documentation.',
    complianceStatus: 'Partially Compliant',
    monetaryVariance: 0,
    recommendation: 'Complete digitization project and implement document management policy.',
    followUpRequired: true,
    completedDate: '2025-09-10',
    attachments: ['audit-workpapers-003.pdf']
  }
];

// ============= FOLLOW-UPS =============

export const auditFollowUps: AuditFollowUp[] = [
  {
    id: 'fu-001',
    activityResultId: 'res-001',
    activityId: 'act-001',
    planId: 'plan-001',
    actionRequired: 'Correct payroll system configuration and process adjustments',
    dueDate: '2025-10-15',
    responsibleParty: 'Employer',
    responsibleName: 'Jane Doe, Payroll Manager - Caribbean Bank Ltd',
    status: 'In Progress',
    priority: 'High',
    description: 'Reconfigure payroll system to include all earning components in contribution calculations; process retrospective adjustments.'
  },
  {
    id: 'fu-002',
    activityResultId: 'res-001',
    activityId: 'act-001',
    planId: 'plan-001',
    actionRequired: 'Implement payment deadline monitoring system',
    dueDate: '2025-10-01',
    responsibleParty: 'Employer',
    responsibleName: 'HR Manager - Caribbean Bank Ltd',
    status: 'Open',
    priority: 'Medium',
    description: 'Set up automated calendar reminders and payment tracking for monthly contribution deadlines.'
  },
  {
    id: 'fu-003',
    activityResultId: 'res-002',
    activityId: 'act-003',
    planId: 'plan-001',
    actionRequired: 'Complete employee records digitization',
    dueDate: '2025-11-30',
    responsibleParty: 'Employer',
    responsibleName: 'HR Director - Tech Solutions Inc',
    status: 'Open',
    priority: 'Low',
    description: 'Finalize document management system migration and ensure all employee records are properly archived.'
  }
];

// ============= CALENDAR EVENTS =============

export const calendarEvents: CalendarEvent[] = [
  {
    id: 'evt-001',
    title: 'Caribbean Bank - Site Visit',
    start: '2025-09-15T09:00:00',
    end: '2025-09-15T17:00:00',
    type: 'activity',
    activityId: 'act-001',
    auditor: 'John Doe',
    employer: 'Caribbean Bank Ltd',
    status: 'Completed',
    location: '123 Main St, Basseterre'
  },
  {
    id: 'evt-002',
    title: 'Island Resort - Records Review',
    start: '2025-09-20T10:00:00',
    end: '2025-09-20T15:00:00',
    type: 'activity',
    activityId: 'act-002',
    auditor: 'Alice Smith',
    employer: 'Island Resort Hotels',
    status: 'In Progress',
    location: '456 Beach Road, Frigate Bay'
  },
  {
    id: 'evt-003',
    title: 'John Doe - Annual Leave',
    start: '2025-10-15T00:00:00',
    end: '2025-10-19T23:59:59',
    type: 'leave',
    auditor: 'John Doe',
    employer: '',
    status: 'Approved'
  },
  {
    id: 'evt-004',
    title: 'Follow-up Action Due',
    start: '2025-10-15T00:00:00',
    end: '2025-10-15T23:59:59',
    type: 'deadline',
    auditor: 'John Doe',
    employer: 'Caribbean Bank Ltd',
    status: 'Pending'
  },
  {
    id: 'evt-005',
    title: 'Benefits Department - Process Review',
    start: '2025-10-05T09:00:00',
    end: '2025-10-05T17:00:00',
    type: 'activity',
    activityId: 'act-004',
    auditor: 'John Doe',
    employer: 'Benefits Department',
    status: 'Planned',
    location: 'SSB Main Building - Floor 2'
  }
];
