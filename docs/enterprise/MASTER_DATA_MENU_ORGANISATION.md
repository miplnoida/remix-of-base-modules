# Master Data Menu Organisation

**Status:** Implemented (menu grouping only — no CRUD, route, or table changes)
**Scope:** `app_modules` rows under parent `e1a00000-0000-4000-8000-000000000003` (Master Data)
**Related:** `docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md`, `docs/enterprise/ENTERPRISE_CONFIGURATION_CENTRE_ACCEPTANCE.md`

---

## 1. Goal

Master Data was a flat 30+ item list. This epic groups items by business purpose
so operators can find configuration quickly and so future migration to Shared
Domains is explicit per item.

**Non-goals:**
- No new CRUD screens.
- No duplicate routes.
- No legacy table changes.
- No route removal — every existing `/admin/master-data/*` route continues to work.

---

## 2. Subgroup structure (live in `app_modules`)

Parent: `Master Data` (`e1a00000-0000-4000-8000-000000000003`)

| # | Subgroup | app_modules id | Icon |
|---|----------|----------------|------|
| 1 | Geography & Location | `...031` | MapPin |
| 2 | People & Demographics | `...032` | Users |
| 3 | Employment & Organisation | `...033` | Briefcase |
| 4 | Finance & Payment | `...034` | CreditCard |
| 5 | Contribution & Payroll | `...035` | Calculator |
| 6 | Status & Workflow Codes | `...036` | ListChecks |
| 7 | Compliance & Inspection | `...037` | ShieldCheck |
| 8 | Legacy / To Be Migrated | `...038` | Archive (hidden) |

Migration: `supabase/migrations/20260705230000_master_data_menu_grouping.sql`

---

## 3. Item inventory & future target

Legend for **Future target**:
- **KEEP** — remains a master-data CRUD screen long term
- **EXTEND** — stays, but needs additional fields/rules before enterprise use
- **ADAPTER** — surface stays, backing store moves to canonical enterprise table
- **SHARED DOMAIN** — migrates into a Shared Domain library (Geography, Identity, Finance, Communication, Document, Legal Reference)
- **RETIRE LATER** — deprecated; keep read-only until consumers migrate

### 3.1 Geography & Location

| Menu item | Route | Screen | Table / service (best-effort) | Purpose | Consumers | Future target |
|---|---|---|---|---|---|---|
| Countries | `/admin/master-data/countries` | `CountryManagement` | `country` / `ssp_geo_country` | ISO country list | IP/ER/Doctor registration, banking | SHARED DOMAIN (Geography) |
| Districts | `/admin/master-data/districts` | `DistrictManagement` | `district` | Administrative district codes | Address capture, ER site | SHARED DOMAIN (Geography) |
| Postal Districts | `/admin/master-data/postal-districts` | `PostalDistrictManagement` | `postal_district` | Postal/zip catalogue | Address capture, correspondence | SHARED DOMAIN (Geography) |
| Villages | `/admin/master-data/villages` | `VillagesManagement` | `villages` | Village lookup (KN) | IP/ER address capture | SHARED DOMAIN (Geography) |

### 3.2 People & Demographics

| Menu item | Route | Screen | Table / service | Purpose | Consumers | Future target |
|---|---|---|---|---|---|---|
| Relations | `/admin/master-data/relations` | `RelationManagement` | `relation` | Person-to-person relation types | IP relations | KEEP |
| Dependent Relations | `/admin/master-data/dependent-relations` | `DependentRelationManagement` | `dependent_relation` | Dependents-only subset | IP dependents, BN eligibility | KEEP |
| Marital Status | `/admin/master-data/marital-status` | `MaritalStatusManagement` | `marital_status` | Marital status codes | IP registration | KEEP |
| Eye Colors | `/admin/master-data/eye-colors` | `EyeColorManagement` | `eye_color` | Biometric/ID descriptor | IP registration | RETIRE LATER (low use) |

### 3.3 Employment & Organisation

