# SSB Configuration Ownership Matrix — St. Kitts & Nevis

Scope: Social Security Board (SSB), St. Kitts & Nevis (KN) only.
Source: `docs/social-security/SSB_ST_KITTS_IMPLEMENTATION_CONFIGURATION_SOURCE_MAP.md`.

This matrix defines, for every configurable item required for the KN SSB
implementation, **who owns the engine**, **where CRUD actually happens**,
**what SSB Setup should do with it**, and **whether it gates BN Product
Builder**. It is a design contract only — no code, schema, `app_modules`,
permissions, or legacy tables are changed by this document.

Legend
- **Engine Owner** — the reusable capability that owns the table/service.
- **Impl Owner** — always `SSB Setup` (this document only concerns SSB KN).
- **CRUD Screen** — canonical route where records are edited today.
- **Table/Service** — authoritative artefact from the Source Map.
- **Scope** — Platform / SSB-wide / Product / Module / Transaction.
- **Consumers** — BN, C3 (Contributions), EMP (Employer), CLM (Claims),
  CMP (Compliance), FIN (Finance).
- **Decision** — KEEP / EXTEND / TAB / SURFACE / NEW / DEFER / REDIRECT.
- **SSB Setup Behaviour** — LINK / SUMMARY / EMBED-EDIT / OPEN / READINESS / BLOCK-BN.
- **Migration** — none / adapter / seed / future / legacy-protected.
- **BN Gate** — REQUIRED / SHOULD / OPTIONAL / NOT-REQUIRED.

---

## 1. Configuration Ownership Matrix

