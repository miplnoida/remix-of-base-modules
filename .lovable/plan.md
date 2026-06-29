## You're right — revised plan: reuse the existing Workflow Designer, don't build a parallel engine

My earlier audit was correct that today's `.update({ status })` calls bypass governance, but the previous plan over-corrected by inventing a parallel `ce_status_transitions` table and a new edge function. The project already ships a full workflow engine — we should extend it, not duplicate it.

## What already exists (and we'll reuse)

- `workflow_definitions` with `maker_checker_enabled`, `default_sla_hours`
- `workflow_steps` (ordered steps + outcomes/actions)
- `workflow_triggers` (`module + action → workflow`)
- `workflow_instances` + step history
- `ce_workflow_mappings` (Compliance event key → workflow definition, with fund/severity/amount/violation-type scoping and `fallback_behavior = DIRECT_APPLY | BLOCK | REQUIRE_NOTE`)
- `useWorkflowActions` / `useExecuteWorkflowAction` — already enforce maker-checker, capability checks, and write `system_audit_trail`
- Admin → **Workflow Designer** (`/workflow/management`) and Compliance Admin → **Workflow Mapping** screens
- Documented "Action Result Status Pattern" (`mem://features/workflow/action-result-status-pattern`) where workflow completion writes a status onto the source record via `updateSourceRecordStatus`

The engine is fully wired for the approval-gate side of Compliance (notice approval, waiver approval, case closure, payment plan approval). It's just **not being used for in-progress status moves** like "Start Work", "Mark Sent", "Check In", "Resolve", etc., and a handful of services bypass it with direct `.update({ status })` calls.

## What's genuinely missing

1. **No event keys** for in-progress status moves — `COMPLIANCE_EVENT_KEYS` only covers approval gates.
2. **No `(from_status, action) → to_status` metadata** anywhere — the workflow designer models the approval path, not "given current status X, action Y produces status Z".
3. **Direct writes bypass the engine** in ~11 services / edge functions.
4. **`STATUS_ACTIONS` in `ViolationDetails.tsx`** is a static client-side map — the source of the `UNDER_REVIEW → OPEN` bug you reported.

## Revised approach — extend the existing engine

### A. Register status-transition event keys in the existing mapping table (no new tables)

Extend `COMPLIANCE_EVENT_KEYS` in `complianceWorkflowMappingService.ts` with one key per status action, named `<entity>.status.<ACTION_CODE>`:

- Violations: `START_WORK`, `MOVE_TO_REVIEW`, `RESOLVE`, `CANCEL`, `REOPEN`, `CLOSE`, `CANCEL_FOR_MERGE`, `CANCEL_FOR_SPLIT`, `ESCALATE`
- Cases: `CLOSE`, `REOPEN`, `APPROVE_MERGE`, `WAIVER_APPROVED`
- Notices: `SEND`, `MARK_DELIVERED`, `MARK_ACKNOWLEDGED`, `CANCEL`, `APPROVE`, `REJECT`
- Payment Arrangements: `SUBMIT_FOR_APPROVAL`, `APPROVE`, `RETURN_TO_DRAFT`, `MARK_BREACHED`
- Legal Escalations: `SUBMIT`, `MARK_REFERRAL_CREATED`, `UPDATE_RECOMMENDATION`
- Inspections: `CHECK_IN`, `COMPLETE_VISIT`, `COMPLETE_INSPECTION`
- Breach Monitoring: `RESOLVE`, `ESCALATE_TO_LEGAL`

These flow through the **existing** `ce_workflow_mappings` table — admins configure each one in Compliance Admin → Workflow Mapping the same way `notice.approval` is mapped today. `fallback_behavior` retains its existing semantics:
- `DIRECT_APPLY` — apply the status straight through (everyday trivial moves).
- `BLOCK` — refuse.
- `REQUIRE_NOTE` — apply but force a reason.
- If `workflow_definition_id` is set, the engine starts a `workflow_instances` row instead, just like notice approval today.

### B. The single piece of metadata the designer doesn't store today: `from_status → to_status`

The workflow designer doesn't currently capture "for this step's outcome, what status to write on the source record". Two options — both reuse existing surfaces, **no parallel config table**:

- **Option 1 (preferred):** add two nullable columns to `workflow_steps` — `result_status_on_complete TEXT`, `result_status_on_reject TEXT`. The existing post-workflow handler (already present in `useWorkflowActions`, documented in the Action Result Status Pattern memory) writes the configured status onto the source record via the existing `updateSourceRecordStatus` admin path.
- **Option 2:** add `from_status` + `to_status_on_success` columns on `ce_workflow_mappings`. Simpler but pays with one mapping row per `(event_key, from_status)` pair.

The plan goes with **Option 1** — it keeps all status semantics inside the Workflow Designer where admins already configure everything, and matches the existing pattern. Tell me if you'd rather use Option 2 and I'll swap this section.

### C. Thin client surface — just enough to delete duplicated logic

- `src/services/ceWorkflowStatusService.ts` — single helper `requestTransition({ entityType, recordId, actionCode, notes? })`. Internally calls the existing `resolveWorkflow(...)` and then either starts a `workflow_instance` via the existing `useExecuteWorkflowAction` path, or honors `fallback_behavior`. **No new business logic, no parallel maker-checker, no parallel audit** — those are already provided by the existing engine.
- `src/hooks/compliance/useCeStatusActions.ts` — wraps the helper as `{ availableActions, transition, isPending }`. `availableActions` is computed from the current step's outgoing transitions in the resolved workflow (or, for `DIRECT_APPLY`-only entities, from mapping rows whose `from_status` matches the record's current status).
- `src/components/compliance/StatusActionBar.tsx` — replaces the hand-rolled action button blocks across CE detail pages.

