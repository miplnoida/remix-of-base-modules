# Weekly Plan Candidate Engine v2 — Architecture Design

## 1. Assessment of Current System

### What exists today

| Component | State | Issue |
|---|---|---|
| `ce_v_weekly_plan_candidates` view | Functional | Simple UNION ALL of 5 source types (VIOLATION, FOLLOW_UP, SCOUTING_LEAD, CASE, NOTICE). **No risk enrichment, no audit/visit recency, no arrangement data, no aging signals, no delinquency facts.** |
| `fn_ce_score_plan_candidate` RPC | Functional | 11-dimension weighted scorer. **But the client passes `p_risk_band = NULL`, `p_overdue_followup_count = 0`, `p_prior_violation_count = 0`, `p_days_since_last_visit = NULL`, `p_is_manager_flagged = false` — all hardcoded defaults.** The function is well-designed but starved of real inputs. |
| `planCandidateService.ts` | Functional | Fetches view rows, calls scoring RPC per-row client-side. **Scoring is N+1 (one RPC per candidate), not batched. Fact enrichment is absent.** |
| `PlanCandidate` type | Functional | Flat structure with no room for `candidate_reason`, `risk_band`, `days_since_last_visit`, `violation_count`, `arrangement_status`, etc. |

### What is too generic

1. **The candidate view is just an active-items list.** It unions all open violations, follow-ups, scouting leads, cases, and unexpired notices. There is no concept of *why* an employer needs a visit — it's purely "something is open."

2. **No employer-level deduplication or aggregation.** If Employer X has 12 open violations, 5 follow-ups, and 2 notices, they appear as 19 separate candidates. There is no employer-level "composite urgency" that says "visit this employer because of multiple converging signals."

3. **The scoring function receives no real facts.** The client hardcodes most enrichment inputs to zero/null, so the score degrades to `priority × 0.20` — essentially just priority sorting.

4. **No arrangement breach candidates.** Payment arrangements with missed payments or breach_detected are invisible to the planning engine.

5. **No audit/visit recency.** `ce_inspections` data (8 inspections) is never consulted. An employer not visited in 2 years looks identical to one visited last week.

6. **No filing/payment delinquency signal.** C3 filing gaps and payment status are not surfaced.

7. **No carry-forward from incomplete plan items.** `ce_weekly_plan_items` with status NOT_DONE or RESCHEDULED are not automatically re-injected as candidates.

---

## 2. Risk Engine Dependency Assessment

### Current state of `ce_risk_profiles`

| Metric | Value |
|---|---|
| Total profiles | 1,135 |
| Scored (total_score > 0) | 1,098 |
| Last calculated | 2026-04-12 |
| Distribution | LOW: 1,086 · MEDIUM: 45 · HIGH: 4 |

### Assessment

The risk engine **has data** but has a **severe LOW skew** (95.7% LOW). This could be:
- (a) Accurate — most employers are compliant
- (b) Scoring formula is too lenient
- (c) Input data for scoring factors (arrears, violations, filing gaps) is incomplete

**Recommendation:** The weekly planning engine should **use risk data as-is** for the initial version but treat it as a **soft signal** (one of many), not the primary driver. A separate risk-engine calibration task should be filed to investigate whether the scoring weights and input data produce meaningful differentiation. The planning engine must NOT be blocked on this.

**Dependency:** LOW — use existing risk_band as an input dimension. If calibrated later, the planning engine automatically benefits because it reads from `ce_risk_profiles` at query time.

---

## 3. Proposed Fact Views

### 3a. `ce_v_plan_employer_facts` — Central Employer Fact Table

The keystone view. One row per employer with all planning-relevant signals aggregated.

