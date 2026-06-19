## Goal

Produce one self-contained Markdown document — **`docs/online-applications/MIGRATION_KNOWLEDGE_BASE.md`** — that fully describes the Online Application module (Insured Person + Employer) and the workflow engine it rides on, with enough depth, code snippets, and references that Claude can rebuild the module without access to this Lovable project.

## Scope confirmed

- Application types: **Insured Person** and **Employer** (Doctor excluded)
- Workflow engine: **full internals** (definitions, steps, actions, triggers, maker-checker, role resolution, edge functions)
- Output: **single Markdown file** under `docs/online-applications/`
- Depth: **behavioural narrative + key code snippets** (SQL, RPC bodies, hook code, edge function handlers) inline; long files referenced by path:line

## Exploration phase (read-only, before writing)

Use parallel investigation to assemble the source-of-truth inventory:

1. **Frontend surface** — enumerate every file involved
   - `src/pages/online-applications/*` (IP + Employer detail + list pages)
   - `src/components/online-applications/*` (ApplicationDocumentsTab, ConversionValidationPanel, EmployerApplicationActions, WorkflowStatusCell)
   - `src/hooks/useOnlineApplications.ts`, `useEmployerApplications.ts`, `useApplicationWorkflowStatus.ts`, `useConvertApplicationToIP.ts`, `useConvertToIPRegistration.ts`, `useOnlineApplicationWorkflowBinding.ts`, `useMeetings.ts`, `useWorkflowActions.ts`
   - `src/services/onlineApplicationsService.ts` and any sibling services (workflow, meetings, document mirror, dms_transfer_queue)
   - Routes in `src/config/routes.ts` and `src/components/routing/AppRoutes.tsx`
   - Sidebar entries
2. **Database** — query Supabase schema for every table touched
   - Application tables (e.g. `ip_application_*`, `er_application_documents`, `ip_documents`, `er_documents`, master mirrors `ip_master`, `er_master`)
   - Workflow tables (`workflow_definitions`, `workflow_steps`, `workflow_step_actions`, `workflow_action_*`, `workflow_instances`, `workflow_tasks`, `workflow_execution_logs`, `workflow_role_assignments`, `workflow_security_audit_log`, `workflow_step_notifications`, `workflow_step_action_api*`)
   - Supporting tables (`dms_transfer_queue`, `meetings`, `notification_templates`, `notification_queue`, `system_audit_trail`)
   - For each: columns, types, FKs, indexes, constraints, triggers, RLS state (NO-RLS per project rule)
3. **Edge functions** — read handler source for
   - `workflow-action-api`, `workflow-process-notifications`, `workflow-notify-approvers`, `workflow-notify-requester`
   - Any document-proxy / DMS transfer / meeting-related functions invoked by this module
4. **Workflow engine behaviour** — trace
   - How a workflow is bound to an Online Application (binding hook)
   - How `useWorkflowActions` resolves visible actions (role, status, maker-checker, permissions)
   - How `useExecuteWorkflowAction` runs (server-side check, status transition, side-effects, audit trail)
   - Notification engine pipeline (`workflow_step_notifications` → process → dispatch)
   - Document lifecycle: application docs → master mirror → `dms_transfer_queue` retry
5. **Business rules** — extract from service/hook logic
   - Conversion to IP/ER master (atomic mirror, duplicate detection, validation gates)
   - Schedule meeting eligibility
   - Reject/accept gating
   - Mandatory documents, duplicate SSN/registration, eligibility checks

## Document structure (single file, ~17 sections per the request)

The file will follow exactly the 17 sections the user listed. Headers and content shape:

```text
# Online Application Module — Migration Knowledge Base

1.  Module Overview
2.  System Architecture (Components + Pages tables)
3.  Database Architecture (per-table spec)
4.  Workflow Engine Analysis (ASCII flowchart)
5.  Status Transitions (matrix)
6.  Action Button Logic (per button: visibility + click)
7.  Edge Functions (per function spec)
8.  API & Service Layer
9.  Business Rules
10. Validations (frontend / backend / DB)
11. Error Handling
12. Notifications (email / in-app / workflow)
13. Audit Logging
14. Security Model
15. Dependency Map
16. Complete Migration Guide for Claude (step-by-step rebuild)
17. Source Code References (file:line index)
```

Each section includes:

- Markdown tables for fields, statuses, transitions, button visibility
- ASCII workflow diagrams in fenced ```text blocks
- SQL `CREATE TABLE` snippets reconstructed from live schema
- TypeScript snippets for the critical hooks (`useWorkflowActions`, `useExecuteWorkflowAction`, `useConvertApplicationToIP`, `useOnlineApplicationWorkflowBinding`) and edge function handlers
- File path + line references for everything not inlined

## Section 16 — Migration Guide for Claude

Will be written as actionable, ordered steps Claude can execute:

1. DB migration order (tables → indexes → triggers → seed workflow_definitions/steps/actions)
2. Edge function deployment order
3. Service / hook scaffolding order
4. Page wiring + routes
5. Workflow seed data (definitions, steps, actions, notifications, role assignments)
6. Smoke-test script (create application → run workflow → convert → verify mirror)
7. Known risks: NO-RLS architecture, maker-checker gating, dms_transfer_queue retry, idempotency

## Deliverable

- One new file: `docs/online-applications/MIGRATION_KNOWLEDGE_BASE.md`
- No code changes elsewhere
- Estimated size: 80–120 KB Markdown

## Out of scope

- Doctor application flow (explicitly excluded)
- Rebuilding or refactoring the actual module
- Updating existing docs under `docs/`
- Generating per-section split files (single file confirmed)
