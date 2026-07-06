# SSB St. Kitts & Nevis — Implementation Configuration Source Map

Status: Analysis only. No code, schema, screen, route, migration, or seed change is made by this document.
Scope: Social Security Board (SSB), St. Kitts & Nevis (country code `KN`).
Purpose: Give the implementation team a single map of every configuration setting required to stand up SSB KN, showing where CRUD lives today, what is missing, and what the Benefits Product Builder actually depends on before it can resume.

Companion documents:
- `docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md` — cross-tenant central settings map.
- `docs/enterprise/MASTER_DATA_MENU_ORGANISATION.md` — grouped master data inventory.
- `docs/bn/BN_PRODUCT_BUILDER_SHARED_DOMAIN_CONSUMPTION_MAP.md` — what BN Product Builder consumes.
- `docs/social-security/EPIC_2_7_DOCUMENT_DOMAIN_DECISION_ACCEPTANCE.md` — document domain decision.
- `docs/enterprise/ENTERPRISE_CONFIGURATION_CENTRE_ACCEPTANCE.md` — readiness dashboard.

## Legend

Status values:
- `EXISTS` — canonical CRUD screen live, wired to canonical table/service.
- `PARTIAL` — screen exists but incomplete (missing fields, missing KN seed, read-only, or view-only).
- `MISSING` — no screen; setting is either implicit in code or not configurable.
- `LEGACY` — served from BEMA (`ip_*`, `er_*`, `cn_*`, `tb_*`) via legacy screen or adapter; must not be rewritten.
- `MOCK` — screen present but backed by static data / mock service.

CRUD owner:
- `Platform Admin` — cross-tenant, super-admin only.
- `Enterprise Core` — organisation-wide, application admin.
- `Shared Domain` — `ssp_*` / `core_*` shared domain screens.
- `Master Data` — grouped `/admin/master-data/*` screens.
- `Module` — module-specific (BN, C3, Compliance, Legal, Finance).
- `Config only` — configuration table (`system_settings`) with no dedicated CRUD, edited via Global Settings.

Reuse action:
- `REUSE` — link directly; do not touch.
- `EXTEND` — add fields/tabs to the existing screen; do not create a new one.
- `TAB` — add a tab under an existing shell.
- `LINK` — Configuration Centre links to the existing route.
- `CREATE` — new screen required (out of scope for this map — flagged for a later epic).

Consumers: `BN` = Benefits, `C3` = Contributions, `ER` = Employer, `CL` = Claims, `CO` = Compliance, `FN` = Finance.

Required before BN Product Builder (`Req BN PB`):
- `YES` — Product Builder cannot be validated without this.
- `NO` — nice to have; PB can proceed with defaults or later binding.

---

## 1. Organisation Profile

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.1 | Organisation identity (name, short name, legal name, logo, tagline) | SSB brand + legal identity on every document, portal, email | `/admin/organization` | `pages/admin/OrganizationManagement.tsx` | `core_organization` / `useOrganization` | EXISTS | Enterprise Core | REUSE | ALL | YES |
| 1.2 | Registered address, contact, website | Official SSB contact block on letters, receipts, awards | `/admin/organization` (Contact tab) | same | `core_organization` | EXISTS | Enterprise Core | REUSE | ALL | YES |
| 1.3 | Organisation tax / statutory IDs (TIN, VAT, employer registration no.) | Printed on payroll & finance documents | `/admin/organization` | same | `core_organization.tax_ids` (jsonb) | PARTIAL | Enterprise Core | EXTEND | FN, C3 | NO |
| 1.4 | Fiscal year definition (start month, period type) | Contribution calendar, benefit accruals, reporting periods | `/admin/organization` (Fiscal tab) | `components/organization/FiscalYearForm.tsx` | `core_organization.fiscal_year` | PARTIAL | Enterprise Core | EXTEND | BN, C3, FN | YES |
| 1.5 | Default currency, locale, timezone | Money display, date/time on every screen and export | `/admin/global-settings` + `core_organization` | `pages/admin/GlobalSettings.tsx` | `system_settings` (`default_currency`, `default_locale`, `default_timezone`) | EXISTS | Enterprise Core | REUSE | ALL | YES |

