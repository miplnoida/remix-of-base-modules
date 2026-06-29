# Fix: "Failed to generate recommendations" on Legal Recommendation Queue

## Root cause

The "Generate Recommendations" button calls the RPC `fn_ce_generate_legal_recommendations`. That function fails immediately with:

```
ERROR: 42703: column rp.risk_score does not exist
HINT: Perhaps you meant to reference the column "cc.risk_score".
```

Inside the function, the seed employer query references `rp.risk_score` from `ce_risk_profiles`, but that table has no `risk_score` column. The risk score column on `ce_risk_profiles` is `total_score` (with `risk_band` already correctly used). Because the query is the very first `FOR` loop, the RPC never returns and the UI shows the generic failure toast.

## Fix

Single, surgical DB migration — replace `rp.risk_score` with `rp.total_score` in `fn_ce_generate_legal_recommendations` and re-create the function:

```sql
-- inside the SELECT used by the outer FOR v_emp loop
COALESCE(rp.total_score, 0) AS risk_score
```

Everything else in the function (variable name `v_emp.risk_score`, the `RISK_THRESHOLD` rule check that compares `v_emp.risk_score >= v_rule.risk_score_minimum`) stays the same — only the source column is corrected.

## Verification

1. Run `SELECT fn_ce_generate_legal_recommendations('SYSTEM');` — should return an integer (0 or more) without error.
2. In the UI, click **Generate Recommendations**:
   - Existing recommendations remain (function skips employers that already have `PENDING_REVIEW` / `APPROVED_FOR_REFERRAL` rows).
   - Toast shows either "Generated N new recommendations" or "No new recommendations generated".
3. No frontend changes; the existing error surfacing in `LegalRecommendationQueue.tsx` already exposes RPC errors verbatim, so any future RPC issue will be visible directly in the toast.

## Out of scope

- No schema changes to `ce_risk_profiles`, `ce_cases`, or `ce_legal_recommendations`.
- No changes to escalation policies, rules, or UI logic.
- No RLS changes (project is NO-RLS).
