

# Internal Audit Lifecycle Enhancement Plan

## Current State Assessment

The module already has **38 screens** and **20+ database tables** covering most of the requested lifecycle. The following areas need enhancement or new implementation.

## What Already Exists (No Changes Needed)
- Risk Assessment with weighted scoring + configurable thresholds
- Risk Control Matrix (RCM) with likelihood/impact/control effectiveness
- Annual Plans + Department Audits with CRUD
- Plan Approval screen (basic)
- Activity Workbench, Evidence Management, Working Papers
- Findings Management with status workflow (Draft → Under Review → For Mgmt Response → Closed)
- Action Tracking, Follow-Up Tracker, Management Responses
- Quality Review, Plan Closeout
- Communication Center (template-based email composition)
- Dashboard with KPIs, Reports, Auditor Profiles linked to `profiles`
- Departments linked to `tb_office`

## What Needs to Be Built/Enhanced

### Phase 1: Ad-hoc Audits + Plan Amendments

**1A. Ad-hoc Audit Support**
- Add `audit_type` column to `ia_department_audits` (values: `planned`, `ad_hoc`)
- Modify `AuditPlansNew.tsx` to allow creating ad-hoc audits without selecting an annual plan (`annual_plan_id` becomes nullable — it already is)
- Ad-hoc audits directly define department, function, scope, team, timeline
- Add filter for "Ad-hoc" vs "Planned" in the listing

**1B. Plan Amendment History**
- New table: `ia_plan_amendments` (id, plan_id, amendment_type, field_changed, old_value, new_value, reason, requested_by, approved_by, status, created_at)
- When an approved plan is edited, system captures before/after snapshot, resets plan status to "Amendment Pending", triggers re-approval workflow
- Amendment history viewable inside plan detail modal

### Phase 2: Approval Workflow with Email Notifications

**2A. Plan Approval Workflow Enhancement**
- Enhance `PlanApproval.tsx` to include:
  - Lead Auditor review + approve/reject with comments
  - Department Head acceptance step (new status: "Awaiting Dept Acceptance")
  - Status flow: Draft → Submitted → Under Review → Approved → Awaiting Dept Acceptance → Accepted / Rejected
- New table: `ia_approval_actions` (id, entity_type, entity_id, action, performed_by, comments, created_at) for full approval audit trail

**2B. Email Notification Edge Function Enhancement**
- Enhance existing `send-notification` edge function to actually send via Resend (the `send-email-campaign` function already has Resend integration — reuse that pattern)
- New service: `src/services/auditNotificationService.ts` with trigger functions for:
  - `notifyPlanSubmitted(planId)` → email to Lead Auditor
  - `notifyPlanApproved(planId)` → email to assigned auditors + department head
  - `notifyFindingCreated(findingId)` → email to department head
  - `notifyActionAssigned(actionId)` → email to responsible person
  - `notifyActionOverdue(actionId)` → email to responsible person + auditor
  - `notifyDeptAcceptanceRequired(planId)` → email to department head
- Each function calls the `send-notification` edge function with structured subject/body
- Wire these triggers into existing mutation hooks (`onSuccess` callbacks)

### Phase 3: Auto Corrective Actions + Reminders

**3A. Auto-generate Corrective Actions from Findings**
- When a finding is created, automatically insert a corresponding `ia_action_tracking` record with:
  - `finding_id` linked
  - Status: "Not Started"
  - `action_description`: "Address finding: [title]"
  - `responsible_person`: department head from linked department
  - `target_date`: finding creation + 30 days (configurable)
- Add toggle in Audit Config for "Auto-generate corrective actions" (default: on)

**3B. Due Date Reminders**
- New edge function: `audit-due-date-reminders` (invoked via scheduled cron or manual trigger)
- Queries `ia_action_tracking` and `ia_follow_ups` for items due within 7 days / 3 days / overdue
- Sends reminder emails via `send-notification`
- Add reminder configuration to Audit Config (reminder days: 7, 3, 1)

### Phase 4: Audit Preparation Screen

