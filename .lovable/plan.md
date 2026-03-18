

# Complete Rebuild: Engagement-Centric Internal Audit Management System

## Current State Assessment

The existing system has ~39 pages, ~13 components, multiple hooks, and 60+ database tables for internal audit. Most modules exist and have been incrementally patched with `engagement_id` columns. However, the architecture is fragmented:
- Preparation uses `department_audit_id` as primary context, with `engagement_id` as secondary
- Activities/Execution filter by `department_audit_id` with engagement as optional
- Work Programs don't exist (only "Audit Programs" as templates without steps/procedures)
- No engagement status lifecycle automation
- Closure operates at plan level, not engagement level
- No unified "Digital Audit File" experience
- Department Master uses `ia_departments` (not central `tb_office`)

## Phased Rebuild Strategy

Due to the massive scope (rebuilding 39 pages), this must be done in phases. Each phase is independently deployable.

---

### PHASE 1: Database Foundation (Migration)

**New tables to create:**
- `ia_work_programs` — Work programs linked to engagement + audit program template
- `ia_work_program_steps` — Individual audit steps within a work program
- `ia_testing_procedures` — Testing procedures for each step with results
- `ia_engagement_closure` — Formal closure record per engagement (replaces plan-level closeout)

**Schema changes to existing tables:**
- `ia_departments`: Add `tb_office_id` FK to map to central `tb_office` table
- `ia_audit_engagements`: Add `lifecycle_status` enum (Planned, Preparation, Execution, Issue_Management, Closure, Completed) separate from existing `status`
- Ensure all 11 downstream tables have `engagement_id` (most already do from previous migrations)

**Work Program schema:**
```text
ia_work_programs
  id, engagement_id (FK), audit_program_id (FK, optional), title, objective, status, created_by

ia_work_program_steps  
  id, work_program_id (FK), step_number, step_name, description, assigned_to, status, 
  start_date, end_date, engagement_id (FK)

ia_testing_procedures
  id, step_id (FK), procedure_name, test_type, expected_result, actual_result, 
  conclusion, evidence_ids (jsonb), engagement_id (FK)
```

**Engagement Closure schema:**
```text
ia_engagement_closure
  id, engagement_id (FK, unique), review_notes, qa_review_status, final_audit_rating,
  final_report_file, closed_by, closed_date, closure_approved_by, closure_approval_date,
  all_findings_resolved (boolean), all_docs_uploaded (boolean), all_responses_completed (boolean)
```

---

### PHASE 2: Rebuild Engagement Workspace (Core Hub)

Completely rewrite `EngagementDetail.tsx` as the **Digital Audit File**:

**New tab structure (14 tabs):**
1. **Overview** — Engagement details, team, scope, timeline, lifecycle status stepper
2. **Preparation** — Inline checklist management, document requests, work program creation, team confirmation
3. **Work Program** — Full work program with steps and testing procedures (NEW)
4. **Execution** — Activities list with inline create, status tracking, assignment
5. **RCM** — Risk Control Matrix filtered to engagement's function/department
6. **Evidence** — Evidence library with upload, tagging, version tracking
7. **Working Papers** — Working papers management
8. **Findings** — Findings with risk ratings, inline create from observations
9. **Mgmt Response** — Management responses linked to findings
10. **Corrective Actions** — Action tracking with owner assignment from profiles table
11. **Follow-Up** — Follow-up tracker
12. **Closure** — Closure checklist with validation rules, final rating, QA review
13. **Reports** — Engagement-specific reports
14. **Communication** — Communication threads within engagement

