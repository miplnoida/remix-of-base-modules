// ============================================
// SMART DRAFT ENGINE — Auto-populate weekly plan
// ============================================

import { PlanCandidate, CreatePlanItemRequest, PlanItemDuration } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Capacity constants (in hours)
const MAX_HOURS_PER_DAY = 8;
const AM_HOURS = 4;  // 08:00–12:00
const PM_HOURS = 4;  // 13:00–17:00

// Duration estimates in hours
function estimateHours(itemType: string, duration?: string): number {
  if (duration === PlanItemDuration.FULL_DAY) return 7;
  if (duration === PlanItemDuration.HALF_DAY_AM || duration === PlanItemDuration.HALF_DAY_PM) return 3.5;
  if (duration === PlanItemDuration.SHORT) return 1;
  // Defaults by item type
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

// Determine the time block for an item
function getTimeBlock(itemType: string): 'AM' | 'PM' | 'FLEXIBLE' {
  switch (itemType) {
    case 'EMPLOYER_VISIT':
    case 'SCOUTING':
      return 'AM'; // Field work preferably morning
    case 'CALL':
    case 'DESK_REVIEW':
    case 'NOTICE_FOLLOW_UP':
      return 'FLEXIBLE'; // Can be done anytime
    case 'MEETING':
      return 'PM';
    default:
      return 'FLEXIBLE';
  }
}

// Priority sort value (lower = higher priority)
function prioritySortOrder(candidate: PlanCandidate): number {
  // 1. Overdue items (negative days remaining)
  if (candidate.due_date) {
    const daysUntilDue = Math.ceil(
      (new Date(candidate.due_date).getTime() - Date.now()) / 86400000
    );
    if (daysUntilDue < 0) return 0; // Overdue — top priority
    if (daysUntilDue <= 7) return 1; // Due this week
  }

  // 2. By priority
  switch (candidate.priority) {
    case 'CRITICAL': return 2;
    case 'HIGH': return 3;
    case 'MEDIUM': return 5;
    case 'LOW': return 7;
    default: return 6;
  }
}

// Classify candidates into urgency buckets
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

/**
 * Generate a smart draft plan from scored candidates.
 * Rules (in priority order):
 * 1. Overdue items first
 * 2. Due-this-week items next
 * 3. Manager-assigned / mandatory items
 * 4. Carry-forward incomplete tasks
 * 5. High-score violations
 * 6. Group by territory when possible
 * 7. Fit calls into short flexible slots
 * 8. Field visits into AM blocks
 * 9. Warn when day exceeds capacity
 */
export function generateSmartDraft(
  candidates: PlanCandidate[],
  alreadyAddedSourceIds: Set<string | null>
): SmartDraftResult {
  // Filter out already-added
  const available = candidates.filter(c => !alreadyAddedSourceIds.has(c.source_id));

  // Sort by priority
  const sorted = [...available].sort((a, b) => {
    const pa = prioritySortOrder(a);
    const pb = prioritySortOrder(b);
    if (pa !== pb) return pa - pb;
    // Secondary: recommendation score (higher = more important)
    return (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0);
  });

  const dayCapacities: Record<DayOfWeek, DayCapacity> = {} as any;
  for (const day of DAYS) {
    dayCapacities[day] = {
      day,
      amUsed: 0,
      pmUsed: 0,
      flexUsed: 0,
      totalUsed: 0,
      items: [],
    };
  }

  const draftItems: DraftItem[] = [];
  const unscheduled: PlanCandidate[] = [];
  const warnings: string[] = [];

  // Territory-based day grouping: try to cluster same territory on same day
  const territoryDayMap: Record<string, DayOfWeek> = {};

  for (const candidate of sorted) {
    const itemType = candidate.source_type === 'SCOUTING_LEAD' ? 'SCOUTING' :
      candidate.source_type === 'FOLLOW_UP' ? 'CALL' :
      candidate.source_type === 'NOTICE' ? 'NOTICE_FOLLOW_UP' :
      'EMPLOYER_VISIT';

    const hours = estimateHours(itemType);
    const preferredBlock = getTimeBlock(itemType);

    // Find best day
    let assignedDay: DayOfWeek | null = null;

    // Prefer territory clustering
    const territory = candidate.territory || '';
    if (territory && territoryDayMap[territory]) {
      const preferredDay = territoryDayMap[territory];
      if (canFitOnDay(dayCapacities[preferredDay], hours, preferredBlock)) {
        assignedDay = preferredDay;
      }
    }

    // If no territory match, find the day with most available capacity
    if (!assignedDay) {
      for (const day of DAYS) {
        if (canFitOnDay(dayCapacities[day], hours, preferredBlock)) {
          assignedDay = day;
          break;
        }
      }
    }

    if (!assignedDay) {
      // Try any day with any block
      for (const day of DAYS) {
        if (dayCapacities[day].totalUsed + hours <= MAX_HOURS_PER_DAY + 1) {
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

      const draft: DraftItem = {
        candidate,
        day: assignedDay,
        timeBlock: actualBlock,
        estimatedHours: hours,
        itemType,
      };
      cap.items.push(draft);
      draftItems.push(draft);

      // Track territory clustering
      if (territory) {
        territoryDayMap[territory] = assignedDay;
      }
    } else {
      unscheduled.push(candidate);
    }
  }

  // Generate warnings
  for (const day of DAYS) {
    const cap = dayCapacities[day];
    if (cap.totalUsed > MAX_HOURS_PER_DAY) {
      warnings.push(`${day} is over capacity (${cap.totalUsed.toFixed(1)}h / ${MAX_HOURS_PER_DAY}h)`);
    }
    if (cap.items.length > 6) {
      warnings.push(`${day} has ${cap.items.length} items — consider redistributing`);
    }
  }

  const overdueCount = sorted.filter(c => classifyCandidate(c) === 'OVERDUE').length;
  if (overdueCount > 0 && unscheduled.some(c => classifyCandidate(c) === 'OVERDUE')) {
    warnings.push(`Some overdue items could not be scheduled — capacity exceeded`);
  }

  return { draftItems, unscheduled, dayCapacities, warnings };
}

function canFitOnDay(cap: DayCapacity, hours: number, block: 'AM' | 'PM' | 'FLEXIBLE'): boolean {
  if (cap.totalUsed + hours > MAX_HOURS_PER_DAY) return false;
  if (block === 'AM' && cap.amUsed + hours > AM_HOURS) return false;
  if (block === 'PM' && cap.pmUsed + hours > PM_HOURS) return false;
  return true;
}

function fitInBlock(cap: DayCapacity, hours: number, preferred: 'AM' | 'PM' | 'FLEXIBLE'): 'AM' | 'PM' | 'FLEXIBLE' {
  if (preferred === 'AM' && cap.amUsed + hours <= AM_HOURS) return 'AM';
  if (preferred === 'PM' && cap.pmUsed + hours <= PM_HOURS) return 'PM';
  // Fall back
  if (cap.amUsed + hours <= AM_HOURS) return 'AM';
  if (cap.pmUsed + hours <= PM_HOURS) return 'PM';
  return 'FLEXIBLE';
}

/**
 * Convert draft items to CreatePlanItemRequest objects
 */
export function draftToRequests(
  draftItems: DraftItem[],
  planId: string,
  weekDays: { name: DayOfWeek; date: string }[],
  createdBy: string
): Omit<CreatePlanItemRequest, 'plan_id' | 'created_by'>[] {
  return draftItems.map(draft => {
    const dayInfo = weekDays.find(d => d.name === draft.day);
    // Compute start/end times based on block
    let startTime: string | undefined;
    let endTime: string | undefined;
    if (draft.timeBlock === 'AM') {
      startTime = '08:00';
      endTime = `${String(8 + Math.round(draft.estimatedHours)).padStart(2, '0')}:00`;
    } else if (draft.timeBlock === 'PM') {
      startTime = '13:00';
      endTime = `${String(13 + Math.round(draft.estimatedHours)).padStart(2, '0')}:00`;
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
