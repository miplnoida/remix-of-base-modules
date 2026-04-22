// ============================================
// SMART DRAFT ENGINE — Auto-populate weekly plan
// ============================================

import { PlanCandidate, CreatePlanItemRequest, PlanItemDuration } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Capacity constants (in hours)
const MAX_HOURS_PER_DAY = 7;
const MAX_ITEMS_PER_DAY = 5;
const MAX_TOTAL_ITEMS = 20; // Reasonable weekly limit

// Duration estimates in hours
function estimateHours(itemType: string, duration?: string): number {
  if (duration === PlanItemDuration.FULL_DAY) return 7;
  if (duration === PlanItemDuration.HALF_DAY_AM || duration === PlanItemDuration.HALF_DAY_PM) return 3;
  if (duration === PlanItemDuration.SHORT) return 1;
  switch (itemType) {
    case 'EMPLOYER_VISIT': return 2;
    case 'SCOUTING': return 3;
    case 'CALL': return 0.5;
    case 'DESK_REVIEW': return 1.5;
    case 'NOTICE_FOLLOW_UP': return 1;
    case 'MEETING': return 1.5;
    default: return 2;
  }
}

function getTimeBlock(itemType: string): 'AM' | 'PM' | 'FLEXIBLE' {
  switch (itemType) {
    case 'EMPLOYER_VISIT':
    case 'SCOUTING':
      return 'AM';
    case 'CALL':
    case 'DESK_REVIEW':
    case 'NOTICE_FOLLOW_UP':
      return 'FLEXIBLE';
    case 'MEETING':
      return 'PM';
    default:
      return 'FLEXIBLE';
  }
}

// Phase 2: Mandatory / overdue ALWAYS schedule first.
// Lower number = higher priority.
function prioritySortOrder(candidate: PlanCandidate): number {
  const desc = (candidate.description ?? '').toUpperCase();
  const status = (candidate.source_status ?? '').toUpperCase();

  // Tier 0: Mandatory high-risk reviews & legal stage
  if (status === 'MANDATORY_HIGH_RISK_REVIEW' || status === 'LEGAL_STAGE_TRIGGER') return 0;
  // Tier 1: overdue (by due_date or routine cycle due)
  if (candidate.due_date) {
    const daysUntilDue = Math.ceil(
      (new Date(candidate.due_date).getTime() - Date.now()) / 86400000
    );
    if (daysUntilDue < 0) return 1;
    if (daysUntilDue <= 7) return 2;
  }
  if (status === 'ROUTINE_CYCLE_DUE' || status === 'ARRANGEMENT_BREACH') return 1;
  if (status === 'POST_ENFORCEMENT_RECHECK' || status === 'COMPLAINT_DRIVEN_AUDIT') return 2;
  // Tier by derived priority
  switch (candidate.priority) {
    case 'CRITICAL': return 3;
    case 'HIGH': return 4;
    case 'MEDIUM': return 5;
    case 'LOW': return 7;
    default: return 6;
  }
}

export type UrgencyBucket =
  | 'OVERDUE'
  | 'DUE_THIS_WEEK'
  | 'MANDATORY'
  | 'CARRY_FORWARD'
  | 'ASSIGNED_VIOLATIONS'
  | 'SCHEDULED_CALLS'
  | 'ZONE_VISITS'
  | 'SCOUTING_LEADS';

export function classifyCandidate(c: PlanCandidate): UrgencyBucket {
  if (c.due_date) {
    const daysUntilDue = Math.ceil(
      (new Date(c.due_date).getTime() - Date.now()) / 86400000
    );
    if (daysUntilDue < 0) return 'OVERDUE';
    if (daysUntilDue <= 7) return 'DUE_THIS_WEEK';
  }
  if (c.source_type === 'CARRY_FORWARD') return 'CARRY_FORWARD';
  if (c.source_type === 'VIOLATION') return 'ASSIGNED_VIOLATIONS';
  if (c.source_type === 'NOTICE') return 'DUE_THIS_WEEK';
  if (c.source_type === 'FOLLOW_UP') return 'SCHEDULED_CALLS';
  if (c.source_type === 'SCOUTING_LEAD') return 'SCOUTING_LEADS';
  if (c.source_type === 'CASE') return 'ZONE_VISITS';
  return 'ZONE_VISITS';
}

export interface DayCapacity {
  day: DayOfWeek;
  amUsed: number;
  pmUsed: number;
  flexUsed: number;
  totalUsed: number;
  items: DraftItem[];
}

export interface DraftItem {
  candidate: PlanCandidate;
  day: DayOfWeek;
  timeBlock: 'AM' | 'PM' | 'FLEXIBLE';
  estimatedHours: number;
  itemType: string;
}

export interface SmartDraftResult {
  draftItems: DraftItem[];
  unscheduled: PlanCandidate[];
  dayCapacities: Record<DayOfWeek, DayCapacity>;
  warnings: string[];
}

