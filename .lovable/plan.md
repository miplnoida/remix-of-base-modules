

# Plan: Enterprise Field Audit Execution — End-to-End Strengthening

## 1. Gap Analysis (current state)

**What already exists (good news — DB is enterprise-ready):**

| Layer | Asset | State |
|---|---|---|
| DB | `ce_weekly_plans` + `ce_weekly_plan_items` | ✅ Full lifecycle (DRAFT→APPROVED→IN_EXECUTION→COMPLETED), reschedule, carry-forward, narrative |
| DB | `ce_inspections` | ✅ Visit lifecycle, GPS, check-in/out, `case_id` link |
| DB | `ce_inspection_findings` | ✅ Has `severity`, `finding_type`, `follow_up_required`, `follow_up_notes`, `violation_id`, `explanation_if_no_violation` |
| DB | `ce_inspection_evidence` | ✅ Linked to inspection + finding + plan_item, file_url, GPS, captured_by |
| DB | `ce_inspection_working_papers` | ✅ Payroll/contributions/wage-book review, sample size, observations |
| DB | `ce_inspection_employer_interactions` | ✅ Representative, records declaration, **signature data + refusal reason** |
| DB | `ce_follow_up_actions` | ✅ Action type, priority, assigned_to, due_date, queue, dedup |
| Code | `inspection/*TabContent.tsx` (CheckIn, CheckOut, Findings, Evidence, Observations, WorkingPapers, EmployerInteraction, Violations) | ✅ Most components exist |
| Code | `AuditChecklistDialog` + `auditChecklist.ts` templates | ✅ UI exists with templates |

**What is broken / missing:**

| # | Gap | Impact |
|---|---|---|
| G1 | **3 overlapping services** (`weeklyAuditPlanService`, `inspectionService`, `weeklyReportService`) duplicate logic with different mappers | Inconsistent reads, tech debt |
| G2 | `inspectionService.uploadEvidence` writes to `ce_inspections.documents_collected` JSONB **instead of `ce_inspection_evidence` table** | Evidence never appears in evidence table; not linkable to findings |
| G3 | `weeklyReportService.getEvidenceForVisit` reads evidence from `ce_inspection_findings` where `finding_type='EVIDENCE'` (wrong table) | Evidence count always 0 in weekly report |
| G4 | `AuditChecklistDialog` `onSave` is local-only — checklist is **not persisted anywhere** | All checklist work lost |
| G5 | No DB table for checklist responses; `ce_inspection_working_papers` is the closest but doesn't store per-question Yes/No/Partial/N/A | Can't store structured checklist execution |
| G6 | `inspectionService.createFinding` concatenates title+description into `description`; no separate `title`, `category`, `recommended_action`, `evidence_ids` mapping | Structured findings degraded to free text |
| G7 | `weeklyAuditPlanService.generateWeeklyReportSummary` has TODOs: `evidenceCollected: 0`, `violationsOpened: 0`, `violationsUpdated: 0` | Weekly report inaccurate |
| G8 | **No Plan Execution Dashboard** showing per-visit checklist %, evidence count, findings count, report status | Inspector & supervisor can't see execution health |
| G9 | **No Employer Audit Report generator** — no PDF/printable report compiling visit + checklist + findings + evidence + working papers + signatures | Required deliverable missing |
| G10 | Follow-up flow: `ce_follow_up_actions` requires `violation_id` (NOT NULL FK) — can't create follow-up directly from finding without first creating violation | Blocks "follow-up visit from finding" use-case |
| G11 | No "follow-up visit" creation that re-injects into next week's plan with linkage to prior visit/finding | Manual workaround only |
| G12 | Visit Workspace fragmented across many tab components, but no single cohesive **Visit Workspace screen** with employer summary header, progress strip, and tab orchestration that persists checklist/working papers/interactions consistently | Inspector UX poor |
| G13 | `created_by`/`inspector_id` hardcoded to `'SYSTEM'` in `inspectionService` | No audit trail per project rules |

---

## 2. Target Process Flow

```text
[1] Plan Builder (inspector)
        |
        v
[2] Senior Inspector / Manager Review --> NEED_CHANGES loop
        |
        v
[3] APPROVED Plan -> visits visible in Plan Execution Dashboard
        |
        v
[4] Visit Workspace (per visit)
     +-- Employer Summary
     +-- Check-in (GPS, time)
     +-- Employer Interaction (rep, records, authorization)
     +-- Audit Checklist Execution  --> ce_audit_checklist_responses (NEW)
     +-- Working Papers              --> ce_inspection_working_papers
     +-- Evidence Upload             --> ce_inspection_evidence (FIX)
     +-- Structured Findings         --> ce_inspection_findings
              |-- evidence linkage   --> ce_inspection_evidence.finding_id
              |-- follow_up_required --> creates follow-up plan item
              \-- violation_required --> ce_violations + ce_follow_up_actions
     +-- Signature / refusal         --> ce_inspection_employer_interactions
     +-- Check-out (GPS, time, summary)
        |
        v
[5] Generate Employer Audit Report (PDF) --> ce_employer_audit_reports (NEW)
        |
        v
[6] Follow-Up Items auto-created in NEXT week's draft plan
        |
        v
[7] Weekly Status Report Submission (inspector narrative + auto KPIs)
        |
        v
[8] Supervisor reviews / approves weekly report --> COMPLETED
```

