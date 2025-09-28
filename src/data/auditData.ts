import { Zone, Employer, AuditPlan, AuditPlanEmployer, AuditActivity, AuditActivityResult, AuditFollowUp, CalendarEvent } from '@/types/audit';

export const zones: Zone[] = [
  { id: 'zone-a', name: 'Zone A', description: 'Central Business District' },
  { id: 'zone-b', name: 'Zone B', description: 'Industrial Area' },
  { id: 'zone-c', name: 'Zone C', description: 'Residential and Commercial' }
];

export const employers: Employer[] = [
  // Zone A Employers
  { id: 'emp-001', name: 'Caribbean Bank Ltd', registrationNumber: 'REG-2020-001', zone: 'zone-a', status: 'Active', address: '123 Main St, Basseterre', contactPerson: 'John Smith', phone: '(869) 465-1234', email: 'hr@caribbank.com' },
  { id: 'emp-002', name: 'Island Resort Hotels', registrationNumber: 'REG-2019-045', zone: 'zone-a', status: 'Active', address: '456 Beach Road, Frigate Bay', contactPerson: 'Mary Johnson', phone: '(869) 465-5678', email: 'admin@islandresort.com' },
  { id: 'emp-003', name: 'St. Kitts Trading Co.', registrationNumber: 'REG-2021-012', zone: 'zone-a', status: 'Active', address: '789 Commerce Ave, Basseterre', contactPerson: 'Robert Davis', phone: '(869) 465-9012', email: 'contact@skttrading.com' },
  { id: 'emp-004', name: 'Medical Center SKN', registrationNumber: 'REG-2018-067', zone: 'zone-a', status: 'Active', address: '321 Hospital Road, Basseterre', contactPerson: 'Dr. Lisa Brown', phone: '(869) 465-3456', email: 'admin@medcenter.com' },
  { id: 'emp-005', name: 'Tech Solutions Inc.', registrationNumber: 'REG-2022-089', zone: 'zone-a', status: 'Active', address: '654 IT Park, Basseterre', contactPerson: 'Michael Wilson', phone: '(869) 465-7890', email: 'hr@techsolutions.com' },
  { id: 'emp-006', name: 'Island Foods Ltd', registrationNumber: 'REG-2020-034', zone: 'zone-a', status: 'Active', address: '987 Market St, Basseterre', contactPerson: 'Sarah Miller', phone: '(869) 465-2345', email: 'admin@islandfoods.com' },
  { id: 'emp-007', name: 'Construction Plus', registrationNumber: 'REG-2019-078', zone: 'zone-a', status: 'Active', address: '147 Build Ave, Basseterre', contactPerson: 'James Taylor', phone: '(869) 465-6789', email: 'office@constructionplus.com' },
  { id: 'emp-008', name: 'Legal Services Group', registrationNumber: 'REG-2021-056', zone: 'zone-a', status: 'Active', address: '258 Law Street, Basseterre', contactPerson: 'Jennifer Anderson', phone: '(869) 465-0123', email: 'admin@legalservices.com' },
  { id: 'emp-009', name: 'Education Excellence', registrationNumber: 'REG-2020-023', zone: 'zone-a', status: 'Active', address: '369 School Road, Basseterre', contactPerson: 'David Martinez', phone: '(869) 465-4567', email: 'hr@educationexcellence.com' },
  { id: 'emp-010', name: 'Financial Advisors Ltd', registrationNumber: 'REG-2022-045', zone: 'zone-a', status: 'Active', address: '741 Finance Way, Basseterre', contactPerson: 'Patricia Garcia', phone: '(869) 465-8901', email: 'contact@finadvisors.com' },

  // Zone B Employers
  { id: 'emp-011', name: 'Industrial Manufacturing', registrationNumber: 'REG-2019-102', zone: 'zone-b', status: 'Active', address: '123 Factory St, Industrial Park', contactPerson: 'Mark Thompson', phone: '(869) 466-1111', email: 'hr@indmfg.com' },
  { id: 'emp-012', name: 'Port Authority SKN', registrationNumber: 'REG-2018-001', zone: 'zone-b', status: 'Active', address: '456 Port Road, Zante', contactPerson: 'Carol White', phone: '(869) 466-2222', email: 'admin@portauth.com' },
  { id: 'emp-013', name: 'Logistics Solutions', registrationNumber: 'REG-2021-087', zone: 'zone-b', status: 'Active', address: '789 Warehouse Ave, Industrial Park', contactPerson: 'Kevin Lee', phone: '(869) 466-3333', email: 'operations@logistics.com' },
  { id: 'emp-014', name: 'Power Generation Co.', registrationNumber: 'REG-2020-054', zone: 'zone-b', status: 'Active', address: '321 Energy St, Industrial Park', contactPerson: 'Linda Clark', phone: '(869) 466-4444', email: 'hr@powergen.com' },
  { id: 'emp-015', name: 'Textile Industries', registrationNumber: 'REG-2019-076', zone: 'zone-b', status: 'Active', address: '654 Fabric Road, Industrial Park', contactPerson: 'Steve Rodriguez', phone: '(869) 466-5555', email: 'admin@textile.com' },
  { id: 'emp-016', name: 'Chemical Processing', registrationNumber: 'REG-2022-012', zone: 'zone-b', status: 'Active', address: '987 Chemical Ave, Industrial Park', contactPerson: 'Nancy Lewis', phone: '(869) 466-6666', email: 'safety@chemical.com' },
  { id: 'emp-017', name: 'Metal Works Ltd', registrationNumber: 'REG-2020-098', zone: 'zone-b', status: 'Active', address: '147 Steel St, Industrial Park', contactPerson: 'Brian Walker', phone: '(869) 466-7777', email: 'hr@metalworks.com' },
  { id: 'emp-018', name: 'Food Processing Co.', registrationNumber: 'REG-2021-034', zone: 'zone-b', status: 'Active', address: '258 Process Road, Industrial Park', contactPerson: 'Diana Hall', phone: '(869) 466-8888', email: 'admin@foodprocess.com' },
  { id: 'emp-019', name: 'Packaging Solutions', registrationNumber: 'REG-2019-089', zone: 'zone-b', status: 'Active', address: '369 Pack Ave, Industrial Park', contactPerson: 'Thomas Young', phone: '(869) 466-9999', email: 'operations@packaging.com' },
  { id: 'emp-020', name: 'Transport Services', registrationNumber: 'REG-2022-067', zone: 'zone-b', status: 'Active', address: '741 Transport Way, Industrial Park', contactPerson: 'Michelle King', phone: '(869) 466-0000', email: 'dispatch@transport.com' },

  // Zone C Employers
  { id: 'emp-021', name: 'Retail Chain SKN', registrationNumber: 'REG-2020-111', zone: 'zone-c', status: 'Active', address: '123 Shopping St, Charlestown', contactPerson: 'Andrew Wright', phone: '(869) 467-1111', email: 'hr@retailchain.com' },
  { id: 'emp-022', name: 'Community Health Center', registrationNumber: 'REG-2018-023', zone: 'zone-c', status: 'Active', address: '456 Health Ave, Charlestown', contactPerson: 'Rachel Green', phone: '(869) 467-2222', email: 'admin@healthcenter.com' },
  { id: 'emp-023', name: 'Real Estate Group', registrationNumber: 'REG-2021-045', zone: 'zone-c', status: 'Active', address: '789 Property Road, Charlestown', contactPerson: 'Daniel Adams', phone: '(869) 467-3333', email: 'office@realestate.com' },
  { id: 'emp-024', name: 'Insurance Brokers', registrationNumber: 'REG-2019-034', zone: 'zone-c', status: 'Active', address: '321 Insurance St, Charlestown', contactPerson: 'Emily Baker', phone: '(869) 467-4444', email: 'contact@insurance.com' },
  { id: 'emp-025', name: 'Auto Services Ltd', registrationNumber: 'REG-2022-078', zone: 'zone-c', status: 'Active', address: '654 Garage Road, Charlestown', contactPerson: 'Chris Nelson', phone: '(869) 467-5555', email: 'service@autoservices.com' },
  { id: 'emp-026', name: 'Restaurant Group', registrationNumber: 'REG-2020-067', zone: 'zone-c', status: 'Active', address: '987 Dining Ave, Charlestown', contactPerson: 'Angela Carter', phone: '(869) 467-6666', email: 'admin@restaurant.com' },
  { id: 'emp-027', name: 'Beauty Services', registrationNumber: 'REG-2021-089', zone: 'zone-c', status: 'Active', address: '147 Beauty St, Charlestown', contactPerson: 'Jessica Mitchell', phone: '(869) 467-7777', email: 'booking@beautyservices.com' },
  { id: 'emp-028', name: 'Sports & Recreation', registrationNumber: 'REG-2019-012', zone: 'zone-c', status: 'Active', address: '258 Sports Road, Charlestown', contactPerson: 'Matthew Perez', phone: '(869) 467-8888', email: 'info@sportsrec.com' },
  { id: 'emp-029', name: 'Entertainment Co.', registrationNumber: 'REG-2022-034', zone: 'zone-c', status: 'Active', address: '369 Event Ave, Charlestown', contactPerson: 'Stephanie Roberts', phone: '(869) 467-9999', email: 'events@entertainment.com' },
  { id: 'emp-030', name: 'Tourism Board', registrationNumber: 'REG-2020-045', zone: 'zone-c', status: 'Active', address: '741 Tourism Way, Charlestown', contactPerson: 'Gregory Turner', phone: '(869) 467-0000', email: 'info@tourism.com' }
];

