import {
  ComplianceCase,
  CaseStatus,
  CaseType,
  ComplianceCaseStage,
  WeeklyPlan,
  WeeklyPlanStatus,
  PlannedVisit,
  FieldActivity,
  Notice,
  NoticeType,
  PaymentArrangement,
  InstallmentRecord,
  CaseStageHistory,
  ComplianceDashboardStats,
  Zone,
  Inspector
} from '@/types/compliance';

// ============================================
// ZONES
// ============================================
export const MOCK_ZONES: Zone[] = [
  {
    id: 'ZONE-001',
    zoneName: 'Zone 1 - Basseterre',
    zoneCode: 'Z1',
    parishes: ['Christ Church Nichola Town', 'Saint Anne Sandy Point', 'Saint George Basseterre'],
    assignedInspectors: ['INS-001', 'INS-002']
  },
  {
    id: 'ZONE-002',
    zoneName: 'Zone 2 - St. Peters',
    zoneCode: 'Z2',
    parishes: ['Saint John Capisterre', 'Saint Mary Cayon', 'Saint Peter Basseterre'],
    assignedInspectors: ['INS-003']
  },
  {
    id: 'ZONE-003',
    zoneName: 'Zone 3 - Nevis',
    zoneCode: 'Z3',
    parishes: ['Saint George Gingerland', 'Saint James Windward', 'Saint John Figtree', 'Saint Paul Charlestown', 'Saint Thomas Lowland'],
    assignedInspectors: ['INS-004', 'INS-005']
  }
];

// ============================================
// INSPECTORS
// ============================================
export const MOCK_INSPECTORS: Inspector[] = [
  {
    id: 'INS-001',
    name: 'James Martinez',
    email: 'james.martinez@ssb.kn',
    phone: '(869) 465-1234',
    assignedZones: ['ZONE-001'],
    isPrimary: true,
    activeFrom: '2023-01-15'
  },
  {
    id: 'INS-002',
    name: 'Sarah Thompson',
    email: 'sarah.thompson@ssb.kn',
    phone: '(869) 465-2345',
    assignedZones: ['ZONE-001'],
    isPrimary: false,
    activeFrom: '2023-03-20'
  },
  {
    id: 'INS-003',
    name: 'Michael Brown',
    email: 'michael.brown@ssb.kn',
    phone: '(869) 465-3456',
    assignedZones: ['ZONE-002'],
    isPrimary: true,
    activeFrom: '2022-11-10'
  },
  {
    id: 'INS-004',
    name: 'Jennifer Davis',
    email: 'jennifer.davis@ssb.kn',
    phone: '(869) 469-4567',
    assignedZones: ['ZONE-003'],
    isPrimary: true,
    activeFrom: '2023-02-01'
  },
  {
    id: 'INS-005',
    name: 'Robert Wilson',
    email: 'robert.wilson@ssb.kn',
    phone: '(869) 469-5678',
    assignedZones: ['ZONE-003'],
    isPrimary: false,
    activeFrom: '2023-06-15'
  }
];