---

## 3. Data Model Additions (2 new tables, 1 column)

### 3.1 `ce_audit_checklist_responses` (NEW)
Stores per-question execution of the checklist for a visit.
- `id uuid PK`
- `inspection_id uuid FK -> ce_inspections(id) ON DELETE CASCADE`
- `plan_item_id uuid FK -> ce_weekly_plan_items(id)`
- `template_key varchar(50)` (e.g. `GENERAL_AUDIT`)
- `category varchar(100)`
- `question_id varchar(50)`
- `question_text text`
- `response varchar(10)` — 'Yes' | 'No' | 'Partial' | 'N/A'
- `notes text`
- `evidence_required boolean`
- `created_by varchar(50)`, `created_at`, `updated_at`
- Unique index `(inspection_id, question_id)`

### 3.2 `ce_employer_audit_reports` (NEW)
- `id uuid PK`
- `report_number varchar(50) UNIQUE` (e.g. `AR-2026-000123`)
- `inspection_id uuid FK -> ce_inspections(id)`
- `employer_id varchar(20)`, `employer_name varchar(200)`
- `inspector_id`, `inspector_name`
- `report_date date`
- `executive_summary text`
- `scope text`
- `conclusions text`
- `recommendations text`
- `total_findings int`, `total_evidence int`, `total_violations int`
- `checklist_completion_pct numeric(5,2)`
- `status varchar(20)` — 'DRAFT' | 'FINAL' | 'SHARED'
- `pdf_url text` (storage)
- `generated_at`, `generated_by`, `finalized_at`, `finalized_by`
- `created_at`, `updated_at`

### 3.3 Relax `ce_follow_up_actions.violation_id`
Make `violation_id` nullable so a follow-up action can be created directly from a finding without a violation.
Add `finding_id uuid FK -> ce_inspection_findings(id)`.

---

## 4. Service Layer Refactor

**Consolidate into one `fieldAuditService.ts`** (replaces overlapping logic across the 3 services). Old services become thin re-exports during migration.

New / fixed methods:

| Method | Purpose |
|---|---|
| `getPlanExecutionDashboard(planId)` | Returns visits + per-visit aggregates (checklistPct, evidenceCount, findingsCount, hasReport, followUpCount) |
| `checkIn(planItemId, gps)` / `checkOut(visitId, gps, notes)` | Fixed to use auth `user_code` |
| `saveChecklistResponses(inspectionId, planItemId, templateKey, items[])` | Upsert into `ce_audit_checklist_responses` |
| `getChecklistResponses(inspectionId)` | Read responses |
| `uploadEvidence(inspectionId, planItemId, findingId?, file, type, desc, gps)` | **Fixed** to write to `ce_inspection_evidence` + Storage |
| `createStructuredFinding(req)` | Writes title (NEW col? — use `description` first line OR add `title` col), category, severity, recommended_action, follow_up_required, evidence_ids |
| `createFollowUpFromFinding(findingId, dueDate, priority, assignedTo, reason)` | Inserts into `ce_follow_up_actions` with `finding_id`; optionally creates a `ce_weekly_plan_items` row in next week's draft plan |
| `generateEmployerAuditReport(inspectionId)` | Aggregates all data, inserts `ce_employer_audit_reports`, generates PDF via existing `pdfGenerator` util, uploads to Storage |
| `getEmployerAuditReport(inspectionId)` | Read |
| `finalizeAuditReport(reportId)` | Locks report, status FINAL |
| `getWeeklyReportSummary(planId)` | **Fixed**: counts evidence from `ce_inspection_evidence`, violations from `ce_violations` filtered by week, findings from `ce_inspection_findings` |
| `submitWeeklyReport(planId, narrative)` | Validates (all visits closed, possible-violations converted), updates plan status |
| `reviewWeeklyReport(planId, approve, comments)` | Supervisor approval/rejection |

Add minor column `ce_inspection_findings.title varchar(200)` and `category varchar(100)` and `recommended_action text` to fully back the structured model.

---

## 5. Screen-by-Screen Plan

### A. Plan Execution Dashboard (NEW)
Route: `/compliance/field/execution-dashboard/:planId`  
Shows:
- Plan header (week, inspector, status)
- KPI strip: Planned / Completed / In Progress / Rescheduled / Not Done
- Visits table with columns: Date | Employer/Area | Status | Checklist % | Evidence | Findings | Report | Follow-up | Action (Open Workspace)

