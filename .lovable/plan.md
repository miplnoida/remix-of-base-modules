# Online Insured Person — Knowledge Base Document

## Goal
Produce a single Markdown knowledge-base document that explains the **Online Insured Person (Online IP) module** exactly as it works today in the Lovable codebase, with enough fidelity that Claude (or a new dev) can rebuild the same logic in a target stack without reading the source.

## Deliverable
- **One file:** `docs/online-insured-person/ONLINE_INSURED_PERSON_KB.md`
- **Format:** Plain Markdown, structured headings, bullet lists, tables, ASCII flow diagrams
- **No code changes** to the application — documentation only

## Source-of-truth files the document will be derived from
- Listing screen: `src/pages/online-applications/InsuredPersonApplications.tsx`
- Detail screen: `src/pages/online-applications/ApplicationDetailPage.tsx`
- Listing hook: `src/hooks/useOnlineApplications.ts` (proxy fetch + exclusion of approved/converted refs)
- Workflow auto-binding: `src/hooks/useOnlineApplicationWorkflowBinding.ts` (instance + first task creation)
- Workflow status lookup: `src/hooks/useApplicationWorkflowStatus.ts`
- Conversion to IP master: `src/hooks/useConvertApplicationToIP.ts` (RPC `convert_application_to_ip`)
- Pre-conversion validation: `src/hooks/useValidateApplicationForConversion.ts`
- Documents: `src/hooks/useApplicationDocuments.ts`
- Detail loader: `src/hooks/useExternalApplicationDetail.ts`
- Routes: `src/components/routing/AppRoutes.tsx` lines 2244–2245
- Workflow definition row: `workflow_definitions.id = cc5f077d-b7f7-4b2c-a354-4babcfee5b95` ("Online IP Registration Review Workflow")
- Workflow tables: `workflow_instances`, `workflow_tasks`, `workflow_steps`, `workflow_logs`, `workflow_step_notifications`
- Master tables: `ip_master`, `ip_depend`
- Edge functions: `proxy-api`, `workflow-process-notifications`

## Document Outline (sections to write)

1. **Module Overview**
   - Purpose (review online IP registration applications submitted via the external public portal before they become real IP records)
   - Primary actors: Registration officers, supervisors, approvers
   - Problem solved: bridge between external submission API and internal `ip_master` records, with full workflow + audit

2. **System Context & Data Sources**
   - External API (via `proxy-api` edge function, module `insured-person-applications`)
   - Local Supabase tables used (workflow_*, ip_master, ip_depend, ip_application_documents, dms_transfer_queue)
   - Why listing data is "live-fetched" not cached
   - Exclusion rule: rows with an `Approved` workflow_instance for `source_module = insured-person-applications` are hidden from list

3. **End-to-End Workflow (Application Lifecycle)**
   - Step diagram (ASCII): External submission → listing fetch → auto workflow binding → review → approve/reject → conversion to ip_master → cleanup
   - Auto-binding mechanics from `useOnlineApplicationWorkflowBinding`:
     - Resolves first step of workflow `cc5f077d-...`
     - Inserts one `workflow_instances` row keyed by `(source_module, source_record_id=referenceNumber)`
     - Inserts first `workflow_tasks` row with assignee resolved via `approver_type` (role/designation/user/reporting_manager)
     - Logs `workflow_started` in `workflow_logs`
     - Invokes `workflow-process-notifications` with `trigger = step_entry`
   - Movement between steps via Approval Console / detail page actions
   - Final approval triggers conversion RPC

4. **Application Statuses**
   - Two layers: **External API status** (Pending, Submitted, etc.) and **Workflow status** (`InProgress`, `Approved`, `Rejected`, `Completed`, `Closed`)
   - Effective status rule (from list page): workflow status overrides API status if present
   - Status filter buckets in UI: `Pending` (excludes closed/completed/approved/rejected), `Closed` (closed/completed/approved), `Rejected`
   - Table of statuses, source, meaning, transitions

5. **User Roles & Permissions**
   - Roles wired via `workflow_steps.approver_type / approver_role_ids / approver_designation_ids / approver_user_ids`
   - Permission gate on screen: `useAuth().hasPermission`
   - What each role can do: view list, view detail, take workflow action, approve, reject, convert

6. **Screens & Features**
   - **/online-applications/insured-person — Listing**
     - Filters: status (Pending/Closed/Rejected), name, reference number
     - Columns, sorting via `useTableSort`, pagination via `useTablePagination`
     - Live refresh, exclusion of approved-converted rows, workflow status badge
   - **/online-applications/insured-person/:referenceNumber — Detail**
     - Tabs/sections: Personal, Contact, Family/Dependants, Documents, Workflow History, Actions
     - Buttons: Approve, Reject, Convert to IP, View Document
     - Field validations, required documents (from `useApplicationDocuments` + `useValidateApplicationForConversion`)

7. **Business Rules**
   - Reference number is the immutable key (`referenceNumber` or fallback `applicationId`)
   - Duplicate guard: only one workflow_instance per `(source_module, source_record_id)`
   - Conversion guards: validation hook must return ok before `convert_application_to_ip` RPC is invoked
   - Required documents per type (from registry)
   - SLA: `workflow_steps.sla_hours` (default 24h fallback) drives `due_at`
   - Notifications fired by configurable engine (`workflow_step_notifications`)

8. **Data Flow & Field Mapping**
   - External JSON → `ExternalApplicationListItem` / `ExternalApplicationDetail` (via `mapListItemFromApi`)
   - Detail → RPC `convert_application_to_ip` parameters (table from `useConvertApplicationToIP.buildRpcParams`: phone digit-stripping, Y/N coercion, country-code truncation, dependant array shape)
   - On conversion: `ip_master` row created, dependants inserted into `ip_depend`, documents pushed to DMS via `dms_transfer_queue`
   - Approval → `workflow_instances.status = Approved` → listing excludes the row on next fetch

9. **Edge Cases**
   - Missing reference number → skipped from binding, logged
   - Workflow definition inactive / missing steps → binding aborts and logs
   - Conversion RPC failure → toast + retained workflow instance for retry
   - Duplicate submission of the same reference → idempotent insert via existing-instance check
   - Phone/date/country values out of spec → coerced via helpers (`digitsOnly`, `safeDate`, `countryCode`, `toYN`)
   - Approver type `reporting_manager` with no manager → unassigned task, surfaced for manual reassignment
   - Notifications failure → caught, non-blocking

10. **Workflow Instance Creation (Detailed)**
    - Exact insert payload for `workflow_instances`
    - Exact insert payload for `workflow_tasks` per approver_type branch
    - `workflow_logs` entry shape
    - Edge function `workflow-process-notifications` invocation contract

11. **Claude Migration Notes**
    - Assumptions (external API contract, presence of workflow `cc5f077d-...`, RPC `convert_application_to_ip`)
    - Dependencies (Supabase tables, edge functions, role/designation registry)
    - UI/UX behaviour to preserve: live refresh, status badge precedence, exclusion-on-approval, default `Pending` filter, pagination defaults (10), sort by `submittedAt desc`
    - Step-by-step rebuild recipe mirroring the auto-binding hook
    - Pitfalls (column length limits, idempotency, notification trigger names)

12. **Appendix**
    - Route table
    - Key table column inventory (workflow_instances, workflow_tasks, ip_master fields used)
    - Glossary

## Out of scope
- No changes to code, schema, RPCs, or workflow definitions
- Employer and Doctor online application modules (mentioned only briefly for context)
- Public-portal submission side (covered separately)
