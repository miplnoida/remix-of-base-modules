

# Audit Plan Closure Workflow — Implementation Plan

## Current State

- `ia_annual_plans` has `status` but NO `closed_by`, `closed_date`, or engagement count columns
- `ia_audit_engagements` already has `closed_by`, `closure_date`, `closure_notes` columns
- `PlanCloseout.tsx` exists but uses activity-based progress (not engagement-based) and doesn't enforce "all engagements closed" rule
- `AuditPlanDetail.tsx` shows engagement stats but has no "Close Plan" button
- `AuditDashboard.tsx` shows audits but not plan-level closure metrics

## What Will Be Done

### 1. Database Migration

Add closure columns to `ia_annual_plans`:
```sql
ALTER TABLE ia_annual_plans 
  ADD COLUMN IF NOT EXISTS closed_by TEXT,
  ADD COLUMN IF NOT EXISTS closed_date DATE;
```

No new tables needed — `ia_audit_closure` and engagement closure already exist.

### 2. Rebuild AuditPlanDetail.tsx — Add Plan Closure

Add a **"Closure" tab** (5th tab) to the existing 4-tab layout:

- **Progress Summary**: Total / Closed / In Progress / Pending engagements (computed from `useIAPlanEngagements`)
- **Progress Bar**: `closedCount / totalCount` visual indicator
- **Validation Checklist**: All engagements must have status "Closed" or "Completed"
- **"Close Audit Plan" Button**: Enabled only when `closedCount === totalCount && totalCount > 0`. Updates `ia_annual_plans.status = 'Closed'`, `closed_by`, `closed_date`. Triggers `notifyPlanClosed()` email.
- **Disabled state message**: "Complete all audits before closing the plan."
- **Read-only lock**: If plan already Closed, show lock icon and disable all actions.

### 3. Update AuditDashboard.tsx — Plan Closure Metrics

Replace the existing KPI row with plan-aware metrics:
- Add: **Total Plans**, **Active Plans**, **Completed Plans**, **Closed Plans**
- Add a **Plan Progress** section showing each active plan with a progress bar (`closed engagements / total engagements`)

### 4. Update PlanCloseout.tsx — Engagement-Based Validation

Replace the activity-based progress calculation with engagement-based logic:
- Fetch engagements per plan using `ia_audit_engagements.annual_plan_id`
- `getProgress()` = `closedEngagements / totalEngagements * 100`
- Block closure if any engagement is not Closed
- Show clear error: "Audit Plan cannot be closed because some audits are still in progress."

### 5. Add Email Notification

Add `notifyPlanClosed()` to `auditNotificationService.ts`:
- Triggered when plan status changes to "Closed"
- Notifies Department Head and Audit Committee

---

## Files to Modify

| File | Change |
|------|--------|
| **Migration** (1 new) | Add `closed_by`, `closed_date` to `ia_annual_plans` |
| `src/pages/audit/AuditPlanDetail.tsx` | Add Closure tab with validation + close button |
| `src/pages/audit/AuditDashboard.tsx` | Add plan closure metrics + progress bars |
| `src/pages/audit/PlanCloseout.tsx` | Switch to engagement-based progress + block logic |
| `src/services/auditNotificationService.ts` | Add `notifyPlanClosed()` |

