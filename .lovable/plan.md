## Part A — Manual Violation Entry: auto-prefill amounts from C3 + policy

**Where:** `src/pages/compliance/violations/ManualViolationEntry.tsx`

The "Amount Details" panel already exists for PAYMENT / CONTRIBUTION / DECLARATION violation types (it appears after you pick the violation type, below the Period row). Today every field is blank and manual. We will make it auto-populate, while still allowing override.

1. **Add a derivation hook** `useViolationAmountSuggestion(employerId, period, fundType, violationCategory)` under `src/hooks/compliance/`:
   - Reads the C3 submission for `employerId + period` (`c3_submissions` + `c3_line_items`, filtered by `fundType`) → `expectedAmount` = total contribution due for that fund.
   - Reads `cn_payment` / `cn_receipt` for the same employer + period + fund → `paidAmount` = sum applied.
   - Returns `{ expected, paid, shortfall, c3SubmissionId, monthsLate, loading, source }` where `source` is `"c3"`, `"partial"`, or `"none"`.

2. **Add a penalty/interest calculator** that uses the already-loaded `policyDefaults` (from `c3_calculation_config` via `resolveMany`):
   - `penalty = shortfall × ss_fine_initial_rate + shortfall × additional_rate_per_month × monthsLate` (variant per fund using `levy_penalty_initial_rate` / `severance_penalty_rate` when applicable).
   - `interest = shortfall × interest_rate × monthsLate / 12`.
   - All formulas read from `policyDefaults`, so any later C3 Configuration change does not retroactively affect frozen records (snapshot rule already in place).

3. **Wire prefill into the form:**
   - When `employerId`, `periodFrom`, `fundType`, and category-is-financial are all set, call the hook and prefill `expectedAmount`, `paidAmount`, `penaltyAmount`, `interestAmount` — only when the field is still empty / untouched (track a `dirty` flag per field).
   - Show a small "Auto-filled from C3 submission `<id>` — click to edit" badge above the amount grid; a "Recalculate" button re-pulls.
   - Keep the existing freeze-on-save behaviour (`parameters_snapshot.amounts`).

4. **UX hint (orthogonal fix for your screenshot confusion):** Render a single muted helper line under the Violation Type dropdown that says *"Amount details will appear below after you select a payment/contribution type."* so the panel's location is obvious before selection.

## Part B — Rule Simulator: render evidence + amount

**Where:** `src/pages/compliance/tools/RuleSimulator.tsx` and `src/services/complianceSimulatorEngine.ts`

The engine already builds `evidence` per detection (period, C3 Submission ID, amount due, paid, shortfall, "Missing Month" for non-filing). Two gaps: (1) the UI isn't rendering the structured evidence consistently per matched period, and (2) the calculation rule output isn't shown next to the matching detection.

1. **Engine — guarantee period attribution** in multi-period scans:
   - Every `DetectionResult` already carries `period`. Confirm DR-002 (non-filing) sets `evidence: [{ Missing Month: 2026-02 }, …]` for every missing month in the scan window, not just the latest. Fill in any rule still missing this (DR-003 / DR-004 should always include `Period`, `C3 Submission ID`, `Amount Due`, `Paid`, `Shortfall`).
   - Add a `linkedCalculationTotal: number | null` field to `DetectionResult`. When a `CalculationResult` matches the same `violationTypeId + period`, populate it with `simulatedAmount` so the UI can render "Amount to be paid" inline.

2. **UI — period-grouped detection list:**
   - Group `detectionResults` by `period` (descending). Each period section shows: the period label (e.g. `Feb 2026`), the matched rule name + reason, an **evidence table** rendered from `result.evidence`, and a "Would-be violation total" pill from `linkedCalculationTotal` (formatted EC$).
   - For non-filing rows: prominently show "Missing C3 — Feb 2026" with the calendar icon.
   - For payment shortfall rows: show C3 Submission ID as a link to the C3 detail page, plus Amount Due / Paid / Shortfall in a compact 3-column block.
   - Add a summary banner: *"Found N issues across M months — total estimated exposure EC$ X,XXX.XX"* (sum of `linkedCalculationTotal`).

3. **No engine logic change** beyond evidence enrichment and the `linkedCalculationTotal` join — the rule semantics, thresholds, and skip outcomes stay exactly as today.

## Out of scope
- No changes to `ce_violation_types`, `c3_calculation_config`, RLS, or migrations.
- No change to the manual-entry submit shape — only the prefill source.
- No change to the auto-detector job — it already writes these amounts.

## Technical notes
- New hook is read-only; uses existing `supabase` client.
- Calculation formulas reuse `policyDefaults` already loaded in `ManualViolationEntry`; no duplicate fetches.
- `linkedCalculationTotal` keyed by `${violation_type_id}|${period}` parallels the existing `existingViolationsByVtIdPeriod` map.
- All amount derivations remain client-side; backend remains source of truth via the snapshot on save.
