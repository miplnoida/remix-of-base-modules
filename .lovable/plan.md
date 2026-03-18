

# Make Engagement the Central Container for All Audit Modules

## Current State Summary

**Already linked** (have `engagement_id` + URL filter support): Activities, Evidence, Working Papers, Findings, Follow-Ups, Control Tests, Quality Reviews, Time Logs

**NOT linked** (missing `engagement_id` column AND/OR engagement filter):
- `ia_action_tracking` — no `engagement_id`, no URL filter
- `ia_management_responses` — no `engagement_id`, no URL filter  
- `ia_preparation_checklists` — no `engagement_id`, works only with `department_audit_id`
- `ia_preparation_documents` — no `engagement_id`, works only with `department_audit_id`
- `ia_communications` — no `engagement_id`, uses `annual_plan_id` / `department_audit_id`
- `ia_audit_reports` — no `engagement_id`, uses `plan_id` / `department_id`
- `RiskControlMatrix.tsx` — no engagement awareness at all

**Engagement Detail page** is missing tabs for: Preparation, Action Tracking, RCM, Reports, Communication

---

## Changes (6 groups)

### 1. Database Migration — Add `engagement_id` to 6 tables

Add `engagement_id UUID REFERENCES ia_audit_engagements(id)` to:
- `ia_action_tracking`
- `ia_management_responses`
- `ia_preparation_checklists`
- `ia_preparation_documents`
- `ia_communications`
- `ia_audit_reports`

Backfill existing data:
- `ia_action_tracking`: via `finding_id` → `ia_findings.engagement_id`
- `ia_management_responses`: via `finding_id` → `ia_findings.engagement_id`
- `ia_preparation_checklists/documents`: via `department_audit_id` → engagements with matching department
- `ia_communications`: leave null (no reliable mapping)
- `ia_audit_reports`: leave null (no reliable mapping)

Create indexes on all new columns.

### 2. Update Audit Preparation — Engagement-centric

- Read `engagement_id` from URL params
- Show `EngagementFilterBanner` when filtered
- When `engagement_id` is present, auto-select the linked department audit and filter the audit list to only show relevant audits
- Pass `engagement_id` on checklist and document creation

### 3. Update Action Tracking, Management Responses, Communication, Reports — Engagement filter

**ActionTracking.tsx**:
- Read `engagement_id` from URL, show banner
- Filter actions by `engagement_id` (direct column)
- Pass `engagement_id` on create
- Filter Finding dropdown to engagement-scoped findings

**ManagementResponses.tsx**:
- Already has engagement filter but uses indirect filtering via finding IDs
- Pass `engagement_id` on create
- Use direct `engagement_id` column for filtering

**CommunicationCenter.tsx**:
- Read `engagement_id` from URL, show banner
- Filter communications by `engagement_id`
- Pass `engagement_id` on create (new send form)

**AuditReports.tsx**:
- Read `engagement_id` from URL, show banner
- Filter reports by `engagement_id`
- Pass `engagement_id` on create

### 4. Add RCM Engagement Integration

- Read `engagement_id` from URL in `RiskControlMatrix.tsx`
- Show `EngagementFilterBanner`
- When engagement is active, auto-select the engagement's department and function for the RCM view
- Filter RCM controls to the engagement's function scope

### 5. Expand Engagement Detail — Full Workspace with All Tabs

Update `EngagementDetail.tsx` to include ALL lifecycle tabs:
- **Overview** (existing)
- **Preparation** (new) — show checklist progress and documents
- **Activities** (existing)
- **RCM** (new) — show controls for engagement's function
- **Evidence** (new) — show evidence for this engagement
- **Working Papers** (new) — show papers for this engagement
- **Findings** (existing)
- **Mgmt Responses** (existing)
- **Action Tracking** (new) — show corrective actions
- **Follow-Ups** (existing)
- **Control Tests** (existing)
- **Closure** (new) — show quality reviews + closeout status
- **Reports** (new) — show reports for this engagement
- **Communication** (new) — show communications

Update Quick Navigation to include: Preparation, Action Tracking, RCM, Reports, Communication.

### 6. Files to Modify

- **New migration SQL**: Add `engagement_id` to 6 tables + backfill + indexes
- **`AuditPreparation.tsx`**: Engagement filter + pass on create
- **`ActionTracking.tsx`**: Engagement filter + pass on create + filter dropdowns
- **`ManagementResponses.tsx`**: Direct `engagement_id` filter + pass on create
- **`CommunicationCenter.tsx`**: Engagement filter + pass on create
- **`AuditReports.tsx`**: Engagement filter + pass on create
- **`RiskControlMatrix.tsx`**: Engagement filter + auto-scope to function
- **`EngagementDetail.tsx`**: Add Preparation, RCM, Evidence, Working Papers, Action Tracking, Closure, Reports, Communication tabs + expanded quick nav
- **`useAuditPreparation.ts`**: Support optional `engagement_id` parameter in queries

