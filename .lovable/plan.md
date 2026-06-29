## Problem

The **Total Arrears by Zone** report (and the rest of the Arrears & Collections group) reads from `ce_arrears_report_entries`, a 5-row seed snapshot table totaling **EC$ 482,000**. The math on the page is internally consistent (245k + 170k + 67k = 482k), but the source table is stale demo data — it is not the actual arrears in the system.

Live arrears already exist in the view `ce_v_employer_arrears_summary`, computed from `cn_c3_reported` minus `cn_payment` per employer:

- Employers with arrears: **1,775**
- Total outstanding (arrears + penalties): **EC$ 109.98M**
- Current arrears only: **EC$ 104.64M**

The view has no `zone` column, so zone must be resolved separately. The most reliable per-employer zone mapping in the system today is `ce_violations.zone_id → ce_zones.zone_name` (used by Zone 1 - Basseterre / Zone 2 - St. Peters / Zone 3 - Nevis). Employers without any violation row fall back to `Unassigned`.

## Fix

Switch the Arrears reports from the seed snapshot table to a live loader that joins arrears + zone.

### 1. `src/pages/compliance/reports/shared/reportVariants.ts`

Add a shared `loadLiveArrears()` helper that:

- Pages through `ce_v_employer_arrears_summary` (1k-row chunks, existing `loadAll` pattern) and keeps rows where `has_arrears = true`.
- Pages through `ce_violations` selecting `employer_id, zone_id`, joins to `ce_zones (id, zone_name)`, builds an `employer_id → zone_name` map (most recent assignment per employer wins; ties resolved by latest `updated_at`).
- Returns rows shaped like `{ employer_id, regno, employer_name, zone, total_arrears, current_penalty, total_outstanding }` so existing columns continue to work. `total_arrears` maps to `current_arrears` from the view; `aging_category`, `last_payment_date`, `trend` are derived where possible (last payment from `cn_payment` max date per employer; aging bucket from days since last payment: 0–30 / 30–60 / 60–90 / 90+; trend left as `—` for now since we have no historical snapshots).

Rewire these three variants to use the new loader:

- `arrears_by_zone` — group live rows by zone, sum `total_arrears`, count employers.
- `arrears_aging` — group live rows by derived `aging_category`.
- `arrears_top_50` — sort live rows by `total_arrears` desc, slice 50.

`arrears_collections_over_time` continues to use `ce_v_violation_trends` (unchanged).

### 2. `src/pages/compliance/reports/ArrearsReports.tsx`

Replace the `ce_arrears_report_entries` query with the same live loader (export it from `reportVariants.ts` or co-locate in a new `src/hooks/compliance/useLiveArrears.ts`). KPIs (Total Arrears, Employers, 90+ Days, Increasing), the by-zone summary card, and the Top Arrears table all consume the live rows. Drop the seed `As of … Source: ce_arrears_report_entries` line and replace with `As of <now> · Source: ce_v_employer_arrears_summary`.

### 3. Cache invalidation

Bump the React Query keys to `ce_live_arrears_v1` so cached stale snapshot rows are discarded on first load.

### 4. Seed table

Leave `ce_arrears_report_entries` in place (other modules may still reference it during the transition), but stop reading from it in these reports.

## Verification

- Run the page: Total Arrears KPI should now read ≈ **EC$ 104.6M** across **1,775 employers**, distributed across `Zone 1 - Basseterre`, `Zone 2 - St. Peters`, `Zone 3 - Nevis`, and `Unassigned`.
- Confirm zone subtotals add up to the KPI total.
- Confirm Top 50 employers list shows real names from `tb_employer_master` via the view, not the 5 seed names (`ABC Manufacturing Ltd`, etc.).
- Confirm Arrears Aging Analysis and Total Arrears by Zone drill-down pages reflect the same totals.

## Out of scope

- No schema migration; no changes to `ce_v_employer_arrears_summary` or `ce_violations`.
- Trend (`increasing/decreasing/stable`) stays blank until a historical snapshot table exists — flagged for a separate task.
- Other reports under Reports → Inspector Performance / C3 / Audit are unchanged.