| # | Configuration Item | Engine Owner | CRUD Screen | Table / Service | Scope | Consumers | Decision | SSB Setup Behaviour | Migration | BN Gate |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Organisation profile (SSB legal entity) | Organisation | `/admin/organization` (`OrganizationManagement.tsx`) | `core_organization` / `useOrganizations` | SSB-wide | All | KEEP | SUMMARY + OPEN | none | REQUIRED |
| 2 | Organisation branding / logos | Organisation | `/admin/organization` (branding tab) | `core_organization.branding` | SSB-wide | All UI | KEEP | LINK | none | OPTIONAL |
| 3 | Departments / offices | Organisation | `/admin/organization/departments` | `core_department` / `useDepartments` | SSB-wide | EMP, CMP, CLM | KEEP | LINK | none | SHOULD |
| 4 | Users & role assignments | Platform / Identity | `/admin/users`, `/admin/roles` | `profiles`, `user_roles`, `role_permissions` | Platform | All | KEEP | LINK | none | REQUIRED |
| 5 | Default country (KN) | Geography | `/admin/geography` (countries) | `ssp_country_profile` / `geographyService` | Platform | All | KEEP | READINESS + LINK | seed | REQUIRED |
| 6 | Admin levels (Country/Island/Parish/…) | Geography | `/admin/geography` (admin levels) | `ssp_admin_level` | SSB-wide | EMP, CMP, CLM | KEEP | LINK | seed | REQUIRED |
| 7 | Geo areas (islands, parishes, towns) | Geography | `/admin/geography` (areas) | `ssp_geo_area` | SSB-wide | EMP, CMP, CLM | KEEP | READINESS + LINK | seed | REQUIRED |
| 8 | Address structure (fields, order) | Geography | `/admin/geography` (address format) | `ssp_address_format` | SSB-wide | All | KEEP | SUMMARY + OPEN | seed | SHOULD |
| 9 | Address mandatory fields | Geography | `/admin/geography` (address format → `fields.required`) | `ssp_address_format.fields` (JSONB) | SSB-wide | All | EXTEND | EMBED-EDIT (KN required-flags only) | seed | SHOULD |
| 10 | Postal / ZIP rule | Geography | `/admin/geography` (postal rule) | `ssp_postal_rule` | SSB-wide | All | KEEP | LINK | none | OPTIONAL |
| 11 | Jurisdictions (courts, tax, admin) | Geography / Legal | `/admin/geography` (jurisdictions) | `ssp_jurisdiction` | SSB-wide | CMP, Legal | KEEP | LINK | none | OPTIONAL |
| 12 | Identity types catalogue | Identity | `/admin/identity` (types) | `ssp_identity_type` | Platform | EMP, Members | KEEP | LINK | seed | REQUIRED |
| 13 | Country identity rules (NIS/SSN, TIN, Passport, DL) | Identity | `/admin/identity` (country rules) | `ssp_country_identity_rule` | SSB-wide | EMP, Members, BN, CLM | KEEP | SUMMARY + OPEN | seed | REQUIRED |
| 14 | Primary identifier flag (NIS as primary for KN) | Identity | `/admin/identity` (country rule → `is_primary`) | `ssp_country_identity_rule.is_primary` | SSB-wide | All | EXTEND | EMBED-EDIT (single flag) | seed | REQUIRED |
| 15 | Identity validation patterns (regex/checksum) | Identity | `/admin/identity` (validation patterns) | `ssp_identity_validation_pattern` | SSB-wide | All | KEEP | LINK | future | SHOULD |
| 16 | Numbering rule — Employer code | Numbering | `/admin/settings/numbering` (`NumberingRules`) | `numbering_sequences` / numbering service | SSB-wide | EMP | EXTEND | EMBED-EDIT (KN template) | seed | REQUIRED |
| 17 | Numbering rule — Member/NIS code | Numbering | `/admin/settings/numbering` | `numbering_sequences` | SSB-wide | Members, BN | EXTEND | EMBED-EDIT (KN template) | seed | REQUIRED |
| 18 | Numbering rule — Claim number | Numbering | `/admin/settings/numbering` | `numbering_sequences` | SSB-wide | CLM, BN | EXTEND | EMBED-EDIT | seed | REQUIRED |
| 19 | Numbering rule — Receipt / Invoice / Batch | Numbering | `/admin/settings/numbering` | `numbering_sequences` | SSB-wide | C3, FIN | EXTEND | EMBED-EDIT | seed | SHOULD |
| 20 | Numbering rule — Legal case / Notice | Numbering | `/admin/settings/numbering` | `numbering_sequences` | SSB-wide | Legal, CMP | EXTEND | EMBED-EDIT | seed | OPTIONAL |
| 21 | Contribution calendar (weekly/monthly periods) | BN / C3 | `/admin/master-data/contribution-calendar` (**MISSING as canonical**) | `c3_contribution_period` (partial) | SSB-wide | C3, BN | NEW | EMBED-EDIT | future | REQUIRED |
| 22 | Fiscal year definition | Organisation / Finance | `/admin/organization` (fiscal tab — **PARTIAL**) | `core_organization.fiscal_year_*` | SSB-wide | FIN, BN, C3 | EXTEND | EMBED-EDIT | none | REQUIRED |
| 23 | Public holidays / working week | Enterprise Calendar | `/admin/calendar` | `core_calendar_holiday`, `core_working_week` | SSB-wide | All | KEEP | LINK | none | SHOULD |
| 24 | Currency profile (XCD, USD) | Financial Reference | `/admin/financial-reference` (currencies) | `ssp_currency_profile` | Platform | FIN, C3, BN | KEEP | READINESS + LINK | seed | REQUIRED |
| 25 | Payment channels (Cheque/EFT/Cash/Online/Wallet) | Financial Reference | `/admin/financial-reference` (channels) | `ssp_payment_channel` | SSB-wide | C3, BN, FIN | KEEP | SUMMARY + OPEN | seed | REQUIRED |
| 26 | Settlement methods | Financial Reference | `/admin/financial-reference` (settlement) | `ssp_settlement_method` | SSB-wide | FIN, BN | KEEP | LINK | seed | REQUIRED |
| 27 | Account types (Savings/Current) | Financial Reference | `/admin/financial-reference` (account types) | `ssp_account_type` | SSB-wide | Members, EMP, BN | KEEP | LINK | seed | SHOULD |
| 28 | Bank master (KN banks) | Financial Reference | `/admin/financial-reference` (banks) | `ssp_bank` | SSB-wide | C3, BN, EMP | KEEP | READINESS + LINK | seed (verified list) | REQUIRED |
| 29 | Bank branches | Financial Reference | `/admin/financial-reference` (branches) | `ssp_bank_branch` | SSB-wide | C3, BN, EMP | KEEP | LINK | seed | SHOULD |
| 30 | Tax references | Financial Reference | `/admin/financial-reference` (tax refs) | `ssp_tax_reference` | SSB-wide | FIN | KEEP | LINK | future | OPTIONAL |
| 31 | Chart of accounts refs | Financial Reference | `/admin/financial-reference` (CoA refs) | `ssp_chart_of_account_ref` | SSB-wide | FIN | KEEP | LINK | future | OPTIONAL |
| 32 | Legal reference types | Legal Reference | `/admin/legal-reference` (types) | `legal_reference_type` | Platform | Legal, CMP | KEEP | LINK | none | REQUIRED |
| 33 | Legal acts (Social Security Act — KN) | Legal Reference | `/admin/legal-reference` (acts) | `ssp_legal_act` / `core_legal_reference` | SSB-wide | CMP, BN, Legal | KEEP | READINESS + LINK | seed (real KN act) | REQUIRED |
| 34 | Legal sections & regulations | Legal Reference | `/admin/legal-reference` | `ssp_legal_section`, `ssp_regulation` | SSB-wide | CMP, BN, Legal | KEEP | LINK | seed | SHOULD |
| 35 | Legal applicability per country | Legal Reference | `/admin/legal-reference` (applicability) | `ssp_country_legal_applicability` | SSB-wide | All | KEEP | LINK | seed | SHOULD |
| 36 | Court references | Legal Reference | `/admin/legal-reference` (courts) | `ssp_court_reference` | SSB-wide | Legal | KEEP | LINK | future | OPTIONAL |
| 37 | Document types | Document/DMS | `/admin/master-data/document-types` (**PARTIAL — see EPIC_2_7 decision**) | `md_document_type` / DMS service | SSB-wide | EMP, Members, BN, CLM | EXTEND | READINESS + LINK | future (shared domain) | REQUIRED |
| 38 | Document requirements per process | Document/DMS | (**MISSING** canonical screen) | none yet | Product / Module | BN, CLM, EMP | NEW | EMBED-EDIT (matrix) | future | REQUIRED |
| 39 | Document retention rules | Document/DMS | (**MISSING**) | none | SSB-wide | All | DEFER | LINK (placeholder) | future | OPTIONAL |
| 40 | Communication templates (letters/email/SMS) | Communication | `/admin/notifications/templates` | `notification_templates` / `useNotificationTemplates` | SSB-wide | All | KEEP | SUMMARY + OPEN | none | SHOULD |
| 41 | Template binding to events | Communication | `/admin/notifications/bindings` (**PARTIAL**) | `notification_bindings` | SSB-wide | All | EXTEND | LINK | none | SHOULD |
| 42 | Notification channels (email/SMS/portal) | Communication | `/admin/notifications/channels` | `notification_channels` | Platform | All | KEEP | LINK | none | SHOULD |
| 43 | Workflow definitions | Workflow | `/admin/workflows` | `workflow_definitions` / workflow service | SSB-wide | All | KEEP | LINK | none | SHOULD |
| 44 | SLA rules per workflow | Workflow | `/admin/workflows` (SLA tab) | `workflow_sla` | SSB-wide | All | KEEP | LINK | none | OPTIONAL |
| 45 | Approval / maker-checker rules | Workflow | `/admin/workflows/approvals` | `workflow_approvers` | SSB-wide | All | KEEP | LINK | none | SHOULD |
| 46 | Assignment / routing rules | Workflow | `/admin/workflows/routing` | `workflow_routing` | SSB-wide | CMP, CLM, Legal | KEEP | LINK | none | OPTIONAL |
| 47 | Audit / logging settings | Platform | `/admin/settings/audit` | `system_settings` (audit keys) | Platform | All | KEEP | LINK | none | OPTIONAL |
| 48 | Master data — Relations / Marital status / Gender | Master Data | `/admin/master-data/...` (grouped) | `md_relation`, `md_marital_status`, … | SSB-wide | All | KEEP | LINK | future (shared domain) | SHOULD |
| 49 | Master data — Occupations / Industries | Master Data | `/admin/master-data/...` | `md_occupation`, `md_industry` | SSB-wide | EMP, Members | KEEP | LINK | future | SHOULD |
| 50 | Master data — Income codes / SSC rates | Master Data | `/admin/master-data/income-codes`, `/ssc-rates` | `md_income_code`, `md_ssc_rate` | Product | C3, BN | KEEP | READINESS + LINK | none | REQUIRED |
| 51 | Member types | Master Data | `/admin/master-data/member-types` | `md_member_type` | SSB-wide | Members, BN | KEEP | READINESS + LINK | none | REQUIRED |
| 52 | BN Product definitions | BN | `/admin/bn/products` (Product Builder) | `bn_product_*` | Product | BN | KEEP | BLOCK-BN gate | legacy-protected | — (this IS the target) |

