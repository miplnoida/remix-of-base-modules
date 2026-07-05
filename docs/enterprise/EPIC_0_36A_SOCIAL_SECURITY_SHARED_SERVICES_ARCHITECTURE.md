# Epic 0.36A — Social Security Shared Services (SSP) Architecture

> **Status:** Documentation & architecture only. No code, routes, schema, seeds, `app_modules`, feature-flag, menu, or import changes are made by this epic.
> **BN Product Builder (Epic 0.4):** Remains **ON HOLD** until Epic 0.36B–0.36D and 0.39 acceptance gates pass.

**Source documents**
- `docs/enterprise/EPIC_0_35_ENTERPRISE_CONFIGURATION_OWNERSHIP_PLAN.md`
- `docs/platform/PLATFORM_OWNERSHIP_MATRIX.md`
- `docs/enterprise/ENTERPRISE_ARCHITECTURE_CATALOGUE.md`
- `docs/bn/EPIC_0_3_BN_CONFIGURATION_INVENTORY.md`
- `docs/bn/EPIC_0_3A_BN_CONFIGURATION_IMPROVEMENT_PLAN.md`

---

## 1. Purpose of the Social Security Platform (SSP)

The **Social Security Platform (SSP)** is the shared **domain foundation layer** that sits between the generic Platform/Organisation layers and the vertical business modules (BN, C3/Contributions, Employer, Insured Person, Compliance, Legal, Finance, Portals).

SSP exists so that:

- Country-specific rules (IDs, addresses, participant taxonomies, payment channels, legal references) are defined **once**, not re-invented per module.
- BN, C3, Employer, IP, Compliance, Legal, Finance and all Portals **consume the same authoritative masters**.
- Domain masters have a **single write owner** (SSP), while business modules retain **binding-only ownership** (e.g. BN owns "which document a product requires" but does not own the document type itself).
- Country roll-out becomes a **configuration exercise** on SSP, not a code fork per module.

SSP is **not** a new UI product. It is a horizontal shared services layer with an admin surface (proposed `/ssp/*`) and a stable read API consumed by all verticals.

---

## 2. SSP Domain Catalogue

| # | Domain | What it owns | Evidence today |
|---|---|---|---|
| 1 | **Country Pack** | Country master, currency, active flag, defaults | `bn_country`, `useBnCountries`, `BnCountryContext` |
| 2 | **Identity / ID Rules** | Per-country ID types, primary flag, format, checksum, validator | `bn_country_id_rule`, `validateIdByCountry` |
| 3 | **Address Model** | Per-country address field set, labels, ordering, required flags | `bn_country_address_field`, `useBnCountryAddressModel` |
| 4 | **Participant Types** | Per-country party taxonomy + lifecycle (DRAFT/ACTIVE/RETIRED) | `bn_country_participant_type`, `bn_participant_role` enum |
| 5 | **Legal Reference Master** | Statutes, acts, sections, versions, effective dates | `bn_legal_reference` (42 rows), `bn_country_legal_ref` (42 rows) |
| 6 | **Payment Channel Master** | Channels (EFT, cheque, cash pickup, internal), country enablement | `bn_country_payment_config`, `bn_payment_method` |
| 7 | **Bank / Branch Master** | Banks, branches, routing/clearing/SWIFT, EFT format binding | `bn_bank_master`, `bn_bank_branch`, `bn_eft_format*` |
| 8 | **Geographic Hierarchy** | Region → parish/state → district → locality; office/zone mapping | Partial: address model + compliance office/zone mapping |
| 9 | **Social Security Reference Data** | Cross-module code sets (relationship, marital status, occupation, industry, etc.) | Currently scattered; BN `bn_reference_group/value` (64/463) is the closest template |
| 10 | **Validation Services** | ID validation, address validation, phone/email format, cross-field business validation | `validateIdByCountry`, `FORMAT_CONFIG`, ad-hoc per module |
| 11 | **Shared Lookup Registry** | Registry of "what lookup lives where"; deduplication of enum sources | New (to be defined in 0.36B) |
| 12 | **Scheme / Branch / Coverage foundations** | Insurance branch (STB, LTB, EI, IP, Med, Fun), scheme code, coverage grouping | Partial evidence in BN product taxonomy; formal SSP surface TBD |

---

## 3. Ownership Boundaries

```
┌───────────────────────────────────────────────────────────────────┐
│ PLATFORM (engines)                                                │
│  Auth · RBAC · Audit · Numbering · Workflow · Notification ·      │
│  DMS · Scheduler · Feature Flags · API Gateway                    │
├───────────────────────────────────────────────────────────────────┤
│ ORGANISATION (tenant)                                             │
│  Tenant profile · Branding · Locations · Calendars ·              │
│  Org document master · Org roles                                  │
├───────────────────────────────────────────────────────────────────┤
│ SSP (Social Security shared masters) ◄── this epic                │
│  Country Pack · Identity · Address · Participants ·               │
│  Legal Refs · Payment Channels · Banks · Geography ·              │
│  Reference Data · Validation · Lookup Registry · Scheme           │
├───────────────────────────────────────────────────────────────────┤
│ BUSINESS MODULES (verticals)                                      │
│  BN · C3/Contributions · Employer · Insured Person ·              │
│  Compliance · Legal · Finance · Portals                           │
│                                                                   │
│  BN owns ONLY: benefit product, product version,                  │
│  product-specific bindings (which doc/formula/rule/participant    │
│  a product requires). BN does NOT own domain masters.             │
└───────────────────────────────────────────────────────────────────┘
```

