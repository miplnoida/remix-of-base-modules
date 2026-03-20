

# Internal Audit Module — Full Lifecycle Refactoring Plan

## Current State Assessment

After reviewing all 40+ existing `ia_*` tables and 15+ page components, here is what exists and what is broken:

**Already exists and works:**
- `ia_departments` with `head_profile_id` FK
- `ia_department_functions` with `department_id` FK
- `ia_risk_assessments` (function-level, 5x5 matrix)
- `ia_annual_plans` (but NO `department_id` — only `function_id`)
- `ia_audit_engagements` (has `department_id`, `function_id`, `annual_plan_id`)
- `ia_audit_checklists` (linked to engagements)
- `ia_findings` (has `engagement_id`, `department_id`)
- `ia_management_responses` (has `finding_id`, `engagement_id`)
- `ia_action_tracking` (has `finding_id`, `engagement_id`, `response_id`)
- `ia_audit_reports` (has `engagement_id`, `plan_id`, `department_id`)
- `ia_preparation_checklists` and `ia_preparation_documents`
- `ia_plan_change_log`, `ia_approval_actions`
- Notification service (`auditNotificationService.ts`)
- 10-item simplified navigation menu

**Key gaps identified:**
1. `ia_annual_plans` has NO `department_id` — plans cannot be linked to departments
2. No `ia_audit_plan_functions` table — cannot track which functions are included in a plan
3. No `ia_audit_queries` table — no department communication during audits
4. No `ia_audit_closure` table — closure is inline on engagement, not tracked separately
5. Audit Plan Detail page doesn't show department, risk, team, or functions
6. Audit Plan form doesn't collect department or risk info
7. Dashboard lacks proper metrics and filters
8. Notification service exists but is not called from most workflows
9. Navigation missing Plan Approval and Preparation links
10. Reports page has no structured report content (executive summary, methodology, etc.)

---

## Implementation Plan

### Phase 1: Database Schema Changes (Migration)

**1a. Add `department_id` to `ia_annual_plans`:**
```sql
ALTER TABLE ia_annual_plans 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES ia_departments(id),
  ADD COLUMN IF NOT EXISTS audit_scope TEXT,
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE;
```

**1b. Create `ia_audit_plan_functions` table:**
```sql
CREATE TABLE ia_audit_plan_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES ia_annual_plans(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES ia_department_functions(id),
  risk_score NUMERIC,
  risk_level TEXT,
  priority TEXT DEFAULT 'Normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, function_id)
);
```