---

## 2. Offices, Departments, Designations

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.1 | Offices / branches (Basseterre HQ, Charlestown, sub-offices) | Assignment, jurisdiction, cashier receipting, compliance zones | `/admin/organization/offices` | `pages/admin/OfficesManagement.tsx` | `core_office` / `useOffices` | EXISTS | Enterprise Core | REUSE | ALL | YES |
| 2.2 | Departments (Contributions, Benefits, Legal, Compliance, IT, Finance) | Workflow routing, role scoping, dashboards | `/admin/organization/departments` | `pages/admin/DepartmentsManagement.tsx` | `core_department` | EXISTS | Enterprise Core | REUSE | ALL | NO |
| 2.3 | Teams / queues (Claims Assessors, Recovery Officers, Inspectors) | Case assignment, referral routing | `/admin/organization/teams` | `pages/admin/TeamsManagement.tsx` | `core_team`, `core_team_member` | EXISTS | Enterprise Core | REUSE | CL, CO, Legal | NO |
| 2.4 | Designations / job titles | Signature blocks on letters, approval-authority mapping | `/admin/master-data/designations` | `pages/admin/masterData/DesignationsPage.tsx` | `md_designation` | EXISTS | Master Data | REUSE | ALL | NO |
| 2.5 | Office ↔ jurisdiction mapping | Compliance zone allocation, employer routing | `docs/compliance/admin/geography/office-zone-mapping.md` (planned) | — | `core_office_zone` (proposed) | MISSING | Enterprise Core | CREATE (later epic) | CO, ER | NO |

---

## 3. Calendar, Holidays, Working Week

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 3.1 | Working week definition (Mon–Fri, half days) | SLA due-date math, working-day interest, payment schedules | `/admin/calendar/working-week` | `pages/admin/CalendarSettings.tsx` | `core_working_week` / `calendarAdapter` | PARTIAL | Enterprise Core | EXTEND | ALL | YES |
| 3.2 | Public holidays (KN national + bank holidays) | Skip pay dates, SLA extension, cheque cut-off, C3 due dates | `/admin/calendar/holidays` | `components/calendar/HolidayManager.tsx` | `core_holiday` | EXISTS | Enterprise Core | REUSE | ALL | YES |
| 3.3 | Contribution period calendar (monthly cycle, cutoff day) | C3 filing windows, arrears computation | `/admin/master-data/contribution-periods` | `pages/c3Management/ContributionPeriods.tsx` | `cn_period` (legacy) | LEGACY | Module (C3) | REUSE via adapter | C3, BN, FN | YES |
| 3.4 | Benefit payment calendar (monthly pay run) | BN scheduled runs, cheque/EFT batches | `/bn/payment-schedule` | `pages/bn/PaymentSchedule.tsx` | `bn_payment_run_calendar` | PARTIAL | Module (BN) | EXTEND | BN, FN | YES |
| 3.5 | Business day rule (roll-forward/backward on holidays) | Uniform due-date behaviour | `/admin/global-settings` | `GlobalSettings.tsx` | `system_settings.business_day_rule` | PARTIAL | Config only | EXTEND | ALL | NO |

---

## 4. Country / Default KN

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 4.1 | Country profile (KN — ISO codes, currency XCD, timezone AST) | Baseline for geography, address, currency, phone | `/admin/shared-domains/geography/countries` | `pages/admin/geography/CountryProfilePage.tsx` | `ssp_country_profile` / `geographyService` | EXISTS | Shared Domain | REUSE | ALL | YES |
| 4.2 | Default country flag (KN) | Auto-select KN on all forms, restrict cross-country data | `/admin/global-settings` | `GlobalSettings.tsx` | `system_settings.default_country_code = 'KN'` | EXISTS | Config only | REUSE | ALL | YES |
| 4.3 | Admin levels (Parish, Constituency, District, Locality) | KN administrative hierarchy | `/admin/shared-domains/geography/admin-levels` | `pages/admin/geography/AdminLevelsPage.tsx` | `ssp_admin_level` | EXISTS | Shared Domain | REUSE | ER, CO, CL | YES |
| 4.4 | Geographic areas (parishes, districts, localities for KN) | Address selection, compliance zones | `/admin/shared-domains/geography/areas` | `pages/admin/geography/GeoAreasPage.tsx` | `ssp_geo_area` | PARTIAL | Shared Domain | REUSE (seed pending) | ER, CO, CL, BN | YES |
| 4.5 | Jurisdictions (courts, magistracies) | Legal case routing | `/admin/shared-domains/geography/jurisdictions` | `pages/admin/geography/JurisdictionsPage.tsx` | `ssp_jurisdiction` | PARTIAL | Shared Domain | REUSE | Legal, CO | NO |

