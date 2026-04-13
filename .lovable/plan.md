

## Compliance Operations Weekly Planning — Controlled Rewrite (Steps 1–4)

### Step 1 — WP-1: Cleanup and Normalization Inventory

#### Pages/Routes to be REPLACED (all mock-driven)

| Current Page | Path | Mock Service | Replacement |
|---|---|---|---|
| `WeeklyPlanBuilder.tsx` | `/compliance/audit-planning/weekly-plan-builder` | `weeklyAuditPlanService` (100% mock) | New DB-backed builder (Step 4 UI — deferred) |
| `MyPlans.tsx` | `/compliance/audit-planning/my-plans` | `weeklyAuditPlanService` | DB-backed plan list |
| `PendingReview.tsx` | `/compliance/audit-planning/pending-review` | `weeklyAuditPlanService` | DB-backed supervisor review |
| `WeeklyReports.tsx` | `/compliance/audit-planning/weekly-reports` | `weeklyAuditPlanService` | DB-backed reports |
| `AllWeeklyReports.tsx` | `/compliance/audit-planning/all-reports` | `weeklyAuditPlanService` | DB-backed manager view |
| `FieldExecution.tsx` | `/compliance/audit-planning/field-execution` | `weeklyAuditPlanService` | DB-backed execution |
| `WeeklyPlanReview.tsx` | audit-planning subpage | mock internal state | Merged into PendingReview |
| `WeeklyReportSubmission.tsx` | `/compliance/violations/...` | `weeklyReportService` (100% mock) | Consolidated into weekly plan outcome flow |
| `InspectorPlans.tsx` | audit-planning subpage | mock | DB-backed |
| Inspector `InspectorWeeklyPlan.tsx` | `/inspector/...` | hardcoded mock object | Will point to DB services |

#### Mock Services to RETIRE

| Service | Status |
|---|---|
| `src/services/weeklyAuditPlanService.ts` | 100% mock data — retire entirely |
| `src/services/weeklyReportService.ts` | 100% mock data — retire entirely |
| `src/services/inspectionService.ts` | 100% mock data — retire entirely |
| `src/types/weeklyAuditPlan.ts` | Legacy type file — retire (replaced by `src/types/weeklyPlan.ts`) |
| `src/types/inspectionTypes.ts` | Legacy type file — retire (superseded by `weeklyPlan.ts`) |

#### Mock-consuming components to retire/rewire
- `WeeklyReportVisitDetail.tsx`, `WeeklyReportVisitRow.tsx`, `WeeklyReportSubmitDialog.tsx`, `RescheduleVisitDialog.tsx`, `CheckInOutTabContent.tsx` — all import from mock services

#### DB Tables — KEPT and already evolved

| Table | Status | Action |
|---|---|---|
| `ce_weekly_plans` | Extended (reviewer, narrative, carry-forward cols) | Keep as-is |
| `ce_weekly_plan_items` | Created with full schema | Keep as-is |
| `ce_weekly_plan_reviews` | Created | Keep as-is |
| `ce_scouting_leads` | Created with triggers | Keep as-is |
| `ce_scouting_lead_history` | Created with auto-trigger | Keep as-is |
| `ce_planned_visits` | Legacy table, 0 rows | Retire (superseded by `ce_weekly_plan_items`) |
| `ce_v_weekly_plan_candidates` (view) | Created, aggregates 5 source types | Keep as-is |
| `fn_ce_score_plan_candidate` (function) | Created, 11-factor scoring | Keep as-is |

#### Migration Strategy
- Routes stay registered in `Routes.tsx` throughout — page components are swapped in-place to use DB services
- No route URLs change, preventing navigation breaks
- Mock services are deleted only after all consuming pages are rewired

---

### Step 2 — WP-2: Schema Foundation — ALREADY COMPLETE

All 6 schema objects already exist in the live database (verified via direct query):

- `ce_weekly_plans` — extended with reviewer/narrative/carry-forward columns
- `ce_weekly_plan_items` — full schema with source tracking, execution, GPS, carry-forward
- `ce_weekly_plan_reviews` — audit trail for plan lifecycle
- `ce_scouting_leads` — field intelligence with GPS/zone/status
- `ce_scouting_lead_history` — auto-populated via trigger `trg_ce_scouting_lead_status`
- `ce_v_weekly_plan_candidates` — UNION ALL view across violations, follow-ups, scouting leads, cases, notices
- `fn_ce_score_plan_candidate` — 11-factor weighted scoring function

