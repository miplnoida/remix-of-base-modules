

# Weekly Planning, Inspection Execution, and Weekly Reporting — Enterprise Workflow Improvement Plan

## 1. Executive Summary

The compliance module has a functional but incomplete workflow across three areas: weekly planning, field execution, and weekly reporting. After thorough analysis of the codebase and database schema, the core issues are: (1) no duplicate plan prevention, (2) disconnected inspection execution models with two parallel type systems, (3) missing working papers / employer interaction model, and (4) weekly reports that require manual aggregation instead of auto-generation. This plan addresses all three problem areas with practical, code-aware fixes.

---

## 2. Current State Analysis

### 2.1 Duplicate Weekly Plans

**Confirmed**: The `weeklyPlanService.create()` method has NO validation preventing multiple plans for the same inspector + week. The `useWeeklyPlanBuilder` hook fetches `plans[0]` when checking for existing plans, but the database has no unique constraint on `(inspector_id, week_start_date)`. An inspector can create multiple DRAFT plans for the same week.

**Confirmed**: There is no WITHDRAWN status. Once submitted, the only path back to editing is via manager rejection (NEEDS_CHANGES).

### 2.2 Dual Type Systems

**Confirmed**: Two parallel type systems exist:
- `src/types/weeklyPlan.ts` — `WeeklyPlanStatus` enum (DRAFT, SUBMITTED, NEEDS_CHANGES, RESUBMITTED, APPROVED, IN_EXECUTION, OUTCOME_SUBMITTED, COMPLETED)
- `src/types/weeklyAuditPlan.ts` — `WeeklyPlanWorkflowStatus` enum (DRAFT, SUBMITTED, NEED_CHANGES, RESUBMITTED, APPROVED, IN_EXECUTION, COMPLETED) — note: `NEED_CHANGES` vs `NEEDS_CHANGES`

Two services operate on the same `ce_weekly_plans` table: `weeklyPlanService.ts` and `weeklyAuditPlanService.ts`. The builder uses `weeklyPlanService`; the MyPlans/WeeklyReports screens use `weeklyAuditPlanService`.

### 2.3 Inspection Execution

**Confirmed**: The `ExecutePlanItemDialog` provides a 4-tab execution flow (Check-in/out, Evidence, Findings, Violations). However:
- No employer representative capture (name, designation, contact)
- No employer acknowledgement or declaration
- No audit checklist / working papers (type exists in `weeklyAuditPlan.ts` as `AuditChecklist` but is NOT implemented in UI or service)
- No signature capture (column `employer_signature_data` exists in `ce_inspections` table but is unused)
- No refusal-to-sign or incomplete records handling
- Evidence tab exists but has no link back to findings
- GPS is captured at check-in/out but not on individual evidence items
- The `FieldExecution.tsx` page uses `inspectionService` with the OLD `inspectionTypes.ts` type system, creating mapping mismatches

### 2.4 Weekly Reports

**Confirmed**: `WeeklyReports.tsx` uses `weeklyAuditPlanService.generateWeeklyReportSummary()` which:
- Counts planned/completed/cancelled/rescheduled from plan items
- Calculates hours from check_in/check_out times
- Has TODO stubs for evidence count and violations count (`evidenceCollected: 0, violationsOpened: 0`)
- No auto-aggregation of findings, violations, zone coverage
- No validation preventing report submission with open items
- Jumps directly to COMPLETED status (skips OUTCOME_SUBMITTED)

---

## 3. Weekly Plan Control Fixes

### 3.1 Unified Status Lifecycle

Add `WITHDRAWN` to `WeeklyPlanStatus` enum. Final lifecycle:

```
DRAFT → SUBMITTED → APPROVED → IN_EXECUTION → OUTCOME_SUBMITTED → COMPLETED
                  ↘ NEEDS_CHANGES → (edit) → RESUBMITTED → APPROVED
SUBMITTED → WITHDRAWN → (edit) → DRAFT (resubmit cycle)
```

