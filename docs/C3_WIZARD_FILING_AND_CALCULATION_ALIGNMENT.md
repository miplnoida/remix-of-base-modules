# C3 Calculation & Sync Alignment Specification — for the C3-Wizard Team

**Owner:** SSB Admin (this system)
**Audience:** C3-Wizard backend & QA team
**Status:** Sync Protocol **v4.1** (supersedes v4.0)
**Last updated:** 2026-05-06

> **Why this document exists.** Both the SSB Admin portal and the C3-Wizard portal must produce **identical C3 figures** for every employer (ER) and self-employed (SE) filer, because both portals use the same underlying configuration. The Admin side is the single source of truth: every change made in **Admin → C3 Configuration** is pushed to C3-Wizard via the sync endpoint and must be applied verbatim, then used by the Wizard's calculation engine.
>
> Recently the **Filing & Penalties** tab (`/admin/c3-configuration` → "Filing & Penalties") accepted edits but did **not** make it into the sync payload — it was missing from Protocol v4.0. Protocol **v4.1** fixes this. This doc tells you exactly what to receive, where to store it, and how to use it in calculations.

---

## 1. Scope

Both portals must produce identical results for:

1. Period framing (when does a contribution period begin and end?)
2. Filing window & due date (when is a C3 considered late?)
3. Penalty / fine model (initial vs subsequent phase, rates and caps)
4. Levy slab calculation
5. Social Security contribution (employee + employer split, age caps, wage caps, NWD director rule)
6. Bonus & holiday-pay treatment
7. Income code & income category mapping
8. Self-employed contribution rates
9. Voluntary contributor eligibility and contribution

Out of scope: payment receipts, accounting allocation, dunning. Those remain Admin-side.

---

## 2. Sync Protocol v4.1 — what changed

### 2.1 Transport (unchanged from v4.0)

```
POST  {C3_WIZARD_BASE_URL}/c3-config-sync
Header: x-sync-api-key: {OUTBOUND_SYNC_API_KEY}
Body:   application/json
Idempotency: payload-hash (Wizard may ignore duplicate hashes)
```

The Wizard MUST always respond with HTTP 200 and a JSON envelope:

```json
{ "status": "success" | "skipped" | "error",
  "error":  "...", "error_type": "..." }
```

> The two failed publishes on 2026-04-29 returned `Unauthorized: Invalid or missing API key`. Please confirm the API key configured for the production sync endpoint matches `OUTBOUND_SYNC_API_KEY` rotated in c3_site_settings.

### 2.2 Payload — new array `filing_config_periods`

Top-level shape (only the new key shown — all others identical to v4.0):

```jsonc
{
  "sync_version": "4.1",
  "sync_timestamp": "2026-05-06T10:25:00Z",
  "config_periods":           [...],
  "levy_slabs":               [...],
  "bonus_policies":           [...],
  "bonus_exceptions":         [...],
  "holiday_policies":         [...],
  "holiday_exceptions":       [...],
  "calculation_configs":      [...],
  "income_codes":             [...],
  "income_categories":        [...],
  "self_emp_contrib_rates":   [...],
  "income_code_policies":     [...],
  "income_code_exceptions":   [...],

  // NEW in v4.1
  "filing_config_periods": [
    {
      "id": "uuid",
      "date_from": "2026-02-01",          // inclusive, ISO date
      "date_to":   null,                   // inclusive, ISO date or null = open-ended
      "week_start_day": 1,                 // 1=Mon ... 7=Sun (ISO-8601 day index)
      "filing_window_unit":  1,            // 1 = Months, 2 = Days
      "filing_window_value": 1,            // integer >= 1
      "penalty_initial_threshold":     1,  // periods, integer >= 0
      "penalty_subsequent_threshold": 12,  // periods, integer >= 1
      "is_active": true,
      "created_by": "USR0001",
      "created_at": "...",
      "updated_by": "USR0001",
      "updated_at": "...",
      "last_published_at": "..."
    }
  ]
}
```

**Suggested Wizard table:** `wiz_c3_filing_config_periods` with the same column names. Apply full-replace per `id`; treat the array as the authoritative set of *active* rows. Soft-deactivate any local row whose `id` is no longer present and whose `is_active` was previously `true`.

**Date-range invariants (Admin enforces these — Wizard should verify):**

- Exactly one row may have `date_to = null` (the open-ended/current row).
- No two active rows may overlap in `[date_from, date_to]`.
- When the Admin changes a parameter mid-life, the existing row is **split**: its `date_to` is set to (`new.date_from − 1 day`) and a new row is created from `new.date_from`. Both rows are sent in the payload — do not delete history.

---

## 3. Calculation logic — single source of truth

For every rule below the **plain English** statement comes first; the formula / column names follow in a fenced block. Where applicable the Admin file path is given so engineers can cross-check.

### 3.1 Period framing