```sql
CREATE OR REPLACE VIEW public.ce_v_plan_employer_facts AS
SELECT
  em.regno AS employer_id,
  em.name AS employer_name,
  em.village_code AS territory,
  
  -- Risk
  rp.risk_band,
  rp.total_score AS risk_score,
  rp.arrears_score,
  rp.violation_score AS risk_violation_score,
  rp.filing_score,
  rp.payment_behavior_score,
  rp.enforcement_risk_score,
  
  -- Audit/Visit Recency
  insp.last_inspection_date,
  insp.last_inspection_type,
  EXTRACT(DAY FROM NOW() - insp.last_inspection_date)::int AS days_since_last_inspection,
  
  -- Violation Signals
  viol.open_violation_count,
  viol.escalated_violation_count,
  viol.oldest_open_violation_date,
  EXTRACT(DAY FROM NOW() - viol.oldest_open_violation_date)::int AS days_oldest_violation,
  viol.total_violation_exposure,
  
  -- Follow-Up Signals
  fu.overdue_followup_count,
  fu.planned_followup_count,
  fu.oldest_overdue_followup_date,
  
  -- Notice Signals
  ntc.pending_notice_count,
  ntc.nearest_response_due,
  EXTRACT(DAY FROM ntc.nearest_response_due - NOW())::int AS notice_days_remaining,
  
  -- Arrangement Signals
  arr.active_arrangement_count,
  arr.breached_arrangement_count,
  arr.total_arrangement_outstanding,
  arr.any_breach_detected,
  arr.max_missed_payments,
  
  -- Filing/Payment Delinquency
  c3.last_c3_period,
  c3.periods_missing_count,
  
  -- Scouting
  scout.active_scouting_leads,
  
  -- Carry-Forward
  cf.carry_forward_count

FROM public.er_master em

LEFT JOIN public.ce_risk_profiles rp ON rp.employer_id = em.regno

LEFT JOIN LATERAL (
  SELECT 
    MAX(i.scheduled_date) AS last_inspection_date,
    (ARRAY_AGG(i.inspection_type ORDER BY i.scheduled_date DESC))[1] AS last_inspection_type
  FROM public.ce_inspections i
  WHERE i.employer_id = em.regno AND i.status IN ('COMPLETED','IN_PROGRESS')
) insp ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED')) AS open_violation_count,
    COUNT(*) FILTER (WHERE v.status = 'ESCALATED') AS escalated_violation_count,
    MIN(v.created_at) FILTER (WHERE v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED')) AS oldest_open_violation_date,
    COALESCE(SUM(v.total_amount) FILTER (WHERE v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED')), 0) AS total_violation_exposure
  FROM public.ce_violations v
  WHERE v.employer_id = em.regno AND v.is_deleted = false
) viol ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE fa.status = 'OVERDUE') AS overdue_followup_count,
    COUNT(*) FILTER (WHERE fa.status IN ('PLANNED','SCHEDULED')) AS planned_followup_count,
    MIN(fa.due_date) FILTER (WHERE fa.status = 'OVERDUE') AS oldest_overdue_followup_date
  FROM public.ce_follow_up_actions fa
  WHERE fa.employer_id = em.regno AND fa.is_deleted = false
) fu ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS pending_notice_count,
    MIN(n.due_response_date) AS nearest_response_due
  FROM public.ce_notices n
  WHERE n.employer_id = em.regno
    AND n.status IN ('SENT','DELIVERED')
    AND n.due_response_date >= CURRENT_DATE
) ntc ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE pa.status = 'ACTIVE') AS active_arrangement_count,
    COUNT(*) FILTER (WHERE pa.breach_detected = true) AS breached_arrangement_count,
    COALESCE(SUM(pa.total_debt - pa.total_paid) FILTER (WHERE pa.status = 'ACTIVE'), 0) AS total_arrangement_outstanding,
    BOOL_OR(pa.breach_detected) AS any_breach_detected,
    MAX(pa.missed_payments) AS max_missed_payments
  FROM public.ce_payment_arrangements pa
  WHERE pa.employer_id = em.regno
) arr ON true

LEFT JOIN LATERAL (
  SELECT COUNT(*) AS active_scouting_leads
  FROM public.ce_scouting_leads sl
  WHERE sl.linked_employer_id = em.regno AND sl.status IN ('NEW','UNDER_INVESTIGATION')
) scout ON true

LEFT JOIN LATERAL (
  SELECT COUNT(*) AS carry_forward_count
  FROM public.ce_weekly_plan_items wpi
  WHERE wpi.employer_id = em.regno
    AND wpi.execution_status IN ('NOT_DONE','RESCHEDULED')
    AND wpi.carried_forward_to IS NULL
) cf ON true

WHERE em.status = 'A';
```

