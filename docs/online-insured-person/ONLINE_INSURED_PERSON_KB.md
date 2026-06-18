# Online Insured Person (Online IP) Module — Knowledge Base

**Audience:** Product, business, ops, developers, and Claude (or any future AI/dev) who needs to rebuild the same module on a different stack.
**Source of truth:** the current Lovable codebase. Every behaviour described below is derived from the files listed in the appendix. If code and this document disagree, the code wins — please update this document.

---

## 1. Module Overview

### 1.1 Purpose

The Online Insured Person (Online IP) module is the **internal review-and-conversion workspace** for IP registration applications that the public submits through the external public portal.

It does **not** capture the application — that happens on the public portal and lands in a remote registration system. This module:

1. **Fetches** those externally-submitted applications (live, via a proxy edge function).
2. **Binds a workflow instance** to every new application automatically, so reviewers/approvers receive a task.
3. **Lets staff review** every field, every dependant and every uploaded document for one application.
4. **Routes the application through the approval workflow** (`workflow_definitions` row `cc5f077d-b7f7-4b2c-a354-4babcfee5b95` — *Online IP Registration Review Workflow*).
5. **On final approval, converts the application** into a real `ip_master` record (+ dependants in `ip_depend`, + documents queued to DMS) via the `convert_application_to_ip` Postgres RPC.
6. **Removes** the converted application from the working list (next refresh).

### 1.2 Primary actors

| Actor | Typical responsibilities |
| --- | --- |
| Registration officer / data-entry clerk | Open the application, sanity-check details and documents, take the first workflow action (typically "Send for Review") |
| Supervisor / senior officer | Approve or reject the application from the workflow Approval Console or the detail page |
| Head of Registration | Final approver on workflows configured with multiple approval steps |
| System (auto-binding hook) | Creates the workflow instance + first task on first sight of a new reference number |

> Roles are not hard-coded — they are derived per workflow step from `workflow_steps.approver_type` + the matching `approver_role_ids` / `approver_designation_ids` / `approver_user_ids` columns.

### 1.3 Problem solved

- A bridge between the external (public-facing) submission API and the internal IP master records.
- Enforces a controlled, audited approval path before any external submission becomes a real IP record.
- Centralises status, documents, conversion validation and downstream master-record creation in one screen flow.
- Guarantees idempotency — a reference number can only generate one workflow instance and one `ip_master` row.

---

## 2. System Context & Data Sources

### 2.1 External application data

- Source: external registration API.
- Reached only through the **Supabase edge function `proxy-api`** with `module = "insured-person-applications"`.
- Endpoints used:
  - `GET /applications` (with optional query: `status`, `fromDate`, `toDate`, `search`) — list
  - `GET /applications/{id}` — detail
  - `POST /applications/{id}/approve` — accept (legacy external accept)
  - `POST /applications/{id}/reject` — reject (legacy external reject)
- Live-fetched on every screen visit. There is **no local mirror table** for online IP applications. Reasoning: the external system remains the source of truth until conversion.

### 2.2 Internal Supabase tables touched

| Table | Used by Online IP for |
| --- | --- |
| `workflow_definitions` | Read the workflow `cc5f077d-...` and its `is_active` / SLA |
| `workflow_steps` | Resolve the first step and its `approver_type`/`approver_*_ids` |
| `workflow_instances` | One row per application reference (idempotent key: `source_module + source_record_id`) |
| `workflow_tasks` | First task and subsequent steps |
| `workflow_logs` | Audit log of `workflow_started` and step transitions |
| `workflow_step_notifications` | Drives notifications when a step is entered/completed |
| `profiles` | Resolve `started_by_name` for the workflow instance |
| `roles` | Resolve `role_name` from `approver_role_ids[0]` for the first task |
| `ip_master` | Final destination row created by `convert_application_to_ip` |
| `ip_depend` | Dependant rows created by the same RPC |
| `ip_application_documents` / `dms_transfer_queue` | Document mirroring to the document management system |

### 2.3 Edge functions

| Function | Role |
| --- | --- |
| `proxy-api` | Forwards REST calls to the external IP application API, attaches keys/secrets, normalises response |
| `workflow-process-notifications` | Fires configured notifications for `step_entry`, `step_exit`, `task_assigned`, etc. |
| `document-proxy` | Streams remote documents (e.g. the applicant photo) through Supabase so the browser can render them without leaking external URLs |

