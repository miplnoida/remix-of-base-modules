# Epic 2.4 — Financial Reference Domain Pack — Acceptance

**Phase**: 2 · Social Security Shared Domain Programme
**Status**: Complete
**Owner**: Social Security Shared Domain
**Version**: 1.0.0
**Canonical route**: `/admin/financial-reference`
**Module code (app_modules)**: `financial_reference_domain`
**Capability key (Enterprise Catalogue)**: `financial_reference_domain`

Follows the Enterprise Registration Pipeline v1.0, the Enterprise Framework Blueprint,
the Common Consumption Model, and the Geography/Identity Domain Pack patterns
established in Epics 2.2 and 2.3.

---

## 1. What was reused

- **Geography Domain Pack** (`useCountries` from `src/hooks/geography/useGeography.ts`)
  for every country-linked tab and selector. No parallel country source added.
- **Enterprise Reference Framework** (`core_reference_group` / `core_reference_value`
  and `coreReferenceDataService`) remains the source of currency, payment-method,
  account, tax and status **codes**. `ssp_*` tables here store the operational
  reference records that align with those codes; codes themselves are not duplicated.
- **`PageHeader`, `PermissionWrapper`, shadcn Tabs/Table/Select/Card/Button`**
  reused from existing UI kit.
- **`app_modules`, `module_actions`, `role_permissions`, `enterprise_capability_registry`**
  reused as-is via the Enterprise Registration Pipeline.
- **Existing BN masters left untouched**: `bn_bank_master`, `bn_bank_branch`,
  `bn_payment_method`, `bn_country_payment_config`, `bn_country_payment_cycle_method`,
  `bn_product_channel_config`. Legacy `tb_bank_code`, cashier tables,
  Finance/BEMA/IA tables are also untouched. Future adoption waves will wrap or
  migrate these into the SSP facade.

## 2. What was built (additive only)

### Schema (`ssp_*`, additive, no RLS — role-based grants only)
- `ssp_currency_profile`
- `ssp_exchange_rate`
- `ssp_bank`
- `ssp_bank_branch`
- `ssp_payment_channel`
- `ssp_settlement_method`
- `ssp_account_type`
- `ssp_tax_reference`
- `ssp_chart_of_account_ref`
- `ssp_financial_external_code`
- `ssp_country_financial_availability`

Grants applied to `authenticated`, `service_role`, and (read-only) `anon` for every
new table, following the Identity Domain Pack precedent.

### Service facade
- `src/services/financial/financialReferenceService.ts`
  - `listCurrencies`, `listExchangeRates`, `listBanks(countryCode?)`,
    `listBankBranches(bankId?)`, `listPaymentChannels(countryCode?)`,
    `listSettlementMethods`, `listAccountTypes`, `listTaxReferences(countryCode?)`,
    `listChartOfAccountRefs(countryCode?)`, `listFinancialExternalCodes(entityType?)`,
    `listCountryAvailability(countryCode?)`
  - `resolvePaymentChannel(countryCode, channelCode)` — country override falls back to global.
  - `resolveBankByExternalCode(systemCode, externalCode)` — legacy adapter path.

### Hooks
- `src/hooks/financial/useFinancialReference.ts` exposing:
  `useFinancialReference`, `useCurrencies`, `useExchangeRates`, `useBanks`,
  `useBankBranches`, `usePaymentChannels`, `useSettlementMethods`, `useAccountTypes`,
  `useTaxReferences`, `useChartOfAccountRefs`, `useFinancialExternalCodes`,
  `useCountryFinancialAvailability`.

### UI
- `src/pages/admin/FinancialReferenceDomainPage.tsx` — 11-tab admin shell.
- Route wired at `/admin/financial-reference` in `src/components/routing/AppRoutes.tsx`.
- Link surfaced in `src/pages/admin/PlatformAdmin.tsx` under a new **Shared Domains** card.

## 3. Screens / routes

| Surface                                | Path                             |
| -------------------------------------- | -------------------------------- |
| Financial Reference Domain admin shell | `/admin/financial-reference`     |
| Enterprise Administration hub          | `/admin/platform` (link surface) |

## 4. `app_modules` registration

| Field         | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| `name`        | `financial_reference_domain`                                                             |
| `display_name`| Financial Reference                                                                      |
| `route`       | `/admin/financial-reference`                                                             |
| `parent_id`   | Administration/Platform (`aab5fcb8-51fb-4a5c-8a87-6cef31068b47`)                         |
| `icon`        | `Banknote`                                                                               |
| Menu flags    | `is_enabled=true`, `show_in_menu=true`, `routes_enabled=true`, `actions_enabled=true`    |

## 5. Permissions created

Actions registered in `module_actions`:

- `view` — View Financial Reference Domain
- `manage` — Manage currencies, banks, channels, settlement, accounts, tax
- `admin` — Governance & lifecycle
- `import` — Import reference data
- `export` — Export reference data

Granted (via `role_permissions`) to: **Admin**, **Application Admin**,
**Super Admin** (where present).

## 6. Current user access verification

Current administrators (`admin@secureserve.gov`, `rohit@mishainfotech.com`) hold
the Admin / Application Admin roles and therefore inherit all five actions
automatically. `PermissionWrapper moduleName="financial_reference_domain"` gates the
page; menu visibility flows from `app_modules.show_in_menu = true`. No manual SQL
was required.

## 7. Geography consumption verification

- Page mounts `useCountries()` (Geography Domain Pack). Countries tab, banks,
  channels, tax, CoA and availability tabs all filter by the selected country.
- No `tb_country`, no `bn_country`, no local country list is introduced.

## 8. Reference Framework consumption verification

- Currency / payment / account / tax / status **codes** continue to be defined in
  `core_reference_group` / `core_reference_value`. `ssp_*` tables reference those
  codes as text keys; they do not duplicate the reference framework.
- Future write surfaces will pull selectable code options from
  `useCoreReferenceValues(...)`.

## 9. Enterprise Catalogue registration

Row inserted / upserted into `enterprise_capability_registry`:

- `capability_key`: `financial_reference_domain`
- `category`: `shared_domain`
- `owner`: Social Security Shared Domain
- `consumers`: organisation, geography, employer, member, bn, contributions,
  compliance, legal, finance, payroll, hrms, prison, licensing, portals
- `dependencies`: reference_framework, master_data_platform, geography_domain,
  organisation_foundation
- `overall_health`: green (migration health = amber until real seed waves land)

## 10. BN / Finance / Cashier / BEMA / IA legacy impact

**Zero structural change to any legacy table.** No renames, no drops, no column
mutations. BN Product Builder remains on hold. Existing `bn_bank_master`,
`bn_bank_branch`, `bn_payment_method`, cashier currency config, and Finance/BEMA/IA
tables continue to serve their consumers unchanged.

Cross-references between legacy identifiers and the new SSP facade are captured
in the additive `ssp_financial_external_code` table (e.g. `system_code = 'legacy_bn'`,
`entity_type = 'bank'`) so future adoption waves can migrate consumers without
duplicating data.

## 11. Rollback

1. `DELETE FROM public.enterprise_capability_registry WHERE capability_key = 'financial_reference_domain';`
2. `DELETE FROM public.role_permissions WHERE module_id = '2c2c0000-0000-4000-8000-000000000240';`
3. `DELETE FROM public.module_actions WHERE module_id = '2c2c0000-0000-4000-8000-000000000240';`
4. `DELETE FROM public.app_modules WHERE id = '2c2c0000-0000-4000-8000-000000000240';`
5. `DROP TABLE IF EXISTS public.ssp_country_financial_availability, public.ssp_financial_external_code,
   public.ssp_chart_of_account_ref, public.ssp_tax_reference, public.ssp_account_type,
   public.ssp_settlement_method, public.ssp_payment_channel, public.ssp_bank_branch,
   public.ssp_bank, public.ssp_exchange_rate, public.ssp_currency_profile CASCADE;`
6. Revert code additions in `AppRoutes.tsx` and `PlatformAdmin.tsx`; delete
   `FinancialReferenceDomainPage.tsx`, `useFinancialReference.ts`,
   `financialReferenceService.ts`.

## 12. Deferred items

- Reference data seeds for currencies, banks, channels, settlement methods,
  account types, tax refs, CoA refs (executed in subsequent seed waves via the
  Master Data Platform).
- Write surfaces (create/edit) for each tab — currently read-only until adoption
  waves.
- Migration of BN/Finance/Cashier consumers onto the SSP facade.
- Payment execution, GL posting, EFT file generation (out of scope — remain in
  BN/Finance modules).
- Currency conversion helpers backed by `ssp_exchange_rate`.

## 13. Recommended next domain

**Legal Reference Domain Pack** — matter types, jurisdictions, court references,
legal statuses, penalty scales, notice templates — natural pair to Financial
Reference and unlocks Legal / Compliance / BN Recovery consumption.

Alternative: **Participant Domain Pack** (Member/Employer/Dependant canonical
party model) if the programme wants to accelerate the Member/Employer adoption
wave before Legal.
