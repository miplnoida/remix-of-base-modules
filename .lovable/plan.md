

# Internal Audit Module — Annual Plan Refactor

## Overview

Refactor the Internal Audit planning flow from a fragmented department/function-linked model to a board-ready annual-plan-centric portfolio. The annual plan becomes the single official planning package containing planned engagements as children, with proper approval lifecycle, board pack generation, and controlled distribution.

## Current State

- `ia_annual_plans` has `department_id`, `function_id`, `assigned_auditor` — treating each plan row like a single audit rather than a portfolio
- `ia_audit_engagements` already has `annual_plan_id` FK and child engagement data
- `AuditPlansNew.tsx` lists plans as function-linked operational records
- `AuditPlanDetail.tsx` has tabs: Wizard, Auto Plan, Capacity, Engagements, Functions, Team, Versions, Changelog, Closure
- `AnnualPlanForm.tsx` captures basic header fields only
- `PlanApproval.tsx` handles both annual plan and department audit approvals
- Existing engagement builder, revision dialog, version history, approval actions all functional
- Email via `send-notification` edge function (Resend-based, no attachment support)

---

## Database Changes (Migration)

### 1. Extend `ia_annual_plans` with new columns

```sql
-- Planning narrative
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS executive_summary TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS planning_assumptions TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS exclusions TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS resource_constraints TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS plan_owner TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS prepared_by TEXT;

-- Resource summary
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS total_available_hours NUMERIC;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS planned_hours NUMERIC;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS contingency_hours NUMERIC;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS outsourced_support_notes TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS skills_constraints TEXT;

-- Governance
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS board_committee_name TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS approval_note TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS minutes_reference TEXT;

-- Board pack tracking
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS board_pack_status TEXT DEFAULT 'None';
```

### 2. Extend `ia_audit_engagements` with portfolio fields

```sql
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS quarter TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS sequence_no INTEGER;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS inclusion_rationale TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS coverage_category TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS board_priority_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS is_adhoc BOOLEAN DEFAULT FALSE;
```

### 3. Create `ia_plan_artifacts` table

Stores generated PDF/Excel artifacts with versioning.

| Column | Type |
|--------|------|
| id | UUID PK |
| plan_id | UUID FK → ia_annual_plans |
| version_number | INT |
| artifact_type | TEXT (board_summary_pdf, detailed_plan_pdf, excel_annex) |
| status | TEXT (Draft, Generated, Final, Superseded) |
| file_name | TEXT |
| file_path | TEXT |
| mime_type | TEXT |
| checksum | TEXT |
| generated_at | TIMESTAMPTZ |
| generated_by | TEXT |
| is_final | BOOLEAN DEFAULT FALSE |
| created_at / updated_at | TIMESTAMPTZ |

### 4. Create `ia_plan_distribution_logs` table

Tracks every email distribution attempt.

| Column | Type |
|--------|------|
| id | UUID PK |
| plan_id | UUID FK → ia_annual_plans |
| artifact_id | UUID FK → ia_plan_artifacts |
| recipient_name | TEXT |
| recipient_email | TEXT |
| recipient_type | TEXT (internal, external, board) |
| subject | TEXT |
| message_body | TEXT |
| send_status | TEXT (Pending, Sent, Failed, Cancelled) |
| provider_message_id | TEXT |
| sent_at | TIMESTAMPTZ |
| sent_by | TEXT |
| created_at | TIMESTAMPTZ |

### 5. Partial unique index for one approved plan per fiscal year

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_ia_annual_plans_approved_fiscal_year
  ON ia_annual_plans (fiscal_year)
  WHERE status = 'Approved';