export function generateSmartDraft(
  candidates: PlanCandidate[],
  alreadyAddedSourceIds: Set<string | null>
): SmartDraftResult {
  const available = candidates.filter(c => !alreadyAddedSourceIds.has(c.source_id));

  // Sort by priority
  const sorted = [...available].sort((a, b) => {
    const pa = prioritySortOrder(a);
    const pb = prioritySortOrder(b);
    if (pa !== pb) return pa - pb;
    return (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0);
  });

  const dayCapacities: Record<DayOfWeek, DayCapacity> = {} as any;
  for (const day of DAYS) {
    dayCapacities[day] = { day, amUsed: 0, pmUsed: 0, flexUsed: 0, totalUsed: 0, items: [] };
  }

  const draftItems: DraftItem[] = [];
  const unscheduled: PlanCandidate[] = [];
  const warnings: string[] = [];
  const territoryDayMap: Record<string, DayOfWeek> = {};

  // Only schedule up to MAX_TOTAL_ITEMS
  const toSchedule = sorted.slice(0, MAX_TOTAL_ITEMS);
  const overflow = sorted.slice(MAX_TOTAL_ITEMS);

  for (const candidate of toSchedule) {
    const itemType = candidate.source_type === 'SCOUTING_LEAD' ? 'SCOUTING' :
      candidate.source_type === 'FOLLOW_UP' ? 'CALL' :
      candidate.source_type === 'NOTICE' ? 'NOTICE_FOLLOW_UP' :
      'EMPLOYER_VISIT';

    const hours = estimateHours(itemType);
    const preferredBlock = getTimeBlock(itemType);
    let assignedDay: DayOfWeek | null = null;

    // Prefer territory clustering
    const territory = candidate.territory || '';
    if (territory && territoryDayMap[territory]) {
      const preferredDay = territoryDayMap[territory];
      if (canFitOnDay(dayCapacities[preferredDay], hours, preferredBlock)) {
        assignedDay = preferredDay;
      }
    }

    // Find least-loaded day that can fit
    if (!assignedDay) {
      const sortedDays = [...DAYS].sort(
        (a, b) => dayCapacities[a].totalUsed - dayCapacities[b].totalUsed
      );
      for (const day of sortedDays) {
        if (canFitOnDay(dayCapacities[day], hours, preferredBlock)) {
          assignedDay = day;
          break;
        }
      }
    }

    if (assignedDay) {
      const cap = dayCapacities[assignedDay];
      const actualBlock = fitInBlock(cap, hours, preferredBlock);

      if (actualBlock === 'AM') cap.amUsed += hours;
      else if (actualBlock === 'PM') cap.pmUsed += hours;
      else cap.flexUsed += hours;
      cap.totalUsed += hours;

      cap.items.push({
        candidate, day: assignedDay, timeBlock: actualBlock,
        estimatedHours: hours, itemType,
      });
      draftItems.push(cap.items[cap.items.length - 1]);

      if (territory) territoryDayMap[territory] = assignedDay;
    } else {
      unscheduled.push(candidate);
    }
  }

  // All overflow goes to unscheduled
  unscheduled.push(...overflow);

  for (const day of DAYS) {
    const cap = dayCapacities[day];
    if (cap.totalUsed > MAX_HOURS_PER_DAY) {
      warnings.push(`${day} is over capacity (${cap.totalUsed.toFixed(1)}h / ${MAX_HOURS_PER_DAY}h)`);
    }
  }

  if (unscheduled.length > 0) {
    warnings.push(`${unscheduled.length} items remain in suggestions for manual review`);
  }

  return { draftItems, unscheduled, dayCapacities, warnings };
}

function canFitOnDay(cap: DayCapacity, hours: number, block: 'AM' | 'PM' | 'FLEXIBLE'): boolean {
  if (cap.totalUsed + hours > MAX_HOURS_PER_DAY) return false;
  if (cap.items.length >= MAX_ITEMS_PER_DAY) return false;
  return true;
}

function fitInBlock(cap: DayCapacity, hours: number, preferred: 'AM' | 'PM' | 'FLEXIBLE'): 'AM' | 'PM' | 'FLEXIBLE' {
  if (preferred === 'AM' && cap.amUsed + hours <= 4) return 'AM';
  if (preferred === 'PM' && cap.pmUsed + hours <= 4) return 'PM';
  if (cap.amUsed + hours <= 4) return 'AM';
  if (cap.pmUsed + hours <= 4) return 'PM';
  return 'FLEXIBLE';
}

export function draftToRequests(
  draftItems: DraftItem[],
  _planId: string,
  weekDays: { name: DayOfWeek; date: string }[],
  _createdBy: string
): Omit<CreatePlanItemRequest, 'plan_id' | 'created_by'>[] {
  return draftItems.map(draft => {
    const dayInfo = weekDays.find(d => d.name === draft.day);
    let startTime: string | undefined;
    let endTime: string | undefined;
    if (draft.timeBlock === 'AM') {
      startTime = '08:00';
      endTime = `${String(8 + Math.min(Math.round(draft.estimatedHours), 4)).padStart(2, '0')}:00`;
    } else if (draft.timeBlock === 'PM') {
      startTime = '13:00';
      endTime = `${String(13 + Math.min(Math.round(draft.estimatedHours), 4)).padStart(2, '0')}:00`;
    }

    return {
      item_type: draft.itemType,
      day_of_week: draft.day,
      scheduled_date: dayInfo?.date,
      scheduled_start_time: startTime,
      scheduled_end_time: endTime,
      duration: draft.estimatedHours >= 7 ? PlanItemDuration.FULL_DAY :
        draft.timeBlock === 'AM' ? PlanItemDuration.HALF_DAY_AM :
        draft.timeBlock === 'PM' ? PlanItemDuration.HALF_DAY_PM :
        PlanItemDuration.SHORT,
      source_type: draft.candidate.source_type,
      source_id: draft.candidate.source_id,
      source_ref: draft.candidate.source_ref,
      employer_id: draft.candidate.employer_id || undefined,
      employer_name: draft.candidate.employer_name || undefined,
      territory: draft.candidate.territory || undefined,
      priority: draft.candidate.priority || 'MEDIUM',
      recommendation_score: draft.candidate.recommendation_score,
      purpose: draft.candidate.description,
      is_mandatory: draft.candidate.priority === 'CRITICAL' ||
        classifyCandidate(draft.candidate) === 'OVERDUE',
    };
  });
}
