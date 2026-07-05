# Shared Master Data Model

> **Status:** Architecture only. No code, schema, routes, `app_modules`, menus, hooks, services, or feature-flag changes.
> Companion to `ENTERPRISE_DOMAIN_MODEL.md` and `DOMAIN_BOUNDARIES.md`.

Enterprise master-data ownership catalogue. Each master has:

- **Single owner domain**
- **Read consumers**
- **Write owner** (the same domain unless delegated)
- **Override policy** (who may narrow the value for their own scope)
- **Versioning policy** (immutable, semantic, effective-dated)
- **Effective dating** (yes/no + granularity)
- **Soft delete policy**
- **Audit requirement** (level of tracking)

Legend for Audit: **L1** = who/when only, **L2** = who/when/what changed, **L3** = full before/after snapshot + reason code.

---

## 1. Master Catalogue

| # | Master | Owner Domain | Read Consumers | Write Owner | Override Policy | Versioning | Effective Dating | Soft Delete | Audit |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Country | Location | ALL | Location admin | None | Immutable code, mutable attrs versioned | Yes (date) | Yes (`is_active`) | L3 |
| 2 | Currency | Location | Finance, Payment, Benefits, Contribution | Location admin | None | Immutable | Yes | No (retire only) | L2 |
| 3 | Locale | Location | ALL UI/BFF | Location admin | None | Immutable | No | Yes | L1 |
| 4 | Timezone | Location | ALL | Location admin | None | Immutable | No | No | L1 |
| 5 | Region / State / Parish | Location | Employer, Person, Compliance, Legal | Location admin | None | Effective-dated | Yes | Yes | L2 |
| 6 | District | Location | Employer, Person, Compliance | Location admin | None | Effective-dated | Yes | Yes | L2 |
| 7 | Postal Code | Location | Employer, Person, Portals | Location admin | None | Effective-dated | Yes | Yes | L1 |
| 8 | Address Type | Location | Person, Employer, Portals | Location admin | None | Semantic | No | Yes | L2 |
| 9 | Address Format (per country) | Location | Person, Employer, Portals | Location admin | Modules may hide but not reorder mandatorily | Effective-dated | Yes | Yes | L2 |
| 10 | Holiday | Location | Organisation, Contribution, Benefits, Case Mgmt | Location admin | Organisation may add tenant holidays | Effective-dated | Yes | Yes | L2 |
| 11 | Calendar | Organisation | Case Mgmt, Contribution, Benefits | Organisation admin | Verticals may pick different calendars | Effective-dated | Yes | Yes | L2 |
| 12 | Identity Type | Identity | Person, Employer, Portals | Identity admin | None | Semantic | Yes | Yes | L3 |
| 13 | ID Rule (per country × type) | Identity | Person, Employer, Portals, Benefits, Contribution | Identity admin | None | Effective-dated | Yes | Yes | L3 |
| 14 | Participant Type | Reference Data + SSP | Benefits, Legal, Compliance, Portals | SSP admin | Benefits selects required/optional per product only | Lifecycle (DRAFT/ACTIVE/RETIRED) | Yes | Retire only | L3 |
| 15 | Person Type | Reference Data | Person, Benefits, Compliance | Reference Data admin | None | Semantic | No | Yes | L2 |
| 16 | Employer Type | Reference Data | Employer, Compliance, Contribution | Reference Data admin | None | Semantic | No | Yes | L2 |
| 17 | Relationship Code | Reference Data | Person, Benefits, Legal | Reference Data admin | None | Semantic | No | Yes | L2 |
| 18 | Marital Status | Reference Data | Person, Benefits | Reference Data admin | None | Semantic | No | Yes | L1 |
| 19 | Occupation | Reference Data | Person, Employer, Benefits | Reference Data admin | None | Effective-dated | Yes | Yes | L2 |
| 20 | Industry (NACE/ISIC) | Reference Data | Employer, Compliance | Reference Data admin | None | Effective-dated | Yes | Yes | L2 |
| 21 | Nationality | Reference Data | Person, Employer | Reference Data admin | None | Semantic | No | Yes | L1 |
| 22 | Reference Code (generic) | Reference Data | ALL | Reference Data admin | None | Semantic + effective-dated | Optional | Yes | L2 |
| 23 | Status (generic) | Reference Data | ALL | Reference Data admin | Domains may add domain-scoped statuses | Semantic | No | Yes | L1 |
| 24 | Reason Code | Reference Data | Case Mgmt, Legal, Compliance, Benefits | Reference Data admin (with domain contribution) | Domains propose, RD approves | Effective-dated | Yes | Yes | L2 |
| 25 | Document Type | Document | Benefits, Compliance, Legal, Person, Employer, Portals | Document admin | Organisation may add tenant types; Benefits binds only | Effective-dated | Yes | Yes | L3 |
| 26 | Retention Policy | Document | ALL | Document admin | None | Effective-dated | Yes | No | L3 |
| 27 | Legal Act | Legal (with Reference Data governance) | Compliance, Benefits, Legal, Portals | Legal admin | None | Immutable identifier, versioned text | Yes | Retire only | L3 |
| 28 | Legal Section | Legal | Compliance, Benefits, Legal | Legal admin | None | Effective-dated | Yes | Retire only | L3 |
| 29 | Legal Reference (linkage) | Legal | Compliance, Benefits | Legal admin | Benefits may cite at product/rule level only | Effective-dated | Yes | Yes | L3 |
| 30 | Bank | Payment | Benefits, Contribution, Finance, Employer, Portals | Payment admin | None | Semantic | Yes | Yes | L3 |
| 31 | Bank Branch | Payment | Benefits, Contribution, Finance, Employer, Portals | Payment admin | None | Semantic | Yes | Yes | L3 |
| 32 | Payment Channel / Method | Payment | Benefits, Contribution, Finance, Portals | Payment admin | Benefits and Contribution may restrict per product/filing | Semantic | Yes | Yes | L3 |
| 33 | EFT Format | Payment | Finance, Payment ops | Payment admin | None | Effective-dated | Yes | Yes | L3 |
| 34 | Payment Profile | Payment | Benefits, Contribution, Portals | Payment admin (data captured via consumer) | Consumer captures, Payment stores | Effective-dated | Yes | Yes | L3 |
| 35 | Scheme | Scheme | Coverage, Contribution, Benefits, Finance | Scheme admin | None | Effective-dated | Yes | Retire only | L3 |
| 36 | Branch (insurance branch STB/LTB/…) | Scheme | Coverage, Contribution, Benefits, Finance | Scheme admin | None | Effective-dated | Yes | Retire only | L3 |
| 37 | Benefit Product | Benefits | Payment, Finance, Reporting, Portals | Benefits admin | None | Semantic version per product version | Yes | Yes | L3 |
| 38 | Benefit Product Version | Benefits | Payment, Finance, Reporting, Portals | Benefits admin | None | Immutable version (Draft/Active/Retired lifecycle) | Yes | Retire only | L3 |
| 39 | Contribution Schedule | Contribution | Coverage, Benefits, Finance | Contribution admin | None | Effective-dated | Yes | Retire only | L3 |
| 40 | Rate Table | Contribution | Contribution, Finance | Contribution admin | None | Effective-dated | Yes | Retire only | L3 |
| 41 | Penalty Rule | Contribution | Contribution, Compliance, Finance | Contribution admin | None | Effective-dated | Yes | Retire only | L3 |
| 42 | Case Type | Case Management | Compliance, Legal, Benefits, Contribution | Case Mgmt admin | Verticals extend attributes only | Semantic | No | Yes | L2 |
| 43 | Workbasket | Case Management | Verticals | Case Mgmt admin | None | Semantic | Yes | Yes | L2 |
| 44 | Escalation Policy | Case Management | Verticals | Case Mgmt admin | None | Effective-dated | Yes | Yes | L2 |
| 45 | SLA Policy | Case Management | Verticals | Case Mgmt admin | None | Effective-dated | Yes | Yes | L2 |
| 46 | Number Series | Platform Foundation | ALL | Platform admin | None | Immutable prefix, mutable last number | No | No | L3 |
| 47 | Workflow Definition | Platform Foundation | ALL | Platform admin | Verticals may parameterise steps | Semantic version | Yes | Retire only | L3 |
| 48 | Notification Template | Platform Foundation | ALL | Platform admin | Organisation may brand; verticals may bind | Semantic version | Yes | Yes | L2 |
| 49 | Feature Flag | Platform Foundation | ALL | Platform admin | None | Semantic | No | Yes | L2 |
| 50 | Role & Permission | Platform Foundation | ALL | Platform admin | Organisation may group | Semantic | No | Yes | L3 |
| 51 | Organisation Profile | Organisation | ALL | Organisation admin | None | Effective-dated | Yes | No | L3 |
| 52 | Office / Branch (org unit) | Organisation | Case Mgmt, Compliance, Legal, Reporting | Organisation admin | None | Effective-dated | Yes | Yes | L2 |
| 53 | Lookup Registry Entry | Lookup Registry | UI/BFF, Dev tooling | Lookup Registry admin | None | Semantic | No | Yes | L1 |
| 54 | Validation Rule | Validation | ALL input surfaces | Validation admin | Verticals may bind, not redefine | Effective-dated | Yes | Yes | L2 |
| 55 | Integration Endpoint | Integration | ALL callers | Integration admin | None | Semantic | Yes | Yes | L3 |
| 56 | Report Definition | Reporting | Executives, ops | Reporting admin | None | Semantic version | Yes | Yes | L2 |
| 57 | Metric Definition | Analytics | Reporting, dashboards | Analytics admin | None | Semantic | No | Yes | L1 |

---

## 2. Global Policies

- **Immutable identifiers**: All master rows expose a stable, immutable business code. Attribute changes are versioned; code changes are forbidden.
- **Effective dating**: Every master that can change over time carries `effective_from` / `effective_to`. Point-in-time reads are the default for downstream calculations.
- **Soft delete**: Retire via `is_active=false` or a lifecycle status. Hard delete is reserved for compliance/GDPR flows in Person/Employer only.
- **Audit level**: L3 is required for any master with legal, financial, or entitlement impact.
- **Override rule**: Consumers may **narrow** (subset, hide, restrict) an owner's list; they may never **widen** it (invent new values).
- **Duplication ban**: If a data element already exists in a master here, no domain may create a parallel copy. New attributes attach via extension tables keyed by the master's ID.

---

## 3. Non-Goals

- No migration, rename, DDL, or seed change.
- No implementation of admin UIs or services.
