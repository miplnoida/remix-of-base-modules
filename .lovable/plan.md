
## Root cause

The Admin system has **three** calculators running side-by-side, and they disagree on bonus handling:

| Layer | File | Bonus policy honored? | Result for Woolard (W1–W4 = 1,380.50, Bonus = 555) |
|---|---|---|---|
| Client live-calc hook | `src/hooks/useC3EmployeeCalculation.ts` | **No** — `calculateEmployeeLevy` iterates `weekIndices = [0,1,2,3,4,6]`, deliberately skipping index 5 (bonus). Bonus is never added to any week and never charged. | **193.27** ❌ |
| Bonus-policy edge fn | `supabase/functions/calculate-bonus-policy/index.ts` | Yes — reads `c3_bonus_policy_default`, merges bonus into selected week per `distribution.weekly.w4`. | 212.695 ✅ |
| Submission RPC | `public.calculate_c3_contributions` (called via `useC3ServerCalculations`) | Yes — same merge logic in PL/pgSQL. | 212.695 ✅ |

What the user sees on the C3 Details / C3 Submission grid in the screenshot (193.27) comes from the **client hook**, which ignores the active bonus policy:

- Active default policy in DB (verified live):
  `calculation_method = "merge"`, `include_in_levy = true`,
  `distribution.weekly = { w1:false, w2:false, w3:false, w4:true, divide:false }`

So the bonus 555 **should** be merged into Week 4 → W4 becomes 1,935.50 → slab levy on 1,935.50 = 67.7425; W1–W3 levy = 3 × 48.3175 = 144.9525; total = **212.695**.

The previous message we sent the Wizard team described this as a *separate "bonus levy"* of 19.425. That description was wrong — Admin's correct behavior is **merge into W4, then re-slab the merged week**, which mathematically lands on the same 212.695 only by coincidence for the equal-week case. For unequal weeks the two methods diverge.

## What the bonus configuration is actually used for in Admin

The bonus policy (`c3_bonus_policy_default` / `c3_bonus_policy_exceptions`) drives, per active period:

- **`include_in_levy`** — whether bonus participates in employee/employer levy at all.
- **`calculation_method`**:
  - `merge` — bonus is folded into one or more weekly slots per `distribution`, then the standard weekly slab runs on the merged amount.
  - `separate` — standard weekly slab runs on the unchanged weeks, then bonus alone is charged either at `calc_flat_percentage` or via the slab as a standalone payment.
- **`distribution`** — per pay period (weekly w1–w4 / divide, biweekly b1/b2/divide, semimonthly s1/s2/divide, monthly m1) — which slot(s) receive the bonus when merging.
- **`min_bonus_amount` / `max_bonus_amount`** — gating thresholds for eligibility.
- **`contrib_employee / contrib_employer / contrib_eir / contrib_severance`** — whether bonus is added to the SS, EIB and Severance bases.

This is consumed by the submission RPC and the bonus-policy edge function exactly as documented; the only consumer that ignores it is the live UI hook on C3 Details.

## Fix in Admin

Single, surgical change: make the live UI calc honor the same policy as the RPC.

1. **`src/hooks/useC3EmployeeCalculation.ts`**
   - Load active `c3_bonus_policy_default` (with `c3_bonus_policy_exceptions` for the period) alongside the C3 config, in the existing `useEffect`.
   - In `calculateEmployeeLevy`, when `bonus > 0` and `include_in_levy = true`:
     - If `calculation_method = 'merge'`: build a merged weeks array per the `distribution` (mirroring the RPC and edge fn), then run the existing per-week slab loop on the merged array (still skipping the now-zero bonus slot).
     - If `calculation_method = 'separate'`: run the per-week slab on raw weeks, then add either `bonus × calc_flat_percentage/100` or `calculateSlabLevy(bonus, matchingSlabs)`.
   - Apply the same merge to the SS / EIB / Employer Levy / Severance bases using `contrib_employee / contrib_employer / contrib_eir / contrib_severance`, matching the RPC.
   - Respect `min_bonus_amount / max_bonus_amount` gating.

