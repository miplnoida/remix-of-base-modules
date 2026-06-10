## Compliance & Enforcements — Issue Triage & Fix Plan

Below is one targeted fix per reported issue. Each item names the screen, the suspected root cause (to confirm during build), and the change.

### 1. Overview → Active Violations count is wrong

- **File:** `src/pages/compliance/dashboards/ComplianceDashboard.tsx` (and the underlying KPI hook/view).
- **Root cause hypothesis:** the tile counts ALL `ce_violations` rows or filters on a stale enum (e.g. excludes `IN_PROGRESS`/`UNDER_REVIEW`).
- **Fix:** define "Active" = `status NOT IN ('RESOLVED','CLOSED','DISMISSED','CANCELLED','MERGED','SPLIT_PARENT')` AND `is_archived = false`. Update the dashboard query and any DB view (`ce_v_*` metrics) to match. Add a tooltip on the tile listing the exact statuses it includes so the value is auditable.

### 2. Reports → Arrears & Collections → Total Arrears by Zone — wrong revenue

- **File:** `src/pages/compliance/reports/ArrearsReports.tsx`.
- **Root cause hypothesis:** sum is taken from `ce_arrears_report_entries.amount` without filtering by status (includes waived/written-off) or duplicates across `ce_employer_financial_ledger`.
- **Fix:** switch the zone aggregation to sum `outstanding_amount` (principal + penalty + interest − paid − waived − written_off) from the financial ledger grouped by `ce_zones.id`, joined via employer → office → zone. Show a small "as of &nbsp;" and a drill-down list so the user can reconcile.

### 3. Risk Band Distribution — labels overlapping

- **File:** chart inside `src/pages/compliance/dashboards/ComplianceAnalytics.tsx` (Recharts PieChart/BarChart).
- **Fix:** for the pie, move labels outside with leader lines (`labelLine`, `outerRadius` reduced, `label={renderCustomLabel}`), hide labels for slices <5% and surface them via legend + tooltip only. Add `minAngle` and increase container height on narrow viewports.

### 4. Manual Violation → Payment-type violation has no amount; Rule Simulator lacks "why"

- **Files:** `src/pages/compliance/violations/ManualViolationEntry.tsx`, `src/components/compliance/detection/*`, simulator under `src/components/compliance/simulator/*`.
- **Fix A (form):** when `violation_type` resolves to a payment category (non-payment, short-payment, late-payment), render the same fields the auto-detector writes: `period_month` (month picker), `expected_amount`, `paid_amount`, `shortfall_amount` (auto-calc), `due_date`, `days_overdue`, plus the existing `parameters_snapshot` resolved from `c3_calculation_config`. Persist into `ce_violations.parameters_snapshot` and the dedicated columns.
- **Fix B (simulator):** extend the detector's result row to include `evidence`: `{ missing_period: 'YYYY-MM', c3_submission_id, expected_amount, paid_amount }`. Render an "Evidence" sub-row in the simulator table so the user sees exactly which month was missed and which C3 submission proved it.

### 5. Manual Violation → Employer ID should be a searchable picker

- **File:** `src/pages/compliance/violations/ManualViolationEntry.tsx`.
- **Fix:** replace the free-text `employer_id` input with the existing `SearchableSelect` employer picker used on `C3 Management → C3 Contribution` (reuse the same hook/component so behaviour, paging, and search-by-name/RegNo are identical). Store the selected employer's UUID and snapshot name/RegNo into the violation row.

### 6. Send to Legal → "Generate Recommendations" does nothing

- **Files:** `src/pages/compliance/legal/*`, `src/components/compliance/CaseRequestActions.tsx` and the legal-escalation hook.
- **Root cause hypothesis:** the button calls a missing/renamed RPC or relies on `ce_legal_recommendations` insert that fails silently because of a missing `referral_id`.
- **Fix:** wire the button to `generate_legal_recommendations(case_id)` (server function), surface errors via the shielded-error toast, and on success refresh the recommendations panel. If the RPC doesn't yet exist, add it to apply `ce_legal_escalation_policy_rules` against the case context and insert into `ce_legal_recommendations`.

### 7. Auto-generated violations missing from All Violations list

- **File:** `src/pages/compliance/violations/ViolationsManagement.tsx`.
- **Root cause hypothesis:** the list query filters `source = 'MANUAL'` or `created_by IS NOT NULL`, or requires `assigned_to` which auto rows lack.
- **Fix:** remove the implicit filter; default the list to "All sources" with a Source facet (Manual / Auto / Imported). Confirm by counting `ce_violations` grouped by `source` and matching to the screen count.

### 8. Assign / Reassign violation or case to another officer

- **Files:** `src/pages/compliance/cases/CaseDetailView.tsx`, `src/pages/compliance/violations/ViolationDetails.tsx`, `src/components/compliance/BulkViolationActions.tsx`, and the workboard page that "shows workload".
- **Fix:** add an "Assign / Reassign" action that opens a dialog with an officer picker (filtered by `ce_inspectors` + `ce_queue_members` for the relevant queue/zone), reason text, and effective date. Write to `ce_violation_assignments` / `ce_case_assignments` (close prior row with `unassigned_at`, insert new row), append to `ce_case_history`, and trigger the existing notification template. Expose the same action as a bulk action on the list and from the workload page so officers can be rebalanced in one click.

### 9. Explain & verify the "Split" option in Violations

- **File:** `src/components/compliance/ViolationSplitDialog.tsx`.
- **Purpose:** Split lets an officer break one detected violation that actually represents multiple distinct breaches (e.g. 3 different months of non-payment lumped into one detection) into independent child violations so each can be tracked, noticed and resolved separately. Parent is marked `SPLIT_PARENT` and remains for audit; children inherit employer + case linkage with independent statuses and amounts.
- **Verification work:** add a unit/integration test that (a) sum of child `amount` = parent `amount`, (b) parent transitions to `SPLIT_PARENT` and no longer counts as Active (ties to issue #1), (c) children appear in All Violations (ties to #7), (d) audit row written to `ce_violation_history`. Fix any of those that fail.

### Cross-cutting

- Update the Knowledge Repo entries for: Violation lifecycle (split/merge/active definition), Manual Violation form schema, Legal recommendation generation, Assignment model.
- Add SQL integrity checks under `supabase/tests/sql/` for: parent/child sum invariant; "active count" definition; zone arrears reconciliation.
- All UI mutations go through `useBlockingMutation`; multi-row assign uses `submittingId`.

### Out of scope

- Re-architecting the workboard layout (only adding the assign action).
- Changing `c3_calculation_config` semantics (already covered by the prior snapshot work).