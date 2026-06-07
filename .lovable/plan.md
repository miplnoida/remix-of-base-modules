
# Standardize BN Payment / EFT Details

A single Payment Details framework — used by claimant portal, public application, intake (staff/assisted), Claim Workbench, Entitlement setup, Payment Preparation, and the EFT Update service. No screen builds its own bank form.

---

## Phase 1 — Discovery (read-only)

Inspect and map current payment-detail touchpoints to identify the canonical fields and pick the strongest existing implementation as the base for the shared component.

Files/areas to inspect:
- Claimant portal EFT/bank update (existing claimant-side flow)
- `src/components/bn/intake/*` — Register Claim / intake forms
- `src/components/bn/workbench/*` — Claim Workbench award/payment tabs
- `src/components/bn/entitlement/*` — Entitlement setup
- `src/components/bn/batch/PaymentExecutionPanel.tsx` + `src/services/bn/payment/*` — payment prep
- `src/pages/bn/product/*` — Product Catalog Screen & Fields, channel config, amendment policy
- `bn_product_channel_config`, `bn_product_amendment_policy`, `bn_claim`, `bn_award`, `bn_entitlement`, `bn_payment_instruction` — current payment columns
- Public online benefit application form
- EFT Update service product definition

Deliverable: a short mapping doc (in-PR comment) of "where bank fields live today" and which become deprecated.

---

## Phase 2 — Data model

New normalized tables:

**`bn_payment_profile`** — one verified profile per (person/payee, currency, method)
- `id`, `person_ssn`, `payee_id` (nullable, FK `bn_claim_participant`)
- `payment_method` (`EFT|CHEQUE|CASH_PICKUP|INTERNAL_TRANSFER`)
- `bank_name`, `bank_code`, `branch_name`, `branch_code`
- `account_number_masked`, `account_number_token` (nullable — encrypted/tokenized when vault available)
- `account_holder_name`, `account_holder_relationship`, `account_type`
- `payment_currency`
- `postal_address_snapshot` (JSONB) — for cheque
- `verification_status` (`UNVERIFIED|PENDING|VERIFIED|REJECTED`), `verified_by`, `verified_at`
- `active` (bool), `effective_from`, `effective_to`
- Unique partial index: one `active` profile per `(person_ssn, payee_id, payment_method, payment_currency)`.

**`bn_payment_profile_change_request`**
- `id`, `profile_id` (nullable for first-time create), `claim_id` (nullable), `entitlement_id` (nullable)
- `requested_by`, `channel` (`PUBLIC_ONLINE|STAFF_OFFLINE|ASSISTED_COUNTER|CLAIM_WORKBENCH|EFT_UPDATE_SERVICE|CLAIMANT_PORTAL`)
- `old_profile_snapshot` (JSONB), `new_profile_snapshot` (JSONB)
- `status` (`DRAFT|SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|CANCELLED`)
- `reason`, `proof_document_ids` (uuid[]), `approved_by`, `approved_at`, `rejected_reason`

Extensions:
- `bn_payment_instruction` → add `payment_profile_id` (FK) and keep `bank_account_snapshot` as the audit snapshot.
- `bn_claim_application` → keep raw submitted payment as JSONB snapshot only (no operational use).
- `bn_product_channel_config` → add booleans: `payment_required_at_application`, `payment_required_before_approval`, `payment_required_before_payment`, `allow_third_party_payee`, `allow_guardian_payee`, `require_bank_verification`, `require_supervisor_approval_for_change`, `require_proof_for_change`, `cheque_address_required`; plus `allowed_payment_methods` (text[]), `default_payment_method`.

GRANTs + standard timestamp/audit triggers on every new table. Auto-grant trigger gives Admin permissions on the new module rows.

---

## Phase 3 — Product Catalog

Add a built-in section `PAYMENT_DETAILS` with the canonical field list to the Product Catalog Screen & Fields registry, and surface a "Payment Policy" tab on the product editor backed by the new `bn_product_channel_config` columns.

Catalog validation rules (Phase 10):
- product requires payment → `PAYMENT_DETAILS` must be present
- `allowed_payment_methods` not empty
- EFT allowed but `require_bank_verification` not set → warn
- cheque allowed but `cheque_address_required` not set → warn
- change policy missing → warn
- any product screen that hardcodes bank fields → error (lint via field registry scan)