### 2.4 Listing exclusion rule (important)

When the listing hook runs, it executes a second Supabase query in parallel:

```sql
SELECT source_record_id
FROM workflow_instances
WHERE source_module = 'insured-person-applications'
  AND status        = 'Approved';
```

Every reference returned is **subtracted from the rendered list**. This is how the list visually "completes" applications without changing the external system. Note this query uses the legacy `source_module = 'insured-person-applications'` value (not the auto-binding value `online-insured-person-applications`) — both are tolerated server-side; do not change one without changing the other.

---

## 3. End-to-End Workflow (Application Lifecycle)

### 3.1 Lifecycle diagram

```text
                       ┌──────────────────────────┐
                       │ Public Portal Submission │
                       │  (external registration  │
                       │   API, outside Lovable)  │
                       └────────────┬─────────────┘
                                    │  reference number issued
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ /online-applications/insured-person  (Listing)                        │
│                                                                       │
│  useInsuredPersonApplications():                                      │
│    ├── proxy-api GET /applications                                    │
│    └── Supabase SELECT approved refs (excluded from grid)             │
│                                                                       │
│  useOnlineApplicationWorkflowBinding() runs after fetch:              │
│    For each new reference number:                                     │
│      1. INSERT workflow_instances  (status InProgress)                │
│      2. INSERT workflow_tasks       (first step, Pending)             │
│      3. INSERT workflow_logs        (action 'workflow_started')       │
│      4. invoke workflow-process-notifications(trigger='step_entry')   │
└────────────┬─────────────────────────────────────────────────────────┘
             │ click row → navigate
             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ /online-applications/insured-person/:referenceNumber  (Detail)        │
│                                                                       │
│  Tabs: Personal · Contact · Relations · Employment · Dependants ·     │
│        Documents · Remarks                                            │
│                                                                       │
│  ConversionValidationPanel shows preflight + (optional) RPC errors    │
│                                                                       │
│  WorkflowActionButtons (current step actions):                        │
│     Send for Review / Approve / Reject / Request Info / ...           │
└────────────┬─────────────────────────────────────────────────────────┘
             │  approver clicks Approve on FINAL step
             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ onActionComplete(action, endState):                                   │
│   if endState in (Approved, Completed):                               │
│     1. run preflight validation (validateApplicationForConversion)    │
│     2. call RPC convert_application_to_ip(...)                        │
│           → inserts ip_master + ip_depend                             │
│           → enqueues documents into dms_transfer_queue                │
│           → may auto-start downstream IP-registration workflow        │
│     3. if no auto-workflow, check eligibility & open                  │
│        WorkflowInitiationDialog manually                              │
└────────────┬─────────────────────────────────────────────────────────┘
             │
             ▼
   Listing on next visit excludes this reference (rule §2.4)
```

### 3.2 Stage transitions

| Stage | Triggered by | Stored as |
| --- | --- | --- |
| Submitted (external) | Public portal | External API only |
| In Review | Auto-binding hook creates `workflow_instances` (`status='InProgress'`) | `workflow_instances.status` + active `workflow_tasks` row |
| Awaiting Approver N | Step transition action | `current_step_id` updated, new `workflow_tasks` row |
| Rejected | "Reject" action on any step | `workflow_instances.status='Rejected'`, `workflow_logs` entry |
| Approved | Approval on the final step | `workflow_instances.status='Approved'` |
| Converted | RPC `convert_application_to_ip` returns success | `ip_master` row + `unique_uuid` returned |

### 3.3 Conditions for moving between stages

- A workflow task must be **assigned** to (or claimable by) the user pressing the action.
- For the conversion step: `preflightErrors.length === 0` (client-side, see §6.2) — otherwise the toast `"Cannot convert: <message>. Please resolve validation errors first."` blocks the call.
- The RPC itself enforces its own server-side validation; failures return `success=false` with `message` carrying the reason. Duplicate conversion is short-circuited by the `DUPLICATE_CONVERSION` code (UI shows: *"This application has already been converted to an IP record."*).

### 3.4 Manual vs automated

