# Online Application Module — Migration Knowledge Base

> **Purpose** — This document is the complete, self-contained migration brief for the Online Application module (Insured Person + Employer) and the workflow engine it rides on. It is written so that another AI system (Claude) can rebuild the module from scratch without access to the original Lovable project.
>
> **Stack assumed by the target rebuild**
> - Frontend: React 18 + Vite 5 + TypeScript + TanStack Query + shadcn/ui
> - Backend: Supabase (Postgres + Edge Functions in Deno)
> - Auth: Supabase Auth with role mapping via `user_roles`
> - Storage: Supabase Storage with `document-proxy` edge function for secure reads
> - DMS: External Document Management System contacted by `dms-transfer` edge function
> - Notifications: Internal pipeline `workflow_step_notifications` → `notification_queue` → channel providers
>
> **Architectural rule** — NO RLS is used in `public`. Auth is enforced at the app/edge layer; tables expose `GRANT`s to `authenticated` and `service_role` only.

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Architecture](#3-database-architecture)
4. [Workflow Engine Analysis](#4-workflow-engine-analysis)
5. [Status Transitions](#5-status-transitions)
6. [Action Button Logic](#6-action-button-logic)
7. [Edge Functions](#7-edge-functions)
8. [API & Service Layer](#8-api--service-layer)
9. [Business Rules](#9-business-rules)
10. [Validations](#10-validations)
11. [Error Handling](#11-error-handling)
12. [Notifications](#12-notifications)
13. [Audit Logging](#13-audit-logging)
14. [Security Model](#14-security-model)
15. [Dependency Map](#15-dependency-map)
16. [Complete Migration Guide for Claude](#16-complete-migration-guide-for-claude)
17. [Source Code References](#17-source-code-references)

---

## 1. Module Overview

| Field | Value |
| --- | --- |
| **Module Name** | Online Application Module |
| **Sub-modules covered** | (a) Online Insured Person Applications, (b) Online Employer Applications |
| **Purpose** | Pull applications submitted by the public via the external self-service portal, present them inside the back-office app, drive each application through a configurable review workflow, and on approval convert the application into a master record (`ip_master` for IP, `er_master` for Employer). |
| **Business Objective** | Eliminate manual re-keying of applications, enforce a maker-checker review, give reviewers the ability to schedule a verification meeting before approval, and guarantee an atomic move from "online application" to "registered master record" with full audit and document mirror to the DMS. |
| **Primary Users** | Back-office Reviewers, Reviewing Officers, Supervisors, System Admins |
| **User Roles** (sourced from `roles` / `user_roles`) | `admin`, `data_entry_clerk`, `reviewing_officer`, `supervisor`, `head_cashier`, `system_admin`. Maker-checker exempts `admin` only. |
| **Dependencies** | `workflow_*` engine, `meetings` module, `dms-transfer` edge function, `document-proxy` edge function, `proxy-api` edge function, external Application APIs configured in `api_settings`, `ip_master` / `er_master` master tables, `convert_application_atomic` RPC. |
| **Entry points** | Sidebar → *System Admin → Online Applications → Insured Person Applications* and *Employer Applications*. URLs: `/online-applications/insured-person`, `/online-applications/insured-person/:referenceNumber`, `/online-applications/employer`, `/online-applications/employer/:applicationId`. |

---

## 2. System Architecture

### 2.1 Pages

| Route | Component | Purpose | Access Permission |
| --- | --- | --- | --- |
| `/online-applications/insured-person` | `InsuredPersonApplications` (`src/pages/online-applications/InsuredPersonApplications.tsx`) | List of IP applications fetched live from external portal; shows workflow status & meeting badges. | Authenticated. Sidebar item shown to admin/reviewing roles. |
| `/online-applications/insured-person/:referenceNumber` | `ApplicationDetailPage` (`src/pages/online-applications/ApplicationDetailPage.tsx`) | Detail view with tabs (Personal, Contact, Relations, Employment, Dependants, Documents, Remarks), workflow action buttons, meeting actions, conversion validation panel. | Authenticated; workflow actions gated by `useWorkflowActions`. |
| `/online-applications/employer` | `EmployerApplications` (`src/pages/online-applications/EmployerApplications.tsx`) | Paginated list of Employer applications with filters. | Authenticated. |
| `/online-applications/employer/:applicationId` | `EmployerApplicationDetailPage` (`src/pages/online-applications/EmployerApplicationDetailPage.tsx`) | Detail view with tabs (Identity, Contacts, Address, Operations, Employees, Documents, Notes), workflow + meeting actions, employer conversion. | Authenticated; workflow actions gated by `useWorkflowActions`. |

Sidebar entries are registered in `src/components/sidebar/menuItems/systemAdminMenuItems.ts` (`/online-applications/insured-person`, `/online-applications/employer`).

### 2.2 Components

| Component | File | Purpose | Key Props | Notable State / Side-Effects |
| --- | --- | --- | --- | --- |
| `WorkflowActionButtons` | `src/components/workflow/WorkflowActionButtons.tsx` | Renders the dynamic Accept / Reject / Schedule Meeting / Send Back buttons returned by `useWorkflowActions` for the current step. Hides itself when `canPerformActions === false`. | `sourceModule`, `sourceRecordId`, `onActionComplete(action, endState)` | Calls `useExecuteWorkflowAction()` mutation. |
| `MeetingActionButtons` | `src/components/meetings/MeetingActionButtons.tsx` | Start / Reschedule / Cancel / Close-with-decision buttons surrounding an active meeting. | `meeting`, `onActionComplete()` | Uses `meeting-api-handler` edge function for close. |
| `ApplicationDocumentsTab` | `src/components/online-applications/ApplicationDocumentsTab.tsx` | Tab that lists external + reviewer-uploaded documents, supports viewing via `document-proxy`, downloads, reviewer overrides. | `application`, `applicationReference` | Calls `document-proxy` edge function. |
| `ConversionValidationPanel` | `src/components/online-applications/ConversionValidationPanel.tsx` | Renders pre-flight + RPC validation errors that block conversion. | `result`, `isLoading` | Pure presentation; receives errors from `useConvertToIPRegistration`. |
| `EmployerApplicationActions` | `src/components/online-applications/EmployerApplicationActions.tsx` | Accept / Reject dialogs specific to Employer flow; also drives `convertToEmployer`, meeting close, and workflow close. | `applicationData`, `applicationId`, `meeting?`, `workflowInstanceId?`, `onActionComplete()` | Calls `meeting-api-handler` and direct `workflow_instances`/`workflow_tasks`/`workflow_logs` writes. |
| `WorkflowStatusCell` | `src/components/online-applications/WorkflowStatusCell.tsx` | Renders status badge (with meeting date/time underneath) for grid rows. | `status`, `isLoading`, `fallbackStatus` | Pure presentation. |
| `WorkflowInitiationDialog` | `src/components/workflow/WorkflowInitiationDialog.tsx` | Manual workflow start dialog used as a fallback after conversion if auto-initiation skipped. | `open`, `onOpenChange`, `eligibility`, `pendingRecord` | Calls `triggerIPRegistrationWorkflow` service. |

### 2.3 Hooks

| Hook | File | Returns | Purpose |
| --- | --- | --- | --- |
| `useInsuredPersonApplications` | `src/hooks/useOnlineApplications.ts` | `{ data, isLoading, refresh, … }` | Calls `proxy-api` edge function, normalises external payloads, filters out approved/converted refs, **auto-binds** workflow via `useOnlineApplicationWorkflowBinding('insured-person', …)`. |
| `useEmployerApplications` | `src/hooks/useEmployerApplications.ts` | `EmployerApplicationsResult` | Same pattern as IP for Employer module (`/?page=…&limit=…`), also auto-binds workflows. |
| `useApplicationWorkflowStatus` | `src/hooks/useApplicationWorkflowStatus.ts` | `Record<refNo, ApplicationWorkflowStatus>` | One query for many refs; merges `workflow_instances`, current step, latest active `meeting`. Used by grids. |
| `useOnlineApplicationWorkflowBinding` | `src/hooks/useOnlineApplicationWorkflowBinding.ts` | `void` (side-effect) | For every visible application that has no instance, creates `workflow_instances` + first `workflow_tasks` row; fires `workflow-process-notifications` (`step_entry`). |
| `useWorkflowActions(sourceModule, sourceRecordId)` | `src/hooks/useWorkflowActions.ts` | `WorkflowContext` | Resolves whether the current user can act on the current step; returns the list of `workflow_step_actions`. Performs both **permission** and **maker-checker** checks. |
| `useExecuteWorkflowAction()` | same file | `UseMutationResult` | Server-side enforcement again; runs the action, applies configured field updates, calls `workflow-action-api`, transitions instance, calls `updateSourceRecordStatus`, fires `workflow-process-notifications` (`action_taken`), and on IP `V` triggers `dms-transfer`. |
| `useConvertToIPRegistration` | `src/hooks/useConvertToIPRegistration.ts` | `{ convert, isConverting, conversionErrors }` | Strict reviewer-document resolution (`ip_app_docs_resolve_for_conversion`) → `convert_application_atomic` RPC → audit + cache invalidate. May return `workflow_instance_id` if the RPC auto-initiated workflow. |
| `useConvertToEmployerRegistration` | `src/hooks/useConvertToEmployerRegistration.ts` | similar to above | Equivalent for Employer (`convert_employer_application_atomic`). |
| `useApplicationMeeting(reference)` | `src/hooks/useApplicationMeeting.ts` | `{ meeting, invalidate }` | Latest active meeting for an application reference. |
| `useExternalApplicationDetail` / `useEmployerApplicationDetail` | `src/hooks/useExternalApplicationDetail.ts`, `src/hooks/useEmployerApplicationDetail.ts` | Detailed payload from `proxy-api`. |

### 2.4 Context Providers

- `SupabaseAuthContext` — provides `user`, `roles`, `isAuthReady`, `isAuthenticated`. Workflow hooks **never** run before `isAuthReady && isAuthenticated`.
- `GlobalBlockingContext` — `startBlocking('…')` / `stopBlocking()` used by `useConvertToIPRegistration` and `useExecuteWorkflowAction` for full-screen overlay on slow ops.

### 2.5 Services

| File | Exports | Purpose |
| --- | --- | --- |
| `src/services/onlineApplicationsService.ts` | `insuredPersonApplicationsService`, `employerApplicationsService` | (Legacy) Direct fetch wrappers for IP/Employer external APIs. Still referenced for `approve`/`reject` pass-through. |
| `src/services/workflowEligibilityService.ts` | `checkWorkflowEligibility` | Asks DB whether a given `source_record_id` is eligible for the IP review workflow (active definition + first step + no existing open instance). |
| `src/services/workflowTriggerService.ts` / `employerWorkflowTriggerService.ts` | `triggerIPRegistrationWorkflow`, `triggerEmployerRegistrationWorkflow` | Manual workflow initiation when auto-init didn't fire. |
| `src/services/resolveReportingManager.ts` | `resolveReportingManagerForTask` | Resolves the reporting manager UUID for `approver_type='reporting_manager'` step assignment. |
| `src/services/correlationIdService.ts` | `getCorrelationId` | Per-tab correlation id used by `dms-transfer` and audit. |

---

## 3. Database Architecture

> All tables live in `public`. RLS is disabled per the NO-RLS architecture; access is via grants to `authenticated` + `service_role` and is enforced at app/edge layer.

### 3.1 `workflow_definitions`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `name` | `text` | NO | — |
| `description` | `text` | YES | — |
| `process_type` | `text` | NO | — |
| `default_sla_hours` | `integer` | YES | `24` |
| `is_active` | `boolean` | YES | `false` |
| `version` | `integer` | YES | `1` |
| `created_by` | `uuid` | YES | — |
| `created_at` / `updated_at` | `timestamptz` | YES | `now()` |
| `secured_module_id` | `uuid` | YES | — |
| `secured_table` | `text` | YES | — |
| `maker_checker_enabled` | `boolean` | NO | `false` |

**Seed data referenced by the module** (`useOnlineApplicationWorkflowBinding.WORKFLOW_CONFIGS`):

| `id` | `name` | `process_type` | `is_active` | `maker_checker_enabled` |
| --- | --- | --- | --- | --- |
| `cc5f077d-b7f7-4b2c-a354-4babcfee5b95` | Online IP Registration Review Workflow | Document Review | `true` | `false` |
| `bf8e92bc-527f-4c67-8c65-1ed5df59fb84` | Online Employer Registration Review Workflow V2 | Document Review | `true` | `false` |

### 3.2 `workflow_steps`

Key columns: `id`, `workflow_id` (FK → `workflow_definitions` on delete cascade), `step_number`, `step_name`, `sla_hours`, `approver_type` (CHECK in `role | designation | specific_users | department_head | designation_hierarchy | reporting_manager`), `approver_role_ids uuid[]`, `approver_designation_ids uuid[]`, `approver_user_ids uuid[]`, `assigned_role`, `assigned_designation`, `is_final_step`, `escalation_template_id` (FK → `notification_templates`), `escalation_module_id` (FK → `app_modules`).

Unique constraint: `(workflow_id, step_number)`.

**Seed**: each of the two workflows has exactly one step — `step_number=1`, `step_name='New Request'`, `approver_type='role'`, `sla_hours=24`.

### 3.3 `workflow_step_actions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `step_id` | uuid | FK → `workflow_steps` on delete cascade |
| `action_name` | text | Display label (e.g. "Accept") |
| `action_type` | enum `workflow_step_action_type` | Default `Custom` |
| `next_step_id` | uuid (nullable) | FK → `workflow_steps` |
| `is_final_action` | boolean | |
| `display_order` | integer | |
| `next_step_type` | enum `next_step_type` | `next_step | specific_step | end_workflow | send_back_to_applicant | pause_workflow` |
| `end_state` | enum (nullable) | `Approved | Rejected` |
| `result_status` | text (nullable) | Admin-configured override for `updateSourceRecordStatus` |
| `remarks_required` | boolean | Server-enforced in `useExecuteWorkflowAction` |
| `notification_type`, `notification_module_id`, `notification_template_id` | — | Legacy fields |

**Seed actions for both workflows** (one per row per workflow):

| Step | Action | `action_type` | `next_step_type` | `end_state` |
| --- | --- | --- | --- | --- |
| 1 New Request | Accept | `Approve` | `end_workflow` | `Approved` |
| 1 New Request | Reject | `Reject` | `end_workflow` | `Rejected` |
| 1 New Request | Schedule Meeting | `ScheduleMeeting` | `pause_workflow` | NULL |

### 3.4 `workflow_action_outcomes`, `workflow_action_configurations`, `workflow_action_types`, `workflow_action_field_updates`, `workflow_action_notifications`

These tables drive the configurable parts of an action: which outcomes (`Approve` / `Reject` / `SendBack`) it can produce, what API to call, which fields to write on the source record, and which notification templates to dispatch. Full column lists below — copy verbatim into the migration:

- `workflow_action_configurations(id uuid pk, workflow_id uuid, step_id uuid, action_type_id uuid, action_id uuid, meeting_type, requires_api_integration bool default false, api_config_id uuid, custom_config jsonb, is_active bool default true, notify_assigned_person bool default false, created_*/updated_* …)`
- `workflow_action_types(id uuid pk, type_code, type_name, description, requires_form bool, requires_api_integration bool, pauses_workflow bool, is_system_defined bool default true, is_active bool default true, …)`
- `workflow_action_outcomes(id uuid pk, action_config_id uuid, outcome_code enum, outcome_label, description, icon_name, button_variant default 'default', next_step_type default 'stay', next_step_id uuid, end_state enum, triggers_api bool, api_config_id uuid, creates_new_request bool, new_request_module, requires_remarks bool, display_order, is_active bool default true, …)`
- `workflow_action_field_updates(id uuid pk, action_id uuid, field_name text, field_value text, display_order int, created_by uuid, …)`
- `workflow_action_notifications(id uuid pk, action_id uuid, notification_type text, template_id uuid, recipient_type text default 'next_step_approver', recipient_role_id uuid, module_id uuid, is_enabled bool default true, …)`

### 3.5 `workflow_step_notifications`

Per-step notification configuration consumed by `workflow-process-notifications` on `step_entry` trigger. Columns mirror `workflow_action_notifications` but keyed by `step_id`.

### 3.6 `workflow_step_action_api` + `workflow_step_action_api_body`

Used by `workflow-action-api` edge function to call external systems when an action fires.

- `workflow_step_action_api(id, workflow_id, workflow_step_id, action_code text, http_method, endpoint_url, api_key_secret_name, content_type default 'application/json', timeout_seconds default 30, retry_count default 0, is_active bool default true, description, …)`
- `workflow_step_action_api_body(id, workflow_action_api_id, json_field_name, value_source text — one of APPLICATION|MEETING|WORKFLOW|SYSTEM|STATIC, source_key, static_value, is_required, display_order)`

### 3.7 `workflow_api_configurations` + `workflow_api_execution_log`

`workflow_api_configurations` stores reusable named API configs (`headers_template`, `body_template`, `success_condition`). `workflow_api_execution_log` records every outbound call with `request_payload`, `response_payload`, `http_status`, `execution_status`, `error_message`, `duration_ms`, `retry_attempt`.

### 3.8 `workflow_instances`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `workflow_id` | uuid | FK → `workflow_definitions` |
| `workflow_name` | text | denormalised |
| `source_module` | text | one of `online-insured-person-applications`, `online-employer-applications`, `insured-person-applications`, `employer-applications`, `insured_person_registration`, `employer_registration` (varies by phase) |
| `source_record_id` | text | external reference number |
| `source_record_name` | text | applicant name |
| `current_step_id` | uuid | FK → `workflow_steps` |
| `status` | enum `workflow_instance_status` (`Pending | InProgress | Query | AwaitingMeeting | Approved | Rejected | Completed | Cancelled | Closed`) |
| `started_by` | uuid | FK → `profiles` (used for maker-checker) |
| `started_by_name` | text | |
| `started_at`, `completed_at`, `due_at` | timestamptz | |
| `metadata` | jsonb default `{}` | `{ reference_number, applicant_name, application_id, email, phone, status, submitted_at, application_type, awaiting_applicant_info?, restart_step_id? }` |
| `primary_table`, `primary_key_column`, `primary_key_value`, `business_key_column`, `business_key_value` | text | optional pointers used by amend/edit paths |

Trigger: `audit_table_changes` runs `fn_audit_row_change()` on INSERT/UPDATE/DELETE to write to `system_audit_trail`.

### 3.9 `workflow_tasks`

`id, instance_id (FK → workflow_instances on delete cascade), step_id (FK → workflow_steps), step_name, assigned_to (FK → profiles), assigned_role text, assigned_designation uuid, status text (Pending|InProgress|Completed|Skipped|Failed), due_at, action_taken text, comments text, completed_at, created_at`.

### 3.10 `workflow_logs`, `workflow_execution_logs`, `workflow_security_audit_log`

- `workflow_logs` — per-action chronological log (`instance_id, step_id, step_name, action, old_status, new_status, performed_by/user_id, performed_by_name/user_name, details/comments, metadata jsonb`). Used by the audit panel.
- `workflow_execution_logs` — observability log (correlation id, payload, http_status, severity).
- `workflow_security_audit_log` — every permission decision, including `denial_reason` and `rules_applied`.

### 3.11 `workflow_role_assignments`, `workflow_triggers`, `workflow_meeting_departments`, `workflow_mappings`

- `workflow_role_assignments(role_id, workflow_id, assigned_by, …)` — defines which roles can interact with a workflow.
- `workflow_triggers` — outbound event hooks.
- `workflow_meeting_departments(workflow_id, step_id, action_id, office_code, department_id)` — when a "Schedule Meeting" action runs, the meeting picker is limited to these office/department combinations.

### 3.12 `meetings`

`id, meeting_reference unique, application_reference, workflow_instance_id (FK), workflow_id (FK), step_id (FK), action_config_id (FK → workflow_action_configurations), meeting_type enum, status enum default 'Scheduled' (Scheduled|Rescheduled|InProgress|Completed|Cancelled), outcome enum, meeting_date date, meeting_time time, contact_person varchar (user_code), contact_person_name varchar (auto-set by trigger), contact_email/contact_phone (validated by trigger), office_address, office_location_id, remarks, outcome_remarks, parent_meeting_id (self FK for reschedules), reschedule_count default 0, scheduled_by uuid (auth.users), closed_by uuid, closed_at timestamptz, api_notified bool default false, api_notification_at timestamptz, metadata jsonb, office_code, department_id (FK → tb_office_departments), assigned_user_id uuid, meeting_end_time time`.

Triggers:

- `trg_set_meeting_contact_person_name` (INSERT/UPDATE) — populates `contact_person_name` from `profiles.full_name` when `contact_person` (a `user_code`) is set.
- `trg_validate_meeting_working_day_insert/update` — blocks scheduling on a `system_settings.non_working_days` day, EXCEPT when `status='InProgress'` (so users can start an off-day meeting).
- `trg_validate_meetings_contact` — regex/length validation of `contact_email` and `contact_phone`.

### 3.13 `ip_application_documents` and `er_application_documents`

Staging tables for documents uploaded by reviewers against an application. Mirror columns: `id, ssn|regno, application_reference_number / regno + source_application_reference, document_type, document_name|file_name, file_path, url, signed_url, mime_type, file_size, doc_code, verification_type, verification_category, supportive_doc_type, is_supportive, birth_status / name_status / marital_status / death_status (IP only), transfer_status default 'Pending' (CHECK in Pending|InProgress|Transferred|Failed), dms_document_id, transfer_attempts default 0, transfer_attempted_at, transfer_http_status, transfer_response_snippet, transfer_request_id, transferred_at, transferred_by, version default 1, is_active default true, is_deleted default false, metadata jsonb`.

Indexes: see Section 17.

FK: `ip_application_documents.ssn` → `ip_master.ssn` ON DELETE CASCADE.

### 3.14 `ip_documents` and `er_documents`

Master document tables (post-conversion). Mirror columns; the conversion RPC copies rows from `*_application_documents` to here in the same transaction.

Triggers:

```sql
-- ip_documents_enqueue_dms()
IF NEW.is_active = true
   AND COALESCE(NEW.transfer_status, 'Pending') = 'Pending'
   AND COALESCE(NEW.file_path, '') <> '' THEN
  INSERT INTO public.dms_transfer_queue (scope, document_id, ssn)
  VALUES ('ip', NEW.id, NEW.ssn)
  ON CONFLICT (scope, document_id) DO NOTHING;
END IF;

-- er_documents_enqueue_dms() — identical with scope='er' and regno
```

### 3.15 `dms_transfer_queue`

`id, scope varchar CHECK in ('ip','er'), document_id uuid, ssn|regno, attempts int default 0, max_attempts int default 5, next_attempt_at timestamptz default now(), last_error text, status varchar default 'Pending', created_at, updated_at`.

Unique: `(scope, document_id)`. Partial index `idx_dms_queue_pending` ON `next_attempt_at WHERE status='Pending'`.

### 3.16 `notification_templates`, `notification_queue`, `in_app_notifications`, `system_audit_trail`

- `notification_templates(id, name, channel enum, subject, title, body, html_body, placeholders jsonb, template_code, trigger_event, version_no default 1, category default 'informational', effective_from/to, is_enabled default true, module_id)`.
- `notification_queue(id, template_key|template_id, recipient_email/phone/name/user_id, channel, subject, body, template_data jsonb, module, entity_type, entity_id, status default 'pending', retry_count default 0, provider, provider_message_id, sent_at, scheduled_at)`.
- `in_app_notifications(id, user_id uuid, title, body, link, is_read default false, notification_type default 'general', priority default 'normal', metadata jsonb, module, related_record_id, …)`.
- `system_audit_trail(id, timestamp, correlation_id, user_id, session_id, api_name, module, entity_type, entity_id, severity default 'info', ip_address, device_info, payload_json jsonb, action, before_value jsonb, after_value jsonb, user_name, route)` — central audit sink.

---

## 4. Workflow Engine Analysis

### 4.1 Binding flow (auto-creation of workflow instance + first task)

```text
Grid load (e.g. /online-applications/insured-person)
        │
        ▼
useInsuredPersonApplications → callProxyApi → external portal API
        │ (returns list of applications)
        ▼
useOnlineApplicationWorkflowBinding(applications, 'insured-person')
        │
        ▼ for each application without an existing workflow_instance:
        │
        ▼  INSERT workflow_instances (status='InProgress', metadata={…})
        ▼  Resolve first step assignment:
              role          → single role_id → roles.role_name → assigned_role
              designation   → single designation_id → assigned_designation
              user          → single user_id → assigned_to
              reporting_manager → resolveReportingManagerForTask → assigned_to
        ▼  INSERT workflow_tasks (status='Pending', due_at=now+sla_hours)
        ▼  INSERT workflow_logs (action='workflow_started')
        ▼  invoke('workflow-process-notifications', { instance_id, step_id, trigger:'step_entry' })
```

Source: `src/hooks/useOnlineApplicationWorkflowBinding.ts` lines 62–251.

### 4.2 Action execution (Accept / Reject / Schedule Meeting / etc.)

```text
WorkflowActionButtons click
        │
        ▼
useExecuteWorkflowAction.mutate({ taskId, actionId, comments, sourceModule, sourceRecordId })
        │
        ├─ 1. Get current user.id + profiles.user_code
        ├─ 2. SELECT workflow_step_actions WHERE id = actionId
        ├─ 3. If action.remarks_required && !comments → throw
        ├─ 4. SELECT workflow_tasks + workflow_instances WHERE id = taskId
        ├─ 5. checkMakerCheckerRestriction (defense in depth)
        │      └─ if blocked: INSERT system_audit_trail(action='maker_checker_blocked', severity='warn') and throw
        ├─ 6. UPDATE workflow_tasks SET status='Completed', action_taken, comments, completed_at
        ├─ 7. INSERT workflow_logs (action, performed_by, details, metadata.result_status)
        ├─ 8. applyBusinessObjectFieldUpdates(instance_id, actionId, …)
        │      └─ reads workflow_action_field_updates and writes to source record (non-blocking)
        ├─ 9. executeWorkflowActionApi(...) → invoke('workflow-action-api', …) (non-blocking; warnings shown in toast)
        ├─ 10. Routing based on action.next_step_type:
        │       end_workflow         → UPDATE workflow_instances SET status=endState||'Completed', completed_at=now()
        │                              → updateSourceRecordStatus(sourceModule, ssn/regno, endState, userCode, …)
        │                              → fire 'action_taken' notification
        │       send_back_to_applicant → UPDATE workflow_instances SET status='Query', metadata.awaiting_applicant_info=true,
        │                                metadata.restart_step_id=action.next_step_id
        │                              → updateSourceRecordStatus(... 'Query' ...)
        │       specific_step         → createNextStepTask(instance_id, action.next_step_id)
        │       default (next_step)   → if currentStep.is_final_step: end workflow Approved
        │                              else: load next step (step_number+1) + createNextStepTask
        ├─ 11. (IP-only) if newStatus === 'V': invoke('dms-transfer', { ssn, userCode, ipMasterUniqueUuid, correlationId })
        └─ 12. queryClient.invalidateQueries([...workflow caches, ip-records, online-applications])
```

The full reference implementation is `src/hooks/useWorkflowActions.ts` (1,437 lines). The block above mirrors lines 440–759, 982–1092, and 1097–1430.

### 4.3 Workflow definition for IP review (current seed)

```text
[Step 1: New Request — approver_type=role, sla_hours=24]
        │
        ├─[Accept]──► end_workflow (Approved) ──► ip_master.status='V' + dms-transfer
        ├─[Reject]──► end_workflow (Rejected) ──► ip_master.status='R'
        └─[Schedule Meeting]──► pause_workflow ──► workflow_instances.status='AwaitingMeeting'
                                                  + INSERT meetings (workflow_instance_id, step_id, action_config_id)
                                                  When meeting is closed → resume workflow & re-execute Accept/Reject
```

The Employer flow is the same shape; the only differences are the workflow_id, the source_module, and the master table it writes to (`er_master`).

---

## 5. Status Transitions

### 5.1 `workflow_instances.status` matrix

| From → To | Trigger | Side-effect |
| --- | --- | --- |
| `Pending` → `InProgress` | Binding hook creates task | `current_step_id` set to first step |
| `InProgress` → `AwaitingMeeting` | "Schedule Meeting" action (pause_workflow + meeting created) | `meetings` row created; `workflow_tasks.status='Completed'` for the originating task |
| `AwaitingMeeting` → `InProgress` | Meeting closed without final decision (rescheduled) | New `workflow_tasks` row created |
| `InProgress` → `Approved` / `Completed` | Action `end_workflow` with `end_state='Approved'` (or final step default) | Master record `status='V'`; `completed_at=now()`; DMS transfer fires; `action_taken` notifications |
| `InProgress` → `Rejected` | Action `end_workflow` with `end_state='Rejected'` | Master record `status='R'`; `rejection_reason=comments`; notifications |
| `InProgress` → `Query` | Action `send_back_to_applicant` | `metadata.awaiting_applicant_info=true`; `restart_step_id` saved; source record `status='Q'` |
| `Query` → `InProgress` | Re-submission picked up by binding hook (no separate transition function — relies on metadata) | |
| Any non-terminal → `Cancelled` | Admin only (manual UPDATE) | Logged in `system_audit_trail` via trigger |

### 5.2 IP master record (`ip_master.status`)

| Code | Meaning | Set by |
| --- | --- | --- |
| `P` | Pending (after conversion) | `convert_application_atomic` RPC |
| `V` | Verified / Approved | workflow Accept → `updateSourceRecordStatus('Approved')` |
| `R` | Rejected | workflow Reject → `updateSourceRecordStatus('Rejected')` |
| `Q` | Query (awaiting applicant info) | `send_back_to_applicant` |

`verified_by` / `date_verified` / `rejected_by` / `date_rejected` / `rejection_reason` are also written. See `useWorkflowActions.ts` lines 1115–1163.

### 5.3 Employer master record (`er_master.status`)

`V` Verified, `R` Rejected, `Q` Query — exactly mirrors IP (`useWorkflowActions.ts` 1385–1430). `er_master` also writes `date_verified`, `date_modified`, `modified_by`.

### 5.4 Meeting status (`meetings.status`)

```
Scheduled → InProgress → Completed
       │         │            │
       │         └──► Cancelled│
       └──► Rescheduled (parent_meeting_id) → new Scheduled row
```

`closed_by`/`closed_at`/`outcome` are written on Completed/Cancelled. `outcome` enum drives whether to call `meeting-api-handler.close_meeting_approved`/`close_meeting_rejected`.

---

## 6. Action Button Logic

The detail page renders a flexible set of buttons. The visibility/execution rules below describe what is actually wired today.

### 6.1 Buttons rendered by `WorkflowActionButtons`

Buttons are produced dynamically by reading `workflow_step_actions` for the current step. For the seeded IP + Employer workflows the buttons are:

| Button | Visibility | Click → API/Edge → DB updates → Notifications |
| --- | --- | --- |
| **Accept** | `canPerformActions === true` (user is in step's approver role AND not blocked by maker-checker) AND `workflow_tasks.status IN ('Pending','InProgress')` | `useExecuteWorkflowAction({actionType:'Approve'})` → `workflow-action-api` (if a `workflow_step_action_api` row matches `action_code='Approve'`) → UPDATE `workflow_tasks` Completed → INSERT `workflow_logs` → `updateSourceRecordStatus('Approved')` → master record V → `dms-transfer` (IP only) → `workflow-process-notifications(trigger='action_taken', action_label='Approved')`. UI then receives `onActionComplete('Accept', 'Approved')` and the page kicks off conversion to master via `useConvertToIPRegistration`. |
| **Reject** | same as Accept | Same path but `end_state='Rejected'`; `rejection_reason = comments`. UI shows toast + grid refresh. |
| **Schedule Meeting** | same | The action is `pause_workflow`. `useExecuteWorkflowAction` exits without final-state side-effects; the UI then opens the Schedule Meeting dialog (`MeetingActionButtons`) which inserts into `meetings` (with `workflow_instance_id`, `step_id`, `action_config_id`). Trigger sets `contact_person_name`, validates working day. The workflow instance is moved to `AwaitingMeeting` by the API call. |

Hidden states:

- If `useWorkflowActions` returns `canPerformActions=false` (no permission, or maker-checker blocks), **no buttons render at all** — the component returns `null`.
- If `workflow_step_actions` for the step is empty, only the "no actions configured" placeholder shows.

### 6.2 Buttons rendered directly on the page

| Button | File / Line | Visibility condition | Click action |
| --- | --- | --- | --- |
| **Back** | `ApplicationDetailPage.tsx:245` | Always | `navigate(-1)` |
| **Refresh** | `ApplicationDetailPage.tsx:262` | Always | `refetch()` of `useExternalApplicationDetail` |
| **Go to Meeting** | `ApplicationDetailPage.tsx:266` | `activeMeeting?.status === 'InProgress'` | `navigate('/meetings/start/' + meeting.id)` |
| **Meeting actions** (Start / Reschedule / Cancel / Close-Approved / Close-Rejected) | `MeetingActionButtons` mounted at `ApplicationDetailPage.tsx:276` | A meeting exists for this application | Each call goes through the `meeting-api-handler` edge function. Close-Approved/Close-Rejected close the meeting and resume the workflow with the matching outcome. |
| **Workflow actions** (Accept / Reject / Schedule Meeting) | `WorkflowActionButtons` at `ApplicationDetailPage.tsx:285` | See 6.1 | See 6.1 |
| **View** (grid row) | `InsuredPersonApplications.tsx:344` / `EmployerApplications.tsx` | Always | `navigate('/online-applications/insured-person/<ref>')` etc. |

For Employer, equivalent buttons live in `EmployerApplicationDetailPage.tsx` plus `EmployerApplicationActions.tsx` (lines 67–149 for Accept, 150–end for Reject — full flow includes employer conversion + meeting close + workflow close).

### 6.3 Maker-checker blocking

The flag is per workflow definition (`workflow_definitions.maker_checker_enabled`). Both seeded online workflows ship with the flag **off**. When enabled:

- UI: `useWorkflowActions` calls `checkMakerCheckerRestriction` and sets `canPerformActions=false` so the buttons disappear.
- Server: `useExecuteWorkflowAction` repeats the same check and rejects the mutation, writing a `system_audit_trail` row with `action='maker_checker_blocked'`, severity `warn`.
- The check resolves the creator from (1) `workflow_instances.started_by` and (2) the `entered_by` column of `ip_master` / `er_master` matched against `profiles.user_code`. Admin role is **always** exempt.

---

## 7. Edge Functions

> All edge functions are Deno Supabase Edge Functions deployed via the Supabase CLI / Lovable Cloud tooling. They use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (irrelevant here) and resolve the calling user via the `Authorization` bearer header.

### 7.1 `workflow-action-api`

**File**: `supabase/functions/workflow-action-api/index.ts` (699 lines).

**Purpose**: For an executing workflow action, look up the configured external API (`workflow_step_action_api` + `workflow_step_action_api_body`), build a JSON body from `value_source` mappings (`APPLICATION | MEETING | WORKFLOW | SYSTEM | STATIC`), call it (HTTP method/url/timeout/retry from the row), and write a `workflow_api_execution_log` entry. Returns `{success, warning?, skipped?}` so the caller can show a toast but not block the workflow.

**Input** (`ExecuteApiRequest`):
```ts
{
  action: 'execute' | 'get_config' | 'retry',
  workflowId, workflowStepId, workflowInstanceId, taskId, actionCode,
  applicationData: {...},   // built by useWorkflowActions.fetchApplicationData
  meetingData: {...},       // built by useWorkflowActions.fetchMeetingData
  workflowContext: { action_code, instance_id, step_id, task_id, source_module, source_record_id, user_remarks }
}
```

**Output**:
```ts
{ success: boolean, warning?: string, skipped?: boolean, http_status?: number, executionLogId?: string }
```

**Key helpers**: `buildRequestBody`, `getNestedValue`/`setNestedValue` (dot-notation), `resolveUrlPlaceholders('{{key}}')`.

### 7.2 `workflow-process-notifications`

**File**: `supabase/functions/workflow-process-notifications/index.ts` (494 lines).

**Purpose**: Dispatcher for step / action notifications. Reads from `workflow_step_notifications` (on `step_entry`) or `workflow_action_notifications` (on `action_taken`), expands recipients (`next_step_approver | started_by | role | specific_users | …`), renders the matching `notification_templates` row, and enqueues into `notification_queue` and/or `in_app_notifications`.

**Input**:
```ts
{ instance_id, step_id, action_id?, trigger: 'step_entry'|'action_taken',
  action_label?, action_by?, action_by_name?, comments? }
```

**Side effects**: rows inserted into `notification_queue` and `in_app_notifications`; the recipient gets an in-app toast and an email (channel-dependent).

### 7.3 `workflow-notify-approvers` / `workflow-notify-requester`

Legacy single-purpose dispatchers that are still called from a handful of admin flows. The Online Application module **does not** call them directly — it relies on `workflow-process-notifications` for both step entry and action notifications.

### 7.4 `proxy-api`

Generic outbound proxy. Resolves the API base + headers from `api_settings`/`api_registry` by `module` name (`insured-person-applications`, `employer-applications`, `doctor-applications`), forwards the request, and returns `{ _proxyOk, data | error }`. All Online Application list/detail reads go through this function.

### 7.5 `dms-transfer`

Triggered when an IP record is approved. Looks up `ip_documents` (and queue rows from `dms_transfer_queue`) for the given SSN, streams each file via `document-proxy`, posts it to the external DMS, updates `transfer_status` + `dms_document_id`, and returns `{ successCount, failCount, correlationId }`. Non-blocking — failure surfaces as a toast but does not roll back approval.

### 7.6 `document-proxy`

Stream / download proxy used by the frontend to fetch document blobs without leaking storage URLs. Called from `ApplicationDetailPage` (header photo) and `ApplicationDocumentsTab`.

### 7.7 `meeting-api-handler`

Single edge function for all meeting writes (`create`, `reschedule`, `cancel`, `close_meeting_approved`, `close_meeting_rejected`, `start_meeting`). Used by `MeetingActionButtons` and `EmployerApplicationActions`. The close actions also call back into the workflow engine to resume / complete the parent `workflow_instances`.

---

## 8. API & Service Layer

### 8.1 External APIs (consumed via `proxy-api`)

| Logical module | Endpoint pattern | Methods | Notes |
| --- | --- | --- | --- |
| `insured-person-applications` | `/applications`, `/applications/{id}`, `/applications/{id}/approve`, `/applications/{id}/reject` | GET / POST | Base url & headers come from `api_settings` row linked to the module. |
| `employer-applications` | `/?page=…&limit=…&status=…&sortBy=…&sortOrder=…&search=…`, `/{id}`, `/{id}/approve`, `/{id}/reject` | GET / POST | Pagination metadata returned in `{ data, total, totalPages, page, limit }`. |

### 8.2 Supabase RPCs

| RPC | Caller | Purpose |
| --- | --- | --- |
| `generate_application_id` | `useConvertToIPRegistration` | Issues a new `application_id` for `ip_master`. |
| `generate_temp_ssn` | `useConvertToIPRegistration` | Issues a 6-char temp SSN until permanent SSN allocated. |
| `ip_app_docs_resolve_for_conversion(p_application_reference, p_external_docs)` | `useConvertToIPRegistration` | Returns `{ merged, decisions, missing_mandatory }`. Reviewer uploads win, mandatory categories enforced. |
| `convert_application_atomic(p_unique_uuid, …, p_dependants, p_documents, p_doc_decisions)` | `useConvertToIPRegistration` | Single transaction: inserts `ip_master`, `ip_depend`, `ip_application_documents` (staging), mirrors to `ip_documents`, writes `ip_application_doc_merge_audit`, and (when config exists) calls `initiate_ip_registration_workflow` returning `workflow_instance_id`. |
| `convert_employer_application_atomic(...)` | `useConvertToEmployerRegistration` | Equivalent for employer. |
| `initiate_ip_registration_workflow(p_unique_uuid, …)` | Called inside `convert_application_atomic` | Creates `workflow_instances` + first task for the post-conversion review (separate from the Online Application review workflow). |

### 8.3 In-process services

| Service | Method | Request / Response |
| --- | --- | --- |
| `workflowEligibilityService.checkWorkflowEligibility` | `{ sourceRecordId }` → `{ eligible: boolean, reason?: string, workflow?: {...} }` | Used after conversion to show the manual initiation dialog only when an open workflow can be started. |
| `workflowTriggerService.triggerIPRegistrationWorkflow` | `{ sourceRecordId, applicantName, userId, userCode }` → `{ instanceId }` | Inserts `workflow_instances` + first task; mirrors the binding hook logic. |
| `resolveReportingManagerService.resolveReportingManagerForTask` | `(userId, instanceId, stepId, stepName)` → `{ managerId } \| null` | Dynamically resolves manager from `profiles.designation_id` + `designation_hierarchy` + `reporting_manager_id`. |

---

## 9. Business Rules

| # | Rule | Implementation |
| --- | --- | --- |
| BR-OA-01 | The list grid must hide applications already approved+converted to master to avoid duplicate processing. | `useInsuredPersonApplications.fetchApprovedConvertedRefs` reads `workflow_instances` where `status='Approved'` and excludes those `source_record_id`s. (`useOnlineApplications.ts:78–98`) |
| BR-OA-02 | Every visible application must have a workflow instance. | `useOnlineApplicationWorkflowBinding` creates one if missing; batched 5 at a time; per-tab `hasRunRef` prevents re-runs. |
| BR-OA-03 | Only the active workflow definition is bound. | `useOnlineApplicationWorkflowBinding` checks `workflow_definitions.is_active` and aborts if inactive. |
| BR-OA-04 | Action buttons are only shown to the assigned approver of the current step. | `useWorkflowActions.checkUserPermissionOptimized` — matches `approver_type` (`role | designation | user/specific_users | reporting_manager`) and a normalised role-name compare (case + underscore tolerant). Admin role always passes. |
| BR-OA-05 | Maker-checker: creator cannot act on own record (when enabled on workflow definition). | `useWorkflowActions.checkMakerCheckerRestriction` (UI) + same function called inside `useExecuteWorkflowAction.mutationFn` (server). Admin role exempt. Blocked attempt logged to `system_audit_trail`. |
| BR-OA-06 | "Schedule Meeting" pauses the workflow but does not terminate it. | Action `next_step_type='pause_workflow'`; UI then schedules a meeting tied to the same `workflow_instance_id` + `step_id`. Workflow resumes when the meeting closes via `meeting-api-handler`. |
| BR-OA-07 | A meeting cannot be scheduled on a non-working day. | DB trigger `validate_meeting_working_day()` (skipped only when `status='InProgress'`). |
| BR-OA-08 | Contact email must be valid + ≤100 chars; contact phone digits only + ≤20 chars. | DB trigger `validate_meetings_contact_fields()`. |
| BR-OA-09 | Conversion to IP master is **atomic** — either everything is created or nothing. | `convert_application_atomic` runs ip_master + dependants + documents + master mirror + workflow init inside one transaction. |
| BR-OA-10 | Reviewer-uploaded documents always win over the external portal copy. | `ip_app_docs_resolve_for_conversion` returns `decisions` ('replaced_by_reviewer', 'reviewer_added', 'deleted_by_reviewer', 'kept_external'). The hook throws if resolver fails — never silently falls back. |
| BR-OA-11 | Mandatory documents must be present, or conversion is aborted. | `MANDATORY_DOCUMENTS_MISSING` thrown when resolver returns a non-empty `missing_mandatory`. |
| BR-OA-12 | Duplicate conversion is blocked. | RPC raises a `DUPLICATE_CONVERSION` error if `ip_master.unique_uuid` or `ssn` already exists; hook surfaces it as a friendly toast and does NOT show the generic error. |
| BR-OA-13 | DMS transfer is non-blocking. | After approval (status `V`), `dms-transfer` is invoked but errors surface as toast only; the workflow Approved state is committed regardless. |
| BR-OA-14 | Audit identity must use `user_code` (5-char alphanumeric), not the auth uuid. | All `entered_by` / `verified_by` / `modified_by` / `rejected_by` columns store `profiles.user_code`. `updateSourceRecordStatus` resolves the user_code before writing. |
| BR-OA-15 | Notification dispatch is fire-and-forget. | Both binding and action-execute paths invoke `workflow-process-notifications` with `.then(({error}) => console.error…)` — failure never blocks the user-visible action. |

---

## 10. Validations

### 10.1 Frontend (client-side preflight)

`validateApplicationForConversion(app)` in `useConvertToIPRegistration.ts:84–131`. Field rules:

| Field | Rule | Error message |
| --- | --- | --- |
| `firstName` | required, ≤25 chars | "First name is required" / "First name exceeds 25 characters" |
| `lastName` | required, ≤25 chars | similar |
| `gender` | required | "Gender is required" |
| `dateOfBirth` | required + parseable | "Date of birth is required" / "Date of birth is not a valid date" |
| `maritalStatus` | required | "Marital status is required" |
| `nationality` | required, ≤3-char code | "Nationality code … exceeds 3 characters" |
| `placeOfBirth` | required, ≤3-char code | "Place of birth code … exceeds 3 characters" |
| `title` | required | "Title is required" |
| `dateMarried` | required if marital is Married/Common Law | "Date married is required …" |
| `workPermitExpiry` | required if `hasWorkPermit` is truthy | "Work permit expiry date is required …" |
| `email` | ≤40 chars | "Email exceeds 40 characters" |

For Employer, equivalent rules live in `useConvertToEmployerRegistration.validateEmployerApplicationForConversion`.

Workflow execution preflight: `useExecuteWorkflowAction` throws "Reviewer comments are mandatory for this action" if `workflow_step_actions.remarks_required && !comments` (lines 484–486).

### 10.2 Backend (RPC)

`convert_application_atomic` raises typed Postgres exceptions:

| Code/Prefix | Cause |
| --- | --- |
| `VALIDATION_FAILED` | Missing reference number, invalid date format, length overflows beyond client-side guards. |
| `MANDATORY_DOCUMENTS_MISSING` | Resolver returned non-empty `missing_mandatory`. |
| `DUPLICATE_CONVERSION` | `ssn` / `unique_uuid` / `application_reference_number` already exists. |
| `INSERT_FAILED` | Underlying constraint violation on `ip_master`, `ip_depend`, `ip_application_documents`. |
| `SUBMIT_FAILED` | Final commit failed after partial inserts (transaction rolled back). |

### 10.3 Database (triggers + CHECKs)

| Object | Rule |
| --- | --- |
| `chk_transfer_status` on `ip_application_documents` | `transfer_status` ∈ {Pending, InProgress, Transferred, Failed}. |
| `dms_transfer_queue_scope_check` | `scope` ∈ {ip, er}. |
| `workflow_steps_approver_type_check` | `approver_type` ∈ {role, designation, specific_users, department_head, designation_hierarchy, reporting_manager}. |
| `trg_validate_meeting_working_day_insert/update` | Meeting date must not fall on a `system_settings.non_working_days` day (unless `status='InProgress'`). |
| `trg_validate_meetings_contact` | Phone must match `^\+?[0-9]+$` and ≤20; email must match standard regex and ≤100. |
| Unique `(workflow_id, step_number)` on `workflow_steps` | Prevents duplicate step numbers per workflow. |
| Unique `(scope, document_id)` on `dms_transfer_queue` | Idempotent enqueue. |
| Unique `meeting_reference` | Prevents duplicate meeting numbers. |

---

## 11. Error Handling

> Project rule: errors are shielded — translate to a friendly UI message and fire-and-forget the technical details to `system_error_logs` via `logApplicationError`.

| Code / Token | Trigger | Recovery / UI |
| --- | --- | --- |
| `DUPLICATE_CONVERSION` | Atomic RPC sees existing SSN/uuid. | Toast: "This application has already been converted to an IP record." Hook returns `{success:false}` silently for the grid (no error toast). |
| `MANDATORY_DOCUMENTS_MISSING: <list>` | Resolver flags missing categories. | Toast with the list. User uploads the missing docs and retries. |
| `DOCUMENT_RESOLVER_FAILED: <msg>` | `ip_app_docs_resolve_for_conversion` RPC throws. | Toast: "Could not resolve the reviewer document set. Conversion aborted to avoid losing uploaded documents. Please retry." |
| `Reviewer comments are mandatory for this action` | `useExecuteWorkflowAction` server-side check. | Toast; the action dialog re-opens with comments field focused. |
| `You cannot perform this action on a record you created or submitted (maker-checker policy).` | Server-side maker-checker check. | Toast; UI buttons already hidden when policy is enabled. Attempt logged to `system_audit_trail`. |
| `Action not found` / `Task not found` | Stale UI clicking after status change. | Toast; user refreshes. |
| `Workflow API warning: …` | `workflow-action-api` non-2xx but action otherwise committed. | Toast.warning showing the warning; the workflow continues. |
| `DMS Transfer Error` | `dms-transfer` invocation error. | Toast.error; the approval still stands; queue retries up to `max_attempts=5` from `dms_transfer_queue`. |
| External proxy errors (`_proxyOk:false`) | `proxy-api` returns `{ _proxyOk:false, error }`. | Surface the embedded error in the grid alert ("Make sure the API is configured correctly in Administration → API Configuration"). |
| `Not authenticated` | `useExecuteWorkflowAction` if `supabase.auth.getUser()` empty. | Toast; user is bounced to login by the AuthContext. |

All non-trivial errors funnel through `logApplicationError(err, { module, action, entity_type, entity_id, request_payload })` so they end up in `system_error_logs` for the operations team without leaking details to the user.

---

## 12. Notifications

### 12.1 Triggers

| Source | Trigger code | Sent by |
| --- | --- | --- |
| First task created for an application | `step_entry` | `useOnlineApplicationWorkflowBinding` invokes `workflow-process-notifications`. |
| Next step task created after an action | `step_entry` | `createNextStepTask` in `useWorkflowActions.ts:1077`. |
| `end_workflow` action executed (Approve/Reject) | `action_taken` | `useExecuteWorkflowAction.ts:639` and `:701`. |

### 12.2 Recipients

`workflow_step_notifications.recipient_type` / `workflow_action_notifications.recipient_type` values currently handled:

- `next_step_approver` (default) — resolved from next step's assigned role/users.
- `started_by` — uses `workflow_instances.started_by`.
- `role` — uses `recipient_role_id`.
- `specific_users` — users from the matching action/step's user list.

### 12.3 Templates

`notification_templates` rows referenced by `template_id`. Each template carries `channel` (email / sms / in_app), `subject`, `title`, `body`, `html_body`, and `placeholders` (JSON list of variable names). The edge function does a `{{var}}` substitution against `{ workflow_name, source_record_name, source_record_id, step_name, action_label, action_by_name, comments, link, ... }`.

### 12.4 Delivery

The dispatcher inserts into `notification_queue` (channel-specific worker picks up) and `in_app_notifications` (read by the `NotificationBell` realtime subscriber). All inserts use `service_role`.

---

## 13. Audit Logging

### 13.1 Tables used

| Table | Written by | Purpose |
| --- | --- | --- |
| `workflow_logs` | `useExecuteWorkflowAction` (`:550–561`), `useOnlineApplicationWorkflowBinding` (`:213–223`) | Per-instance action timeline. |
| `workflow_execution_logs` | `workflow-action-api` edge function | Observability of outbound API calls (timing, status, payload). |
| `workflow_api_execution_log` | `workflow-action-api` | Request/response of every configured API call. |
| `workflow_security_audit_log` | Workflow permission service (read-side) | Every permission decision (`access_granted`, `denial_reason`). |
| `system_audit_trail` | `useExecuteWorkflowAction` (maker_checker_blocked), `audit_table_changes` trigger on `workflow_instances`, edge functions | Cross-cutting audit. |
| `ip_audit_log` | `useExecuteWorkflowAction.updateSourceRecordStatus` (`:1155–1163`), `useConvertToIPRegistration` (`:470–479`) | Per-IP record action log (`VERIFY`, `REJECT`, `QUERY`, `CONVERSION`). |
| `er_audit_log` | Equivalent path for Employer (`:1426` onward). |
| `system_error_logs` | `logApplicationError` everywhere | Technical error sink. |

### 13.2 User tracking

- `ip_master` / `er_master`: `entered_by`, `verified_by`, `rejected_by`, `modified_by` all store **`profiles.user_code`** (5-char), per project rule.
- `workflow_logs.performed_by` / `workflow_tasks.assigned_to` / `workflow_instances.started_by` store `profiles.id` (UUID).
- `system_audit_trail.user_name` stores `profiles.user_code` for cross-module readability.

---

## 14. Security Model

### 14.1 Authentication

Supabase JS client manages the session. `SupabaseAuthContext` exposes `user`, `roles`, `isAuthReady`, `isAuthenticated`. All hooks gate execution on `isAuthReady && isAuthenticated`.

### 14.2 Authorization

- Roles are stored in `user_roles(user_id, role)` (per project NO-RLS architecture, but still the source of truth).
- `useWorkflowActions` resolves `dbRoles = [user_roles.role…]` plus `contextRoleNames` from the auth context, then normalises (lowercase + underscore-tolerant compare) against `workflow_steps.approver_role_ids → roles.role_name`.
- Designation path: `profiles.designation_id` matched against `workflow_steps.approver_designation_ids`.
- Specific users path: `step.approver_user_ids` array contains `auth.uid`.
- Reporting manager path: task is pre-assigned at creation; only the resolved manager passes.
- Admin override (`useWorkflowActions:329`, `:413`): users with role `admin` bypass approver checks AND maker-checker.

### 14.3 Maker-checker

Per workflow toggle `workflow_definitions.maker_checker_enabled`. When on, the creator (resolved from `workflow_instances.started_by` OR the source record's `entered_by` `user_code`) cannot execute actions on the same record. Enforced in UI and again server-side; blocked attempts written to `system_audit_trail`.

### 14.4 RLS

Disabled in `public`. The migration MUST still issue `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated; GRANT ALL … TO service_role;` for every table created.

### 14.5 Protected actions

- Document fetch: only via `document-proxy` (no signed URLs leaked to the browser).
- External API calls: only via `proxy-api`.
- Conversion: only via `convert_application_atomic` / `convert_employer_application_atomic` RPCs (no direct INSERT to `ip_master` from client).
- DMS transfer: only via `dms-transfer` edge function.

---

## 15. Dependency Map

```text
Online Applications module
├── External APIs
│   ├── insured-person-applications (via proxy-api)
│   └── employer-applications        (via proxy-api)
├── Edge Functions
│   ├── proxy-api
│   ├── workflow-action-api
│   ├── workflow-process-notifications
│   ├── meeting-api-handler
│   ├── document-proxy
│   └── dms-transfer
├── Hooks / Services
│   ├── useOnlineApplications / useEmployerApplications
│   ├── useOnlineApplicationWorkflowBinding
│   ├── useApplicationWorkflowStatus
│   ├── useWorkflowActions / useExecuteWorkflowAction
│   ├── useApplicationMeeting
│   ├── useConvertToIPRegistration / useConvertToEmployerRegistration
│   ├── workflowEligibilityService / workflowTriggerService
│   └── resolveReportingManagerService
├── Database (workflow engine)
│   ├── workflow_definitions
│   ├── workflow_steps
│   ├── workflow_step_actions
│   ├── workflow_action_configurations / outcomes / types / field_updates / notifications
│   ├── workflow_step_notifications
│   ├── workflow_step_action_api / workflow_step_action_api_body
│   ├── workflow_api_configurations / workflow_api_execution_log
│   ├── workflow_instances / workflow_tasks
│   ├── workflow_logs / workflow_execution_logs / workflow_security_audit_log
│   ├── workflow_role_assignments / workflow_triggers / workflow_meeting_departments
│   └── workflow_mappings
├── Database (Online Application)
│   ├── ip_application_documents → ip_documents → dms_transfer_queue
│   ├── er_application_documents → er_documents → dms_transfer_queue
│   ├── ip_master / er_master (master records)
│   ├── meetings
│   └── system_audit_trail / ip_audit_log / er_audit_log / system_error_logs
└── Cross-cutting
    ├── profiles (user_code, designation_id, reporting manager)
    ├── roles + user_roles (auth model)
    ├── notification_templates / notification_queue / in_app_notifications
    └── api_settings / api_registry (external API metadata)
```

---

## 16. Complete Migration Guide for Claude

> Execute the steps in this order. Each step is small enough to fit in a single migration / file write.

### Step 1 — Database: workflow engine

Create the workflow engine tables. Order matters because of foreign keys.

1. Enums (`workflow_instance_status`, `workflow_step_action_type`, `next_step_type`, `meeting_type`, `meeting_status`, `meeting_outcome`).
2. `workflow_definitions` → `workflow_steps` → `workflow_step_actions`.
3. `workflow_action_types`, `workflow_action_configurations`, `workflow_action_outcomes`, `workflow_action_field_updates`, `workflow_action_notifications`.
4. `workflow_step_notifications`.
5. `workflow_step_action_api`, `workflow_step_action_api_body`.
6. `workflow_api_configurations`, `workflow_api_execution_log`.
7. `workflow_instances`, `workflow_tasks`, `workflow_logs`, `workflow_execution_logs`, `workflow_security_audit_log`.
8. `workflow_role_assignments`, `workflow_triggers`, `workflow_meeting_departments`, `workflow_mappings`.
9. `audit_table_changes` trigger on `workflow_instances` (fn_audit_row_change).
10. **Issue GRANTs** on every public table: `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated; GRANT ALL … TO service_role;`

### Step 2 — Database: Online Application + meeting + DMS

1. `meetings` table with `meeting_type`/`meeting_status`/`meeting_outcome` enums and FKs to `workflow_instances`/`workflow_steps`/`workflow_action_configurations`/`tb_office_departments`. Add the 3 triggers (`set_meeting_contact_person_name`, `validate_meeting_working_day`, `validate_meetings_contact_fields`) using the function bodies in §3.12 above.
2. `ip_application_documents`, `er_application_documents` with all transfer columns + CHECK constraint + indexes.
3. `ip_documents`, `er_documents` (master tables) + `trg_ip_documents_enqueue_dms` / `trg_er_documents_enqueue_dms` triggers (verbatim from §3.14).
4. `dms_transfer_queue` + unique `(scope, document_id)` + partial pending index.
5. `notification_templates`, `notification_queue`, `in_app_notifications`, `system_audit_trail`, `system_error_logs` if not already present.
6. RPC functions: `generate_application_id`, `generate_temp_ssn`, `ip_app_docs_resolve_for_conversion`, `convert_application_atomic`, `convert_employer_application_atomic`, `initiate_ip_registration_workflow`. The function bodies are large — port them verbatim from the existing migrations.
7. GRANTs on every new table.

### Step 3 — Seed workflow definitions

```sql
INSERT INTO workflow_definitions (id, name, description, process_type, default_sla_hours, is_active, maker_checker_enabled)
VALUES
  ('cc5f077d-b7f7-4b2c-a354-4babcfee5b95', 'Online IP Registration Review Workflow',
   'Auto-bound review workflow for online IP applications', 'Document Review', 24, true, false),
  ('bf8e92bc-527f-4c67-8c65-1ed5df59fb84', 'Online Employer Registration Review Workflow V2',
   'Auto-bound review workflow for online employer applications', 'Document Review', 24, true, false);

-- For each definition, insert step 1 "New Request" with approver_type='role'
-- and the 3 actions (Accept end_workflow Approved, Reject end_workflow Rejected,
-- Schedule Meeting pause_workflow NULL).
```

### Step 4 — Edge functions

Deploy in this order (each has zero dependencies on the others at runtime):

1. `proxy-api` — needed before any list loads.
2. `document-proxy` — needed before any documents render.
3. `workflow-process-notifications` — needed for binding to succeed without warnings.
4. `workflow-action-api` — needed for action execution to log API calls (skips cleanly when no row in `workflow_step_action_api`).
5. `meeting-api-handler`.
6. `dms-transfer`.

Each function must verify the caller via `Authorization: Bearer <jwt>` and use `SUPABASE_SERVICE_ROLE_KEY` for DB writes. Add the standard CORS headers shown in §7.1.

### Step 5 — Frontend services + hooks

1. Auth context (`SupabaseAuthContext`) with `roles`, `isAuthReady`, `isAuthenticated`.
2. `useSupabaseAuth`, `useUserCode`, `getCurrentUserCode`.
3. `correlationIdService`, `logApplicationError`.
4. `resolveReportingManager` service.
5. `proxy-api` typed client + `useApiSettings`.
6. Workflow hooks: `useWorkflowActions` (with `useExecuteWorkflowAction`), `useApplicationWorkflowStatus`, `useOnlineApplicationWorkflowBinding`.
7. Online Application hooks: `useOnlineApplications`, `useEmployerApplications`, `useExternalApplicationDetail`, `useEmployerApplicationDetail`, `useApplicationMeeting`.
8. Conversion hooks: `useConvertToIPRegistration`, `useConvertToEmployerRegistration`.
9. Eligibility + trigger services: `workflowEligibilityService`, `workflowTriggerService`, `employerWorkflowTriggerService`.

### Step 6 — Frontend pages + components

1. Shared components: `WorkflowActionButtons`, `WorkflowInitiationDialog`, `MeetingActionButtons`.
2. Online Application components: `WorkflowStatusCell`, `ApplicationDocumentsTab`, `ConversionValidationPanel`, `EmployerApplicationActions`.
3. Pages: `InsuredPersonApplications`, `ApplicationDetailPage`, `EmployerApplications`, `EmployerApplicationDetailPage`.
4. Routes wired in `AppRoutes.tsx`:
   ```tsx
   <Route path="/online-applications/insured-person" element={<InsuredPersonApplications />} />
   <Route path="/online-applications/insured-person/:referenceNumber" element={<ApplicationDetailPage />} />
   <Route path="/online-applications/employer" element={<EmployerApplications />} />
   <Route path="/online-applications/employer/:applicationId" element={<EmployerApplicationDetailPage />} />
   ```
5. Sidebar entries under System Admin → Online Applications.

### Step 7 — Smoke test (end-to-end)

1. Configure `api_settings` for `insured-person-applications` and `employer-applications` modules pointing at the external sandbox.
2. Log in as an admin and navigate to `/online-applications/insured-person`. Confirm the grid loads, workflow status badges render, and that workflow instances are created for previously-unseen applications (check `workflow_instances` and `workflow_logs`).
3. Open one application. Click **Schedule Meeting** → confirm `meetings` row created, `workflow_instances.status='AwaitingMeeting'`, in-app notification fired.
4. Go to the meeting, click Close → Approved. Confirm workflow resumes and reaches the Accept action automatically.
5. Click **Accept**. Confirm: `workflow_tasks` Completed → `workflow_instances` Approved → `ip_master` row created via conversion → `ip_documents` rows mirrored → `dms_transfer_queue` rows enqueued → toast confirming DMS transfer counts.
6. Repeat 2–5 for an Employer application using the Employer detail page.
7. Verify maker-checker by enabling `maker_checker_enabled=true` on a copy of the workflow, then trying to act as the same user who started the instance. Buttons disappear; attempting via API returns 400 and writes to `system_audit_trail`.

### Step 8 — Known risks

- **NO-RLS architecture** — forgetting `GRANT` statements on a new table breaks the entire feature. Every `CREATE TABLE` MUST be followed by the four-line grant block.
- **Maker-checker gating** — both UI hiding AND server-side check must remain. Removing the server check is a privilege escalation.
- **`dms_transfer_queue` retries** — the queue has `max_attempts=5`; a separate background job is responsible for replays. Don't leave it without a worker.
- **Idempotency** — `useOnlineApplicationWorkflowBinding` deduplicates per tab; if you re-key on re-render you can create duplicate instances.
- **`source_module` naming drift** — both `online-insured-person-applications` (used by the binding hook + grids) and `insured_person_registration` (used by `useWorkflowActions.creatorCheckMap`) exist. Keep both keys aligned in your seed / configuration.
- **Application reference vs application id** — the binding hook prefers `referenceNumber` and falls back to `applicationId`; mismatches between the external portal and back office break workflow lookups.

### Migration checklist

- [ ] All workflow engine tables created with grants.
- [ ] Online Application tables (`*_application_documents`, `*_documents`, `dms_transfer_queue`, `meetings`) created with triggers and grants.
- [ ] RPCs (`convert_application_atomic`, `convert_employer_application_atomic`, `ip_app_docs_resolve_for_conversion`, `initiate_ip_registration_workflow`, `generate_*`) created with `SECURITY DEFINER` and `SET search_path=public`.
- [ ] All 6 edge functions deployed.
- [ ] Workflow definitions + steps + 3 actions seeded for both flows.
- [ ] `api_settings` rows configured for both external APIs.
- [ ] Frontend hooks + pages + routes + sidebar entries wired.
- [ ] Smoke test passes for IP and Employer.
- [ ] Maker-checker verified.
- [ ] DMS transfer worker present.

---

## 17. Source Code References

### Frontend

| Concern | File | Key lines |
| --- | --- | --- |
| IP list page | `src/pages/online-applications/InsuredPersonApplications.tsx` | 24–385 |
| IP detail page | `src/pages/online-applications/ApplicationDetailPage.tsx` | 50–803 |
| Employer list page | `src/pages/online-applications/EmployerApplications.tsx` | 1–475 |
| Employer detail page | `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | 119–944 |
| Documents tab | `src/components/online-applications/ApplicationDocumentsTab.tsx` | 1–300 |
| Conversion validation panel | `src/components/online-applications/ConversionValidationPanel.tsx` | 1–97 |
| Employer accept/reject actions | `src/components/online-applications/EmployerApplicationActions.tsx` | 33–360 |
| Workflow status cell | `src/components/online-applications/WorkflowStatusCell.tsx` | 1–111 |
| Workflow action buttons | `src/components/workflow/WorkflowActionButtons.tsx` | — |
| Workflow initiation dialog | `src/components/workflow/WorkflowInitiationDialog.tsx` | — |
| Meeting action buttons | `src/components/meetings/MeetingActionButtons.tsx` | — |
| Workflow context hook | `src/hooks/useWorkflowActions.ts` | 71–209 (read), 440–759 (execute), 985–1092 (next step), 1097–1430 (status updates) |
| Workflow binding hook | `src/hooks/useOnlineApplicationWorkflowBinding.ts` | 14–30 (config), 62–251 (bind), 262–439 (loop) |
| Workflow status hook | `src/hooks/useApplicationWorkflowStatus.ts` | 36–229 |
| IP applications hook | `src/hooks/useOnlineApplications.ts` | 78–185 |
| Employer applications hook | `src/hooks/useEmployerApplications.ts` | 1–345 |
| Convert to IP | `src/hooks/useConvertToIPRegistration.ts` | 84–131 (preflight), 237–268 (doc resolver), 272–552 (convert mutation) |
| Convert to Employer | `src/hooks/useConvertToEmployerRegistration.ts` | (mirrors IP convert) |
| Application meeting hook | `src/hooks/useApplicationMeeting.ts` | — |
| Legacy applications service | `src/services/onlineApplicationsService.ts` | 44–181 |
| Eligibility service | `src/services/workflowEligibilityService.ts` | — |
| Trigger service | `src/services/workflowTriggerService.ts`, `src/services/employerWorkflowTriggerService.ts` | — |
| Reporting manager resolver | `src/services/resolveReportingManager.ts` | — |
| Routes | `src/components/routing/AppRoutes.tsx` | 458–468, 2244–2249 |
| Sidebar | `src/components/sidebar/menuItems/systemAdminMenuItems.ts` | 353–365 |

### Edge functions

| Function | File | Notes |
| --- | --- | --- |
| `workflow-action-api` | `supabase/functions/workflow-action-api/index.ts` | 1–699 |
| `workflow-process-notifications` | `supabase/functions/workflow-process-notifications/index.ts` | 1–494 |
| `proxy-api` | `supabase/functions/proxy-api/index.ts` | — |
| `document-proxy` | `supabase/functions/document-proxy/index.ts` | — |
| `dms-transfer` | `supabase/functions/dms-transfer/index.ts` | — |
| `meeting-api-handler` | `supabase/functions/meeting-api-handler/index.ts` | — |

### Database

| Object | Notes |
| --- | --- |
| Workflow tables | `workflow_definitions`, `workflow_steps`, `workflow_step_actions`, `workflow_action_*`, `workflow_step_notifications`, `workflow_step_action_api[_body]`, `workflow_api_configurations`, `workflow_api_execution_log`, `workflow_instances`, `workflow_tasks`, `workflow_logs`, `workflow_execution_logs`, `workflow_security_audit_log`, `workflow_role_assignments`, `workflow_triggers`, `workflow_meeting_departments`, `workflow_mappings` |
| Application tables | `ip_application_documents`, `er_application_documents`, `ip_documents`, `er_documents`, `dms_transfer_queue`, `meetings` |
| Master tables | `ip_master`, `er_master` |
| Audit | `system_audit_trail`, `ip_audit_log`, `er_audit_log`, `system_error_logs` |
| Cross-cutting | `profiles`, `roles`, `user_roles`, `app_modules`, `api_settings`, `notification_templates`, `notification_queue`, `in_app_notifications`, `tb_office_departments` |
| Triggers | `ip_documents_enqueue_dms`, `er_documents_enqueue_dms`, `set_meeting_contact_person_name`, `validate_meeting_working_day`, `validate_meetings_contact_fields`, `audit_table_changes` |
| RPCs | `generate_application_id`, `generate_temp_ssn`, `ip_app_docs_resolve_for_conversion`, `convert_application_atomic`, `convert_employer_application_atomic`, `initiate_ip_registration_workflow` |

---

*End of document.*