---

## 5. Address Structure

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 5.1 | Address format (KN) — field order, required fields, sample | Consistent address capture across member, employer, doctor, claimant | `/admin/shared-domains/geography/address-formats` | `pages/admin/geography/AddressFormatsPage.tsx` | `ssp_address_format` | EXISTS | Shared Domain | REUSE | ALL | YES |
| 5.2 | Postal / postcode rule (KN has none — mark not required) | Suppress postcode requirement in KN forms | Address Formats screen | same | `ssp_postal_rule` | PARTIAL | Shared Domain | REUSE | ALL | NO |
| 5.3 | Address validation service | Cleanse/standardise before save | — | — | none | MISSING | Shared Domain | LATER | ALL | NO |

---

## 6. NIS / SSN Rules

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 6.1 | SSN format & length (KN 6 digits — `VITE_SSN_LENGTH`) | Validation on registration, search, C3 upload | `.env` + registration screens | `src/lib/format-config.ts` | env / `FORMAT_CONFIG.ssnLength` | PARTIAL | Config only | EXTEND to `system_settings` | ALL | YES |
| 6.2 | SSN check-digit / issuance rule | Auto-generate & validate SSN | Registration | `services/insuredPerson/*` | inline logic | MISSING | Module (IP) | CREATE (later) | ALL | NO |
| 6.3 | National ID / alt-ID types accepted (Driver's licence, Passport, Voter's ID) | KYC on registration | `/admin/master-data/id-types` | `pages/admin/masterData/IdTypesPage.tsx` | `md_id_type` | EXISTS | Master Data | REUSE | ALL | NO |
| 6.4 | Duplicate-SSN detection policy | Prevent duplicate member creation | — | — | none | MISSING | Module (IP) | CREATE (later) | ALL | NO |

---

## 7. Employer Code Rules

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 7.1 | Employer code format & sequence | Auto-assign ER code on registration | `/admin/numbering` | `pages/admin/NumberingRules.tsx` | `core_number_sequence` (`employer_code`) | PARTIAL | Enterprise Core | EXTEND | ER, C3 | NO |
| 7.2 | Employer categories (Government, Private, Statutory, NGO, Self-Employed) | Rate selection, reporting | `/admin/master-data/employer-categories` | `pages/admin/masterData/EmployerCategoriesPage.tsx` | `md_employer_category` (legacy `tb_*` mirror) | LEGACY | Master Data | REUSE via adapter | ER, C3, BN | YES |
| 7.3 | Employer status codes (Active, Dormant, Closed, In Liquidation) | Lifecycle + compliance filters | `/admin/master-data/employer-status` | `pages/admin/masterData/EmployerStatusPage.tsx` | `md_employer_status` | EXISTS | Master Data | REUSE | ER, CO | NO |
| 7.4 | Employer registration workflow (approve/reject steps) | Governance on onboarding | `/admin/workflows` | `pages/admin/WorkflowsAdmin.tsx` | `core_workflow_template` | PARTIAL | Enterprise Core | EXTEND | ER | NO |

---

