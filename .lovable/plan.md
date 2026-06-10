## Issue confirmed for employer 657115

The screenshots show C3 reports filed for **April** and **May 2026**, but **February 2026** is missing. Neither a violation nor a simulator match appears. Root cause is in three places:

### Root causes

1. **Auto-scan threshold too strict** — `supabase/functions/ce-violation-scan/index.ts` (line 286) requires `missed_filings_12m >= 2 && !filing.is_current` before raising a NON_FILING violation. Employer 657115 has only **1 missed month (Feb)** plus current filings, so nothing is ever created.

2. **Scan collapses all missed months into one `asOfPeriod`** — `periodFrom = asOfPeriod` (today's month). The actual missing month is never recorded, and the dedupe key `employer|type|period` always matches "current month", so per-month tracking is impossible.

3. **Rule Simulator only evaluates ONE period at a time** — `useSimulatorData.ts` defaults to "previous month" (May 2026, which is filed). DR-002 therefore reports "Only 0 days past deadline". There is no way to iterate the last 12 months, and the duplicate-suppression keys by `violation_type_id` only (ignores period), so DR-002 can be falsely suppressed.

4. **Duplicate-suppression in simulator** keys by `violation_type_id` only — masks a legitimate per-period hit when any other open violation of the same type exists.

## Fix plan

### A. Auto-scan (`supabase/functions/ce-violation-scan/index.ts`)
- Replace the single `c3_missing_30_days` branch with a **per-period loop** over the last N months (N = `parameters.lookback_months ?? 12`). For each month where C3 is missing AND deadline + grace has passed, emit one detected violation with `period_from = YYYY-MM`.
- Lower the implicit threshold: trigger when **≥1** month is missing (configurable via `parameters.min_missed_months`, default 1).
- Keep dedupe key `employer|violation_type|period_from` so per-month violations stay independent.
- Apply the same per-period treatment to `c3_deadline_passed` (DR-001) and `payment_not_received` (DR-003) so a late/non-payment in a specific month is captured even when others are clean.

### B. Rule Simulator (`useSimulatorData.ts` + `RuleSimulator.tsx` + `complianceSimulatorEngine.ts`)
- Add a **"Scan range"** mode: when no explicit period override is set, build an array of the last 12 periods and evaluate every detection rule against each. Return results grouped by period.
- For each period, compute `filingSubmitted`, `daysPastDeadline`, `amountDue`, `paymentMade` from that month's `cn_c3_reported` / `cn_payment` rows (already fetched, just iterate instead of `find`).
- Update `SimulationResults.tsx` to show a Period column and group rows by period when scan-range mode is active.
- Change duplicate-suppression key to `violation_type_id|period_from` so a per-month hit is not hidden by an unrelated open violation of the same type.

### C. UI affordance
- In `RuleSimulator.tsx` scenario panel, add a "Scan last 12 months" toggle (default ON for employer mode). Manual scenario keeps single-period behaviour.
- Outcome Summary banner: list each missing period detected, not a generic "duplicate suppressed" line.

### D. Verification
- After deploy, run scan for regno 657115 → expect 1 new DR-002 violation with `period_from = 2026-02`.
- Open Rule Simulator → DR-002 row shows `Match` for the February period with evidence `Missing Month = 2026-02, Days Past Deadline = ~100`.
- Knowledge Repo: update `compliance/detection/DR-002` entry and add a test case "single missing month must raise NON_FILING".

## Out of scope
- Repricing or recalculating already-resolved violations.
- Changing `ce_v_employer_filing_status` view shape (we read existing C3 rows directly for the per-period iteration).