// ============================================
// COMPLIANCE CASES
// ============================================
export const MOCK_CASES: ComplianceCase[] = [
  {
    id: 'CASE-2024-0001',
    caseNumber: 'CC-2024-0001',
    caseType: CaseType.C3_NOT_SUBMITTED,
    caseStatus: CaseStatus.ACTIVE,
    caseStage: ComplianceCaseStage.CSTG_NOTICE_2_ISSUED,
    employerId: 'EMP-10045',
    employerName: 'Paradise Beach Resort Ltd',
    employerZone: 'Zone 1 - Basseterre',
    linkedC3Periods: ['2024-01', '2024-02', '2024-03'],
    assignedInspectorId: 'INS-001',
    assignedInspectorName: 'James Martinez',
    assignedDate: '2024-02-15',
    principalAmount: 45000,
    penaltyAmount: 6750,
    interestAmount: 1200,
    totalAmountDue: 52950,
    amountPaid: 0,
    outstandingBalance: 52950,
    createdDate: '2024-02-01',
    dueDate: '2024-02-15',
    lastActivityDate: '2024-03-20',
    description: 'Employer failed to submit C3 for Jan, Feb, Mar 2024. Multiple notices issued.',
    priority: 'HIGH',
    tags: ['MISSING_C3', 'MULTIPLE_PERIODS', 'LARGE_EMPLOYER'],
    createdBy: 'SYSTEM',
    updatedBy: 'james.martinez',
    updatedDate: '2024-03-20'
  },
  {
    id: 'CASE-2024-0002',
    caseNumber: 'CC-2024-0002',
    caseType: CaseType.C3_SUBMITTED_NO_PAYMENT,
    caseStatus: CaseStatus.ARRANGEMENT_ACTIVE,
    caseStage: ComplianceCaseStage.CSTG_PAYMENT_ARRANGEMENT_ACTIVE,
    employerId: 'EMP-20078',
    employerName: 'Island Construction Co',
    employerZone: 'Zone 2 - St. Peters',
    linkedC3Periods: ['2023-11', '2023-12'],
    assignedInspectorId: 'INS-003',
    assignedInspectorName: 'Michael Brown',
    assignedDate: '2024-01-10',
    principalAmount: 28000,
    penaltyAmount: 3360,
    interestAmount: 650,
    totalAmountDue: 32010,
    amountPaid: 8000,
    outstandingBalance: 24010,
    createdDate: '2024-01-05',
    dueDate: '2024-01-20',
    lastActivityDate: '2024-03-15',
    description: 'C3 submitted but payment not received. Payment arrangement established.',
    priority: 'MEDIUM',
    tags: ['PAYMENT_ARRANGEMENT', 'GOOD_FAITH'],
    createdBy: 'SYSTEM',
    updatedBy: 'michael.brown',
    updatedDate: '2024-03-15'
  },
  {
    id: 'CASE-2024-0003',
    caseNumber: 'CC-2024-0003',
    caseType: CaseType.LATE_C3_SUBMISSION,
    caseStatus: CaseStatus.COMPLETED,
    caseStage: ComplianceCaseStage.CSTG_COMPLIANCE_VERIFIED_NO_ISSUE,
    employerId: 'EMP-15032',
    employerName: 'Tech Solutions Inc',
    employerZone: 'Zone 1 - Basseterre',
    linkedC3Periods: ['2024-02'],
    assignedInspectorId: 'INS-002',
    assignedInspectorName: 'Sarah Thompson',
    assignedDate: '2024-03-05',
    principalAmount: 12500,
    penaltyAmount: 625,
    interestAmount: 0,
    totalAmountDue: 13125,
    amountPaid: 13125,
    outstandingBalance: 0,
    createdDate: '2024-03-01',
    dueDate: '2024-03-15',
    lastActivityDate: '2024-03-18',
    closedDate: '2024-03-18',
    description: 'Late C3 submission. Penalty paid in full.',
    priority: 'LOW',
    tags: ['RESOLVED', 'PAID_IN_FULL'],
    createdBy: 'SYSTEM',
    updatedBy: 'sarah.thompson',
    updatedDate: '2024-03-18'
  },
  {
    id: 'CASE-2024-0004',
    caseNumber: 'CC-2024-0004',
    caseType: CaseType.ARREARS_CASE,
    caseStatus: CaseStatus.ESCALATED_LEGAL,
    caseStage: ComplianceCaseStage.CSTG_READY_FOR_LEGAL_ESCALATION,
    employerId: 'EMP-30091',
    employerName: 'Ocean View Hotel',
    employerZone: 'Zone 3 - Nevis',
    linkedC3Periods: ['2023-06', '2023-07', '2023-08', '2023-09', '2023-10', '2023-11', '2023-12'],
    assignedInspectorId: 'INS-004',
    assignedInspectorName: 'Jennifer Davis',
    assignedDate: '2023-07-20',
    principalAmount: 125000,
    penaltyAmount: 37500,
    interestAmount: 8750,
    totalAmountDue: 171250,
    amountPaid: 0,
    outstandingBalance: 171250,
    createdDate: '2023-07-15',
    dueDate: '2023-08-15',
    lastActivityDate: '2024-03-10',
    escalationDate: '2024-03-10',
    description: 'Persistent non-payment. Multiple arrangements defaulted. Ready for legal action.',
    priority: 'URGENT',
    tags: ['LEGAL_ESCALATION', 'PERSISTENT_DEFAULT', 'LARGE_ARREARS'],
    createdBy: 'SYSTEM',
    updatedBy: 'jennifer.davis',
    updatedDate: '2024-03-10'
  },
  {
    id: 'CASE-2024-0005',
    caseNumber: 'CC-2024-0005',
    caseType: CaseType.AUDIT_REQUIRED,
    caseStatus: CaseStatus.ACTIVE,
    caseStage: ComplianceCaseStage.CSTG_AUDIT_IN_PROGRESS,
    employerId: 'EMP-25067',
    employerName: 'Golden Rock Manufacturing',
    employerZone: 'Zone 2 - St. Peters',
    linkedC3Periods: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06'],
    assignedInspectorId: 'INS-003',
    assignedInspectorName: 'Michael Brown',
    assignedDate: '2024-01-15',
    principalAmount: 0,
    penaltyAmount: 0,
    interestAmount: 0,
    totalAmountDue: 0,
    amountPaid: 0,
    outstandingBalance: 0,
    createdDate: '2024-01-10',
    lastActivityDate: '2024-03-22',
    description: '18-month audit cycle due. Scheduled for comprehensive review.',
    priority: 'MEDIUM',
    tags: ['ROUTINE_AUDIT', 'SCHEDULED'],
    createdBy: 'SYSTEM',
    updatedBy: 'michael.brown',
    updatedDate: '2024-03-22'
  },
  {
    id: 'CASE-2024-0006',
    caseNumber: 'CC-2024-0006',
    caseType: CaseType.C3_VALIDATION_ERROR,
    caseStatus: CaseStatus.ACTIVE,
    caseStage: ComplianceCaseStage.CSTG_AWAITING_EMPLOYER_RESPONSE,
    employerId: 'EMP-18054',
    employerName: 'Sunshine Retail Ltd',
    employerZone: 'Zone 1 - Basseterre',
    linkedC3Periods: ['2024-02'],
    assignedInspectorId: 'INS-001',
    assignedInspectorName: 'James Martinez',
    assignedDate: '2024-03-08',
    principalAmount: 8500,
    penaltyAmount: 0,
    interestAmount: 0,
    totalAmountDue: 8500,
    amountPaid: 0,
    outstandingBalance: 8500,
    createdDate: '2024-03-05',
    dueDate: '2024-03-20',
    lastActivityDate: '2024-03-15',
    description: 'C3 validation errors: 3 invalid SSNs, 2 missing employee records.',
    priority: 'MEDIUM',
    tags: ['VALIDATION_ERROR', 'SSN_ISSUES'],
    createdBy: 'SYSTEM',
    updatedBy: 'james.martinez',
    updatedDate: '2024-03-15'
  },
  {
    id: 'CASE-2024-0007',
    caseNumber: 'CC-2024-0007',
    caseType: CaseType.PAYMENT_ARRANGEMENT_DEFAULT,
    caseStatus: CaseStatus.ACTIVE,
    caseStage: ComplianceCaseStage.CSTG_PAYMENT_ARRANGEMENT_DEFAULT,
    employerId: 'EMP-22081',
    employerName: 'Tropical Foods Distribution',
    employerZone: 'Zone 3 - Nevis',
    linkedC3Periods: ['2023-10', '2023-11'],
    assignedInspectorId: 'INS-004',
    assignedInspectorName: 'Jennifer Davis',
    assignedDate: '2024-02-01',
    principalAmount: 18000,
    penaltyAmount: 2160,
    interestAmount: 540,
    totalAmountDue: 20700,
    amountPaid: 4000,
    outstandingBalance: 16700,
    createdDate: '2023-11-10',
    dueDate: '2023-12-15',
    lastActivityDate: '2024-03-18',
    description: 'Payment arrangement defaulted. Missed 2 consecutive installments.',
    priority: 'HIGH',
    tags: ['ARRANGEMENT_DEFAULT', 'FOLLOW_UP_REQUIRED'],
    createdBy: 'SYSTEM',
    updatedBy: 'jennifer.davis',
    updatedDate: '2024-03-18'
  },
  {
    id: 'CASE-2024-0008',
    caseNumber: 'CC-2024-0008',
    caseType: CaseType.SCOUTING_UNREGISTERED_EMPLOYER,
    caseStatus: CaseStatus.ACTIVE,
    caseStage: ComplianceCaseStage.CSTG_INSPECTION_SCHEDULED,
    employerId: 'EMP-NEW-001',
    employerName: 'New Wave Café & Bar',
    employerZone: 'Zone 1 - Basseterre',
    assignedInspectorId: 'INS-002',
    assignedInspectorName: 'Sarah Thompson',
    assignedDate: '2024-03-12',
    principalAmount: 0,
    penaltyAmount: 0,
    interestAmount: 0,
    totalAmountDue: 0,
    amountPaid: 0,
    outstandingBalance: 0,
    createdDate: '2024-03-10',
    lastActivityDate: '2024-03-20',
    description: 'Unregistered employer identified during scouting. Operating with 8+ employees.',
    priority: 'HIGH',
    tags: ['SCOUTING', 'UNREGISTERED', 'NEW_EMPLOYER'],
    createdBy: 'sarah.thompson',
    updatedBy: 'sarah.thompson',
    updatedDate: '2024-03-20'
  }
];