| Status | Editable | Who Acts | Allowed Next | Restrictions |
|--------|----------|----------|-------------|-------------|
| DRAFT | Yes | Inspector | SUBMITTED | Only 1 per inspector+week |
| SUBMITTED | No | Manager | APPROVED, NEEDS_CHANGES; Inspector: WITHDRAWN | Inspector cannot edit |
| NEEDS_CHANGES | Yes | Inspector | RESUBMITTED | Manager feedback visible |
| RESUBMITTED | No | Manager | APPROVED, NEEDS_CHANGES | Same as SUBMITTED |
| WITHDRAWN | Yes | Inspector | SUBMITTED | Reverts to editable state |
| APPROVED | No | System/Inspector | IN_EXECUTION | Locked |
| IN_EXECUTION | No (items only) | Inspector | OUTCOME_SUBMITTED | Only item execution fields |
| OUTCOME_SUBMITTED | No | Manager | COMPLETED | Report under review |
| COMPLETED | No | — | — | Archived |

### 3.2 Duplicate Prevention

**Database**: Add unique constraint on `ce_weekly_plans(inspector_id, week_start_date)` excluding WITHDRAWN status (partial unique index).

**Service**: Add pre-check in `weeklyPlanService.create()` to query for existing non-WITHDRAWN plans before insert.

### 3.3 Withdraw Capability

Add `weeklyPlanService.withdraw()` — sets status to WITHDRAWN, logs review action. Only allowed from SUBMITTED or RESUBMITTED status.

### 3.4 Eliminate Dual Type System

Deprecate `src/types/weeklyAuditPlan.ts` and `src/services/weeklyAuditPlanService.ts`. Migrate all screens (MyPlans, WeeklyReports, PendingReview, FieldExecution) to use `weeklyPlan.ts` types and `weeklyPlanService.ts`. This eliminates the `NEED_CHANGES` vs `NEEDS_CHANGES` inconsistency.

---

## 4. Inspection / Audit Execution Model

### 4.1 Enhanced Execution Flow

Expand `ExecutePlanItemDialog` from 4 tabs to 7 tabs:

1. **Check-in** — GPS, time, location (exists)
2. **Employer Interaction** (NEW) — representative name, designation, contact, authorization acknowledgement, records availability declaration (Complete / Partial / Unavailable / Refused)
3. **Working Papers** (NEW) — audit checklist, payroll review notes, contribution review, employee sample count, discrepancies
4. **Evidence** — photos, documents, audio/video (exists, enhance with finding linkage)
5. **Findings** — categorized findings (exists, enhance with follow-up flag)
6. **Violations** — create from findings (exists)
7. **Check-out & Close** — GPS, time, final notes, next action, employer signature/refusal (NEW as separate tab)

### 4.2 New Database Tables Required

**`ce_inspection_employer_interactions`** — employer representative details, declaration type, authorization status, refusal notes

**`ce_inspection_working_papers`** — checklist responses (linked to `ce_inspections`), payroll reviewed flag, contribution reviewed flag, employee sample size, discrepancy notes

**`ce_inspection_evidence`** (new or enhance existing) — dedicated evidence table with finding_id FK, GPS per evidence item, captured_by, file metadata. Currently evidence is stored as JSONB in `ce_inspections.documents_collected` and `ce_inspections.photos` — needs normalization.

### 4.3 Employer Declaration Model

| Declaration | Handling |
|------------|---------|
| Records Complete | Proceed normally |
| Records Partial | Warning logged, inspector notes what's missing |
| Records Unavailable | Must record reason, can proceed with limited scope |
| Refused Access | Auto-flag as possible violation, must record refusal |
| Refused Signature | Record refusal reason, inspector self-certifies |

### 4.4 Visit Completion Validation

Before check-out is allowed:
- **Mandatory**: At least one finding recorded (even if COMPLIANT)
- **Mandatory**: Employer interaction section completed
- **Warning only**: No evidence attached
- **Blocking**: Any POSSIBLE_VIOLATION finding without violation conversion or explicit explanation
- **Warning**: Working papers incomplete

---

## 5. Working Papers, Evidence, Findings & Acknowledgement Model

### 5.1 Working Papers

