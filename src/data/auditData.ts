import { 
  Zone, Department, Employer, Auditor, AuditorWorkload, AuditorAvailability, 
  Holiday, LeaveRequest, AuditPlan, AuditPlanEmployer, AuditActivity, 
  Finding, ManagementResponse, ActionTracking, Evidence, DocumentTemplate,
  AuditActivityResult, AuditFollowUp, CalendarEvent 
} from '@/types/audit';

// ============= ZONES & DEPARTMENTS =============

export const zones: Zone[] = [
  { id: 'zone-a', name: 'Zone A', description: 'Central Business District' },
  { id: 'zone-b', name: 'Zone B', description: 'Industrial Area' },
  { id: 'zone-c', name: 'Zone C', description: 'Residential and Commercial' }
];

export const departments: Department[] = [
  { id: 'dept-benefits', name: 'Benefits Department', head: 'Sarah Williams', email: 'depthead.benefits@ssb.kn', location: 'Main Building - Floor 2', riskRating: 'High' },
  { id: 'dept-contributions', name: 'Contributions Department', head: 'Michael Brown', email: 'michael.brown@ssb.kn', location: 'Main Building - Floor 3', riskRating: 'High' },
  { id: 'dept-finance', name: 'Finance & Accounts Payable', head: 'Jennifer Davis', email: 'jennifer.davis@ssb.kn', location: 'Main Building - Floor 1', riskRating: 'High' },
  { id: 'dept-it', name: 'IT Department', head: 'Robert Johnson', email: 'robert.johnson@ssb.kn', location: 'Annex Building', riskRating: 'Medium' },
  { id: 'dept-hr', name: 'Human Resources', head: 'Lisa Martinez', email: 'lisa.martinez@ssb.kn', location: 'Main Building - Floor 4', riskRating: 'Low' },
  { id: 'dept-compliance', name: 'Compliance & Legal', head: 'David Thompson', email: 'david.thompson@ssb.kn', location: 'Main Building - Floor 5', riskRating: 'Medium' }
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
    planId: 'plan-001',
    employerId: 'emp-001',
    name: 'Caribbean Bank Payroll Audit',
    description: 'Comprehensive on-site audit of payroll and contribution compliance',
    controlArea: 'Contributions',
    type: 'Site Visit',
    evidenceExpected: ['Payroll registers', 'Contribution calculations', 'Payment receipts', 'Employee records'],
    assignedAuditors: ['auditor1@ssb.kn'],
    title: 'Caribbean Bank Ltd - Compliance Review',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    startDate: '2025-09-15T09:00:00',
    endDate: '2025-09-15T17:00:00',
    plannedDateFrom: '2025-09-15T09:00:00',
    plannedDateTo: '2025-09-15T17:00:00',
    actualDateFrom: '2025-09-15T09:00:00',
    actualDateTo: '2025-09-15T17:00:00',
    location: '123 Main St, Basseterre',
    status: 'Completed',
    priority: 'High'
  },
  {
    id: 'act-002',
    planId: 'plan-001',
    employerId: 'emp-002',
    name: 'Island Resort Payroll Review',
    description: 'Review of payroll records and contribution calculations',
    controlArea: 'Contributions',
    type: 'Records Review',
    evidenceExpected: ['Monthly payroll summaries', 'C3 forms', 'Payment confirmations'],
    assignedAuditors: ['auditor2@ssb.kn'],
    title: 'Island Resort Hotels - Payroll Verification',
    auditor: 'auditor2@ssb.kn',
    auditorName: 'Alice Smith',
    startDate: '2025-09-20T10:00:00',
    endDate: '2025-09-20T15:00:00',
    plannedDateFrom: '2025-09-20T10:00:00',
    plannedDateTo: '2025-09-20T15:00:00',
    location: '456 Beach Road, Frigate Bay',
    status: 'In Progress',
    priority: 'Medium'
  },
  {
    id: 'act-003',
    planId: 'plan-001',
    employerId: 'emp-005',
    name: 'Tech Solutions Contribution Audit',
    description: 'Verification of contribution remittances and employee records',
    controlArea: 'Contributions',
    type: 'Contribution Verification',
    evidenceExpected: ['Employee contracts', 'Payroll reports', 'Bank statements', 'C3 submissions'],
    assignedAuditors: ['auditor1@ssb.kn'],
    title: 'Tech Solutions Inc - Contribution Audit',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    startDate: '2025-09-10T08:30:00',
    endDate: '2025-09-10T16:30:00',
    plannedDateFrom: '2025-09-10T08:30:00',
    plannedDateTo: '2025-09-10T16:30:00',
    actualDateFrom: '2025-09-10T08:30:00',
    actualDateTo: '2025-09-10T16:30:00',
    location: '654 IT Park, Basseterre',
    status: 'Completed',
    priority: 'High'
  },
  {
    id: 'act-004',
    planId: 'plan-002',
    deptId: 'dept-benefits',
    name: 'Benefits Processing Control Review',
    description: 'Evaluation of claims processing controls and workflows',
    controlArea: 'Benefits',
    type: 'Records Review',
    evidenceExpected: ['Process documentation', 'Sample claims files', 'Approval records'],
    assignedAuditors: ['auditor1@ssb.kn', 'auditor2@ssb.kn'],
    title: 'Benefits Department - Process Controls',
    auditor: 'auditor1@ssb.kn',
    auditorName: 'John Doe',
    startDate: '2025-10-05T09:00:00',
    endDate: '2025-10-05T17:00:00',
    plannedDateFrom: '2025-10-05T09:00:00',
    plannedDateTo: '2025-10-05T17:00:00',
    location: 'SSB Main Building - Floor 2',
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
    recommendation: 'Implement automated payment reminders and calendar alerts for contribution deadlines',
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
    recommendation: 'Review and update payroll system configuration; process adjustment for affected employees',
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
    recommendation: 'Complete digitization of employee records and implement document retention policy',
    riskRating: 'Low',
    impactArea: 'Operational',
    ownerRole: 'HR Director - Tech Solutions Inc',
    status: 'Under Review',
    createdBy: 'auditor1@ssb.kn',
    createdDate: '2025-09-10'
  }
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