// ============================================
// CASE STAGE HISTORY
// ============================================
export const MOCK_CASE_HISTORY: CaseStageHistory[] = [
  {
    id: 'HIST-001',
    caseId: 'CASE-2024-0001',
    toStage: ComplianceCaseStage.CSTG_NEW_CASE_CREATED,
    toStatus: CaseStatus.OPEN,
    changedDate: '2024-02-01T09:15:00Z',
    changedBy: 'SYSTEM',
    changedByName: 'System Auto-Generated',
    reason: 'Automatic case creation due to missing C3 submission for Jan 2024'
  },
  {
    id: 'HIST-002',
    caseId: 'CASE-2024-0001',
    fromStage: ComplianceCaseStage.CSTG_NEW_CASE_CREATED,
    toStage: ComplianceCaseStage.CSTG_ASSIGNED_TO_INSPECTOR,
    fromStatus: CaseStatus.OPEN,
    toStatus: CaseStatus.ACTIVE,
    changedDate: '2024-02-15T10:30:00Z',
    changedBy: 'supervisor-001',
    changedByName: 'David Chen',
    reason: 'Assigned to inspector based on zone'
  },
  {
    id: 'HIST-003',
    caseId: 'CASE-2024-0001',
    fromStage: ComplianceCaseStage.CSTG_ASSIGNED_TO_INSPECTOR,
    toStage: ComplianceCaseStage.CSTG_NOTICE_1_ISSUED,
    fromStatus: CaseStatus.ACTIVE,
    toStatus: CaseStatus.ACTIVE,
    changedDate: '2024-02-20T14:20:00Z',
    changedBy: 'james.martinez',
    changedByName: 'James Martinez',
    reason: 'First notice issued to employer',
    notes: 'Notice sent via registered mail and email'
  },
  {
    id: 'HIST-004',
    caseId: 'CASE-2024-0001',
    fromStage: ComplianceCaseStage.CSTG_NOTICE_1_ISSUED,
    toStage: ComplianceCaseStage.CSTG_NOTICE_2_ISSUED,
    fromStatus: CaseStatus.ACTIVE,
    toStatus: CaseStatus.ACTIVE,
    changedDate: '2024-03-20T11:45:00Z',
    changedBy: 'james.martinez',
    changedByName: 'James Martinez',
    reason: 'No response to first notice. Second notice issued.',
    notes: 'Employer contacted by phone on 2024-03-15. Promised to submit within 5 days.'
  }
];