| Step | Manual | Automated |
| --- | --- | --- |
| Listing fetch | — | `useInsuredPersonApplications` on mount/focus |
| Workflow binding | — | `useOnlineApplicationWorkflowBinding` after fetch |
| Opening detail | ✅ Reviewer clicks the row | — |
| Workflow action (Approve/Reject/etc.) | ✅ Reviewer clicks `WorkflowActionButtons` | — |
| Pre-conversion validation | — | Runs client-side from `validateApplicationForConversion` |
| Conversion RPC | — | Triggered automatically by `onActionComplete` when end state is `Approved` / `Completed` |
| Downstream IP workflow | Either: auto-started by RPC, or | Manual via `WorkflowInitiationDialog` if eligible |
| Listing cleanup | — | Next listing query excludes approved refs |

---

## 4. Application Statuses

There are **two status layers**. The UI prefers the workflow status when present.

### 4.1 External API status (from `application.status`)

Typical values seen: `Pending`, `Submitted`, `Under Review`, `Approved`, `Rejected`, `Closed`. They are displayed via `formatStatusDisplay` and coloured via `getStatusVariant`.

### 4.2 Internal workflow status (from `workflow_instances.status`)

| Value | Meaning | Set when |
| --- | --- | --- |
| `InProgress` | Workflow active, sitting on some step | Auto-binding insert; reset by any forward transition |
| `Approved` | Final step approved | Last approval action |
| `Rejected` | Workflow ended in rejection | "Reject" action on any step |
| `Completed` | Workflow terminated successfully without a separate approve gate | Configured terminal action |
| `Closed` | Workflow closed without conversion (cancelled) | Manual close |

### 4.3 Effective status (UI rule)

In `InsuredPersonApplications.tsx`:

```text
effectiveStatus = (workflowStatusMap[ref]?.workflowStatus || app.status || '').toLowerCase()
```

### 4.4 List filter buckets

| Filter | Includes when `effectiveStatus` is | Excludes |
| --- | --- | --- |
| **Pending** *(default)* | Anything **not** in `[closed, completed, approved, rejected]` | The four terminal states |
| **Closed** | `closed`, `completed`, `approved` | Everything else |
| **Rejected** | `rejected` only | Everything else |

> Because §2.4 already strips `Approved` rows server-side from the listing, the **Closed** bucket usually shows `Completed` and `Closed` only.

---

## 5. User Roles & Permissions

### 5.1 Screen-level gate

Both screens require an authenticated user via `useAuth()` / `useSupabaseAuth()`. The action buttons individually check capability through the workflow definition.

### 5.2 Workflow-level roles

Per workflow step, assignment is decided by `workflow_steps.approver_type`:

| `approver_type` | Resolved assignee for the first task |
| --- | --- |
| `role` | `roles.role_name` for `approver_role_ids[0]` → written to `workflow_tasks.assigned_role` |
| `designation` | `approver_designation_ids[0]` → `workflow_tasks.assigned_designation` |
| `user` / `specific_users` | `approver_user_ids[0]` → `workflow_tasks.assigned_to` |
| `reporting_manager` | Resolved by `resolveReportingManagerForTask(userId, instanceId, stepId, stepName)` |

> Multi-assignee steps (more than one id) leave the task pool-claimed: no `assigned_*` field is written, and any member of the role/designation may claim the task from the worklist.

### 5.3 Capabilities per actor

| Actor | List | Detail | Workflow action | Convert |
| --- | --- | --- | --- | --- |
| Registration officer | View | View, all tabs | Initial step (Send for Review) | — |
| Supervisor / approver | View | View | Approve / Reject / Request Info | — (conversion is automatic when the workflow ends) |
| System | — | — | — | Calls `convert_application_to_ip` RPC |

---

## 6. Screens & Features

### 6.1 `/online-applications/insured-person` — Listing

Component: `src/pages/online-applications/InsuredPersonApplications.tsx`.

**Filters (top of page):**

- **Name** — partial, case-insensitive match against `fullName`, `firstName`, `lastName`.
- **Reference Number** — partial, case-insensitive.
- **Status** — `Pending` (default) / `Closed` / `Rejected`. See §4.4.

**Grid columns:**

| Column | Source |
| --- | --- |
| Reference Number | `app.referenceNumber` |
| Full Name | `firstName + lastName` (or `fullName`) |
| Email / Phone | `app.email`, `app.phone` |
| Submitted At | `app.submittedAt` (sortable, default sort `desc`) |
| Status badge | Workflow status when present, otherwise external status (via `WorkflowStatusCell`) |
| Actions | "View" → `/online-applications/insured-person/:referenceNumber` |