### 3b. `ce_v_plan_candidates_v2` — Enriched Candidate View

Two-layer design: **hard inclusion** (employer qualifies) + **candidate reason** (why).

```sql
CREATE OR REPLACE VIEW public.ce_v_plan_candidates_v2 AS

-- Layer 1: Employers with open violations
SELECT DISTINCT ON (ef.employer_id, 'VIOLATION')
  ef.employer_id,
  ef.employer_name,
  ef.territory,
  'VIOLATION'::text AS candidate_source,
  ef.risk_band,
  ef.risk_score,
  ef.days_since_last_inspection,
  ef.open_violation_count,
  ef.escalated_violation_count,
  ef.overdue_followup_count,
  ef.total_violation_exposure AS financial_exposure,
  ef.notice_days_remaining,
  ef.any_breach_detected,
  ef.carry_forward_count,
  CASE
    WHEN ef.escalated_violation_count > 0 THEN 'ESCALATED_VIOLATION'
    WHEN ef.days_oldest_violation > 90 THEN 'AGING_VIOLATION'
    WHEN ef.open_violation_count >= 3 THEN 'MULTIPLE_VIOLATIONS'
    ELSE 'OPEN_VIOLATION'
  END AS candidate_reason,
  CASE
    WHEN ef.escalated_violation_count > 0 THEN 'CRITICAL'
    WHEN ef.days_oldest_violation > 90 THEN 'HIGH'
    WHEN ef.open_violation_count >= 3 THEN 'HIGH'
    ELSE 'MEDIUM'
  END AS derived_priority
FROM public.ce_v_plan_employer_facts ef
WHERE ef.open_violation_count > 0

UNION ALL

-- Layer 2: Employers with overdue follow-ups
SELECT DISTINCT ON (ef.employer_id, 'OVERDUE_FOLLOW_UP')
  ef.employer_id, ef.employer_name, ef.territory,
  'OVERDUE_FOLLOW_UP', ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'OVERDUE_FOLLOW_UP', 'HIGH'
FROM public.ce_v_plan_employer_facts ef
WHERE ef.overdue_followup_count > 0

UNION ALL

-- Layer 3: Arrangement breaches
SELECT DISTINCT ON (ef.employer_id, 'ARRANGEMENT_BREACH')
  ef.employer_id, ef.employer_name, ef.territory,
  'ARRANGEMENT_BREACH', ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  ef.total_arrangement_outstanding, ef.notice_days_remaining,
  ef.any_breach_detected, ef.carry_forward_count,
  CASE WHEN ef.breached_arrangement_count > 0 THEN 'ARRANGEMENT_DEFAULT'
       ELSE 'ARRANGEMENT_AT_RISK' END,
  'CRITICAL'
FROM public.ce_v_plan_employer_facts ef
WHERE ef.any_breach_detected = true OR ef.max_missed_payments > 0

UNION ALL

-- Layer 4: Notice response due
SELECT DISTINCT ON (ef.employer_id, 'NOTICE_RESPONSE')
  ef.employer_id, ef.employer_name, ef.territory,
  'NOTICE_RESPONSE', ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'NOTICE_RESPONSE_DUE',
  CASE WHEN ef.notice_days_remaining <= 3 THEN 'CRITICAL'
       WHEN ef.notice_days_remaining <= 7 THEN 'HIGH'
       ELSE 'MEDIUM' END
FROM public.ce_v_plan_employer_facts ef
WHERE ef.pending_notice_count > 0

UNION ALL

-- Layer 5: High-risk employers with no recent visit
SELECT DISTINCT ON (ef.employer_id, 'RISK_NO_VISIT')
  ef.employer_id, ef.employer_name, ef.territory,
  'RISK_NO_VISIT', ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'HIGH_RISK_NO_VISIT',
  CASE WHEN ef.risk_band = 'CRITICAL' THEN 'CRITICAL' ELSE 'HIGH' END
FROM public.ce_v_plan_employer_facts ef
WHERE ef.risk_band IN ('HIGH','CRITICAL')
  AND (ef.days_since_last_inspection IS NULL OR ef.days_since_last_inspection > 90)

UNION ALL

-- Layer 6: Carry-forward incomplete work
SELECT DISTINCT ON (ef.employer_id, 'CARRY_FORWARD')
  ef.employer_id, ef.employer_name, ef.territory,
  'CARRY_FORWARD', ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'CARRY_FORWARD_INCOMPLETE',
  'MEDIUM'
FROM public.ce_v_plan_employer_facts ef
WHERE ef.carry_forward_count > 0

UNION ALL

-- Layer 7: Audit recency exceeded (any employer not visited in 180+ days)
SELECT DISTINCT ON (ef.employer_id, 'AUDIT_RECENCY')
  ef.employer_id, ef.employer_name, ef.territory,
  'AUDIT_RECENCY', ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'LAST_AUDIT_EXCEEDED',
  'LOW'
FROM public.ce_v_plan_employer_facts ef
WHERE ef.days_since_last_inspection > 180 OR ef.days_since_last_inspection IS NULL;
```