2. **`src/components/c3/EmployeeModal.tsx`** — no change needed (it already prefers the server result).

3. **Regression check** — open Woolard, Aida (May 2026):
   - Expected Employee Levy = **212.695**
   - Expected Total Wages = 5,522 + 555 = 6,077
   - Expected Taxable Wages = 5,522 (unchanged, since taxable excludes bonus by definition)
   - Confirm the C3 Details grid and the C3 Submission grid match the submission RPC totals.

No DB / RPC / edge-function change is needed — those are already correct.

## Corrected message to the C3-Wizard team

Subject: Correction — Employee Levy on bonus is **merged**, not a separate charge

Hi team,

We need to correct our previous response. Admin does **not** charge the bonus as a separate "bonus levy" of 19.425. The 19.425 number was a coincidence of the equal-weeks case; the actual Admin behavior is **merge-then-slab**, driven by the active bonus policy.

### Behavior in Admin (authoritative)

Source of truth at submission time: PL/pgSQL function `calculate_c3_contributions`, driven by `c3_bonus_policy_default` (with `c3_bonus_policy_exceptions` overrides per period).

Active policy as of the May 2026 period:
- `include_in_levy = true`
- `calculation_method = "merge"`
- `distribution.weekly = { w1:false, w2:false, w3:false, w4:true, divide:false }`
- `contrib_employee = true`, `contrib_employer = true`

Algorithm:

```
if include_in_levy AND calculation_method == 'merge':
    merged = [W1, W2, W3, W4, W5, Holiday]
    apply distribution rules to add `bonus` into the selected slot(s)
    employee_levy = sum( slab(week_i) for week_i in merged where week_i > 0 )

elif include_in_levy AND calculation_method == 'separate':
    employee_levy = sum( slab(week_i) for week_i in [W1..W5, Holiday] )
    if calc_flat_enabled:  employee_levy += bonus * calc_flat_percentage/100
    elif calc_slab_enabled: employee_levy += slab(bonus)

else:
    employee_levy = sum( slab(week_i) for week_i in [W1..W5, Holiday] )   # bonus excluded
```

`bonus_pay_date` is **not** a gate — eligibility is gated only by `min_bonus_amount` / `max_bonus_amount`.

### Worked example — Woolard, Aida (May 2026), Weekly, Bonus = 555

W1 = W2 = W3 = W4 = 1,380.50.

Merge per active policy puts the whole 555 into W4:

```
merged = [1380.50, 1380.50, 1380.50, 1935.50, 0, 0]

slab(1380.50) = 18.20 + (1380.50 − 520.01 + 0.01) × 0.035 = 48.3175
slab(1935.50) = 18.20 + (1935.50 − 520.01 + 0.01) × 0.035 = 67.7425

Employee Levy = 3 × 48.3175 + 67.7425 = 212.695
```

### Why our previous "19.425 separate bonus" answer was wrong

For the equal-weeks case (W1=W2=W3=W4), the slab is linear above 520, so:
`slab(W4 + bonus) − slab(W4) = bonus × 0.035 = 19.425`.

That made it look like a separate flat-on-bonus charge. For **unequal** weeks the two methods give different answers, and only the merge-then-slab path matches Admin.

### Recommended Wizard change

Replace the `Employee_Levy_Bonus`-style separate calculation with merge-then-slab, reading the policy from the sync payload:

- Honor `calculation_method` (`merge` vs `separate`).
- Honor `distribution` per pay period exactly as above.
- Drop the `bonus_pay_date IS NOT NULL` gate.
- Apply `contrib_employee / contrib_employer / contrib_eir / contrib_severance` to SS / EIB / Severance bases when bonus is eligible.

After this, Wizard and Admin will match to the cent across both equal- and unequal-week scenarios.

Thanks.
