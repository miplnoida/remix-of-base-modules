# Internal Audit Module — Complete Technical & Functional Documentation

**Document Version:** 2.0  
**Last Updated:** 2026-03-13  
**Module Prefix:** `ia_` (all database tables)  
**Route Prefix:** `/audit/*`  
**Module Status:** Production-Ready (All 35 screens functional)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Module Architecture](#2-module-architecture)
3. [Database Schema](#3-database-schema)
4. [Screen Inventory](#4-screen-inventory)
5. [Audit Lifecycle Workflow](#5-audit-lifecycle-workflow)
6. [Risk Assessment & Scoring](#6-risk-assessment--scoring)
7. [Audit Planning](#7-audit-planning)
8. [Approval Workflow](#8-approval-workflow)
9. [Audit Preparation](#9-audit-preparation)
10. [Audit Execution](#10-audit-execution)
11. [Issue Management](#11-issue-management)
12. [Audit Closure](#12-audit-closure)
13. [Reporting & Dashboards](#13-reporting--dashboards)
14. [Communication & Collaboration](#14-communication--collaboration)
15. [Email Notifications](#15-email-notifications)
16. [Administration & Configuration](#16-administration--configuration)
17. [Integration Points](#17-integration-points)
18. [Security & Permissions](#18-security--permissions)
19. [Edge Functions](#19-edge-functions)
20. [Feature Flags](#20-feature-flags)
21. [File Structure](#21-file-structure)
22. [Remaining Items](#22-remaining-items)

---

## 1. Executive Summary

The Internal Audit Module is a fully integrated risk-based internal audit system built within the Social Security platform. It supports the complete audit lifecycle from risk identification through audit closure and reporting, while leveraging the platform's existing master data (offices, departments, user profiles) and services (RBAC, notifications).

### Key Capabilities
- **Risk-Based Planning:** Automated risk scoring drives audit frequency recommendations
- **Full Lifecycle Management:** Risk Assessment → Planning → Preparation → Execution → Findings → Closure → Reporting
- **Multi-Step Approval Workflow:** Lead Auditor review + Department Head acceptance with email notifications
- **Ad-hoc Audit Support:** Audits can be created outside the annual plan
- **Auto Corrective Actions:** Findings automatically generate corrective action tracking records
- **Realtime Collaboration:** Discussion threads with @mentions and live updates
- **Automated Reminders:** Scheduled edge function sends due date reminders (7/3/1 day + overdue)
- **Historical Risk Adjustment:** Past findings automatically influence future risk scores
- **Electronic Signatures:** Approval, closeout, and quality review sign-offs
- **PDF/Excel Export:** All reports support multi-format export

---

## 2. Module Architecture

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI Framework | Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query v5 |
| Routing | React Router v6 |
| Charts | Recharts |
| Database | PostgreSQL (via Lovable Cloud) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Email | Resend API (via send-notification edge function) |
| File Storage | Supabase Storage (`ia-evidence` bucket) |
| Realtime | Supabase Realtime (postgres_changes) |

### Architecture Principles
1. **Existing Master Integration:** Uses `tb_office`, `tb_office_departments`, and `profiles` tables — no duplicate masters
2. **Audit Trail:** All mutations inject `created_by` / `updated_by` via `useAuditTrail` hook (5-character `user_code`)
3. **Feature Flags:** Each module controlled via `AUDIT_FEATURE_FLAGS` in `auditRouteConfig.ts`
4. **Permission-Based Access:** RBAC permissions control screen-level access
5. **No RLS:** Per architectural constraint, Row Level Security is not used; only role-based security

### Data Hierarchy
```
Office (tb_office)
  → Department (ia_departments)
    → Function (ia_department_functions)
      → Risk Assessment (ia_risk_assessments)
        → Risk Control Matrix (ia_rcm_processes → ia_rcm_risks → ia_rcm_controls → ia_rcm_tests)
          → Annual Plan (ia_annual_plans)
            → Department Audit (ia_department_audits)
              → Engagement (ia_audit_engagements)
                → Activity (ia_activities)
                  → Evidence (ia_evidence)
                  → Working Paper (ia_working_papers)
                  → Finding (ia_findings)
                    → Management Response (ia_management_responses)
                    → Action Tracking (ia_action_tracking)
                      → Follow-Up (ia_follow_ups)
                        → Quality Review (ia_quality_reviews)
                          → Plan Closeout
                            → Audit Report (ia_audit_reports)
```

---

## 3. Database Schema

### 3.1 All Tables (59 tables with `ia_` prefix)

#### Master Data Tables
| Table | Purpose |
|-------|---------|
| `ia_departments` | Audit-scope departments linked to `tb_office` and `tb_office_departments`. Fields: `office_code`, `source_department_id`, `head_profile_id`, `head`, `email`, `phone`, `status` |
| `ia_department_functions` | Functions within departments. Fields: `department_id`, `function_name`, `description`, `risk_level`, `historical_risk_adjustment` (NUMERIC, default 0) |
| `ia_auditors` | Auditor profiles linked to `profiles` table. Fields: `profile_id`, `name`, `email`, `specialization`, `qualification`, `status` |
| `ia_auditor_workload` | Capacity and workload tracking per auditor |
| `ia_holidays` | Holiday calendar for planning |
| `ia_leave_requests` | Auditor leave/vacation records |
| `ia_activity_types` | Configurable activity type definitions |
| `ia_audit_universe` | Legacy audit universe entries |

#### Risk Assessment Tables
| Table | Purpose |
|-------|---------|
| `ia_risk_assessments` | Function-level risk assessment records |
| `ia_risk_assessment_factors` | Factor scores per assessment |
| `ia_risk_criteria` | Risk criteria definitions |
| `ia_risk_criteria_weights` | Weighted scoring configuration |
| `ia_risk_scoring_models` | Scoring model configuration |
| `ia_risk_classification_thresholds` | Risk level thresholds (Low/Medium/High/Critical) |
| `ia_risk_likelihood_levels` | Likelihood scale (1-5) |
| `ia_risk_impact_levels` | Impact scale (1-5) |
| `ia_control_effectiveness_levels` | Control effectiveness reduction percentages |

#### Risk Control Matrix Tables
| Table | Purpose |
|-------|---------|
| `ia_rcm_processes` | Processes within functions |
| `ia_rcm_risks` | Risks linked to processes with likelihood/impact/inherent score |
| `ia_rcm_controls` | Controls linked to risks (preventive/detective), frequency, owner |
| `ia_rcm_tests` | Tests linked to controls with procedure and expected result |
| `ia_control_tests` | Control testing execution records |
| `ia_control_test_results` | Test execution results (Pass/Fail/Partial) |

#### Planning Tables
| Table | Purpose |
|-------|---------|
| `ia_annual_plans` | Annual audit plan headers. Fields: `title`, `year`, `status`, `approved_by`, `approved_date` |
| `ia_department_audits` | Individual department audits. Fields: `annual_plan_id` (nullable), `audit_type` (planned/ad_hoc), `department_id`, `function_ids`, `objectives`, `scope`, `planned_start`, `planned_end`, `lead_auditor_id`, `team_members`, `status` |
| `ia_planning_assumptions` | Planning assumptions and constraints |
| `ia_plan_amendments` | Amendment history. Fields: `plan_id`, `amendment_type`, `field_changed`, `old_value`, `new_value`, `reason`, `requested_by`, `approved_by`, `status`, `created_at` |
| `ia_plan_carry_forward` | Carry-forward rules from prior year plans |
| `ia_approval_actions` | Full approval audit trail. Fields: `entity_type`, `entity_id`, `action`, `performed_by`, `comments`, `created_at` |

#### Engagement & Program Tables
| Table | Purpose |
|-------|---------|
| `ia_audit_engagements` | Audit engagement records |
| `ia_audit_programs` | Structured audit programs |
| `ia_audit_procedures` | Procedures within programs |

#### Preparation Tables
| Table | Purpose |
|-------|---------|
| `ia_preparation_checklists` | Pre-execution checklists. Fields: `department_audit_id`, `item_text`, `is_completed`, `assigned_to`, `category` (General/Procedure/Objective/Risk), `sort_order`, `created_by`, `created_at` |
| `ia_preparation_documents` | Preliminary document uploads. Fields: `department_audit_id`, `document_type`, `file_url`, `file_name`, `uploaded_by`, `created_at` |

#### Execution Tables
| Table | Purpose |
|-------|---------|
| `ia_activities` | Audit activities linked to department audits and engagements |
| `ia_evidence` | Evidence files linked to activities, stored in `ia-evidence` bucket |
| `ia_working_papers` | Working paper documents linked to activities |
| `ia_time_logs` | Time tracking per activity/auditor |

#### Findings & Response Tables
| Table | Purpose |
|-------|---------|
| `ia_findings` | Audit findings. Fields: `title`, `description`, `severity` (High/Medium/Low), `root_cause`, `activity_id`, `status` (Draft/Under Review/For Mgmt Response/Closed) |
| `ia_recommendations` | Recommendations linked to findings |
| `ia_management_responses` | Department head responses to findings |
| `ia_action_tracking` | Corrective action items (auto-generated). Fields: `finding_id`, `action_description`, `responsible_person`, `target_date`, `status` (Not Started/Open/In Progress/Completed/Overdue) |
| `ia_action_plan_milestones` | Action plan milestone tracking |
| `ia_action_plan_updates` | Progress updates on action plans |
| `ia_follow_ups` | Follow-up verification records |

#### Closure & Quality Tables
| Table | Purpose |
|-------|---------|
| `ia_quality_reviews` | Quality assurance review records. Fields: `engagement_id`, `quality_rating`, `checklist_results`, `required_rework`, `signed_by`, `signature_date` |
| `ia_quality_review_checklist` | QA checklist items |

#### Reporting Tables
| Table | Purpose |
|-------|---------|
| `ia_audit_reports` | Final audit reports linked to plans |

#### Communication Tables
| Table | Purpose |
|-------|---------|
| `ia_communications` | Template-based communications |
| `ia_discussion_threads` | Discussion threads on any entity. Fields: `entity_type`, `entity_id`, `created_by`, `created_at` |
| `ia_discussion_comments` | Comments within threads (**Realtime enabled**). Fields: `thread_id`, `author_id`, `author_name`, `content`, `mentioned_users` (UUID[]), `created_at` |
| `ia_notification_logs` | Notification delivery tracking |
| `ia_notification_queue` | Outbound notification queue |

#### Configuration Tables
| Table | Purpose |
|-------|---------|
| `ia_audit_config` | Module configuration key-value store |
| `ia_audit_settings` | Audit settings (frequencies, thresholds) |
| `ia_document_templates` | Letter/report templates |
| `ia_sla_rules` | SLA and escalation rules |
| `ia_escalation_rules` | Escalation policy definitions |

---

## 4. Screen Inventory

### 4.1 All 35 Screens

| # | Screen | Route | Page File | Category | Permission |
|---|--------|-------|-----------|----------|------------|
| 1 | Executive Dashboard | `/audit/executive-dashboard` | ExecutiveDashboard.tsx | Reports | `generate_reports` |
| 2 | Risk Assessment | `/audit/risk-assessment` | RiskAssessment.tsx | Governance | `configure_audit_system` |
| 3 | Auditor Profiles | `/audit/auditors` | AuditorProfiles.tsx | Management | `configure_audit_system` |
| 4 | Workload & Capacity | `/audit/workload` | WorkloadCapacity.tsx | Management | `assign_auditors` |
| 5 | Time Tracking | `/audit/time-tracking` | TimeTracking.tsx | Management | `execute_audit_activities` |
| 6 | Leave & Vacation | `/audit/leave` | LeaveManagement.tsx | Management | `assign_auditors` |
| 7 | Holiday Management | `/audit/holidays` | HolidayManagement.tsx | Management | `assign_auditors` |
| 8 | Audit Plans | `/audit/audit-plans` | AuditPlansNew.tsx | Planning | `create_audit_plans` |
| 9 | Plan Approval | `/audit/plan-approval` | PlanApproval.tsx | Planning | `approve_audit_plans` |
| 10 | Audit Engagements | `/audit/engagements` | AuditEngagements.tsx | Planning | `create_audit_plans` |
| 11 | Audit Programs | `/audit/audit-programs` | AuditPrograms.tsx | Methodology | `create_audit_plans` |
| 12 | Audit Preparation | `/audit/preparation` | AuditPreparation.tsx | Methodology | `create_audit_plans` |
| 13 | Risk Control Matrix | `/audit/rcm` | RiskControlMatrix.tsx | Methodology | `enter_audit_findings` |
| 14 | Control Testing | `/audit/control-testing` | ControlTesting.tsx | Methodology | `execute_audit_activities` |
| 15 | Activity Calendar | `/audit/calendar` | ActivityCalendar.tsx | Execution | `view_audit_assignments` |
| 16 | Activity Workbench | `/audit/activity-workbench` | ActivityWorkbench.tsx | Execution | `execute_audit_activities` |
| 17 | Evidence Management | `/audit/evidence` | EvidenceManagement.tsx | Execution | `enter_audit_findings` |
| 18 | Working Papers | `/audit/working-papers` | WorkingPapers.tsx | Execution | `enter_audit_findings` |
| 19 | Findings & Recommendations | `/audit/findings` | FindingsManagement.tsx | Execution | `enter_audit_findings` |
| 20 | Management Responses | `/audit/responses` | ManagementResponses.tsx | Follow-up | `view_audit_assignments` |
| 21 | Action Tracking | `/audit/actions` | ActionTracking.tsx | Follow-up | `manage_audit_followups` |
| 22 | Follow-Up Tracker | `/audit/follow-up-tracker` | FollowUpTracker.tsx | Follow-up | `manage_audit_followups` |
| 23 | Quality Assurance Review | `/audit/quality-review` | QualityReview.tsx | Follow-up | `approve_audit_closeouts` |
| 24 | Plan Closeout | `/audit/plan-closeout` | PlanCloseout.tsx | Follow-up | `approve_audit_closeouts` |
| 25 | Audit Reports | `/audit/audit-reports` | AuditReports.tsx | Reports | `generate_reports` |
| 26 | Committee Reports | `/audit/committee-reports` | CommitteeReports.tsx | Reports | `generate_reports` |
| 27 | Letter Generation | `/audit/letters` | LetterGeneration.tsx | Reports | `create_audit_plans` |
| 28 | Report Builder | `/audit/report-builder` | ReportBuilder.tsx | Reports | `enter_audit_findings` |
| 29 | Communication Center | `/audit/communication-center` | CommunicationCenter.tsx | Reports | `create_audit_plans` |
| 30 | System Configuration | `/audit/config` | AuditConfig.tsx | Administration | `configure_audit_system` |
| 31 | SLA & Escalation Rules | `/audit/sla-rules` | SLARules.tsx | Administration | `configure_audit_system` |
| 32 | Department Master | `/audit/departments` | DepartmentMaster.tsx | Administration | `configure_audit_system` |
| 33 | Function Master | `/audit/functions` | FunctionMaster.tsx | Administration | `configure_audit_system` |
| 34 | Templates | `/audit/templates` | TemplatesManagement.tsx | Administration | `configure_audit_system` |
| 35 | Audit Universe | `/audit/audit-universe` | AuditUniverse.tsx | Governance | (legacy) |

### 4.2 UI Standards (All Screens)
- **Layout:** `PageShell` wrapper with breadcrumbs
- **Search/Filter:** `StandardSearchFilterBar` component
- **Tables:** `DataTable` with sorting, pagination, column visibility
- **Modals:** `StandardModal` with sticky header/footer
- **Stats:** `MetricCard` components for KPIs
- **Status:** `StatusBadge` with color-coded rendering
- **Actions:** View/Edit pattern with permission-gated buttons
- **Audit Trail:** `created_by`/`updated_by` via `useAuditTrail` hook

---

## 5. Audit Lifecycle Workflow

### 5.1 End-to-End Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    INTERNAL AUDIT LIFECYCLE                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐           │
│  │ MASTER DATA │───▶│    RISK      │───▶│   PLANNING    │           │
│  │ Department  │    │ Assessment   │    │ Annual Plan   │           │
│  │ Function    │    │ RCM          │    │ Ad-hoc Audit  │           │
│  │ Auditor     │    │ Scoring      │    │ Team Assign   │           │
│  └─────────────┘    └──────────────┘    └───────┬───────┘           │
│                                                  │                   │
│                                          ┌───────▼───────┐           │
│                                          │   APPROVAL    │           │
│                                          │ Lead Review   │           │
│                                          │ Dept Accept   │           │
│                                          └───────┬───────┘           │
│                                                  │                   │
│                                          ┌───────▼───────┐           │
│                                          │ PREPARATION   │           │
│                                          │ Checklist     │           │
│                                          │ Documents     │           │
│                                          │ Team Tasks    │           │
│                                          └───────┬───────┘           │
│                                                  │                   │
│  ┌─────────────┐    ┌──────────────┐    ┌───────▼───────┐           │
│  │  CLOSURE    │◀───│   FINDINGS   │◀───│  EXECUTION    │           │
│  │ Mgmt Resp   │    │ Auto Action  │    │ Activities    │           │
│  │ Quality Rev │    │ Tracking     │    │ Evidence      │           │
│  │ Closeout    │    │ Follow-up    │    │ Working Papers│           │
│  └──────┬──────┘    └──────────────┘    └───────────────┘           │
│         │                                                            │
│  ┌──────▼──────┐                                                     │
│  │ REPORTING   │                                                     │
│  │ Audit Report│                                                     │
│  │ Committee   │                                                     │
│  │ Letters     │                                                     │
│  │ Dashboard   │                                                     │
│  └─────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Status Transitions

#### Annual Plan Status Flow
```
Draft → Submitted → Under Review → Approved → Awaiting Dept Acceptance → Accepted → In Progress → Completed
                  ↘ Rejected                ↘ Amendment Pending → (re-enters Under Review)
```

#### Department Audit Status Flow
```
Planned → Accepted → In Preparation → Ready for Execution → In Progress → Under Review → Completed → Closed
```

#### Finding Status Flow
```
Draft → Under Review → For Management Response → Closed
```

#### Corrective Action Status Flow
```
Not Started → In Progress → Completed
           → Open
           → Overdue (auto-set by reminder function when past target_date)
```

---

## 6. Risk Assessment & Scoring

### 6.1 Risk Scoring Model

Risk is assessed at the **Function** level within each department using weighted criteria.

#### Scoring Formula
```
Weighted Score = Σ (Factor Score × Factor Weight)

Factor Categories:
  - Operational Risk
  - Financial Risk
  - Compliance Risk
  - Control Weakness
  - Time Since Last Audit

Final Score = Weighted Score + Historical Risk Adjustment
```

#### Historical Risk Adjustment
Past findings from closed audits automatically increase future risk scores:
| Finding Severity | Points Added |
|-----------------|-------------|
| High | +5 |
| Medium | +3 |
| Low | +1 |

Stored in `ia_department_functions.historical_risk_adjustment` (NUMERIC, default 0).

### 6.2 Risk Classification Thresholds
Configurable in Audit Settings (default):
| Level | Score Range | Recommended Audit Frequency |
|-------|-------------|---------------------------|
| Low | 0–5 | Every 3 years |
| Medium | 6–12 | Every 2 years |
| High | 13–20 | Yearly (12 months) |
| Critical | 21–25 | Immediate / Ad-hoc |

### 6.3 Risk Control Matrix (RCM)

#### Dual-Score Calculation
```
Inherent Risk = Likelihood Score (1-5) × Impact Score (1-5)
Residual Risk = Inherent Risk × (1 − Control Effectiveness Reduction %)
```

#### RCM Hierarchy
```
Department → Function → Process (ia_rcm_processes)
  → Risk (ia_rcm_risks): likelihood, impact, inherent score
    → Control (ia_rcm_controls): type (Preventive/Detective), frequency, owner
      → Test (ia_rcm_tests): test procedure, expected result
```

#### Configurable Scales
| Scale | Range | Table |
|-------|-------|-------|
| Likelihood | 1–5 | `ia_risk_likelihood_levels` |
| Impact | 1–5 | `ia_risk_impact_levels` |
| Control Effectiveness | 0%–100% reduction | `ia_control_effectiveness_levels` |

Risk configuration is controlled by the Audit Lead only. Changes go through approval workflow.

---

## 7. Audit Planning

### 7.1 Annual Audit Plan

**Screen:** Audit Plans (`AuditPlansNew.tsx`)  
**Table:** `ia_annual_plans`

| Field | Type | Description |
|-------|------|-------------|
| `title` | TEXT | Plan name |
| `year` | INTEGER | Audit year |
| `status` | TEXT | Current workflow status |
| `approved_by` | TEXT | Lead Auditor who approved |
| `approved_date` | TIMESTAMP | Approval timestamp |
| `created_by` | TEXT | User code of creator |

Each plan contains multiple **Department Audits**.

### 7.2 Department Audit

**Table:** `ia_department_audits`

| Field | Type | Description |
|-------|------|-------------|
| `annual_plan_id` | UUID (nullable) | Link to annual plan (null for ad-hoc) |
| `audit_type` | TEXT | `planned` or `ad_hoc` (default: `planned`) |
| `department_id` | UUID | Target department |
| `function_ids` | UUID[] | Functions to audit |
| `objectives` | TEXT | Audit objectives |
| `scope` | TEXT | Audit scope |
| `planned_start` | DATE | Start date |
| `planned_end` | DATE | End date |
| `lead_auditor_id` | UUID | Lead auditor |
| `team_members` | UUID[] | Array of auditor IDs |
| `status` | TEXT | Current status |

### 7.3 Ad-hoc Audits
- Created without selecting an annual plan (`annual_plan_id` = null)
- Directly defines department, function, scope, team, and timeline
- `audit_type` set to `ad_hoc`
- Filterable in the listing via type filter chips (All / Planned / Ad-hoc)
- Uses `DepartmentAuditForm.tsx` with `isAdHoc` mode

### 7.4 Plan Amendments

**Component:** `PlanAmendmentHistory.tsx`  
**Table:** `ia_plan_amendments`

When an approved plan is modified:
1. System captures field-level before/after snapshot
2. Plan status resets to "Amendment Pending"
3. Amendment record created with reason and requester
4. Re-approval workflow triggered
5. Full amendment history viewable inside plan detail modal

| Field | Type | Description |
|-------|------|-------------|
| `plan_id` | UUID | Linked annual plan |
| `amendment_type` | TEXT | Type of change |
| `field_changed` | TEXT | Specific field modified |
| `old_value` | TEXT | Before value (JSON snapshot) |
| `new_value` | TEXT | After value (JSON snapshot) |
| `reason` | TEXT | Justification for amendment |
| `requested_by` | TEXT | User who requested |
| `approved_by` | TEXT | User who approved amendment |
| `status` | TEXT | Pending / Approved / Rejected |
| `created_at` | TIMESTAMP | Amendment timestamp |

---

## 8. Approval Workflow

### 8.1 Multi-Step Approval Process

**Screen:** Plan Approval (`PlanApproval.tsx`)  
**Table:** `ia_approval_actions`

```
Step 1: Plan Creator submits plan
  → Status changes to: "Submitted"
  → Email notification sent to Lead Auditor (notifyPlanSubmitted)

Step 2: Lead Auditor reviews
  → Approve → Status: "Approved"
    → Email to assigned auditors + department head (notifyPlanApproved)
  → Reject → Status: "Rejected"
    → Email to plan creator

Step 3: Department Head acceptance
  → Accept → Status: "Accepted"
    → Audit can proceed to preparation stage
  → Decline → Status: "Rejected"
    → Email to Lead Auditor
```

### 8.2 Plan Approval UI

Tabbed interface with four views:
| Tab | Content |
|-----|---------|
| **Pending Review** | Plans in "Submitted" status awaiting Lead Auditor action |
| **Dept Acceptance** | Plans in "Approved" status awaiting Department Head acceptance |
| **Decided** | Recently approved/rejected plans |
| **History** | Complete approval action log from `ia_approval_actions` |

Each action (approve/reject/accept) requires:
- **Mandatory comments** explaining the decision
- Logged in `ia_approval_actions` with: `entity_type`, `entity_id`, `action`, `performed_by`, `comments`, `created_at`

---

## 9. Audit Preparation

### 9.1 Preparation Screen

**Screen:** Audit Preparation (`AuditPreparation.tsx`)  
**Hook:** `useAuditPreparation.ts`

Shows all audits in "Accepted" / "In Preparation" / "Ready for Execution" status.

#### Audit Selection Panel
- Left panel lists audits by status
- Click to select and view preparation details in the right panel

#### Three Tabs

**Checklist Tab**  
Table: `ia_preparation_checklists`
| Field | Type | Description |
|-------|------|-------------|
| `department_audit_id` | UUID | Linked audit |
| `item_text` | TEXT | Checklist item description |
| `is_completed` | BOOLEAN | Completion status |
| `assigned_to` | UUID | Assigned auditor |
| `category` | TEXT | General / Procedure / Objective / Risk |
| `sort_order` | INTEGER | Display order |
| `created_by` | TEXT | Creator user code |

**Documents Tab**  
Table: `ia_preparation_documents`
| Field | Type | Description |
|-------|------|-------------|
| `department_audit_id` | UUID | Linked audit |
| `document_type` | TEXT | Type classification |
| `file_url` | TEXT | Storage URL |
| `file_name` | TEXT | Original filename |
| `uploaded_by` | TEXT | Uploader user code |

Storage: `ia-evidence` Supabase bucket

**Team Tab**
- Shows assigned auditors from the department audit team
- Displays auditor name, role, specialization

#### Status Transitions
```
Accepted → In Preparation (when first checklist/doc added)
In Preparation → Ready for Execution (manual transition)
```

---

## 10. Audit Execution

### 10.1 Activity Management

**Screen:** Activity Workbench (`ActivityWorkbench.tsx`)  
**Table:** `ia_activities`

| Feature | Description |
|---------|-------------|
| Activity listing | All activities for a department audit |
| Status tracking | Not Started / In Progress / Completed |
| Auditor assignment | Each activity assigned to specific auditor |
| Time logging | Hours tracked via `ia_time_logs` |
| Rescheduling | Via `ActivityRescheduleDialog.tsx` |

### 10.2 Activity Calendar

**Screen:** Activity Calendar (`ActivityCalendar.tsx`)

- Full calendar view (react-big-calendar) of all scheduled audit activities
- Drag-and-drop rescheduling
- Filter by auditor, department, status
- Color-coded by activity status

### 10.3 Evidence Management

**Screen:** Evidence Management (`EvidenceManagement.tsx`)  
**Table:** `ia_evidence`

| Feature | Description |
|---------|-------------|
| File upload | Upload to `ia-evidence` storage bucket |
| Activity linking | Evidence linked to specific activities |
| Tagging | Tag by audit area |
| Preview | In-browser document preview |
| Multiple files | Supports multiple file uploads per activity |

### 10.4 Working Papers

**Screen:** Working Papers (`WorkingPapers.tsx`)  
**Table:** `ia_working_papers`

| Feature | Description |
|---------|-------------|
| Document creation | Structured working paper records |
| Activity linking | Linked to audit activities |
| Finding linking | Cross-reference with findings |
| Audit trail | Created/updated by tracking |

### 10.5 Control Testing

**Screen:** Control Testing (`ControlTesting.tsx`)  
**Tables:** `ia_control_tests`, `ia_control_test_results`

| Feature | Description |
|---------|-------------|
| Test execution | Execute tests from RCM test definitions |
| Result recording | Pass / Fail / Partial with evidence |
| Exception tracking | Log control exceptions |
| Linkage | Links back to RCM controls and risks |

---

## 11. Issue Management

### 11.1 Findings

**Screen:** Findings & Recommendations (`FindingsManagement.tsx`)  
**Table:** `ia_findings`

| Field | Type | Description |
|-------|------|-------------|
| `title` | TEXT | Finding title |
| `description` | TEXT | Detailed description |
| `severity` | TEXT | High / Medium / Low |
| `root_cause` | TEXT | Root cause analysis |
| `activity_id` | UUID | Linked audit activity |
| `evidence_ids` | UUID[] | Referenced evidence |
| `status` | TEXT | Draft → Under Review → For Mgmt Response → Closed |
| `created_by` | TEXT | User code of creator |

### 11.2 Auto Corrective Action Generation

When a finding is created (via `useIAFindingMutations`), the system **automatically**:
1. Creates an `ia_action_tracking` record
2. Sets `action_description`: "Address finding: [finding title]"
3. Sets `responsible_person`: department head from linked department
4. Sets `target_date`: finding creation date + 30 days (configurable)
5. Sets `status`: "Not Started"
6. Sends email notification to department head via `notifyFindingCreated()`

### 11.3 Action Tracking

**Screen:** Action Tracking (`ActionTracking.tsx`)  
**Table:** `ia_action_tracking`

| Field | Type | Description |
|-------|------|-------------|
| `finding_id` | UUID | Linked finding |
| `action_description` | TEXT | What needs to be done |
| `responsible_person` | UUID | Assigned person (from profiles) |
| `target_date` | DATE | Due date |
| `status` | TEXT | Not Started / Open / In Progress / Completed / Overdue |

Supplementary tables:
- `ia_action_plan_milestones` — Milestone tracking within action plans
- `ia_action_plan_updates` — Progress update log

### 11.4 Management Responses

**Screen:** Management Responses (`ManagementResponses.tsx`)  
**Table:** `ia_management_responses`

- Department head responds to each finding
- Response attached to finding record
- Triggers finding status change to next lifecycle stage

### 11.5 Follow-Up Tracker

**Screen:** Follow-Up Tracker (`FollowUpTracker.tsx`)  
**Table:** `ia_follow_ups`

- Tracks verification of completed corrective actions
- Links back to action tracking records
- Supports multiple follow-up rounds per action

---

## 12. Audit Closure

### 12.1 Quality Assurance Review

**Screen:** Quality Assurance Review (`QualityReview.tsx`)  
**Tables:** `ia_quality_reviews`, `ia_quality_review_checklist`

| Feature | Description |
|---------|-------------|
| Independent review | Evaluates audit quality by independent reviewer |
| Quality rating | Scored assessment |
| Checklist | Structured QA criteria from `ia_quality_review_checklist` |
| Required rework | Flag findings/papers needing revision |
| Electronic signature | `signed_by`, `signature_date`, `signature_reference`, `signature_image_url` |

### 12.2 Plan Closeout

**Screen:** Plan Closeout (`PlanCloseout.tsx`)

Closure prerequisites:
1. ✅ All findings recorded
2. ✅ Management responses submitted
3. ✅ Corrective actions assigned
4. ✅ Quality review completed

| Feature | Description |
|---------|-------------|
| Closure checklist | All prerequisites verified |
| Final sign-off | Electronic signature |
| Status change | Audit status → Closed |
| Report generation | Final audit report created |

### 12.3 Governance Requirements
- **Internally Approved** plan status requires upload of committee meeting minutes
- Electronic signatures captured at 5 points: Annual Plan approval, Engagement approval, Report sign-off, Closeout sign-off, Quality Review sign-off
- Signature fields: `signed_by`, `signature_date`, `signature_reference`, `signature_image_url`

---

## 13. Reporting & Dashboards

### 13.1 Executive Dashboard (`ExecutiveDashboard.tsx`)

KPI metrics:
- Total audits (planned / completed / in-progress)
- Open findings by severity
- Overdue corrective actions
- Risk coverage percentage
- Audit completion rate

### 13.2 Risk Heat Map

**Component:** `RiskHeatMap.tsx`

- Recharts scatter plot visualization
- X-axis: Likelihood, Y-axis: Impact
- Color-coded by risk level (Low=green, Medium=amber, High=red, Critical=dark red)
- Interactive tooltips showing department/function details

### 13.3 Audit History Timeline

**Component:** `AuditHistoryTimeline.tsx`

Per-department view:
- Chronological timeline of past audits
- Findings count and severity trend
- Risk level evolution over time
- Corrective action completion rates

### 13.4 Audit Reports (`AuditReports.tsx`)
- Table: `ia_audit_reports`
- Final audit reports linked to plans
- PDF and Excel export

### 13.5 Committee Reports (`CommitteeReports.tsx`)
- Board/committee-level reporting
- Aggregated audit status and risk overview

### 13.6 Report Builder (`ReportBuilder.tsx`)
- Custom report construction
- Field selection and filtering
- Multi-format export (PDF/Excel)

### 13.7 Letter Generation (`LetterGeneration.tsx`)
- Template-based letter creation from `ia_document_templates`
- Merge fields from audit data
- Preview via `ReportPreviewDialog.tsx`

---

## 14. Communication & Collaboration

### 14.1 Discussion Threads

**Component:** `DiscussionThread.tsx`  
**Hook:** `useAuditDiscussions.ts`  
**Tables:** `ia_discussion_threads`, `ia_discussion_comments`

| Feature | Description |
|---------|-------------|
| Entity-agnostic | Attach to any audit record via `entity_type` + `entity_id` |
| Realtime | Supabase Realtime subscription on `ia_discussion_comments` |
| @Mentions | Tag auditors/profiles; `mentioned_users` stored as UUID[] |
| Chronological | Comments ordered by `created_at` ascending |
| Auto-create thread | Creates thread on first comment if none exists |

#### Usage Pattern
```typescript
import { useAuditDiscussions } from '@/hooks/useAuditDiscussions';

const { thread, comments, createThread, addComment, isLoading } = 
  useAuditDiscussions('finding', findingId);
```

### 14.2 Communication Center (`CommunicationCenter.tsx`)
- Table: `ia_communications`
- Template-based email composition
- Uses `TemplateCommunicationDialog.tsx`

---

## 15. Email Notifications

### 15.1 Notification Service

**Service:** `src/services/auditNotificationService.ts`

All notifications routed through the `send-notification` edge function → **Resend API**.

### 15.2 Lifecycle Notification Triggers

| Event | Function | Recipients |
|-------|----------|-----------|
| Plan submitted for review | `notifyPlanSubmitted(planId, title, leadAuditorId)` | Lead Auditor |
| Plan approved | `notifyPlanApproved(planId, title, deptId, teamIds)` | Team members + Dept Head |
| Dept acceptance required | `notifyDeptAcceptanceRequired(planId, title, deptId)` | Department Head |
| Finding created | `notifyFindingCreated(title, deptId)` | Department Head |
| Action assigned | `notifyActionAssigned(description, email, dueDate)` | Responsible person |
| Action overdue | `notifyActionOverdue(description, email, dueDate)` | Responsible person |
| Action reminder | `notifyActionReminder(description, email, dueDate, days)` | Responsible person |

### 15.3 Automated Due Date Reminders

**Edge Function:** `supabase/functions/audit-due-date-reminders/index.ts`

| Trigger Point | Action |
|---------------|--------|
| 7 days before `target_date` | Send reminder email |
| 3 days before `target_date` | Send reminder email |
| 1 day before `target_date` | Send urgent reminder |
| Past `target_date` | Send overdue alert + auto-update status to "Overdue" |

**Logic:**
1. Queries `ia_action_tracking` where `status` IN ('Not Started', 'In Progress', 'Open') AND `target_date` IS NOT NULL
2. Calculates days remaining for each action
3. Matches against reminder days [7, 3, 1] or overdue
4. Looks up responsible person's email from `profiles`
5. Invokes `send-notification` for each matching action
6. Auto-updates status to "Overdue" for past-due items

### 15.4 Email Delivery Infrastructure

**Edge Function:** `supabase/functions/send-notification/index.ts`

| Feature | Detail |
|---------|--------|
| Provider | Resend API (`https://api.resend.com/emails`) |
| API Key | `RESEND_API_KEY` environment variable |
| Fallback | Queues notification for manual processing if no API key |
| Logging | `notification_logs` + `system_technical_logs` + `system_integration_logs` |
| Correlation | UUID-based `x-correlation-id` header for tracing |
| Default From | "SSBM Internal Audit" `<noreply@system.local>` |
| Status Tracking | sent / queued / failed with `resend_message_id` |

---

## 16. Administration & Configuration

### 16.1 System Configuration (`AuditConfig.tsx`)
Tables: `ia_audit_config`, `ia_audit_settings`

Configurable settings:
- Risk scoring weights per factor category
- Risk classification thresholds (Low/Medium/High/Critical score ranges)
- Likelihood scale (1-5 labels and values)
- Impact scale (1-5 labels and values)
- Control effectiveness reduction percentages
- Audit frequency recommendations per risk level
- Reminder day configuration (default: 7, 3, 1)
- Auto corrective action generation toggle (default: on)
- Default corrective action due days (default: 30)

### 16.2 SLA & Escalation Rules (`SLARules.tsx`)
Tables: `ia_sla_rules`, `ia_escalation_rules`
- Define SLA targets for each audit lifecycle stage
- Configure escalation triggers, thresholds, and recipients
- Auto-escalation based on SLA breach

### 16.3 Department Master (`DepartmentMaster.tsx`)
Table: `ia_departments`

| Feature | Detail |
|---------|--------|
| Office integration | `office_code` links to `tb_office` |
| Department integration | `source_department_id` links to `tb_office_departments` |
| Cascading selection | Office → Department dropdown flow |
| Head profile | `head_profile_id` links to `profiles` table |
| Auto-populate | Selecting head auto-fills email and phone fields |
| "Other" fallback | Manual text entry for entities not in central system |
| Deactivation | Inactive source departments marked "(Inactive)" and disabled for new selections |
| Bulk upload | Disabled per architectural constraint |

### 16.4 Function Master (`FunctionMaster.tsx`)
Table: `ia_department_functions`
- Functions defined per department
- `historical_risk_adjustment` field for automated risk scoring
- Links to risk assessment and RCM hierarchy

### 16.5 Templates (`TemplatesManagement.tsx`)
Table: `ia_document_templates`
- Letter, report, and communication templates
- Merge field support for dynamic data insertion
- Template versioning and categorization

---

## 17. Integration Points

### 17.1 Platform Integration

| External System | Table/Service | Integration Method |
|----------------|---------------|-------------------|
| Office Master | `tb_office` | Direct FK (`office_code`) |
| Department Master | `tb_office_departments` | Direct FK (`source_department_id`) |
| User Profiles | `profiles` | Direct FK (`head_profile_id`, auditor links) |
| RBAC System | `app_modules`, permissions | Permission checks on route access |
| File Storage | `ia-evidence` bucket | Supabase Storage SDK |
| Email Service | `send-notification` edge function | Supabase Functions invoke |
| Realtime | `ia_discussion_comments` | Supabase Realtime subscription |

### 17.2 Data Flow Diagram
```
tb_office ──────────┐
                     ├──▶ ia_departments ──▶ ia_department_functions ──▶ Risk Assessment
tb_office_departments┘                                                        │
                                                                               ▼
profiles ──▶ ia_auditors ──▶ Audit Team Assignment                     Audit Planning
                                    │                                        │
                                    ▼                                        ▼
                              ia_department_audits ──▶ ia_audit_engagements
                                    │
                                    ▼
                              ia_activities ──▶ ia_evidence + ia_working_papers
                                    │
                                    ▼
                              ia_findings ──▶ ia_action_tracking ──▶ ia_follow_ups
                                    │
                                    ▼
                              ia_quality_reviews ──▶ Plan Closeout ──▶ ia_audit_reports
```

---

## 18. Security & Permissions

### 18.1 Permission Matrix

| Permission | Description | Screens |
|------------|-------------|---------|
| `configure_audit_system` | System administration | Config, Dept Master, Function Master, Risk Assessment, SLA Rules, Templates, Auditor Profiles |
| `create_audit_plans` | Plan creation and management | Plans, Engagements, Programs, Preparation, Letters, Communication Center |
| `approve_audit_plans` | Plan approval authority | Plan Approval |
| `assign_auditors` | Resource management | Workload, Leave, Holidays |
| `view_audit_assignments` | Read-only assignments | Management Responses, Calendar |
| `execute_audit_activities` | Fieldwork execution | Activity Workbench, Control Testing, Time Tracking |
| `enter_audit_findings` | Finding documentation | Evidence, Working Papers, Findings, RCM, Report Builder |
| `manage_audit_followups` | Follow-up management | Action Tracking, Follow-Up Tracker |
| `approve_audit_closeouts` | Closure authority | Plan Closeout, Quality Review |
| `generate_reports` | Report access | Executive Dashboard, Audit Reports, Committee Reports |

### 18.2 Audit Trail Standards
- All mutations use `useAuditTrail` hook providing `getCreateFields()` and `getUpdateFields()`
- Fields injected: `created_by`, `updated_by` (5-character `user_code` from logged-in user)
- Server-side timestamps for all records
- Approval decisions logged in `ia_approval_actions` with performer, comments, timestamp
- No RLS — only role-based security per architectural constraint

---

## 19. Edge Functions

### 19.1 Deployed Edge Functions

| Function | Location | Purpose | Trigger |
|----------|----------|---------|---------|
| `send-notification` | `supabase/functions/send-notification/` | Email delivery via Resend | Invoked by notification service |
| `audit-due-date-reminders` | `supabase/functions/audit-due-date-reminders/` | Due date monitoring & alerts | Scheduled / manual HTTP call |

### 19.2 Required Secrets
| Secret | Function | Purpose |
|--------|----------|---------|
| `RESEND_API_KEY` | `send-notification` | Resend email API authentication |
| `SUPABASE_URL` | Both | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Both | Auto-provided |

---

## 20. Feature Flags

All 34 module flags defined in `src/config/auditRouteConfig.ts` — **all currently enabled** (✅).

```typescript
export const AUDIT_FEATURE_FLAGS = {
  FEATURE_AUDIT_AUDITOR_PROFILES: true,
  FEATURE_AUDIT_WORKLOAD_CAPACITY: true,
  FEATURE_AUDIT_LEAVE_MANAGEMENT: true,
  FEATURE_AUDIT_HOLIDAY_MANAGEMENT: true,
  FEATURE_AUDIT_TIME_TRACKING: true,
  FEATURE_AUDIT_RISK_ASSESSMENT: true,
  FEATURE_AUDIT_PLANS: true,
  FEATURE_AUDIT_PLAN_APPROVAL: true,
  FEATURE_AUDIT_ENGAGEMENTS: true,
  FEATURE_AUDIT_PROGRAMS: true,
  FEATURE_AUDIT_PREPARATION: true,
  FEATURE_AUDIT_RCM: true,
  FEATURE_AUDIT_CONTROL_TESTING: true,
  FEATURE_AUDIT_ACTIVITY_CALENDAR: true,
  FEATURE_AUDIT_ACTIVITY_WORKBENCH: true,
  FEATURE_AUDIT_EVIDENCE_MANAGEMENT: true,
  FEATURE_AUDIT_WORKING_PAPERS: true,
  FEATURE_AUDIT_FINDINGS: true,
  FEATURE_AUDIT_MANAGEMENT_RESPONSES: true,
  FEATURE_AUDIT_ACTION_TRACKING: true,
  FEATURE_AUDIT_FOLLOWUP_TRACKER: true,
  FEATURE_AUDIT_QUALITY_REVIEW: true,
  FEATURE_AUDIT_PLAN_CLOSEOUT: true,
  FEATURE_AUDIT_EXECUTIVE_DASHBOARD: true,
  FEATURE_AUDIT_REPORTS: true,
  FEATURE_AUDIT_COMMITTEE_REPORTS: true,
  FEATURE_AUDIT_LETTER_GENERATION: true,
  FEATURE_AUDIT_REPORT_BUILDER: true,
  FEATURE_AUDIT_COMMUNICATION_CENTER: true,
  FEATURE_AUDIT_SYSTEM_CONFIG: true,
  FEATURE_AUDIT_SLA_RULES: true,
  FEATURE_AUDIT_DEPARTMENT_MASTER: true,
  FEATURE_AUDIT_FUNCTION_MASTER: true,
  FEATURE_AUDIT_TEMPLATES: true,
} as const;
```

---

## 21. File Structure

### Pages (39 files)
```
src/pages/audit/
├── ActionTracking.tsx          ├── LeaveManagement.tsx
├── ActivityCalendar.tsx        ├── LetterGeneration.tsx
├── ActivityWorkbench.tsx       ├── ManagementResponses.tsx
├── AuditConfig.tsx             ├── PlanApproval.tsx
├── AuditDashboard.tsx          ├── PlanCloseout.tsx
├── AuditEngagements.tsx        ├── QualityReview.tsx
├── AuditModuleUnderActivation.tsx ├── ReportBuilder.tsx
├── AuditPlansNew.tsx           ├── RiskAssessment.tsx
├── AuditPreparation.tsx        ├── RiskControlMatrix.tsx
├── AuditPrograms.tsx           ├── SLARules.tsx
├── AuditReports.tsx            ├── TemplatesManagement.tsx
├── AuditUniverse.tsx           ├── TimeTracking.tsx
├── AuditorProfiles.tsx         ├── WorkingPapers.tsx
├── CommitteeReports.tsx        ├── WorkloadCapacity.tsx
├── CommunicationCenter.tsx     ├── DepartmentView.tsx
├── ControlTesting.tsx          ├── ExecutiveDashboard.tsx
├── DepartmentMaster.tsx        ├── EvidenceManagement.tsx
├── FindingsManagement.tsx      ├── FollowUpTracker.tsx
├── FunctionMaster.tsx          └── HolidayManagement.tsx
```

### Components (12 files)
```
src/components/audit/
├── ActivityRescheduleDialog.tsx  ├── DiscussionThread.tsx
├── ActivityScheduleForm.tsx     ├── PlanAmendmentHistory.tsx
├── AnnualPlanForm.tsx           ├── ReportPreviewDialog.tsx
├── AuditFeatureGate.tsx         ├── RiskHeatMap.tsx
├── AuditHistoryTimeline.tsx     ├── TemplateCommunicationDialog.tsx
├── AuditPlanForm.tsx            └── DepartmentAuditForm.tsx
```

### Hooks (9 files)
```
src/hooks/
├── useAuditConfigData.ts     ├── useAuditDiscussions.ts
├── useAuditData.ts           ├── useAuditPreparation.ts
├── useAuditDataExtended.ts   ├── useAuditReports.ts
├── useAuditDataExtended2.ts  └── useAuditTrail.ts
├── useAuditDataPhase2.ts
```

### Services (2 files)
```
src/services/
├── auditNotificationService.ts
└── auditService.ts
```

### Edge Functions (2 functions)
```
supabase/functions/
├── audit-due-date-reminders/index.ts
└── send-notification/index.ts
```

### Configuration (1 file)
```
src/config/auditRouteConfig.ts
```

---

## 22. Remaining Items

### Phase 6 Completion (Pending)
| Item | Description | Priority |
|------|-------------|----------|
| Wire DiscussionThread into modals | Integrate `DiscussionThread.tsx` into finding/activity/plan detail modals | Medium |
| `calculate_historical_risk_adjustment` DB function | PostgreSQL function to auto-calculate from closed audit findings | Medium |
| Integrate RiskHeatMap into Dashboard | Add heat map to Executive Dashboard | Low |
| AuditHistory page/tab | Dedicated per-department audit history view | Low |
| Cron job for reminders | Set up scheduled invocation for `audit-due-date-reminders` | High |

### Future Enhancements
| Item | Description |
|------|-------------|
| Bulk audit operations | Bulk status updates, bulk team assignments |
| Audit program templates | Reusable program templates per department type |
| Risk trend analytics | Multi-year risk score trend visualization |
| Mobile-responsive execution | Optimized mobile view for fieldwork activities |
| DMS integration | Final storage location pending confirmation with stakeholders |

---

## Appendix A: Navigation Sidebar Order

The sidebar follows the correct audit lifecycle:

```
Executive Dashboard (overview)
───────────────────────────────
Audit Universe → Risk Assessment (Governance)
───────────────────────────────
Auditor Profiles → Workload → Time Tracking → Leave → Holidays (Resources)
───────────────────────────────
Audit Plans → Plan Approval → Audit Engagements → Audit Programs (Planning)
───────────────────────────────
Audit Preparation → Activity Calendar → Activity Workbench → Control Testing (Execution)
───────────────────────────────
Evidence → Working Papers → Findings (Documentation)
───────────────────────────────
Management Responses → Action Tracking → Follow-Up Tracker (Response)
───────────────────────────────
Quality Review → Plan Closeout (Closure)
───────────────────────────────
Audit Reports → Committee Reports → Letter Generation → Report Builder (Reporting)
───────────────────────────────
Communication Center
───────────────────────────────
System Configuration → SLA Rules → Department Master → Function Master → Templates (Admin)
```

---

*End of Document*
