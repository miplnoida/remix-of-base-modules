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

import { mockLegalCases } from './mockLegalData';

export const mockCases: MockCase[] = mockLegalCases;

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
