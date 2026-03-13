
# Internal Audit Lifecycle Enhancement Plan

## Implementation Status

### Phase 1: Ad-hoc Audits + Plan Amendments ✅
- Added `audit_type` column to `ia_department_audits` (planned/ad_hoc)
- Made `annual_plan_id` nullable for ad-hoc audits
- Created `ia_plan_amendments` table for amendment history
- Updated `AuditPlansNew.tsx` with ad-hoc audit creation + type filter
- Updated `DepartmentAuditForm.tsx` to support ad-hoc mode
- Created `PlanAmendmentHistory.tsx` component

### Phase 2: Enhanced Approval Workflow + Email Notifications ✅
- Created `ia_approval_actions` table for approval audit trail
- Enhanced `PlanApproval.tsx` with:
  - Tabbed view: Pending Review, Dept Acceptance, Decided, History
  - Department Head acceptance step
  - Approval comments on all decisions
  - Full approval action logging
- Enhanced `send-notification` edge function with Resend integration
- Created `auditNotificationService.ts` with trigger functions for all lifecycle events

### Phase 3: Auto Corrective Actions + Reminders ✅
- Enhanced `useIAFindingMutations` to auto-generate corrective actions on finding creation
- Auto-generates `ia_action_tracking` record with 30-day due date
- Sends notification to department head on finding creation
- Created `audit-due-date-reminders` edge function for scheduled reminders (7/3/1 day + overdue)

### Phase 4: Audit Preparation Screen ✅
- Created `ia_preparation_checklists` and `ia_preparation_documents` tables
- Created `AuditPreparation.tsx` page with:
  - Audit selection panel (Accepted/Approved/In Preparation)
  - Checklist tab with categories (General/Procedure/Objective/Risk)
  - Documents tab for preliminary uploads
  - Team tab showing assigned auditors
  - Status transitions: Accepted → In Preparation → Ready for Execution
- Created `useAuditPreparation.ts` hooks
- Added route, sidebar entry, and feature flag

### Phase 5: Discussion Threads ✅
- Created `ia_discussion_threads` and `ia_discussion_comments` tables
- Enabled Supabase Realtime on `ia_discussion_comments`
- Created `DiscussionThread.tsx` reusable component with live updates
- Created `useAuditDiscussions.ts` hook with realtime subscription

### Phase 6: Risk-History Integration + Reporting ✅ (Partial)
- Added `historical_risk_adjustment` column to `ia_department_functions`
- Created `RiskHeatMap.tsx` component (Recharts scatter plot)
- Created `AuditHistoryTimeline.tsx` component
- DB function for risk adjustment and dashboard integration pending next iteration

## Remaining (Next Iteration)
- Wire `DiscussionThread` into finding/activity/plan modals
- Create `calculate_historical_risk_adjustment` DB function
- Integrate RiskHeatMap into AuditDashboard
- Create AuditHistory page/tab
- Set up cron job for `audit-due-date-reminders`