export const auditPlans: AuditPlan[] = [
  {
    id: 'plan-001',
    period: 'Monthly',
    monthYear: 'September 2025',
    zone: 'zone-a',
    status: 'In Progress',
    createdBy: 'audit.officer1@secureserve.gov',
    createdDate: '2025-08-15',
    submittedDate: '2025-08-20',
    approvedDate: '2025-08-25',
    approver: 'audit.manager1@secureserve.gov',
    approvalComments: 'Approved with priority on high-risk employers',
    totalEmployers: 10,
    assignedEmployers: 5
  },
  {
    id: 'plan-002',
    period: 'Monthly',
    monthYear: 'October 2025',
    zone: 'zone-b',
    status: 'Draft',
    createdBy: 'audit.officer1@secureserve.gov',
    createdDate: '2025-09-01',
    totalEmployers: 10,
    assignedEmployers: 0
  }
];

export const auditPlanEmployers: AuditPlanEmployer[] = [
  {
    id: 'pe-001',
    planId: 'plan-001',
    employerId: 'emp-001',
    employer: employers.find(e => e.id === 'emp-001')!,
    riskRating: 'High',
    rationale: 'Large financial institution with complex payroll',
    auditor: 'auditor.jdoe@secureserve.gov',
    auditorName: 'John Doe',
    status: 'In Progress'
  },
  {
    id: 'pe-002',
    planId: 'plan-001',
    employerId: 'emp-002',
    employer: employers.find(e => e.id === 'emp-002')!,
    riskRating: 'Medium',
    rationale: 'Tourism sector with seasonal employment variations',
    auditor: 'auditor.asmith@secureserve.gov',
    auditorName: 'Alice Smith',
    status: 'Assigned'
  },
  {
    id: 'pe-003',
    planId: 'plan-001',
    employerId: 'emp-003',
    employer: employers.find(e => e.id === 'emp-003')!,
    riskRating: 'Medium',
    rationale: 'Trading company with multiple locations',
    auditor: 'auditor.jdoe@secureserve.gov',
    auditorName: 'John Doe',
    status: 'Assigned'
  },
  {
    id: 'pe-004',
    planId: 'plan-001',
    employerId: 'emp-004',
    employer: employers.find(e => e.id === 'emp-004')!,
    riskRating: 'Low',
    rationale: 'Medical facility with standard payroll practices',
    auditor: 'auditor.asmith@secureserve.gov',
    auditorName: 'Alice Smith',
    status: 'Assigned'
  },
  {
    id: 'pe-005',
    planId: 'plan-001',
    employerId: 'emp-005',
    employer: employers.find(e => e.id === 'emp-005')!,
    riskRating: 'High',
    rationale: 'New technology company with complex compensation structures',
    auditor: 'auditor.jdoe@secureserve.gov',
    auditorName: 'John Doe',
    status: 'Completed'
  }
];