---

## A. Recommended Administration Model

1. **Engine screens** (`/admin/geography`, `/admin/identity`,
   `/admin/financial-reference`, `/admin/legal-reference`,
   `/admin/notifications/*`, `/admin/workflows`, `/admin/settings/numbering`,
   `/admin/calendar`, `/admin/organization`, `/admin/users`,
   `/admin/master-data/*`) own **reusable technical capability** — schema,
   validation, RLS-free role checks, adapters, and canonical CRUD.
2. **SSB Setup** owns **implementation decisions for the KN SSB instance** —
   which engine records are active, which flags are on, and readiness against
   the BN Product Builder gate. It never re-implements engine CRUD.
3. **Business modules** (BN, C3, EMP, CLM, CMP, FIN, Legal) **consume the
   resolved configuration** via the shared services/hooks listed above. They
   never write to engine tables directly and never create their own duplicate
   configuration screens.
4. **No duplication rule** — if an engine screen exists, SSB Setup either
   LINKs, SUMMARISES, opens it, or (for a small number of KN-only flags)
   EMBEDs a narrow edit form that writes through the engine's service.

---

## B. Recommended SSB Setup Sections

Final section order for the SSB Setup page (single left-nav entry under
Enterprise Configuration):

1. **Organisation** — profile, departments, fiscal year, branding.
2. **Geography & Address** — country readiness, admin levels, areas, address
   format & mandatory fields.