**Rule of thumb:**
- If a value is meaningful outside BN (e.g. an ID rule, a bank, a statute), it belongs in **SSP**.
- If it only means something for a specific benefit product version, it belongs in **BN**.

---

## 4. Proposed SSP Route Namespace (target IA, not implemented)

| Route | Purpose |
|---|---|
| `/ssp/country-pack` | Country master + pack overview per country |
| `/ssp/identity-rules` | ID types, primary flag, format, checksum rules |
| `/ssp/address-model` | Per-country address field definitions |
| `/ssp/participant-types` | Party taxonomy per country + lifecycle |
| `/ssp/legal-references` | Statutes/acts/sections + country linkage |
| `/ssp/payment-channels` | Payment method enablement per country |
| `/ssp/banks` | Bank & branch master, routing, EFT format binding |
| `/ssp/geography` | Region/state/parish/district hierarchy |
| `/ssp/reference-data` | Shared code sets (relationships, occupations, etc.) |
| `/ssp/validation` | ID/address validation admin & test harness |

> Routes are **proposed only**. No `AppRoutes.tsx` change, no `app_modules` change, no menu change occurs in this epic.

---

## 5. Proposed SSP Service / Hook Surface (target API, not implemented)

Consumers across BN, C3, Employer, IP, Compliance, Legal, Finance and Portals should read via a **stable SSP hook surface**:

- `useCountryPack(countryCode)`
- `useIdentityRules(countryCode)`
- `useAddressModel(countryCode)`
- `useParticipantTypes(countryCode)`
- `useLegalReferences(countryCode, { productId? })`
- `usePaymentChannels(countryCode)`
- `useBankBranches(bankCode?)`
- `useSspReferenceData(groupCode)`
- `validateIdByCountry(countryCode, value)`
- `resolveAddressFields(countryCode)`

Today's equivalents live under `@/hooks/bn/useBnCountryPack`, `@/hooks/bn/useBnPaymentMasters`, `@/hooks/legal-reference/useLegalReferences`, `@/services/bn/countryPackService`. Those remain in place; the SSP surface is defined here as the **target** to migrate to in Epic 0.36D / 0.39.

---

## 6. Data Ownership Matrix (BN → SSP)

| Current table | Current owner | Proposed SSP owner | Used by | Write owner | Read consumers | BN override? | Migration risk | Product Builder dep. |
|---|---|---|---|---|---|---|---|---|
| `bn_country` | BN | `ssp_country` | BN, C3, Employer, IP, Compliance, Legal, Finance, Portals | SSP admin | All modules | No | Low (rename + shim) | **Yes** |
| `bn_country_id_rule` | BN | `ssp_country_id_rule` | BN, C3, Employer, IP, Portals | SSP admin | All modules | No (only choose which IDs to require per product) | Low | **Yes** |
| `bn_country_address_field` | BN | `ssp_country_address_field` | BN, C3, Employer, IP, Legal, Portals | SSP admin | All modules | No | Low | **Yes** |
| `bn_country_participant_type` | BN | `ssp_country_participant_type` | BN, IP, Compliance, Legal, Portals | SSP admin | All modules | BN binds required/optional roles per product only | Medium (lifecycle rules retained) | **Yes** |
| `bn_country_payment_config` | BN | `ssp_country_payment_channel` | BN, C3, Finance, Portals | SSP admin | All modules | BN restricts allowed channels per product only | Medium | **Yes** |
| `bn_legal_reference` | BN | `ssp_legal_reference` | BN, Compliance, Legal | SSP admin | Compliance, Legal, BN | No | Low (already re-export shim exists at `useLegalReferences`) | Optional |
| `bn_country_legal_ref` | BN | `ssp_country_legal_ref` | BN, Compliance, Legal | SSP admin | Compliance, Legal, BN | BN binds product-level legal cites only | Low | Optional |
| `bn_payment_method` | BN | `ssp_payment_method` | BN, C3, Finance, Portals | SSP admin | All finance-adjacent modules | No | Low | **Yes** |
| `bn_bank_master` | BN | `ssp_bank` | BN, C3, Employer, Finance, Portals | SSP admin | All modules with payment intake | No | Low | **Yes** |
| `bn_bank_branch` | BN | `ssp_bank_branch` | BN, C3, Employer, Finance, Portals | SSP admin | All modules with payment intake | No | Low | **Yes** |

Legend: "Migration risk" is the difficulty of moving ownership without breaking consumers assuming today's `bn_*` names/hooks.

---

## 7. Module Consumption Model