**Behaviour:**

- `useTableSort` and `useTablePagination` provide sorting and 10-rows-per-page pagination.
- "Refresh" button invalidates the query (`['online-applications', 'insured-person']`).
- Cloud/CloudOff icon hints at proxy success/failure.
- A skeleton block is shown for the initial load; subsequent fetches show a spinner only.
- Pagination resets whenever any filter changes.
- The hook reports `dataUpdatedAt` for "last refreshed" display.

### 6.2 `/online-applications/insured-person/:referenceNumber` — Detail

Component: `src/pages/online-applications/ApplicationDetailPage.tsx`.

**Header:**

- Back button → `navigate(-1)`.
- Title: `Application: <referenceNumber>` with submission date.
- Status badge (external status; the workflow status is implicit in the action buttons).
- "Refresh" button.
- `WorkflowActionButtons` for the current step (Approve / Reject / Custom transitions).
- `MeetingActionButtons` + "Go to Meeting" if an active meeting exists for this application (`useApplicationMeeting`).

**Summary card:**

- Avatar — uses `application.photoUrl` when present; otherwise streams a "Photo" document through `document-proxy`.
- Name + title + suffix.
- Email, mobile (formatted with dial code), DOB (timezone-safe formatting via `formatDateRaw`).

**Tabs:** Personal, Contact, Relations, Employment, Dependants, Documents, Remarks.

| Tab | Highlights |
| --- | --- |
| Personal | Title, names, gender, DOB, place of birth, nationality, marital status, height, eye colour |
| Contact | Mobile, home, email, residential address, mailing address, district |
| Relations | Father, mother, spouse, beneficiary, contact person + relationship/code |
| Employment | Employer name, address, town, phone, occupation, work permit Y/N + expiry, citizenship, NPF, place of residency, residency date |
| Dependants | Table of `application.dependants[]` with firstName, lastName, DOB, gender, relationship, address, school flag, SSN |
| Documents | `ApplicationDocumentsTab` — list, status, signed-URL view via `document-proxy`, download |
| Remarks | `application.remarks` and any reviewer-added notes |

**ConversionValidationPanel:**

- Shows preflight errors from `validateApplicationForConversion(application)`.
- Surfaces RPC validation errors after a failed attempt.
- If any error exists, the conversion call is blocked (toast warns the user).

**Field formatting helpers (must be preserved):**

| Concern | Helper |
| --- | --- |
| Phone display | `formatPhone(phone, dialCode)` → `(dialCode) phone` |
| Date display | `formatDateRaw` — parses `YYYY-MM-DD` directly to avoid timezone drift |
| Gender / marital | `formatGender`, `formatMaritalStatus` |
| Lookup-code → label | `getCountryName`, `getNationalityName`, `getDistrictName`, `getRelationName`, `getOccupationName` |

### 6.3 Other entry points

- Routes are registered in `src/components/routing/AppRoutes.tsx` lines 2244–2245.
- Sidebar entry is exposed under the Insured Person / Online Applications menu group (`systemAdminMenuItems`).
- `/ip-registration/external` (`ExternalApplicationsScreen.tsx`) is a legacy alternate listing for the same data — superseded by `/online-applications/insured-person`.

---

## 7. Business Rules

### 7.1 Idempotency

- Workflow instance key: `(source_module, source_record_id)` — `source_record_id` is the **reference number** (or `applicationId` fallback). Insertion is guarded by a `maybeSingle()` existence check.
- Conversion key: `ip_master` is keyed by the same reference number on the server. The RPC returns `DUPLICATE_CONVERSION` if attempted twice.
- Listing exclusion (§2.4) ensures an approved row will not be re-bound on a refresh.

### 7.2 Reference number

- `referenceNumber = app.referenceNumber || app.applicationId`.
- An application **without either** is skipped from workflow binding with a log entry, never inserted.

### 7.3 Pre-conversion validation (client-side preflight)

`validateApplicationForConversion(application)` runs before the conversion call. Typical rules enforced:

- Required: `firstName`, `lastName`, `gender`, `dateOfBirth`, valid `relation` codes for dependants.
- Length caps: phone digits ≤ 10, nationality/birth_place ≤ 3 chars.
- Format coercions performed in `buildRpcParams`:
  - `digitsOnly(value, 10)` — strips non-digits, caps at 10 chars.
  - `toYN(raw, fallback)` — coerces `true / "Y" / "Yes" / "true"` → `'Y'`, opposite → `'N'`.
  - `countryCode(val)` — trims, upper-cases, caps at 3 chars.
  - `safeDate(val)` — `null` if `Date` parse fails; otherwise `YYYY-MM-DD`.

