

# Link Engagement Detail to Audit Execution, Issues Management & Audit Closure

## Problem
The Engagement Detail page shows Activities, Findings, Control Tests, Time Logs, and Quality Reviews in read-only tables, but:
1. **No `engagement_id` on key tables**: `ia_findings`, `ia_management_responses`, `ia_action_tracking`, `ia_follow_ups` lack direct `engagement_id` linkage — findings are only linked via `activity_id`
2. **No navigation to related modules**: Users can't jump from the Engagement Detail to the Activity Workbench, Evidence, Working Papers, Findings, Management Responses, Action Tracking, Follow-Up Tracker, Quality Review, or Plan Closeout filtered by this engagement
3. **No way to create execution records from the detail page**: Users must manually go to each module and select the engagement

## Changes

### 1. Database Migration — Add `engagement_id` to Issue Management tables
Add `engagement_id` foreign key columns to enable direct querying:
- `ia_findings` — ADD `engagement_id UUID REFERENCES ia_audit_engagements(id)`
- `ia_management_responses` — already linked via `finding_id`, no change needed
- `ia_follow_ups` — ADD `engagement_id UUID REFERENCES ia_audit_engagements(id)`

Backfill existing data by joining through `ia_activities.engagement_id`.

### 2. Update `EngagementDetail.tsx` — Add Quick Navigation & Richer Tabs

**Add Quick Action Links section** below summary cards:
- Buttons linking to each related module with `?engagement_id=<id>` query param:
  - **Execution**: Activity Workbench, Evidence, Working Papers, Control Testing
  - **Issues**: Findings, Management Responses, Action Tracking, Follow-Up Tracker  
  - **Closure**: Quality Review, Plan Closeout

**Update Findings tab** to query `ia_findings` directly by `engagement_id` (instead of indirectly via activity IDs).

**Add new tabs**:
- **Management Responses** — show responses for findings in this engagement
- **Follow-Ups** — show follow-ups linked to this engagement

**Add "Create" buttons** within each tab to navigate to the respective module with pre-filled engagement context.

### 3. Update Execution & Issue Module pages to accept `engagement_id` filter

Update the following pages to read `engagement_id` from URL query params and pre-filter:
- `ActivityWorkbench.tsx` — filter activities by engagement
- `EvidenceManagement.tsx` — filter evidence by engagement's activities
- `WorkingPapers.tsx` — filter by engagement's activities
- `FindingsManagement.tsx` — filter findings by engagement_id
- `ManagementResponses.tsx` — filter by engagement's findings
- `FollowUpTracker.tsx` — filter by engagement_id
- `ControlTesting.tsx` — filter by engagement_id
- `QualityReview.tsx` — filter by engagement_id

Each page will show a banner indicating the engagement filter is active, with a link back to the Engagement Detail page.

### 4. Files to modify
- **New migration**: Add `engagement_id` to `ia_findings` and `ia_follow_ups`, backfill from activities
- **`EngagementDetail.tsx`**: Add quick-nav links, Management Responses tab, Follow-Ups tab, create buttons
- **`ActivityWorkbench.tsx`**: Read `engagement_id` query param, apply filter
- **`FindingsManagement.tsx`**: Read `engagement_id` query param, apply filter
- **`EvidenceManagement.tsx`**: Read `engagement_id` query param, apply filter
- **`WorkingPapers.tsx`**: Read `engagement_id` query param, apply filter
- **`ControlTesting.tsx`**: Read `engagement_id` query param, apply filter
- **`ManagementResponses.tsx`**: Read `engagement_id` query param, apply filter
- **`FollowUpTracker.tsx`**: Read `engagement_id` query param, apply filter
- **`QualityReview.tsx`**: Read `engagement_id` query param, apply filter
- **`PlanCloseout.tsx`**: Read `engagement_id` query param, apply filter