A structured checklist per visit, stored in `ce_inspection_working_papers`:
- Payroll records reviewed (Y/N + notes)
- Contribution records reviewed (Y/N + notes)
- Employee sample reviewed (count + notes)
- Wage book reviewed (Y/N + notes — column already exists: `ce_inspections.wage_books_reviewed`)
- Discrepancies found (free text)
- Inspector observations (free text)

**Mandatory**: At least payroll or contribution section must be completed for EMPLOYER_VISIT type.
**Optional**: For SCOUTING visits, working papers are optional.

### 5.2 Evidence Register

Normalize evidence from JSONB columns to a proper `ce_inspection_evidence` table:
- `id`, `inspection_id`, `finding_id` (nullable FK), `evidence_type`, `file_name`, `file_url`, `file_size`, `description`, `captured_at`, `captured_by`, `gps_lat`, `gps_lng`

### 5.3 Finding Register

Existing `ce_inspection_findings` table is adequate. Add:
- `follow_up_required` boolean
- `follow_up_notes` text
- `explanation_if_no_violation` text (for POSSIBLE_VIOLATION findings not converted)

### 5.4 Visit Close-out Summary

Auto-generated summary card at check-out showing:
- Duration (check-in to check-out)
- Working papers completion %
- Evidence count
- Findings count by severity
- Violations created
- Follow-ups required
- Employer acknowledgement status

---

## 6. Automatic Weekly Report Generation

### 6.1 Report Auto-Population

Create a database view `ce_v_weekly_report_summary` that aggregates from:
- `ce_weekly_plan_items` — planned/completed/rescheduled/cancelled/not_done counts
- `ce_inspections` — hours from check_in/check_out, findings_summary
- `ce_inspection_findings` — finding counts by type/severity
- `ce_inspection_evidence` — evidence count
- `ce_violations` — violations created during the plan period
- `ce_follow_up_actions` — follow-ups created

### 6.2 Inspector Additions (Not Auto-Generated)

- Short narrative summary
- Exceptions / blockers encountered
- Recommendations / next week priorities

### 6.3 Report Submission Validations

| Validation | Severity |
|-----------|----------|
| Completed visit without any findings | **Blocking** |
| POSSIBLE_VIOLATION finding without violation or explanation | **Blocking** |
| Plan item still PLANNED (not executed, no reason) | **Blocking** |
| Plan item NOT_DONE without reason | **Blocking** |
| Evidence count = 0 for completed visits | **Warning** |
| Working papers incomplete | **Warning** |

### 6.4 Report Lifecycle

`IN_EXECUTION` → inspector clicks "Submit Weekly Report" → status becomes `OUTCOME_SUBMITTED` → supervisor reviews → `COMPLETED`

Currently `weeklyAuditPlanService.submitWeeklyReport()` jumps directly to COMPLETED. Fix to use OUTCOME_SUBMITTED, then supervisor completes via `weeklyPlanService.complete()`.

---

## 7. Screen-by-Screen Change Plan

| Screen | Gap | Required Change | Priority | Type |
|--------|-----|----------------|----------|------|
| **WeeklyPlanBuilder** | No duplicate prevention | Add check before plan creation; show error if plan exists | High | Service + UI |
| **WeeklyPlanBuilder** | No withdraw option | Add "Withdraw" button for SUBMITTED/RESUBMITTED plans | Medium | UI + Service |
| **MyPlans** | Uses `weeklyAuditPlanService` | Migrate to `weeklyPlanService` | High | Service |
| **MyPlans** | No WITHDRAWN status display | Add WITHDRAWN filter/badge | Medium | UI |
| **PendingReview** | Uses old service | Migrate to `weeklyPlanService` | High | Service |
| **WeeklyPlanReview** | Already uses correct service | No change needed | — | — |
| **FieldExecution** | Uses `inspectionService` with old types | Migrate to `weeklyPlanService.planItemService` for items | High | Service |
| **FieldExecution** | No employer interaction tab | Add tab 2 to ExecutePlanItemDialog | High | UI + Data |
| **FieldExecution** | No working papers | Add tab 3 to ExecutePlanItemDialog | High | UI + Data |
| **FieldExecution** | No visit close-out summary | Add summary card before check-out confirmation | Medium | UI |
| **FieldExecution** | No completion validation | Add blocking checks at check-out | Medium | UI + Service |
| **Findings** | No follow-up flag | Add follow_up_required toggle | Medium | UI + Data |
| **Findings** | No explanation for unconverted violations | Add explanation field | Medium | UI + Data |
| **Violations** | Finding→Violation traceability exists | No major change | — | — |
| **WeeklyReports** | Uses old service, TODO stubs | Create DB view for aggregation, migrate service | High | Data + Service |
| **WeeklyReports** | Jumps to COMPLETED | Fix to use OUTCOME_SUBMITTED | High | Service |
| **WeeklyReports** | No submission validation | Add blocking/warning checks | Medium | UI + Service |
| **AllWeeklyReports** | Supervisor report review | Needs approve/reject for outcome reports | Medium | UI + Service |

