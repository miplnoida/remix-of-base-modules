# Enterprise Reference Architecture

> **Status:** Architecture only. No code, schema, routes, `app_modules`, menus, hooks, services, or feature-flag changes.
> Companion to `ENTERPRISE_DOMAIN_MODEL.md`, `DOMAIN_BOUNDARIES.md`, `DOMAIN_DEPENDENCY_GRAPH.md`, `SHARED_MASTER_DATA_MODEL.md`, `DOMAIN_SERVICE_CATALOGUE.md`.

This is the **future** enterprise reference architecture. It is the target that every future module (BN, C3, Employer, Compliance, Legal, Finance, Licensing, Prison Management, HRMS, DMS, and any future enterprise solution) will conform to.

---

## 1. Reference Architecture (Target)

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ PLATFORM                                                                  │
│ Auth · RBAC · Audit · Numbering · Workflow · Notification · DMS ·         │
│ Scheduler · Feature Flags · API Gateway · Observability                   │
├───────────────────────────────────────────────────────────────────────────┤
│ ORGANISATION                                                              │
│ Tenant · Branding · Offices · Calendars · Org Roles · Org Document Types  │
├───────────────────────────────────────────────────────────────────────────┤
│ ENTERPRISE SHARED DOMAINS                                                 │
│ Location · Identity · Reference Data · Lookup Registry ·                  │
│ Validation · Document · Payment                                           │
├───────────────────────────────────────────────────────────────────────────┤
│ SOCIAL SECURITY PLATFORM (SSP)                                            │
│ Person · Employer · Scheme · Coverage · Contribution                      │
├───────────────────────────────────────────────────────────────────────────┤
│ BUSINESS MODULES                                                          │
│ Benefits · Contributions · Employer (ops) · Compliance · Finance · Legal  │
│ (+ future: HRMS · Licensing · Prison Mgmt · DMS product)                  │
├───────────────────────────────────────────────────────────────────────────┤
│ PRODUCT BUILDER                                                           │
│ Product definition · Product versions · Product bindings                  │
├───────────────────────────────────────────────────────────────────────────┤
│ OPERATIONS                                                                │
│ Applications · Claims · Filings · Cases · Orders · Journals · Runs        │
├───────────────────────────────────────────────────────────────────────────┤
│ REPORTING & ANALYTICS                                                     │
│ Report Catalogue · Report Runs · Metrics · Dashboards                     │
└───────────────────────────────────────────────────────────────────────────┘
Cross-cutting: Case Management (used by verticals), Integration
(used by any layer via Platform), Analytics (reads from producing layers).
```

---

## 2. Part 7 — Mapping Current Implementation

Classify what exists today. **No moves are performed.** Ownership is only labelled.

### 2.1 Currently BN-owned (should migrate to shared layers)
| Current | Today's Owner (label) | Should Belong To |
|---|---|---|
| `bn_country` | BN | Location |
| `bn_country_id_rule` | BN | Identity |
| `bn_country_address_field` | BN | Location |
| `bn_country_participant_type` | BN | SSP / Reference Data |
| `bn_country_payment_config` | BN | Payment |
| `bn_legal_reference`, `bn_country_legal_ref` | BN | Legal (with Reference Data governance) |
| `bn_payment_method` | BN | Payment |
| `bn_bank_master`, `bn_bank_branch` | BN | Payment |
| `bn_eft_format*` | BN | Payment |
| `bn_reference_group`, `bn_reference_value` (cross-cutting subset) | BN | Reference Data |

### 2.2 Currently SSP-shaped (already correctly scoped in intent)
| Current | Notes |
|---|---|
| `useBnCountryPack` hook family | Correctly shaped as country pack; needs re-homing to Location/Identity/Payment services. |
| `bn_country_participant_type` lifecycle (DRAFT/ACTIVE/RETIRED) | Correct SSP-grade governance. |
| `bn_workbasket`, `bn_escalation_policy*` | Correct Case Management shape. |

### 2.3 Organisation-owned (correct)
| Current | Notes |
|---|---|
| Tenant/office/calendar surfaces | Owned at Organisation layer. |
| Org document master | Owned at Organisation layer. |

### 2.4 Platform-owned (correct)
| Current | Notes |
|---|---|
| Auth, RBAC, Audit, Numbering | Platform. |
| Notification engine, Workflow engine, DMS engine | Platform. |
| Feature flags | Platform. |

### 2.5 UNKNOWN ownership (needs Epic 0.36B inventory)
| Item | Reason |
|---|---|
| Scattered per-module reference lists (e.g. status enums duplicated in Compliance/Legal/BN) | Need to determine whether they belong in Reference Data or stay domain-local. |
| Employer classification/industry codes | Split between BN and Employer today; owner unclear. |
| Notification templates duplicated across modules | Need Platform vs Organisation vs Vertical split. |
| Bank/branch usage inside Employer intake forms | Confirm all reads route to Payment. |
| Legal Refs consumption from Compliance | Confirm shim usage; no direct DB reads. |
| Calendar/holiday lists per module | Confirm they all consume Location/Organisation. |
| Participant taxonomy usage outside BN (Legal/Compliance) | Confirm read paths. |
| C3-owned "master" tables (rate tables, penalty rules) | Confirm Contribution vs SSP boundary. |

---

## 3. Part 8 — Implementation Roadmap

```text
Epic 0.36B  Enterprise Domain Inventory
              │  Catalogue every current implementation of each
              │  domain (tables, hooks, services, pages, flags,
              │  app_modules). Doc-only.
              ▼
