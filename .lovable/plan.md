# Legal Fee + Waiver Workflow Engine

Building on existing `lg_fee_rule`, `lg_fee_bundle`, `lg_fee_bundle_item`, `lg_fee_charge`, `lg_fee_waiver`. Central fee head = `tb_income_codes`. Employer financial source = `ce_employer_financial_ledger`.

## 1. Database migration (single file)

**New: `lg_fee_waiver_policy`**
- `policy_code` (uniq), `policy_name`, `country_code`, `fee_head_id` (nullable FK tb_income_codes), `case_type_code` (nullable)
- `max_waiver_amount_without_approval`, `max_waiver_percent_without_approval`
- `approval_required`, `approval_route_code` (workbasket code), `min_approvers`, `allow_self_approval`
- `requires_reason`, `requires_document`, `status`, `effective_from/to`, audit cols

**New: `lg_fee_waiver_policy_tier`** (amount/percent → approver level)
- `policy_id`, `tier_order`, `min_amount`, `max_amount`, `min_percent`, `max_percent`, `approver_role_type`, `workbasket_code`

**Extend `lg_fee_rule`**: add `waiver_policy_id uuid REFERENCES lg_fee_waiver_policy(id)`

**Extend `lg_fee_charge`**: add
- `posting_status varchar(20) DEFAULT 'DRAFT'` (DRAFT, PENDING_POST, POSTED, REVERSED, CANCELLED)
- `posted_at`, `posted_by`, `employer_account_transaction_id` (already covered by `ledger_entry_id` — keep both as aliases)
- `reversal_ledger_entry_id`

**Extend `lg_fee_waiver`** (acts as waiver_request): add
- `lg_case_id uuid` (denorm), `requested_waiver_amount`, `requested_waiver_percent`, `justification`, `supporting_document_id uuid` (REFERENCES `lg_document_link`)
- `approval_status` enum widened: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, AUTO_APPROVED
- `workflow_instance_id uuid`, `rejected_by`, `rejected_at`, `policy_id uuid`
- `requires_finance_approval boolean`, `finance_approved_by`, `finance_approved_at`

**Seeds** (via `supabase--insert` after migration):
- 3 waiver policies: SMALL_DEPT_DEFAULT (≤50 XCD/≤5% auto, ≤500/25% reviewer, else manager), FINANCE_REVERSAL (always finance), BOARD_HIGH_VALUE
- 3 bundles: COURT_FILING_BUNDLE, JUDGMENT_BUNDLE, DEFAULT_RECOVERY_BUNDLE with their items
- Auto-apply fee rules for events: COURT_FILING, DEMAND_NOTICE_SERVED, HEARING_SCHEDULED, JUDGMENT_RECORDED, ENFORCEMENT_STARTED, SETTLEMENT_APPROVED, ARRANGEMENT_DEFAULTED
- Workbaskets: LG_FEE_DRAFT, LG_FEE_POSTING, LG_FEE_WAIVER_REVIEW, LG_FEE_WAIVER_FINANCE_REVIEW, LG_FEE_WAIVER_APPROVED_FOR_POSTING (insert into existing `bn_workbasket` if compatible, else `core_reference_value` under group `LG_WORKBASKET`)

## 2. Services

**New `src/services/legal/lgFeeWaiverPolicyService.ts`** — CRUD for policies + tiers; `evaluateWaiverPolicy({feeCharge, requestedAmount, requestedPercent})` returns `{ autoApprove, approvalRequired, approverRoleType, workbasketCode, requiresFinance }`.

**Extend `lgFeeEngineService.ts`**:
- `autoApplyForEvent(caseId, eventCode)` — looks up active rules with matching `event_code` + `auto_apply=true`, computes amounts (FIXED/PERCENTAGE/TIER/FORMULA), idempotent insert into `lg_fee_charge`.
- `applyBundle(caseId, bundleCode, opts)` — iterates `lg_fee_bundle_item` and calls auto-apply per rule.
- `postFeeCharge(chargeId, userCode)` — guards `posting_status='DRAFT'`, calls ledger posting service (existing `ce_employer_financial_ledger` insert), sets `posted_at`, `ledger_entry_id`, status → `POSTED`. Idempotent.
- `reverseFeeCharge(chargeId, reason, userCode)` — only if POSTED; insert reversal ledger row; status → `REVERSED`.

