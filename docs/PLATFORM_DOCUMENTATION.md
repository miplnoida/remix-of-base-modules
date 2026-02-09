# Social Security Board (SSB) Integrated Management System

## Platform Documentation

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** In Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Core Modules](#core-modules)
   - [Registration & Online Applications](#1-registration--online-applications)
   - [C3 Contribution Management](#2-c3-contribution-management)
   - [Insured Persons Management](#3-insured-persons-management)
   - [Employers Management](#4-employers-management)
   - [Benefits Management](#5-benefits-management)
   - [Compliance & Audit](#6-compliance--audit)
   - [Legal Management](#7-legal-management)
   - [Finance & Cashier Operations](#8-finance--cashier-operations)
   - [Internal Audit](#9-internal-audit)
   - [Workflow Engine](#10-workflow-engine)
   - [System Administration](#11-system-administration)
5. [Cross-Cutting Features](#cross-cutting-features)
6. [Integration Architecture](#integration-architecture)
7. [Roadmap & Future Plans](#roadmap--future-plans)
8. [Appendices](#appendices)

---

## Executive Summary

The SSB Integrated Management System is a comprehensive web-based platform designed to manage all aspects of social security operations for St. Kitts and Nevis. The system handles registration of insured persons, employers, and doctors; manages contribution collection (C3 forms); processes various benefit claims; enforces compliance; handles legal proceedings; and provides robust financial/cashier operations.

### Key Objectives

- **Digitize** paper-based workflows and manual processes
- **Centralize** all SSB operations into a single integrated platform
- **Automate** approval workflows, notifications, and calculations
- **Improve** compliance monitoring and enforcement
- **Enable** self-service through online application portals
- **Provide** comprehensive reporting and analytics

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PUBLIC PORTAL (External)                     │
│   Insured Person Registration | Employer Registration | Doctor  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ API Gateway
┌──────────────────────────────▼──────────────────────────────────┐
│                      SSB INTERNAL SYSTEM                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Frontend  │  │   Backend   │  │     Edge Functions      │  │
│  │  (React)    │←→│  (Supabase) │←→│   (Deno/TypeScript)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                     │                 │
│         └────────────────┼─────────────────────┘                 │
│                          │                                       │
│              ┌───────────▼───────────┐                          │
│              │   PostgreSQL Database │                          │
│              │   + Row Level Security│                          │
│              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **External Portal** → Online applications submitted via public portal
2. **Proxy API** → Edge function fetches/forwards data to/from external APIs
3. **Workflow Engine** → Automatically routes applications for review/approval
4. **Notifications** → Email/SMS/In-app notifications at key workflow steps
5. **Domain Tables** → Approved data persisted to canonical domain tables

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **UI Components** | Shadcn/UI, Radix UI Primitives |
| **State Management** | TanStack React Query, React Context |
| **Routing** | React Router v6 |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **Edge Functions** | Deno (TypeScript) |
| **Authentication** | Supabase Auth (Email/Password) |
| **Styling** | TailwindCSS with custom design system |
| **Charts/Visualization** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **PDF Generation** | jsPDF, jsPDF-AutoTable |
| **Excel Export** | ExcelJS |

---

## Core Modules

### 1. Registration & Online Applications

#### Overview
Handles registration of three entity types from both internal (manual) and external (online portal) sources.

#### Features

**Online Applications Management**
| Route | Description | Status |
|-------|-------------|--------|
| `/online-applications/insured-person` | Review IP applications from public portal | ✅ Implemented |
| `/online-applications/employer` | Review employer applications from public portal | ✅ Implemented |
| `/online-applications/doctor` | Review doctor applications from public portal | ✅ Implemented |

**Key Capabilities:**
- Unified data tables with sorting, pagination, and status filtering
- 10-tab detail view for comprehensive application review
- Workflow-driven status display (Pending Review, Meeting Scheduled, Approved, Rejected)
- API configuration management for external endpoints
- Automatic workflow instance binding per application
- Schedule-A-Meeting action for in-person reviews
- Editable application forms during meeting workbench

**Meeting Management**
| Route | Description | Status |
|-------|-------------|--------|
| `/meetings/manage` | List and manage all scheduled meetings | ✅ Implemented |
| `/meetings/start/:meetingId` | Full-screen meeting workbench | ✅ Implemented |

**Meeting Actions:**
- Start Meeting → Opens editable application form
- Cancel Meeting → Closes workflow, restarts from step 1
- Reschedule Meeting → Creates new meeting record
- Approve/Reject during meeting with data persistence

**Internal Registration**
| Route | Description | Status |
|-------|-------------|--------|
| `/ip-registration` | Internal IP registration form | ✅ Implemented |
| `/employer/register` | Internal employer registration | ✅ Implemented |
| `/medical/applications/new` | Internal doctor registration | ✅ Implemented |

---

### 2. C3 Contribution Management

#### Overview
Manages employer contribution schedules (C3 forms), employee wage records, and related calculations.

#### Features

| Route | Description | Status |
|-------|-------------|--------|
| `/c3-management/dashboard` | C3 statistics and KPIs | ✅ Implemented |
| `/c3-management/manage` | CRUD operations for C3 schedules | ✅ Implemented |
| `/c3-management/verification` | Maker-checker verification queue | ✅ Implemented |
| `/c3-management/simulation` | C3 calculation simulator | ✅ Implemented |
| `/c3-management/configure-electronic-c3` | Electronic C3 file configuration | ✅ Implemented |

**Contribution Types:**
- Social Security (SS) - Employee & Employer portions
- Employment Injury Benefit (EIB)
- Sugar Levy
- Severance Fund

**Settings Management:**
- `/c3-management/settings/levy/schemes` - Levy rate configuration
- `/c3-management/settings/ss/schemes` - Social Security rates
- `/c3-management/settings/severance/schemes` - Severance fund settings
- `/c3-management/settings/injury/schemes` - Employment injury settings
- `/c3-management/settings/c3file/formats` - Electronic file formats

**Status Lifecycle:**
- `DFT` (Draft) → `PEN` (Pending) → `VAC` (Verified/Approved) or `REJ` (Rejected)

**Reports:**
- C3 Entry & Verification
- Pending C3 Schedules
- C3s Missing SSN
- C3 Line-Item Changes
- Electronic C3 Uploads
- C3s Without Payment
- Monthly Collections
- Contribution Arrears
- Top Contributors

---

### 3. Insured Persons Management

#### Overview
Comprehensive management of insured person records, employment history, and service requests.

#### Features

| Route | Description | Status |
|-------|-------------|--------|
| `/person/management` | IP dashboard and statistics | ✅ Implemented |
| `/person/ip-management` | Search and manage IP records | ✅ Implemented |
| `/person/pending-reviews` | IP applications pending review | ✅ Implemented |
| `/person/service-requests` | Service request management | ✅ Implemented |
| `/person/service-requests/new` | Create new service request | ✅ Implemented |

**Service Request Types:**
- Name Change
- Address Update
- SSN Card Replacement
- Contribution Statement Request
- Beneficiary Updates

**Reports:**
- IP Entry & Verification
- Online Renewal/Update
- Registration Payments
- Contribution Statement Payment
- Pension Letters Payment
- Non-National Workers SSN
- New Registrants by Officer
- Life Certificates
- CRM Activity

---

### 4. Employers Management

#### Overview
Management of registered employers including directory, contribution tracking, and compliance monitoring.

#### Features

| Route | Description | Status |
|-------|-------------|--------|
| `/employers-management/dashboard` | Employer statistics overview | ✅ Implemented |
| `/employers-management/manage` | Search and manage employers | ✅ Implemented |
| `/employer/directory` | Employer directory search | ✅ Implemented |
| `/employer/contribution-entry` | Manual contribution entry | ✅ Implemented |
| `/employer/contributions` | Contribution tracking | ✅ Implemented |

**Self-Employed Management:**
| Route | Description | Status |
|-------|-------------|--------|
| `/self-employed/manage` | Manage self-employed persons | ✅ Implemented |
| `/self-employed/add` | Register new self-employed | ✅ Implemented |
| `/self-employed/reports` | Self-employed reports | ✅ Implemented |

---

### 5. Benefits Management

#### Overview
Processing and management of social security benefit claims across short-term, long-term, and non-contributory categories.

#### Short-Term Benefits

| Benefit Type | Routes | Status |
|--------------|--------|--------|
| **Sickness Benefit** | `/nbenefit/short-term/sickness/*` | ✅ Implemented |
| **Employment Injury** | `/nbenefit/short-term/employment-injury/*` | ✅ Implemented |
| **Maternity Benefit** | `/nbenefit/short-term/maternity/*` | ✅ Implemented |
| **Funeral Grant** | `/nbenefit/short-term/funeral-grant/*` | ✅ Implemented |

Each benefit type includes:
- Overview & Rules
- Applications listing
- Eligibility Rules configuration
- Calculation Rules configuration
- Reports

#### Long-Term Benefits

| Benefit Type | Routes | Status |
|--------------|--------|--------|
| **Age Benefit** | `/nbenefit/long-term/age-benefit/*` | ✅ Implemented |
| **Invalidity Benefit** | `/nbenefit/long-term/invalidity/*` | ✅ Implemented |
| **Assistance Benefit** | `/nbenefit/long-term/assistance/*` | ✅ Implemented |
| **Survivors' Benefit** | `/nbenefit/long-term/survivors/*` | ✅ Implemented |

#### Non-Contributory Pensions

| Benefit Type | Routes | Status |
|--------------|--------|--------|
| **Assistance Pension** | `/nbenefit/non-contributory/assistance-pension/*` | ✅ Implemented |
| **Invalidity Assistance** | `/nbenefit/non-contributory/invalidity-assistance/*` | ✅ Implemented |

**Additional Features:**
- `/nbenefit/claim-approval` - Central claim approval queue
- `/nbenefit/long-term/registry` - Long-term beneficiary registry
- `/nbenefit/long-term/life-certificates` - Life certificate management
- Dynamic rules builder for eligibility/calculation
- Medical assessment workflows
- Benefit application workflows

---

### 6. Compliance & Audit

#### Overview
Field inspection, violation tracking, and employer compliance enforcement.

#### Features

| Route | Description | Status |
|-------|-------------|--------|
| `/compliance/dashboard` | Compliance metrics overview | ✅ Implemented |
| `/compliance/violations` | Violation management | ✅ Implemented |
| `/compliance/violations/manual-entry` | Manual violation creation | ✅ Implemented |
| `/compliance/employers/findings` | Employer inspection findings | ✅ Implemented |
| `/compliance/notices` | Compliance notices | ✅ Implemented |
| `/compliance/arrangements` | Payment arrangements | ✅ Implemented |
| `/compliance/employer-statements` | As-of-date employer statements | ✅ Implemented |
| `/compliance/legal-recommendation-queue` | Legal escalation queue | ✅ Implemented |

**Weekly Audit Planning:**
- Plan Builder - Create weekly inspection plans
- My Plans - View personal plan history
- Review & Approve Plans - Supervisor approval
- Field Execution - Mobile check-in/check-out
- Weekly Report Submission - Post-execution reporting

**Comprehensive Reports:**
- Violations by Status/Type/Zone
- Inspector Performance metrics
- C3 Compliance reports
- Arrears & Collections analysis
- Audit & Inspection results
- Payment Arrangement tracking
- Legal Escalation statistics
- Trend Analysis (12-month)

---

### 7. Legal Management

#### Overview
Legal case management for compliance escalations, debt recovery, and court proceedings.

#### Features

| Route | Description | Status |
|-------|-------------|--------|
| `/legal-final` | Legal dashboard | ✅ Implemented |
| `/legal-final/new-case` | Create new legal case | ✅ Implemented |
| `/legal-final/cases` | Case management | ✅ Implemented |
| `/legal-final/reports` | Legal reports | ✅ Implemented |

**Case Lifecycle:**
- Case intake from compliance escalation
- Document management and evidence collection
- Court hearing scheduling
- Judgment tracking and enforcement
- Payment arrangement monitoring

---

### 8. Finance & Cashier Operations

#### Overview
Complete financial operations including cashiering, accounts payable, and Sage ERP integration.

#### Cashier Operations

| Route | Description | Status |
|-------|-------------|--------|
| `/cashier/create-invoice` | Invoice creation | ✅ Implemented |
| `/cashier/search-pay-invoices` | Invoice search and payment | ✅ Implemented |
| `/cashier/c3-payments` | C3 contribution payments | ✅ Implemented |
| `/cashier/cash-details` | Cash details entry | ✅ Implemented |
| `/cashier/funds-transfer` | Inter-account transfers | ✅ Implemented |
| `/cashier/check-management` | Check processing | ✅ Implemented |
| `/cashier/batch-management` | Batch management | ✅ Implemented |
| `/cashier/batch-closing` | Daily batch closing | ✅ Implemented |
| `/cashier/gl-posting` | GL posting summary | ✅ Implemented |

#### Accounts Payable

| Route | Description | Status |
|-------|-------------|--------|
| `/finance/accounts-payable/pending` | Pending payables | ✅ Implemented |
| `/finance/accounts-payable/create-batch` | Create AP batch | ✅ Implemented |
| `/finance/accounts-payable/batches` | AP batch listing | ✅ Implemented |
| `/finance/accounts-payable/check-printing` | Check printing queue | ✅ Implemented |
| `/finance/accounts-payable/dd-generation` | Direct deposit files | ✅ Implemented |
| `/finance/accounts-payable/pay-runs` | Benefit pay runs | ✅ Implemented |

#### Sage Integration Settings

| Route | Description | Status |
|-------|-------------|--------|
| `/cashier/chart-accounts-mapping` | GL account mapping | ✅ Implemented |
| `/cashier/payment-types-mapping` | Payment type mapping | ✅ Implemented |
| `/cashier/sage-sync` | Sage synchronization | ✅ Implemented |
| `/cashier/current-accounts` | Current accounts setup | ✅ Implemented |
| `/cashier/reconciliation-accounts` | Bank reconciliation | ✅ Implemented |

---

### 9. Internal Audit

#### Overview
Full internal audit lifecycle from planning through follow-up and closure.

#### Features

**Auditor Management:**
- Auditor profiles and credentials
- Workload and capacity monitoring
- Leave and vacation management
- Holiday calendar

**Audit Planning:**
| Route | Description | Status |
|-------|-------------|--------|
| `/audit/plans` | Audit plan creation | ✅ Implemented |
| `/audit/approvals` | Plan approval workflow | ✅ Implemented |
| `/audit/calendar` | Activity scheduling | ✅ Implemented |

**Audit Execution:**
| Route | Description | Status |
|-------|-------------|--------|
| `/audit/workbench` | Activity execution | ✅ Implemented |
| `/audit/evidence` | Evidence management | ✅ Implemented |
| `/audit/working-papers` | Working paper creation | ✅ Implemented |
| `/audit/findings` | Findings documentation | ✅ Implemented |

**Follow-up & Closure:**
- Management response tracking
- Corrective action monitoring
- Follow-up tracker
- Plan closeout approval

**Communications:**
- Letter generation
- Report builder
- Communication center

---

### 10. Workflow Engine

#### Overview
Configurable workflow engine powering approval processes across all modules.

#### Features

| Route | Description | Status |
|-------|-------------|--------|
| `/admin/workflows` | Workflow definition management | ✅ Implemented |
| `/admin/workflow-instances` | Active workflow instances | ✅ Implemented |
| `/admin/workflow-triggers` | Automatic workflow triggers | ✅ Implemented |
| `/admin/workflow-logs` | Workflow action audit log | ✅ Implemented |
| `/admin/workflow-analytics` | Workflow performance metrics | ✅ Implemented |
| `/admin/workflow-security` | Workflow access control | ✅ Implemented |
| `/admin/workflow-secured-approvals` | Secured approval management | ✅ Implemented |
| `/workflow/my-tasks` | Personal task queue | ✅ Implemented |
| `/workflow/applications-review` | Application review queue | ✅ Implemented |

**Workflow Capabilities:**
- Multi-step approval chains
- Role/Designation/User-based assignment
- Configurable actions (Approve, Reject, Return, Schedule-Meeting)
- SLA monitoring with escalation
- Field updates on approval
- External API calls on action
- Notification triggers at each step
- Business Object Root binding for data context

**Action Types:**
- `transition` - Move to next step
- `field_update` - Update source record fields
- `api_call` - Invoke external API
- `notification` - Send email/SMS/in-app
- `schedule_meeting` - Pause workflow for meeting

---

### 11. System Administration

#### Overview
Comprehensive system configuration and user management.

#### User & Security Management

| Route | Description | Status |
|-------|-------------|--------|
| `/admin/users` | User account management | ✅ Implemented |
| `/admin/roles` | Role definition | ✅ Implemented |
| `/admin/roles-permissions` | Role-permission mapping | ✅ Implemented |
| `/admin/security` | Security settings | ✅ Implemented |
| `/admin/security/password-policy` | Password requirements | ✅ Implemented |
| `/admin/security/mfa` | Multi-factor authentication | ✅ Implemented |

#### Organization Management

| Route | Description | Status |
|-------|-------------|--------|
| `/admin/offices` | Office locations | ✅ Implemented |
| `/admin/departments` | Department structure | ✅ Implemented |
| `/admin/modules` | Module management | ✅ Implemented |

#### Notifications

| Route | Description | Status |
|-------|-------------|--------|
| `/admin/notifications/log` | Notification history | ✅ Implemented |
| `/admin/notifications/templates` | Email/SMS templates | ✅ Implemented |
| `/admin/notifications/channels` | Channel configuration | ✅ Implemented |
| `/admin/notifications/providers` | Provider setup | ✅ Implemented |

#### System Maintenance

| Route | Description | Status |
|-------|-------------|--------|
| `/admin/audit-log` | System audit trail | ✅ Implemented |
| `/admin/api-configuration` | External API settings | ✅ Implemented |
| `/admin/global-settings` | Global system settings | ✅ Implemented |
| `/admin/c3-configuration` | C3 calculation configuration | ✅ Implemented |
| `/admin/system-cleanup/*` | System cleanup utilities | ✅ Implemented |

---

## Cross-Cutting Features

### 1. Notification System

**Channels:**
- Email (via internal API)
- SMS (via internal API)
- In-app notifications (real-time)

**Features:**
- Template-based messaging with placeholders
- Multi-channel delivery
- Delivery tracking and logging
- User notification preferences

### 2. Document Management

**Capabilities:**
- Document upload and storage (Supabase Storage)
- Document categorization by type
- Version tracking
- PDF generation for letters and reports
- Template management per module

### 3. Reporting & Analytics

**Report Types:**
- Operational reports (transactions, registrations)
- Compliance reports (violations, arrears)
- Financial reports (collections, payments)
- Performance reports (inspector, workflow)
- Statistical reports (trends, projections)

**Export Formats:**
- PDF (with headers, footers, pagination)
- Excel (formatted with filters)
- CSV (raw data export)

### 4. Audit Trail

**Tracked Events:**
- User login/logout
- Record create/update/delete
- Workflow actions
- Configuration changes
- Document access

### 5. Communication Hub

| Route | Description | Status |
|-------|-------------|--------|
| `/correspondence/dashboard` | Communication workspace | ✅ Implemented |
| `/correspondence/incoming` | Incoming communications | ✅ Implemented |
| `/correspondence/outgoing` | Outgoing communications | ✅ Implemented |
| `/correspondence/search` | Search & history | ✅ Implemented |
| `/correspondence/archive` | Archived communications | ✅ Implemented |

### 6. Medical Module

| Route | Description | Status |
|-------|-------------|--------|
| `/medical/applications` | Doctor applications | ✅ Implemented |
| `/medical/registry` | Approved doctor registry | ✅ Implemented |
| `/medical/claims` | Claims by doctors | ✅ Implemented |

---

## Integration Architecture

### External API Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    API Configuration Admin                   │
│              (api_settings table + Admin UI)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      proxy-api Edge Function                 │
│   - Dynamic endpoint resolution                              │
│   - Header injection (API keys)                              │
│   - CORS bypass                                              │
│   - Request/Response normalization                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌────────────┐      ┌────────────┐      ┌────────────┐
    │  IP Portal │      │  ER Portal │      │  DR Portal │
    │    API     │      │    API     │      │    API     │
    └────────────┘      └────────────┘      └────────────┘
```

### Edge Functions

| Function | Purpose |
|----------|---------|
| `proxy-api` | External API proxy with dynamic configuration |
| `meeting-api-handler` | Meeting lifecycle management |
| `workflow-action-api` | External API calls from workflow |
| `workflow-notify-approvers` | Approver notification on step transition |
| `send-notification` | Multi-channel notification delivery |
| `process-pending-notifications` | Batch notification processing |
| `create-user` | User account creation |
| `admin-update-password` | Admin password reset |
| `bootstrap-admin` | Initial admin setup |
| `compliance-intelligence` | Compliance analytics |
| `import-seed-data` | Data seeding utility |

### Sage ERP Integration

**Synchronization Points:**
- Chart of Accounts mapping
- Payment type mapping
- GL posting export
- Bank reconciliation

---

## Roadmap & Future Plans

### Phase 1: Core Implementation ✅ (Completed)

- User authentication and authorization
- Workflow engine foundation
- Registration modules (IP, Employer, Doctor)
- Online application processing
- Meeting management system
- Basic C3 management
- Notification framework

### Phase 2: Benefits & Compliance ✅ (Completed)

- Short-term benefits (Sickness, Maternity, Injury, Funeral)
- Long-term benefits (Age, Invalidity, Survivors)
- Non-contributory pensions
- Compliance violation management
- Weekly audit planning
- Payment arrangement system

### Phase 3: Finance & Integration 🔄 (In Progress)

- Cashier operations
- Accounts payable
- Sage ERP integration
- Bank reconciliation
- Multi-currency support

### Phase 4: Advanced Features 📋 (Planned)

- Mobile app for field inspectors
- Self-service portal for insured persons
- Employer self-service portal
- Advanced analytics and BI dashboards
- AI-assisted document processing
- Predictive compliance risk scoring

### Phase 5: Optimization & Scale 📋 (Planned)

- Performance optimization
- Database partitioning
- Caching layer implementation
- High availability configuration
- Disaster recovery procedures

---

## Appendices

### A. Database Schema Overview

**Core Tables:**
- `users`, `roles`, `permissions`, `role_permissions`
- `app_modules`, `designations`, `offices`, `departments`
- `insured_person_applications`, `employer_registrations`, `doctor_applications`
- `workflow_definitions`, `workflow_steps`, `workflow_instances`, `workflow_tasks`
- `cn_c3_reported`, `ip_wages`, `cn_payment`, `cn_receipt`
- `compliance_violations`, `payment_arrangements`
- `in_app_notifications`, `notification_logs`
- `meetings`, `audit_logs`

### B. User Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `hr_manager` | HR and personnel management |
| `compliance_officer` | Compliance operations |
| `benefits_manager` | Benefits processing |
| `financial_analyst` | Financial reporting |
| `employer_liaison` | Employer relations |
| `field_inspector` | Field inspections |
| `compliance_senior_inspector` | Senior inspection oversight |
| `data_entry_clerk` | Data entry operations |
| `legal_officer` | Legal case management |
| `accounts_manager` | Accounts oversight |
| `cashier` | Cashier operations |
| `cashier_supervisor` | Cashier supervision |
| `audit_officer` | Internal audit |
| `auditor` | Audit execution |
| `audit_manager` | Audit management |

### C. Status Codes

**Application Status:**
- `Draft` - Initial creation
- `Submitted` - Awaiting review
- `UnderReview` - Being processed
- `Approved` - Successfully approved
- `Rejected` - Application rejected
- `Cancelled` - Application cancelled

**Workflow Status:**
- `InProgress` - Active workflow
- `AwaitingMeeting` - Paused for meeting
- `Completed` - Successfully completed
- `Cancelled` - Workflow cancelled
- `Closed-Approved` - Closed with approval
- `Closed-Rejected` - Closed with rejection

**C3 Posting Status:**
- `DFT` - Draft
- `PEN` - Pending verification
- `VAC` - Verified/Approved
- `REJ` - Rejected
- `DEL` - Deleted

### D. Environment Configuration

**Key Environment Variables:**
- `VITE_DATE_DISPLAY_FORMAT` - Date display format (default: dd/MM/yyyy)
- `VITE_DATE_STORAGE_FORMAT` - Date storage format (default: yyyy-MM-dd)
- `VITE_PHONE_MASK` - Phone number mask (default: XXX-XXX-XXXX)
- `VITE_DEFAULT_COUNTRY_CODE` - Default country (default: KN)
- `VITE_MAX_NAME_LENGTH` - Name field limit (default: 30)
- `VITE_MAX_EMAIL_LENGTH` - Email field limit (default: 75)
- `VITE_APPLICATION_EXPIRY_DAYS` - Application expiry days (default: 4)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 2026 | System | Initial documentation |

---

*This document is auto-generated and reflects the current state of the SSB Integrated Management System.*
