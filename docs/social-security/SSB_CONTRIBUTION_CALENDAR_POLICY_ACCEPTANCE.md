# SSB Contribution Calendar Policy — Rule-based Due Dates (Acceptance)

Focus: **Social Security Board — St. Kitts & Nevis**.
Additive-only. No BN/BEMA/IA/legacy tables changed. No duplicate calendar screens.

---

## 1. Model change

`ssb_contribution_calendar_policy` was extended (additive columns) to
support rule-based due dates instead of a simple `payment_due_day = 14`.

New columns:

| Column | Purpose |
|---|---|
| `due_date_rule_type` | one of the rule types below |
| `due_day` | day-of-month for `fixed_day_of_current_month` / `fixed_day_of_next_month` |
| `days_after_period_end` | for `days_after_period_end` |
| `nth_working_day` | for `nth_working_day_after_period_end` |
| `working_day_adjustment` | `none`, `next_working_day`, `previous_working_day`, `nearest_working_day` |
| `grace_period_days` | calendar days after adjusted due date |
| `interest_start_basis` | `none`, `day_after_due`, `day_after_grace_end`, `custom` |
| `penalty_start_basis` | same set as interest |
| `calendar_source_code` | holiday calendar reference (default `KN-NATIONAL`) |
| `weekend_days` | JSON array of 0..6 (0 = Sunday). Default `[0,6]` |
| `leap_year_handling` | `natural`, `fixed_to_28`, `extend_to_29` |
| `custom_formula_text` | descriptive only — not executed |

CHECK constraints enforce the allowed values. Existing legacy fields
`payment_due_day` / `filing_due_day` are kept as fallback and were
backfilled into `due_day` + `fixed_day_of_current_month` + `next_working_day`.

## 2. Supported rule types

- `fixed_day_of_current_month` — e.g. 14th of the current month.
- `fixed_day_of_next_month` — e.g. 14th of the month after the period.
- `end_of_month` — last calendar day of the period.
- `last_working_day_of_month` — last non-weekend, non-holiday day of the period.
- `nth_working_day_after_period_end` — e.g. 5th working day after month end.
- `days_after_period_end` — e.g. period end + 14 calendar days.
- `custom_formula_text` — descriptive; treated as `days_after_period_end` with
  the configured value for preview so admins still see something meaningful.

## 3. Working-day adjustment

Applied only when the base due date lands on a weekend or a holiday:

- `none` — keep the date as computed.
- `next_working_day` — shift forward to the next working day.
- `previous_working_day` — shift backward to the previous working day.
- `nearest_working_day` — pick whichever is closer (forward on tie).

Weekends come from the `weekend_days` column. Holidays come from the
shared `public_holidays` table, filtered by `year` and `is_active = true`.
Calendar source is `KN-NATIONAL` by default; other sources are
accepted for future engines.

## 4. Grace, interest, penalty

- `grace_period_days` — added to the adjusted due date. Grace end = adjusted +
  grace (adjusted itself when grace = 0).
- `interest_start_basis` / `penalty_start_basis` — resolved to:
  - `day_after_due` → adjusted + 1
  - `day_after_grace_end` → grace end + 1 (default)
  - `custom` / `none` → not computed by this service

## 5. Examples

**February — non-leap 2027, `fixed_day_of_current_month` (day 30)**
- Period end: 2027-02-28, `due_day` capped to 28 → base 2027-02-28
- If Sunday → `next_working_day` → 2027-03-01
- With `leap_year_handling = extend_to_29` in a leap year, day 29 is honoured.

**April — `last_working_day_of_month`**
- Period end 2026-04-30 (Thu) → base 2026-04-30
- If public holiday, walks backward to 2026-04-29.

**January — `nth_working_day_after_period_end` (n=5)**
- Starts 2026-02-01, counts working days: e.g. Mon 2 = 1, Tue 3 = 2, … → 5th.
- Skips KN holidays via `public_holidays`.

**Any month — `days_after_period_end` (14)**
- Period end + 14 calendar days, then adjustment.

## 6. Preview

`/admin/ssb-setup?section=contribution` renders a **Due-date preview**
card below the policy editor. It shows the current ACTIVE policy applied
to 12 consecutive months of the selected year with:

- period start / end
- base due date (before adjustment)
- adjusted due date
- grace end date
- interest start / penalty start

Admins can change the year and re-run without editing the policy.

## 7. Service helper

`src/services/ssb/ssbContributionCalendarService.ts` exposes:

- `calculateContributionDueDate(policy, { periodMonth, periodYear, holidays })`
- `adjustForWorkingDay(date, policy, holidays)`
- `getContributionSchedulePreview(policy, year)` — 12-month array
- `loadHolidays(year, calendarSourceCode)` — reads `public_holidays`
- `validateContributionCalendarPolicy(policy)` — used by governance

All calculations are timezone-safe (local Y/M/D only). Holidays are
cached in-memory per `(source, year)`.

TODO(holiday-integration): swap `loadHolidays` to the future shared
HolidayEngine facade once it exposes a per-country / per-source API.

## 8. Validation (Configuration Governance)

Governance run now includes rule-aware checks:

- `SSB.E013` — asset missing (existing).
- `SSB.E013.ERR` — invalid or overlapping active rows (existing).
- `SSB.E013.RULE` (new, blocking) — missing/invalid rule fields for
  the selected `due_date_rule_type` or invalid `working_day_adjustment`.
- `SSB.E013.PREVIEW` (new, blocking) — 12-month preview did not produce
  12 results.
- `SSB.W023.CAL` (new, warning) — `calendar_source_code` not set
  (defaults to `KN-NATIONAL`).

Health rules (in `ssbPolicyHealthService`) now check
`due_date_rule_type`, required fields for the selected rule, and
`working_day_adjustment` — not the simplistic `payment_due_day`.

## 9. Rollback

Additive only. To roll back:

```sql
ALTER TABLE public.ssb_contribution_calendar_policy
  DROP COLUMN IF EXISTS due_date_rule_type,
  DROP COLUMN IF EXISTS due_day,
  DROP COLUMN IF EXISTS days_after_period_end,
  DROP COLUMN IF EXISTS nth_working_day,
  DROP COLUMN IF EXISTS working_day_adjustment,
  DROP COLUMN IF EXISTS grace_period_days,
  DROP COLUMN IF EXISTS interest_start_basis,
  DROP COLUMN IF EXISTS penalty_start_basis,
  DROP COLUMN IF EXISTS calendar_source_code,
  DROP COLUMN IF EXISTS weekend_days,
  DROP COLUMN IF EXISTS leap_year_handling,
  DROP COLUMN IF EXISTS custom_formula_text;
```

Then revert `ContributionCalendarPolicyForm.tsx`,
`ssbContributionCalendarService.ts`, the `SSB.E013.*` blocks in
`ssbConfigurationGovernanceService.ts`, and the health-service case for
`ssb.contribution_calendar`. Legacy `payment_due_day` / `filing_due_day`
remain intact.

## 10. Legacy impact

**None.** No BN, BEMA, IA, IP, ER, CL, CN or `bn_*` / `bema_*` / `ia_*`
table is read, altered or migrated. Shared `public_holidays` is read-only.
