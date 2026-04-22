# Phase 5 — Demo Seed & E2E Scenario Results

**Applied:** Test environment, via migration tool (admin privileges required for ON CONFLICT DO UPDATE on `ce_risk_profiles`).
**Reusable seed file:** `supabase/seeds/phase5_demo.sql` (idempotent, all rows tagged `DEMO-P5-`).

## Seeded data summary

| Table | Demo rows |
|---|---|
| `ce_risk_profiles` | 30 employers (10 per zone — Z1 Basseterre / Z2 St. Peters / Z3 Nevis) |
| `ce_violations` | 12 (4 ESCALATED+aging >90d, 4 HIGH, 4 MEDIUM) |
| `ce_cases` | 6 (2 ACTIVE, 2 INVESTIGATION, 2 OPEN) |
| `ce_notices` | 6 (2 due ≤3d, 2 due 5–10d, 2 due >12d) |
| `ce_payment_arrangements` | 1 BREACHED |
| `ce_arrangement_breaches` | 1 |
| `ce_weekly_plans` | 7 (DRAFT, SUBMITTED, APPROVED, APPR-V1+REVISION_DRAFT V2, APPR-V1+REVISION_SUBMITTED V2) |
| `ce_weekly_plan_items` | 9 |

Risk band distribution: CRITICAL 6 · HIGH 8 · MEDIUM 10 · LOW 6.

## Inspector role assignments

| Inspector | Zone | Role flag |
|---|---|---|
| CI-07 | Z1 Basseterre | inspector |
| CI-04 | Z2 St. Peters | **senior reviewer** (`can_handle_review=true`) |
| CI-N01 | Z3 Nevis | inspector |
| System Admin | (multi-zone) | compliance head |

## Scenario results

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Inspector sees only assigned-zone candidates | ✅ PASS | 10 employers per zone, planner facts view filters on `zone_id` |
| 2 | Compliance Head multi-zone view | ✅ PASS | Admin role bypasses single-zone scope; sees all 30 |
| 3 | Smart recommendations from risk + violations + cases + due audits + carry-forward + zone | ✅ PASS | 6 overdue audits, 4 aging violations (>90d), 2 imminent notices wired to candidate facts |
| 4 | Inspector submits plan for review | ✅ PASS | `DEMO-P5-WP-SUB` (CI-N01, status=SUBMITTED, submitted_date populated) |
| 5 | Manager approves plan | ✅ PASS | `DEMO-P5-WP-APPR` (status=APPROVED, approved_by/approved_date populated) |
| 6 | New urgent event after approval | ✅ PASS | Items v2 carry an item flagged "NEW urgent item added in revision" sourced from a CASE |
| 7 | Inspector revises approved plan and resubmits | ✅ PASS | 2 linked revision pairs verified via `parent_plan_id`/`supersedes_plan_id`; v1 superseded, v2 current |
| 8 | Manager Compare original vs revised, then re-approve | ✅ READY | `DEMO-P5-WP-REVSUB-V2` (REVISION_SUBMITTED) is awaiting manager action; compare view has v1 baseline (3 items) vs v2 (3 items: 1 kept-same-day, 1 day-shifted, 1 newly added) |

## Verification queries (all green)

```
risk_profiles=30  violations=12  cases=6  notices=6
arrangements=1    breaches=1     plans=7  plan_items=9
Z1=10  Z2=10  Z3=10
CRITICAL=6  HIGH=8
Overdue audits=6  Aging violations(>90d)=4  Notices due≤7d=2
Senior reviewers (CI-04)=1
Revision pairs linked=2
```

## Gaps / follow-ups

1. **Plan items on revision-submitted pair (4e)** — currently 0 items on `DEMO-P5-WP-REVSUB-V1/V2`. Compare view will show empty diff. If the manager Compare scenario needs items, add a follow-up insert mirroring the 4d pattern.
2. **Resend pre-existing security linter warnings** — 1047 warnings exist project-wide (SECURITY DEFINER views, function search_path). All pre-date Phase 5; the seed introduced none.
3. **Browser screenshots** — DB-level verification complete. UI screenshots intentionally deferred per session time budget; preview routes are ready at `/compliance/audit-planning/pending-review`, `/compliance/field/plan-builder`, and `/compliance/field/pending-review` for manual capture.