### 3c. Upgraded `fn_ce_score_plan_candidate_v2`

The scoring function stays the same structure but receives **real inputs** from the fact views instead of hardcoded zeros. The service layer will JOIN candidate rows with `ce_v_plan_employer_facts` before calling the scorer.

Alternatively, a **set-returning function** that scores all candidates in one call:

```sql
CREATE OR REPLACE FUNCTION public.fn_ce_score_candidates_batch(
  p_assigned_to TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  employer_id TEXT,
  employer_name TEXT,
  territory TEXT,
  candidate_source TEXT,
  candidate_reason TEXT,
  derived_priority TEXT,
  risk_band TEXT,
  risk_score NUMERIC,
  days_since_last_inspection INT,
  open_violation_count BIGINT,
  overdue_followup_count BIGINT,
  financial_exposure NUMERIC,
  notice_days_remaining INT,
  any_breach_detected BOOLEAN,
  carry_forward_count BIGINT,
  recommendation_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.employer_id, c.employer_name, c.territory,
    c.candidate_source, c.candidate_reason, c.derived_priority,
    c.risk_band, c.risk_score,
    c.days_since_last_inspection,
    c.open_violation_count,
    c.overdue_followup_count,
    c.financial_exposure,
    c.notice_days_remaining,
    c.any_breach_detected,
    c.carry_forward_count,
    fn_ce_score_plan_candidate(
      p_source_type := c.candidate_source,
      p_priority := c.derived_priority,
      p_risk_band := c.risk_band,
      p_days_overdue := GREATEST(0, -COALESCE(c.notice_days_remaining, 0)),
      p_overdue_followup_count := COALESCE(c.overdue_followup_count, 0)::int,
      p_notice_days_remaining := c.notice_days_remaining,
      p_financial_exposure := COALESCE(c.financial_exposure, 0),
      p_prior_violation_count := COALESCE(c.open_violation_count, 0)::int,
      p_days_since_last_visit := c.days_since_last_inspection,
      p_is_same_zone := false,
      p_is_manager_flagged := false,
      p_scouting_confidence := NULL
    ) AS recommendation_score
  FROM public.ce_v_plan_candidates_v2 c
  ORDER BY fn_ce_score_plan_candidate(
    c.candidate_source, c.derived_priority, c.risk_band,
    GREATEST(0, -COALESCE(c.notice_days_remaining, 0)),
    COALESCE(c.overdue_followup_count, 0)::int,
    c.notice_days_remaining,
    COALESCE(c.financial_exposure, 0),
    COALESCE(c.open_violation_count, 0)::int,
    c.days_since_last_inspection,
    false, false, NULL
  ) DESC
  LIMIT p_limit;
END;
$$;
```

---

## 4. Two-Layer Candidate Model