### 7.4 Required documents

Driven by `useApplicationDocuments` (which consumes the external document list) and the conversion-validation RPC. The exact mandatory list is defined server-side; the UI surfaces missing-document errors via the same `ConversionValidationPanel`.

### 7.5 SLA & due dates

- Workflow instance `due_at = now() + 24h` (default fallback when the workflow has no default).
- First task `due_at = now() + first_step.sla_hours` (or 24h fallback).
- Subsequent transitions reuse each step's `sla_hours`.

### 7.6 Notifications

After binding (and after every step transition) the edge function `workflow-process-notifications` is invoked with `{ instance_id, step_id, trigger: 'step_entry' }`. Failures are logged and treated as non-blocking (`try/catch` swallowed).

### 7.7 Approval / Rejection

- Approval: drives the workflow to the next step. On the **final** step it sets `workflow_instances.status='Approved'`, which then auto-triggers the conversion RPC.
- Rejection: terminates the workflow (`status='Rejected'`). No conversion runs. The application remains visible under the **Rejected** filter.

### 7.8 Error handling

- All hooks log via `console.log` / `console.error` and report fatal failures to `logApplicationError(...)` with `module: 'online-insured-person-applications-workflow-binding'` / `action: ...`.
- All toasts are user-friendly; raw RPC messages are wrapped (`Conversion failed: <details>`).

---

## 8. Data Flow & Field Mapping

### 8.1 External → internal listing item

`mapListItemFromApi` (in `src/types/externalApplication.ts`) normalises:

- `data | records | applications` → array.
- Field names like `application_id` / `applicationId`, `reference_no` / `referenceNumber`, etc.

### 8.2 External detail → `ip_master` RPC params

`buildRpcParams(detail, approvedBy, sourceRoute)` in `useConvertApplicationToIP.ts` maps every field on the application to a `p_*` parameter for `convert_application_to_ip`. Notable shape rules (verbatim):

| Field family | Rule |
| --- | --- |
| Names | `middleName1 || middleName` → `p_middle_name`; `middleName2` → `p_second_middle_name`; spouse/father/mother fall back from `firstName+lastName` joins |
| Phones | `phone`, `phone_mobile`, `contact_phone`, `contact_mobile`, `employer_phone` all routed through `digitsOnly(_, 10)` |
| Codes | `placeOfBirth`, `nationality`, `placeOfResidency` routed through `countryCode()` (≤3 chars, upper) |
| Dates | `dateOfBirth`, `dateMarried`, `spouseDOB`, `residencyDate`, `workPermitExpiry`, `witnessDate`, `employmentStartDate` all routed through `safeDate()` |
| Y/N flags | `npfMember || npf` → `p_npf` via `toYN`; `isCitizen || citizenship` → `p_citizenship`; `hasWorkPermit || workPermit` → `p_has_work_permit` |
| Occupation | `(occupationCode || occupation).slice(0, 4)` |
| Dependants | Mapped array of `{ firstName, lastName, dateOfBirth, gender, relationship, address, isInSchool, ssn }` |
| Origin | `p_approved_by = approvedBy auth UUID`, `p_source_route` = the detail page URL |

### 8.3 RPC result

```ts
{
  success: boolean,
  ip_master_id?: string,
  application_id?: string,
  ssn?: string,            // returned by some variants
  unique_uuid?: string,    // used to wire downstream workflow
  workflow_instance_id?: string,
  dependants_converted?: number,
  dependants_note?: string,
  message?: string,
  error?: string,
}
```

### 8.4 Downstream workflow (post-conversion)

- If the RPC returns `workflow_instance_id`, no UI prompt — that workflow is already running, and we invalidate `['workflow-instances']`.
- Otherwise `checkWorkflowEligibility({ sourceRecordId: result.unique_uuid })` runs. If `eligible`, `WorkflowInitiationDialog` opens so the user can manually start it.

### 8.5 Document flow

- Documents listed by the external API are displayed in the Documents tab.
- "View" streams the file through the `document-proxy` edge function to avoid leaking remote URLs / handle auth.
- On conversion, documents are mirrored to the master document store via `dms_transfer_queue` (with retry); the queue is processed by the DMS worker and is **not** part of this module's responsibility.

