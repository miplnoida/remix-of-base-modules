

# Fix Engagement Linkage Across Execution Flow

## Problem Analysis

After creating an engagement, the execution flow modules do NOT pass the `engagement_id` when creating new records. The issues are:

1. **Missing `engagement_id` on create**: When navigating from Engagement Detail → module (e.g., Findings, Control Tests), the `engagement_id` is in the URL but is **never included** in the create payload.
2. **Evidence & Working Papers lack `engagement_id` column**: These tables don't have an `engagement_id` column at all — they only filter indirectly via `activity_id`.
3. **Findings create** doesn't pass `engagement_id` (line 102-110 of FindingsManagement.tsx)
4. **Control Tests create** doesn't pass `engagement_id` (line 41 of ControlTesting.tsx)
5. **Follow-Ups create** doesn't pass `engagement_id` (line 80-87 of FollowUpTracker.tsx)
6. **Activities** — the Activity Workbench has no "Create Activity" button, so activities can't be created from it; but when filtered by engagement, new activities from other flows should carry the engagement_id.
7. **Evidence & Working Papers** — filter indirectly through activities, but if created from the module while engagement-filtered, no link is established.

## Changes

### 1. Database Migration — Add `engagement_id` to Evidence & Working Papers
```sql
ALTER TABLE public.ia_evidence ADD COLUMN engagement_id UUID REFERENCES public.ia_audit_engagements(id);
ALTER TABLE public.ia_working_papers ADD COLUMN engagement_id UUID REFERENCES public.ia_audit_engagements(id);
-- Backfill from activities
UPDATE ia_evidence e SET engagement_id = a.engagement_id FROM ia_activities a WHERE e.activity_id = a.id AND a.engagement_id IS NOT NULL;
UPDATE ia_working_papers wp SET engagement_id = a.engagement_id FROM ia_activities a WHERE wp.activity_id = a.id AND a.engagement_id IS NOT NULL;
CREATE INDEX idx_ia_evidence_engagement_id ON public.ia_evidence(engagement_id);
CREATE INDEX idx_ia_working_papers_engagement_id ON public.ia_working_papers(engagement_id);
```

### 2. Update Create Flows to Pass `engagement_id`

In each module, read `engagement_id` from URL params and include it in the create mutation payload:

- **FindingsManagement.tsx** — add `engagement_id: engagementIdFilter || null` to `handleCreate` and `handleBulkImport`
- **ControlTesting.tsx** — add `engagement_id: engagementIdFilter || null` to `handleSave` create path
- **FollowUpTracker.tsx** — add `engagement_id: engagementIdFilter || null` to `handleCreate`
- **EvidenceManagement.tsx** — add `engagement_id: engagementIdFilter || null` to `handleUpload`
- **WorkingPapers.tsx** — add `engagement_id: engagementIdFilter || null` to `handleCreate`

### 3. Update Evidence & Working Papers Filtering

Change from indirect activity-based filtering to direct `engagement_id` filtering:
- **EvidenceManagement.tsx** — filter by `ev.engagement_id === engagementIdFilter` instead of joining through activities
- **WorkingPapers.tsx** — filter by `wp.engagement_id === engagementIdFilter` instead of joining through activities

### 4. Auto-populate Activity Select for Engagement Context

When `engagement_id` is in the URL, filter the Activity dropdown in Findings, Evidence, and Working Papers forms to only show activities belonging to that engagement. This prevents users from accidentally linking to wrong activities.

### 5. Files to Modify
- **New migration**: Add `engagement_id` to `ia_evidence` and `ia_working_papers`
- **`FindingsManagement.tsx`**: Pass `engagement_id` on create, filter activity dropdown
- **`ControlTesting.tsx`**: Pass `engagement_id` on create
- **`FollowUpTracker.tsx`**: Pass `engagement_id` on create
- **`EvidenceManagement.tsx`**: Pass `engagement_id` on create, direct filtering, filter activity dropdown
- **`WorkingPapers.tsx`**: Pass `engagement_id` on create, direct filtering, filter activity dropdown

