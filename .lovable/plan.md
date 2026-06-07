# Plan — BN Register / Assist Application: Enterprise Hardening

## Audit Summary (key gaps)

The intake page (`src/pages/bn/intake/ClaimRegistration.tsx`, 1,047 lines, single route `/bn/intake/register`) already uses the shared `PaymentDetailsSection` and derives workflow from the product version. But it still has these gaps:

1. **Bank / branch / account-type are free-text** inside `PaymentDetailsSection` even though `bn_bank_master`, `bn_bank_branch`, `bn_payment_method` and a `bankMasterService` already exist — the section never calls them.
2. **Workbasket override is a free-text Input** at `ClaimRegistration.tsx:779` — no validation against `bn_workbasket`.
3. **Priority and Source dropdowns are hardcoded enums** (LOW/NORMAL/HIGH/URGENT, PAPER/WALK_IN/PHONE).
4. **`payment_required_at_application` flag exists** on `bn_product_channel_config` but is **never checked** — step 9 is always optional regardless of product policy.
5. **`payment_details_visibility` column is missing** on `bn_product_channel_config` — products that never need payment at intake cannot hide step 9.
6. **`window.prompt()`** used at lines 686/689 for document pending / waiver reasons.
7. **Legacy `logAuditTrail`** mixed with BN-domain `auditSubmission` / `writeBnAudit` — inconsistent.
8. **`PAYMENT_PROFILE_CHANGED` audit event missing** when `submitChangeRequest()` writes the change request.
9. **No `src/components/bn/selectors/`** directory exists; no smart selectors at all.

Other selectors named in the request (WorkflowTemplate, Transition, ReasonCode, RuleGroup, RuleCode, Formula, DocumentType, ScreenTemplate, ProductVersion) are **not used by the intake page** — they belong to the Configuration / Product Catalog screens. Those will be scoped to a follow-up.

## Phase 1 — Master-Data Selectors (new)

Create `src/components/bn/selectors/`:

- `BankSelector.tsx` — `SearchableSelect` over `listBanks()`; props `{ value, onChange, countryCode?, disabled }`. Shows `bank_code — bank_name` with status badge; filter inactive unless `includeInactive`.
- `BranchSelector.tsx` — depends on selected `bankCode`; calls `listBranches(bankCode)`; clears when bank changes.
- `PaymentMethodSelector.tsx` — over `listPaymentMethods()`; respects optional `allowedMethods: string[]` from product policy.
- `WorkbasketSelector.tsx` — over `bn_workbasket`; supports `productVersionId` filter; SearchableSelect.

Each selector follows the project's `SearchableSelect` standard, shows `code · name · active badge`, only active selectable by default, search enabled, inactive shown only when explicitly editing a historic record.

Add hooks under `src/hooks/bn/useBnPaymentMasters.ts`:
- `useBanks(countryCode?)`, `useBankBranches(bankCode?)`, `usePaymentMethods()`, `useWorkbaskets(productVersionId?)`.

## Phase 2 — Wire Selectors into the Intake & Payment UI

**`src/components/bn/payment/PaymentDetailsSection.tsx`**
- Replace four free-text bank/branch inputs (lines 253–268) with `BankSelector` + `BranchSelector`. On bank change → set `bank_code`+`bank_name`, clear branch fields. On branch change → set `branch_code`+`branch_name`.
- Replace payment-method label map (lines 54–58) with `PaymentMethodSelector` driven by `policy.allowed_methods`.
- Replace account-type and account-holder-relationship free-text with `Select` bound to fixed code lists pulled from `bn_country_payment_config` (`account_types`, `payee_relationships` — already JSON columns on the table). Fall back to a safe default list when null.
- After `submitChangeRequest()` succeeds, emit `PAYMENT_PROFILE_CHANGED` via `writeBnAudit`.

**`src/pages/bn/intake/ClaimRegistration.tsx`**
- Step 10 workbasket override: replace `<Input placeholder="basket code" />` with `<WorkbasketSelector productVersionId={resolvedVersion?.version.id} />`. Only render if `policy.allow_manual_workbasket_override` is true.
- Priority + Source dropdowns: read options from `bn_country_payment_config.intake_priorities` / `intake_sources` JSON arrays with hardcoded fallbacks (transitional — full move to a master table is out of scope here).
- Replace both `window.prompt()` calls with a single `<ReasonCaptureDialog />` (new component in `src/components/bn/intake/ReasonCaptureDialog.tsx`).
- Replace `logAuditTrail` usages with `bnAuditService` (`auditWorkflowAction`, `auditDocumentAction`, `auditApplicationAction`) for consistency.

