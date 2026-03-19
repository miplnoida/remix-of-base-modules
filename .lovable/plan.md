

# Fix Audit Linking Layer & Rebuild Audit View

## Problem Summary
1. **Audits page (`AuditEngagements.tsx`)** works but uses the old enterprise model — displays "engagements" with no function name resolution in the table
2. **Audit Detail page (`EngagementDetail.tsx`)** loads 14+ enterprise sub-modules (activities, control tests, working papers, evidence, etc.) causing broken imports and empty data
3. **Findings page** requires an "Activity" to create a finding — but Activities have been removed from the simplified model
4. **Dashboard** queries work but don't show function/department names in audit lists
5. **No checklist hook** exists for `ia_audit_checklists` table (table exists in DB)

## Database State (Confirmed)
- `ia_audit_engagements` has `department_id`, `function_id`, `closure_date/closed_by/closure_notes` columns — all present
- `ia_audit_checklists` table exists with correct schema
- `ia_findings` has `checklist_id`, `recommendation`, and `engagement_id` columns
- RLS is disabled on all audit tables — no access issues
- No data exists yet (tables were purged for production)

## Changes Required

### 1. Create `useAuditChecklists` hook
New file `src/hooks/useAuditChecklists.ts` — CRUD for `ia_audit_checklists` table, filtered by `audit_id`.

### 2. Rebuild Audit Detail page (`EngagementDetail.tsx`)
Replace the 500-line enterprise page with a simplified 4-tab Audit Detail:
- **Overview tab**: Audit info (department name, function name, auditor, dates, status, scope, objectives)
- **Checklist tab**: Add/edit checklist questions, mark Compliant/Non-Compliant/Not Applicable, link to evidence
- **Findings tab**: List findings for this audit, create new finding directly (linked to audit + optional checklist item)
- **Closure tab**: Closure validation (all findings reviewed, responses submitted, actions assigned), close audit

Remove all imports of enterprise hooks (useEngagementActivities, useWorkPrograms, usePreparationChecklists, useEngagementClosure, LifecycleStepper, WorkProgramPanel, EngagementClosurePanel, etc.)

### 3. Simplify Audits list page (`AuditEngagements.tsx`)
- Add Function Name column to the table (resolve from `ia_department_functions`)
- Simplify statuses to: `Planned, In Progress, Findings Raised, Management Response, Closed`
- Remove enterprise fields from the create/edit form (estimated_budget, budgeted_hours, engagement_type dropdown with 5 complex types)
- Simplify the form: Title, Department (cascading) → Function, Lead Auditor, Risk Rating, Dates, Status
- Navigate to `/audit/audits/:id` on View click (already works)

### 4. Rebuild Findings page (`FindingsManagement.tsx`)
- Remove dependency on `activity_id` (Activities module was removed)
- Link findings to `engagement_id` (audit) instead — make audit selection required
- Add optional `checklist_id` link
- Remove `DiscussionThread` and `EngagementFilterBanner` imports
- Show Audit Title and Function Name in the findings table
- Simplify the create form: select Audit → auto-fill department, then enter finding details (condition, criteria, cause, effect, risk, recommendation)

### 5. Update Dashboard audit list
- Add Function Name column to any audit tables on the dashboard
- Ensure audit count queries use `ia_audit_engagements` correctly

### 6. Route cleanup
- Ensure `/audit/audits/:id` renders the new simplified Audit Detail (already routed)
- No new routes needed

## Technical Notes
- The `ia_audit_engagements` table IS the "Audits" table — no schema changes needed
- Function names resolved via `useIADepartmentFunctions` hook (already exists)
- Auditor names resolved via `useIAAuditors` hook (already exists)
- All data mutations use existing Supabase client patterns

## Implementation Order
1. Create checklist hook
2. Rebuild Audit Detail page (biggest change)
3. Simplify Audits list page
4. Rebuild Findings page
5. Dashboard tweaks

