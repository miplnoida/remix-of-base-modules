

# Internal Audit Module — Lifecycle Fixes Plan

## Current State

All tables exist: `ia_findings`, `ia_management_responses`, `ia_action_tracking`, `ia_audit_queries`, `ia_audit_reports`, `ia_audit_engagements`. The database schema is complete. The issues are **UI-only** — the EngagementDetail page only has 4 tabs (Overview, Checklist, Findings, Closure) and is missing Management Responses, Actions, Queries, and Reports.

## What Will Be Done

### 1. Database: Add `response_attachment` column to `ia_audit_queries` + Create storage bucket

- Add `response_attachment TEXT` column to `ia_audit_queries`
- Create `audit-attachments` storage bucket for file uploads
- RLS policy: authenticated users can read/write

### 2. Rebuild EngagementDetail.tsx — Complete 8-Tab Audit Detail View

Replace the current 4-tab layout with a comprehensive view:

**Tab 1 — Overview**: Existing (no change)

**Tab 2 — Checklist**: Existing (no change)

**Tab 3 — Findings**: Existing, but enhance each finding row to show recommendation and linked management response status inline

**Tab 4 — Management Responses** (NEW): 
- Table: Finding Title, Risk Level, Response Text, Response Status, Responded By, Attachment
- Inline form to submit response for each finding (Pending → Submitted → Reviewed → Accepted → Rejected)
- File upload for supporting documents

**Tab 5 — Actions** (NEW):
- Table: Finding, Action Title, Assigned To, Due Date, Status, Evidence
- Overdue rows highlighted in red
- Create action form linked to findings
- Status workflow: Open → In Progress → Overdue → Completed → Closed

**Tab 6 — Queries** (NEW):
- Inline query list filtered by engagement
- Create query + Respond with file upload
- Status: Pending → Responded → Closed

**Tab 7 — Reports** (NEW):
- Generate Audit Report button
- Auto-populates: Executive Summary, Objective, Scope, Methodology, Findings Summary, Risk Rating, Recommendations, Management Responses, Actions
- Preview report content
- Download as PDF option

**Tab 8 — Closure**: Existing, enhanced with report generation gate

### 3. Fix Audit Queries Page — Add File Upload

Update `AuditQueries.tsx` respond modal:
- Add file upload input (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG — max 20MB)
- Upload to `audit-attachments` bucket
- Save path to `response_attachment` column
- Display attachment link in view modal

### 4. Fix Audit Reports — Structured Report Generation

Update `AuditReports.tsx`:
- When generating from engagement, auto-pull findings, responses, and actions
- Add structured report view with 9 sections
- Add "Generate from Audit" flow that populates all fields

### 5. Wire Email Notifications

Add notification calls to:
- Management Response submitted → notify auditor (`notifyQueryResponse` pattern)
- Action assigned → `notifyActionAssigned()`
- Report generated → notify department head

Add new notification function: `notifyManagementResponseSubmitted()`

### 6. Overdue Action Highlighting

In the Actions tab, compare `target_date` to current date — if past due and status not Completed/Closed, show row in red with "Overdue" badge.

---

## Files to Create/Modify

**Database Migration (1 file):**
- Add `response_attachment` to `ia_audit_queries`
- Create `audit-attachments` storage bucket + RLS

**Modified Files (~4):**
- `src/pages/audit/EngagementDetail.tsx` — Full rebuild with 8 tabs
- `src/pages/audit/AuditQueries.tsx` — Add file upload to respond flow
- `src/pages/audit/AuditReports.tsx` — Structured report generation
- `src/services/auditNotificationService.ts` — Add `notifyManagementResponseSubmitted`

