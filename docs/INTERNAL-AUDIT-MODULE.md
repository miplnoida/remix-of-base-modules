# Internal Audit Module — Complete Documentation

**Module:** Internal Audit  
**Application:** SSB Admin Portal  
**Last Updated:** 2026-02-26  
**Status:** Active — Prototype stage (Lovable Cloud backend)

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Navigation & Routes](#2-navigation--routes)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Core Entities & Data Model](#4-core-entities--data-model)
5. [Functional Areas](#5-functional-areas)
   - 5.1 [Audit Planning](#51-audit-planning)
   - 5.2 [Audit Execution](#52-audit-execution)
   - 5.3 [Findings & Responses](#53-findings--responses)
   - 5.4 [Follow-Up & Action Tracking](#54-follow-up--action-tracking)
   - 5.5 [Evidence Management](#55-evidence-management)
   - 5.6 [Working Papers](#56-working-papers)
   - 5.7 [Communication & Letter Generation](#57-communication--letter-generation)
   - 5.8 [Reporting](#58-reporting)
6. [Master Data Management](#6-master-data-management)
   - 6.1 [Department Master](#61-department-master)
   - 6.2 [Function Master](#62-function-master)
   - 6.3 [Auditor Profiles](#63-auditor-profiles)
   - 6.4 [Holiday Management](#64-holiday-management)
7. [Resource Management](#7-resource-management)
   - 7.1 [Workload & Capacity](#71-workload--capacity)
   - 7.2 [Leave Management](#72-leave-management)
8. [Audit Checklists](#8-audit-checklists)
9. [Document Templates](#9-document-templates)
10. [Configuration](#10-configuration)
11. [File Structure](#11-file-structure)
12. [Type Definitions Reference](#12-type-definitions-reference)
13. [Mock Data & Sample Records](#13-mock-data--sample-records)
14. [Integration Points](#14-integration-points)
15. [Business Rules & Validations](#15-business-rules--validations)

---

## 1. Module Overview

The Internal Audit Module provides a comprehensive platform for the SSB (Social Security Board) Internal Audit Department to plan, execute, document, and track internal audits across all SSB departments.

### Key Capabilities

| Capability | Description |
|---|---|
| **Annual Planning** | Create and approve annual audit plans covering all departments |
| **Department Audits** | Plan and execute audits at the department/function level |
| **Activity Scheduling** | Schedule audit activities with calendar integration |
| **Fieldwork Execution** | Conduct audit activities with evidence collection |
| **Findings Management** | Document findings using Condition-Criteria-Cause-Effect format |
| **Management Responses** | Collect and track management responses to findings |
| **Action Tracking** | Monitor implementation of agreed corrective actions |
| **Working Papers** | Create, review, and approve working papers |
| **Evidence Management** | Upload, tag, and hash evidence files |
| **Communication** | Generate formal audit communications from templates |
| **Reporting** | Build and distribute audit reports |
| **Resource Management** | Track auditor workload, leave, and availability |

### Architecture Notes

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — temporary for prototyping
- **Target Backend:** ASP.NET Web APIs + MS-SQL Server
- **Data:** Currently uses mock data files (`src/data/auditData.ts`); designed for API-first migration
- **No RLS:** Per architectural rule, Row Level Security is not used. Authorization is role-based at the application layer.

---

## 2. Navigation & Routes

All Internal Audit routes are prefixed under the main application routing structure.

| Route | Page Component | Description |
|---|---|---|
| `/audit/plans` | `AuditPlans` | Legacy audit plans (employer-focused) |
| `/audit/plans-new` | `AuditPlansNew` | New annual + department audit planning |
| `/audit/plan-approval` | `PlanApproval` | Approve/reject submitted plans |
| `/audit/activity-calendar` | `ActivityCalendar` | Calendar view of audit activities |
| `/audit/activity-workbench` | `ActivityWorkbench` | Execute audit activities |
| `/audit/follow-up-tracker` | `FollowUpTracker` | Track follow-up actions |
| `/audit/plan-closeout` | `PlanCloseout` | Close out completed plans |
| `/audit/reports` | `AuditReports` | Audit reports dashboard |
| `/audit/report-builder` | `ReportBuilder` | Build custom audit reports |
| `/audit/config` | `AuditConfig` | Module configuration |
| `/audit/auditor-profiles` | `AuditorProfiles` | Manage auditor profiles |
| `/audit/workload-capacity` | `WorkloadCapacity` | Workload and capacity planning |
| `/audit/leave-management` | `LeaveAndVacationManagement` | Leave requests and approvals |
| `/audit/holiday-management` | `HolidayManagement` | Public holidays and SSB-specific holidays |
| `/audit/evidence-management` | `EvidenceManagement` | Evidence repository |
| `/audit/working-papers` | `WorkingPapers` | Working papers management |
| `/audit/findings` | `FindingsManagement` | Findings management |
| `/audit/management-responses` | `ManagementResponses` | Management responses tracking |
| `/audit/action-tracking` | `ActionTracking` | Action implementation tracking |
| `/audit/letter-generation` | `LetterGeneration` | Generate formal letters |
| `/audit/communication-center` | `CommunicationCenter` | Communication hub |
| `/audit/department-master` | `DepartmentMaster` | Department master list |
| `/audit/function-master` | `FunctionMaster` | Function/risk register |
| `/audit/departments/:id` | `DepartmentView` | Department detail view |

---

## 3. User Roles & Permissions

| Role | Access Level | Key Permissions |
|---|---|---|
| **Audit Director** | Full | Approve annual plans, final report sign-off, configuration, all views |
| **Audit Manager** | Management | Create/submit plans, assign auditors, review working papers, approve leave |
| **Auditor** | Execution | Execute activities, collect evidence, draft findings, create working papers |
| **Admin** | Read/Support | View reports, compliance monitoring, documentation support |

### Role Hierarchy

```
Audit Director (Lead)
  └── Audit Manager (Senior)
        └── Auditor (Senior / Mid / Junior)
              └── Admin (Junior)
```

---

## 4. Core Entities & Data Model

### Entity Relationship Overview

```
AnnualAuditPlan (1) ──── (N) DepartmentAuditPlan
                                    │
                                    ├── (N) AuditActivity
                                    │         ├── (N) Evidence
                                    │         ├── (N) ProcedureStep
                                    │         ├── (N) AuditActivityResult
                                    │         └── (N) AuditFollowUp
                                    │
                                    ├── (N) Finding
                                    │         ├── (N) Recommendation
                                    │         ├── (1) ManagementResponse
                                    │         └── (1) ActionTracking
                                    │
                                    ├── (N) WorkingPaper
                                    ├── (N) AuditCommunication
                                    └── (N) Evidence

Department (1) ──── (N) DepartmentFunction
Auditor (1) ──── (N) AuditorWorkload
Auditor (1) ──── (N) AuditorAvailability
Auditor (1) ──── (N) LeaveRequest
Auditor (1) ──── (N) AuditorKPI
```

### Primary Entities

| Entity | Description | Key Fields |
|---|---|---|
| `AnnualAuditPlan` | Master plan for the fiscal year | id, fiscalYear, title, objective, scope, methodology, status |
| `DepartmentAuditPlan` | Department-specific audit within annual plan | id, annualPlanId, departmentId, period, functions, riskRating, status |
| `AuditActivity` | Individual audit activity/task | id, departmentAuditId, functionArea, type, controlArea, status |
| `Finding` | Audit finding (Condition-Criteria-Cause-Effect) | id, findingId, activityId, riskRating, impactArea, status |
| `Recommendation` | Recommendation linked to a finding | id, findingId, priority, targetDate, status |
| `ManagementResponse` | Department's response to a finding | id, findingId, actionPlan, targetDate, status |
| `ActionTracking` | Tracks implementation of corrective actions | id, findingId, actionStatus, evidenceOfImplementation |
| `Evidence` | Uploaded evidence files with hash integrity | id, evidenceId, activityId, file, hash, tags |
| `WorkingPaper` | Formal audit working paper | id, workingPaperId, title, procedure, results, conclusion, status |
| `AuditCommunication` | Formal audit communication record | id, departmentAuditId, templateType, status |
| `AuditFollowUp` | Follow-up action item | id, activityId, actionRequired, dueDate, status, priority |

---

## 5. Functional Areas

### 5.1 Audit Planning

#### Annual Audit Plan

The annual plan is the top-level planning entity for each fiscal year.

**Workflow:**
```
Draft → Submitted → Approved → In Progress → Completed → Closed
```

**Fields:**
- Fiscal Year (e.g., `FY2025`)
- Title, Objective, Scope, Methodology
- Created By, Created Date
- Submitted Date, Reviewed By/Date
- Approved By/Date, Approval Comments
- Total Department Audits count

**Form Component:** `src/components/audit/AnnualPlanForm.tsx`

#### Department Audit Plan

Each department audit is linked to an annual plan and covers specific functions within a department.

**Workflow:**
```
Draft → Planned → Scheduled → Submitted → Approved → In Progress → Completed → Cancelled
```

**Fields:**
- Annual Plan ID (parent link)
- Department ID & Name
- Period: Q1, Q2, Q3, Q4, Monthly, Quarterly, Annual
- Month/Year
- Functions to audit (array of function names)
- Objective, Scope, Risk Rating (Low/Medium/High)
- Lead Auditor, Team Members
- Planned Start/End, Actual Start/End

**Form Component:** `src/components/audit/DepartmentAuditForm.tsx`

**Page:** `src/pages/audit/AuditPlansNew.tsx`

#### Legacy Audit Plans (Employer-Focused)

The original planning model focused on employer compliance audits by zone. This is maintained for backward compatibility.

**Page:** `src/pages/audit/AuditPlans.tsx`

### 5.2 Audit Execution

#### Audit Activities

Individual tasks/activities assigned to auditors within a department audit.

**Activity Types:**
- Compliance Check
- Records Review
- Process Review
- Document Verification
- System Testing
- Interview
- Site Visit
- Contribution Verification
- Payroll Sampling
- Other

**Control Areas:**
- Contributions
- Benefits
- Finance/AP
- IT
- HR
- Compliance
- Operations
- Other

**Status Lifecycle:**
```
Planned → Scheduled → In Progress → Completed / Cancelled / Rescheduled
```

**Key Fields:**
- Function Area being audited
- Checklist Template ID (optional)
- Evidence Expected (array)
- Assigned Auditors
- Planned/Actual date ranges
- Priority: Low / Medium / High

**Pages:**
- `src/pages/audit/ActivityWorkbench.tsx` — Execute activities
- `src/pages/audit/ActivityCalendar.tsx` — Calendar view

**Supporting Components:**
- `src/components/audit/ActivityScheduleForm.tsx`
- `src/components/audit/ActivityRescheduleDialog.tsx`

#### Procedure Steps

Each activity can have multiple procedure steps for structured testing.

| Field | Description |
|---|---|
| stepNo | Step sequence number |
| procedureDesc | Description of the procedure |
| sampleSize | Number of items to test |
| population | Total population size |
| criteria | Testing criteria |
| status | Pending / In Progress / Completed |

#### Activity Results

Recorded upon completion of an activity.

| Field | Description |
|---|---|
| observations | Auditor observations |
| findings | Summary of findings |
| complianceStatus | Compliant / Partially Compliant / Non-Compliant |
| monetaryVariance | Financial impact amount |
| recommendation | Auditor recommendation |
| followUpRequired | Boolean flag |

### 5.3 Findings & Responses

#### Findings

Documented using the **Condition-Criteria-Cause-Effect** (CCCE) methodology.

**Finding Status Workflow:**
```
Draft → For Mgmt Response → Under Review → Agreed / Not Agreed → Finalized
```

**Key Fields:**
| Field | Description |
|---|---|
| findingId | Formatted ID (e.g., `F-2025-001`) |
| title | Finding title |
| condition | What was found (the problem) |
| criteria | What should have been (the standard) |
| cause | Why it happened (root cause) |
| effect | What is the impact |
| riskRating | High / Medium / Low |
| impactArea | Financial / Compliance / Operational / IT / Other |
| ownerRole | Responsible department head |

**Page:** `src/pages/audit/FindingsManagement.tsx`

#### Recommendations

Each finding can have multiple recommendations.

| Field | Description |
|---|---|
| recommendationText | Detailed recommendation |
| priority | High / Medium / Low |
| targetDate | Expected implementation date |
| responsibleParty | Who should implement |
| status | Pending / Accepted / Rejected / Implemented |

#### Management Responses

Department heads submit responses to audit findings.

**Response Status:**
```
Draft → Submitted → Under Review → Accepted
```

**Fields:**
- Response Text
- Action Plan (detailed steps)
- Responsible Person
- Target Date
- Supporting Documents

**Page:** `src/pages/audit/ManagementResponses.tsx`

### 5.4 Follow-Up & Action Tracking

#### Follow-Up Tracker

Tracks all follow-up actions arising from audit activities.

**Status:** Open → In Progress → Resolved / Overdue

**Responsible Parties:**
- Department Head
- Audit Team
- Management
- Employer
- Audit Department
- Other

**Page:** `src/pages/audit/FollowUpTracker.tsx`

#### Action Tracking

Monitors implementation of corrective actions for specific findings.

**Status:** Not Started → In Progress → Implemented → Verified → Closed

**Fields:**
- Evidence of Implementation (file references)
- Verified By / Verification Date
- Notes

**Page:** `src/pages/audit/ActionTracking.tsx`

### 5.5 Evidence Management

Evidence files are uploaded, catalogued, and integrity-hashed.

**Key Fields:**
| Field | Description |
|---|---|
| evidenceId | Formatted ID (e.g., `EV-2025-001`) |
| file | File name |
| fileName, fileType, fileSize | File metadata |
| description | Description of the evidence |
| referenceNo | Working paper reference |
| hash | SHA-256 hash for integrity |
| uploadedBy | Auditor who uploaded |
| tags | Categorization tags (array) |

**Linkages:** Evidence can be linked to:
- Annual Plan
- Department Audit
- Activity
- Finding

**Page:** `src/pages/audit/EvidenceManagement.tsx`

### 5.6 Working Papers

Formal audit working papers with versioning and approval workflow.

**Status Workflow:**
```
Draft → Under Review → Approved
```

**Key Fields:**
| Field | Description |
|---|---|
| workingPaperId | Formatted ID (e.g., `WP-2025-001`) |
| title | Working paper title |
| objective | Audit objective |
| auditArea | Department/area being audited |
| procedure | Audit procedures applied |
| testPerformed | Description of tests |
| evidenceIds | Linked evidence file IDs |
| results | Test results |
| observations | Auditor observations |
| conclusion | Auditor conclusion |
| linkedFindingIds | Findings arising from this work |
| version | Version number (incremented on save) |
| auditTrail | Array of action records (Created/Modified/Reviewed/Approved) |

**Page:** `src/pages/audit/WorkingPapers.tsx`

### 5.7 Communication & Letter Generation

#### Document Templates

Pre-defined templates for formal audit communications.

**Template Types:**
| Type | Purpose |
|---|---|
| Notice of Audit | Engagement letter to department head |
| PBC Request | Provided-by-client document request |
| Reminder/Escalation | Follow-up reminders |
| Exit Meeting Invite | Invite for audit exit meeting |
| Draft Report Transmittal | Transmit draft report for review |
| Final Report Transmittal | Transmit final approved report |
| Follow-up Notice | Follow-up on outstanding actions |
| Management Response Request | Request management response to findings |

**Merge Fields:** Templates support dynamic placeholders like `{{dept_head_name}}`, `{{plan_title}}`, `{{planned_start}}`, etc.

**Communication Status:** Draft → Sent → Acknowledged

**Pages:**
- `src/pages/audit/LetterGeneration.tsx`
- `src/pages/audit/CommunicationCenter.tsx`

**Component:** `src/components/audit/TemplateCommunicationDialog.tsx`

### 5.8 Reporting

#### Report Builder

Custom report generation for audit results and statistics.

**Page:** `src/pages/audit/ReportBuilder.tsx`

#### Audit Reports Dashboard

Pre-built reports and analytics.

**Page:** `src/pages/audit/AuditReports.tsx`

#### Report Preview

**Component:** `src/components/audit/ReportPreviewDialog.tsx`

---

## 6. Master Data Management

### 6.1 Department Master

SSB departments that can be audited.

**Current Departments:**
| Department | Head | Risk Rating | Location |
|---|---|---|---|
| Benefits Department | Sarah Williams | High | Main Building - Floor 2 |
| Contributions Department | Michael Brown | High | Main Building - Floor 3 |
| Finance & Accounts Payable | Jennifer Davis | High | Main Building - Floor 1 |
| IT Department | Robert Johnson | Medium | Annex Building |
| Human Resources | Lisa Martinez | Low | Main Building - Floor 4 |
| Compliance & Legal | David Thompson | Medium | Main Building - Floor 5 |

**Pages:**
- `src/pages/audit/DepartmentMaster.tsx` — List & manage
- `src/pages/audit/DepartmentView.tsx` — Detail view

### 6.2 Function Master

Each department has auditable functions with risk assessments.

**Function Fields:**
| Field | Description |
|---|---|
| functionName | Name of the function |
| description | What the function does |
| riskRating | Low / Medium / High |
| likelihood | Likelihood of risk materializing |
| impact | Impact if risk materializes |
| controlEffectiveness | Effective / Partially Effective / Ineffective |
| lastAuditDate | When last audited |
| nextAuditDate | When next audit is due |
| responsiblePerson | Function owner |

**Risk Matrix:** Likelihood × Impact → Risk Rating

**Page:** `src/pages/audit/FunctionMaster.tsx`

### 6.3 Auditor Profiles

**Auditor Fields:**
| Field | Description |
|---|---|
| name | Full name |
| employeeNo | Employee number |
| email, phone | Contact info |
| role | Audit Director / Audit Manager / Auditor / Admin |
| skills | Array of skills (e.g., "Payroll Audit", "IT Audit") |
| certifications | Professional certifications (e.g., CIA, CISA, CFE, CPA) |
| seniorityLevel | Junior / Mid / Senior / Lead |
| employmentStatus | Active / Inactive |
| workLocation | Office location |
| supervisorId | Supervisor reference |
| signatureImage | Digital signature (optional) |

**Current Auditor Team:**
| Name | Role | Seniority | Certifications |
|---|---|---|---|
| Director Audit Services | Audit Director | Lead | CIA, CISA, CFE |
| Manager Internal Audit | Audit Manager | Senior | CIA, CPA |
| John Doe | Auditor | Senior | CIA, CISA |
| Alice Smith | Auditor | Mid | CIA |
| Compliance Reader | Admin | Junior | — |

**Page:** `src/pages/audit/AuditorProfiles.tsx`

### 6.4 Holiday Management

Manages public holidays and SSB-specific holidays that affect audit scheduling.

**Fields:**
- Date
- Name
- Country (St. Kitts & Nevis)
- Is SSB-Specific (boolean)

**Page:** `src/pages/audit/HolidayManagement.tsx`

---

## 7. Resource Management

### 7.1 Workload & Capacity

Tracks auditor workload allocation for each fiscal year.

**Fields:**
| Field | Description |
|---|---|
| auditorId | Reference to auditor |
| fiscalYear | Fiscal year |
| assignedHours | Total hours allocated |
| bookedHours | Hours already committed |
| remainingHours | Available capacity |

**KPI Tracking:**
- Audits Completed
- Findings Quality Score
- On-Time Rate (percentage)

**Page:** `src/pages/audit/WorkloadCapacity.tsx`

### 7.2 Leave Management

Leave request and approval system for audit team.

**Leave Types:** Annual, Sick, Training, Other

**Status Workflow:**
```
Draft → Submitted → Approved / Rejected
```

**Fields:**
- Auditor, Leave Type
- Start Date, End Date
- Reason, Attachment (optional)
- Approver, Decision Note

**Page:** `src/pages/audit/LeaveManagement.tsx`

---

## 8. Audit Checklists

Pre-defined checklist templates for structured audit activities.

### Available Templates

#### General Compliance Audit (`GENERAL_AUDIT`)
**Categories:**
1. **Registration & Documentation** (3 items)
   - Employer registration verification
   - Employee records maintenance
   - Wage books/payroll availability
2. **C3 Submissions** (3 items)
   - Timeliness of C3 submissions
   - C3 vs employment record matching
   - Employee listing completeness
3. **Payments & Contributions** (3 items)
   - Contribution payment timeliness
   - Payment receipt availability
   - Outstanding arrears check
4. **Employment Verification** (3 items)
   - Physical employee verification
   - Employee interviews
   - Wage accuracy verification

#### High Risk Employer Audit (`HIGH_RISK_AUDIT`)
**Categories:**
1. **Compliance History** (2 items)
   - Previous audit findings review
   - Repeated violation patterns
2. **Enhanced Verification** (3 items)
   - Extended employee interviews (minimum 5)
   - Wage books vs bank statements cross-check
   - SSN validity verification

**Checklist Item Fields:**
- Question text
- Response: Yes / No / N/A / Partial
- Notes (free text)
- Evidence Required (boolean)
- Evidence Attached (file references)

**Type File:** `src/types/auditChecklist.ts`

---

## 9. Document Templates

Three pre-configured templates are available:

### 1. Notice of Audit (Engagement Letter)
**Merge Fields:** `today_date`, `dept_head_name`, `department_name`, `plan_title`, `fiscal_year`, `period_text`, `scope`, `planned_start`, `planned_end`, `auditor_names`, `pbc_due_date`, `audit_manager_name`

### 2. PBC Request (Provided By Client)
**Merge Fields:** `today_date`, `plan_title`, `contact_name`, `due_date`, `document_list`, `auditor_email`, `auditor_name`

### 3. Exit Meeting Invitation
**Merge Fields:** `plan_title`, `recipient_name`, `meeting_date`, `meeting_time`, `meeting_location`, `auditor_name`

---

## 10. Configuration

**Page:** `src/pages/audit/AuditConfig.tsx`

Module configuration settings for the Internal Audit module (configurable by Audit Director / Admin).

---

## 11. File Structure

```
src/
├── pages/audit/
│   ├── ActionTracking.tsx          # Action implementation tracking
│   ├── ActivityCalendar.tsx        # Calendar view of audit activities
│   ├── ActivityWorkbench.tsx       # Execute audit activities
│   ├── AuditConfig.tsx             # Module configuration
│   ├── AuditPlans.tsx              # Legacy employer-focused plans
│   ├── AuditPlansNew.tsx           # Annual + department audit planning
│   ├── AuditReports.tsx            # Audit reports dashboard
│   ├── AuditorProfiles.tsx         # Auditor management
│   ├── CommunicationCenter.tsx     # Communication hub
│   ├── DepartmentMaster.tsx        # Department master list
│   ├── DepartmentView.tsx          # Department detail view
│   ├── EvidenceManagement.tsx      # Evidence repository
│   ├── FindingsManagement.tsx      # Findings CCCE management
│   ├── FollowUpTracker.tsx         # Follow-up actions tracker
│   ├── FunctionMaster.tsx          # Department function/risk register
│   ├── HolidayManagement.tsx       # Holiday calendar
│   ├── LeaveManagement.tsx         # Leave requests
│   ├── LetterGeneration.tsx        # Formal letter generation
│   ├── ManagementResponses.tsx     # Management responses
│   ├── PlanApproval.tsx            # Plan approval workflow
│   ├── PlanCloseout.tsx            # Plan closeout
│   ├── ReportBuilder.tsx           # Custom report builder
│   ├── WorkingPapers.tsx           # Working papers management
│   └── WorkloadCapacity.tsx        # Workload & capacity planning
│
├── components/audit/
│   ├── ActivityRescheduleDialog.tsx # Reschedule activity dialog
│   ├── ActivityScheduleForm.tsx     # Activity scheduling form
│   ├── AnnualPlanForm.tsx           # Annual plan create/edit form
│   ├── AuditPlanForm.tsx            # Legacy audit plan form
│   ├── DepartmentAuditForm.tsx      # Department audit plan form
│   ├── ReportPreviewDialog.tsx      # Report preview modal
│   └── TemplateCommunicationDialog.tsx # Communication template dialog
│
├── types/
│   ├── audit.ts                    # Core audit type definitions (510 lines)
│   ├── auditChecklist.ts           # Checklist template types
│   └── weeklyAuditPlan.ts          # Weekly audit plan types (compliance module)
│
└── data/
    └── auditData.ts                # Mock data (1251 lines)
```

---

## 12. Type Definitions Reference

All types are defined in `src/types/audit.ts`. Key interfaces:

| Interface | Lines | Purpose |
|---|---|---|
| `Zone` | 3–7 | Audit zones |
| `Department` | 9–18 | SSB departments |
| `DepartmentFunction` | 20–33 | Auditable functions with risk data |
| `ActivityReschedule` | 35–48 | Reschedule requests |
| `Employer` | 50–60 | Employer records |
| `Auditor` | 64–78 | Auditor profiles |
| `AuditorWorkload` | 80–87 | Workload tracking |
| `AuditorAvailability` | 89–94 | Availability calendar |
| `AuditorKPI` | 96–104 | Performance metrics |
| `Holiday` | 108–114 | Holiday records |
| `LeaveRequest` | 116–132 | Leave requests |
| `AnnualAuditPlan` | 137–154 | Annual plan |
| `DepartmentAuditPlan` | 157–176 | Department audit plan |
| `AuditPlan` | 178–195 | Legacy plan (extends DepartmentAuditPlan) |
| `AuditActivity` | 212–241 | Audit activities |
| `ProcedureStep` | 243–252 | Testing steps |
| `Evidence` | 254–271 | Evidence files |
| `Finding` | 275–300 | Audit findings |
| `Recommendation` | 302–311 | Recommendations |
| `WorkingPaper` | 313–347 | Working papers |
| `ManagementResponse` | 349–360 | Management responses |
| `ActionTracking` | 362–370 | Action tracking |
| `AuditActivityResult` | 372–383 | Activity results |
| `AuditFollowUp` | 385–405 | Follow-up items |
| `DocumentTemplate` | 409–417 | Letter templates |
| `AuditCommunication` | 419–434 | Communication records |
| `AuditAttachment` | 454–464 | File attachments |
| `NotificationLog` | 466–476 | Notification records |
| `AuditTrail` | 478–486 | Audit trail entries |
| `AuditMetrics` | 488–497 | Dashboard metrics |
| `CalendarEvent` | 499+ | Calendar events |

---

## 13. Mock Data & Sample Records

All mock data is in `src/data/auditData.ts` (1,251 lines).

### Data Sets Available

| Export | Count | Description |
|---|---|---|
| `zones` | 3 | Zone A (CBD), Zone B (Industrial), Zone C (Residential) |
| `departments` | 6 | SSB departments with functions |
| `annualAuditPlans` | 1 | FY2025 annual plan |
| `departmentAuditPlans` | 4 | Department audits for FY2025 |
| `employers` | 10 | Sample employers across 3 zones |
| `auditors` | 5 | Audit team members |
| `holidays` | 9 | St. Kitts & Nevis public holidays |
| `leaveRequests` | 3 | Sample leave requests |
| `auditPlans` | 3 | Legacy employer audit plans |
| `auditPlanEmployers` | 5 | Employer assignments to plans |
| `auditActivities` | 4 | Sample audit activities |
| `findings` | 3 | Sample findings (CCCE format) |
| `recommendations` | 5 | Sample recommendations |
| `workingPapers` | 3 | Sample working papers |
| `managementResponses` | 1 | Sample management response |
| `actionTracking` | 1 | Sample action tracking record |
| `evidence` | 2 | Sample evidence files |
| `documentTemplates` | 3 | Letter templates |
| `auditActivityResults` | 2 | Sample activity results |
| `auditFollowUps` | 3 | Sample follow-up items |
| `calendarEvents` | 5 | Sample calendar events |

---

## 14. Integration Points

### With Other SSB Modules

| Module | Integration |
|---|---|
| **Compliance / BEMA** | Shares employer data, audit cases, field activities, inspector assignments |
| **C3 Management** | C3 submission auditing, contribution verification |
| **Legal** | Escalation of non-compliance findings |
| **System Administration** | Audit trail logging via `logAuditTrail()` from `src/services/auditService.ts` |
| **User Management** | Role-based access control for audit functions |

### Audit Trail Service

All audit module actions should log to the centralized audit trail:

```typescript
import { logAuditTrail } from '@/services/auditService';

await logAuditTrail({
  action: 'create',
  entityType: 'audit_finding',
  entityId: finding.id,
  module: 'Internal Audit',
  afterValue: finding,
  userCode: currentUser.userCode
});
```

### Weekly Audit Plans (Compliance Module)

The compliance module has its own weekly audit planning system defined in `src/types/weeklyAuditPlan.ts` with types for:
- `WeeklyAuditPlan` — Weekly field plan for inspectors
- `PlannedVisit` — Scheduled employer visits
- `Evidence` — Field evidence collection
- `AuditChecklist` — Field audit checklists

**Weekly Plan Workflow:**
```
DRAFT → SUBMITTED → NEED_CHANGES → RESUBMITTED → APPROVED → IN_EXECUTION → COMPLETED
```

---

## 15. Business Rules & Validations

### Planning Rules
1. Annual plans must have objective, scope, and methodology before submission
2. Department audits must specify at least one function to audit
3. A lead auditor must be assigned before scheduling
4. Planned dates must fall within the annual plan's fiscal year

### Execution Rules
1. Activities cannot start before the parent department audit's planned start date
2. Evidence files are hashed (SHA-256) upon upload for integrity
3. Activity results require compliance status assessment

### Findings Rules
1. All findings must include Condition, Criteria, Cause, and Effect
2. Risk rating must be assigned (High/Medium/Low)
3. Impact area must be classified
4. Findings move to "For Mgmt Response" only after auditor submission

### Working Paper Rules
1. Working papers require review before approval
2. Version is incremented on each save
3. All actions are recorded in the audit trail array

### Leave & Resource Rules
1. Leave requests require supervisor approval
2. Workload hours must not exceed allocated capacity
3. Holiday dates affect availability calculations

### User Identity Tracking
Per project standards, all `createdBy`, `modifiedBy`, `approvedBy`, `reviewedBy`, `verifiedBy` fields must store the `UserCode` of the currently logged-in user performing the action. This is captured programmatically at the time of the event.

---

*End of Internal Audit Module Documentation*