---

## 9. Edge Cases

| Scenario | Behaviour |
| --- | --- |
| Application without reference number | Skipped from workflow binding, logged: `"Skipping application without reference number"` |
| Workflow definition missing or inactive | Binding aborts; `logApplicationError` records the cause; UI still lists the application |
| Workflow has zero steps | Binding aborts with `"Workflow has no steps"`; same behaviour |
| Duplicate fetch of same reference inside a session | `hasRunRef` (a `useRef<Set<string>>`) prevents re-attempts within the session; on the server, the existence check on `workflow_instances` prevents duplicates across sessions |
| Conversion RPC fails on validation | Toast shows the message; no `ip_master` row created; workflow instance retained so the user can fix and retry |
| `DUPLICATE_CONVERSION` from RPC | Toast: *"This application has already been converted to an IP record."*; no follow-up workflow opened |
| Conversion succeeds but downstream workflow not eligible | Logged as `"Workflow not eligible: <reason>"`; dialog stays closed |
| Approver type `reporting_manager` with no manager resolved | First task is created with no `assigned_to`; appears in the unassigned bucket |
| Notification function fails | Caught, logged as non-critical; binding still considered successful |
| Photo doc missing or stream fails | Avatar falls back to initials; non-blocking |
| External API down | `proxy-api` returns error; toast shows "Failed to load applications"; existing approved-ref set is still loaded so it does not crash other UI |
| Two reviewers open the same application at the same time | Both can press an action; the second one will fail at `workflow_tasks.status` transition because the task is no longer `Pending` |

---

## 10. Workflow Instance Creation (Detailed)

This is the contract Claude (or any rebuild) must replicate exactly.

### 10.1 Trigger

Runs once per session per reference number, from `useOnlineApplicationWorkflowBinding`, after `useInsuredPersonApplications` has produced a non-empty list and `enabled = isSuccess && !isFetching`.

### 10.2 Pre-flight reads

1. Fetch workflow definition by id `cc5f077d-b7f7-4b2c-a354-4babcfee5b95`; require `is_active = true`.
2. Fetch the first `workflow_steps` row (`order by step_number asc limit 1`).
3. Fetch the current user's `profiles.full_name` (used as `started_by_name`).
4. Batch-select all existing `workflow_instances` for the current page's references in one IN-query.

### 10.3 Per-application insert

```ts
// 1) workflow instance
INSERT INTO workflow_instances {
  workflow_id:        'cc5f077d-b7f7-4b2c-a354-4babcfee5b95',
  workflow_name:      'Online IP Registration Review Workflow',
  source_module:      'online-insured-person-applications',
  source_record_id:   referenceNumber,
  source_record_name: applicantFullName ?? `Application ${referenceNumber}`,
  current_step_id:    firstStep.id,
  status:             'InProgress',
  started_by:         supabaseUser.id,
  started_by_name:    profiles.full_name ?? 'System',
  due_at:             now() + 24h,
  metadata: {
    reference_number: referenceNumber,
    applicant_name:   ...,
    application_id:   app.applicationId,
    email, phone, status, submitted_at,
    application_type: 'insured-person',
  }
}
RETURNING id;
```

```ts
// 2) first task (assignee branch depends on approver_type)
INSERT INTO workflow_tasks {
  instance_id:           workflow_instances.id,
  step_id:               firstStep.id,
  step_name:             firstStep.step_name,
  assigned_role:         <role_name when approver_type='role' and exactly one role>,
  assigned_designation:  <designation_id when approver_type='designation' and exactly one>,
  assigned_to:           <user_id when approver_type='user'|'specific_users'|'reporting_manager' resolves>,
  status:                'Pending',
  due_at:                now() + firstStep.sla_hours (default 24h),
}
RETURNING id;
```

```ts
// 3) audit log
INSERT INTO workflow_logs {
  instance_id, step_id, step_name,
  action:           'workflow_started',
  performed_by:     supabaseUser.id,
  performed_by_name: profiles.full_name,
  details:          'Workflow auto-started for Online Insured-Person Application: <ref>',
}
```

```ts
// 4) notifications (non-blocking)
supabase.functions.invoke('workflow-process-notifications', {
  body: { instance_id, step_id: firstStep.id, trigger: 'step_entry' }
});
```