All tables have 0 rows — clean foundation, no data migration risk.

**No new migration needed for Step 2.**

---

### Step 3 — WP-3: DB-Backed Service Layer — ALREADY COMPLETE

Three production services already exist and are fully DB-backed:

| Service | File | Coverage |
|---|---|---|
| `weeklyPlanService` | `src/services/weeklyPlanService.ts` | Full plan CRUD, submit/approve/reject/resubmit, execution start, outcome submit/complete, stats recalc. Plan item CRUD, check-in/out, reschedule, cancel, not-done. |
| `scoutingLeadService` | `src/services/scoutingLeadService.ts` | Full lead CRUD, status transitions, assignment, violation linking, dismissal, history, status summary. |
| `planCandidateService` | `src/services/planCandidateService.ts` | Candidate loading with pagination (bypasses 1000-row limit), RPC-based scoring via `fn_ce_score_plan_candidate`, scored ranking, summary counts. |

All three use real Supabase client queries, accept audit fields (`created_by`/`updated_by`), and have no mock data.

**No new services needed for Step 3.**

---

### Step 4 — Verification Summary

#### What was created/exists (DB)
- 5 tables: `ce_weekly_plans`, `ce_weekly_plan_items`, `ce_weekly_plan_reviews`, `ce_scouting_leads`, `ce_scouting_lead_history`
- 1 view: `ce_v_weekly_plan_candidates`
- 1 scoring function: `fn_ce_score_plan_candidate`
- 2 triggers: scouting status history + plan item timestamp
- 8 indexes across all tables

#### What was created/exists (Services)
- `weeklyPlanService.ts` — plan + item CRUD with full lifecycle
- `scoutingLeadService.ts` — lead management with status machine
- `planCandidateService.ts` — candidate queue + scoring

#### Old mock structures ready to retire
- `src/services/weeklyAuditPlanService.ts` (mock)
- `src/services/weeklyReportService.ts` (mock)
- `src/services/inspectionService.ts` (mock)
- `src/types/weeklyAuditPlan.ts` (mock types)
- `src/types/inspectionTypes.ts` (mock types)
- `src/pages/inspector/InspectorWeeklyPlan.tsx` (hardcoded mock)
- 5 components in `src/components/compliance/` that import mock services

#### How candidate generation works
The `ce_v_weekly_plan_candidates` view performs a 5-way UNION ALL:
1. **VIOLATION** — Open/In-Progress/Under-Review/Escalated violations from `ce_violations`
2. **FOLLOW_UP** — Planned/Scheduled/Overdue follow-up actions from `ce_follow_up_actions`
3. **SCOUTING_LEAD** — New/Under-Investigation leads from `ce_scouting_leads`
4. **CASE** — Active/Escalated-Legal cases from `ce_cases`
5. **NOTICE** — Sent/Delivered notices with pending response dates from `ce_notices`

Each source maps to a uniform schema: `source_type, source_id, source_ref, employer_id, employer_name, territory, priority, source_status, financial_exposure, due_date, assigned_to_user_id, source_created_at, description`.

Scoring is done client-side via `planCandidateService.getScoredCandidates()` which calls `fn_ce_score_plan_candidate` RPC per candidate.

#### How sources map into weekly plan items
When an officer adds a candidate to their plan, a `ce_weekly_plan_items` row is created with:
- `source_type` = candidate's `source_type` (VIOLATION, FOLLOW_UP, etc.)
- `source_id` = candidate's `source_id` (UUID of the source entity)
- `source_ref` = candidate's `source_ref` (human-readable reference number)
- `employer_id` / `employer_name` = carried from candidate
- `recommendation_score` = computed score from scoring function

#### Migration/data risks before UI rewrite
- **None** — all tables are empty (0 rows), no production data at risk
- `ce_planned_visits` (legacy, 0 rows) can be dropped when ready
- Route URLs remain stable — pages swap internally
- The `complianceDataService.ts` has one function `fetchWeeklyPlans` that queries `ce_weekly_plans` with a join to `ce_planned_visits(*)` — this needs updating to join `ce_weekly_plan_items(*)` instead

#### Recommended next step
The schema and service foundation is **complete and verified**. The next phase is the **UI rewrite** — replacing the 10 mock-driven audit-planning pages with components that consume the DB-backed services. Approve to proceed with that phase.

