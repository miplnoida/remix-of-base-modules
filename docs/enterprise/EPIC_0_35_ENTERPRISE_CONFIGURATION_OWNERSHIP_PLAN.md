# Epic 0.35 — Enterprise Configuration Ownership Plan

**Status:** Documentation-only. No code, route, table, schema, seed, `app_modules`, feature-flag, or menu changes.
**Trigger:** BN Product Builder (Epic 0.4) is **on hold** until platform / organisation-owned configuration is cleanly separated from BN-owned configuration.
**Canonical BN namespace:** `/bn/*` (see `EPIC_0_2_BN_NAVIGATION_FOUNDATION_ACCEPTANCE.md`).

## Source Documents

- `docs/platform/PLATFORM_OWNERSHIP_MATRIX.md`
- `docs/enterprise/ENTERPRISE_ARCHITECTURE_CATALOGUE.md`
- `docs/enterprise/PHASE_0_2_PRIORITY_CLEANUP_PLAN.md`
- `docs/bn/EPIC_0_3_BN_CONFIGURATION_INVENTORY.md`
- `docs/bn/EPIC_0_3A_BN_CONFIGURATION_IMPROVEMENT_PLAN.md`

---

## 1. Target Ownership Layers

```
┌─────────────────────────────────────────────────────────────┐
│ PLATFORM         Tenant-agnostic engines & primitives       │
│                  Auth, RBAC, Audit, Numbering, DMS engine,  │
│                  Notification engine, Workflow engine,      │
│                  Currency/Language/Locale registry          │
├─────────────────────────────────────────────────────────────┤
│ ORGANISATION     Per-tenant institutional settings          │
│                  Org profile, departments, locations,       │
│                  branding, calendars/holidays, org-level    │
│                  document master, org notification templates│
├─────────────────────────────────────────────────────────────┤
│ SOCIAL SECURITY  Domain-shared masters used by BN, C3,      │
│ PLATFORM (SSP)   Compliance, Legal, Finance                 │
│                  Country Pack, ID Rules, Address Model,     │
│                  Participant Types, Payment Channel Master, │
│                  Legal Reference Master, Bank/Branch Master │
├─────────────────────────────────────────────────────────────┤
│ MODULES          Domain-specific bindings only              │
│ (BN, C3, LG, CE) BN owns benefit product, formulas,         │
│                  eligibility, benefit workflow bindings,    │
│                  benefit doc requirements, benefit-specific │
│                  payment/notification/medical bindings.     │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** A module MUST consume from the lowest layer that provides the capability. BN may **override per product**, but must not **redefine** a primitive that already exists at Platform / Organisation / SSP.

---

## 2. Category Classification

| Category                    | Layer                       |
| --------------------------- | --------------------------- |
| Platform                    | Auth, RBAC, Audit, Numbering, DMS engine, Notification engine, Workflow engine, Currency, Language, Locale |
| Organisation                | Org profile, Departments, Locations, Branding, Calendars/Holidays, Org document master, Org notification templates |
| Social Security Platform    | Country Pack, ID Rules, Address Model, Participant Types, Payment Channel Master, Legal Reference Master, Bank/Branch Master |
| BN                          | Benefit Product, Product Version, Formula bindings, Eligibility bindings, Benefit rules, Benefit doc requirements, Benefit workflow bindings, Benefit-specific payment rules, Benefit notification mappings, Benefit medical policy bindings |
| Finance                     | GL, Payment issuance, Reconciliation, Ledger posting |
| DMS                         | Document storage, versioning, retention, e-sign |
| Notification                | Channels (email/SMS/push), delivery, template engine |
| Workflow                    | State machines, task routing, SLAs, escalations |
| Compliance                  | Employer compliance, audit rules, penalties |
| Legal                       | Cases, hearings, orders, recovery |

---

## 3. Item-by-Item Review

Each row = one configuration area currently sitting in or overlapping with BN.

### 3.1 Country Pack

| Field | Value |
| --- | --- |
| Current route | `/bn/config/country-pack` |
| Current page(s) | `src/pages/bn/config/CountryPack*.tsx`, `src/contexts/BnCountryContext.tsx` |
| Current table(s) | `bn_country`, `bn_country_id_rule`, `bn_country_address_field`, `bn_country_participant_type`, `bn_country_payment_config` |
| Current owner | BN |
| Recommended future owner | **Social Security Platform** |
| BN role | **Consume** (read-only). BN may **reference** per product but cannot mutate. |
| Migration risk | High — 5 tables, active context (`useBnCountry`), referenced by intake/payment. |
| Priority | **P0** (blocks Product Builder) |
| Product Builder depends on it | Yes |
| Action | Rename `bn_country*` → `ssp_country*` in a future migration; expose via a shared `useCountryPack` hook; BN context becomes a thin wrapper. |
| Marker | Investigate → Migrate |

### 3.2 Legal References

| Field | Value |
| --- | --- |
| Current route | `/bn/config/legal-references` (BN view) + `/legal/references` |
| Current page(s) | BN legal-ref pages + `src/hooks/legal-reference/useLegalReferences.ts` (canonical). `src/hooks/bn/useLegalReferences.ts` is already a **deprecated shim**. |
| Current table(s) | `bn_legal_reference` (42), `bn_country_legal_ref` (42), plus legal module master |
| Current owner | Split (BN + Legal) |
| Recommended future owner | **Social Security Platform** (single `ssp_legal_reference` master) |
| BN role | **Consume + link** at product/rule level. |
| Migration risk | Medium — dual writes exist; hook shim in place. |
| Priority | P0 |
| Product Builder depends on it | Yes (product must cite legal basis). |
| Action | Consolidate into one master; BN retains only the join table `bn_product_legal_ref`. |
| Marker | Merge |

### 3.3 Address Model

| Field | Value |
| --- | --- |
| Current route | `/bn/config/country-pack` (address tab) |
| Current page(s) | `CountryAddressModel*.tsx` |
| Current table(s) | `bn_country_address_field` |
| Current owner | BN |
| Recommended future owner | **SSP** |
| BN role | Consume |
| Migration risk | Medium |
| Priority | P0 |
| Product Builder depends on it | Yes (intake forms) |
| Action | Move under Country Pack migration (3.1). |
| Marker | Migrate |

### 3.4 ID Rules

| Field | Value |
| --- | --- |
| Current route | `/bn/config/country-pack` (ID rules tab) |
| Current page(s) | `CountryIdRules*.tsx` |
| Current table(s) | `bn_country_id_rule` |
| Current owner | BN |
| Recommended future owner | **SSP** |
| BN role | Consume + validate via shared `validateIdByCountry`. |
| Migration risk | Medium |
| Priority | P0 |
| Product Builder depends on it | Yes |
| Action | Move with Country Pack. |
| Marker | Migrate |

### 3.5 Payment Methods (channel master)

| Field | Value |
| --- | --- |
| Current route | `/bn/config/payment-methods`, `/bn/admin/payment-masters` |
| Current page(s) | `src/pages/bn/admin/PaymentMasters.tsx`, payment method config pages |
| Current table(s) | `bn_payment_method`, `bn_country_payment_config` |
| Current owner | BN |
| Recommended future owner | **SSP** (channel master) + Finance (issuance) |
| BN role | Reference + **override per product** (e.g., "this benefit disallows CASH_PICKUP"). |
| Migration risk | High — used by intake, entitlement, payment prep. |
| Priority | P0 |
| Product Builder depends on it | Yes |
| Action | Move channel master to SSP; BN keeps `bn_product_channel_config`. |
| Marker | Migrate + Override |

### 3.6 Payment Masters (Banks / Branches / Payees)

| Field | Value |
| --- | --- |
| Current route | `/bn/admin/payment-masters` |
| Current page(s) | `src/pages/bn/admin/PaymentMasters.tsx`, `src/hooks/bn/useBnPaymentMasters.ts` |
| Current table(s) | `bn_bank_master`, `bn_bank_branch`, `bn_payment_method` |
| Current owner | BN (misplaced) |
| Recommended future owner | **SSP** (bank/branch), **Finance** (issuance policies) |
| BN role | Consume |
| Migration risk | High |
| Priority | P0 |
| Product Builder depends on it | Indirect (payment profile at intake). |
| Action | Move page under `src/pages/ssp/masters/`; rename tables `ssp_bank_master` etc. in a later migration. |
| Marker | Migrate |

### 3.7 Participant Types

| Field | Value |
| --- | --- |
| Current route | `/bn/config/country-pack` (participants tab) |
| Current page(s) | `CountryParticipantTypes*.tsx` |
| Current table(s) | `bn_country_participant_type` |
| Current owner | BN |
| Recommended future owner | **SSP** |
| BN role | Consume + restrict per product (e.g., "spouse only"). |
| Migration risk | Medium — lifecycle (DRAFT/ACTIVE/RETIRED) already in hooks. |
| Priority | P0 |
| Product Builder depends on it | Yes |
| Action | Move with Country Pack. |
| Marker | Migrate + Override |

### 3.8 Notification Templates

| Field | Value |
| --- | --- |
| Current route | `/bn/config/communication-templates` (duplicate: L2176 redirect + L2373 page) |
| Current page(s) | `BnBenefitCommunicationTemplates.tsx`, Platform Notifications templates page |
| Current table(s) | Platform `comm_template*` + any BN-local override table |
| Current owner | Split |
| Recommended future owner | **Notification (Platform)** owns engine + templates; **BN** owns *mappings* (which event → which template). |
| BN role | Consume engine, own mapping table only. |
| Migration risk | Low — duplicate route already flagged in 0.3 inventory. |
| Priority | P0 (resolve duplicate first — Epic 0.3A I-3, Option A recommended). |
| Product Builder depends on it | Yes (product wizard picks event→template). |
| Action | Retire BN-specific templates page; keep BN mapping UI only. |
| Marker | Retire (BN templates) + Consume (Platform templates) |

### 3.9 Workflow Templates

| Field | Value |
| --- | --- |
| Current route | `/bn/config/workflows`, plus Platform workflow designer |
| Current page(s) | BN workflow config pages + platform designer |
| Current table(s) | Platform workflow engine tables + BN binding tables |
| Current owner | Split |
| Recommended future owner | **Workflow (Platform)** owns engine + reusable templates; **BN** owns product→workflow binding. |
| BN role | Consume engine; own bindings. |
| Migration risk | Medium |
| Priority | P0 |
| Product Builder depends on it | Yes |
| Action | No BN-local state machines; product wizard chooses from platform templates. |
| Marker | Consume + Bind |

### 3.10 Document Master

| Field | Value |
| --- | --- |
| Current route | `/bn/config/document-library` |
| Current page(s) | BN document profile pages |
| Current table(s) | `bn_document_profile` (1 row — seed-thin, per Epic 0.3) |
| Current owner | BN |
| Recommended future owner | **Organisation** (org-level doc types) + **DMS (Platform)** (storage/versioning) |
| BN role | Consume org doc master; own **product doc requirements** (`bn_product_document_requirement`). |
| Migration risk | Low (little data). |
| Priority | P0 |
| Product Builder depends on it | Yes |
| Action | Seed org doc master ≥ 20 standard types (per Epic 0.3A I-2); BN references. |
| Marker | Merge into Org + Consume |

### 3.11 Calendar / Holidays

| Field | Value |
| --- | --- |
| Current route | None BN-specific (checked). |
| Current page(s) | Organisation calendar pages (if any) |
| Current table(s) | Org calendar table(s) |
| Current owner | Organisation |
| Recommended future owner | **Organisation** (per-country holiday sets exposed via SSP). |
| BN role | Consume for SLA/effective-date math. |
| Migration risk | Low |
| Priority | P1 |
| Product Builder depends on it | Indirect (waiting periods, SLA). |
| Action | Expose `useOrgCalendar(countryCode)` hook; BN never defines its own holiday list. |
| Marker | Keep (Org) + Consume |

### 3.12 Currency / Language / Locale

| Field | Value |
| --- | --- |
| Current route | Platform admin |
| Current page(s) | Platform locale registry |
| Current table(s) | Platform currency/language tables; BN reads `country.currency_code` via `BnCountryContext`. |
| Current owner | Platform |
| Recommended future owner | **Platform** |
| BN role | Consume only. |
| Migration risk | Low |
| Priority | P1 |
| Product Builder depends on it | Yes (money fields, i18n). |
| Action | No change; formalise `useLocale()` hook usage across BN. |
| Marker | Keep (Platform) + Consume |

---

## 4. What BN Should **Own** Only

BN's exclusive domain (post-separation):

1. **Benefit Product** (`bn_benefit_product`)
2. **Product Version** (`bn_product_version`)
3. **Formula bindings** — product→formula (`bn_product_formula_binding`)
4. **Eligibility bindings** — product→eligibility rule (`bn_product_eligibility_binding`)
5. **Benefit rules** — `bn_rule_catalogue`, `bn_eligibility_rule`, `bn_calculation_rule`
6. **Benefit document requirements** — product→doc-type→mandatory/optional
7. **Benefit workflow bindings** — product→workflow template + stage overrides
8. **Benefit-specific payment rules** — `bn_product_channel_config`, per-product payment policy
9. **Benefit-specific notification mappings** — event→template per product
10. **Benefit medical policy bindings** — product→tariff table, authorization rules

Every other config surface currently in BN must be reclassified per §3.

---

## 5. What BN Should **Consume**

From **Platform**:
- Auth, RBAC, permissions
- Audit trail service
- Auto-numbering / reference generation
- DMS engine (upload, version, retention)
- Notification engine (channels, delivery, templates)
- Workflow engine (state machines, tasks, SLAs)
- Currency / language / locale registry

From **Organisation**:
- Organisation profile, departments, locations, branding
- Calendars / holidays
- Organisation-level document master
- Organisation-level notification templates

From **Social Security Platform**:
- Country pack (country, ID rules, address model, participant types, payment config)
- Legal reference master
- Payment channel master, bank / branch master

From **Finance**:
- Payment issuance service, GL posting, reconciliation

---

## 6. Ownership Summary Matrix

| Area                       | Own Layer | BN Role   | P    |
| -------------------------- | --------- | --------- | ---- |
| Country Pack               | SSP       | Consume   | P0   |
| ID Rules                   | SSP       | Consume   | P0   |
| Address Model              | SSP       | Consume   | P0   |
| Participant Types          | SSP       | Override  | P0   |
| Payment Channel Master     | SSP       | Override  | P0   |
| Payment Masters (bank)     | SSP       | Consume   | P0   |
| Legal References           | SSP       | Reference | P0   |
| Notification Templates     | Platform  | Consume   | P0   |
| Notification Mappings      | BN        | Own       | P0   |
| Workflow Templates         | Platform  | Consume   | P0   |
| Workflow Bindings          | BN        | Own       | P0   |
| Document Master            | Org+DMS   | Consume   | P0   |
| Document Requirements      | BN        | Own       | P0   |
| Calendar / Holidays        | Org       | Consume   | P1   |
| Currency / Language        | Platform  | Consume   | P1   |
| Benefit Product / Versions | BN        | Own       | Core |
| Formulas / Eligibility     | BN        | Own       | Core |
| Medical Bindings           | BN        | Own       | Core |

---

## 7. Implementation Sequence (post-approval)

Executed in a **future** epic — no code changes in this document.

1. **Epic 0.36 — SSP Foundation Extraction**: create SSP namespace, migrate Country Pack (§3.1–3.4, 3.7), legal reference master (§3.2), payment masters (§3.5–3.6). Introduce read-only hooks for BN.
2. **Epic 0.37 — Platform Notification & Workflow Consolidation**: resolve duplicate communication-templates route (§3.8), retire BN-local templates, formalise binding tables.
3. **Epic 0.38 — Organisation Document Master Seed**: expand doc master, retire single-row `bn_document_profile` as owning table (keep as requirements table only).
4. **Epic 0.39 — BN Consumption Refactor**: swap BN pages/hooks to consume SSP/Platform/Org sources; keep BN-owned bindings only.
5. **Epic 0.4 — BN Product Builder (RESUMES)**: only starts once §7.1–§7.4 pass their acceptance gates.

---

## 8. Acceptance Criteria (this document)

- [x] Product Builder remains on hold.
- [x] No code, DB, `app_modules`, feature-flag, menu, or seed changes.
- [x] Every configuration area classified into one of the 10 layers.
- [x] All 12 items in the task list have current + future owner + risk + priority + Product-Builder dependency + BN role (own / consume / reference / override).
- [x] BN's owned surface is enumerated exactly (10 items).
- [x] BN's consumed surface is enumerated per source layer.
- [x] Implementation sequence is defined for the next epics without executing them.

---

## 9. Rollback

This document is inert; rollback = delete this file. No system state changes.