### B. Visit Workspace (consolidate)
Route: `/compliance/field/visit/:planItemId`  
Single page with **employer summary header** + tabs (reuse existing tab components, wire to fixed service):
1. Check-in / GPS
2. Employer Interaction (rep, records, authorization)
3. Audit Checklist (persists now)
4. Working Papers
5. Evidence
6. Findings (structured form)
7. Conclusions & Check-out (signature capture, refusal handling)
8. Audit Report (Generate PDF button → preview → finalize)

### C. Findings Form (upgrade `CreateFindingDialog`)
Fields: Category (select), Title, Description, Severity, Finding Type, Recommended Action, Linked Evidence (multi-select), Follow-up Required (checkbox → opens follow-up sub-form), Violation Required (checkbox → opens existing `CreateViolationFromFindingDialog`).

### D. Employer Audit Report Viewer (NEW)
Route: `/compliance/field/audit-report/:inspectionId`  
Compiles: cover page (Misha Infotech branding per memory), executive summary, scope, employer details, visit details (check-in/out, GPS, representative), checklist results, working papers, findings table with severity, evidence thumbnails, conclusions, recommendations, signatures section. PDF via existing pdf util to Storage; download link.

### E. Follow-Up Visit Planning (enhance `FollowUpFromFindingDialog`)
- Select date (defaults next week)
- Reason (pre-filled from finding)
- Priority (LOW/NORMAL/HIGH/URGENT)
- Assigned officer (SearchableSelect from `ce_inspectors`)
- Linked prior visit (read-only)
- Auto-creates row in next week's DRAFT plan + `ce_follow_up_actions` row with `finding_id`

### F. Weekly Status Report Submission (enhance existing `WeeklyReportSubmission.tsx`)
Auto-populated KPIs (now accurate):
- Completed / Pending / Rescheduled / Not Done visits
- Evidence count, Findings count (by severity), Reports generated, Violations opened/updated, Follow-ups created
- Inspector narrative (textarea)
- "Validate" → calls `validateWeeklyReport` (blocks unconverted possible-violations, completed visits without findings)
- "Submit" → status `SUBMITTED`

### G. Supervisor Weekly Report Review (NEW lightweight)
Route: `/compliance/field/weekly-report-review`  
Lists submitted weekly reports → drill-down → Approve / Reject with comments.

### H. Sidebar entries (`app_modules` inserts)
- "Plan Execution Dashboard" → `/compliance/field/execution-dashboard` (parent: Field)
- "Visit Workspace" — hidden (deep-link only)
- "Audit Report" — hidden (deep-link only)
- "Weekly Report Review" → `/compliance/field/weekly-report-review`

---

## 6. Reporting / Output Design

| Output | Format | Source |
|---|---|---|
| Employer Audit Report | PDF (Misha branding) | `ce_employer_audit_reports` + child data |
| Weekly Status Report | On-screen + printable HTML | `ce_weekly_plans.outcome_narrative` + computed KPIs |
| Plan Execution Dashboard | Live screen | `ce_v_plan_execution_summary` (NEW DB view, optional optimization) |

---

## 7. Implementation Phases (safe order)

### Phase 1 — Data Model & Service Foundation
1. Migration: new tables `ce_audit_checklist_responses`, `ce_employer_audit_reports`; add cols `title/category/recommended_action` to findings; relax `violation_id` & add `finding_id` on `ce_follow_up_actions`
2. Create unified `fieldAuditService.ts` (new methods + fixes for evidence + summary KPIs)
3. Migrate existing components to call new service; keep old service files as deprecated re-exports

### Phase 2 — Visit Workspace & Persistence
4. Wire `AuditChecklistDialog` → persist to `ce_audit_checklist_responses`
5. Fix `uploadEvidence` to write to `ce_inspection_evidence` table; surface in Evidence tab
6. Upgrade Findings form (structured fields + evidence linkage + follow-up + violation)
7. Build single Visit Workspace page orchestrating tabs

### Phase 3 — Reporting & Dashboards
8. Plan Execution Dashboard screen
9. Employer Audit Report generator (UI + PDF + Storage)
10. Fix `generateWeeklyReportSummary` (real evidence/violation/findings counts)

### Phase 4 — Follow-up & Weekly Report Closure
11. Follow-up visit creator (auto-injects into next week's draft plan + `ce_follow_up_actions`)
12. Enhance Weekly Report Submission with accurate KPIs + validation gate
13. Supervisor Weekly Report Review screen

### Phase 5 — Sidebar, Audit Trail, Polish
14. `app_modules` inserts for new visible screens
15. Replace hardcoded `'SYSTEM'` with auth `user_code` (createdby/updatedby per project rules)
16. Update knowledge repo entry + test cases per project governance rule

---

## 8. Non-Goals (explicit)
- No RLS (per project rule, role-based only)
- No mobile-native app — responsive web only
- Existing inspection/audit hierarchy under `/audit/*` (Internal Audit module) is **not touched** — this plan covers only Compliance & Enforcement field audit (`/compliance/field/*`)

