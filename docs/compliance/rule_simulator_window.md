# Rule Simulator — Employer Compliance Window

## Rule
The Rule Simulator (`/compliance/admin/tools/rule-simulator`) evaluates detection
rules only for periods where the employer had an actual filing obligation.

Window bounds per employer (`er_master`):

- **Lower bound** = `date_wages_first_paid` (fallback `registration_date`)
- **Upper bound** = `date_of_closure` (fallback = now)
- **Cap** = last 12 completed months (previous month backward)

Periods outside `[lower, upper]` are skipped entirely — no detection is scored
for them, and they don't count toward consecutive-gap logic.

## Why
Previously the simulator hardcoded the *last 12 calendar months* with no
bounds, producing spurious detections for employers whose registration or
closure date meant they had no obligation in some of those months (e.g.
"A Fulton & Co. Ltd" showed 29 detections spanning periods before the
current compliance cycle).

## Implementation
`src/hooks/compliance/useSimulatorData.ts` — `periods` array replaces
`last12`. All downstream consumers (`periodFacts`, `last6` snapshot,
`primaryIdx`) walk this bounded array. If `periodOverride` falls outside
the window it is ignored and the newest in-window period is used.

## Test cases
- Long-active employer (Fulton, wages first paid 1993): window = last 12
  months, capped.
- New employer (wages first paid 2026-05): window = 2 periods (May, Jun 2026).
- Closed employer (date_of_closure 2024-12): no periods after 2024-12 evaluated.
- Employer with no dates at all: window empty, zero detections.