A contribution period is a calendar week (ER) or a calendar month/quarter (SE). The week starts on **Week Start Day** of the Filing & Penalties row whose `[date_from, date_to]` covers the period start date.

```text
periodConfig = filing_config_periods row where
               date_from <= periodStart AND (date_to IS NULL OR date_to >= periodStart)
weekStartIso = periodConfig.week_start_day        -- 1..7, Mon=1
```

> Reference: `src/utils/weekCalculations.ts`, `src/components/admin/c3-configuration/C3FilingConfigTab.tsx`.

### 3.2 Filing window & due date

The C3 for a given period is "on time" if filed on or before:

```text
dueDate = periodEnd + (filing_window_value × filing_window_unit)
          where unit 1 = months, unit 2 = days
late      = filingDate > dueDate
daysLate  = filingDate − dueDate          -- only when late
```

Use the `filing_config_periods` row that covers the **period end** date.

### 3.3 Penalty / fine model

When `late = true`, the system applies the **Initial-phase** penalty for the first
`penalty_initial_threshold` *periods* of lateness, then switches to the **Subsequent-phase** penalty for up to `penalty_subsequent_threshold` further periods.

```text
phase = (periodsLate <= penalty_initial_threshold) ? "initial" : "subsequent"
```

The actual penalty/fine *rates* (percentages and capping rules) come from `c3_calculation_config` rows (category = `penalty`):

| `config_key`                          | Meaning                                |
|---------------------------------------|----------------------------------------|
| `levy_penalty_initial_rate`           | Levy penalty during initial phase      |
| `levy_penalty_subsequent_rate`        | Levy penalty during subsequent phase   |
| `severance_penalty_initial_rate`      | Severance penalty initial              |
| `severance_penalty_subsequent_rate`   | Severance penalty subsequent           |
| `ss_fine_initial_rate`                | SS fine initial                        |
| `ss_fine_subsequent_rate`             | SS fine subsequent                     |

```text
penaltyAmount = baseAmount × rate(category, phase)
```

The thresholds (`penalty_initial_threshold`, `penalty_subsequent_threshold`) live in the **Filing & Penalties** row; the rates live in **Calculation Config**. Both are sent in every sync.

### 3.4 Levy

Brackets (slabs) live in `levy_slabs` + slab `details`; pick the slab whose `start_date / end_date` covers the period date. For each line in the C3:

```text
slab = active levy slab covering periodDate
for each detail row (ordered by order_no):
    if wage between detail.wage_lower and detail.wage_upper:
        levy = wage × detail.rate
```

Honour the **NWD director** override (see 3.5 below — `nwd_employee_levy_rate`).

### 3.5 Social Security

Pick the active `c3_config_periods` row that covers the period date and read its `c3_config_details`:

```text
employeeSS = min(wage, employee_ss_max_wage) × employee_ss_rate    if age in [min_age_ss, max_age_ss]
employerSS = min(wage, employer_ss_max_wage) × employer_ss_rate    same age window
employerEIB = min(wage, employer_eib_max_wage) × employer_eib_rate
```

**Non-Working Director (NWD)** — when the IP is flagged `is_for_director = true` on the C3 detail line, override the levy rate with `nwd_employee_levy_rate`. Applies to ER filings only.

> Reference: `mem://business-rules/c3-calculation-logic-standards`, `docs/C3_WIZARD_NWD_LEVY_RATE_GUIDE.md`, `docs/C3_WIZARD_NWD_IS_FOR_DIRECTOR_GUIDE.md`.

### 3.6 Bonus

`bonus_policies` (default per date range) + `bonus_exceptions` (per year/employer override). The default applies unless an exception covers the year and (if specified) the employer. Bonus is treated as wages of the period in which it was *paid*, not accrued.

### 3.7 Holiday Pay

Same default + exception model in `holiday_policies` / `holiday_exceptions`. The policy rows tell you which income codes (3.8) participate as holiday pay and how they're capped.

### 3.8 Income codes & categories

- `income_codes` — master list of allowable wage codes used in C3 line items.
- `income_categories` (`tb_income_cat`) — wage bands for self-employed (`wage_lower`, `wage_upper`, `monthly_contribution`).
- `income_code_policies` / `income_code_exceptions` — which codes count toward SS-able / Levy-able / pensionable wage, by date range. **Defaults applied unless an exception matches.**

### 3.9 Self-employed contribution rates

`self_emp_contrib_rates` (`tb_self_emp_contrib_rate`) — pick the row whose `effstart` ≤ periodDate (latest). Combine with the IP's `income_categories` band. Voluntary contributor eligibility further filters this — see 3.10.

### 3.10 Voluntary Contributor

Pulled from `calculation_configs` (category = `voluntary_contributor`) — eligibility window, grace period, mandatory residence in SKN, and contribution rate. C3 must not be accepted for a VC outside their eligibility window.