Epic 0.36C  Domain Migration Plan
              │  Per-domain rename strategy, dual-read/write
              │  shims, cutover windows, rollback. Doc-only.
              ▼
Epic 0.36D  Shared Service Layer
              │  Implement read-only Location/Identity/Payment/
              │  Reference/Legal/Case/Document service facades
              │  over existing tables. Additive; no deletions.
              ▼
Epic 0.37   Organisation Foundation
              │  Formalise tenant/office/calendar/org-doc masters
              │  and consumption contracts.
              ▼
Epic 0.38   SSP Foundation
              │  Formalise Person/Employer/Scheme/Coverage/
              │  Contribution masters and services on top of
              │  shared domains.
              ▼
Epic 0.39   BN Consumption Refactor
              │  Swap BN screens/services from bn_* hooks to
              │  shared-domain hooks behind a flag. Legacy
              │  shims preserved.
              ▼
Epic 0.40   Resume BN Product Builder
              │  Product Builder resumes only after acceptance
              │  gates of 0.36B–0.39 pass.
```

Downstream verticals (Compliance, Legal, Finance, and future modules like HRMS, Licensing, Prison, DMS) adopt the same pattern: consume shared domains, own only their vertical data.

---

## 4. Governance Rules Enforced by this Architecture

1. **Single owner per master.** Duplicate ownership is a bug.
2. **Read via service, never via table.** Verticals must not read shared masters through direct DB access once services exist.
3. **Bind, don't invent.** Verticals bind master values to products/cases; they do not create new master values.
4. **Effective dating is default** for anything with legal or financial impact.
5. **L3 audit** for masters with legal/financial/entitlement impact.
6. **One-way dependencies.** Downward only. Cycles require an event-driven contract, not a direct dependency.
7. **Extension via reference.** Domain-specific attributes attach via extension tables keyed by the master ID.

---

## 5. Non-Goals

- No implementation.
- No schema, code, routes, hooks, services, menus, `app_modules`, or feature-flag changes.
- No renames or migrations.
- No BN Product Builder work; it resumes only at Epic 0.40.

---

## 6. Acceptance

- Reference architecture layers are explicitly defined.
- Current implementation is classified into BN-owned / SSP-shaped / Organisation-owned / Platform-owned / UNKNOWN.
- Implementation roadmap (0.36B → 0.40) is sequenced.
- Document is generic enough to govern every future enterprise module.
