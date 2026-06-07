## BN Post-Calculation → Payment Flow Wiring

Most of the infrastructure already exists (determinationService, approvalConsoleService, entitlementService, payablesQueueService, decisionEngine, payment routes). The gap is **end-to-end orchestration and guidance**. This plan focuses on closing the gaps without rebuilding what already works.

### Phase 1 — Workbench guidance & status flow
- Add `NextStepGuidance` panel to `ClaimWorkbench.tsx` that inspects current claim state (eligibility result, calculation run, decision, entitlement, payable) and renders the exact next action with a one-click button.
  - After CALCULATION → "Submit for Decision" → moves status to `DECISION` (or `PENDING_APPROVAL` if approval policy requires it, resolved via `bn_approval_policy`).
  - After DECISION approved & no payable → "Generate Payable / Entitlement".
  - After payable created → link to `/bn/payables` filtered to this claim.
- Wire `Submit for Decision` action through existing `executeClaimAction` and audit via `auditClaimAction`.

### Phase 2 — On-approval orchestration (`onClaimApproved` orchestrator)
New service `src/services/bn/postApprovalOrchestrator.ts`:
- Read product (`benefit_category`, `payment_frequency`, `entitlement_type`, `payment_method`) from `bn_product` / `bn_product_version`.
- Branch:
  - Periodic / long-term → insert `bn_entitlement` + first `bn_payment_instruction` (if `auto_first_payment`).
  - Lump sum / short-term → insert `bn_payment_instruction` directly, status `PENDING_VALIDATION`.
- Move claim to `AWARD_SETUP` / `IN_PAYMENT` / `PAYMENT_QUEUE`.
- Audit each step (`AWARD_CREATED`, `PAYMENT_INSTRUCTION_CREATED`, `PAYABLE_QUEUED`) into `system_audit_trail` + `bn_claim_event`.
- Hook orchestrator into `decisionEngine.executeTransition` when transition is `APPROVE` and to_status is terminal-approval.

### Phase 3 — Payable validation
New helper `validatePayable(instructionId)` in `payablesQueueService.ts` returning structured diagnostics:
- approved decision exists
- eligibility ELIGIBLE / ELIGIBLE_WITH_OVERRIDE
- calculation finalized
- payee resolved (bank/payment method)
- no active hold
- no blocking mandatory document
Renders in Payables Queue row as a `BlockerChip` with reason; blocks "Issue" if any fail.

### Phase 4 — Diagnostic surfacing
- `NextStepGuidance` reuses `validatePayable` results to show exact blocker text per spec section 9.
- Add "Generate Payable" button on workbench when decision approved & no instruction exists.

### Phase 5 — Audit coverage
Ensure these audit events use `auditClaimAction` with `critical: true`:
`CALCULATION_COMPLETED`, `SUBMITTED_FOR_DECISION`, `CLAIM_APPROVED`, `CLAIM_DENIED`, `ENTITLEMENT_CREATED`, `PAYMENT_INSTRUCTION_CREATED`, `PAYABLE_QUEUED`, `BATCH_CREATED`, `PAYMENT_ISSUED`. Add the missing ones (most likely `SUBMITTED_FOR_DECISION`, `ENTITLEMENT_CREATED`, `PAYABLE_QUEUED`).

### Files to touch
- `src/services/bn/postApprovalOrchestrator.ts` (new)
- `src/services/bn/payablesQueueService.ts` (add `validatePayable`)
- `src/services/bn/decisionEngine.ts` (call orchestrator on approve)
- `src/components/bn/workbench/NextStepGuidance.tsx` (new)
- `src/pages/bn/claims/ClaimWorkbench.tsx` (mount panel)
- `src/pages/bn/payables/*` (BlockerChip in row — find file)
- `src/services/bn/audit/bnAuditService.ts` (extend CRITICAL_ACTIONS set)

### Out of scope (already working, just confirm)
- Payment schedule, batch, issue, post-issue routes — pages already exist; wiring of "add to schedule" from payable row is reused as-is.
- Approval policy resolution — uses existing `bn_approval_policy` evaluator.

Please confirm and I'll implement Phases 1–5 in sequence.