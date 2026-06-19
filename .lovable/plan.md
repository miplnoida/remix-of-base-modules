## Goal

Make Country Payment Config a pure **method-capability** screen. Move EFT bank-file mechanics fully behind the Source Account, and reduce the current EFT fields on the country screen to a collapsed legacy-fallback section.

## Scope

Frontend + small validation tweaks only. No schema changes — `bn_payment_source_account`, `paymentSourceAccountService`, `eftFileService` precedence (master → source account → country fallback) are already in place.

## Changes

### 1. `src/pages/bn/config/country/CountryPaymentConfig.tsx`

- **EFT method section** — replace current entry-form fields with a capability summary:
  - "EFT enabled nationally" (toggle, bound to `is_method_enabled`)
  - "Requires bank account" (toggle)
  - Read-only **EFT Source Account status** for the country: pulls `getEftFormatReadiness(country)` and shows `MISSING / PENDING_BANK_SPECIFICATION / DRAFT / READY / RETIRED` as a colored badge, plus the default source account code/name when present.
  - Warning callout: *"EFT file format is configured against the Social Security funding/source bank account, not on country payment method."*
  - Primary action button **"Configure EFT Source Account"** → scrolls to / opens `FundingSourceAccountManager` (already mounted on the Country Pack).
- **Legacy fallback collapsible** — wrap the existing `bank_file_format`, `file_naming_convention`, `file_date_format`, `header/detail/trailer_record_format`, `account_number_rule`, `routing_number_rule`, `bank_code`, and preset picker inside a `<Collapsible>` titled **"Legacy fallback EFT format (advanced)"**, default closed, with help text: *"Used only if no active EFT source account or master EFT format exists. Not recommended for production bank submission."*
- **Validation** — relax `validateConfig` for EFT: stop requiring `bank_file_format` / record formats at the country level. Keep `requires_bank_account = true` as the only EFT capability rule. Cheque/Cash/Mobile/Card/Money Order/Wire rules unchanged.
- Remove the `FileCode` preset apply path from the visible UI (it stays inside the collapsed legacy section).

### 2. New small hook/usage

Inside the page, add a `useQuery` (key `['bn','eft-readiness', countryCode]`) calling `getEftFormatReadiness` from `paymentSourceAccountService` to drive the EFT status badge. No new service file.

### 3. EFT batch validation (verify only)

Confirm `payableValidationService` / `eftFileService` already block batch generation when `format_status !== 'READY'`. If the block is missing, tighten the existing check in `eftFileService.resolveEftFormat` to throw when source account exists but is not `READY` and no master format/`batch.eft_format_code` is set. No new tables.

### 4. SKN seed

Keep current seed as-is — already matches the spec (EFT enabled+default+requires_bank_account; CHEQUE enabled; CASH/MOBILE/CARD/MONEY_ORDER/WIRE disabled; matrix WEEKLY/MONTHLY/ONE_OFF/AD_HOC enabled for EFT+CHEQUE; no fabricated bank format). No migration needed unless verification finds drift — then a single data-only `supabase--insert` to null out stale `bank_file_format` on the SKN EFT row.

## Out of scope

- No changes to `bn_country_payment_config` schema.
- No changes to `FundingSourceAccountManager` UI itself.
- Cheque/Cash/Mobile/Card/MoneyOrder/Wire sections stay as they are.
- Product Catalog already reads from `v_bn_product_effective_payment_config` (country-enabled ∩ cycle-available); no changes needed.

## Acceptance

- Country Payment Config EFT tab shows capability + source-account readiness, not bank-file entry fields.
- Legacy EFT fields exist but are collapsed and labeled fallback.
- EFT batch generation fails when source account isn't `READY` and no master format is bound.
- TypeScript build passes.