// ============================================
// WEEKLY PLANS
// ============================================
export const MOCK_WEEKLY_PLANS: WeeklyPlan[] = [
  {
    id: 'PLAN-2024-W12-001',
    planNumber: 'WP-2024-W12-001',
    inspectorId: 'INS-001',
    inspectorName: 'James Martinez',
    weekStartDate: '2024-03-18',
    weekEndDate: '2024-03-22',
    status: WeeklyPlanStatus.PLAN_APPROVED,
    submittedDate: '2024-03-15T16:00:00Z',
    approvedDate: '2024-03-17T10:30:00Z',
    approvedBy: 'supervisor-001',
    approvedByName: 'David Chen',
    supervisorComments: 'Plan approved. Focus on high-priority cases first.',
    plannedVisits: [
      {
        id: 'VISIT-001',
        planId: 'PLAN-2024-W12-001',
        caseId: 'CASE-2024-0001',
        employerId: 'EMP-10045',
        employerName: 'Paradise Beach Resort Ltd',
        visitType: 'C3_FOLLOW_UP',
        scheduledDate: '2024-03-18',
        purpose: 'Follow-up on missing C3 submissions. Deliver second notice.',
        completed: true,
        completedDate: '2024-03-18T14:30:00Z',
        notes: 'Met with HR Manager. Employer committed to submitting by end of week.'
      },
      {
        id: 'VISIT-002',
        planId: 'PLAN-2024-W12-001',
        caseId: 'CASE-2024-0006',
        employerId: 'EMP-18054',
        employerName: 'Sunshine Retail Ltd',
        visitType: 'C3_FOLLOW_UP',
        scheduledDate: '2024-03-19',
        purpose: 'Review C3 validation errors and assist with corrections.',
        completed: true,
        completedDate: '2024-03-19T11:00:00Z',
        notes: 'Validated employee records. Employer will resubmit corrected C3.'
      },
      {
        id: 'VISIT-003',
        planId: 'PLAN-2024-W12-001',
        caseId: 'CASE-2024-0008',
        employerId: 'EMP-NEW-001',
        employerName: 'New Wave Café & Bar',
        visitType: 'SCOUTING',
        scheduledDate: '2024-03-20',
        purpose: 'Visit unregistered employer. Verify employee count and provide registration info.',
        completed: false
      },
      {
        id: 'VISIT-004',
        planId: 'PLAN-2024-W12-001',
        employerId: 'EMP-35012',
        employerName: 'Caribbean Motors Ltd',
        visitType: 'AUDIT',
        scheduledDate: '2024-03-21',
        purpose: 'Routine 18-month audit. Review employee records and C3 submissions.',
        completed: false
      },
      {
        id: 'VISIT-005',
        planId: 'PLAN-2024-W12-001',
        employerId: 'EMP-40023',
        employerName: 'Island Bakery',
        visitType: 'PAYMENT_FOLLOW_UP',
        scheduledDate: '2024-03-22',
        purpose: 'Follow up on outstanding payment for Feb 2024 C3.',
        completed: false
      }
    ],
    totalPlannedVisits: 5,
    completedVisits: 2,
    createdDate: '2024-03-14T09:00:00Z',
    createdBy: 'james.martinez',
    updatedDate: '2024-03-19T11:30:00Z'
  },
  {
    id: 'PLAN-2024-W12-002',
    planNumber: 'WP-2024-W12-002',
    inspectorId: 'INS-003',
    inspectorName: 'Michael Brown',
    weekStartDate: '2024-03-18',
    weekEndDate: '2024-03-22',
    status: WeeklyPlanStatus.PLAN_APPROVED,
    submittedDate: '2024-03-15T15:30:00Z',
    approvedDate: '2024-03-16T14:00:00Z',
    approvedBy: 'supervisor-001',
    approvedByName: 'David Chen',
    plannedVisits: [
      {
        id: 'VISIT-006',
        planId: 'PLAN-2024-W12-002',
        caseId: 'CASE-2024-0002',
        employerId: 'EMP-20078',
        employerName: 'Island Construction Co',
        visitType: 'PAYMENT_FOLLOW_UP',
        scheduledDate: '2024-03-18',
        purpose: 'Verify payment arrangement compliance. Collect installment.',
        completed: true,
        completedDate: '2024-03-18T10:15:00Z',
        notes: 'Payment received as scheduled. Employer up to date.'
      },
      {
        id: 'VISIT-007',
        planId: 'PLAN-2024-W12-002',
        caseId: 'CASE-2024-0005',
        employerId: 'EMP-25067',
        employerName: 'Golden Rock Manufacturing',
        visitType: 'AUDIT',
        scheduledDate: '2024-03-19',
        purpose: 'Continue comprehensive audit. Review Q1 2023 payroll records.',
        completed: false
      },
      {
        id: 'VISIT-008',
        planId: 'PLAN-2024-W12-002',
        employerId: 'EMP-50034',
        employerName: 'Tech Park Services',
        visitType: 'C3_FOLLOW_UP',
        scheduledDate: '2024-03-21',
        purpose: 'Late C3 submission follow-up.',
        completed: false
      }
    ],
    totalPlannedVisits: 3,
    completedVisits: 1,
    createdDate: '2024-03-14T08:30:00Z',
    createdBy: 'michael.brown',
    updatedDate: '2024-03-18T10:30:00Z'
  },
  {
    id: 'PLAN-2024-W13-001',
    planNumber: 'WP-2024-W13-001',
    inspectorId: 'INS-004',
    inspectorName: 'Jennifer Davis',
    weekStartDate: '2024-03-25',
    weekEndDate: '2024-03-29',
    status: WeeklyPlanStatus.PLAN_SUBMITTED,
    submittedDate: '2024-03-22T16:45:00Z',
    plannedVisits: [
      {
        id: 'VISIT-009',
        planId: 'PLAN-2024-W13-001',
        caseId: 'CASE-2024-0004',
        employerId: 'EMP-30091',
        employerName: 'Ocean View Hotel',
        visitType: 'PAYMENT_FOLLOW_UP',
        scheduledDate: '2024-03-25',
        purpose: 'Final attempt before legal escalation. Negotiate payment or immediate action.',
        completed: false
      },
      {
        id: 'VISIT-010',
        planId: 'PLAN-2024-W13-001',
        caseId: 'CASE-2024-0007',
        employerId: 'EMP-22081',
        employerName: 'Tropical Foods Distribution',
        visitType: 'PAYMENT_FOLLOW_UP',
        scheduledDate: '2024-03-26',
        purpose: 'Arrangement defaulted. Discuss immediate payment or reschedule.',
        completed: false
      },
      {
        id: 'VISIT-011',
        planId: 'PLAN-2024-W13-001',
        employerId: 'EMP-60045',
        employerName: 'Coastal Properties Ltd',
        visitType: 'AUDIT',
        scheduledDate: '2024-03-27',
        purpose: 'Scheduled audit. High-risk employer based on sector.',
        completed: false
      },
      {
        id: 'VISIT-012',
        planId: 'PLAN-2024-W13-001',
        employerId: 'EMP-70056',
        employerName: 'Island Medical Supplies',
        visitType: 'C3_FOLLOW_UP',
        scheduledDate: '2024-03-28',
        purpose: 'Missing C3 for Feb 2024.',
        completed: false
      }
    ],
    totalPlannedVisits: 4,
    completedVisits: 0,
    createdDate: '2024-03-21T14:00:00Z',
    createdBy: 'jennifer.davis'
  }
];

