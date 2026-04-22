# Phase 5 — Compliance Field Planning End-to-End Test Scenarios

This document describes the demo data seeded for Phase 5 and the end-to-end
test scenarios that validate the enhancements delivered in Phases 1–4.

## Demo Data Overview

All seed rows reuse existing tables (`ce_weekly_plans`, `ce_weekly_plan_items`,
`ce_weekly_plan_reviews`) — no parallel models. Plans cover all key statuses
across all three zones.

| Plan Number              | Status         | Version | Inspector | Zone                  | Week        | Items |
|--------------------------|----------------|---------|-----------|-----------------------|-------------|-------|
| WP-2026-W17-DEMO-A       | SUBMITTED      | v1      | CI-04     | Zone 2 (St. Peters)   | 2026-04-20  | 3     |
| WP-2026-W17-DEMO-B       | NEED_CHANGES   | v1      | CI-N01    | Zone 3 (Nevis)        | 2026-04-20  | 2     |
| WP-2026-W15-DEMO-C       | APPROVED       | v1      | CI-02     | Zone 1 (Basseterre)   | 2026-04-06  | 4     |
| WP-2026-W16-DEMO-C-R2    | DRAFT (rev)    | v2      | CI-02     | Zone 1 (Basseterre)   | 2026-04-13  | 4     |
| WP-2026-W17-DEMO-D       | IN_EXECUTION   | v1      | CI-07     | Zone 1 (Basseterre)   | 2026-04-20  | 4     |

All items carry `recommendation_source` and `recommendation_reasons` JSONB so the
new explainability popovers render real content.

---

## Scenario 1 — Smart Planner with Zone Filter (Phase 2 + 4)

**Login:** Inspector CI-04 (Zone 2 / St. Peters)
**Route:** `/compliance/field/plan-builder`

1. Open the Smart Planner.
2. Confirm the candidate list is filtered to Zone 2 employers (server-side via
   `fn_ce_score_candidates_v3` resolving `primary_zone_id`).
3. Click the **"Why?"** popover on any candidate card.
4. Verify the recommendation reasons (`HIGH_RISK_NO_VISIT`, `OPEN_VIOLATION`, …)
   render with their weight badges and the source tag (`CANDIDATE_V3`).

**Expected:** No Zone 1 or Zone 3 employers leak in.

---

## Scenario 2 — Submit & Review (Phase 1 baseline + Phase 4 popovers)

**Login:** Senior Inspector
**Route:** `/compliance/audit-planning/pending-review`

1. Open the **Pending Review** queue.
2. Use the new **Zone selector** dropdown to filter by Zone 2.
3. Verify only `WP-2026-W17-DEMO-A` (CI-04) is listed.
4. Open the plan; for each item, click the recommendation popover and confirm
   reasons render.
5. Approve the plan; confirm a row appears in `ce_weekly_plan_reviews` with
   `action='APPROVED'`.

---

## Scenario 3 — Need-Changes Round Trip (Phase 1)

**Login:** Inspector CI-N01
**Route:** `/compliance/audit-planning/my-plans`

1. Locate `WP-2026-W17-DEMO-B` (status = NEED_CHANGES).
2. Read the reviewer comments inline.
3. Edit the plan, add the requested item, and click **Submit for Review**.
4. Confirm the button is **enabled** (regression check from earlier fix).
5. Confirm `rejection_count = 1` is preserved on resubmission and a new
   `SUBMITTED` review row is appended.

---

## Scenario 4 — Plan Revision Flow (Phase 3)

**Login:** Inspector CI-02
**Route:** `/compliance/audit-planning/my-plans`

1. Locate `WP-2026-W15-DEMO-C` (APPROVED v1).
2. Click **Revise** → revision dialog opens. Enter a justification ≥ 5 chars.
3. Submit. A new DRAFT plan `…-R2` is created (already seeded as
   `WP-2026-W16-DEMO-C-R2` for demo).