### 10.4 Throughput rules

- Processed in batches of **5** with `Promise.all` to avoid hammering the database.
- `isProcessingRef` (a module-level boolean ref) prevents overlapping runs.
- `hasRunRef` (a Set of refs) is consulted to avoid re-attempting failures inside the same session.

---

## 11. Claude Migration Notes

### 11.1 Assumptions

- A remote IP registration API exists and is reachable through an HTTP proxy that mimics `proxy-api` (accepts `{ module, endpoint, method, payload }` and returns either an array or an object with `data | records | applications`).
- A relational backing store equivalent to Supabase (Postgres) with the tables in §2.2 — schema columns documented in §12.2.
- A configurable workflow engine exists with the concepts: workflow definition, ordered steps, instances, tasks, logs, notifications, approver-type semantics (`role`, `designation`, `user`/`specific_users`, `reporting_manager`).
- A stored procedure / server function equivalent to `convert_application_to_ip` exists, accepting the `p_*` shape in §8.2 and writing to `ip_master` + `ip_depend` + DMS queue, returning the shape in §8.3.

### 11.2 Dependencies

- Reference data: countries, districts, relations, occupations (via `useIPMasterLookups`). These must exist (and have `code`/`description`) to render the detail page labels.
- Auth: must provide a UUID user id and a display name (`profiles.full_name`).
- User-code identifier (`useUserCode`) used as the audit identity (`approvedBy` UUID + `userCode` string).
- Document streaming endpoint (`document-proxy`) for cross-origin docs.
- Workflow-notification engine accepting `{ instance_id, step_id, trigger }`.

### 11.3 UI/UX behaviour that must be preserved

- Default status filter: **Pending**.
- Default sort: `submittedAt desc`.
- Pagination: 10 rows per page; resets on every filter change.
- Live refresh on window focus (`refetchOnWindowFocus: true`) and stale time 30 s.
- Approved + converted references are visually removed from the list on next refresh (do not delete from the external API).
- Workflow status overrides external API status in the badge and filtering.
- Conversion is automatic on final approval; never expose a separate "Convert" button to the user — failures show a toast and keep the workflow open for retry.
- Date display must be **timezone-safe** (parse `YYYY-MM-DD` directly; do not pass through `Date`/`toLocaleDateString`).
- Phone display format is `(<dialCode>) <digits>`; stored value is digits-only, capped at 10.
- Documents always stream through the proxy — never link directly to a remote URL.

### 11.4 Step-by-step rebuild recipe

1. **List screen** — proxy GET `/applications`, run the approved-refs exclusion query in parallel, render filterable/sortable/paginated table.
2. **After list resolves**, for each new reference: idempotently create one workflow instance + one first task + one log row + fire `step_entry` notification.
3. **Detail screen** — proxy GET `/applications/{id}`, render tabbed details with reference-data labels; stream the photo via the document proxy.
4. **Pre-flight validation** — run client-side preflight against the detail, then call the server validation function if needed; show errors inline in the `ConversionValidationPanel`.
5. **Workflow actions** — render dynamic buttons from the current step. On click, transition the workflow.
6. **On `endState in (Approved, Completed)`** — re-run preflight (block on errors), call `convert_application_to_ip`, react to its `workflow_instance_id` or fall back to manual workflow initiation via the eligibility check.
7. **On success** — show toast, invalidate `['online-applications']` and `['workflow-instances']`. The row drops off the list on the next refresh.

### 11.5 Pitfalls

- Forgetting the IN-query optimisation in §10.2 (step 4) will turn binding into N round-trips.
- Forgetting to upper-case + truncate `nationality` / `placeOfBirth` / `placeOfResidency` will fail the DB's 3-char check.
- Forgetting the phone digit-strip will fail the DB's 10-char check.
- Using `new Date(str).toLocaleDateString()` will produce the wrong day for `YYYY-MM-DD`-only fields in negative-UTC offsets.
- Treating the external `app.status` as authoritative — always overlay the workflow status.
- Re-binding workflows because the in-session cache (`hasRunRef`) was forgotten — at scale this floods the DB with check-then-insert pairs.
- Forgetting to honour `DUPLICATE_CONVERSION` — without the special-case toast, users see the raw error and re-press the button.

---

## 12. Appendix

### 12.1 Route table