| Menu item | Route | Screen | Table / service | Purpose | Consumers | Future target |
|---|---|---|---|---|---|---|
| Industries | `/admin/master-data/industries` | `IndustryManagement` | `industry` | Industry classification | ER registration, compliance | EXTEND (align to ISIC) |
| Sectors | `/admin/master-data/sectors` | `SectorManagement` | `sector` | Sector rollup for industries | ER, reporting | KEEP |
| Activity Types | `/admin/master-data/activity-types` | `ActivityManagement` | `activity` | Employer activity codes | ER classification | KEEP |
| Occupations | `/admin/master-data/occupations` | `OccupationManagement` | `occupation` | Occupation catalogue | IP employment, BN, compliance | EXTEND (align to ISCO) |
| Designations | `/admin/master-data/designations` | `DesignationMasterManagement` | `designation` | Job designations | ER staff, IA staff | ADAPTER (dup with `/admin/designations`) |

> Note: `/admin/master-data/designations` currently redirects to `/admin/designations`. The `master_designations` menu row is retained for compatibility and marked ADAPTER for later cleanup.

### 3.4 Finance & Payment

| Menu item | Route | Screen | Table / service | Purpose | Consumers | Future target |
|---|---|---|---|---|---|---|
| Bank Codes | `/admin/master-data/bank-codes` | `BankCodeManagement` | `bank_code` | Bank routing catalogue | ER payroll, BN disbursement | SHARED DOMAIN (Finance) |
| Merchants | `/admin/master-data/merchants` | `MerchantManagement` | `merchant` | Merchant register | C3, receipts | KEEP |
| Methods of Payment | `/admin/master-data/methods-of-payment` | `MethodOfPaymentManagement` | `method_of_payment` | Payment channel codes | C3, receipts, BN | SHARED DOMAIN (Finance) |
| Payment Types | `/admin/master-data/payment-types` | `PaymentTypeMDManagement` | `payment_type` | Payment classification | C3, receipts | KEEP |
| Payment Sources | `/admin/master-data/payment-sources` | `PaymentSourcesManagement` | `payment_source` | Source-of-funds codes | C3, BN | KEEP |
| Payer Types | `/admin/master-data/payer-types` | `PayerTypeManagement` | `payer_type` | Payer classification | C3, invoicing | KEEP |

### 3.5 Contribution & Payroll

| Menu item | Route | Screen | Table / service | Purpose | Consumers | Future target |
|---|---|---|---|---|---|---|
| Income Categories | `/admin/master-data/income-categories` | `IncomeCategoryManagement` | `income_category` | Income category catalogue | C3 wages, contributions | KEEP |
| Income Codes | `/admin/master-data/income-codes` | `IncomeCodeManagement` | `income_code` | Income code catalogue | C3, payroll | KEEP |
| Pay Periods | `/admin/master-data/pay-periods` | `PayPeriodManagement` | `pay_period` | Employer pay period codes | C3 filing | KEEP |
| SSC Rates | `/admin/master-data/ssc-rates` | `SscRatesManagement` | `ssc_rates` | Social Security contribution rates | C3 calc, BN | EXTEND (versioned rate policy) |
| VC Contrib Rates | `/admin/master-data/vc-contrib-rates` | `VcContribRateManagement` | `vc_contrib_rate` | Voluntary contributor rates | VC filing | EXTEND |
| VC Eligibility Config | `/admin/master-data/vc-eligibility-config` | `VcEligibilityConfigManagement` | `vc_eligibility_config` | VC eligibility rules | VC onboarding | EXTEND |
| Penalty Rates | `/admin/master-data/penalty-rates` | `PenaltyMDManagement` | `penalty_rate` | Late-payment penalty catalogue | C3, Compliance, Legal | EXTEND |
| S.E. Contribution Rates (redirect) | `/admin/master-data/sep-contrib-rates` → `/admin/c3-configuration` | (redirect) | `c3_configuration` | Self-employed rates | C3 | ADAPTER (canonical is C3 Config) |

### 3.6 Status & Workflow Codes

| Menu item | Route | Screen | Table / service | Purpose | Consumers | Future target |
|---|---|---|---|---|---|---|
| Batch Status | `/admin/master-data/batch-status` | `BatchStatusManagement` | `batch_status` | C3 batch state codes | C3, receipts | KEEP |
| C3 Status | `/admin/master-data/c3-status` | `C3StatusManagement` | `c3_status` | C3 return state codes | C3 workflow | KEEP |
| Invoice Status | `/admin/master-data/invoice-status` | `InvoiceStatusMDManagement` | `invoice_status` | Invoice state codes | Invoicing, C3 | KEEP |
| Invoice Types | `/admin/master-data/invoice-types` | `InvoiceTypesMDManagement` | `invoice_type` | Invoice type codes | Invoicing | KEEP |
| Receipt Status | `/admin/master-data/receipt-status` | `ReceiptStatusManagement` | `receipt_status` | Receipt state codes | Cashiering | KEEP |
| Legal Status | `/admin/master-data/legal-status` | `LegalStatusManagement` | `legal_status` | Legal case state codes | Legal | ADAPTER (align with Legal domain) |

