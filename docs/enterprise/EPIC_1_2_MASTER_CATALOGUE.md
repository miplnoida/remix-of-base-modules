# Epic 1.2 — Master Catalogue (Repository Inventory)

**Status:** Discovery output (documentation only)
**Scope:** Every master-like dataset currently in the repository
**Method:** Inspected `/admin/master-data/*` routes, `src/pages/admin/`, `core_reference_group` seeds, `src/components/sidebar/menuItems/masterDataMenuItems.ts`, and the Supabase table list.

Classification tiers (see `EPIC_1_2_MASTER_CLASSIFICATION.md`):
- **R** = Reference Data (small, closed code list)
- **E** = Enterprise Master (cross-product shared)
- **O** = Organisation Master (org structure)
- **B** = Business Master (product-specific)
- **T** = Transactional (not a master — excluded)

---

## A. General / Person Reference

| Master | Route / Table | Tier | Owner | Notes |
|--------|---------------|------|-------|-------|
| Activity Types | `/admin/master-data/activity-types` | R | Platform | Small code list |
| Countries | `/admin/master-data/countries` · `tb_country` | **E** | Platform | Shared across all products |
| Districts | `/admin/master-data/districts` · `tb_district` | **E** | Platform | Geographic |
| Postal Districts | `/admin/master-data/postal-districts` | **E** | Platform | Geographic |
| Villages | `/admin/master-data/villages` | **E** | Platform | Geographic |
| Eye Colors | `/admin/master-data/eye-colors` · `tb_eye_color` | R | Platform | Person attribute |
| Marital Status | `/admin/master-data/marital-status` | R | Platform | Person attribute |
| Relations | `/admin/master-data/relations` | R | Platform | Family |
| Dependent Relations | `/admin/master-data/dependent-relations` · `tb_dependent_relation` | R | Platform | Family |
| Legal Status | `/admin/master-data/legal-status` · `tb_legal_status` | R | Legal | Entity legal status |
| Verification Types | `/admin/master-data/verification-types` | R | Platform | Doc verification |
| Designations | `/admin/designations` · `tb_designations` | **O** | HR | Org master |
| Sectors | `/admin/master-data/sectors` | R | Platform | Industry sector |

## B. Employment

| Master | Route / Table | Tier | Owner | Notes |
|--------|---------------|------|-------|-------|
| Industries | `/admin/master-data/industries` · `tb_indus` | **E** | Platform | Cross-product |
| Industry Categories | `tb_indus_cat` | R | Platform | |
| Industry Classes | `tb_indus_class` | R | Platform | |
| Inspectors | `/admin/master-data/inspectors` | **B** | Compliance | People-driven |
| Occupations | `/admin/master-data/occupations` | **E** | Platform | Shared |
| Employers | `er_master` | **E** | SSP | Central enterprise entity |
| Insured Persons | `ip_master` | **E** | SSP | Central enterprise entity |

## C. Financial

| Master | Route / Table | Tier | Owner | Notes |
|--------|---------------|------|-------|-------|
| Bank Codes | `/admin/master-data/bank-codes` · `tb_bank_code` · `bn_bank_master` | **E** | Finance | Cross-product; two overlapping tables — **duplicate flag** |
| Bank Branches | `bn_bank_branch` | **E** | Finance | Child of Bank |
| Merchants | `/admin/master-data/merchants` | **B** | Finance | Payment gateway merchants |
| Methods of Payment | `/admin/master-data/methods-of-payment` | R | Finance | Code list |
| Payer Types | `/admin/master-data/payer-types` | R | Finance | Code list |
| Payment Sources | `/admin/master-data/payment-sources` | R | Finance | Code list |
| Payment Types | `/admin/master-data/payment-types` | R | Finance | Code list |
| Receipt Status | `/admin/master-data/receipt-status` | R | Finance | Code list |
| Invoice Status | `/admin/master-data/invoice-status` | R | Finance | Code list |
| Invoice Types | `/admin/master-data/invoice-types` | R | Finance | Code list |
| Penalty Rates | `/admin/master-data/penalty-rates` | **B** | SSP | Rate table |
| SSC Rates | `/admin/master-data/ssc-rates` | **B** | SSP | Rate table |
| Currencies | `tb_currencies` | **E** | Finance | Cross-product, ISO 4217 |
| Income Categories | `/admin/master-data/income-categories` · `tb_income_cat` | **B** | SSP | Wage classification |
| Income Codes | `/admin/master-data/income-codes` · `tb_income_codes` | **B** | SSP | Wage classification |

## D. C3 / Contributions

| Master | Route / Table | Tier | Owner | Notes |
|--------|---------------|------|-------|-------|
| Batch Status | `/admin/master-data/batch-status` · `tb_batch_status` | R | SSP | Code list |
| C3 Status | `/admin/master-data/c3-status` · `tb_c3_status` | R | SSP | Code list |
| Pay Periods | `/admin/master-data/pay-periods` | R | SSP | Code list |
| VC Contrib Rates | `/admin/master-data/vc-contrib-rates` | **B** | SSP | Rate table |
| VC Eligibility Config | `/admin/master-data/vc-eligibility-config` | **B** | SSP | Config |

## E. Organisation / Platform

