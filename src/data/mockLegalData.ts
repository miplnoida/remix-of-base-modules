// Comprehensive mock data for SSB Legal module
import { MockCase } from './mockLegalCases';

export const mockLegalCases: MockCase[] = [
  {
    id: 'case-001',
    number: 'SSB/LGL/2024/001',
    title: 'SSB vs. Caribbean Construction Ltd. - Employer Arrears',
    type: 'Employer Arrears',
    status: 'Pending Hearing',
    stage: 'Summons Issued',
    parties: ['Social Security Board', 'Caribbean Construction Ltd.', 'John Williams (Director)'],
    assignee: 'Maria Rodriguez',
    priority: 'High',
    flags: ['Enforcement', 'Repeat Offender'],
    summary: 'Outstanding contributions totaling $45,200 for period Jan 2023 - Dec 2023. Summons to Appear (Form 37) issued on March 1, 2024.',
    relief_sought: 'Payment of outstanding contributions plus penalties and legal costs.',
    filed_at: '2024-01-15T09:00:00Z',
    next_event_at: '2024-04-20T10:00:00Z',
    age_days: 78,
    source: 'Compliance',
    enforcement_funnel: 'Summons',
    assigned_officers: ['Officer A', 'Officer B'],
    court_reference_number: 'CR-2024-001',
    activities: [
      { action: 'Summons to Appear issued', user: 'Maria Rodriguez', date: '2024-03-01T10:00:00Z' },
      { action: 'Legal Action Requisition approved', user: 'Director Legal', date: '2024-01-18T14:30:00Z' },
      { action: 'Case filed', user: 'Maria Rodriguez', date: '2024-01-15T09:00:00Z' }
    ],
    hearings: [
      { type: 'Preliminary Hearing', venue: 'Magistrate Court Room 1', date: '2024-04-20T10:00:00Z', notes: 'Initial appearance for non-payment case' }
    ]
  },
  {
    id: 'case-002',
    number: 'SSB/LGL/2024/002',
    title: 'SSB vs. Island Hospitality Services',
    type: 'Non-Compliance',
    status: 'Decision Pending',
    stage: 'Hearing Held',
    parties: ['Social Security Board', 'Island Hospitality Services', 'Amanda Thompson (Managing Director)'],
    assignee: 'Carlos Martinez',
    priority: 'Medium',
    flags: ['Late Registration'],
    summary: 'Failure to register 12 employees for social security coverage. Hearing held on March 15, 2024. Awaiting magistrate decision.',
    relief_sought: 'Compliance order for employee registration and payment of penalties.',
    filed_at: '2024-02-01T09:00:00Z',
    next_event_at: '2024-04-15T00:00:00Z',
    age_days: 62,
    source: 'Compliance',
    enforcement_funnel: 'Summons',
    assigned_officers: ['Officer C'],
    court_reference_number: 'CR-2024-002',
    activities: [
      { action: 'Hearing held', user: 'Carlos Martinez', date: '2024-03-15T10:00:00Z' },
      { action: 'Summons to Appear issued', user: 'Carlos Martinez', date: '2024-02-10T09:00:00Z' },
      { action: 'Case filed', user: 'Carlos Martinez', date: '2024-02-01T09:00:00Z' }
    ],
    hearings: [
      { type: 'Merits Hearing', venue: 'Magistrate Court Room 2', date: '2024-03-15T10:00:00Z', notes: 'Main hearing completed, decision expected within 30 days' }
    ]
  },
  {
    id: 'case-003',
    number: 'SSB/LGL/2023/045',
    title: 'SSB vs. Premier Auto Sales Ltd.',
    type: 'Non-Payment',
    status: 'Order Issued',
    stage: 'Judgment Summons',
    parties: ['Social Security Board', 'Premier Auto Sales Ltd.', 'Michael Johnson (Owner)'],
    assignee: 'Maria Rodriguez',
    priority: 'High',
    flags: ['Enforcement', 'Judgment Debt', 'Non-Compliant'],
    summary: 'Judgment obtained for $78,500 on November 2023. Defendant failed to comply. Judgment Summons (Form 40) issued to show cause.',
    relief_sought: 'Enforcement of judgment debt through commitment proceedings.',
    filed_at: '2023-08-10T09:00:00Z',
    next_event_at: '2024-04-10T09:00:00Z',
    age_days: 237,
    source: 'Compliance',
    enforcement_funnel: 'JDS',
    assigned_officers: ['Officer A', 'Officer D'],
    court_reference_number: 'CR-2023-045',
    activities: [
      { action: 'Judgment Summons issued', user: 'Maria Rodriguez', date: '2024-03-25T11:00:00Z' },
      { action: 'Judgment entered', user: 'Magistrate Court', date: '2023-11-15T15:00:00Z' },
      { action: 'Hearing held', user: 'Maria Rodriguez', date: '2023-10-20T10:00:00Z' }
    ],
    hearings: [
      { type: 'Judgment Summons Hearing', venue: 'Magistrate Court Room 1', date: '2024-04-10T09:00:00Z', notes: 'Show cause why not committed to prison for contempt' }
    ]
  },
  {
    id: 'case-004',
    number: 'SSB/LGL/2024/003',
    title: 'SSB vs. TechFlow Solutions Inc.',
    type: 'Non-Compliance',
    status: 'Under Review',
    stage: 'Pre-Filing',
    parties: ['Social Security Board', 'TechFlow Solutions Inc.'],
    assignee: 'Sarah Johnson',
    priority: 'Low',
    flags: [],
    summary: 'Alleged misclassification of 5 employees as contractors. Review of employment records ongoing.',
    relief_sought: 'Proper classification and payment of backdated contributions.',
    filed_at: '2024-03-10T09:00:00Z',
    next_event_at: '2024-04-05T14:00:00Z',
    age_days: 25,
    source: 'Benefits',
    enforcement_funnel: 'Summons',
    assigned_officers: ['Officer B', 'Officer C'],
    court_reference_number: 'CR-2024-003',
    activities: [
      { action: 'Documentation requested', user: 'Sarah Johnson', date: '2024-03-12T10:00:00Z' },
      { action: 'Case assigned', user: 'Director Legal', date: '2024-03-10T09:30:00Z' },
      { action: 'Complaint received', user: 'Compliance', date: '2024-03-10T09:00:00Z' }
    ],
    hearings: []
  },
  {
    id: 'case-005',
    number: 'SSB/LGL/2023/038',
    title: 'SSB vs. Green Valley Farms',
    type: 'Non-Payment',
    status: 'Closed – Compliant',
    stage: 'Settled',
    parties: ['Social Security Board', 'Green Valley Farms', 'Robert Green (Owner)'],
    assignee: 'Carlos Martinez',
    priority: 'Medium',
    flags: [],
    summary: 'Outstanding contributions of $22,000. Full payment received on March 20, 2024.',
    relief_sought: 'Payment of outstanding contributions.',
    filed_at: '2023-11-05T09:00:00Z',
    next_event_at: null,
    age_days: 151,
    source: 'Compliance',
    enforcement_funnel: 'Summons',
    assigned_officers: ['Officer D'],
    court_reference_number: 'CR-2023-038',
    activities: [
      { action: 'Case closed - full payment', user: 'Carlos Martinez', date: '2024-03-20T16:00:00Z' },
      { action: 'Payment plan agreed', user: 'Carlos Martinez', date: '2024-01-15T11:00:00Z' },
      { action: 'Summons issued', user: 'Carlos Martinez', date: '2023-11-20T09:00:00Z' }
    ],
    hearings: []
  },
  {
    id: 'case-006',
    number: 'SSB/LGL/2024/004',
    title: 'SSB vs. Sunset Beach Resort Ltd.',
    type: 'Non-Payment',
    status: 'Filed',
    stage: 'Awaiting Service',
    parties: ['Social Security Board', 'Sunset Beach Resort Ltd.', 'Patricia Williams (GM)'],
    assignee: 'Maria Rodriguez',
    priority: 'High',
    flags: ['Large Amount'],
    summary: 'Outstanding contributions of $125,000 for period 2022-2023. Legal Action Requisition approved.',
    relief_sought: 'Payment of outstanding contributions plus penalties.',
    filed_at: '2024-03-25T09:00:00Z',
    next_event_at: '2024-04-08T00:00:00Z',
    age_days: 10,
    source: 'Compliance',
    enforcement_funnel: 'Summons',
    assigned_officers: ['Officer A', 'Officer C', 'Officer D'],
    court_reference_number: 'CR-2024-004',
    activities: [
      { action: 'Summons prepared for service', user: 'Maria Rodriguez', date: '2024-03-28T10:00:00Z' },
      { action: 'Case filed', user: 'Maria Rodriguez', date: '2024-03-25T09:00:00Z' }
    ],
    hearings: []
  },
  {
    id: 'case-007',
    number: 'SSB/LGL/2023/052',
    title: 'SSB vs. Atlantic Shipping Co.',
    type: 'Non-Payment',
    status: 'Closed – Non-Compliant',
    stage: 'Warrant Executed',
    parties: ['Social Security Board', 'Atlantic Shipping Co.', 'David Miller (CEO)'],
    assignee: 'Sarah Johnson',
    priority: 'High',
    flags: ['Warrant of Commitment', 'Enforcement'],
    summary: 'Judgment debt of $95,000. Warrant of Commitment (Form 41) executed. Director served 14 days in prison. Debt partially satisfied.',
    relief_sought: 'Full payment of judgment debt.',
    filed_at: '2023-05-15T09:00:00Z',
    next_event_at: null,
    age_days: 324,
    source: 'Compliance',
    enforcement_funnel: 'Warrant',
    assigned_officers: ['Officer B', 'Officer D'],
    court_reference_number: 'CR-2023-052',
    activities: [
      { action: 'Case closed - partial satisfaction', user: 'Sarah Johnson', date: '2024-02-28T16:00:00Z' },
      { action: 'Warrant executed', user: 'Police Commissioner', date: '2024-01-10T08:00:00Z' },
      { action: 'Warrant of Commitment issued', user: 'Magistrate', date: '2023-12-15T11:00:00Z' }
    ],
    hearings: []
  },
  {
    id: 'case-008',
    number: 'SSB/LGL/2024/005',
    title: 'SSB vs. Modern Retail Outlets',
    type: 'Non-Compliance',
    status: 'Hearing Scheduled',
    stage: 'Summons Issued',
    parties: ['Social Security Board', 'Modern Retail Outlets'],
    assignee: 'Carlos Martinez',
    priority: 'Medium',
    flags: [],
    summary: 'Failure to submit monthly returns for 6 consecutive months.',
    relief_sought: 'Compliance order and submission of outstanding returns.',
    filed_at: '2024-02-20T09:00:00Z',
    next_event_at: '2024-04-18T14:00:00Z',
    age_days: 44,
    source: 'Benefits',
    enforcement_funnel: 'Summons',
    assigned_officers: ['Officer A', 'Officer B'],
    court_reference_number: 'CR-2024-005',
    activities: [
      { action: 'Hearing date set', user: 'Court Registrar', date: '2024-03-10T10:00:00Z' },
      { action: 'Summons issued', user: 'Carlos Martinez', date: '2024-03-01T09:00:00Z' },
      { action: 'Case filed', user: 'Carlos Martinez', date: '2024-02-20T09:00:00Z' }
    ],
    hearings: [
      { type: 'Preliminary Hearing', venue: 'Magistrate Court Room 3', date: '2024-04-18T14:00:00Z', notes: 'Compliance matter' }
    ]
  },
  {
    id: 'case-009',
    number: 'SSB/LGL/2024/006',
    title: 'SSB vs. Paradise Tours & Travel',
    type: 'Non-Payment',
    status: 'Appealed',
    stage: 'Appeal Pending',
    parties: ['Social Security Board', 'Paradise Tours & Travel', 'Lisa Anderson (Owner)'],
    assignee: 'Maria Rodriguez',
    priority: 'Medium',
    flags: ['Appeal'],
    summary: 'Judgment entered for $32,500. Defendant filed appeal to High Court on procedural grounds.',
    relief_sought: 'Enforcement of judgment subject to appeal outcome.',
    filed_at: '2023-10-05T09:00:00Z',
    next_event_at: '2024-05-12T09:00:00Z',
    age_days: 182,
    source: 'Other',
    enforcement_funnel: 'JDS',
    assigned_officers: ['Officer C', 'Officer D'],
    court_reference_number: 'CR-2023-106',
    activities: [
      { action: 'Appeal filed by defendant', user: 'Court Registry', date: '2024-02-15T10:00:00Z' },
      { action: 'Judgment entered', user: 'Magistrate', date: '2024-01-22T15:00:00Z' },
      { action: 'Hearing held', user: 'Maria Rodriguez', date: '2023-12-10T10:00:00Z' }
    ],
    hearings: []
  },
  {
    id: 'case-010',
    number: 'SSB/LGL/2024/007',
    title: 'SSB vs. Elite Security Services',
    type: 'Non-Payment',
    status: 'Under Review',
    stage: 'Enforcement Chain',
    parties: ['Social Security Board', 'Elite Security Services', 'Mark Thompson (Director)'],
    assignee: 'Sarah Johnson',
    priority: 'High',
    flags: ['Enforcement', 'Writ Pending'],
    summary: 'Judgment debt $68,000. Judgment Summons failed. Defendant showed means. Writ of Execution being prepared.',
    relief_sought: 'Recovery through seizure and sale of goods.',
    filed_at: '2023-09-20T09:00:00Z',
    next_event_at: '2024-04-05T00:00:00Z',
    age_days: 197,
    source: 'Compliance',
    enforcement_funnel: 'Writ',
    assigned_officers: ['Officer A', 'Officer D'],
    court_reference_number: 'CR-2023-187',
    activities: [
      { action: 'Writ of Execution drafted', user: 'Sarah Johnson', date: '2024-03-30T11:00:00Z' },
      { action: 'Judgment Summons failed - means proven', user: 'Magistrate', date: '2024-03-12T10:00:00Z' },
      { action: 'Judgment entered', user: 'Magistrate', date: '2023-12-05T15:00:00Z' }
    ],
    hearings: []
  },
  {
    id: 'case-011',
    number: 'SSB/LGL/2024/008',
    title: 'SSB vs. Coastal Fishing Co-op',
    type: 'Non-Compliance',
    status: 'Withdrawn',
    stage: 'Withdrawn',
    parties: ['Social Security Board', 'Coastal Fishing Co-op'],
    assignee: 'Carlos Martinez',
    priority: 'Low',
    flags: [],
    summary: 'Registration dispute. Matter resolved administratively. Case withdrawn.',
    relief_sought: 'None - administrative resolution achieved.',
    filed_at: '2024-02-28T09:00:00Z',
    next_event_at: null,
    age_days: 36,
    source: 'Benefits',
    enforcement_funnel: 'Summons',
    assigned_officers: ['Officer B'],
    court_reference_number: 'CR-2024-008',
    activities: [
      { action: 'Case withdrawn', user: 'Director Legal', date: '2024-03-22T14:00:00Z' },
      { action: 'Administrative settlement', user: 'Compliance Manager', date: '2024-03-20T10:00:00Z' },
      { action: 'Case filed', user: 'Carlos Martinez', date: '2024-02-28T09:00:00Z' }
    ],
    hearings: []
  },
  {
    id: 'case-012',
    number: 'SSB/LGL/2024/009',
    title: 'SSB vs. Mountain View Construction',
    type: 'Non-Payment',
    status: 'Reopened',
    stage: 'Compliance Review',
    parties: ['Social Security Board', 'Mountain View Construction', 'James Brown (Owner)'],
    assignee: 'Maria Rodriguez',
    priority: 'Medium',
    flags: ['Reopened', 'Payment Plan Breach'],
    summary: 'Previously closed case reopened due to breach of payment plan agreement. Outstanding balance $18,000.',
    relief_sought: 'Full payment of remaining debt.',
    filed_at: '2023-07-12T09:00:00Z',
    next_event_at: '2024-04-12T10:00:00Z',
    age_days: 267,
    source: 'Compliance',
    enforcement_funnel: 'JDS',
    assigned_officers: ['Officer A', 'Officer C'],
    court_reference_number: 'CR-2023-142',
    activities: [
      { action: 'Case reopened - payment plan breach', user: 'Maria Rodriguez', date: '2024-03-15T09:00:00Z' },
      { action: 'Case closed - payment plan', user: 'Maria Rodriguez', date: '2023-11-30T16:00:00Z' },
      { action: 'Payment plan agreed', user: 'Maria Rodriguez', date: '2023-09-20T11:00:00Z' }
    ],
    hearings: [
      { type: 'Compliance Review', venue: 'SSB Legal Office', date: '2024-04-12T10:00:00Z', notes: 'Review breach of payment plan' }
    ]
  }
];

// Helper function to get cases with full enforcement chain
export function getEnforcementChainCases() {
  return mockLegalCases.filter(c => 
    c.flags.some(f => ['Enforcement', 'Judgment Summons', 'Warrant of Commitment', 'Writ'].some(keyword => f.includes(keyword)))
  );
}

// Helper to compute metrics for reports
export function computeLegalMetrics(cases: MockCase[] = mockLegalCases) {
  const now = new Date();
  
  return {
    totalCases: cases.length,
    activeCases: cases.filter(c => !c.status.includes('Closed')).length,
    closedCases: cases.filter(c => c.status.includes('Closed')).length,
    avgAge: Math.round(cases.reduce((sum, c) => sum + c.age_days, 0) / cases.length),
    byType: cases.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byStatus: cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    enforcementPipeline: {
      summons: cases.filter(c => c.stage.includes('Summons')).length,
      judgmentSummons: cases.filter(c => c.flags.includes('Judgment Summons')).length,
      warrant: cases.filter(c => c.flags.includes('Warrant')).length,
      writ: cases.filter(c => c.flags.includes('Writ')).length
    }
  };
}