---

## 8. Data / Service / Workflow Changes

### Already Supported
- Plan CRUD with `ce_weekly_plans` and `ce_weekly_plan_items`
- Plan review history via `ce_weekly_plan_reviews`
- Check-in/check-out with GPS on plan items
- Finding creation and violation conversion
- Rejection count tracking
- Plan narrative and outcome narrative

### Needs Enhancement
- **Unique constraint** on `ce_weekly_plans(inspector_id, week_start_date)` — DB migration
- **WITHDRAWN status** in enum and service — code change
- **`ce_inspection_findings`** — add `follow_up_required`, `follow_up_notes`, `explanation_if_no_violation` columns — DB migration
- **Evidence normalization** — create `ce_inspection_evidence` table from JSONB columns — DB migration
- **`weeklyAuditPlanService.submitWeeklyReport()`** — change to OUTCOME_SUBMITTED instead of COMPLETED — code fix
- **Weekly report summary view** — create `ce_v_weekly_report_summary` — DB migration
- **Deprecate `weeklyAuditPlanService`** — migrate all consumers — code refactor

### New Requirements
- **`ce_inspection_employer_interactions`** table — DB migration
- **`ce_inspection_working_papers`** table — DB migration
- **Employer Interaction tab** in ExecutePlanItemDialog — new UI component
- **Working Papers tab** in ExecutePlanItemDialog — new UI component
- **Visit Close-out Summary** component — new UI component
- **Report submission validation** — new service logic
- **Withdraw plan** service method — new service method

---

## 9. Key Business Decisions Required

1. **Should WITHDRAWN plans be permanently hidden or shown with a strike-through?** — *Requires business confirmation*
2. **Is employer signature capture mandatory or optional for field visits?** — *Requires business confirmation*
3. **Should working papers use a fixed checklist template or be configurable per visit type?** — *Requires business confirmation*
4. **Can an inspector re-open a WITHDRAWN plan, or must they create a new one?** — *Inferred: re-open by changing status back to DRAFT*
5. **Should the weekly report auto-submit if all items are completed and validated, or always require manual submission?** — *Inferred: always manual*
6. **Maximum number of rejections before escalation?** — *Requires business confirmation*

---

## 10. Priority Implementation Roadmap

### Phase 1 — Critical Fixes (Week 1)
1. Add unique constraint for duplicate plan prevention
2. Unify type system (deprecate `weeklyAuditPlan.ts`)
3. Fix weekly report to use OUTCOME_SUBMITTED status
4. Add WITHDRAWN status and withdraw capability

### Phase 2 — Execution Enhancement (Week 2-3)
5. Create `ce_inspection_employer_interactions` table + UI tab
6. Create `ce_inspection_working_papers` table + UI tab
7. Normalize evidence to `ce_inspection_evidence` table
8. Add visit completion validation at check-out
9. Add visit close-out summary component

### Phase 3 — Reporting & Aggregation (Week 3-4)
10. Create `ce_v_weekly_report_summary` database view
11. Enhance weekly report screen with auto-populated data
12. Add report submission validation (blocking/warning)
13. Add supervisor report review (approve/reject outcome)

### Phase 4 — Polish (Week 4)
14. Add finding follow-up flags and unconverted violation explanations
15. Migrate all remaining screens from old service
16. Add employer signature capture
17. Add refusal-to-sign handling