**Key features:**
- Lifecycle status stepper at the top (visual progression: Planned → Preparation → ... → Completed)
- Each tab has inline CRUD (no need to navigate away)
- Quick Navigation links preserved for full-page module access with `?engagement_id=`
- Status transitions enforced (e.g., can't go to Execution until Preparation is approved)

---

### PHASE 3: Rebuild Preparation Module

Rewrite `AuditPreparation.tsx`:
- Primary context: `engagement_id` (not `department_audit_id`)
- Work Program builder (create from template or scratch)
- Work Program → Steps → Testing Procedures hierarchy
- Document request list with status tracking
- Team confirmation panel
- Timeline/schedule view
- "Mark Ready for Execution" button (transitions engagement to Execution status)
- Lead Auditor approval before execution

---

### PHASE 4: Rebuild Execution Module

Rewrite `ActivityWorkbench.tsx`:
- Activities created from Work Program Steps (auto-generated or manual)
- Each activity links to: evidence uploads, working papers, observations
- Execution follows Work Program structure
- Inline evidence upload per activity
- Inline observation recording (which can be elevated to Findings)
- Status tracking per step

---

### PHASE 5: Rebuild Issue Management

Rewrite `FindingsManagement.tsx`, `ManagementResponses.tsx`, `ActionTracking.tsx`, `FollowUpTracker.tsx`:
- Findings generated from execution observations
- Each finding auto-creates a corrective action stub
- Management Response workflow linked to findings
- Action owners selected from `profiles` table
- Follow-up tracker with due date reminders
- Risk ratings: High / Medium / Low (simplified from Critical/High/Medium/Low)

---

### PHASE 6: Rebuild Closure Module

Replace `PlanCloseout.tsx` with engagement-level closure:
- Validation rules enforced:
  - All findings resolved OR formally accepted
  - All documentation uploaded
  - All management responses completed
- Closure steps: Internal Review → Final Report Approval → Management Acknowledgement → Closed
- Final Audit Rating (Satisfactory, Needs Improvement, Unsatisfactory)
- Once closed, engagement becomes read-only

---

### PHASE 7: Department Master Integration

Update `DepartmentMaster.tsx` and `FunctionMaster.tsx`:
- Map `ia_departments` to `tb_office` / `tb_office_departments`
- Display hierarchy: Location → Department → Function → Process
- Inactive departments: historical data visible, no new functions allowed
- Past findings influence future risk scoring

---

### PHASE 8: Sidebar & Navigation Update

Update `auditMenuItems.ts`:
- Keep both access paths (sidebar + engagement workspace)
- Reorganize to match lifecycle:
  - Audit Universe (Function Master + Department Master)
  - Risk Assessment
  - Audit Planning
  - Audit Engagements (primary entry point)
  - Standalone module links preserved

---

### PHASE 9: Notification Integration

Wire up `auditNotificationService.ts` for all lifecycle events:
- Audit Plan Created → Lead Auditor
- Engagement Created/Approved → Auditors + Department Head
- Lead Auditor Assigned → Notification
- Preparation Started → Team
- Finding Created → Relevant parties
- Corrective Action Assigned → Action Owner
- Action Due Reminder → Daily cron
- Closure Completed → All stakeholders

---

### PHASE 10: Reporting Module

Rebuild `AuditReports.tsx`:
- All reports filtered by `engagement_id`
- Report types: Engagement Summary, Finding Summary, Risk Heat Map, Department History, Action Status, Audit Performance Metrics

---

## Files to Create/Modify

**New files:**
- Migration SQL for new tables
- `src/pages/audit/WorkProgramBuilder.tsx` (new)
- `src/hooks/useWorkPrograms.ts` (new)
- `src/hooks/useEngagementClosure.ts` (new)

**Major rewrites:**
- `src/pages/audit/EngagementDetail.tsx` — Full workspace rebuild
- `src/pages/audit/AuditPreparation.tsx` — Engagement-first
- `src/pages/audit/ActivityWorkbench.tsx` — Work program driven
- `src/pages/audit/FindingsManagement.tsx` — Observation-to-finding flow
- `src/pages/audit/ManagementResponses.tsx` — Engagement-scoped
- `src/pages/audit/ActionTracking.tsx` — Profiles-based owners
- `src/pages/audit/FollowUpTracker.tsx` — Engagement-scoped
- `src/pages/audit/PlanCloseout.tsx` → Engagement closure
- `src/pages/audit/AuditReports.tsx` — Engagement-scoped reports
- `src/pages/audit/CommunicationCenter.tsx` — Engagement threads
- `src/pages/audit/RiskControlMatrix.tsx` — Engagement-aware
- `src/pages/audit/DepartmentMaster.tsx` — tb_office mapping
- `src/components/sidebar/menuItems/auditMenuItems.ts` — Reorganize

**No deletion of existing data** — backward compatibility via backfill migrations.

---

## Implementation Order

Due to the massive scope, I recommend implementing **Phase 1 (Database) + Phase 2 (Engagement Workspace)** first, then proceeding phase by phase. Each phase builds on the previous one.

Shall I proceed with Phase 1 and Phase 2?