## 8. Member Code Rules

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 8.1 | Member (IP) code / SSN issuance sequence | Auto-issue on registration | `/admin/numbering` | `NumberingRules.tsx` | `core_number_sequence` (`member_ssn`) | PARTIAL | Enterprise Core | EXTEND | ALL | NO |
| 8.2 | Member types (Employed, Self-Employed, Voluntary, Domestic) | Contribution & benefit eligibility rules | `/admin/master-data/member-types` | `pages/admin/masterData/MemberTypesPage.tsx` | `md_member_type` | EXISTS | Master Data | REUSE | BN, C3 | YES |
| 8.3 | Member status codes (Active, Suspended, Deceased, Emigrated) | Eligibility gates in BN | `/admin/master-data/member-status` | `pages/admin/masterData/MemberStatusPage.tsx` | `md_member_status` | EXISTS | Master Data | REUSE | BN, C3 | YES |
| 8.4 | Relationship codes, marital status, gender (M/F/N) | Dependant capture, survivor benefits | `/admin/master-data/relations`, `/marital-status` | respective pages | `md_relation`, `md_marital_status` | EXISTS | Master Data | REUSE | BN, IP | YES |

---

## 9. Contribution Calendar

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 9.1 | Contribution period definition (monthly, cutoff, grace) | C3 filing, arrears, interest | `/c3-management/periods` | legacy screen | `cn_period` | LEGACY | Module (C3) | REUSE via adapter | C3, BN, FN | YES |
| 9.2 | Contribution due-date & penalty rule | Late filing penalty | `/admin/master-data/penalty-rules` | `pages/admin/masterData/PenaltyRulesPage.tsx` | `md_penalty_rule` | PARTIAL | Master Data | REUSE | C3, FN, CO | NO |
| 9.3 | Contribution types (Employed, Self-Employed, Voluntary, Levy, Severance) | Ledger heads, reporting | `/admin/master-data/contribution-types` | `pages/admin/masterData/ContributionTypesPage.tsx` | `md_contribution_type` | EXISTS | Master Data | REUSE | C3, BN | YES |
| 9.4 | SSC / levy rates (with effective dates) | C3 wage calc, BN insurable earnings | `/admin/master-data/ssc-rates` | `pages/admin/masterData/SscRatesPage.tsx` | `md_ssc_rate` | EXISTS | Master Data | REUSE | C3, BN | YES |
| 9.5 | Insurable earnings ceiling & floor | BN benefit calc, C3 cap | `/admin/master-data/insurable-earnings` | `pages/admin/masterData/InsurableEarningsPage.tsx` | `md_insurable_earnings` | PARTIAL | Master Data | EXTEND | C3, BN | YES |

---

## 10. Financial / Payment Rules

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 10.1 | Ledger heads (Receivables, Payables, Suspense, Refunds) | Journal posting | `/admin/master-data/ledger-heads` | `pages/admin/masterData/LedgerHeadsPage.tsx` | `core_ledger_head` | EXISTS | Enterprise Core | REUSE | C3, BN, FN | YES |
| 10.2 | Payment methods (Cash, Cheque, EFT, Card, Direct Debit) | Cashier + BN issue selection | `/admin/master-data/payment-methods` | `pages/admin/masterData/PaymentMethodsPage.tsx` | `md_payment_method` | EXISTS | Master Data | REUSE | C3, BN, FN | YES |
| 10.3 | Refund / adjustment rules | C3 refund processing, BN clawback | `/admin/master-data/refund-rules` | `pages/admin/masterData/RefundRulesPage.tsx` | `md_refund_rule` | PARTIAL | Master Data | EXTEND | C3, BN, FN | NO |
| 10.4 | Cheque configuration (stock, MICR, signatories) | BN cheque issue | `/bn/cheque-config` | `pages/bn/ChequeConfig.tsx` | `bn_cheque_stock`, `core_signatory` | PARTIAL | Module (BN) | EXTEND | BN, FN | YES |
| 10.5 | Payment arrangement templates (instalment, part-payment) | Recovery, deferred payment | `/admin/payment-arrangements` | `components/core/payment-arrangements/*` | `core_payment_arrangement` | EXISTS | Enterprise Core | REUSE | C3, Legal, FN | NO |

---