| Route | Component | Description |
| --- | --- | --- |
| `/online-applications/insured-person` | `InsuredPersonApplications` | Listing |
| `/online-applications/insured-person/:referenceNumber` | `ApplicationDetailPage` | Detail + actions |
| `/ip-registration/external` | `ExternalApplicationsScreen` | Legacy alternate listing (same data source) |

### 12.2 Column inventory used by this module

**`workflow_instances`**
`id, workflow_id, workflow_name, source_module, source_record_id, source_record_name, current_step_id, status, started_by, started_by_name, due_at, metadata`

**`workflow_tasks`**
`id, instance_id, step_id, step_name, assigned_role, assigned_designation, assigned_to, status, due_at`

**`workflow_steps`**
`id, workflow_id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids`

**`workflow_logs`**
`instance_id, step_id, step_name, action, performed_by, performed_by_name, details`

**`ip_master` (fields populated by `convert_application_to_ip`, subset):**
names (title, first/middle1/middle2/last/suffix/maiden/alias), `gender`, `date_of_birth`, height, `eye_color`, `birth_place`, `nationality`, `marital_status`, `date_married`, residential address (`address_line1/2`, `postal_district`), mailing address, phones, email, contact person, parents, spouse, beneficiary, employer block, occupation, `citizenship`, `npf`, `place_of_residence`, `date_of_residency`, `has_work_permit`, `work_permit_expiry`, `witness_name`, `witness_date`, `application_date`, `remarks`, `approved_by`, `source_route`, `submitted_at`.

**`ip_depend` (per dependant):**
`first_name`, `last_name`, `date_of_birth`, `gender`, `relationship`, `address`, `is_in_school`, `ssn`.

### 12.3 Glossary

| Term | Meaning |
| --- | --- |
| Reference number | The stable id issued by the public portal; the join key across all systems |
| Source module | The string identifying the originating module on a workflow instance (`online-insured-person-applications` for new bindings; `insured-person-applications` for the legacy exclusion query) |
| Workflow binding | The act of creating an instance + first task for an application that does not yet have one |
| Pre-flight validation | Client-side rule check that runs before calling the conversion RPC |
| Conversion | Calling `convert_application_to_ip` to materialise an `ip_master` record |
| Effective status | The status used by the UI: workflow status if known, else external API status |
| Approved-refs exclusion | The Supabase query that removes already-approved references from the listing |

### 12.4 Source files

| File | Role |
| --- | --- |
| `src/pages/online-applications/InsuredPersonApplications.tsx` | Listing screen |
| `src/pages/online-applications/ApplicationDetailPage.tsx` | Detail + actions screen |
| `src/hooks/useOnlineApplications.ts` | Listing + accept/reject hooks (proxy + exclusion) |
| `src/hooks/useOnlineApplicationWorkflowBinding.ts` | Auto-binding hook (instance + first task + log + notif) |
| `src/hooks/useApplicationWorkflowStatus.ts` | Per-row workflow status lookup |
| `src/hooks/useExternalApplicationDetail.ts` | Detail fetch via proxy-api |
| `src/hooks/useApplicationDocuments.ts` | Documents tab data |
| `src/hooks/useConvertApplicationToIP.ts` | Conversion RPC wrapper + param builder |
| `src/hooks/useConvertToIPRegistration.ts` | Outer convert hook + `validateApplicationForConversion` |
| `src/hooks/useValidateApplicationForConversion.ts` | Server-side validation RPC wrapper |
| `src/services/workflowEligibilityService.ts` | Downstream workflow eligibility check |
| `src/services/workflowTriggerService.ts` | Downstream workflow initiation |
| `src/services/resolveReportingManager.ts` | `reporting_manager` approver resolution |
| `src/components/online-applications/ConversionValidationPanel.tsx` | Validation panel UI |
| `src/components/online-applications/WorkflowStatusCell.tsx` | Status badge cell in the list |
| `src/components/workflow/WorkflowActionButtons.tsx` | Step-driven action buttons |
| `src/components/workflow/WorkflowInitiationDialog.tsx` | Manual downstream-workflow trigger dialog |
| Supabase edge functions: `proxy-api`, `workflow-process-notifications`, `document-proxy` | Backend integrations |
| Workflow definition row: `workflow_definitions.id = 'cc5f077d-b7f7-4b2c-a354-4babcfee5b95'` | "Online IP Registration Review Workflow" |
