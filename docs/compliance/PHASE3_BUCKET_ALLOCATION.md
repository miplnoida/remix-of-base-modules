# Phase 3 — Bucket Allocation, Mandatory Class & Effort

## What changed (additive only)

### 1. New configurable bucket policy
`public.ce_planner_bucket_policy` — Compliance Head can tune how the weekly
suggestion list is split across operational buckets.

| bucket_key            | label                  | target_pct |
|-----------------------|------------------------|-----------:|
| MUST_SCHEDULE         | Must Schedule          | 40 %       |
| REACTIVE_ENFORCEMENT  | Reactive Enforcement   | 25 %       |
| RISK_MONITORING       | Risk Monitoring        | 15 %       |
| ROUTINE_COVERAGE      | Routine Coverage       | 15 %       |
| CAMPAIGN_INTEL        | Campaign / Intelligence|  5 %       |

### 2. `fn_ce_score_candidates_v3` — extended
Three new output columns (everything else preserved):

- `mandatory_class` — `MANDATORY` | `PRIORITY` | `WATCHLIST`
- `bucket` — one of the five `ce_planner_bucket_policy` keys
- `estimated_effort` — visit hours derived from `audit_program` plus open work

Server-side dedupe (one row per employer × audit_program) and zone filtering
remain enforced inside the function — the UI cannot bypass them.

### 3. Pipeline now operationalized end-to-end
triggers → eligibility (zone + active employer) → dedupe/merge →
two-score (`inherent_risk_score`, `audit_priority_score`) →
classify (mandatory class) → bucket → ordered output.

### 4. Hook upgrade
`useWeeklyPlanBuilder` now calls `getScoredCandidatesV3({ inspectorId })`,
which forces server-side zone enforcement. It exposes:

- `candidatesV3` — raw v3 rows
- `candidatesByBucket` — grouped for bucket panels
- `candidatesByMandatoryClass` — grouped for ranking gates

`groupedCandidates` and `candidates` (legacy `PlanCandidate` shape) are kept
for downstream UI compatibility.

## Reused unchanged
- `ce_weekly_plans`, `ce_weekly_plan_items`, `ce_weekly_plan_reviews`
- `ce_inspectors`, `ce_zones`
- `ce_risk_config`, `ce_risk_policies`, `ce_risk_bands`,
  `ce_risk_profiles`, `ce_risk_score_history`
- `ce_v_plan_candidates_v2`
- `ce_audit_priority_weights`
- `fn_ce_score_candidates_batch` (legacy, untouched)

## Verification
```sql
SELECT employer_name, mandatory_class, bucket, estimated_effort,
       audit_priority_score, why_selected
FROM fn_ce_score_candidates_v3(NULL, NULL, 20);
```