**4A. New Audit Preparation Page**
- New page: `src/pages/audit/AuditPreparation.tsx`
- Shows all audits in "Accepted" status ready for preparation
- For each audit, provides:
  - **Checklist tab**: Define audit procedures, objectives, key risks (stored in `ia_audit_programs` / `ia_audit_procedures`)
  - **Documents tab**: Upload preliminary documents, audit program, planning notes (uses existing `ia-evidence` storage bucket)
  - **Team Assignment tab**: Assign specific tasks/areas to auditors on the team
- New table: `ia_preparation_checklists` (id, department_audit_id, item_text, is_completed, assigned_to, category, sort_order, created_by, created_at)
- New table: `ia_preparation_documents` (id, department_audit_id, document_type, file_url, file_name, uploaded_by, created_at)
- Status changes audit from "Accepted" → "In Preparation" → "Ready for Execution"

### Phase 5: Discussion Threads

**5A. In-Record Discussion Threads**
- New table: `ia_discussion_threads` (id, entity_type, entity_id, created_by, created_at)
- New table: `ia_discussion_comments` (id, thread_id, author_id, author_name, content, mentioned_users UUID[], created_at)
- Reusable component: `src/components/audit/DiscussionThread.tsx`
  - Embeddable in any audit record modal (findings, activities, plans, etc.)
  - Shows threaded comments with user avatars
  - @mention support via auditor/profile dropdown
  - Mentioned users receive email notification
- Enable realtime on `ia_discussion_comments` for live updates

### Phase 6: Risk-History Integration + Reporting

**6A. Past Findings Influence Risk Scores**
- Add `historical_risk_adjustment` numeric column to `ia_department_functions`
- Create DB function `calculate_historical_risk_adjustment(function_id)` that counts past findings by severity (High = +5, Medium = +3, Low = +1) from closed audits
- Risk Assessment screen automatically adds this adjustment to the weighted score
- Recalculation triggered when findings are closed

**6B. Risk Heat Map + Audit History**
- Add Risk Heat Map component to `AuditDashboard.tsx` using Recharts scatter plot (X = likelihood, Y = impact, color = risk level)
- New page or tab: `AuditHistory.tsx` showing per-department:
  - Timeline of past audits
  - Findings count and trend
  - Risk level evolution over time
  - Corrective action completion rates

### Database Migration Summary

```sql
-- Phase 1
ALTER TABLE ia_department_audits ADD COLUMN audit_type TEXT DEFAULT 'planned';
CREATE TABLE ia_plan_amendments (...);

-- Phase 2
CREATE TABLE ia_approval_actions (...);

-- Phase 4
CREATE TABLE ia_preparation_checklists (...);
CREATE TABLE ia_preparation_documents (...);

-- Phase 5
CREATE TABLE ia_discussion_threads (...);
CREATE TABLE ia_discussion_comments (...);
ALTER PUBLICATION supabase_realtime ADD TABLE ia_discussion_comments;

-- Phase 6
ALTER TABLE ia_department_functions ADD COLUMN historical_risk_adjustment NUMERIC DEFAULT 0;
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/audit/AuditPreparation.tsx` | New |
| `src/components/audit/DiscussionThread.tsx` | New |
| `src/services/auditNotificationService.ts` | New |
| `src/components/audit/RiskHeatMap.tsx` | New |
| `src/components/audit/AuditHistoryTimeline.tsx` | New |
| `src/hooks/useAuditDiscussions.ts` | New |
| `supabase/functions/audit-due-date-reminders/index.ts` | New |
| `src/pages/audit/AuditPlansNew.tsx` | Modify (ad-hoc support) |
| `src/pages/audit/PlanApproval.tsx` | Modify (enhanced workflow) |
| `src/pages/audit/FindingsManagement.tsx` | Modify (auto-action generation) |
| `src/pages/audit/AuditDashboard.tsx` | Modify (heat map + history) |
| `src/pages/audit/RiskAssessment.tsx` | Modify (historical adjustment) |
| `src/hooks/useAuditData.ts` | Modify (notification triggers) |
| `supabase/functions/send-notification/index.ts` | Modify (actual Resend sending) |

### Implementation Order

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Each phase is independently deployable. Due to the scale, implementation will proceed one phase at a time with verification between phases.