3. **Identity / NIS** — identity types active for KN, primary identifier,
   validation confirmation.
4. **Numbering** — Employer, Member/NIS, Claim, Receipt/Invoice/Batch,
   Legal case sequences.
5. **Contribution Calendar** — period definitions, fiscal alignment.
6. **Financial / Payment** — currency, banks, branches, payment channels,
   settlement methods, account types.
7. **Legal** — Social Security Act, sections, regulations, applicability.
8. **Documents** — document types active, per-process requirements matrix.
9. **Communication** — template coverage, event bindings, channels.
10. **Workflow / SLA** — active workflows, approvals, routing, SLAs.
11. **Benefits Readiness** — aggregated gate view; blocks BN Product Builder
    until all REQUIRED items are green.

---

## C. What MUST be Editable Inside SSB Setup (EMBED-EDIT)

These are narrow KN implementation decisions where opening a full engine
screen is heavier than needed. Edits write through the engine service.

- Address mandatory fields (checkbox matrix over `ssp_address_format.fields`).
- Primary identifier flag for KN (`ssp_country_identity_rule.is_primary`).
- Numbering templates for: Employer, Member/NIS, Claim,
  Receipt/Invoice/Batch, Legal case.
- Fiscal year start/end on `core_organization`.
- Contribution calendar (until a full engine screen exists — item 21).
- Document requirements matrix (until a full engine screen exists — item 38).

---

## D. What Should ONLY Link to Existing Screens (LINK / OPEN / SUMMARY)

Do **not** duplicate edit forms for these — always open the engine screen:

- Organisation profile, departments, branding.
- Users, roles, permissions.
- Countries, admin levels, geo areas, jurisdictions, postal rules.
- Identity types catalogue, validation patterns.
- Currencies, banks, branches, tax refs, chart of accounts.
- Legal reference types, acts, sections, regulations, courts.
- Notification templates, bindings, channels.
- Workflow definitions, approvals, routing, SLAs.
- Master data (relations, marital status, occupations, industries, income
  codes, SSC rates, member types).
- Calendar / holidays / working week.
- Audit settings.

---

## E. Missing CRUD Gaps

Items with **no suitable canonical screen** today. These are the only places
SSB Setup may either embed a new form or trigger a NEW canonical screen
proposal — none require touching legacy tables.

| # | Gap | Current State | Recommendation |
|---|---|---|---|
| 21 | Contribution calendar | Table partial (`c3_contribution_period`), no admin CRUD | NEW canonical screen under Master Data / C3 Admin; embed simple editor in SSB Setup meanwhile |
| 22 | Fiscal year on organisation | Field partial on `core_organization` | EXTEND `/admin/organization` with a fiscal tab; embed simple editor in SSB Setup |
| 37 | Document types | Partial; blocked on EPIC 2.7 Document Domain decision | Await Document Domain decision; keep READINESS status only |
| 38 | Document requirements per process | No table, no screen | NEW: matrix-style screen (process × document type); embed the matrix in SSB Setup for KN |
| 39 | Document retention rules | None | DEFER until DMS engine ready |
| 41 | Template ↔ event bindings | Partial | EXTEND `/admin/notifications/bindings` |

---

## F. Immediate Implementation Sequence

1. **Build SSB Setup shell + Benefits Readiness page** — pure read/link
   dashboard reusing existing services/hooks. No engine changes.
2. **Add inline (EMBED-EDIT) sections only for the six items listed in
   Section C** — address required-flags, primary identifier flag, numbering
   templates, fiscal year, contribution calendar (interim), document
   requirements matrix (interim).
3. **LINK / OPEN / SUMMARY** to every existing engine CRUD screen listed in
   Section D. Do not re-implement any of them.
4. **Do not touch BN Product Builder** until all `REQUIRED` items in the
   matrix show green in Benefits Readiness. `SHOULD` items may remain amber
   for dev but must be green for UAT sign-off.

---

## Acceptance Checklist

- [x] Every configurable item lists engine owner, CRUD screen, table/service,
      scope, consumers, decision, SSB Setup behaviour, migration, BN gate.
- [x] No duplicate screen is proposed where an existing engine screen exists.
- [x] Missing CRUD gaps are explicitly listed in Section E.
- [x] SSB Setup behaviour is explicit per row and summarised in Sections C/D.
- [x] BN Product Builder gating is explicit per row and summarised in F.
- [x] No code, schema, `app_modules`, permissions, or legacy tables are
      modified by this document.