```

---

## Frontend Changes

### File 1: `src/components/audit/AnnualPlanForm.tsx` — Full Rewrite

Expand from 5 basic fields to a multi-section form:

**A. Plan Header** — title, fiscal_year, plan_owner, prepared_by, status display
**B. Planning Narrative** — executive_summary, objectives, scope, methodology, planning_assumptions, exclusions, resource_constraints
**C. Resource Summary** — total_available_hours, planned_hours, contingency_hours, outsourced_support_notes, skills_constraints
**D. Governance** — board_committee_name, approval_note, minutes_reference

Remove `department_id`, `function_id`, `assigned_auditor` from this form (those are engagement-level). Use accordion or card sections. Keep existing save-as-draft pattern.

### File 2: `src/pages/audit/AuditPlansNew.tsx` — Refactor List

**Columns**: Plan Title, Fiscal Year, Version, Status, Engagements Count, High Risk Count, Planned Hours, Board Pack Status, Last Updated, Approved By/Date

**Actions per row**: View Workspace, Edit Draft, Submit for Approval, Revise, Duplicate Prior Year, Preview Board Pack, Download Final PDF, Send Final

**Metrics cards**: Total Plans, Approved This Year, Drafts/Revisions Pending, Planned Engagements, High Risk Coverage %, Board Packs Generated

**Filters**: Fiscal Year, Status (new status list), Version, Board Pack Status

Remove department/function columns and filters from the list (those are engagement-level data).

### File 3: `src/pages/audit/AuditPlanDetail.tsx` — Workspace Redesign

Replace current 9-tab layout with 7 focused tabs:

1. **Overview** — Plan header, methodology, assumptions, status ribbon, summary metrics
2. **Planned Engagements** — Reuse existing `EngagementBuilder` with enhanced columns (quarter, hours, priority flag, coverage category). Add inline totals. Add "Duplicate Prior Year Engagements" button.
3. **Coverage & Risk** — Department coverage summary, function coverage summary, risk level distribution, gaps/deferred items. Computed from engagement data cross-referenced with `ia_departments` and `ia_risk_assessments`.
4. **Capacity & Schedule** — Quarterly distribution chart, planned hours by auditor, team availability warnings. Reuse existing `CapacityCalendarPanel` and availability check hooks.
5. **Approval & Amendments** — Reuse `ApprovalHistoryPanel`, `PlanAmendmentHistory`, `PlanVersionHistory`. Add revision reason capture. Show amendment timeline.
6. **Board Pack** — Preview annual plan content. Generate Board Summary PDF and Detailed Plan PDF buttons. Show artifact history from `ia_plan_artifacts`. Lock final artifact after approval. Re-generate if revised.
7. **Distribution** — Recipient management (add internal/external recipients). Subject/body editor with merge field support. Attach final artifact. Send button. Distribution history from `ia_plan_distribution_logs`. Delivery status.

### File 4: `src/components/audit/AddEngagementToPlanForm.tsx` — Extend

Add fields: `quarter`, `inclusion_rationale`, `coverage_category`, `board_priority_flag`, `sequence_no`, `is_adhoc`, `estimated_hours` (ensure captured). Keep existing risk auto-derivation, department/function cascading, multi-auditor selection.

### File 5: `src/pages/audit/PlanApproval.tsx` — Update Status Handling

- Update to handle new status model (Draft, Submitted, Under Review, Approved, Superseded, Amendment Pending, Archived, Rejected)
- Add "Under Review" intermediate state
- On approve: check partial unique index constraint for one approved per fiscal year. If another approved plan exists for same fiscal year, block with clear message.
- Keep existing department audit approval flow unchanged

### File 6: New `src/components/audit/BoardPackTab.tsx`

Board Pack tab component:
- Renders plan data in a print-friendly preview (cover page, executive summary, engagement table by quarter, risk coverage, resource summary, approval block)
- "Generate Board Summary PDF" button — uses browser print or a PDF generation library to create the artifact
- "Generate Detailed Plan PDF" button — full version with all metadata
- Saves artifact metadata to `ia_plan_artifacts` and file to Supabase Storage (`ia-artifacts` bucket)
- Shows artifact history table
- Only allows "Mark as Final" on approved plans
- Supersedes previous artifacts when regenerated

### File 7: New `src/components/audit/PlanDistributionTab.tsx`

Distribution tab component:
- Recipient list with name, email, type (internal/external/board) — add/remove
- Subject line with merge field buttons ({{plan_title}}, {{fiscal_year}}, {{version_number}}, etc.)
- Message body textarea with merge fields
- Attachment selector showing only Final artifacts from `ia_plan_artifacts`
- "Send" button — invokes `send-notification` edge function per recipient with the PDF download link (since current edge function doesn't support attachments, include a signed Supabase Storage URL in the email body)
- Logs each send to `ia_plan_distribution_logs`
- Shows distribution history with status badges
- Warns if artifact is superseded

### File 8: New `src/components/audit/CoverageRiskTab.tsx`

Coverage & Risk analysis tab:
- Queries engagements under this plan grouped by department and function
- Cross-references with `ia_risk_assessments` to show which high/critical risk functions are covered vs uncovered
- Displays risk distribution chart (Critical/High/Medium/Low counts)
- Shows department coverage percentage
- Lists gaps: functions rated High/Critical with no planned engagement

### File 9: `src/hooks/useAuditData.ts` — Extend

- Add `useIAPlanArtifacts(planId)` hook for `ia_plan_artifacts` queries
- Add `useIAPlanDistributionLogs(planId)` hook for `ia_plan_distribution_logs` queries
- Add mutations for artifacts and distribution logs
- Add `useDuplicatePriorYearPlan()` mutation — copies plan header + engagements from prior fiscal year

### File 10: `src/hooks/useAuditPlanChangeLog.ts` — Extend

- Update `useIAPlanEngagements` to include new fields (quarter, sequence_no, board_priority_flag, etc.)

### File 11: `src/services/auditNotificationService.ts` — Extend

- Add `notifyPlanDistributed()` function for logging distribution emails
- Add merge field resolution helper for plan distribution templates

---

## Validation Rules (Implemented in UI + mutations)

1. **Submission gate**: Plan cannot be submitted without: title, fiscal_year, executive_summary or objective, at least 1 active engagement, each engagement must have department, scope, timeline, lead_auditor, estimated_hours
2. **Approval gate**: Before setting status to Approved, query `ia_annual_plans` for another Approved row with same fiscal_year (excluding current ID). Block if found.
3. **Board Pack gate**: Final PDF can only be generated from Approved plans
4. **Distribution gate**: Email send blocked unless plan is Approved AND a Final artifact exists
5. **Date alignment**: Engagement planned dates must fall within fiscal year range

---

## Status Model Implementation

Update `StatusBadge` mappings (if needed) for new statuses. All status transitions enforced in mutation handlers:

- Draft → Submitted (requires validation pass)
- Submitted → Under Review → Approved / Rejected
- Approved → Amendment Pending → Submitted (re-approval)
- Approved → Superseded (when new version approved for same fiscal year)
- Any → Archived

---

## Backward Compatibility

- Existing `department_id` and `function_id` on `ia_annual_plans` are left nullable and unused by new UI but not dropped
- Existing records mapped: plans without engagements show "0 engagements" in new UI
- All existing engagement data preserved — `annual_plan_id` already links them
- New columns all nullable with defaults — no migration failures
- Old `AuditPlans.tsx` route still exists but `AuditPlansNew.tsx` is the active route

---

## Non-Impact Guarantee

- No changes to any file outside `src/pages/audit/`, `src/components/audit/`, `src/hooks/useAudit*`, `src/services/audit*`, `src/config/auditRouteConfig.ts`
- No changes to PageShell, DataTable, StandardModal, StatusBadge, MetricCard
- No changes to send-notification edge function (use download links for attachments)
- No changes to RBAC, profiles, tb_office, or any non-audit table
- No changes to findings, working papers, evidence, action tracking, quality review screens
- Supabase Storage bucket `ia-artifacts` created via migration for PDF storage

---

## Summary of All Files

| File | Action |
|------|--------|
| DB migration | Add columns to ia_annual_plans + ia_audit_engagements, create ia_plan_artifacts + ia_plan_distribution_logs, create unique index, create storage bucket |
| `AnnualPlanForm.tsx` | Rewrite with expanded sections (narrative, resources, governance) |
| `AuditPlansNew.tsx` | Refactor list to portfolio-centric view with new columns, metrics, actions |
| `AuditPlanDetail.tsx` | Redesign to 7-tab workspace (Overview, Engagements, Coverage, Capacity, Approval, Board Pack, Distribution) |
| `AddEngagementToPlanForm.tsx` | Add quarter, inclusion_rationale, coverage_category, board_priority_flag fields |
| `PlanApproval.tsx` | Update status model, add fiscal year uniqueness check on approve |
| `BoardPackTab.tsx` | New — PDF preview/generation, artifact management |
| `PlanDistributionTab.tsx` | New — Email distribution with recipient management, merge fields, logging |
| `CoverageRiskTab.tsx` | New — Risk coverage analysis and gap identification |
| `useAuditData.ts` | Add artifact + distribution hooks, duplicate plan mutation |
| `useAuditPlanChangeLog.ts` | Include new engagement fields in query |
| `auditNotificationService.ts` | Add distribution notification helpers |

