
# BN Payment Configuration Hierarchy — Design & Migration Plan

Deliverable for this step: `docs/bn/payment-config-hierarchy.md` (full doc) + this approval gate. No schema or service edits until you approve.

## 1. Current State (what exists today)

`bn_country_payment_config` — one row per (country, payment_method). Already holds:
- `payment_method`, `is_default`, `requires_bank_account`, `requires_mobile_number`
- EFT format fields: `bank_file_format`, `header/detail/trailer_record_format`, `file_date_format`, `file_naming_convention`, `bank_code`
- Account rules: `account_number_rule`, `routing_number_rule`
- Cycle: `processing_days`, `cut_off_day`, `payment_cycle`, `calendar_config`

`bn_country` — holds `currency_code`, `currency_symbol`, `parameters` jsonb.

`bn_product_channel_config` — per (product_version, channel). Already holds:
- `allowed_payment_methods[]`, `default_payment_method`
- `allow_third_party_payee`, `allow_guardian_payee`, `require_bank_verification`
- `cheque_address_required`, `require_supervisor_approval_for_change`, `require_proof_for_change`
- `payment_required_at_application | before_approval | before_payment`

**Gaps**: no country-level capability flags for cheque stock / third-party allowance / default-method priority / currency override policy; no product-level frequency/lump-sum/recurring/arrears/approval-threshold/hold rules; no validator that prevents a product from enabling a method the country has disabled or inactive.

## 2. Target Hierarchy

```text
Country Pack Payment Config  (national capability — what is POSSIBLE)
  └── Product Payment Setup   (benefit usage — what this product DOES)
        └── Claimant Payment Profile (runtime — validated against Country)
              └── Payment Batch (uses Country EFT/cheque format)
```

Rule: **Product can only narrow Country.** Anything not allowed at country level is invisible to product.

## 3. Schema Delta

### 3.1 `bn_country_payment_config` — add (per-method capability)
- `allow_third_party_payee BOOLEAN DEFAULT false`
- `allow_provider_direct_pay BOOLEAN DEFAULT false`
- `default_priority INT` — ordering when multiple methods are default-eligible
- `cheque_stock_required BOOLEAN DEFAULT false` (CHEQUE rows only)
- `cheque_format_template_id UUID` (CHEQUE rows only; references existing cheque template registry)
- `bank_validation_rule_set JSONB` — declarative rules (IBAN/local checksum, length, allowed banks)
- `is_method_enabled BOOLEAN DEFAULT true` — capability switch independent of `is_active` (audit-preserving disable)

### 3.2 `bn_country` — add (currency policy)
- `allow_foreign_currency_products BOOLEAN DEFAULT false`
- `allowed_alt_currencies TEXT[]` — when override permitted

### 3.3 `bn_product_channel_config` — add (product usage)
- `payment_frequency TEXT` CHECK in (`ONE_OFF`,`WEEKLY`,`FORTNIGHTLY`,`MONTHLY`,`QUARTERLY`,`ANNUAL`,`AD_HOC`)
- `payment_pattern TEXT` CHECK in (`LUMP_SUM`,`RECURRING`,`ARREARS`,`MIXED`)
- `currency_code VARCHAR(3)` — defaults to country currency; if different, must be in `allowed_alt_currencies`
- `allow_payee BOOLEAN DEFAULT false`
- `allow_provider_direct_pay BOOLEAN DEFAULT false`
- `approval_threshold_amount NUMERIC(18,2)` — payments at/above require extra approval
- `approval_threshold_currency VARCHAR(3)`
- `payment_hold_rules JSONB` — array of `{ rule_code, condition, hold_state }`

(Existing `allowed_payment_methods[]` / `default_payment_method` / `allow_third_party_payee` are kept — they become "Product layer" and must satisfy validators below.)

### 3.4 New helper view `v_bn_product_effective_payment_config`
Joins product → country to compute effective allowed methods (intersection), effective currency, effective third-party rules, and surfaces violations for the validator.

## 4. Validation Matrix (save-time + runtime)

| # | Rule | Save (productPaymentValidationService) | Runtime (payableValidationService) |
|---|---|---|---|
| V1 | Product method ⊆ Country `is_method_enabled=true` set | Block | Block (drift catch) |
| V2 | Product `default_payment_method` ∈ product allowed | Block | Block |
| V3 | Product `currency_code` = country currency OR in `allowed_alt_currencies` when `allow_foreign_currency_products` | Block | Warn (configured products grandfathered) |
| V4 | EFT in product methods ⇒ country EFT row has `bank_file_format` + record formats populated | Block | Block at batch creation |
| V5 | CHEQUE in product methods ⇒ country CHEQUE row has `cheque_stock_required` resolution + `cheque_format_template_id` | Block | Block at batch creation |
| V6 | Product `allow_payee=true` ⇒ country method `allow_third_party_payee=true` | Block | Block |
| V7 | Product `allow_provider_direct_pay=true` ⇒ country method `allow_provider_direct_pay=true` AND participant config grants provider role | Block | Block |
| V8 | Approval threshold currency = product currency | Block | n/a |
| V9 | Payment hold rules reference valid `bn_reason_code` | Block | Evaluated when triggering hold |