// ============================================
// NOTICES
// ============================================
export const MOCK_NOTICES: Notice[] = [
  {
    id: 'NOTICE-001',
    noticeNumber: 'CN-2024-0001',
    caseId: 'CASE-2024-0001',
    employerId: 'EMP-10045',
    employerName: 'Paradise Beach Resort Ltd',
    noticeType: NoticeType.C3_NOT_SUBMITTED,
    subject: 'First Notice - Missing C3 Submission for January 2024',
    body: 'This is to inform you that your C3 submission for January 2024 has not been received...',
    issuedDate: '2024-02-20T14:20:00Z',
    issuedBy: 'james.martinez',
    issuedByName: 'James Martinez',
    deliveryMethod: 'REGISTERED_MAIL',
    deliveryStatus: 'DELIVERED',
    deliveredDate: '2024-02-22T10:00:00Z',
    responseReceived: false,
    followUpRequired: true,
    followUpDate: '2024-03-05',
    followUpNotes: 'No response. Will issue second notice.'
  },
  {
    id: 'NOTICE-002',
    noticeNumber: 'CN-2024-0002',
    caseId: 'CASE-2024-0001',
    employerId: 'EMP-10045',
    employerName: 'Paradise Beach Resort Ltd',
    noticeType: NoticeType.C3_NOT_SUBMITTED,
    subject: 'Second Notice - Missing C3 Submissions for Jan, Feb, Mar 2024',
    body: 'This is a second notice regarding your outstanding C3 submissions...',
    issuedDate: '2024-03-20T11:45:00Z',
    issuedBy: 'james.martinez',
    issuedByName: 'James Martinez',
    deliveryMethod: 'HAND_DELIVERED',
    deliveryStatus: 'DELIVERED',
    deliveredDate: '2024-03-20T14:30:00Z',
    responseReceived: true,
    responseDate: '2024-03-20T14:30:00Z',
    responseNotes: 'HR Manager acknowledged notice. Committed to submitting C3s by end of week.',
    followUpRequired: true,
    followUpDate: '2024-03-25',
    followUpNotes: 'Follow up to ensure submission.'
  },
  {
    id: 'NOTICE-003',
    noticeNumber: 'CN-2024-0003',
    caseId: 'CASE-2024-0002',
    employerId: 'EMP-20078',
    employerName: 'Island Construction Co',
    noticeType: NoticeType.PAYMENT_NOT_RECEIVED,
    subject: 'Payment Not Received - C3 Nov & Dec 2023',
    body: 'Your C3 submissions were received, however payment has not been received...',
    issuedDate: '2024-01-10T09:00:00Z',
    issuedBy: 'michael.brown',
    issuedByName: 'Michael Brown',
    deliveryMethod: 'EMAIL',
    deliveryStatus: 'DELIVERED',
    deliveredDate: '2024-01-10T09:05:00Z',
    responseReceived: true,
    responseDate: '2024-01-12T15:30:00Z',
    responseNotes: 'Employer requested payment arrangement due to cash flow issues.',
    followUpRequired: false
  },
  {
    id: 'NOTICE-004',
    noticeNumber: 'CN-2024-0004',
    caseId: 'CASE-2024-0004',
    employerId: 'EMP-30091',
    employerName: 'Ocean View Hotel',
    noticeType: NoticeType.LEGAL_WARNING,
    subject: 'Final Notice - Legal Action Imminent',
    body: 'Despite multiple attempts to resolve your outstanding arrears...',
    issuedDate: '2024-03-10T10:00:00Z',
    issuedBy: 'jennifer.davis',
    issuedByName: 'Jennifer Davis',
    deliveryMethod: 'REGISTERED_MAIL',
    deliveryStatus: 'DELIVERED',
    deliveredDate: '2024-03-12T11:30:00Z',
    responseReceived: false,
    followUpRequired: true,
    followUpDate: '2024-03-25',
    followUpNotes: 'Final field visit scheduled. If no payment, escalate to Legal.'
  }
];