> Reference: `mem://business-rules/voluntary-contributor-eligibility-and-filing`.

---

## 4. Worked examples

### 4.1 ER monthly filing crossing a config-split

| Input                       | Value                       |
|-----------------------------|-----------------------------|
| Period                      | 2026-02 (Feb 2026)          |
| Wages                       | XCD 4,000                   |
| Age                         | 35                          |
| Filing date                 | 2026-04-15                  |
| Filing & Penalties row      | `from=2026-02-01`, unit=Months, value=1, init=1, subseq=12 |

```text
periodEnd = 2026-02-28
dueDate   = 2026-03-31
daysLate  = 15  -> periodsLate = 1 (Months)
phase     = "initial" (1 <= 1)
penalty   = 4000 × levy_penalty_initial_rate (e.g. 0.10) = 400
```

### 4.2 SE quarterly filing in the subsequent phase

| Input                       | Value                       |
|-----------------------------|-----------------------------|
| Period                      | 2025-Q4                     |
| IP wage band                | Cat 3 (XCD 2,500–3,499)     |
| Filing date                 | 2026-09-30                  |
| Filing & Penalties row      | unit=Months, value=1, init=1, subseq=12 |

```text
periodEnd     = 2025-12-31
dueDate       = 2026-01-31
periodsLate   = 8 months
phase         = "subsequent" (8 > 1)
penalty       = wage × ss_fine_subsequent_rate
```

Both portals must arrive at the same penalty XCD figure for the same inputs.

---

## 5. Acceptance tests

The Wizard team must pass every row before declaring v4.1 parity. Re-use the existing cases in **`docs/C3_WIZARD_CALCULATION_TEST_CASES.md`** plus the additions below; both portals must return the same XCD figures and the same `phase` label.

| #   | Scenario                                                          | Expected output                                                       |
|-----|-------------------------------------------------------------------|-----------------------------------------------------------------------|
| F-1 | On-time filing                                                    | `late = false`, `penalty = 0`                                         |
| F-2 | 1 period late, `penalty_initial_threshold = 1`                    | `phase = "initial"`                                                   |
| F-3 | 2 periods late, `penalty_initial_threshold = 1`                   | `phase = "subsequent"`                                                |
| F-4 | 13 periods late, `penalty_subsequent_threshold = 12`              | Penalty capped at the subsequent-phase ceiling                        |
| F-5 | Filing date crosses a Filing & Penalties row split                | Use the row whose range covers the **period end**, not today          |
| F-6 | `filing_window_unit = 2` (Days), value = 30                       | Due date = period end + 30 days                                       |
| F-7 | `week_start_day = 7` (Sunday)                                     | Period framing aligns Sun→Sat                                         |
| F-8 | NWD director, levy override                                       | Uses `nwd_employee_levy_rate`                                         |
| F-9 | VC outside eligibility window                                     | C3 rejected with eligibility error                                    |

---

## 6. Operational notes

1. **Authentication.** Header `x-sync-api-key` must equal `OUTBOUND_SYNC_API_KEY` row in `c3_site_settings` for the active environment. Reject with HTTP 200 + `{ status: "error", error_type: "auth_error" }` so the Admin log captures it cleanly.
2. **Idempotency.** Admin sends a `payload_hash` (first 64 chars of base64 of the JSON body). If the Wizard has already applied the same hash, respond with `{ status: "skipped" }` — Admin treats this as success.
3. **Full-replace for new tables.** `filing_config_periods` is a small whitelist; replace the active set on every successful publish.
4. **Backwards compatibility.** Wizard endpoints must continue accepting v4.0 payloads (with no `filing_config_periods` key) for one release window; treat the array as empty when missing.
5. **Field-level change history.** Continue to populate the field-level change log so the Admin's "Sync History → Changes" dialog can render diffs for filing config rows just as it does for SS/Levy fields today (`getConfigChangeSummary`).
6. **Errors observed (2026-04-29)** — both publishes returned `Unauthorized: Invalid or missing API key`. Please rotate / re-issue the sync key and confirm; Admin will publish again once received.

---

## 7. Change-control checklist for the Wizard team

- [ ] Add table `wiz_c3_filing_config_periods` with the columns in §2.2.
- [ ] Update `c3-config-sync` endpoint to read `filing_config_periods` from the payload and upsert by `id`.
- [ ] Replace any hardcoded `week_start_day` / filing-window / penalty-threshold values in the Wizard's calculation engine with lookups against this table.
- [ ] Implement period-coverage helper described in §3.1 / §3.2.
- [ ] Run all tests in §5 against both portals; sign off when XCD outputs match line-for-line.
- [ ] Confirm the field-level change history exposes `filing_config_periods` to the Admin's audit dialog.
- [ ] Reply to Admin team with the new sync API key (or confirmation of the existing one) so failed publishes can be retried.
