# Phase 2 — Audit Priority Scoring & Weekly Planning

## What changed (additive only)

### 1. New configurable weights table
`public.ce_audit_priority_weights` — Compliance Head can tune the planning
weights without code changes. Default seed:

| weight_key          | label                       | weight_pct |
|---------------------|-----------------------------|-----------:|
| INHERENT_RISK       | Inherent Employer Risk      | 25 %       |
| TRIGGER_URGENCY     | Trigger Urgency             | 25 %       |
| AUDIT_DUENESS       | Audit Due-ness / Cycle      | 20 %       |
| ENFORCEMENT_STAGE   | Enforcement / Case          | 15 %       |
| FOLLOW_UP_AGING     | Follow-up / Carry Forward   | 10 %       |
| OPERATIONAL_FIT     | Operational Fit / Zone      |  5 %       |

### 2. `fn_ce_score_candidates_v3` — extended (backward compatible)
Now returns **two** distinct scores plus richer planning fields:

- `inherent_risk_score` — long-term employer profile (0–100)
- `audit_priority_score` — short-term planning priority used by the weekly planner (0–100)
- `audit_program`, `last_audit_date`, `next_due_date`, `overdue_days`
- `violation_count`, `case_count`, `financial_exposure`
- `recommendation_reasons` (jsonb explainability array)
- `why_selected` — one-line summary for UI tooltips

`recommendation_score` is preserved and now equals `audit_priority_score`.

### 3. New / extended candidate reasons
Existing reason codes are unchanged. Newly emitted codes:

- `ROUTINE_CYCLE_DUE`
- `MANDATORY_HIGH_RISK_REVIEW`
- `POST_ENFORCEMENT_RECHECK`
- `COMPLAINT_DRIVEN_AUDIT` *(reserved — emitted when complaint-driven inputs feed in)*
- `SECTOR_SWEEP` *(reserved for campaign mode)*
- `BENEFIT_PAYROLL_MISMATCH_REVIEW` *(reserved — wire-in via mismatch detector)*
- `ARRANGEMENT_BREACH`
- `LEGAL_STAGE_TRIGGER`

Labels are centralized in `planCandidateService.CANDIDATE_REASON_LABELS`.

### 4. Smart Draft (`src/lib/smartDraftEngine.ts`)
- Mandatory / high-risk / arrangement-breach items are scheduled **first**.
- Zone clustering preserved (same-territory items grouped on the same day).
- Day capacity balancing preserved (max 7h / 5 items per day).
- Carry-forward visibility preserved (overflow surfaced with explicit warning).
- `is_mandatory` flag now also set for new richer reason codes.

## Reused unchanged
- `ce_v_plan_candidates_v2` view
- `fn_ce_score_candidates_batch` (legacy)
- `usePlanCandidatesV3` hook signature
- All `WeeklyPlanBuilder` UI components — they receive the same shape with
  additional optional fields.
- Risk model: `ce_risk_config`, `ce_risk_policies`, `ce_risk_bands`,
  `ce_risk_profiles`. Only **read** from these — no schema changes.

## Verification
```sql
SELECT employer_name, candidate_reason,
       inherent_risk_score, audit_priority_score,
       overdue_days, violation_count, case_count, why_selected
FROM fn_ce_score_candidates_v3(NULL, NULL, 10);
```
