export interface MockCase {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  stage: string;
  priority: string;
  parties: string[];
  assignee: string;
  filed_at: string;
  next_event_at: string | null;
  age_days: number;
  summary: string;
  relief_sought: string;
  flags: string[];
  activities: Array<{
    date: string;
    user: string;
    action: string;
  }>;
  hearings: Array<{
    date: string;
    type: string;
    venue: string;
    notes: string;
  }>;
}

export const mockCases: MockCase[] = [
  {
    id: '1',
    number: 'SSB-2025-001',
    title: 'Commonwealth Ltd. vs. Social Security Board - Contribution Dispute',
    type: 'Prosecution',
    status: 'Under Review',
    stage: 'Investigation',
    priority: 'High',
    parties: ['Commonwealth Ltd.', 'SSB'],
    assignee: 'Sarah Johnson',
    filed_at: '2025-01-15',
    next_event_at: '2025-04-10',
    age_days: 78,
    summary: 'Employer dispute regarding classification of workers as contractors versus employees. Significant contribution arrears identified during routine audit.',
    relief_sought: 'Recovery of unpaid contributions totaling $45,000 plus penalties and interest.',
    flags: ['High Value', 'Public Interest'],
    activities: [
      { date: '2025-03-25', user: 'Sarah Johnson', action: 'Updated case status to Under Review' },
      { date: '2025-03-20', user: 'Michael Chen', action: 'Uploaded payroll documentation' },
      { date: '2025-03-15', user: 'Sarah Johnson', action: 'Scheduled initial review meeting' }
    ],
    hearings: [
      {
        date: '2025-04-10',
        type: 'Preliminary Hearing',
        venue: 'SSB Conference Room A',
        notes: 'Review evidence and set timeline for submissions'
      }
    ]
  },
  {
    id: '2',
    number: 'SSB-2025-002',
    title: 'Paradise Hotel Group - Benefit Overpayment Recovery',
    type: 'Recovery',
    status: 'Hearing Scheduled',
    stage: 'Pre-Trial',
    priority: 'Medium',
    parties: ['Paradise Hotel Group', 'SSB', 'John Applicant'],
    assignee: 'Michael Chen',
    filed_at: '2024-11-20',
    next_event_at: '2025-04-05',
    age_days: 134,
    summary: 'Recovery action for overpayment of sickness benefits due to unreported return to work. Applicant continued receiving benefits while employed.',
    relief_sought: 'Repayment of $12,500 in overpaid benefits.',
    flags: ['Requires Mediation'],
    activities: [
      { date: '2025-03-28', user: 'Michael Chen', action: 'Hearing scheduled for April 5' },
      { date: '2025-03-10', user: 'Legal Assistant', action: 'Sent hearing notice to all parties' },
      { date: '2025-02-28', user: 'Michael Chen', action: 'Evidence package completed' }
    ],
    hearings: [
      {
        date: '2025-04-05',
        type: 'Settlement Conference',
        venue: 'High Court - Room 3',
        notes: 'Attempt resolution before formal trial'
      }
    ]
  },
  {
    id: '3',
    number: 'SSB-2025-003',
    title: 'TechStart Inc. - Penalty Assessment Appeal',
    type: 'Appeal',
    status: 'Decision Pending',
    stage: 'Under Advisement',
    priority: 'Low',
    parties: ['TechStart Inc.', 'SSB'],
    assignee: 'Sarah Johnson',
    filed_at: '2024-09-10',
    next_event_at: null,
    age_days: 205,
    summary: 'Appeal of penalty assessment for late filing of quarterly returns. Appellant claims technical issues prevented timely submission.',
    relief_sought: 'Reduction or waiver of $3,200 in late filing penalties.',
    flags: [],
    activities: [
      { date: '2025-03-22', user: 'Sarah Johnson', action: 'Final submissions received from both parties' },
      { date: '2025-03-01', user: 'Hearing Officer', action: 'Hearing concluded, decision reserved' },
      { date: '2025-02-15', user: 'Sarah Johnson', action: 'Evidence hearing conducted' }
    ],
    hearings: [
      {
        date: '2025-03-01',
        type: 'Final Hearing',
        venue: 'SSB Tribunal Room',
        notes: 'All evidence presented, awaiting decision'
      }
    ]
  }
];

export const savedViews = {
  myActive: (cases: MockCase[]) => 
    cases.filter(c => !c.status.startsWith('Closed') && c.status !== 'Withdrawn'),
  hearingThisWeek: (cases: MockCase[]) => 
    cases.filter(c => {
      if (!c.next_event_at) return false;
      const eventDate = new Date(c.next_event_at);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return eventDate >= today && eventDate <= weekFromNow;
    }),
  awaitingDecision: (cases: MockCase[]) => 
    cases.filter(c => c.status === 'Decision Pending' || c.stage === 'Under Advisement')
};
