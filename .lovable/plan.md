

# Engagement Detail View Page

## Overview
Create a dedicated detail page for each Engagement, accessible via `/audit/engagements/:id`. Currently, engagements only have a modal-based view. The detail page will show all engagement information in a structured, tabbed layout with related data (activities, findings, time logs, control tests, quality reviews).

## Changes

### 1. New File: `src/pages/audit/EngagementDetail.tsx`
A full detail page with:
- **Header**: Back button, engagement title, code badge, status badge, edit button
- **Summary Cards**: Department, Function, Lead Auditor, Risk Rating, Dates, Hours/Budget
- **Tabbed Sections**:
  - **Overview**: Scope, Objectives, Methodology, Criteria, Annual Plan, Supportive Auditors
  - **Activities**: Table of `ia_activities` filtered by `engagement_id`
  - **Findings**: Table of `ia_findings` filtered by engagement's activities
  - **Control Tests**: Table of `ia_control_tests` filtered by `engagement_id`
  - **Time Logs**: Table of `ia_time_logs` filtered by `engagement_id`
  - **Quality Reviews**: Table of `ia_quality_reviews` filtered by `engagement_id`

Uses existing hooks: `useIAEngagements`, `useIADepartments`, `useIAAuditors`, `useIADepartmentFunctions`, `useIAActivities`, `useIAFindings`, `useIAControlTests`, `useIATimeLogs`, `useIAQualityReviews`.

### 2. Update: `src/pages/audit/AuditEngagements.tsx`
- Add a "View" action that navigates to `/audit/engagements/:id` instead of opening modal in view mode
- Keep edit modal as-is

### 3. Update: `src/components/routing/AppRoutes.tsx`
- Add route: `/audit/engagements/:id` → `EngagementDetail`

### 4. No database changes needed
All related tables already have `engagement_id` foreign keys (`ia_activities`, `ia_control_tests`, `ia_time_logs`, `ia_quality_reviews`).

