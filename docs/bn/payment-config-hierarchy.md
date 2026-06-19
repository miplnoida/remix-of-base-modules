# BN Payment Configuration Hierarchy

**Status:** Stages S1–S3 implemented (additive migration, backfill, services, save-time + runtime validation). Stage S4 (NOT NULL flip) and S5 (UI surfacing) pending.

## 1. Layers

```text
Country Pack Payment Config     (national capability — what is POSSIBLE)
  └── Product Payment Setup     (benefit usage — what THIS product DOES)
        └── Claimant Payment Profile     (runtime — validated against Country)
              └── Payment Batch          (uses Country EFT / cheque format)
```

**Rule:** Product can only *narrow* Country. Anything not enabled at country level is invisible to the product.

## 2. Country Pack — `bn_country_payment_config` (one row per country × payment_method)

| Field | Purpose |
|---|---|
| `is_method_enabled` | Capability switch (separate from `is_active`) — turning this off hides the method from every product |
| `is_default`, `default_priority` | Default method ordering |
| `requires_bank_account`, `requires_mobile_number` | Profile pre-requisites |
| `allow_third_party_payee` | Whether any product in this country may pay via a third-party payee using this method |
| `allow_provider_direct_pay` | Whether any product may pay a provider directly using this method |
| `bank_file_format` + record formats | EFT file format definition (used by `eftFileService`) |
| `cheque_stock_required`, `cheque_format_template_id` | Cheque stock & template |
| `account_number_rule`, `routing_number_rule`, `bank_validation_rule_set` | Bank validation rules |
| `processing_days`, `cut_off_day`, `payment_cycle`, `calendar_config` | Cycle |

Country currency policy lives on `bn_country`:

| Field | Purpose |
|---|---|
| `currency_code` | Default currency for every product in this country |
| `allow_foreign_currency_products` | Whether products may opt out of the default |
| `allowed_alt_currencies` | Whitelist of alternate currencies (only meaningful when the flag above is true) |

## 3. Product Catalog — `bn_product_channel_config` (one row per product version × channel)

| Field | Purpose |
|---|---|
| `allowed_payment_methods[]` | Subset of country-enabled methods |
| `default_payment_method` | Must be in `allowed_payment_methods` |
| `payment_frequency` | `ONE_OFF` / `WEEKLY` / `FORTNIGHTLY` / `MONTHLY` / `QUARTERLY` / `ANNUAL` / `AD_HOC` |
| `payment_pattern` | `LUMP_SUM` / `RECURRING` / `ARREARS` / `MIXED` |
| `currency_code` | Defaults to country currency; only differs when V3 allows |
| `allow_payee` | Whether this benefit allows a payee |
| `allow_provider_direct_pay` | Whether this benefit allows provider direct-pay |
| `approval_threshold_amount`, `approval_threshold_currency` | Extra approval gate above N |
| `payment_hold_rules` | jsonb array of `{ rule_code, condition, hold_state }` referencing `bn_reason_code` |

## 4. Validation Matrix

| # | Rule | Save (`productPaymentValidationService`) | Runtime (`payableValidationService`) |
|---|---|---|---|
| V1 | Product method ⊆ country `is_method_enabled=true` | Block | Block (drift) |
| V2 | Default method ∈ product allowed | Block | Block |
| V3 | Currency match (or in allowed alts) | Block | Warn |
| V4 | EFT method ⇒ country EFT format complete | Block | Block at batch creation |
| V5 | CHEQUE method ⇒ stock/format resolved | Block | Block at batch creation |
| V6 | `allow_payee=true` ⇒ country method allows third-party payee | Block | Block |
| V7 | `allow_provider_direct_pay=true` ⇒ country method allows it | Block | Block |
| V8 | Threshold currency = product currency | Block | n/a |
| V9 | Hold rules reference valid `bn_reason_code` | Block | Evaluated when triggering hold |

## 5. Runtime Flow

1. **Claimant Payment Profile** — `paymentProfileService.resolveProfileForPayable` validates the profile against the country capability row (account rule set, bank validation rule set, third-party allowance).
2. **Product gate** — payable creation reads `v_bn_product_effective_payment_config` to confirm the chosen method is in the intersection of country-enabled and product-allowed methods.
3. **Batch issuance** — `eftFileService` reads format fields from the **country** row, not the product. Cheque issuance reads `cheque_format_template_id` from country.

## 6. View — `v_bn_product_effective_payment_config`

Single read-side source for "what payment options does this product effectively offer right now?". It joins product → country and exposes:

- `country_enabled_methods[]` — current capability
- `product_allowed_methods[]` — declared usage
- `effective_currency` — `COALESCE(product.currency_code, country.currency_code)`
- All product-level usage fields (frequency, pattern, payee, provider, thresholds, holds)

Validators and UI both read this view to avoid recomputing intersections.

## 7. Migration / Backfill Notes

Backfill ran inside the additive migration:

- `is_method_enabled` mirrored `is_active`
- CHEQUE rows: `cheque_stock_required = (bank_file_format IS NULL)`
- Country `allow_third_party_payee` set true where any product already used it
- Product `currency_code` defaulted to country currency
- `payment_frequency` / `payment_pattern` derived from `bn_product.payment_type`
- Product `allow_payee` mirrored existing `allow_third_party_payee`

No row was deleted; no method was silently disabled.

## 8. Acceptance

- ✅ Country Pack controls national payment capability (`is_method_enabled`, EFT format, cheque stock, account rules, currency policy).
- ✅ Product Catalog controls benefit-specific payment behavior (frequency, pattern, payee, threshold, holds).
- ✅ No duplicate or conflicting configuration — `v_bn_product_effective_payment_config` is the single read-side projection; product columns are narrowing-only.
- ✅ Runtime claimant profile / batch flow validated against country capability through `payableValidationService` and `eftFileService`.

## 9. Pending (Stage S4 & S5)

- S4: flip `is_method_enabled` to NOT NULL once UI exposes it; add batch-creation enforcement of V4/V5 as hard constraints.
- S5: surface the new fields in `CountryPackDashboard` (capability switches per method) and `ProductCatalog` (payment setup tab).
