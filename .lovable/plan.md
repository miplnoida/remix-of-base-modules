

# Internal Audit Architecture Correction Plan

## Problems Identified

### 1. Hardcoded Data File (`src/data/auditData.ts`)
A **1,251-line file** of static/mock data containing departments, auditors, audit plans, zones, employers, and functions. This is imported by **5 components**:
- `DepartmentAuditForm.tsx` — uses hardcoded `departments` and `auditors` arrays
- `AuditPlanForm.tsx` — uses hardcoded `departments` and `auditors` arrays  
- `ActivityScheduleForm.tsx` — uses hardcoded `departments` and `departmentAuditPlans`
- `ActivityRescheduleDialog.tsx` — uses hardcoded `departments`
- `TemplateCommunicationDialog.tsx` — uses hardcoded `auditPlans`

**These components ignore the database entirely** and show stale, incorrect department/auditor names.

### 2. Audit Universe "Entity" Confusion
`ia_audit_universe` uses `entity_name`/`entity_type` with types including "Department" — creating a **parallel department list** alongside `ia_departments`. The Audit Universe should represent **auditable processes/functions** linked TO departments, not duplicate them.

### 3. Employer Audit Artifacts
`AuditConfig.tsx` contains an "Enable Employer Audit" feature flag toggle. This does not belong in the Internal Audit module.

### 4. `DepartmentAuditForm.tsx` — Hardcoded Functions
Contains a `DEPARTMENT_FUNCTIONS` constant with hardcoded function lists per department name, ignoring the `ia_department_functions` database table entirely.

### 5. Free-Floating Data
- **Findings**: Can be created without linking to an Activity or Audit Plan (all FK fields are optional in the form)
- **Follow-Ups**: `responsible_party` is a free-text field, not linked to Auditor Profiles
- **Action Tracking**: `responsible_person` is a free-text field

---

## Implementation Plan

### Phase 1: Replace Hardcoded Data Sources (5 files)

**Task 1.1 — `DepartmentAuditForm.tsx`**
- Remove `import { departments, auditors } from '@/data/auditData'`
- Remove hardcoded `DEPARTMENT_FUNCTIONS` constant
- Add hooks: `useIADepartments()`, `useIAAuditors()`, `useIADepartmentFunctions(departmentId)`
- Department dropdown: populate from `ia_departments`
- Lead Auditor dropdown: populate from `ia_auditors`
- Team Members checkboxes: populate from `ia_auditors`
- Functions checkboxes: populate from `ia_department_functions` filtered by selected `department_id`

**Task 1.2 — `AuditPlanForm.tsx`**
- Remove hardcoded imports
- Add `useIADepartments()` and `useIAAuditors()` hooks
- Wire dropdowns to database

**Task 1.3 — `ActivityScheduleForm.tsx`**
- Remove hardcoded `departments` and `departmentAuditPlans` imports
- Use `useIADepartments()` and `useIADepartmentAudits()`

**Task 1.4 — `ActivityRescheduleDialog.tsx`**
- Remove hardcoded `departments` import
- Use `useIADepartments()`

**Task 1.5 — `TemplateCommunicationDialog.tsx`**
- Remove hardcoded `auditPlans` import
- Use `useIAAnnualPlans()`

### Phase 2: Fix Audit Universe Semantics

**Task 2.1 — `AuditUniverse.tsx`**
- The Audit Universe already has a `department_id` FK to `ia_departments`. This is correct.
- Change the entity type dropdown to remove "Department" as a standalone type (departments already exist in Department Master)
- Rename entity types to: `Function`, `Process`, `System`, `Location`, `Project`
- Add a **Department** dropdown (populated from `ia_departments`) so each auditable entity is linked to a department
- Add a **Process Owner** dropdown populated from `ia_auditors` instead of free text

### Phase 3: Remove Employer Audit Artifacts

**Task 3.1 — `AuditConfig.tsx`**
- Remove the "Enable Employer Audit" feature flag toggle and its state

### Phase 4: Enforce Data Relationships in Forms

**Task 4.1 — `FindingsManagement.tsx`**
- Make `activity_id` required (cannot create finding without an activity)
- Cascade: selecting an activity auto-fills `department_audit_id` and `annual_plan_id`
- Add filter-by-plan and filter-by-department-audit before selecting activity

**Task 4.2 — `ActionTracking.tsx`**
- `finding_id` is already required — confirmed correct
- Replace free-text `responsible_person` with an auditor dropdown from `useIAAuditors()`

**Task 4.3 — `FollowUpTracker.tsx`**
- Replace free-text `responsible_party` with an auditor dropdown from `useIAAuditors()`
- Make `finding_id` required (link to finding, which links to activity, which links to plan)

### Phase 5: Clean Up

**Task 5.1** — Delete or deprecate `src/data/auditData.ts` after all imports are removed. If other non-audit modules use it, keep only those exports.

**Task 5.2** — Verify `department_name` column on `ia_department_audits` is populated from the `ia_departments` join (or resolve it at display time using `department_id` FK).

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `src/components/audit/DepartmentAuditForm.tsx` | Replace hardcoded data with DB hooks |
| `src/components/audit/AuditPlanForm.tsx` | Replace hardcoded data with DB hooks |
| `src/components/audit/ActivityScheduleForm.tsx` | Replace hardcoded data with DB hooks |
| `src/components/audit/ActivityRescheduleDialog.tsx` | Replace hardcoded data with DB hooks |
| `src/components/audit/TemplateCommunicationDialog.tsx` | Replace hardcoded data with DB hooks |
| `src/pages/audit/AuditUniverse.tsx` | Fix entity types, add department/auditor dropdowns |
| `src/pages/audit/AuditConfig.tsx` | Remove employer audit toggle |
| `src/pages/audit/FindingsManagement.tsx` | Make activity_id required, add cascading selectors |
| `src/pages/audit/ActionTracking.tsx` | Replace free-text responsible_person with auditor dropdown |
| `src/pages/audit/FollowUpTracker.tsx` | Replace free-text responsible_party with auditor dropdown |
| `src/data/auditData.ts` | Remove/deprecate after cleanup |

No database schema changes are needed — the FK relationships (`department_id`, `lead_auditor_id`, `activity_id`, `finding_id`) already exist in the tables. The problem is purely that the **UI ignores them** and uses hardcoded or free-text values instead.

