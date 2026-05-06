## What's happening on the "Filing & Penalties" tab

The screen edits a dedicated table — `**c3_filing_config_periods**` — through `useFilingConfigPeriods` and the RPCs `analyze_filing_config_change` / `upsert_filing_config_period`. Every row stores 5 parameters with an effective date range:

- `week_start_day`
- `filing_window_unit` (1 = Months, 2 = Days)
- `filing_window_value`
- `penalty_initial_threshold`
- `penalty_subsequent_threshold`

Saving a row works correctly **inside this system**, and the audit trail is recorded. The "Changes Pending Sync" badge lights up because `useC3SyncStatus` hashes the publish payload and detects a difference.

## Why the changes are NOT reaching C3-Wizard

Two independent issues:

### 1. Filing & Penalties is not in the sync payload (root cause)

`useC3ConfigPublish.ts` → `buildSyncPayload()` (Sync Protocol v4.0) reads 12 tables:
periods, levy slabs, bonus policy + exceptions, holiday policy + exceptions, calculation config, income codes, income categories, self-emp rates, IC policies, IC exceptions.
`**c3_filing_config_periods` is missing.** So even a successful publish never carries Filing & Penalties data to the Wizard. The Wizard keeps using whatever filing window / penalty thresholds it has (likely the legacy values from `c3_calculation_config` rows in the `filing` category).

### 2. Recent publishes are failing

The last two `c3_config_sync_log` rows are `status = failed` (29-Apr). The current pending badge is therefore the cumulative drift of every change made on this tab plus any other change since 20-Mar (last `success`). Need to inspect the failure message and, if it is a Wizard-side schema mismatch, deliver the spec doc below before bumping protocol to v4.1.

## Plan

### A. Backend — add Filing & Penalties to the sync payload (Protocol v4.1)

1. **Migration** — add columns to `c3_config_sync_log`:
  - `filing_config_periods_count INTEGER DEFAULT 0`
  - add `last_published_at TIMESTAMPTZ` to `c3_filing_config_periods` (so it participates in the same "mark synced" pattern as the other tables).
2. `**useC3ConfigPublish.ts**`
  - In `buildSyncPayload()` add step 13: `select * from c3_filing_config_periods where is_active = true order by date_from desc`.
  - Add `filing_config_periods` array to the payload, bump `sync_version` to `'4.1'`.
  - Include count in the returned `counts` object and in `SyncPendingCounts`.
  - In `usePublishToC3Wizard`, write the new count to the log row and add the table to the post-success `last_published_at` update batch.
  - Update the success toast and the `c3-sync-status` hash so this tab stops showing a phantom "pending" once Wizard accepts the new payload.
3. **Edge function** `supabase/functions/c3-config-sync-publish/index.ts`
  - Add `filing_config_periods` to the payload-summary log block. (No other change — it's a pass-through.)
4. **UI**
  - `C3SyncHistoryTab.tsx` — show the new count column.
  - `useC3ConfigPublish` — surface "filing periods" in the pending-changes summary.

### B. Documentation for the C3-Wizard team

Create `**docs/C3_WIZARD_FILING_AND_CALCULATION_ALIGNMENT.md**` — a single, business-friendly + technical spec the Wizard team can implement against. Sections:

1. **Purpose & scope** — both portals must produce identical C3 figures for ER and SE filers.
2. **Sync Protocol v4.1 changelog** — new `filing_config_periods` array, JSON schema, sample payload, mapping to Wizard tables, idempotency rule (date-range uniqueness, soft-deactivation on overlap split).
3. **Calculation logic — single source of truth** — for each module:
  - **Period framing** — `week_start_day`, period length, cut-off rule (uses Filing & Penalties row whose `[date_from, date_to]` covers the contribution period).
  - **Filing window** — `filing_window_unit` × `filing_window_value`; due date = period end + window; "late" = filing date > due date.
  - **Penalty model** — initial-phase (`penalty_initial_threshold` periods) vs subsequent-phase (`penalty_subsequent_threshold`), interaction with `c3_calculation_config.penalty` rows, capping rules.
  - **Levy slabs** (`tb_levy_slabs` + details) — bracket selection by wage and effective date.
  - **Social Security** — age limits, employee/employer split, wage cap, NWD director rule.
  - **Bonus policy** — default vs exceptions, year-of-payment vs year-of-accrual.
  - **Holiday pay** — default vs exceptions, included/excluded codes.
  - **Income codes & categories** — meaning of each `tb_income_codes.code`, `tb_income_cat` wage bands for self-employed.
  - **Self-employed contribution rates** — `tb_self_emp_contrib_rate.effstart` lookup.
  - **Voluntary contributor** — eligibility + grace period from `c3_calculation_config.voluntary_contributor`.
4. **Worked examples** — one ER monthly filing and one SE quarterly filing, both crossing a config-split date, showing every sub-total and reconciling to a target XCD figure.
5. **Acceptance tests** — list of input/expected-output rows the Wizard must pass before declaring parity (reuses the cases already in `docs/C3_WIZARD_CALCULATION_TEST_CASES.md` plus new ones for filing-window / penalty edges).
6. **Operational notes** — `x-sync-api-key` header, base URL resolution from `c3_site_settings`, retry on 5xx, payload-hash idempotency, rejection codes the Wizard should return.

The doc is plain-English on each rule first, with the exact column names / formulas in a fenced block underneath, so non-technical and engineering readers can both use it.

### C. Verification

1. After deploy, click **Publish to C3-Wizard**; confirm `c3_config_sync_log` row is `status = success`, `filing_config_periods_count = 1`, and the badge clears.
2. Investigate the two `failed` rows from 29-Apr (read `error_message`) and include the resolution in the doc's "Operational notes".
3. Pick one filing period and one penalty change and walk it through both Admin and Wizard to prove identical outputs.

## Files affected

```text
supabase/migrations/<new>__filing_config_in_sync_v4_1.sql   (new)
src/hooks/useC3ConfigPublish.ts                              (edit)
supabase/functions/c3-config-sync-publish/index.ts           (edit, log only)
src/components/admin/c3-configuration/C3SyncHistoryTab.tsx   (edit)
docs/C3_WIZARD_FILING_AND_CALCULATION_ALIGNMENT.md           (new)
```

No business-logic change on the Admin side — calculation engines stay as-is. The work is to (a) actually ship Filing & Penalties data over the wire and (b) hand the Wizard team a definitive spec so their engine matches.  
  
important note:- make sure unrelated features cannot be impacted.