### Hard Inclusion Rules (binary — yes/no)

An employer becomes a candidate if ANY of these conditions are true:

| Rule | Source | Reason Code |
|---|---|---|
| Has open/escalated violation | ce_violations | OPEN_VIOLATION / ESCALATED_VIOLATION / AGING_VIOLATION |
| Has overdue follow-up action | ce_follow_up_actions | OVERDUE_FOLLOW_UP |
| Has arrangement breach or missed payments | ce_payment_arrangements | ARRANGEMENT_DEFAULT / ARRANGEMENT_AT_RISK |
| Has notice with response due within 14 days | ce_notices | NOTICE_RESPONSE_DUE |
| Risk band HIGH/CRITICAL and no visit in 90+ days | ce_risk_profiles + ce_inspections | HIGH_RISK_NO_VISIT |
| Has carry-forward NOT_DONE/RESCHEDULED items | ce_weekly_plan_items | CARRY_FORWARD_INCOMPLETE |
| No audit/visit in 180+ days (any employer) | ce_inspections | LAST_AUDIT_EXCEEDED |
| Active scouting lead | ce_scouting_leads | SCOUTING_LEAD |

### Weighted Ranking (0–100 composite score)

Uses the existing `fn_ce_score_plan_candidate` with **real fact inputs** from `ce_v_plan_employer_facts`:

| Dimension | Weight | Real Input Source |
|---|---|---|
| Severity/Priority | 20% | derived_priority from inclusion rules |
| Risk Band | 15% | ce_risk_profiles.risk_band |
| Days Overdue | 15% | violation age, follow-up age |
| Follow-Up Overdue Count | 10% | ce_follow_up_actions count |
| Notice Urgency | 10% | days until response due |
| Financial Exposure | 10% | violation amounts + arrangement outstanding |
| Prior Violation Count | 5% | ce_violations count |
| Visit Recency | 5% | ce_inspections last date |
| Zone Proximity | 5% | zone matching (future) |
| Manager Flag | 3% | supervisor directives (future) |
| Scouting Confidence | 2% | ce_scouting_leads.confidence_level |

---

## 5. Candidate Reason Codes

Every candidate row will carry an explicit `candidate_reason` explaining why it was selected:

| Code | Meaning |
|---|---|
| `ESCALATED_VIOLATION` | Violation escalated to legal/senior review |
| `AGING_VIOLATION` | Open violation older than 90 days |
| `MULTIPLE_VIOLATIONS` | 3+ concurrent open violations |
| `OPEN_VIOLATION` | Standard open violation |
| `OVERDUE_FOLLOW_UP` | Follow-up action past due date |
| `ARRANGEMENT_DEFAULT` | Payment arrangement in breach/default |
| `ARRANGEMENT_AT_RISK` | Arrangement has missed payments but not yet breached |
| `NOTICE_RESPONSE_DUE` | Notice response deadline approaching |
| `HIGH_RISK_NO_VISIT` | HIGH/CRITICAL risk, no recent visit |
| `LAST_AUDIT_EXCEEDED` | No audit/visit in 180+ days |
| `CARRY_FORWARD_INCOMPLETE` | Incomplete work from prior weekly plan |
| `SCOUTING_LEAD` | Active scouting lead requiring investigation |

---

## 6. Service Layer Changes

### `planCandidateService.ts` v2

| Current | Proposed |
|---|---|
| Fetches from `ce_v_weekly_plan_candidates` (flat item list) | Fetches from `ce_v_plan_candidates_v2` (employer-level, fact-enriched) |
| Scores per-candidate via N+1 RPC calls | Calls `fn_ce_score_candidates_batch` — single RPC, server-side scoring |
| Returns `PlanCandidate` (no reason, no risk) | Returns `PlanCandidateV2` with `candidate_reason`, `risk_band`, `days_since_last_inspection`, etc. |
| Client computes `daysOverdue` | Server computes all temporal signals |

### `PlanCandidate` type v2

