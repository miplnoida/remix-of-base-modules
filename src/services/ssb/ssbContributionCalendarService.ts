/**
 * SSB Contribution Calendar Service
 *
 * Pure helper that resolves the *effective due date* of a KN contribution
 * period from a `ssb_contribution_calendar_policy` row using rule-based
 * fields introduced by the "real due-date rules" epic.
 *
 * NOTE: This service ONLY computes dates. It does not read or write
 * business tables (BN/BEMA/IA/legacy). Holiday consumption is via the
 * shared `public_holidays` table (optional — see `loadHolidays`).
 *
 * Rule types supported:
 *   - fixed_day_of_current_month
 *   - fixed_day_of_next_month
 *   - end_of_month
 *   - last_working_day_of_month
 *   - nth_working_day_after_period_end
 *   - days_after_period_end
 *   - custom_formula_text        (free-form; NOT executed here)
 *
 * Working-day adjustment:
 *   - none | next_working_day | previous_working_day | nearest_working_day
 */

import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type DueDateRuleType =
  | "fixed_day_of_current_month"
  | "fixed_day_of_next_month"
  | "end_of_month"
  | "last_working_day_of_month"
  | "nth_working_day_after_period_end"
  | "days_after_period_end"
  | "custom_formula_text";

export type WorkingDayAdjustment =
  | "none"
  | "next_working_day"
  | "previous_working_day"
  | "nearest_working_day";

export type StartBasis = "none" | "day_after_due" | "day_after_grace_end" | "custom";

export type LeapYearHandling = "natural" | "fixed_to_28" | "extend_to_29";

export interface ContributionCalendarPolicy {
  id?: string;
  contribution_period?: string | null;
  due_date_rule_type?: DueDateRuleType | null;
  due_day?: number | null;
  days_after_period_end?: number | null;
  nth_working_day?: number | null;
  working_day_adjustment?: WorkingDayAdjustment | null;
  grace_period_days?: number | null;
  interest_start_basis?: StartBasis | null;
  penalty_start_basis?: StartBasis | null;
  calendar_source_code?: string | null;
  leap_year_handling?: LeapYearHandling | null;
  custom_formula_text?: string | null;
  // legacy fields, still tolerated as a fallback
  payment_due_day?: number | null;
  filing_due_day?: number | null;
}

export interface DueDateResult {
  periodMonth: number;     // 1..12
  periodYear: number;
  periodStart: string;     // yyyy-mm-dd
  periodEnd: string;       // yyyy-mm-dd
  baseDueDate: string;
  adjustedDueDate: string;
  graceEndDate: string;
  interestStartDate: string | null;
  penaltyStartDate: string | null;
  adjustmentApplied: WorkingDayAdjustment;
  ruleUsed: DueDateRuleType;
  notes: string[];
}

// -------------------------------------------------------------------
// Date helpers (timezone-safe: work in local Y/M/D only)
// -------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function addDays(d: Date, n: number): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  c.setDate(c.getDate() + n);
  return c;
}