export const auditActivities: AuditActivity[] = [
  {
    id: 'act-001',
    planId: 'plan-001',
    employerId: 'emp-001',
    auditor: 'auditor.jdoe@secureserve.gov',
    auditorName: 'John Doe',
    type: 'Site Visit',
    title: 'Caribbean Bank Ltd - Compliance Review',
    description: 'Comprehensive on-site audit of payroll and contribution compliance',
    startDate: '2025-09-15T09:00:00',
    endDate: '2025-09-15T17:00:00',
    location: '123 Main St, Basseterre',
    status: 'Completed',
    priority: 'High'
  },
  {
    id: 'act-002',
    planId: 'plan-001',
    employerId: 'emp-002',
    auditor: 'auditor.asmith@secureserve.gov',
    auditorName: 'Alice Smith',
    type: 'Records Review',
    title: 'Island Resort Hotels - Payroll Verification',
    description: 'Review of payroll records and contribution calculations',
    startDate: '2025-09-20T10:00:00',
    endDate: '2025-09-20T15:00:00',
    location: '456 Beach Road, Frigate Bay',
    status: 'In Progress',
    priority: 'Medium'
  },
  {
    id: 'act-003',
    planId: 'plan-001',
    employerId: 'emp-005',
    auditor: 'auditor.jdoe@secureserve.gov',
    auditorName: 'John Doe',
    type: 'Contribution Verification',
    title: 'Tech Solutions Inc - Contribution Audit',
    description: 'Verification of contribution remittances and employee records',
    startDate: '2025-09-10T08:30:00',
    endDate: '2025-09-10T16:30:00',
    location: '654 IT Park, Basseterre',
    status: 'Completed',
    priority: 'High'
  }
];

