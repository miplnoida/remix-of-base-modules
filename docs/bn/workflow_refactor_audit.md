# BN Workflow Refactor — Phase 0 Audit

_Last updated: 2026-06-07_

This document inventories what is currently **hardcoded** vs **configurable** in the BN claim workflow, the runtime path used today, and the gaps that subsequent refactor phases must close.

---

## 1. Hardcoded behavior (must move to DB / runtime service)

| Location | Issue | Target phase |
| --- | --- | --- |
| `src/services/bn/claimWorkbenchService.ts:315-464` (`CLAIM_TRANSITIONS`) | Full in-code transition matrix (action → from/to statuses, required roles, narrative/reason flags, preconditions). Authoritative source today. Duplicates `bn_claim_transition_rule`. | Phase 2 |
| `src/services/bn/claimWorkbenchService.ts:466-470` (`getAvailableTransitions`) | Returns actions purely from the in-code matrix; ignores DB rules, workbasket, approval policy. | Phase 3 |
| `src/services/bn/claimWorkbenchService.ts:140` (`executeClaimAction`) | Validates via in-code matrix only; writes `bn_claim` status directly. | Phase 2 → 3 |
| `src/services/bn/claimActionRunner.ts:321,505` | Hardcoded checks for `status = 'APPROVED'` and `decisionType === 'APPROVED'` for downstream branching. | Phase 4 |
| `src/services/bn/postApprovalOrchestrator.ts:273-294` | Forces `to_status='APPROVED'` and branches periodic-vs-lump-sum in code; should be a transition-rule side-effect driven by `creates_task_type`. | Phase 4 |
| `src/components/bn/workbench/NextStepGuidance.tsx` | Status-based `if/else` decides the next button; should consume `runtime.getAvailableActions()`. | Phase 3 |
| `src/components/bn/workbench/ClaimActionBar.tsx` | Renders buttons from `CLAIM_TRANSITIONS`; bypasses approval policy & workbasket. | Phase 3 |
| `src/services/bn/registries/transitionRegistry.ts` | Editor-only suggestion list — already flagged as non-runtime, kept as fallback. | Phase 7 (delete fallback) |

---

## 2. Already configurable (engine present, partly unused at runtime)

| Table | Purpose | Runtime use today |
| --- | --- | --- |
| `bn_workflow_template` | Workflow definition per product version (FK from `bn_product_version.workflow_template_id`). | Stored but not driven by Workbench. |
| `bn_claim_transition_rule` | DB version of the transition matrix (status_def-linked). | Read by `TransitionMatrix.tsx` config page only. **Not** read by `executeClaimAction`. |
| `bn_claim_status_def` | Canonical status registry. | Used for UI labels; runtime trusts in-code statuses. |
| `bn_workbasket` | Workbasket definitions (role + product category). | Configured in `WorkbasketConfig.tsx`. Not assigned per stage on product version. |
| `bn_escalation_policy` | SLA + escalation rules. | Configured in `EscalationConfig.tsx`. No FK from product version yet. |
| `bn_approval_policy` (FK → product_version_id) | Multi-level approval thresholds. | Evaluated by `approvalConsoleService` after approval; not consulted by Workbench `APPROVE` action. |
| `bn_override_policy` / `bn_override_request` | Eligibility overrides. | Wired in Phase-prior fix (override re-run lifecycle). ✅ |
| `bn_external_task` | Employer/doctor/claimant pending tasks. | Captured in DB but does not block forward transitions in Workbench. |
| `workflow_instances` / `workflow_tasks` / `workflow_logs` | Generic workflow engine. | Used by other modules (employer registration, meetings, compliance). **No BN claim is currently driven by the generic engine.** |

---

## 3. Current runtime path (today)

```
Public submission / Officer "Submit"
        │
        ▼
ClaimWorkbench ──► useExecuteClaimAction
        │              │
        │              ▼
        │       claimWorkbenchService.executeClaimAction
        │              │   (validates against in-code CLAIM_TRANSITIONS)
        │              ▼
        │       UPDATE bn_claim SET claim_status = … (direct)
        │       INSERT bn_claim_event           (audit)
        │       writeBnAudit(...)               (audit)
        ▼
NextStepGuidance ──► inline if/else on status
        │
        ▼
On APPROVE → postApprovalOrchestrator.approveClaim
        │
        ├─ periodic/long-term → INSERT bn_entitlement   → status=AWARD_SETUP
        └─ lump-sum/short-term → INSERT bn_payment_instruction → status=PAYMENT_QUEUE
```

`bn_workflow_template`, `bn_workbasket`, `bn_escalation_policy`, the generic `workflow_instances` engine, and the DB `bn_claim_transition_rule` table are **not on this path**.

---

## 4. Gaps that subsequent phases must close

1. **No FK from product version to per-stage workbaskets** → cannot route tasks. _(Phase 1 schema)_
2. **No FK from product version to escalation policy / external-task policy** → SLAs are configured but not bound to the product. _(Phase 1)_
3. **`bn_claim_transition_rule` missing operational columns**: `next_workbasket_id`, `triggers_comm_event`, `creates_task_type`, `closes_task_type`, `policy_check_required`, `required_permission`. _(Phase 2)_
4. **Runtime service absent**: no central `bnWorkflowRuntimeService` for `getAvailableActions / getBlockers / executeWorkflowAction`. _(Phase 3)_
5. **Blockers scattered**: doc completeness, external task pending, stale calc, approval missing, mandatory letter, payment details, holds — all checked ad-hoc in components. _(Phase 3)_
6. **Approval levels not enforced at action time** — `bn_approval_policy` evaluated only after the fact. _(Phase 4)_
7. **External tasks don't block transitions** — `bn_external_task` rows are visible but Workbench still allows forward moves. _(Phase 5)_
8. **`postApprovalOrchestrator` hardcodes the AWARD vs PAYMENT branch** — should come from transition rule. _(Phase 4)_
9. **Configuration Validation does not assert workflow completeness** for the product version. _(Phase 6)_
10. **No automated tests** for the 14 acceptance scenarios. _(Phase 7)_

---

## 5. Files touched in upcoming phases (forecast)

- **Phase 1**: migration on `bn_product_version`, `src/components/bn/config/WorkflowTab.tsx`, `src/hooks/bn/useBnProduct.ts`.
- **Phase 2**: migration on `bn_claim_transition_rule`, seed rows, `src/services/bn/claimActionRunner.ts`, `src/services/bn/claimWorkbenchService.ts`.
- **Phase 3**: new `src/services/bn/workflow/bnWorkflowRuntimeService.ts`, new `src/services/bn/workflow/blockerService.ts`, refactor `NextStepGuidance.tsx`, `ClaimActionBar.tsx`.
- **Phase 4**: refactor `postApprovalOrchestrator.ts`, `decisionEngine.ts`, hook `bn_approval_policy` into runtime.
- **Phase 5**: new `bn_external_task` blocker, escalation runner wiring.
- **Phase 6**: visual workflow designer (list-based), validation rules.
- **Phase 7**: remove `CLAIM_TRANSITIONS` fallback, add vitest specs.
