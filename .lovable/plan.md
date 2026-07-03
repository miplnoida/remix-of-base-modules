## Problem

The Rule Simulator shows 29 detections for **A Fulton & Co. Ltd (654548)** because `useSimulatorData.ts` hardcodes the evaluation window as the *last 12 calendar months* with no bounds. Every period without a C3 filing gets scored against 3+ rules (DR‑002/007 Missing C3, DR‑010 Wage Below Threshold, DR‑012 Contribution Gap, etc.), which multiplies quickly (~12 periods × 2–3 rules ≈ 29 rows).

The engine itself is correct — the issue is that we're feeding it periods for which the employer had no filing obligation.

## Fix (single file: `src/hooks/compliance/useSimulatorData.ts`)

Replace the fixed `last12` loop with an **employer-scoped** period window, using `date_wages_first_paid` (fallback `registration_date`) as the lower bound and `date_of_closure` (fallback `now`) as the upper bound, then still cap the visible window at the last 12 months so the UI doesn't explode for long-active employers.

### 1. Fetch the bounding dates
Extend the existing `er_master` fetch (already present via `regno` in scope) to select:
- `registration_date`
- `date_wages_first_paid`
- `date_of_closure`

If `er_master` isn't currently fetched in this hook, add a lightweight `.select('registration_date, date_wages_first_paid, date_of_closure').eq('regno', regno).maybeSingle()` alongside the other `Promise.all` calls.

### 2. Compute the compliance window
```ts
const lowerBoundRaw = employer?.date_wages_first_paid ?? employer?.registration_date ?? null;
const upperBoundRaw = employer?.date_of_closure ?? now;

// Employer is not yet compliance-active → no periods to evaluate.
if (!lowerBoundRaw) return { ...empty payload with coverage/snapshot=0 };

const lowerYm = ym(lowerBoundRaw);              // e.g. "1993-03"
const upperYm = ym(upperBoundRaw);              // e.g. "2026-07"
```

### 3. Build the bounded period list
Replace lines 302–307:
```ts
// Cap at 12 months to keep UI manageable, but never go earlier than lowerYm
// and never later than upperYm (previous month = last completed period).
const periods: string[] = [];
const startCursor = new Date(now.getFullYear(), now.getMonth() - 1, 1); // previous month
for (let i = 0; i < 12; i++) {
  const d = new Date(startCursor.getFullYear(), startCursor.getMonth() - i, 1);
  const pStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const pYm = pStr.substring(0, 7);
  if (pYm < lowerYm) break;         // before employer became active
  if (pYm > upperYm) continue;      // after closure (unlikely in past-only walk)
  periods.push(pStr);
}
```
Then everywhere `last12` was referenced (period loop, `last6` snapshot, `primaryIdx` lookup, gap walk), use `periods` instead.

### 4. Guard the "primary" period
If `periodOverride` falls outside `[lowerYm, upperYm]`, snap it to the newest in-window period so the Detection tab never runs a rule on a period the employer didn't own.

### 5. Consecutive-gap safety
The `consecutiveGapCount`/`hasConsecutiveGaps` walk (line 313–322 and 354–362) currently walks `last12`. After the change it walks the bounded `periods` array, so gap counts naturally cannot exceed the employer's active tenure. No further change needed.

### 6. Snapshot & coverage
`last6` becomes `periods.slice(0, 6)`. If the employer has fewer than 6 active periods, `filedCount + notFiledCount` correctly totals `periods.slice(0, 6).length` instead of a hardcoded 6. Update the `notFiledCount` line accordingly:
```ts
const notFiledCount = last6.length - filedCount;
```

## Verification

After the change, for Fulton (regno 654548):
- Lower bound = `date_wages_first_paid` = 1993‑03 → cap at 12 months → window = **2025‑07 through 2026‑06** (12 periods).
- May 2026 and June 2026 have C3 filings → those periods will be `NOT_MATCHED` for Missing‑C3 rules.
- April 2026 (no filing, past 30‑day grace) → 1 Missing‑C3 detection (matches the earlier fix).
- Remaining 9 periods (2025‑07 → 2026‑03) will still be flagged as Missing‑C3 because the employer really did miss those filings — but that's now business‑truthful, not a bug.

For a newly registered employer (e.g. `date_wages_first_paid = 2026-05-01`), only May and June 2026 will be evaluated — no phantom pre‑registration detections.

Run the Rule Simulator on the same route (`/compliance/admin/tools/rule-simulator`) with Fulton selected; the Detection tab count will drop from 29 to a realistic number matching the actual gap history, and the List vs Simulator parity from the previous fix is preserved.

## Out of scope

- Changing detection‑rule parameters or evaluators (`complianceSimulatorEngine.ts`).
- Persistence of simulator results (previous conversation covered this).
- Changing the list screen — `ce_violations` list already reflects the manually‑corrected data.

## Files touched

- `src/hooks/compliance/useSimulatorData.ts` — the only functional edit.
- `docs/compliance/rule_simulator_window.md` — new short doc describing the bounding rule (per project knowledge-repository standard).