| Master | Table | Tier | Owner | Notes |
|--------|-------|------|-------|-------|
| Organisations | `core_organization` | **O** | Platform | Root org |
| Departments | `core_department` · `tb_dept` | **O** | Platform | Two tables — **duplicate flag** |
| Department Profiles | `core_department_profile` | **O** | Platform | |
| Teams | `core_team` | **O** | Platform | |
| Offices / Locations | `office_locations` · `core_department_location` · `tb_office` (legal) | **O** | Platform | Overlap across three tables — **overlap flag** |
| Roles | `roles` | **O** | Security | RBAC |
| Permissions / Actions | `module_actions` · `role_permissions` | **O** | Security | RBAC |
| App Modules | `app_modules` | **O** | Platform | Menu / routing registry |
| Feature Flags | `feature_flags` | **O** | Platform | |
| Public Holidays | `public_holidays` | **E** | Platform | Cross-product calendar |
| Languages | `core_language` | **E** | Platform | i18n |

## F. Reference Framework (governed via Epic 1.1)

| Table | Tier | Notes |
|-------|------|-------|
| `core_reference_category` | R | Governance layer |
| `core_reference_group` | R | Group catalog |
| `core_reference_value` | R | Values |
| `core_reference_value_alias` | R | Aliases |
| `core_reference_value_external_code` | R | External codes |
| `core_reference_value_i18n` | R | Translations |

All values (LG_*, CORE_*, BN_*, CE_*) inside `core_reference_group` are Reference Data (R). They are governed by the Reference Framework, not the MDP.

## G. Legal Masters

| Master | Table | Tier | Owner | Notes |
|--------|-------|------|-------|-------|
| Courts | `lg_court`, `lg_court_division`, `lg_court_venue` | **B** | Legal | |
| Court Officers | `lg_court_officer` | **B** | Legal | |
| Matter Types | `lg_matter_type` · `la_matter_type` | **B** | Legal | Two tables — **duplicate flag** |
| External Counsel | `lg_external_counsel` | **B** | Legal | |
| Legal References | `core_legal_reference`, `core_legal_reference_version` | **E** | Legal | Statutes shared across products |
| Fee Rules / Bundles | `lg_fee_rule`, `lg_fee_bundle` | **B** | Legal | |
| Recovery Strategy Types | `lg_recovery_strategy_type` | **B** | Legal | |
| SLA Policies | `lg_sla_policy` | **B** | Legal | |
| Legal Staff | `lg_staff` | **B** | Legal | |
| Legal Templates | `lg_document_template_registry` | **B** | Legal | |

## H. Benefit / BN Masters (BN scope — do NOT touch in Epic 1.2)

| Master | Table | Tier | Notes |
|--------|-------|------|-------|
| BN Country | `bn_country` | **B** | BN-owned |
| BN Product | `bn_product` | **B** | BN-owned |
| BN Coverage Type | `bn_coverage_type` | **B** | BN-owned |
| BN Reason Code | `bn_reason_code` | **B** | BN-owned |
| BN Rate Table | `bn_rate_table` | **B** | BN-owned |
| BN Payment Method | `bn_payment_method` | **B** | BN-owned |
| BN Medical Facility / Procedure / Tariff | `bn_medical_*` | **B** | BN-owned |
| BN Formula Registry | `bn_formula_*` | **B** | BN-owned |

BN masters are frozen for this epic (Epic 0.40 remains ON HOLD).

## I. Compliance / Audit Masters

| Master | Table | Tier | Notes |
|--------|-------|------|-------|
| CE Zones | `ce_zones` | **B** | Compliance-owned |
| CE Queues | `ce_assignment_queues` | **B** | Compliance-owned |
| CE Inspectors | `ce_inspectors` | **B** | Compliance-owned |
| CE Violation Types | `ce_violation_types` | **B** | Compliance-owned |
| CE Risk Bands / Config | `ce_risk_bands`, `ce_risk_config` | **B** | Compliance-owned |
| CE Notice Templates | `ce_notice_templates` | **B** | Compliance-owned |
| IA Departments / Auditors | `ia_departments`, `ia_auditors` | **B** | Internal Audit |

## J. Duplicate / Overlap Findings

| # | Overlap | Tables | Recommendation |
|---|---------|--------|----------------|
| 1 | Banks | `tb_bank_code` vs `bn_bank_master` | Consolidate under one Enterprise Bank master in MDP; BN retains view |
| 2 | Departments | `core_department` vs `tb_dept` | Retire `tb_dept` after mapping |
| 3 | Offices | `office_locations` vs `core_department_location` vs `tb_office` | Consolidate under `office_locations` as Enterprise Office master |
| 4 | Matter Types | `lg_matter_type` vs `la_matter_type` | Legal Advisory to reuse `lg_matter_type` |
| 5 | Country | `tb_country` vs `bn_country` | Keep `tb_country` as Enterprise master; BN keeps overlay for country-specific config |
| 6 | Inspectors | `/admin/master-data/inspectors` vs `ce_inspectors` | Compliance owns; retire the admin master-data shim |
| 7 | Designations | `tb_designations` vs `designation_hierarchy` | Keep both — hierarchy is a relationship table |

## K. Excluded (Transactional — not masters)

Tables prefixed with claim/case/payment/receipt/hearing/order/notice/task/event/log/audit are transactions and excluded from the MDP catalogue.

## Summary Counts

| Tier | Approx Count | Governance |
|------|--------------|------------|
| R — Reference Data | ~40+ groups (in `core_reference_group`) + ~15 legacy `tb_*` code lists | Reference Framework (Epic 1.1) |
| E — Enterprise Master | ~15 | **MDP (Epic 1.2)** |
| O — Organisation Master | ~10 | MDP + Org module |
| B — Business Master | ~60+ | Product-owned, MDP-governed |
| T — Transactional | 400+ | Not a master |

Detailed classification rationale is in `EPIC_1_2_MASTER_CLASSIFICATION.md`.
