# C3-Wizard Team — Answers to v3.0 Sync Questions

> **From:** SSB Admin Team (C3 Configuration)  
> **To:** C3-Wizard Team  
> **Date:** 2026-03-03  
> **Re:** 8 Critical Questions on v3.0 Sync Guide

---

## Question 1: `employer_eib_max_wage` — Wage Ceiling or Contribution Cap?

**Answer: It is a WAGE CEILING (insurable earnings cap for EIB).**

Wages are capped at `employer_eib_max_wage` before multiplying by the EIB rate. The formula is:

```
Employer EIB = employer_eib_rate × MIN(wage_base, employer_eib_max_wage)
```

This is identical in concept to how `employee_ss_max_wage` and `employer_ss_max_wage` work for Social Security — they cap the wage base, not the resulting contribution.

**Current implementation note:** The Admin RPC currently uses `employee_ss_max_wage` as the EIB ceiling (both default to $6,500). The `employer_eib_max_wage` field was added to allow these to diverge in the future. **C3-Wizard should use `employer_eib_max_wage` as the EIB-specific wage ceiling** going forward. This is the correct and intended behavior.

**Formula for C3-Wizard:**
```
employer_eib = ROUND(employer_eib_rate × MIN(eib_wage_base, employer_eib_max_wage), 2)
```

---

## Question 2: `bonus_levy_rate` Removal — Where Is the Rate Now?

**Answer: There is no longer a single flat "bonus levy rate" in `config_details`.**

The legacy `bonus_levy_rate` (3.5%) from `wiz_c3_config_details` is **fully replaced** by the policy framework. The rate is now determined by the `calculation_method` in `wiz_bonus_policy_default`:

| Method | How Levy Is Calculated |
|---|---|
| `merge` | Bonus is distributed into weekly wage slots (per `distribution` config), then the standard levy slab is applied to the merged amounts. No separate rate. |
| `separate` | If `calc_flat_enabled = true`, use `calc_flat_percentage` as the flat rate on bonus. If `calc_slab_enabled = true`, apply the pay-period slab to the bonus as a standalone payment. |

**So the answer is:**
- For `merge`: No rate — slab-based on merged wages.
- For `separate` + `calc_flat_enabled`: The rate is `calc_flat_percentage` (stored in `wiz_bonus_policy_default.calc_flat_percentage`).
- For `separate` + `calc_slab_enabled`: Standard levy slab applied to the bonus amount.

The old 3.5% rate can be configured as `calc_flat_percentage = 3.5` with `calc_flat_enabled = true` and `calculation_method = 'separate'` if that behavior is desired for a period.

---

## Question 3: December Bonus Exemption — Handled via Exceptions?

**Answer: Yes, exclusively via `wiz_bonus_policy_exceptions`.**

The old `wiz_bonus_levy_exemptions` table is **fully deprecated** (renamed to `nu_wiz_bonus_levy_exemptions`). December bonus exemption is now configured as:

```json
{
  "exception_type": "recurring",
  "exception_month": 12,
  "year_from": 2026,
  "year_to": null,
  "override_default": true,
  "include_in_levy": false,
  "description": "December bonus exempt from levy"
}
```

**Resolution order in the calculation engine:**
1. Check `wiz_bonus_policy_exceptions` for `exception_month = 12` AND `year_from <= filing_year` AND (`year_to IS NULL OR year_to >= filing_year`) AND `override_default = true`
2. If found → use exception fields (NULL fields inherit from default policy)
3. If not found → fall back to `wiz_bonus_policy_default`

The `recurring` type means it applies every year from `year_from` onward (until `year_to`). A `onetime` type applies only in the specific `year_from`.

---

## Question 4: `interest_rate_*` Fields — Send 0.00 or Omit?

**Answer: Omit entirely from the sync payload.**

The 5 interest rate fields (`interest_rate_ss_principal`, `interest_rate_levy_principal`, `interest_rate_severance_principal`, `interest_rate_penalties`, `interest_rate_fines`) were **dropped from the Admin `c3_config_details` table** in migration `20260226230616`. They no longer exist in the Admin schema.

**Recommendation for C3-Wizard:**
- If these columns exist in `wiz_c3_config_details`, **keep them** for backward compatibility but do NOT expect values from the sync payload.
- They will NOT be included in the sync payload.
- If they still exist in the Wizard table, their current values (likely `0.00` from defaults) will remain unchanged during sync UPSERTs since the column won't be in the update set.
- These fields may be re-introduced in a future version if interest calculation requirements are defined.

---

## Question 5: Holiday Pay Distribution — Who Handles It?

**Answer: Distribution is handled by the Admin system. C3-Wizard receives the final amounts.**

For `with_dates` holiday pay policies where `distribution_enabled = true`:

1. **Admin handles the distribution** — holiday pay is split equally across the weeks spanned by the provided holiday dates.
2. **Portions for the current month** are added directly to the employee's weekly wage slots (w1–w5) before the C3 submission reaches the calculation engine.
3. **Portions for future months** are stored in Admin's `c3_pending_holiday_pay` table and automatically applied when future C3 submissions are processed for that SSN/period.

**C3-Wizard does NOT need to:**
- Perform weekly distribution calculations
- Maintain a `c3_pending_holiday_pay` mirror table
- Process holiday dates

