# BN Workflow Refactor — Phased Plan

## Why phased
Today the Claim Workbench drives status with two hardcoded layers:
1. `CLAIM_TRANSITIONS` matrix in `claimWorkbenchService` / `claimActionRunner`
2. The new `NextStepGuidance` + `postApprovalOrchestrator` we just added

In parallel, the platform already has a generic engine (`workflow_definitions`, `workflow_instances`, `workflow_steps`, `workflow_tasks`, `workflow_step_actions`, `bn_workflow_template`, `bn_claim_transition_rule`, `bn_approval_policy`, `bn_override_policy`, `bn_escalation_policy`, `bn_workbasket`, `bn_external_task`).

We must route BN through the generic engine without breaking the live workbench. Big-bang rewrite = high risk. Below is the phased path.

---

## Phase 0 — Discovery report (no code changes)
Deliverable: `docs/bn/workflow_refactor_audit.md`
- Inventory hardcoded `if status === …` / direct `update bn_claim` calls in workbench, runner, orchestrator, decisionEngine.
- Map current BN statuses ↔ `bn_claim_status_def` ↔ `bn_claim_transition_rule` rows.
- Note workbasket / escalation / approval-policy tables already present but unused by runtime.
- Output: gap list with file:line refs, drives every later phase.

## Phase 1 — Product Catalog workflow wiring (config only, runtime unchanged)
- Extend `bn_product_version` with: `transition_matrix_id`, `default_workbasket_id`, per-stage workbasket FKs, `escalation_policy_id`, `external_task_policy_id` (approval_policy_id already exists via `bn_approval_policy.product_version_id`).
- New tab section in `WorkflowTab.tsx`: workbasket per stage, escalation policy, approval policy picker; visual step list rendered from the selected `bn_workflow_template` + `bn_claim_transition_rule` rows.
- Read-only "Validate Workflow" button reusing existing validation service — surfaces missing template / orphan statuses / missing workbaskets.
- No runtime change yet — Workbench still uses current code path.

## Phase 2 — Transition matrix as source of truth
- Migrate hardcoded `CLAIM_TRANSITIONS` into `bn_claim_transition_rule` seed for default product versions.
- Add columns if missing: `requires_reason`, `requires_comment`, `triggers_comm_event`, `creates_task_type`, `closes_task_type`, `next_workbasket_id`, `policy_check_required`, `required_role`, `required_permission`.
- Update `claimActionRunner.executeClaimAction` to look up allowed transitions from DB first, fall back to in-code matrix with a console warning (gives us a safe rollout window).

## Phase 3 — `bnWorkflowRuntimeService`
New file `src/services/bn/workflow/bnWorkflowRuntimeService.ts`:
- `getClaimWorkflowState(claimId)` — joins claim → product version → template → current step → workbasket → open tasks.
- `getAvailableActions(claimId, user)` — DB transitions ∩ user role/permission ∩ approval policy.
- `getWorkflowBlockers(claimId)` — central replacement for the scattered checks (docs, external tasks, eligibility override, stale calc, missing approval, mandatory letter, payment details, active hold).
- `executeWorkflowAction`, `createNextTask`, `completeCurrentTask`, `sendBack`, `escalateTask`.
- Writes `workflow_logs` + `bn_claim_event` + `system_audit_trail` in one transactional helper.

Workbench keeps existing buttons but they now delegate to runtime service. `NextStepGuidance` reads from `getAvailableActions` + `getWorkflowBlockers` instead of inline rules.

## Phase 4 — Decision / approval levels via policy
- Approval policy already supports levels (`bn_approval_policy.level`, amount threshold). Wire `executeWorkflowAction('RECOMMEND_APPROVAL' | 'APPROVE')` to evaluate `evaluateApprovalPolicy` and create the next approval task / workbasket assignment automatically.
- Remove hardcoded approve→entitlement branching in `postApprovalOrchestrator`; instead it becomes a transition-rule side effect (`creates_task_type=AWARD_SETUP` or `PAYMENT_QUEUE`) selected per product version.

## Phase 5 — External tasks & escalation
- Connect `bn_external_task` (employer/doctor/claimant) to `EXTERNAL_TASK_WAIT` step. Runtime blocks forward transitions until matching task closes.
- Hook `bn_escalation_policy` into runtime — overdue tasks fire `escalateTask` via the existing escalation runner.

## Phase 6 — Catalog UI polish + validation
- Visual workflow designer (step cards + transitions; no drag-drop in v1 — keep it list-based for review).
- "Available Actions by Role" preview using `getAvailableActions` with a role selector.
- Configuration Validation card adds: workflow template present, every non-final status has onward transition, workbasket/escalation/approval refs exist, payment step exists for payment products, no hardcoded transitions remain (greps tracker file written in Phase 2).

## Phase 7 — Remove fallbacks & acceptance tests
- Delete in-code `CLAIM_TRANSITIONS` fallback once two product versions ship cleanly on DB-driven flow.
- Vitest specs covering the 14 acceptance scenarios you listed.
- Final TypeScript build check.

---

## Technical notes
- All schema changes via migrations with GRANTs; no RLS (per project rule).
- Audit writes use existing `writeBnAudit` critical path — already extended for the new action codes.
- No breaking changes to public claim submission API in any phase before Phase 7.
- Each phase is independently shippable; we stop and verify before moving on.

---

## What I need from you before I start
1. Confirm phased rollout (vs. big-bang) — I strongly recommend phased.
2. Approve starting with **Phase 0 audit + Phase 1 catalog wiring** in this turn. Phases 2–7 land in subsequent turns after you review each.
3. Any product versions you want migrated first (so seed data in Phase 2 targets the right rows)?