// ============================================
// PAYMENT ARRANGEMENTS
// ============================================
export const MOCK_ARRANGEMENTS: PaymentArrangement[] = [
  {
    id: 'ARR-2024-001',
    arrangementNumber: 'PA-2024-001',
    caseId: 'CASE-2024-0002',
    employerId: 'EMP-20078',
    employerName: 'Island Construction Co',
    totalDebtAmount: 32010,
    downPaymentAmount: 8000,
    downPaymentPaid: true,
    downPaymentDate: '2024-01-20',
    installmentAmount: 4000,
    numberOfInstallments: 6,
    totalInstallmentAmount: 24000,
    frequency: 'MONTHLY',
    startDate: '2024-02-01',
    endDate: '2024-07-01',
    nextDueDate: '2024-04-01',
    status: 'ACTIVE',
    installmentsPaid: 2,
    installmentsOverdue: 0,
    totalPaid: 16000,
    outstandingBalance: 16010,
    terms: 'Employer agrees to pay $8,000 down payment followed by 6 monthly installments of $4,000.',
    conditions: [
      'All current C3 submissions must be filed on time',
      'Current monthly contributions must be paid in addition to installments',
      'Failure to pay 2 consecutive installments will result in arrangement default'
    ],
    requiresCurrentPayments: true,
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'michael.brown',
    approvedDate: '2024-01-18T14:30:00Z',
    approvedBy: 'supervisor-001',
    approvedByName: 'David Chen',
    agreementSigned: true,
    signedDate: '2024-01-20T11:00:00Z',
    missedInstallments: []
  },
  {
    id: 'ARR-2024-002',
    arrangementNumber: 'PA-2024-002',
    caseId: 'CASE-2024-0007',
    employerId: 'EMP-22081',
    employerName: 'Tropical Foods Distribution',
    totalDebtAmount: 20700,
    downPaymentAmount: 4000,
    downPaymentPaid: true,
    downPaymentDate: '2024-02-01',
    installmentAmount: 2500,
    numberOfInstallments: 7,
    totalInstallmentAmount: 17500,
    frequency: 'MONTHLY',
    startDate: '2024-02-15',
    endDate: '2024-09-15',
    nextDueDate: '2024-04-15',
    status: 'DEFAULTED',
    installmentsPaid: 0,
    installmentsOverdue: 2,
    totalPaid: 4000,
    outstandingBalance: 16700,
    terms: 'Employer agrees to pay $4,000 down payment followed by 7 monthly installments of $2,500.',
    conditions: [
      'All current C3 submissions must be filed on time',
      'Current monthly contributions must be paid in addition to installments',
      'Failure to pay 2 consecutive installments will result in arrangement default'
    ],
    requiresCurrentPayments: true,
    createdDate: '2024-01-25T09:00:00Z',
    createdBy: 'jennifer.davis',
    approvedDate: '2024-01-28T16:00:00Z',
    approvedBy: 'supervisor-001',
    approvedByName: 'David Chen',
    agreementSigned: true,
    signedDate: '2024-02-01T10:30:00Z',
    defaultDate: '2024-03-18',
    defaultReason: 'Missed Feb and Mar installments. No contact from employer.',
    missedInstallments: [
      {
        id: 'INST-007',
        arrangementId: 'ARR-2024-002',
        installmentNumber: 1,
        dueDate: '2024-02-15',
        amount: 2500,
        paid: false,
        overdue: true,
        daysPastDue: 32
      },
      {
        id: 'INST-008',
        arrangementId: 'ARR-2024-002',
        installmentNumber: 2,
        dueDate: '2024-03-15',
        amount: 2500,
        paid: false,
        overdue: true,
        daysPastDue: 3
      }
    ]
  }
];