**C3-Wizard DOES need to:**
- Apply the `without_dates` policy rules (levy, SSC, severance flags) when holiday pay is reported without dates (as current-period income).
- For `with_dates`: When `distribution_enabled = true`, all specific levy/SSC/severance rules are **IGNORED** — the distributed amounts are simply part of regular weekly wages and processed normally.

---

## Question 6: `merge` vs `separate` Calculation Method — Confirmed

**Answer: Your understanding is correct.**

| Method | Behavior |
|---|---|
| **`merge`** | Bonus is distributed into weekly wage slots (w1–w5) according to the `distribution` config (which week gets the bonus, or divide equally). Then the standard levy slab is applied to each merged wage amount. SS/EIB calculations also use the merged wage base when `contrib_employee`/`contrib_employer`/`contrib_eir` flags are true. |
| **`separate`** | Regular wages are processed through levy slabs normally (bonus excluded). Then the bonus is calculated independently: either via `calc_flat_percentage` (if `calc_flat_enabled = true`) or via the pay-period slab (if `calc_slab_enabled = true`). The two levy amounts are summed. |

**Key detail for `merge`:** The distribution config determines exactly which weeks receive the bonus:
- Weekly: Specific week(s) selected via `w1/w2/w3/w4` flags, or `divide = true` for equal split across all weeks.
- Bi-Weekly: `b1` or `b2` selects the payment, or `divide = true` for equal split.
- Monthly: Bonus is added to the first payment slot.

**For SS contributions**, `merge` vs `separate` does NOT affect SS — the `contrib_employee`/`contrib_employer`/`contrib_eir` flags independently control whether bonus is added to the SS wage base, regardless of the levy calculation method.

---

## Question 7: SSC Flags on Bonus Policy — `contrib_employee = false`

**Answer: When `contrib_employee = false`, the bonus is excluded from the employee's SS wage base entirely.**

The logic is:

```sql
-- Employee SS base starts with taxable wages (wages excluding bonus)
v_employee_ss_base := v_taxable_wages;  -- = total_wages - bonus

-- Only add bonus back to SS base if contrib_employee is true
IF v_bonus_eligible AND v_bp_contrib_employee THEN
  v_employee_ss_base := v_employee_ss_base + v_bonus;
END IF;

-- SS is calculated on the capped base
v_ss_insurable := MIN(v_employee_ss_base, employee_ss_max_wage);
v_employee_ss := ROUND(v_ss_insurable × employee_ss_rate, 2);
```

**Behavior summary:**

| Flag | Effect |
|---|---|
| `contrib_employee = true` | Bonus is added to employee SS wage base → Employee SS contribution increases |
| `contrib_employee = false` | Bonus is NOT in employee SS wage base → Employee SS is on regular wages only |
| `contrib_employer = true` | Bonus is added to employer SS wage base → Employer SS contribution increases |
| `contrib_employer = false` | Bonus is NOT in employer SS wage base |
| `contrib_eir = true` | Bonus is added to EIB wage base → Employer EIB contribution increases |
| `contrib_eir = false` | Bonus is NOT in EIB wage base |

Each flag operates **independently**. You can have `contrib_employee = false` but `contrib_employer = true` — meaning the employer pays SS on the bonus but the employee does not.

---

## Question 8: December YTD Threshold ($18,720) — Still Applicable?

**Answer: The legacy $18,720 YTD check has been replaced by `min_bonus_amount` / `max_bonus_amount` in the new policy framework.**

The old system checked if the employee's Year-To-Date earnings exceeded $18,720 before applying bonus levy. This is no longer a separate check.

**New mechanism:**
- `min_bonus_amount`: If the bonus amount is **below** this value, the bonus is treated as not eligible — all policy rules (levy, SS, severance) are skipped for this bonus.
- `max_bonus_amount`: If the bonus amount is **above** this value, the bonus is also treated as not eligible.

```sql
-- Capping logic in the RPC
IF v_bp_min_bonus IS NOT NULL AND v_bonus < v_bp_min_bonus THEN v_bonus_eligible := false; END IF;
IF v_bp_max_bonus IS NOT NULL AND v_bonus > v_bp_max_bonus THEN v_bonus_eligible := false; END IF;
```

**Current default values:** `min_bonus_amount = 1000`, `max_bonus_amount = 75000`.

**If the Wizard team needs the old YTD-based threshold behavior**, this would require a new feature request to the Admin team. The current policy framework operates on per-submission bonus amounts, not cumulative YTD totals.

---

## Summary Table

| # | Question | Short Answer |
|---|---|---|
| 1 | `employer_eib_max_wage` type | **Wage ceiling** (cap the wage base before applying rate) |
| 2 | Where is bonus levy rate? | In `wiz_bonus_policy_default`: `calc_flat_percentage` (for separate method) or slab-based (for merge) |
| 3 | December exemption handling | **Exclusively** via `wiz_bonus_policy_exceptions` with `exception_month = 12` |
| 4 | Interest rate fields | **Omit** from payload — dropped from Admin schema |
| 5 | Holiday pay distribution | **Admin handles it** — Wizard receives final amounts |
| 6 | merge vs separate | **Correct** — merge adds to wages, separate calculates independently |
| 7 | `contrib_employee = false` | **Excludes** bonus from employee SS wage base entirely |
| 8 | $18,720 YTD threshold | **Replaced** by `min_bonus_amount` / `max_bonus_amount` per-submission capping |

---

*End of Response — SSB Admin Team*
