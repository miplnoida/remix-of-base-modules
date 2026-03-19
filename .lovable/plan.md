

# Refactor Internal Audit Module — Simplified Department Function Audit System

## Overview

Strip the existing enterprise audit platform down to a simple, function-level department audit system. Remove ~25 pages, ~15 hooks, and disable ~30 feature flags. Create 1 new table (`ia_audit_checklists`), simplify the route config, rebuild the dashboard, and rewire the sidebar menu.

## Scope Summary

**KEEP (10 core screens):**
1. Dashboard (rebuild simplified)
2. Department Master (existing)
3. Function Master (existing)
4. Risk Assessment (simplify — function-level only)
5. Risk Matrix (new page — 5×5 heatmap, already partially exists in RiskAssessment.tsx)
6. Audit Plans (simplify — risk-driven, function-linked)
7. Audits (rename Engagements → Audits, simplify)
8. Findings (simplify — link to checklist)
9. Action Tracking (keep as-is)
10. Reports (simplify)

**REMOVE (25+ screens):**
Audit Programs, Control Testing, RCM, Working Papers, Evidence, Activity Calendar, Activity Workbench, Time Tracking, Leave Management, Holiday Management, Workload Capacity, Auditor Profiles, Quality Review, Follow-Up Tracker, Plan Approval, Plan Closeout, Communication Center, Letter Generation, Report Builder, Committee Reports, SLA Rules, Templates, Executive Dashboard, Audit Preparation, EngagementDetail (14-tab workspace)

---

## Phase 1: Database Changes

### New Table: `ia_audit_checklists`
```sql
CREATE TABLE public.ia_audit_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.ia_audit_engagements(id),
  question TEXT NOT NULL,
  description TEXT,
  response TEXT DEFAULT 'Not Assessed', -- Compliant, Non-Compliant, Not Applicable
  remarks TEXT,
  evidence_file TEXT,
  status TEXT DEFAULT 'Pending',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);
```

### Modify `ia_findings`
- Add `checklist_id UUID REFERENCES ia_audit_checklists(id)` column
- Add `recommendation TEXT` column

### Modify `ia_audit_engagements` (rename conceptually to "Audits")
- Add `closure_date DATE`, `closed_by TEXT`, `closure_notes TEXT` columns
- Ensure `function_id` FK exists (already present)

### Modify `ia_annual_plans` (simplify)
- Add `function_id UUID`, `risk_level TEXT`, `assigned_auditor TEXT` columns if not present

No tables will be dropped (safe approach) — they simply won't be used by the UI.

---

## Phase 2: Route & Feature Flag Cleanup

Rewrite `auditRouteConfig.ts` to only include 10 routes:
- `dashboard` → `/audit/dashboard`
- `departments` → `/audit/departments`
- `functions` → `/audit/functions`
- `risk-assessment` → `/audit/risk-assessment`
- `risk-matrix` → `/audit/risk-matrix` (new)
- `audit-plans` → `/audit/audit-plans`
- `audits` → `/audit/audits` (was engagements)
- `findings` → `/audit/findings`
- `action-tracking` → `/audit/actions`
- `reports` → `/audit/reports`

Disable all other feature flags (set to `false`).

---

## Phase 3: New/Rebuilt Pages

### 3a. Risk Matrix Page (new)
- 5×5 interactive Impact vs Likelihood grid
- Color-coded cells (Low=green, Medium=amber, High=red, Critical=dark red)
- Click cell to see functions in that risk band
- Read-only visualization derived from `ia_risk_assessments`

### 3b. Audit Checklist (embedded in Audit detail)
- Replace the 14-tab EngagementDetail with a simpler Audit Detail page
- Tabs: Overview, Checklist, Findings, Closure
- Checklist tab: add/edit questions, mark Compliant/Non-Compliant/NA
- Non-Compliant items can generate findings

### 3c. Simplified Audit Plans
- Risk-driven: fetch functions sorted by risk, select high/critical for plan
- Fields: plan_year, department, function, risk_level, dates, assigned_auditor, status
- Statuses: Draft, Approved, Active, Completed

### 3d. Simplified Dashboard
- KPIs: Total Departments, Total Functions, Audits Planned, Audits Completed, Open Findings, Overdue Actions
- Risk Dashboard: Top risk functions, risk heatmap summary, risk by department
- Recent findings table

### 3e. Simplified Audit Execution
- Audit → Checklist → Findings flow
- Lifecycle: Planned → In Progress → Findings Raised → Management Response → Closed
- Closure validation: all findings reviewed, responses submitted, actions assigned

---

## Phase 4: Hook Cleanup

### New hooks:
- `useAuditChecklists(auditId)` — CRUD for `ia_audit_checklists`

### Simplify existing:
- Keep: `useIADepartments`, `useIADepartmentFunctions`, `useIARiskAssessments`, `useIAEngagements` (rename usage to "Audits"), `useIAFindings`, `useIAManagementResponses`, `useIAActionTracking`, `useIAAnnualPlans`, `useIAAuditors`
- Remove imports/usage of: `useIAActivities`, `useIAWorkingPapers`, `useIAEvidence`, `useIAControlTests`, `useIAAuditPrograms`, `useIARCM*`, `useIATimeLogs`, `useIAQualityReviews`, `useIASLARules`, `useIALeaveRequests`, `useIAHolidays`, `useIAAuditorWorkload`, `useIAFollowUps`, `useEngagementData` (all sub-hooks), `useWorkPrograms`, `useEngagementClosure`, `useAuditDiscussions`, `useConfigChangeRequests`

---

## Phase 5: Sidebar Menu Update

Update sidebar menu items to show flat audit menu:
- Dashboard
- Departments
- Functions
- Risk Assessment
- Risk Matrix
- Audit Plans
- Audits
- Findings
- Action Tracker
- Reports

---

## Phase 6: Component Cleanup

Remove unused components:
- `DiscussionThread`, `WorkProgramPanel`, `EngagementClosurePanel`, `LifecycleStepper`, `PlanAmendmentHistory`, `TemplateCommunicationDialog`, `ActivityScheduleForm`, `ActivityRescheduleDialog`, `AddEngagementToPlanForm`, `EngagementFilterBanner`

Keep:
- `RiskHeatMap` (for Risk Matrix page)
- `AuditFeatureGate`
- `ReportPreviewDialog`

---

## Implementation Order

Due to the size of this refactoring, implementation will be done in batches:

1. **Batch 1**: Database migration (new table + column additions) + Route config cleanup + Feature flags
2. **Batch 2**: New Risk Matrix page + Simplified Dashboard + Audit Checklist hook
3. **Batch 3**: Simplified Audit Detail page (replaces EngagementDetail) with Checklist/Findings/Closure tabs
4. **Batch 4**: Simplify Audit Plans page + Risk Assessment page cleanup
5. **Batch 5**: Sidebar menu update + Remove unused page files + Component cleanup
6. **Batch 6**: Reports page simplification + Management Responses cleanup

## Technical Notes

- No existing database tables will be dropped — they remain but are unused
- Existing `ia_departments` and `ia_department_functions` tables continue as source of truth
- The `profiles` table is used for user references (auditor assignment)
- All existing RLS policies remain intact
- The `ia_audit_engagements` table is reused as the "Audits" table (same structure, simplified UI)