// ============================================
// DASHBOARD STATS
// ============================================
export const MOCK_DASHBOARD_STATS: ComplianceDashboardStats = {
  totalCases: 47,
  casesByStatus: {
    [CaseStatus.OPEN]: 5,
    [CaseStatus.ACTIVE]: 24,
    [CaseStatus.ON_HOLD]: 3,
    [CaseStatus.ARRANGEMENT_ACTIVE]: 8,
    [CaseStatus.ESCALATED_LEGAL]: 2,
    [CaseStatus.COMPLETED]: 4,
    [CaseStatus.CLOSED_NO_ACTION]: 1,
    [CaseStatus.CANCELLED]: 0,
    [CaseStatus.ARCHIVED]: 0
  },
  casesByType: {
    [CaseType.LATE_C3_SUBMISSION]: 12,
    [CaseType.C3_NOT_SUBMITTED]: 8,
    [CaseType.C3_SUBMITTED_NO_PAYMENT]: 14,
    [CaseType.C3_VALIDATION_ERROR]: 5,
    [CaseType.ARREARS_CASE]: 4,
    [CaseType.PAYMENT_ARRANGEMENT_DEFAULT]: 2,
    [CaseType.SCOUTING_UNREGISTERED_EMPLOYER]: 1,
    [CaseType.AUDIT_REQUIRED]: 1
  },
  casesCreatedThisMonth: 12,
  casesClosedThisMonth: 4,
  totalEmployers: 547,
  compliantEmployers: 498,
  nonCompliantEmployers: 49,
  complianceRate: 91.0,
  totalArrears: 487250,
  arrearsCollectedThisMonth: 52300,
  activeArrangements: 8,
  defaultedArrangements: 2,
  totalInspectors: 5,
  approvedPlansThisWeek: 3,
  completedVisitsThisWeek: 18,
  pendingVisits: 22,
  casesEscalatedToLegal: 2,
  casesEscalatedThisMonth: 1
};