export const auditActivityResults: AuditActivityResult[] = [
  {
    id: 'res-001',
    activityId: 'act-001',
    observations: 'Overall good compliance with minor discrepancies in overtime calculations',
    findings: 'Found 3 instances of incorrect overtime contribution calculations totaling $450. Employee records are well maintained.',
    complianceStatus: 'Partially Compliant',
    monetaryVariance: 450,
    recommendation: 'Employer should review overtime calculation procedures and submit corrective payment within 30 days',
    followUpRequired: true,
    completedDate: '2025-09-15',
    attachments: ['payroll_sample.pdf', 'variance_report.xlsx']
  },
  {
    id: 'res-002',
    activityId: 'act-003',
    observations: 'Excellent record keeping and timely contribution remittances',
    findings: 'All contribution calculations are accurate. Employee classifications are correct. No discrepancies found.',
    complianceStatus: 'Compliant',
    monetaryVariance: 0,
    recommendation: 'Continue current practices. Commendable compliance standards.',
    followUpRequired: false,
    completedDate: '2025-09-10',
    attachments: ['compliance_certificate.pdf']
  }
];

export const auditFollowUps: AuditFollowUp[] = [
  {
    id: 'fu-001',
    activityResultId: 'res-001',
    activityId: 'act-001',
    planId: 'plan-001',
    actionRequired: 'Submit corrective payment for overtime contribution discrepancies',
    dueDate: '2025-10-15',
    responsibleParty: 'Employer',
    responsibleName: 'John Smith - Caribbean Bank Ltd',
    status: 'Open',
    priority: 'Medium',
    description: 'Employer must calculate and remit $450 in outstanding overtime contributions identified during audit'
  },
  {
    id: 'fu-002',
    activityResultId: 'res-001',
    activityId: 'act-001',
    planId: 'plan-001',
    actionRequired: 'Provide updated overtime calculation procedures',
    dueDate: '2025-10-30',
    responsibleParty: 'Employer',
    responsibleName: 'John Smith - Caribbean Bank Ltd',
    status: 'In Progress',
    priority: 'Low',
    description: 'Submit revised internal procedures for overtime contribution calculations to prevent future discrepancies'
  }
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: 'cal-001',
    title: 'Caribbean Bank Ltd - Site Visit',
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
    id: 'cal-002',
    title: 'Island Resort Hotels - Records Review',
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
    id: 'cal-003',
    title: 'Follow-up Payment Due',
    start: '2025-10-15T09:00:00',
    end: '2025-10-15T09:00:00',
    type: 'deadline',
    auditor: 'John Doe',
    employer: 'Caribbean Bank Ltd',
    status: 'Pending'
  }
];