### 3.7 Compliance & Inspection

| Menu item | Route | Screen | Table / service | Purpose | Consumers | Future target |
|---|---|---|---|---|---|---|
| Inspectors | `/admin/master-data/inspectors` | `InspectorMDManagement` | `inspector` | Inspector register | Compliance assignment | ADAPTER (aligns with `ce_*` staff) |
| Verification Types | `/admin/master-data/verification-types` | `VerifyManagement` | `verify_type` | Verification method codes | ER/IP verification | KEEP |

### 3.8 Legacy / To Be Migrated

| Menu item | Route | Notes | Future target |
|---|---|---|---|
| Master Data (deprecated dup) | *(none)* | Duplicate root row `d7aae631-…`; hidden from menu | RETIRE LATER (delete after audit) |

---

## 4. Live menu behaviour

- `useNavigationMenu` (`src/hooks/useNavigationMenu.ts`) builds the sidebar tree recursively from `app_modules.parent_id`. Because subgroups have `is_enabled=true` and `show_in_menu=true`, they render as expandable groups.
- Each leaf still points at its existing `/admin/master-data/*` route → no CRUD change.
- Admin bypass in `useIsAdmin` + `has_permission` RPC keeps existing Admin/Application Admin access intact (permissions are inherited on the leaves, not the new grouping rows).

---

## 5. Configuration Centre alignment

`docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md` already describes each canonical master table. The Configuration Centre's Shared Domain / Enterprise Core sections continue to reference the same routes — grouping is a menu-only change and does not affect readiness probes. No source-map edits required in this epic; the map's "Layer 4 — Shared Domain" table already implies the Geography/Finance groupings above as migration targets.

---

## 6. Legacy impact

- BEMA, BN, IA, Compliance, Legal tables: **untouched**.
- Routing: **untouched** (`AppRoutes.tsx` not modified).
- Screens/components: **untouched**.
- Permissions: **unchanged** (leaves keep their existing `module_name`).
- Only `app_modules.parent_id` / `sort_order` values were updated for existing rows, plus 8 new grouping rows.

---

## 7. Rollback

See `-- ROLLBACK NOTES` block at the bottom of the migration
`supabase/migrations/20260705230000_master_data_menu_grouping.sql`. It flattens
children back under the Master Data parent and deletes the 8 subgroup rows.

---

## 8. Acceptance

- [x] Master Data menu is grouped (8 subgroups), not a flat list.
- [x] Every existing `/admin/master-data/*` route still resolves — no route or component change.
- [x] No duplicate screens created.
- [x] No legacy tables changed.
- [x] Admin / Application Admin access preserved (permissions attach to unchanged leaves).
- [x] Each item documented with purpose, consumers, and future target.

---

## Finance / Payment Master Alignment (2026-07-06)

The following Master Data screens are **adapters** to the canonical
Financial Reference (`ssp_*`) domain — not independent sources of truth.
Mappings live in `finance_master_crosswalk`.

| Screen | Legacy table | Canonical Financial Reference table |
|---|---|---|
| `/admin/master-data/bank-codes` | `tb_bank_code` | `ssp_bank` |
| `/admin/master-data/methods-of-payment` | `tb_method_of_payment` | `ssp_payment_channel` |

These remain fully functional for BEMA-era data authoring. New SSB /
BN configuration MUST bind to the canonical `ssp_*` tables.

The following Master Data screens are **not** duplicates of Financial
Reference and remain the sole source of truth for their concept:

- `/admin/master-data/payment-types` (`tb_payment_type` — classification)
- `/admin/master-data/payment-sources` (`tb_payment_sources` — source of funds)
- `/admin/master-data/merchants` (`tb_merchant` — merchant registry)
- `/admin/master-data/payer-types` (`tb_payer_type` — payer classification)

See `docs/social-security/FINANCE_PAYMENT_MASTER_DUPLICATION_AUDIT.md`
and `docs/social-security/FINANCE_PAYMENT_MASTER_ALIGNMENT_ACCEPTANCE.md`.