**Rewrite `lgFeeWaiverService.ts`**:
- `requestWaiver({chargeId, amount, percent, reasonCode, justification, documentId})` — validates ≤ net, ≤100%; resolves policy; if auto-approve threshold met → AUTO_APPROVED + applies waiver immediately; else creates SUBMITTED row + workflow instance into resolved workbasket.
- `approveWaiver(waiverId, userCode)` — checks role policy via `useLgCan('FEE_WAIVER','approve')` server-equivalent; if charge already POSTED → also creates reversal ledger entry and links `reversal_ledger_entry_id`; updates `waived_amount`/`net_amount` on charge.
- `rejectWaiver(waiverId, reason, userCode)`, `cancelWaiver`, `submitWaiver` (DRAFT→SUBMITTED).

**Hook event triggers**: extend `lgCaseService` stage transitions, `lgOrderService` (judgment), `lgHearing` scheduling, `lgSettlementService` approval, `lgPaymentArrangementService` default — each calls `lgFeeEngineService.autoApplyForEvent(caseId, eventCode)` fire-and-forget.

## 3. Hooks

- Extend `useLgFees.ts` with `useFeeWaiverPolicies`, `useApplyBundle`, `usePostFee`, `useRequestWaiver`, `useApproveWaiver`, `useRejectWaiver`.

## 4. UI

**Extend `LgCaseDetail.tsx`** — replace existing Fees section with a Fees tab containing 5 sub-tabs:
- **Applied Fees** — full charge list with status badges, Post Net/Reverse actions
- **Auto Fees** — show rules matched against current stage/event with audit of which fired
- **Bundles** — "Apply Bundle" picker with the 3 seeded bundles
- **Waivers** — request/approve/reject panel with policy preview ("This needs Legal Manager approval" before submit)
- **Employer Ledger Links** — list of `ledger_entry_id` and reversal links, click to open employer financials

Actions gated by `useLgCan('FEE_POST','approve')` / `useLgCan('FEE_WAIVER','approve')` etc. (already wired in earlier turn).

**New `src/pages/legal/LgFeeWaiverPolicyConfig.tsx`** — admin page at `/legal/admin/waiver-policies` listing policies + tier table editor.

**Update `LgFeeConfig.tsx`** — add tab for Waiver Policies link/embed; expose Bundles tab with bundle item editor (rules dropdown).

**Update `AdminConfig.tsx`** — add Waiver Policies card.

**Register route** in `AppRoutes.tsx`; add sidebar entry `lg_admin_waiver_policy` under `lg_admin` (migration row in `app_modules` + mirrored `role_permissions`).

## 5. Validation

Centralized in `lgFeeValidation.ts`: waiver ≤ remaining net, percent ≤100, reason required if policy.requires_reason, document required if policy.requires_document, inactive rule/policy blocked, posted charge edit/delete blocked → must reverse.

## 6. Audit

Every action writes to `lg_case_activity` (existing) with `event_type` (FEE_APPLIED, FEE_POSTED, FEE_REVERSED, WAIVER_REQUESTED, WAIVER_APPROVED, WAIVER_REJECTED, BUNDLE_APPLIED).

## 7. Out of scope (per instructions)

- No new ledger table — reuse `ce_employer_financial_ledger`.
- No new workflow engine — use existing workbasket/workflow infrastructure.
- No changes to central fee head (`tb_income_codes`).

## Acceptance check

- Bundle apply inserts N charges with `auto_applied=true`.
- Waiver ≤50 XCD AUTO_APPROVED instantly under SMALL_DEPT_DEFAULT policy.
- Waiver >500 XCD routes to LG_FEE_WAIVER_REVIEW workbasket.
- Approving a waiver on a POSTED charge creates reversal row and links it.
- Legal Assistant role can `requestWaiver` but not `approveWaiver`.
- TypeScript build passes.
