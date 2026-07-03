# Legal Data Reset & Referential UAT Seed Pack

**Status:** Test / UAT only. **Do NOT run on Production.**
**Location:** `scripts/legal/` (intentionally NOT under `supabase/migrations/`, so these files are never applied automatically to Live on publish).

## Files

| Order | File | Purpose |
|---|---|---|
| 1 | `scripts/legal/01_reset.sql` | Truncates every Legal operational table in dependency-safe order. |
| 2 | `scripts/legal/02_master_seed.sql` | Idempotent reseed of Legal reference data (courts, court officers). Assumes prior reference groups (matter type, priority, stage, status, fund type, liability type, fee heads) remain in place. |
| 3 | `scripts/legal/03_uat_seed.sql` | Seeds the 3 base end-to-end UAT scenarios (multi-period arrears, consent breach, benefit overpayment). |
| 4 | `scripts/legal/05_extra_scenarios.sql` | Extends the base seed with Appeal (S4), Enforcement (S5), and External Counsel + Court Filing (S6). |
| 5 | `scripts/legal/04_validate.sql` | Read-only orphan / financial-rollup checks. Every result set should return 0 rows. |


## How to run (Test only)

Open **Cloud → Run SQL** with **Test** selected, then execute each file in order:

1. `01_reset.sql` — expects final `SELECT` to return zeros.
2. `02_master_seed.sql` — safe to re-run.
3. `03_uat_seed.sql` — inserts the 3 base UAT scenarios with deterministic IDs.
4. `05_extra_scenarios.sql` — adds Appeal / Enforcement / External Counsel + Filing scenarios on top of the base seed.
5. `04_validate.sql` — must return 0 orphans; the last `SELECT` is the rollup summary.


The reset script includes a soft guard that refuses to run if the database name contains `prod`.

## Scenarios seeded

| # | Scenario | Anchor | Highlights |
|---|----------|--------|-----------|
| 1 | Multi-period arrears recovery | Employer SKN Construction Services Ltd. | 3 liabilities across SS / Housing Levy / Severance Fund; hearing → judgment → 50% payment; active recovery assignment. |
| 2 | Consent order with breach | Employer Basseterre Retail Group Ltd. | 2 liabilities → consent order → 6 installments (2 paid, 2 missed) → status = BREACHED. |
| 3 | Benefit overpayment settlement | Person Jane Doe (SEED-IP-001) | BN referral → intake → matter → settled in full. |
| 4 | Appeal (extends S1) | Judgment on SKN Construction case | Appeal filed against `SEED-ORD-0001` linked to Housing Levy + Severance liabilities; outcome `PARTIALLY_ALLOWED`. |
| 5 | Enforcement (extends S2) | Breached consent order on Basseterre Retail | Garnishment action with partial recovery (XCD 5,000) + enforcement cost booked to `lg_legal_cost`. |
| 6 | External Counsel + Court Filing (extends S1) | Kelsick, Wilkin & Ferdinand engaged on S1 | Engagement → response filing at High Court → `lg_legal_cost` recorded with `linked_engagement_id` + `linked_filing_id`. |

All monetary values are XCD and reconcile against `v_lg_case_financials`.


## Financial integrity

- `lg_recoverable_liability` is the sole source of financial truth.
- `paid` on each liability equals the sum of its `lg_payment_allocation.allocated_amount`.
- `outstanding = total_assessed - paid` (checked in `04_validate.sql`).
- Case-level totals are always derived from `v_lg_case_financials`; the `lg_case.total_outstanding` snapshot is set only for display and is validated to match the view.

## What is NOT touched

- `au_er_master`, `au_ip_master`, `er_master`, `ip_master`, core finance ledger tables — untouched by any script. Employer/person identifiers on seeded rows are `SEED-EMP-*` / `SEED-IP-*` and are stored in `legacy_employer_name` / `legacy_person_name` for UI display.
- Existing global reference groups (matter type, priority, stage, status, fund type, liability type, fee master) — assumed already seeded from prior migrations.
- Compliance module operational data — the seed only inserts `ce_legal_referrals` rows tagged `SEED-CE-REF-*`.

## Follow-up scenarios (not in the initial seed)

To keep the first cut reviewable, the following can be added on the same pattern in a `05_extra_scenarios.sql`:

- Appeal filed against S1 judgment, linked to `s1_liab1` only.
- Enforcement action on the S2 breached consent order.
- External counsel engagement + court filing + legal cost on S1.

Each additional block should follow the same rules: deterministic UUIDs, junction rows on every liability link, and matching `lg_case_activity` entries.

## Publish safety

Because these files live outside `supabase/migrations/`, `publish` will **not** run them against Live. To promote the master reseed to Live in future, hand-copy `02_master_seed.sql` into a proper migration — leave `01_reset.sql` and `03_uat_seed.sql` out of the migration pipeline permanently.