## 11. Banks / Payment Channels

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 11.1 | Bank master (KN banks — SKNANB, RBC, Republic, FCIB, BON) | EFT + cheque, member bank capture | `/admin/master-data/banks` | `pages/admin/masterData/BanksPage.tsx` | `md_bank`, `md_bank_code` | EXISTS | Master Data | REUSE | BN, ER, C3 | YES |
| 11.2 | Bank branches | EFT routing, cheque printing | `/admin/master-data/bank-branches` | `pages/admin/masterData/BankBranchesPage.tsx` | `md_bank_branch` | EXISTS | Master Data | REUSE | BN, ER | NO |
| 11.3 | SSB operating bank accounts (source accounts) | Cashier receipting, BN disbursement | `/admin/organization/bank-accounts` | `pages/admin/OrgBankAccounts.tsx` | `core_org_bank_account` | PARTIAL | Enterprise Core | EXTEND | C3, BN, FN | YES |
| 11.4 | Payment channels (Portal, Bank, Cashier, Mobile, Agent) | Receipt source, reconciliation | `/admin/master-data/payment-channels` | `pages/admin/masterData/PaymentChannelsPage.tsx` | `md_payment_channel` | EXISTS | Master Data | REUSE | C3, FN | YES |
| 11.5 | EFT file format per bank | BN batch export | `/admin/master-data/eft-formats` | `pages/admin/masterData/EftFormatsPage.tsx` | `md_eft_format` | PARTIAL | Master Data | EXTEND | BN, FN | YES |

---

## 12. Legal Act / Sections / Regulations

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 12.1 | Legal reference master (Social Security Act, Regulations, SIs) | Cite on letters, penalties, awards, appeals | `/admin/shared-domains/legal-reference` | `pages/admin/legalReference/*` | `core_legal_reference` / `legalReferenceService` | EXISTS | Shared Domain | REUSE | BN, CO, Legal | YES |
| 12.2 | Legal reference types (Act, Regulation, SI, Directive, Ruling) | Filter/group on selection | Legal Reference screen | same | `legal_reference_type` | EXISTS | Shared Domain | REUSE | BN, CO, Legal | NO |
| 12.3 | Effective-dated versioning of legal refs | Historical accuracy | Legal Reference screen | same | `core_legal_reference` (version_number, effective_from/to) | EXISTS | Shared Domain | REUSE | BN, CO, Legal | YES |
| 12.4 | BN Product ↔ Legal reference bindings | Every benefit product must cite its legal basis | BN Product Builder (pending) | — | `bn_product_legal_binding` (proposed) | MISSING | Module (BN) | CREATE (in Product Builder epic) | BN | YES |
| 12.5 | Penalty / offence catalogue | Compliance & prosecution | `/admin/master-data/offences` | `pages/admin/masterData/OffencesPage.tsx` | `md_offence` | PARTIAL | Master Data | EXTEND | CO, Legal | NO |

---

## 13. Communication Templates

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 13.1 | Notification templates (Email, SMS, in-app, letter) | All outbound comms | `/admin/notification-templates` | `pages/admin/NotificationTemplates.tsx` | `notification_templates` / `notificationsAdapter` | EXISTS | Shared Domain | REUSE | ALL | YES |
| 13.2 | Communication channels config (SMTP, SMS gateway, print) | Delivery | `/admin/communication-channels` | `pages/admin/CommunicationChannels.tsx` | `core_communication_profile` | PARTIAL | Enterprise Core | EXTEND | ALL | NO |
| 13.3 | Template variables / merge fields catalogue | Author-friendly variable list | Template designer | `components/notifications/TemplateDesigner.tsx` | code registry | EXISTS | Shared Domain | REUSE | ALL | NO |
| 13.4 | Language packs (English default; French/Spanish optional) | Multi-language letters | — | — | none | MISSING | Shared Domain | LATER | ALL | NO |
| 13.5 | Branding assets (logo, letterhead, signatures) | Applied to letters, receipts | `/admin/branding` | `pages/admin/BrandingSettings.tsx` | `core_branding_asset` | PARTIAL | Enterprise Core | EXTEND | ALL | NO |

---

