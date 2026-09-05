/**
 * IA Phase 5 — deterministic tests for stage grouping and My Work bucketing.
 * U1–U8 (grouping / prominence / deep-link integrity) and U9–U12 (buckets).
 */
import { describe, it, expect } from 'vitest';
import { ENGAGEMENT_WORKSPACE_TABS, ENGAGEMENT_MANAGEMENT_TABS } from '../workspaceTabs';
import {
  ENGAGEMENT_STAGE_GROUPS,
  SECTION_LABELS,
  defaultTabForGroup,
  groupForTab,
  primaryGroupForStage,
  visibleGroups,
} from '../engagementStages';
import { groupMyWork, type MyWorkItem } from '@/hooks/audit/useIAMyWork';

describe('engagement stage grouping', () => {
  it('U1 — every canonical section stays reachable through exactly one home group', () => {
    for (const tab of ENGAGEMENT_WORKSPACE_TABS) {
      const group = groupForTab(tab);
      expect(ENGAGEMENT_STAGE_GROUPS.some((g) => g.key === group)).toBe(true);
    }
    const covered = new Set(ENGAGEMENT_STAGE_GROUPS.flatMap((g) => g.tabs));
    for (const tab of ENGAGEMENT_WORKSPACE_TABS) expect(covered.has(tab)).toBe(true);
  });

  it('U2 — grouping adds no new tab names (deep links unchanged)', () => {
    for (const group of ENGAGEMENT_STAGE_GROUPS) {
      for (const tab of group.tabs) {
        expect(ENGAGEMENT_WORKSPACE_TABS).toContain(tab);
      }
    }
  });

  it('U3 — every section has a human label', () => {
    for (const tab of ENGAGEMENT_WORKSPACE_TABS) {
      expect(SECTION_LABELS[tab]).toBeTruthy();
    }
  });

  it('U4 — the emphasised group tracks the lifecycle stage', () => {
    expect(primaryGroupForStage('Planned')).toBe('plan');
    expect(primaryGroupForStage('Fieldwork In Progress')).toBe('perform');
    expect(primaryGroupForStage('Findings Drafting')).toBe('findings');
    expect(primaryGroupForStage('Management Response Pending')).toBe('findings');
    expect(primaryGroupForStage('Final Report Issued')).toBe('close');
    expect(primaryGroupForStage('Closed')).toBe('close');
    expect(primaryGroupForStage(null)).toBe('plan');
  });

  it('U5 — opening a group lands on real work, not an index page', () => {
    expect(defaultTabForGroup('perform', 'Fieldwork In Progress')).toBe('control-tests');
    expect(defaultTabForGroup('plan', 'Planned')).toBe('preparation');
    expect(defaultTabForGroup('plan', 'Fieldwork In Progress')).toBe('programme');
    expect(defaultTabForGroup('findings', 'Findings Drafting')).toBe('findings');
    expect(defaultTabForGroup('close', 'Closed')).toBe('quality-review');
  });

  it('U6 — the highlighted group never disagrees with the open section', () => {
    expect(groupForTab('programme', 'perform')).toBe('perform');
    expect(groupForTab('programme', 'plan')).toBe('plan');
    expect(groupForTab('evidence')).toBe('perform');
    expect(groupForTab('closure')).toBe('close');
  });

  it('U7 — management respondents only ever see their permitted groups/sections', () => {
    const groups = visibleGroups(ENGAGEMENT_MANAGEMENT_TABS);
    const exposed = groups.flatMap((g) => g.tabs);
    for (const privileged of ['evidence', 'working-papers', 'quality-review', 'closure', 'programme', 'preparation']) {
      expect(exposed).not.toContain(privileged as never);
    }
    for (const tab of exposed) expect(ENGAGEMENT_MANAGEMENT_TABS).toContain(tab as never);
  });

  it('U8 — group defaults respect the allowed-tab restriction', () => {
    expect(defaultTabForGroup('perform', 'Fieldwork In Progress', ENGAGEMENT_MANAGEMENT_TABS))
      .toBe('activities');
    expect(defaultTabForGroup('findings', 'Findings Drafting', ENGAGEMENT_MANAGEMENT_TABS))
      .toBe('findings');
  });
});

function item(partial: Partial<MyWorkItem>): MyWorkItem {
  return {
    required_action: 'Do something',
    reference: 'REF-1',
    audit: 'Audit A',
    stage: 'Fieldwork',
    status: 'Open',
    severity: null,
    due_date: null,
    overdue_days: 0,
    engagement_id: 'e1',
    record_id: Math.random().toString(36).slice(2),
    link: '/audit/audits/e1',
    ...partial,
  };
}

describe('My Work bucketing', () => {
  it('U9 — review work is separated from own work', () => {
    const b = groupMyWork([
      item({ stage: 'Fieldwork' }),
      item({ stage: 'Quality Review' }),
      item({ stage: 'Fieldwork Review' }),
    ]);
    expect(b.needsMyAction).toHaveLength(1);
    expect(b.needsReview).toHaveLength(2);
  });

  it('U10 — work owned by management/action owners is Waiting On Others', () => {
    const b = groupMyWork([
      item({ stage: 'Responses' }),
      item({ stage: 'Corrective Actions' }),
      item({ stage: 'Follow-Up' }),
      item({ stage: 'Preparation' }),
    ]);
    expect(b.waitingOnOthers).toHaveLength(3);
    expect(b.needsMyAction).toHaveLength(1);
  });

  it('U11 — waiting-on-others never counts as the auditor own action list', () => {
    const b = groupMyWork([item({ stage: 'Responses', overdue_days: 12 })]);
    expect(b.needsMyAction).toHaveLength(0);
    expect(b.waitingOnOthers[0].overdue_days).toBe(12);
  });

  it('U12 — Due Soon covers only actionable work inside 7 days', () => {
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const b = groupMyWork([
      item({ stage: 'Fieldwork', due_date: soon }),
      item({ stage: 'Fieldwork', due_date: later }),
      item({ stage: 'Responses', due_date: soon }),
      item({ stage: 'Fieldwork' }),
    ]);
    expect(b.dueSoon).toHaveLength(1);
    expect(b.all).toHaveLength(4);
  });
});
