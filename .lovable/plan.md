

# Plan: Risk Matrix, View Popups, and Engagement Form Improvements

## 1. Transform Risk Control Matrix → Risk Matrix

**Current state**: The RCM page (`src/pages/audit/RiskControlMatrix.tsx`) shows a Process → Risk → Control drill-down table with likelihood × impact scoring.

**Change**: Replace the current RCM page with a visual **Risk Matrix** (5×5 grid) that plots functions from Risk Assessments by their likelihood and impact scores. The existing Process/Risk/Control CRUD remains accessible via a secondary tab or the RCM continues to exist but the primary view becomes a graphical risk matrix.

**Implementation**:
- Rename the page title from "Risk Control Matrix" to "Risk Matrix"
- Add a **5×5 heatmap grid** (Likelihood on X-axis, Impact on Y-axis) as the primary view
- Pull data from `ia_risk_assessments` (which has `likelihood_score`, `impact_score`, `risk_level` per function)
- Each cell shows the count of functions falling in that likelihood×impact intersection, color-coded by risk classification thresholds
- Clicking a cell shows the list of functions in that risk zone
- Keep the existing Process → Risk → Control drill-down as a "Detailed RCM" tab below

## 2. Improve Annual Plan & Department Audit View Popups

**Current state**: Both view popups in `AuditPlansNew.tsx` show minimal `<p>` tags with basic fields.

**Changes**:
- **Annual Plan View**: Display all fields in a structured card layout — Fiscal Year, Plan Title, Status (badge), Created Date, Objective, Scope, Methodology, and the Discussion Thread. Use a proper grid layout with labels.
- **Department Audit View**: Display Type, Department, Period, Fiscal Year, Status, Objective, Scope, Risk Rating, Lead Auditor, Team Members, Planned Start/End dates, selected Functions list, and Discussion Thread. Use a proper grid layout.

## 3. Restructure Engagement Form Fields

**Current state**: The engagement form in `AuditEngagements.tsx` has fields in a different order than requested, missing Function selection and Supportive Auditor, and no auto-generated Engagement ID.

**Required field sequence**:
1. Engagement Title
2. Auto-generated Engagement ID (read-only, e.g., `ENG-YYYYMMDD-XXXX`)
3. Select Annual Plan
4. Select Department
5. Select Function (cascading from Department)
6. Select Lead Auditor
7. Select Supportive Auditor (multi-select from auditors)
8. Risk Rating
9. Start Date
10. End Date
11. Est. Hours
12. Est. Budget
13. Status
14. Scope
15. Objective
16. Methodology

**Database migration needed**:
- Add `function_id` (uuid, nullable, FK to `ia_department_functions`) to `ia_audit_engagements`
- Add `estimated_budget` (numeric, nullable) to `ia_audit_engagements`
- Add `supportive_auditor_ids` (jsonb, nullable) to `ia_audit_engagements`

**Code changes**:
- Update `emptyForm` and form layout in `AuditEngagements.tsx` to match the field sequence
- Auto-generate `engagement_code` on create (format: `ENG-YYYYMMDD-XXXX`)
- Add cascading Department → Function dropdown
- Add multi-select for Supportive Auditors
- Reorder all form fields to match the requested sequence

## Files to Modify
- `src/pages/audit/RiskControlMatrix.tsx` — Replace with Risk Matrix visualization + keep RCM tab
- `src/pages/audit/AuditPlansNew.tsx` — Enhance view popups for Annual Plan and Department Audit
- `src/pages/audit/AuditEngagements.tsx` — Restructure form fields, add new fields
- `src/config/auditRouteConfig.ts` — Update label from "Risk Control Matrix" to "Risk Matrix"
- **New migration** — Add `function_id`, `estimated_budget`, `supportive_auditor_ids` columns to `ia_audit_engagements`