```typescript
export interface PlanCandidateV2 {
  employer_id: string;
  employer_name: string;
  territory: string | null;
  candidate_source: string;          // VIOLATION, OVERDUE_FOLLOW_UP, etc.
  candidate_reason: string;          // ESCALATED_VIOLATION, HIGH_RISK_NO_VISIT, etc.
  derived_priority: string;          // CRITICAL, HIGH, MEDIUM, LOW
  risk_band: string | null;
  risk_score: number | null;
  days_since_last_inspection: number | null;
  open_violation_count: number;
  overdue_followup_count: number;
  financial_exposure: number;
  notice_days_remaining: number | null;
  any_breach_detected: boolean;
  carry_forward_count: number;
  recommendation_score: number;
}
```

---

## 7. What the Current Scouting Lead Path Needs

The current view includes scouting leads correctly. The v2 view **also needs a scouting layer**, but anchored to employer facts when `linked_employer_id` is set, and as standalone candidates when unlinked:

```sql
-- Layer 8: Scouting leads (standalone, not linked to employer)
UNION ALL
SELECT
  COALESCE(sl.linked_employer_id, sl.id::text),
  COALESCE(ef.employer_name, sl.business_name),
  COALESCE(ef.territory, sl.territory),
  'SCOUTING_LEAD', NULL, NULL,
  ef.days_since_last_inspection, 0, 0, 0,
  0, NULL, false, 0,
  'SCOUTING_LEAD',
  CASE sl.confidence_level WHEN 'HIGH' THEN 'HIGH' WHEN 'MEDIUM' THEN 'MEDIUM' ELSE 'LOW' END
FROM public.ce_scouting_leads sl
LEFT JOIN public.ce_v_plan_employer_facts ef ON ef.employer_id = sl.linked_employer_id
WHERE sl.status IN ('NEW','UNDER_INVESTIGATION')
```

---

## 8. Implementation Order

| Step | What | Type | Dependency |
|---|---|---|---|
| **1** | Create `ce_v_plan_employer_facts` view | Migration | None |
| **2** | Create `ce_v_plan_candidates_v2` view | Migration | Step 1 |
| **3** | Create `fn_ce_score_candidates_batch` function | Migration | Step 2 + existing `fn_ce_score_plan_candidate` |
| **4** | Add `PlanCandidateV2` type to `weeklyPlan.ts` | Code | None |
| **5** | Rewrite `planCandidateService.ts` to use v2 views/RPC | Code | Steps 1–4 |
| **6** | (Later) Update `WeeklyPlanBuilder.tsx` UI to show reasons, risk, recency | Code | Step 5 |
| **7** | (Later) Risk engine calibration — investigate LOW skew | Analysis | Independent |

Steps 1–5 are the candidate engine redesign. Step 6 is UI (deferred per your request). Step 7 is independent and can proceed in parallel.

---

## 9. Risk Recalculation Dependency

**Verdict: NOT a blocker.**

- `ce_risk_profiles` has 1,135 profiles with scores calculated on 2026-04-12
- 95.7% are LOW — this may be accurate or may need calibration
- The planning engine should **read** `risk_band` as one of many signals
- Even if risk scores are all LOW, the other 10+ signals (violations, follow-ups, arrangements, visits) still produce meaningful differentiation
- Risk calibration should be a **separate workstream** that improves planning quality over time, not a prerequisite

---

## 10. Summary of Changes

| Area | Before | After |
|---|---|---|
| Candidate source | 5-way UNION of active items | 8-layer fact-driven inclusion with explicit reasons |
| Enrichment | None (hardcoded zeros) | Full employer fact profile: risk, visits, violations, arrangements, notices, carry-forward |
| Scoring | N+1 client-side RPC calls with empty inputs | Single batch RPC with real fact inputs |
| Deduplication | None (item-level) | Employer-level with multiple candidate_reasons |
| Arrangement visibility | Absent | Breach/default and missed payments as candidate signals |
| Visit recency | Absent | `ce_inspections` last date, days-since calculation |
| Carry-forward | Absent | Incomplete plan items re-surfaced automatically |
| Reason transparency | None | Explicit `candidate_reason` code on every row |