function endOfMonth(year: number, month1to12: number): Date {
  return new Date(year, month1to12, 0);   // day 0 of next month = last day
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function normalisedWeekend(weekend: any): Set<number> {
  let arr: number[] = [0, 6];
  if (Array.isArray(weekend)) {
    const parsed = weekend.map((n) => Number(n)).filter((n) => Number.isFinite(n));
    if (parsed.length) arr = parsed;
  } else if (typeof weekend === "string" && weekend.trim().length) {
    try { const p = JSON.parse(weekend); if (Array.isArray(p)) arr = p.map(Number); }
    catch { /* keep default */ }
  }
  return new Set(arr);
}

/**
 * Load the weekend-day codes (0..6, 0=Sunday) for a given calendar
 * policy row from the relational child table `ssb_contribution_calendar_weekend_day`.
 * Falls back to [0, 6] when no rows are present.
 */
export async function loadWeekendDaysForPolicy(policyId: string | null | undefined): Promise<number[]> {
  if (!policyId) return [0, 6];
  const { data, error } = await db
    .from("ssb_contribution_calendar_weekend_day")
    .select("weekday")
    .eq("policy_id", policyId)
    .order("weekday", { ascending: true });
  if (error || !data?.length) return [0, 6];
  return (data as Array<{ weekday: number }>).map((r) => Number(r.weekday));
}


// -------------------------------------------------------------------
// Holiday integration
// -------------------------------------------------------------------

let _holidayCache = new Map<string, Set<string>>();  // key: `${source}|${year}`

/**
 * Load KN (or configured) holidays for a given year. Uses `public_holidays`
 * shared engine when available. If holidays cannot be fetched, returns an
 * empty set and callers surface a warning.
 *
 * TODO(holiday-integration): swap to the future shared HolidayEngine facade
 * once it exposes a per-country/calendar-source API.
 */
export async function loadHolidays(
  year: number,
  calendarSourceCode: string | null | undefined,
): Promise<Set<string>> {
  const key = `${calendarSourceCode ?? "KN-NATIONAL"}|${year}`;
  if (_holidayCache.has(key)) return _holidayCache.get(key)!;

  try {
    const { data, error } = await db
      .from("public_holidays")
      .select("holiday_date, is_active, year")
      .eq("year", year)
      .eq("is_active", true);
    if (error) throw error;
    const set = new Set<string>((data ?? []).map((r: any) => String(r.holiday_date).slice(0, 10)));
    _holidayCache.set(key, set);
    return set;
  } catch {
    const empty = new Set<string>();
    _holidayCache.set(key, empty);
    return empty;
  }
}

export function clearHolidayCache() { _holidayCache.clear(); }

// -------------------------------------------------------------------
// Working-day adjustment
// -------------------------------------------------------------------

export function adjustForWorkingDay(
  date: Date,
  policy: Pick<ContributionCalendarPolicy, "working_day_adjustment" | "weekend_days">,
  holidays: Set<string>,
): { adjusted: Date; applied: WorkingDayAdjustment } {
  const rule: WorkingDayAdjustment = (policy.working_day_adjustment as WorkingDayAdjustment) ?? "none";
  const weekend = normalisedWeekend(policy.weekend_days);
  const isNonWorking = (d: Date) => weekend.has(d.getDay()) || holidays.has(fmt(d));

  if (rule === "none" || !isNonWorking(date)) return { adjusted: date, applied: rule };

  const shift = (dir: 1 | -1) => {
    let cur = new Date(date);
    for (let i = 0; i < 31; i++) {
      cur = addDays(cur, dir);
      if (!isNonWorking(cur)) return cur;
    }
    return cur;
  };

  if (rule === "next_working_day")     return { adjusted: shift(1),  applied: rule };
  if (rule === "previous_working_day") return { adjusted: shift(-1), applied: rule };

  // nearest_working_day
  const next = shift(1); const prev = shift(-1);
  const dNext = Math.abs(+next - +date); const dPrev = Math.abs(+date - +prev);
  return { adjusted: dNext <= dPrev ? next : prev, applied: rule };
}

// -------------------------------------------------------------------
// Base due date (before working-day adjustment)
// -------------------------------------------------------------------

function safeDayOfMonth(y: number, m1to12: number, day: number, leap: LeapYearHandling): Date {
  const last = endOfMonth(y, m1to12).getDate();
  let d = Math.min(day, last);
  if (m1to12 === 2 && leap === "fixed_to_28") d = Math.min(d, 28);
  if (m1to12 === 2 && leap === "extend_to_29" && isLeapYear(y) && day >= 29) d = 29;
  return new Date(y, m1to12 - 1, d);
}

function nthWorkingDayFrom(
  start: Date, n: number, weekend: Set<number>, holidays: Set<string>,
): Date {
  let count = 0; let cur = new Date(start);
  for (let i = 0; i < 90; i++) {
    const nonWork = weekend.has(cur.getDay()) || holidays.has(fmt(cur));
    if (!nonWork) { count += 1; if (count === n) return cur; }
    cur = addDays(cur, 1);
  }
  return cur;
}

export interface CalculateOptions {
  periodMonth: number;   // 1..12
  periodYear: number;
  /** Injected holidays (call `loadHolidays` first to make this async-safe). */
  holidays?: Set<string>;
}

export function calculateContributionDueDate(
  policy: ContributionCalendarPolicy,
  opts: CalculateOptions,
): DueDateResult {
  const notes: string[] = [];
  const { periodMonth: m, periodYear: y } = opts;

  const rule: DueDateRuleType =
    (policy.due_date_rule_type as DueDateRuleType)
    ?? (policy.payment_due_day != null || policy.filing_due_day != null
          ? "fixed_day_of_current_month"
          : "fixed_day_of_next_month");

  const dueDay = policy.due_day ?? policy.payment_due_day ?? policy.filing_due_day ?? 14;
  const daysAfter = policy.days_after_period_end ?? 14;
  const nthWD = policy.nth_working_day ?? 5;
  const leap: LeapYearHandling = (policy.leap_year_handling as LeapYearHandling) ?? "natural";

  const weekend = normalisedWeekend(policy.weekend_days);
  const holidays = opts.holidays ?? new Set<string>();
  if (opts.holidays === undefined) notes.push("No holidays loaded — call loadHolidays() for accuracy.");

  const periodStart = new Date(y, m - 1, 1);
  const periodEnd   = endOfMonth(y, m);

  let base: Date;
  switch (rule) {
    case "fixed_day_of_current_month":
      base = safeDayOfMonth(y, m, dueDay, leap);
      break;
    case "fixed_day_of_next_month": {
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      base = safeDayOfMonth(ny, nm, dueDay, leap);
      break;
    }
    case "end_of_month":
      base = new Date(periodEnd);
      break;
    case "last_working_day_of_month": {
      let cur = new Date(periodEnd);
      while (weekend.has(cur.getDay()) || holidays.has(fmt(cur))) cur = addDays(cur, -1);
      base = cur;
      break;
    }
    case "nth_working_day_after_period_end":
      base = nthWorkingDayFrom(addDays(periodEnd, 1), nthWD, weekend, holidays);
      break;
    case "days_after_period_end":
      base = addDays(periodEnd, daysAfter);
      break;
    case "custom_formula_text":
      notes.push(`custom_formula_text is descriptive only — falling back to period end + ${daysAfter}d.`);
      base = addDays(periodEnd, daysAfter);
      break;
    default:
      notes.push(`Unknown rule '${rule}' — falling back to period end + 14d.`);
      base = addDays(periodEnd, 14);
  }

  const { adjusted, applied } = adjustForWorkingDay(base, policy, holidays);

  const grace = Math.max(0, policy.grace_period_days ?? 0);
  const graceEnd = grace === 0 ? adjusted : addDays(adjusted, grace);

  const startFrom = (basis: StartBasis | null | undefined): string | null => {
    switch (basis) {
      case "day_after_due":       return fmt(addDays(adjusted, 1));
      case "day_after_grace_end": return fmt(addDays(graceEnd, 1));
      case "custom":              return null;
      case "none":                return null;
      default:                    return fmt(addDays(graceEnd, 1));
    }
  };

  return {
    periodMonth: m, periodYear: y,
    periodStart: fmt(periodStart),
    periodEnd:   fmt(periodEnd),
    baseDueDate: fmt(base),
    adjustedDueDate: fmt(adjusted),
    graceEndDate: fmt(graceEnd),
    interestStartDate: startFrom(policy.interest_start_basis),
    penaltyStartDate:  startFrom(policy.penalty_start_basis),
    adjustmentApplied: applied,
    ruleUsed: rule,
    notes,
  };
}

// -------------------------------------------------------------------
// 12-month preview
// -------------------------------------------------------------------

export async function getContributionSchedulePreview(
  policy: ContributionCalendarPolicy,
  year: number,
): Promise<DueDateResult[]> {
  const source = policy.calendar_source_code ?? "KN-NATIONAL";
  const [thisYear, nextYear] = await Promise.all([
    loadHolidays(year, source),
    loadHolidays(year + 1, source),   // due date can spill into next year
  ]);
  const merged = new Set<string>([...thisYear, ...nextYear]);
  const out: DueDateResult[] = [];
  for (let m = 1; m <= 12; m++) {
    out.push(calculateContributionDueDate(policy, { periodMonth: m, periodYear: year, holidays: merged }));
  }
  return out;
}

/**
 * Governance validation helper — returns { ok, issues, previewCount }.
 * Runs a 12-month preview and reports failures.
 */
export async function validateContributionCalendarPolicy(
  policy: ContributionCalendarPolicy,
): Promise<{ ok: boolean; issues: string[]; previewCount: number }> {
  const issues: string[] = [];
  const rule = policy.due_date_rule_type as DueDateRuleType | null | undefined;
  if (!rule) issues.push("due_date_rule_type is not set.");

  if (rule === "fixed_day_of_current_month" || rule === "fixed_day_of_next_month") {
    const d = policy.due_day ?? policy.payment_due_day;
    if (d == null || d < 1 || d > 31) issues.push("due_day must be 1..31 for the selected rule.");
  }
  if (rule === "days_after_period_end") {
    if (policy.days_after_period_end == null || policy.days_after_period_end < 0)
      issues.push("days_after_period_end must be >= 0 for the selected rule.");
  }
  if (rule === "nth_working_day_after_period_end") {
    if (policy.nth_working_day == null || policy.nth_working_day < 1)
      issues.push("nth_working_day must be >= 1 for the selected rule.");
  }
  if (rule === "custom_formula_text") {
    if (!policy.custom_formula_text || !policy.custom_formula_text.trim())
      issues.push("custom_formula_text is required for the custom rule.");
  }
  const adj = policy.working_day_adjustment;
  if (adj && !["none","next_working_day","previous_working_day","nearest_working_day"].includes(adj))
    issues.push(`working_day_adjustment '${adj}' is not a valid rule.`);
  if (!policy.calendar_source_code) issues.push("calendar_source_code not set (using default KN-NATIONAL) — warning only.");

  let previewCount = 0;
  try {
    const preview = await getContributionSchedulePreview(policy, new Date().getFullYear());
    previewCount = preview.length;
    if (previewCount !== 12) issues.push(`Preview returned ${previewCount}/12 months.`);
  } catch (e: any) {
    issues.push(`Preview calculation failed: ${e?.message ?? e}`);
  }

  const blocking = issues.filter((i) => !i.includes("warning only"));
  return { ok: blocking.length === 0, issues, previewCount };
}