| Module | Consumes from SSP | Owns locally |
|---|---|---|
| **BN** | Country, ID rules, address model, participant types, legal refs, payment channels, banks, reference data | Benefit product, product version, product-specific **bindings** (required docs, formulas, rules, participant selection, allowed channels) |
| **C3 / Contributions** | Country, ID rules, address model, payment channels, banks, reference data | Contribution schedules, filing configs, penalty rules |
| **Employer** | Address model, geography, payment channels, banks, reference data | Employer profile, filing history, compliance registration data |
| **Insured Person** | ID rules, address model, participant types, legal refs (rights/entitlements), reference data | Person profile, dependants, employment history |
| **Compliance** | Legal refs, participant types, geography, reference data | Cases, violations, sampling, escalations |
| **Legal** | Legal refs, participant types, reference data | Matters, hearings, orders, settlements |
| **Finance** | Payment channels, banks/branches, EFT formats | Ledger, postings, disbursement runs |
| **Portals** (Public, Employer, Doctor, Claimant) | Country pack, ID rules, address model, payment channels, banks | Portal-specific task forms and session state |

**Golden rule:** No vertical writes to an SSP table. Verticals read via SSP hooks and write only their own binding tables.

---

## 8. Dependency Diagram

```text
                ┌───────────────┐
                │   PLATFORM    │  (Auth, RBAC, Audit, Numbering,
                │   engines     │   Workflow, Notification, DMS,
                └──────┬────────┘   Scheduler, Feature Flags, API)
                       │
                ┌──────▼────────┐
                │ ORGANISATION  │  (Tenant profile, branding,
                │   tenant      │   locations, calendars, org
                └──────┬────────┘   document master)
                       │
                ┌──────▼────────┐
                │      SSP      │  (Country Pack · Identity · Address ·
                │   shared      │   Participants · Legal Refs · Payment
                │   masters     │   Channels · Banks · Geography ·
                └──────┬────────┘   Reference Data · Validation · Scheme)
                       │
     ┌─────────────────┼───────────────────────────┐
     │       │         │         │        │        │
   ┌─▼─┐  ┌──▼─┐  ┌────▼───┐  ┌──▼──┐  ┌──▼──┐  ┌─▼───┐
   │BN │  │ C3 │  │Employer│  │ IP  │  │Comp │  │Legal│  … Finance · Portals
   └───┘  └────┘  └────────┘  └─────┘  └─────┘  └─────┘

Arrows are one-way: lower layers do not depend on higher ones.
Verticals never write to SSP tables directly.
```

---

## 9. Non-Goals of Epic 0.36A

- **No** migrations, DDL, or seed changes.
- **No** table renames (`bn_*` → `ssp_*` is proposed, not executed).
- **No** new routes or `AppRoutes.tsx` changes.
- **No** `app_modules` inserts/updates.
- **No** menu, sidebar, or feature-flag changes.
- **No** code refactor of hooks/services (`useBnCountryPack`, `countryPackService`, etc. stay as-is).
- **No** BN Product Builder work. Epic 0.4 remains on hold.
- **No** deletion of legacy files or shims (e.g. `useLegalReferences` re-export shim stays).

---

## 10. Next Epics (Sequenced)

| Epic | Scope | Blocks |
|---|---|---|
| **0.36B — SSP Existing Implementation Inventory** | Catalogue every current implementation of each SSP domain (tables, hooks, services, pages, feature flags, `app_modules` rows). Doc-only. | 0.36C |
| **0.36C — SSP Extraction / Migration Plan** | Per-domain plan: rename strategy, dual-write/read shim, cutover window, rollback. Doc-only. | 0.36D |
| **0.36D — SSP Read-only Service Layer Implementation** | Implement `useSsp*` hooks and `/ssp/*` admin routes as **read-only** facades over existing `bn_*` tables. Additive; no deletions. | 0.39 |
| **0.39 — BN Consumption Refactor** | Swap BN screens and services from `useBn*` country/identity/legal/payment hooks to `useSsp*` equivalents behind a flag. Legacy hooks preserved as shims. | 0.4 |
| **0.4 — BN Product Builder (RESUMES)** | Only after 0.36B–0.36D and 0.39 acceptance gates pass. | — |

---

## Acceptance Criteria (this epic)

- [x] SSP is defined as a distinct shared layer between Organisation and business modules.
- [x] The 12 SSP domains are catalogued with today's evidence.
- [x] Ownership boundaries (Platform / Organisation / SSP / BN) are explicit.
- [x] Every shared BN table listed in the brief is classified in the data ownership matrix.
- [x] BN's **own / consume / override** rules are explicit and product-binding-only.
- [x] Proposed `/ssp/*` routes and `useSsp*` hooks are documented as targets, not implemented.
- [x] Module consumption model covers BN, C3, Employer, IP, Compliance, Legal, Finance, Portals.
- [x] Dependency diagram is one-way: Platform → Organisation → SSP → Verticals.
- [x] Non-goals explicitly forbid code/schema/route/menu/`app_modules`/flag changes.
- [x] Next epics 0.36B, 0.36C, 0.36D, 0.39 and the 0.4 resume gate are sequenced.