One **tiny** edge function `ce-apply-status` exists only because clients can't write `system_audit_trail` reliably; it has no rules of its own — it just validates the `(from_status → to_status)` declared on the matching `workflow_steps` row and performs the `UPDATE` + history + audit insert. If you'd rather skip the edge function and use a `SECURITY DEFINER` RPC, say so and I'll swap it.

### D. Route direct writes through the engine

Every direct CE status write is rewritten as `await ceWorkflowStatusService.requestTransition(...)`:

- `ViolationDetails.tsx` (lines 49–81, 305–360), `violationService.ts:215`, `violationLifecycleService.ts`, `ViolationMergeDialog.tsx:54`, `ViolationSplitDialog.tsx:84`, `BulkViolationActions.tsx`, `supabase/functions/run-escalation-engine/index.ts:154`
- `caseRequestsService.ts:92,102,111`
- `noticeService.ts:25,55,85,117`, `noticeWorkflowService.ts:97,107,115`
- `arrangementWorkflowService.ts:28,38,47,231`
- `legalEscalationService.ts:242,336,372`
- `inspectionService.ts:182,204,286`, `FieldOperations.tsx:45,60`
- `BreachMonitoring.tsx:35`
- `waiverService.ts:368`

`violationLifecycleService.transition()` becomes a thin shim so existing imports keep working; its in-file `TRANSITION_MATRIX` is deleted (the matrix now lives in the Workflow Designer).

The specific "Return to Open after Start Work" bug disappears the moment we seed: no `violation.status.RETURN_TO_OPEN` event key with `from = UNDER_REVIEW → to = OPEN` is mapped. The button is removed from `STATUS_ACTIONS` and the button set is now driven by what the engine reports as available.

### E. Admin UX — no new screens

Admins configure everything in the screens that already exist:

1. **Admin → Workflows** (`/workflow/management`) — define/edit each status-change workflow (steps, maker-checker, SLA). The two new `workflow_steps` columns appear in the existing Step editor.
2. **Compliance Admin → Workflow Mapping** — map each new `<entity>.status.<ACTION_CODE>` key to a workflow (or leave it on `DIRECT_APPLY` for trivial moves).

No second admin surface introduced.

### F. Maker-checker & audit — reuse existing, no new logic

- Maker-checker is the **existing** `workflow_definitions.maker_checker_enabled` flag enforced by the existing hooks/edge function (`mem://workflow-maker-checker` rules). Admins are exempt the same way they are today.
- Every transition produces (i) the existing `workflow_instances` history when a workflow runs, or the existing `system_audit_trail` row tagged `ce.status_transition` when `DIRECT_APPLY` runs, plus (ii) the entity-specific history table when one exists (`ce_violation_history`, `ce_case_history`, `ce_notice_delivery_log`).

### G. Seeding (one idempotent migration)

1. Insert the new event keys with default `ce_workflow_mappings` rows set to `enabled = false, fallback_behavior = 'DIRECT_APPLY'` so today's behavior is unchanged until admins turn the engine on.
2. Seed one baseline workflow definition "CE Status — Trivial Transitions" with a `workflow_steps` row per declared `(from_status, action) → to_status`, editable from the standard Workflow Designer.
3. Notably **omit** any `(from = UNDER_REVIEW, to = OPEN)` step — closes the reported bug.

### H. Regression safety

- All existing approval-gate flows (notice/waiver/plan/case-closure approvals) untouched — same engine, same screens, same hooks.
- All query keys, dashboards, notifications, SLA hooks, capability bundles continue to read `ce_*.status`.
- Repo-wide lint (`scripts/lint-no-direct-ce-status.ts`) wired into CI flags any new `.update({ status: … })` on a `ce_*` table outside the engine.
- One vitest covers: configured transition succeeds + writes history; unconfigured transition rejected; maker-checker self-approval blocked; admin override still works.

### Technical summary

```text
Before:                                          After:
UI ──► service.update({status}) ──►              UI ──► ceWorkflowStatusService
       ce_<entity>.status                              .requestTransition()
       (no validation, no audit)                       │
                                                       ▼
                                          resolveWorkflow(event_key)
                                          (existing) ──► ce_workflow_mappings
                                                       │
                                       ┌───────────────┴──────────────┐
                                       ▼                              ▼
                          existing workflow engine        ce-apply-status edge fn
                          (existing maker-checker,        (validates against
                           existing audit,                workflow_steps.from_status
                           existing notifications)        → result_status_on_complete,
                                                          writes history + audit)
```

### Files

- **Edited (config + 2 cols):** `complianceWorkflowMappingService.ts` (event keys), `workflow_steps` migration (add `result_status_on_complete`, `result_status_on_reject`), Workflow Step editor UI (expose the 2 new fields).
- **New:** 1 edge function (`ce-apply-status`), 1 service, 1 hook, 1 component (`StatusActionBar`), 1 lint script, 1 vitest, 1 seed migration.
- **Lock-down edits:** the 11 services/components/edge fns listed in section D — each becomes a single call to `requestTransition()`.

### Decisions I need from you

1. **Option 1 vs Option 2** for the from→to metadata (default: Option 1, two columns on `workflow_steps`).
2. **Edge function vs SECURITY DEFINER RPC** for the `DIRECT_APPLY` write path (default: edge function, matches the rest of the project).
3. Confirm we keep "no emergency override" as before.