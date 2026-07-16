
## What you're seeing

On case **CC-2026-f3856b** (UAT Clean Employer Ltd, U01001):

- Case header **Total Amount = EC$2,386.04**, **Collected = EC$0.00**
- Arrangements row **PA-UAT-2026-0001**: **Type = "-"**, **Total = EC$0.00**, End = "-"

Two different discrepancies are stacked on top of each other. One is a real UI bug; the other is a seed-data inconsistency. Neither changes what Employer 360 already correctly shows.

## Discrepancy 1 — UI field-mapping bug in the Case → Arrangements tab (fix required)

File: `src/pages/compliance/cases/CaseDetailView.tsx`, lines 534–537.

```tsx
<TableCell>{a.arrangement_type || '-'}</TableCell>          // column doesn't exist
<TableCell>{formatCurrency(Number(a.total_amount) || 0)}</TableCell>  // wrong column
```

The `ce_payment_arrangements` row for PA-UAT-2026-0001 actually contains:

```text
total_debt              = 9300.00
total_paid              = 0.00
installment_amount      = 697.50
down_payment            = 930.00
number_of_installments  = 12
frequency               = monthly
next_due_date           = 2026-08-14
status                  = ACTIVE
end_date                = null   (open-ended schedule)
```

There is **no `total_amount` column and no `arrangement_type` column** on that table, so the render falls back to `0` and `-`. That is why the row shows EC$0.00 even though the arrangement is legitimately EC$9,300.

**Proposed UI fix (Case → Arrangements tab only, presentation-only):**

- Total column → `formatCurrency(Number(a.total_debt) || 0)`
- Add a "Paid" column → `formatCurrency(Number(a.total_paid) || 0)` (helps reconcile against Case "Collected")
- Type column → derive from `frequency` (e.g. "Monthly · 12 installments") since there is no explicit type column; or drop the column
- End column → when `end_date` is null but `next_due_date` and `number_of_installments` exist, show "Next: <next_due_date>" instead of "-"

No schema change, no service change. Mirror the same field names already used correctly in `src/pages/compliance/arrangements/ArrangementListPage.tsx` and `PaymentArrangements.tsx`.

## Discrepancy 2 — Seed-data inconsistency: arrangement total ≠ case total (document, don't "fix")

The case aggregates only its **one linked violation**:

```text
total_principal  = 2,325.00
total_penalties  =    58.13
total_interest   =     2.91
total_amount     = 2,386.04   ← case header
```

The arrangement's **total_debt = 9,300.00** was seeded to match the **employer-wide** arrears figure from `ce_v_employer_arrears_summary` (C3 dues − payments across `cn_c3_reported` + `cn_payment`, i.e. the same EC$9,300 shown in the Employer 360 banner).

So the seed attached an **employer-wide** repayment plan to a **single case** that only accounts for EC$2,386.04 of that debt. It is data-model legal (one arrangement → one case → one employer) but semantically inconsistent for UAT.

Three ways to handle it — pick one, no code change beyond this:

- **Option S1 (recommended, docs only).** Amend `UAT_END_TO_END_FLOW_GUIDE.md` §4.4 to state that PA-UAT-2026-0001 was intentionally seeded against employer-wide arrears (EC$9,300) even though CC-2026-f3856b's own scope is EC$2,386.04, and that the arrangement's Total is expected to exceed the case Total. Add this as **G21 — Documented** in the gap register.
- **Option S2 (seed edit).** Re-seed PA-UAT-2026-0001 with `total_debt = 2386.04` so case and arrangement reconcile. This narrows the UAT scenario and removes the ability to test "arrangement covers multiple cases", so I don't recommend it.
- **Option S3 (future feature).** Introduce a many-to-many link (arrangement ↔ multiple cases) and show per-case allocation. Out of scope for this ticket; register as a new gap only.

## Also worth noting (no change proposed)

- Case header **Collected = EC$0.00** is consistent: `ce_cases.amount_collected = 0`, `ce_payment_arrangements.total_paid = 0`, and there are no `cn_payment` rows attributable to this case. Nothing broken here.
- Employer 360's "Payment arrangement active" pill and EC$9,300 arrears banner are both correct and derived from different sources than the Case screen (see previous plan). Those stay untouched.

## Updated plan (delta from previous plan)

Previous plan proposed A/B/C for cross-case visibility of arrangements. That still stands. On top of that, add:

1. **UI fix (small, low-risk)** — `CaseDetailView.tsx` Arrangements tab column mapping:
   - `total_amount` → `total_debt`
   - Add `Paid` column reading `total_paid`
   - Replace `arrangement_type` with a derived "Frequency · Installments" cell, or remove the column
   - Show "Next: <next_due_date>" when `end_date` is null
2. **Docs update** — `docs/compliance/uat/UAT_END_TO_END_FLOW_GUIDE.md` §4.4:
   - Note that arrangements are case-scoped in the UI, employer-wide in Employer 360 (from previous plan).
   - Note that PA-UAT-2026-0001's `total_debt` is deliberately the employer-wide arrears figure (EC$9,300), which will not equal the linked case's `total_amount` (EC$2,386.04). Register as **G21 — Documented**.
3. **Gap register** — carry forward **G20** (employer-scope hint on case tabs; Option A vs B decision pending) from the previous plan, add **G21** as above.

Please confirm:
- Do you want the UI fix in step 1 applied now (frontend/presentation only, no data changes)?
- Which of Option A / B / C from the earlier plan do you want for G20?
- Which of S1 / S2 / S3 do you want for the arrangement-vs-case total mismatch?