// ============================================
// FIELD ACTIVITIES
// ============================================
export const mockFieldActivities = [
  {
    id: 'FA-001',
    planId: 'PLAN-2024-W12-001',
    caseId: 'CASE-2024-001',
    caseNumber: 'C-2024-001',
    employerId: 'EMP-001',
    employerName: 'ABC Construction Ltd',
    visitType: 'Audit Inspection',
    planReference: 'PLAN-2024-W12-001',
    checkInTime: '09:15 AM',
    checkOutTime: null,
    status: 'in_progress',
    evidenceCount: 5,
    workingPapers: 2
  },
  {
    id: 'FA-002',
    planId: 'PLAN-2024-W12-001',
    caseId: 'CASE-2024-003',
    caseNumber: 'C-2024-003',
    employerId: 'EMP-003',
    employerName: 'Island Enterprises',
    visitType: 'C3 Compliance Check',
    planReference: 'PLAN-2024-W12-001',
    checkInTime: '08:30 AM',
    checkOutTime: '11:45 AM',
    status: 'completed',
    evidenceCount: 8,
    workingPapers: 3
  }
];

// ============================================
// EMPLOYER STATEMENTS
// ============================================
export const mockEmployerStatements = [
  {
    id: 'STMT-001',
    employerId: 'EMP-001',
    employerName: 'ABC Construction Ltd',
    asOfDate: '2024-03-15',
    c3Submitted: 32,
    c3Missing: 4,
    totalDue: 45000,
    penalties: 3200,
    outstanding: 18500,
    complianceStatus: 'non_compliant' as const,
    arrangementStatus: 'Active - On Track',
    nextPaymentDue: '2024-04-15'
  },
  {
    id: 'STMT-002',
    employerId: 'EMP-002',
    employerName: 'XYZ Trading Inc',
    asOfDate: '2024-03-15',
    c3Submitted: 36,
    c3Missing: 0,
    totalDue: 0,
    penalties: 0,
    outstanding: 0,
    complianceStatus: 'compliant' as const,
    arrangementStatus: null,
    nextPaymentDue: null
  }
];

// ============================================
// COMPLIANCE SETTINGS
// ============================================
export const mockComplianceSettings = {
  c3GracePeriodDays: 5,
  c3SubmissionDeadlineDay: 15,
  paymentDueDateDay: 20,
  penaltyRatePercent: 2.5,
  interestRatePercent: 1.5,
  penaltyCalculationFrequency: 'monthly' as const,
  minimumAuditFrequencyMonths: 18,
  arrearsEscalationThreshold: 50000,
  autoCaseCreationRules: [
    {
      triggerEvent: 'C3 Submitted After Grace Period',
      caseType: 'LATE_C3_SUBMISSION',
      enabled: true
    },
    {
      triggerEvent: 'C3 Not Submitted By Cutoff',
      caseType: 'C3_NOT_SUBMITTED',
      enabled: true
    },
    {
      triggerEvent: 'Payment Not Received',
      caseType: 'C3_SUBMITTED_NO_PAYMENT',
      enabled: true
    },
    {
      triggerEvent: 'Validation Errors Detected',
      caseType: 'C3_VALIDATION_ERROR',
      enabled: true
    },
    {
      triggerEvent: 'Arrears Exceed Threshold',
      caseType: 'ARREARS_CASE',
      enabled: true
    }
  ]
};