## 14. Document Requirements

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 14.1 | Document types master (Birth cert, Marriage cert, Payslip, Medical report, …) | Universal doc catalogue | `/admin/master-data/document-types` | `pages/admin/masterData/DocumentTypesPage.tsx` | `md_document_type` | EXISTS | Master Data | REUSE | ALL | YES |
| 14.2 | Document categories per module | Group required docs by module | `/admin/document-configuration` | `pages/admin/DocumentConfigurationPage.tsx` | `core_document_category` | EXISTS | Shared Domain | REUSE | ALL | YES |
| 14.3 | Required-documents matrix per BN product / claim type | PB uses this to gate claims | `/admin/document-configuration` (per module) | `components/admin/document-configuration/*` | `core_document_requirement` | PARTIAL | Shared Domain | EXTEND | BN, CL | YES |
| 14.4 | Supportive / alternate document rules | "All-of" vs "any-of" evidence logic | Same screen | same | `core_document_requirement.rule_type` | EXISTS | Shared Domain | REUSE | BN, CL | YES |
| 14.5 | DMS storage backend (bucket, retention, versioning) | Physical storage | `/admin/dms-settings` | `pages/admin/DmsSettings.tsx` | `documentsAdapter` / storage bucket | PARTIAL | Enterprise Core | EXTEND | ALL | NO |
| 14.6 | Document validation profile (max size, mime, virus scan) | Upload guardrails | Global Settings | `GlobalSettings.tsx` | `system_settings.document_*` | PARTIAL | Config only | EXTEND | ALL | NO |

Note: See `EPIC_2_7_DOCUMENT_DOMAIN_DECISION_ACCEPTANCE.md` — Documents surfaced via existing DMS; no duplicate DMS.

---

## 15. Workflow / SLA / Approval Rules

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 15.1 | Workflow templates (maker-checker, multi-approver) | Governance on onboarding, claims, refunds, waivers | `/admin/workflows` | `pages/admin/WorkflowsAdmin.tsx` | `core_workflow_template`, `core_workflow_step` | EXISTS | Enterprise Core | REUSE | ALL | YES |
| 15.2 | Workflow triggers (event → workflow binding) | Auto-start workflows | `/admin/workflow-triggers` | `pages/admin/WorkflowTriggers.tsx` | `core_workflow_trigger` | EXISTS | Enterprise Core | REUSE | ALL | YES |
| 15.3 | Approver roles / authority matrix (amount thresholds) | Who can approve what value | `/admin/authority-matrix` | `pages/admin/AuthorityMatrix.tsx` | `core_authority_matrix` | PARTIAL | Enterprise Core | EXTEND | BN, C3, FN, Legal | YES |
| 15.4 | SLA definitions per case type | Due dates, escalation, ageing | `/admin/sla-config` | `pages/admin/SlaConfig.tsx` | `core_sla_policy` | PARTIAL | Enterprise Core | EXTEND | CL, CO, Legal | NO |
| 15.5 | Escalation & reminder rules | Auto-escalate overdue tasks | Same SLA screen | same | `core_sla_escalation` | PARTIAL | Enterprise Core | EXTEND | CL, CO, Legal | NO |
| 15.6 | Delegation / out-of-office rules | Reassignment during absence | — | — | none | MISSING | Enterprise Core | LATER | ALL | NO |

Rules reference: `.lovable/rules/workflow-maker-checker.md`.

---

## 16. Numbering Rules

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 16.1 | Number sequence registry (all auto-numbered documents) | Central sequence definition | `/admin/numbering` | `pages/admin/NumberingRules.tsx` | `core_number_sequence` | EXISTS | Enterprise Core | REUSE | ALL | YES |
| 16.2 | Sequences: Employer code, Member SSN, C3 batch, Receipt, Refund, Claim, Award, Cheque, EFT, Case, Letter | Prefix/format per document | Same screen | same | rows in `core_number_sequence` | PARTIAL | Enterprise Core | EXTEND (KN seed pending) | ALL | YES |
| 16.3 | Reset frequency (yearly / monthly / never) | Sequence roll-over | Same screen | same | `core_number_sequence.reset_frequency` | EXISTS | Enterprise Core | REUSE | ALL | NO |
| 16.4 | Reservation / gap-recovery policy | Handle voided numbers | Same screen | same | `core_number_sequence.policy` | PARTIAL | Enterprise Core | EXTEND | C3, BN, FN | NO |

