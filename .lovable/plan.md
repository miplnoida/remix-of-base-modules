

# Gap Analysis Response: What Actually Exists vs What's Claimed Missing

Most items in the gap analysis are **already implemented**. Here's the factual status and the few genuine gaps that need work.

## Already Implemented (No Changes Needed)

| Claimed Gap | Actual Status |
|---|---|
| Risk Scoring Engine | **EXISTS** -- `AuditConfig.tsx` has full Risk Assessment tab with weighted criteria, thresholds (Critical/High/Medium/Low), and scoring model (`ia_risk_scoring_models`, `ia_risk_criteria_weights`) |
| Risk Configuration (Likelihood/Impact/Control Effectiveness) | **EXISTS** -- `AuditConfig.tsx` "Risk Management" tab has full CRUD for Likelihood Levels, Impact Levels, Control Effectiveness Levels, and Risk Classification Thresholds |
| Risk Control Matrix | **EXISTS** -- `RiskControlMatrix.tsx` with full hierarchy: Department → Function → Process (`ia_rcm_processes`) → Risk (`ia_rcm_risks`) → Control (`ia_rcm_controls`). Inherent risk = Likelihood x Impact; Residual = Inherent x (1 - max effectiveness reduction %) |
| Process Management | **EXISTS** -- `ia_rcm_processes` table with `department_id`, `function_id`, `process_name`, `sub_process_name`. RCM screen manages processes linked to functions |
| Automated Audit Planning | **EXISTS** -- `AuditConfig.tsx` has "Audit Frequency Mapping" (Critical=6mo, High=12mo, etc.). `RiskAssessment.tsx` calculates `suggestedFrequency` from scores |
| Audit Universe Removal | **ALREADY DONE** -- No `ia_audit_universe` table or references exist. System uses Department → Function → Process |
| Approval Workflow | **EXISTS** -- `PlanApproval.tsx` has 3 tabs: Pending Review, Dept Acceptance, History. Includes approve/reject with comments, department acceptance step, notification triggers |
| Evidence Management | **EXISTS** -- `ia-evidence` storage bucket, `ia_preparation_documents` table, Evidence Management screen |
| Communication Thread | **EXISTS** -- `DiscussionThread.tsx` component, `ia_discussion_threads`/`ia_discussion_comments` tables with Supabase Realtime |
| Advanced Reporting | **EXISTS** -- `ExecutiveDashboard.tsx` with KPIs, `AuditReports.tsx`, `RiskHeatMap.tsx`, `AuditHistoryTimeline.tsx` |
| Risk Learning from Past Audits | **EXISTS** -- `historical_risk_adjustment` column on `ia_department_functions`, documented formula (High=+5, Medium=+3, Low=+1) |

## Genuine Gaps (Need Implementation)

### Gap 1: Root Cause Analysis on Findings
The `ia_findings` table has `cause` (CCCE methodology) but lacks dedicated **root cause analysis** fields.

**Changes needed:**
- Add columns to `ia_findings`: `root_cause_category` (TEXT), `preventive_action` (TEXT), `corrective_action_description` (TEXT)
- Update `FindingsManagement.tsx` form to include Root Cause Category dropdown (Process Failure, Human Error, System Gap, Policy Gap, Training Gap) and Preventive Action textarea
- Update view modal to display these fields

### Gap 2: Configuration Change Approval Workflow
Risk configuration changes (likelihood scales, thresholds, etc.) are saved immediately without approval.

**Changes needed:**
- New table: `ia_config_change_requests` (id, config_type, field_changed, old_value, new_value, requested_by, approved_by, status, reason, created_at)
- Modify `AuditConfig.tsx` Risk Management tab to submit changes as "pending" requests instead of direct saves when user is not Chief Auditor
- Add a "Config Approvals" section to the config page for Chief Auditor to review/approve/reject

### Gap 3: `calculate_historical_risk_adjustment` DB Function
The `historical_risk_adjustment` column exists but the automated DB function to recalculate it from closed findings was not yet created.

**Changes needed:**
- Create DB function `calculate_historical_risk_adjustment(p_function_id UUID)` that queries `ia_findings` by department/function, counts by severity, and returns adjustment score
- Create trigger or RPC to invoke on finding status change to "Closed"
- Wire into `RiskAssessment.tsx` to display the adjustment alongside the weighted score

### Gap 4: DiscussionThread Not Yet Embedded in Key Screens
The component exists but isn't wired into findings, activities, or plan modals yet.

**Changes needed:**
- Embed `DiscussionThread` in `FindingsManagement.tsx` view modal
- Embed in `ActivityWorkbench.tsx` activity detail
- Embed in `AuditPlansNew.tsx` plan detail view

## Implementation Approach

**Phase A: Root Cause Analysis** -- Add 3 columns to `ia_findings`, update FindingsManagement form and view modal.

**Phase B: Historical Risk Calculation** -- Create DB function + trigger, wire RiskAssessment to display adjusted scores.

**Phase C: Config Approval Workflow** -- New `ia_config_change_requests` table, modify AuditConfig to use request-based saves for non-chief-auditor users.

**Phase D: Embed Discussion Threads** -- Add `DiscussionThread` component to 3 existing view modals.

Total estimated changes: 4 files modified, 1 new table, 1 DB function, 3 columns added.

