/**
 * IA Phase 5 — stage grouping for the engagement workspace.
 *
 * PRESENTATION ONLY. The canonical tab vocabulary (workspaceTabs.ts) is
 * unchanged, every existing `?tab=` deep link still resolves, and no domain
 * record is merged. This module only decides which sections are shown together
 * and which group is emphasised for the engagement's current lifecycle stage.
 */
import type { EngagementWorkspaceTab } from './workspaceTabs';

export type EngagementStageGroup =
  | 'overview'
  | 'plan'
  | 'perform'
  | 'findings'
  | 'close';

export interface StageGroupDef {
  key: EngagementStageGroup;
  label: string;
  description: string;
  tabs: EngagementWorkspaceTab[];
}

/** Auditor-facing vocabulary. Database objects keep their canonical names. */
export const ENGAGEMENT_STAGE_GROUPS: StageGroupDef[] = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Where this audit stands and what to do next',
    tabs: ['overview'],
  },
  {
    key: 'plan',
    label: 'Plan & Prepare',
    description: 'Preparation and the audit programme',
    tabs: ['preparation', 'programme'],
  },
  {
    key: 'perform',
    label: 'Perform Audit',
    description: 'Procedures, testing, evidence and working papers',
    tabs: ['activities', 'programme', 'control-tests', 'evidence', 'working-papers'],
  },
  {
    key: 'findings',
    label: 'Findings & Management',
    description: 'Findings, management responses and corrective actions',
    tabs: ['findings', 'responses', 'actions', 'follow-ups'],
  },
  {
    key: 'close',
    label: 'Review & Close',
    description: 'Quality review, history and closure',
    tabs: ['quality-review', 'timeline', 'closure'],
  },
];

/** Section labels used in the grouped navigation. */
export const SECTION_LABELS: Record<EngagementWorkspaceTab, string> = {
  overview: 'Overview',
  preparation: 'Preparation',
  programme: 'Programme',
  activities: 'Activities',
  'control-tests': 'Procedures & Testing',
  evidence: 'Evidence',
  'working-papers': 'Working Papers',
  findings: 'Findings',
  responses: 'Responses',
  actions: 'Actions',
  'follow-ups': 'Follow-ups',
  'quality-review': 'Quality Review',
  timeline: 'Timeline',
  closure: 'Closure',
};

/**
 * The group a tab belongs to. `programme` appears in both Plan & Prepare and
 * Perform Audit; its home group depends on the engagement stage so the
 * highlighted group never disagrees with the section being displayed.
 */
export function groupForTab(
  tab: EngagementWorkspaceTab,
  currentGroup?: EngagementStageGroup,
): EngagementStageGroup {
  if (tab === 'programme') {
    return currentGroup === 'perform' ? 'perform' : 'plan';
  }
  const owner = ENGAGEMENT_STAGE_GROUPS.find((g) => g.tabs.includes(tab));
  return owner?.key ?? 'overview';
}

/** Lifecycle stage → the group that should be emphasised (prominence only). */
export function primaryGroupForStage(executionStatus?: string | null): EngagementStageGroup {
  switch ((executionStatus || 'Planned').trim()) {
    case 'Planned':
    case 'Ready for Launch':
    case 'Notification Sent':
    case 'Opening Meeting Scheduled':
      return 'plan';
    case 'Fieldwork In Progress':
      return 'perform';
    case 'Findings Drafting':
    case 'Management Response Pending':
      return 'findings';
    case 'Final Report Issued':
      return 'close';
    case 'Follow-up Monitoring':
      return 'findings';
    case 'Closed':
    case 'Cancelled':
    case 'Deferred':
      return 'close';
    default:
      return 'overview';
  }
}

/**
 * The section a user should land on when they open a group, given the stage.
 * Keeps grouping from becoming an extra click: opening "Perform Audit" during
 * fieldwork lands on testing, not on an index page.
 */
export function defaultTabForGroup(
  group: EngagementStageGroup,
  executionStatus?: string | null,
  allowed?: readonly string[],
): EngagementWorkspaceTab {
  const def = ENGAGEMENT_STAGE_GROUPS.find((g) => g.key === group) ?? ENGAGEMENT_STAGE_GROUPS[0];
  const preferred: Record<EngagementStageGroup, EngagementWorkspaceTab> = {
    overview: 'overview',
    plan:
      (executionStatus || 'Planned') === 'Planned' ? 'preparation' : 'programme',
    perform: 'control-tests',
    findings: 'findings',
    close: 'quality-review',
  };
  const candidates: EngagementWorkspaceTab[] = [preferred[group], ...def.tabs];
  const usable = candidates.find((t) => !allowed || allowed.includes(t));
  return usable ?? (def.tabs[0] as EngagementWorkspaceTab);
}

/** Groups still relevant to an engagement, in display order. */
export function visibleGroups(allowedTabs: readonly string[]): StageGroupDef[] {
  return ENGAGEMENT_STAGE_GROUPS.map((g) => ({
    ...g,
    tabs: g.tabs.filter((t) => allowedTabs.includes(t)),
  })).filter((g) => g.tabs.length > 0);
}