---

## Phase 4 — Shared component

`src/components/bn/payment/PaymentDetailsSection.tsx` — single source of truth.

Props:
```ts
{
  mode: 'view' | 'edit' | 'amend',
  channel: 'PUBLIC_ONLINE' | 'STAFF_OFFLINE' | 'ASSISTED_COUNTER'
         | 'CLAIM_WORKBENCH' | 'EFT_UPDATE_SERVICE' | 'CLAIMANT_PORTAL',
  productId?: string,         // pulls policy from bn_product_channel_config
  personSsn: string,
  payeeId?: string,
  claimId?: string,
  entitlementId?: string,
  value?: PaymentProfileDraft,
  onChange?: (v: PaymentProfileDraft) => void,
  onSubmit?: (req: ChangeRequestPayload) => void
}
```

Behavior:
- Dynamically renders fields based on `payment_method` (EFT → bank fields; CHEQUE → postal address; CASH_PICKUP → office/ID; INTERNAL_TRANSFER → internal ref).
- Validation via zod schema derived from product policy.
- Calls `paymentProfileService` for read/write; never writes directly to tables.
- View mode shows: submitted (snapshot) • current verified profile • pending change request • blockers.
- Honours `allow_third_party_payee`, `allow_guardian_payee`, `require_proof_for_change`.

Replace all existing inline bank forms in: claimant portal, public application, intake, workbench, entitlement, EFT update service, payment execution panel.

---

## Phase 5 — Service layer

`src/services/bn/payment/paymentProfileService.ts`
- `getActiveProfile(personSsn, opts)` 
- `getProfileHistory(personSsn)`
- `submitChangeRequest(payload)` — channel-aware; staff direct-edit auto-approves when policy allows, otherwise inserts a change request.
- `approveChangeRequest(id)` / `rejectChangeRequest(id, reason)` — supervisor only when `require_supervisor_approval_for_change`.
- `verifyBank(profileId, evidence)` — sets `verification_status=VERIFIED`.
- `resolveProfileForPayable(entitlementId)` — returns verified profile or a `BLOCKED` reason (used by `payableValidationService`).

All actions audited via `system_audit_trail` and `bn_claim_event` (shielded errors, non-blocking log).

---

## Phase 6 — Payment Preparation integration

Update `payableValidationService.ts`:
- Calls `resolveProfileForPayable`.
- EFT: requires `VERIFIED` profile with `bank_code` + `account_number_token`.
- CHEQUE: requires `postal_address_snapshot`.
- On failure: `validation_status='BLOCKED'`, reason persisted, item visible in Payables Queue with a "Request Claimant Update" action that opens `PaymentDetailsSection` in `amend` mode.

`bn_payment_instruction.payment_profile_id` is set at batch build time; `bank_account_snapshot` records what was actually used.

---

## Phase 7 — Workbench actions

Buttons on the Workbench Payment panel (gated by product policy + role):
Add Payment Details · Amend · Request Claimant Update · Verify Bank Details · Approve Change · Reject Change.

Each action delegates to `paymentProfileService` — no inline mutations.

---

## Phase 8 — Audit + acceptance

Audit events for all 7 actions in section 11. Acceptance checklist matches section 12.

---

## Suggested rollout (sequenced PRs)

1. Phase 1 discovery doc + Phase 2 migration (tables, columns, GRANTs, app_modules + actions for `bn_payment_profile`).
2. Phase 3 Product Catalog policy UI + validation.
3. Phase 4–5 shared component + service.
4. Phase 6 swap-in across all channels (claimant portal → public app → intake → workbench → entitlement → EFT service → payment prep).
5. Phase 7–8 audit wiring + acceptance pass.

---

### Confirm before I start

This is a large, multi-PR change touching the claimant portal, public form, internal intake, workbench, entitlement, EFT service, and payment preparation.

Two questions:
1. **Start with Phase 1 (discovery + mapping doc)** and come back with the concrete file list before any code change — yes/no?
2. **Account-number protection**: is there an existing vault/encryption helper I should use, or should the first pass store only masked + cleartext (with `account_number_token` left null until a vault is provisioned)?
