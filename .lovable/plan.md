

# Master Data CRUD — 29 Individual Screens

## Scope
Create 29 separate CRUD page files (one per table), each with its own route and sidebar menu entry under a new "Master Data" top-level menu. Excludes `tb_income_cat` and `tb_income_codes` (already have screens).

## Pattern
Each page follows the `IncomeCategoryManagement.tsx` pattern exactly:
- `PermissionWrapper` with a unique module name
- `useActionPermissions` for `can("create")`, `can("edit")`, `can("delete")`
- `useUserCode()` for audit fields
- Search/filter bar, Card with Table, icon-based row actions (Eye, Edit, Trash2)
- View Dialog (read-only), Add/Edit Dialog (form), Delete AlertDialog
- Direct Supabase client calls via `(supabase as any).from("table_name")`
- `useQuery` / `useMutation` from tanstack

## Files to Create

### 29 Page Files (`src/pages/admin/master-data/`)

Each file is self-contained (~250 lines), no shared generic component.

| # | File | Table | PK | Key Columns |
|---|------|-------|----|-------------|
| 1 | `ActivityManagement.tsx` | tb_activity | code | code, short_description, long_description |
| 2 | `BankCodeManagement.tsx` | tb_bank_code | bank_code | bank_code, name, address1, address2, phone, fax, zip, contact, regno |
| 3 | `BatchStatusManagement.tsx` | tb_batch_status | code | code, description + audit |
| 4 | `C3StatusManagement.tsx` | tb_c3_status | code | code, description, isactive |
| 5 | `CountryManagement.tsx` | tb_country | code | code, description, nationality, oecs, caricom |
| 6 | `DependentRelationManagement.tsx` | tb_dependent_relation | code | code, description |
| 7 | `DistrictManagement.tsx` | tb_district | code | code, description |
| 8 | `EyeColorManagement.tsx` | tb_eye_color | code | code, description |
| 9 | `IndustryManagement.tsx` | tb_indus | code | code, short_description, long_description |
| 10 | `InspectorManagement.tsx` | tb_inspector | code | code, insp_name |
| 11 | `InvoiceStatusManagement.tsx` | tb_invoice_status | code | code, description, is_active + audit |
| 12 | `InvoiceTypesManagement.tsx` | tb_invoice_types | code | code, description, is_active + audit |
| 13 | `LegalStatusManagement.tsx` | tb_legal_status | code | code, description |
| 14 | `MaritalStatusManagement.tsx` | tb_marital | code | code, description |
| 15 | `MerchantManagement.tsx` | tb_merchant | credit_card_code | credit_card_code, credit_card_name, merchant_id, address, phone, fax, contact |
| 16 | `MethodOfPaymentManagement.tsx` | tb_method_of_payment | mop_code | mop_code, short_description, long_description |
| 17 | `OccupationManagement.tsx` | tb_occup | code | code, short_description, long_description |
| 18 | `PayerTypeManagement.tsx` | tb_payer_type | code | code, description, is_active + audit |
| 19 | `PaymentSourcesManagement.tsx` | tb_payment_sources | code | code, description, is_active + audit |
| 20 | `PaymentTypeManagement.tsx` | tb_payment_type | payment_code | payment_code, payment_type_description, fund_code |
| 21 | `PenaltyManagement.tsx` | tb_penalty | id (int) | id, effective_start_date, effective_end_date, penalty_type, month_number, penalty_percentage, description, is_active + audit |
| 22 | `PostalDistrictManagement.tsx` | tb_postal_district | code | code, description |
| 23 | `ReceiptStatusManagement.tsx` | tb_receipt_status | code | code, description + audit |
| 24 | `RelationManagement.tsx` | tb_relation | code | code, description, surv_type |
| 25 | `SectorManagement.tsx` | tb_sector | code | code, description |
| 26 | `SscRatesManagement.tsx` | tb_ssc_rates | id (int) | id, effective_start/end, employee_ss_%, employer_ss_%, employee_pe_%, employer_ei_%, employer_levy_%, description, is_active + audit |
| 27 | `VcContribRateManagement.tsx` | tb_vc_contrib_rate | id (uuid) | id, effstart, effend, min_contrib_weeks, submission_limit_nbr, vc_contrib_pct, vc_duration + audit |
| 28 | `VcEligibilityConfigManagement.tsx` | tb_vc_eligibility_config | id (uuid) | id, vc_contrib_pct, vc_duration, min_contrib_weeks, min_age, max_age, residency_grace_weeks, termination_grace_weeks, wage_history_months, weeks_per_year, effstart, effend, is_active + audit |
| 29 | `VillagesManagement.tsx` | tb_villages | code | code, description, postal_code |
| 30 | `VerifyManagement.tsx` | tb_verify | code | code, description |

### Sidebar Menu
**New file**: `src/components/sidebar/menuItems/masterDataMenuItems.ts`

Top-level "Master Data" menu with sub-groups:
- **General**: Activity Types, Countries, Districts, Eye Colors, Marital Status, Postal Districts, Relations, Dependent Relations, Sectors, Verification Types, Villages
- **Employment**: Industries, Inspectors, Occupations
- **Financial**: Bank Codes, Merchants, Method of Payment, Payer Types, Payment Sources, Payment Types, Receipt Status, Invoice Status, Invoice Types, Penalty, SSC Rates
- **C3 & Contributions**: Batch Status, C3 Status, VC Contrib Rates, VC Eligibility Config

Each sub-item has its own `url` like `/admin/master-data/activity-types`, icon, and `requiresPermission: "master_data"`.

### Modified Files

| File | Change |
|------|--------|
| `src/components/sidebar/sidebarMenuItems.ts` | Import and spread `masterDataMenuItems` |
| `src/components/routing/AppRoutes.tsx` | Add 29 routes under `/admin/master-data/*` |
| `src/config/routes.ts` | Add 29 route constants |
| `src/hooks/useActionPermission.ts` | Add 29 module name constants to `MODULE_NAMES` |

### Database Migration
Create modules and default actions (view, create, edit, delete) for all 29 tables under a "Master Data" parent module using `INSERT INTO modules` and `INSERT INTO module_actions`.

### Audit Field Handling
Tables with audit columns (`entered_by`, `modified_by`, `created_by`, `updated_by`, timestamps) will auto-populate using `useUserCode()`:
- On create: set `entered_by`/`created_by` + timestamp
- On update: set `modified_by`/`updated_by` + timestamp
- These fields are shown read-only in View dialog, hidden in Add/Edit forms

### Date Fields
Tables with date columns (`tb_penalty`, `tb_ssc_rates`, `tb_vc_contrib_rate`, `tb_vc_eligibility_config`) will use the `DatePicker` component and `formatDateForDisplay()`/`formatDateForStorage()` utilities per project standards.

## Total File Count
- 29 new page files
- 1 new sidebar menu file
- 1 new migration
- 4 modified files
- **35 files total**

