
# Legal Fee Engine

## Reuse, don't duplicate
- Central fee head master: `tb_income_codes` (already has `LEGAL_*` codes). Legal references it via `fee_head_id`.
- Employer ledger: `ce_employer_financial_ledger` (already immutable, supports reversals). All postings go here. Transaction id stored on `lg_fee_charge.employer_account_transaction_id`.
- Reference codes for case_type/stage/event come from existing `core_reference_group` / `core_reference_value` (LG_CASE_TYPE, LG_CASE_STAGE, etc.). Add new groups `LG_FEE_EVENT`, `LG_WAIVER_REASON`, `LG_FORMULA`.

## New tables (migration)

### `lg_fee_rule` — fee configuration
`id, fee_rule_code (unique), fee_rule_name, country_code, case_type_code, stage_code, event_code, fee_head_id → tb_income_codes, calculation_type (FIXED|PERCENTAGE|FORMULA|TIER|MANUAL), fixed_amount, percentage_rate, base_variable (claim_amount|outstanding_amount|arrears_amount|...), min_amount, max_amount, formula_code, tier_config_json, effective_from, effective_to, auto_apply bool, allow_waiver bool, waiver_requires_approval bool, status (ACTIVE|INACTIVE|DRAFT), audit cols`

### `lg_fee_bundle`
`id, bundle_code (unique), bundle_name, country_code, case_type_code, stage_code, trigger_event, status, audit`

### `lg_fee_bundle_item`
`id, bundle_id → lg_fee_bundle, fee_rule_id → lg_fee_rule, sequence_no, mandatory bool, allow_waiver bool`

### `lg_fee_waiver`
`id, fee_charge_id → lg_fee_charge, waiver_reason_code, requested_by (user_code), requested_at, waiver_amount, waiver_percent, approval_status (PENDING|APPROVED|REJECTED|AUTO_APPROVED), approved_by, approved_at, comments, reversal_ledger_entry_id (uuid → ce_employer_financial_ledger)`

### `lg_fee_charge` — extend
Add columns: `fee_rule_id, fee_bundle_id, calculated_amount, waived_amount default 0, net_amount (computed = amount - waived_amount), waiver_status (NONE|REQUESTED|APPROVED|REJECTED), source_event, auto_applied bool, manual_override_reason, ledger_entry_id uuid → ce_employer_financial_ledger`. Keep existing `employer_account_transaction_id` for backward compat.

Full GRANTs on every new table to `authenticated`/`service_role`. RLS stays off per project NO-RLS policy.

## Calculation engine — `src/services/legal/lgFeeEngineService.ts`
Pure TS function `calculateFee(rule, context) → { amount, breakdown }`. Context exposes: `claim_amount, outstanding_amount, arrears_amount, number_of_hearings, stage, case_type, employer_size, risk_score, days_overdue, court_type, service_method, enforcement_type`. Branches by `calculation_type`; applies min/max clamp; formula type loads from `LG_FORMULA` ref (safe whitelisted expression eval).

## Auto-apply triggers
Service hooks (not DB triggers) invoked from existing services:
- `lgWorkflowService.changeStage(...)` → `applyAutoFeesForEvent("STAGE_" + stage_code)`
- `lgCaseService` hearing scheduled → `HEARING_SCHEDULED`
- `lgOrderService` judgment recorded → `JUDGMENT_RECORDED`
- enforcement start → `ENFORCEMENT_STARTED`
- `lgTemplateService` notice served → `NOTICE_SERVED`
- `lgSettlementService` approved → `SETTLEMENT_APPROVED`
- `lgPaymentArrangementService` default → `ARRANGEMENT_DEFAULTED`
Each calls `autoApplyForEvent(caseId, event)` which finds matching `lg_fee_rule` rows (auto_apply=true, effective window) + matching `lg_fee_bundle` and creates `lg_fee_charge` rows. Idempotency key = `LG_FEE:{case}:{rule_or_bundle}:{event}`.

## Posting
`postFeeCharge(chargeId)`:
1. Insert into `ce_employer_financial_ledger` (entry_type=DEBIT, fund_type=ADMIN/LEGAL, idempotency_key=`LG_FEE:{chargeId}`, reference_type='LG_FEE_CHARGE', reference_id=chargeId, source_system='LEGAL').
2. Update `lg_fee_charge.ledger_entry_id`, `posting_status='POSTED'`, `posted_by`, `posted_at`.
3. Audit via `logLgActivity`.

## Waiver
`requestWaiver(chargeId, reason, amount|percent, comments)` → insert `lg_fee_waiver`, set `waiver_status='REQUESTED'`. Auto-approve if `rule.waiver_requires_approval=false`.
`approveWaiver(waiverId)` →
1. Compute waived_amount; update `lg_fee_charge.waived_amount`, `waiver_status='APPROVED'`.
2. If original was posted, post a CREDIT reversal entry to ledger (reversal_of_id = original ledger entry); store id on waiver.
3. Audit. Charge row stays visible.

## Services
- `src/services/legal/lgFeeRuleService.ts` — CRUD rules + bundles
- `src/services/legal/lgFeeEngineService.ts` — calculate + autoApplyForEvent
- `src/services/legal/lgFeeWaiverService.ts` — request/approve/reject
- Extend `lgFeeChargeService.ts` — post via ledger (replace invoice path) + manual fee
- Hook auto-apply calls into existing workflow/order/hearing/settlement/notice/arrangement services

## UI

### Case Detail → Fees tab (`src/components/legal/lg/CaseFeesTab.tsx`)
Sub-tabs: Auto Fees · Manual Fee · Fee Bundles · Waivers · Posted Transactions.
Buttons (gated by `useLgAccess`): Apply Fee Bundle, Add Manual Fee, Request Waiver, Approve Waiver (manager+), Post Fee, View Employer Ledger Entry (link to ledger row).
Dialogs (new under `src/components/legal/lg/`): `ApplyFeeBundleDialog`, `AddManualFeeDialog`, `RequestWaiverDialog`, `ApproveWaiverDialog`.

### Admin → Legal Fee Configuration (`src/pages/legal/LgFeeConfig.tsx`, route `/legal/admin/fees`)
Tabs: Rules · Bundles. CRUD with effective dates + status toggle. Read-only fee head dropdown from `tb_income_codes` (LEGAL_* filter — managed centrally, not editable here).

Wire route into `AppRoutes.tsx` and link from `AdminConfig.tsx`.

## Seed (after migration approved)
- ~10 `lg_fee_rule` rows mapped to existing LEGAL_* income codes (Court Filing, Service, Processing, Judgment, Attorney, Execution, Recovery, Appeal).
- 2 bundles: `COURT_FILING_BUNDLE` (Filing + Service + Processing), `JUDGMENT_BUNDLE` (Judgment + Attorney + Execution).
- `LG_FEE_EVENT`, `LG_WAIVER_REASON` ref values.

## Acceptance verification
- TS build passes.
- DB row counts: `lg_fee_rule≥8`, `lg_fee_bundle=2`, `lg_fee_bundle_item≥6`.
- Manual smoke (Playwright) on a seeded case: apply bundle → 3 charges; post one → ledger row created with matching ref; request waiver → approve → reversal ledger row appears; manual fee created.

## Out of scope
- No new fee head master (reusing `tb_income_codes`).
- No changes to `ce_employer_financial_ledger` schema or triggers.
- No payment allocation / collection flow.
- SSB* legacy legal screens untouched.
- Formula language: only whitelisted variables + arithmetic (no general expression engine).