4. Click the **History** icon. The version timeline dialog shows v1
   (APPROVED) and v2 (DRAFT) with the revision reason.
5. Edit, then submit v2 for review.

---

## Scenario 5 — Manager Compare (Phase 4)

**Login:** Senior Inspector
**Route:** Open `WP-2026-W16-DEMO-C-R2` from Pending Review (after v2 is
submitted in Scenario 4).

1. Click **Compare to Previous**.
2. The compare dialog shows the diff between v1 and v2:
   - **Unchanged (3):** David Coury & Co., Thompson Bicknell, Eastern Benevolent
   - **Removed (1):** Blake, Errol
   - **Added (1):** Leeward Islands Transport (substitution)
3. Approve. v1 becomes SUPERSEDED, v2 becomes APPROVED.

---

## Scenario 6 — In-Execution Plan (Phase 1 carry-over)

**Login:** Inspector CI-07 or Senior Inspector
**Route:** `/compliance/audit-planning/my-plans`

1. Open `WP-2026-W17-DEMO-D` (IN_EXECUTION, 1/4 completed).
2. Confirm Blake, Errol shows the captured check-in/out times and outcome notes.
3. Confirm the remaining three items are PLANNED.
4. Recommendation popovers render for each item.

---

## Scenario 7 — Compliance Head Multi-Zone (Phase 4)

**Login:** Compliance Head (or any role with all-zones access)
**Route:** `/compliance/audit-planning/pending-review`

1. Open the Zone selector.
2. Choose **All Zones** → all three SUBMITTED/NEED_CHANGES plans appear.
3. Switch to Zone 3 → only `WP-2026-W17-DEMO-B` is listed.
4. Switch to Zone 1 → only revision/approved plans for CI-02/CI-07 are listed.

---

## Database Verification Queries

Run after each scenario to confirm state:

```sql
-- All demo plans + counts
SELECT p.plan_number, p.status, p.version_no, p.is_current_version,
       p.parent_plan_id IS NOT NULL AS is_revision,
       COUNT(i.id) AS items
  FROM ce_weekly_plans p
  LEFT JOIN ce_weekly_plan_items i ON i.plan_id = p.id
 WHERE p.plan_number LIKE 'WP-2026-W%-DEMO%'
 GROUP BY p.id, p.plan_number, p.status, p.version_no,
          p.is_current_version, p.parent_plan_id
 ORDER BY p.plan_number;

-- Review trail for any plan
SELECT action, performed_by, performed_at, comments
  FROM ce_weekly_plan_reviews
 WHERE plan_id = (SELECT id FROM ce_weekly_plans
                   WHERE plan_number = 'WP-2026-W17-DEMO-B')
 ORDER BY performed_at;

-- Items with explainability metadata
SELECT employer_name, recommendation_source, recommendation_score,
       recommendation_reasons
  FROM ce_weekly_plan_items
 WHERE plan_id = (SELECT id FROM ce_weekly_plans
                   WHERE plan_number = 'WP-2026-W17-DEMO-A');
```

---

## Reusing Existing Tables — Phase 5 Recap

| Feature                 | Table reused                          | New columns? |
|-------------------------|---------------------------------------|--------------|
| Plan core               | `ce_weekly_plans`                     | (Phase 3)    |
| Plan items              | `ce_weekly_plan_items`                | (Phase 2/4)  |
| Review trail            | `ce_weekly_plan_reviews`              | none         |
| Zone scope              | `ce_zones` + `ce_inspectors.primary_zone_id` | none |
| Risk inputs             | `ce_risk_profiles` + `ce_v_plan_candidates_v2` | none |
| Scoring                 | `fn_ce_score_candidates_v3` (wraps v2 + risk) | n/a |

No new tables were created in Phase 5. The seed exclusively uses the existing
schema, demonstrating the existing-table-first principle end-to-end.
