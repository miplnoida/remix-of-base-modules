

# Refactor Audit Planning & Engagement Workflow

## Current State Summary

The system has three separate concepts that create confusion:
1. **`ia_annual_plans`** — Annual plans with restrictive status locking (Draft-only editing)
2. **`ia_department_audits`** — Department-level audit plans linked to annual plans
3. **`ia_audit_engagements`** — Formal engagements (separate module, loosely linked)

The current flow forces users through: Annual Plan → Department Audit → Engagement, with plan locking preventing additions after approval. The engagement table already has `annual_plan_id` but the UI doesn't enforce a clear Plan → Engagement hierarchy.

## What Changes

### Database Changes

1. **Add `engagement_type` column to `ia_audit_engagements`**
   - Values: `Planned Audit`, `Ad-hoc Audit`, `Management Requested Audit`, `Special Investigation`, `Follow-up Audit`
   - Default: `Planned Audit`

2. **Create `ia_plan_change_log` table**
   - `id`, `plan_id` (FK to ia_annual_plans), `change_type`, `description`, `changed_by`, `change_date`
   - Tracks engagement additions/removals/modifications on active plans

3. **Add `plan_status` column to `ia_annual_plans`** (if not covered by existing `status`)
   - Ensure statuses include: `Draft`, `Submitted`, `Approved`, `Active`, `Closed`
   - After approval, status transitions to `Active` (not locked)

### Frontend Changes

#### 1. Remove Plan Locking Logic
- **`AuditPlansNew.tsx`**: Remove the `row.status === 'Draft'` guard on Edit/Submit buttons for engagement-related actions. Plans in `Active` or `Approved` status should still allow adding engagements.
- **`AnnualPlanForm.tsx`**: Keep plan metadata editing restricted to Draft, but engagement addition is always allowed.
- **`PlanApproval.tsx`**: After approval, set status to `Active` instead of just `Approved`.

#### 2. Redesign Annual Plan Detail View
Replace the current simple view modal with a full **Plan Detail Page** (`/audit/audit-plans/:id`) containing:
- **Plan Summary Card**: Title, fiscal year, status, approval info
- **Stats Row**: Total engagements, completed, ongoing, pending counts
- **Engagements Table**: All engagements linked to this plan with status badges
- **"+ Add Engagement" button** — visible for Active/Approved/Draft plans (permission-gated to CAE/Manager/Admin)
- **Change Log Tab**: Shows `ia_plan_change_log` entries

#### 3. Add Engagement Form (within Plan context)
A modal/dialog to create an engagement directly from the plan detail page:
- Fields: Engagement Title, Department (cascading), Function, Entity, Engagement Type (dropdown with 5 types), Risk Rating, Planned Start/End, Audit Lead, Team Members, Description
- On save: Creates engagement record with `annual_plan_id` set + inserts a `ia_plan_change_log` entry

#### 4. Update Engagement Lifecycle Statuses
Ensure engagement status options include: `Planned`, `Fieldwork`, `Observation`, `Reporting`, `Closure` (aligning with the requested lifecycle)

#### 5. Update Sidebar/Routing
- Add route `/audit/audit-plans/:id` for the new Plan Detail page
- Keep existing `/audit/engagements` and `/audit/engagements/:id` routes intact

### Hook Changes

- **New `useIAPlanChangeLog(planId)`** hook to fetch change log entries
- **Update `useIAEngagements`** to support filtering by `annual_plan_id`
- **Add mutation in engagement create** to also insert a change log entry

### What Stays the Same
- All existing engagement detail/execution/findings/closure workflows remain untouched
- `engagement_id` remains the primary FK across all modules
- Departments, Functions, Entities, Staff, Roles tables are not modified
- Existing data in `ia_department_audits` is preserved (legacy, not deleted)

### Permissions
- Add Engagement to Active plan: `create_audit_plans` or `edit_audit_plans` (CAE, Manager, Admin roles already have these)
- Auditors: view-only on plans

## Technical Details

```text
Plan Lifecycle:
  Draft → Submitted → Approved/Active → Closed
                                ↑
                    Engagements can be added here

Engagement Lifecycle:
  Planned → Fieldwork → Observation → Reporting → Closure
```

### Migration SQL (2 migrations):

**Migration 1**: Add engagement_type + plan_change_log
```sql
ALTER TABLE ia_audit_engagements 
ADD COLUMN IF NOT EXISTS engagement_type TEXT DEFAULT 'Planned Audit';

CREATE TABLE IF NOT EXISTS ia_plan_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES ia_annual_plans(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  description TEXT,
  changed_by TEXT,
  change_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ia_plan_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view change log" ON ia_plan_change_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert change log" ON ia_plan_change_log
  FOR INSERT TO authenticated WITH CHECK (true);
```

### Files to Create/Modify
- `src/pages/audit/AuditPlanDetail.tsx` (new — plan detail page with engagements + change log)
- `src/pages/audit/AuditPlansNew.tsx` (modify — link rows to detail page, remove Draft-only restrictions)
- `src/pages/audit/AuditEngagements.tsx` (modify — add engagement_type field to form)
- `src/pages/audit/PlanApproval.tsx` (modify — set status to Active after approval)
- `src/hooks/useAuditDataPhase2.ts` (modify — add plan change log hook, engagement type support)
- `src/components/routing/AppRoutes.tsx` (modify — add plan detail route)
- `src/components/audit/AddEngagementToPlanForm.tsx` (new — engagement creation within plan context)