---

## 17. Audit / Logging Settings

| # | Setting | Purpose | Route | Component | Table / Service / Hook | Status | CRUD Owner | Action | Consumers | Req BN PB |
|---|---|---|---|---|---|---|---|---|---|---|
| 17.1 | Audit trail write policy (which entities are audited) | Regulatory & internal audit | `/admin/audit-config` | `pages/admin/AuditConfig.tsx` | `audit_log`, `auditService` / `logAuditTrail` | EXISTS | Enterprise Core | REUSE | ALL | NO |
| 17.2 | Field-level change tracking config | Before/after value capture | Same screen | same | `audit_route_config` (`src/config/auditRouteConfig.ts`) | PARTIAL | Enterprise Core | EXTEND | ALL | NO |
| 17.3 | Retention & purge policy (audit, DMS, notifications) | Compliance with retention rules | `/admin/global-settings` | `GlobalSettings.tsx` | `system_settings.retention_*` | MISSING | Config only | CREATE (later) | ALL | NO |
| 17.4 | Login / session audit | Security monitoring | `/admin/security-audit` | `pages/admin/SecurityAudit.tsx` | `auth.audit_log_entries` (read-only) | EXISTS | Platform Admin | REUSE | ALL | NO |
| 17.5 | Maker-checker audit view | Approver-side proof | Workflow admin | `WorkflowsAdmin.tsx` | `core_workflow_action_log` | EXISTS | Enterprise Core | REUSE | ALL | NO |
| 17.6 | PII masking policy | Portal & internal display of PII | Global Settings + `PIIMaskingContext` | `contexts/PIIMaskingContext.tsx` | `system_settings.pii_*` | PARTIAL | Config only | EXTEND | ALL | NO |

---

## Cross-cut: Blocking Prerequisites for BN Product Builder

The following items are marked `Req BN PB = YES` above and must all be `EXISTS` (with KN data seeded) before BN Product Builder can be un-held:

1. Organisation identity, fiscal year, currency/locale/timezone (1.1, 1.4, 1.5)
2. At least one office + relevant departments (2.1, 2.2)
3. Working week + KN public holidays + BN pay calendar (3.1, 3.2, 3.4)
4. Contribution period calendar (3.3, 9.1)
5. Country KN + default country flag + address format (4.1, 4.2, 5.1)
6. Member types & status (8.2, 8.3), Relationship / marital / gender (8.4)
7. Contribution types, SSC rates, insurable earnings ceiling/floor (9.3, 9.4, 9.5)
8. Ledger heads, payment methods, cheque config, EFT format (10.1, 10.2, 10.4, 11.5)
9. Bank master + SSB operating accounts + payment channels (11.1, 11.3, 11.4)
10. Legal references (Social Security Act + regulations) seeded (12.1, 12.3)
11. Notification templates for BN comms (13.1)
12. Document types + BN required-documents matrix (14.1, 14.2, 14.3, 14.4)
13. Workflow templates + triggers + authority matrix for BN approvals (15.1, 15.2, 15.3)
14. Numbering sequences for Claim, Award, Cheque, EFT, Letter (16.1, 16.2)

Items flagged `PARTIAL` in the above list are the real gate — they must be promoted to `EXISTS` (data seeded, KN-specific) before Product Builder validation runs.

---

## Governance

- No new CRUD screens are introduced by this document.
- No legacy tables (`ip_*`, `er_*`, `cn_*`, `tb_*`) are altered; legacy sources are consumed via existing adapters.
- No schema migrations are proposed here — `MISSING` items are flagged for future epics, not built.
- Configuration Centre (`/admin/configuration-centre`) is the operational surface that links to every route listed above; it is the single place that reflects readiness for SSB KN.

## Acceptance

- Every setting has a named CRUD owner and reuse action.
- Existing screens are identified with route + component + table/service.
- Missing and partial settings are called out explicitly and tagged with consuming modules.
- BN Product Builder blocking prerequisites are enumerated and cross-referenced.
- Zero implementation changes were made to satisfy this map.