**1c. Create `ia_audit_queries` table:**
```sql
CREATE TABLE ia_audit_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES ia_audit_engagements(id) ON DELETE CASCADE,
  department_id UUID REFERENCES ia_departments(id),
  question TEXT NOT NULL,
  requested_document TEXT,
  requested_by TEXT,
  requested_date TIMESTAMPTZ DEFAULT now(),
  response TEXT,
  response_by TEXT,
  response_date TIMESTAMPTZ,
  status TEXT DEFAULT 'Pending',
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**1d. Create `ia_audit_closure` table:**
```sql
CREATE TABLE ia_audit_closure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES ia_audit_engagements(id) ON DELETE CASCADE,
  closure_summary TEXT,
  lessons_learned TEXT,
  approved_by TEXT,
  closure_date DATE,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(engagement_id)
);
```

**1e. Add `audit_objective` and `audit_scope` to `ia_audit_engagements` (if missing):**
Already has `objectives` and `scope` columns — confirmed.

**1f. Enable RLS on new tables** with authenticated access policies.

### Phase 2: Data Hooks (4 files)

- **`useAuditPlanFunctions.ts`** — CRUD for `ia_audit_plan_functions`
- **`useAuditQueries.ts`** — CRUD for `ia_audit_queries`
- **`useAuditClosure.ts`** — CRUD for `ia_audit_closure`
- Update **`useAuditData.ts`** — update `useIAAnnualPlans` to join department name

### Phase 3: Refactor Audit Plan Form (AnnualPlanForm.tsx)

Add fields for:
- Department selector (cascading to functions)
- Risk score / risk level (auto-populated from risk assessment)
- Planned start/end dates
- Auto-populate high/critical risk functions as suggested inclusions

### Phase 4: Refactor Audit Plan Detail Page (AuditPlanDetail.tsx)

Rebuild with 4 sections:
1. **Plan Information** — Year, Department, Risk, Status, Approved By
2. **Functions Included** — Table from `ia_audit_plan_functions` with risk scores
3. **Audit Team** — Lead Auditor + Team Members from linked engagements
4. **Engagement Timeline** — Preparation → Fieldwork → Reporting → Closure status

### Phase 5: Audit Plan Approval Enhancement (PlanApproval.tsx)

Already has a working approval workflow (Draft → Submitted → Approved/Rejected). Enhance:
- Add "Reviewed" intermediate step
- Add "Scheduled" status after approval
- Integrate notification calls (`notifyPlanSubmitted`, `notifyPlanApproved`)

### Phase 6: Create Audit Queries Page (New: AuditQueries.tsx)

New page at `/audit/queries` for department communication:
- List queries filtered by engagement
- Create query with question + requested document
- Department response workflow (Pending → Responded → Closed)
- Integrate notifications on query creation and response

### Phase 7: Refactor Engagement Detail (EngagementDetail.tsx)

Add 2 new tabs to the existing 4-tab layout:
- **Preparation** tab — shows checklists and documents from `ia_preparation_checklists`/`ia_preparation_documents`
- **Queries** tab — shows audit queries for this engagement
- **Reports** tab — link to generate/view audit report for this engagement

Update Closure tab to write to `ia_audit_closure` table.

### Phase 8: Refactor Audit Reports (AuditReports.tsx)

Enhance report creation with structured fields:
- Executive Summary, Audit Objective, Scope, Methodology
- Auto-populate Key Findings from `ia_findings` for the engagement
- Risk Rating, Recommendations
- Management Response summary
- Action Plan summary
- View report detail page with full structured content

### Phase 9: Refactor Dashboard (AuditDashboard.tsx)

Add:
- Year and Department filters
- Metrics: Total Audits, Planned, In Progress, Completed, Overdue
- Overdue actions count with link
- Quick navigation cards to each module

### Phase 10: Integrate Email Notifications

Wire notification calls into existing mutation handlers:
- Plan submission → `notifyPlanSubmitted()`
- Plan approval → `notifyPlanApproved()`
- Finding created → `notifyFindingCreated()`
- Action assigned → `notifyActionAssigned()`
- Query sent → new notification function
- Response submitted → new notification function

### Phase 11: Update Navigation Menu

Add to `SIMPLIFIED_INTERNAL_AUDIT_MENU` in `useDynamicNavigation.ts`:
- Plan Approval (between Audit Plan and Audits)
- Queries (after Findings)

Update routes in `AppRoutes.tsx` for `/audit/queries`.

### Phase 12: Department Head Access Filtering

Add department-based filtering to:
- Findings page — filter by `department_id` matching logged-in user's department
- Management Responses — only show findings for user's department
- Action Tracking — filter by department scope
- Reports — filter by department

This uses the existing `profiles.department_id` or a department-user mapping.

---

## Files to Create/Modify

**New files (~6):**
- `src/hooks/useAuditPlanFunctions.ts`
- `src/hooks/useAuditQueries.ts`
- `src/hooks/useAuditClosure.ts`
- `src/pages/audit/AuditQueries.tsx`

**Modified files (~12):**
- `src/components/audit/AnnualPlanForm.tsx` — Add department, dates, risk fields
- `src/pages/audit/AuditPlanDetail.tsx` — Full rebuild with 4 sections
- `src/pages/audit/AuditPlans.tsx` — Add department column, link to detail
- `src/pages/audit/AuditEngagements.tsx` — Wire notifications
- `src/pages/audit/EngagementDetail.tsx` — Add Preparation, Queries, Reports tabs
- `src/pages/audit/FindingsManagement.tsx` — Wire notifications
- `src/pages/audit/ActionTracking.tsx` — Wire notifications
- `src/pages/audit/PlanApproval.tsx` — Add Reviewed/Scheduled statuses, notifications
- `src/pages/audit/AuditReports.tsx` — Structured report content
- `src/pages/audit/AuditDashboard.tsx` — Filters, metrics, overdue tracking
- `src/hooks/useDynamicNavigation.ts` — Add Plan Approval + Queries to menu
- `src/components/routing/AppRoutes.tsx` — Add queries route
- `src/services/auditNotificationService.ts` — Add query notification functions

**Database migration:** 1 migration with all schema changes

---

## Constraints Respected

- Uses existing `ia_departments`, `ia_department_functions`, `ia_auditors` tables
- Uses existing `auditNotificationService.ts` email system
- Extends (not replaces) existing pages and hooks
- Preserves existing FK relationships
- No duplicate master tables created