## Phase 3 — Product Catalog Enforcement

**Migration** — add the missing visibility flag and one consolidated guard column:

```sql
ALTER TABLE public.bn_product_channel_config
  ADD COLUMN IF NOT EXISTS payment_details_visibility VARCHAR(20)
    NOT NULL DEFAULT 'SHOW',  -- SHOW | HIDE | READONLY
  ADD COLUMN IF NOT EXISTS allow_manual_workbasket_override BOOLEAN
    NOT NULL DEFAULT false;
```

**Runtime checks** in `ClaimRegistration.tsx`:
- Skip step 9 entirely when `policy.payment_details_visibility === 'HIDE'`.
- Render step 9 read-only when `'READONLY'`.
- Block "Next" in `canAdvanceFrom('banking')` when `payment_required_at_application` is true and no active payment profile is captured.
- Block submit (`handleSubmit`) when `payment_required_before_payment` is true and no profile exists (warning) — record the gap on the claim review summary.

**`PaymentDetailsSection`** consumes the same flags via the existing `getPaymentPolicy()` and exposes a `policy` prop upward via `onPolicyResolved` so the intake page can read it without re-querying.

## Phase 4 — Configuration Validation

Extend `src/services/bn/eligibility/validateRuleSet.ts` (created in the Eligibility redesign) and a new `validateProductChannelConfig.ts`:

- Product has `payment_required_*` but no `PAYMENT_DETAILS` screen section → ERROR.
- `EFT` in `allowed_payment_methods` but `bn_bank_master` empty for the country → ERROR.
- `CHEQUE` allowed but `cheque_address_required` not set or no postal address fields in screen template → WARN.
- `workflow_definition_id` / `default_workbasket_id` null on channel config → ERROR.
- Any rule using a `fact_key` not in the registry → ERROR (already covered by validateRuleSet; surface in the same panel).

Surface results in `BN → Configuration → Validation` tab (existing component if present, otherwise a small `ConfigValidationPanel` reused on product version detail). No runtime gating in this phase — only visibility.

## Phase 5 — Audit Coverage

Add the missing business events through `writeBnAudit`:

| Event | Trigger |
|---|---|
| `APPLICATION_REGISTERED` | When step 2 (confirm person) completes for the first time |
| `PAYMENT_DETAILS_CHANGED` | After `submitChangeRequest` succeeds |
| `ELIGIBILITY_PRECHECK_RUN` | When user clicks "Run pre-check" on step 6 (also adds the button — currently rules are display-only) |
| `WORKFLOW_BASKET_OVERRIDE` | Already audited; migrate from legacy logger |
| `CLAIM_SUBMITTED` | Already audited |

## Out of Scope (deferred)

- Building the eight non-intake selectors (WorkflowTemplate, Transition, ReasonCode, RuleGroup, RuleCode, Formula, DocumentType, ScreenTemplate, ProductVersion) — they belong to the Product Catalog / Workflow Designer screens; tracked separately.
- Replacing `sectionCatalogue.getDefaultFieldsForBenefit()` SELECT options with master-data lookups — needs a separate field-mapping layer.
- Extracting the 1,047-line monolithic intake into sub-components — purely structural, no behaviour change.

## Acceptance

- Bank, branch, payment method, workbasket: all SearchableSelect, master-data driven, no free text.
- Intake honours `payment_details_visibility`, `payment_required_at_application`, `allow_manual_workbasket_override`.
- `window.prompt()` removed.
- All intake audit events flow through `bnAuditService` → `system_audit_trail`.
- Config Validation panel flags missing PAYMENT_DETAILS section, missing bank master, missing workflow template, unknown rule fact keys.
- TypeScript build passes; existing `PaymentDetailsSection` callers (claimant portal, EFT Update, Claim Workbench, Entitlement, Payment Preparation) continue to work unchanged.