Save-time owner: new `src/services/bn/payment/productPaymentValidationService.ts` (governance-routed, writes through `writeBnAudit`). Runtime owner: existing `payableValidationService` extended with V1/V4/V5/V6/V7.

## 5. Service Layout

```text
src/services/bn/payment/
  countryPaymentCapabilityService.ts   (NEW)  — CRUD for country capability fields
  productPaymentSetupService.ts        (NEW)  — CRUD for product usage fields
  productPaymentValidationService.ts   (NEW)  — V1–V9 save-time
  payableValidationService.ts          (EDIT) — add V1/V4/V5/V6/V7 runtime
  paymentProfileService.ts             (EDIT) — resolve profile against country capability, not product
  eftFileService.ts                    (EDIT) — read format from country row (already does; verify FK)
```

Country Pack and Product Catalog screens stay as-is in this phase — backwards-compatible columns ensure they keep rendering. Screen updates are scheduled for a follow-up phase (listed in §8).

## 6. Backfill Strategy (Preserve + backfill)

Run inside the same migration, after column adds:

1. `bn_country_payment_config`: set `is_method_enabled = is_active` (preserve current behavior).
2. CHEQUE rows: `cheque_stock_required = (bank_file_format IS NULL)` — conservative default; ops can refine.
3. `allow_third_party_payee` at country level: set true if ANY product currently has `allow_third_party_payee=true` for a matching method (preserves prior behavior). Otherwise false.
4. `bn_product_channel_config.currency_code`: copy from `bn_country.currency_code` via product→country join.
5. `payment_frequency` / `payment_pattern`: derive from `bn_product.payment_type` mapping table (`RECURRING_PENSION`→`MONTHLY/RECURRING`, `LUMP_SUM`→`ONE_OFF/LUMP_SUM`, etc.). Unknown → `AD_HOC/MIXED` + governance flag for review.
6. Insert backfill summary row into `bn_formula_resolution_report`-style governance report table (reuse existing `bn_product_calc_validation_report` pattern, new `report_kind='PAYMENT_HIERARCHY_BACKFILL'`).

No row is deleted. No method is silently disabled. Backfill emits one `system_audit_trail` entry per mutated row tagged `correlation_id = 'payment-hierarchy-backfill-v1'`.

## 7. Staged Rollout

| Stage | Migration | Code | Risk | Approval |
|---|---|---|---|---|
| S1 | Add nullable columns + view + GRANTs | none | none — additive | this plan |
| S2 | Backfill UPDATE statements (idempotent, single migration) | none | low | post-S1 review |
| S3 | New services + extend payableValidationService | new files + edits | medium — save paths gain validators | reviewed test run |
| S4 | Flip `is_method_enabled` to NOT NULL; enforce V4/V5 at batch creation | constraint migration | medium — drift surfaces | after S3 verified |
| S5 | Country Pack & Product Catalog screen edits to surface new fields | UI only | low | follow-up plan |

## 8. Out of Scope (this plan)

- UI/UX edits to `CountryPackDashboard` and `ProductCatalog` (Stage S5, separate plan).
- Mobile money / wallet methods beyond what `bn_payment_method` already enumerates.
- Cross-country product portability (multi-country single product).
- Changes to `bn_eft_format` / `bn_eft_file` structure — both already read country format.

## 9. Acceptance Mapping

- "Country Pack controls national payment capability" → §3.1, §3.2, V1–V7 enforce.
- "Product Catalog controls benefit-specific payment behavior" → §3.3, V8/V9.
- "No duplicate or conflicting payment configuration" → `v_bn_product_effective_payment_config` is the single read-side source; product columns are narrowing-only.
- Runtime claimant/profile/batch flow → §5 edits to `paymentProfileService` and `payableValidationService`; batch already reads country format.

## 10. What I need from you

Approve this plan (or comment on specific sections) and I will execute Stages S1–S3 in one delivery:

1. Migration: column adds + view + GRANTs + backfill (S1+S2 combined; reversible).
2. Three new services + edits to `payableValidationService` and `paymentProfileService`.
3. Vitest cases under `src/__tests__/bn-payment/hierarchy-validation.test.ts` covering V1–V9 with mocked Supabase, following the governance-proofs pattern.
4. Docs: `docs/bn/payment-config-hierarchy.md` (this design, finalized) + `docs/bn/payment-hierarchy-verification.md` (results).

Stage S4 (NOT NULL flip) and S5 (screen edits) ship as a follow-up after you verify S1–S3 in staging.
