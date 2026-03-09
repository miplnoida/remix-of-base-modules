# Internal Audit Module — Complete Documentation

**Module Prefix:** `ia_` (all database tables)  
**Route Prefix:** `/audit/*`  
**Last Updated:** 2026-03-09

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Module Inventory (23 Modules)](#4-module-inventory)
5. [Data Hooks & CRUD Operations](#5-data-hooks--crud-operations)
6. [UI Standards](#6-ui-standards)
7. [Workflow Rules](#7-workflow-rules)
8. [Permission Model](#8-permission-model)
9. [Feature Flags](#9-feature-flags)
10. [File Structure](#10-file-structure)

---

## 1. Overview

The Internal Audit (IA) module provides a complete audit lifecycle management system covering:

- **Auditor Management** — Profiles, workload, leave, holidays
- **Audit Planning** — Annual plans, department audits, plan approval
- **Audit Execution** — Activity scheduling, workbench, evidence, working papers, findings
- **Follow-up & Closure** — Management responses, action tracking, follow-ups, plan closeout
- **Reporting & Communication** — Reports, letters, report builder, communication center
- **Administration** — System configuration, department master, function master, templates

All 23 modules are currently **✅ Functional** (feature flags enabled).

---

## 2. Architecture

### 2.1 Route Configuration (Single Source of Truth)

**File:** `src/config/auditRouteConfig.ts`

All audit routes, feature flags, permissions, and categories are defined in this single file. Each route entry contains:

```typescript
interface AuditRouteEntry {
  moduleKey: string;         // Unique identifier
  label: string;             // Display name
  path: string;              // Route path
  permission: string;        // Required permission
  enabled: boolean;          // Feature flag state
  category: 'management' | 'planning' | 'execution' | 'followup' | 'reports' | 'administration';
  component: string;         // Component file path
}
```

### 2.2 Feature Gate Pattern

**File:** `src/components/audit/AuditFeatureGate.tsx`

Wraps each route. If the feature flag is disabled, renders `AuditModuleUnderActivation` placeholder instead of the real component.

### 2.3 Sidebar Navigation

**File:** `src/components/sidebar/menuItems/auditMenuItems.ts`

All 23 modules are grouped under "Internal Audit" (Shield icon) with sub-items organized by category.

### 2.4 Audit Trail

**File:** `src/hooks/useAuditTrail.ts`

All mutations inject `created_by` and `updated_by` fields using the logged-in user's 5-character `user_code` via the `useAuditFields()` hook:

```typescript
const { getCreateFields, getUpdateFields } = useAuditFields();
// getCreateFields() → { created_by: 'ADMIN', updated_by: 'ADMIN' }
// getUpdateFields() → { updated_by: 'ADMIN', updated_at: '2026-...' }
```

### 2.5 No RLS Policy

Per architectural constraint (Entry 9 in custom knowledge), **no Row Level Security** is applied to `ia_` tables. Only role-based security via permissions is used.

---

## 3. Database Schema

All tables use the `ia_` prefix. No foreign keys to `auth.users`. Created via migrations:

- `20260227061914` — Core tables
- `20260227064212` — Settings, risk criteria, activity types (with seed data)
- `20260305094241` — Audit reports table + action tracking enhancements

### 3.1 Master Data Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ia_departments` | Department registry | `name`, `head`, `email`, `phone`, `location`, `risk_rating`, `is_active` |
| `ia_department_functions` | Functions within departments | `department_id` (FK), `function_name`, `description`, `risk_level`, `last_audit_date`, `is_active` |
| `ia_auditors` | Auditor profiles | `user_id`, `name`, `email`, `employee_id`, `designation`, `specializations`, `certifications`, `is_active`, `max_concurrent_audits` |
| `ia_holidays` | Holiday calendar | `name`, `date`, `year`, `type` (Public/SSB-Specific/Other), `is_active` |
| `ia_audit_settings` | Key-value system config | `setting_category`, `setting_key`, `setting_value`, `setting_type` |
| `ia_risk_criteria` | Risk assessment criteria | `criteria`, `weight` (High/Medium/Low), `sort_order` |
| `ia_activity_types` | Activity type catalog | `name`, `description`, `default_duration`, `sort_order` |

### 3.2 Planning Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ia_annual_plans` | Annual audit plans | `fiscal_year`, `title`, `status` (Draft/Submitted/Under Review/Approved/Internally Approved/Active/Completed), `objectives`, `start_date`, `end_date`, `total_departments`, `total_auditors` |
| `ia_department_audits` | Department-level audit assignments within a plan | `annual_plan_id` (FK), `department_id` (FK), `period`, `status`, `scope`, `risk_rating`, `lead_auditor_id`, `team_member_ids[]`, `start_date`, `end_date` |
| `ia_leave_requests` | Auditor leave management | `request_id` (unique), `auditor_id` (FK), `leave_type`, `start_date`, `end_date`, `reason`, `status` (Draft/Submitted/Approved/Rejected), `approver_id` |

### 3.3 Execution Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ia_activities` | Scheduled audit activities | `department_audit_id` (FK), `annual_plan_id` (FK), `department_id` (FK), `activity_type`, `title`, `description`, `assigned_auditor_id`, `status`, `scheduled_date`, `start_date`, `end_date`, `actual_hours` |
| `ia_evidence` | Audit evidence attachments | `activity_id` (FK), `title`, `description`, `file_url`, `file_type`, `file_size`, `category`, `status` |
| `ia_working_papers` | Audit working papers | `activity_id` (FK), `title`, `reference_number`, `content`, `status` (Draft/Under Review/Reviewed/Closed), `prepared_by`, `reviewed_by` |
| `ia_findings` | Audit findings | `activity_id` (FK), `finding_number`, `title`, `description`, `severity` (Critical/High/Medium/Low), `status`, `root_cause`, `impact` |
| `ia_recommendations` | Recommendations linked to findings | `finding_id` (FK), `recommendation`, `priority`, `target_date`, `responsible_person` |

### 3.4 Follow-up & Closure Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ia_management_responses` | Responses from management to findings | `finding_id` (FK), `response_text`, `action_plan`, `target_date`, `responsible_person`, `status` |
| `ia_action_tracking` | Corrective action tracking | `finding_id`, `action_description`, `responsible_person`, `target_date`, `status`, `completion_date`, `evidence` |
| `ia_follow_ups` | Follow-up verification | `finding_id`, `follow_up_type` (Standard/SPOT_CHECK), `assigned_to`, `due_date`, `status`, `outcome`, `notes` |

### 3.5 Reporting & Communication Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ia_audit_reports` | Report builder persistence | `title`, `report_type`, `fiscal_year`, `period`, `department_id` (FK), `plan_id` (FK), `status`, `background`, `conclusion`, `key_findings`, `executive_summary` |
| `ia_document_templates` | Letter/document templates | `name`, `category`, `content`, `variables`, `is_active` |
| `ia_communications` | Sent communications log | `type`, `subject`, `body`, `recipients`, `sent_at`, `sent_by`, `template_id`, `related_entity_type`, `related_entity_id` |

### 3.6 Workload View

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ia_auditor_workload` | Auditor capacity view | `auditor_id`, `period_start`, `period_end`, `assigned_activities`, `completed_activities`, `capacity_percentage` |

### 3.7 Default Seed Data

**Settings** (category: general/notifications/compliance):
- `defaultAuditPeriod`: Monthly
- `autoAssignAuditors`: true
- `maxConcurrentAudits`: 3
- `notifyOnPlanApproval`: true
- `notifyOnFindingCreated`: true
- `managementResponseDays`: 14
- `followUpReminderDays`: 7
- `riskAssessmentFrequency`: Annual
- `complianceFramework`: COSO

**Risk Criteria** (5 defaults): Large employer, Financial institution, Government contract holder, Previous non-compliance, New registration

**Activity Types** (5 defaults): Compliance Check (4h), Records Review (6h), Interviews (3h), Process Walkthrough (5h), Full Audit (40h)

---

## 4. Module Inventory

### Category: Auditor Management

| # | Module | Route | Permission | Component |
|---|--------|-------|------------|-----------|
| 1 | Auditor Profiles | `/audit/auditors` | `configure_audit_system` | `AuditorProfiles.tsx` |
| 2 | Workload & Capacity | `/audit/workload` | `assign_auditors` | `WorkloadCapacity.tsx` |
| 3 | Leave & Vacation Management | `/audit/leave` | `assign_auditors` | `LeaveManagement.tsx` |
| 4 | Holiday Management | `/audit/holidays` | `assign_auditors` | `HolidayManagement.tsx` |

### Category: Audit Planning

| # | Module | Route | Permission | Component |
|---|--------|-------|------------|-----------|
| 5 | Audit Plans | `/audit/audit-plans` | `create_audit_plans` | `AuditPlansNew.tsx` |
| 6 | Plan Approval | `/audit/plan-approval` | `approve_audit_plans` | `PlanApproval.tsx` |

### Category: Audit Execution

| # | Module | Route | Permission | Component |
|---|--------|-------|------------|-----------|
| 7 | Activity Calendar | `/audit/calendar` | `view_audit_assignments` | `ActivityCalendar.tsx` |
| 8 | Activity Workbench | `/audit/activity-workbench` | `execute_audit_activities` | `ActivityWorkbench.tsx` |
| 9 | Evidence Management | `/audit/evidence` | `enter_audit_findings` | `EvidenceManagement.tsx` |
| 10 | Working Papers | `/audit/working-papers` | `enter_audit_findings` | `WorkingPapers.tsx` |
| 11 | Findings & Recommendations | `/audit/findings` | `enter_audit_findings` | `FindingsManagement.tsx` |

### Category: Follow-up & Closure

| # | Module | Route | Permission | Component |
|---|--------|-------|------------|-----------|
| 12 | Management Responses | `/audit/responses` | `view_audit_assignments` | `ManagementResponses.tsx` |
| 13 | Action Tracking | `/audit/actions` | `manage_audit_followups` | `ActionTracking.tsx` |
| 14 | Follow-Up Tracker | `/audit/follow-up-tracker` | `manage_audit_followups` | `FollowUpTracker.tsx` |
| 15 | Plan Closeout | `/audit/plan-closeout` | `approve_audit_closeouts` | `PlanCloseout.tsx` |

### Category: Reports & Communications

| # | Module | Route | Permission | Component |
|---|--------|-------|------------|-----------|
| 16 | Audit Reports | `/audit/audit-reports` | `generate_reports` | `AuditReports.tsx` |
| 17 | Letter Generation | `/audit/letters` | `create_audit_plans` | `LetterGeneration.tsx` |
| 18 | Report Builder | `/audit/report-builder` | `enter_audit_findings` | `ReportBuilder.tsx` |
| 19 | Communication Center | `/audit/communication-center` | `create_audit_plans` | `CommunicationCenter.tsx` |

### Category: Administration

| # | Module | Route | Permission | Component |
|---|--------|-------|------------|-----------|
| 20 | System Configuration | `/audit/config` | `configure_audit_system` | `AuditConfig.tsx` |
| 21 | Department Master | `/audit/departments` | `configure_audit_system` | `DepartmentMaster.tsx` |
| 22 | Function Master | `/audit/functions` | `configure_audit_system` | `FunctionMaster.tsx` |
| 23 | Templates | `/audit/templates` | `configure_audit_system` | `TemplatesManagement.tsx` |

---

## 5. Data Hooks & CRUD Operations

All hooks use `@tanstack/react-query` for caching and `supabase` client for data access. Organized across three files to avoid TypeScript deep instantiation errors:

### Hook File: `useAuditData.ts` (Primary)

| Hook | Table | Operations |
|------|-------|------------|
| `useIADepartments()` | `ia_departments` | Read (active only) |
| `useIADepartmentMutations()` | `ia_departments` | Create, Update, Soft Delete |
| `useIADepartmentFunctions(deptId?)` | `ia_department_functions` | Read (filterable) |
| `useIADepartmentFunctionMutations()` | `ia_department_functions` | Create, Update, Soft Delete |
| `useIAHolidays(year?)` | `ia_holidays` | Read (filterable by year) |
| `useIAHolidayMutations()` | `ia_holidays` | Create, Update, Soft Delete |
| `useIAAuditors()` | `ia_auditors` | Read |
| `useIAAuditorMutations()` | `ia_auditors` | Create, Update |
| `useIALeaveRequests()` | `ia_leave_requests` | Read |
| `useIALeaveRequestMutations()` | `ia_leave_requests` | Create, UpdateStatus |
| `useIAAnnualPlans()` | `ia_annual_plans` | Read |
| `useIAAnnualPlanMutations()` | `ia_annual_plans` | Create, Update |

### Hook File: `useAuditDataExtended.ts`

| Hook | Table | Operations |
|------|-------|------------|
| `useIADepartmentAudits(planId?)` | `ia_department_audits` | Read (filterable) |
| `useIADepartmentAuditMutations()` | `ia_department_audits` | Create, Update |
| `useIAActivities(filters?)` | `ia_activities` | Read (filter by dept audit, auditor, status) |
| `useIAActivityMutations()` | `ia_activities` | Create, Update |
| `useIAEvidence(activityId?)` | `ia_evidence` | Read (filterable) |
| `useIAEvidenceMutations()` | `ia_evidence` | Create, Update, Delete |
| `useIAWorkingPapers(activityId?)` | `ia_working_papers` | Read (filterable) |
| `useIAWorkingPaperMutations()` | `ia_working_papers` | Create, Update, Delete |

### Hook File: `useAuditDataExtended2.ts`

| Hook | Table | Operations |
|------|-------|------------|
| `useIAFindings(activityId?)` | `ia_findings` | Read (filterable) |
| `useIAFindingMutations()` | `ia_findings` | Create, Update, Delete |
| `useIARecommendations(findingId?)` | `ia_recommendations` | Read (filterable) |
| `useIARecommendationMutations()` | `ia_recommendations` | Create, Update |
| `useIAManagementResponses(findingId?)` | `ia_management_responses` | Read (filterable) |
| `useIAManagementResponseMutations()` | `ia_management_responses` | Create, Update |
| `useIAActionTracking()` | `ia_action_tracking` | Read |
| `useIAActionTrackingMutations()` | `ia_action_tracking` | Create, Update |
| `useIAFollowUps()` | `ia_follow_ups` | Read |
| `useIAFollowUpMutations()` | `ia_follow_ups` | Create, Update |
| `useIADocumentTemplates(category?)` | `ia_document_templates` | Read (filterable) |
| `useIADocumentTemplateMutations()` | `ia_document_templates` | Create, Update |
| `useIACommunications()` | `ia_communications` | Read |
| `useIACommunicationMutations()` | `ia_communications` | Create, Update |
| `useIAAuditorWorkload()` | `ia_auditor_workload` | Read-only |

### Hook File: `useAuditConfigData.ts`

| Hook | Table | Operations |
|------|-------|------------|
| `useIAAuditSettings(category?)` | `ia_audit_settings` | Read (active, filterable) |
| `useIAAuditSettingMutations()` | `ia_audit_settings` | Upsert (batch update) |
| `useIARiskCriteria()` | `ia_risk_criteria` | Read |
| `useIARiskCriteriaMutations()` | `ia_risk_criteria` | Create, Update |
| `useIAActivityTypes()` | `ia_activity_types` | Read |
| `useIAActivityTypeMutations()` | `ia_activity_types` | Create, Update |

### Hook File: `useAuditReports.ts`

| Hook | Table | Operations |
|------|-------|------------|
| `useIAAuditReports()` | `ia_audit_reports` | Read |
| `useIAAuditReportMutations()` | `ia_audit_reports` | Create, Update |

### Deletion Pattern

- **Soft Delete** (set `is_active = false`): Departments, Functions, Holidays
- **Hard Delete**: Evidence, Working Papers, Findings

---

## 6. UI Standards

### 6.1 Shared Components

| Component | Purpose |
|-----------|---------|
| `PageShell` | Standard page wrapper with title & breadcrumbs |
| `StandardModal` (EntityModal) | Create/Edit/View dialogs — max 85vh, sticky header/footer, scrollable body |
| `ConfirmDialog` | Destructive action confirmation |
| `StandardSearchFilterBar` | 12-column grid search + filters with responsive layout |
| `DataTable` | Paginated table with 10/20/50 row options |

### 6.2 Modal Sizes

- **General forms:** `max-w-3xl`
- **Data-heavy (Findings, Working Papers):** `max-w-4xl`

### 6.3 Stat Cards

Standardized layout: Icon + left-aligned text with KPI value.

### 6.4 Activity Calendar

Uses `react-big-calendar` with Month/Week/Day/Agenda views. Events color-coded by status. Custom CSS in `audit-calendar.css`.

### 6.5 Search/Filter Bar

Deterministic 12-col grid:
- Desktop: 12-col, Tablet: 2-col, Mobile: 1-col
- Search: 3-4 cols, Filters: 2 cols each, Reset: far right
- `maxFiltersFirstRow` prop for row-split control
- All controls: `h-9` height

---

## 7. Workflow Rules

### 7.1 Annual Plan Status Flow

```
Draft → Submitted → Under Review → Approved → Internally Approved → Active → Completed
```

- **Internally Approved** requires committee meeting minutes upload
- Notifications (Send Notice, Engagement Letter) are **manual**
- Closed plans are **locked from editing**

### 7.2 Finding Status Flow

```
Draft → Under Review → Closed
```

### 7.3 Working Paper Status Flow

```
Draft → Under Review → Reviewed → Closed
```

### 7.4 Leave Request Flow

```
Draft → Submitted → Approved/Rejected
```

### 7.5 Management Response SLA

- Configurable response window: default **14 days** (`managementResponseDays` setting)
- Reminder threshold: **7 days** (`followUpReminderDays` setting)
- Target dates must come from **department responses**, not auditor suggestions

### 7.6 Follow-Up Types

- **Standard** — Regular follow-up
- **SPOT_CHECK** — Allows scheduling follow-up activities

### 7.7 Traceability Chain

All execution entities trace back through:
```
Annual Plan → Department Audit → Activity → {Finding, Evidence, Working Paper}
                                         → Finding → {Recommendation, Management Response}
                                                   → Action Tracking → Follow-Up
```

### 7.8 Safety Rules

- Activity Workbench and Evidence creation require **active plan + department selection**
- Closed plans are **locked** — no further editing

---

## 8. Permission Model

| Permission | Modules |
|------------|---------|
| `configure_audit_system` | Auditor Profiles, System Config, Department Master, Function Master, Templates |
| `assign_auditors` | Workload & Capacity, Leave Management, Holiday Management |
| `create_audit_plans` | Audit Plans, Letter Generation, Communication Center |
| `approve_audit_plans` | Plan Approval |
| `view_audit_assignments` | Activity Calendar, Management Responses |
| `execute_audit_activities` | Activity Workbench |
| `enter_audit_findings` | Evidence Management, Working Papers, Findings, Report Builder |
| `manage_audit_followups` | Action Tracking, Follow-Up Tracker |
| `approve_audit_closeouts` | Plan Closeout |
| `generate_reports` | Audit Reports |

---

## 9. Feature Flags

All 23 flags defined in `AUDIT_FEATURE_FLAGS` (all currently `true`):

```typescript
FEATURE_AUDIT_AUDITOR_PROFILES
FEATURE_AUDIT_WORKLOAD_CAPACITY
FEATURE_AUDIT_LEAVE_MANAGEMENT
FEATURE_AUDIT_HOLIDAY_MANAGEMENT
FEATURE_AUDIT_PLANS
FEATURE_AUDIT_PLAN_APPROVAL
FEATURE_AUDIT_ACTIVITY_CALENDAR
FEATURE_AUDIT_ACTIVITY_WORKBENCH
FEATURE_AUDIT_EVIDENCE_MANAGEMENT
FEATURE_AUDIT_WORKING_PAPERS
FEATURE_AUDIT_FINDINGS
FEATURE_AUDIT_MANAGEMENT_RESPONSES
FEATURE_AUDIT_ACTION_TRACKING
FEATURE_AUDIT_FOLLOWUP_TRACKER
FEATURE_AUDIT_PLAN_CLOSEOUT
FEATURE_AUDIT_REPORTS
FEATURE_AUDIT_LETTER_GENERATION
FEATURE_AUDIT_REPORT_BUILDER
FEATURE_AUDIT_COMMUNICATION_CENTER
FEATURE_AUDIT_SYSTEM_CONFIG
FEATURE_AUDIT_DEPARTMENT_MASTER
FEATURE_AUDIT_FUNCTION_MASTER
FEATURE_AUDIT_TEMPLATES
```

To disable a module, set its flag to `false` in `auditRouteConfig.ts`. The `AuditFeatureGate` wrapper automatically shows the "Under Activation" placeholder.

---

## 10. File Structure

```
src/
├── config/
│   └── auditRouteConfig.ts              # Route config, feature flags (SSOT)
├── components/
│   └── audit/
│       ├── AuditFeatureGate.tsx          # Feature flag wrapper
│       ├── ActivityRescheduleDialog.tsx   # Reschedule activity modal
│       ├── ActivityScheduleForm.tsx       # Schedule new activity form
│       ├── AnnualPlanForm.tsx            # Annual plan create/edit
│       ├── AuditPlanForm.tsx             # Plan form component
│       ├── DepartmentAuditForm.tsx       # Department audit form
│       ├── ReportPreviewDialog.tsx       # Report preview modal
│       └── TemplateCommunicationDialog.tsx# Template send dialog
├── hooks/
│   ├── useAuditData.ts                  # Core CRUD hooks (depts, auditors, plans, etc.)
│   ├── useAuditDataExtended.ts          # Dept audits, activities, evidence, working papers
│   ├── useAuditDataExtended2.ts         # Findings, responses, actions, follow-ups, comms
│   ├── useAuditConfigData.ts            # Settings, risk criteria, activity types
│   ├── useAuditReports.ts              # Report builder persistence
│   └── useAuditTrail.ts                # Audit trail fields (created_by/updated_by)
├── pages/
│   └── audit/
│       ├── AuditDashboard.tsx           # Dashboard with KPIs
│       ├── AuditorProfiles.tsx          # Auditor CRUD
│       ├── WorkloadCapacity.tsx         # Workload view
│       ├── LeaveManagement.tsx          # Leave requests
│       ├── HolidayManagement.tsx        # Holiday calendar
│       ├── AuditPlansNew.tsx            # Annual plans
│       ├── PlanApproval.tsx             # Plan approval workflow
│       ├── ActivityCalendar.tsx         # react-big-calendar view
│       ├── ActivityWorkbench.tsx        # Activity execution
│       ├── EvidenceManagement.tsx       # Evidence CRUD + file upload
│       ├── WorkingPapers.tsx            # Working papers CRUD
│       ├── FindingsManagement.tsx       # Findings & recommendations
│       ├── ManagementResponses.tsx      # Response tracking
│       ├── ActionTracking.tsx           # Corrective actions
│       ├── FollowUpTracker.tsx          # Follow-up verification
│       ├── PlanCloseout.tsx             # Plan closure
│       ├── AuditReports.tsx             # Report analytics
│       ├── LetterGeneration.tsx         # Letter templates
│       ├── ReportBuilder.tsx            # Report composition
│       ├── CommunicationCenter.tsx      # Official communications
│       ├── AuditConfig.tsx              # System settings
│       ├── DepartmentMaster.tsx         # Department CRUD
│       ├── DepartmentView.tsx           # Department detail view
│       ├── FunctionMaster.tsx           # Function CRUD
│       ├── TemplatesManagement.tsx      # Template management
│       └── AuditModuleUnderActivation.tsx # Placeholder for disabled modules
└── sidebar/
    └── menuItems/
        └── auditMenuItems.ts            # Sidebar navigation config
```

### Database Migrations

| Migration | Content |
|-----------|---------|
| `20260227061914` | Core tables: departments, functions, auditors, holidays, leave requests, annual plans, department audits, activities, evidence, working papers, findings, recommendations, management responses, action tracking, follow-ups, document templates, communications, auditor workload |
| `20260227064212` | Configuration tables: audit settings, risk criteria, activity types + seed data |
| `20260305094241` | Audit reports table + action tracking column enhancements |

### Storage

- **`ia-evidence`** Supabase storage bucket for file uploads in Evidence Management

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Modules | 23 |
| Functional Modules | 23 |
| Database Tables | ~20 |
| React Hooks | 34 (query + mutation hooks) |
| Page Components | 27 |
| Form Components | 8 |
| Permissions | 10 unique |
| Feature Flags | 23 |
